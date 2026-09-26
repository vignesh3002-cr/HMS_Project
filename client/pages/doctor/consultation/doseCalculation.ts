import {
  calculateAdjustedBodyWeight,
  calculateCalvertDose,
  calculateCockcroftGaultCrCl,
  calculateIdealBodyWeight,
  calculateMostellerBsa,
  type PatientSex,
} from "../../../utils/chemoCalculations";
import type { Drug } from "./types";

/* ============================================================
   PER-DRUG DOSE CALCULATION (Chemotherapy Orders > Dose Cal)
   Formulas: EMR_Oncology_Master_Data_Spec.docx Section 4, via
   utils/chemoCalculations (BSA capped at 2.0 m², Calvert GFR
   capped at 125 mL/min).
============================================================ */

/* Stored as chemotherapy_plan_items.dose_calculation_method. */
export type DoseCalcMethod = "BSA" | "ABW" | "IBW" | "ADJBW" | "AUC" | "FLAT";

export const DOSE_CALC_OPTIONS: { value: DoseCalcMethod; label: string }[] = [
  { value: "BSA", label: "BSA (Mosteller)" },
  { value: "ABW", label: "Actual Body Weight" },
  { value: "IBW", label: "Ideal Body Weight (IBW)" },
  { value: "ADJBW", label: "Adjusted Body Weight" },
  { value: "AUC", label: "Carboplatin – Calvert (AUC)" },
  { value: "FLAT", label: "Flat dose" },
];

export type DosingInputs = {
  heightCm: number | null;
  weightKg: number | null;
  ageYears: number | null;
  sex: PatientSex | null;
  serumCreatinine: number | null;
};

export type PatientDoseResult = {
  value: number | null;
  unit: string;
  /* Why no dose could be calculated (missing input / wrong formula). */
  message?: string;
  /* Extra context on a calculated dose (e.g. BSA cap applied). */
  note?: string;
};

type DoseRow = Pick<Drug, "dose" | "unit" | "doseCalc" | "targetAuc" | "protocolDoseCalc">;

type UnitKind = "per_m2" | "per_kg" | "auc" | "flat" | "none";

