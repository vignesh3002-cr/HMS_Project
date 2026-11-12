import React, { useMemo, useState } from "react";
import {
  evaluateScore,
  groupOptions,
  methodHint,
  methodLabel,
  type ScoreAssessment,
  type ScoreDefinition,
} from "./scoreEngine";
import {
  autoSourceSummary,
  previewAutoFill,
  type AutoFillContext,
} from "./scoreAutofill";
import {
  previousScoreEntry,
  scoreDelta,
  scoreDeltaText,
  scoreInterpretation,
  scoreResultText,
  scoreWarnings,
  type ScoreHistory,
  type ScoreHistoryEntry,
  type ScoreWarning,
} from "./scoreSummary";
import { ScoreVariableInput } from "./ScoreVariableInput";

const METHOD_STYLES: Record<string, string> = {
  points_sum: "bg-[#e8f0fb] text-[#004785] ring-[#c9dcf5]",
  formula: "bg-violet-50 text-violet-700 ring-violet-100",
  criteria_auto: "bg-amber-50 text-amber-700 ring-amber-100",
  criteria_checklist: "bg-cyan-50 text-cyan-700 ring-cyan-100",
  direct_select: "bg-rose-50 text-rose-700 ring-rose-100",
  numeric_auto_group: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  online_calculator: "bg-slate-100 text-slate-700 ring-slate-200",
};

const STATUS_STYLES: Record<string, string> = {
  complete: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  incomplete: "bg-amber-50 text-amber-700 ring-amber-100",
  not_applicable: "bg-slate-100 text-slate-500 ring-slate-200",
};

const SOURCE_LABEL: Record<string, string> = {
  REG: "Registration",
  VIT: "Vitals",
  LAB: "Lab",
  STG: "Staging",
  IHC: "IHC",
  GEN: "Genomics",
  DER: "Derived",
  PATH: "Pathology",
  CLIN: "Clinician",
  AUTO: "Patient data",
};

const numberText = (value: number | null): string => {
  if (value == null) return "—";
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 10000) / 10000);
};

const entryKey = (scoreId: string, variableId: string) =>
  `${scoreId}::${variableId}`;

const formatDate = (value: string | null): string => {
  if (!value) return "Unknown date";
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
  return value;
};

/* A catalogue row the doctor can browse and pin from the workspace. */
export type CatalogueEntry = {
  scoreId: string;
  name: string;
  system: string | null;
  method: string | null;
  purpose: string | null;
  whenToRecord: string | null;
  range: string | null;
  riskGroups: string | null;
  status: string | null;
  reference: string | null;
  developerNote: string | null;
  cancerType: string | null;
  selected: boolean;
};

export type CataloguePatch = Partial<{
  purpose: string | null;
  when_to_record: string | null;
  score_range: string | null;
  risk_groups: string | null;
  score_status: string | null;
  score_reference: string | null;
  developer_note: string | null;
}>;

