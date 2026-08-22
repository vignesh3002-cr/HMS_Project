import { useEffect, useState } from "react";
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
import { chemotherapyApi } from "@/api/chemotherapy.api";
import { format, addDays, parseISO, isValid } from "date-fns";

// Shared styling tokens - matches PatientRegistrationForm / Addemployee conventions
const inputCls =
  "w-full h-10 px-4 bg-white border border-gray-200 rounded-xl text-[13.5px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-[3px] focus:ring-blue-500/15 focus:border-blue-500 transition-all duration-200 disabled:bg-gray-50 disabled:text-gray-400";
const labelCls = "block text-[12.5px] font-semibold text-gray-700 mb-1.5";
const Req = () => <span className="text-red-600 ml-0.5">*</span>;

interface Premed {
  medication: string;
  adminNotes: string;
  remarks: string;
}
interface ChemoPlan {
  medication: string;
  doseCalc: string;
  dose: string;
  route: string;
  frequency: string;
  adminNotes: string;
  toxicity: string;
  remarks: string;
}
interface SupportiveCare {
  item: string;
  instructions: string;
}
interface DilutionDetail {
  medication: string;
  volume: string;
  diluent: string;
}
interface PostTreatment {
  form: string;
  medication: string;
  strength: string;
  dose: string;
  unit: string;
  frequency: string;
  instructions: string;
  duration: string;
  remarks: string;
}

