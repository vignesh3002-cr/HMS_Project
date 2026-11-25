import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FlaskConical,
  Loader2,
  Pill,
  ShieldPlus,
  Syringe,
  Trash2,
  X,
} from "lucide-react";
import type { MedicineOption } from "@/api/chemotherapy.api";
import {
  inferDosingBasisForMedicine,
  convertUnit,
  convertMassToVolume,
  getRecommendedUnitsForDoseCalc,
} from "@/utils/chemoCalculations";
import { ProtocolSelect } from "./ProtocolSelect";
import {
  CLEAN_CLINICAL_UNITS,
  CLEAN_VOLUME_UNITS,
  DOSE_CALC_OPTIONS,
  PROTOCOL_FREQUENCY_OPTIONS,
  PROTOCOL_INSTRUCTION_OPTIONS,
  Req,
  drawerInputCls,
  drawerLabelCls,
  drawerTextareaCls,
  getDropdownOptions,
  getDurationUnitCode,
  getDurationUnitOptions,
  getFormDropdownOptions,
} from "./protocolCore";
import type {
  ChemoPlan,
  DilutionDetail,
  GenericCatalog,
  PostTreatment,
  Premed,
  ProtocolFieldOptions,
  SupportiveCare,
} from "./protocolCore";

export interface DrawerSectionState {
  section: "premeds" | "chemo" | "supportive" | "dilution" | "post";
  index: number;
}

export interface ProtocolDrawerProps {
  activeDrawer: DrawerSectionState | null;
  setActiveDrawer: Dispatch<SetStateAction<DrawerSectionState | null>>;
  disabled: boolean;
  premeds: Premed[];
  setPremeds: (list: Premed[]) => void;
  chemoPlans: ChemoPlan[];
  setChemoPlans: (list: ChemoPlan[]) => void;
  supportive: SupportiveCare[];
  setSupportive: (list: SupportiveCare[]) => void;
  dilution: DilutionDetail[];
  setDilution: (list: DilutionDetail[]) => void;
  post: PostTreatment[];
  setPost: (list: PostTreatment[]) => void;
  premedMeds: MedicineOption[];
  chemoMeds: MedicineOption[];
  supportiveMeds: MedicineOption[];
  dilutionMeds: MedicineOption[];
  dischargeMeds: MedicineOption[];
  loadingPremedMeds: boolean;
  loadingChemoMeds: boolean;
  loadingSupportiveMeds: boolean;
  loadingDilutionMeds: boolean;
  loadingDischargeMeds: boolean;
  fieldOptions: ProtocolFieldOptions;
  genericCatalog: GenericCatalog;
  getMedName: (medId: string | undefined, list: MedicineOption[]) => string;
  getDilutionMedName: (medId?: string) => string;
  getPostMedName: (medId?: string) => string;
  allAvailableDilutionMeds: { label: string; value: string }[];
  savingDrawer: boolean;
  onDone: (draftRow?: any) => void;
  onDelete: () => void;
  getActiveSectionItemsCount: () => number;
}

