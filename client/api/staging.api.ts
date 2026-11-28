import API from "./axios";

/* ---------------------------------------------------------------------------
   TNM staging module (backend: /api/oncology/staging).

   The master tables come from EMR_Master_IHC_Genomics_TNM.xlsx. The stage
   group is always derived server-side so the screen and the saved record can
   never disagree; POST /derive is also what the live preview uses.
   --------------------------------------------------------------------------- */

export type StageContext =
  |"CLINICAL"|"PATHOLOGICAL"|"YP"|"RECURRENCE";

export type StageAxis = "T" | "N" | "M" | "S";

export type StagingMode = "TNM" | "DIRECT" | "NONE";

export type DeriveStatus = "MATCHED" | "NO_MATCH" | "AMBIGUOUS" | "INCOMPLETE";

export const CONTEXT_ORDER: StageContext[] = [
  "CLINICAL",
  "PATHOLOGICAL",
  "YP",
  "RECURRENCE",
];

export const CONTEXT_LABEL: Record<StageContext, string> = {
  CLINICAL: "Clinical",
  PATHOLOGICAL: "Pathological",
  YP: "Post-neoadjuvant pathological",
  RECURRENCE: "Recurrence",
};

export const CONTEXT_SHORT_LABEL: Record<StageContext, string> = {
  CLINICAL: "Clinical",
  PATHOLOGICAL: "Pathological",
  YP: "yp",
  RECURRENCE: "Recurrence",
};

export const CONTEXT_PREFIX: Record<StageContext, string> = {
  CLINICAL: "c",
  PATHOLOGICAL: "p",
  YP: "yp",
  RECURRENCE: "r",
};

export interface StagingCategory {
  code: string;
  rule_code: string;
  definition: string | null;
}

export interface StagingCriterion {
  criterion_key: string;
  label: string;
  input_type: "NUMBER" | "BAND" | "ENUM";
  options: string[];
  unit: string | null;
  source_module: string | null;
  display_order: number | null;
  /** S is rendered as a fourth axis, not as an extra input. */
  rendered_as?: "axis" | "input";
}

export interface StagingDirectStage {
  schema_id?: string;
  stage_code: string;
  definition: string | null;
  display_order: number | null;
  flag: string | null;
}

export interface StagingSchemaContext {
  context: StageContext;
  label: string;
  prefix: string;
  mode: StagingMode;
}

export interface StagingSchemaSummary {
  schema_id: string;
  schema_name: string;
  role: string | null;
  system: string | null;
  edition: string | null;
  system_edition: string | null;
  mode: StagingMode;
  display_order: number | null;
  subsite_question: string | null;
  auto_select_rule: string | null;
  note: string | null;
  suggested: boolean;
  suggestion_reason: string | null;
  contexts: StagingSchemaContext[];
  requires_conditions: string[];
  direct_stages: number;
}

export interface StagingSchemasResponse {
  cancer_type_id: string;
  cancer_type: string;
  subsite_question: string | null;
  default_schema_id: string | null;
  suggested_schema_id: string | null;
  schemas: StagingSchemaSummary[];
}

export interface StagingSchemaDetail {
  schema: {
    schema_id: string;
    schema_name: string;
    system: string | null;
    edition: string | null;
    mode: StagingMode;
    extra_inputs: string | null;
    note: string | null;
  };
  context: StageContext;
  context_label: string;
  context_prefix: string;
  contexts: StagingSchemaContext[];
  mode: StagingMode;
  axes: StageAxis[];
  categories: Partial<Record<StageAxis, StagingCategory[]>>;
  extra_inputs: StagingCriterion[];
  direct_stages: StagingDirectStage[];
  stage_groups: string[];
  requires_conditions: string[];
  notes: string | null;
}

export interface DeriveRequest {
  schemaId: string;
  context: StageContext;
  t?: string | null;
  n?: string | null;
  m?: string | null;
  s?: string | null;
  conditions?: Record<string, string | number | null | undefined>;
}

export interface DeriveResponse {
  status: DeriveStatus;
  mode: StagingMode;
  derived_stage: string | null;
  rule_id: string | null;
  explanation: string | null;
  warnings: string[];
  missing_conditions: string[];
  schema_id: string;
  schema_name: string;
  system: string | null;
  edition: string | null;
  context: StageContext;
  t_code: string | null;
  n_code: string | null;
  m_code: string | null;
  s_code: string | null;
  t_display: string | null;
  n_display: string | null;
  m_display: string | null;
  s_display: string | null;
  conditions: Record<string, string | number | null>;
  invalid_codes: StageAxis[];
  matched_rule: {
    rule_id: string;
    stage_group: string;
    criteria_text: string | null;
    t_codes: string[];
    n_codes: string[];
    m_codes: string[];
  } | null;
  direct_stages: StagingDirectStage[];
}

