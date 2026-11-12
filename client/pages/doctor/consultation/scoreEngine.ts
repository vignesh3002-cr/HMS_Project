/* Pure scoring engine for the Diagnosis > Score workspace.
 *
 * The Excel master mixes six very different input methods. This module turns
 * each catalogue score into a typed definition (variables, ranges, formula)
 * and evaluates one assessment without touching React or the network.
 *
 * Everything here is pure so it can be unit-tested and reused by the
 * auto-fill layer. */

import type {
  ScoreCatalogueDetail,
  ScoreGroup,
  ScoreVariable,
} from "./types";

export type ScoreMethod =
  | "points_sum"
  | "formula"
  | "criteria_auto"
  | "criteria_checklist"
  | "direct_select"
  | "numeric_auto_group"
  | "online_calculator";

export type VariableKind = "choice" | "boolean" | "numeric" | "text" | "derived";

export type ScoreOption = {
  label: string;
  points: number;
};

export type ParsedVariable = {
  id: string;
  name: string;
  kind: VariableKind;
  options: ScoreOption[];
  /* Meaningful only for numeric variables (a plain range in the master). */
  min: number | null;
  max: number | null;
  unit: string | null;
  source: string;
  autoFilled: boolean;
  sourceField: string | null;
  criterion: string | null;
  points: string | null;
  /* Single point value for a Yes/No variable (points column = "1"). */
  singlePoint: number | null;
  /* Hint shown under the label (the criterion's prose). */
  hint: string | null;
  /* A note-only variable (e.g. MIPI-c Ki-67 "upgrades"). */
  optional: boolean;
  /* For DER variables that point at another score (B01, M01...). */
  derivedFrom: string | null;
};

export type VariableValue = {
  raw: string;
  numeric: number | null;
  points: number | null;
  source: "auto" | "manual" | null;
  /* Provenance for an auto-filled value: which data source it came from
     (REG / VIT / LAB / STG / DER) and the human-readable reason. */
  autoSource?: string;
  reason?: string;
};

export type ScoreDefinition = {
  scoreId: string;
  name: string;
  method: ScoreMethod;
  rawMethod: string | null;
  showCriteria: boolean;
  purpose: string | null;
  whenToRecord: string | null;
  range: string | null;
  riskGroups: string | null;
  status: string | null;
  reference: string | null;
  developerNote: string | null;
  variables: ParsedVariable[];
  groups: ScoreGroup[];
};

export type ScoreAssessment = {
  scoreId: string;
  method: ScoreMethod;
  values: Record<string, VariableValue>;
  selectedGroup: string | null;
  note: string;
  status: "complete" | "incomplete" | "not_applicable";
  updatedAt: string | null;
};

export type VariableEvaluation = {
  variable: ParsedVariable;
  value: VariableValue;
  points: number | null;
  missing: boolean;
  error: string | null;
};

export type ScoreEvaluation = {
  total: number | null;
  totalLabel: string | null;
  group: ScoreGroup | null;
  groupLabel: string | null;
  autoGroup: boolean;
  /* Why the group was assigned (range / rule / clinician). */
  groupReason: string | null;
  completed: number;
  totalVariables: number;
  missing: string[];
  errors: string[];
  breakdown: { label: string; value: string }[];
  expression: string | null;
  status: "complete" | "incomplete" | "not_applicable";
};

export type GroupOption = { value: string; label: string; detail: string | null };

const EMPTY_VALUE: VariableValue = {
  raw: "",
  numeric: null,
  points: null,
  source: null,
};

/* ------------------------------------------------------------------ */
/* Text + number parsing                                               */
/* ------------------------------------------------------------------ */

export const normalizeClinicalText = (text: string | null | undefined): string =>
  String(text ?? "")
    .replace(/\u2212/g, "-")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2265/g, ">=")
    .replace(/\u2264/g, "<=")
    .replace(/\u00d7/g, "x")
    .replace(/\u00b5/g, "u")
    .replace(/\u2192/g, "->")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const NUMBER = /-?\d+(?:\.\d+)?/;

export const extractNumber = (text: string | null | undefined): number | null => {
  const match = normalizeClinicalText(text).match(NUMBER);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
};

export type NumericRange = {
  min: number | null;
  max: number | null;
  minInclusive: boolean;
  maxInclusive: boolean;
};

const UNIT_SUFFIX =
  /\s*(%|cm2|cm²|cm|mm|mg\/l|mg\/dl|g\/dl|g\/l|umol\/l|µmol\/l|u\/ml|iu\/ml|10\^?9\/l|10⁹\/l|10\^9\/l|x10\^?9\/l|years?|yrs?|points?|pts?)\s*$/i;

/* Parse a group range such as "3–5", "≤ -2.60", "> -2.60 to ≤ -1.39",
   "5.7–<6.2", "CPS ≥10", "1–49%" or "<1%". Returns null for categorical
   labels ("Luminal A-like", "Grade 1"). */
