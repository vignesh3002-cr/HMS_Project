import { useEffect, useState } from "react";
import {
  Loader2,
  Droplet,
  HeartPulse,
  Thermometer,
  Weight,
  Ruler,
  ThumbsUp,
  Activity,
  Droplet as BloodDrop,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { encounterApi, type PatientHistoryPayload } from "@/api/encounter.api";

export type TemperatureUnit = "C" | "F";
export type WeightUnit = "kg" | "lb";
export type HeightUnit = "cm" | "in";

interface VitalsSignsPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId?: string;
  patientId?: string;
  /** Fired after vitals were successfully created/updated so parents can refresh their lists. */
  onSaved?: () => void;
}

type Tone = "danger" | "warning" | "success" | "purple" | "accent";

const TONE_BADGE: Record<Tone, string> = {
  danger: "bg-[#FBEAE9] text-[#B5433E]",
  warning: "bg-[#FCF1DD] text-[#A8720F]",
  success: "bg-[#E7F4EE] text-[#2E7D5B]",
  purple: "bg-[#EEECF7] text-[#5A4E9C]",
  accent: "bg-[#E6F1F5] text-[#1D6E8C]",
};

const ICON_SIZE = 18;
const ICON_BG_SIZE = 32;

const INPUT_CLASS =
  "h-[34px] w-full min-w-0 rounded-lg border border-[#E2E6E8] bg-[#FBFCFD] px-2.5 text-[13px] font-medium text-[#1C2B33] outline-none focus:border-[#1D6E8C] focus:ring-[2px] focus:ring-[#E6F1F5]";

const SELECT_CLASS =
  "h-[34px] shrink-0 rounded-lg border border-[#E2E6E8] bg-[#FBFCFD] px-2 text-[12px] font-medium text-[#5B6B73] outline-none focus:border-[#1D6E8C]";

const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;
const numOrNull = (s: string) => {
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : null;
};
const valueToInput = (v: number | string | null | undefined): string =>
  v === null || v === undefined ? "" : String(v);
const fToC = (f: number) => ((f - 32) * 5) / 9;
const cToF = (c: number) => (c * 9) / 5 + 32;
const lbToKg = (lb: number) => lb / 2.20462;
const kgToLb = (kg: number) => kg * 2.20462;
const inToCm = (inch: number) => inch * 2.54;
const cmToIn = (cm: number) => cm / 2.54;

