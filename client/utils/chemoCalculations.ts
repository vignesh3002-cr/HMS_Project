/**
 * Chemotherapy Medicine Dosage Calculation Formulas & Clinical Rules Engine
 *
 * Implements standard oncology dosing formulas:
 * 4.1 Body Surface Area (BSA) — Mosteller formula with capping
 * 4.2 Body Mass Index (BMI) & WHO weight categories
 * 4.3 Ideal Body Weight (IBW — Devine), Adjusted Body Weight (AdjBW), & Dosing Weight
 * 4.4 Creatinine Clearance (CrCl) — Cockcroft-Gault (Men & Women, configurable weight)
 * 4.5 Carboplatin Dose — Calvert Formula (Target AUC × [GFR + 25], capped GFR)
 * 4.6 General Dose Modification Rules (Renal, Hepatic, Hematologic, Rounding)
 * 4.7 Weight-Based Dosing (mg/kg), Pediatric low-weight switch, & Agent Lookup
 */

export type PatientSex = "male" | "female";
export type DosingWeightType = "actual" | "ideal" | "adjusted";
export type DosingBasis = "BSA" | "Weight" | "Flat" | "AUC" | "IBW" | "BMI";

export interface BsaResult {
  bsa: number; // in m²
  uncappedBsa: number; // in m²
  isCapped: boolean;
  formula: "Mosteller";
}

export interface BmiResult {
  bmi: number; // in kg/m²
  category: "Underweight" | "Normal" | "Overweight" | "Obese";
  colorClass: string;
}

export interface BodyWeightSummary {
  actualWeightKg: number;
  idealBodyWeightKg: number;
  adjustedBodyWeightKg: number;
  isObese: boolean;
  recommendedDosingWeightKg: number;
  recommendedWeightType: DosingWeightType;
}

export interface CrClResult {
  crCl: number; // in mL/min
  weightUsedKg: number;
  weightTypeUsed: DosingWeightType;
  renalBand: "Normal (>=60)" | "Moderate Impairment (30-59)" | "Severe Impairment (<30)";
}

export interface CalvertResult {
  totalDoseMg: number;
  targetAuc: number;
  gfrUsed: number;
  isGfrCapped: boolean;
  cappedGfrValue: number;
  formula: string;
}

export interface DoseModificationResult {
  recommendedDosePercentage: number; // e.g. 100, 75, 50
  isHoldRecommended: boolean;
  reasons: string[];
  warnings: string[];
}

export interface StandardWeightBasedAgent {
  drugName: string;
  typicalDose: string;
  dosingBasis: DosingBasis;
  dosingWeightUsed: DosingWeightType;
  notes: string;
  pediatricSwitchAlert?: string;
  hasFlatOption?: boolean;
  alternateRoute?: string;
}

// ---------------------------------------------------------------------------
// 4.1 Body Surface Area (BSA) — Mosteller Formula
// BSA (m²) = SQRT[ (Height in cm × Weight in kg) / 3600 ]
// Standard oncology cap: 2.0 m² for obese patients unless explicitly bypassed.
// ---------------------------------------------------------------------------
export function calculateMostellerBsa(
  heightCm: number | null | undefined,
  weightKg: number | null | undefined,
  capAt2: boolean = true,
  customCap: number = 2.0
): BsaResult | null {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
    return null;
  }
  const rawBsa = Math.sqrt((heightCm * weightKg) / 3600);
  if (!Number.isFinite(rawBsa)) return null;

  const uncappedBsa = Number(rawBsa.toFixed(2));
  const isCapped = capAt2 && uncappedBsa > customCap;
  const bsa = isCapped ? customCap : uncappedBsa;

  return {
    bsa,
    uncappedBsa,
    isCapped,
    formula: "Mosteller",
  };
}

// ---------------------------------------------------------------------------
// 4.2 Body Mass Index (BMI)
// BMI (kg/m²) = Weight (kg) / [Height (m)]²
// Categories: Underweight <18.5 / Normal 18.5-24.9 / Overweight 25-29.9 / Obese >=30
// ---------------------------------------------------------------------------
export function calculateBmi(
  heightCm: number | null | undefined,
  weightKg: number | null | undefined
): BmiResult | null {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
    return null;
  }
  const heightMeters = heightCm / 100;
  const rawBmi = weightKg / (heightMeters * heightMeters);
  if (!Number.isFinite(rawBmi)) return null;

  const bmi = Number(rawBmi.toFixed(1));

  if (bmi < 18.5) {
    return { bmi, category: "Underweight", colorClass: "text-amber-600 bg-amber-50 border-amber-200" };
  }
  if (bmi < 25.0) {
    return { bmi, category: "Normal", colorClass: "text-emerald-600 bg-emerald-50 border-emerald-200" };
  }
  if (bmi < 30.0) {
    return { bmi, category: "Overweight", colorClass: "text-amber-700 bg-amber-100 border-amber-300" };
  }
  return { bmi, category: "Obese", colorClass: "text-rose-700 bg-rose-50 border-rose-200" };
}