export interface StageRecord {
  id: string;
  stage_record_id: string;
  staging_detail_id: string;
  diagnosis_id: string | null;
  patient_id: string;
  cancer_type_id: string;
  schema_id: string;
  schema_role: string;
  system: string | null;
  edition: string | null;
  context: StageContext;
  mode: StagingMode;
  t_code: string | null;
  n_code: string | null;
  m_code: string | null;
  s_code: string | null;
  t_display: string | null;
  n_display: string | null;
  m_display: string | null;
  conditions: Record<string, string | number | null> | null;
  modifiers: Record<string, unknown> | null;
  derived_stage: string | null;
  derived_rule_id: string | null;
  final_stage: string;
  is_overridden: boolean;
  override_reason: string | null;
  stage_date: string | null;
  notes: string | null;
  is_active: boolean;
}

export interface StageAlert {
  type: string;
  severity: string;
  message: string;
  schema_id: string;
}

export interface StageRecordsResponse {
  staging_detail_id: string;
  patient_id: string;
  diagnosis_id: string | null;
  cancer_type_id: string | null;
  diagnosis_date: string | null;
  records: StageRecord[];
  alerts: StageAlert[];
}

export interface StageRecordInput {
  cancerTypeId: string;
  schemaId: string;
  context: StageContext;
  t?: string | null;
  n?: string | null;
  m?: string | null;
  s?: string | null;
  conditions?: Record<string, string | number | null | undefined>;
  finalStage?: string | null;
  isOverridden?: boolean;
  overrideReason?: string | null;
  stageDate?: string | null;
  notes?: string | null;
}

const unwrap = <T>(response: { data: { success: boolean; data: T } }): T =>
  response.data.data;

export const stagingApi = {
  /** Schemas mapped to a cancer type, with p16/p40 suggestions. */
  schemas: (cancerTypeId: string, patientId?: string) =>
    API.get<{ success: boolean; data: StagingSchemasResponse }>(
      `/oncology/staging/cancer-types/${encodeURIComponent(cancerTypeId)}/schemas`,
      { params: patientId ? { patientId } : undefined }
    ).then(unwrap),

  /** Axes, codes and extra inputs for one schema + context. */
  schema: (schemaId: string, context: StageContext) =>
    API.get<{ success: boolean; data: StagingSchemaDetail }>(
      `/oncology/staging/schemas/${encodeURIComponent(schemaId)}`,
      { params: { context } }
    ).then(unwrap),

  /** Server-authoritative derivation (also the live preview). */
  derive: (payload: DeriveRequest) =>
    API.post<{ success: boolean; data: DeriveResponse }>(
      "/oncology/staging/derive",
      payload
    ).then(unwrap),

  records: (stagingDetailId: string) =>
    API.get<{ success: boolean; data: StageRecordsResponse }>(
      "/oncology/staging/records",
      { params: { stagingDetailId } }
    ).then(unwrap),

  saveRecords: (
    stagingDetailId: string,
    records: StageRecordInput[],
    replace = true
  ) =>
    API.put<{ success: boolean; data: StageRecordsResponse }>(
      "/oncology/staging/records",
      { stagingDetailId, replace, records }
    ).then(unwrap),

  deleteRecord: (stageRecordId: string) =>
    API.delete<{ success: boolean; data: StageRecordsResponse }>(
      `/oncology/staging/records/${encodeURIComponent(stageRecordId)}`
    ).then(unwrap),

  history: (patientId: string, cancerTypeId?: string) =>
    API.get<{ success: boolean; data: StageRecord[] }>(
      "/oncology/staging/history",
      { params: { patientId, ...(cancerTypeId ? { cancerTypeId } : {}) } }
    ).then(unwrap),

  /** p16 / p40 captured beside the staging card feed the schema picker. */
  saveIhc: (
    stagingDetailId: string,
    payload: {
      p16_status?: string | null;
      p16_percent?: number | null;
      p40_status?: string | null;
    }
  ) =>
    API.put(
      `/oncology/staging-details/${encodeURIComponent(stagingDetailId)}/ihc`,
      payload
    ).then((response) => response.data),
};