export const parseRange = (text: string | null | undefined): NumericRange | null => {
  let value = normalizeClinicalText(text).replace(/->/g, "-");
  if (!value) return null;

  const toParts = value.split(/\s+to\s+/i);
  if (toParts.length === 2) {
    const left = parseRangeSide(toParts[0]);
    const right = parseRangeSide(toParts[1]);
    if (!left || !right) return null;
    return {
      min: left.value,
      max: right.value,
      minInclusive: left.inclusive,
      maxInclusive: right.inclusive,
    };
  }

  /* A span with an embedded operator ("5.7–<6.2", ">40–60") must be tried
     before the bare comparison branch, which would otherwise see only one
     end of the band. */
  {
    const spanText = value.replace(UNIT_SUFFIX, "").trim();
    const span = spanText.match(
      /^(<=|>=|<|>)?\s*(-?\d+(?:\.\d+)?)\s*-\s*(<=|>=|<|>)?\s*(-?\d+(?:\.\d+)?)$/
    );
    if (span) {
      const min = Number(span[2]);
      const max = Number(span[4]);
      if (Number.isFinite(min) && Number.isFinite(max)) {
        return {
          min,
          max,
          minInclusive: span[1] !== ">",
          maxInclusive: span[3] !== "<",
        };
      }
    }
  }

  const comparison = value.match(/(<=|>=|<|>)\s*(-?\d+(?:\.\d+)?)/);
  if (comparison) {
    const operator = comparison[1];
    const number = Number(comparison[2]);
    if (!Number.isFinite(number)) return null;
    if (operator.startsWith("<")) {
      return {
        min: null,
        max: number,
        minInclusive: true,
        maxInclusive: operator === "<=",
      };
    }
    return {
      min: number,
      max: null,
      minInclusive: operator === ">=",
      maxInclusive: true,
    };
  }

  value = value.replace(UNIT_SUFFIX, "").trim();

  const single = value.match(/^(-?\d+(?:\.\d+)?)$/);
  if (single) {
    const number = Number(single[1]);
    return {
      min: number,
      max: number,
      minInclusive: true,
      maxInclusive: true,
    };
  }

  return null;
};

const parseRangeSide = (
  text: string
): { value: number; inclusive: boolean } | null => {
  const match = normalizeClinicalText(text).match(/(<=|>=|<|>)?\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const value = Number(match[2]);
  if (!Number.isFinite(value)) return null;
  const operator = match[1] ?? "";
  return {
    value,
    inclusive: operator === "" || operator === "<=" || operator === ">=",
  };
};

export const rangeIncludes = (range: NumericRange, value: number): boolean => {
  if (
    range.min != null &&
    (range.minInclusive ? value < range.min : value <= range.min)
  )
    return false;
  if (
    range.max != null &&
    (range.maxInclusive ? value > range.max : value >= range.max)
  )
    return false;
  return true;
};

/* Parse the Points column: "1" (single), "0–4" (span), "U"/"M"/null. */
export const parsePointsSpan = (
  points: string | null | undefined
): { min: number; max: number; single: number | null } | null => {
  const range = parseRange(points);
  if (!range || range.min == null || range.max == null) return null;
  return {
    min: range.min,
    max: range.max,
    single: range.min === range.max ? range.min : null,
  };
};

/* "<2 1; 2–3 2; >3 3" or "0 → 1; 1–3 → 2; ≥4 → 3" -> options. */
export const parseCriterionOptions = (
  criterion: string | null | undefined
): ScoreOption[] => {
  const text = normalizeClinicalText(criterion);
  if (!text || !text.includes(";")) return [];

  const options: ScoreOption[] = [];
  for (const part of text.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const arrow = trimmed.match(/^(.*?)\s*->\s*(-?\d+(?:\.\d+)?)$/);
    if (arrow && arrow[1].trim()) {
      options.push({ label: arrow[1].trim(), points: Number(arrow[2]) });
      continue;
    }

    const trailing = trimmed.match(/^(.*\S)\s+(-?\d+(?:\.\d+)?)$/);
    if (trailing && trailing[1].trim()) {
      options.push({ label: trailing[1].trim(), points: Number(trailing[2]) });
    }
  }

  return options.filter((option) => Number.isFinite(option.points));
};

const isYes = (text: string) => /^yes$/i.test(text) || /^y$/i.test(text);

const looksNumeric = (variable: ScoreVariable): boolean => {
  const text = `${variable.variable_name} ${variable.criterion ?? ""} ${variable.source_field ?? ""}`.toLowerCase();
  return /(\(.*(cm|mm|mg\/l|mg\/dl|g\/dl|g\/l|u\/ml|10|%|years|count|score|size).*\)|\bage\b|\bpsa\b|\bldh\b|\bwbc\b|platelet|albumin|bilirubin|b2m|β2m|ki-?67|\bcps\b|\btps\b|blast|basophil|eosinophil|spleen|h[ae]moglobin|\bhb\b|\banc\b|neutrophil|lymphocyte|creatinine|calcium|\bafp\b|\bhcg\b|ca-?125|pack-years|tumour size|tumor size|mitotic|necrosis|positive cores)/i.test(
    text
  );
};

export const normalizeMethod = (raw: string | null | undefined): ScoreMethod => {
  const method = String(raw ?? "").toLowerCase();
  if (method.includes("online calculator")) return "online_calculator";
  if (method.includes("numeric entry")) return "numeric_auto_group";
  if (method.includes("points sum")) return "points_sum";
  if (method.includes("formula")) return "formula";
  if (method.includes("checklist")) return "criteria_checklist";
  if (method.includes("direct select")) return "direct_select";
  if (method.includes("criteria")) return "criteria_auto";
  return "criteria_auto";
};

export const methodLabel = (method: ScoreMethod): string => {
  switch (method) {
    case "points_sum":
      return "Points sum";
    case "formula":
      return "Formula";
    case "criteria_checklist":
      return "Criteria checklist";
    case "direct_select":
      return "Direct select";
    case "numeric_auto_group":
      return "Numeric + auto group";
    case "online_calculator":
      return "Online calculator";
    default:
      return "Criteria";
  }
};

export const methodHint = (method: ScoreMethod): string => {
  switch (method) {
    case "points_sum":
      return "Select the finding for each variable. Points are added automatically.";
    case "formula":
      return "Enter the inputs. The score and risk group are calculated automatically.";
    case "criteria_checklist":
      return "Tick every feature present. The risk group follows from the checklist.";
    case "direct_select":
      return "Choose the risk group. Criteria are shown for reference.";
    case "numeric_auto_group":
      return "Enter the numeric result. The risk group is assigned automatically.";
    case "online_calculator":
      return "Calculate with the published tool, then record the result and group.";
    default:
      return "Record the findings, then confirm the risk group.";
  }
};

/* ------------------------------------------------------------------ */
/* Variables                                                          */
/* ------------------------------------------------------------------ */

export const parseVariable = (
  variable: ScoreVariable,
  method: ScoreMethod
): ParsedVariable => {
  const criterion = variable.criterion ?? null;
  const normalized = normalizeClinicalText(criterion);
  const options = parseCriterionOptions(criterion);
  const pointSpan = parsePointsSpan(variable.points);
  const sourceField = variable.source_field ?? null;
  const derivedFrom =
    variable.source === "DER" && sourceField && /^[A-Z]\d{2}$/.test(sourceField.trim())
      ? sourceField.trim()
      : null;

  let kind: VariableKind;
  if (derivedFrom) {
    kind = "derived";
  } else if (method === "formula") {
    kind = options.length > 0 ? "choice" : "numeric";
  } else if (method === "numeric_auto_group") {
    kind = "numeric";
  } else if (method === "criteria_checklist") {
    kind = "boolean";
  } else if (options.length > 0) {
    kind = "choice";
  } else if (isYes(normalized)) {
    kind = "boolean";
  } else if (pointSpan && pointSpan.single == null) {
    kind = "numeric";
  } else if (parseRange(normalized) && !normalized.includes(" ")) {
    kind = "numeric";
  } else if (method === "criteria_auto" || method === "direct_select") {
    kind = looksNumeric(variable) ? "numeric" : "text";
  } else if (looksNumeric(variable)) {
    kind = "numeric";
  } else {
    kind = "text";
  }

  const optional =
    /upgrades|if done|as reported/i.test(normalized) ||
    /ki-67 \(mipi-c\)/i.test(variable.variable_name);

  const range = kind === "numeric" ? parseRange(normalized) : null;
  const bounded =
    range != null &&
    pointSpan != null &&
    pointSpan.single == null &&
    !normalized.includes("value");

  return {
    id: variable.score_variable_id,
    name: variable.variable_name,
    kind,
    options,
    min: bounded ? range.min : null,
    max: bounded ? range.max : null,
    unit: unitOf(variable.variable_name),
    source: variable.source || "CLIN",
    autoFilled: Boolean(variable.auto_filled),
    sourceField,
    criterion,
    points: variable.points ?? null,
    singlePoint: pointSpan?.single ?? null,
    hint: hintOf(criterion),
    optional,
    derivedFrom,
  };
};

const unitOf = (name: string): string | null => {
  const match = name.match(/\(([^)]+)\)\s*$/);
  return match ? match[1] : null;
};

