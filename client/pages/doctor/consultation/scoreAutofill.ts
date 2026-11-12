/* Auto-fill for score variables.
 *
 * The catalogue says where each variable comes from (REG, VIT, LAB, STG,
 * IHC, GEN, DER). This module turns the patient data the consultation
 * already holds into suggestions, so the common values (age, sex, labs,
 * stage, another score's result) are filled with a source badge instead of
 * being retyped. Everything is pure and unit-tested. */

import {
  normalizeClinicalText,
  parseRange,
  rangeIncludes,
  type ParsedVariable,
  type ScoreAssessment,
  type ScoreDefinition,
  type VariableValue,
} from "./scoreEngine";

export type LabValue = {
  value: number;
  unit: string | null;
  normalMin: number | null;
  normalMax: number | null;
  date: string | null;
};

export type AutoFillContext = {
  age: number | null;
  sex: string | null;
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
  systolic: number | null;
  diastolic: number | null;
  labs: Record<string, LabValue>;
  /* The highest stage as a number (Ann Arbor / FIGO / TNM group). */
  stageNumber: number | null;
  stageText: string | null;
  tStage: string | null;
  nStage: string | null;
  mStage: string | null;
  /* Evaluated results of the other scores recorded this visit, by score id. */
  derivedScores: Record<
    string,
    { total: number | null; groupLabel: string | null }
  >;
};

export type AutoFillSuggestion = {
  variableId: string;
  raw: string;
  reason: string;
  source: "REG" | "VIT" | "LAB" | "STG" | "DER";
};

const LAB_ALIASES: [string, RegExp][] = [
  ["wbc", /\bwbc\b|white blood|leu[ck]ocyte/],
  ["platelets", /platelet/],
  ["ldh", /\bldh\b|lactate dehydrogenase/],
  ["ki67", /ki.?67/],
  ["mitotic", /mitotic/],
  ["albumin", /albumin/],
  ["bilirubin", /\bbilirubin\b/],
  ["b2m", /b2.?microglobulin|beta.?2.?microglobulin|β2/],
  ["ca125", /ca.?125/],
  ["psa", /\bpsa\b|prostate specific/],
  ["hemoglobin", /h[ae]moglobin|\bhb\b/],
  ["creatinine", /creatinine/],
  ["calcium", /calcium/],
  ["afp", /\bafp\b|alpha.?fetoprotein/],
  ["hcg", /\bhcg\b|human chorionic/],
  ["basophils", /basophil/],
  ["eosinophils", /eosinophil|\beos\b/],
  ["blasts", /blast/],
  ["neutrophils", /neutrophil|\banc\b/],
  ["lymphocytes", /lymphocyte/],
];

const normalize = (text: string | null | undefined) =>
  normalizeClinicalText(text).toLowerCase();

const round = (value: number, precision = 2): number => {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
};

const unitKey = (unit: string | null): string | null => {
  if (!unit) return null;
  return normalize(unit)
    .replace(/μ/g, "u")
    .replace(/µ/g, "u")
    .replace(/[()\s]/g, "")
    .replace(/×/g, "x");
};

/* Convert a lab value into the unit the score variable expects, for the few
   analytes that are commonly reported both ways. */
const CANONICAL_LAB_UNITS: Record<string, Record<string, number>> = {
  /* Each map is unit -> factor into the canonical unit. */
  albumin: { "g/dl": 10, "g/l": 1 },
  hemoglobin: { "g/dl": 1, "g/l": 0.1 },
  bilirubin: { "mg/dl": 17.1, "umol/l": 1 },
  creatinine: { "mg/dl": 88.4, "umol/l": 1 },
  b2m: { "mg/dl": 10, "mg/l": 1 },
};

const convertLab = (
  key: string,
  value: number,
  fromUnit: string | null,
  toUnit: string | null
): number => {
  const from = unitKey(fromUnit);
  const to = unitKey(toUnit);
  if (!from || !to || from === to) return value;

  const table = CANONICAL_LAB_UNITS[key];
  if (!table) return value;
  const fromFactor = table[from];
  const toFactor = table[to];
  if (fromFactor == null || toFactor == null) return value;
  return round((value * fromFactor) / toFactor, 4);
};

const labFor = (
  name: string,
  context: AutoFillContext
): { key: string; lab: LabValue } | null => {
  const text = normalize(name);
  for (const [key, pattern] of LAB_ALIASES) {
    if (!pattern.test(text)) continue;
    const lab = context.labs[key];
    if (lab) return { key, lab };
  }
  return null;
};