export function ProtocolDrawer({
  activeDrawer,
  setActiveDrawer,
  disabled,
  premeds,
  setPremeds,
  chemoPlans,
  setChemoPlans,
  supportive,
  setSupportive,
  dilution,
  setDilution,
  post,
  setPost,
  premedMeds,
  chemoMeds,
  supportiveMeds,
  dilutionMeds,
  dischargeMeds,
  loadingPremedMeds,
  loadingChemoMeds,
  loadingSupportiveMeds,
  loadingDilutionMeds,
  loadingDischargeMeds,
  fieldOptions,
  genericCatalog,
  getMedName,
  getDilutionMedName,
  getPostMedName,
  allAvailableDilutionMeds,
  savingDrawer,
  onDone,
  onDelete,
  getActiveSectionItemsCount,
}: ProtocolDrawerProps) {
  // Staging buffer: local copy of active row. Edits stay here until "Done / Save" is clicked.
  const [draftRow, setDraftRow] = useState<any>(null);
  const [postDrugCategory, setPostDrugCategory] = useState<"non-chemo" | "chemo">("non-chemo");
  const [availableClinicalUnits, setAvailableClinicalUnits] = useState<string[]>(CLEAN_CLINICAL_UNITS);

  const handleAddUnit = (newUnit: string) => {
    const trimmed = (newUnit || "").trim();
    if (!trimmed) return;
    setAvailableClinicalUnits((prev) => Array.from(new Set([...prev, trimmed])));
  };

  useEffect(() => {
    if (!activeDrawer) {
      setDraftRow(null);
      return;
    }
    const { section, index } = activeDrawer;
    let original: any = null;
    if (section === "premeds") original = premeds[index];
    else if (section === "chemo") original = chemoPlans[index];
    else if (section === "supportive") original = supportive[index];
    else if (section === "dilution") original = dilution[index];
    else if (section === "post") {
      original = post[index];
      // Auto-detect category of existing medicine if possible
      if (original?.medication) {
        if (chemoMeds.some((m) => m.medicine_id === original.medication)) {
          setPostDrugCategory("chemo");
        } else {
          setPostDrugCategory("non-chemo");
        }
      } else {
        setPostDrugCategory("non-chemo");
      }
    }

    setDraftRow(original ? { ...original } : null);
  }, [activeDrawer?.section, activeDrawer?.index]);

  if (!activeDrawer) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      aria-labelledby="slide-over-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop blur overlay */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={() => setActiveDrawer(null)}
      />

      <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
        <div className="w-screen max-w-md sm:max-w-lg bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold shrink-0">
                {activeDrawer.section === "premeds" && <Pill className="w-4 h-4 text-sky-600" />}
                {activeDrawer.section === "chemo" && <Syringe className="w-4 h-4 text-indigo-600" />}
                {activeDrawer.section === "supportive" && <ShieldPlus className="w-4 h-4 text-emerald-600" />}
                {activeDrawer.section === "dilution" && <FlaskConical className="w-4 h-4 text-amber-600" />}
                {activeDrawer.section === "post" && <ClipboardList className="w-4 h-4 text-rose-600" />}
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  {activeDrawer.section === "premeds" && "Edit Pre-medication Details"}
                  {activeDrawer.section === "chemo" && "Edit Chemotherapy Drug"}
                  {activeDrawer.section === "supportive" && "Edit Supportive Care"}
                  {activeDrawer.section === "dilution" && "Edit Dilution Details"}
                  {activeDrawer.section === "post" && "Edit Discharge Medication"}
                </h3>
                <p className="text-xs text-slate-500 truncate">
                  {activeDrawer.section === "premeds" && (premeds[activeDrawer.index]?.medicineName || getMedName(premeds[activeDrawer.index]?.medication, premedMeds) || `Row #${activeDrawer.index + 1}`)}
                  {activeDrawer.section === "chemo" && (chemoPlans[activeDrawer.index]?.medicineName || getMedName(chemoPlans[activeDrawer.index]?.medication, chemoMeds) || `Row #${activeDrawer.index + 1}`)}
                  {activeDrawer.section === "supportive" && (supportive[activeDrawer.index]?.medicineName || getMedName(supportive[activeDrawer.index]?.medication, supportiveMeds) || `Row #${activeDrawer.index + 1}`)}
                  {activeDrawer.section === "dilution" && (dilution[activeDrawer.index]?.medicineName || getDilutionMedName(dilution[activeDrawer.index]?.medication) || `Row #${activeDrawer.index + 1}`)}
                  {activeDrawer.section === "post" && (post[activeDrawer.index]?.medicineName || getPostMedName(post[activeDrawer.index]?.medication) || `Row #${activeDrawer.index + 1}`)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Stepper Navigation */}
              <div className="flex items-center gap-1 border border-slate-200 rounded-lg bg-white px-1 py-0.5 shadow-2xs">
                <button
                  type="button"
                  disabled={activeDrawer.index <= 0}
                  onClick={() => setActiveDrawer({ ...activeDrawer, index: activeDrawer.index - 1 })}
                  className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition"
                  title="Previous item"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-medium text-slate-500 px-1 font-mono">
                  {activeDrawer.index + 1} / {getActiveSectionItemsCount()}
                </span>
                <button
                  type="button"
                  disabled={activeDrawer.index >= getActiveSectionItemsCount() - 1}
                  onClick={() => setActiveDrawer({ ...activeDrawer, index: activeDrawer.index + 1 })}
                  className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition"
                  title="Next item"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setActiveDrawer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
                title="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Drawer Body - Scrollable Form Fields */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
            {/* PREMEDS FORM */}
            {activeDrawer.section === "premeds" && draftRow && (() => {
              const row = draftRow;
              return (
                <>
                  <div>
                    <label className={drawerLabelCls}>Drug Formulation</label>
                    <ProtocolSelect
                      options={getFormDropdownOptions(row.medication, row.form, premedMeds, genericCatalog)}
                      value={row.form}
                      allowCreate
                      onValueChange={(v) => {
                        setDraftRow((prev: any) => ({ ...prev, form: v }));
                      }}
                      placeholder="Select formulation"
                      emptyMessage="No forms found"
                      disabled={disabled}
                      className="h-9"
                    />
                  </div>

                  <div>
                    <label className={drawerLabelCls}>
                      Medication / Generic Name <Req />
                    </label>
                    <ProtocolSelect
                      editableChip
                      displayValue={row.medicineName || getMedName(row.medication, premedMeds)}
                      onEditValue={(text) => {
                        setDraftRow((prev: any) => ({
                          ...prev,
                          medicineName: text,
                          medication: text ? (prev?.medication || text) : "",
                        }));
                      }}
                      options={getDropdownOptions(premedMeds, row.medication, row.medicineName)}
                      value={row.medication}
                      allowCreate
                      onValueChange={(v) => {
                        if (!v) {
                          setDraftRow((prev: any) => ({
                            ...prev,
                            medication: "",
                            medicineName: "",
                          }));
                          return;
                        }
                        const med = premedMeds.find((m) => m.medicine_id === v);
                        const gid = med?.generic_id;
                        const availableForms = (gid && genericCatalog[gid]?.forms) || (med?.dosage_form ? [med.dosage_form] : []);
                        setDraftRow((prev: any) => {
                          let nextForm = prev?.form;
                          if (availableForms.length === 1 && !nextForm) {
                            nextForm = availableForms[0];
                          } else if (!nextForm && med?.dosage_form) {
                            nextForm = med.dosage_form;
                          }
                          return {
                            ...prev,
                            medication: v,
                            form: nextForm,
                            medicineName: med ? (med.generic_name || med.medicine_name) : (v || prev?.medicineName),
                          };
                        });
                      }}
                      placeholder={
                        loadingPremedMeds
                          ? "Loading premedications..."
                          : "Select or type generic medication"
                      }
                      emptyMessage="No premedications found"
                      loading={loadingPremedMeds}
                      disabled={disabled}
                      className="h-9"
                    />
                  </div>

                  <div>
                    <label className={drawerLabelCls}>Dosage & Unit</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={row.dose ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraftRow((prev: any) => ({ ...prev, dose: val }));
                        }}
                        placeholder="e.g. 4"
                        className={drawerInputCls}
                        disabled={disabled}
                      />
                      <ProtocolSelect
                        options={Array.from(new Set([...availableClinicalUnits, row.unit].filter(Boolean)))}
                        value={row.unit}
                        allowCreate
                        onValueChange={(v) => {
                          handleAddUnit(v);
                          setDraftRow((prev: any) => ({ ...prev, unit: v }));
                        }}
                        placeholder="Unit"
                        emptyMessage="No units found"
                        disabled={disabled}
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={drawerLabelCls}>Admin Notes</label>
                    <textarea
                      rows={3}
                      value={row.adminNotes || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDraftRow((prev: any) => ({ ...prev, adminNotes: val }));
                      }}
                      placeholder="e.g. Administer slow IV push over 3-5 mins in 50ml NS"
                      className={drawerTextareaCls}
                      disabled={disabled}
                    />
                  </div>

                  <div>
                    <label className={drawerLabelCls}>Clinical Remarks</label>
                    <textarea
                      rows={2}
                      value={row.remarks || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDraftRow((prev: any) => ({ ...prev, remarks: val }));
                      }}
                      placeholder="e.g. Pre-chemo antiemetic protocol"
                      className={drawerTextareaCls}
                      disabled={disabled}
                    />
                  </div>
                </>
              );
            })()}

            {/* CHEMOTHERAPY FORM */}
            {activeDrawer.section === "chemo" && draftRow && (() => {
              const row = draftRow;
              const isAUC = row.doseCalc?.includes("AUC");
              // Extract current AUC target number if present in doseCalc, e.g. "AUC (5)" -> "5"
              const aucMatch = (row.doseCalc || "").match(/AUC\s*\(?([\d.]+)\)?/i);
              const currentAucValue = aucMatch ? aucMatch[1] : (isAUC ? row.dose || "" : "");

              // For non-AUC: unit derives from doseCalc; for AUC, protocol dose unit is usually mg or flat
              const currentUnit = isAUC
                ? (row.unit === "AUC" ? "mg" : row.unit || "mg")
                : (row.unit || (row.doseCalc?.includes("mg/m²") ? "mg/m²" : row.doseCalc?.includes("mg/kg") ? "mg/kg" : "mg"));

              const aucDisplayLabel = currentAucValue ? `AUC (${currentAucValue})` : "AUC (Calvert Formula)";
              const currentDoseCalcDisplay = isAUC ? aucDisplayLabel : row.doseCalc;

              const dynamicDoseCalcOptions = DOSE_CALC_OPTIONS.map((opt) =>
                opt.includes("AUC") && currentAucValue ? `AUC (${currentAucValue})` : opt
              );

              return (
                <>
                  <div>
                    <label className={drawerLabelCls}>Drug Formulation</label>
                    <ProtocolSelect
                      options={getFormDropdownOptions(row.medication, row.form, chemoMeds, genericCatalog)}
                      value={row.form}
                      allowCreate
                      onValueChange={(v) => {
                        setDraftRow((prev: any) => ({ ...prev, form: v }));
                      }}
                      placeholder="Select form"
                      emptyMessage="No forms found"
                      disabled={disabled}
                      className="h-9"
                    />
                  </div>

                  <div>
                    <label className={drawerLabelCls}>
                      Chemotherapy Medicine (Generic Name) <Req />
                    </label>
                    <ProtocolSelect
                      editableChip
                      displayValue={row.medicineName || getMedName(row.medication, chemoMeds)}
                      onEditValue={(text) => {
                        setDraftRow((prev: any) => ({
                          ...prev,
                          medicineName: text,
                          medication: text ? (prev?.medication || text) : "",
                        }));
                      }}
                      options={getDropdownOptions(chemoMeds, row.medication, row.medicineName)}
                      value={row.medication}
                      allowCreate
                      onValueChange={(v) => {
                        if (!v) {
                          setDraftRow((prev: any) => ({
                            ...prev,
                            medication: "",
                            medicineName: "",
                          }));
                          return;
                        }
                        const medObj = chemoMeds.find((m) => m.medicine_id === v);
                        const gid = medObj?.generic_id;
                        const availableForms = (gid && genericCatalog[gid]?.forms) || (medObj?.dosage_form ? [medObj.dosage_form] : []);
                        setDraftRow((prev: any) => {
                          let nextDoseCalc = prev?.doseCalc;
                          let nextUnit = prev?.unit;
                          if (medObj && !nextDoseCalc) {
                            const inferred = inferDosingBasisForMedicine(medObj.medicine_name);
                            if (inferred === "AUC") {
                              nextDoseCalc = "AUC (Calvert Formula)";
                              nextUnit = "mg";
                            } else if (inferred === "Weight") {
                              nextDoseCalc = "Weight (mg/kg)";
                              nextUnit = "mg/kg";
                            } else {
                              nextDoseCalc = "BSA (mg/m²)";
                              nextUnit = "mg/m²";
                            }
                          }
                          let nextForm = prev?.form;
                          if (availableForms.length === 1 && !nextForm) {
                            nextForm = availableForms[0];
                          } else if (!nextForm && medObj?.dosage_form) {
                            nextForm = medObj.dosage_form;
                          }
                          return {
                            ...prev,
                            medication: v,
                            doseCalc: nextDoseCalc,
                            unit: nextUnit,
                            form: nextForm,
                            medicineName: medObj ? (medObj.generic_name || medObj.medicine_name) : (v || prev?.medicineName),
                          };
                        });
                      }}
                      placeholder={
                        loadingChemoMeds
                          ? "Loading chemo drugs..."
                          : "Select or type chemo generic drug"
                      }
                      emptyMessage="No chemo medicines found"
                      loading={loadingChemoMeds}
                      disabled={disabled}
                      className="h-9"
                    />
                  </div>

                  <div>
                    <label className={drawerLabelCls}>Dose Calculation Basis</label>
                    <ProtocolSelect
                      options={dynamicDoseCalcOptions}
                      value={currentDoseCalcDisplay}
                      onValueChange={(v) => {
                        const recommended = getRecommendedUnitsForDoseCalc(v);
                        const isNewAUC = v.includes("AUC");
                        const canonicalBasis = isNewAUC
                          ? (currentAucValue ? `AUC (${currentAucValue})` : "AUC (Calvert Formula)")
                          : v;

                        setDraftRow((prev: any) => ({
                          ...prev,
                          doseCalc: canonicalBasis,
                          unit: isNewAUC ? "mg" : (recommended.unit || (v.includes("mg/m²") ? "mg/m²" : v.includes("mg/kg") ? "mg/kg" : "mg")),
                        }));
                      }}
                      placeholder="Select dose calc"
                      disabled={disabled}
                      className="h-9"
                    />
                  </div>

                  {/* Dedicated Target AUC input field when AUC is chosen */}
                  {isAUC && (
                    <div>
                      <label className={drawerLabelCls}>
                        Target AUC (Calvert Formula Value) <Req />
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={currentAucValue}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraftRow((prev: any) => ({
                              ...prev,
                              doseCalc: val ? `AUC (${val})` : "AUC (Calvert Formula)",
                            }));
                          }}
                          placeholder="e.g. 5 (Enter Target AUC)"
                          className={`${drawerInputCls} pr-16 border-indigo-300 focus:border-indigo-600`}
                          disabled={disabled}
                        />
                        <div className="absolute right-2 px-2.5 py-1 rounded bg-indigo-100 text-indigo-700 text-[11px] font-bold tracking-wide pointer-events-none select-none">
                          AUC
                        </div>
                      </div>
                      <div className="mt-1.5 p-2 rounded bg-indigo-50/70 border border-indigo-100 text-[11px] text-indigo-900 space-y-0.5">
                        <p className="font-semibold text-indigo-950">
                          Formula: Calvert Dose = Target AUC × (GFR + 25) mg
                        </p>
                        <p className="text-slate-600">
                          {currentAucValue
                            ? `Target AUC = ${currentAucValue}: Patient dose will be dynamically calculated as ${currentAucValue} × (GFR + 25) mg.`
                            : "Enter a numerical Target AUC (e.g. 2, 4, 5, 6) here."}
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className={drawerLabelCls}>
                      {isAUC ? "Standard / Protocol Dose (Optional Flat/Ref)" : "Protocol Dose"}
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={row.dose ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraftRow((prev: any) => ({
                            ...prev,
                            dose: val,
                          }));
                        }}
                        placeholder={isAUC ? "e.g. baseline mg (or leave blank)" : "e.g. 85"}
                        className={`${drawerInputCls} pr-20`}
                        disabled={disabled}
                      />
                      <div className="absolute right-2 px-2.5 py-1 rounded bg-slate-200/80 text-slate-700 text-[11px] font-semibold tracking-wide pointer-events-none select-none">
                        {currentUnit}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={drawerLabelCls}>Admin Notes</label>
                    <textarea
                      rows={3}
                      value={row.adminNotes || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDraftRow((prev: any) => ({ ...prev, adminNotes: val }));
                      }}
                      placeholder="e.g. Infuse over 2 hours in 500ml D5W. Protect from light."
                      className={drawerTextareaCls}
                      disabled={disabled}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={drawerLabelCls}>Previous Toxicity</label>
                      <input
                        type="text"
                        value={row.toxicity || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraftRow((prev: any) => ({ ...prev, toxicity: val }));
                        }}
                        placeholder="e.g. Neuropathy grade 1"
                        className={drawerInputCls}
                        disabled={disabled}
                      />
                    </div>
                    <div>
                      <label className={drawerLabelCls}>Clinical Remarks</label>
                      <input
                        type="text"
                        value={row.remarks || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraftRow((prev: any) => ({ ...prev, remarks: val }));
                        }}
                        placeholder="Remarks"
                        className={drawerInputCls}
                        disabled={disabled}
                      />
                    </div>
                  </div>
                </>
              );
            })()}

            {/* SUPPORTIVE CARE FORM */}
            {activeDrawer.section === "supportive" && draftRow && (() => {
              const row = draftRow;
              return (
                <>
                  <div>
                    <label className={drawerLabelCls}>Drug Formulation</label>
                    <ProtocolSelect
                      options={getFormDropdownOptions(row.medication, row.form, supportiveMeds, genericCatalog)}
                      value={row.form}
                      allowCreate
                      onValueChange={(v) => {
                        setDraftRow((prev: any) => ({ ...prev, form: v }));
                      }}
                      placeholder="Select form"
                      emptyMessage="No forms found"
                      disabled={disabled}
                      className="h-9"
                    />
                  </div>

                  <div>
                    <label className={drawerLabelCls}>
                      Supportive Medicine (Generic Name) <Req />
                    </label>
                    <ProtocolSelect
                      editableChip
                      displayValue={row.medicineName || getMedName(row.medication, supportiveMeds)}
                      onEditValue={(text) => {
                        setDraftRow((prev: any) => ({
                          ...prev,
                          medicineName: text,
                          medication: text ? (prev?.medication || text) : "",
                        }));
                      }}
                      options={getDropdownOptions(supportiveMeds, row.medication, row.medicineName)}
                      value={row.medication}
                      allowCreate
                      onValueChange={(v) => {
                        if (!v) {
                          setDraftRow((prev: any) => ({
                            ...prev,
                            medication: "",
                            medicineName: "",
                          }));
                          return;
                        }
                        const med = supportiveMeds.find((m) => m.medicine_id === v);
                        const gid = med?.generic_id;
                        const availableForms = (gid && genericCatalog[gid]?.forms) || (med?.dosage_form ? [med.dosage_form] : []);
                        setDraftRow((prev: any) => {
                          let nextForm = prev?.form;
                          if (availableForms.length === 1 && !nextForm) {
                            nextForm = availableForms[0];
                          } else if (!nextForm && med?.dosage_form) {
                            nextForm = med.dosage_form;
                          }
                          return {
                            ...prev,
                            medication: v,
                            form: nextForm,
                            medicineName: med ? (med.generic_name || med.medicine_name) : (v || prev?.medicineName),
                          };
                        });
                      }}
                      placeholder={
                        loadingSupportiveMeds
                          ? "Loading supportive drugs..."
                          : "Select or type supportive drug (Generic)"
                      }
                      emptyMessage="No supportive medicines found"
                      loading={loadingSupportiveMeds}
                      disabled={disabled}
                      className="h-9"
                    />
                  </div>

                  <div>
                    <label className={drawerLabelCls}>Dosage & Unit</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={row.dose ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraftRow((prev: any) => ({ ...prev, dose: val }));
                        }}
                        placeholder="e.g. 4"
                        className={drawerInputCls}
                        disabled={disabled}
                      />
                      <ProtocolSelect
                        options={Array.from(new Set([...availableClinicalUnits, row.unit].filter(Boolean)))}
                        value={row.unit ?? ""}
                        allowCreate
                        onValueChange={(v) => {
                          handleAddUnit(v);
                          setDraftRow((prev: any) => ({ ...prev, unit: v }));
                        }}
                        placeholder="Unit"
                        emptyMessage="No units found"
                        disabled={disabled}
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={drawerLabelCls}>Admin Notes</label>
                    <textarea
                      rows={3}
                      value={row.adminNotes || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDraftRow((prev: any) => ({ ...prev, adminNotes: val }));
                      }}
                      placeholder="e.g. Take with food or as directed"
                      className={drawerTextareaCls}
                      disabled={disabled}
                    />
                  </div>

                  <div>
                    <label className={drawerLabelCls}>Clinical Remarks</label>
                    <textarea
                      rows={2}
                      value={row.remarks || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDraftRow((prev: any) => ({ ...prev, remarks: val }));
                      }}
                      placeholder="Clinical remarks"
                      className={drawerTextareaCls}
                      disabled={disabled}
                    />
                  </div>
                </>
              );
            })()}

            {/* DILUTION FORM */}
            {activeDrawer.section === "dilution" && draftRow && (() => {
              const row = draftRow;
              return (
                <>
                  <div>
                    <label className={drawerLabelCls}>Drug Formulation</label>
                    <ProtocolSelect
                      options={getFormDropdownOptions(row.medication, row.form, dilutionMeds, genericCatalog)}
                      value={row.form}
                      allowCreate
                      onValueChange={(v) => {
                        setDraftRow((prev: any) => ({ ...prev, form: v }));
                      }}
                      placeholder="Select form"
                      emptyMessage="No forms found"
                      disabled={disabled}
                      className="h-9"
                    />
                  </div>

                  <div>
                    <label className={drawerLabelCls}>Medication / Generic Name</label>
                    <ProtocolSelect
                      editableChip
                      displayValue={row.medicineName || getDilutionMedName(row.medication)}
                      onEditValue={(text) => {
                        setDraftRow((prev: any) => ({
                          ...prev,
                          medicineName: text,
                          medication: text ? (prev?.medication || text) : "",
                        }));
                      }}
                      options={allAvailableDilutionMeds}
                      value={row.medication}
                      allowCreate
                      onValueChange={(v) => {
                        if (!v) {
                          setDraftRow((prev: any) => ({
                            ...prev,
                            medication: "",
                            medicineName: "",
                          }));
                          return;
                        }
                        const med = dilutionMeds.find((m) => m.medicine_id === v) || chemoMeds.find((m) => m.medicine_id === v) || premedMeds.find((m) => m.medicine_id === v);
                        const gid = med?.generic_id;
                        const availableForms = (gid && genericCatalog[gid]?.forms) || (med?.dosage_form ? [med.dosage_form] : []);
                        setDraftRow((prev: any) => {
                          let nextForm = prev?.form;
                          if (availableForms.length === 1 && !nextForm) {
                            nextForm = availableForms[0];
                          } else if (!nextForm && med?.dosage_form) {
                            nextForm = med.dosage_form;
                          }
                          return {
                            ...prev,
                            medication: v,
                            form: nextForm,
                            medicineName: med ? (med.generic_name || med.medicine_name) : (v || prev?.medicineName),
                          };
                        });
                      }}
                      placeholder={loadingDilutionMeds ? "Loading medicines..." : "Select medicine"}
                      emptyMessage="No medicines found"
                      loading={loadingDilutionMeds}
                      disabled={disabled}
                      className="h-9"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={drawerLabelCls}>Dose & Unit</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={row.dose ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            const numDose = parseFloat(val);
                            let calculatedVol = row.volume;
                            let volUnit = row.volumeUnit || "CC";
                            if (!isNaN(numDose) && numDose > 0 && row.unit) {
                              const vol = convertMassToVolume(numDose, row.unit, volUnit);
                              if (vol != null) {
                                calculatedVol = String(vol);
                              }
                            }
                            setDraftRow((prev: any) => ({
                              ...prev,
                              dose: val,
                              volume: calculatedVol,
                              volumeUnit: volUnit,
                            }));
                          }}
                          placeholder="e.g. 100"
                          className={drawerInputCls}
                          disabled={disabled}
                        />
                        <ProtocolSelect
                          options={Array.from(new Set([...availableClinicalUnits, row.unit].filter(Boolean)))}
                          value={row.unit}
                          allowCreate
                          onValueChange={(v) => {
                            handleAddUnit(v);
                            const oldUnit = row.unit;
                            const numDose = parseFloat(row.dose);
                            let nextDose = row.dose;
                            let calculatedVol = row.volume;
                            let volUnit = row.volumeUnit || "CC";

                            if (!isNaN(numDose) && numDose > 0) {
                              if (oldUnit && oldUnit !== v) {
                                const convertedDose = convertUnit(numDose, oldUnit, v);
                                if (convertedDose != null) {
                                  nextDose = String(convertedDose);
                                }
                              }
                              const cur = parseFloat(nextDose) || numDose;
                              const vol = convertMassToVolume(cur, v, volUnit);
                              if (vol != null) {
                                calculatedVol = String(vol);
                              }
                            }

                            setDraftRow((prev: any) => ({
                              ...prev,
                              unit: v,
                              dose: nextDose,
                              volume: calculatedVol,
                              volumeUnit: volUnit,
                            }));
                          }}
                          placeholder="Unit"
                          emptyMessage="No units found"
                          disabled={disabled}
                          className="h-9"
                        />
                      </div>
                    </div>

                    <div>
                      <label className={drawerLabelCls}>Dilution Volume & Unit</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={row.volume ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraftRow((prev: any) => ({ ...prev, volume: val }));
                          }}
                          placeholder="100"
                          className={drawerInputCls}
                          disabled={disabled}
                        />
                        <ProtocolSelect
                          options={Array.from(new Set([...CLEAN_VOLUME_UNITS, row.volumeUnit].filter(Boolean)))}
                          value={row.volumeUnit}
                          onValueChange={(v) => {
                            const oldVolUnit = row.volumeUnit;
                            const numVol = parseFloat(row.volume);
                            let nextVol = row.volume;
                            if (!isNaN(numVol) && numVol > 0 && oldVolUnit && oldVolUnit !== v) {
                              const convertedVol = convertUnit(numVol, oldVolUnit, v);
                              if (convertedVol != null) {
                                nextVol = String(convertedVol);
                              }
                            }
                            setDraftRow((prev: any) => ({
                              ...prev,
                              volumeUnit: v,
                              volume: nextVol,
                            }));
                          }}
                          placeholder="Unit"
                          emptyMessage="No units found"
                          disabled={disabled}
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={drawerLabelCls}>Diluent</label>
                    <ProtocolSelect
                      options={fieldOptions.diluents}
                      value={row.diluent}
                      onValueChange={(v) => {
                        setDraftRow((prev: any) => ({ ...prev, diluent: v }));
                      }}
                      placeholder="Select diluent"
                      emptyMessage="No diluents found"
                      disabled={disabled}
                      className="h-9"
                    />
                  </div>
                </>
              );
            })()}

            {/* POST-TREATMENT (DISCHARGE) FORM */}
            {activeDrawer.section === "post" && draftRow && (() => {
              const row = draftRow;
              const isDurationFilledWithNumber = /^\d+(\.\d+)?$/.test(String(row.duration ?? "").trim());

              // Non-chemo combines discharge, supportive, and premedication drugs
              const nonChemoMeds = (() => {
                const combined = [...(dischargeMeds || []), ...(supportiveMeds || []), ...(premedMeds || [])];
                const seen = new Set<string>();
                return combined.filter((m) => {
                  const id = m.medicine_id || m.medicine_name;
                  if (seen.has(id)) return false;
                  seen.add(id);
                  return true;
                });
              })();

              // Determine active medicine list based on selected category tab
              const currentPostMeds = postDrugCategory === "chemo" ? chemoMeds : nonChemoMeds;

              return (
                <>
                  {/* Category Filter Toggle Tabs (Strictly 2 buttons) */}
                  <div>
                    <label className={drawerLabelCls}>Filter Medication Category</label>
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setPostDrugCategory("non-chemo")}
                        className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold transition ${
                          postDrugCategory === "non-chemo"
                            ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Non-Chemo Drugs
                      </button>
                      <button
                        type="button"
                        onClick={() => setPostDrugCategory("chemo")}
                        className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold transition ${
                          postDrugCategory === "chemo"
                            ? "bg-white text-indigo-700 shadow-2xs border border-slate-200/80"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Chemo Drugs
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={drawerLabelCls}>Drug Formulation</label>
                    <ProtocolSelect
                      options={getFormDropdownOptions(row.medication, row.form, currentPostMeds, genericCatalog)}
                      value={row.form}
                      allowCreate
                      onValueChange={(v) => {
                        setDraftRow((prev: any) => ({ ...prev, form: v }));
                      }}
                      placeholder="Select form"
                      emptyMessage="No forms found"
                      disabled={disabled}
                      className="h-9"
                    />
                  </div>

                  <div>
                    <label className={drawerLabelCls}>
                      Medication / Generic Name (On Discharge) <Req />
                    </label>
                    <ProtocolSelect
                      editableChip
                      displayValue={row.medicineName || getPostMedName(row.medication)}
                      onEditValue={(text) => {
                        setDraftRow((prev: any) => ({
                          ...prev,
                          medicineName: text,
                          medication: text ? (prev?.medication || text) : "",
                        }));
                      }}
                      options={getDropdownOptions(currentPostMeds, row.medication, row.medicineName)}
                      value={row.medication}
                      allowCreate
                      onValueChange={(v) => {
                        if (!v) {
                          setDraftRow((prev: any) => ({
                            ...prev,
                            medication: "",
                            medicineName: "",
                          }));
                          return;
                        }
                        const med = currentPostMeds.find((m) => m.medicine_id === v);
                        const gid = med?.generic_id;
                        const availableForms = (gid && genericCatalog[gid]?.forms) || (med?.dosage_form ? [med.dosage_form] : []);
                        setDraftRow((prev: any) => {
                          let nextForm = prev?.form;
                          if (availableForms.length === 1 && !nextForm) {
                            nextForm = availableForms[0];
                          } else if (!nextForm && med?.dosage_form) {
                            nextForm = med.dosage_form;
                          }
                          return {
                            ...prev,
                            medication: v,
                            form: nextForm,
                            medicineName: med ? (med.generic_name || med.medicine_name) : (v || prev?.medicineName),
                          };
                        });
                      }}
                      placeholder={
                        loadingDischargeMeds
                          ? "Loading discharge drugs..."
                          : `Select or type ${postDrugCategory === "chemo" ? "chemo" : "general"} drug`
                      }
                      emptyMessage="No medicines found"
                      loading={loadingDischargeMeds || loadingChemoMeds || loadingSupportiveMeds}
                      disabled={disabled}
                      className="h-9"
                    />
                  </div>

                  <div>
                    <label className={drawerLabelCls}>Dose & Unit</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={row.dose ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraftRow((prev: any) => ({ ...prev, dose: val }));
                        }}
                        placeholder="e.g. 4"
                        className={drawerInputCls}
                        disabled={disabled}
                      />
                      <ProtocolSelect
                        options={Array.from(new Set([...availableClinicalUnits, row.unit].filter(Boolean)))}
                        value={row.unit}
                        allowCreate
                        onValueChange={(v) => {
                          handleAddUnit(v);
                          setDraftRow((prev: any) => ({ ...prev, unit: v }));
                        }}
                        placeholder="Unit"
                        emptyMessage="No units found"
                        disabled={disabled}
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={drawerLabelCls}>Frequency</label>
                      <ProtocolSelect
                        options={Array.from(new Set([...PROTOCOL_FREQUENCY_OPTIONS, row.frequency].filter(Boolean)))}
                        value={row.frequency}
                        allowCreate
                        onValueChange={(v) => {
                          setDraftRow((prev: any) => ({ ...prev, frequency: v }));
                        }}
                        placeholder="Select frequency"
                        emptyMessage="No frequency options"
                        disabled={disabled}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <label className={drawerLabelCls}>Duration</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={row.duration ?? ""}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^\d]/g, "");
                            setDraftRow((prev: any) => ({ ...prev, duration: val }));
                          }}
                          placeholder="e.g. 7"
                          className={drawerInputCls}
                          disabled={disabled}
                        />
                        <ProtocolSelect
                          options={getDurationUnitOptions(row.duration, row.durationDays)}
                          value={getDurationUnitCode(row.durationDays)}
                          onValueChange={(v) => {
                            setDraftRow((prev: any) => ({ ...prev, durationDays: v }));
                          }}
                          placeholder={parseInt(String(row.duration ?? "").trim(), 10) === 1 ? "Day" : "Days"}
                          disabled={disabled || !isDurationFilledWithNumber}
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={drawerLabelCls}>Administration Instructions</label>
                    <ProtocolSelect
                      options={Array.from(new Set([...PROTOCOL_INSTRUCTION_OPTIONS, row.instructions].filter(Boolean)))}
                      value={row.instructions}
                      allowCreate
                      onValueChange={(v) => {
                        setDraftRow((prev: any) => ({ ...prev, instructions: v }));
                      }}
                      placeholder="Select or type administration instructions"
                      emptyMessage="No instruction options"
                      disabled={disabled}
                      className="h-9"
                    />
                  </div>

                  <div>
                    <label className={drawerLabelCls}>Clinical Remarks</label>
                    <textarea
                      rows={2}
                      value={row.remarks || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDraftRow((prev: any) => ({ ...prev, remarks: val }));
                      }}
                      placeholder="Remarks"
                      className={drawerTextareaCls}
                      disabled={disabled}
                    />
                  </div>
                </>
              );
            })()}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
            <div>
              {!disabled && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Row</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveDrawer(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingDrawer}
                onClick={() => onDone(draftRow)}
                className="px-4 py-2 bg-[#12335c] text-white rounded-lg text-xs font-semibold hover:bg-[#0e2848] shadow-xs transition disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {savingDrawer && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Done / Save</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
