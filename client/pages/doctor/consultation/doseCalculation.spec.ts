import { describe, it, expect } from "vitest";
import {
  buildDosingSnapshot,
  buildPlanItemsFromOrder,
  classifyDoseUnit,
  computePatientDose,
  defaultDoseCalc,
  normalizeLegacyDraftDrug,
  type DosingInputs,
} from "./doseCalculation";
import type { Drug } from "./types";

const adultMale: DosingInputs = {
  heightCm: 170,
  weightKg: 70,
  ageYears: 60,
  sex: "male",
  serumCreatinine: 1.0,
};

const row = (overrides: Partial<Drug>): Drug => ({
  id: 1,
  name: "Drug",
  form: "",
  dose: "",
  unit: "",
  volume: "",
  ...overrides,
});

describe("classifyDoseUnit", () => {
  it("splits per-m², per-kg, AUC, flat and empty units", () => {
    expect(classifyDoseUnit("mg/m2")).toEqual({ kind: "per_m2", base: "mg" });
    expect(classifyDoseUnit("gm/m2")).toEqual({ kind: "per_m2", base: "gm" });
    expect(classifyDoseUnit("mcg/kg")).toEqual({ kind: "per_kg", base: "mcg" });
    expect(classifyDoseUnit("AUC")).toEqual({ kind: "auc", base: "mg" });
    expect(classifyDoseUnit("mg")).toEqual({ kind: "flat", base: "mg" });
    expect(classifyDoseUnit(null)).toEqual({ kind: "none", base: "mg" });
  });
});

describe("defaultDoseCalc", () => {
  it("matches the formula to the protocol dose unit", () => {
    expect(defaultDoseCalc("mg/m2", null)).toBe("BSA");
    expect(defaultDoseCalc("mg/kg", "BSA")).toBe("ABW");
    expect(defaultDoseCalc("mg/kg", "IBW")).toBe("IBW");
    expect(defaultDoseCalc("mg", null)).toBe("FLAT");
    expect(defaultDoseCalc("AUC", null)).toBe("AUC");
  });

  it("uses the protocol hint when the unit is missing, else BSA", () => {
    expect(defaultDoseCalc(null, "AUC 5")).toBe("AUC");
    expect(defaultDoseCalc(null, "KG")).toBe("ABW");
    expect(defaultDoseCalc(null, "BMI")).toBe("BSA");
    expect(defaultDoseCalc(null, null)).toBe("BSA");
  });
});

describe("computePatientDose", () => {
  it("BSA: 175 mg/m² × Mosteller BSA 1.82 m² = 318.5 mg", () => {
    const result = computePatientDose(row({ dose: "175", unit: "mg/m2" }), adultMale);
    expect(result).toMatchObject({ value: 318.5, unit: "mg" });
  });

  it("BSA is capped at 2.0 m² and says so", () => {
    const result = computePatientDose(row({ dose: "175", unit: "mg/m2" }), {
      ...adultMale,
      heightCm: 190,
      weightKg: 110,
    });
    expect(result.value).toBe(350);
    expect(result.note).toContain("capped to 2 m²");
  });

  it("keeps the base unit of gm/m² doses", () => {
    const result = computePatientDose(row({ dose: "1", unit: "gm/m2" }), adultMale);
    expect(result).toMatchObject({ value: 1.82, unit: "gm" });
  });

  it("Actual Body Weight: 3 mg/kg × 70 kg = 210 mg", () => {
    const result = computePatientDose(row({ dose: "3", unit: "mg/kg" }), adultMale);
    expect(result).toMatchObject({ value: 210, unit: "mg" });
  });

  it("refuses BSA for an mg/kg dose instead of mis-scaling it", () => {
    const result = computePatientDose(
      row({ dose: "3", unit: "mg/kg", doseCalc: "BSA" }),
      adultMale
    );
    expect(result.value).toBeNull();
    expect(result.message).toContain("per kg");
  });

  it("IBW (Devine, female 160 cm = 52.4 kg): 3 mg/kg = 157.2 mg", () => {
    const result = computePatientDose(
      row({ dose: "3", unit: "mg/kg", doseCalc: "IBW" }),
      { ...adultMale, heightCm: 160, sex: "female" }
    );
    expect(result.value).toBe(157.2);
  });

  it("Adjusted Body Weight (male 170 cm, 100 kg = 79.5 kg): 1 mg/kg = 79.5 mg", () => {
    const result = computePatientDose(
      row({ dose: "1", unit: "mg/kg", doseCalc: "ADJBW" }),
      { ...adultMale, weightKg: 100 }
    );
    expect(result.value).toBe(79.5);
  });

  it("Calvert: AUC 5 × (CrCl 77.8 + 25) = 514 mg, AUC taken from the protocol hint", () => {
    const result = computePatientDose(
      row({ dose: "", unit: "", protocolDoseCalc: "AUC 5" }),
      adultMale
    );
    expect(result).toMatchObject({ value: 514, unit: "mg" });
  });

  it("Calvert applies the 0.85 female factor to CrCl", () => {
    const result = computePatientDose(
      row({ dose: "", unit: "", protocolDoseCalc: "AUC 5" }),
      { ...adultMale, sex: "female" }
    );
    expect(result.value).toBe(455.5);
  });

  it("Calvert caps GFR at 125 mL/min", () => {
    const result = computePatientDose(
      row({ doseCalc: "AUC", targetAuc: "5" }),
      { ...adultMale, ageYears: 20, weightKg: 100, serumCreatinine: 0.5 }
    );
    expect(result.value).toBe(750);
    expect(result.note).toContain("capped");
  });

  it("Calvert lists the missing inputs", () => {
    const result = computePatientDose(
      row({ doseCalc: "AUC", targetAuc: "5" }),
      { ...adultMale, serumCreatinine: null }
    );
    expect(result.value).toBeNull();
    expect(result.message).toBe("Needs serum creatinine");
  });

  it("Flat dose passes the protocol amount through", () => {
    const result = computePatientDose(row({ dose: "100", unit: "mg" }), adultMale);
    expect(result).toMatchObject({ value: 100, unit: "mg" });
  });

  it("asks for vitals when height/weight are missing", () => {
    const result = computePatientDose(row({ dose: "175", unit: "mg/m2" }), {
      ...adultMale,
      heightCm: null,
    });
    expect(result.message).toBe("Needs height, weight");
  });
});