type Threshold =
  | { op: ">" | ">=" | "<" | "<="; value: number }
  | { op: ">uln" | "<uln" };

const parseThreshold = (name: string): Threshold | null => {
  const text = normalizeClinicalText(name);
  const uln = text.match(/(>=|<=|>|<)\s*uln/i);
  if (uln) {
    return { op: uln[1].startsWith("<") ? "<uln" : ">uln" };
  }
  const match = text.match(/(>=|<=|>|<)\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  return {
    op: match[1] as ">" | ">=" | "<" | "<=",
    value: Number(match[2]),
  };
};

const compare = (
  value: number,
  threshold: Threshold,
  lab: LabValue | null
): boolean | null => {
  if (threshold.op === ">uln") {
    return lab?.normalMax == null ? null : value > lab.normalMax;
  }
  if (threshold.op === "<uln") {
    return lab?.normalMax == null ? null : value < lab.normalMax;
  }
  if (!("value" in threshold)) return null;
  const target = threshold.value;
  switch (threshold.op) {
    case ">":
      return value > target;
    case ">=":
      return value >= target;
    case "<":
      return value < target;
    default:
      return value <= target;
  }
};

export const labKeyFor = (name: string | null | undefined): string | null => {
  const text = normalize(name);
  if (!text) return null;
  for (const [key, pattern] of LAB_ALIASES) {
    if (pattern.test(text)) return key;
  }
  return null;
};

const ROMAN: Record<string, number> = { I: 1, V: 5, X: 10 };
const romanToNumber = (text: string): number | null => {
  const letters = text.toUpperCase().match(/[IVX]+/);
  if (!letters) return null;
  let total = 0;
  const value = letters[0];
  for (let i = 0; i < value.length; i++) {
    const current = ROMAN[value[i]] ?? 0;
    const next = ROMAN[value[i + 1]] ?? 0;
    total += current < next ? -current : current;
  }
  return total > 0 ? total : null;
};

const stageNumberInName = (name: string): number | null => {
  const afterStage = name.match(/stage\s+([IVX]+)/i);
  if (afterStage) return romanToNumber(afterStage[1]);
  /* "Rai I–IV or Binet B–C" has two systems; take the highest roman token. */
  const romans = name.match(/[IVX]+/g);
  if (!romans) return null;
  return Math.max(...romans.map((item) => romanToNumber(item) ?? 0));
};

/* The highest stage number in a picked stage label ("Stage IIIA", "IVB",
   "Stage 4"). Used to answer the score's stage threshold factors. */
export const stageNumberFromText = (
  text: string | null | undefined
): number | null => {
  const value = normalizeClinicalText(text).trim();
  if (!value) return null;
  /* "Stage IIIA" / "IIA" / "III-B" - read the roman numeral token. */
  const roman = value.match(/\b([IVX]{1,4})[ABC]?\b/i);
  if (roman) {
    const number = romanToNumber(roman[1]);
    if (number != null) return number;
  }
  /* Numeric stages ("Stage 4", "4A"). */
  const arabic = value.match(/\b([1-4])[A-C]?\b/i);
  if (arabic) return Number(arabic[1]);
  return null;
};

type ResolvedValue = {
  value: number;
  source: "REG" | "VIT" | "LAB";
  reason: string;
  lab: LabValue | null;
  unit: string | null;
  /* The auto-fill catalogue key (albumin, ldh…) for unit conversion. */
  key?: string;
};

/* A unit written in the variable label, with or without parentheses:
   "Albumin (g/L)" or "Albumin <4 g/dL". */
const unitFromName = (name: string): string | null => {
  const parenthesised = name.match(/\(([^)]+)\)\s*$/);
  if (parenthesised) return parenthesised[1];
  const trailing = name.match(
    /\b(g\/dL|g\/L|mg\/dL|mg\/L|µmol\/L|umol\/L|U\/L|IU\/mL|10\^9\/L|mm\/h)\s*$/i
  );
  return trailing ? trailing[1] : null;
};

