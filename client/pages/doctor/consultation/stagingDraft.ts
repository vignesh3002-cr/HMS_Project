import {
  CONTEXT_LABEL,
  CONTEXT_ORDER,
  type DeriveStatus,
  type StageContext,
  type StageRecord,
} from "../../../api/staging.api";

/* ---------------------------------------------------------------------------
   The doctor's unsaved staging work.

   One draft record = one stage of one cancer type in one context (clinical,
   pathological, post-neoadjuvant, recurrence, autopsy). It travels through
   form_state / the localStorage draft, so every field is a plain string and
   is safe to JSON round-trip. The server copy is authoritative; this is just
   what the card is showing.
   --------------------------------------------------------------------------- */

export interface StagingDerivedSnapshot {
  status: DeriveStatus;
  stage: string | null;
  ruleId: string | null;
  explanation: string | null;
  missing: string[];
  /** Rule codes (T2, N1a, M0) used for the legacy staging columns. */
  tCode: string | null;
  nCode: string | null;
  mCode: string | null;
}

export interface StagingDraftRecord {
  cancerTypeId: string;
  schemaId: string;
  context: StageContext;
  t: string;
  n: string;
  m: string;
  s: string;
  conditions: Record<string, string>;
  finalStage: string;
  isOverridden: boolean;
  overrideReason: string;
  /** YYYY-MM-DD; empty = the server records today. */
  stageDate: string;
  notes: string;
  derived?: StagingDerivedSnapshot | null;
}

const CONTEXTS = new Set<string>(CONTEXT_ORDER);

export const emptyStageDraft = (
  cancerTypeId: string,
  schemaId: string,
  context: StageContext,
  stageDate = ""
): StagingDraftRecord => ({
  cancerTypeId,
  schemaId,
  context,
  t: "",
  n: "",
  m: "",
  s: "",
  conditions: {},
  finalStage: "",
  isOverridden: false,
  overrideReason: "",
  stageDate,
  notes: "",
  derived: null,
});

export const stageDraftKey = (
  cancerTypeId: string,
  context: StageContext
) => `${cancerTypeId}|${context}`;

export const findStageDraft = (
  records: StagingDraftRecord[],
  cancerTypeId: string,
  context: StageContext
) =>
  records.find(
    (record) =>
      record.cancerTypeId === cancerTypeId && record.context === context
  ) ?? null;

/** Replace (or append) one record, keeping the rest untouched. */
export const upsertStageDraft = (
  records: StagingDraftRecord[],
  next: StagingDraftRecord
) => {
  const index = records.findIndex(
    (record) =>
      record.cancerTypeId === next.cancerTypeId &&
      record.context === next.context
  );
  if (index === -1) return [...records, next];
  const copy = [...records];
  copy[index] = next;
  return copy;
};

export const removeStageDraft = (
  records: StagingDraftRecord[],
  cancerTypeId: string,
  context: StageContext
) =>
  records.filter(
    (record) =>
      !(record.cancerTypeId === cancerTypeId && record.context === context)
  );

/** The record the card is showing for a cancer type, context first. */
export const stageDraftsForType = (
  records: StagingDraftRecord[],
  cancerTypeId: string
) =>
  [...records]
    .filter((record) => record.cancerTypeId === cancerTypeId)
    .sort(
      (a, b) =>
        CONTEXT_ORDER.indexOf(a.context) - CONTEXT_ORDER.indexOf(b.context)
    );

/** Anything the doctor typed that is worth saving. Extra criteria alone are
    not a stage - they are only meaningful once a T/N/M or a direct stage is
    chosen - so a pre-filled Age/PSA never creates an empty record. */
export const hasStageData = (record: StagingDraftRecord) =>
  Boolean(record.t || record.n || record.m || record.s || record.finalStage);

const asText = (value: unknown) =>
  typeof value === "string" ? value : value == null ? "" : String(value);

const asConditions = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry != null && entry !== "")
      .map(([key, entry]) => [key, String(entry)])
  );
};

const asDerived = (value: unknown): StagingDerivedSnapshot | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const status = asText(row.status);
  if (!["MATCHED", "NO_MATCH", "AMBIGUOUS", "INCOMPLETE"].includes(status)) {
    return null;
  }
  return {
    status: status as DeriveStatus,
    stage: asText(row.stage) || null,
    ruleId: asText(row.ruleId) || null,
    explanation: asText(row.explanation) || null,
    missing: Array.isArray(row.missing) ? row.missing.map(String) : [],
    tCode: asText(row.tCode) || null,
    nCode: asText(row.nCode) || null,
    mCode: asText(row.mCode) || null,
  };
};

/** Stored form_state / draft made safe: drops anything malformed. */
export const normalizeStageDrafts = (value: unknown): StagingDraftRecord[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: StagingDraftRecord[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const cancerTypeId = asText(row.cancerTypeId);
    const schemaId = asText(row.schemaId);
    const context = asText(row.context);
    if (!cancerTypeId || !schemaId || !CONTEXTS.has(context)) continue;
    const key = stageDraftKey(cancerTypeId, context as StageContext);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      cancerTypeId,
      schemaId,
      context: context as StageContext,
      t: asText(row.t),
      n: asText(row.n),
      m: asText(row.m),
      s: asText(row.s),
      conditions: asConditions(row.conditions),
      finalStage: asText(row.finalStage),
      isOverridden: Boolean(row.isOverridden),
      overrideReason: asText(row.overrideReason),
      stageDate: asText(row.stageDate),
      notes: asText(row.notes),
      derived: asDerived(row.derived),
    });
  }

  return out;
};