const TREATMENT_INTENT_OPTIONS = ["curative", "palliative", "adjuvant", "neoadjuvant", "maintenance"];

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
  const [days, setDays] = useState<Array<{ dayNumber: number; date: string }>>([{ dayNumber: 1, date: "" }]);
  const [activeDay, setActiveDay] = useState(1);

  const [cancerTypes, setCancerTypes] = useState<Array<{ cancer_type_id: string; cancer_type: string }>>([]);
  const [subtypes, setSubtypes] = useState<Array<{ subtype_id: string; subtype_name: string }>>([]);
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

  const [premeds, setPremeds] = useState<Premed[]>([
    { medication: "", adminNotes: "", remarks: "" },
  ]);
  const [chemoPlans, setChemoPlans] = useState<ChemoPlan[]>([
    { medication: "", doseCalc: "", dose: "", route: "IV", frequency: "", adminNotes: "", toxicity: "", remarks: "" },
  ]);
  const [supportive, setSupportive] = useState<SupportiveCare[]>([
    { item: "", instructions: "" },
  ]);
  const [dilution, setDilution] = useState<DilutionDetail[]>([
    { medication: "", volume: "", diluent: "0.9% NaCl" },
  ]);
  const [post, setPost] = useState<PostTreatment[]>([
    { form: "Tab", medication: "", strength: "", dose: "", unit: "mg", frequency: "", instructions: "", duration: "", remarks: "" },
  ]);

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
        const dayCount = p.no_of_days ?? p.chemotherapy_regimen_protocol_days?.length ?? 1;
        const baseDateStr = p.created_at ? format(new Date(p.created_at), "yyyy-MM-dd") : "";
        const loadedDays = Array.from({ length: Math.max(1, Math.min(dayCount, 30)) }, (_, i) => {
          let d = "";
          if (baseDateStr) {
            try {
              d = format(addDays(parseISO(baseDateStr), i), "yyyy-MM-dd");
            } catch {}
          }
          return { dayNumber: i + 1, date: d };
        });
        setDays(loadedDays);
        if (loadedDays[0]?.date) setScheduleDate(loadedDays[0].date);
        const items: any[] = p.chemotherapy_regimen_protocol_items ?? [];
        if (items.length) {
          const pre = items
            .filter((x: any) => x.drug_role === "PREMEDICATION")
            .map((x: any) => ({ medication: x.medicine_id ?? x.medicine_master?.medicine_name ?? "", adminNotes: x.remarks ?? "", remarks: "" }));
          const chemo = items
            .filter((x: any) => x.drug_role === "PRIMARY")
            .map((x: any) => ({
              medication: x.medicine_id ?? "",
              doseCalc: (x as any).dose_calculation_method ?? "",
              dose: (x.dosage as any) ?? "",
              route: x.administration_route ?? "IV",
              frequency: x.frequency ?? "",
              adminNotes: "",
              toxicity: "",
              remarks: x.remarks ?? "",
            }));
          const supp = items
            .filter((x: any) => x.drug_role === "SUPPORTIVE")
            .map((x: any) => ({ item: x.medicine_id ?? "", instructions: x.remarks ?? "" }));
          const postM = items
            .filter((x: any) => x.drug_role === "POSTMEDICATION")
            .map((x: any) => ({
              form: "Tab",
              medication: x.medicine_id ?? "",
              strength: (x.dosage as any) ?? "",
              dose: (x.dosage as any) ?? "",
              unit: x.dosage_unit ?? "mg",
              frequency: x.frequency ?? "",
              instructions: x.remarks ?? "",
              duration: "",
              remarks: "",
            }));
          if (pre.length) setPremeds(pre);
          if (chemo.length) setChemoPlans(chemo);
          if (supp.length) setSupportive(supp);
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
      premeds.some((r) => r.medication.trim() !== "") ||
      chemoPlans.some((r) => r.medication.trim() !== "") ||
      supportive.some((r) => r.item.trim() !== "") ||
      dilution.some((r) => r.medication.trim() !== "") ||
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
    if (activeDay === dayNumber) setActiveDay(filtered[0].dayNumber);
  };

  const buildItems = () => {
    const items: Array<{
      medicine_id: string;
      drug_role: string;
      drug_sequence: number;
      dosage?: string | null;
      dosage_unit?: string | null;
      administration_route?: string | null;
      frequency?: string | null;
      remarks?: string | null;
      administration_day?: number | null;
    }> = [];
    let seq = 1;
    for (const row of premeds) {
      if (!row.medication.trim()) continue;
      items.push({ medicine_id: row.medication.trim(), drug_role: "PREMEDICATION", drug_sequence: seq++, remarks: [row.adminNotes, row.remarks].filter(Boolean).join(" | ") || null, administration_day: activeDay });
    }
    for (const row of chemoPlans) {
      if (!row.medication.trim()) continue;
      items.push({ medicine_id: row.medication.trim(), drug_role: "PRIMARY", drug_sequence: seq++, dosage: row.dose || null, dosage_unit: "mg/m²", administration_route: row.route || null, frequency: row.frequency || null, remarks: [row.adminNotes, row.toxicity, row.remarks, row.doseCalc].filter(Boolean).join(" | ") || null, administration_day: activeDay });
    }
    for (const row of supportive) {
      if (!row.item.trim()) continue;
      items.push({ medicine_id: row.item.trim(), drug_role: "SUPPORTIVE", drug_sequence: seq++, remarks: row.instructions || null, administration_day: activeDay });
    }
    for (const row of dilution) {
      if (!row.medication.trim()) continue;
      items.push({ medicine_id: row.medication.trim(), drug_role: "SUPPORTIVE", drug_sequence: seq++, dosage: row.volume || null, dosage_unit: "ml", remarks: row.diluent ? `Diluent: ${row.diluent}` : null, administration_day: activeDay });
    }
    for (const row of post) {
      if (!row.medication.trim()) continue;
      items.push({ medicine_id: row.medication.trim(), drug_role: "POSTMEDICATION", drug_sequence: seq++, dosage: row.dose || row.strength || null, dosage_unit: row.unit || null, frequency: row.frequency || null, remarks: [row.instructions, row.duration ? `${row.duration} days` : "", row.remarks, row.form].filter(Boolean).join(" | ") || null, administration_day: activeDay });
    }
    return items;
  };

  const handleSave = async () => {
    if (isViewMode) {
      navigate("/protocol");
      return;
    }
    if (!regimenCode.trim()) {
      toast({ title: "Missing required field", description: "Regime Name (Regimen Code) is required.", variant: "destructive" });
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
    setIsSubmitting(true);
    try {
      const payload: any = {
        regimen_code: regimenCode.trim(),
        regimen_name: regimenName.trim(),
        original_protocol: regimenName.trim(),
        cancer_type_id: cancerTypeId,
        subtype_id: subtypeId || null,
        treatment_intent: treatmentIntent || null,
        standard_cycles: standardCycles || null,
        cycle_interval_days: cycleIntervalDays || null,
        no_of_days: days.length,
        notes: notes || null,
        items,
      };
      let res: any;
      if (isEditMode && protocolId) res = await chemotherapyApi.updateRegimenProtocol(protocolId, payload);
      else res = await chemotherapyApi.createRegimenProtocol(payload);
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

  const addPremed = () => setPremeds([...premeds, { medication: "", adminNotes: "", remarks: "" }]);
  const removePremed = (idx: number) => setPremeds(premeds.filter((_, i) => i !== idx));
  const addChemoPlan = () =>
    setChemoPlans([...chemoPlans, { medication: "", doseCalc: "", dose: "", route: "IV", frequency: "", adminNotes: "", toxicity: "", remarks: "" }]);
  const removeChemoPlan = (idx: number) => setChemoPlans(chemoPlans.filter((_, i) => i !== idx));
  const addSupportive = () => setSupportive([...supportive, { item: "", instructions: "" }]);
  const removeSupportive = (idx: number) => setSupportive(supportive.filter((_, i) => i !== idx));
  const addDilution = () => setDilution([...dilution, { medication: "", volume: "", diluent: "0.9% NaCl" }]);
  const removeDilution = (idx: number) => setDilution(dilution.filter((_, i) => i !== idx));
  const addPost = () =>
    setPost([...post, { form: "Tab", medication: "", strength: "", dose: "", unit: "mg", frequency: "", instructions: "", duration: "", remarks: "" }]);
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

        <div className="flex gap-5 items-start w-full">
          <div className="flex-1 min-w-0 w-full">
            {/* Top form card */}
            <div className="bg-white border border-[#e3e8ee] rounded-xl mb-5 overflow-hidden w-full">
              <div className="p-6 w-full">
                <div className="border-b border-[#e3e8ee] pb-4 mb-5 w-full">
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelCls + " mb-0"}>Protocol Days</label>
                    {!disabled && <span className="text-[11px] text-[#8a97a6]">{days.length} day(s) — Day 1 date drives subsequent days</span>}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {days.map((d) => (
                      <div key={d.dayNumber} className="relative flex flex-col items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setActiveDay(d.dayNumber)}
                          className={`px-5 py-3 rounded-lg font-bold text-sm text-center leading-tight border transition-colors ${d.dayNumber === activeDay ? "border-[#12335c] bg-[#12335c] text-white" : "border-[#e3e8ee] text-[#5b6b7c] bg-white hover:border-[#12335c]"}`}
                        >
                          Day<br />
                          {d.dayNumber}
                        </button>
                        <div className="flex items-center gap-1">
                          <input
                            type="date"
                            value={d.date}
                            onChange={(e) => handleDayDateChange(d.dayNumber, e.target.value)}
                            className="w-[132px] h-7 px-2 text-[11px] border border-[#e3e8ee] rounded-md focus:outline-none focus:border-[#12335c] disabled:bg-gray-50"
                            disabled={disabled}
                            title={`Day ${d.dayNumber} date`}
                          />
                          {days.length > 1 && !disabled && (
                            <button type="button" onClick={() => handleRemoveDay(d.dayNumber)} className="w-7 h-7 rounded-md border border-[#e3e8ee] bg-white text-[#c0374a] hover:bg-red-50 text-xs">
                              ×
                            </button>
                          )}
                        </div>
                        {d.date && isValid(parseISO(d.date)) && <span className="text-[10px] text-[#8a97a6]">{format(parseISO(d.date), "dd MMM")}</span>}
                      </div>
                    ))}
                    {!disabled && (
                      <button
                        type="button"
                        onClick={handleAddDay}
                        className="px-4 py-3 rounded-lg font-bold text-sm border border-dashed border-[#12335c] text-[#12335c] bg-[#f8fafc] hover:bg-[#eef2f6] transition-colors flex items-center gap-1.5"
                      >
                        <Calendar className="w-4 h-4" /> + Add Day
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
                  <div>
                    <label className={labelCls}>
                      Regime Name (Regimen Code) <Req />
                    </label>
                    <input
                      type="text"
                      value={regimenCode}
                      onChange={(e) => setRegimenCode(e.target.value)}
                      className={inputCls}
                      placeholder="e.g. CARBO-AUC5"
                      disabled={disabled || isEditMode}
                    />
                    <p className="text-[11px] text-[#8a97a6] mt-1">DB: regimen_code</p>
                  </div>
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
                  <div className="overflow-x-auto w-full">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-[#f7f9fb]">
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">#</th>
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">
                            MEDICATION / DRUG <Req />
                          </th>
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">ADMINISTRATION NOTES</th>
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">REMARKS</th>
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {premeds.map((row, idx) => (
                          <tr key={idx}>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm text-[#8a97a6] w-[30px]">{idx + 1}</td>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm">
                              <input
                                type="text"
                                value={row.medication}
                                onChange={(e) => {
                                  const n = [...premeds];
                                  n[idx].medication = e.target.value;
                                  setPremeds(n);
                                }}
                                className="w-full border border-[#e3e8ee] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#12335c] transition-colors"
                                placeholder="Medicine ID / name"
                              />
                            </td>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm">
                              <input
                                type="text"
                                value={row.adminNotes}
                                onChange={(e) => {
                                  const n = [...premeds];
                                  n[idx].adminNotes = e.target.value;
                                  setPremeds(n);
                                }}
                                className="w-full border border-[#e3e8ee] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#12335c] transition-colors"
                                placeholder="Enter notes"
                               disabled={disabled} />
                            </td>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm">
                              <input
                                type="text"
                                value={row.remarks}
                                onChange={(e) => {
                                  const n = [...premeds];
                                  n[idx].remarks = e.target.value;
                                  setPremeds(n);
                                }}
                                className="w-full border border-[#e3e8ee] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#12335c] transition-colors"
                                placeholder="Enter remarks"
                              />
                            </td>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm">
                              <button onClick={() => !disabled && removePremed(idx)} disabled={disabled} className="p-1.5 rounded-lg hover:bg-gray-100 text-[#6b7280] hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div
                    className="text-center py-3.5 bg-[#fafbfc] text-[#12335c] font-bold text-sm cursor-pointer border-t border-[#e3e8ee] hover:bg-[#f0f2f5] transition-colors"
                    onClick={() => !disabled && addPremed()}
                  >
                    + Add Row
                  </div>
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
                  <div className="overflow-x-auto w-full">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-[#f7f9fb]">
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">#</th>
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">MEDICATION <Req /></th>
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">DOSE CALC</th>
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">DOSE</th>
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">ROUTE</th>
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">FREQUENCY</th>
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">ADMIN NOTES</th>
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">TOXICITY</th>
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">REMARKS</th>
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chemoPlans.map((row, idx) => (
                          <tr key={idx}>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm text-[#8a97a6]">{idx + 1}</td>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm">
                              <input
                                type="text"
                                value={row.medication}
                                onChange={(e) => {
                                  const n = [...chemoPlans];
                                  n[idx].medication = e.target.value;
                                  setChemoPlans(n);
                                }}
                                className="w-full border border-[#e3e8ee] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#12335c]"
                                placeholder="Medicine ID"
                              />
                            </td>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm">
                              <input
                                type="text"
                                value={row.doseCalc}
                                onChange={(e) => {
                                  const n = [...chemoPlans];
                                  n[idx].doseCalc = e.target.value;
                                  setChemoPlans(n);
                                }}
                                className="w-full border border-[#e3e8ee] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#12335c]"
                                placeholder="BSA etc"
                              />
                            </td>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm">
                              <input
                                type="text"
                                value={row.dose}
                                onChange={(e) => {
                                  const n = [...chemoPlans];
                                  n[idx].dose = e.target.value;
                                  setChemoPlans(n);
                                }}
                                className="w-full border border-[#e3e8ee] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#12335c]"
                                placeholder="80 mg/m²"
                              />
                            </td>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm">
                              <input
                                type="text"
                                value={row.route}
                                onChange={(e) => {
                                  const n = [...chemoPlans];
                                  n[idx].route = e.target.value;
                                  setChemoPlans(n);
                                }}
                                className="w-full border border-[#e3e8ee] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#12335c]"
                                placeholder="IV"
                              />
                            </td>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm">
                              <input
                                type="text"
                                value={row.frequency}
                                onChange={(e) => {
                                  const n = [...chemoPlans];
                                  n[idx].frequency = e.target.value;
                                  setChemoPlans(n);
                                }}
                                className="w-full border border-[#e3e8ee] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#12335c]"
                                placeholder="D1"
                              />
                            </td>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm">
                              <input
                                type="text"
                                value={row.adminNotes}
                                onChange={(e) => {
                                  const n = [...chemoPlans];
                                  n[idx].adminNotes = e.target.value;
                                  setChemoPlans(n);
                                }}
                                className="w-full border border-[#e3e8ee] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#12335c]"
                                placeholder="Notes"
                              />
                            </td>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm">
                              <input
                                type="text"
                                value={row.toxicity}
                                onChange={(e) => {
                                  const n = [...chemoPlans];
                                  n[idx].toxicity = e.target.value;
                                  setChemoPlans(n);
                                }}
                                className="w-full border border-[#e3e8ee] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#12335c]"
                                placeholder="Toxicity"
                              />
                            </td>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm">
                              <input
                                type="text"
                                value={row.remarks}
                                onChange={(e) => {
                                  const n = [...chemoPlans];
                                  n[idx].remarks = e.target.value;
                                  setChemoPlans(n);
                                }}
                                className="w-full border border-[#e3e8ee] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#12335c]"
                                placeholder="Remarks"
                              />
                            </td>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm">
                              <button onClick={() => removeChemoPlan(idx)} className="p-1.5 rounded-lg hover:bg-gray-100 text-[#6b7280] hover:text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div
                    className="text-center py-3.5 bg-[#fafbfc] text-[#12335c] font-bold text-sm cursor-pointer border-t border-[#e3e8ee] hover:bg-[#f0f2f5]"
                    onClick={() => !disabled && addChemoPlan()}
                  >
                    + Add Row
                  </div>
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
                  <div className="overflow-x-auto w-full">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-[#f7f9fb]">
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">#</th>
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">SUPPORTIVE ITEM</th>
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">INSTRUCTIONS</th>
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supportive.map((row, idx) => (
                          <tr key={idx}>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm text-[#8a97a6]">{idx + 1}</td>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm">
                              <input
                                type="text"
                                value={row.item}
                                onChange={(e) => {
                                  const n = [...supportive];
                                  n[idx].item = e.target.value;
                                  setSupportive(n);
                                }}
                                className="w-full border border-[#e3e8ee] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#12335c]"
                                placeholder="Item / Medicine ID"
                              />
                            </td>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm">
                              <input
                                type="text"
                                value={row.instructions}
                                onChange={(e) => {
                                  const n = [...supportive];
                                  n[idx].instructions = e.target.value;
                                  setSupportive(n);
                                }}
                                className="w-full border border-[#e3e8ee] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#12335c]"
                                placeholder="Instructions"
                              />
                            </td>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm">
                              <button onClick={() => removeSupportive(idx)} className="p-1.5 rounded-lg hover:bg-gray-100 text-[#6b7280] hover:text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="text-center py-3.5 bg-[#fafbfc] text-[#12335c] font-bold text-sm cursor-pointer border-t border-[#e3e8ee] hover:bg-[#f0f2f5]" onClick={() => !disabled && addSupportive()}>
                    + ADD ROW
                  </div>
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
                  <div className="overflow-x-auto w-full">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-[#f7f9fb]">
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">#</th>
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">MEDICATION</th>
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">VOLUME</th>
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">DILUENT</th>
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dilution.map((row, idx) => (
                          <tr key={idx}>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm text-[#8a97a6]">{idx + 1}</td>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm">
                              <input
                                type="text"
                                value={row.medication}
                                onChange={(e) => {
                                  const n = [...dilution];
                                  n[idx].medication = e.target.value;
                                  setDilution(n);
                                }}
                                className="w-full border border-[#e3e8ee] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#12335c]"
                                placeholder="Medicine ID"
                              />
                            </td>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={row.volume}
                                  onChange={(e) => {
                                    const n = [...dilution];
                                    n[idx].volume = e.target.value;
                                    setDilution(n);
                                  }}
                                  className="w-20 border border-[#e3e8ee] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#12335c]"
                                  placeholder="100"
                                />
                                <span className="text-sm text-[#5b6b7c]">ml</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm">
                              <input
                                type="text"
                                value={row.diluent}
                                onChange={(e) => {
                                  const n = [...dilution];
                                  n[idx].diluent = e.target.value;
                                  setDilution(n);
                                }}
                                className="w-full border border-[#e3e8ee] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#12335c]"
                                placeholder="0.9% NaCl"
                              />
                            </td>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm">
                              <button onClick={() => removeDilution(idx)} className="p-1.5 rounded-lg hover:bg-gray-100 text-[#6b7280] hover:text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="text-center py-3.5 bg-[#fafbfc] text-[#12335c] font-bold text-sm cursor-pointer border-t border-[#e3e8ee] hover:bg-[#f0f2f5]" onClick={() => !disabled && addDilution()}>
                    + ADD ROW
                  </div>
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
                  <div className="overflow-x-auto w-full">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-[#f7f9fb]">
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">#</th>
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">FORM</th>
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">MEDICATION</th>
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">STRENGTH</th>
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">DOSE</th>
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">UNIT</th>
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">FREQUENCY</th>
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">INSTRUCTIONS</th>
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">DURATION</th>
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">REMARKS</th>
                          <th className="text-left text-xs font-bold tracking-wide text-[#8a97a6] px-5 py-3 border-t border-b border-[#e3e8ee]">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {post.map((row, idx) => (
                          <tr key={idx}>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm text-[#8a97a6]">{idx + 1}</td>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm">
                              <input
                                type="text"
                                value={row.form}
                                onChange={(e) => {
                                  const n = [...post];
                                  n[idx].form = e.target.value;
                                  setPost(n);
                                }}
                                className="w-full border border-[#e3e8ee] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#12335c]"
                                placeholder="Tab"
                              />
                            </td>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm">
                              <input
                                type="text"
                                value={row.medication}
                                onChange={(e) => {
                                  const n = [...post];
                                  n[idx].medication = e.target.value;
                                  setPost(n);
                                }}
                                className="w-full border border-[#e3e8ee] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#12335c]"
                                placeholder="Medicine ID"
                              />
                            </td>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={row.strength}
                                  onChange={(e) => {
                                    const n = [...post];
                                    n[idx].strength = e.target.value;
                                    setPost(n);
                                  }}
                                  className="w-16 border border-[#e3e8ee] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#12335c]"
                                  placeholder="4"
                                />
                                <span className="text-sm text-[#5b6b7c]">mg</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={row.dose}
                                  onChange={(e) => {
                                    const n = [...post];
                                    n[idx].dose = e.target.value;
                                    setPost(n);
                                  }}
                                  className="w-16 border border-[#e3e8ee] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#12335c]"
                                  placeholder="4"
                                />
                                <span className="text-sm text-[#5b6b7c]">mg</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm">
                              <input
                                type="text"
                                value={row.unit}
                                onChange={(e) => {
                                  const n = [...post];
                                  n[idx].unit = e.target.value;
                                  setPost(n);
                                }}
                                className="w-full border border-[#e3e8ee] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#12335c]"
                                placeholder="mg"
                              />
                            </td>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm">
                              <input
                                type="text"
                                value={row.frequency}
                                onChange={(e) => {
                                  const n = [...post];
                                  n[idx].frequency = e.target.value;
                                  setPost(n);
                                }}
                                className="w-full border border-[#e3e8ee] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#12335c]"
                                placeholder="1-0-1"
                              />
                            </td>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm">
                              <input
                                type="text"
                                value={row.instructions}
                                onChange={(e) => {
                                  const n = [...post];
                                  n[idx].instructions = e.target.value;
                                  setPost(n);
                                }}
                                className="w-full border border-[#e3e8ee] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#12335c]"
                                placeholder="After Food"
                              />
                            </td>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={row.duration}
                                  onChange={(e) => {
                                    const n = [...post];
                                    n[idx].duration = e.target.value;
                                    setPost(n);
                                  }}
                                  className="w-16 border border-[#e3e8ee] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#12335c]"
                                  placeholder="4"
                                />
                                <span className="text-sm text-[#5b6b7c]">days</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm">
                              <input
                                type="text"
                                value={row.remarks}
                                onChange={(e) => {
                                  const n = [...post];
                                  n[idx].remarks = e.target.value;
                                  setPost(n);
                                }}
                                className="w-full border border-[#e3e8ee] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#12335c]"
                                placeholder="Remarks"
                              />
                            </td>
                            <td className="px-5 py-3.5 border-b border-[#e3e8ee] text-sm">
                              <button onClick={() => removePost(idx)} className="p-1.5 rounded-lg hover:bg-gray-100 text-[#6b7280] hover:text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="text-center py-3.5 bg-[#fafbfc] text-[#c0374a] font-bold text-sm cursor-pointer border-t border-[#e3e8ee] hover:bg-[#f5f0f0]" onClick={() => !disabled && addPost()}>
                    + Add Row
                  </div>
                </>
              )}
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
                    {[...premeds, ...chemoPlans, ...supportive, ...dilution, ...post].filter((r: any) => (r.medication || r.item)?.trim()).length} item(s)
                  </div>
                </div>
              </div>
            </div>
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