export const toPositiveNumber = (value: unknown): number | null => {
  const parsed =
    typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const parseSex = (gender?: string | null): PatientSex | null => {
  const value = (gender ?? "").trim().toLowerCase();
  if (value === "female" || value === "f") return "female";
  if (value === "male" || value === "m") return "male";
  return null;
};

/* "mg/m2" -> per_m2 (base "mg"), "mcg/kg" -> per_kg (base "mcg"),
   "AUC" -> auc, "mg" / "CC" -> flat, "" -> none. */
export const classifyDoseUnit = (
  unit?: string | null
): { kind: UnitKind; base: string } => {
  const raw = (unit ?? "").trim();
  if (!raw) return { kind: "none", base: "mg" };
  if (/auc/i.test(raw)) return { kind: "auc", base: "mg" };
  const perM2 = raw.match(/^(.*?)\s*\/\s*(m2|m²|m\^2|sqm)$/i);
  if (perM2) return { kind: "per_m2", base: perM2[1].trim() || "mg" };
  const perKg = raw.match(/^(.*?)\s*\/\s*kg$/i);
  if (perKg) return { kind: "per_kg", base: perKg[1].trim() || "mg" };
  return { kind: "flat", base: raw };
};

/* Target AUC from a protocol hint such as "AUC 5". */
export const parseProtocolAuc = (hint?: string | null): number | null => {
  const match = (hint ?? "").match(/AUC\s*([\d.]+)/i);
  return match ? toPositiveNumber(match[1]) : null;
};

/* Stored plan value or protocol template hint ("BSA", "AUC 5", "KG",
   "IBW", ...) -> DoseCalcMethod. Unknown values (e.g. "BMI") -> null. */
export const normalizeDoseCalc = (
  value?: string | null
): DoseCalcMethod | null => {
  const upper = (value ?? "").trim().toUpperCase();
  if (!upper) return null;
  if (DOSE_CALC_OPTIONS.some((option) => option.value === upper)) {
    return upper as DoseCalcMethod;
  }
  if (upper.startsWith("AUC")) return "AUC";
  if (upper === "KG" || upper.includes("WEIGHT") || upper === "ACTUAL") return "ABW";
  if (upper.startsWith("ADJ")) return "ADJBW";
  if (upper.includes("FLAT") || upper.includes("FIXED")) return "FLAT";
  return null;
};

const WEIGHT_METHODS: DoseCalcMethod[] = ["ABW", "IBW", "ADJBW"];

/* Default formula for a row, matched to the protocol dose unit so a dose is
   never scaled by the wrong basis: mg/m² -> BSA, mg/kg -> body weight
   (the protocol's IBW/AdjBW choice when it names one), AUC -> Calvert,
   plain amount -> Flat. With no unit, the protocol's own method is used,
   falling back to BSA. */
export const defaultDoseCalc = (
  unit?: string | null,
  protocolHint?: string | null
): DoseCalcMethod => {
  const hint = normalizeDoseCalc(protocolHint);
  switch (classifyDoseUnit(unit).kind) {
    case "per_m2":
      return "BSA";
    case "per_kg":
      return hint && WEIGHT_METHODS.includes(hint) ? hint : "ABW";
    case "auc":
      return "AUC";
    case "flat":
      return "FLAT";
    default:
      return hint ?? "BSA";
  }
};

export const resolveDoseCalc = (row: DoseRow): DoseCalcMethod =>
  normalizeDoseCalc(row.doseCalc) ??
  defaultDoseCalc(row.unit, row.protocolDoseCalc);

/* Target AUC for a Calvert row: the typed value once the doctor has
   edited it (even to blank), else the AUC protocol dose, else the protocol
   hint ("AUC 5"). */
export const resolveTargetAuc = (row: DoseRow): number | null =>
  row.targetAuc !== undefined && row.targetAuc !== null
    ? toPositiveNumber(row.targetAuc)
    : (classifyDoseUnit(row.unit).kind === "auc"
        ? toPositiveNumber(row.dose)
        : null) ?? parseProtocolAuc(row.protocolDoseCalc);

const round2 = (value: number) => Math.round(value * 100) / 100;

const missing = (labels: string[]) => `Needs ${labels.join(", ")}`;

const UNIT_MISMATCH: Record<UnitKind, string> = {
  per_m2: "Dose is per m² — choose BSA",
  per_kg: "Dose is per kg — choose a body-weight formula",
  auc: "Dose is an AUC — choose Calvert",
  flat: "Dose is a fixed amount — choose Flat dose",
  none: "",
};

export const computeCrCl = (inputs: DosingInputs): number | null => {
  if (!inputs.sex) return null;
  return (
    calculateCockcroftGaultCrCl(
      inputs.ageYears,
      inputs.weightKg,
      inputs.serumCreatinine,
      inputs.sex
    )?.crCl ?? null
  );
};

export const computePatientDose = (
  row: DoseRow,
  inputs: DosingInputs
): PatientDoseResult => {
  const method = resolveDoseCalc(row);
  const { kind, base } = classifyDoseUnit(row.unit);

  if (method === "AUC") {
    const auc = resolveTargetAuc(row);
    const needs = [
      ...(auc === null ? ["target AUC"] : []),
      ...(inputs.ageYears === null ? ["age"] : []),
      ...(inputs.weightKg === null ? ["weight"] : []),
      ...(inputs.sex === null ? ["sex"] : []),
      ...(inputs.serumCreatinine === null ? ["serum creatinine"] : []),
    ];
    if (kind === "per_m2" || kind === "per_kg" || kind === "flat") {
      return { value: null, unit: "mg", message: UNIT_MISMATCH[kind] };
    }
    if (needs.length > 0) return { value: null, unit: "mg", message: missing(needs) };
    const calvert = calculateCalvertDose(auc, computeCrCl(inputs));
    if (!calvert) return { value: null, unit: "mg", message: "CrCl could not be calculated" };
    return {
      value: round2(calvert.totalDoseMg),
      unit: "mg",
      note: `AUC ${auc} × (GFR ${calvert.gfrUsed}${
        calvert.isGfrCapped ? " capped" : ""
      } + 25)`,
    };
  }

  const dose = toPositiveNumber(row.dose);

  if (method === "FLAT") {
    if (kind === "per_m2" || kind === "per_kg" || kind === "auc") {
      return { value: null, unit: base, message: UNIT_MISMATCH[kind] };
    }
    if (dose === null) return { value: null, unit: base, message: "No protocol dose" };
    return { value: round2(dose), unit: row.unit?.trim() || "mg" };
  }

  if (method === "BSA") {
    if (kind === "per_kg" || kind === "auc" || kind === "flat") {
      return { value: null, unit: base, message: UNIT_MISMATCH[kind] };
    }
    if (dose === null) return { value: null, unit: base, message: "No protocol dose" };
    const bsa = calculateMostellerBsa(inputs.heightCm, inputs.weightKg);
    if (!bsa) return { value: null, unit: base, message: missing(["height", "weight"]) };
    const notes = [
      ...(bsa.isCapped ? [`BSA ${bsa.uncappedBsa} capped to ${bsa.bsa} m²`] : []),
      ...(kind === "none" ? ["No unit in protocol — taken as per m²"] : []),
    ];
    return {
      value: round2(dose * bsa.bsa),
      unit: base,
      ...(notes.length > 0 ? { note: notes.join(" · ") } : {}),
    };
  }

  /* Body-weight formulas (mg/kg × dosing weight). */
  if (kind === "per_m2" || kind === "auc" || kind === "flat") {
    return { value: null, unit: base, message: UNIT_MISMATCH[kind] };
  }
  if (dose === null) return { value: null, unit: base, message: "No protocol dose" };

  let weight: number | null = null;
  if (method === "ABW") {
    if (inputs.weightKg === null) return { value: null, unit: base, message: missing(["weight"]) };
    weight = inputs.weightKg;
  } else {
    const needs = [
      ...(inputs.heightCm === null ? ["height"] : []),
      ...(inputs.sex === null ? ["sex"] : []),
      ...(method === "ADJBW" && inputs.weightKg === null ? ["weight"] : []),
    ];
    if (needs.length > 0) return { value: null, unit: base, message: missing(needs) };
    const ibw = calculateIdealBodyWeight(inputs.heightCm, inputs.sex as PatientSex);
    weight =
      method === "IBW" ? ibw : calculateAdjustedBodyWeight(inputs.weightKg, ibw);
  }
  if (weight === null) return { value: null, unit: base, message: "Dosing weight could not be calculated" };

  const notes = [
    ...(method !== "ABW" ? [`Dosing weight ${weight} kg`] : []),
    ...(kind === "none" ? ["No unit in protocol — taken as per kg"] : []),
  ];
  return {
    value: round2(dose * weight),
    unit: base,
    ...(notes.length > 0 ? { note: notes.join(" · ") } : {}),
  };
};

/* Values shown in the dosing-inputs strip and stored on
   chemotherapy_plan as the calculation snapshot. */
export const summarizeDosingInputs = (inputs: DosingInputs) => {
  const bsa = calculateMostellerBsa(inputs.heightCm, inputs.weightKg);
  const ibw =
    inputs.sex !== null
      ? calculateIdealBodyWeight(inputs.heightCm, inputs.sex)
      : null;
  return {
    bsa,
    ibw,
    adjBw: calculateAdjustedBodyWeight(inputs.weightKg, ibw),
    crCl: computeCrCl(inputs),
  };
};

export type DosingSnapshot = {
  dosing_height_cm?: number;
  dosing_weight_kg?: number;
  dosing_bsa?: number;
  dosing_serum_creatinine?: number;
  dosing_crcl?: number;
};

export const buildDosingSnapshot = (inputs: DosingInputs): DosingSnapshot => {
  const { bsa, crCl } = summarizeDosingInputs(inputs);
  return {
    ...(inputs.heightCm !== null ? { dosing_height_cm: inputs.heightCm } : {}),
    ...(inputs.weightKg !== null ? { dosing_weight_kg: inputs.weightKg } : {}),
    ...(bsa ? { dosing_bsa: bsa.bsa } : {}),
    ...(inputs.serumCreatinine !== null
      ? { dosing_serum_creatinine: inputs.serumCreatinine }
      : {}),
    ...(crCl !== null ? { dosing_crcl: crCl } : {}),
  };
};

export type OrderPlanItem = {
  medicine_id: string;
  drug_role: string;
  drug_sequence: number;
  dosage?: number;
  dosage_unit?: string;
  dose_calculation_method?: string;
  calculated_dose?: number;
  calculated_dose_unit?: string;
  administration_route?: string;
  remarks?: string;
};

/* Dose columns of a PRIMARY plan item: protocol dose (dosage /
   dosage_unit; the target AUC for Calvert rows), the Dose Cal method and
   the calculated Patient Dose. Nulls when not available, for PUTs. */
export const primaryDoseFields = (drug: Drug, inputs: DosingInputs) => {
  const method = resolveDoseCalc(drug);
  const result = computePatientDose(drug, inputs);
  const auc = method === "AUC" ? resolveTargetAuc(drug) : null;
  const unit = auc !== null ? "AUC" : drug.unit.trim();
  return {
    dosage: auc ?? toPositiveNumber(drug.dose),
    dosage_unit: unit || null,
    dose_calculation_method: method,
    calculated_dose: result.value,
    calculated_dose_unit: result.value !== null ? result.unit : null,
  };
};

/* Plan items for the Chemotherapy Order tables. PRIMARY rows carry
   primaryDoseFields; premedication / supportive rows keep their entered
   dose. */
export const buildPlanItemsFromOrder = (
  primary: Drug[],
  premedication: Drug[],
  supportive: Drug[],
  inputs: DosingInputs
): OrderPlanItem[] => {
  const items: OrderPlanItem[] = [];

  primary.forEach((drug, index) => {
    if (!drug.medicineId) return;
    const fields = primaryDoseFields(drug, inputs);
    items.push({
      medicine_id: drug.medicineId,
      drug_role: "PRIMARY",
      drug_sequence: index + 1,
      ...(fields.dosage !== null ? { dosage: fields.dosage } : {}),
      ...(fields.dosage_unit ? { dosage_unit: fields.dosage_unit } : {}),
      dose_calculation_method: fields.dose_calculation_method,
      ...(fields.calculated_dose !== null
        ? {
            calculated_dose: fields.calculated_dose,
            calculated_dose_unit: fields.calculated_dose_unit ?? undefined,
          }
        : {}),
      administration_route: "IV",
    });
  });

  const pushPlain = (group: Drug[], role: string, offset: number) =>
    group.forEach((drug, index) => {
      if (!drug.medicineId) return;
      const dosage = toPositiveNumber(drug.dose);
      items.push({
        medicine_id: drug.medicineId,
        drug_role: role,
        drug_sequence: offset + index,
        ...(dosage !== null ? { dosage } : {}),
        ...(drug.unit ? { dosage_unit: drug.unit } : {}),
        administration_route: "IV",
      });
    });

  pushPlain(premedication, "PREMEDICATION", 90);
  pushPlain(supportive, "SUPPORTIVE", 100);

  return items;
};

/* Drafts saved before Dose Cal existed stored the BSA-scaled dose in
   `dose` and the protocol dose in `rawDose`; restore the protocol dose so
   it isn't scaled a second time. */
export const normalizeLegacyDraftDrug = (drug: Drug): Drug =>
  drug.doseCalc === undefined && drug.rawDose != null
    ? { ...drug, dose: String(drug.rawDose), rawDose: null }
    : drug;