function FieldCard({
  tone,
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  tone: Tone;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[#E2E6E8] bg-white p-3">
      <div className="mb-2 flex items-center gap-2">
        <div
          className={`flex size-[${ICON_BG_SIZE}px] shrink-0 items-center justify-center rounded-full ${TONE_BADGE[tone]}`}
        >
          <Icon className="w-[20px] h-[20px]" />
        </div>
        <div>
          <p className="text-[12px] font-semibold leading-tight text-[#1C2B33]">{title}</p>
          <p className="text-[10px] leading-tight text-[#93A1A8]">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function VitalLine({
  tone,
  label,
  value,
  unit,
  icon: Icon,
}: {
  tone: Tone;
  label: string;
  value: string;
  unit?: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
}) {
  return (
    <div className="mb-1.5 flex items-center gap-2.5 rounded-[8px] bg-[#FAFBFC] px-2.5 py-2 last:mb-0">
      <div
        className={`flex size-[24px] shrink-0 items-center justify-center rounded-full ${TONE_BADGE[tone]}`}
      >
        <Icon className="w-[12px] h-[12px]" />
      </div>
      <div className="flex-1 text-[12px] text-[#5B6B73]">{label}</div>
      <div className="text-[13px] font-semibold text-[#1C2B33]">
        {value}
        {unit ? <span className="ml-1 text-[10px] font-normal text-[#93A1A8]">{unit}</span> : null}
      </div>
    </div>
  );
}

const VitalsSignsPopover = ({ open, onOpenChange, appointmentId, patientId, onSaved }: VitalsSignsPopoverProps) => {
  const { toast } = useToast();
  const [bpSystolic, setBpSystolic] = useState("");
  const [bpDiastolic, setBpDiastolic] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [spo2, setSpo2] = useState("");
  const [bloodSugar, setBloodSugar] = useState("");

  const [temperature, setTemperature] = useState("");
  const [tempUnit, setTempUnit] = useState<TemperatureUnit>("C");
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  const [height, setHeight] = useState("");
  const [heightUnit, setHeightUnit] = useState<HeightUnit>("cm");

  const [pain, setPain] = useState(0);

  const [hasExisting, setHasExisting] = useState(false);
  const [existingEncounterNo, setExistingEncounterNo] = useState("");
  const [isLoadingVitals, setIsLoadingVitals] = useState(false);

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [recordedAt, setRecordedAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || submitting) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (summaryOpen) setSummaryOpen(false);
      else onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, summaryOpen, submitting, onOpenChange]);

  useEffect(() => {
    if (!open) setSummaryOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open || !appointmentId || !patientId) return;
    let cancelled = false;
    const loadExistingVitals = async () => {
      setIsLoadingVitals(true);
      try {
        const res = await encounterApi.getByAppointment(appointmentId);
        const record = res.data?.data;
        if (!record || cancelled) return;
        setBpSystolic(valueToInput(record.systolic_bp));
        setBpDiastolic(valueToInput(record.diastolic_bp));
        setHeartRate(valueToInput(record.pulse));
        setRespiratoryRate(valueToInput(record.respiratory_rate));
        setSpo2(valueToInput(record.spo2));
        setBloodSugar(valueToInput(record.blood_sugar));
        setTemperature(valueToInput(record.temperature));
        setTempUnit("C");
        setWeight(valueToInput(record.weight));
        setWeightUnit("kg");
        setHeight(valueToInput(record.height));
        setHeightUnit("cm");
        setPain(Math.min(10, Math.max(0, Number(record.pain_score ?? 0)) || 0));
        setExistingEncounterNo(record.encounter_no);
        setHasExisting(true);
      } catch {
      } finally {
        if (!cancelled) setIsLoadingVitals(false);
      }
    };
    loadExistingVitals();
    return () => {
      cancelled = true;
    };
  }, [open, appointmentId, patientId]);

  const tempValue = numOrNull(temperature);
  const tempC = tempValue === null ? null : tempUnit === "F" ? fToC(tempValue) : tempValue;
  const tempConverted =
    tempValue === null
      ? ""
      : tempUnit === "F"
        ? `= ${round(tempC as number, 1)} °C`
        : `= ${round(cToF(tempValue), 1)} °F`;

  const weightValue = numOrNull(weight);
  const weightKg = weightValue === null ? null : weightUnit === "lb" ? lbToKg(weightValue) : weightValue;
  const weightConverted =
    weightValue === null
      ? ""
      : weightUnit === "lb"
        ? `= ${round(weightKg as number, 1)} kg`
        : `= ${round(kgToLb(weightValue), 1)} lbs`;

  const heightValue = numOrNull(height);
  const heightCm = heightValue === null ? null : heightUnit === "in" ? inToCm(heightValue) : heightValue;
  const heightConverted =
    heightValue === null
      ? ""
      : heightUnit === "in"
        ? `= ${round(heightCm as number, 1)} cm`
        : `= ${round(cmToIn(heightValue), 1)} in`;

  const bloodSugarValue = numOrNull(bloodSugar);

  const handleTempUnitChange = (unit: TemperatureUnit) => {
    if (tempValue !== null) {
      setTemperature(String(unit === "F" ? round(cToF(tempValue), 1) : round(fToC(tempValue), 1)));
    }
    setTempUnit(unit);
  };

  const handleWeightUnitChange = (unit: WeightUnit) => {
    if (weightValue !== null) {
      setWeight(String(unit === "lb" ? round(kgToLb(weightValue), 1) : round(lbToKg(weightValue), 1)));
    }
    setWeightUnit(unit);
  };

  const handleHeightUnitChange = (unit: HeightUnit) => {
    if (heightValue !== null) {
      setHeight(String(unit === "in" ? round(cmToIn(heightValue), 1) : round(inToCm(heightValue), 1)));
    }
    setHeightUnit(unit);
  };

  const reset = () => {
    setBpSystolic("");
    setBpDiastolic("");
    setHeartRate("");
    setRespiratoryRate("");
    setSpo2("");
    setBloodSugar("");
    setTemperature("");
    setTempUnit("C");
    setWeight("");
    setWeightUnit("kg");
    setHeight("");
    setHeightUnit("cm");
    setPain(0);
  };

  const openSummary = () => {
    setRecordedAt(new Date().toLocaleString());
    setSummaryOpen(true);
  };

  const requestClose = () => {
    if (submitting) return;
    if (summaryOpen) {
      setSummaryOpen(false);
      return;
    }
    onOpenChange(false);
  };

  const mapPainToSeverity = (score: number): number => {
    // Return the numeric score as severity (0-10)
    return score;
  };

  const handleAddVitals = async () => {
    if (submitting) return;
    if (!patientId) {
      toast({ title: "Patient ID required", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      if (hasExisting && existingEncounterNo) {
        const updateData: Record<string, number> = {};
        const putIfPresent = (key: string, value: number | null) => {
          if (value !== null) updateData[key] = value;
        };
        putIfPresent("systolic_bp", numOrNull(bpSystolic));
        putIfPresent("diastolic_bp", numOrNull(bpDiastolic));
        putIfPresent("pulse", numOrNull(heartRate) === null ? null : Math.round(numOrNull(heartRate)!));
        putIfPresent("respiratory_rate", numOrNull(respiratoryRate) === null ? null : Math.round(numOrNull(respiratoryRate)!));
        putIfPresent("spo2", numOrNull(spo2) === null ? null : Math.round(numOrNull(spo2)!));
        putIfPresent("temperature", tempC === null ? null : round(tempC, 2));
        putIfPresent("blood_sugar", bloodSugarValue);
        putIfPresent("weight", weightKg === null ? null : round(weightKg, 2));
        putIfPresent("height", heightCm === null ? null : round(heightCm, 2));
        updateData.pain_score = pain;

        await encounterApi.update(existingEncounterNo, updateData);

        toast({
          title: "Vitals updated",
          description: `BP ${bpSystolic || "--"}/${bpDiastolic || "--"} • HR ${heartRate || "--"} • Temp ${temperature || "--"}°${tempUnit}`,
        });
        onSaved?.();
      } else {        const payload: PatientHistoryPayload = {
          patientId,
          appointmentId,
          systolicBp: numOrNull(bpSystolic),
          diastolicBp: numOrNull(bpDiastolic),
          pulse: numOrNull(heartRate),
          respiratoryRate: numOrNull(respiratoryRate),
          temperature: tempC,
          oxygenSaturation: numOrNull(spo2),
          bloodSugar: bloodSugarValue !== null ? String(bloodSugarValue) : undefined,
          weight: weightKg,
          height: heightCm,
          painScore: pain,
          severity: mapPainToSeverity(pain),
        };

        await encounterApi.createPatientHistory(payload);

        toast({
          title: "Vitals recorded",
          description: `BP ${bpSystolic || "--"}/${bpDiastolic || "--"} • HR ${heartRate || "--"} • Temp ${temperature || "--"}°${tempUnit}`,
        });
        onSaved?.();
      }

      reset();
      setSummaryOpen(false);
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err.response?.data?.message || "Could not save vitals",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const sysDisplay = bpSystolic || "--";
  const diaDisplay = bpDiastolic || "--";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/10 p-3"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div className="w-full max-w-[560px] rounded-xl bg-white p-4 shadow-xl">
        <header className="mb-3">
          <h2 className="text-[18px] font-semibold leading-tight text-[#1C2B33]">Vital signs entry</h2>
          {isLoadingVitals && (
            <p className="mt-0.5 text-[11px] text-[#93A1A8]">Loading saved vitals…</p>
          )}
        </header>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <FieldCard tone="danger" title="Blood pressure" subtitle="Systolic / diastolic" icon={Droplet}>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                inputMode="numeric"
                placeholder="120"
                value={bpSystolic}
                onChange={(e) => setBpSystolic(e.target.value)}
                className={`${INPUT_CLASS} text-center`}
              />
              <span className="font-semibold text-[#93A1A8]">/</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="80"
                value={bpDiastolic}
                onChange={(e) => setBpDiastolic(e.target.value)}
                className={`${INPUT_CLASS} text-center`}
              />
              <span className="min-w-[52px] shrink-0 text-right text-xs text-[#93A1A8]">mmHg</span>
            </div>
          </FieldCard>

          <FieldCard tone="danger" title="Heart rate / pulse" subtitle="Beats per minute" icon={HeartPulse}>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                placeholder="72"
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
                className={INPUT_CLASS}
              />
              <span className="min-w-[52px] shrink-0 text-right text-xs text-[#93A1A8]">bpm</span>
            </div>
          </FieldCard>

          <FieldCard tone="purple" title="Respiratory rate" subtitle="Breaths per minute" icon={ThumbsUp}>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                placeholder="16"
                value={respiratoryRate}
                onChange={(e) => setRespiratoryRate(e.target.value)}
                className={INPUT_CLASS}
              />
              <span className="min-w-[72px] shrink-0 text-right text-xs text-[#93A1A8]">breaths/min</span>
            </div>
          </FieldCard>

          <FieldCard tone="warning" title="Body temperature" subtitle="Toggle °C or °F" icon={Thermometer}>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                placeholder="37.0"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                className={INPUT_CLASS}
              />
              <select
                value={tempUnit}
                onChange={(e) => handleTempUnitChange(e.target.value as TemperatureUnit)}
                className={SELECT_CLASS}
              >
                <option value="C">°C</option>
                <option value="F">°F</option>
              </select>
            </div>
            <p className="mt-1.5 min-h-[14px] text-xs text-[#93A1A8]">{tempConverted}</p>
          </FieldCard>

          <FieldCard tone="success" title="Oxygen saturation" subtitle="Percent" icon={Activity}>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                placeholder="98"
                value={spo2}
                onChange={(e) => setSpo2(e.target.value)}
                className={INPUT_CLASS}
              />
              <span className="min-w-[52px] shrink-0 text-right text-xs text-[#93A1A8]">%</span>
            </div>
          </FieldCard>

          <FieldCard tone="accent" title="Blood sugar" subtitle="mg/dL" icon={BloodDrop}>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                placeholder="100"
                value={bloodSugar}
                onChange={(e) => setBloodSugar(e.target.value)}
                className={INPUT_CLASS}
              />
              <span className="min-w-[52px] shrink-0 text-right text-xs text-[#93A1A8]">mg/dL</span>
            </div>
          </FieldCard>

          <FieldCard tone="accent" title="Weight" subtitle="Toggle kg or lbs" icon={Weight}>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                placeholder="70"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className={INPUT_CLASS}
              />
              <select
                value={weightUnit}
                onChange={(e) => handleWeightUnitChange(e.target.value as WeightUnit)}
                className={SELECT_CLASS}
              >
                <option value="kg">kg</option>
                <option value="lb">lbs</option>
              </select>
            </div>
            <p className="mt-1.5 min-h-[14px] text-xs text-[#93A1A8]">{weightConverted}</p>
          </FieldCard>

          <FieldCard tone="accent" title="Height" subtitle="Toggle cm or inches" icon={Ruler}>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                placeholder="170"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className={INPUT_CLASS}
              />
              <select
                value={heightUnit}
                onChange={(e) => handleHeightUnitChange(e.target.value as HeightUnit)}
                className={SELECT_CLASS}
              >
                <option value="cm">cm</option>
                <option value="in">inches</option>
              </select>
            </div>
            <p className="mt-1.5 min-h-[14px] text-xs text-[#93A1A8]">{heightConverted}</p>
          </FieldCard>

          <FieldCard tone="purple" title="Pain score" subtitle="0 = none, 10 = worst" icon={Activity}>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={pain}
                onChange={(e) => setPain(Number(e.target.value))}
                className="h-[38px] flex-1 accent-[#1D6E8C]"
              />
              <div className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-[#E6F1F5] text-sm font-bold text-[#1D6E8C]">
                {pain}
              </div>
            </div>
          </FieldCard>
        </div>

        <div className="mt-6 mb-1 flex gap-2.5">
          <button
            type="button"
            onClick={openSummary}
            disabled={submitting}
            className="h-10 cursor-pointer rounded-lg border border-[#1D6E8C] bg-[#1D6E8C] px-[18px] text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            Preview summary
          </button>
          <button
            type="button"
            onClick={() => {
              if (!submitting) reset();
            }}
            className="h-10 cursor-pointer rounded-lg border border-[#E2E6E8] bg-white px-[18px] text-sm font-semibold text-[#1C2B33] transition-transform active:scale-[0.98]"
          >
            Reset
          </button>
        </div>
      </div>

      {summaryOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-none p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) requestClose();
          }}
        >
          <div className="w-full max-w-[360px] max-h-[80vh] overflow-y-auto rounded-xl bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-[#1C2B33]">Vital signs</h3>
              <button
                type="button"
                onClick={() => !submitting && setSummaryOpen(false)}
                aria-label="Close"
                className="h-auto cursor-pointer border-none bg-transparent p-0 text-lg leading-none text-[#93A1A8]"
              >
                ×
              </button>
            </div>
            <p className="mb-2.5 text-[11px] text-[#93A1A8]">Recorded {recordedAt}</p>

            <VitalLine tone="danger" label="Blood pressure" value={`${sysDisplay}/${diaDisplay}`} unit="mmHg" icon={Droplet} />
            <VitalLine tone="danger" label="Heart rate" value={heartRate || "--"} unit="bpm" icon={HeartPulse} />
            <VitalLine tone="purple" label="Respiratory rate" value={respiratoryRate || "--"} unit="breaths/min" icon={ThumbsUp} />
            <VitalLine
              tone="warning"
              label="Temperature"
              value={temperature ? `${temperature} °${tempUnit}` : "--"}
              icon={Thermometer}
            />
            <VitalLine tone="success" label="Oxygen saturation" value={spo2 || "--"} unit="%" icon={Activity} />
            <VitalLine tone="accent" label="Blood sugar" value={bloodSugar ? `${bloodSugar} mg/dL` : "--"} icon={BloodDrop} />
            <VitalLine
              tone="accent"
              label="Weight"
              value={weight ? `${weight} ${weightUnit === "lb" ? "lbs" : "kg"}` : "--"}
              icon={Weight}
            />
            <VitalLine
              tone="accent"
              label="Height"
              value={height ? `${height} ${heightUnit === "in" ? "in" : "cm"}` : "--"}
              icon={Ruler}
            />
            <VitalLine tone="purple" label="Pain score" value={String(pain)} unit="/10" icon={Activity} />

            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSummaryOpen(false)}
                disabled={submitting}
                className="h-9 cursor-pointer rounded-lg border border-[#E2E6E8] bg-white px-4 text-[12px] font-semibold text-[#555e6c] disabled:cursor-not-allowed disabled:opacity-70"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleAddVitals}
                disabled={submitting}
                className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#1D6E8C] bg-[#1D6E8C] px-4 transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span className="text-[12px] font-semibold text-white">
                  {hasExisting ? "Update vitals" : "Add vitals"}
                </span>
                {submitting && <Loader2 className="size-4 animate-spin text-white" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VitalsSignsPopover;