const hintOf = (criterion: string | null): string | null => {
  if (!criterion) return null;
  const text = criterion.trim();
  if (!text) return null;
  if (/^(from ihc|if done|value|lab report|from pathology report)$/i.test(text))
    return null;
  if (text.includes(";") || /^[<>=]/.test(text)) return null;
  return text;
};

export const buildScoreDefinition = (input: {
  scoreId: string;
  name: string;
  detail: ScoreCatalogueDetail | null;
  variables: ScoreVariable[];
  groups: ScoreGroup[];
}): ScoreDefinition => {
  const rawMethod = input.detail?.method ?? null;
  const method = normalizeMethod(rawMethod);

  return {
    scoreId: input.scoreId,
    name: input.detail?.score_name ?? input.name,
    method,
    rawMethod,
    showCriteria: /with criteria/i.test(rawMethod ?? ""),
    purpose: input.detail?.purpose ?? null,
    whenToRecord: input.detail?.when_to_record ?? null,
    range: input.detail?.range ?? null,
    riskGroups: input.detail?.risk_groups ?? null,
    status: input.detail?.status ?? null,
    reference: input.detail?.reference ?? null,
    developerNote: input.detail?.developer_note ?? null,
    variables: input.variables.map((variable) => parseVariable(variable, method)),
    groups: [...input.groups].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    ),
  };
};

export const resolveVariableValue = (
  variable: ParsedVariable,
  raw: string | null | undefined,
  source: "auto" | "manual" | null = null
): VariableValue => {
  const text = String(raw ?? "").trim();
  if (!text) return { ...EMPTY_VALUE, source };

  if (variable.kind === "choice") {
    const needle = normalizeClinicalText(text).toLowerCase();
    const option =
      variable.options.find(
        (item) => normalizeClinicalText(item.label).toLowerCase() === needle
      ) ??
      variable.options.find((item) =>
        normalizeClinicalText(item.label).toLowerCase().includes(needle)
      );
    if (option) {
      return { raw: text, numeric: option.points, points: option.points, source };
    }
  }

  if (variable.kind === "boolean") {
    const truthy = /^(yes|y|true|1|positive|present|done|checked)$/i.test(text);
    const falsy = /^(no|n|false|0|negative|absent|not done|unchecked)$/i.test(text);
    const numeric = truthy ? 1 : falsy ? 0 : null;
    const point = variable.singlePoint ?? variable.options[0]?.points ?? 1;
    return {
      raw: text,
      numeric,
      points: numeric == null ? null : numeric > 0 ? point : 0,
      source,
    };
  }

  const numeric = extractNumber(text);
  return {
    raw: text,
    numeric,
    points: numeric != null ? numeric : variable.kind === "text" ? null : null,
    source,
  };
};

