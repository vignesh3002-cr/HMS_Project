import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CONTEXT_LABEL,
  type DeriveResponse,
  type StageAxis,
  type StageContext,
  type StagingCriterion,
  type StagingSchemaDetail,
  type StagingSchemasResponse,
  stagingApi,
} from "../../../api/staging.api";
import {
  emptyStageDraft,
  findStageDraft,
  formatStageLine,
  hasStageData,
  primaryStageDraft,
  removeStageDraft,
  stageValueOf,
  type StageIhcDraft,
  type StagingDraftRecord,
  upsertStageDraft,
} from "./stagingDraft";

/* ---------------------------------------------------------------------------
   Staging card.

   One block per selected cancer type (the primary first). Within a block the
   doctor picks the sub-site schema when more than one applies, then records a
   stage per context (clinical / pathological / post-neoadjuvant / ...).
   The stage group is always calculated by the server; the clinician may
   override it with a reason.
   --------------------------------------------------------------------------- */

export interface StagingAutofill {
  age?: number | null;
  psa?: number | null;
  gradeGroup?: string | null;
  grade?: string | null;
  site?: string | null;
  ki67?: number | null;
}

export interface StagingCancerType {
  id: string;
  name: string;
}

interface StagingCardProps {
  patientId?: string;
  cancerTypes: StagingCancerType[];
  value: StagingDraftRecord[];
  onChange: (next: StagingDraftRecord[]) => void;
  autofill?: StagingAutofill;
  /** YYYY-MM-DD default for a new stage (the visit's date). */
  defaultStageDate?: string;
  disabled?: boolean;
  ihc: StageIhcDraft;
  onIhcChange: (next: StageIhcDraft) => void;
  alerts?: { severity: string; message: string }[];
}

const INPUT =
  "block w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-[10px] text-gray-800 shadow-sm focus:border-[#1d4ed8] focus:outline-none focus:ring-1 focus:ring-[#1d4ed8] disabled:bg-gray-50 disabled:text-gray-400";
const LABEL = "mb-1.5 block text-[10px] font-bold text-gray-900";

const errorMessage = (error: any) =>
  error?.response?.data?.message ?? error?.message ?? "Something went wrong";

const CONTEXT_TAB_LABEL: Record<StageContext, string> = {
  CLINICAL: "Clinical",
  PATHOLOGICAL: "Pathological",
  YP: "yp",
  RECURRENCE: "Recurrence"
};

const AXIS_LABEL: Record<StageAxis, string> = {
  T: "T — Tumour",
  N: "N — Nodes",
  M: "M — Metastasis",
  S: "S — Serum markers",
};

const AXIS_PLACEHOLDER: Record<StageAxis, string> = {
  T: "Select T",
  N: "Select N",
  M: "Select M",
  S: "Select S",
};

/* AJCC ordering: TX, T0, Tis, T1, T1a ... T4d — with or without the
   context prefix (cT2 / pT2 / ypT2). */
const SUFFIX_ORDER = ["", "mi", "a", "b", "c", "d", "e"];

const stageCodeRank = (code: string, axis: StageAxis) => {
  const stripped = code
    .replace(/^(yc|yp|[cpras])(?=[TNM])/i, "")
    .toUpperCase();
  const tail = stripped.startsWith(axis) ? stripped.slice(1) : stripped;
  const match = tail.match(/^(X|IS|\d+)(.*)$/);
  if (!match) return [99, 0] as const;
  const head = match[1].toLowerCase();
  const number = head === "x" ? -1 : head === "is" ? 0.5 : Number(head);
  const suffix = SUFFIX_ORDER.indexOf(match[2].toLowerCase());
  return [number, suffix === -1 ? 99 : suffix] as const;
};

const sortCodes = <T extends { code: string }>(codes: T[], axis: StageAxis): T[] =>
  [...codes].sort((a, b) => {
    const [an, as] = stageCodeRank(a.code, axis);
    const [bn, bs] = stageCodeRank(b.code, axis);
    return an - bn || as - bs || a.code.localeCompare(b.code);
  });

const sortStageGroups = (groups: string[]) =>
  [...groups].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
  );

const contextLabel = (context: StageContext) => CONTEXT_LABEL[context] ?? context;

/** Is this a positive / negative / not-done answer? */
const answerKind = (value: string | null | undefined) => {
  const text = (value ?? "").trim().toLowerCase();
  if (text.startsWith("pos")) return "positive";
  if (text.startsWith("neg")) return "negative";
  if (text.startsWith("not")) return "not-done";
  return "";
};

