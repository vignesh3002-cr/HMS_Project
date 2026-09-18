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
  Plus,
  Copy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormProtocolDropdown } from "@/components/ui/form-protocol-dropdown";
import { FormProtocolMultiSelect } from "@/components/ui/form-protocol-multiselect";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { chemotherapyApi, MedicineOption, RegimenProtocolDilutionInput, DischargeInstructionInput } from "@/api/chemotherapy.api";

// Styling tokens - merged from the mFOLFOX6 "Protocol Builder" mockup:
// soft grey canvas, white cards with hairline borders, muted uppercase grid
// headers, borderless cell inputs that reveal a border on hover/focus.
const cardCls = "bg-white border border-[#e1e7ee] rounded-2xl overflow-hidden w-full";
const inputCls =
  "w-full h-10 px-3.5 bg-[#f8fafc] border border-[#dde4ec] rounded-[11px] text-[13.5px] text-[#17212e] placeholder:text-[#a7b2bf] outline-none transition-all duration-150 hover:border-[#c7d2dd] hover:bg-[#f5f8fb] focus:border-[#12335c] focus:bg-white focus:ring-[3px] focus:ring-[#12335c]/15 disabled:bg-[#f1f3f5] disabled:text-[#9aa5b1] disabled:cursor-not-allowed";
const labelCls = "block text-[12.5px] font-semibold text-[#5b6b7c] mb-[7px]";
const Req = () => <span className="text-[#c0374a] ml-0.5">*</span>;

const ptGridWrap = "overflow-x-auto w-full px-5 pt-4 scrollbar-hide";
const ptGridBox = "min-w-[1300px] border border-[#edf1f5] rounded-xl bg-white";
const ptGridHead =
  "grid items-center gap-2.5 px-4 py-3 bg-[#f7f9fb] border-b border-[#edf1f5] text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#8a97a6] whitespace-nowrap";
const ptGridRow =
  "grid items-center gap-2.5 px-4 py-3 border-b border-[#edf1f5] last:border-0 hover:bg-[#f8f9fb] transition-colors";
const ptInput =
  "w-full h-[34px] px-2.5 bg-transparent border border-transparent rounded-lg text-[12.5px] text-[#17212e] placeholder:text-[#aeb8c3] transition-all duration-150 hover:border-[#dde4ec] hover:bg-[#f8fafc] focus:border-[#12335c] focus:bg-white focus:ring-[3px] focus:ring-[#12335c]/15 focus:outline-none disabled:bg-transparent disabled:text-[#5b6b7c] disabled:cursor-not-allowed";