const resolveNumeric = (
  name: string,
  variable: ParsedVariable,
  context: AutoFillContext
): ResolvedValue | null => {
  const text = normalize(name);

  if (/\bage\b/.test(text) && context.age != null) {
    return {
      value: context.age,
      source: "REG",
      reason: "Age from registration",
      lab: null,
      unit: "years",
    };
  }
  if (/height/.test(text) && context.heightCm != null) {
    return {
      value: context.heightCm,
      source: "VIT",
      reason: "Height from vitals",
      lab: null,
      unit: "cm",
    };
  }
  if (/weight/.test(text) && context.weightKg != null) {
    return {
      value: context.weightKg,
      source: "VIT",
      reason: "Weight from vitals",
      lab: null,
      unit: "kg",
    };
  }
  if (/(\bbmi\b|body mass index)/.test(text) && context.bmi != null) {
    return {
      value: context.bmi,
      source: "VIT",
      reason: "BMI from vitals",
      lab: null,
      unit: "kg/m²",
    };
  }
  if (/diastolic/.test(text) && context.diastolic != null) {
    return {
      value: context.diastolic,
      source: "VIT",
      reason: "Diastolic BP from vitals",
      lab: null,
      unit: "mmHg",
    };
  }
  if (/(systolic|\bbp\b|blood pressure)/.test(text) && context.systolic != null) {
    return {
      value: context.systolic,
      source: "VIT",
      reason: "Blood pressure from vitals",
      lab: null,
      unit: "mmHg",
    };
  }

  const found = labFor(name, context);
  if (!found) return null;

  const { key, lab } = found;
  const wantsRatio = /[÷]|ratio/.test(name);
  const converted = convertLab(key, lab.value, lab.unit, variable.unit);
  if (wantsRatio) {
    if (lab.normalMax == null || lab.normalMax === 0) return null;
    return {
      value: round(lab.value / lab.normalMax, 3),
      source: "LAB",
      reason: `LDH ratio from lab (${lab.value} ÷ ${lab.normalMax})`,
      lab,
      unit: null,
      key,
    };
  }
  return {
    value: round(converted, 4),
    source: "LAB",
    reason: `${key.toUpperCase()} from lab report`,
    lab,
    unit: variable.unit,
    key,
  };
};

const derivedSuggestion = (
  variable: ParsedVariable,
  context: AutoFillContext
): AutoFillSuggestion | null => {
  if (!variable.derivedFrom) return null;
  const derived = context.derivedScores[variable.derivedFrom];
  if (!derived) return null;

  if (/\bgrade\b/i.test(variable.name) && derived.groupLabel) {
    const match = derived.groupLabel.match(/\b([123])\b/);
    if (match) {
      return {
        variableId: variable.id,
        raw: match[1],
        reason: `Derived from ${variable.derivedFrom} (${derived.groupLabel})`,
        source: "DER",
      };
    }
  }

  if (derived.total != null && (variable.kind === "numeric" || variable.kind === "choice")) {
    return {
      variableId: variable.id,
      raw: String(derived.total),
      reason: `Derived from ${variable.derivedFrom} (${derived.total})`,
      source: "DER",
    };
  }

  if (derived.groupLabel) {
    return {
      variableId: variable.id,
      raw: derived.groupLabel,
      reason: `Derived from ${variable.derivedFrom}`,
      source: "DER",
    };
  }
  return null;
};

const matchChoice = (
  variable: ParsedVariable,
  value: number
): string | null => {
  for (const option of variable.options) {
    const range = parseRange(option.label);
    if (range && rangeIncludes(range, value)) return option.label;
  }
  return null;
};

const stageSuggestion = (
  variable: ParsedVariable,
  context: AutoFillContext
): AutoFillSuggestion | null => {
  const text = normalize(variable.name);
  if (!/stage/.test(text)) return null;
  /* Rai / Binet use their own numbering, so a TNM/Ann Arbor stage number
     would be wrong. */
  if (/rai|binet/.test(text)) return null;

  if (variable.kind === "text" && context.stageText) {
    return {
      variableId: variable.id,
      raw: context.stageText,
      reason: "Stage from the diagnosis",
      source: "STG",
    };
  }

  const wantedStage = stageNumberInName(variable.name);
  if (variable.kind === "boolean" && wantedStage != null && context.stageNumber != null) {
    return {
      variableId: variable.id,
      raw: context.stageNumber >= wantedStage ? "Yes" : "No",
      reason: `Stage ${context.stageText ?? context.stageNumber} from the diagnosis`,
      source: "STG",
    };
  }
  return null;
};