/* ------------------------------------------------------------------ */
/* Groups                                                             */
/* ------------------------------------------------------------------ */

export const groupLabel = (group: ScoreGroup | null): string | null => {
  if (!group) return null;
  return (group.meaning ?? "").trim() || (group.group_range ?? "").trim() || null;
};

export const groupOptions = (groups: ScoreGroup[]): GroupOption[] =>
  groups.map((group) => ({
    value: group.score_group_id,
    label: groupLabel(group) ?? "",
    detail: group.group_range ?? null,
  }));

export const findGroup = (
  groups: ScoreGroup[],
  labelOrId: string | null | undefined
): ScoreGroup | null => {
  if (!labelOrId) return null;
  const needle = normalizeClinicalText(labelOrId).toLowerCase();
  return (
    groups.find((group) => group.score_group_id === labelOrId) ??
    groups.find(
      (group) =>
        normalizeClinicalText(groupLabel(group)).toLowerCase() === needle
    ) ??
    groups.find(
      (group) =>
        normalizeClinicalText(group.group_range).toLowerCase() === needle
    ) ??
    null
  );
};

export const matchGroup = (
  groups: ScoreGroup[],
  value: number | null
): ScoreGroup | null => {
  if (value == null || !Number.isFinite(value)) return null;
  for (const group of groups) {
    const range = parseRange(group.group_range);
    if (range && rangeIncludes(range, value)) return group;
  }
  return null;
};

/* ------------------------------------------------------------------ */
/* Formulas                                                           */
/* ------------------------------------------------------------------ */

type FormulaInputSpec = {
  key: string;
  label: string;
  match: RegExp;
  optional?: boolean;
};

type FormulaSpec = {
  inputs: FormulaInputSpec[];
  precision: number;
  compute: (values: Record<string, number>) => number | null;
  expression: (values: Record<string, number>) => string;
};

const roundTo = (value: number, precision: number): number => {
  const factor = Math.pow(10, precision);
  /* Half away from zero, so -3.165 → -3.17 (not -3.16). */
  const scaled = Math.abs(value) * factor;
  const rounded = Math.round(scaled + Number.EPSILON);
  return (Math.sign(value) * rounded) / factor;
};

export const FORMULAS: Record<string, FormulaSpec> = {
  B03: {
    precision: 2,
    inputs: [
      { key: "size", label: "Tumour size (cm)", match: /size/i },
      { key: "grade", label: "Grade (1–3)", match: /^grade$/i },
      { key: "nodes", label: "Node score", match: /node/i },
    ],
    compute: (v) => 0.2 * v.size + v.grade + v.nodes,
    expression: (v) =>
      `0.2 × ${v.size} + ${v.grade} + ${v.nodes}`,
  },
  C07: {
    precision: 2,
    inputs: [
      { key: "bilirubin", label: "Bilirubin (µmol/L)", match: /bilirubin/i },
      { key: "albumin", label: "Albumin (g/L)", match: /albumin/i },
    ],
    compute: (v) =>
      0.66 * Math.log10(v.bilirubin) - 0.085 * v.albumin,
    expression: (v) =>
      `0.66 × log10(${v.bilirubin}) − 0.085 × ${v.albumin}`,
  },
  Y01: {
    precision: 0,
    inputs: [
      { key: "ultrasound", label: "Ultrasound score (U)", match: /ultrasound/i },
      { key: "menopausal", label: "Menopausal score (M)", match: /menopausal/i },
      { key: "ca125", label: "CA-125 (U/mL)", match: /ca-?125/i },
    ],
    compute: (v) => v.ultrasound * v.menopausal * v.ca125,
    expression: (v) => `${v.ultrasound} × ${v.menopausal} × ${v.ca125}`,
  },
  M11: {
    precision: 2,
    inputs: [
      { key: "age", label: "Age (years)", match: /^age/i },
      { key: "ecog", label: "ECOG >1 (1 = yes)", match: /ecog/i },
      { key: "ldhRatio", label: "LDH ÷ ULN", match: /ldh/i },
      { key: "wbc", label: "WBC (10⁹/L)", match: /wbc/i },
    ],
    compute: (v) =>
      0.03535 * v.age +
      (v.ecog > 1 ? 0.6978 : 0) +
      1.367 * Math.log10(v.ldhRatio) +
      0.9393 * Math.log10(v.wbc * 1000),
    expression: (v) =>
      `0.03535 × ${v.age} + ${v.ecog > 1 ? "0.6978" : "0"} + 1.367 × log10(${v.ldhRatio}) + 0.9393 × log10(${v.wbc} × 1000)`,
  },
  Q06: {
    precision: 2,
    inputs: [
      { key: "age", label: "Age (years)", match: /^age/i },
      { key: "spleen", label: "Spleen (cm)", match: /spleen/i },
      { key: "platelets", label: "Platelets (10⁹/L)", match: /platelet/i },
      { key: "blasts", label: "Peripheral blasts (%)", match: /blast/i },
    ],
    compute: (v) =>
      Math.exp(
        0.0116 * (v.age - 43.4) +
          0.0345 * (v.spleen - 7.51) +
          0.188 * (Math.pow(v.platelets / 700, 2) - 0.563) +
          0.0887 * (v.blasts - 2.1)
      ),
    expression: (v) =>
      `exp[0.0116 × (${v.age} − 43.4) + 0.0345 × (${v.spleen} − 7.51) + 0.188 × ((${v.platelets}/700)² − 0.563) + 0.0887 × (${v.blasts} − 2.10)]`,
  },
  Q07: {
    precision: 0,
    inputs: [
      { key: "age", label: "Age ≥50", match: /^age/i },
      { key: "spleen", label: "Spleen (cm)", match: /spleen/i },
      { key: "platelets", label: "Platelets (10⁹/L)", match: /platelet/i },
      { key: "blasts", label: "Blasts (%)", match: /blast/i },
      { key: "basophils", label: "Basophils (%)", match: /basophil/i },
      { key: "eosinophils", label: "Eosinophils (%)", match: /eosinophil/i },
    ],
    compute: (v) =>
      (0.6666 * (v.age >= 50 ? 1 : 0) +
        0.042 * v.spleen +
        1.0956 * (v.platelets >= 1500 ? 1 : 0) +
        0.0584 * v.blasts +
        0.20399 * (v.basophils > 3 ? 1 : 0) +
        0.0413 * v.eosinophils) *
      1000,
    expression: (v) =>
      `(0.6666 × [age ${v.age >= 50 ? "≥50" : "<50"}] + 0.0420 × ${v.spleen} + 1.0956 × [platelets ${v.platelets >= 1500 ? "≥1500" : "<1500"}] + 0.0584 × ${v.blasts} + 0.20399 × [basophils ${v.basophils > 3 ? ">3%" : "≤3%"}] + 0.0413 × ${v.eosinophils}) × 1000`,
  },
  Q08: {
    precision: 0,
    inputs: [
      { key: "basophils", label: "Basophils (%)", match: /basophil/i },
      { key: "spleen", label: "Spleen (cm)", match: /spleen/i },
    ],
    compute: (v) => 7 * v.basophils + 4 * v.spleen,
    expression: (v) => `7 × ${v.basophils} + 4 × ${v.spleen}`,
  },
  Q09: {
    precision: 4,
    inputs: [
      { key: "age", label: "Age (years)", match: /^age/i },
      { key: "spleen", label: "Spleen (cm)", match: /spleen/i },
      { key: "blasts", label: "Peripheral blasts (%)", match: /blast/i },
      { key: "platelets", label: "Platelets (10⁹/L)", match: /platelet/i },
    ],
    compute: (v) =>
      0.0025 * Math.pow(v.age / 10, 3) +
      0.0615 * v.spleen +
      0.1052 * v.blasts +
      0.4104 * Math.pow(v.platelets / 1000, -0.5),
    expression: (v) =>
      `0.0025 × (${v.age}/10)³ + 0.0615 × ${v.spleen} + 0.1052 × ${v.blasts} + 0.4104 × (${v.platelets}/1000)^−0.5`,
  },
};