const ScoreCard: React.FC<{
  definition: ScoreDefinition;
  assessment: ScoreAssessment;
  history?: ScoreHistory;
  currentStagingDetailId?: string | null;
  favourite?: boolean;
  onChange: (next: ScoreAssessment) => void;
  onRemove: () => void;
  onAutoFill?: () => void;
  onCopyPrevious?: (entry: ScoreHistoryEntry) => void;
  onToggleFavourite?: () => void;
  onAddInterpretation?: (text: string) => void;
}> = ({
  definition,
  assessment,
  history,
  currentStagingDetailId,
  favourite = false,
  onChange,
  onRemove,
  onAutoFill,
  onCopyPrevious,
  onToggleFavourite,
  onAddInterpretation,
}) => {
  const [expanded, setExpanded] = useState(true);
  const evaluation = evaluateScore(definition, assessment);
  const groups = groupOptions(definition.groups);
  const notApplicable = assessment.status === "not_applicable";
  const previous = history
    ? previousScoreEntry(history, definition.scoreId, currentStagingDetailId)
    : null;
  const historyEntries = history?.[definition.scoreId] ?? [];
  const delta = previous ? scoreDelta(evaluation.total, previous.total) : null;
  const deltaText = scoreDeltaText(delta);
  const sources = autoSourceSummary(assessment.values);
  const interpretation = onAddInterpretation
    ? scoreInterpretation(definition, evaluation)
    : null;
  const canInterpret =
    evaluation.status === "not_applicable" ||
    evaluation.total != null ||
    Boolean(evaluation.groupLabel);

  const setValue = (variableId: string, raw: string) => {
    onChange({
      ...assessment,
      values: {
        ...assessment.values,
        [variableId]: {
          raw,
          numeric: null,
          points: null,
          source: raw.trim() ? "manual" : null,
        },
      },
      status: assessment.status === "not_applicable" ? "incomplete" : assessment.status,
      updatedAt: new Date().toISOString(),
    });
  };

  const setGroup = (groupId: string) => {
    onChange({
      ...assessment,
      selectedGroup: groupId || null,
      updatedAt: new Date().toISOString(),
    });
  };

  const toggleNotApplicable = () => {
    onChange({
      ...assessment,
      status: notApplicable ? "incomplete" : "not_applicable",
      updatedAt: new Date().toISOString(),
    });
  };

  const resultText = scoreResultText(
    evaluation.total,
    evaluation.totalLabel,
    evaluation.groupLabel
  );

  const progress =
    evaluation.totalVariables > 0
      ? Math.round((evaluation.completed / evaluation.totalVariables) * 100)
      : 0;

  const selectedGroupId =
    assessment.selectedGroup ??
    (evaluation.autoGroup ? evaluation.group?.score_group_id ?? "" : "");

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="flex w-full items-start gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setExpanded((previous) => !previous)}
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#004785] text-[10px] font-bold text-white"
          aria-label={expanded ? "Collapse score" : "Expand score"}
        >
          {expanded ? "–" : "+"}
        </button>
        <button
          type="button"
          onClick={() => setExpanded((previous) => !previous)}
          className="min-w-0 flex-1 text-left"
        >
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-[12px] font-bold text-slate-900">
              {definition.name}
            </span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ring-1 ring-inset ${
                METHOD_STYLES[definition.method] ?? METHOD_STYLES.online_calculator
              }`}
            >
              {methodLabel(definition.method)}
            </span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ring-1 ring-inset ${
                STATUS_STYLES[evaluation.status] ?? STATUS_STYLES.incomplete
              }`}
            >
              {evaluation.status === "complete"
                ? "Complete"
                : evaluation.status === "not_applicable"
                  ? "Not applicable"
                  : "Incomplete"}
            </span>
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500">
            {definition.purpose && <span>{definition.purpose}</span>}
            {definition.whenToRecord && (
              <>
                <span aria-hidden="true">·</span>
                <span>Record at {definition.whenToRecord.toLowerCase()}</span>
              </>
            )}
            {evaluation.totalVariables > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  {evaluation.completed}/{evaluation.totalVariables} entered
                </span>
              </>
            )}
          </span>
        </button>
        <div className="flex shrink-0 items-start gap-1.5">
          {onToggleFavourite && (
            <button
              type="button"
              onClick={onToggleFavourite}
              aria-label={favourite ? "Remove from favourites" : "Add to favourites"}
              title={favourite ? "Remove from favourites" : "Pin to favourites"}
              className={
                "flex h-6 w-6 items-center justify-center rounded-full border text-[11px] transition " +
                (favourite
                  ? "border-amber-200 bg-amber-50 text-amber-500"
                  : "border-slate-200 bg-white text-slate-300 hover:text-amber-400")
              }
            >
              ★
            </button>
          )}
          <span className="flex flex-col items-end gap-1">
            <span className="text-[12px] font-bold text-[#004785]">
              {resultText || "Not scored"}
            </span>
            {evaluation.total != null &&
              definition.method !== "criteria_checklist" && (
                <span className="text-[9px] font-medium text-slate-400">
                  {definition.method === "points_sum"
                    ? `${numberText(evaluation.total)} points`
                    : definition.method === "formula"
                      ? "calculated"
                      : "value"}
                </span>
              )}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-4 py-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 text-[10px] leading-relaxed text-slate-500">
              {methodHint(definition.method)}
            </p>
            {sources.length > 0 && (
              <span className="flex flex-wrap items-center gap-1">
                <span className="text-[9px] font-semibold text-slate-400">
                  auto-filled from
                </span>
                {sources.map((source) => (
                  <span
                    key={source.source}
                    className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-100"
                  >
                    {SOURCE_LABEL[source.source] ?? source.source} {source.count}
                  </span>
                ))}
              </span>
            )}
          </div>

          {previous && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-slate-700">
                  Previous visit ({formatDate(previous.date)}):{" "}
                  <span className="text-[#004785]">
                    {previous.summary || "Not scored"}
                  </span>
                </p>
                <p className="mt-0.5 text-[9px] text-slate-500">
                  {deltaText == null
                    ? "No comparable numeric total."
                    : delta === 0
                      ? "No change since the previous visit."
                      : `${deltaText} point${Math.abs(delta ?? 0) === 1 ? "" : "s"} since the previous visit.`}
                  {previous.group && evaluation.groupLabel
                    ? ` Risk group now ${evaluation.groupLabel}, before ${previous.group}.`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {deltaText && (
                  <span
                    className={
                      "rounded-full px-1.5 py-0.5 text-[9px] font-bold ring-1 ring-inset " +
                      (delta && delta > 0
                        ? "bg-rose-50 text-rose-600 ring-rose-100"
                        : delta && delta < 0
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                          : "bg-slate-100 text-slate-500 ring-slate-200")
                    }
                  >
                    {deltaText}
                  </span>
                )}
                {onCopyPrevious && (
                  <button
                    type="button"
                    onClick={() => onCopyPrevious(previous)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[9px] font-semibold text-slate-600 transition hover:border-[#004785]/30 hover:bg-[#f4f8fd] hover:text-[#004785]"
                  >
                    Copy previous values
                  </button>
                )}
              </div>
            </div>
          )}

          {notApplicable ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-[10px] text-slate-500">
              This score is marked not applicable for this patient. It will be
              saved as “Not applicable”.
            </div>
          ) : (
            <>
              {definition.variables.length > 0 ? (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {definition.variables.map((variable) => (
                    <ScoreVariableInput
                      key={variable.id}
                      variable={variable}
                      value={
                        assessment.values[variable.id] ?? {
                          raw: "",
                          numeric: null,
                          points: null,
                          source: null,
                        }
                      }
                      onChange={(raw) => setValue(variable.id, raw)}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-[10px] text-slate-500">
                  This score has no structured variables. Record it as a free
                  text score above.
                </p>
              )}

              {evaluation.missing.length > 0 && !evaluation.groupLabel && (
                <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[10px] text-amber-800 ring-1 ring-inset ring-amber-100">
                  Still needed: {evaluation.missing.join(", ")}
                </div>
              )}
              {evaluation.errors.length > 0 && (
                <div className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-[10px] text-rose-700 ring-1 ring-inset ring-rose-100">
                  {evaluation.errors.join(" ")}
                </div>
              )}

              {groups.length > 0 && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                  <label className="mb-1 flex items-center justify-between text-[10px] font-semibold text-slate-700">
                    <span>Risk group</span>
                    {evaluation.autoGroup && !assessment.selectedGroup && (
                      <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
                        auto-assigned
                      </span>
                    )}
                  </label>
                  <select
                    value={selectedGroupId}
                    onChange={(event) => setGroup(event.target.value)}
                    className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px] text-slate-800 shadow-sm focus:border-[#004785] focus:outline-none focus:ring-2 focus:ring-[#004785]/15"
                  >
                    <option value="">
                      {definition.method === "direct_select" ||
                      definition.method === "online_calculator"
                        ? "Select risk group…"
                        : "Auto / select a group…"}
                    </option>
                    {groups.map((group) => (
                      <option key={group.value} value={group.value}>
                        {group.label}
                        {group.detail ? ` (${group.detail})` : ""}
                      </option>
                    ))}
                  </select>
                  {evaluation.group && (
                    <p className="mt-1.5 text-[10px] text-slate-500">
                      Selected:{" "}
                      <strong className="text-slate-700">
                        {evaluation.groupLabel}
                      </strong>
                      {evaluation.group.group_range
                        ? ` — ${evaluation.group.group_range}`
                        : ""}
                      {evaluation.groupReason && (
                        <span className="ml-1 text-slate-400">
                          ({evaluation.groupReason.toLowerCase()})
                        </span>
                      )}
                    </p>
                  )}
                </div>
              )}

              {(evaluation.expression || evaluation.breakdown.length > 0) && (
                <details className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <summary className="cursor-pointer text-[10px] font-semibold text-slate-600">
                    Working / audit trail
                  </summary>
                  {evaluation.expression && (
                    <p className="mt-1.5 break-words font-mono text-[10px] text-violet-700">
                      {evaluation.expression}
                    </p>
                  )}
                  {evaluation.breakdown.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                      {evaluation.breakdown.map((item, index) => (
                        <li
                          key={`${item.label}-${index}`}
                          className="flex items-start justify-between gap-2 text-[10px] text-slate-500"
                        >
                          <span>{item.label}</span>
                          <span className="font-mono text-slate-700">
                            {item.value}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <ul className="mt-2 space-y-0.5 border-t border-slate-100 pt-2">
                    {Object.entries(assessment.values)
                      .filter(([, value]) => value.raw?.trim())
                      .map(([variableId, value]) => {
                        const variable = definition.variables.find(
                          (item) => item.id === variableId
                        );
                        return (
                          <li
                            key={variableId}
                            className="flex items-start justify-between gap-2 text-[9px] text-slate-400"
                          >
                            <span className="truncate">
                              {variable?.name ?? variableId}
                            </span>
                            <span className="shrink-0 font-mono">
                              {value.raw}
                              {value.source === "auto"
                                ? ` · ${value.autoSource ?? "auto"}${
                                    value.reason ? ` (${value.reason})` : ""
                                  }`
                                : value.source === "manual"
                                  ? " · entered"
                                  : ""}
                            </span>
                          </li>
                        );
                      })}
                  </ul>
                </details>
              )}
            </>
          )}

          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-[10px] font-semibold text-slate-600">
                Clinical note
              </label>
              {interpretation && onAddInterpretation && canInterpret && (
                <button
                  type="button"
                  onClick={() => onAddInterpretation(interpretation)}
                  className="text-[9px] font-medium text-[#004785] underline-offset-2 hover:underline"
                >
                  Add suggested interpretation
                </button>
              )}
            </div>
            <textarea
              rows={2}
              value={assessment.note}
              onChange={(event) =>
                onChange({ ...assessment, note: event.target.value })
              }
              placeholder="Optional comment for this score at this visit"
              className="block w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px] text-slate-800 shadow-sm focus:border-[#004785] focus:outline-none focus:ring-2 focus:ring-[#004785]/15"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleNotApplicable}
                className={
                  "rounded-lg border px-2.5 py-1.5 text-[10px] font-medium transition " +
                  (notApplicable
                    ? "border-[#004785] bg-[#004785] text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")
                }
              >
                {notApplicable ? "Undo not applicable" : "Mark not applicable"}
              </button>
              {onAutoFill && !notApplicable && (
                <button
                  type="button"
                  onClick={onAutoFill}
                  className="rounded-lg border border-[#004785]/25 bg-[#f4f8fd] px-2.5 py-1.5 text-[10px] font-semibold text-[#004785] transition hover:border-[#004785]/40 hover:bg-[#e8f0fb] active:scale-[0.98]"
                >
                  Preview auto-fill
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {evaluation.totalVariables > 0 && (
                <span className="flex items-center gap-1.5 text-[9px] text-slate-400">
                  <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                    <span
                      className="block h-full rounded-full bg-[#004785] transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </span>
                  {progress}%
                </span>
              )}
              <button
                type="button"
                onClick={onRemove}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-medium text-rose-600 transition hover:border-rose-200 hover:bg-rose-50"
              >
                Remove score
              </button>
            </div>
          </div>

          {historyEntries.length > 0 && (
            <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2">
              <summary className="cursor-pointer text-[10px] font-semibold text-slate-600">
                Score history ({historyEntries.length})
              </summary>
              {historyEntries.filter((item) => item.total != null).length > 1 && (
                <div className="mt-2 flex items-end gap-1 rounded-lg bg-white px-2 py-2 ring-1 ring-inset ring-slate-100">
                  {(() => {
                    const points = [...historyEntries]
                      .reverse()
                      .filter((item) => item.total != null)
                      .slice(-10);
                    const max = Math.max(
                      ...points.map((item) => Math.abs(item.total ?? 0)),
                      1
                    );
                    return points.map((item) => (
                      <span
                        key={`${item.stagingDetailId}-bar`}
                        title={`${formatDate(item.date)}: ${item.summary}`}
                        className="w-3 rounded-t bg-[#004785]/70"
                        style={{
                          height: `${Math.max(
                            4,
                            (Math.abs(item.total ?? 0) / max) * 32
                          )}px`,
                        }}
                      />
                    ));
                  })()}
                  <span className="ml-1 text-[8px] text-slate-400">
                    older → newer
                  </span>
                </div>
              )}
              <div className="mt-2 space-y-1">
                {historyEntries.slice(0, 8).map((item, index) => {
                  const itemDelta = scoreDelta(
                    item.total,
                    historyEntries[index + 1]?.total ?? null
                  );
                  return (
                    <div
                      key={`${item.stagingDetailId}-${item.date}`}
                      className="flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-1.5 text-[9px] ring-1 ring-inset ring-slate-100"
                    >
                      <span className="shrink-0 text-slate-500">
                        {formatDate(item.date)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-slate-700">
                        {item.summary || "Not scored"}
                      </span>
                      <span
                        className={
                          "shrink-0 rounded-full px-1.5 py-0.5 font-semibold ring-1 ring-inset " +
                          (item.status === "complete"
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                            : item.status === "not_applicable"
                              ? "bg-slate-100 text-slate-500 ring-slate-200"
                              : "bg-amber-50 text-amber-700 ring-amber-100")
                        }
                      >
                        {item.status === "not_applicable"
                          ? "N/A"
                          : item.status}
                      </span>
                      {itemDelta != null && (
                        <span className="shrink-0 font-mono text-slate-400">
                          {scoreDeltaText(itemDelta)}
                        </span>
                      )}
                    </div>
                  );
                })}
                {historyEntries.length > 8 && (
                  <p className="text-[9px] text-slate-400">
                    Showing the 8 most recent visits.
                  </p>
                )}
              </div>
            </details>
          )}

          <details className="mt-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
            <summary className="cursor-pointer text-[10px] font-semibold text-slate-500">
              About this score
            </summary>
            <dl className="mt-2 space-y-1 text-[10px] text-slate-500">
              {definition.range && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 font-medium text-slate-600">Range</dt>
                  <dd>{definition.range}</dd>
                </div>
              )}
              {definition.riskGroups && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 font-medium text-slate-600">Groups</dt>
                  <dd>{definition.riskGroups}</dd>
                </div>
              )}
              {definition.status && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 font-medium text-slate-600">Status</dt>
                  <dd>{definition.status}</dd>
                </div>
              )}
              {definition.reference && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 font-medium text-slate-600">Reference</dt>
                  <dd>{definition.reference}</dd>
                </div>
              )}
              {definition.developerNote && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 font-medium text-slate-600">Note</dt>
                  <dd>{definition.developerNote}</dd>
                </div>
              )}
            </dl>
          </details>
        </div>
      )}
    </div>
  );
};