/** Server records -> draft, keeping the codes the doctor picked. */
export const stageRecordsToDrafts = (
  records: StageRecord[]
): StagingDraftRecord[] =>
  records
    .filter((record) => record.is_active !== false)
    .map((record) => ({
      cancerTypeId: record.cancer_type_id,
      schemaId: record.schema_id,
      context: record.context,
      /* Display codes are what the selects are built from; the rule codes
         live in the derived snapshot for the legacy columns. */
      t: record.t_display ?? "",
      n: record.n_display ?? "",
      m: record.m_display ?? "",
      s: "",
      conditions: asConditions(record.conditions),
      finalStage: record.final_stage ?? "",
      isOverridden: Boolean(record.is_overridden),
      overrideReason: record.override_reason ?? "",
      stageDate: (record.stage_date ?? "").slice(0, 10),
      notes: record.notes ?? "",
      derived: record.final_stage
        ? {
            status: record.is_overridden ? "MATCHED" : "MATCHED",
            stage: record.derived_stage ?? record.final_stage,
            ruleId: record.derived_rule_id ?? null,
            explanation: null,
            missing: [],
            tCode: record.t_code ?? null,
            nCode: record.n_code ?? null,
            mCode: record.m_code ?? null,
          }
        : null,
    }));

/** Clinical / pathological / yp / ... in the order a mirror should prefer. */
const MIRROR_PRIORITY: Record<StageContext, number> = {
  PATHOLOGICAL: 0,
  YP: 1,
  CLINICAL: 2,
  YC: 3,
  RECURRENCE: 4,
  AUTOPSY: 5,
};

export const stageValueOf = (record: StagingDraftRecord) =>
  record.isOverridden
    ? record.finalStage
    : record.derived?.stage ?? record.finalStage;

/**
 * The record whose stage represents the patient on the diagnosis card and
 * the legacy columns: the primary cancer type first, then the most
 * definitive context. Mirrors the backend's own choice.
 */
export const primaryStageDraft = (
  records: StagingDraftRecord[],
  primaryCancerTypeId: string
) =>
  [...records]
    .filter(hasStageData)
    .sort(
      (a, b) =>
        (a.cancerTypeId === primaryCancerTypeId ? 0 : 1) -
          (b.cancerTypeId === primaryCancerTypeId ? 0 : 1) ||
        (MIRROR_PRIORITY[a.context] ?? 9) - (MIRROR_PRIORITY[b.context] ?? 9)
    )[0] ?? null;

/** "pT2 pN1a M0 — Stage IIB" for the card header. */
export const formatStageLine = (record: StagingDraftRecord | null) => {
  if (!record) return "";
  const codes = [record.t, record.n, record.m, record.s]
    .filter(Boolean)
    .join(" ");
  const stage = stageValueOf(record) || record.derived?.stage || "";
  if (codes && stage) return `${codes} — Stage ${stage}`;
  return codes || (stage ? `Stage ${stage}` : "");
};

export const stageLabelFor = (context: StageContext) =>
  CONTEXT_LABEL[context] ?? context;

/** Rule codes for the legacy T / N / M columns of one cancer type. */
export const stageRuleCodesFor = (
  records: StagingDraftRecord[],
  cancerTypeId: string
) => {
  const record = primaryStageDraft(
    records.filter((row) => row.cancerTypeId === cancerTypeId),
    cancerTypeId
  );
  return {
    t: record?.derived?.tCode ?? null,
    n: record?.derived?.nCode ?? null,
    m: record?.derived?.mCode ?? null,
  };
};

/**
 * The values mirrored onto oncology_staging_detail (and the additional
 * cancer rows) until the server's own mirror runs.
 */
export const stageMirrorValues = (
  records: StagingDraftRecord[],
  primaryCancerTypeId: string
) => {
  const primary = primaryStageDraft(records, primaryCancerTypeId);
  return {
    stage: primary ? stageValueOf(primary) || null : null,
    t: primary?.derived?.tCode ?? null,
    n: primary?.derived?.nCode ?? null,
    m: primary?.derived?.mCode ?? null,
  };
};

/** p16 / p40 typed beside the card (saved with the diagnosis). */
export interface StageIhcDraft {
  p16Status: string;
  p16Percent: string;
  p40Status: string;
}

export const EMPTY_STAGE_IHC: StageIhcDraft = {
  p16Status: "",
  p16Percent: "",
  p40Status: "",
};

export const normalizeStageIhc = (value: unknown): StageIhcDraft => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...EMPTY_STAGE_IHC };
  }
  const row = value as Record<string, unknown>;
  return {
    p16Status: asText(row.p16Status),
    p16Percent: asText(row.p16Percent),
    p40Status: asText(row.p40Status),
  };
};

/** Records that are ready to send to the server. */
export const stageSavePayload = (records: StagingDraftRecord[]) =>
  records.filter(hasStageData).map((record) => ({
    cancerTypeId: record.cancerTypeId,
    schemaId: record.schemaId,
    context: record.context,
    t: record.t || null,
    n: record.n || null,
    m: record.m || null,
    s: record.s || null,
    conditions: record.conditions,
    finalStage: record.finalStage || null,
    isOverridden: record.isOverridden,
    overrideReason: record.overrideReason || null,
    stageDate: record.stageDate || null,
    notes: record.notes || null,
  }));