/** Pick the band option that contains a numeric value (PSA). */
const bandFor = (options: string[], value: number): string => {
  for (const option of options) {
    const text = option.replace(/≥/g, ">=").replace(/≤/g, "<=").replace(/\s+/g, "");
    let match = text.match(/^<\s*(\d+(?:\.\d+)?)$/);
    if (match && value < Number(match[1])) return option;
    match = text.match(/^(\d+(?:\.\d+)?)-\s*<\s*(\d+(?:\.\d+)?)$/);
    if (match && value >= Number(match[1]) && value < Number(match[2])) return option;
    match = text.match(/^(?:>=|≥)\s*(\d+(?:\.\d+)?)$/);
    if (match && value >= Number(match[1])) return option;
  }
  return "";
};

/** Map the diagnosis grade wording onto the G1 / G2 / G3 options. */
const gradeFor = (options: string[], grade: string): string => {
  const text = grade.trim().toLowerCase();
  if (!text) return "";
  const exact = options.find((option) => option.toLowerCase() === text);
  if (exact) return exact;
  const number = text.match(/(?:^|\D)([1-4])(?:\D|$)/);
  if (number && options.includes(`G${number[1]}`)) return `G${number[1]}`;
  if (/well/.test(text) && options.includes("G1")) return "G1";
  if (/moderate/.test(text) && options.includes("G2")) return "G2";
  if (/poor|undiffer/.test(text) && options.includes("G3")) return "G3";
  return "";
};

/** Suggested value for an extra input, from the diagnosis / IHC / labs. */
const suggestCondition = (
  criterion: StagingCriterion,
  autofill: StagingAutofill | undefined
): string => {
  if (!autofill) return "";
  const key = criterion.criterion_key;
  const numeric = (value?: number | null) =>
    value != null && Number.isFinite(value) ? String(value) : "";

  if (key === "Age") return numeric(autofill.age);

  if (key === "PSA" && autofill.psa != null) {
    return bandFor(criterion.options, autofill.psa);
  }

  if (key === "GG") {
    const raw = (autofill.gradeGroup ?? "").trim();
    if (!raw) return "";
    const digits = raw.match(/\d+/)?.[0] ?? "";
    return criterion.options.find((option) => option.trim() === digits) ?? "";
  }

  if (key === "Grade") return gradeFor(criterion.options, autofill.grade ?? "");

  if (key === "Site") {
    const text = (autofill.site ?? "").toLowerCase();
    if (/gastr|stomach/.test(text)) {
      return (
        criterion.options.find((option) => /gastr/i.test(option)) ?? ""
      );
    }
    if (/intestin|bowel|jejun|ileum|duoden/.test(text)) {
      return (
        criterion.options.find((option) => /intestin/i.test(option)) ?? ""
      );
    }
    return "";
  }

  return "";
};

/* ------------------------------- atoms ---------------------------------- */

function StatusPill({ stage }: { stage: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-[#166534]">
      Stage {stage}
    </span>
  );
}

function IncompletePill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-gray-200 bg-[#F7F9FB] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-gray-500">
      {label}
    </span>
  );
}

/* --------------------------- one stage form ------------------------------ */

interface StageFormProps {
  schemaId: string;
  context: StageContext;
  record: StagingDraftRecord;
  currentStageDate?: string;
  autofill?: StagingAutofill;
  disabled?: boolean;
  onChange: (next: StagingDraftRecord) => void;
  onRemove: () => void;
}