/* The Score workspace: a sticky result bar over one card per selected score,
   plus the auto-fill preview, history and catalogue dialogs. */
export const ScoreWorkspace: React.FC<{
  entries: { definition: ScoreDefinition; assessment: ScoreAssessment }[];
  loading: Record<string, boolean>;
  autoFillBusy?: boolean;
  autoFillNotice?: string | null;
  autoFillContext?: AutoFillContext | null;
  history?: ScoreHistory;
  currentStagingDetailId?: string | null;
  /* Visit date the prefilled values came from, when they are a prior visit's
     row rather than this visit's own saved assessment. */
  restoredFromVisit?: string | null;
  warnings?: ScoreWarning[];
  autoFillUndoAvailable?: boolean;
  favourites?: string[];
  catalogue?: CatalogueEntry[];
  onAutoFillAll?: () => void;
  onAutoFillOne?: (scoreId: string) => void;
  onApplyAutoFill?: (
    selection: { scoreId: string; variableIds: string[] }[]
  ) => void;
  onUndoAutoFill?: () => void;
  onCopyPrevious?: (scoreId: string, entry: ScoreHistoryEntry) => void;
  onToggleFavourite?: (scoreId: string) => void;
  onAddCatalogue?: (entry: CatalogueEntry) => void;
  onUpdateCatalogue?: (
    scoreId: string,
    patch: CataloguePatch
  ) => Promise<string | null>;
  onExportCsv?: () => void;
  onAssessmentChange: (scoreId: string, assessment: ScoreAssessment) => void;
  onRemove: (scoreId: string) => void;
}> = ({
  entries,
  loading,
  autoFillBusy = false,
  autoFillNotice = null,
  autoFillContext = null,
  history,
  currentStagingDetailId,
  restoredFromVisit = null,
  warnings,
  autoFillUndoAvailable = false,
  favourites = [],
  catalogue = [],
  onAutoFillAll,
  onAutoFillOne,
  onApplyAutoFill,
  onUndoAutoFill,
  onCopyPrevious,
  onToggleFavourite,
  onAddCatalogue,
  onUpdateCatalogue,
  onExportCsv,
  onAssessmentChange,
  onRemove,
}) => {
  const [previewIds, setPreviewIds] = useState<string[] | null>(null);
  const [previewChecks, setPreviewChecks] = useState<Record<string, boolean>>(
    {}
  );
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  const [catalogueQuery, setCatalogueQuery] = useState("");
  const [editingCatalogueId, setEditingCatalogueId] = useState<string | null>(
    null
  );
  const [catalogueDraft, setCatalogueDraft] = useState<Record<string, string>>(
    {}
  );
  const [catalogueSaving, setCatalogueSaving] = useState(false);
  const [catalogueError, setCatalogueError] = useState<string | null>(null);

  const startCatalogueEdit = (item: CatalogueEntry) => {
    setEditingCatalogueId(item.scoreId);
    setCatalogueError(null);
    setCatalogueDraft({
      purpose: item.purpose ?? "",
      when_to_record: item.whenToRecord ?? "",
      score_range: item.range ?? "",
      risk_groups: item.riskGroups ?? "",
      score_status: item.status ?? "",
      score_reference: item.reference ?? "",
      developer_note: item.developerNote ?? "",
    });
  };

  const saveCatalogueEdit = async () => {
    if (!editingCatalogueId || !onUpdateCatalogue) return;
    setCatalogueSaving(true);
    setCatalogueError(null);
    const error = await onUpdateCatalogue(editingCatalogueId, {
      purpose: catalogueDraft.purpose ?? "",
      when_to_record: catalogueDraft.when_to_record ?? "",
      score_range: catalogueDraft.score_range ?? "",
      risk_groups: catalogueDraft.risk_groups ?? "",
      score_status: catalogueDraft.score_status ?? "",
      score_reference: catalogueDraft.score_reference ?? "",
      developer_note: catalogueDraft.developer_note ?? "",
    });
    setCatalogueSaving(false);
    if (error) {
      setCatalogueError(error);
      return;
    }
    setEditingCatalogueId(null);
  };

  const loadingIds = Object.keys(loading).filter((key) => loading[key]);
  const validation = useMemo(
    () =>
      warnings ??
      scoreWarnings(
        entries.map((entry) => ({
          definition: entry.definition,
          evaluation: evaluateScore(entry.definition, entry.assessment),
        }))
      ),
    [warnings, entries]
  );
  const errorCount = validation.filter((item) => item.severity === "error").length;
  const warningCount = validation.length - errorCount;

  const autoFilledTotal = useMemo(
    () =>
      entries.reduce(
        (total, entry) =>
          total +
          autoSourceSummary(entry.assessment.values).reduce(
            (sum, source) => sum + source.count,
            0
          ),
        0
      ),
    [entries]
  );

  const previews = useMemo(() => {
    if (!previewIds || !autoFillContext) return [];
    return entries
      .filter((entry) => previewIds.includes(entry.definition.scoreId))
      .map((entry) => ({
        entry,
        preview: previewAutoFill(
          entry.definition,
          entry.assessment,
          autoFillContext
        ),
      }));
  }, [previewIds, autoFillContext, entries]);

  const openPreview = (scoreIds: string[]) => {
    if (!autoFillContext || !onApplyAutoFill) {
      scoreIds.forEach((scoreId) => onAutoFillOne?.(scoreId));
      return;
    }
    const targetIds = scoreIds.filter((scoreId) =>
      entries.some((entry) => entry.definition.scoreId === scoreId)
    );
    if (targetIds.length === 0) return;
    const checks: Record<string, boolean> = {};
    for (const entry of entries) {
      if (!targetIds.includes(entry.definition.scoreId)) continue;
      const preview = previewAutoFill(
        entry.definition,
        entry.assessment,
        autoFillContext
      );
      for (const row of preview.rows) {
        checks[entryKey(entry.definition.scoreId, row.variableId)] =
          row.willReplace;
      }
    }
    setPreviewChecks(checks);
    setPreviewIds(targetIds);
  };

  const applyPreview = () => {
    const selection = previews
      .map(({ entry, preview }) => ({
        scoreId: entry.definition.scoreId,
        variableIds: preview.rows
          .filter(
            (row) =>
              previewChecks[entryKey(entry.definition.scoreId, row.variableId)]
          )
          .map((row) => row.variableId),
      }))
      .filter((item) => item.variableIds.length > 0);
    onApplyAutoFill?.(selection);
    setPreviewIds(null);
  };

  const selectedCount = previews.reduce(
    (total, { entry, preview }) =>
      total +
      preview.rows.filter(
        (row) =>
          previewChecks[entryKey(entry.definition.scoreId, row.variableId)]
      ).length,
    0
  );

  const filteredCatalogue = useMemo(() => {
    const needle = catalogueQuery.trim().toLowerCase();
    const list = needle
      ? catalogue.filter(
          (item) =>
            item.name.toLowerCase().includes(needle) ||
            (item.system ?? "").toLowerCase().includes(needle) ||
            (item.cancerType ?? "").toLowerCase().includes(needle)
        )
      : catalogue;
    return [...list].sort((a, b) => {
      const aPinned = favourites.includes(a.scoreId) ? 0 : 1;
      const bPinned = favourites.includes(b.scoreId) ? 0 : 1;
      if (aPinned !== bPinned) return aPinned - bPinned;
      if (a.selected !== b.selected) return a.selected ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  }, [catalogue, catalogueQuery, favourites]);

  if (entries.length === 0 && loadingIds.length === 0) return null;

  return (
    <div className="col-span-full mt-2 space-y-3">
      {/* Sticky result bar: the whole visit at a glance while scrolling. */}
      <div className="sticky top-1 z-10 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[10px] font-bold text-[#334155]">
              Score details
            </h3>
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600">
              {entries.length} recorded
            </span>
            {entries.length > 0 && (
              <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">
                {
                  entries.filter(
                    (entry) =>
                      evaluateScore(entry.definition, entry.assessment)
                        .status === "complete"
                  ).length
                }{" "}
                complete
              </span>
            )}
            {restoredFromVisit && (
              <span className="rounded-full bg-sky-50 px-1.5 py-0.5 text-[9px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-100">
                Restored from visit {restoredFromVisit}
              </span>
            )}
            {autoFilledTotal > 0 && (
              <span className="rounded-full bg-[#e8f0fb] px-1.5 py-0.5 text-[9px] font-semibold text-[#004785] ring-1 ring-inset ring-[#c9dcf5]">
                {autoFilledTotal} auto-filled
              </span>
            )}
            {errorCount > 0 && (
              <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[9px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-100">
                {errorCount} to fix
              </span>
            )}
            {warningCount > 0 && (
              <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-100">
                {warningCount} warning{warningCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {autoFillUndoAvailable && onUndoAutoFill && (
              <button
                type="button"
                onClick={onUndoAutoFill}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Undo auto-fill
              </button>
            )}
            {entries.length > 0 && onAutoFillAll && (
              <button
                type="button"
                onClick={() =>
                  autoFillContext && onApplyAutoFill
                    ? openPreview(entries.map((entry) => entry.definition.scoreId))
                    : onAutoFillAll()
                }
                disabled={autoFillBusy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#004785]/25 bg-[#f4f8fd] px-2.5 py-1.5 text-[10px] font-semibold text-[#004785] transition hover:border-[#004785]/40 hover:bg-[#e8f0fb] active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
              >
                {autoFillBusy && (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#004785]/30 border-t-[#004785]" />
                )}
                Preview auto-fill all
              </button>
            )}
            {onExportCsv && (
              <button
                type="button"
                onClick={onExportCsv}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Export CSV
              </button>
            )}
            {onAddCatalogue && catalogue.length > 0 && (
              <button
                type="button"
                onClick={() => setCatalogueOpen(true)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Score catalogue
              </button>
            )}
          </div>
        </div>
      </div>

      {autoFillNotice && (
        <div className="rounded-lg bg-[#f4f8fd] px-3 py-2 text-[10px] text-[#004785] ring-1 ring-inset ring-[#004785]/10">
          {autoFillNotice}
        </div>
      )}

      {validation.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2">
          <p className="text-[10px] font-semibold text-amber-800">
            Check before saving
          </p>
          <ul className="mt-1 space-y-0.5">
            {validation.slice(0, 6).map((item, index) => (
              <li
                key={`${item.scoreId}-${index}`}
                className={
                  "text-[9px] " +
                  (item.severity === "error"
                    ? "font-medium text-rose-700"
                    : "text-amber-800")
                }
              >
                {item.message}
              </li>
            ))}
            {validation.length > 6 && (
              <li className="text-[9px] text-amber-700">
                +{validation.length - 6} more
              </li>
            )}
          </ul>
        </div>
      )}

      {loadingIds.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[10px] text-slate-500">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-[#004785]" />
          Loading score details…
        </div>
      )}

      {entries.length === 0 && loadingIds.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-[10px] text-slate-500">
          Pick a score above to record its variables.
        </p>
      )}

      <div className="space-y-3">
        {entries.map((entry) => (
          <ScoreCard
            key={entry.definition.scoreId}
            definition={entry.definition}
            assessment={entry.assessment}
            history={history}
            currentStagingDetailId={currentStagingDetailId}
            favourite={favourites.includes(entry.definition.scoreId)}
            onChange={(next) =>
              onAssessmentChange(entry.definition.scoreId, next)
            }
            onRemove={() => onRemove(entry.definition.scoreId)}
            onAutoFill={
              autoFillContext && onApplyAutoFill
                ? () => openPreview([entry.definition.scoreId])
                : onAutoFillOne
                  ? () => onAutoFillOne(entry.definition.scoreId)
                  : undefined
            }
            onCopyPrevious={
              onCopyPrevious
                ? (previous) =>
                    onCopyPrevious(entry.definition.scoreId, previous)
                : undefined
            }
            onToggleFavourite={
              onToggleFavourite
                ? () => onToggleFavourite(entry.definition.scoreId)
                : undefined
            }
            onAddInterpretation={(text) =>
              onAssessmentChange(entry.definition.scoreId, {
                ...entry.assessment,
                note: entry.assessment.note.includes(text)
                  ? entry.assessment.note
                  : entry.assessment.note.trim()
                    ? `${entry.assessment.note.trim()} ${text}`
                    : text,
                updatedAt: new Date().toISOString(),
              })
            }
          />
        ))}
      </div>

      {/* Auto-fill preview */}
      {previewIds && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Preview auto-fill"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPreviewIds(null);
          }}
        >
          <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div>
                <h4 className="text-[12px] font-bold text-slate-900">
                  Preview auto-fill
                </h4>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Tick the values to write. Values you entered yourself are
                  kept unless you tick them.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewIds(null)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <div className="max-h-[58vh] overflow-y-auto px-4 py-3">
              {previews.length === 0 && (
                <p className="text-[10px] text-slate-500">
                  No matching patient data was found for these scores.
                </p>
              )}
              {previews.map(({ entry, preview }) => (
                <div key={entry.definition.scoreId} className="mb-3 last:mb-0">
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[10px] font-bold text-slate-700">
                      {entry.definition.name}
                    </p>
                    <p className="text-[9px] text-slate-500">
                      {preview.filled} to fill
                      {preview.kept > 0
                        ? ` · ${preview.kept} kept`
                        : ""}
                    </p>
                  </div>
                  {preview.rows.length === 0 ? (
                    <p className="rounded-lg bg-slate-50 px-2 py-1.5 text-[9px] text-slate-500">
                      No matching patient data for this score.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {preview.rows.map((row) => {
                        const key = entryKey(
                          entry.definition.scoreId,
                          row.variableId
                        );
                        return (
                          <li
                            key={key}
                            className="flex items-start gap-2 rounded-lg border border-slate-100 px-2 py-1.5"
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(previewChecks[key])}
                              onChange={(event) =>
                                setPreviewChecks((previous) => ({
                                  ...previous,
                                  [key]: event.target.checked,
                                }))
                              }
                              className="mt-0.5"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-medium text-slate-700">
                                {row.variableName}:{" "}
                                <span className="font-mono text-[#004785]">
                                  {row.raw}
                                </span>
                                <span className="ml-1 rounded-full bg-slate-100 px-1 text-[8px] uppercase text-slate-500">
                                  {row.source}
                                </span>
                              </p>
                              <p className="text-[9px] text-slate-500">
                                {row.reason}
                                {row.currentRaw && !row.willReplace
                                  ? ` — keeps your value “${row.currentRaw}”`
                                  : ""}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
              <span className="text-[9px] text-slate-500">
                {selectedCount} value{selectedCount === 1 ? "" : "s"} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewIds(null)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyPreview}
                  disabled={selectedCount === 0}
                  className="rounded-lg bg-[#004785] px-3 py-1.5 text-[10px] font-semibold text-white transition hover:bg-[#003a6b] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Apply {selectedCount > 0 ? selectedCount : ""} values
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Catalogue browser */}
      {catalogueOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Score catalogue"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCatalogueOpen(false);
          }}
        >
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div>
                <h4 className="text-[12px] font-bold text-slate-900">
                  Score catalogue
                </h4>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Scores available for this diagnosis. Pinned scores appear
                  first.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCatalogueOpen(false)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <div className="border-b border-slate-100 px-4 py-2">
              <input
                type="text"
                value={catalogueQuery}
                onChange={(event) => setCatalogueQuery(event.target.value)}
                placeholder="Search by score, system or cancer type"
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-[11px] text-slate-800 shadow-sm focus:border-[#004785] focus:outline-none focus:ring-2 focus:ring-[#004785]/15"
              />
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {filteredCatalogue.length === 0 && (
                <p className="text-[10px] text-slate-500">
                  No catalogue scores match the search.
                </p>
              )}
              <div className="space-y-1.5">
                {filteredCatalogue.map((item) => {
                  const pinned = favourites.includes(item.scoreId);
                  return (
                    <div
                      key={item.scoreId}
                      className="rounded-xl border border-slate-200 px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-slate-800">
                          {item.name}
                        </span>
                        {item.method && (
                          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[8px] font-medium text-slate-600">
                            {item.method}
                          </span>
                        )}
                        {pinSelectionLabel(item, favourites)}
                        {item.cancerType && (
                          <span className="rounded-full bg-[#e8f0fb] px-1.5 py-0.5 text-[8px] font-medium text-[#004785]">
                            {item.cancerType}
                          </span>
                        )}
                        <div className="ml-auto flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              onToggleFavourite?.(item.scoreId)
                            }
                            className={
                              "rounded-lg border px-2 py-1 text-[9px] font-medium transition " +
                              (pinned
                                ? "border-amber-200 bg-amber-50 text-amber-600"
                                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50")
                            }
                          >
                            {pinned ? "Unpin" : "Pin"}
                          </button>
                          {onUpdateCatalogue && (
                            <button
                              type="button"
                              onClick={() =>
                                editingCatalogueId === item.scoreId
                                  ? setEditingCatalogueId(null)
                                  : startCatalogueEdit(item)
                              }
                              className={
                                "rounded-lg border px-2 py-1 text-[9px] font-medium transition " +
                                (editingCatalogueId === item.scoreId
                                  ? "border-[#004785] bg-[#e8f0fb] text-[#004785]"
                                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50")
                              }
                            >
                              {editingCatalogueId === item.scoreId
                                ? "Editing"
                                : "Edit"}
                            </button>
                          )}
                          {!item.selected && onAddCatalogue && (
                            <button
                              type="button"
                              onClick={() => {
                                onAddCatalogue(item);
                                setCatalogueOpen(false);
                              }}
                              className="rounded-lg bg-[#004785] px-2 py-1 text-[9px] font-semibold text-white transition hover:bg-[#003a6b]"
                            >
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="mt-0.5 text-[9px] text-slate-500">
                        {item.system ?? "Score"}
                        {item.purpose ? ` · ${item.purpose}` : ""}
                        {item.range ? ` · ${item.range}` : ""}
                      </p>
                      {item.riskGroups && (
                        <p className="mt-0.5 text-[9px] text-slate-400">
                          Groups: {item.riskGroups}
                        </p>
                      )}
                      {(item.status || item.reference) && (
                        <p className="mt-0.5 text-[9px] text-slate-400">
                          {item.status ? `Status: ${item.status}` : ""}
                          {item.status && item.reference ? " · " : ""}
                          {item.reference ?? ""}
                        </p>
                      )}
                      {editingCatalogueId === item.scoreId &&
                        onUpdateCatalogue && (
                          <div className="mt-2 space-y-2 rounded-lg border border-[#004785]/15 bg-[#f7fafd] px-2.5 py-2">
                            {(
                              [
                                ["purpose", "Purpose", true],
                                ["when_to_record", "When to record", false],
                                ["score_range", "Range", false],
                                ["risk_groups", "Risk groups", true],
                                ["score_status", "Status", false],
                                ["score_reference", "Reference", false],
                                ["developer_note", "Developer note", true],
                              ] as [string, string, boolean][]
                            ).map(([key, label, multiline]) => (
                              <label
                                key={key}
                                className="block text-[9px] font-medium text-slate-600"
                              >
                                {label}
                                {multiline ? (
                                  <textarea
                                    rows={2}
                                    value={catalogueDraft[key] ?? ""}
                                    onChange={(event) =>
                                      setCatalogueDraft((previous) => ({
                                        ...previous,
                                        [key]: event.target.value,
                                      }))
                                    }
                                    className="mt-0.5 block w-full resize-y rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[10px] text-slate-800 shadow-sm focus:border-[#004785] focus:outline-none focus:ring-2 focus:ring-[#004785]/15"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    value={catalogueDraft[key] ?? ""}
                                    onChange={(event) =>
                                      setCatalogueDraft((previous) => ({
                                        ...previous,
                                        [key]: event.target.value,
                                      }))
                                    }
                                    className="mt-0.5 block w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[10px] text-slate-800 shadow-sm focus:border-[#004785] focus:outline-none focus:ring-2 focus:ring-[#004785]/15"
                                  />
                                )}
                              </label>
                            ))}
                            {catalogueError && (
                              <p className="rounded-lg bg-rose-50 px-2 py-1.5 text-[9px] text-rose-700 ring-1 ring-inset ring-rose-100">
                                {catalogueError}
                              </p>
                            )}
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingCatalogueId(null)}
                                disabled={catalogueSaving}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[9px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={saveCatalogueEdit}
                                disabled={catalogueSaving}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#004785] px-2.5 py-1 text-[9px] font-semibold text-white transition hover:bg-[#003a6b] active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
                              >
                                {catalogueSaving && (
                                  <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                )}
                                Save metadata
                              </button>
                            </div>
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const pinSelectionLabel = (
  item: CatalogueEntry,
  favourites: string[]
): React.ReactNode => {
  if (favourites.includes(item.scoreId)) {
    return (
      <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[8px] font-semibold text-amber-600 ring-1 ring-inset ring-amber-100">
        pinned
      </span>
    );
  }
  if (item.selected) {
    return (
      <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[8px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">
        recorded
      </span>
    );
  }
  return null;
};

export default ScoreWorkspace;