export const suggestVariableValues = (
  definition: ScoreDefinition,
  context: AutoFillContext
): AutoFillSuggestion[] => {
  const suggestions: AutoFillSuggestion[] = [];

  for (const variable of definition.variables) {
    if (variable.kind === "derived") {
      const derived = derivedSuggestion(variable, context);
      if (derived) suggestions.push(derived);
      continue;
    }

    const stage = stageSuggestion(variable, context);
    if (stage) {
      suggestions.push(stage);
      continue;
    }

    const numeric = resolveNumeric(variable.name, variable, context);

    if (variable.kind === "boolean") {
      /* Threshold factors ("Age >60", "LDH >ULN", "Albumin <4 g/dL"). */
      if (numeric) {
        const threshold = parseThreshold(variable.name);
        /* Absolute thresholds are written in the label's unit; convert the
           lab value into it first ("g/L" → "g/dL"). ULN thresholds compare
           against the lab's own normal range, so keep the raw value. */
        let candidate = numeric.value;
        if (threshold && "value" in threshold && numeric.lab && numeric.key) {
          const wanted = unitFromName(variable.name);
          if (wanted) {
            candidate = convertLab(
              numeric.key,
              numeric.value,
              numeric.lab.unit,
              wanted
            );
          }
        }
        const result = threshold ? compare(candidate, threshold, numeric.lab) : null;
        if (result != null) {
          suggestions.push({
            variableId: variable.id,
            raw: result ? "Yes" : "No",
            reason: numeric.reason,
            source: numeric.source,
          });
          continue;
        }
      }
      /* "Male sex" / "Female sex" from registration. */
      {
        const name = normalize(variable.name);
        if (/\b(male|female)\b/.test(name) && context.sex) {
          const sex = normalize(context.sex);
          const isMale =
            sex === "m" ||
            sex === "male" ||
            sex === "man" ||
            sex === "boy" ||
            sex === "1";
          const isFemale =
            sex === "f" ||
            sex === "female" ||
            sex === "woman" ||
            sex === "girl" ||
            sex === "2";
          if (isMale || isFemale) {
            const wanted = /\bfemale\b/.test(name) ? isFemale : isMale;
            suggestions.push({
              variableId: variable.id,
              raw: wanted ? "Yes" : "No",
              reason: "Sex from registration",
              source: "REG",
            });
          }
        }
      }
      continue;
    }

    if (!numeric) continue;

    if (variable.kind === "numeric") {
      suggestions.push({
        variableId: variable.id,
        raw: String(numeric.value),
        reason: numeric.reason,
        source: numeric.source,
      });
      continue;
    }

    if (variable.kind === "choice") {
      const option = matchChoice(variable, numeric.value);
      if (option) {
        suggestions.push({
          variableId: variable.id,
          raw: option,
          reason: numeric.reason,
          source: numeric.source,
        });
      }
    }
  }

  return suggestions;
};

/* ------------------------------------------------------------------ */
/* Preview + provenance summary                                        */
/* ------------------------------------------------------------------ */

export type AutoFillPreviewRow = AutoFillSuggestion & {
  variableName: string;
  currentRaw: string;
  /* False when the clinician typed a value the preview will keep. */
  willReplace: boolean;
};

export type AutoFillPreview = {
  scoreId: string;
  rows: AutoFillPreviewRow[];
  /* Only the rows that would actually be written, by data source. */
  counts: Record<string, number>;
  filled: number;
  kept: number;
};

/* What the auto-fill would change, without touching the assessment. A value
   the clinician typed is never replaced; an earlier auto value is. */
export const previewAutoFill = (
  definition: ScoreDefinition,
  assessment: ScoreAssessment | null,
  context: AutoFillContext
): AutoFillPreview => {
  const suggestions = suggestVariableValues(definition, context);
  const rows: AutoFillPreviewRow[] = suggestions.map((suggestion) => {
    const variable = definition.variables.find(
      (item) => item.id === suggestion.variableId
    );
    const current = assessment?.values[suggestion.variableId];
    const hasTypedValue =
      Boolean(current?.raw?.trim()) && current?.source !== "auto";
    return {
      ...suggestion,
      variableName: variable?.name ?? suggestion.variableId,
      currentRaw: current?.raw ?? "",
      willReplace: !hasTypedValue,
    };
  });

  const counts: Record<string, number> = {};
  for (const row of rows) {
    if (!row.willReplace) continue;
    counts[row.source] = (counts[row.source] ?? 0) + 1;
  }

  return {
    scoreId: definition.scoreId,
    rows,
    counts,
    filled: rows.filter((row) => row.willReplace).length,
    kept: rows.filter((row) => !row.willReplace).length,
  };
};

export type SourceCount = { source: string; count: number };

/* The data sources already represented in one assessment, for the card's
   "auto-filled from" line. */
export const autoSourceSummary = (
  values: Record<string, VariableValue>
): SourceCount[] => {
  const counts: Record<string, number> = {};
  for (const value of Object.values(values)) {
    if (value.source !== "auto" || !value.raw?.trim()) continue;
    const source = value.autoSource ?? "AUTO";
    counts[source] = (counts[source] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source));
};