function ProtocolGridTable({
  columns,
  template,
  rows,
  addLabel,
  onAdd,
  disabled,
  addClassName = "text-[#12335c] hover:bg-[#eaf0f7]",
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
      <div className={ptGridWrap} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <div className={boxClassName}>
          <div className={ptGridHead} style={{ gridTemplateColumns: template }}>
            {columns.map((c, i) => (
              <div key={i} className={`${i === 0 ? "text-center" : ""} whitespace-nowrap`}>
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
        className={`text-center py-[13px] bg-[#fafbfc] font-bold text-[13px] cursor-pointer border-t border-[#edf1f5] transition-colors ${addClassName}`}
        onClick={() => !disabled && onAdd()}
      >
        {addLabel}
      </div>
    </>
  );
}

interface DilutionDetail {
  dilutionId: string;
  id: string;
  medication: string;
  brandName?: string;
  form: string;
  dose: string;
  unit: string;
  volume: string;
  volumeUnit: string;
  diluent: string;
}

const isLegacyDilution = (item: any) =>
  item.drug_role === "SUPPORTIVE" &&
  (item.dosage != null || item.dosage_unit != null) &&
  !item.administration_detail &&
  !item.remarks;

interface Premed {
  id: string;
  medication: string;
  brandName?: string;
  dose: string;
  unit: string;
  adminNotes: string;
  remarks: string;
  dilutions?: DilutionDetail[];
}
interface ChemoPlan {
  id: string;
  medication: string;
  brandName?: string;
  doseCalc: string;
  dose: string;
  unit: string;
  patientDose: string;
  patientUnit: string;
  adminNotes: string;
  toxicity: string;
  remarks: string;
  dilutions?: DilutionDetail[];
}
interface SupportiveCare {
  id: string;
  medication: string;
  brandName?: string;
  adminNotes: string;
  remarks: string;
  dilutions?: DilutionDetail[];
}
interface PostTreatment {
  id: string;
  form: string;
  medication: string;
  brandName?: string;
  dose: string;
  unit: string;
  frequency: string;
  instructions: string;
  duration: string;
  durationDays?: string;
  remarks: string;
}

const getDurationUnitCode = (unit?: string | null): string => {
  if (!unit) return "D";
  const u = unit.trim().toLowerCase();
  if (u === "d" || u === "day" || u === "days" || u === "day's") return "D";
  if (u === "wk" || u === "wks" || u === "week" || u === "weeks" || u === "week's") return "Wk";
  if (u === "mo" || u === "mos" || u === "month" || u === "months" || u === "month's") return "Mo";
  return unit;
};

const getDurationUnitOptions = (
  durationValue: string | number | undefined | null,
  currentUnit?: string | null
) => {
  const num = parseInt(String(durationValue ?? "").trim(), 10);
  const isSingular = num === 1;
  const options = [
    { value: "D", label: isSingular ? "Day" : "Days" },
    { value: "Wk", label: isSingular ? "Week" : "Weeks" },
    { value: "Mo", label: isSingular ? "Month" : "Months" },
  ];
  const unit = currentUnit?.trim();
  if (unit) {
    const code = getDurationUnitCode(unit);
    if (!options.some((o) => o.value === code)) {
      options.push({ value: unit, label: unit });
    }
  }
  return options;
};

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
  const [cancerTypeIds, setCancerTypeIds] = useState<string[]>([]);
  const [subtypeIds, setSubtypeIds] = useState<string[]>([]);
  const [loadingSubtypes, setLoadingSubtypes] = useState(false);
  
  const [standardCycles, setStandardCycles] = useState<number>(6);
  const [cycleIntervalDays, setCycleIntervalDays] = useState<number>(21);
  const [notes, setNotes] = useState("");
  const [days, setDays] = useState<Array<{ dayNumber: number; protocolDayId?: string; sameAsDay?: number }>>([{ dayNumber: 1 }]);
  const [activeDay, setActiveDay] = useState(1);

  const emptyPremed = (): Premed => ({ id: "", medication: "", brandName: "", dose: "", unit: "", adminNotes: "", remarks: "", dilutions: [] });
  const emptyChemo = (): ChemoPlan => ({ id: "", medication: "", brandName: "", doseCalc: "", dose: "", unit: "", patientDose: "", patientUnit: "", adminNotes: "", toxicity: "", remarks: "", dilutions: [] });
  const emptySupportive = (): SupportiveCare => ({ id: "", medication: "", brandName: "", adminNotes: "", remarks: "", dilutions: [] });
    const emptyDilution = (): DilutionDetail => ({ dilutionId: "", id: "", medication: "", brandName: "", form: "", dose: "", unit: "", volume: "", volumeUnit: "", diluent: "" });
    const emptyPost = (): PostTreatment => ({ id: "", form: "", medication: "", brandName: "", dose: "", unit: "", frequency: "", instructions: "", duration: "", durationDays: "D", remarks: "" });

    // Per-day maps for protocol items (each day owns its own rows; preserves
    // administration_day per item so repeated edits never re-stamp items onto
    // a single active day).
    const [premedsByDay, setPremedsByDay] = useState<Record<number, Premed[]>>({ 1: [emptyPremed()] });
    const [chemoPlansByDay, setChemoPlansByDay] = useState<Record<number, ChemoPlan[]>>({ 1: [emptyChemo()] });
    const [supportiveByDay, setSupportiveByDay] = useState<Record<number, SupportiveCare[]>>({ 1: [emptySupportive()] });
    const [dilution, setDilution] = useState<DilutionDetail[]>([emptyDilution()]);
    const [post, setPost] = useState<PostTreatment[]>([emptyPost()]);

  // Active-day views + setters - Pre-medications, Primary Chemo, and Supportive
  // Care are partitioned per day. Dilution Details and Post-treatment (On Discharge)
  // medications are protocol-level (not tied to any administration day).
  const premeds = premedsByDay[activeDay] ?? [];
  const setPremeds = (list: Premed[]) => setPremedsByDay((prev) => ({ ...prev, [activeDay]: list }));
  const chemoPlans = chemoPlansByDay[activeDay] ?? [];
  const setChemoPlans = (list: ChemoPlan[]) => setChemoPlansByDay((prev) => ({ ...prev, [activeDay]: list }));
  const supportive = supportiveByDay[activeDay] ?? [];
  const setSupportive = (list: SupportiveCare[]) => setSupportiveByDay((prev) => ({ ...prev, [activeDay]: list }));

  const [cancerTypes, setCancerTypes] = useState<Array<{ cancer_type_id: string; cancer_type: string }>>([]);
  const [subtypes, setSubtypes] = useState<Array<{ subtype_id: string; subtype_name: string }>>([]);
  const [premedMeds, setPremedMeds] = useState<MedicineOption[]>([]);
  const [chemoMeds, setChemoMeds] = useState<MedicineOption[]>([]);
  const [supportiveMeds, setSupportiveMeds] = useState<MedicineOption[]>([]);
  const [dischargeMeds, setDischargeMeds] = useState<MedicineOption[]>([]);
  const [dilutionMeds, setDilutionMeds] = useState<MedicineOption[]>([]);
  const [loadingPremedMeds, setLoadingPremedMeds] = useState(false);
  const [loadingChemoMeds, setLoadingChemoMeds] = useState(false);
  const [loadingSupportiveMeds, setLoadingSupportiveMeds] = useState(false);
  const [loadingDischargeMeds, setLoadingDischargeMeds] = useState(false);
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

  // Fetch dilution medicines once on mount - NOT filtered by cancer types.
  useEffect(() => {
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

  // Fetch subtypes for all selected cancer types. Subtypes belonging to
  // unselected cancer types are excluded. Prunes any selected subtypeIds
  // that no longer belong to the active cancer types.
  useEffect(() => {
    if (!cancerTypeIds || cancerTypeIds.length === 0) {
      setSubtypes([]);
      setSubtypeIds([]);
      return;
    }
    setLoadingSubtypes(true);
    Promise.all(
      cancerTypeIds.map((typeId) =>
        chemotherapyApi
          .listCancerSubtypes(typeId)
          .then((res) => {
            const data = (res.data as any)?.data ?? res.data;
            return Array.isArray(data) ? data : [];
          })
          .catch(() => [])
      )
    )
      .then((results) => {
        const flattened = results.flat();
        const seen = new Map<string, any>();
        for (const s of flattened) {
          if (!seen.has(s.subtype_id)) seen.set(s.subtype_id, s);
        }
        const combined = Array.from(seen.values());
        setSubtypes(combined);
        setSubtypeIds((prev) => prev.filter((id) => combined.some((s) => s.subtype_id === id)));
      })
      .finally(() => setLoadingSubtypes(false));
  }, [cancerTypeIds]);

  // Fetch medicines dynamically based on selected cancer types & subtypes for
  // PREMEDICATION, PRIMARY (chemo), SUPPORTIVE, and DISCHARGE (post-treatment).
  useEffect(() => {
    if (!cancerTypeIds || cancerTypeIds.length === 0) {
      setPremedMeds([]);
      setChemoMeds([]);
      setSupportiveMeds([]);
      setDischargeMeds([]);
      return;
    }

    setLoadingPremedMeds(true);
    chemotherapyApi
      .listMedicinesByCancerSubtype(cancerTypeIds, subtypeIds, "PREMEDICATION")
      .then((res) => {
        const data = (res.data as any)?.data ?? res.data;
        setPremedMeds(Array.isArray(data) ? data : []);
      })
      .catch(() => setPremedMeds([]))
      .finally(() => setLoadingPremedMeds(false));

    setLoadingChemoMeds(true);
    chemotherapyApi
      .listMedicinesByCancerSubtype(cancerTypeIds, subtypeIds, "PRIMARY")
      .then((res) => {
        const data = (res.data as any)?.data ?? res.data;
        setChemoMeds(Array.isArray(data) ? data : []);
      })
      .catch(() => setChemoMeds([]))
      .finally(() => setLoadingChemoMeds(false));

    setLoadingSupportiveMeds(true);
    chemotherapyApi
      .listMedicinesByCancerSubtype(cancerTypeIds, subtypeIds, "SUPPORTIVE")
      .then((res) => {
        const data = (res.data as any)?.data ?? res.data;
        setSupportiveMeds(Array.isArray(data) ? data : []);
      })
      .catch(() => setSupportiveMeds([]))
      .finally(() => setLoadingSupportiveMeds(false));

    setLoadingDischargeMeds(true);
    chemotherapyApi
      .listMedicinesByCancerSubtype(cancerTypeIds, subtypeIds, "DISCHARGE")
      .then((res) => {
        const data = (res.data as any)?.data ?? res.data;
        setDischargeMeds(Array.isArray(data) ? data : []);
      })
      .catch(() => setDischargeMeds([]))
      .finally(() => setLoadingDischargeMeds(false));

  }, [cancerTypeIds, subtypeIds]);

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
        const loadedCancerTypeIds = Array.isArray(p.cancer_type_ids) && p.cancer_type_ids.length > 0
          ? p.cancer_type_ids
          : Array.isArray(p.chemotherapy_protocol_cancers) && p.chemotherapy_protocol_cancers.length > 0
            ? Array.from(new Set(p.chemotherapy_protocol_cancers.map((c: any) => c.cancer_type_id).filter(Boolean)))
            : (p.cancer_type_id ? [p.cancer_type_id] : []);

        const loadedSubtypeIds = Array.isArray(p.subtype_ids) && p.subtype_ids.length > 0
          ? p.subtype_ids
          : Array.isArray(p.chemotherapy_protocol_cancers) && p.chemotherapy_protocol_cancers.length > 0
            ? Array.from(new Set(p.chemotherapy_protocol_cancers.map((c: any) => c.subtype_id).filter(Boolean)))
            : (p.subtype_id ? [p.subtype_id] : []);

        setCancerTypeIds(loadedCancerTypeIds);
        setSubtypeIds(loadedSubtypeIds);
        setStandardCycles(p.standard_cycles ?? 6);
        setCycleIntervalDays(p.cycle_interval_days ?? p.no_of_days ?? 21);
        setNotes(p.notes ?? (p as any).guideline_source ?? "");
        const dbDays: any[] = p.chemotherapy_regimen_protocol_days ?? [];
        const items: any[] = p.chemotherapy_regimen_protocol_items ?? [];
        const protocolDilutions: any[] = p.protocol_dilutions ?? [];
        const protocolDischarge: any[] = p.protocol_discharge_instructions ?? p.chemotherapy_discharge_instructions ?? [];
        const uniqueDayNumbers = Array.from(
          new Set(
            dbDays
              .map((d: any) => d.day_number)
              .filter((n: any) => typeof n === "number" && n >= 1)
          )
        ).sort((a: number, b: number) => a - b);
        const maxAdminDay = items.reduce((m: number, x: any) => Math.max(m, x.administration_day ?? 1), 1);
        const numDaysFromDb = Math.max(
          p.no_of_days ?? 1,
          uniqueDayNumbers.length > 0 ? Math.max(...uniqueDayNumbers) : 1
        );
        const dayCount = Math.max(1, Math.min(Math.max(numDaysFromDb, maxAdminDay), 30));
        const loadedDays = Array.from({ length: dayCount }, (_, i) => {
          const dbDay = dbDays.find((x: any) => x.day_number === i + 1);
          return {
            dayNumber: i + 1,
            protocolDayId: dbDay?.protocol_day_id ?? "",
            sameAsDay: dbDay?.same_as_day_one ? 1 : undefined,
          };
        });
        setDays(loadedDays);
        loadedItemIdsRef.current = items.filter((x: any) => x.protocol_item_id).map((x: any) => x.protocol_item_id as string);
        if (items.length || protocolDilutions.length || protocolDischarge.length) {
                  const dayOf = (x: any) => Math.min(x.administration_day ?? 1, dayCount);
                  const premedsM: Record<number, Premed[]> = {};
                  const chemoM: Record<number, ChemoPlan[]> = {};
                  const suppM: Record<number, SupportiveCare[]> = {};
                  for (const x of items) {
                    const dayIndex = dayOf(x);
                    if (x.drug_role === "PREMEDICATION") {
                      const xs: any[] = x.chemotherapy_protocol_dilutions ?? [];
                      (premedsM[dayIndex] = premedsM[dayIndex] ?? []).push({
                        id: (x.protocol_item_id as string) ?? "",
                        medication: x.medicine_id ?? x.medicine_master?.medicine_name ?? "",
                        brandName: x.drug_brand_name ?? "",
                        dose: (x.patient_dose as any) ?? "",
                        unit: x.patient_dose_unit ?? "",
                        adminNotes: x.administration_detail ?? "",
                        remarks: x.remarks ?? "",
                        dilutions: xs.map((d) => ({
                          dilutionId: (d.protocol_dilution_id as string) ?? "",
                          id: (x.protocol_item_id as string) ?? "",
                          medication: d.medicine_id ?? x.medicine_id ?? "",
                          form: d.form ?? "",
                          dose: d.dose != null ? String(d.dose) : "",
                          unit: d.dose_unit ?? "",
                          volume: d.dilution_volume != null ? String(d.dilution_volume) : "",
                          volumeUnit: d.dilution_volume_unit ?? "",
                          diluent: d.diluent ?? "",
                        })),
                      });
                    } else if (x.drug_role === "PRIMARY") {
                      const xs: any[] = x.chemotherapy_protocol_dilutions ?? [];
                      (chemoM[dayIndex] = chemoM[dayIndex] ?? []).push({
                        id: (x.protocol_item_id as string) ?? "",
                        medication: x.medicine_id ?? "",
                        brandName: x.drug_brand_name ?? "",
                        doseCalc: (x as any).dose_calculation_method ?? "",
                        dose: (x.dosage as any) ?? "",
                        unit: x.dosage_unit ?? "",
                        patientDose: (x.patient_dose as any) ?? "",
                        patientUnit: x.patient_dose_unit ?? "",
                        adminNotes: x.administration_detail ?? "",
                        toxicity: x.previous_toxicity ?? "",
                        remarks: x.remarks ?? "",
                        dilutions: xs.map((d) => ({
                          dilutionId: (d.protocol_dilution_id as string) ?? "",
                          id: (x.protocol_item_id as string) ?? "",
                          medication: d.medicine_id ?? x.medicine_id ?? "",
                          form: d.form ?? "",
                          dose: d.dose != null ? String(d.dose) : "",
                          unit: d.dose_unit ?? "",
                          volume: d.dilution_volume != null ? String(d.dilution_volume) : "",
                          volumeUnit: d.dilution_volume_unit ?? "",
                          diluent: d.diluent ?? "",
                        })),
                      });
                    } else if (x.drug_role === "SUPPORTIVE") {
                      const xs: any[] = x.chemotherapy_protocol_dilutions ?? [];
                      if (xs.length) {
                        (suppM[dayIndex] = suppM[dayIndex] ?? []).push({
                          id: (x.protocol_item_id as string) ?? "",
                          medication: x.medicine_id ?? "",
                          brandName: x.drug_brand_name ?? "",
                          adminNotes: x.administration_detail ?? "",
                          remarks: x.remarks ?? "",
                          dilutions: xs.map((d) => ({
                            dilutionId: (d.protocol_dilution_id as string) ?? "",
                            id: (x.protocol_item_id as string) ?? "",
                            medication: d.medicine_id ?? x.medicine_id ?? "",
                            form: d.form ?? "",
                            dose: d.dose != null ? String(d.dose) : "",
                            unit: d.dose_unit ?? "",
                            volume: d.dilution_volume != null ? String(d.dilution_volume) : "",
                            volumeUnit: d.dilution_volume_unit ?? "",
                            diluent: d.diluent ?? "",
                          })),
                        });
                      } else if (isLegacyDilution(x)) {
                        const diluent =
                          (x.administration_detail ?? "").trim() ||
                          (typeof x.remarks === "string" ? x.remarks.replace(/^Diluent:\s*/i, "").trim() : "");
                        (suppM[dayIndex] = suppM[dayIndex] ?? []).push({
                          id: (x.protocol_item_id as string) ?? "",
                          medication: x.medicine_id ?? "",
                          brandName: x.drug_brand_name ?? "",
                          adminNotes: x.administration_detail ?? "",
                          remarks: x.remarks ?? "",
                          dilutions: [{
                            dilutionId: "",
                            id: (x.protocol_item_id as string) ?? "",
                            medication: x.medicine_id ?? "",
                            form: "",
                            dose: x.dosage != null ? String(x.dosage) : "",
                            unit: x.dosage_unit ?? "",
                            volume: "",
                            volumeUnit: "",
                            diluent,
                          }],
                        });
                      } else {
                        (suppM[dayIndex] = suppM[dayIndex] ?? []).push({
                          id: (x.protocol_item_id as string) ?? "",
                          medication: x.medicine_id ?? "",
                          brandName: x.drug_brand_name ?? "",
                          adminNotes: x.administration_detail ?? "",
                          remarks: x.remarks ?? "",
                          dilutions: [],
                        });
                      }
                    }
                  }
                  // POST-TREATMENT (ON DISCHARGE) medications are persisted in the
                  // chemotherapy_discharge_instructions table (surfaced as
                  // protocol_discharge_instructions). Protocols created before that
                  // switch still carry them as POSTMEDICATION items - fall back to
                  // those so nothing disappears on edit.
                  const dischargeRows: any[] = protocolDischarge;
                  const loadedPost: PostTreatment[] = [];
                  if (dischargeRows.length) {
                    for (const d of dischargeRows) {
                      loadedPost.push({
                        id: (d.discharge_instruction_id as string) ?? "",
                        form: d.drug_from ?? "Tab",
                        medication: d.medicine_id ?? "",
                        brandName: d.drug_brand_name ?? "",
                        dose: d.patient_dose != null ? String(d.patient_dose) : "",
                        unit: d.patient_dose_unit ?? "",
                        frequency: d.frequency ?? "",
                        instructions: d.administration_detail ?? "",
                        duration: d.duration != null ? String(d.duration) : "",
                        durationDays: d.duration_days != null ? getDurationUnitCode(String(d.duration_days)) : "D",
                        remarks: d.comment ?? "",
                      });
                    }
                  } else {
                    for (const x of items.filter((x: any) => x.drug_role === "POSTMEDICATION")) {
                      loadedPost.push({
                        id: (x.protocol_item_id as string) ?? "",
                        form: "Tab",
                        medication: x.medicine_id ?? "",
                        brandName: x.drug_brand_name ?? "",
                        dose: (x.dosage as any) ?? "",
                        unit: x.dosage_unit ?? "",
                        frequency: x.frequency ?? "",
                        instructions: x.administration_detail ?? "",
                        duration: x.administration_day != null ? "Day " + x.administration_day : "",
                        durationDays: "D",
                        remarks: typeof x.remarks === "string" ? x.remarks : "",
                      });
                    }
                  }

                  const protoDils: any[] = protocolDilutions;
                  const loadedDilutions: DilutionDetail[] = [];
                  if (protoDils.length) {
                    for (const d of protoDils) {
                      loadedDilutions.push({
                        dilutionId: (d.protocol_dilution_id as string) ?? "",
                        id: (d.protocol_item_id as string) ?? "",
                        medication: d.medicine_id ?? "",
                        brandName: d.drug_brand_name ?? "",
                        form: d.form ?? "",
                        dose: d.dose != null ? String(d.dose) : "",
                        unit: d.dose_unit ?? "",
                        volume: d.dilution_volume != null ? String(d.dilution_volume) : "",
                        volumeUnit: d.dilution_volume_unit ?? "",
                        diluent: d.diluent ?? "",
                      });
                    }
                  } else {
                    for (const x of items) {
                      for (const d of (x.chemotherapy_protocol_dilutions ?? [])) {
                        loadedDilutions.push({
                          dilutionId: (d.protocol_dilution_id as string) ?? "",
                          id: (d.protocol_item_id as string) ?? "",
                          medication: d.medicine_id ?? x.medicine_id ?? "",
                          brandName: d.drug_brand_name ?? "",
                          form: d.form ?? "",
                          dose: d.dose != null ? String(d.dose) : "",
                          unit: d.dose_unit ?? "",
                          volume: d.dilution_volume != null ? String(d.dilution_volume) : "",
                          volumeUnit: d.dilution_volume_unit ?? "",
                          diluent: d.diluent ?? "",
                        });
                      }
                    }
                  }

                  setPremedsByDay(premedsM);
                  setChemoPlansByDay(chemoM);
                  setSupportiveByDay(suppM);
                  setDilution(loadedDilutions.length > 0 ? loadedDilutions : [emptyDilution()]);
                  setPost(loadedPost.length > 0 ? loadedPost : [emptyPost()]);
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
      cancerTypeIds.length > 0 ||
      notes.trim() !== "" ||
      days.length > 1 ||
      Object.values(premedsByDay).some((r) => r.some((rd) => rd.medication.trim() !== "")) ||
      Object.values(chemoPlansByDay).some((r) => r.some((rd) => rd.medication.trim() !== "")) ||
      Object.values(supportiveByDay).some((r) => r.some((rd) => rd.medication.trim() !== "")) ||
      dilution.some((r) => r.medication.trim() !== "") ||
      post.some((r) => r.medication.trim() !== ""));

  const handleBack = () => {
    if (isDirty) setShowLeaveConfirm(true);
    else navigate(-1);
  };

  const handleAddDay = () => {
    if (disabled) return;
    const nextNum = days.length + 1;
    setDays([...days, { dayNumber: nextNum }]);
    setPremedsByDay((prev) => ({ ...prev, [nextNum]: [emptyPremed()] }));
    setChemoPlansByDay((prev) => ({ ...prev, [nextNum]: [emptyChemo()] }));
    setSupportiveByDay((prev) => ({ ...prev, [nextNum]: [emptySupportive()] }));
    setActiveDay(nextNum);
  };

  const handleCopyFromDay = (sourceDay: number, targetDay: number) => {
    if (disabled || sourceDay === targetDay) return;

    const srcPremeds = premedsByDay[sourceDay] ?? [];
    const clonedPremeds: Premed[] = srcPremeds.map((p) => ({
      ...p,
      id: "",
      dilutions: (p.dilutions ?? []).map((d) => ({ ...d, dilutionId: "", id: "" })),
    }));

    const srcChemo = chemoPlansByDay[sourceDay] ?? [];
    const clonedChemo: ChemoPlan[] = srcChemo.map((c) => ({
      ...c,
      id: "",
      dilutions: (c.dilutions ?? []).map((d) => ({ ...d, dilutionId: "", id: "" })),
    }));

    const srcSupportive = supportiveByDay[sourceDay] ?? [];
    const clonedSupportive: SupportiveCare[] = srcSupportive.map((s) => ({
      ...s,
      id: "",
      dilutions: (s.dilutions ?? []).map((d) => ({ ...d, dilutionId: "", id: "" })),
    }));

    setPremedsByDay((prev) => ({
      ...prev,
      [targetDay]: clonedPremeds.length > 0 ? clonedPremeds : [emptyPremed()],
    }));
    setChemoPlansByDay((prev) => ({
      ...prev,
      [targetDay]: clonedChemo.length > 0 ? clonedChemo : [emptyChemo()],
    }));
    setSupportiveByDay((prev) => ({
      ...prev,
      [targetDay]: clonedSupportive.length > 0 ? clonedSupportive : [emptySupportive()],
    }));

    setDays((prev) =>
      prev.map((d) => (d.dayNumber === targetDay ? { ...d, sameAsDay: sourceDay } : d))
    );

    toast({
      title: "Medications Copied",
      description: `Copied all medications from Day ${sourceDay} to Day ${targetDay}.`,
    });
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
        drug_brand_name?: string | null;
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
            drug_brand_name: row.brandName?.trim() || null,
            drug_role: "PREMEDICATION",
            drug_type: "PREMEDICATION",
            drug_sequence: seq++,
            patient_dose: row.dose || null,
            patient_dose_unit: row.unit || null,
            administration_detail: row.adminNotes || null,
            remarks: row.remarks || null,
            administration_day: dayNum,
            dilutions: (row.dilutions ?? []).map((d) => ({
              protocol_dilution_id: d.dilutionId || undefined,
              medicine_id: d.medication.trim(),
              drug_brand_name: d.brandName?.trim() || null,
              form: d.form || null,
              dose: d.dose || null,
              dose_unit: d.unit || null,
              dilution_volume: d.volume || null,
              dilution_volume_unit: d.volumeUnit || null,
              diluent: d.diluent || null,
              comment: d.diluent || null,
            })),
          });
        }
        for (const row of chemoPlansByDay[dayNum] ?? []) {
          if (!row.medication.trim()) continue;
          items.push({
            protocol_item_id: row.id || undefined,
            medicine_id: row.medication.trim(),
            drug_brand_name: row.brandName?.trim() || null,
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
            dilutions: (row.dilutions ?? []).map((d) => ({
              protocol_dilution_id: d.dilutionId || undefined,
              medicine_id: d.medication.trim(),
              drug_brand_name: d.brandName?.trim() || null,
              form: d.form || null,
              dose: d.dose || null,
              dose_unit: d.unit || null,
              dilution_volume: d.volume || null,
              dilution_volume_unit: d.volumeUnit || null,
              diluent: d.diluent || null,
              comment: d.diluent || null,
            })),
          });
        }
        for (const row of supportiveByDay[dayNum] ?? []) {
          if (!row.medication.trim()) continue;
          items.push({
            protocol_item_id: row.id || undefined,
            medicine_id: row.medication.trim(),
            drug_brand_name: row.brandName?.trim() || null,
            drug_role: "SUPPORTIVE",
            drug_type: "SUPPORTIVE",
            drug_sequence: seq++,
            administration_detail: row.adminNotes || null,
            remarks: row.remarks || null,
            administration_day: dayNum,
            dilutions: (row.dilutions ?? []).map((d) => ({
              protocol_dilution_id: d.dilutionId || undefined,
              medicine_id: d.medication.trim(),
              drug_brand_name: d.brandName?.trim() || null,
              form: d.form || null,
              dose: d.dose || null,
              dose_unit: d.unit || null,
              dilution_volume: d.volume || null,
              dilution_volume_unit: d.volumeUnit || null,
              diluent: d.diluent || null,
              comment: d.diluent || null,
            })),
          });
        }
      }
      // NOTE: POST-TREATMENT (ON DISCHARGE) medications are NOT protocol items;
      // they are persisted separately as chemotherapy_discharge_instructions
      // (see buildDischargeInstructions below).
      return items;
    };

  const buildDischargeInstructions = (): DischargeInstructionInput[] => {
    return post
      .filter((row) => row.medication?.trim())
      .map((row, idx) => ({
        discharge_instruction_id: row.id || undefined,
        medicine_id: row.medication.trim(),
        drug_brand_name: row.brandName?.trim() || null,
        drug_sequence: idx + 1,
        drug_from: row.form || null,
        frequency: row.frequency || null,
        duration: row.duration || null,
        duration_days: getDurationUnitCode(row.durationDays) || "D",
        patient_dose: row.dose ? Number(row.dose) : null,
        patient_dose_unit: row.unit || null,
        administration_detail: row.instructions || null,
        comment: row.remarks || null,
      }));
  };

  const buildDilutions = (): RegimenProtocolDilutionInput[] => {
    return dilution
      .filter((row) => row.medication?.trim())
      .map((row) => ({
        protocol_dilution_id: row.dilutionId || undefined,
        medicine_id: row.medication.trim(),
        drug_brand_name: row.brandName?.trim() || null,
        form: row.form || null,
        dose: row.dose || null,
        dose_unit: row.unit || null,
        dilution_volume: row.volume || null,
        dilution_volume_unit: row.volumeUnit || null,
        diluent: row.diluent || null,
        comment: row.diluent || null,
      }));
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
    if (cancerTypeIds.length === 0) {
      toast({ title: "Missing required field", description: "Please select at least one cancer type.", variant: "destructive" });
      return;
    }
    const items = buildItems();
    if (items.length === 0) {
      toast({ title: "Missing drugs", description: "Add at least one drug with Medication filled.", variant: "destructive" });
      return;
    }
    const dilutions = buildDilutions();
    const dischargeInstructions = buildDischargeInstructions();
    setIsSubmitting(true);
    try {
      const payload: any = {
        regimen_name: regimenName.trim(),
        original_protocol: regimenName.trim(),
        ...(isEditMode ? { regimen_code: regimenCode.trim() } : {}),
        cancer_type_id: cancerTypeIds[0] || null,
        cancer_type_ids: cancerTypeIds,
        subtype_id: subtypeIds[0] || null,
        subtype_ids: subtypeIds,
        standard_cycles: standardCycles || null,
        cycle_interval_days: cycleIntervalDays || null,
        no_of_days: days.length,
        days: days.map((d) => ({
          protocol_day_id: d.protocolDayId || undefined,
          day_number: d.dayNumber,
          same_as_day_one: d.sameAsDay === 1,
        })),
        notes: notes || null,
        items,
        dilutions,
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
  const addPost = () => setPost([...post, emptyPost()]);
  const removePost = (idx: number) => setPost(post.filter((_, i) => i !== idx));

  const allAvailableDilutionMeds = (() => {
    const map = new Map<string, string>();
    for (const m of dilutionMeds) {
      if (m?.medicine_id && m?.medicine_name) map.set(m.medicine_id, m.medicine_name);
    }
    for (const dayNum of Object.keys(premedsByDay)) {
      for (const row of premedsByDay[Number(dayNum)] ?? []) {
        if (row.id && row.medication) map.set(row.id, row.medication);
      }
    }
    for (const dayNum of Object.keys(chemoPlansByDay)) {
      for (const row of chemoPlansByDay[Number(dayNum)] ?? []) {
        if (row.id && row.medication) map.set(row.id, row.medication);
      }
    }
    for (const dayNum of Object.keys(supportiveByDay)) {
      for (const row of supportiveByDay[Number(dayNum)] ?? []) {
        if (row.id && row.medication) map.set(row.id, row.medication);
      }
    }
    for (const m of chemoMeds) {
      if (m?.medicine_id && m?.medicine_name && !map.has(m.medicine_id)) map.set(m.medicine_id, m.medicine_name);
    }
    for (const m of premedMeds) {
      if (m?.medicine_id && m?.medicine_name && !map.has(m.medicine_id)) map.set(m.medicine_id, m.medicine_name);
    }
    return Array.from(map.entries())
      .map(([value, label]) => ({ label, value }))
      .sort((a, b) => a.label.localeCompare(b.label));
  })();

  const selectedCancerTypeName = cancerTypes
    .filter((c) => cancerTypeIds.includes(c.cancer_type_id))
    .map((c) => c.cancer_type)
    .join(", ") || "—";
  const pageTitle = isViewMode ? "View Protocol" : isEditMode ? "Edit Protocol" : "Create Protocol";
  const pageSubtitle = isViewMode
    ? "View chemotherapy regimen details (read-only)."
    : isEditMode
      ? "Update the existing regimen. Changes will be saved to the same protocol."
      : "Define a new chemotherapy regimen template. All drugs below will be saved as protocol items.";
  const saveLabel = isViewMode ? "Back to Protocols" : isEditMode ? "Update protocol" : "Save protocol";

  if (loadingProtocol) {
    return (
      <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#12335c]" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#f4f6f9] w-full"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
    >
      <div className="max-w-[1400px] mx-auto w-full px-10 pt-7 pb-16">
        {/* Top Header */}
        <div className="flex justify-between items-start gap-4 mb-[22px] w-full">
          <div className="flex gap-3.5 items-start">
            <button
              onClick={handleBack}
              className="w-[38px] h-[38px] shrink-0 flex items-center justify-center rounded-[11px] border border-transparent hover:bg-white hover:border-[#e1e7ee] text-[#5b6b7c] hover:text-[#12335c] transition-colors mt-0.5"
              aria-label="Go back"
            >
              <ArrowLeft className="w-[19px] h-[19px]" />
            </button>
            <div>
              <h1 className="text-[23px] font-extrabold text-[#17212e] m-0 tracking-[-0.01em]">{pageTitle}</h1>
              <p className="text-[#5b6b7c] text-[13.5px] mt-[5px] max-w-[46ch]">{pageSubtitle}</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="bg-[#12335c] text-white border-none rounded-xl px-[22px] py-3 text-[13.5px] font-semibold flex items-center gap-2 shadow-[0_1px_2px_rgba(18,51,92,0.15)] hover:bg-[#0e2848] transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
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
        <div className="bg-white border border-[#e1e7ee] rounded-2xl px-[26px] py-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-5 w-full">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-[38px] h-[38px] rounded-[11px] bg-[#eaf0f7] flex items-center justify-center text-[#12335c] shrink-0">
              <Pill className="w-[17px] h-[17px]" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-[#17212e] leading-tight truncate">{regimenName || "New Protocol"}</div>
              <div className="text-xs text-[#8a97a6] mt-0.5">Regimen: {regimenCode || "—"}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-[38px] h-[38px] rounded-[11px] bg-[#eaf0f7] flex items-center justify-center text-[#12335c] shrink-0">
              <ClipboardList className="w-[17px] h-[17px]" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-[#17212e] leading-tight truncate">{selectedCancerTypeName}</div>
              <div className="text-xs text-[#8a97a6] mt-0.5">Cancer Type</div>
            </div>
          </div>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-[38px] h-[38px] rounded-[11px] bg-[#eaf0f7] flex items-center justify-center text-[#12335c] shrink-0">
              <Syringe className="w-[17px] h-[17px]" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-[#17212e] leading-tight truncate">
                {standardCycles} cycle{standardCycles !== 1 ? "s" : ""} × {cycleIntervalDays} Days
              </div>
              <div className="text-xs text-[#8a97a6] mt-0.5">Regimen Schedule</div>
            </div>
          </div>
        </div>

        <div className="w-full">
          <div className="flex gap-5 items-start w-full mb-5">
            <div className="flex-1 min-w-0">
              {/* Top form card */}
            <div className={cardCls + " mb-5"}>
              <div className="px-[26px] py-6 w-full">
                <div className="border-b border-[#edf1f5] pb-5 mb-[22px] w-full">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <label className={labelCls + " mb-0"}>Protocol Days</label>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#f1f5f9] text-[#64748b]">
                        {days.length} day{days.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {activeDay > 1 && days.length > 1 && !disabled && (
                      <div className="flex items-center gap-2 bg-[#f8fafc] border border-[#dde4ec] rounded-lg px-2.5 py-1">
                        <Copy className="w-3.5 h-3.5 text-[#12335c]" />
                        <span className="text-xs font-semibold text-[#5b6b7c]">Same as:</span>
                        <select
                          value={days.find((d) => d.dayNumber === activeDay)?.sameAsDay ?? ""}
                          onChange={(e) => {
                            const src = Number(e.target.value);
                            if (src) handleCopyFromDay(src, activeDay);
                          }}
                          className="text-xs bg-white border border-[#c7d2dd] rounded-md px-2 py-0.5 text-[#12335c] font-semibold focus:outline-none focus:ring-1 focus:ring-[#12335c] cursor-pointer"
                        >
                          <option value="" disabled>Select day...</option>
                          {days
                            .filter((d) => d.dayNumber !== activeDay)
                            .map((d) => (
                              <option key={d.dayNumber} value={d.dayNumber}>
                                Day {d.dayNumber}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {days.map((d) => {
                      const isActive = d.dayNumber === activeDay;
                      return (
                        <div key={d.dayNumber} className="relative group">
                          {days.length > 1 && !disabled && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveDay(d.dayNumber);
                              }}
                              title={`Remove Day ${d.dayNumber}`}
                              aria-label={`Remove Day ${d.dayNumber}`}
                              className="absolute -top-1.5 -right-1.5 z-10 w-4 h-4 rounded-full bg-white border border-[#e3e8ee] shadow-xs flex items-center justify-center text-[#c0374a] text-[11px] leading-none opacity-0 group-hover:opacity-100 hover:bg-[#c0374a] hover:border-[#c0374a] hover:text-white hover:scale-110 transition-all duration-150"
                            >
                              ×
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setActiveDay(d.dayNumber)}
                            className={`w-[74px] h-[44px] flex flex-col items-center justify-center rounded-xl border transition-all duration-200 ${
                              isActive
                                ? "border-[#12335c] bg-gradient-to-b from-[#1c4a80] to-[#12335c] text-white shadow-sm shadow-[#12335c]/25"
                                : "border-[#e3e8ee] bg-white text-[#1b2530] hover:border-[#9db4cc] hover:bg-[#f8fafc] hover:-translate-y-0.5"
                            }`}
                          >
                            <span
                              className={`text-[9px] font-bold uppercase tracking-[0.14em] leading-none ${
                                isActive ? "text-blue-100/80" : "text-[#8a97a6]"
                              }`}
                            >
                              Day
                            </span>
                            <span
                              className={`mt-0.5 text-[17px] font-extrabold leading-tight ${
                                isActive ? "text-white" : "text-[#1b2530]"
                              }`}
                            >
                              {d.dayNumber}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                    {!disabled && (
                      <button
                        type="button"
                        onClick={handleAddDay}
                        className="h-[44px] px-3.5 rounded-xl border border-dashed border-[#9db4cc] text-[#12335c] bg-[#f8fafc] hover:bg-[#eef2f6] hover:border-[#12335c] transition-all duration-200 flex items-center justify-center gap-1.5 font-bold text-xs"
                        title="Add next protocol day"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Day</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full">
                  <div className="lg:col-span-1">
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
                      Cancer Type(s) <Req />
                    </label>
                    <FormProtocolMultiSelect
                      options={cancerTypes.map((c) => ({ label: c.cancer_type, value: c.cancer_type_id }))}
                      values={cancerTypeIds}
                      onValuesChange={setCancerTypeIds}
                      placeholder={loadingCancerTypes ? "Loading..." : "Select cancer type(s)"}
                      disabled={disabled || loadingCancerTypes}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Cancer Subtype(s)</label>
                    <FormProtocolMultiSelect
                      options={subtypes.map((s) => ({ label: s.subtype_name, value: s.subtype_id }))}
                      values={subtypeIds}
                      onValuesChange={setSubtypeIds}
                      placeholder={cancerTypeIds.length === 0 ? "Select cancer type(s) first" : loadingSubtypes ? "Loading subtypes..." : subtypes.length ? "Select subtype(s)" : "No subtypes"}
                      disabled={disabled || cancerTypeIds.length === 0 || loadingSubtypes || subtypes.length === 0}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Standard Cycles</label>
                    <div className="flex items-center border border-[#dde4ec] rounded-[11px] overflow-hidden h-10 bg-[#f8fafc]">
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
                    <div className="flex items-center border border-[#dde4ec] rounded-[11px] overflow-hidden h-10 bg-[#f8fafc]">
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
          <div className="w-[280px] shrink-0">
            <div className={cardCls + " sticky top-5"}>
              <div className="bg-[#eaf0f7] px-6 py-5 flex justify-between items-start">
                <div className="text-[15px] font-extrabold leading-[1.3] text-[#12335c]">
                  PROTOCOL
                  <br />
                  SUMMARY
                </div>
                <ClipboardList className="w-[18px] h-[18px] text-[#12335c] shrink-0" />
              </div>
              <div className="px-6 pt-1 pb-5">
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
                  <div className="text-[10.5px] font-bold tracking-wide text-[#8a97a6] mb-1.5">PROTOCOL DAYS</div>
                  <div className="text-sm font-bold text-[#1b2530]">{days.length} day{days.length !== 1 ? "s" : ""}</div>
                </div>
                <div className="py-4">
                  <div className="text-[10.5px] font-bold tracking-wide text-[#8a97a6] mb-1.5">TOTAL DRUGS</div>
                  <div className="text-sm font-bold text-[#1b2530]">
                    {[...premeds, ...chemoPlans, ...supportive, ...dilution, ...post, ...days.flatMap((d) => (d.dayNumber === activeDay ? [] : [...(premedsByDay[d.dayNumber] ?? []), ...(chemoPlansByDay[d.dayNumber] ?? []), ...(supportiveByDay[d.dayNumber] ?? [])]))].filter((r: any) => (r.medication || r.item)?.trim()).length} item(s)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pre-medications */}
            <div className={cardCls + " mb-5"}>
              <div
                className="flex items-center justify-between px-6 py-[17px] cursor-pointer hover:bg-[#f8f9fb] transition-colors"
                onClick={() => toggleSection("premeds")}
              >
                <div className="flex items-center gap-2.5 text-[13.5px] font-bold text-[#17212e]">
                  <Pill className="w-4 h-4 text-[#12335c]" /> Pre-medications
                </div>
                {sections.premeds ? <ChevronUp className="w-4 h-4 text-[#8a97a6]" /> : <ChevronDown className="w-4 h-4 text-[#8a97a6]" />}
              </div>
              {sections.premeds && (
                <>
                  <ProtocolGridTable
                    columns={["#", "MEDICATION / DRUG *", "BRAND", "DOSE", "UNIT", "ADMIN NOTES", "REMARKS", "ACTIONS"]}
                    template="44px 1.5fr 1.2fr 1fr 140px 1.5fr 1.5fr 40px"
                    addLabel="+ Add Row"
                    onAdd={addPremed}
                    disabled={disabled}
                    rows={premeds.map((row, idx) => [
                      idx + 1,
                      <FormProtocolDropdown
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
                        key="b"
                        type="text"
                        value={row.brandName ?? ""}
                        onChange={(e) => {
                          const n = [...premeds];
                          n[idx].brandName = e.target.value;
                          setPremeds(n);
                        }}
                        className={ptInput}
                        placeholder="Brand name"
                        disabled={disabled}
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
                      <FormProtocolDropdown
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
            <div className={cardCls + " mb-5"}>
              <div
                className="flex items-center justify-between px-6 py-[17px] cursor-pointer hover:bg-[#f8f9fb] transition-colors"
                onClick={() => toggleSection("chemo")}
              >
                <div className="flex items-center gap-2.5 text-[13.5px] font-bold text-[#17212e]">
                  <Syringe className="w-4 h-4 text-[#12335c]" /> Chemotherapy Plan
                </div>
                {sections.chemo ? <ChevronUp className="w-4 h-4 text-[#8a97a6]" /> : <ChevronDown className="w-4 h-4 text-[#8a97a6]" />}
              </div>
              {sections.chemo && (
                <>
                  <ProtocolGridTable
                    columns={["#", "MEDICATION *", "BRAND", "DOSE CALC", "DOSE", "UNIT", "PATIENT DOSE", "UNIT", "ADMIN NOTES", "TOXICITY", "REMARKS", "ACTIONS"]}
                    template="44px 1.8fr 1.2fr 1.1fr 0.7fr 1.2fr 0.7fr 1.0fr 1.4fr 0.9fr 0.9fr 40px"
                    addLabel="+ Add Row"
                    onAdd={addChemoPlan}
                    disabled={disabled}
                    rows={chemoPlans.map((row, idx) => [
                      idx + 1,
                      <FormProtocolDropdown
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
                      <input
                        key="b"
                        type="text"
                        value={row.brandName ?? ""}
                        onChange={(e) => {
                          const n = [...chemoPlans];
                          n[idx].brandName = e.target.value;
                          setChemoPlans(n);
                        }}
                        className={ptInput}
                        placeholder="Brand name"
                        disabled={disabled}
                      />,
                      <FormProtocolDropdown
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
                        placeholder="8"
                        disabled={disabled}
                      />,
                      <FormProtocolDropdown
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
                        placeholder="8"
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
            <div className={cardCls + " mb-5"}>
              <div
                className="flex items-center justify-between px-6 py-[17px] cursor-pointer hover:bg-[#f8f9fb] transition-colors"
                onClick={() => toggleSection("supportive")}
              >
                <div className="flex items-center gap-2.5 text-[13.5px] font-bold text-[#17212e]">
                  <ShieldPlus className="w-4 h-4 text-[#2f8f5b]" /> Supportive Care
                </div>
                {sections.supportive ? <ChevronUp className="w-4 h-4 text-[#8a97a6]" /> : <ChevronDown className="w-4 h-4 text-[#8a97a6]" />}
              </div>
              {sections.supportive && (
                <>
                  <ProtocolGridTable
                    columns={["#", "SUPPORTIVE MEDICINE *", "BRAND", "ADMIN NOTES", "REMARKS", "ACTIONS"]}
                    template="44px 2fr 1.2fr 1.5fr 1.5fr 40px"
                    addLabel="+ Add Row"
                    onAdd={addSupportive}
                    disabled={disabled}
                    rows={supportive.map((row, idx) => [
                      idx + 1,
                      <FormProtocolDropdown
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
                        key="b"
                        type="text"
                        value={row.brandName ?? ""}
                        onChange={(e) => {
                          const n = [...supportive];
                          n[idx].brandName = e.target.value;
                          setSupportive(n);
                        }}
                        className={ptInput}
                        placeholder="Brand name"
                        disabled={disabled}
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
            <div className={cardCls + " mb-5"}>
              <div
                className="flex items-center justify-between px-6 py-[17px] cursor-pointer hover:bg-[#f8f9fb] transition-colors"
                onClick={() => toggleSection("dilution")}
              >
                <div className="flex items-center gap-2.5 text-[13.5px] font-bold text-[#17212e]">
                  <FlaskConical className="w-4 h-4 text-[#c9822f]" /> Dilution Details
                </div>
                {sections.dilution ? <ChevronUp className="w-4 h-4 text-[#8a97a6]" /> : <ChevronDown className="w-4 h-4 text-[#8a97a6]" />}
              </div>
              {sections.dilution && (
                <>
                  <ProtocolGridTable
                    columns={["#", "MEDICATION", "BRAND", "FORM", "DOSE", "DOSE UNIT", "DILUTION VOLUME", "VOLUME UNIT", "DILUENT", "ACTIONS"]}
                    template="44px 1.8fr 1.2fr 1.1fr 0.8fr 1.1fr 1fr 1.1fr 1.5fr 40px"
                    addLabel="+ Add Row"
                    onAdd={addDilution}
                    disabled={disabled}
                    rows={dilution.map((row, idx) => [
                      idx + 1,
                      <FormProtocolDropdown
                        key="m"
                        options={allAvailableDilutionMeds}
                        value={row.medication}
                        onValueChange={(v) => {
                          const n = [...dilution];
                          n[idx].medication = v;
                          setDilution(n);
                        }}
                        placeholder={loadingDilutionMeds ? "Loading medicines..." : "Select medicine"}
                        emptyMessage="No medicines found"
                        loading={loadingDilutionMeds}
                        disabled={disabled}
                        className="h-8"
                      />,
                      <input
                        key="b"
                        type="text"
                        value={row.brandName ?? ""}
                        onChange={(e) => {
                          const n = [...dilution];
                          n[idx].brandName = e.target.value;
                          setDilution(n);
                        }}
                        className={ptInput}
                        placeholder="Brand"
                        disabled={disabled}
                      />,
                      <FormProtocolDropdown
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
                      <FormProtocolDropdown
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
                      <FormProtocolDropdown
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
                      <FormProtocolDropdown
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
            <div className={cardCls + " mb-5"}>
              <div
                className="flex items-center justify-between px-6 py-[17px] cursor-pointer hover:bg-[#f8f9fb] transition-colors"
                onClick={() => toggleSection("post")}
              >
                <div className="flex items-center gap-2.5 text-[13.5px] font-bold text-[#c0374a]">
                  <ClipboardList className="w-4 h-4" /> Post-treatment Medications (On Discharge)
                </div>
                {sections.post ? <ChevronUp className="w-4 h-4 text-[#8a97a6]" /> : <ChevronDown className="w-4 h-4 text-[#8a97a6]" />}
              </div>
              {sections.post && (
                <>
                  <ProtocolGridTable
                    columns={["#", "FORM", "MEDICATION", "BRAND", "DOSE", "UNIT", "FREQUENCY", "INSTRUCTIONS", "DURATION", "DAYS", "REMARKS", "ACTIONS"]}
                    template="44px 85px 200px 130px 75px 70px 105px 140px 75px 120px 120px 60px"
                    addLabel="+ Add Row"
                    onAdd={addPost}
                    disabled={disabled}
                    addClassName="text-[#c0374a] hover:bg-[#fbecef]"
                    rows={post.map((row, idx) => {
                      const isDurationFilledWithNumber = /^\d+(\.\d+)?$/.test(String(row.duration ?? "").trim());
                      return [
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
                      <FormProtocolDropdown
                        key="m"
                        options={(dischargeMeds.length > 0 ? dischargeMeds : premedMeds).map((m) => ({ label: m.medicine_name, value: m.medicine_id }))}
                        value={row.medication}
                        onValueChange={(v) => {
                          const n = [...post];
                          n[idx].medication = v;
                          setPost(n);
                        }}
                        placeholder={loadingDischargeMeds ? "Loading medicines..." : "Select medicine"}
                        emptyMessage="No medicines found"
                        loading={loadingDischargeMeds}
                        disabled={disabled}
                        className="h-8"
                      />,
                      <input
                        key="b"
                        type="text"
                        value={row.brandName ?? ""}
                        onChange={(e) => {
                          const n = [...post];
                          n[idx].brandName = e.target.value;
                          setPost(n);
                        }}
                        className={ptInput}
                        placeholder="Brand"
                        disabled={disabled}
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
                        placeholder="Enter notes"
                        disabled={disabled}
                      />,
                      <input
                        key="dur"
                        type="text"
                        value={row.duration}
                        onChange={(e) => {
                          const n = [...post];
                          n[idx].duration = e.target.value;
                          setPost(n);
                        }}
                        className={ptInput}
                        placeholder="Duration"
                        disabled={disabled}
                      />,
                      <FormProtocolDropdown
                        key="days"
                        options={getDurationUnitOptions(row.duration, row.durationDays)}
                        value={getDurationUnitCode(row.durationDays)}
                        onValueChange={(v) => {
                          const n = [...post];
                          n[idx].durationDays = v;
                          setPost(n);
                        }}
                        placeholder={parseInt(String(row.duration ?? "").trim(), 10) === 1 ? "Day" : "Days"}
                        disabled={disabled || !isDurationFilledWithNumber}
                        className="h-8"
                      />, 
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
                    ];
                  })}
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