const readFormula = (
  definition: ScoreDefinition,
  resolved: VariableEvaluation[]
): {
  value: number | null;
  missing: string[];
  errors: string[];
  breakdown: { label: string; value: string }[];
  expression: string | null;
} => {
  const spec = FORMULAS[definition.scoreId];
  if (!spec) {
    return {
      value: null,
      missing: [],
      errors: ["No formula is registered for this score."],
      breakdown: [],
      expression: null,
    };
  }

  const values: Record<string, number> = {};
  const missing: string[] = [];
  const errors: string[] = [];
  const breakdown: { label: string; value: string }[] = [];

  for (const input of spec.inputs) {
    const match = resolved.find((item) => input.match.test(item.variable.name));
    const numeric = match?.value.numeric ?? match?.value.points ?? null;
    if (numeric == null) {
      if (!input.optional) missing.push(input.label);
      continue;
    }
    values[input.key] = numeric;
    breakdown.push({
      label: input.label,
      value: `${roundTo(numeric, 3)}${match?.variable.unit ? ` ${match.variable.unit}` : ""}`,
    });
  }

  if (missing.length > 0) {
    return { value: null, missing, errors, breakdown, expression: null };
  }

  let value: number | null = null;
  try {
    const computed = spec.compute(values);
    if (computed != null && Number.isFinite(computed)) {
      value = roundTo(computed, spec.precision);
    } else {
      errors.push("The formula could not be evaluated with these values.");
    }
  } catch {
    errors.push("The formula could not be evaluated with these values.");
  }

  return {
    value,
    missing,
    errors,
    breakdown,
    expression: value == null ? null : spec.expression(values),
  };
};

/* ------------------------------------------------------------------ */
/* Custom decision rules                                              */
/* ------------------------------------------------------------------ */

const numberOf = (
  resolved: VariableEvaluation[],
  pattern: RegExp
): number | null => {
  const match = resolved.find(
    (item) =>
      pattern.test(item.variable.name) ||
      pattern.test(item.variable.sourceField ?? "")
  );
  return match?.value.numeric ?? match?.value.points ?? null;
};

const textOf = (
  resolved: VariableEvaluation[],
  pattern: RegExp
): string => {
  const match = resolved.find(
    (item) =>
      pattern.test(item.variable.name) ||
      pattern.test(item.variable.sourceField ?? "")
  );
  return (match?.value.raw ?? "").trim();
};

const positive = (text: string): boolean | null => {
  const value = normalizeClinicalText(text).toLowerCase();
  if (!value) return null;
  if (/(^|\b)(positive|pos|\+|present|mutated|amplified|high|aberrant|deficient|loss|dmmr|msi-h)/.test(value))
    return true;
  if (/(^|\b)(negative|neg|-|absent|wild[- ]?type|normal|proficient|pmmr|mss|low)/.test(value))
    return false;
  return null;
};