function StageForm({
  schemaId,
  context,
  record,
  currentStageDate,
  autofill,
  disabled,
  onChange,
  onRemove,
}: StageFormProps) {
  const [detail, setDetail] = useState<StagingSchemaDetail | null>(null);
  const [detailError, setDetailError] = useState("");
  const [preview, setPreview] = useState<DeriveResponse | null>(null);
  const [deriving, setDeriving] = useState(false);
  const [deriveError, setDeriveError] = useState("");

  const recordRef = useRef(record);
  recordRef.current = record;

  const conditionsKey = useMemo(
    () =>
      JSON.stringify(
        Object.entries(record.conditions ?? {}).sort(([a], [b]) =>
          a.localeCompare(b)
        )
      ),
    [record.conditions]
  );

  /* Axes / codes / extra inputs for this schema + context. */
  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setDetailError("");
    setPreview(null);

    stagingApi
      .schema(schemaId, context)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((error) => {
        if (!cancelled) setDetailError(errorMessage(error));
      });

    return () => {
      cancelled = true;
    };
  }, [schemaId, context]);

  /* Pre-fill extra inputs that can be read from the diagnosis (age, PSA,
     grade group, grade, NET site) — never over a value the doctor typed, and
     only once a T/N/M (or direct stage) has been chosen, so browsing the card
     never creates a draft record. */
  useEffect(() => {
    if (!detail) return;
    const current = recordRef.current;
    if (!hasStageData(current)) return;
    const nextConditions = { ...current.conditions };
    let changed = false;

    for (const criterion of detail.extra_inputs) {
      if (criterion.rendered_as === "axis") continue;
      const key = criterion.criterion_key;
      if (String(nextConditions[key] ?? "").trim()) continue;
      const suggestion = suggestCondition(criterion, autofill);
      if (suggestion) {
        nextConditions[key] = suggestion;
        changed = true;
      }
    }

    if (changed) {
      onChange({ ...current, conditions: nextConditions });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    detail?.schema.schema_id,
    detail?.context,
    autofill?.age,
    autofill?.psa,
    autofill?.gradeGroup,
    autofill?.grade,
    autofill?.site,
    record.t,
    record.n,
    record.m,
    record.s,
    record.finalStage,
  ]);

  /* Live derivation (server-authoritative, so the saved stage matches). */
  useEffect(() => {
    if (!detail || detail.mode !== "TNM") {
      setPreview(null);
      return;
    }

    const current = recordRef.current;
    const conditions = current.conditions ?? {};
    const hasAny = Boolean(
      current.t ||
        current.n ||
        current.m ||
        current.s ||
        Object.values(conditions).some((value) => String(value ?? "").trim())
    );

    if (!hasAny) {
      setPreview(null);
      if (current.derived) {
        onChange({ ...current, derived: null });
      }
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setDeriving(true);
      setDeriveError("");
      try {
        const result = await stagingApi.derive({
          schemaId,
          context,
          t: current.t || null,
          n: current.n || null,
          m: current.m || null,
          s: current.s || null,
          conditions,
        });
        if (active) setPreview(result);
      } catch (error) {
        if (active) {
          setPreview(null);
          setDeriveError(errorMessage(error));
        }
      } finally {
        if (active) setDeriving(false);
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    detail?.schema.schema_id,
    detail?.context,
    schemaId,
    context,
    record.t,
    record.n,
    record.m,
    record.s,
    conditionsKey,
  ]);

  /* Keep the legacy mirror values (rule codes) with the draft. */
  useEffect(() => {
    if (!preview) return;
    const current = recordRef.current;
    const snapshot = {
      status: preview.status,
      stage: preview.derived_stage,
      ruleId: preview.rule_id,
      explanation: preview.explanation,
      missing: preview.missing_conditions ?? [],
      tCode: preview.t_code,
      nCode: preview.n_code,
      mCode: preview.m_code,
    };
    const previous = current.derived;
    if (
      previous &&
      previous.status === snapshot.status &&
      previous.stage === snapshot.stage &&
      previous.ruleId === snapshot.ruleId &&
      previous.explanation === snapshot.explanation &&
      previous.tCode === snapshot.tCode &&
      previous.nCode === snapshot.nCode &&
      previous.mCode === snapshot.mCode &&
      previous.missing.join("|") === snapshot.missing.join("|")
    ) {
      return;
    }
    onChange({ ...current, derived: snapshot });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview]);

  const set = (patch: Partial<StagingDraftRecord>) =>
    onChange({ ...recordRef.current, ...patch });

  const setCondition = (key: string, value: string) => {
    const next = { ...recordRef.current.conditions };
    if (value) next[key] = value;
    else delete next[key];
    set({ conditions: next });
  };

  if (detailError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-700">
        Could not load the staging rules: {detailError}
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="animate-pulse rounded-lg border border-gray-200 bg-[#F7F9FB] px-3 py-6 text-center text-[10px] font-bold text-gray-400">
        Loading staging rules…
      </div>
    );
  }

  const mode = detail.mode;
  const stageGroups = sortStageGroups(detail.stage_groups ?? []);
  const derivedStage =
    preview?.status === "MATCHED" ? preview.derived_stage : null;
  const stageValue = record.isOverridden
    ? record.finalStage
    : derivedStage || record.finalStage;

  const matchedRule = preview?.matched_rule ?? null;
  const invalidCodes = preview?.invalid_codes ?? [];
  const missingConditions = preview?.missing_conditions ?? [];

  const canRemove =
    Boolean(findStageDraft([record], record.cancerTypeId, context)) &&
    Boolean(record.t || record.n || record.m || record.s || record.finalStage);

  return (
    <div className="space-y-4">
      {mode === "DIRECT" ? (
        <div>
          <label className={LABEL}>
            Stage <span className="font-normal text-gray-400">({detail.schema.system ?? "Disease-specific"})</span>
          </label>
          <select
            value={record.finalStage}
            onChange={(event) => set({ finalStage: event.target.value })}
            disabled={disabled}
            className={INPUT}
          >
            <option value="">Select the stage…</option>
            {detail.direct_stages.map((stage) => (
              <option key={stage.stage_code} value={stage.stage_code}>
                {stage.stage_code}
                {stage.definition ? ` — ${stage.definition}` : ""}
              </option>
            ))}
          </select>
          {record.finalStage && (
            <p className="mt-1.5 text-[9px] leading-relaxed text-gray-500">
              {detail.direct_stages.find(
                (stage) => stage.stage_code === record.finalStage
              )?.definition ?? ""}
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-4">
            {detail.axes.map((axis) => {
              const options = sortCodes(detail.categories[axis] ?? [], axis);
              const value = record[axis.toLowerCase() as "t" | "n" | "m" | "s"];
              const selected = options.find((option) => option.code === value);
              return (
                <div key={axis}>
                  <label className={LABEL}>{AXIS_LABEL[axis]}</label>
                  <select
                    value={value}
                    onChange={(event) =>
                      set({
                        [axis.toLowerCase()]: event.target.value,
                      } as Partial<StagingDraftRecord>)
                    }
                    disabled={disabled}
                    className={INPUT}
                  >
                    <option value="">{AXIS_PLACEHOLDER[axis]}</option>
                    {options.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.code}
                      </option>
                    ))}
                  </select>
                  <p
                    className="mt-1 min-h-[22px] text-[9px] leading-snug text-gray-400"
                    title={selected?.definition ?? ""}
                  >
                    {selected?.definition ?? ""}
                  </p>
                </div>
              );
            })}
          </div>

          {detail.extra_inputs.filter(
            (criterion) => criterion.rendered_as !== "axis"
          ).length > 0 && (
            <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-4">
              {detail.extra_inputs
                .filter((criterion) => criterion.rendered_as !== "axis")
                .map((criterion) => {
                  const key = criterion.criterion_key;
                  const value = record.conditions?.[key] ?? "";
                  return (
                    <div key={key}>
                      <label className={LABEL}>
                        {criterion.label}
                        {criterion.unit ? (
                          <span className="font-normal text-gray-400">
                            {" "}
                            ({criterion.unit})
                          </span>
                        ) : null}
                      </label>
                      {criterion.input_type === "NUMBER" ? (
                        <input
                          type="number"
                          inputMode="numeric"
                          value={value}
                          onChange={(event) =>
                            setCondition(key, event.target.value)
                          }
                          disabled={disabled}
                          className={INPUT}
                          placeholder="Enter value"
                        />
                      ) : (
                        <select
                          value={value}
                          onChange={(event) =>
                            setCondition(key, event.target.value)
                          }
                          disabled={disabled}
                          className={INPUT}
                        >
                          <option value="">Select…</option>
                          {criterion.options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {/* Calculated result */}
          <div
            className={`rounded-lg border px-3.5 py-3 ${
              derivedStage
                ? "border-[#BBF7D0] bg-[#F0FDF4]"
                : preview?.status === "NO_MATCH" ||
                    preview?.status === "AMBIGUOUS"
                  ? "border-[#FDE68A] bg-[#FFFBEB]"
                  : "border-gray-200 bg-[#F7F9FB]"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[9px] font-bold uppercase tracking-wide text-gray-500">
                Calculated stage
              </span>
              <span
                className={`text-[13px] font-bold ${
                  derivedStage
                    ? "text-[#166534]"
                    : preview?.status === "NO_MATCH" ||
                        preview?.status === "AMBIGUOUS"
                      ? "text-[#92400E]"
                      : "text-gray-400"
                }`}
              >
                {deriving
                  ? "Calculating…"
                  : derivedStage
                    ? `Stage ${derivedStage}`
                    : "—"}
              </span>
            </div>

            {matchedRule?.criteria_text && derivedStage && (
              <p className="mt-1.5 text-[9px] leading-relaxed text-[#166534]">
                {matchedRule.criteria_text}
              </p>
            )}

            {!deriving && !derivedStage && preview?.explanation && (
              <p className="mt-1.5 text-[9px] leading-relaxed text-[#92400E]">
                {preview.explanation}
              </p>
            )}

            {!preview && !deriving && !deriveError && (
              <p className="mt-1.5 text-[9px] leading-relaxed text-gray-500">
                {mode === "TNM"
                  ? "Choose T, N and M (plus any required criteria) to calculate the stage group."
                  : "Choose the stage."}
              </p>
            )}

            {missingConditions.length > 0 && (
              <p className="mt-1.5 text-[9px] leading-relaxed text-[#92400E]">
                Still required:{" "}
                {missingConditions
                  .map(
                    (key) =>
                      detail.extra_inputs.find(
                        (criterion) => criterion.criterion_key === key
                      )?.label ?? key
                  )
                  .join(", ")}
              </p>
            )}

            {invalidCodes.length > 0 && (
              <p className="mt-1.5 text-[9px] font-bold leading-relaxed text-[#B91C1C]">
                {invalidCodes.join(" / ")} is not part of this staging system in
                the {contextLabel(context).toLowerCase()} context.
              </p>
            )}

            {preview?.warnings?.map((warning) => (
              <p key={warning} className="mt-1.5 text-[9px] leading-relaxed text-[#92400E]">
                {warning}
              </p>
            ))}

            {deriveError && (
              <p className="mt-1.5 text-[9px] leading-relaxed text-red-600">
                {deriveError}
              </p>
            )}
          </div>
        </>
      )}

      {/* Override */}
      {mode === "TNM" && (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3">
          <label className="flex cursor-pointer items-center gap-2 text-[10px] font-bold text-gray-800">
            <input
              type="checkbox"
              checked={record.isOverridden}
              onChange={(event) =>
                set({
                  isOverridden: event.target.checked,
                  finalStage: event.target.checked
                    ? record.finalStage || derivedStage || ""
                    : "",
                  overrideReason: event.target.checked
                    ? record.overrideReason
                    : "",
                })
              }
              disabled={disabled}
              className="h-3.5 w-3.5 rounded border-gray-300 accent-[#1d4ed8]"
            />
            Override the calculated stage
          </label>

          {record.isOverridden && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className={LABEL}>Stage recorded instead</label>
                <select
                  value={record.finalStage}
                  onChange={(event) => set({ finalStage: event.target.value })}
                  disabled={disabled}
                  className={INPUT}
                >
                  <option value="">Select the stage…</option>
                  {stageGroups.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                  {record.finalStage &&
                    !stageGroups.includes(record.finalStage) && (
                      <option value={record.finalStage}>
                        {record.finalStage}
                      </option>
                    )}
                </select>
              </div>
              <div>
                <label className={LABEL}>
                  Reason{" "}
                  <span className="font-normal text-gray-400">
                    (at least 10 characters)
                  </span>
                </label>
                <textarea
                  rows={2}
                  value={record.overrideReason}
                  onChange={(event) =>
                    set({ overrideReason: event.target.value })
                  }
                  disabled={disabled}
                  className={INPUT}
                  placeholder="Why is the stage being overridden?"
                />
              </div>
              {record.isOverridden &&
                record.finalStage.length > 0 &&
                record.overrideReason.trim().length < 10 && (
                  <p className="text-[9px] font-bold text-[#B45309] sm:col-span-2">
                    Add a reason of at least 10 characters before saving.
                  </p>
                )}
            </div>
          )}

          {record.isOverridden && stageValue && (
            <p className="mt-2 text-[9px] leading-relaxed text-[#1d4ed8]">
              This stage will be recorded as {stageValue}
              {derivedStage ? ` (calculated ${derivedStage})` : ""}.
            </p>
          )}
        </div>
      )}

      {/* Date + note */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={LABEL}>Stage date</label>
          <input
            type="date"
            value={record.stageDate || currentStageDate || ""}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(event) => set({ stageDate: event.target.value })}
            disabled={disabled}
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>
            Note <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={record.notes}
            onChange={(event) => set({ notes: event.target.value })}
            disabled={disabled}
            className={INPUT}
            placeholder="e.g. imaging or MDT reference"
          />
        </div>
      </div>

      {canRemove && !disabled && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md px-2 py-1 text-[9px] font-bold text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            Remove this stage
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------- one cancer type block ------------------------- */

interface CancerStagingBlockProps {
  cancerTypeId: string;
  cancerTypeName: string;
  patientId?: string;
  records: StagingDraftRecord[];
  allRecords: StagingDraftRecord[];
  onChange: (next: StagingDraftRecord[]) => void;
  primary: boolean;
  autofill?: StagingAutofill;
  defaultStageDate?: string;
  disabled?: boolean;
  ihc: StageIhcDraft;
  onIhcChange: (next: StageIhcDraft) => void;
}

function CancerStagingBlock({
  cancerTypeId,
  cancerTypeName,
  patientId,
  records,
  allRecords,
  onChange,
  primary,
  autofill,
  defaultStageDate,
  disabled,
  ihc,
  onIhcChange,
}: CancerStagingBlockProps) {
  const [list, setList] = useState<StagingSchemasResponse | null>(null);
  const [listError, setListError] = useState("");
  const [expanded, setExpanded] = useState(primary);
  const [schemaChoice, setSchemaChoice] = useState<string | null>(null);
  const [activeContext, setActiveContext] = useState<StageContext | null>(null);
  const [schemaNotice, setSchemaNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    setList(null);
    setListError("");

    stagingApi
      .schemas(cancerTypeId, patientId)
      .then((data) => {
        if (!cancelled) setList(data);
      })
      .catch((error) => {
        if (!cancelled) setListError(errorMessage(error));
      });

    return () => {
      cancelled = true;
    };
  }, [cancerTypeId, patientId]);

  const schemas = list?.schemas ?? [];
  const recordSchema = records.find((record) => record.schemaId)?.schemaId ?? "";
  const activeSchemaId =
    schemaChoice ||
    recordSchema ||
    list?.suggested_schema_id ||
    list?.default_schema_id ||
    "";
  const activeSchema =
    schemas.find((schema) => schema.schema_id === activeSchemaId) ?? schemas[0] ?? null;

  const contexts = activeSchema?.contexts ?? [];
  const contextToUse: StageContext | null =
    (activeContext && contexts.some((entry) => entry.context === activeContext)
      ? activeContext
      : null) ??
    (contexts.some((entry) => entry.context === "CLINICAL")
      ? "CLINICAL"
      : contexts[0]?.context ?? null);

  const existingContexts = new Set(records.map((record) => record.context));
  const summaryRecord = primaryStageDraft(records, cancerTypeId);
  const summary = formatStageLine(summaryRecord);
  const summaryStage = summaryRecord ? stageValueOf(summaryRecord) : "";
  const hasStage = Boolean(summaryStage);

  /* Head & neck / oropharynx / oesophagus / vulva read p16 and p40 from the
     IHC report; capture them here so the schema suggestion is immediate. */
  const needsP16 = schemas.some(
    (schema) =>
      /p16/i.test(schema.auto_select_rule ?? "") ||
      /p16/i.test(schema.schema_name ?? "")
  );
  const needsP40 = schemas.some((schema) =>
    /p40/i.test(schema.auto_select_rule ?? "")
  );

  const setIhcField = (patch: Partial<StageIhcDraft>) => {
    const next = { ...ihc, ...patch };
    onIhcChange(next);

    /* Move to the matching schema straight away (the server suggestion only
       updates after the IHC report is saved). */
    const pick = (predicate: (schemaName: string) => boolean) =>
      schemas.find((schema) => predicate(schema.schema_name ?? ""))?.schema_id;

    if (patch.p16Status !== undefined) {
      const kind = answerKind(patch.p16Status);
      const target =
        kind === "positive"
          ? pick((name) => /p16-positive|HPV-associated/i.test(name))
          : kind === "negative"
            ? pick((name) => /p16-negative/i.test(name))
            : undefined;
      if (target && target !== activeSchemaId) {
        setSchemaChoice(target);
        setSchemaNotice(
          kind === "positive"
            ? "p16 positive — switched to the HPV-associated schema."
            : "p16 negative — switched to the p16-negative schema."
        );
      }
    }

    if (patch.p40Status !== undefined) {
      const kind = answerKind(patch.p40Status);
      const target =
        kind === "positive"
          ? pick((name) => /squamous/i.test(name))
          : kind === "negative"
            ? pick((name) => /adenocarcinoma/i.test(name))
            : undefined;
      if (target && target !== activeSchemaId) {
        setSchemaChoice(target);
        setSchemaNotice(
          kind === "positive"
            ? "p40 positive — switched to the squamous schema."
            : "p40 negative — switched to the adenocarcinoma schema."
        );
      }
    }
  };

  const changeSchema = (nextSchemaId: string) => {
    setSchemaChoice(nextSchemaId);
    setSchemaNotice("");
    if (nextSchemaId === activeSchemaId) return;

    /* Codes belong to a schema, so a switch clears the selections of this
       cancer type instead of carrying invalid codes across. */
    const next = allRecords.map((record) =>
      record.cancerTypeId === cancerTypeId
        ? {
            ...emptyStageDraft(
              cancerTypeId,
              nextSchemaId,
              record.context,
              record.stageDate
            ),
            notes: record.notes,
          }
        : record
    );
    onChange(next);
  };

  const updateRecord = (next: StagingDraftRecord) => {
    onChange(upsertStageDraft(allRecords, next));
  };

  const currentRecord = activeSchema && contextToUse
    ? findStageDraft(allRecords, cancerTypeId, contextToUse) ?? null
    : null;

  const displayRecord =
    activeSchema && contextToUse
      ? currentRecord ??
        emptyStageDraft(
          cancerTypeId,
          activeSchema.schema_id,
          contextToUse,
          defaultStageDate ?? ""
        )
      : null;

  return (
    <div className="px-5 py-4">
      <button
        type="button"
        onClick={() => setExpanded((previous) => !previous)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-[#334155]">
              {cancerTypeName}
            </span>
            {primary && (
              <span className="rounded-full border border-[#D6E3FF] bg-[#F2F6FF] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[#00488D]">
                Primary
              </span>
            )}
            {activeSchema?.edition && (
              <span className="text-[9px] text-gray-400">
                {activeSchema.system ?? ""} {activeSchema.edition}
              </span>
            )}
          </div>
          {!expanded && (
            <p className="mt-1 truncate text-[9px] text-gray-500">
              {hasStage
                ? summary
                : "No stage recorded yet"}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {hasStage ? <StatusPill stage={summaryStage} /> : (
            <IncompletePill label="Not staged" />
          )}
          <span className="text-[12px] leading-none text-gray-400">
            {expanded ? "▾" : "▸"}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          {listError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-700">
              Could not load the staging schemas: {listError}
            </div>
          )}

          {!list && !listError && (
            <div className="animate-pulse rounded-lg border border-gray-200 bg-[#F7F9FB] px-3 py-5 text-center text-[10px] font-bold text-gray-400">
              Loading staging system…
            </div>
          )}

          {list && schemas.length === 0 && (
            <div className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-[10px] text-[#92400E]">
              No TNM staging system is mapped to this cancer type.
            </div>
          )}

          {list && schemas.length > 0 && (
            <>
              {schemas.length > 1 && (
                <div>
                  <label className={LABEL}>
                    {list.subsite_question ?? "Staging system"}
                  </label>
                  <select
                    value={activeSchema?.schema_id ?? ""}
                    onChange={(event) => changeSchema(event.target.value)}
                    disabled={disabled}
                    className={INPUT}
                  >
                    {schemas.map((schema) => (
                      <option key={schema.schema_id} value={schema.schema_id}>
                        {schema.schema_name}
                        {schema.role === "PRIMARY" ? " (primary)" : ""}
                      </option>
                    ))}
                  </select>
                  {schemaNotice && (
                    <p className="mt-1.5 text-[9px] font-bold text-[#1d4ed8]">
                      {schemaNotice}
                    </p>
                  )}
                  {activeSchema?.suggested && activeSchema.suggestion_reason && (
                    <p className="mt-1.5 text-[9px] text-[#166534]">
                      Suggested: {activeSchema.suggestion_reason}
                    </p>
                  )}
                  {activeSchema?.note && (
                    <p className="mt-1.5 text-[9px] leading-relaxed text-gray-500">
                      {activeSchema.note}
                    </p>
                  )}
                </div>
              )}

              {(needsP16 || needsP40) && (
                <div className="rounded-lg border border-[#D6E3FF] bg-[#F7FAFF] px-3.5 py-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[150px] flex-1">
                      <label className={LABEL}>p16 (IHC)</label>
                      <select
                        value={ihc.p16Status}
                        onChange={(event) =>
                          setIhcField({ p16Status: event.target.value })
                        }
                        disabled={disabled}
                        className={INPUT}
                      >
                        <option value="">Not recorded</option>
                        <option value="Positive">Positive</option>
                        <option value="Negative">Negative</option>
                        <option value="Equivocal">Equivocal</option>
                        <option value="Not Done">Not Done</option>
                      </select>
                    </div>
                    {answerKind(ihc.p16Status) === "positive" && (
                      <div className="w-[110px]">
                        <label className={LABEL}>p16 %</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={ihc.p16Percent}
                          onChange={(event) =>
                            setIhcField({ p16Percent: event.target.value })
                          }
                          disabled={disabled}
                          className={INPUT}
                          placeholder="0–100"
                        />
                      </div>
                    )}
                    {needsP40 && (
                      <div className="min-w-[150px] flex-1">
                        <label className={LABEL}>p40 (IHC)</label>
                        <select
                          value={ihc.p40Status}
                          onChange={(event) =>
                            setIhcField({ p40Status: event.target.value })
                          }
                          disabled={disabled}
                          className={INPUT}
                        >
                          <option value="">Not recorded</option>
                          <option value="Positive">Positive</option>
                          <option value="Negative">Negative</option>
                          <option value="Not Done">Not Done</option>
                        </select>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-[9px] leading-relaxed text-gray-500">
                    p16 is positive at ≥70% strong staining. These values pre-select
                    the staging schema and are saved with the IHC report.
                  </p>
                </div>
              )}

              {/* Contexts */}
              <div className="flex flex-wrap gap-1.5">
                {contexts.map((entry) => {
                  const selected = entry.context === contextToUse;
                  const recorded = existingContexts.has(entry.context);
                  return (
                    <button
                      key={entry.context}
                      type="button"
                      onClick={() => setActiveContext(entry.context)}
                      title={contextLabel(entry.context)}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[9px] font-bold transition-colors ${
                        selected
                          ? "border-[#1d4ed8] bg-[#1d4ed8] text-white"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-[#F2F4F6]"
                      }`}
                    >
                      {CONTEXT_TAB_LABEL[entry.context]}
                      {recorded && (
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            selected ? "bg-white" : "bg-[#166534]"
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {displayRecord && activeSchema && contextToUse && (
                <StageForm
                  key={`${activeSchema.schema_id}|${contextToUse}`}
                  schemaId={activeSchema.schema_id}
                  context={contextToUse}
                  record={displayRecord}
                  currentStageDate={defaultStageDate}
                  autofill={autofill}
                  disabled={disabled}
                  onChange={updateRecord}
                  onRemove={() =>
                    onChange(removeStageDraft(allRecords, cancerTypeId, contextToUse))
                  }
                />
              )}

              {activeSchema?.contexts.length === 0 && (
                <p className="text-[10px] text-gray-500">
                  This staging system has no recorded contexts.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- the card -------------------------------- */

export default function StagingCard({
  patientId,
  cancerTypes,
  value,
  onChange,
  autofill,
  defaultStageDate,
  disabled,
  ihc,
  onIhcChange,
  alerts = [],
}: StagingCardProps) {
  /* One block per selected type, primary first (the caller orders them). */
  const blocks = useMemo(
    () =>
      cancerTypes.map((type, index) => ({
        ...type,
        primary: index === 0,
        records: value.filter((record) => record.cancerTypeId === type.id),
      })),
    [cancerTypes, value]
  );

  return (
    <section className="col-span-full overflow-clip rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div>
          <h3 className="text-[11px] font-bold text-[#334155]">
            Staging
          </h3>
          <p className="mt-1 text-[9px] leading-relaxed text-gray-500">
            The stage group is calculated from the TNM values; add clinical and
            pathological stages as they become available.
          </p>
        </div>
        <span className="rounded-full border border-[#D6E3FF] bg-[#F2F6FF] px-2.5 py-1 text-[8px] font-bold uppercase tracking-wide text-[#00488D]">
          AJCC / UICC
        </span>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2 px-5 pt-4">
          {alerts.map((alert) => (
            <div
              key={`${alert.message}`}
              className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-[10px] leading-relaxed text-[#92400E]"
            >
              {alert.message}
            </div>
          ))}
        </div>
      )}

      <div className="divide-y divide-gray-100">
        {blocks.length === 0 ? (
          <div className="px-5 py-6 text-center text-[10px] text-gray-500">
            Select a cancer type to record its stage.
          </div>
        ) : (
          blocks.map((block) => (
            <CancerStagingBlock
              key={block.id}
              cancerTypeId={block.id}
              cancerTypeName={block.name}
              patientId={patientId}
              records={block.records}
              allRecords={value}
              onChange={onChange}
              primary={block.primary}
              autofill={autofill}
              defaultStageDate={defaultStageDate}
              disabled={disabled}
              ihc={ihc}
              onIhcChange={onIhcChange}
            />
          ))
        )}
      </div>

      {blocks.length > 0 && (
        <div className="border-t border-gray-100 bg-[#F7F9FB] px-5 py-2.5 text-[9px] leading-relaxed text-gray-500">
          Stages are saved with the diagnosis. Values read from IHC (p16, p40)
          are used to suggest the schema; the clinician confirms it.
        </div>
      )}
    </section>
  );
}