describe("buildPlanItemsFromOrder", () => {
  it("stores protocol dose, method and patient dose per PRIMARY row", () => {
    const items = buildPlanItemsFromOrder(
      [
        row({ medicineId: "M1", dose: "175", unit: "mg/m2" }),
        row({ id: 2, medicineId: "M2", protocolDoseCalc: "AUC 5" }),
      ],
      [row({ id: 3, medicineId: "M3", dose: "8", unit: "mg" })],
      [],
      adultMale
    );
    expect(items[0]).toMatchObject({
      drug_role: "PRIMARY",
      drug_sequence: 1,
      dosage: 175,
      dosage_unit: "mg/m2",
      dose_calculation_method: "BSA",
      calculated_dose: 318.5,
      calculated_dose_unit: "mg",
    });
    expect(items[1]).toMatchObject({
      dosage: 5,
      dosage_unit: "AUC",
      dose_calculation_method: "AUC",
      calculated_dose: 514,
    });
    expect(items[2]).toMatchObject({ drug_role: "PREMEDICATION", drug_sequence: 90, dosage: 8 });
    expect(items[2]).not.toHaveProperty("calculated_dose");
  });

  it("keeps typed drug names as drug_name and skips blank rows", () => {
    const items = buildPlanItemsFromOrder(
      [
        row({ name: "  Patient Mix  ", dose: "100", unit: "mg/m2" }),
        row({ id: 2, name: "", medicineId: undefined }),
      ],
      [],
      [row({ id: 3, name: "Home Antiemetic", dose: "8", unit: "mg", drugType: "Tablet" })],
      adultMale
    );
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      drug_name: "Patient Mix",
      drug_role: "PRIMARY",
      dosage: 100,
      calculated_dose: 182,
    });
    expect(items[0]).not.toHaveProperty("medicine_id");
    expect(items[1]).toMatchObject({
      drug_name: "Home Antiemetic",
      drug_role: "SUPPORTIVE",
      drug_type: "Tablet",
    });
  });

  it("omits calculated_dose when it cannot be calculated", () => {
    const [item] = buildPlanItemsFromOrder(
      [row({ medicineId: "M1", dose: "175", unit: "mg/m2" })],
      [],
      [],
      { ...adultMale, weightKg: null }
    );
    expect(item).not.toHaveProperty("calculated_dose");
    expect(item.dose_calculation_method).toBe("BSA");
  });
});

describe("buildDosingSnapshot", () => {
  it("records the inputs used, with the capped BSA", () => {
    expect(buildDosingSnapshot(adultMale)).toEqual({
      dosing_height_cm: 170,
      dosing_weight_kg: 70,
      dosing_bsa: 1.82,
      dosing_serum_creatinine: 1,
      dosing_crcl: 77.8,
    });
  });
});

describe("normalizeLegacyDraftDrug", () => {
  it("restores the protocol dose from pre-Dose-Cal drafts", () => {
    expect(
      normalizeLegacyDraftDrug(row({ dose: "318.5", rawDose: 175 })).dose
    ).toBe("175");
    expect(
      normalizeLegacyDraftDrug(row({ dose: "175", rawDose: 175, doseCalc: "BSA" })).dose
    ).toBe("175");
  });
});