type CustomResult = {
  groupLabel: string | null;
  total: number | null;
  note: string | null;
};

const CUSTOM_RULES: Record<
  string,
  (resolved: VariableEvaluation[]) => CustomResult | null
> = {
  B06: (resolved) => {
    const score = numberOf(resolved, /recurrence score|oncotype|mammaprint score/i);
    const age = numberOf(resolved, /^age/i);
    if (score == null) return null;
    if (score > 25) return { groupLabel: "Chemotherapy recommended", total: score, note: null };
    if (score >= 16 && age != null && age <= 50)
      return {
        groupLabel: "Possible chemotherapy benefit – discuss",
        total: score,
        note: null,
      };
    if (score <= 25 && age != null && age > 50)
      return { groupLabel: "No chemotherapy benefit", total: score, note: null };
    return { groupLabel: null, total: score, note: null };
  },
  E01: (resolved) => {
    const ki67 = numberOf(resolved, /ki-?67/i);
    const poorlyDifferentiated = /poorly|nec/i.test(textOf(resolved, /differentiat/i));
    if (poorlyDifferentiated)
      return { groupLabel: "Poorly differentiated carcinoma", total: null, note: null };
    if (ki67 == null) return null;
    if (ki67 < 3) return { groupLabel: "Ki-67 <3%", total: ki67, note: null };
    if (ki67 <= 20) return { groupLabel: "Ki-67 3–20%", total: ki67, note: null };
    return { groupLabel: "Ki-67 >20% (NET G3)", total: ki67, note: null };
  },
  H03: (resolved) => {
    const ratio = numberOf(resolved, /ldh/i);
    if (ratio == null) return null;
    if (ratio <= 1) return { groupLabel: "M suffix (0)", total: ratio, note: null };
    if (ratio <= 2) return { groupLabel: "M suffix (1)", total: ratio, note: null };
    return { groupLabel: "Poor prognosis", total: ratio, note: null };
  },
  P01: (resolved) => {
    const b2m = numberOf(resolved, /b2-?microglobulin|β2|b2m/i);
    const albumin = numberOf(resolved, /albumin/i);
    if (b2m == null || albumin == null) return null;
    if (b2m >= 5.5) return { groupLabel: "III", total: null, note: null };
    if (b2m < 3.5 && albumin >= 3.5)
      return { groupLabel: "I", total: null, note: null };
    return { groupLabel: "II", total: null, note: null };
  },
  Q03: (resolved) => {
    const wbc = numberOf(resolved, /\bwbc\b/i);
    const platelets = numberOf(resolved, /platelet/i);
    if (wbc == null || platelets == null) return null;
    if (wbc > 10) return { groupLabel: "High", total: null, note: null };
    if (platelets > 40) return { groupLabel: "Low", total: null, note: null };
    return { groupLabel: "Intermediate", total: null, note: null };
  },
  Q04: (resolved) => {
    const age = numberOf(resolved, /^age/i);
    const wbc = numberOf(resolved, /\bwbc\b/i);
    if (age == null || wbc == null) return null;
    if (age >= 1 && age < 10 && wbc < 50)
      return { groupLabel: "Standard", total: null, note: null };
    return { groupLabel: "High", total: null, note: null };
  },
  B02: (resolved) => {
    const er = positive(textOf(resolved, /^er\b|estrogen/i));
    const pr = positive(textOf(resolved, /^pr\b|progesterone/i));
    const her2 = positive(textOf(resolved, /her2/i));
    const ki67 = numberOf(resolved, /ki-?67/i);
    if (er == null || her2 == null) return null;
    if (er && her2) return { groupLabel: "Luminal B-like (HER2+)", total: null, note: null };
    if (er && !her2) {
      const highKi67 = ki67 != null && ki67 > 20;
      if (highKi67 || pr === false)
        return { groupLabel: "Luminal B-like (HER2−)", total: null, note: null };
      return { groupLabel: "Luminal A-like", total: null, note: null };
    }
    if (!er && her2 && pr === false)
      return { groupLabel: "HER2-positive (non-luminal)", total: null, note: null };
    if (!er && !her2 && pr === false)
      return { groupLabel: "Triple-negative", total: null, note: null };
    return { groupLabel: null, total: null, note: null };
  },
  C01: (resolved) => {
    const text = normalizeClinicalText(
      `${textOf(resolved, /mmr/i)} ${textOf(resolved, /msi/i)}`
    ).toLowerCase();
    if (!text.trim()) return null;
    if (/dmmr|msi-h|deficient|loss/.test(text))
      return { groupLabel: "dMMR / MSI-H", total: null, note: null };
    if (/pmmr|mss|proficient|intact/.test(text))
      return { groupLabel: "pMMR / MSS", total: null, note: null };
    return { groupLabel: null, total: null, note: null };
  },
  M05: (resolved) => {
    const cd10 = numberOf(resolved, /cd10/i);
    const bcl6 = numberOf(resolved, /bcl6/i);
    const mum1 = numberOf(resolved, /mum1/i);
    const myc = numberOf(resolved, /myc/i);
    const bcl2 = numberOf(resolved, /bcl2/i);
    if (myc != null && bcl2 != null && myc >= 40 && bcl2 >= 50)
      return { groupLabel: "Double-expressor", total: null, note: null };
    if (cd10 != null && cd10 >= 30)
      return { groupLabel: "GCB", total: null, note: null };
    if (cd10 != null && cd10 < 30 && bcl6 != null && bcl6 > 0 && (mum1 == null || mum1 === 0))
      return { groupLabel: "GCB", total: null, note: null };
    if (cd10 != null) return { groupLabel: "Non-GCB", total: null, note: null };
    return { groupLabel: null, total: null, note: null };
  },
};

