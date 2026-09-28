import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calculator,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  Info,
  Scale,
  Activity,
  Syringe,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import {
  calculateMostellerBsa,
  calculateBmi,
  computeBodyWeightSummary,
  calculateCockcroftGaultCrCl,
  calculateCalvertDose,
  evaluateDoseModification,
  roundDose,
  calculateWeightBasedDose,
  checkPediatricDosingSwitch,
  inferDosingBasisForMedicine,
  STANDARD_WEIGHT_BASED_AGENTS,
  PatientSex,
  DosingWeightType,
  DosingBasis,
} from "@/utils/chemoCalculations";

interface DoseCalculationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDrugName?: string;
  initialDose?: string;
  initialDoseCalc?: string;
  onApplyDose?: (calculatedDose: string, calculatedUnit: string, doseCalcMethod: string) => void;
}

export function DoseCalculationModal({
  open,
  onOpenChange,
  initialDrugName = "",
  initialDose = "",
  initialDoseCalc = "",
  onApplyDose,
}: DoseCalculationModalProps) {
  const [activeTab, setActiveTab] = useState<"calculator" | "reference">("calculator");

  // Patient Metrics Sandbox
  const [heightCm, setHeightCm] = useState<string>("170");
  const [weightKg, setWeightKg] = useState<string>("70");
  const [ageYears, setAgeYears] = useState<string>("55");
  const [sex, setSex] = useState<PatientSex>("male");
  const [serumCreatinine, setSerumCreatinine] = useState<string>("1.0");

  // Options
  const [capBsa, setCapBsa] = useState<boolean>(true);
  const [weightTypeForCrCl, setWeightTypeForCrCl] = useState<DosingWeightType>("actual");
  const [capGfr, setCapGfr] = useState<boolean>(true);
  const [roundOption, setRoundOption] = useState<5 | 10 | 25 | 50 | "none">(5);

  // Drug Sandbox
  const [drugName, setDrugName] = useState<string>(initialDrugName);
  const [dosingBasis, setDosingBasis] = useState<DosingBasis>("BSA");
  const [protocolDose, setProtocolDose] = useState<string>(initialDose);

  // Lab Modification Simulator
  const [showLabMod, setShowLabMod] = useState<boolean>(false);
  const [serumBilirubin, setSerumBilirubin] = useState<string>("");
  const [astAltMultiple, setAstAltMultiple] = useState<string>("");
  const [ancCount, setAncCount] = useState<string>("");
  const [plateletCount, setPlateletCount] = useState<string>("");

  // Sync with initial props when opened
  useEffect(() => {
    if (open) {
      if (initialDrugName) {
        setDrugName(initialDrugName);
        const inferred = inferDosingBasisForMedicine(initialDrugName);
        if (initialDoseCalc) {
          if (initialDoseCalc.includes("AUC")) setDosingBasis("AUC");
          else if (initialDoseCalc.includes("KG") || initialDoseCalc.includes("Weight")) setDosingBasis("Weight");
          else if (initialDoseCalc.includes("Fixed") || initialDoseCalc.includes("Flat")) setDosingBasis("Flat");
          else if (initialDoseCalc.includes("IBW")) setDosingBasis("IBW");
          else if (initialDoseCalc.includes("BMI")) setDosingBasis("BMI");
          else setDosingBasis("BSA");
        } else {
          setDosingBasis(inferred);
        }
      }
      if (initialDose) {
        setProtocolDose(initialDose);
      }
    }
  }, [open, initialDrugName, initialDose, initialDoseCalc]);

  const numHeight = parseFloat(heightCm) || 0;
  const numWeight = parseFloat(weightKg) || 0;
  const numAge = parseFloat(ageYears) || 0;
  const numCreatinine = parseFloat(serumCreatinine) || 0;
  const numDose = parseFloat(protocolDose) || 0;

  // Derivations
  const bsaResult = useMemo(() => {
    return calculateMostellerBsa(numHeight, numWeight, capBsa, 2.0);
  }, [numHeight, numWeight, capBsa]);

  const bmiResult = useMemo(() => {
    return calculateBmi(numHeight, numWeight);
  }, [numHeight, numWeight]);

  const bodyWeightSummary = useMemo(() => {
    return computeBodyWeightSummary(numHeight, numWeight, sex);
  }, [numHeight, numWeight, sex]);

  const crClWeightUsed = useMemo(() => {
    if (!bodyWeightSummary) return numWeight;
    if (weightTypeForCrCl === "ideal") return bodyWeightSummary.idealBodyWeightKg;
    if (weightTypeForCrCl === "adjusted") return bodyWeightSummary.adjustedBodyWeightKg;
    return numWeight;
  }, [weightTypeForCrCl, bodyWeightSummary, numWeight]);

  const crClResult = useMemo(() => {
    return calculateCockcroftGaultCrCl(numAge, crClWeightUsed, numCreatinine, sex, weightTypeForCrCl);
  }, [numAge, crClWeightUsed, numCreatinine, sex, weightTypeForCrCl]);

  const calvertResult = useMemo(() => {
    if (dosingBasis !== "AUC") return null;
    const gfr = crClResult?.crCl ?? 0;
    return calculateCalvertDose(numDose, gfr, capGfr, 125);
  }, [dosingBasis, numDose, crClResult, capGfr]);

  // Pediatric switch check
  const pediatricCheck = useMemo(() => {
    return checkPediatricDosingSwitch(numWeight, numAge < 1 ? Math.round(numAge * 12) : undefined);
  }, [numWeight, numAge]);

  // Base Calculated Dose in mg
  const rawCalculatedDose = useMemo(() => {
    if (numDose <= 0) return 0;
    if (dosingBasis === "AUC") {
      return calvertResult?.totalDoseMg ?? 0;
    }
    if (dosingBasis === "BSA") {
      const bsa = bsaResult?.bsa ?? 0;
      return numDose * bsa;
    }
    if (dosingBasis === "Weight") {
      const w = weightTypeForCrCl === "adjusted" && bodyWeightSummary ? bodyWeightSummary.adjustedBodyWeightKg : numWeight;
      return calculateWeightBasedDose(numDose, w) ?? 0;
    }
    if (dosingBasis === "Flat") {
      return numDose;
    }
    if (dosingBasis === "IBW") {
      return numDose * (bodyWeightSummary?.idealBodyWeightKg ?? numWeight);
    }
    if (dosingBasis === "BMI") {
      return numDose * (bmiResult?.bmi ?? 0);
    }
    return numDose;
  }, [dosingBasis, numDose, calvertResult, bsaResult, weightTypeForCrCl, bodyWeightSummary, numWeight, bmiResult]);

  // Lab Modification Evaluation
  const doseModification = useMemo(() => {
    return evaluateDoseModification({
      drugName,
      crCl: crClResult?.crCl,
      serumBilirubinMgDl: parseFloat(serumBilirubin) || null,
      astAltUlnMultiple: parseFloat(astAltMultiple) || null,
      ancPerMicroLiter: parseFloat(ancCount) || null,
      plateletsPerMicroLiter: parseFloat(plateletCount) || null,
    });
  }, [drugName, crClResult, serumBilirubin, astAltMultiple, ancCount, plateletCount]);

  // Adjusted dose with % reduction
  const finalAdjustedDose = useMemo(() => {
    if (doseModification.isHoldRecommended) return 0;
    const factor = doseModification.recommendedDosePercentage / 100;
    return rawCalculatedDose * factor;
  }, [rawCalculatedDose, doseModification]);

  // Rounded dose
  const finalRoundedDose = useMemo(() => {
    if (doseModification.isHoldRecommended) return 0;
    if (finalAdjustedDose <= 0) return 0;
    return roundDose(finalAdjustedDose, roundOption) ?? finalAdjustedDose;
  }, [finalAdjustedDose, roundOption, doseModification.isHoldRecommended]);

  const handleApply = () => {
    if (!onApplyDose || finalRoundedDose <= 0) return;
    const formattedDose = String(finalRoundedDose);
    const unit = "mg";
    const methodDesc =
      dosingBasis === "AUC"
        ? `Calvert AUC ${numDose}`
        : dosingBasis === "BSA"
        ? `BSA ${numDose} mg/m²`
        : dosingBasis === "Weight"
        ? `Weight ${numDose} mg/kg`
        : "Fixed Dose";
    onApplyDose(formattedDose, unit, methodDesc);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[950px] w-full max-h-[92vh] overflow-y-auto p-0 rounded-2xl bg-[#f8fafc] border border-[#d9e2ec] shadow-2xl">
        {/* Header */}
        <div className="bg-[#12335c] text-white px-7 py-5 flex items-center justify-between border-b border-blue-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-100 shadow-inner">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Medicine Dosage Calculator & Clinical Info
              </DialogTitle>
              <p className="text-xs text-blue-200 mt-0.5">
                Formulas 4.1 – 4.7: Mosteller BSA, BMI, Devine IBW, Cockcroft-Gault CrCl, Calvert AUC & Dose Modification Rules
              </p>
            </div>
          </div>
          <div className="flex items-center bg-white/10 p-1 rounded-xl gap-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("calculator")}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "calculator" ? "bg-white text-[#12335c] shadow-xs" : "text-blue-100 hover:text-white"
              }`}
            >
              <Calculator className="w-3.5 h-3.5" /> Calculator Sandbox
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("reference")}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "reference" ? "bg-white text-[#12335c] shadow-xs" : "text-blue-100 hover:text-white"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Calculation Info
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "calculator" ? (
          <div className="p-7 space-y-6">
            {/* Step 1: Patient Metrics & Anthropometrics */}
            <div className="bg-white p-5 rounded-2xl border border-[#e2e8f0] shadow-xs">
              <div className="flex items-center justify-between mb-4 border-b border-[#edf2f7] pb-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[#1a202c]">
                  <Scale className="w-4 h-4 text-[#12335c]" />
                  <span>1. Patient Anthropometrics & Baseline Metrics</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setHeightCm("170");
                    setWeightKg("70");
                    setAgeYears("55");
                    setSex("male");
                    setSerumCreatinine("1.0");
                  }}
                  className="text-xs text-[#5b6b7c] hover:text-[#12335c] flex items-center gap-1 font-medium transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Defaults
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#64748b] mb-1">Height (cm)</label>
                  <input
                    type="number"
                    min="30"
                    max="250"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    className="w-full h-9 px-3 bg-[#f8fafc] border border-[#cbd5e1] rounded-lg text-sm text-[#1e293b] font-semibold focus:border-[#12335c] focus:bg-white outline-none"
                    placeholder="170"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#64748b] mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    min="1"
                    max="300"
                    step="0.1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="w-full h-9 px-3 bg-[#f8fafc] border border-[#cbd5e1] rounded-lg text-sm text-[#1e293b] font-semibold focus:border-[#12335c] focus:bg-white outline-none"
                    placeholder="70"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#64748b] mb-1">Age (Years)</label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={ageYears}
                    onChange={(e) => setAgeYears(e.target.value)}
                    className="w-full h-9 px-3 bg-[#f8fafc] border border-[#cbd5e1] rounded-lg text-sm text-[#1e293b] font-semibold focus:border-[#12335c] focus:bg-white outline-none"
                    placeholder="55"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#64748b] mb-1">Biological Sex</label>
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value as PatientSex)}
                    className="w-full h-9 px-2 bg-[#f8fafc] border border-[#cbd5e1] rounded-lg text-sm text-[#1e293b] font-semibold focus:border-[#12335c] focus:bg-white outline-none cursor-pointer"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female (× 0.85)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#64748b] mb-1">Serum Creatinine (mg/dL)</label>
                  <input
                    type="number"
                    min="0.1"
                    max="20"
                    step="0.05"
                    value={serumCreatinine}
                    onChange={(e) => setSerumCreatinine(e.target.value)}
                    className="w-full h-9 px-3 bg-[#f8fafc] border border-[#cbd5e1] rounded-lg text-sm text-[#1e293b] font-semibold focus:border-[#12335c] focus:bg-white outline-none"
                    placeholder="1.0"
                  />
                </div>
              </div>

              {/* Dynamic Derived Metrics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#f1f5f9]">
                {/* BSA Card */}
                <div className="bg-[#f0f5fb] border border-[#d6e3f2] p-3 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#12335c]">BSA (Mosteller)</span>
                    <label className="flex items-center gap-1 text-[10px] text-[#5b6b7c] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={capBsa}
                        onChange={(e) => setCapBsa(e.target.checked)}
                        className="rounded text-[#12335c]"
                      />
                      <span>Cap 2.0m²</span>
                    </label>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl font-extrabold text-[#0f294a]">
                      {bsaResult ? `${bsaResult.bsa.toFixed(2)}` : "—"}
                    </span>
                    <span className="text-xs font-semibold text-[#5b6b7c]">m²</span>
                  </div>
                  {bsaResult?.isCapped && (
                    <div className="text-[10px] font-semibold text-amber-700 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      Capped (Actual: {bsaResult.uncappedBsa.toFixed(2)} m²)
                    </div>
                  )}
                </div>

                {/* BMI Card */}
                <div className="bg-[#f8fafc] border border-[#e2e8f0] p-3 rounded-xl">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">BMI</div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl font-extrabold text-[#1e293b]">
                      {bmiResult ? `${bmiResult.bmi.toFixed(1)}` : "—"}
                    </span>
                    <span className="text-xs font-semibold text-[#64748b]">kg/m²</span>
                  </div>
                  {bmiResult && (
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border mt-1 ${bmiResult.colorClass}`}
                    >
                      {bmiResult.category}
                    </span>
                  )}
                </div>

                {/* IBW / AdjBW Card */}
                <div className="bg-[#f8fafc] border border-[#e2e8f0] p-3 rounded-xl">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">Weights (IBW / AdjBW)</div>
                  <div className="mt-1 text-xs text-[#1e293b] space-y-0.5">
                    <div>
                      <span className="text-[#64748b]">IBW (Devine): </span>
                      <strong className="font-bold">{bodyWeightSummary?.idealBodyWeightKg ?? "—"} kg</strong>
                    </div>
                    <div>
                      <span className="text-[#64748b]">AdjBW (40%): </span>
                      <strong className="font-bold">{bodyWeightSummary?.adjustedBodyWeightKg ?? "—"} kg</strong>
                    </div>
                  </div>
                  {bodyWeightSummary?.isObese && (
                    <div className="text-[10px] font-bold text-rose-600 mt-1">Obese patient criteria met</div>
                  )}
                </div>

                {/* CrCl Card */}
                <div className="bg-[#f8fafc] border border-[#e2e8f0] p-3 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">CrCl (Cockcroft)</span>
                    <select
                      value={weightTypeForCrCl}
                      onChange={(e) => setWeightTypeForCrCl(e.target.value as DosingWeightType)}
                      className="text-[10px] bg-white border border-[#cbd5e1] rounded px-1 py-0.5 text-[#334155]"
                    >
                      <option value="actual">Actual Wt</option>
                      <option value="ideal">Ideal (IBW)</option>
                      <option value="adjusted">Adjusted</option>
                    </select>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl font-extrabold text-[#1e293b]">
                      {crClResult ? `${crClResult.crCl.toFixed(1)}` : "—"}
                    </span>
                    <span className="text-xs font-semibold text-[#64748b]">mL/min</span>
                  </div>
                  {crClResult && (
                    <div
                      className={`text-[10px] font-semibold mt-1 ${
                        crClResult.crCl >= 60
                          ? "text-emerald-700"
                          : crClResult.crCl >= 30
                          ? "text-amber-700"
                          : "text-rose-700"
                      }`}
                    >
                      {crClResult.renalBand}
                    </div>
                  )}
                </div>
              </div>

              {/* Pediatric Warning banner if applicable */}
              {pediatricCheck.shouldSwitchToWeightBased && (
                <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{pediatricCheck.reason}</span>
                </div>
              )}
            </div>

            {/* Step 2: Drug Dose Calculation & Regimen Simulator */}
            <div className="bg-white p-5 rounded-2xl border border-[#e2e8f0] shadow-xs">
              <div className="flex items-center justify-between mb-4 border-b border-[#edf2f7] pb-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[#1a202c]">
                  <Syringe className="w-4 h-4 text-[#12335c]" />
                  <span>2. Drug Regimen Simulator & Dosing Basis</span>
                </div>
                {drugName && (
                  <span className="text-xs font-bold text-[#12335c] bg-[#eaf0f7] px-2.5 py-1 rounded-md">
                    {drugName}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#64748b] mb-1">Drug / Medicine Name</label>
                  <input
                    type="text"
                    value={drugName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDrugName(val);
                      if (val) {
                        setDosingBasis(inferDosingBasisForMedicine(val));
                      }
                    }}
                    placeholder="e.g. Carboplatin, Paclitaxel, Bevacizumab"
                    className="w-full h-9 px-3 bg-[#f8fafc] border border-[#cbd5e1] rounded-lg text-sm text-[#1e293b] font-semibold focus:border-[#12335c] focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11.5px] font-semibold text-[#64748b] mb-1">
                    Dosing Basis <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={dosingBasis}
                    onChange={(e) => setDosingBasis(e.target.value as DosingBasis)}
                    className="w-full h-9 px-3 bg-[#f8fafc] border border-[#cbd5e1] rounded-lg text-sm text-[#1e293b] font-semibold focus:border-[#12335c] focus:bg-white outline-none cursor-pointer"
                  >
                    <option value="BSA">BSA-based (mg/m²)</option>
                    <option value="Weight">Weight-based (mg/kg)</option>
                    <option value="AUC">Calvert AUC (Carboplatin)</option>
                    <option value="Flat">Flat / Fixed Dose (mg)</option>
                    <option value="IBW">Ideal Body Weight (mg/kg IBW)</option>
                    <option value="BMI">BMI-adjusted</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11.5px] font-semibold text-[#64748b] mb-1">
                    {dosingBasis === "AUC"
                      ? "Target AUC"
                      : dosingBasis === "BSA"
                      ? "Dose per m² (mg/m²)"
                      : dosingBasis === "Weight"
                      ? "Dose per kg (mg/kg)"
                      : "Flat Dose (mg)"}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={protocolDose}
                    onChange={(e) => setProtocolDose(e.target.value)}
                    placeholder={dosingBasis === "AUC" ? "5" : dosingBasis === "BSA" ? "85" : "7.5"}
                    className="w-full h-9 px-3 bg-[#f8fafc] border border-[#cbd5e1] rounded-lg text-sm text-[#1e293b] font-semibold focus:border-[#12335c] focus:bg-white outline-none"
                  />
                </div>
              </div>

              {/* Special options for Carboplatin AUC */}
              {dosingBasis === "AUC" && (
                <div className="mt-3 p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-700 shrink-0" />
                    <span>
                      <strong>Calvert Formula:</strong> Dose = Target AUC × (GFR + 25). GFR estimated via CrCl ({crClResult?.crCl ?? "—"} mL/min).
                    </span>
                  </div>
                  <label className="flex items-center gap-1.5 font-semibold text-blue-950 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={capGfr}
                      onChange={(e) => setCapGfr(e.target.checked)}
                      className="rounded text-[#12335c]"
                    />
                    <span>Cap GFR at 125 mL/min (ASCO/NCCN)</span>
                  </label>
                </div>
              )}

              {/* Lab-based Dose Modification Simulation Toggle */}
              <div className="mt-4 pt-3 border-t border-[#edf2f7]">
                <button
                  type="button"
                  onClick={() => setShowLabMod(!showLabMod)}
                  className="text-xs font-semibold text-[#12335c] flex items-center gap-1.5 hover:underline"
                >
                  <Activity className="w-3.5 h-3.5" />
                  {showLabMod ? "Hide Lab-based Dose Modification Simulator" : "Simulate Lab-based Dose Modifications (CrCl, Hepatic, ANC, Platelets)"}
                </button>

                {showLabMod && (
                  <div className="mt-3 p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#64748b] mb-1">Bilirubin (mg/dL)</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="e.g. 1.8"
                          value={serumBilirubin}
                          onChange={(e) => setSerumBilirubin(e.target.value)}
                          className="w-full h-8 px-2.5 bg-white border border-[#cbd5e1] rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#64748b] mb-1">AST / ALT (× ULN)</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="e.g. 2.5"
                          value={astAltMultiple}
                          onChange={(e) => setAstAltMultiple(e.target.value)}
                          className="w-full h-8 px-2.5 bg-white border border-[#cbd5e1] rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#64748b] mb-1">ANC (/µL)</label>
                        <input
                          type="number"
                          placeholder="e.g. 1800"
                          value={ancCount}
                          onChange={(e) => setAncCount(e.target.value)}
                          className="w-full h-8 px-2.5 bg-white border border-[#cbd5e1] rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#64748b] mb-1">Platelets (/µL)</label>
                        <input
                          type="number"
                          placeholder="e.g. 150000"
                          value={plateletCount}
                          onChange={(e) => setPlateletCount(e.target.value)}
                          className="w-full h-8 px-2.5 bg-white border border-[#cbd5e1] rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    {/* Feedback on Modifications */}
                    {doseModification.isHoldRecommended && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 space-y-1">
                        <div className="font-bold flex items-center gap-1 text-rose-700">
                          <ShieldAlert className="w-4 h-4" /> CYCLE DELAY / HOLD RECOMMENDED
                        </div>
                        {doseModification.reasons.map((r, i) => (
                          <div key={i}>• {r}</div>
                        ))}
                      </div>
                    )}

                    {!doseModification.isHoldRecommended && doseModification.recommendedDosePercentage < 100 && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
                        <div className="font-bold text-amber-800">
                          Dose Reduction Recommended: {doseModification.recommendedDosePercentage}% of standard dose
                        </div>
                        {doseModification.warnings.map((w, i) => (
                          <div key={i}>• {w}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Final Calculated Dose & Action Output */}
            <div className="bg-gradient-to-br from-[#12335c] to-[#0a1e38] text-white p-6 rounded-2xl shadow-md">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-300" /> Calculated Patient Dose
                  </span>
                  <div className="mt-1 flex items-baseline gap-3">
                    <span className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                      {doseModification.isHoldRecommended ? "HOLD" : `${finalRoundedDose}`}
                    </span>
                    {!doseModification.isHoldRecommended && (
                      <span className="text-lg font-semibold text-blue-200">mg</span>
                    )}
                  </div>
                  <div className="text-xs text-blue-200 mt-1">
                    {doseModification.isHoldRecommended ? (
                      <span className="text-rose-300 font-semibold">Treatment held due to lab safety threshold</span>
                    ) : (
                      <>
                        Formula basis:{" "}
                        <strong className="text-white">
                          {dosingBasis === "AUC"
                            ? `Calvert Formula (AUC ${numDose})`
                            : dosingBasis === "BSA"
                            ? `${numDose} mg/m² × ${bsaResult?.bsa ?? 0} m²`
                            : dosingBasis === "Weight"
                            ? `${numDose} mg/kg × ${numWeight} kg`
                            : "Flat dose"}
                        </strong>
                        {roundOption !== "none" && ` · Rounded to nearest ${roundOption} mg`}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <div className="text-right mr-2">
                    <label className="block text-[11px] text-blue-200 font-medium">Round dose</label>
                    <select
                      value={roundOption}
                      onChange={(e) => setRoundOption(e.target.value === "none" ? "none" : (Number(e.target.value) as any))}
                      className="text-xs bg-white/15 border border-white/20 text-white rounded-lg px-2 py-1 outline-none"
                    >
                      <option value="none" className="text-black">No Rounding</option>
                      <option value={5} className="text-black">Nearest 5 mg</option>
                      <option value={10} className="text-black">Nearest 10 mg</option>
                      <option value={25} className="text-black">Nearest 25 mg</option>
                      <option value={50} className="text-black">Nearest 50 mg</option>
                    </select>
                  </div>

                  {onApplyDose && (
                    <button
                      type="button"
                      onClick={handleApply}
                      disabled={finalRoundedDose <= 0 || doseModification.isHoldRecommended}
                      className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg transition-all"
                    >
                      <span>Apply to Protocol</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Tab 2: Calculation Info Reference */
          <div className="p-7 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* 4.1 Body Surface Area (BSA) */}
            <div className="bg-white p-5 rounded-2xl border border-[#e2e8f0]">
              <h3 className="text-sm font-extrabold text-[#12335c] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#eaf0f7] text-[#12335c] flex items-center justify-center text-xs">4.1</span>
                Body Surface Area (BSA) — Mosteller Formula
              </h3>
              <div className="mt-2 text-xs text-[#334155] leading-relaxed space-y-2">
                <div className="p-3 bg-[#f8fafc] rounded-xl border border-[#e2e8f0] font-mono text-sm text-[#0f294a]">
                  BSA (m²) = SQRT[ (Height in cm × Weight in kg) / 3600 ]
                </div>
                <p>
                  <strong>Clinical Note:</strong> Most chemotherapy dosing (mg/m²) uses the Mosteller formula. Per institutional and clinical trial protocol guidelines, BSA is capped at <strong>2.0 m²</strong> for obese patients to prevent overdosage and systemic toxicity, unless the specific protocol explicitly permits actual BSA dosing.
                </p>
              </div>
            </div>

            {/* 4.2 Body Mass Index (BMI) */}
            <div className="bg-white p-5 rounded-2xl border border-[#e2e8f0]">
              <h3 className="text-sm font-extrabold text-[#12335c] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#eaf0f7] text-[#12335c] flex items-center justify-center text-xs">4.2</span>
                Body Mass Index (BMI)
              </h3>
              <div className="mt-2 text-xs text-[#334155] leading-relaxed space-y-2">
                <div className="p-3 bg-[#f8fafc] rounded-xl border border-[#e2e8f0] font-mono text-sm text-[#0f294a]">
                  BMI (kg/m²) = Weight (kg) / [ Height (m) ]²
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="p-2.5 rounded-lg border bg-amber-50/50 border-amber-200">
                    <div className="font-bold text-amber-800">Underweight</div>
                    <div className="text-[11px] text-amber-700">&lt; 18.5 kg/m²</div>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-emerald-50/50 border-emerald-200">
                    <div className="font-bold text-emerald-800">Normal</div>
                    <div className="text-[11px] text-emerald-700">18.5 – 24.9 kg/m²</div>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-amber-100/50 border-amber-300">
                    <div className="font-bold text-amber-900">Overweight</div>
                    <div className="text-[11px] text-amber-800">25.0 – 29.9 kg/m²</div>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-rose-50/50 border-rose-200">
                    <div className="font-bold text-rose-800">Obese</div>
                    <div className="text-[11px] text-rose-700">&ge; 30.0 kg/m²</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4.3 Ideal, Adjusted, and Dosing Body Weight */}
            <div className="bg-white p-5 rounded-2xl border border-[#e2e8f0]">
              <h3 className="text-sm font-extrabold text-[#12335c] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#eaf0f7] text-[#12335c] flex items-center justify-center text-xs">4.3</span>
                Ideal, Adjusted, and Dosing Body Weight (Devine Formula)
              </h3>
              <div className="mt-2 text-xs text-[#334155] leading-relaxed space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]">
                    <strong className="block text-[#12335c] mb-1">Ideal Body Weight (IBW — Devine):</strong>
                    <div className="font-mono text-xs space-y-1">
                      <div>Men: 50 + 2.3 × [ Height (inches) − 60 ]</div>
                      <div>Women: 45.5 + 2.3 × [ Height (inches) − 60 ]</div>
                    </div>
                  </div>
                  <div className="p-3 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]">
                    <strong className="block text-[#12335c] mb-1">Adjusted Body Weight (AdjBW for Obesity):</strong>
                    <div className="font-mono text-xs">
                      AdjBW (kg) = IBW + 0.4 × (Actual Weight − IBW)
                    </div>
                  </div>
                </div>
                <p>
                  <strong>Clinical Note:</strong> Dosing weight selection (actual vs. ideal vs. adjusted) is configurable per drug. Practice varies by agent (e.g. Carboplatin AUC uses actual weight in the Calvert formula; renally-dosed agents frequently use adjusted or ideal weight in obesity).
                </p>
              </div>
            </div>

            {/* 4.4 Creatinine Clearance (CrCl) */}
            <div className="bg-white p-5 rounded-2xl border border-[#e2e8f0]">
              <h3 className="text-sm font-extrabold text-[#12335c] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#eaf0f7] text-[#12335c] flex items-center justify-center text-xs">4.4</span>
                Creatinine Clearance (CrCl) — Cockcroft-Gault
              </h3>
              <div className="mt-2 text-xs text-[#334155] leading-relaxed space-y-2">
                <div className="p-3 bg-[#f8fafc] rounded-xl border border-[#e2e8f0] font-mono text-xs space-y-1 text-[#0f294a]">
                  <div>Men: CrCl (mL/min) = [ (140 − Age) × Weight (kg) ] / [ 72 × Serum Creatinine (mg/dL) ]</div>
                  <div>Women: CrCl (mL/min) = Men's CrCl × 0.85</div>
                </div>
                <p>
                  <strong>Configurable Parameter:</strong> Weight used is selectable between Actual Body Weight, Ideal Body Weight, or Adjusted Body Weight per institutional pharmacy protocol.
                </p>
              </div>
            </div>

            {/* 4.5 Carboplatin Dose — Calvert Formula */}
            <div className="bg-white p-5 rounded-2xl border border-[#e2e8f0]">
              <h3 className="text-sm font-extrabold text-[#12335c] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#eaf0f7] text-[#12335c] flex items-center justify-center text-xs">4.5</span>
                Carboplatin Dose — Calvert Formula
              </h3>
              <div className="mt-2 text-xs text-[#334155] leading-relaxed space-y-2">
                <div className="p-3 bg-[#f8fafc] rounded-xl border border-[#e2e8f0] font-mono text-sm text-[#0f294a]">
                  Total Dose (mg) = Target AUC × (GFR + 25)
                </div>
                <p>
                  <strong>Clinical Guidance:</strong> GFR is estimated via Cockcroft-Gault CrCl. Per FDA and ASCO/NCCN safety guidelines, GFR is capped at <strong>125 mL/min</strong> to prevent severe thrombocytopenia and nephrotoxicity. Target AUC is protocol-specific (commonly AUC 5–6 for single agent, AUC 4–5 in combination regimens).
                </p>
              </div>
            </div>

            {/* 4.6 General Dose Modification Rules */}
            <div className="bg-white p-5 rounded-2xl border border-[#e2e8f0]">
              <h3 className="text-sm font-extrabold text-[#12335c] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#eaf0f7] text-[#12335c] flex items-center justify-center text-xs">4.6</span>
                General Dose Modification Rules & Lookup Tables
              </h3>
              <div className="mt-2 text-xs text-[#334155] leading-relaxed space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl border bg-[#f8fafc]">
                    <div className="font-bold text-[#12335c] mb-1">Renal Bands (CrCl)</div>
                    <ul className="list-disc pl-4 space-y-1 text-[11.5px]">
                      <li>&ge; 60 mL/min: 100% full dose</li>
                      <li>30 – 59 mL/min: 70–75% dose</li>
                      <li>&lt; 30 mL/min: 50% dose or hold</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-xl border bg-[#f8fafc]">
                    <div className="font-bold text-[#12335c] mb-1">Hepatic Bands (Bilirubin)</div>
                    <ul className="list-disc pl-4 space-y-1 text-[11.5px]">
                      <li>1.2 – 3.0 mg/dL: 50% reduction (Anthracyclines/Vincas)</li>
                      <li>&gt; 3.0 mg/dL: 75% reduction or hold</li>
                      <li>AST/ALT &gt; 5× ULN: delay cycle</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-xl border bg-[#f8fafc]">
                    <div className="font-bold text-[#12335c] mb-1">Hematologic Thresholds</div>
                    <ul className="list-disc pl-4 space-y-1 text-[11.5px]">
                      <li>ANC &lt; 1500 /µL: Hold cycle</li>
                      <li>Platelets &lt; 100,000 /µL: Hold cycle</li>
                      <li>Febrile neutropenia: G-CSF secondary prophylaxis</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* 4.7 Weight-Based Dosing Regimens Reference Table */}
            <div className="bg-white p-5 rounded-2xl border border-[#e2e8f0]">
              <h3 className="text-sm font-extrabold text-[#12335c] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#eaf0f7] text-[#12335c] flex items-center justify-center text-xs">4.7</span>
                Weight-Based Dosing (mg/kg Regimens) & Pediatric Switch
              </h3>
              <div className="mt-2 text-xs text-[#334155] leading-relaxed space-y-2">
                <p>
                  <strong>Formula:</strong> Total Dose (mg) = Dosing Weight (kg) × Dose-per-kg (mg/kg).
                </p>
                <div className="overflow-x-auto border border-[#edf2f7] rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f8fafc] text-[#64748b] font-bold border-b border-[#edf2f7]">
                      <tr>
                        <th className="p-2.5">Drug / Agent</th>
                        <th className="p-2.5">Typical Dose</th>
                        <th className="p-2.5">Weight Basis</th>
                        <th className="p-2.5">Clinical Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f5f9]">
                      {STANDARD_WEIGHT_BASED_AGENTS.map((ag, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-[#1e293b]">{ag.drugName}</td>
                          <td className="p-2.5">{ag.typicalDose}</td>
                          <td className="p-2.5 capitalize">{ag.dosingWeightUsed}</td>
                          <td className="p-2.5 text-[#5b6b7c]">{ag.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

