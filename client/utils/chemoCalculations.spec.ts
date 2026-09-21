import { describe, it, expect } from "vitest";
import {
  calculateMostellerBsa,
  calculateBmi,
  calculateIdealBodyWeight,
  calculateAdjustedBodyWeight,
  computeBodyWeightSummary,
  calculateCockcroftGaultCrCl,
  calculateCalvertDose,
  evaluateDoseModification,
  roundDose,
  calculateWeightBasedDose,
  checkPediatricDosingSwitch,
  inferDosingBasisForMedicine,
  convertUnit,
  convertMassToVolume,
  getRecommendedUnitsForDoseCalc,
  calculatePatientDoseFromTemplate,
} from "./chemoCalculations";

describe("chemoCalculations - Oncology Dosage Formulas", () => {
  describe("4.1 Body Surface Area (BSA) — Mosteller Formula", () => {
    it("computes Mosteller BSA correctly for standard adult metrics", () => {
      // Height: 170 cm, Weight: 70 kg
      // SQRT( (170 * 70) / 3600 ) = SQRT(11900 / 3600) = SQRT(3.30555) = ~1.82 m²
      const result = calculateMostellerBsa(170, 70);
      expect(result).not.toBeNull();
      expect(result?.bsa).toBe(1.82);
      expect(result?.uncappedBsa).toBe(1.82);
      expect(result?.isCapped).toBe(false);
    });

    it("caps BSA at 2.0 m² for obese patients when cap is enabled", () => {
      // Height: 180 cm, Weight: 110 kg
      // SQRT( (180 * 110) / 3600 ) = SQRT(19800 / 3600) = SQRT(5.5) = ~2.35 m²
      const result = calculateMostellerBsa(180, 110, true);
      expect(result).not.toBeNull();
      expect(result?.bsa).toBe(2.0);
      expect(result?.uncappedBsa).toBe(2.35);
      expect(result?.isCapped).toBe(true);
    });

    it("returns uncapped BSA when capAt2 is false", () => {
      const result = calculateMostellerBsa(180, 110, false);
      expect(result).not.toBeNull();
      expect(result?.bsa).toBe(2.35);
      expect(result?.isCapped).toBe(false);
    });

    it("handles zero or negative inputs safely", () => {
      expect(calculateMostellerBsa(0, 70)).toBeNull();
      expect(calculateMostellerBsa(170, -5)).toBeNull();
      expect(calculateMostellerBsa(null, null)).toBeNull();
    });
  });

  describe("4.2 Body Mass Index (BMI)", () => {
    it("classifies Underweight correctly (<18.5)", () => {
      // 175 cm, 50 kg -> 50 / (1.75^2) = 16.3
      const res = calculateBmi(175, 50);
      expect(res?.bmi).toBe(16.3);
      expect(res?.category).toBe("Underweight");
    });

    it("classifies Normal weight correctly (18.5 - 24.9)", () => {
      // 170 cm, 65 kg -> 65 / (1.7^2) = 22.5
      const res = calculateBmi(170, 65);
      expect(res?.bmi).toBe(22.5);
      expect(res?.category).toBe("Normal");
    });

    it("classifies Overweight correctly (25.0 - 29.9)", () => {
      // 170 cm, 80 kg -> 80 / (1.7^2) = 27.7
      const res = calculateBmi(170, 80);
      expect(res?.bmi).toBe(27.7);
      expect(res?.category).toBe("Overweight");
    });

    it("classifies Obese correctly (>=30.0)", () => {
      // 170 cm, 100 kg -> 100 / (1.7^2) = 34.6
      const res = calculateBmi(170, 100);
      expect(res?.bmi).toBe(34.6);
      expect(res?.category).toBe("Obese");
    });
  });

  describe("4.3 Ideal, Adjusted, and Dosing Body Weight", () => {
    it("calculates Devine IBW for Men correctly", () => {
      // Height 70 inches (~177.8 cm): IBW = 50 + 2.3 * (70 - 60) = 50 + 23 = 73.0 kg
      const ibw = calculateIdealBodyWeight(177.8, "male");
      expect(ibw).toBe(73.0);
    });

    it("calculates Devine IBW for Women correctly", () => {
      // Height 65 inches (~165.1 cm): IBW = 45.5 + 2.3 * (65 - 60) = 45.5 + 11.5 = 57.0 kg
      const ibw = calculateIdealBodyWeight(165.1, "female");
      expect(ibw).toBe(57.0);
    });

    it("calculates Adjusted Body Weight (AdjBW) for obese patients", () => {
      // IBW = 70 kg, Actual Weight = 100 kg
      // AdjBW = 70 + 0.4 * (100 - 70) = 70 + 12 = 82.0 kg
      const adjBw = calculateAdjustedBodyWeight(100, 70);
      expect(adjBw).toBe(82.0);
    });

    it("recommends Adjusted Body Weight when patient is obese", () => {
      // Height: 165.1 cm, Actual Weight: 95 kg, Female (IBW = 57 kg, Obese)
      const summary = computeBodyWeightSummary(165.1, 95, "female");
      expect(summary).not.toBeNull();
      expect(summary?.isObese).toBe(true);
      expect(summary?.recommendedWeightType).toBe("adjusted");
      // AdjBW = 57 + 0.4 * (95 - 57) = 57 + 15.2 = 72.2 kg
      expect(summary?.recommendedDosingWeightKg).toBe(72.2);
    });
  });

  describe("4.4 Creatinine Clearance (CrCl) — Cockcroft-Gault", () => {
    it("calculates CrCl for Men accurately", () => {
      // Age: 60, Weight: 72 kg, SCr: 1.0 mg/dL, Male
      // CrCl = [ (140 - 60) * 72 ] / (72 * 1.0) = [ 80 * 72 ] / 72 = 80.0 mL/min
      const res = calculateCockcroftGaultCrCl(60, 72, 1.0, "male");
      expect(res).not.toBeNull();
      expect(res?.crCl).toBe(80.0);
      expect(res?.renalBand).toBe("Normal (>=60)");
    });

    it("applies 0.85 multiplier for Women", () => {
      // Same metrics for Female: 80.0 * 0.85 = 68.0 mL/min
      const res = calculateCockcroftGaultCrCl(60, 72, 1.0, "female");
      expect(res).not.toBeNull();
      expect(res?.crCl).toBe(68.0);
      expect(res?.renalBand).toBe("Normal (>=60)");
    });

    it("classifies moderate and severe renal impairment bands", () => {
      // CrCl = 45 mL/min -> Moderate Impairment (30-59)
      const mod = calculateCockcroftGaultCrCl(70, 50, 1.2, "male");
      expect(mod?.crCl).toBeLessThan(60);
      expect(mod?.crCl).toBeGreaterThanOrEqual(30);
      expect(mod?.renalBand).toBe("Moderate Impairment (30-59)");

      // Severe: Age 80, Weight 50, SCr 2.5 -> CrCl = (60 * 50) / (72 * 2.5) = 3000 / 180 = 16.7 mL/min
      const sev = calculateCockcroftGaultCrCl(80, 50, 2.5, "male");
      expect(sev?.crCl).toBe(16.7);
      expect(sev?.renalBand).toBe("Severe Impairment (<30)");
    });
  });

  describe("4.5 Carboplatin Dose — Calvert Formula", () => {
    it("calculates Carboplatin dose: Dose = Target AUC × (GFR + 25)", () => {
      // AUC 5, GFR 75 mL/min -> Dose = 5 * (75 + 25) = 5 * 100 = 500 mg
      const res = calculateCalvertDose(5, 75);
      expect(res).not.toBeNull();
      expect(res?.totalDoseMg).toBe(500);
      expect(res?.isGfrCapped).toBe(false);
    });

    it("caps GFR at 125 mL/min by default to prevent toxicity", () => {
      // GFR = 150 mL/min, Target AUC = 6
      // Capped GFR = 125 -> Dose = 6 * (125 + 25) = 6 * 150 = 900 mg
      const res = calculateCalvertDose(6, 150, true, 125);
      expect(res).not.toBeNull();
      expect(res?.totalDoseMg).toBe(900);
      expect(res?.isGfrCapped).toBe(true);
      expect(res?.gfrUsed).toBe(125);
    });

    it("allows uncapped GFR when cap is toggled off", () => {
      // GFR = 150 mL/min, Target AUC = 6 without cap: 6 * (150 + 25) = 1050 mg
      const res = calculateCalvertDose(6, 150, false);
      expect(res?.totalDoseMg).toBe(1050);
      expect(res?.isGfrCapped).toBe(false);
    });
  });

  describe("4.6 General Dose Modification Rules", () => {
    it("triggers hold recommendation when ANC < 1500 /uL", () => {
      const res = evaluateDoseModification({
        drugName: "Cisplatin",
        ancPerMicroLiter: 1200,
        plateletsPerMicroLiter: 150000,
      });
      expect(res.isHoldRecommended).toBe(true);
      expect(res.reasons.some((r) => r.includes("ANC"))).toBe(true);
    });

    it("triggers hold recommendation when Platelets < 100,000 /uL", () => {
      const res = evaluateDoseModification({
        drugName: "Paclitaxel",
        ancPerMicroLiter: 2500,
        plateletsPerMicroLiter: 80000,
      });
      expect(res.isHoldRecommended).toBe(true);
      expect(res.reasons.some((r) => r.includes("Platelet"))).toBe(true);
    });

    it("applies renal dose reduction for Capecitabine when CrCl is 30-50 mL/min", () => {
      const res = evaluateDoseModification({
        drugName: "Capecitabine",
        crCl: 40,
      });
      expect(res.isHoldRecommended).toBe(false);
      expect(res.recommendedDosePercentage).toBe(75);
    });

    it("holds Capecitabine when CrCl < 30 mL/min", () => {
      const res = evaluateDoseModification({
        drugName: "Capecitabine",
        crCl: 25,
      });
      expect(res.isHoldRecommended).toBe(true);
      expect(res.recommendedDosePercentage).toBe(0);
    });

    it("reduces Doxorubicin dose by 50% when Bilirubin is 1.2 - 3.0 mg/dL", () => {
      const res = evaluateDoseModification({
        drugName: "Doxorubicin",
        serumBilirubinMgDl: 2.1,
      });
      expect(res.recommendedDosePercentage).toBe(50);
    });
  });

  describe("4.7 Weight-Based Dosing and Pediatric Switch", () => {
    it("calculates weight-based dose accurately (mg/kg * kg)", () => {
      // Bevacizumab 7.5 mg/kg for 70 kg patient = 525 mg
      const dose = calculateWeightBasedDose(7.5, 70);
      expect(dose).toBe(525);
    });

    it("detects pediatric low-weight switch (<10 kg)", () => {
      const check = checkPediatricDosingSwitch(8.5, 18);
      expect(check.shouldSwitchToWeightBased).toBe(true);
      expect(check.reason).toContain("< 10 kg");
    });

    it("detects infant age switch (<12 months)", () => {
      const check = checkPediatricDosingSwitch(11.0, 9);
      expect(check.shouldSwitchToWeightBased).toBe(true);
      expect(check.reason).toContain("< 12 months");
    });

    it("does not trigger pediatric switch for standard weight adults", () => {
      const check = checkPediatricDosingSwitch(65, 360);
      expect(check.shouldSwitchToWeightBased).toBe(false);
    });
  });

  describe("Dose Rounding Rules", () => {
    it("rounds dose to nearest 5 mg by default", () => {
      expect(roundDose(523, 5)).toBe(525);
      expect(roundDose(521, 5)).toBe(520);
    });

    it("rounds dose to nearest 10 mg when specified", () => {
      expect(roundDose(524, 10)).toBe(520);
      expect(roundDose(526, 10)).toBe(530);
    });

    it("rounds dose to nearest 50 mg for vial rounding", () => {
      expect(roundDose(480, 50)).toBe(500);
      expect(roundDose(460, 50)).toBe(450);
    });
  });

  describe("Dosing Basis Inference", () => {
    it("infers AUC for Carboplatin", () => {
      expect(inferDosingBasisForMedicine("Carboplatin AUC 5")).toBe("AUC");
    });

    it("infers Weight for Bevacizumab, Trastuzumab, and Pembrolizumab", () => {
      expect(inferDosingBasisForMedicine("Bevacizumab")).toBe("Weight");
      expect(inferDosingBasisForMedicine("Trastuzumab IV")).toBe("Weight");
      expect(inferDosingBasisForMedicine("Pembrolizumab")).toBe("Weight");
    });

    it("defaults to BSA for standard cytotoxic agents", () => {
      expect(inferDosingBasisForMedicine("Fluorouracil")).toBe("BSA");
      expect(inferDosingBasisForMedicine("Paclitaxel")).toBe("BSA");
      expect(inferDosingBasisForMedicine("Oxaliplatin")).toBe("BSA");
    });
  });

  describe("4.8 Unit Conversion & Dynamic Dose Calculation Engine", () => {
    describe("convertUnit", () => {
      it("converts grams to milligrams (1 g = 1000 mg)", () => {
        expect(convertUnit(1, "g", "mg")).toBe(1000);
        expect(convertUnit(2.5, "g", "mg")).toBe(2500);
      });

      it("converts milligrams to grams (1000 mg = 1 g)", () => {
        expect(convertUnit(1000, "mg", "g")).toBe(1);
        expect(convertUnit(500, "mg", "g")).toBe(0.5);
      });

      it("converts milligrams to micrograms (1 mg = 1000 mcg)", () => {
        expect(convertUnit(1, "mg", "mcg")).toBe(1000);
      });

      it("converts compound units (e.g. g/m² to mg/m²)", () => {
        expect(convertUnit(1, "g/m²", "mg/m²")).toBe(1000);
        expect(convertUnit(85, "mg/m²", "g/m²")).toBe(0.085);
      });

      it("converts volumes: mL <-> CC is 1:1 and L <-> mL is 1000:1", () => {
        expect(convertUnit(50, "mL", "CC")).toBe(50);
        expect(convertUnit(100, "CC", "mL")).toBe(100);
        expect(convertUnit(1, "L", "CC")).toBe(1000);
        expect(convertUnit(500, "CC", "L")).toBe(0.5);
      });

      it("returns same value when fromUnit and toUnit match", () => {
        expect(convertUnit(85, "mg", "mg")).toBe(85);
        expect(convertUnit(100, "CC", "CC")).toBe(100);
      });

      it("returns null on invalid or incompatible units", () => {
        expect(convertUnit(null, "g", "mg")).toBeNull();
        expect(convertUnit(100, "mg", "invalidUnit")).toBeNull();
        expect(convertUnit(100, "mg", "L")).toBeNull();
      });
    });

    describe("convertMassToVolume", () => {
      it("converts mass to volume using concentration (Volume = Mass / Concentration)", () => {
        // 300 mg at 6 mg/mL = 50 CC
        expect(convertMassToVolume(300, "mg", "CC", 6)).toBe(50);
        // 0.3 g at 6 mg/mL = 300 mg / 6 = 50 CC
        expect(convertMassToVolume(0.3, "g", "CC", 6)).toBe(50);
      });

      it("assumes standard aqueous density (1 g = 1 mL = 1 CC) when concentration is omitted", () => {
        // 1 g = 1 CC
        expect(convertMassToVolume(1, "g", "CC")).toBe(1);
        // 1000 mg = 1 CC
        expect(convertMassToVolume(1000, "mg", "CC")).toBe(1);
        // 500 mg = 0.5 CC
        expect(convertMassToVolume(500, "mg", "CC")).toBe(0.5);
      });

      it("converts to Liters (L) accurately", () => {
        // 1000 g = 1000 CC = 1 L
        expect(convertMassToVolume(1000, "g", "L")).toBe(1);
      });

      it("handles null or non-positive inputs safely", () => {
        expect(convertMassToVolume(null, "g", "CC")).toBeNull();
        expect(convertMassToVolume(0, "g", "CC")).toBeNull();
        expect(convertMassToVolume(-5, "g", "CC")).toBeNull();
      });
    });

    describe("getRecommendedUnitsForDoseCalc", () => {
      it("recommends mg/m² for BSA", () => {
        const res = getRecommendedUnitsForDoseCalc("BSA (mg/m²)");
        expect(res.unit).toBe("mg/m²");
        expect(res.patientUnit).toBe("mg");
      });

      it("recommends mg/kg for Weight", () => {
        const res = getRecommendedUnitsForDoseCalc("Weight (mg/kg)");
        expect(res.unit).toBe("mg/kg");
        expect(res.patientUnit).toBe("mg");
      });

      it("recommends AUC for Calvert", () => {
        const res = getRecommendedUnitsForDoseCalc("AUC (Calvert)");
        expect(res.unit).toBe("AUC");
        expect(res.patientUnit).toBe("mg");
      });

      it("recommends mg for Fixed Dose", () => {
        const res = getRecommendedUnitsForDoseCalc("Fixed Dose");
        expect(res.unit).toBe("mg");
        expect(res.patientUnit).toBe("mg");
      });
    });

    describe("calculatePatientDoseFromTemplate", () => {
      it("calculates BSA dose dynamically (dose * bsa)", () => {
        // 85 mg/m² * 1.7 m² = 144.5 mg
        expect(calculatePatientDoseFromTemplate(85, "BSA (mg/m²)", 1.7)).toBe(144.5);
      });

      it("calculates Weight-based dose dynamically (dose * weight)", () => {
        // 7.5 mg/kg * 70 kg = 525 mg
        expect(calculatePatientDoseFromTemplate(7.5, "Weight (mg/kg)", 1.7, 70)).toBe(525);
      });

      it("calculates Calvert AUC dose dynamically", () => {
        // AUC 5, GFR 75 -> 5 * (75 + 25) = 500 mg
        expect(calculatePatientDoseFromTemplate(5, "AUC (Calvert)", 1.7, 70, 75)).toBe(500);
      });

      it("returns identical dose for Fixed Dose", () => {
        expect(calculatePatientDoseFromTemplate(200, "Fixed Dose")).toBe(200);
      });
    });
  });
});