const applyCustomRule = (
  definition: ScoreDefinition,
  resolved: VariableEvaluation[]
): CustomResult | null => {
  const rule = CUSTOM_RULES[definition.scoreId];
  if (!rule) return null;
  try {
    return rule(resolved);
  } catch {
    return null;
  }
};

/* ------------------------------------------------------------------ */
/* Evaluation                                                         */
/* ------------------------------------------------------------------ */

const isEmptyAssessment = (assessment: ScoreAssessment): boolean =>
  Object.values(assessment.values).every((value) => !value.raw?.trim());

export const evaluateScore = (
  definition: ScoreDefinition,
  assessment: ScoreAssessment
): ScoreEvaluation => {
  const resolved: VariableEvaluation[] = definition.variables.map((variable) => {
    const stored = assessment.values[variable.id] ?? EMPTY_VALUE;
    const value = resolveVariableValue(variable, stored.raw, stored.source);
    const numeric = value.numeric;

    let error: string | null = null;
    if (
      variable.kind !== "text" &&
      variable.kind !== "derived" &&
      stored.raw?.trim() &&
      numeric == null
    ) {
      error = "Enter a valid number.";
    }
    if (
      error == null &&
      numeric != null &&
      variable.min != null &&
      numeric < variable.min
    ) {
      error = `Minimum is ${variable.min}.`;
    }
    if (
      error == null &&
      numeric != null &&
      variable.max != null &&
      numeric > variable.max
    ) {
      error = `Maximum is ${variable.max}.`;
    }

    return {
      variable,
      value,
      points: value.points,
      missing: !stored.raw?.trim() && !variable.optional,
      error,
    };
  });

  const missing = definition.variables
    .filter((variable) => {
      const item = resolved.find((entry) => entry.variable.id === variable.id);
      if (!item || variable.optional) return false;
      if (definition.method === "direct_select") return false;
      if (definition.method === "criteria_auto" && assessment.selectedGroup)
        return false;
      return item.missing;
    })
    .map((variable) => variable.name);

  const errors = resolved
    .map((item) => item.error)
    .filter((error): error is string => Boolean(error));

  let total: number | null = null;
  let totalLabel: string | null = null;
  let group: ScoreGroup | null = null;
  let autoGroup = false;
  let breakdown: { label: string; value: string }[] = [];
  let expression: string | null = null;
  const custom = applyCustomRule(definition, resolved);

  if (definition.method === "formula") {
    const formula = readFormula(definition, resolved);
    total = formula.value;
    breakdown = formula.breakdown;
    expression = formula.expression;
    errors.push(...formula.errors);
    missing.push(...formula.missing.filter((label) => !missing.includes(label)));
    if (total != null) {
      group = matchGroup(definition.groups, total);
      autoGroup = group != null;
    }
  } else if (definition.method === "points_sum") {
    const entered = resolved.filter((item) => item.value.raw.trim());
    const sum = entered.reduce(
      (acc, item) => acc + (item.points ?? item.value.numeric ?? 0),
      0
    );
    total = entered.length > 0 ? roundTo(sum, 2) : null;
    if (total != null) {
      group = matchGroup(definition.groups, total);
      autoGroup = group != null;
    }
  } else if (definition.method === "criteria_checklist") {
    const checked = resolved.filter(
      (item) => item.value.numeric === 1 || (item.value.points ?? 0) > 0
    ).length;
    total = checked;
    totalLabel = `${checked} feature${checked === 1 ? "" : "s"}`;
    if (definition.groups.length === 2) {
      group = checked > 0 ? definition.groups[0] : definition.groups[1];
      autoGroup = true;
    } else {
      group = matchGroup(definition.groups, checked);
      autoGroup = group != null;
    }
  } else if (definition.method === "numeric_auto_group") {
    const first = resolved.find((item) => item.value.numeric != null);
    total = first?.value.numeric ?? null;
    if (custom?.groupLabel) {
      group = findGroup(definition.groups, custom.groupLabel);
      autoGroup = group != null;
    } else if (total != null) {
      group = matchGroup(definition.groups, total);
      autoGroup = group != null;
    }
  } else {
    /* Criteria / direct select / online calculator. A rule may still derive
       the group (and a sensible numeric total) from the entered values. */
    if (custom?.groupLabel) {
      group = findGroup(definition.groups, custom.groupLabel);
      total = custom.total;
      autoGroup = group != null;
    } else if (custom?.total != null) {
      total = custom.total;
    }

    if (group == null) {
      /* Generic data-driven fallback: one numeric variable + numeric bands
         (PD-L1 CPS/TPS, Ki-67, LDH...). */
      const numericVariables = resolved.filter(
        (item) => item.value.numeric != null
      );
      const numericGroups = definition.groups.filter((item) =>
        parseRange(item.group_range)
      );
      if (
        numericVariables.length === 1 &&
        numericGroups.length === definition.groups.length &&
        definition.groups.length > 0
      ) {
        total = numericVariables[0].value.numeric;
        group = matchGroup(definition.groups, total);
        autoGroup = group != null;
      }
    }

    if (group == null) {
      group = findGroup(definition.groups, assessment.selectedGroup);
    }
  }

  /* A clinician-picked group always wins, whatever the method. */
  let groupReason: string | null = null;
  const clinicianGroup =
    assessment.selectedGroup != null
      ? findGroup(definition.groups, assessment.selectedGroup)
      : null;
  if (clinicianGroup) {
    group = clinicianGroup;
    autoGroup = false;
    groupReason = "Selected by clinician";
  } else if (group && autoGroup) {
    groupReason = group.group_range?.trim()
      ? `Matched range ${group.group_range.trim()}`
      : "Matched the score criteria";
  }

  breakdown = resolved
    .filter((item) => item.value.raw.trim())
    .map((item) => ({
      label: item.variable.name,
      value:
        item.points != null && definition.method === "points_sum"
          ? `${item.value.raw} (+${item.points})`
          : item.value.raw,
    }))
    .concat(breakdown);

  const started = !isEmptyAssessment(assessment);
  const status: ScoreEvaluation["status"] =
    assessment.status === "not_applicable"
      ? "not_applicable"
      : definition.method === "direct_select" ||
          definition.method === "online_calculator"
        ? group != null
          ? "complete"
          : "incomplete"
        : definition.method === "criteria_checklist"
          ? started
            ? "complete"
            : "incomplete"
          : definition.method === "criteria_auto"
            ? group != null
              ? "complete"
              : "incomplete"
            : definition.method === "numeric_auto_group"
              ? total != null
                ? "complete"
                : "incomplete"
              : total != null && missing.length === 0 && errors.length === 0
                ? "complete"
                : "incomplete";

  return {
    total,
    totalLabel:
      totalLabel ??
      (total == null
        ? null
        : definition.method === "points_sum"
          ? `${total} pts`
          : null),
    group,
    groupLabel: groupLabel(group),
    autoGroup,
    groupReason,
    completed: resolved.filter((item) => item.value.raw.trim()).length,
    totalVariables: resolved.length,
    missing: Array.from(new Set(missing)),
    errors: Array.from(new Set(errors)),
    breakdown,
    expression,
    status,
  };
};

