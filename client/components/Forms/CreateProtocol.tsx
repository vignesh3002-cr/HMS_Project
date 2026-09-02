import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Save,
  Trash2,
  Pill,
  Syringe,
  ShieldPlus,
  FlaskConical,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Eye,
  Calendar,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormDropdown } from "@/components/ui/form-dropdown";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { chemotherapyApi, MedicineOption, RegimenProtocolDilutionInput, DischargeInstructionInput } from "@/api/chemotherapy.api";
import { format, addDays, parseISO, isValid } from "date-fns";

// Shared styling tokens - matches PatientRegistrationForm / Addemployee conventions
const inputCls =
  "w-full h-10 px-4 bg-white border border-gray-200 rounded-xl text-[13.5px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-[3px] focus:ring-blue-500/15 focus:border-blue-500 transition-all duration-200 disabled:bg-gray-50 disabled:text-gray-400";
const labelCls = "block text-[12.5px] font-semibold text-gray-700 mb-1.5";
const Req = () => <span className="text-red-600 ml-0.5">*</span>;

// Grid-table styling matching the Edit Protocol mockup: rounded bordered container,
// muted uppercase header, centered index column, borderless inputs that reveal a
// border on hover/focus.
const ptGridWrap = "overflow-x-auto w-full";
const ptGridBox = "min-w-[760px] border border-[#e3e8ee] rounded-lg bg-white";
const ptGridHead =
  "grid items-center gap-3 px-4 py-3 bg-[#f7f9fb] border-b border-[#e3e8ee] text-[11px] font-bold uppercase tracking-wide text-[#8a97a6]";
const ptGridRow =
  "grid items-center gap-3 px-4 py-2 border-b border-[#eef1f4] hover:bg-[#f8f9fb] transition-colors last:border-0";
const ptInput =
  "w-full border border-transparent hover:border-[#e3e8ee] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none rounded-md px-2 py-1.5 text-[12.5px] bg-transparent transition-all disabled:bg-transparent disabled:text-[#5b6b7c] disabled:cursor-not-allowed";