// ---------------------------------------------------------------------------
// 4.3 Ideal, Adjusted, and Dosing Body Weight
// Ideal Body Weight (IBW) — Devine Formula:
//   Men: IBW (kg) = 50 + 2.3 × [Height(in) - 60]
//   Women: IBW (kg) = 45.5 + 2.3 × [Height(in) - 60]
// Adjusted Body Weight (AdjBW, for obese patients):
//   AdjBW (kg) = IBW + 0.4 × (Actual Weight - IBW)
// ---------------------------------------------------------------------------
export function calculateIdealBodyWeight(
  heightCm: number | null | undefined,
  sex: PatientSex
): number | null {
  if (!heightCm || heightCm <= 0) return null;
  const heightInches = heightCm / 2.54;
  const baseWeight = sex === "male" ? 50.0 : 45.5;
  const diffInches = heightInches - 60.0;
  const ibw = baseWeight + 2.3 * diffInches;
  return Number.isFinite(ibw) ? Number(Math.max(1, ibw).toFixed(1)) : null;
}

export function calculateAdjustedBodyWeight(
  actualWeightKg: number | null | undefined,
  ibwKg: number | null | undefined
): number | null {
  if (!actualWeightKg || !ibwKg || actualWeightKg <= 0 || ibwKg <= 0) return null;
  // If actual weight is less than IBW, adjusted body weight is equal to actual weight
  if (actualWeightKg <= ibwKg) {
    return Number(actualWeightKg.toFixed(1));
  }
  const adjBw = ibwKg + 0.4 * (actualWeightKg - ibwKg);
  return Number.isFinite(adjBw) ? Number(adjBw.toFixed(1)) : null;
}

export function computeBodyWeightSummary(
  heightCm: number | null | undefined,
  actualWeightKg: number | null | undefined,
  sex: PatientSex
): BodyWeightSummary | null {
  if (!heightCm || !actualWeightKg || heightCm <= 0 || actualWeightKg <= 0) return null;

  const ibw = calculateIdealBodyWeight(heightCm, sex);
  if (ibw === null) return null;

  const adjBw = calculateAdjustedBodyWeight(actualWeightKg, ibw) ?? actualWeightKg;
  const bmiResult = calculateBmi(heightCm, actualWeightKg);
  const isObese = (bmiResult?.bmi ?? 0) >= 30.0 || actualWeightKg > 1.2 * ibw;

  // Dosing weight rule:
  // Non-obese: defaults to Actual Body Weight.
  // Obese: defaults to Adjusted Body Weight for renal/dosing calculations where indicated.
  const recommendedWeightType: DosingWeightType = isObese ? "adjusted" : "actual";
  const recommendedDosingWeightKg = isObese ? adjBw : actualWeightKg;

  return {
    actualWeightKg: Number(actualWeightKg.toFixed(1)),
    idealBodyWeightKg: ibw,
    adjustedBodyWeightKg: adjBw,
    isObese,
    recommendedDosingWeightKg,
    recommendedWeightType,
  };
}

// ---------------------------------------------------------------------------
// 4.4 Creatinine Clearance (CrCl) — Cockcroft-Gault
// Men: CrCl (mL/min) = [ (140 - Age) × Weight(kg) ] / (72 × Serum Creatinine mg/dL)
// Women: CrCl (mL/min) = above × 0.85
// ---------------------------------------------------------------------------
export function calculateCockcroftGaultCrCl(
  ageYears: number | null | undefined,
  weightKg: number | null | undefined,
  serumCreatinineMgDl: number | null | undefined,
  sex: PatientSex,
  weightTypeUsed: DosingWeightType = "actual"
): CrClResult | null {
  if (
    !ageYears ||
    !weightKg ||
    !serumCreatinineMgDl ||
    ageYears <= 0 ||
    weightKg <= 0 ||
    serumCreatinineMgDl <= 0
  ) {
    return null;
  }

  const rawCrCl = ((140 - ageYears) * weightKg) / (72 * serumCreatinineMgDl);
  const adjustedForSex = sex === "female" ? rawCrCl * 0.85 : rawCrCl;
  if (!Number.isFinite(adjustedForSex)) return null;

  const crCl = Number(Math.max(0, adjustedForSex).toFixed(1));

  let renalBand: CrClResult["renalBand"] = "Normal (>=60)";
  if (crCl < 30) {
    renalBand = "Severe Impairment (<30)";
  } else if (crCl < 60) {
    renalBand = "Moderate Impairment (30-59)";
  }

  return {
    crCl,
    weightUsedKg: Number(weightKg.toFixed(1)),
    weightTypeUsed,
    renalBand,
  };
}