/* ------------------------------------------------------------------ */
/* Assessment lifecycle                                               */
/* ------------------------------------------------------------------ */

export const emptyAssessment = (
  definition: ScoreDefinition
): ScoreAssessment => ({
  scoreId: definition.scoreId,
  method: definition.method,
  values: {},
  selectedGroup: null,
  note: "",
  status: "incomplete",
  updatedAt: null,
});

export const serializeAssessment = (assessment: ScoreAssessment) => ({
  scoreId: assessment.scoreId,
  method: assessment.method,
  values: assessment.values,
  selectedGroup: assessment.selectedGroup,
  note: assessment.note,
  status: assessment.status,
  updatedAt: assessment.updatedAt,
});

/* Accept the v2 map plus the legacy single-score shape
   ({ [scoreVariableId]: { selected_criterion, selected_points, source_value } }). */
export const hydrateAssessment = (
  raw: unknown,
  definition: ScoreDefinition
): ScoreAssessment => {
  if (!raw || typeof raw !== "object") return emptyAssessment(definition);

  const source = raw as Record<string, any>;

  if (
    Array.isArray(source.scores) ||
    (source.scoreId && source.values && typeof source.values === "object")
  ) {
    const candidate =
      source.scoreId && source.values
        ? source
        : (source.scores ?? []).find(
            (item: any) => item?.scoreId === definition.scoreId
          );
    if (!candidate) return emptyAssessment(definition);
    const values: Record<string, VariableValue> = {};
    for (const variable of definition.variables) {
      const stored = candidate.values?.[variable.id];
      if (stored && typeof stored === "object") {
        values[variable.id] = {
          raw: String(stored.raw ?? ""),
          numeric:
            typeof stored.numeric === "number" ? stored.numeric : null,
          points: typeof stored.points === "number" ? stored.points : null,
          source: stored.source === "auto" ? "auto" : stored.source === "manual" ? "manual" : null,
          autoSource:
            typeof stored.autoSource === "string" ? stored.autoSource : undefined,
          reason: typeof stored.reason === "string" ? stored.reason : undefined,
        };
      }
    }
    return {
      scoreId: definition.scoreId,
      method: definition.method,
      values,
      selectedGroup: candidate.selectedGroup ?? null,
      note: String(candidate.note ?? ""),
      status:
        candidate.status === "complete" ||
        candidate.status === "not_applicable"
          ? candidate.status
          : "incomplete",
      updatedAt: candidate.updatedAt ?? null,
    };
  }

  /* Legacy: keys are score_variable_id. */
  const values: Record<string, VariableValue> = {};
  for (const variable of definition.variables) {
    const stored = source[variable.id];
    if (!stored || typeof stored !== "object") continue;
    const rawText =
      stored.source_value ?? stored.selected_criterion ?? "";
    values[variable.id] = resolveVariableValue(
      variable,
      String(rawText),
      "manual"
    );
  }
  if (Object.keys(values).length === 0) return emptyAssessment(definition);

  return {
    scoreId: definition.scoreId,
    method: definition.method,
    values,
    selectedGroup: null,
    note: "",
    status: "incomplete",
    updatedAt: null,
  };
};

export const assessmentSummary = (
  evaluation: ScoreEvaluation
): string => {
  if (evaluation.status === "not_applicable") return "Not applicable";
  if (evaluation.groupLabel) return evaluation.groupLabel;
  if (evaluation.total != null) {
    return evaluation.totalLabel ?? String(evaluation.total);
  }
  return "Not scored";
};