function ProtocolGridTable({
  columns,
  template,
  rows,
  addLabel,
  onAdd,
  disabled,
  addClassName = "text-[#12335c] hover:bg-[#f0f2f5]",
  boxClassName = ptGridBox,
}: {
  columns: string[];
  template: string;
  rows: React.ReactNode[][];
  addLabel: string;
  onAdd: () => void;
  disabled?: boolean;
  addClassName?: string;
  boxClassName?: string;
}) {
  return (
    <>
      <div className={ptGridWrap}>
        <div className={boxClassName}>
          <div className={ptGridHead} style={{ gridTemplateColumns: template }}>
            {columns.map((c, i) => (
              <div key={i} className={i === 0 ? "text-center" : ""}>
                {c}
              </div>
            ))}
          </div>
          {rows.map((cells, ri) => (
            <div key={ri} className={ptGridRow} style={{ gridTemplateColumns: template }}>
              {cells.map((cell, ci) => (
                <div key={ci} className={ci === 0 ? "text-center font-semibold text-[#8a97a6]" : ""}>
                  {cell}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div
        className={`text-center py-3.5 bg-[#fafbfc] font-bold text-sm cursor-pointer border-t border-[#e3e8ee] ${addClassName}`}
        onClick={() => !disabled && onAdd()}
      >
        {addLabel}
      </div>
    </>
  );
}

interface Premed {
  id: string;
  medication: string;
  dose: string;
  unit: string;
  adminNotes: string;
  remarks: string;
}
interface ChemoPlan {
  id: string;
  medication: string;
  doseCalc: string;
  dose: string;
  unit: string;
  patientDose: string;
  patientUnit: string;
  adminNotes: string;
  toxicity: string;
  remarks: string;
}
interface SupportiveCare {
  id: string;
  medication: string;
  adminNotes: string;
  remarks: string;
}
interface DilutionDetail {
  dilutionId: string;
  id: string;
  medication: string;
  form: string;
  dose: string;
  unit: string;
  volume: string;
  volumeUnit: string;
  diluent: string;
}
interface PostTreatment {
  id: string;
  form: string;
  medication: string;
  dose: string;
  unit: string;
  frequency: string;
  instructions: string;
  duration: string;
  remarks: string;
}

const TREATMENT_INTENT_OPTIONS = ["curative", "palliative", "adjuvant", "neoadjuvant", "maintenance"];

const DOSE_CALC_OPTIONS = ["BSA", "IBW", "BMI", "AUC 1.5", "AUC 2", "AUC 5", "KG", "Fixed Dose"];

export default function CreateProtocol() {
  const navigate = useNavigate();
  const { protocolId } = useParams<{ protocolId: string }>();
  const location = useLocation();
  const { toast } = useToast();

  const isViewMode = location.pathname.includes("/view/");
  const isEditMode = location.pathname.includes("/edit/");
  const isCreateMode = !protocolId && !isViewMode && !isEditMode;
  const disabled = isViewMode;

  // --- Protocol header fields --- regimen_code = Regime_name, regimen_name = Protocol Title (original_protocol)
  const [regimenCode, setRegimenCode] = useState("");
  const [regimenName, setRegimenName] = useState("");
  const [cancerTypeId, setCancerTypeId] = useState("");
  const [subtypeId, setSubtypeId] = useState("");
  const [treatmentIntent, setTreatmentIntent] = useState("");
  const [standardCycles, setStandardCycles] = useState<number>(6);
  const [cycleIntervalDays, setCycleIntervalDays] = useState<number>(21);
  const [scheduleDate, setScheduleDate] = useState("");
  const [notes, setNotes] = useState("");
  const [days, setDays] = useState<Array<{ dayNumber: number; date: string; protocolDayId?: string }>>([{ dayNumber: 1, date: "" }]);
  const [activeDay, setActiveDay] = useState(1);

  const emptyPremed = (): Premed => ({ id: "", medication: "", dose: "", unit: "", adminNotes: "", remarks: "" });
  const emptyChemo = (): ChemoPlan => ({ id: "", medication: "", doseCalc: "", dose: "", unit: "", patientDose: "", patientUnit: "", adminNotes: "", toxicity: "", remarks: "" });
  const emptySupportive = (): SupportiveCare => ({ id: "", medication: "", adminNotes: "", remarks: "" });
  const emptyDilution = (): DilutionDetail => ({ dilutionId: "", id: "", medication: "", form: "", dose: "", unit: "", volume: "", volumeUnit: "", diluent: "" });

  // Per-day maps for protocol items (each day owns its own rows; preserves
  // administration_day per item so repeated edits never re-stamp items onto
  // a single active day).
  const [premedsByDay, setPremedsByDay] = useState<Record<number, Premed[]>>({ 1: [emptyPremed()] });
  const [chemoPlansByDay, setChemoPlansByDay] = useState<Record<number, ChemoPlan[]>>({ 1: [emptyChemo()] });
  const [supportiveByDay, setSupportiveByDay] = useState<Record<number, SupportiveCare[]>>({ 1: [emptySupportive()] });
  const [dilutionByDay, setDilutionByDay] = useState<Record<number, DilutionDetail[]>>({ 1: [emptyDilution()] });

  // Active-day views + setters - the existing table JSX and row handlers keep
  // operating on `premeds`/`chemoPlans`/`supportive`/`dilution`, which now
  // resolve to the currently-selected day's rows.
  const premeds = premedsByDay[activeDay] ?? [];
  const setPremeds = (list: Premed[]) => setPremedsByDay((prev) => ({ ...prev, [activeDay]: list }));
  const chemoPlans = chemoPlansByDay[activeDay] ?? [];
  const setChemoPlans = (list: ChemoPlan[]) => setChemoPlansByDay((prev) => ({ ...prev, [activeDay]: list }));
  const supportive = supportiveByDay[activeDay] ?? [];
  const setSupportive = (list: SupportiveCare[]) => setSupportiveByDay((prev) => ({ ...prev, [activeDay]: list }));
  const dilution = dilutionByDay[activeDay] ?? [];
  const setDilution = (list: DilutionDetail[]) => setDilutionByDay((prev) => ({ ...prev, [activeDay]: list }));
  const [post, setPost] = useState<PostTreatment[]>([
    { id: "", form: "", medication: "", dose: "", unit: "", frequency: "", instructions: "", duration: "", remarks: "" },
  ]);

  const [cancerTypes, setCancerTypes] = useState<Array<{ cancer_type_id: string; cancer_type: string }>>([]);
  const [subtypes, setSubtypes] = useState<Array<{ subtype_id: string; subtype_name: string }>>([]);
  const [premedMeds, setPremedMeds] = useState<MedicineOption[]>([]);
  const [chemoMeds, setChemoMeds] = useState<MedicineOption[]>([]);
  const [supportiveMeds, setSupportiveMeds] = useState<MedicineOption[]>([]);
  const [dilutionMeds, setDilutionMeds] = useState<MedicineOption[]>([]);
  const [loadingPremedMeds, setLoadingPremedMeds] = useState(false);
  const [loadingChemoMeds, setLoadingChemoMeds] = useState(false);
  const [loadingSupportiveMeds, setLoadingSupportiveMeds] = useState(false);
  const [loadingDilutionMeds, setLoadingDilutionMeds] = useState(false);
  const [fieldOptions, setFieldOptions] = useState<{
    dosage_units: string[];
    dilution_forms: string[];
    dilution_dose_units: string[];
    dilution_volume_units: string[];
    diluents: string[];
  }>({ dosage_units: [], dilution_forms: [], dilution_dose_units: [], dilution_volume_units: [], diluents: [] });
  const loadedItemIdsRef = useRef<string[]>([]);
  const [loadingCancerTypes, setLoadingCancerTypes] = useState(false);
  const [loadingProtocol, setLoadingProtocol] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const [sections, setSections] = useState({
    premeds: true,
    chemo: true,
    supportive: true,
    dilution: true,
    post: true,
  });
  const toggleSection = (section: keyof typeof sections) => {
    setSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Fetch cancer types on mount
  useEffect(() => {
    setLoadingCancerTypes(true);
    chemotherapyApi
      .listCancerTypes()
      .then((res) => {
        const data = (res.data as any)?.data ?? res.data;
        if (Array.isArray(data)) setCancerTypes(data);
        else if (Array.isArray((res.data as any)?.data)) setCancerTypes((res.data as any).data);
      })
      .catch(() => {})
      .finally(() => setLoadingCancerTypes(false));
  }, []);

  // Fetch medicines once on mount. PREMEDICATION and PRIMARY (chemo plan)
  // dropdowns use ALL active medicines; SUPPORTIVE uses only medicines that
  // appear as SUPPORTIVE drugs in existing protocols; DILUTION uses only
  // medicines referenced in the dilution table.
  useEffect(() => {
    setLoadingPremedMeds(true);
    setLoadingChemoMeds(true);
    chemotherapyApi
      .listMedicines()
      .then((res) => {
        const data = (res.data as any)?.data ?? res.data;
        const list: MedicineOption[] = Array.isArray(data) ? data : [];
        setPremedMeds(list);
        setChemoMeds(list);
      })
      .catch(() => {
        setPremedMeds([]);
        setChemoMeds([]);
      })
      .finally(() => {
        setLoadingPremedMeds(false);
        setLoadingChemoMeds(false);
      });

    setLoadingSupportiveMeds(true);
    chemotherapyApi
      .listMedicinesByRole("SUPPORTIVE")
      .then((res) => {
        const data = (res.data as any)?.data ?? res.data;
        setSupportiveMeds(Array.isArray(data) ? data : []);
      })
      .catch(() => setSupportiveMeds([]))
      .finally(() => setLoadingSupportiveMeds(false));

    setLoadingDilutionMeds(true);
    chemotherapyApi
      .listDilutionMedicines()
      .then((res) => {
        const data = (res.data as any)?.data ?? res.data;
        setDilutionMeds(Array.isArray(data) ? data : []);
      })
      .catch(() => setDilutionMeds([]))
      .finally(() => setLoadingDilutionMeds(false));
  }, []);

  // Fetch distinct option values (FORM / DOSE UNIT / VOLUME UNIT / dosage
  // unit) from the backend for the protocol-builder dropdowns.
  useEffect(() => {
    chemotherapyApi
      .getProtocolFieldOptions()
      .then((res) => {
        const data = (res.data as any)?.data;
        setFieldOptions({
          dosage_units: Array.isArray(data?.dosage_units) ? data.dosage_units : [],
          dilution_forms: Array.isArray(data?.dilution_forms) ? data.dilution_forms : [],
          dilution_dose_units: Array.isArray(data?.dilution_dose_units) ? data.dilution_dose_units : [],
          dilution_volume_units: Array.isArray(data?.dilution_volume_units) ? data.dilution_volume_units : [],
          diluents: Array.isArray(data?.diluents) ? data.diluents : [],
        });
      })
      .catch(() => setFieldOptions({ dosage_units: [], dilution_forms: [], dilution_dose_units: [], dilution_volume_units: [], diluents: [] }));
  }, []);

  // Fetch subtypes when cancer type changes - don't clear subtypeId during edit/view initial load
  useEffect(() => {
    if (!cancerTypeId) {
      setSubtypes([]);
      return;
    }
    chemotherapyApi
      .listCancerSubtypes(cancerTypeId)
      .then((res) => {
        const data = (res.data as any)?.data ?? res.data;
        if (Array.isArray(data)) setSubtypes(data);
      })
      .catch(() => setSubtypes([]));
  }, [cancerTypeId]);

  // Keep scheduleDate synced with Day 1
  useEffect(() => {
    if (scheduleDate) {
      setDays((prev) => prev.map((d, i) => (i === 0 ? { ...d, date: scheduleDate } : d)));
    }
  }, [scheduleDate]);

  // Load existing protocol for edit/view
  useEffect(() => {
    if (!protocolId || isCreateMode) return;
    setLoadingProtocol(true);
    chemotherapyApi
      .getRegimenProtocol(protocolId)
      .then((res) => {
        const p: any = (res.data as any)?.data ?? res.data;
        if (!p) return;
        setRegimenCode(p.regimen_code ?? "");
        setRegimenName(p.regimen_name ?? (p as any).original_protocol ?? "");
        setCancerTypeId(p.cancer_type_id ?? "");
        setSubtypeId(p.subtype_id ?? "");
        setTreatmentIntent(p.treatment_intent ?? "");
        setStandardCycles(p.standard_cycles ?? 6);
        setCycleIntervalDays(p.cycle_interval_days ?? p.no_of_days ?? 21);
        setNotes(p.notes ?? (p as any).guideline_source ?? "");
        const dbDays: any[] = p.chemotherapy_regimen_protocol_days ?? [];
        const items: any[] = p.chemotherapy_regimen_protocol_items ?? [];
        const maxAdminDay = items.reduce((m: number, x: any) => Math.max(m, x.administration_day ?? 1), 1);
        const dayCount = Math.max(1, Math.min(p.no_of_days ?? (dbDays.length || maxAdminDay) ?? 1, 30));
        const baseDateStr = p.created_at ? format(new Date(p.created_at), "yyyy-MM-dd") : "";
        const loadedDays = Array.from({ length: dayCount }, (_, i) => {
          let d = "";
          if (baseDateStr) {
            try {
              d = format(addDays(parseISO(baseDateStr), i), "yyyy-MM-dd");
            } catch {}
          }
          const dbDay = dbDays.find((x: any) => x.day_number === i + 1);
          return { dayNumber: i + 1, date: d, protocolDayId: dbDay?.protocol_day_id ?? "" };
        });
        setDays(loadedDays);
        if (loadedDays[0]?.date) setScheduleDate(loadedDays[0].date);
        loadedItemIdsRef.current = items.filter((x: any) => x.protocol_item_id).map((x: any) => x.protocol_item_id as string);
        if (items.length) {
          const dayOf = (x: any) => Math.min(x.administration_day ?? 1, dayCount);
          const isLegacyDilution = (x: any) =>
            x.drug_role === "SUPPORTIVE" &&
            !(x.chemotherapy_protocol_dilutions?.length) &&
            x.dosage != null;
          const premedsM: Record<number, Premed[]> = {};
          const chemoM: Record<number, ChemoPlan[]> = {};
          const suppM: Record<number, SupportiveCare[]> = {};
          const diluM: Record<number, DilutionDetail[]> = {};
          for (const x of items) {
            const dayIndex = dayOf(x);
            if (x.drug_role === "PREMEDICATION") {
              (premedsM[dayIndex] = premedsM[dayIndex] ?? []).push({
                id: (x.protocol_item_id as string) ?? "",
                medication: x.medicine_id ?? x.medicine_master?.medicine_name ?? "",
                dose: (x.patient_dose as any) ?? "",
                unit: x.patient_dose_unit ?? "",
                adminNotes: x.administration_detail ?? "",
                remarks: x.remarks ?? "",
              });
            } else if (x.drug_role === "PRIMARY") {
              (chemoM[dayIndex] = chemoM[dayIndex] ?? []).push({
                id: (x.protocol_item_id as string) ?? "",
                medication: x.medicine_id ?? "",
                doseCalc: (x as any).dose_calculation_method ?? "",
                dose: (x.dosage as any) ?? "",
                unit: x.dosage_unit ?? "",
                patientDose: (x.patient_dose as any) ?? "",
                patientUnit: x.patient_dose_unit ?? "",
                adminNotes: x.administration_detail ?? "",
                toxicity: x.previous_toxicity ?? "",
                remarks: x.remarks ?? "",
              });
            } else if (x.drug_role === "SUPPORTIVE") {
              const xs: any[] = x.chemotherapy_protocol_dilutions ?? [];
              if (xs.length) {
                for (const d of xs) {
                  (diluM[dayIndex] = diluM[dayIndex] ?? []).push({
                    dilutionId: (d.protocol_dilution_id as string) ?? "",
                    id: (x.protocol_item_id as string) ?? "",
                    medication: d.medicine_id ?? x.medicine_id ?? "",
                    form: d.form ?? "",
                    dose: d.dose != null ? String(d.dose) : "",
                    unit: d.dose_unit ?? "",
                    volume: d.dilution_volume != null ? String(d.dilution_volume) : "",
                    volumeUnit: d.dilution_volume_unit ?? "",
                    diluent: d.diluent ?? "",
                  });
                }
              } else if (isLegacyDilution(x)) {
                const diluent =
                  (x.administration_detail ?? "").trim() ||
                  (typeof x.remarks === "string" ? x.remarks.replace(/^Diluent:\s*/i, "").trim() : "");
                (diluM[dayIndex] = diluM[dayIndex] ?? []).push({
                  dilutionId: "",
                  id: (x.protocol_item_id as string) ?? "",
                  medication: x.medicine_id ?? "",
                  form: "",
                  dose: x.dosage != null ? String(x.dosage) : "",
                  unit: x.dosage_unit ?? "",
                  volume: "",
                  volumeUnit: "",
                  diluent,
                });
              } else {
                (suppM[dayIndex] = suppM[dayIndex] ?? []).push({
                  id: (x.protocol_item_id as string) ?? "",
                  medication: x.medicine_id ?? "",
                  adminNotes: x.administration_detail ?? "",
                  remarks: x.remarks ?? "",
                });
              }
            }
          }
          // POST-TREATMENT (ON DISCHARGE) medications are persisted in the
          // chemotherapy_discharge_instructions table (surfaced as
          // protocol_discharge_instructions). Protocols created before that
          // switch still carry them as POSTMEDICATION items - fall back to
          // those so nothing disappears on edit.
          const dischargeRows: any[] = p.protocol_discharge_instructions ?? [];
          const postM = dischargeRows.length
            ? dischargeRows.map((d: any) => ({
                id: (d.discharge_instruction_id as string) ?? "",
                form: d.drug_from ?? "Tab",
                medication: d.medicine_id ?? "",
                dose: d.patient_dose != null ? String(d.patient_dose) : "",
                unit: d.patient_dose_unit ?? "",
                frequency: d.frequency ?? "",
                instructions: d.administration_detail ?? "",
                duration: d.duration ?? "",
                remarks: d.comment ?? "",
              }))
            : items
                .filter((x: any) => x.drug_role === "POSTMEDICATION")
                .map((x: any) => ({
                  id: (x.protocol_item_id as string) ?? "",
                  form: "Tab",
                  medication: x.medicine_id ?? "",
                  dose: (x.dosage as any) ?? "",
                  unit: x.dosage_unit ?? "",
                  frequency: x.frequency ?? "",
                  instructions: x.administration_detail ?? "",
                  duration: x.administration_day != null ? "Day " + x.administration_day : "",
                  remarks: typeof x.remarks === "string" ? x.remarks : "",
                }));
          const protoDils: any[] = p.protocol_dilutions ?? [];
          if (Object.keys(diluM).length === 0 && protoDils.length) {
            for (const d of protoDils) {
              (diluM[1] = diluM[1] ?? []).push({
                dilutionId: (d.protocol_dilution_id as string) ?? "",
                id: (d.protocol_item_id as string) ?? "",
                medication: d.medicine_id ?? "",
                form: d.form ?? "",
                dose: d.dose != null ? String(d.dose) : "",
                unit: d.dose_unit ?? "",
                volume: d.dilution_volume != null ? String(d.dilution_volume) : "",
                volumeUnit: d.dilution_volume_unit ?? "",
                diluent: d.diluent ?? "",
              });
            }
          }
          setPremedsByDay(premedsM);
          setChemoPlansByDay(chemoM);
          setSupportiveByDay(suppM);
          setDilutionByDay(diluM);
          if (postM.length) setPost(postM);
        }
      })
      .catch((e: any) => {
        toast({ title: "Failed to load protocol", description: e.response?.data?.message ?? e.message, variant: "destructive" });
      })
      .finally(() => setLoadingProtocol(false));
  }, [protocolId]);

  const isDirty =
    !disabled &&
    (regimenCode.trim() !== "" ||
      regimenName.trim() !== "" ||
      cancerTypeId !== "" ||
      notes.trim() !== "" ||
      days.some((d) => d.date !== "") ||
      Object.values(premedsByDay).some((r) => r.some((rd) => rd.medication.trim() !== "")) ||
      Object.values(chemoPlansByDay).some((r) => r.some((rd) => rd.medication.trim() !== "")) ||
      Object.values(supportiveByDay).some((r) => r.some((rd) => rd.medication.trim() !== "")) ||
      Object.values(dilutionByDay).some((r) => r.some((rd) => rd.medication.trim() !== "")) ||
      post.some((r) => r.medication.trim() !== ""));

  const handleBack = () => {
    if (isDirty) setShowLeaveConfirm(true);
    else navigate(-1);
  };

  const handleAddDay = () => {
    if (disabled) return;
    const nextNum = days.length + 1;
    let nextDate = "";
    const base = days[0]?.date;
    if (base && isValid(parseISO(base))) {
      try {
        nextDate = format(addDays(parseISO(base), nextNum - 1), "yyyy-MM-dd");
      } catch {}
    } else if (scheduleDate && isValid(parseISO(scheduleDate))) {
      try {
        nextDate = format(addDays(parseISO(scheduleDate), nextNum - 1), "yyyy-MM-dd");
      } catch {}
    }
    setDays([...days, { dayNumber: nextNum, date: nextDate }]);
    setPremedsByDay((prev) => ({ ...prev, [nextNum]: [emptyPremed()] }));
    setChemoPlansByDay((prev) => ({ ...prev, [nextNum]: [emptyChemo()] }));
    setSupportiveByDay((prev) => ({ ...prev, [nextNum]: [emptySupportive()] }));
    setDilutionByDay((prev) => ({ ...prev, [nextNum]: [emptyDilution()] }));
    setActiveDay(nextNum);
  };
  const handleDayDateChange = (dayNumber: number, newDate: string) => {
    if (disabled) return;
    setDays((prev) => prev.map((d) => (d.dayNumber === dayNumber ? { ...d, date: newDate } : d)));
    if (dayNumber === 1) setScheduleDate(newDate);
  };
  const handleRemoveDay = (dayNumber: number) => {
    if (disabled || days.length === 1) return;
    const filtered = days.filter((d) => d.dayNumber !== dayNumber).map((d, i) => ({ ...d, dayNumber: i + 1 }));
    setDays(filtered);
    const oldNumbers = filtered.map((d) => d.dayNumber);
    const shift = <T,>(map: Record<number, T[]>): Record<number, T[]> =>
      Object.fromEntries(oldNumbers.map((old, i) => [i + 1, map[old] ?? []]));
    setPremedsByDay((prev) => shift(prev));
    setChemoPlansByDay((prev) => shift(prev));
    setSupportiveByDay((prev) => shift(prev));
    setDilutionByDay((prev) => shift(prev));
    if (activeDay === dayNumber) setActiveDay(filtered[0].dayNumber);
    else if (activeDay > dayNumber) setActiveDay(activeDay - 1);
  };

  const buildItems = () => {
    const items: Array<{
      protocol_item_id?: string;
      medicine_id: string;
      drug_role: string;
      drug_type?: string | null;
      drug_sequence: number;
      dosage?: string | null;
      dosage_unit?: string | null;
      dose_calculation_method?: string | null;
      frequency?: string | null;
      remarks?: string | null;
      patient_dose?: string | null;
      patient_dose_unit?: string | null;
      administration_detail?: string | null;
      previous_toxicity?: string | null;
      administration_day?: number | null;
      dilutions?: RegimenProtocolDilutionInput[];
    }> = [];
    let seq = 1;
    for (const day of days) {
      const dayNum = day.dayNumber;
      for (const row of premedsByDay[dayNum] ?? []) {
        if (!row.medication.trim()) continue;
        items.push({
          protocol_item_id: row.id || undefined,
          medicine_id: row.medication.trim(),
          drug_role: "PREMEDICATION",
          drug_type: "PREMEDICATION",
          drug_sequence: seq++,
          patient_dose: row.dose || null,
          patient_dose_unit: row.unit || null,
          administration_detail: row.adminNotes || null,
          remarks: row.remarks || null,
          administration_day: dayNum,
        });
      }
      for (const row of chemoPlansByDay[dayNum] ?? []) {
        if (!row.medication.trim()) continue;
        items.push({
          protocol_item_id: row.id || undefined,
          medicine_id: row.medication.trim(),
          drug_role: "PRIMARY",
          drug_type: "PRIMARY",
          drug_sequence: seq++,
          dosage: row.dose || null,
          dosage_unit: row.unit || null,
          patient_dose: row.patientDose || null,
          patient_dose_unit: row.patientUnit || null,
          dose_calculation_method: row.doseCalc || null,
          previous_toxicity: row.toxicity || null,
          administration_detail: row.adminNotes || null,
          remarks: row.remarks || null,
          administration_day: dayNum,
        });
      }
      for (const row of supportiveByDay[dayNum] ?? []) {
        if (!row.medication.trim()) continue;
        items.push({ protocol_item_id: row.id || undefined, medicine_id: row.medication.trim(), drug_role: "SUPPORTIVE", drug_type: "SUPPORTIVE", drug_sequence: seq++, administration_detail: row.adminNotes || null, remarks: row.remarks || null, administration_day: dayNum });
      }
      for (const row of dilutionByDay[dayNum] ?? []) {
        if (!row.medication.trim()) continue;
        items.push({
          protocol_item_id: row.id || undefined,
          medicine_id: row.medication.trim(),
          drug_role: "SUPPORTIVE",
          drug_sequence: seq++,
          dosage: null,
          dosage_unit: null,
          administration_detail: null,
          remarks: null,
          administration_day: dayNum,
          dilutions: [{
            protocol_dilution_id: row.dilutionId || undefined,
            medicine_id: row.medication.trim(),
            form: row.form || null,
            dose: row.dose || null,
            dose_unit: row.unit || null,
            dilution_volume: row.volume || null,
            dilution_volume_unit: row.volumeUnit || null,
            diluent: row.diluent || null,
          }],
        });
      }
    }
    // NOTE: POST-TREATMENT (ON DISCHARGE) medications are NOT protocol items;
    // they are persisted separately as chemotherapy_discharge_instructions
    // (see buildDischargeInstructions below).
    return items;
  };

  const buildDischargeInstructions = (): DischargeInstructionInput[] => {
    const instructions: DischargeInstructionInput[] = [];
    post.forEach((row, idx) => {
      if (!row.medication.trim()) return;
      instructions.push({
        discharge_instruction_id: row.id || undefined,
        medicine_id: row.medication.trim(),
        drug_sequence: idx + 1,
        drug_from: row.form || null,
        frequency: row.frequency || null,
        duration: row.duration || null,
        patient_dose: row.dose ? Number(row.dose) : null,
        patient_dose_unit: row.unit || null,
        administration_detail: row.instructions || null,
        comment: row.remarks || null,
      });
    });
    return instructions;
  };

  const handleSave = async () => {
    if (isViewMode) {
      navigate("/protocol");
      return;
    }
    if (!regimenName.trim()) {
      toast({ title: "Missing required field", description: "Protocol Title (Regimen Name / Original Protocol) is required.", variant: "destructive" });
      return;
    }
    if (!cancerTypeId) {
      toast({ title: "Missing required field", description: "Please select a cancer type.", variant: "destructive" });
      return;
    }
    const items = buildItems();
    if (items.length === 0) {
      toast({ title: "Missing drugs", description: "Add at least one drug with Medication filled.", variant: "destructive" });
      return;
    }
    const dischargeInstructions = buildDischargeInstructions();
    setIsSubmitting(true);
    try {
      const payload: any = {
        regimen_name: regimenName.trim(),
        original_protocol: regimenName.trim(),
        ...(isEditMode ? { regimen_code: regimenCode.trim() } : {}),
        cancer_type_id: cancerTypeId,
        subtype_id: subtypeId || null,
        treatment_intent: treatmentIntent || null,
        standard_cycles: standardCycles || null,
        cycle_interval_days: cycleIntervalDays || null,
        no_of_days: days.length,
        days: days.map((d) => ({ protocol_day_id: d.protocolDayId || undefined, day_number: d.dayNumber })),
        notes: notes || null,
        items,
        discharge_instructions: dischargeInstructions,
      };
      let res: any;
      if (isEditMode && protocolId) {
        const headerPayload: any = { ...payload };
        delete headerPayload.items;
        res = await chemotherapyApi.updateRegimenProtocol(protocolId, headerPayload);

        const keptIds = new Set<string>();
        for (const it of items as any[]) {
          const itemPayload: any = { ...it };
          const protocol_item_id: string | undefined = itemPayload.protocol_item_id;
          delete itemPayload.protocol_item_id;
          if (protocol_item_id) {
            keptIds.add(protocol_item_id);
            await chemotherapyApi.updateRegimenProtocolItem(protocolId, protocol_item_id, itemPayload);
          } else {
            await chemotherapyApi.addRegimenProtocolItem(protocolId, itemPayload);
          }
        }
        const removedIds = loadedItemIdsRef.current.filter((id) => !keptIds.has(id));
        for (const id of removedIds) {
          await chemotherapyApi.removeRegimenProtocolItem(protocolId, id);
        }
      } else {
        res = await chemotherapyApi.createRegimenProtocol(payload);
      }
      if ((res.data as any)?.success === false) throw new Error((res.data as any)?.message);
      toast({ title: isEditMode ? "Protocol updated" : "Protocol created", description: `${regimenName} has been ${isEditMode ? "updated" : "saved"} successfully.` });
      navigate("/protocol");
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || "Failed to save protocol.";
      toast({ title: isEditMode ? "Failed to update protocol" : "Failed to create protocol", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addPremed = () => setPremeds([...premeds, { id: "", medication: "", dose: "", unit: "", adminNotes: "", remarks: "" }]);
  const removePremed = (idx: number) => setPremeds(premeds.filter((_, i) => i !== idx));
  const addChemoPlan = () =>
    setChemoPlans([...chemoPlans, { id: "", medication: "", doseCalc: "", dose: "", unit: "", patientDose: "", patientUnit: "", adminNotes: "", toxicity: "", remarks: "" }]);
  const removeChemoPlan = (idx: number) => setChemoPlans(chemoPlans.filter((_, i) => i !== idx));
  const addSupportive = () => setSupportive([...supportive, { id: "", medication: "", adminNotes: "", remarks: "" }]);
  const removeSupportive = (idx: number) => setSupportive(supportive.filter((_, i) => i !== idx));
  const addDilution = () => setDilution([...dilution, { dilutionId: "", id: "", medication: "", form: "", dose: "", unit: "", volume: "", volumeUnit: "", diluent: "" }]);
  const removeDilution = (idx: number) => setDilution(dilution.filter((_, i) => i !== idx));
  const addPost = () => 
    setPost([...post, { id: "", form: "", medication: "", dose: "", unit: "", frequency: "", instructions: "", duration: "", remarks: "" }]);
  const removePost = (idx: number) => setPost(post.filter((_, i) => i !== idx));

  const selectedCancerTypeName = cancerTypes.find((c) => c.cancer_type_id === cancerTypeId)?.cancer_type || "—";
  const pageTitle = isViewMode ? "View Protocol" : isEditMode ? "Edit Protocol" : "Create Protocol";
  const pageSubtitle = isViewMode
    ? "View chemotherapy regimen details (read-only)."
    : isEditMode
      ? "Update the existing regimen. Changes will be saved to the same protocol."
      : "Define a new chemotherapy regimen template. All drugs below will be saved as protocol items.";
  const saveLabel = isViewMode ? "Back to Protocols" : isEditMode ? "Update protocol" : "Save protocol";

  if (loadingProtocol) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#12335c]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa] py-7 px-10 w-full">
      <div className="max-w-full mx-auto w-full">
        {/* Top Header */}
        <div className="flex justify-between items-start mb-6 w-full">
          <div className="flex gap-4 items-start">
            <button
              onClick={handleBack}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white border border-transparent hover:border-[#e3e8ee] text-[#5b6b7c] hover:text-[#12335c] transition-colors mt-1"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[#1b2530] m-0">{pageTitle}</h1>
              <p className="text-[#5b6b7c] text-sm mt-1">{pageSubtitle}</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="bg-[#12335c] text-white border-none rounded-xl px-6 py-3 text-sm font-semibold flex items-center gap-2 shadow-sm hover:bg-[#0e2848] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
              </>
            ) : isViewMode ? (
              <>
                <Eye className="h-4 w-4" /> {saveLabel}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> {saveLabel}
              </>
            )}
          </button>
        </div>

        {/* Info Bar - dynamic */}
        <div className="bg-white border border-[#e3e8ee] rounded-xl px-7 py-4 flex justify-between flex-wrap gap-4 mb-5 w-full">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#eef2f6] flex items-center justify-center text-[#12335c] flex-shrink-0">
              <Pill className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#1b2530] leading-tight truncate max-w-[180px]">{regimenName || "New Protocol"}</div>
              <div className="text-xs text-[#8a97a6] mt-0.5">Regimen: {regimenCode || "—"}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#eef2f6] flex items-center justify-center text-[#12335c] flex-shrink-0">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#1b2530] leading-tight">{selectedCancerTypeName}</div>
              <div className="text-xs text-[#8a97a6] mt-0.5">Cancer Type</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#eef2f6] flex items-center justify-center text-[#12335c] flex-shrink-0">
              <Syringe className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#1b2530] leading-tight">
                {standardCycles} cycle{standardCycles !== 1 ? "s" : ""} × {cycleIntervalDays} Days
              </div>
              <div className="text-xs text-[#8a97a6] mt-0.5">Regimen Schedule</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#eef2f6] flex items-center justify-center text-[#12335c] flex-shrink-0">
              <FlaskConical className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#1b2530] leading-tight">{treatmentIntent || "—"}</div>
              <div className="text-xs text-[#8a97a6] mt-0.5">Intent</div>
            </div>
          </div>
        </div>

        <div className="w-full">
          <div className="flex gap-5 items-start w-full mb-5">
            <div className="flex-1 min-w-0">
              {/* Top form card */}
            <div className="bg-white border border-[#e3e8ee] rounded-xl mb-5 overflow-hidden w-full">
              <div className="p-6 w-full">
                <div className="border-b border-[#e3e8ee] pb-4 mb-5 w-full">
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelCls + " mb-0"}>Protocol Days</label>
                    {!disabled && <span className="text-[11px] text-[#8a97a6]">{days.length} day(s) — Day 1 date drives subsequent days</span>}
                  </div>
                  <div className="flex items-stretch gap-3 flex-wrap">
                    {days.map((d) => {
                      const isActive = d.dayNumber === activeDay;
                      const hasDate = d.date && isValid(parseISO(d.date));
                      return (
                        <div key={d.dayNumber} className="relative group flex flex-col">
                          {days.length > 1 && !disabled && (
                            <button
                              type="button"
                              onClick={() => handleRemoveDay(d.dayNumber)}
                              title={`Remove Day ${d.dayNumber}`}
                              aria-label={`Remove Day ${d.dayNumber}`}
                              className="absolute -top-2 -right-2 z-10 w-5 h-5 rounded-full bg-white border border-[#e3e8ee] shadow-sm flex items-center justify-center text-[#c0374a] text-[13px] leading-none opacity-0 group-hover:opacity-100 hover:bg-[#c0374a] hover:border-[#c0374a] hover:text-white hover:scale-110 transition-all duration-150"
                            >
                              ×
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setActiveDay(d.dayNumber)}
                            className={`w-[118px] flex flex-col items-center px-3 pt-2.5 pb-2 rounded-xl border transition-all duration-200 ${isActive ? "border-[#12335c] bg-gradient-to-b from-[#1c4a80] to-[#12335c] shadow-md shadow-[#12335c]/25" : "border-[#e3e8ee] bg-white hover:border-[#9db4cc] hover:shadow-sm hover:-translate-y-0.5"}`}
                          >
                            <span className={`text-[9px] font-bold uppercase tracking-[0.18em] leading-none ${isActive ? "text-blue-100/80" : "text-[#8a97a6]"}`}>
                              Day
                            </span>
                            <span className={`mt-1 text-[20px] font-extrabold leading-none ${isActive ? "text-white" : "text-[#1b2530]"}`}>
                              {d.dayNumber}
                            </span>
                            <span className={`mt-1.5 text-[10px] font-semibold leading-none ${hasDate ? (isActive ? "text-blue-100" : "text-[#5b6b7c]") : "text-[#b6c0cb] italic font-normal"}`}>
                              {hasDate ? format(parseISO(d.date), "dd MMM yyyy") : "no date"}
                            </span>
                          </button>
                          <input
                            type="date"
                            value={d.date}
                            onChange={(e) => handleDayDateChange(d.dayNumber, e.target.value)}
                            disabled={disabled}
                            title={`Day ${d.dayNumber} date`}
                            className={`w-[118px] h-7 mt-1.5 px-1.5 text-[11px] rounded-lg border text-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#12335c]/15 focus:border-[#12335c] ${isActive ? "border-[#12335c]/50 bg-[#f2f6fb] text-[#12335c] font-semibold" : "border-[#e3e8ee] bg-white text-[#5b6b7c] hover:border-[#9db4cc]"} disabled:bg-gray-50 disabled:text-gray-400`}
                          />
                        </div>
                      );
                    })}
                    {!disabled && (
                      <button
                        type="button"
                        onClick={handleAddDay}
                        className="w-[118px] rounded-xl border border-dashed border-[#9db4cc] text-[#12335c] bg-[#f8fafc] hover:bg-[#eef2f6] hover:border-[#12335c] transition-all duration-200 flex flex-col items-center justify-center gap-1"
                      >
                        <Calendar className="w-4 h-4" />
                        <span className="text-xs font-bold">Add Day</span>
                        <span className="text-[10px] text-[#8a97a6] leading-none">auto-fills date</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-[#8a97a6] mt-2">Day 1 empty → new days start empty. If Day 1 has a date, Add Day auto-fills as Day 1 + (n-1) days (tomorrow, etc.). Edit any day’s calendar to override.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full">
                  <div className="lg:col-span-2">
                    <label className={labelCls}>
                      Protocol Title (Regimen Name / Original Protocol) <Req />
                    </label>
                    <input
                      type="text"
                      value={regimenName}
                      onChange={(e) => setRegimenName(e.target.value)}
                      className={inputCls}
                      placeholder="e.g. Carboplatin AUC 5 - Original Protocol"
                      disabled={disabled}
                    />
                    <p className="text-[11px] text-[#8a97a6] mt-1">DB: regimen_name / original_protocol</p>
                  </div>
                  {(isEditMode || isViewMode) && (
                    <div>
                      <label className={labelCls}>
                        Regime Name (Regimen Code)
                      </label>
                      <input
                        type="text"
                        value={regimenCode}
                        onChange={(e) => setRegimenCode(e.target.value)}
                        className={inputCls}
                        placeholder="e.g. CARBO-AUC5"
                        disabled={disabled || isEditMode}
                      />
                      <p className="text-[11px] text-[#8a97a6] mt-1">DB: regimen_code / auto = protocol_id</p>
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>
                      Cancer Type <Req />
                    </label>
                    <FormDropdown
                      options={cancerTypes.map((c) => ({ label: c.cancer_type, value: c.cancer_type_id }))}
                      value={cancerTypeId}
                      onValueChange={setCancerTypeId}
                      placeholder={loadingCancerTypes ? "Loading..." : "Select cancer type"}
                      disabled={disabled || loadingCancerTypes}
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Cancer Subtype</label>
                    <FormDropdown
                      options={subtypes.map((s) => ({ label: s.subtype_name, value: s.subtype_id }))}
                      value={subtypeId}
                      onValueChange={setSubtypeId}
                      placeholder={!cancerTypeId ? "Select cancer type first" : subtypes.length ? "Select subtype" : "No subtypes"}
                      disabled={disabled || !cancerTypeId || subtypes.length === 0}
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Treatment Intent</label>
                    <FormDropdown
                      options={TREATMENT_INTENT_OPTIONS}
                      value={treatmentIntent}
                      onValueChange={setTreatmentIntent}
                      placeholder="Select intent"
                      disabled={disabled}
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Standard Cycles</label>
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden h-10">
                      <button
                        type="button"
                        onClick={() => !disabled && setStandardCycles(Math.max(1, standardCycles - 1))}
                        className="bg-[#fafbfc] w-10 h-full text-base text-[#5b6b7c] hover:bg-[#eef2f6] transition-colors disabled:opacity-50"
                        disabled={disabled}
                      >
                        −
                      </button>
                      <div className="flex-1 text-center text-sm font-semibold">{standardCycles}</div>
                      <button
                        type="button"
                        onClick={() => !disabled && setStandardCycles(standardCycles + 1)}
                        className="bg-[#fafbfc] w-10 h-full text-base text-[#5b6b7c] hover:bg-[#eef2f6] transition-colors disabled:opacity-50"
                        disabled={disabled}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Cycle Interval (days)</label>
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden h-10">
                      <button
                        type="button"
                        onClick={() => !disabled && setCycleIntervalDays(Math.max(1, cycleIntervalDays - 1))}
                        className="bg-[#fafbfc] w-10 h-full text-base text-[#5b6b7c] hover:bg-[#eef2f6] transition-colors disabled:opacity-50"
                        disabled={disabled}
                      >
                        −
                      </button>
                      <div className="flex-1 text-center text-sm font-semibold">{cycleIntervalDays}</div>
                      <button
                        type="button"
                        onClick={() => !disabled && setCycleIntervalDays(cycleIntervalDays + 1)}
                        className="bg-[#fafbfc] w-10 h-full text-base text-[#5b6b7c] hover:bg-[#eef2f6] transition-colors disabled:opacity-50"
                        disabled={disabled}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Schedule Date (Day 1) {days[0]?.date && isValid(parseISO(days[0].date)) ? <span className="text-[#8a97a6] font-normal">— {format(parseISO(days[0].date), "dd-MM-yyyy")}</span> : null}</label>
                    <input type="date" value={days[0]?.date || scheduleDate} onChange={(e) => handleDayDateChange(1, e.target.value)} className={inputCls} disabled={disabled} />
                  </div>
                  <div className="lg:col-span-3">
                    <label className={labelCls}>Notes / Guideline Source</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className={inputCls}
                      placeholder="e.g. NCCN 2024, optional"
                      disabled={disabled}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="w-72 flex-shrink-0">
            <div className="bg-white border border-[#e3e8ee] rounded-xl overflow-hidden sticky top-5">
              <div className="bg-[#f2f5f9] px-6 py-5 flex justify-between items-start">
                <div className="text-base font-extrabold leading-tight text-[#1b2530]">
                  PROTOCOL
                  <br />
                  SUMMARY
                </div>
                <ClipboardList className="w-5 h-5 text-[#12335c]" />
              </div>
              <div className="px-6 py-2 pb-6">
                <div className="py-4 border-b border-[#e3e8ee]">
                  <div className="text-[10.5px] font-bold tracking-wide text-[#8a97a6] mb-1.5">REGIMEN CODE</div>
                  <div className="text-sm font-bold text-[#1b2530] truncate">{regimenCode || "—"}</div>
                </div>
                <div className="py-4 border-b border-[#e3e8ee]">
                  <div className="text-[10.5px] font-bold tracking-wide text-[#8a97a6] mb-1.5">PROTOCOL NAME</div>
                  <div className="text-sm font-bold text-[#1b2530] leading-tight">{regimenName || "—"}</div>
                </div>
                <div className="py-4 border-b border-[#e3e8ee]">
                  <div className="text-[10.5px] font-bold tracking-wide text-[#8a97a6] mb-1.5">CANCER TYPE</div>
                  <div className="text-sm font-bold text-[#1b2530]">{selectedCancerTypeName}</div>
                </div>
                <div className="py-4 border-b border-[#e3e8ee]">
                  <div className="text-[10.5px] font-bold tracking-wide text-[#8a97a6] mb-1.5">CYCLE SCHEDULE</div>
                  <div className="text-sm font-bold text-[#1b2530]">
                    {standardCycles} cycle{standardCycles !== 1 ? "s" : ""} × {cycleIntervalDays} days
                  </div>
                </div>
                <div className="py-4 border-b border-[#e3e8ee]">
                  <div className="text-[10.5px] font-bold tracking-wide text-[#8a97a6] mb-1.5">SCHEDULE DATE</div>
                  <div className="text-sm font-bold text-[#1b2530]">{(days[0]?.date || scheduleDate) ? format(parseISO(days[0]?.date || scheduleDate), "dd-MM-yyyy") : "—"}</div>
                </div>
                <div className="py-4">
                  <div className="text-[10.5px] font-bold tracking-wide text-[#8a97a6] mb-1.5">TOTAL DRUGS</div>
                  <div className="text-sm font-bold text-[#1b2530]">
                    {[...premeds, ...chemoPlans, ...supportive, ...dilution, ...post, ...days.flatMap((d) => (d.dayNumber === activeDay ? [] : [...(premedsByDay[d.dayNumber] ?? []), ...(chemoPlansByDay[d.dayNumber] ?? []), ...(supportiveByDay[d.dayNumber] ?? []), ...(dilutionByDay[d.dayNumber] ?? [])]))].filter((r: any) => (r.medication || r.item)?.trim()).length} item(s)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pre-medications */}
            <div className="bg-white border border-[#e3e8ee] rounded-xl mb-5 overflow-hidden w-full">
              <div
                className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-[#f8f9fa] transition-colors"
                onClick={() => toggleSection("premeds")}
              >
                <div className="flex items-center gap-2.5 text-sm font-bold tracking-wide text-[#1b2530]">
                  <Pill className="w-4 h-4 text-[#12335c]" /> PRE-MEDICATIONS
                </div>
                {sections.premeds ? <ChevronUp className="w-4 h-4 text-[#8a97a6]" /> : <ChevronDown className="w-4 h-4 text-[#8a97a6]" />}
              </div>
              {sections.premeds && (
                <>
                  <ProtocolGridTable
                    columns={["#", "MEDICATION / DRUG *", "DOSE", "UNIT", "ADMIN NOTES", "REMARKS", "ACTIONS"]}
                    template="60px 2fr 1fr 100px 1.5fr 1.5fr 40px"
                    boxClassName="border border-[#e3e8ee] rounded-lg bg-white"
                    addLabel="+ Add Row"
                    onAdd={addPremed}
                    disabled={disabled}
                    rows={premeds.map((row, idx) => [
                      idx + 1,
                      <FormDropdown
                        key="m"
                        options={premedMeds.map((m) => ({ label: m.medicine_name, value: m.medicine_id }))}
                        value={row.medication}
                        onValueChange={(v) => {
                          const n = [...premeds];
                          n[idx].medication = v;
                          setPremeds(n);
                        }}
                        placeholder={loadingPremedMeds ? "Loading medicines..." : "Select medicine"}
                        emptyMessage="No medicines found"
                        loading={loadingPremedMeds}
                        disabled={disabled}
                        className="h-8"
                      />,
                      <input
                        key="d"
                        type="text"
                        value={row.dose}
                        onChange={(e) => {
                          const n = [...premeds];
                          n[idx].dose = e.target.value;
                          setPremeds(n);
                        }}
                        className={ptInput}
                        placeholder="Enter dose"
                        disabled={disabled}
                      />,
                      <FormDropdown
                        key="u"
                        options={Array.from(new Set([...fieldOptions.dosage_units, row.unit].filter(Boolean)))}
                        value={row.unit}
                        onValueChange={(v) => {
                          const n = [...premeds];
                          n[idx].unit = v;
                          setPremeds(n);
                        }}
                        placeholder="Select unit"
                        emptyMessage="No units found"
                        disabled={disabled}
                        className="h-8"
                      />,
                      <input
                        key="a"
                        type="text"
                        value={row.adminNotes}
                        onChange={(e) => {
                          const n = [...premeds];
                          n[idx].adminNotes = e.target.value;
                          setPremeds(n);
                        }}
                        className={ptInput}
                        placeholder="Enter notes"
                        disabled={disabled}
                      />,
                      <input
                        key="r"
                        type="text"
                        value={row.remarks}
                        onChange={(e) => {
                          const n = [...premeds];
                          n[idx].remarks = e.target.value;
                          setPremeds(n);
                        }}
                        className={ptInput}
                        placeholder="Enter remarks"
                        disabled={disabled}
                      />,
                      <button
                        key="del"
                        onClick={() => removePremed(idx)}
                        disabled={disabled}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-[#6b7280] hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>,
                    ])}
                  />
                </>
              )}
            </div>

            {/* Chemotherapy plan */}
            <div className="bg-white border border-[#e3e8ee] rounded-xl mb-5 overflow-hidden w-full">
              <div
                className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-[#f8f9fa] transition-colors"
                onClick={() => toggleSection("chemo")}
              >
                <div className="flex items-center gap-2.5 text-sm font-bold tracking-wide text-[#1b2530]">
                  <Syringe className="w-4 h-4 text-[#12335c]" /> CHEMOTHERAPY PLAN
                </div>
                {sections.chemo ? <ChevronUp className="w-4 h-4 text-[#8a97a6]" /> : <ChevronDown className="w-4 h-4 text-[#8a97a6]" />}
              </div>
              {sections.chemo && (
                <>
                  <ProtocolGridTable
                    columns={["#", "MEDICATION *", "DOSE CALC", "DOSE", "UNIT", "PATIENT DOSE", "UNIT", "ADMIN NOTES", "TOXICITY", "REMARKS", "ACTIONS"]}
                    template="60px 2fr 1.2fr 1.2fr 1fr 1.2fr 1fr 1.6fr 1.6fr 1.6fr 40px"
                    addLabel="+ Add Row"
                    onAdd={addChemoPlan}
                    disabled={disabled}
                    rows={chemoPlans.map((row, idx) => [
                      idx + 1,
                      <FormDropdown
                        key="m"
                        options={chemoMeds.map((m) => ({ label: m.medicine_name, value: m.medicine_id }))}
                        value={row.medication}
                        onValueChange={(v) => {
                          const n = [...chemoPlans];
                          n[idx].medication = v;
                          setChemoPlans(n);
                        }}
                        placeholder={loadingChemoMeds ? "Loading medicines..." : "Select medicine"}
                        emptyMessage="No medicines found"
                        loading={loadingChemoMeds}
                        disabled={disabled}
                        className="h-8"
                      />,
                      <FormDropdown
                        key="dc"
                        options={DOSE_CALC_OPTIONS}
                        value={row.doseCalc}
                        onValueChange={(v) => {
                          const n = [...chemoPlans];
                          n[idx].doseCalc = v;
                          setChemoPlans(n);
                        }}
                        placeholder="Select dose calc"
                        disabled={disabled}
                        className="h-8"
                      />,
                      <input
                        key="d"
                        type="text"
                        value={row.dose}
                        onChange={(e) => {
                          const n = [...chemoPlans];
                          n[idx].dose = e.target.value;
                          setChemoPlans(n);
                        }}
                        className={ptInput}
                        placeholder="80 mg/m²"
                        disabled={disabled}
                      />,
                      <FormDropdown
                        key="u"
                        options={Array.from(new Set([...fieldOptions.dosage_units, row.unit].filter(Boolean)))}
                        value={row.unit}
                        onValueChange={(v) => {
                          const n = [...chemoPlans];
                          n[idx].unit = v;
                          setChemoPlans(n);
                        }}
                        placeholder="Select unit"
                        emptyMessage="No units found"
                        disabled={disabled}
                        className="h-8"
                      />,
                      <input
                        key="pd"
                        type="text"
                        value={row.patientDose}
                        onChange={(e) => {
                          const n = [...chemoPlans];
                          n[idx].patientDose = e.target.value;
                          setChemoPlans(n);
                        }}
                        className={ptInput}
                        placeholder="Patient dose"
                        disabled={disabled}
                      />,
                      <input
                        key="pu"
                        type="text"
                        value={row.patientUnit}
                        onChange={(e) => {
                          const n = [...chemoPlans];
                          n[idx].patientUnit = e.target.value;
                          setChemoPlans(n);
                        }}
                        className={ptInput}
                        placeholder="mg"
                        disabled={disabled}
                      />,
                      <input
                        key="an"
                        type="text"
                        value={row.adminNotes}
                        onChange={(e) => {
                          const n = [...chemoPlans];
                          n[idx].adminNotes = e.target.value;
                          setChemoPlans(n);
                        }}
                        className={ptInput}
                        placeholder="Notes"
                        disabled={disabled}
                      />,
                      <input
                        key="t"
                        type="text"
                        value={row.toxicity}
                        onChange={(e) => {
                          const n = [...chemoPlans];
                          n[idx].toxicity = e.target.value;
                          setChemoPlans(n);
                        }}
                        className={ptInput}
                        placeholder="Toxicity"
                        disabled={disabled}
                      />,
                      <input
                        key="rm"
                        type="text"
                        value={row.remarks}
                        onChange={(e) => {
                          const n = [...chemoPlans];
                          n[idx].remarks = e.target.value;
                          setChemoPlans(n);
                        }}
                        className={ptInput}
                        placeholder="Remarks"
                        disabled={disabled}
                      />,
                      <button
                        key="del"
                        onClick={() => removeChemoPlan(idx)}
                        disabled={disabled}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-[#6b7280] hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>,
                    ])}
                  />
                </>
              )}
            </div>

            {/* Supportive care */}
            <div className="bg-white border border-[#e3e8ee] rounded-xl mb-5 overflow-hidden w-full">
              <div
                className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-[#f8f9fa]"
                onClick={() => toggleSection("supportive")}
              >
                <div className="flex items-center gap-2.5 text-sm font-bold tracking-wide text-[#1b2530]">
                  <ShieldPlus className="w-4 h-4 text-[#2f8f5b]" /> SUPPORTIVE CARE
                </div>
                {sections.supportive ? <ChevronUp className="w-4 h-4 text-[#8a97a6]" /> : <ChevronDown className="w-4 h-4 text-[#8a97a6]" />}
              </div>
              {sections.supportive && (
                <>
                  <ProtocolGridTable
                    columns={["#", "SUPPORTIVE MEDICINE *", "ADMIN NOTES", "REMARKS", "ACTIONS"]}
                    template="60px 2fr 1.5fr 1.5fr 40px"
                    addLabel="+ Add Row"
                    onAdd={addSupportive}
                    disabled={disabled}
                    rows={supportive.map((row, idx) => [
                      idx + 1,
                      <FormDropdown
                        key="m"
                        options={supportiveMeds.map((m) => ({ label: m.medicine_name, value: m.medicine_id }))}
                        value={row.medication}
                        onValueChange={(v) => {
                          const n = [...supportive];
                          n[idx].medication = v;
                          setSupportive(n);
                        }}
                        placeholder={loadingSupportiveMeds ? "Loading medicines..." : "Select medicine"}
                        emptyMessage="No supportive medicines found"
                        loading={loadingSupportiveMeds}
                        disabled={disabled}
                        className="h-8"
                      />,
                      <input
                        key="an"
                        type="text"
                        value={row.adminNotes}
                        onChange={(e) => {
                          const n = [...supportive];
                          n[idx].adminNotes = e.target.value;
                          setSupportive(n);
                        }}
                        className={ptInput}
                        placeholder="Enter notes"
                        disabled={disabled}
                      />,
                      <input
                        key="r"
                        type="text"
                        value={row.remarks}
                        onChange={(e) => {
                          const n = [...supportive];
                          n[idx].remarks = e.target.value;
                          setSupportive(n);
                        }}
                        className={ptInput}
                        placeholder="Enter remarks"
                        disabled={disabled}
                      />,
                      <button
                        key="d"
                        onClick={() => removeSupportive(idx)}
                        disabled={disabled}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-[#6b7280] hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>,
                    ])}
                  />
                </>
              )}
            </div>

            {/* Dilution details */}
            <div className="bg-white border border-[#e3e8ee] rounded-xl mb-5 overflow-hidden w-full">
              <div
                className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-[#f8f9fa]"
                onClick={() => toggleSection("dilution")}
              >
                <div className="flex items-center gap-2.5 text-sm font-bold tracking-wide text-[#1b2530]">
                  <FlaskConical className="w-4 h-4 text-[#c9822f]" /> DILUTION DETAILS
                </div>
                {sections.dilution ? <ChevronUp className="w-4 h-4 text-[#8a97a6]" /> : <ChevronDown className="w-4 h-4 text-[#8a97a6]" />}
              </div>
              {sections.dilution && (
                <>
                  <ProtocolGridTable
                    columns={["#", "MEDICATION", "FORM", "DOSE", "DOSE UNIT", "DILUTION VOLUME", "VOLUME UNIT", "DILUENT", "ACTIONS"]}
                    template="60px 2fr 1.1fr 0.9fr 1.2fr 1fr 1.2fr 1.6fr 40px"
                    addLabel="+ Add Row"
                    onAdd={addDilution}
                    disabled={disabled}
                    rows={dilution.map((row, idx) => [
                      idx + 1,
                      <FormDropdown
                        key="m"
                        options={dilutionMeds.map((m) => ({ label: m.medicine_name, value: m.medicine_id }))}
                        value={row.medication}
                        onValueChange={(v) => {
                          const n = [...dilution];
                          n[idx].medication = v;
                          setDilution(n);
                        }}
                        placeholder={loadingDilutionMeds ? "Loading medicines..." : "Select medicine"}
                        emptyMessage="No dilution medicines found"
                        loading={loadingDilutionMeds}
                        disabled={disabled}
                        className="h-8"
                      />,
                      <FormDropdown
                        key="f"
                        options={fieldOptions.dilution_forms}
                        value={row.form}
                        onValueChange={(v) => {
                          const n = [...dilution];
                          n[idx].form = v;
                          setDilution(n);
                        }}
                        placeholder="Select form"
                        emptyMessage="No forms found"
                        disabled={disabled}
                        className="h-8"
                      />,
                      <input
                        key="d"
                        type="text"
                        value={row.dose}
                        onChange={(e) => {
                          const n = [...dilution];
                          n[idx].dose = e.target.value;
                          setDilution(n);
                        }}
                        className={ptInput}
                        placeholder="Dose"
                        disabled={disabled}
                      />,
                      <FormDropdown
                        key="du"
                        options={fieldOptions.dilution_dose_units}
                        value={row.unit}
                        onValueChange={(v) => {
                          const n = [...dilution];
                          n[idx].unit = v;
                          setDilution(n);
                        }}
                        placeholder="Select unit"
                        emptyMessage="No units found"
                        disabled={disabled}
                        className="h-8"
                      />,
                      <input
                        key="v"
                        type="text"
                        value={row.volume}
                        onChange={(e) => {
                          const n = [...dilution];
                          n[idx].volume = e.target.value;
                          setDilution(n);
                        }}
                        className={ptInput}
                        placeholder="100"
                        disabled={disabled}
                      />,
                      <FormDropdown
                        key="vu"
                        options={fieldOptions.dilution_volume_units}
                        value={row.volumeUnit}
                        onValueChange={(v) => {
                          const n = [...dilution];
                          n[idx].volumeUnit = v;
                          setDilution(n);
                        }}
                        placeholder="Select unit"
                        emptyMessage="No units found"
                        disabled={disabled}
                        className="h-8"
                      />,
                      <FormDropdown
                        key="dl"
                        options={fieldOptions.diluents}
                        value={row.diluent}
                        onValueChange={(v) => {
                          const n = [...dilution];
                          n[idx].diluent = v;
                          setDilution(n);
                        }}
                        placeholder="Select diluent"
                        emptyMessage="No diluents found"
                        disabled={disabled}
                        className="h-8"
                      />,
                      <button
                        key="x"
                        onClick={() => removeDilution(idx)}
                        disabled={disabled}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-[#6b7280] hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>,
                    ])}
                  />
                </>
              )}
            </div>

            {/* Post-treatment medications */}
            <div className="bg-white border border-[#e3e8ee] rounded-xl mb-5 overflow-hidden w-full">
              <div
                className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-[#f8f9fa]"
                onClick={() => toggleSection("post")}
              >
                <div className="flex items-center gap-2.5 text-sm font-bold tracking-wide text-[#c0374a]">
                  <ClipboardList className="w-4 h-4" /> POST-TREATMENT MEDICATIONS (ON DISCHARGE)
                </div>
                {sections.post ? <ChevronUp className="w-4 h-4 text-[#8a97a6]" /> : <ChevronDown className="w-4 h-4 text-[#8a97a6]" />}
              </div>
              {sections.post && (
                <>
                  <ProtocolGridTable
                    columns={["#", "FORM", "MEDICATION", "DOSE", "UNIT", "FREQUENCY", "INSTRUCTIONS", "DURATION", "REMARKS", "ACTIONS"]}
                    template="60px 1fr 2fr 1.2fr 1fr 1.2fr 1.5fr 1.2fr 1.5fr 40px"
                    addLabel="+ Add Row"
                    onAdd={addPost}
                    disabled={disabled}
                    addClassName="text-[#c0374a] hover:bg-[#f5f0f0]"
                    rows={post.map((row, idx) => [
                      idx + 1,
                      <input
                        key="f"
                        type="text"
                        value={row.form}
                        onChange={(e) => {
                          const n = [...post];
                          n[idx].form = e.target.value;
                          setPost(n);
                        }}
                        className={ptInput}
                        placeholder="Tab"
                        disabled={disabled}
                      />,
                      <FormDropdown
                        key="m"
                        options={premedMeds.map((m) => ({ label: m.medicine_name, value: m.medicine_id }))}
                        value={row.medication}
                        onValueChange={(v) => {
                          const n = [...post];
                          n[idx].medication = v;
                          setPost(n);
                        }}
                        placeholder={loadingPremedMeds ? "Loading medicines..." : "Select medicine"}
                        emptyMessage="No medicines found"
                        loading={loadingPremedMeds}
                        disabled={disabled}
                        className="h-8"
                      />,
                      <input
                        key="d"
                        type="text"
                        value={row.dose}
                        onChange={(e) => {
                          const n = [...post];
                          n[idx].dose = e.target.value;
                          setPost(n);
                        }}
                        className={ptInput}
                        placeholder="4"
                        disabled={disabled}
                      />,
                      <input
                        key="u"
                        type="text"
                        value={row.unit}
                        onChange={(e) => {
                          const n = [...post];
                          n[idx].unit = e.target.value;
                          setPost(n);
                        }}
                        className={ptInput}
                        placeholder="mg"
                        disabled={disabled}
                      />,
                      <input
                        key="fr"
                        type="text"
                        value={row.frequency}
                        onChange={(e) => {
                          const n = [...post];
                          n[idx].frequency = e.target.value;
                          setPost(n);
                        }}
                        className={ptInput}
                        placeholder="1-0-1"
                        disabled={disabled}
                      />,
                      <input
                        key="i"
                        type="text"
                        value={row.instructions}
                        onChange={(e) => {
                          const n = [...post];
                          n[idx].instructions = e.target.value;
                          setPost(n);
                        }}
                        className={ptInput}
                        placeholder="After Food"
                        disabled={disabled}
                      />,
                      <div key="du" className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={row.duration}
                          onChange={(e) => {
                            const n = [...post];
                            n[idx].duration = e.target.value;
                            setPost(n);
                          }}
                          className={ptInput + " w-16"}
                          placeholder="4"
                          disabled={disabled}
                        />
                        <span className="text-sm text-[#5b6b7c]">days</span>
                      </div>,
                      <input
                        key="r"
                        type="text"
                        value={row.remarks}
                        onChange={(e) => {
                          const n = [...post];
                          n[idx].remarks = e.target.value;
                          setPost(n);
                        }}
                        className={ptInput}
                        placeholder="Remarks"
                        disabled={disabled}
                      />,
                      <button
                        key="x"
                        onClick={() => removePost(idx)}
                        disabled={disabled}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-[#6b7280] hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>,
                    ])}
                  />
                </>
              )}
            </div>
          </div>
        </div>

      <ConfirmationDialog
        open={showLeaveConfirm}
        title="Leave without saving?"
        description="You have unsaved changes. Are you sure you want to leave? Your changes will be lost."
        type="warning"
        confirmText="Leave"
        cancelText="Stay"
        onConfirm={() => {
          setShowLeaveConfirm(false);
          navigate(-1);
        }}
        onCancel={() => setShowLeaveConfirm(false)}
      />
      </div>
  );
}