// ---------------------------------------------------------------------------
// 4.5 Carboplatin Dose — Calvert Formula
// Total Dose (mg) = Target AUC × (GFR + 25)
// GFR is estimated via Cockcroft-Gault CrCl (capped at 125 mL/min per ASCO/NCCN/FDA).
// ---------------------------------------------------------------------------
export function calculateCalvertDose(
  targetAuc: number | null | undefined,
  gfrOrCrCl: number | null | undefined,
  capGfrAt125: boolean = true,
  customGfrCap: number = 125
): CalvertResult | null {
  if (!targetAuc || gfrOrCrCl == null || targetAuc <= 0 || gfrOrCrCl < 0) {
    return null;
  }

  const isGfrCapped = capGfrAt125 && gfrOrCrCl > customGfrCap;
  const gfrUsed = isGfrCapped ? customGfrCap : gfrOrCrCl;

  const totalDose = targetAuc * (gfrUsed + 25);
  const roundedDose = Number(totalDose.toFixed(1));

  return {
    totalDoseMg: roundedDose,
    targetAuc,
    gfrUsed,
    isGfrCapped,
    cappedGfrValue: customGfrCap,
    formula: `Dose = ${targetAuc} × (${gfrUsed} + 25) = ${roundedDose} mg`,
  };
}

// ---------------------------------------------------------------------------
// 4.6 General Dose Modification Rules
// - Renal bands: >=60 mL/min (100%), 30-59 mL/min (% reduction), <30 mL/min (% reduction / hold)
// - Hepatic bands: Bilirubin / AST-ALT threshold bands mapped to % reduction
// - Hematologic rules: ANC < 1500 /uL, Platelets < 100,000 /uL triggering hold/delay logic
// ---------------------------------------------------------------------------

export interface DrugDoseAdjustmentRule {
  drugName: string;
  renalAdjustment?: {
    normalThreshold: number; // >= 60
    moderateBand: { min: number; max: number; dosePercent: number; note?: string }; // 30-59 -> 75%
    severeBand: { max: number; dosePercent: number; note?: string }; // < 30 -> 50% or hold
  };
  hepaticAdjustment?: {
    mildBilirubinBand?: { max: number; dosePercent: number; note?: string };
    moderateBilirubinBand?: { min: number; max: number; dosePercent: number; note?: string };
    severeBilirubinBand?: { min: number; dosePercent: number; note?: string };
  };
  ancThresholdHold?: number; // e.g. 1500
  plateletThresholdHold?: number; // e.g. 100000
}

export const DRUG_MODIFICATION_RULES: Record<string, DrugDoseAdjustmentRule> = {
  cisplatin: {
    drugName: "Cisplatin",
    renalAdjustment: {
      normalThreshold: 60,
      moderateBand: { min: 45, max: 59, dosePercent: 75, note: "CrCl 45-59: 75% dose; consider carboplatin switch if CrCl <50" },
      severeBand: { max: 45, dosePercent: 0, note: "CrCl <45: Contraindicated / Hold Cisplatin" },
    },
    ancThresholdHold: 1500,
    plateletThresholdHold: 100000,
  },
  carboplatin: {
    drugName: "Carboplatin",
    renalAdjustment: {
      normalThreshold: 60,
      moderateBand: { min: 30, max: 59, dosePercent: 100, note: "Recalculate dose using Calvert formula with current CrCl" },
      severeBand: { max: 30, dosePercent: 75, note: "CrCl <30: Caution, Calvert formula with capped GFR or 50-75% target AUC" },
    },
    ancThresholdHold: 1500,
    plateletThresholdHold: 100000,
  },
  capecitabine: {
    drugName: "Capecitabine",
    renalAdjustment: {
      normalThreshold: 51,
      moderateBand: { min: 30, max: 50, dosePercent: 75, note: "CrCl 30-50: 75% of starting dose" },
      severeBand: { max: 30, dosePercent: 0, note: "CrCl <30: Contraindicated" },
    },
    ancThresholdHold: 1500,
    plateletThresholdHold: 100000,
  },
  doxorubicin: {
    drugName: "Doxorubicin",
    hepaticAdjustment: {
      mildBilirubinBand: { max: 1.2, dosePercent: 100 },
      moderateBilirubinBand: { min: 1.2, max: 3.0, dosePercent: 50, note: "Bilirubin 1.2-3.0 mg/dL: reduce dose by 50%" },
      severeBilirubinBand: { min: 3.0, dosePercent: 25, note: "Bilirubin >3.0 mg/dL: reduce dose by 75% or hold" },
    },
    ancThresholdHold: 1500,
    plateletThresholdHold: 100000,
  },
  irinotecan: {
    drugName: "Irinotecan",
    hepaticAdjustment: {
      moderateBilirubinBand: { min: 1.5, max: 3.0, dosePercent: 50, note: "Bilirubin 1.5-3.0 mg/dL: 50% dose reduction" },
      severeBilirubinBand: { min: 3.0, dosePercent: 0, note: "Bilirubin >3.0 mg/dL: Hold / avoid Irinotecan" },
    },
    ancThresholdHold: 1500,
    plateletThresholdHold: 100000,
  },
  vincristine: {
    drugName: "Vincristine",
    hepaticAdjustment: {
      moderateBilirubinBand: { min: 1.5, max: 3.0, dosePercent: 50, note: "Direct Bilirubin >1.5-3.0: 50% dose reduction" },
      severeBilirubinBand: { min: 3.0, dosePercent: 25, note: "Bilirubin >3.0: 75% reduction or hold (max standard dose 2mg)" },
    },
    ancThresholdHold: 1500,
    plateletThresholdHold: 100000,
  },
  paclitaxel: {
    drugName: "Paclitaxel",
    hepaticAdjustment: {
      moderateBilirubinBand: { min: 1.5, max: 2.0, dosePercent: 75, note: "Bilirubin 1.5-2.0 or AST/ALT >2-5x ULN: reduce by 25%" },
      severeBilirubinBand: { min: 2.0, dosePercent: 50, note: "Bilirubin >2.0 or AST/ALT >5x ULN: 50% reduction or hold" },
    },
    ancThresholdHold: 1500,
    plateletThresholdHold: 100000,
  },
  enoxaparin: {
    drugName: "Enoxaparin",
    renalAdjustment: {
      normalThreshold: 30,
      moderateBand: { min: 30, max: 50, dosePercent: 100, note: "Standard dose with anti-Xa monitoring if needed" },
      severeBand: { max: 30, dosePercent: 50, note: "CrCl <30 mL/min: Reduce treatment to 1 mg/kg once daily, or prophylaxis 20mg OD" },
    },
  },
};

export function evaluateDoseModification(params: {
  drugName?: string;
  crCl?: number | null;
  serumBilirubinMgDl?: number | null;
  astAltUlnMultiple?: number | null;
  ancPerMicroLiter?: number | null;
  plateletsPerMicroLiter?: number | null;
}): DoseModificationResult {
  const {
    drugName = "",
    crCl,
    serumBilirubinMgDl,
    astAltUlnMultiple,
    ancPerMicroLiter,
    plateletsPerMicroLiter,
  } = params;

  let recommendedDosePercentage = 100;
  let isHoldRecommended = false;
  const reasons: string[] = [];
  const warnings: string[] = [];

  const drugKey = drugName.trim().toLowerCase();
  const rule = DRUG_MODIFICATION_RULES[drugKey];

  // 1. Hematologic Thresholds (ANC & Platelets)
  const ancThreshold = rule?.ancThresholdHold ?? 1500;
  const pltThreshold = rule?.plateletThresholdHold ?? 100000;

  if (ancPerMicroLiter != null && ancPerMicroLiter > 0 && ancPerMicroLiter < ancThreshold) {
    isHoldRecommended = true;
    reasons.push(`ANC is ${ancPerMicroLiter}/µL (< ${ancThreshold}/µL threshold) — hold/delay cycle until recovery.`);
  }

  if (plateletsPerMicroLiter != null && plateletsPerMicroLiter > 0 && plateletsPerMicroLiter < pltThreshold) {
    isHoldRecommended = true;
    reasons.push(
      `Platelet count is ${plateletsPerMicroLiter.toLocaleString()}/µL (< ${pltThreshold.toLocaleString()}/µL threshold) — hold/delay cycle until recovery.`
    );
  }

  // 2. Renal Impairment Adjustments
  if (crCl != null && crCl > 0) {
    if (rule?.renalAdjustment) {
      const { moderateBand, severeBand } = rule.renalAdjustment;
      if (crCl < severeBand.max) {
        if (severeBand.dosePercent === 0) {
          isHoldRecommended = true;
          reasons.push(`CrCl ${crCl} mL/min: ${severeBand.note ?? "Contraindicated / Hold drug"}`);
        } else {
          recommendedDosePercentage = Math.min(recommendedDosePercentage, severeBand.dosePercent);
          warnings.push(`CrCl ${crCl} mL/min: ${severeBand.note ?? `Reduce dose to ${severeBand.dosePercent}%`}`);
        }
      } else if (crCl >= moderateBand.min && crCl <= moderateBand.max) {
        recommendedDosePercentage = Math.min(recommendedDosePercentage, moderateBand.dosePercent);
        warnings.push(`CrCl ${crCl} mL/min: ${moderateBand.note ?? `Reduce dose to ${moderateBand.dosePercent}%`}`);
      }
    } else {
      // General default renal bands
      if (crCl < 30) {
        recommendedDosePercentage = Math.min(recommendedDosePercentage, 50);
        warnings.push(`Severe renal impairment (CrCl ${crCl} mL/min < 30): 50% dose reduction or drug hold recommended.`);
      } else if (crCl < 60) {
        recommendedDosePercentage = Math.min(recommendedDosePercentage, 75);
        warnings.push(`Moderate renal impairment (CrCl ${crCl} mL/min): consider 20-25% dose reduction.`);
      }
    }
  }

  // 3. Hepatic Impairment Adjustments
  if (serumBilirubinMgDl != null && serumBilirubinMgDl > 0) {
    if (rule?.hepaticAdjustment) {
      const { moderateBilirubinBand, severeBilirubinBand } = rule.hepaticAdjustment;
      if (severeBilirubinBand && serumBilirubinMgDl >= severeBilirubinBand.min) {
        if (severeBilirubinBand.dosePercent === 0) {
          isHoldRecommended = true;
          reasons.push(`Bilirubin ${serumBilirubinMgDl} mg/dL: ${severeBilirubinBand.note ?? "Severe hepatic impairment — Hold"}`);
        } else {
          recommendedDosePercentage = Math.min(recommendedDosePercentage, severeBilirubinBand.dosePercent);
          warnings.push(`Bilirubin ${serumBilirubinMgDl} mg/dL: ${severeBilirubinBand.note}`);
        }
      } else if (
        moderateBilirubinBand &&
        serumBilirubinMgDl >= moderateBilirubinBand.min &&
        serumBilirubinMgDl <= moderateBilirubinBand.max
      ) {
        recommendedDosePercentage = Math.min(recommendedDosePercentage, moderateBilirubinBand.dosePercent);
        warnings.push(`Bilirubin ${serumBilirubinMgDl} mg/dL: ${moderateBilirubinBand.note}`);
      }
    } else if (serumBilirubinMgDl > 3.0) {
      recommendedDosePercentage = Math.min(recommendedDosePercentage, 50);
      warnings.push(`Elevated Bilirubin (${serumBilirubinMgDl} mg/dL > 3.0): consider 50% hepatic dose reduction.`);
    } else if (serumBilirubinMgDl > 1.5) {
      recommendedDosePercentage = Math.min(recommendedDosePercentage, 75);
      warnings.push(`Mildly elevated Bilirubin (${serumBilirubinMgDl} mg/dL): monitor liver function and consider reduction.`);
    }
  }

  if (astAltUlnMultiple != null && astAltUlnMultiple > 5.0) {
    warnings.push(`Transaminases markedly elevated (>5x ULN): consult oncologist for cycle delay or dose attenuation.`);
  }

  return {
    recommendedDosePercentage: isHoldRecommended ? 0 : recommendedDosePercentage,
    isHoldRecommended,
    reasons,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Dose Rounding Rules
// Round calculated dose to nearest 5 mg, 10 mg, or nearest available vial/tablet
// ---------------------------------------------------------------------------
export function roundDose(
  doseMg: number | null | undefined,
  roundTo: 5 | 10 | 25 | 50 | 100 | "none" = 5
): number | null {
  if (doseMg == null || doseMg <= 0) return null;
  if (roundTo === "none") return Number(doseMg.toFixed(2));
  const rounded = Math.round(doseMg / roundTo) * roundTo;
  return Math.max(roundTo, rounded);
}

// ---------------------------------------------------------------------------
// 4.7 Weight-Based Dosing (mg/kg Regimens) & Pediatric Switch
// Formula: Total Dose (mg) = Dosing Weight (kg) × Dose-per-kg (mg/kg)
// Pediatric convention: switch from BSA (mg/m²) to mg/kg if weight < 10 kg or age < 12 months.
// ---------------------------------------------------------------------------
export function calculateWeightBasedDose(
  dosePerKg: number | null | undefined,
  weightKg: number | null | undefined
): number | null {
  if (!dosePerKg || !weightKg || dosePerKg <= 0 || weightKg <= 0) return null;
  const dose = dosePerKg * weightKg;
  return Number.isFinite(dose) ? Number(dose.toFixed(1)) : null;
}

export function checkPediatricDosingSwitch(
  weightKg: number | null | undefined,
  ageMonths: number | null | undefined
): { shouldSwitchToWeightBased: boolean; reason?: string } {
  if (weightKg != null && weightKg > 0 && weightKg < 10.0) {
    return {
      shouldSwitchToWeightBased: true,
      reason: `Patient weight is ${weightKg} kg (< 10 kg). BSA formulas are unreliable at low body weight; switch dosing basis to mg/kg per oncology guidelines.`,
    };
  }
  if (ageMonths != null && ageMonths > 0 && ageMonths < 12) {
    return {
      shouldSwitchToWeightBased: true,
      reason: `Patient age is ${ageMonths} months (< 12 months). Switch dosing basis from BSA to weight-based (mg/kg).`,
    };
  }
  return { shouldSwitchToWeightBased: false };
}

// Reference table for standard weight-based agents from Section 4.7
export const STANDARD_WEIGHT_BASED_AGENTS: StandardWeightBasedAgent[] = [
  {
    drugName: "Bevacizumab",
    typicalDose: "5-15 mg/kg IV q2w or q3w",
    dosingBasis: "Weight",
    dosingWeightUsed: "actual",
    notes: "No standard cap; recalculate each cycle with current actual weight.",
  },
  {
    drugName: "Trastuzumab (IV)",
    typicalDose: "Loading 8 mg/kg, Maintenance 6 mg/kg q3w",
    dosingBasis: "Weight",
    dosingWeightUsed: "actual",
    notes: "SC fixed-dose formulation also available (flat 600mg) — flag as alternate route.",
    hasFlatOption: true,
    alternateRoute: "SC Flat 600mg",
  },
  {
    drugName: "Nivolumab",
    typicalDose: "3 mg/kg q2w (or flat 240mg q2w / 480mg q4w)",
    dosingBasis: "Weight",
    dosingWeightUsed: "actual",
    notes: "Institution/protocol choice between weight-based and flat dosing — configurable per order.",
    hasFlatOption: true,
  },
  {
    drugName: "Ipilimumab",
    typicalDose: "1-3 mg/kg q3w (per regimen, often combination-dependent)",
    dosingBasis: "Weight",
    dosingWeightUsed: "actual",
    notes: "Higher doses used in melanoma monotherapy (3 mg/kg) vs combination regimens (1 mg/kg).",
  },
  {
    drugName: "Pembrolizumab",
    typicalDose: "2 mg/kg q3w (or flat 200mg q3w / 400mg q6w)",
    dosingBasis: "Weight",
    dosingWeightUsed: "actual",
    notes: "Flat dosing now more common in adults; weight-based retained for pediatric/low-weight patients.",
    hasFlatOption: true,
  },
  {
    drugName: "Asparaginase (E. coli / PEG)",
    typicalDose: "IU/kg or IU/m² depending on product/protocol",
    dosingBasis: "Weight",
    dosingWeightUsed: "actual",
    notes: "Product-specific — configure dosing basis (kg vs m²) per formulation.",
  },
  {
    drugName: "Vincristine (infants/low weight)",
    typicalDose: "0.05 mg/kg instead of 1.4-2.0 mg/m² for patients <10 kg or <12 months",
    dosingBasis: "Weight",
    dosingWeightUsed: "actual",
    notes: "BSA formulas unreliable at very low weight; switch dosing basis below threshold. Adult max cap 2 mg.",
    pediatricSwitchAlert: "Patients <10 kg or <12 months: switch from mg/m² to mg/kg.",
  },
  {
    drugName: "Filgrastim (G-CSF)",
    typicalDose: "5 mcg/kg/day SC",
    dosingBasis: "Weight",
    dosingWeightUsed: "actual",
    notes: "Round to nearest available vial/syringe strength (e.g. 300 mcg or 480 mcg).",
  },
  {
    drugName: "Enoxaparin",
    typicalDose: "Prophylaxis: 40mg SC OD (or 0.5mg/kg); Treatment: 1mg/kg q12h or 1.5mg/kg OD",
    dosingBasis: "Weight",
    dosingWeightUsed: "actual",
    notes: "Adjust in renal impairment (CrCl <30 mL/min: reduce to 1 mg/kg OD or 20mg prophylaxis).",
  },
  {
    drugName: "Pediatric Chemotherapy (general)",
    typicalDose: "Calculate by mg/kg instead of mg/m² for patients <10kg or <12 months",
    dosingBasis: "Weight",
    dosingWeightUsed: "actual",
    notes: "General oncology convention: switch from BSA-based to weight-based dosing below this threshold across most cytotoxic agents.",
  },
];

/**
 * Automatically infers recommended Dosing Basis based on medicine name
 */
export function inferDosingBasisForMedicine(medicineName: string | undefined): DosingBasis {
  if (!medicineName) return "BSA";
  const name = medicineName.toLowerCase();

  if (name.includes("carbo")) {
    return "AUC";
  }
  if (
    name.includes("bevacizumab") ||
    name.includes("trastuzumab") ||
    name.includes("nivolumab") ||
    name.includes("ipilimumab") ||
    name.includes("pembrolizumab") ||
    name.includes("filgrastim") ||
    name.includes("enoxaparin") ||
    name.includes("asparaginase")
  ) {
    return "Weight";
  }
  if (name.includes("fixed") || name.includes("flat")) {
    return "Flat";
  }
  return "BSA";
}

// ---------------------------------------------------------------------------
// 4.8 Unit Conversion & Dynamic Dose Calculation Engine
// - Mass units: kg, g, mg, mcg / ug
// - Volume units: L, mL, CC (1 CC = 1 mL)
// - Mass-to-Volume: Volume (CC) = Mass (mg) / Concentration (mg/mL)
// - Dose Calc to Unit Mappings
// ---------------------------------------------------------------------------

export const MASS_UNIT_FACTORS: Record<string, number> = {
  kg: 1_000_000,
  g: 1_000,
  gm: 1_000,
  gms: 1_000,
  gram: 1_000,
  grams: 1_000,
  mg: 1,
  mgs: 1,
  milligram: 1,
  milligrams: 1,
  mcg: 0.001,
  ug: 0.001,
  "µg": 0.001,
  microgram: 0.001,
  micrograms: 0.001,
};

export const VOLUME_UNIT_FACTORS: Record<string, number> = {
  l: 1_000,
  liter: 1_000,
  liters: 1_000,
  litre: 1_000,
  litres: 1_000,
  ml: 1,
  mls: 1,
  milliliter: 1,
  milliliters: 1,
  cc: 1,
  ccs: 1,
};

function normalizeUnitKey(unit: string): string {
  return unit
    .trim()
    .toLowerCase()
    .replace(/[.\s]/g, "");
}

/**
 * Converts a numerical value from one unit to another within the same dimension (mass to mass, volume to volume).
 * Also supports compound units such as g/m² -> mg/m² or g/kg -> mg/kg.
 */
export function convertUnit(
  value: number | null | undefined,
  fromUnit: string | null | undefined,
  toUnit: string | null | undefined
): number | null {
  if (value == null || !Number.isFinite(value) || !fromUnit || !toUnit) {
    return null;
  }

  const rawFrom = normalizeUnitKey(fromUnit);
  const rawTo = normalizeUnitKey(toUnit);

  if (rawFrom === rawTo) return value;

  // Check for compound suffix (e.g., /m², /kg)
  const compoundSuffixes = ["/m²", "/m2", "/kg"];
  for (const suffix of compoundSuffixes) {
    const cleanSuffix = normalizeUnitKey(suffix);
    if (rawFrom.endsWith(cleanSuffix) && rawTo.endsWith(cleanSuffix)) {
      const baseFrom = rawFrom.slice(0, -cleanSuffix.length);
      const baseTo = rawTo.slice(0, -cleanSuffix.length);
      const factorFrom = MASS_UNIT_FACTORS[baseFrom];
      const factorTo = MASS_UNIT_FACTORS[baseTo];
      if (factorFrom != null && factorTo != null) {
        const inMg = value * factorFrom;
        const res = inMg / factorTo;
        return Number(res.toFixed(4));
      }
    }
  }

  // Pure Mass conversions
  const massFrom = MASS_UNIT_FACTORS[rawFrom];
  const massTo = MASS_UNIT_FACTORS[rawTo];
  if (massFrom != null && massTo != null) {
    const inMg = value * massFrom;
    const res = inMg / massTo;
    return Number(res.toFixed(4));
  }

  // Pure Volume conversions (e.g. mL <-> CC <-> L)
  const volFrom = VOLUME_UNIT_FACTORS[rawFrom];
  const volTo = VOLUME_UNIT_FACTORS[rawTo];
  if (volFrom != null && volTo != null) {
    const inMl = value * volFrom;
    const res = inMl / volTo;
    return Number(res.toFixed(4));
  }

  return null;
}

/**
 * Converts a mass value (e.g. in g, mg, mcg) into volume (e.g. CC or mL).
 * Formula: Volume (mL) = Mass (mg) / Concentration (mg/mL).
 * If concentration is omitted, assumes standard aqueous density (1 g = 1 mL / 1 CC).
 */
export function convertMassToVolume(
  massValue: number | null | undefined,
  massUnit: string | null | undefined,
  targetVolumeUnit: string = "CC",
  concentrationMgPerMl?: number | null
): number | null {
  if (massValue == null || !Number.isFinite(massValue) || massValue <= 0 || !massUnit) {
    return null;
  }

  const rawUnit = normalizeUnitKey(massUnit);
  const factor = MASS_UNIT_FACTORS[rawUnit];
  if (factor == null) return null;

  const massInMg = massValue * factor;

  // If concentration is provided and valid (mg/mL): Volume = Mass(mg) / Concentration(mg/mL)
  let volumeInMl: number;
  if (concentrationMgPerMl != null && concentrationMgPerMl > 0) {
    volumeInMl = massInMg / concentrationMgPerMl;
  } else {
    // Default aqueous density assumption: 1 g = 1 mL (1000 mg = 1 mL)
    volumeInMl = massInMg / 1000;
  }

  const rawVolUnit = normalizeUnitKey(targetVolumeUnit);
  const volFactor = VOLUME_UNIT_FACTORS[rawVolUnit] ?? 1; // default to mL/CC (factor 1)
  const finalVolume = volumeInMl / volFactor;

  return Number(finalVolume.toFixed(2));
}

/**
 * Returns canonical units for a chosen dose calculation method.
 */
export function getRecommendedUnitsForDoseCalc(doseCalc: string | null | undefined): {
  unit: string;
  patientUnit: string;
} {
  if (!doseCalc) return { unit: "mg", patientUnit: "mg" };
  const lower = doseCalc.toLowerCase();

  if (lower.includes("auc")) {
    return { unit: "AUC", patientUnit: "mg" };
  }
  if (lower.includes("weight") || lower.includes("kg")) {
    return { unit: "mg/kg", patientUnit: "mg" };
  }
  if (lower.includes("bsa")) {
    return { unit: "mg/m²", patientUnit: "mg" };
  }
  if (lower.includes("ibw")) {
    return { unit: "mg/kg", patientUnit: "mg" };
  }
  if (lower.includes("bmi")) {
    return { unit: "mg", patientUnit: "mg" };
  }
  if (lower.includes("fixed") || lower.includes("flat")) {
    return { unit: "mg", patientUnit: "mg" };
  }

  return { unit: "mg", patientUnit: "mg" };
}

/**
 * Dynamically computes patient dose from protocol dose and method based on standard adult baseline metrics:
 * BSA = 1.7 m², Weight = 70 kg, CrCl/GFR = 75 mL/min (or custom metrics).
 */
export function calculatePatientDoseFromTemplate(
  dose: number | null | undefined,
  doseCalc: string | null | undefined,
  bsa: number = 1.7,
  weightKg: number = 70,
  gfr: number = 75
): number | null {
  if (dose == null || !Number.isFinite(dose) || dose <= 0 || !doseCalc) {
    return null;
  }

  const lower = doseCalc.toLowerCase();

  if (lower.includes("auc")) {
    const calvert = calculateCalvertDose(dose, gfr, true, 125);
    return calvert ? calvert.totalDoseMg : null;
  }
  if (lower.includes("bsa")) {
    const raw = dose * bsa;
    return Number(raw.toFixed(1));
  }
  if (lower.includes("weight") || lower.includes("kg") || lower.includes("ibw")) {
    const raw = dose * weightKg;
    return Number(raw.toFixed(1));
  }
  if (lower.includes("fixed") || lower.includes("flat")) {
    return dose;
  }

  return dose;
}

