import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API, { getActiveBranchId } from "../../api/axios";
import { getUser } from "../../utils/token";
import {
  patientApi,
  type PatientRecord,
} from "../../api/patient.api";
import {
  encounterApi,
  type EncounterRecord,
} from "../../api/encounter.api";
import {
  labOrderItemApi,
  type LabOrderItemRecord,
} from "../../api/labOrder.api";
import {
  ALL_BRANCHES_VALUE,
  BranchFilterProvider,
  NO_BRANCH_VALUE,
  useBranchFilter,
} from "../../context/BranchFilterContext";
import { computeBsa } from "../../utils/vitals";
import { generatePrescriptionPdf, type PrescriptionData } from "../../utils/prescriptionPdf";
import { BellNotificationButton } from "@/components/hms/BellNotificationButton";
import {
  type PatientDocumentItem,
  loadPatientDocuments,
  savePatientDocument,
  deletePatientDocument,
  downloadDocument,
  downloadAllDocuments,
} from "../../utils/patientDocuments";

interface ConsultationState {
  patientId?: string;
  appointmentId?: string;
  branchId?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  consultedBy?: string;
}

type SummaryPlanItem = {
  chemotherapy_plan_item_id: string;
  drug_role: string | null;
  protocol_dose: number | null;
  protocol_dose_unit: string | null;
  calculated_dose?: number | string | null;
  calculated_dose_unit?: string | null;
  formulation: string | null;
  dilution_volume: string | null;
  administration_route: string | null;
  frequency: string | null;
  remarks: string | null;
  cycle_day?: number | null;
  administration_day?: number | null;
  medicine_master: {
    medicine_name: string;
    generic_name: string | null;
    dosage_form: string | null;
    unit: string | null;
  } | null;
};

type SummaryPlan = {
  chemotherapy_plan_id: string;
  patient_id: string;
  cancer_type: string | null;
  cancer_subtype: string | null;
  cancer_stage: string | null;
  protocol_name: string | null;
  regimen_name: string | null;
  regimen_code: string | null;
  source_protocol_id?: string | null;
  treatment_intent: string | null;
  treatment_goal: string | null;
  treatment_status: string | null;
  planned_cycles: number;
  completed_cycles: number | null;
  cycle_interval_days: number | null;
  treatment_start_date: string | null;
  expected_end_date: string | null;
  ecog_status?: number | string | null;
  karnofsky_score?: number | string | null;
  diagnosis_id?: string | null;
  staging_detail_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  employees?: {
    first_name?: string | null;
    last_name?: string | null;
  } | null;
  chemotherapy_cycle: {
    chemotherapy_cycle_id?: string;
    cycle_number: number;
    cycle_day?: number | null;
    planned_date?: string | null;
    actual_date?: string | null;
    next_cycle_date?: string | null;
    cycle_status?: string | null;
    completion_status?: string | null;
    remarks?: string | null;
  }[] | null;
  chemotherapy_plan_items: SummaryPlanItem[] | null;
  oncology_staging_detail: StagingDetailRecord | null;
};

/* ============================================================
   MEDICATION PORTAL COMPONENT
   (combined from client/pages/doctor/Medication.tsx —
    renamed HMSPatientPortal → MedicationPortal so it can live
    in this file, original Medication.tsx file left untouched)
============================================================ */

type Tab = "Order Summary" | "Medications" | "Discharge" | "History" | "Notes & Documents";

const tabs: Tab[] = [
  "Order Summary",
  "Medications",
  "Discharge",
  "History",
  "Notes & Documents",
];

function StatusBadge({ children, warning = false }: { children: React.ReactNode; warning?: boolean }) {
  return (
    <span className={`inline-flex rounded-md px-2.5 py-1 text-[10px] font-bold uppercase ${
      warning ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
    }`}>
      {children}
    </span>
  );
}

function SectionHeader({ icon, title, badge, badgeClass = "bg-blue-100 text-[#0052cc]" }: {
  icon: string; title: string; badge: string; badgeClass?: string;
}) {
  return (
    <div className="flex items-center border-b border-slate-100 bg-slate-50/50 px-6 py-4">
      <i className={`${icon} mr-3 text-sm text-slate-400`} />
      <h3 className="mr-3 text-lg font-bold text-slate-800">{title}</h3>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeClass}`}>{badge}</span>
    </div>
  );
}

const MedicationPortal: React.FC<{
  onBackToProfile?: () => void;
  patientName?: string;
  patientPhoto?: string;
  patientAgeSex?: string;
  patientDisplayId?: string;
  patientId?: string;
  plan?: SummaryPlan | null;
  allergies?: PatientAllergyRecord[];
  selectedCycle?: number;
  cycleMedicationsMap?: Record<string, any[]>;
}> = ({
  onBackToProfile,
  patientName = "",
  patientPhoto = "",
  patientAgeSex = "",
  patientDisplayId = "",
  patientId = "",
  plan = null,
  allergies = [],
  selectedCycle,
  cycleMedicationsMap,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>("Medications");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDischargeDashboard, setShowDischargeDashboard] = useState(false);

  /* Move to the next tab in the tabs array with a single click. */
  const goNextTab = () => {
    setActiveTab((current) => {
      const index = tabs.indexOf(current);
      const next = tabs[index + 1];
      if (!next) return current;
      if (next === "Order Summary") return current;
      if (next === "Discharge") {
        setShowDischargeDashboard(true);
        return current;
      }
      return next;
    });
  };

  /* Live patient vitals for the header strip (same source as the Order
     Summary portal: latest encounter + chemo-cycle fallback, per field). */
  const { vitalEntries } = useLatestPatientVitals(patientId);
  const headerVitals = (label: string) =>
    vitalEntries.find(([key]) => key === label)?.[1] || "—";

  /* Recent medication details for THIS selected patient, sourced from
      the fetched chemotherapy plan (GET /chemotherapy/plans?patient_id=). */
  const cycleId = plan?.chemotherapy_cycle?.find(c => c.cycle_number === selectedCycle)?.chemotherapy_cycle_id;
  const medPlanItems = cycleId && cycleMedicationsMap?.[cycleId]?.length
    ? cycleMedicationsMap[cycleId]
    : plan?.chemotherapy_plan_items ?? [];
  const medPremedications = medPlanItems.filter(
    (item) => (item.drug_role ?? "").toUpperCase() === "PREMEDICATION",
  );
  const medChemoDrugs = medPlanItems.filter(
    (item) => (item.drug_role ?? "").toUpperCase() === "PRIMARY",
  );
  const medSupportiveCount = medPlanItems.filter(
    (item) =>
      !["PREMEDICATION", "PRIMARY"].includes(
        (item.drug_role ?? "").toUpperCase(),
      ),
  ).length;
  const medAllergyNames = allergies
    .map((item) => item.allergy_master?.substance_name)
    .filter(Boolean)
    .join(", ");

  /* Currently running cycle of the fetched plan + its real start date. */
  const medFmtDate = (value?: string | null) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return `${String(d.getDate()).padStart(2, "0")}-${String(
      d.getMonth() + 1,
    ).padStart(2, "0")}-${d.getFullYear()}`;
  };
  const medCurrentCycleInfo = (() => {
    if (!plan?.treatment_start_date || !plan?.cycle_interval_days) return null;
    const start = new Date(plan.treatment_start_date);
    if (Number.isNaN(start.getTime())) return null;
    const interval = plan.cycle_interval_days || 1;
    const planned = plan.planned_cycles || 1;
    const daysElapsed = Math.floor(
      (Date.now() - start.getTime()) / 86400000,
    );
    let cycle = daysElapsed < 0 ? 1 : Math.floor(daysElapsed / interval) + 1;
    if (planned > 0 && cycle > planned) cycle = planned;
    const d = new Date(start);
    d.setDate(d.getDate() + (cycle - 1) * interval);
    return { cycle, date: medFmtDate(d.toISOString()) };
  })();

  /* Discharge medication table: REAL rows from
     GET /chemotherapy/regimen-protocols/:protocolId/discharge-medicines,
     resolved through the plan's source protocol. */
  const {
    rows: portalDischargeMeds,
    loading: portalDischargeMedsLoading,
    error: portalDischargeMedsError,
  } = useDischargeMedicines(plan?.source_protocol_id || "");

  if (showDischargeDashboard) {
    return (
      <DischargeDetailsPortal
        onBack={() => setShowDischargeDashboard(false)}
        patientId={patientId}
      />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <button
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
        />
      )}

     

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8">
          <div className="flex items-center gap-3">
            {onBackToProfile && (
              <button type="button" aria-label="Go back" onClick={onBackToProfile} className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-slate-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M19 12H5" />
                  <path d="m12 19-7-7 7-7" />
                </svg>
              </button>
            )}
            <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-slate-500 lg:hidden">
              <i className="fa-solid fa-bars" />
            </button>
            <button
              type="button"
              onClick={goNextTab}
              className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-100"
            >
              Next
              <i className="fa-solid fa-arrow-right text-xs" />
            </button>
           
          </div>
          <div className="flex items-center gap-5">
            <BellNotificationButton size="md" />
            <div className="flex items-center gap-2 border-l border-slate-200 pl-5">
              <span className="font-bold text-[#0052cc]">HMS</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-white">
                <i className="fa-solid fa-user text-xs" />
              </div>
            </div>
          </div>
        </header>

            <div className="flex-1 overflow-y-auto relative">
            <div className="p-8 max-w-[1400px] mx-auto pb-32">
            {/* BEGIN: Patient Header Card */}
            <div className="bg-white rounded-[16px] border border-[#e2e8f0] p-6 shadow-sm mb-6 flex justify-between items-center">
            <div className="flex items-center">
<img alt={patientName} className="w-20 h-20 rounded-full border-4 border-white shadow-sm object-cover" src={patientPhoto}/>
            <div className="ml-6">
            <div className="flex items-center space-x-3 mb-1">
<h2 className="text-xl font-bold text-[#1e293b]">{patientName}</h2>
<span className="bg-slate-100 text-[#64748b] px-3 py-1 rounded-full text-xs font-semibold">{patientDisplayId}</span>
            </div>
            <div className="text-sm text-[#64748b] flex items-center space-x-3">
<span>{patientAgeSex}</span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
<span className="text-[#1d4ed8] font-semibold">{[plan?.cancer_subtype || plan?.cancer_type, plan?.cancer_stage].filter(Boolean).join(" ") || "—"}</span>
            </div>
            </div>
            </div>
            <div className="flex items-center">
            <div className="flex space-x-8 px-8 border-r border-[#e2e8f0]">
            <div className="space-y-4">
            <div>
            <div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">HEIGHT</div>
            <div className="font-bold text-sm">{headerVitals("HEIGHT")}</div>
            </div>
            <div>
            <div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">BP</div>
            <div className="font-bold text-sm">{headerVitals("BP")}</div>
            </div>
            </div>
            <div className="space-y-4">
            <div>
            <div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">WEIGHT</div>
            <div className="font-bold text-sm">{headerVitals("WEIGHT")}</div>
            </div>
            <div>
            <div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">PULSE</div>
            <div className="font-bold text-sm">{headerVitals("PULSE")}</div>
            </div>
            </div>
            <div className="space-y-4">
            <div>
            <div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">BSA</div>
            <div className="font-bold text-sm">{headerVitals("BSA")}</div>
            </div>
            <div>
            <div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">TEMP</div>
            <div className="font-bold text-sm">{headerVitals("TEMP")}</div>
            </div>
            </div>
            <div className="space-y-4">
            <div>
            <div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">BMI</div>
            <div className="font-bold text-sm">{headerVitals("BMI")}</div>
            </div>
            <div>
            <div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">SPO2</div>
            <div className="font-bold text-sm">{headerVitals("SPO2")}</div>
            </div>
            </div>
            </div>
            <div className="pl-8">
            <div className="bg-blue-50/50 border border-blue-100 rounded-[12px] p-4 w-[220px]">
            <div className="text-[10px] font-bold text-[#1d4ed8] uppercase tracking-wider mb-1.5">INTENT: {plan?.treatment_intent || "—"}</div>
            <div className="text-[15px] font-bold text-[#1d4ed8] mb-2.5">{plan?.regimen_name || "—"}</div>
            <div className="flex items-center text-xs text-[#64748b] font-medium">
            <span className={`w-2 h-2 rounded-full mr-2 ${plan ? "bg-[#10b981]" : "bg-slate-300"}`}></span> {plan?.treatment_status || "No Plan"}
                    </div>
            </div>
            </div>
            </div>
            </div>
            {/* END: Patient Header Card */}

            {/* BEGIN: Alerts Banner */}
            <div className="flex items-center justify-between text-sm mb-8 border-b border-[#e2e8f0] pb-4">
            <div className="flex items-center space-x-8">
            <div className="flex items-center">
            <i className="fa-solid fa-triangle-exclamation text-[#ef4444] mr-2"></i>
            <span className="text-[#ef4444] font-semibold">Allergy:</span> <span className="ml-1 text-[#1e293b]">{medAllergyNames || "—"}</span>
            </div>
            <div className="flex items-center">
            <i className="fa-solid fa-clock-rotate-left text-[#f59e0b] mr-2"></i>
            <span className="text-[#f59e0b] font-semibold">Previous Cycle:</span> <span className="ml-1 text-[#1e293b]">{plan?.completed_cycles ? `Cycle ${plan.completed_cycles} completed` : "—"}</span>
            </div>
            </div>
            </div>
            {/* END: Alerts Banner */}

            {/* Tabs */}
            <div className="overflow-x-auto border-b border-slate-200">
              <nav className="flex min-w-max space-x-8">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      if (tab === "Order Summary") {
                        onBackToProfile?.();
                        return;
                      }
                      if (tab === "Discharge") {
                        setShowDischargeDashboard(true);
                        return;
                      }
                      setActiveTab(tab);
                    }}
                    className={`border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? "border-[#0052cc] text-[#0052cc]"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </nav>
            </div>

            {activeTab === "Medications" ? (
              <>
                {/* Summary cards */}
                <div className="grid gap-4 pt-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    ["TOTAL MEDS", String(medPlanItems.length), "fa-solid fa-pills", "bg-blue-50 text-[#0052cc]"],
                    ["PREMEDS", String(medPremedications.length), "fa-solid fa-syringe", "bg-purple-50 text-purple-600"],
                    ["CHEMO", String(medChemoDrugs.length), "fa-solid fa-hourglass-half", "bg-red-50 text-red-500"],
                    ["OTHER", String(medSupportiveCount), "fa-solid fa-heart-pulse", "bg-emerald-50 text-emerald-500"],
                  ].map(([label, value, icon, cls]) => (
                    <div key={label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                        <p className="text-2xl font-bold text-slate-800">{value}</p>
                      </div>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${cls}`}>
                        <i className={icon} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-col gap-6 lg:flex-row">
                  <div className="min-w-0 flex-1 space-y-6">
                    {/* Premeds */}
                    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      <SectionHeader icon="fa-solid fa-chevron-down" title="Premedications" badge={`${medPremedications.length} Prescribed`} />
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px] text-left text-sm">
                          <thead className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
                            <tr>
                              <th className="w-12 px-6 py-4 text-center font-semibold">#</th>
                              <th className="px-6 py-4 font-semibold">MEDICATION</th>
                              <th className="px-6 py-4 font-semibold">DOSE</th>
                              <th className="px-6 py-4 font-semibold">ROUTE</th>
                              <th className="px-6 py-4 font-semibold">TIMING</th>
                              <th className="px-6 py-4 text-center font-semibold">STATUS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {medPremedications.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-6 py-6 text-center text-xs text-slate-400">No premedications found for this patient.</td>
                              </tr>
                            ) : (
                              medPremedications.map((item, index) => (
                                <tr key={item.chemotherapy_plan_item_id} className="transition-colors hover:bg-slate-50">
                                  <td className="px-6 py-4 text-center text-slate-400">{index + 1}</td>
                                  <td className="px-6 py-4">
                                    <p className="font-bold text-slate-800">{item.medicine_master?.medicine_name ?? "—"}</p>
                                    {item.medicine_master?.generic_name && <p className="text-xs text-slate-500">{item.medicine_master.generic_name}</p>}
                                  </td>
                                  <td className="px-6 py-4 text-slate-700">{item.protocol_dose != null ? `${item.protocol_dose} ${item.protocol_dose_unit ?? ""}`.trim() : "—"}</td>
                                  <td className="px-6 py-4 text-slate-700">{item.administration_route ?? "—"}</td>
                                  <td className="px-6 py-4 text-slate-700">{item.frequency ?? item.remarks ?? "—"}</td>
                                  <td className="px-6 py-4 text-center"><StatusBadge>{item.drug_role || "PRESCRIBED"}</StatusBadge></td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </section>

                    {/* Chemo */}
                    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      <SectionHeader icon="fa-solid fa-chevron-down" title="Chemotherapy Drugs" badge={`${medChemoDrugs.length} Prescribed`} badgeClass="border border-red-100 bg-red-50 text-red-600" />
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[850px] text-left text-sm">
                          <thead className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
                            <tr>
                              <th className="w-12 px-6 py-4 text-center">#</th>
                              <th className="px-6 py-4">DRUG NAME</th>
                              <th className="px-6 py-4">CALC.<br />DOSE</th>
                              <th className="px-6 py-4">ACTUAL<br />DOSE</th>
                              <th className="px-6 py-4">ROUTE</th>
                              <th className="px-6 py-4">DILUENT</th>
                              <th className="px-6 py-4 text-center">STATUS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {medChemoDrugs.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="px-6 py-6 text-center text-xs text-slate-400">No chemotherapy drugs found for this patient.</td>
                              </tr>
                            ) : (
                              medChemoDrugs.map((item, index) => (
                                <tr key={item.chemotherapy_plan_item_id} className="transition-colors hover:bg-slate-50">
                                  <td className="px-6 py-4 text-center text-slate-400">{index + 1}</td>
                                  <td className="px-6 py-4"><span className="font-bold text-[#0052cc]">{item.medicine_master?.medicine_name ?? "—"}</span></td>
                                  <td className="px-6 py-4 text-xs text-slate-500">{item.protocol_dose != null ? `${item.protocol_dose}${item.protocol_dose_unit ? ` ${item.protocol_dose_unit}` : ""}` : "—"}</td>
                                  <td className="px-6 py-4 font-bold text-slate-800">{item.calculated_dose ?? item.protocol_dose ?? "—"}</td>
                                  <td className="px-6 py-4 text-slate-700">{item.administration_route ?? "—"}</td>
                                  <td className="px-6 py-4 text-xs text-slate-500">{item.dilution_volume ?? "—"}</td>
                                  <td className="px-6 py-4 text-center"><StatusBadge>{item.drug_role || "PLANNED"}</StatusBadge></td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </section>

                    {/* Discharge */}
                    <section className="mb-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      <SectionHeader icon="fa-solid fa-chevron-down" title="Discharge Medication" badge={`${portalDischargeMeds.length} Prescribed`} />
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[750px] text-left text-sm">
                          <thead className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
                            <tr>
                              <th className="w-12 px-6 py-4 text-center font-semibold">#</th>
                              <th className="px-6 py-4 font-semibold">MEDICATION</th>
                              <th className="px-6 py-4 font-semibold">DOSE</th>
                              <th className="px-6 py-4 font-semibold">FREQUENCY</th>
                              <th className="px-6 py-4 font-semibold">INSTRUCTION</th>
                              <th className="px-6 py-4 font-semibold">DURATION</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {portalDischargeMedsLoading ? (
                              <tr>
                                <td colSpan={6} className="px-6 py-6 text-center text-xs text-slate-400"><i className="fa-solid fa-circle-notch fa-spin mr-2" />Loading discharge medicines…</td>
                              </tr>
                            ) : portalDischargeMedsError ? (
                              <tr>
                                <td colSpan={6} className="px-6 py-6 text-center text-xs text-red-500"><i className="fa-solid fa-triangle-exclamation mr-2" />{portalDischargeMedsError}</td>
                              </tr>
                            ) : portalDischargeMeds.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-6 py-6 text-center text-xs text-slate-400">{plan?.source_protocol_id ? "No discharge medicines recorded on this patient's regimen protocol yet." : "No regimen protocol linked to this patient's plan yet."}</td>
                              </tr>
                            ) : (
                              portalDischargeMeds.map((item, index) => (
                                <tr key={item.discharge_instruction_id ?? `${item.protocol_id}-${item.drug_sequence ?? index}`} className="transition-colors hover:bg-slate-50">
                                  <td className="px-6 py-4 text-center text-slate-400">{index + 1}</td>
                                  <td className="px-6 py-4 font-bold text-slate-800">{item.medicine_master?.medicine_name ?? "—"}</td>
                                  <td className="px-6 py-4 text-slate-700">{item.patient_dose != null && item.patient_dose !== "" ? `${item.patient_dose} ${item.patient_dose_unit ?? item.medicine_master?.unit ?? ""}`.trim() : "—"}</td>
                                  <td className="px-6 py-4 text-slate-700">{item.frequency || "—"}</td>
                                  <td className="px-6 py-4 text-xs text-slate-500">{item.administration_detail || item.comment || "—"}</td>
                                  <td className="px-6 py-4 text-slate-700">{item.duration || "—"}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  </div>

                  {/* Right sidebar */}
                  <aside className="w-full shrink-0 space-y-6 lg:w-80">
                    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h3 className="mb-6 text-base font-bold text-slate-800">Next Appointment</h3>
                      <div className="mb-6 flex items-start">
                        <div className="mr-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0052cc]">
                          <i className="fa-regular fa-calendar text-xl" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-slate-800">{medCurrentCycleInfo?.date || "—"}</p>
                          <p className="mb-1 text-sm text-slate-500">—</p>
                          <p className="text-sm font-medium text-[#0052cc]">{medCurrentCycleInfo ? `Cycle ${medCurrentCycleInfo.cycle}` : "—"}</p>
                        </div>
                      </div>
                      <button className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
                        Reschedule
                      </button>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="mb-6 flex items-center">
                        <i className="fa-regular fa-clock mr-2 text-[#0052cc]" />
                        <h3 className="text-base font-bold text-slate-800">Medication Timeline</h3>
                      </div>
                      <div className="relative space-y-8 pl-4 before:absolute before:inset-y-0 before:left-5 before:w-px before:bg-slate-200">
                        <div className="relative">
                          <span className="absolute -left-6 top-1.5 h-2.5 w-2.5 rounded-full bg-slate-300 ring-4 ring-white" />
                          <p className="mb-0.5 text-sm font-bold text-slate-800">—</p>
                          <p className="text-sm text-slate-600">No medication administration records found for this patient yet.</p>
                        </div>
                      </div>
                    </section>
                  </aside>
                </div>
              </>
            ) : activeTab === "History" ? (
              <HistoryDashboard embedded patientId={patientId} initialPlan={plan} />
            ) : activeTab === "Notes & Documents" ? (
              <PatientNotesDocuments embedded patientId={patientId} />
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <i className="fa-solid fa-file-medical mb-4 text-3xl text-[#0052cc]" />
                <h3 className="text-lg font-bold text-slate-800">{activeTab}</h3>
                <p className="mt-2 text-sm text-slate-500">This section is ready for your HMS data.</p>
              </div>
            )}
            </div>
            </div>
      </main>
    </div>
  );
};

/* ============================================================
   PATIENT PROFILE PORTAL COMPONENT
   (combined from client/pages/doctor/profile patient .tsx —
    renamed MedicalPortalReplica → HMSPatientPortal to match the
    original file's component name, original file left untouched)
============================================================ */

interface ChemoMatchingProtocol {
  id?: string;
  protocol_id: string;
  regimen_code: string;
  regimen_name: string;
  treatment_intent?: string | null;
  standard_cycles?: number | null;
  cycle_interval_days?: number | null;
}

/* ============================================================
   FULL STAGING DETAIL RECORDS (GET /oncology/staging-details/:id)
   Every field the backend can return for the selected patient.
   ============================================================ */

interface StagingPatientBio {
  patient_id?: string;
  patient_first_name?: string | null;
  patient_last_name?: string | null;
  patient_dob?: string | null;
  patient_age?: number | string | null;
  patient_gender?: string | null;
}

interface StagingIhcRecord {
  ihc_id?: string;
  er_status?: string | null;
  er_percent?: number | null;
  pr_status?: string | null;
  pr_percent?: number | null;
  her2_ihc?: string | null;
  her2_fish?: string | null;
  her2_fish_ratio?: number | string | null;
  her2_avg_copy?: number | string | null;
  ki67_percent?: number | null;
  pdl1_tps?: number | null;
  pdl1_cps?: number | null;
  pdl1_clone?: string | null;
  mmr_mlh1?: string | null;
  mmr_msh2?: string | null;
  mmr_msh6?: string | null;
  mmr_pms2?: string | null;
  mmr_overall?: string | null;
  p53_ihc?: string | null;
  ar_status?: string | null;
  mlh1_methylation?: string | null;
}

interface StagingMolecularRecord {
  mol_id?: string;
  egfr_status?: string | null;
  egfr_mutation_type?: string | null;
  alk_status?: string | null;
  alk_test_method?: string | null;
  ros1_status?: string | null;
  kras_g12c?: string | null;
  kras_mutation?: string | null;
  braf_v600e?: string | null;
  brca1_germline?: string | null;
  brca2_germline?: string | null;
  brca_somatic?: string | null;
  hrd_status?: string | null;
  hrd_score?: number | string | null;
  hrd_assay?: string | null;
  msi_status?: string | null;
  msi_test_method?: string | null;
  tmb?: number | string | null;
  tmb_assay?: string | null;
  ngs_panel?: string | null;
  flt3_itd?: string | null;
  flt3_itd_allelic_ratio?: number | string | null;
  flt3_tkd?: string | null;
  npm1_mutation?: string | null;
  idh1_mutation?: string | null;
  idh2_mutation?: string | null;
  bcr_abl1?: number | string | null;
  bcr_abl1_transcript?: string | null;
}

interface StagingDerivedRecord {
  ajcc_stage?: string | null;
  breast_mol_subtype?: string | null;
  icd10_auto?: string | null;
  icd_o3_auto?: string | null;
  pdl1_score_type?: string | null;
  germline_referral_flag?: boolean | null;
  lynch_syndrome_flag?: boolean | null;
  eln_risk?: string | null;
  lymphoma_deauville?: number | null;
  tnbc_subtype?: string | null;
  suggested_therapy?: string | null;
  recommended_tests?: string | null;
}

interface StagingDetailRecord {
  id?: string;
  staging_detail_id?: string;
  patient_id?: string;
  diagnosis_id?: string | null;
  visit_date?: string | null;
  diagnosis_date?: string | null;
  biopsy_date?: string | null;
  consulting_oncologist?: string | null;
  icd10_code?: string | null;
  icd_o3_topo?: string | null;
  icd_o3_morpho?: string | null;
  staging_system?: string | null;
  clinical_stage?: string | null;
  t_stage?: string | null;
  n_stage?: string | null;
  m_stage?: string | null;
  metastasis_sites?: unknown;
  laterality?: string | null;
  performance_status?: number | null;
  employee_id?: string | null;
  branch_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  cancer_types?: { cancer_type?: string | null } | null;
  cancer_subtypes?: { subtype_name?: string | null } | null;
  ihc_results?: StagingIhcRecord | null;
  molecular_results?: StagingMolecularRecord | null;
  derived_fields?: StagingDerivedRecord | null;
  patient_bio_data?: StagingPatientBio | null;
  employees?: {
    first_name?: string | null;
    last_name?: string | null;
  } | null;
  her2_positive?: boolean | null;
}

interface PatientAllergyRecord {
  id: string;
  allergy_id: string;
  reaction: string | null;
  severity: string | null;
  status: string | null;
  allergy_master?: {
    substance_name?: string | null;
    substance_type?: string | null;
    severity_level?: string | null;
  } | null;
}

interface ChemotherapyVitalsRecord {
  height?: string | number | null;
  weight?: string | number | null;
  blood_pressure_systolic?: number | null;
  blood_pressure_diastolic?: number | null;
  pulse_rate?: number | null;
  body_temperature?: string | number | null;
  body_surface_area?: string | number | null;
  bmi?: string | number | null;
  spo2?: number | null;
}

interface ChemotherapyAdverseEventRecord {
  adverse_event_name?: string | null;
  ctcae_grade?: number | string | null;
  event_date?: string | null;
}

interface ChemotherapyCycleRecord {
  chemotherapy_cycle_id: string;
  cycle_number?: number | null;
  chemotherapy_vitals?: ChemotherapyVitalsRecord[];
  chemotherapy_adverse_event?: ChemotherapyAdverseEventRecord[];
}

interface SavedPlanSummary {
  chemotherapy_plan_id: string;
  regimen_name?: string | null;
  treatment_intent?: string | null;
}

interface ChemoPlanPreview {
  staging_detail_id: string;
  patient_id: string;
  cancer_type: string | null;
  cancer_subtype: string | null;
  clinical_stage: string | null;
  suggested_therapy: string | null;
  breast_mol_subtype: string | null;
  germline_referral_flag: boolean;
  matching_protocols: ChemoMatchingProtocol[];
}

/* ============================================================
   LATEST PLAN PREVIEW LOADER
   Resolves the selected patient's most recent staging detail
   (GET /oncology/staging-details, newest first) and then loads
   GET /chemotherapy/plans/preview?staging_detail_id=<latest>
   - the same chain the Order Summary panels render.

   The staging list endpoint FILTERS by the branchId query param
   but only AUTHORIZATES via the x-branch-id header. So when the
   active branch selection points somewhere else than where the
   diagnosis was saved - or nothing is selected at all - the
   strict call returns empty/403 even though data exists. Retry
   without the filter before giving up.
   ============================================================ */

const loadLatestPlanPreview = async (
  patientId: string
): Promise<{
  preview: ChemoPlanPreview | null;
  staging: StagingDetailRecord | null;
  error: string;
}> => {
  const branchId = getActiveBranchId() ?? getUser()?.branch_id ?? undefined;

  const stagingAttempts: { params: Record<string, unknown> }[] = [
    { params: { patient_id: patientId, limit: 1, branchId } },
    { params: { patient_id: patientId, limit: 1 } },
  ];

  let lastError =
    "No staging details found for this patient yet. Complete the Diagnosis step to populate the Order Summary.";

  for (const attempt of stagingAttempts) {
    let stagingDetailId = "";

    try {
      const stagingResponse = await API.get<{
        success: boolean;
        data: { staging_detail_id: string }[];
      }>("/oncology/staging-details", attempt);
      stagingDetailId =
        stagingResponse.data?.data?.[0]?.staging_detail_id ?? "";
    } catch (error: any) {
      lastError =
        error?.response?.data?.message ||
        error?.message ||
        lastError;
      continue;
    }

    if (!stagingDetailId) continue;

    // Full record - every saved field (TNM, ICD codes, dates, IHC,
    // molecular results, derived fields, patient bio, oncologist).
    let fullStaging: StagingDetailRecord | null = null;
    try {
      const detailResponse = await API.get<{
        success: boolean;
        data: StagingDetailRecord;
      }>(`/oncology/staging-details/${encodeURIComponent(stagingDetailId)}`);
      fullStaging = detailResponse.data?.data ?? null;
    } catch {
      // The summary preview below still renders without it.
    }

    try {
      const previewResponse = await API.get<{
        success: boolean;
        data: ChemoPlanPreview;
      }>("/chemotherapy/plans/preview", {
        params: { staging_detail_id: stagingDetailId },
      });

      const preview = previewResponse.data?.data ?? null;

      // Only accept preview data for THIS selected patient.
      if (preview && preview.patient_id && preview.patient_id !== patientId) {
        return {
          preview: null,
          staging: null,
          error:
            "Saved diagnosis belongs to a different patient. Re-save the Diagnosis step for this patient.",
        };
      }

      const staging =
        fullStaging && fullStaging.patient_id === patientId
          ? fullStaging
          : null;

      return { preview, staging, error: "" };
    } catch (error: any) {
      return {
        preview: null,
        staging: null,
        error:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to load chemotherapy plan preview.",
      };
    }
  }

  return { preview: null, staging: null, error: lastError };
};

/* ============================================================
   SHARED REAL-DATA LOADERS (used by the History / Discharge /
   Notes & Documents tabs so every table shows live records)

   - loadLatestChemoPlan: GET /chemotherapy/plans?patient_id=
     (branch filter first, retry without it - same fallback as
     the Order Summary loader above).
   - loadCycleDetail: GET /chemotherapy/cycles/:id - returns a
     cycle WITH its recorded chemotherapy_vitals and
     chemotherapy_adverse_event rows.
   ============================================================ */

const loadLatestChemoPlan = async (
  patientId: string
): Promise<SummaryPlan | null> => {
  /* Mapping-scoped endpoint (GET /plans/latest-for-patient): access is
     resolved from the caller's ACTIVE user_branch_mapping on the
     backend (like /encounters/latest), so this works with or without
     a branch selection and never 403s multi-branch staff. */
  const response = await API.get<{
    success: boolean;
    data: SummaryPlan | null;
  }>("/chemotherapy/plans/latest-for-patient", {
    params: { patient_id: patientId },
  });
  return response.data?.data ?? null;
};

interface ChemoVitalsEntry extends ChemotherapyVitalsRecord {
  vital_id?: string;
  recorded_at?: string | null;
  vital_stage?: string | null;
  oxygen_support?: boolean | null;
}

interface ChemoAdverseEventEntry extends ChemotherapyAdverseEventRecord {
  adverse_event_id?: string;
  reaction_grade?: string | null;
  severity?: string | null;
  doctor_action?: string | null;
  nursing_action?: string | null;
  dose_reduced?: boolean | null;
  dose_delayed?: boolean | null;
  treatment_interrupted?: boolean | null;
  treatment_stopped?: boolean | null;
  hospitalization_required?: boolean | null;
}

interface ChemoCycleDetail
  extends Omit<
    ChemotherapyCycleRecord,
    "chemotherapy_vitals" | "chemotherapy_adverse_event"
  > {
  cycle_day?: number | null;
  planned_date?: string | null;
  actual_date?: string | null;
  next_cycle_date?: string | null;
  cycle_status?: string | null;
  completion_status?: string | null;
  remarks?: string | null;
  chemotherapy_vitals?: ChemoVitalsEntry[];
  chemotherapy_adverse_event?: ChemoAdverseEventEntry[];
  chemotherapy_administration?: any[];
  [key: string]: any;
}

const loadCycleDetail = async (
  cycleId: string
): Promise<ChemoCycleDetail | null> => {
  const response = await API.get<{ success: boolean; data: ChemoCycleDetail }>(
    `/chemotherapy/cycles/${encodeURIComponent(cycleId)}`
  );
  return response.data?.data ?? null;
};

const loadCyclesForPlan = async (
  planId: string
): Promise<ChemoCycleDetail[]> => {
  try {
    const response = await API.get<{ success: boolean; data: ChemoCycleDetail[] }>(
      `/chemotherapy/plans/${encodeURIComponent(planId)}/cycles`
    );
    return response.data?.data ?? [];
  } catch (err) {
    console.warn(`loadCyclesForPlan failed for plan ${planId}:`, err);
    return [];
  }
};

const loadAllPlansForPatient = async (
  patientId: string
): Promise<SummaryPlan[]> => {
  try {
    const response = await API.get<{ success: boolean; data: any }>(
      "/chemotherapy/plans",
      { params: { patient_id: patientId, limit: 50 } }
    );
    const data = response.data?.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.rows)) return data.rows;
    return [];
  } catch (err) {
    console.warn(`loadAllPlansForPatient failed for ${patientId}:`, err);
    return [];
  }
};

/* ============================================================
   DISCHARGE (TAKE-HOME) MEDICINES LOADER
   GET /chemotherapy/regimen-protocols/:protocolId/discharge-medicines
   - real take-home rows saved on the patient's regimen protocol.
   ============================================================ */

interface DischargeMedicineRecord {
  discharge_instruction_id?: string;
  protocol_id: string;
  medicine_id?: string | null;
  drug_sequence?: number | null;
  drug_from?: string | null;
  frequency?: string | null;
  composition?: string | null;
  duration?: string | null;
  patient_dose?: number | string | null;
  patient_dose_unit?: string | null;
  administration_detail?: string | null;
  dose_change?: number | string | null;
  comment?: string | null;
  medicine_master?: {
    medicine_name: string | null;
    generic_name?: string | null;
    dosage_form?: string | null;
    unit?: string | null;
  } | null;
}

const loadDischargeMedicines = async (
  protocolId: string
): Promise<DischargeMedicineRecord[]> => {
  const response = await API.get<{
    success: boolean;
    data: DischargeMedicineRecord[];
  }>(
    `/chemotherapy/regimen-protocols/${encodeURIComponent(
      protocolId
    )}/discharge-medicines`
  );
  return response.data?.data ?? [];
};

function useDischargeMedicines(protocolId: string) {
  const [rows, setRows] = useState<DischargeMedicineRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!protocolId) {
      setRows([]);
      setLoading(false);
      setError("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    loadDischargeMedicines(protocolId)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err: any) => {
        if (!cancelled) {
          setRows([]);
          setError(
            err?.response?.data?.message ||
              err?.message ||
              "Failed to load discharge medicines."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [protocolId]);

  return { rows, loading, error };
}

/* ============================================================
   LATEST PATIENT VITALS HOOK
   The freshest recorded vitals across BOTH sources for a
   patient, fetched once and shared by every portal that shows
   vitals (Order Summary header strip, Discharge portal):
   - latest OPD encounter via GET /encounters/latest
     (newest-first, branch-independent on the backend)
   - newest chemotherapy-cycle vitals row (recorded BSA source;
     missing BSA is derived from height & weight via utils/vitals)
   Merged per-field: encounter value first, chemo fallback.
   ============================================================ */

interface LatestPatientVitalsValues {
  height: number | null;
  weight: number | null;
  bpSystolic: number | null;
  bpDiastolic: number | null;
  pulse: number | null;
  temp: number | null;
  spo2: number | null;
  bmi: number | null;
  bsa: number | null;
}

interface UseLatestPatientVitalsResult {
  latestEncounter: EncounterRecord | null;
  latestChemoVitals: ChemoVitalsEntry | null;
  loading: boolean;
  adverseEventCount: number;
  vitals: LatestPatientVitalsValues;
  /** [label, display] pairs; "" means no recorded value. */
  vitalEntries: [string, string][];
  lastCheckedLabel: string;
  /** True when a fetch was blocked by branch-scope (403) - the UI
     should nudge the user to pick a branch in the header selector. */
  scopeHint: boolean;
}

const formatLastChecked = (values: (string | null | undefined)[]) => {
  const timestamps = values
    .filter((value): value is string => !!value)
    .map((value) => new Date(value).getTime())
    .filter((time) => !Number.isNaN(time));
  if (timestamps.length === 0) return "";
  const d = new Date(Math.max(...timestamps));
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const meridiem = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `Last checked: ${String(hours).padStart(2, "0")}:${minutes} ${meridiem}`;
};

function useLatestPatientVitals(
  patientId?: string,
  /** Changes when the user picks a different branch - triggers refetch
      so scoped calls use the fresh x-branch-id header. */
  scopeKey?: string
): UseLatestPatientVitalsResult {
  const [latestEncounter, setLatestEncounter] =
    useState<EncounterRecord | null>(null);
  const [encounterRows, setEncounterRows] =
    useState<EncounterRecord[]>([]);
  const [latestChemoVitals, setLatestChemoVitals] =
    useState<ChemoVitalsEntry | null>(null);
  const [adverseEventCount, setAdverseEventCount] = useState(0);
  const [scopeHint, setScopeHint] = useState(false);
  const [loading, setLoading] = useState(!!patientId);

  useEffect(() => {
    if (!patientId) {
      setLatestEncounter(null);
      setEncounterRows([]);
      setLatestChemoVitals(null);
      setAdverseEventCount(0);
      setScopeHint(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    /* Flag scope-style rejections so the UI can nudge the user to
       pick a branch ("Please select a branch first." / "No branch
       has been assigned to your account."). */
    const noteScopeError = (message?: string) => {
      if (/select a branch|branch has been assigned/i.test(message ?? "")) {
        if (!cancelled) setScopeHint(true);
      }
    };

    /* Latest OPD/encounter vitals via GET /encounters/latest
       (newest-first, branch-independent - access resolves from the
       caller's ACTIVE branch mappings server-side). Falls through to
       the branch-scoped encounter list when it fails OR comes back
       empty, so single-branch auto-scoping / a valid selection still
       shows vitals. */
    const loadEncounterVitals = async () => {
      let rows: EncounterRecord[] = [];
      let latest: EncounterRecord | null = null;
      try {
        const response = await encounterApi.getLatest(patientId, 20);
        const encs = response.data?.data?.encounters ?? [];
        rows = [...encs].sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        );
        latest = rows[0] ?? null;
      } catch (error: any) {
        const message = error?.response?.data?.message;
        console.error(
          "Failed to load latest encounter vitals:",
          message ?? error
        );
        noteScopeError(message);
      }
      if (!latest || rows.length === 0) {
        try {
          const response = await encounterApi.getAll({
            patientId,
            limit: 20,
          });
          if (cancelled) return;
          rows = [...(response.data?.data?.encounters ?? [])].sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          );
          latest = rows[0] ?? null;
        } catch (error: any) {
          const message = error?.response?.data?.message;
          console.error(
            "Encounter vitals fallback failed:",
            message ?? error
          );
          noteScopeError(message);
        }
      }
      if (!cancelled) {
        setLatestEncounter(latest);
        setEncounterRows(rows);
      }
    };
    loadEncounterVitals();

    /* Newest chemotherapy-cycle vitals + adverse-event count
       (single chain fetch, same as the Discharge portal used). */
    loadLatestChemoPlan(patientId)
      .then(async (loaded) => {
        const sortedCycles = [...(loaded?.chemotherapy_cycle ?? [])].sort(
          (a, b) =>
            (b.actual_date ?? b.planned_date ?? "").localeCompare(
              a.actual_date ?? a.planned_date ?? ""
            ) || b.cycle_number - a.cycle_number
        );
        const newestWithId = sortedCycles.find(
          (cycle) => cycle.chemotherapy_cycle_id
        );
        if (!newestWithId?.chemotherapy_cycle_id) return;
        try {
          const detail = await loadCycleDetail(
            newestWithId.chemotherapy_cycle_id as string
          );
          if (cancelled || !detail) return;
          const vitalsRows = (detail.chemotherapy_vitals ?? []).slice();
          vitalsRows.sort((a, b) =>
            (b.recorded_at ?? "").localeCompare(a.recorded_at ?? "")
          );
          setLatestChemoVitals(vitalsRows[0] ?? null);
          setAdverseEventCount(
            (detail.chemotherapy_adverse_event ?? []).length
          );
        } catch (error: any) {
          const message = error?.response?.data?.message;
          console.error(
            "Failed to load chemo cycle vitals:",
            message ?? error
          );
          noteScopeError(message);
          /* Vitals stay empty - panels show placeholders. */
        }
      })
      .catch((error: any) => {
        const message = error?.response?.data?.message;
        console.error(
          "Failed to load chemotherapy plan for vitals:",
          message ?? error
        );
        noteScopeError(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [patientId, scopeKey]);

  const num = (value?: string | number | null) => {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  };
  const encNum = (value: number | string | null | undefined) =>
    num(value ?? null);

  const firstNonNull = <T,>(rows: T[], getter: (r: T) => any) => {
    for (const r of rows) {
      const v = getter(r);
      if (v !== null && v !== undefined && v !== "") return v;
    }
    return null;
  };
  const firstEncounterValue = (getter: (e: EncounterRecord) => any) => {
    return firstNonNull(encounterRows, getter);
  };

  const heightValue =
    encNum(firstEncounterValue(e => e.height)) ?? num(latestChemoVitals?.height);
  const weightValue =
    encNum(firstEncounterValue(e => e.weight)) ?? num(latestChemoVitals?.weight);

  const vitals: LatestPatientVitalsValues = {
    height: heightValue,
    weight: weightValue,
    bpSystolic:
      encNum(firstEncounterValue(e => e.systolic_bp)) ??
      num(latestChemoVitals?.blood_pressure_systolic),
    bpDiastolic:
      encNum(firstEncounterValue(e => e.diastolic_bp)) ??
      num(latestChemoVitals?.blood_pressure_diastolic),
    pulse: encNum(firstEncounterValue(e => e.pulse)) ?? num(latestChemoVitals?.pulse_rate),
    temp:
      encNum(firstEncounterValue(e => e.temperature)) ??
      num(latestChemoVitals?.body_temperature),
    spo2: encNum(firstEncounterValue(e => e.spo2)) ?? num(latestChemoVitals?.spo2),
    bmi: encNum(firstEncounterValue(e => e.BMI)) ?? num(latestChemoVitals?.bmi),
    /* Recorded chemo value wins; otherwise derive from height & weight
        (Mosteller - see utils/vitals.ts). */
    bsa:
      num(latestChemoVitals?.body_surface_area) ??
      computeBsa(heightValue, weightValue),
  };

  const vitalEntries: [string, string][] = [
    ["HEIGHT", vitals.height != null ? `${vitals.height} cm` : ""],
    [
      "BP",
      vitals.bpSystolic != null && vitals.bpDiastolic != null
        ? `${vitals.bpSystolic}/${vitals.bpDiastolic}`
        : "",
    ],
    ["WEIGHT", vitals.weight != null ? `${vitals.weight} kg` : ""],
    ["PULSE", vitals.pulse != null ? `${vitals.pulse} bpm` : ""],
    ["BSA", vitals.bsa != null ? `${vitals.bsa} m²` : ""],
    ["TEMP", vitals.temp != null ? `${vitals.temp} °C` : ""],
    ["BMI", vitals.bmi != null ? `${vitals.bmi}` : ""],
    ["SPO2", vitals.spo2 != null ? `${vitals.spo2}%` : ""],
  ];

  const lastCheckedLabel = formatLastChecked([
    latestEncounter?.checkin_time,
    latestEncounter?.created_at,
    latestChemoVitals?.recorded_at,
  ]);

  return {
    latestEncounter,
    latestChemoVitals,
    loading,
    adverseEventCount,
    vitals,
    vitalEntries,
    lastCheckedLabel,
    scopeHint,
  };
}

function HMSPatientPortal({ onBack }: { onBack?: () => void }) {
  const [activeTab, setActiveTab] = useState("Order Summary");
  const [selectedDay, setSelectedDay] = useState("Day 1");
  const [selectedCycle] = useState(1);
  const [showMedicationPortal, setShowMedicationPortal] = useState(false);
  const [showDischargePortal, setShowDischargePortal] = useState(false);

  const [savedPlan, setSavedPlan] = useState<SummaryPlan | null>(null);
  const [planNotice, setPlanNotice] = useState("");
  const [regimenProtocol, setRegimenProtocol] = useState<any | null>(null);
  const [regimenLoading, setRegimenLoading] = useState(false);
  const [regimenError, setRegimenError] = useState("");
  const [currentPlan, setCurrentPlan] = useState<any | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState("");
  const [cycleMedications, setCycleMedications] = useState<any[]>([]);
  const [cycleMedicationsMap, setCycleMedicationsMap] = useState<Record<string, any[]>>({});
  const [nextAppointment, setNextAppointment] = useState<{
    date: string;
    detail: string;
  } | null>(null);
  const [patientAllergies, setPatientAllergies] = useState<
    PatientAllergyRecord[]
  >([]);

  const [adminInstructions, setAdminInstructions] = useState<
    {
      medicineName: string;
      route: string;
      infusion: string;
      dose: string;
      frequency: string;
      timing: string;
      remarks: string;
      administrationDetail: string;
    }[]
  >([]);

  const location = useLocation();
  const navigate = useNavigate();
  const consultationState = location.state as ConsultationState | null;
  const searchPatientId = new URLSearchParams(location.search).get('patientId');
  const resolvedPatientId = consultationState?.patientId || searchPatientId || localStorage.getItem('hms_last_patient_id') || '';
  useEffect(() => {
    if (resolvedPatientId) {
      localStorage.setItem('hms_last_patient_id', resolvedPatientId);
      if (!searchPatientId) {
        navigate(`${location.pathname}?patientId=${resolvedPatientId}`, { replace: true });
      }
    }
  }, [resolvedPatientId, searchPatientId, location.pathname, navigate]);
  const { selectedBranchId } = useBranchFilter();

  /* Latest vitals (encounter + chemo merged) for the header strip.
     Re-runs when the branch selection changes so scoped fallbacks and
     the chemo chain pick up the new x-branch-id header. */
  const { vitalEntries, scopeHint } = useLatestPatientVitals(
    resolvedPatientId,
    selectedBranchId
  );
  const summaryHeaderVitals = (label: string) =>
    vitalEntries.find(([key]) => key === label)?.[1] || "—";

  const [patient, setPatient] = useState<PatientRecord | null>(null);

  const [labItems, setLabItems] = useState<LabOrderItemRecord[]>([]);
  const [labItemsLoading, setLabItemsLoading] = useState(false);
  const [labItemsError, setLabItemsError] = useState("");

  useEffect(() => {
    const pid = resolvedPatientId;
    if (!pid) return;
    let cancelled = false;
    setLabItemsLoading(true);
    setLabItemsError("");

    const storedItemIds: string[] = (() => {
      try {
        return JSON.parse(localStorage.getItem(`hms_lab_item_ids_${pid}`) || "[]");
      } catch {
        return [];
      }
    })();

    if (storedItemIds.length > 0) {
      Promise.all(
        storedItemIds.map((id) =>
          labOrderItemApi.getById(id).then((r) => r.data.data).catch(() => null)
        )
      )
        .then((results) => {
          if (cancelled) return;
          const items = results.filter(Boolean) as LabOrderItemRecord[];
          if (items.length > 0) {
            setLabItems(items);
            return;
          }
          fetchAllAndFilter();
        })
        .catch(() => { fetchAllAndFilter(); })
        .finally(() => { if (!cancelled) setLabItemsLoading(false); });
    } else {
      fetchAllAndFilter();
    }

    function fetchAllAndFilter() {
      labOrderItemApi
        .getAll()
        .then((response) => {
          if (cancelled) return;
          const allItems = response.data.data ?? [];
          const forPatient = allItems.filter(
            (item) => item.lab_order?.patient_history?.patient_id === pid
          );
          setLabItems(forPatient);
        })
        .catch((error: any) => {
          if (!cancelled) {
            setLabItemsError(
              error?.response?.data?.message ||
                error?.message ||
                "Failed to load lab investigations."
            );
          }
        })
        .finally(() => {
          if (!cancelled) setLabItemsLoading(false);
        });
    }

    return () => { cancelled = true; };
  }, [resolvedPatientId]);

  useEffect(() => {
    const patientId = resolvedPatientId;
    if (!patientId) return;
    let cancelled = false;
    patientApi
      .getById(patientId)
      .then((response) => {
        if (cancelled) return;
        setPatient(response.data.data);
      })
      .catch((error) => {
        console.error("Failed to load patient:", error);
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedPatientId]);

  useEffect(() => {
    const patientId = resolvedPatientId;
    if (!patientId) return;
    let cancelled = false;

    /* Latest plan for THIS selected patient via
       GET /chemotherapy/plans?patient_id=<id> (newest first).
       The branch filter is tried first; when it comes back empty
       (plan was saved under another branch) retry without it.
       Runs for every tab so Medications gets the same data. */
    /* Latest plan for THIS selected patient via the mapping-scoped
       endpoint (GET /plans/latest-for-patient) - works with or without
       a branch selection. Runs for every tab so Medications gets the
       same data. */
    const loadSavedPlan = async () => {
      let loaded: SummaryPlan | null = null;
      try {
        loaded = await loadLatestChemoPlan(patientId);
      } catch {
        loaded = null;
      }

      if (cancelled) return;
      setSavedPlan(loaded);
      setPlanNotice(
        loaded
          ? ""
          : "No chemotherapy plan found for this patient yet. Complete the Treatment Plan step to populate the Order Summary."
      );
    };

    loadSavedPlan();
    return () => {
      cancelled = true;
    };
  }, [resolvedPatientId, activeTab, selectedBranchId]);

  // Pre-fetch doctor-described medications for all cycles
  useEffect(() => {
    if (!savedPlan?.chemotherapy_cycle?.length) {
      setCycleMedicationsMap({});
      return;
    }
    let cancelled = false;
    const fetchAllCycles = async () => {
      const map: Record<string, any[]> = {};
      const cycles = savedPlan.chemotherapy_cycle.filter(c => c?.chemotherapy_cycle_id);
      await Promise.all(
        cycles.map(async (cycle) => {
          try {
            const response = await API.get<{ success: boolean; data: any }>(
              `/chemotherapy/cycles/${encodeURIComponent(cycle.chemotherapy_cycle_id)}`
            );
            if (cancelled) return;
            const items = response.data?.data?.chemotherapy_plan_items ?? response.data?.data?.items ?? response.data?.data?.chemotherapy_plan?.chemotherapy_plan_items ?? [];
            map[cycle.chemotherapy_cycle_id] = items;
          } catch {
            map[cycle.chemotherapy_cycle_id] = [];
          }
        })
      );
      if (!cancelled) setCycleMedicationsMap(map);
    };
    fetchAllCycles();
    return () => { cancelled = true; };
  }, [savedPlan?.chemotherapy_plan_id, selectedBranchId]);

  useEffect(() => {
    const protocolId = savedPlan?.source_protocol_id;
    if (!protocolId) {
      setRegimenProtocol(null);
      setRegimenError("");
      return;
    }
    let cancelled = false;
    const loadRegimenProtocol = async () => {
      setRegimenLoading(true);
      setRegimenError("");
      try {
        const response = await API.get<{ success: boolean; data: any }>(
          `/chemotherapy/regimen-protocols/${encodeURIComponent(protocolId)}`
        );
        if (cancelled) return;
        setRegimenProtocol(response.data?.data ?? null);
      } catch (err: any) {
        if (cancelled) return;
        setRegimenError(err?.response?.data?.message ?? "Failed to load regimen protocol");
        setRegimenProtocol(null);
      } finally {
        if (!cancelled) setRegimenLoading(false);
      }
    };
    loadRegimenProtocol();
    return () => {
      cancelled = true;
    };
  }, [savedPlan?.source_protocol_id]);

  useEffect(() => {
    const planId = savedPlan?.chemotherapy_plan_id;
    if (!planId) {
      setCurrentPlan(null);
      setPlanError("");
      return;
    }
    let cancelled = false;
    const loadPlanDetails = async () => {
      setPlanLoading(true);
      setPlanError("");
      try {
        const response = await API.get<{ success: boolean; data: any }>(
          `/chemotherapy/plans/${encodeURIComponent(planId)}`
        );
        if (cancelled) return;
        setCurrentPlan(response.data?.data ?? null);
      } catch (err: any) {
        if (cancelled) return;
        setPlanError(err?.response?.data?.message ?? "Failed to load plan details");
        setCurrentPlan(null);
      } finally {
        if (!cancelled) setPlanLoading(false);
      }
    };
    loadPlanDetails();
    return () => {
      cancelled = true;
    };
  }, [savedPlan?.chemotherapy_plan_id]);

  useEffect(() => {
    const cycle = savedPlan?.chemotherapy_cycle?.find(
      (c) => c.cycle_number === Number(selectedCycle)
    );
    if (!cycle?.chemotherapy_cycle_id) {
      setCycleMedications([]);
      return;
    }
    const items = cycleMedicationsMap?.[cycle.chemotherapy_cycle_id] ?? [];
    setCycleMedications(items);
  }, [selectedCycle, savedPlan?.chemotherapy_cycle, cycleMedicationsMap]);

  useEffect(() => {
    const patientId = resolvedPatientId;
    if (!patientId) return;
    let cancelled = false;

    /* NEXT APPOINTMENT for the selected patient - read from the
       GET /chemotherapy/plans?patient_id=<id> payload. Priority:
       upcoming cycle planned_date -> recorded next_cycle_date ->
       next cycle derived from start date + cycle interval. */
    const loadNextAppointment = async () => {
      /* Mapping-scoped endpoint (GET /plans/latest-for-patient) - one
         clean call, works with or without a branch selection. */
      try {
        const plan = await loadLatestChemoPlan(patientId);
        if (cancelled) return;
        const cycles = plan?.chemotherapy_cycle ?? [];
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const todayTs = startOfToday.getTime();

        const toDate = (value?: string | null) => {
          if (!value) return null;
          const d = new Date(value);
          return Number.isNaN(d.getTime()) ? null : d;
        };
        const fmt = (d: Date) =>
          `${String(d.getDate()).padStart(2, "0")}-${String(
            d.getMonth() + 1,
          ).padStart(2, "0")}-${d.getFullYear()}`;
        const describe = (date: Date, cycleNumber: number) => {
          const dayDiff = Math.round(
            (date.getTime() - todayTs) / 86400000,
          );
          const cycleLabel = `Cycle ${cycleNumber}`;
          if (dayDiff === 0) return `${cycleLabel} · Today`;
          if (dayDiff > 0)
            return `${cycleLabel} · In ${dayDiff} day${dayDiff === 1 ? "" : "s"}`;
          return cycleLabel;
        };

        /* 1. Earliest upcoming scheduled cycle date. */
        const upcoming = cycles
          .filter((cycle) => toDate(cycle.planned_date))
          .sort(
            (a, b) =>
              (toDate(a.planned_date) as Date).getTime() -
              (toDate(b.planned_date) as Date).getTime(),
          )
          .find(
            (cycle) =>
              (toDate(cycle.planned_date) as Date).getTime() >= todayTs,
          );

        if (upcoming) {
          setNextAppointment({
            date: fmt(toDate(upcoming.planned_date) as Date),
            detail: describe(
              toDate(upcoming.planned_date) as Date,
              upcoming.cycle_number,
            ),
          });
          return;
        }

        /* 2. Explicitly recorded next_cycle_date on any cycle. */
        const withNextDate = cycles.filter((cycle) =>
          toDate(cycle.next_cycle_date),
        );
        if (withNextDate.length > 0) {
          const latest = withNextDate.reduce((a, b) =>
            (toDate(b.next_cycle_date) as Date).getTime() >=
            (toDate(a.next_cycle_date) as Date).getTime()
              ? b
              : a,
          );
          setNextAppointment({
            date: fmt(toDate(latest.next_cycle_date) as Date),
            detail: describe(
              toDate(latest.next_cycle_date) as Date,
              latest.cycle_number + 1,
            ),
          });
          return;
        }

        /* 3. Derive the next cycle date from the plan schedule
              (start date + interval), capped at the planned cycles. */
        const startDate = toDate(plan?.treatment_start_date);
        const interval = plan?.cycle_interval_days ?? 0;
        if (startDate && interval > 0) {
          const plannedCycles = plan?.planned_cycles ?? 0;
          const daysElapsed = Math.floor(
            (todayTs - startDate.getTime()) / 86400000,
          );
          const stepsAhead =
            daysElapsed < 0 ? 0 : Math.floor(daysElapsed / interval) + 1;
          const maxStep = plannedCycles > 0 ? plannedCycles - 1 : stepsAhead;
          if (stepsAhead <= maxStep) {
            const derived = new Date(
              startDate.getTime() + stepsAhead * interval * 86400000,
            );
            setNextAppointment({
              date: fmt(derived),
              detail: describe(derived, stepsAhead + 1),
            });
            return;
          }
        }

        setNextAppointment(null);
      } catch (error: any) {
        console.error(
          "Failed to load next appointment:",
          error?.response?.data?.message ?? error
        );
        if (!cancelled) setNextAppointment(null);
      }
    };

    loadNextAppointment();
    return () => {
      cancelled = true;
    };
  }, [resolvedPatientId, selectedBranchId]);

  useEffect(() => {
    const patientId = resolvedPatientId;
    if (!patientId) return;
    let cancelled = false;
    API.get<{ success: boolean; data: PatientAllergyRecord[] }>(
      `/clinical-details/patients/${patientId}/allergies`
    )
      .then((response) => {
        if (!cancelled) {
          setPatientAllergies(response.data?.data ?? []);
        }
      })
      .catch((error) => {
        console.error("Failed to load patient allergies:", error);
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedPatientId]);

  useEffect(() => {
    const patientId = resolvedPatientId;
    if (!patientId) {
      setAdminInstructions([]);
      return;
    }
    try {
      const stored = localStorage.getItem(`hms_admin_instructions_${patientId}`);
      const parsed = stored ? JSON.parse(stored) : [];
      setAdminInstructions(Array.isArray(parsed) ? parsed : []);
    } catch {
      setAdminInstructions([]);
    }
  }, [resolvedPatientId]);

  const patientName = patient
    ? [
        patient.patient_first_name,
        patient.patient_middle_name,
        patient.patient_last_name,
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  const patientPhoto = patient?.patient_photo_url || "";

  const patientAgeSex = patient
    ? `${patient.patient_age ?? "—"}Y / ${patient.patient_gender ?? ""}`
    : "";

  const patientDisplayId = patient?.patient_id || "";

  const recentCancerType =
    [savedPlan?.cancer_type, savedPlan?.cancer_subtype]
      .filter(Boolean)
      .join(" ");

  const recentStage = savedPlan?.cancer_stage || "";

  const recentDiagnosis =
    [
      savedPlan?.cancer_subtype || savedPlan?.cancer_type,
      savedPlan?.cancer_stage,
    ]
      .filter(Boolean)
      .join(" ");

  const recentTherapy = savedPlan?.regimen_name || "";

  const recentIntent = savedPlan?.treatment_intent || "";

  const recentAllergyNames = patientAllergies
    .map((item) => item.allergy_master?.substance_name)
    .filter(Boolean)
    .join(", ");

  /* ============================================================
     ORDER SUMMARY - all recent details of the selected patient
     resolved from the fetched staging record + saved chemo plan.
     ============================================================ */
  const fmtOrderDate = (value?: string | null) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return `${String(d.getDate()).padStart(2, "0")}-${String(
      d.getMonth() + 1
    ).padStart(2, "0")}-${d.getFullYear()}`;
  };

  const orderTherapy = savedPlan?.regimen_name || recentTherapy;
  const orderIntent = savedPlan?.treatment_intent || recentIntent;

  const planCycles = (savedPlan?.chemotherapy_cycle ?? []).filter(
    (cycle) => typeof cycle.cycle_number === "number"
  );
  const latestPlanCycle =
    planCycles.length > 0
      ? planCycles.reduce((a, b) =>
          (b.cycle_number as number) >= (a.cycle_number as number) ? b : a
        )
      : null;

  const derivedCycleInfo = (() => {
    if (!savedPlan?.treatment_start_date || !savedPlan?.cycle_interval_days) {
      return null;
    }
    const start = new Date(savedPlan.treatment_start_date);
    if (Number.isNaN(start.getTime())) return null;
    const daysElapsed = Math.floor(
      (Date.now() - start.getTime()) / 86400000,
    );
    const interval = savedPlan.cycle_interval_days;
    if (interval <= 0) return null;
    if (daysElapsed < 0) return { cycle: 1, day: 1 };
    const cycle = Math.floor(daysElapsed / interval) + 1;
    const planned = savedPlan.planned_cycles || 0;
    if (planned > 0 && cycle > planned) return null;
    return { cycle, day: (daysElapsed % interval) + 1 };
  })();

  const displayCycleNumber =
    latestPlanCycle?.cycle_number ?? derivedCycleInfo?.cycle ?? null;
  const displayCycleDay =
    latestPlanCycle?.cycle_day ?? derivedCycleInfo?.day ?? null;

  /* Plan items split by drug_role and the SELECTED DAY: PREMEDICATION
     drugs render in the Premedications table, PRIMARY drugs render in
     Chemo Orders - both only for the day picked in the Select Day
     control (items without an explicit day belong to Day 1). */
  const selectedDayNumber =
    Number(selectedDay.replace("Day ", "")) || 1;

  // Use regimen protocol items if available, otherwise fall back to saved plan items
  const protocolItemsRaw = regimenProtocol?.chemotherapy_regimen_protocol_items ?? [];
  const mapProtocolItem = (item: any) => ({
    chemotherapy_plan_item_id: item.id || item.protocol_item_id,
    drug_role: item.drug_role,
    medicine_master: item.medicine_master,
    protocol_dose: item.patient_dose ? Number(item.patient_dose) : null,
    protocol_dose_unit: item.patient_dose_unit,
    administration_route: item.administration_detail ?? item.administration_route ?? '',
    frequency: item.frequency ?? item.remarks ?? '',
    remarks: item.remarks ?? '',
    cycle_day: item.cycle_day,
    administration_day: item.administration_day,
    dilution_volume: '',
  });
  const protocolItems = protocolItemsRaw.map(mapProtocolItem);
  const planItems = currentPlan?.chemotherapy_plan_items ?? [];
  const savedItems = savedPlan?.chemotherapy_plan_items ?? [];
  const sourceItems = cycleMedications.length > 0 ? cycleMedications : (protocolItems.length > 0 ? protocolItems : (planItems.length > 0 ? planItems : savedItems));

  const matchesCycleAndDay = (item: any) => {
    const itemDay = item.administration_day ?? item.cycle_day ?? 1;
    return itemDay === selectedDayNumber;
  };

  const premedicationItems = sourceItems.filter(
    (item) =>
      (item.drug_role ?? "").toUpperCase() === "PREMEDICATION" &&
      matchesCycleAndDay(item),
  );
  const primaryChemoItems = sourceItems.filter(
    (item) =>
      (item.drug_role ?? "").toUpperCase() === "PRIMARY" &&
      matchesCycleAndDay(item),
  );
  const supportiveItems = sourceItems.filter(
    (item) => {
      const role = (item.drug_role ?? "").toUpperCase();
      return (
        role !== "PREMEDICATION" &&
        role !== "PRIMARY" &&
        matchesCycleAndDay(item)
      );
    },
  );

  /* Treatment timeline: one node per CYCLE, Cycle 1 through the final
     planned cycle of the selected protocol. Day counting / interval
     stays hidden - each node just shows its real start date and is
     done/current/future. The follow-up node shows the plan's expected
     end date. */
  const todayOrder = new Date();
  todayOrder.setHours(0, 0, 0, 0);

  const timelineCycles = (() => {
    if (
      !savedPlan?.treatment_start_date ||
      !savedPlan?.planned_cycles ||
      !savedPlan?.cycle_interval_days
    ) {
      return [];
    }
    const start = new Date(savedPlan.treatment_start_date);
    if (Number.isNaN(start.getTime())) return [];
    const interval = savedPlan.cycle_interval_days || 1;
    return Array.from({ length: savedPlan.planned_cycles }, (_, idx) => {
      const cycle = idx + 1;
      const dStart = new Date(start);
      dStart.setDate(dStart.getDate() + idx * interval);
      const dEnd = new Date(dStart);
      dEnd.setDate(dEnd.getDate() + interval);
      const t = todayOrder.getTime();
      return {
        label: `Cycle ${cycle}`,
        num: cycle,
        date: fmtOrderDate(dStart.toISOString()),
        done: dEnd.getTime() <= t,
        isCurrent: dStart.getTime() <= t && t < dEnd.getTime(),
        active: cycle === selectedCycle,
      };
    });
  })();
  const timelineFollowUpDate = savedPlan?.expected_end_date
    ? fmtOrderDate(savedPlan.expected_end_date)
    : "";

  /* Selectable days for the current cycle, driven by the regimen protocol's
     day count (no_of_days) or, failing that, the distinct administration
     days present across the protocol items. Fallback to Day 1..3. */
  const protocolDaysCount = (() => {
    const explicit = Number(regimenProtocol?.no_of_days);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    const adminDays = new Set<number>();
    (protocolItemsRaw ?? []).forEach((item: any) => {
      const d = Number(item.administration_day ?? item.cycle_day);
      if (Number.isFinite(d) && d > 0) adminDays.add(d);
    });
    return adminDays.size > 0 ? Math.max(...adminDays) : 3;
  })();
  const timelineDays = Array.from({ length: protocolDaysCount }, (_, idx) => {
    const day = idx + 1;
    return { label: `Day ${day}`, num: day };
  });

  const totalTreatmentDays =
    savedPlan?.planned_cycles && savedPlan?.cycle_interval_days
      ? savedPlan.planned_cycles * savedPlan.cycle_interval_days
      : null;
  const completedTreatmentDays =
    savedPlan?.completed_cycles != null && savedPlan?.cycle_interval_days
      ? Math.min(savedPlan.completed_cycles, savedPlan.planned_cycles || savedPlan.completed_cycles) *
        savedPlan.cycle_interval_days
      : null;
  const remainingTreatmentDays =
    totalTreatmentDays != null && completedTreatmentDays != null
      ? Math.max(totalTreatmentDays - completedTreatmentDays, 0)
      : null;
  const progressPercent =
    savedPlan?.planned_cycles && savedPlan?.completed_cycles != null
      ? Math.min(
          Math.round(
            (savedPlan.completed_cycles / savedPlan.planned_cycles) * 100
          ),
          100
        )
      : null;

  const buildOrderEntries = (pairs: [string, unknown][]): [string, string][] =>
    pairs
      .map(([label, value]) => {
        let v: unknown = value;
        if (v === null || v === undefined || v === "") return null;
        if (typeof v === "object") v = JSON.stringify(v);
        return [label, String(v)] as [string, string];
      })
      .filter((p): p is [string, string] => p !== null);

  /* Embedded staging snapshot comes straight from the plan response. */
  const osd = savedPlan?.oncology_staging_detail ?? null;

  /* Discharge medication card: REAL rows from
     GET /chemotherapy/regimen-protocols/:protocolId/discharge-medicines,
     resolved through the saved plan's source protocol. */
  const {
    rows: orderDischargeMeds,
    loading: orderDischargeMedsLoading,
    error: orderDischargeMedsError,
  } = useDischargeMedicines(savedPlan?.source_protocol_id || "");

  const diagnosisOrderEntries = buildOrderEntries([
    ["Cancer Type", osd?.cancer_types?.cancer_type ?? savedPlan?.cancer_type],
    ["Subtype", osd?.cancer_subtypes?.subtype_name ?? savedPlan?.cancer_subtype],
    ["Clinical Stage", osd?.clinical_stage ?? savedPlan?.cancer_stage],
    ["Staging System", osd?.staging_system],
    ["T Stage", osd?.t_stage],
    ["N Stage", osd?.n_stage],
    ["M Stage", osd?.m_stage],
    ["Laterality", osd?.laterality],
    ["Performance Status", osd?.performance_status],
    ["Metastasis Sites", osd?.metastasis_sites],
    ["ICD-10", osd?.icd10_code],
    ["ICD-O-3 Topography", osd?.icd_o3_topo],
    ["ICD-O-3 Morphology", osd?.icd_o3_morpho],
    ["Visit Date", fmtOrderDate(osd?.visit_date)],
    ["Diagnosis Date", fmtOrderDate(osd?.diagnosis_date)],
    ["Biopsy Date", fmtOrderDate(osd?.biopsy_date)],
    [
      "Consulting Oncologist",
      osd?.consulting_oncologist ||
        (savedPlan?.employees
          ? [
              savedPlan.employees.first_name,
              savedPlan.employees.last_name,
            ]
              .filter(Boolean)
              .join(" ")
          : ""),
    ],
    ["Diagnosis ID", osd?.diagnosis_id ?? savedPlan?.diagnosis_id],
    ["Staging Detail ID", osd?.staging_detail_id ?? savedPlan?.staging_detail_id],
    ["Treatment Status", savedPlan?.treatment_status],
    ["ECOG Status", savedPlan?.ecog_status],
    ["Karnofsky Score", savedPlan?.karnofsky_score],
    ["Saved On", fmtOrderDate(osd?.created_at)],
  ]);

  const renderOrderEntryGrid = (entries: [string, string][]) => (
    <div className="grid gap-x-8 gap-y-3 px-6 py-5 grid-cols-[auto_auto_auto]">
      {entries.map(([label, value]) => (
        <div key={label}>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[#64748b] mb-0.5">
            {label}
          </div>
          <div className="text-sm font-medium text-[#1e293b] break-words">
            {value}
          </div>
        </div>
      ))}
    </div>
  );

  const tabs = ["Order Summary", "Medications", "Discharge", "History", "Notes & Documents"];

  const handlePrint = () => window.print();

  if (showMedicationPortal) {
    return (
      <MedicationPortal
        onBackToProfile={() => setShowMedicationPortal(false)}
        patientName={patientName}
        patientPhoto={patientPhoto}
        patientAgeSex={patientAgeSex}
        patientDisplayId={patientDisplayId}
        patientId={resolvedPatientId}
        plan={savedPlan}
        allergies={patientAllergies}
        selectedCycle={selectedCycle}
        cycleMedicationsMap={cycleMedicationsMap}
      />
    );
  }

  if (showDischargePortal) {
    return (
      <DischargeDetailsPortal
        onBack={() => setShowDischargePortal(false)}
        patientId={resolvedPatientId}
      />
    );
  }

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
      <div className="font-[Inter,sans-serif] text-[#1e293b] antialiased flex h-screen overflow-hidden bg-[#f8fafc]">


{/* BEGIN: Main Content */}
<main className="flex-1 flex flex-col h-full overflow-hidden bg-[#f8fafc] relative">
{/* BEGIN: Top Header */}
<header className="h-[72px] bg-[#f8fafc] border-b border-[#e2e8f0] flex items-center justify-between px-8 shrink-0 z-10">
<div className="flex items-center gap-4">
{onBack && (
<button type="button" aria-label="Go back" onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-slate-100">
<svg viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
<path d="M19 12H5" />
<path d="m12 19-7-7 7-7" />
</svg>
</button>
)}

</div>
<div className="flex items-center space-x-6">
<BellNotificationButton size="md" />
<div className="flex items-center space-x-3 cursor-pointer pl-6 border-l border-[#e2e8f0]">
<span className="text-sm font-bold text-[#1d4ed8]">HMS</span>
<div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white">
<i className="fa-solid fa-user text-sm"></i>
</div>
</div>
</div>
</header>
{/* END: Top Header */}
<div className="flex-1 overflow-y-auto relative">
<div className="p-8 max-w-[1400px] mx-auto pb-32">
{/* BEGIN: Patient Header Card */}
<div className="bg-white rounded-[16px] border border-[#e2e8f0] p-6 shadow-sm mb-6 flex justify-between items-center">
<div className="flex items-center">
<img alt={patientName} className="w-20 h-20 rounded-full border-4 border-white shadow-sm object-cover" src={patientPhoto}/>
<div className="ml-6">
<div className="flex items-center space-x-3 mb-1">
<h2 className="text-xl font-bold text-[#1e293b]">{patientName}</h2>
<span className="bg-slate-100 text-[#64748b] px-3 py-1 rounded-full text-xs font-semibold">{patientDisplayId}</span>
</div>
<div className="text-sm text-[#64748b] flex items-center space-x-3">
<span>{patientAgeSex}</span>
<span className="w-1 h-1 rounded-full bg-slate-300"></span>
<span className="text-[#1d4ed8] font-semibold">{recentDiagnosis}</span>
</div>
</div>
</div>
<div className="flex items-center">
<div className="flex space-x-8 px-8 border-r border-[#e2e8f0]">
<div className="space-y-4">
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">HEIGHT</div>
<div className="font-bold text-sm">{summaryHeaderVitals("HEIGHT")}</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">BP</div>
<div className="font-bold text-sm">{summaryHeaderVitals("BP")}</div>
</div>
</div>
<div className="space-y-4">
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">WEIGHT</div>
<div className="font-bold text-sm">{summaryHeaderVitals("WEIGHT")}</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">PULSE</div>
<div className="font-bold text-sm">{summaryHeaderVitals("PULSE")}</div>
</div>
</div>
<div className="space-y-4">
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">BSA</div>
<div className="font-bold text-sm">{summaryHeaderVitals("BSA")}</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">TEMP</div>
<div className="font-bold text-sm">{summaryHeaderVitals("TEMP")}</div>
</div>
</div>
<div className="space-y-4">
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">BMI</div>
<div className="font-bold text-sm">{summaryHeaderVitals("BMI")}</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">SPO2</div>
<div className="font-bold text-sm">{summaryHeaderVitals("SPO2")}</div>
</div>
</div>
</div>
<div className="pl-8">
<div className="bg-blue-50/50 border border-blue-100 rounded-[12px] p-4 w-[220px]">
<div className="text-[10px] font-bold text-[#1d4ed8] uppercase tracking-wider mb-1.5">INTENT: {orderIntent || "—"}</div>
<div className="text-[15px] font-bold text-[#1d4ed8] mb-2.5">{orderTherapy || "—"}</div>
<div className="flex items-center text-xs text-[#64748b] font-medium">
<span className="w-2 h-2 rounded-full bg-[#10b981] mr-2"></span> Active Protocol
                    </div>
</div>
</div>
</div>
</div>
{/* END: Patient Header Card */}
{/* BEGIN: Alerts Banner */}
<div className="flex items-center justify-between text-sm mb-8 border-b border-[#e2e8f0] pb-4">
<div className="flex items-center space-x-8">
<div className="flex items-center">
<i className="fa-solid fa-triangle-exclamation text-[#ef4444] mr-2"></i>
<span className="text-[#ef4444] font-semibold">Allergy:</span> <span className="ml-1 text-[#1e293b]">{recentAllergyNames || "—"}</span>
</div>
<div className="flex items-center">
<i className="fa-solid fa-clock-rotate-left text-[#f59e0b] mr-2"></i>
<span className="text-[#f59e0b] font-semibold">Previous Cycle:</span> <span className="ml-1 text-[#1e293b]">—</span>
</div>
<div className="flex items-center text-[#1d4ed8] font-medium">
<i className="fa-solid fa-link mr-2"></i>
<span>Central Line Available</span>
</div>
</div>

</div>
{/* END: Alerts Banner */}
{/* BEGIN: Branch scope hint */}
{scopeHint && (
<div className="mb-6 flex items-center rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
<i className="fa-solid fa-triangle-exclamation mr-2"></i> Multiple branches assigned — select your branch to load plan, discharge &amp; appointment details:
<InlineBranchPicker />
</div>
)}
{/* END: Branch scope hint */}
{/* BEGIN: Tabs */}
<div className="border-b border-[#e2e8f0] mb-6">
<nav className="flex space-x-8">
{tabs.map((tab) => (
<button key={tab} type="button" onClick={() => {
          if (tab === "Medications") {
            setShowMedicationPortal(true);
          } else if (tab === "Discharge") {
            setShowDischargePortal(true);
          } else {
            setActiveTab(tab);
          }
        }} className={`px-1 py-3 border-b-2 text-sm font-medium transition-colors ${activeTab === tab ? "border-[#1d4ed8] text-[#1d4ed8] font-semibold" : "border-transparent text-[#64748b] hover:text-[#1e293b] hover:border-slate-300"}`}>
{tab}
</button>
))}
</nav>
</div>
{/* END: Tabs */}
{activeTab === "History" ? (
<HistoryDashboard embedded patientId={resolvedPatientId} initialPlan={savedPlan} />
) : activeTab === "Notes & Documents" ? (
<PatientNotesDocuments embedded patientId={resolvedPatientId} />
) : (
<>
{planNotice && (
<div className="mb-6 flex items-center rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
<i className="fa-solid fa-triangle-exclamation mr-2"></i> {planNotice}
</div>
)}
{/* BEGIN: Recent Details Sections (fetched for the selected patient) */}
{diagnosisOrderEntries.length > 0 && (
<section className="mb-6 overflow-hidden rounded-[16px] shadow-sm border border-[#e2e8f0] bg-white">
  <SectionHeader icon="fa-solid fa-file-medical" title={`Diagnosis & Staging — ${[osd?.cancer_types?.cancer_type, osd?.cancer_subtypes?.subtype_name].filter(Boolean).join(" — ") || orderTherapy || "—"}`} badge={osd?.clinical_stage || savedPlan?.cancer_stage || "—"} />
  {renderOrderEntryGrid(diagnosisOrderEntries)}
</section>
)}
{/* END: Recent Details Sections */}
<div className="flex space-x-6 mb-8">
{/* Left Side (Timeline & Day Selector) */}
<div className="flex-1 space-y-6">
{/* BEGIN: Treatment Timeline */}
<div className="bg-white rounded-[16px] shadow-sm border border-[#e2e8f0] p-6 h-[200px]">
<div className="flex items-center mb-8">
<h3 className="text-lg font-bold text-[#1e293b]">Cycle {selectedCycle || displayCycleNumber || "—"}</h3>
<div className="ml-3 text-sm text-[#64748b] flex items-center cursor-pointer hover:text-[#1e293b]">
                  {orderIntent || savedPlan?.treatment_status || "—"} <i className="fa-solid fa-chevron-down text-[10px] ml-2"></i>
</div>
</div>
{timelineCycles.length > 0 ? (
<div className="relative mt-4 overflow-x-auto hide-scrollbar">
<div className="relative min-w-max px-8">
<div className="absolute top-[18px] left-[40px] right-[40px] h-[2px] bg-slate-200"></div>
<div className="relative z-10 flex gap-x-12 min-w-max justify-between">
{timelineCycles.map((cycle) => (
<div key={cycle.label} className="flex flex-col items-center" title={`${cycle.label} · starts ${cycle.date}`}>
<div className={`w-10 h-10 rounded-full ${cycle.active || cycle.isCurrent ? "bg-[#1d4ed8] text-white ring-4 ring-[#1d4ed8]/20" : cycle.done ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"} flex items-center justify-center font-bold ring-[6px] ring-white`}>{cycle.num}</div>
<div className="mt-3 text-center">
<div className={`text-sm ${cycle.active || cycle.isCurrent ? "font-semibold text-[#1e293b]" : "font-medium text-[#64748b]"}`}>{cycle.label}</div>
<div className={`text-[11px] mt-1 ${cycle.done ? "text-[#64748b]" : "text-slate-400"}`}>{cycle.date}</div>
</div>
</div>
))}
<div className="flex flex-col items-center">
<div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold ring-[6px] ring-white"><i className="fa-regular fa-map"></i></div>
<div className="mt-3 text-center">
<div className="text-sm font-medium text-[#64748b]">Follow-up</div>
<div className="text-[11px] text-slate-400 mt-1">{timelineFollowUpDate || "—"}</div>
</div>
</div>
</div>
</div>
</div>
) : (
<div className="relative px-8 mt-4">
<div className="absolute top-[18px] left-[60px] right-[60px] h-[2px] bg-slate-200"></div>
<div className="flex justify-between relative z-10">
{["1", "2", "3"].map((num) => (
<div key={num} className="flex flex-col items-center">
<div className={`w-10 h-10 rounded-full ${num === "1" ? "bg-[#1d4ed8] text-white" : "bg-slate-100 text-slate-400"} flex items-center justify-center font-bold ring-[6px] ring-white`}>{num}</div>
<div className="mt-3 text-center">
<div className={`text-sm ${num === "1" ? "font-semibold text-[#1e293b]" : "font-medium text-[#64748b]"}`}>Day {num}</div>
<div className="text-[11px] text-slate-400 mt-1">—</div>
</div>
</div>
))}
<div className="flex flex-col items-center">
<div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold ring-[6px] ring-white"><i className="fa-regular fa-map"></i></div>
<div className="mt-3 text-center">
<div className="text-sm font-medium text-[#64748b]">Follow-up</div>
<div className="text-[11px] text-slate-400 mt-1">{timelineFollowUpDate || "—"}</div>
</div>
</div>
</div>
</div>
)}
</div>
{/* END: Treatment Timeline */}
{/* BEGIN: Day Selector */}
<div className="flex items-center">
<span className="text-sm font-semibold text-[#1e293b] mr-4 shrink-0">Select Day</span>
<div className="flex bg-white rounded-[12px] border border-[#e2e8f0] shadow-sm p-1 overflow-x-auto hide-scrollbar max-w-full">
{timelineDays.map((day) => (
<button key={day.label} type="button" onClick={() => setSelectedDay(day.label)} className={`px-6 py-2 rounded-[8px] shadow-sm text-center min-w-[100px] transition-colors ${selectedDay === day.label ? "bg-[#1d4ed8] text-white" : "text-[#1e293b] hover:bg-slate-50"}`}>
<div className="text-sm font-semibold whitespace-nowrap">{day.label}</div>
</button>
))}
</div>
</div>
{/* END: Day Selector */}
</div>
{/* Right Side (Cards) */}
<div className="flex space-x-6">
{/* BEGIN: Next Appointment */}
<div className="bg-white rounded-[16px] shadow-sm border border-[#e2e8f0] p-6 w-[220px] h-[200px] flex flex-col justify-between">
<div>
<h4 className="text-sm font-bold text-[#1e293b] mb-5">Next Appointment</h4>
<div className="flex items-start">
<div className="w-10 h-10 rounded-[10px] bg-blue-50 flex items-center justify-center text-[#1d4ed8] shrink-0 mr-3">
<i className="fa-regular fa-calendar text-lg"></i>
</div>
<div>
<div className="text-sm font-bold text-[#1e293b]">
  {nextAppointment?.date || "—"}
</div>
<div className="text-xs text-[#64748b] mt-1">
  {nextAppointment?.detail || "—"}
</div>
<div className="text-xs text-[#64748b] mt-1">Chemotherapy session</div>
</div>
</div>
</div>
<button className="w-full py-2 border border-[#e2e8f0] rounded-[8px] text-sm font-semibold text-[#1e293b] hover:bg-slate-50 transition-colors">Reschedule</button>
</div>
{/* END: Next Appointment */}
{/* BEGIN: Treatment Progress */}
<div className="bg-white rounded-[16px] shadow-sm border border-[#e2e8f0] p-6 w-[220px] h-[200px] flex flex-col justify-between">
<h4 className="text-sm font-bold text-[#1e293b] mb-2">Treatment Progress</h4>
<div className="flex items-center justify-between">
<div className="relative w-16 h-16 rounded-full bg-[conic-gradient(#e2e8f0_0%_100%)] flex items-center justify-center" style={progressPercent != null ? { backgroundImage: `conic-gradient(#1d4ed8 ${progressPercent}%, #e2e8f0 ${progressPercent}% 100%)` } : undefined}>
<div className="absolute inset-[6px] rounded-full bg-white"></div>
<span className="relative z-10 text-sm font-bold text-[#1e293b]">{progressPercent != null ? `${progressPercent}%` : "—"}</span>
</div>
<div className="text-right">
<div className="text-[10px] text-[#64748b] uppercase tracking-wide font-semibold mb-1">Completed</div>
<div className="text-sm font-bold text-[#1e293b] mb-3">{completedTreatmentDays ?? "—"} <span className="text-xs font-medium text-[#64748b] normal-case tracking-normal">Days</span></div>
<div className="text-[10px] text-[#64748b] uppercase tracking-wide font-semibold mb-1">Remaining</div>
<div className="text-sm font-bold text-[#1e293b]">—</div>
</div>
</div>
<div className="pt-4 flex justify-between items-center text-xs">
<span className="text-[#64748b] font-medium">Next Visit</span>
<span className="font-bold text-[#1e293b]">—</span>
</div>
</div>
{/* END: Treatment Progress */}
</div>
</div>
{/* BEGIN: Bottom Grid */}
<div className="grid grid-cols-12 gap-6">
{/* Left Column */}
<div className="col-span-3 space-y-6">
<div className="bg-white rounded-[16px] shadow-sm border border-[#e2e8f0] p-5">
<h4 className="text-sm font-bold text-[#1e293b] mb-4">Cycle &amp; Schedule</h4>
        <div className="grid gap-4 mb-5 grid-cols-[auto_auto_auto]">
          <div>
            <div className="text-[10px] text-[#64748b] font-semibold uppercase mb-1">CYCLE</div>
            <div className="font-bold text-sm">{displayCycleNumber ? `${displayCycleNumber}${savedPlan?.planned_cycles ? ` / ${savedPlan.planned_cycles}` : ""}` : "—"}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#64748b] font-semibold uppercase mb-1">DAY</div>
            <div className="font-bold text-sm">{displayCycleDay ?? "—"}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#64748b] font-semibold uppercase mb-1">TOTAL DAYS</div>
            <div className="font-bold text-sm">{totalTreatmentDays ?? "—"}</div>
          </div>
        </div>
        <div className="grid gap-4 grid-cols-[auto_auto_auto]">
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase mb-1">START DATE</div>
<div className="font-bold text-sm">{fmtOrderDate(savedPlan?.treatment_start_date) || "—"}<br/></div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase mb-1">END DATE</div>
<div className="font-bold text-sm">{fmtOrderDate(savedPlan?.expected_end_date) || "—"}<br/></div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase mb-1">INTERVAL</div>
<div className="font-bold text-sm">{savedPlan?.cycle_interval_days ? `${savedPlan.cycle_interval_days} days` : "—"}</div>
</div>
</div>
</div>
<div className="bg-white rounded-[16px] shadow-sm border border-[#e2e8f0] p-5">
<h4 className="text-sm font-bold text-[#1e293b] mb-4">Clinical Info</h4>
<div className="grid gap-4 mb-5 grid-cols-[auto_auto]">
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase mb-1">TYPE</div>
<div className="font-bold text-sm">{recentCancerType || "—"}</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase mb-1">STAGE</div>
<div className="font-bold text-sm">{recentStage || "—"}</div>
</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase mb-1">GRADE</div>
<div className="font-bold text-sm">—</div>
</div>
</div>
</div>
{/* Middle Column */}
<div className="col-span-9 space-y-6">
<div className="bg-white rounded-[16px] shadow-sm border border-[#e2e8f0] p-5">
<div className="flex items-center mb-4">
<h4 className="text-sm font-bold text-[#1e293b] mr-3">Lab Validation</h4>
<span className="px-2 py-0.5 bg-slate-50 text-[#64748b] text-[10px] font-bold uppercase rounded border border-slate-200">{labItemsLoading ? "Loading…" : `${labItems.length} Test(s)`}</span>
</div>
{labItemsError && (
  <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">{labItemsError}</div>
)}
{labItemsLoading ? (
  <div className="py-6 text-center text-xs text-[#64748b]">
    <i className="fa-solid fa-circle-notch fa-spin mr-1" />Loading lab investigations…
  </div>
) : labItems.length === 0 ? (
  <table className="w-full text-left text-sm mb-4">
    <thead>
      <tr className="text-[10px] text-[#64748b] uppercase border-b border-slate-100">
        <th className="pb-2 font-semibold">PARAMETER</th>
        <th className="pb-2 font-semibold">RESULT</th>
        <th className="pb-2 font-semibold">RANGE</th>
        <th className="pb-2 font-semibold">STATUS</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td colSpan={4} className="py-6 text-center text-xs text-[#64748b]">No lab validation records found.</td>
      </tr>
    </tbody>
  </table>
) : (
  <table className="w-full text-left text-sm mb-4">
    <thead>
      <tr className="text-[10px] text-[#64748b] uppercase border-b border-slate-100">
        <th className="pb-2 font-semibold">TEST NAME</th>
        <th className="pb-2 font-semibold">TEST CODE</th>
        <th className="pb-2 font-semibold">UNIT</th>
        <th className="pb-2 font-semibold">REFERENCE RANGE</th>
        <th className="pb-2 font-semibold">STATUS</th>
      </tr>
    </thead>
    <tbody>
      {labItems.map((item) => (
        <tr key={item.lab_order_item_id} className="border-b border-slate-50">
          <td className="py-2 font-bold text-sm">{item.lab_test_master?.test_name ?? "—"}</td>
          <td className="py-2 text-sm">{item.lab_test_master?.test_code ?? "—"}</td>
          <td className="py-2 text-sm">{item.lab_test_master?.unit ?? "—"}</td>
          <td className="py-2 text-sm">{item.lab_test_master?.reference_range ?? "—"}</td>
          <td className="py-2">
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
              item.item_status === "Completed"
                ? "bg-emerald-100 text-emerald-700"
                : item.item_status === "Ordered"
                ? "bg-blue-100 text-blue-700"
                : "bg-slate-100 text-slate-600"
            }`}>
              {item.item_status ?? "Ordered"}
            </span>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
)}
<div className="border-t border-slate-100 pt-3 flex justify-between items-center text-sm">
<span className="text-[#64748b]">Chemo Clearance :</span>
<span className="font-bold text-[#64748b] uppercase">—</span>
</div>
</div>
</div>
</div>
<div className="bg-white rounded-[16px] shadow-sm border border-[#e2e8f0] overflow-hidden mt-6">
<div className="px-5 py-4 border-b border-[#e2e8f0] flex items-center justify-between text-[#1d4ed8]">
<div className="flex items-center">
<i className="fa-solid fa-flask mr-2"></i>
<h4 className="text-sm font-bold">PROTOCOL: {orderTherapy || "—"}</h4>
</div>
<a className="text-xs text-[#1d4ed8] font-medium hover:underline flex items-center" href="#">View Protocol <i className="fa-solid fa-chevron-right text-[10px] ml-1"></i></a>
</div>
<div className="p-5">
<table className="w-full text-left text-sm">
<thead>
<tr className="text-[10px] text-[#64748b] uppercase border-b border-slate-100">
<th className="pb-2 font-semibold">DOSE</th>
<th className="pb-2 font-semibold">PATIENT DOSE</th>
<th className="pb-2 font-semibold">ROUTE</th>
<th className="pb-2 font-semibold">DILUENT</th>
<th className="pb-2 font-semibold">VOLUME</th>
<th className="pb-2 font-semibold">INF. TIME</th>
</tr>
</thead>
<tbody>
<tr className="border-b border-slate-50">
<td className="py-2 whitespace-nowrap">—</td>
<td className="py-2 whitespace-nowrap">—</td>
<td className="py-2 whitespace-nowrap">—</td>
<td className="py-2 whitespace-nowrap">—</td>
<td className="py-2 whitespace-nowrap">—</td>
<td className="py-2 whitespace-nowrap">—</td>
</tr>
</tbody>
</table>
</div>
</div>
{/* BEGIN: Medication Orders Row */}
<div className="mt-6 space-y-6">
<div className="bg-white rounded-[16px] shadow-sm border border-[#e2e8f0] overflow-hidden">
<div className="px-5 py-4 border-b border-[#e2e8f0] flex items-center text-purple-600">
<i className="fa-solid fa-pills mr-2"></i>
<h4 className="text-sm font-bold">Premedications</h4>
</div>
<div className="p-5">
<table className="w-full text-left text-sm">
<thead>
<tr className="text-[10px] text-[#64748b] uppercase border-b border-slate-100">
<th className="pb-2 font-semibold w-8">#</th>
<th className="pb-2 font-semibold">DRUG</th>
<th className="pb-2 font-semibold">DOSE</th>
<th className="pb-2 font-semibold">ROUTE</th>
<th className="pb-2 font-semibold">TIMING</th>
<th className="pb-2 font-semibold text-right">STATUS</th>
</tr>
</thead>
<tbody>
{premedicationItems.length === 0 ? (
<tr>
<td colSpan={6} className="py-6 text-center text-xs text-[#64748b]">No premedications found.</td>
</tr>
) : (
premedicationItems.map((item, index) => (
<tr key={item.chemotherapy_plan_item_id} className="border-b border-slate-50 last:border-0">
<td className="py-2 whitespace-nowrap">{index + 1}</td>
<td className="py-2 font-medium text-[#1e293b] whitespace-nowrap">{item.medicine_master?.medicine_name ?? "—"}</td>
<td className="py-2 whitespace-nowrap">{item.protocol_dose != null ? `${item.protocol_dose} ${item.protocol_dose_unit ?? ""}`.trim() : "—"}</td>
<td className="py-2 whitespace-nowrap">{item.administration_route ?? "—"}</td>
<td className="py-2 whitespace-nowrap">{item.frequency ?? item.remarks ?? "—"}</td>
<td className="py-2 whitespace-nowrap text-right"><StatusBadge>{item.drug_role || "PREMEDICATION"}</StatusBadge></td>
</tr>
))
)}
</tbody>
</table>
</div>
</div>
<div className="bg-white rounded-[16px] shadow-sm border border-[#e2e8f0] overflow-hidden">
<div className="px-5 py-4 border-b border-[#e2e8f0] flex items-center text-[#1d4ed8]">
<i className="fa-solid fa-prescription-bottle-medical mr-2"></i>
<h4 className="text-sm font-bold">Chemo Orders</h4>
</div>
<div className="p-5">
<table className="w-full text-left text-sm">
<thead>
<tr className="text-[10px] text-[#64748b] uppercase border-b border-slate-100">
<th className="pb-2 font-semibold w-8">#</th>
<th className="pb-2 font-semibold">DRUG</th>
<th className="pb-2 font-semibold">DOSE</th>
<th className="pb-2 font-semibold">ROUTE</th>
<th className="pb-2 font-semibold">DILUENT</th>
<th className="pb-2 font-semibold text-right">STATUS</th>
</tr>
</thead>
<tbody>
{primaryChemoItems.length === 0 ? (
<tr>
<td colSpan={6} className="py-6 text-center text-xs text-[#64748b]">No chemo orders found.</td>
</tr>
) : (
primaryChemoItems.map((item, index) => (
<tr key={item.chemotherapy_plan_item_id} className="border-b border-slate-50 last:border-0">
<td className="py-2 whitespace-nowrap">{index + 1}</td>
<td className="py-2 font-medium text-[#1e293b] whitespace-nowrap">{item.medicine_master?.medicine_name ?? "—"}</td>
<td className="py-2 whitespace-nowrap">{item.protocol_dose != null ? `${item.protocol_dose} ${item.protocol_dose_unit ?? ""}`.trim() : "—"}</td>
<td className="py-2 whitespace-nowrap">{item.administration_route ?? "—"}</td>
<td className="py-2 whitespace-nowrap">{item.dilution_volume ?? "—"}</td>
<td className="py-2 whitespace-nowrap text-right"><StatusBadge>{item.drug_role || "ORDERED"}</StatusBadge></td>
</tr>
))
)}
</tbody>
</table>
</div>
</div>
<div className="bg-white rounded-[16px] shadow-sm border border-[#e2e8f0] overflow-hidden">
<div className="px-5 py-4 border-b border-[#e2e8f0] flex items-center text-emerald-600">
<i className="fa-solid fa-heart-pulse mr-2"></i>
<h4 className="text-sm font-bold">Supportive Medicines</h4>
</div>
<div className="p-5">
<table className="w-full text-left text-sm">
<thead>
<tr className="text-[10px] text-[#64748b] uppercase border-b border-slate-100">
<th className="pb-2 font-semibold w-8">#</th>
<th className="pb-2 font-semibold">DRUG</th>
<th className="pb-2 font-semibold">DOSE</th>
<th className="pb-2 font-semibold">ROUTE</th>
<th className="pb-2 font-semibold">TIMING</th>
<th className="pb-2 font-semibold text-right">STATUS</th>
</tr>
</thead>
<tbody>
{supportiveItems.length === 0 ? (
<tr>
<td colSpan={6} className="py-6 text-center text-xs text-[#64748b]">No supportive medicines found.</td>
</tr>
) : (
supportiveItems.map((item, index) => (
<tr key={item.chemotherapy_plan_item_id} className="border-b border-slate-50 last:border-0">
<td className="py-2 whitespace-nowrap">{index + 1}</td>
<td className="py-2 font-medium text-[#1e293b] whitespace-nowrap">{item.medicine_master?.medicine_name ?? "—"}</td>
<td className="py-2 whitespace-nowrap">{item.protocol_dose != null ? `${item.protocol_dose} ${item.protocol_dose_unit ?? ""}`.trim() : "—"}</td>
<td className="py-2 whitespace-nowrap">{item.administration_route ?? "—"}</td>
<td className="py-2 whitespace-nowrap">{item.frequency ?? item.remarks ?? "—"}</td>
<td className="py-2 whitespace-nowrap text-right"><StatusBadge>{item.drug_role || "SUPPORTIVE"}</StatusBadge></td>
</tr>
))
)}
</tbody>
</table>
</div>
</div>
<div className="bg-white rounded-[16px] shadow-sm border border-[#e2e8f0] overflow-hidden">
<div className="px-5 py-4 border-b border-[#e2e8f0] flex items-center text-orange-500">
<i className="fa-solid fa-capsules mr-2"></i>
<h4 className="text-sm font-bold">Discharge Medication</h4>
</div>
<div className="p-5">
<table className="w-full text-left text-sm">
<thead>
<tr className="text-[10px] text-[#64748b] uppercase border-b border-slate-100">
<th className="pb-2 font-semibold w-8">#</th>
<th className="pb-2 font-semibold">DRUG</th>
<th className="pb-2 font-semibold">DOSE</th>
<th className="pb-2 font-semibold">FREQUENCY</th>
<th className="pb-2 font-semibold">INSTRUCTION</th>
<th className="pb-2 font-semibold text-right">DURATION</th>
</tr>
</thead>
<tbody>
{orderDischargeMedsLoading ? (
<tr>
<td colSpan={6} className="py-6 text-center text-xs text-[#64748b]"><i className="fa-solid fa-circle-notch fa-spin mr-2"></i>Loading discharge medicines…</td>
</tr>
) : orderDischargeMedsError ? (
<tr>
<td colSpan={6} className="py-6 text-center text-xs text-red-500"><i className="fa-solid fa-triangle-exclamation mr-2"></i>{orderDischargeMedsError}</td>
</tr>
) : orderDischargeMeds.length === 0 ? (
<tr>
<td colSpan={6} className="py-6 text-center text-xs text-[#64748b]">{savedPlan?.source_protocol_id ? "No discharge medicines recorded on this patient's regimen protocol yet." : "No regimen protocol linked to this patient's plan yet."}</td>
</tr>
) : (
orderDischargeMeds.map((item, index) => (
<tr key={item.discharge_instruction_id ?? `${item.protocol_id}-${item.drug_sequence ?? index}`} className="border-b border-slate-50 last:border-0">
<td className="py-2">{index + 1}</td>
<td className="py-2 font-medium text-[#1e293b] whitespace-nowrap">{item.medicine_master?.medicine_name ?? "—"}</td>
<td className="py-2 whitespace-nowrap">{item.patient_dose != null && item.patient_dose !== "" ? `${item.patient_dose} ${item.patient_dose_unit ?? item.medicine_master?.unit ?? ""}`.trim() : "—"}</td>
<td className="py-2 whitespace-nowrap">{item.frequency || "—"}</td>
<td className="py-2 text-xs text-[#64748b]">{item.administration_detail || item.comment || "—"}</td>
<td className="py-2 whitespace-nowrap text-right">{item.duration || "—"}</td>
</tr>
))
)}
</tbody>
</table>
</div>
</div>
</div>
{/* END: Medication Orders Row */}
{/* END: Bottom Grid */}
{/* BEGIN: Instructions Card */}
<div className="mt-6 bg-white rounded-[16px] shadow-sm border border-[#e2e8f0] p-6 flex justify-between items-start">
<div>
<div className="flex items-center text-[#1d4ed8] mb-4">
<i className="fa-regular fa-file-lines mr-2"></i>
<h4 className="text-sm font-bold">Instructions</h4>
</div>
<p className="text-sm text-[#64748b] mb-3">Administration instructions from the selected regimen protocol:</p>
{adminInstructions.length === 0 ? (
<ul className="space-y-2 text-sm text-[#1e293b] font-medium list-disc list-inside">
<li>No instructions recorded.</li>
</ul>
) : (
<ul className="space-y-3 text-sm text-[#1e293b]">
{adminInstructions.map((instruction, index) => (
<li key={index} className="border border-slate-100 rounded-[12px] p-3">
<div className="flex items-start justify-between gap-3">
<span className="font-bold text-[#1e293b]">{instruction.medicineName || `Item ${index + 1}`}</span>
{instruction.dose ? (
<span className="text-xs text-[#64748b] whitespace-nowrap">{instruction.dose}</span>
) : null}
</div>
{(instruction.route || instruction.infusion || instruction.frequency || instruction.timing) ? (
<div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#64748b]">
{instruction.route ? <span>Route: {instruction.route}</span> : null}
{instruction.infusion ? <span>Infusion: {instruction.infusion}</span> : null}
{instruction.frequency ? <span>Frequency: {instruction.frequency}</span> : null}
{instruction.timing ? <span>Timing: {instruction.timing}</span> : null}
</div>
) : null}
{instruction.administrationDetail ? (
<p className="mt-1.5 text-xs text-[#475569]">{instruction.administrationDetail}</p>
) : null}
{instruction.remarks ? (
<p className="mt-1.5 text-xs italic text-[#64748b]">{instruction.remarks}</p>
) : null}
</li>
))}
</ul>
)}
<a className="inline-block mt-4 text-sm font-semibold text-[#1d4ed8] underline" href="#">Investigation for Next Cycle: —</a>
</div>
<div className="bg-slate-50 border border-slate-200 rounded-[12px] p-5 flex flex-col items-center justify-center w-[160px] h-full">
<div className="text-[10px] text-[#1d4ed8] font-bold uppercase tracking-wider mb-2">NEXT CYCLE</div>
<div className="flex items-center text-sm font-bold text-[#1d4ed8]">
<i className="fa-regular fa-calendar mr-2"></i> —
              </div>
</div>
</div>
{/* END: Instructions Card */}
</>
)}
</div>
</div>
{/* BEGIN: Footer */}
<footer className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#e2e8f0] px-8 py-4 flex items-center justify-between z-20">
<div>
<div className="text-xs text-[#64748b]">Created by <span className="font-medium text-[#1e293b]">{[savedPlan?.employees?.first_name, savedPlan?.employees?.last_name].filter(Boolean).join(" ") || "—"}</span> on {fmtOrderDate(savedPlan?.created_at) || "—"}</div>
<div className="text-xs text-[#64748b] mt-1">Last updated by <span className="font-medium text-[#1e293b]">{[savedPlan?.employees?.first_name, savedPlan?.employees?.last_name].filter(Boolean).join(" ") || "—"}</span> on {fmtOrderDate(savedPlan?.updated_at) || "—"}</div>
</div>
<div className="flex items-center space-x-4">
<button type="button" onClick={handlePrint} className="px-4 py-2 border border-[#e2e8f0] rounded-[8px] text-sm font-semibold text-[#1e293b] hover:bg-slate-50 transition-colors flex items-center">
<i className="fa-solid fa-print mr-2"></i> Print
          </button>
<button className="px-4 py-2 border border-[#e2e8f0] rounded-[8px] text-sm font-semibold text-[#1e293b] hover:bg-slate-50 transition-colors flex items-center">
<i className="fa-solid fa-share-nodes mr-2"></i> Share
          </button>
<button className="px-4 py-2 border border-[#e2e8f0] rounded-[8px] text-sm font-semibold text-[#1e293b] hover:bg-slate-50 transition-colors flex items-center">
<i className="fa-regular fa-copy mr-2"></i> Duplicate Cycle
          </button>
<button className="px-6 py-2 bg-[#1d4ed8] text-white rounded-[8px] text-sm font-semibold hover:bg-blue-700 transition-colors">
            Update Order
          </button>
</div>
</footer>
{/* END: Footer */}
</main>
{/* END: Main Content */}

      </div>
    </>
  );
}

/* ============================================================
   HISTORY DASHBOARD COMPONENT
   (combined from client/pages/doctor/history.tsx —
    renamed HealthcareDashboard → HistoryDashboard so it can
    live in this file as an embedded step, embedded prop added,
    original history.tsx file left untouched)
============================================================ */

const HistoryDashboard: React.FC<{
  embedded?: boolean;
  patientId?: string;
  initialPlan?: SummaryPlan | null;
}> = ({ embedded = false, patientId: propPatientId, initialPlan }) => {
  const patientId = propPatientId || '';
  const [plan, setPlan] = useState<SummaryPlan | null>(initialPlan ?? null);
  const [cycleDetails, setCycleDetails] = useState<ChemoCycleDetail[]>([]);
  const [regimenProtocol, setRegimenProtocol] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(false);
  const [prescriptionsError, setPrescriptionsError] = useState("");
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null);
  const [prescriptionIndex, setPrescriptionIndex] = useState<number | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const { vitals: patientVitals } = useLatestPatientVitals(patientId);
  const [timelineViewMode, setTimelineViewMode] = useState<"one-by-one" | "list">("one-by-one");
  const [activeCycleIndex, setActiveCycleIndex] = useState<number>(0);
  const timelineScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const protocolId = plan?.source_protocol_id;
    if (!protocolId) {
      setRegimenProtocol(null);
      return;
    }
    let cancelled = false;
    API.get(`/chemotherapy/regimen-protocols/${encodeURIComponent(protocolId)}`)
      .then((res) => {
        if (!cancelled) {
          setRegimenProtocol(res.data?.data ?? null);
        }
      })
      .catch((err) => {
        console.warn("Failed to load regimen protocol in HistoryDashboard:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [plan?.source_protocol_id]);


  /* Real treatment history for THIS selected patient:
      latest chemo plan (GET /chemotherapy/plans?patient_id=) plus
      each cycle's recorded vitals + adverse events
      (GET /chemotherapy/cycles/:id). */
  const buildPrescriptionData = (p: any): any => {
    return {
      prescription_id: p.prescription_id,
      prescription_date: p.prescription_date,
      advice: p.advice,
      patient_history: {
        patient_first_name: p.patient_history?.patient_bio_data?.patient_first_name || '',
        patient_last_name: p.patient_history?.patient_bio_data?.patient_last_name || '',
        patient_id: p.patient_history?.patient_bio_data?.patient_id || '',
        patient_display_id: p.patient_history?.patient_bio_data?.patient_id || '',
      },
      employees: {
        first_name: p.employees?.first_name || '',
        last_name: p.employees?.last_name || '',
        specialization: p.employees?.specialization || '',
      },
      patient_vitals: null,
      patient_allergies: null,
      patient_symptoms: null,
      prescription_items: (p.prescription_items || []).map((it: any) => ({
        medicine_name: it.medicine_master?.medicine_name || '',
        medicine_master: it.medicine_master,
        dosage: it.dosage,
        unit: it.unit,
        route: it.route,
        frequency: it.frequency,
        instruction: it.instruction,
        drug_role: it.drug_role,
      })),
    };
  };

  const openPrescriptionPdf = async (p: any, index: number) => {
    try {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      const patientId = p.patient_history?.patient_bio_data?.patient_id;
      const prescriptionDate = p.prescription_date;
      let vitals = null;
      let allergies = null;
      let symptoms = null;
      if (patientId) {
        try {
          // Fetch latest encounter for patient and pick one matching prescription date
          const encRes = await API.get('/encounters/latest', { params: { patientId, limit: 10 } });
          const encounters = encRes.data?.data?.encounters || encRes.data?.encounters || encRes.data || [];
          const targetDate = prescriptionDate ? new Date(prescriptionDate).toISOString().slice(0,10) : null;
          const enc = encounters.find((e:any) => {
            const eDate = e.encounter_ts ? new Date(e.encounter_ts).toISOString().slice(0,10) : null;
            return !targetDate || eDate === targetDate;
          }) || encounters[0];
          if (enc) {
            vitals = {
              bp: enc.systolic_bp && enc.diastolic_bp ? `${enc.systolic_bp}/${enc.diastolic_bp}` : enc.bp || '',
              pulse: enc.pulse,
              temperature: enc.temperature,
              weight: enc.weight,
              height: enc.height,
              spo2: enc.spo2,
            };
            // Fetch allergies
            try {
              const allergyRes = await API.get(`/clinical-details/patients/${patientId}/allergies`);
              allergies = allergyRes.data?.data || [];
            } catch {}
            // Fetch encounter symptoms if encounterNo exists
            if (enc.encounter_no) {
              try {
                const symRes = await API.get(`/clinical-details/encounters/${enc.encounter_no}`);
                const complete = symRes.data?.data || {};
                symptoms = complete.symptoms || symRes.data?.data?.symptoms || [];
              } catch {}
            }
          }
        } catch (e) {
          console.warn('Vitals fetch failed', e);
        }
      }
      const data = buildPrescriptionData(p);
      data.patient_vitals = vitals;
      data.patient_allergies = allergies;
      data.patient_symptoms = symptoms;
      const { url } = await generatePrescriptionPdf(data as any);
      setSelectedPrescription(p);
      setPrescriptionIndex(index);
      setPdfUrl(url);
    } catch (e) {
      console.error('Failed to generate PDF', e);
    }
  };

  const closePdfModal = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setSelectedPrescription(null);
    setPrescriptionIndex(null);
  };

  useEffect(() => {
    const resolvedPid = patientId || propPatientId || localStorage.getItem("hms_last_patient_id") || "";
    if (!resolvedPid) {
      setPlan(null);
      setCycleDetails([]);
      setHistoryError(
        "No patient selected. Open this page from a patient consultation to load history."
      );
      return;
    }
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError("");

    const fetchChemoHistory = async () => {
      try {
        // 1. Fetch latest chemotherapy plan and all patient plans
        let activePlan: SummaryPlan | null = null;
        try {
          activePlan = await loadLatestChemoPlan(resolvedPid);
        } catch (err) {
          console.warn("loadLatestChemoPlan failed, trying all plans listing", err);
        }

        const patientPlans = await loadAllPlansForPatient(resolvedPid);
        if (!activePlan && patientPlans.length > 0) {
          activePlan = patientPlans[0];
        }
        if (!activePlan && initialPlan) {
          activePlan = initialPlan;
        }

        // 2. Fetch all recorded chemotherapy cycles from backend
        const allCycles: ChemoCycleDetail[] = [];
        const planIds = new Set<string>();
        if (activePlan?.chemotherapy_plan_id) {
          planIds.add(activePlan.chemotherapy_plan_id);
        }
        if (initialPlan?.chemotherapy_plan_id) {
          planIds.add(initialPlan.chemotherapy_plan_id);
        }
        patientPlans.forEach((p) => {
          if (p?.chemotherapy_plan_id) planIds.add(p.chemotherapy_plan_id);
        });

        for (const pid of planIds) {
          const cycles = await loadCyclesForPlan(pid);
          if (cycles.length > 0) {
            allCycles.push(...cycles);
          }
        }

        // Also fetch individual cycle details for any cycles referenced in activePlan or initialPlan
        const fetchedIds = new Set(allCycles.map((c) => c.chemotherapy_cycle_id).filter(Boolean));
        const combinedRefCycles = [
          ...(activePlan?.chemotherapy_cycle ?? []),
          ...(initialPlan?.chemotherapy_cycle ?? []),
        ];
        const extraCycles = combinedRefCycles.filter(
          (c) => c.chemotherapy_cycle_id && !fetchedIds.has(c.chemotherapy_cycle_id)
        );

        if (extraCycles.length > 0) {
          const loadedExtra = await Promise.all(
            extraCycles.map((c) =>
              loadCycleDetail(c.chemotherapy_cycle_id as string).catch(() => null)
            )
          );
          allCycles.push(...loadedExtra.filter((d): d is ChemoCycleDetail => d !== null));
        }

        // Deduplicate cycles by cycle ID or cycle number
        const dedupedMap = new Map<string, ChemoCycleDetail>();
        allCycles.forEach((c) => {
          const key = c.chemotherapy_cycle_id || `cycle-${c.cycle_number}`;
          if (!dedupedMap.has(key)) {
            dedupedMap.set(key, c);
          }
        });
        const finalCycles = Array.from(dedupedMap.values()).sort(
          (a, b) => (a.cycle_number ?? 0) - (b.cycle_number ?? 0)
        );

        if (cancelled) return;

        // 3. Update plan with fully fetched cycle records
        if (activePlan) {
          const formattedCycles = finalCycles.map((c) => ({
            chemotherapy_cycle_id: c.chemotherapy_cycle_id,
            cycle_number: c.cycle_number,
            cycle_day: c.cycle_day,
            planned_date: c.planned_date,
            actual_date: c.actual_date,
            next_cycle_date: c.next_cycle_date,
            cycle_status: c.cycle_status,
            completion_status: c.completion_status,
            remarks: c.remarks,
          }));

          setPlan({
            ...activePlan,
            chemotherapy_cycle:
              formattedCycles.length > 0
                ? formattedCycles
                : activePlan.chemotherapy_cycle ?? [],
          });
        } else {
          setPlan(null);
        }

        setCycleDetails(finalCycles);
      } catch (err: any) {
        if (!cancelled) {
          setHistoryError(err?.message || "Failed to load treatment history.");
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    };

    fetchChemoHistory();
    return () => {
      cancelled = true;
    };
  }, [patientId, initialPlan]);

  useEffect(() => {
    if (!patientId) {
      setPrescriptions([]);
      setPrescriptionsError("");
      return;
    }
    let cancelled = false;
    setPrescriptionsLoading(true);
    setPrescriptionsError("");
    API.get(`/prescriptions/patient/${patientId}`)
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data?.prescriptions ?? [];
        setPrescriptions(data);
      })
      .catch((err) => {
        if (!cancelled) setPrescriptionsError(err?.response?.data?.message || "Failed to load prescriptions");
      })
      .finally(() => {
        if (!cancelled) setPrescriptionsLoading(false);
      });
    return () => { cancelled = true; };
  }, [patientId]);

  // Auto-load first prescription when list arrives
  useEffect(() => {
    if (prescriptions.length > 0 && prescriptionIndex === null) {
      openPrescriptionPdf(prescriptions[0], 0);
    }
    // Reset when patient changes
    if (prescriptions.length === 0) {
      closePdfModal();
    }
  }, [prescriptions]);

  const fmtHistoryDate = (value?: string | null) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return `${String(d.getDate()).padStart(2, "0")}-${String(
      d.getMonth() + 1
    ).padStart(2, "0")}-${d.getFullYear()}`;
  };

  const planCyclesSorted = [...(plan?.chemotherapy_cycle ?? [])].sort(
    (a, b) =>
      (b.planned_date ?? "").localeCompare(a.planned_date ?? "") ||
      b.cycle_number - a.cycle_number
  );

  const currentCycleInfo = (() => {
    if (!plan?.treatment_start_date || !plan?.cycle_interval_days) return null;
    const start = new Date(plan.treatment_start_date);
    if (Number.isNaN(start.getTime())) return null;
    const interval = plan.cycle_interval_days || 1;
    const planned = plan.planned_cycles || 1;
    const daysElapsed = Math.floor(
      (Date.now() - start.getTime()) / 86400000,
    );
    let cycle = daysElapsed < 0 ? 1 : Math.floor(daysElapsed / interval) + 1;
    if (planned > 0 && cycle > planned) cycle = planned;
    const d = new Date(start);
    d.setDate(d.getDate() + (cycle - 1) * interval);
    return { cycle, date: fmtHistoryDate(d.toISOString()) };
  })();

  /* Cycle-history table rows: agent/dose come from the plan's
     PRIMARY items (or all items if not tagged); outcome is the real cycle_status. */
  const primaryPlanItems = (plan?.chemotherapy_plan_items ?? []).filter(
    (item) => (item.drug_role ?? "").toUpperCase() === "PRIMARY"
  );
  const relevantPlanItems =
    primaryPlanItems.length > 0
      ? primaryPlanItems
      : (plan?.chemotherapy_plan_items ?? []);

  const cyclesToDisplay =
    planCyclesSorted.length > 0
      ? [...planCyclesSorted].sort((a, b) => a.cycle_number - b.cycle_number)
      : plan?.planned_cycles
      ? Array.from({ length: plan.planned_cycles }, (_, idx) => {
          const cNum = idx + 1;
          const interval = plan?.cycle_interval_days || 21;
          const start = plan?.treatment_start_date ? new Date(plan.treatment_start_date) : null;
          let pDate: string | null = null;
          if (start && !Number.isNaN(start.getTime())) {
            const d = new Date(start);
            d.setDate(start.getDate() + idx * interval);
            pDate = d.toISOString();
          }
          return {
            chemotherapy_cycle_id: undefined,
            cycle_number: cNum,
            cycle_day: 1,
            planned_date: pDate,
            actual_date: null,
            next_cycle_date: null,
            cycle_status: "PLANNED",
            completion_status: "PENDING",
            remarks: null,
          };
        })
      : [];

  const cycleHistoryRows = cyclesToDisplay.map((cycle) => {
    const detail = cycleDetails.find(
      (entry) =>
        (entry.chemotherapy_cycle_id &&
          entry.chemotherapy_cycle_id === cycle.chemotherapy_cycle_id) ||
        entry.cycle_number === cycle.cycle_number
    );
    const status = (
      detail?.cycle_status ??
      cycle.cycle_status ??
      "PLANNED"
    ).toUpperCase();

    const plannedDoseStr =
      relevantPlanItems
        .map((item) => {
          const dose = item.protocol_dose ?? item.calculated_dose;
          if (!dose) return null;
          const name = item.medicine_master?.medicine_name;
          const unit = item.protocol_dose_unit || item.calculated_dose_unit || "";
          return relevantPlanItems.length > 1 && name
            ? `${name}: ${dose} ${unit}`.trim()
            : `${dose} ${unit}`.trim();
        })
        .filter(Boolean)
        .join("; ") ||
      (relevantPlanItems[0]?.protocol_dose != null
        ? `${relevantPlanItems[0].protocol_dose} ${
            relevantPlanItems[0].protocol_dose_unit ?? ""
          }`.trim()
        : "—");

    const administeredDoseStr = (detail?.chemotherapy_administration ?? [])
      .map((adm: any) => {
        if (adm.administered_dose == null) return null;
        return `${adm.administered_dose} ${adm.administered_dose_unit ?? ""}`.trim();
      })
      .filter(Boolean)
      .join("; ");

    const actualDoseStr =
      administeredDoseStr || relevantPlanItems[0]?.calculated_dose || "—";

    return {
      cycle: `CYCLE ${String(cycle.cycle_number).padStart(2, "0")}`,
      dates: [
        fmtHistoryDate(detail?.planned_date || cycle.planned_date),
        fmtHistoryDate(detail?.actual_date || cycle.actual_date) ||
          fmtHistoryDate(detail?.next_cycle_date || cycle.next_cycle_date),
      ]
        .filter(Boolean)
        .join(" - "),
      agent:
        relevantPlanItems
          .map((item) => item.medicine_master?.medicine_name)
          .filter(Boolean)
          .join(", ") ||
        plan?.regimen_name ||
        "—",
      plannedDose: plannedDoseStr,
      actualDose: actualDoseStr,
      status,
    };
  });

  /* Medication history rows from the plan's saved items. */
  const medicationRows = (plan?.chemotherapy_plan_items ?? []).map((item) => ({
    medication: item.medicine_master?.medicine_name ?? "—",
    start: fmtHistoryDate(plan?.treatment_start_date),
    end:
      (plan?.treatment_status ?? "").toUpperCase() === "COMPLETED"
        ? fmtHistoryDate(plan?.expected_end_date) || "—"
        : "Ongoing",
    dosage:
      item.protocol_dose != null
        ? `${item.protocol_dose} ${item.protocol_dose_unit ?? ""}`.trim()
        : item.formulation || "—",
    route: item.administration_route || "—",
    active:
      (plan?.treatment_status ?? "").toUpperCase() === "COMPLETED"
        ? false
        : true,
  }));

  /* Adverse events aggregated across the fetched cycles. */
  interface AdverseEventRow {
    id: string;
    date: string;
    event: string;
    grade: string;
    action: string;
    outcome: string;
  }
  const adverseEventRows: AdverseEventRow[] = [];
  planCyclesSorted.forEach((cycle) => {
    const detail = cycleDetails.find(
      (entry) => entry.chemotherapy_cycle_id === cycle.chemotherapy_cycle_id
    );
    (detail?.chemotherapy_adverse_event ?? []).forEach((event, idx) => {
      adverseEventRows.push({
        id: event.adverse_event_id ?? `${cycle.chemotherapy_cycle_id}-${idx}`,
        date: fmtHistoryDate(event.event_date),
        event: event.adverse_event_name || "—",
        grade:
          String(
            event.ctcae_grade || event.reaction_grade || event.severity || "—"
          ),
        action:
          event.doctor_action ||
          event.nursing_action ||
          (event.dose_reduced
            ? "Dose reduced"
            : event.dose_delayed
            ? "Dose delayed"
            : event.treatment_interrupted
            ? "Treatment interrupted"
            : "None recorded"),
        outcome: event.treatment_stopped
          ? "STOPPED"
          : event.hospitalization_required
          ? "HOSPITALIZED"
          : "ONGOING",
      });
    });
  });
  adverseEventRows.sort((a, b) => b.date.localeCompare(a.date));

  /* Per-cycle average weight for the vitals trend chart. */
  const weightTrend = planCyclesSorted
    .map((cycle) => {
      const detail = cycleDetails.find(
        (entry) => entry.chemotherapy_cycle_id === cycle.chemotherapy_cycle_id
      );
      const weights = (detail?.chemotherapy_vitals ?? [])
        .map((vital) => Number(vital.weight))
        .filter((value) => !Number.isNaN(value) && value > 0);
      const avg =
        weights.length > 0
          ? weights.reduce((sum, value) => sum + value, 0) / weights.length
          : null;
      return {
        cycleNumber: cycle.cycle_number,
        weight: avg,
      };
    })
    .filter((entry) => entry.weight != null);
  const weightTrendMax = Math.max(...weightTrend.map((e) => e.weight ?? 0), 1);
  const weightTrendAvg =
    weightTrend.length > 0
      ? weightTrend.reduce((sum, entry) => sum + (entry.weight ?? 0), 0) /
        weightTrend.length
      : null;

  const fmtTimelineDate = (value?: string | Date | null): string => {
    if (!value) return "";
    const d = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const historyTimelineRange = (() => {
    const dates = planCyclesSorted
      .map((cycle) => cycle.actual_date || cycle.planned_date)
      .filter(Boolean)
      .sort();

    if (dates.length > 0) {
      const first = fmtTimelineDate(dates[0]);
      const last = fmtTimelineDate(dates[dates.length - 1]);
      return first === last ? first : `${first} - ${last}`;
    }

    if (plan?.treatment_start_date) {
      const d = new Date(plan.treatment_start_date);
      if (!Number.isNaN(d.getTime())) {
        const startMonthYear = d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
        if ((plan?.treatment_status ?? "").toUpperCase() === "COMPLETED" && plan?.expected_end_date) {
          const endD = new Date(plan.expected_end_date);
          const endMonthYear = !Number.isNaN(endD.getTime())
            ? endD.toLocaleDateString("en-GB", { month: "short", year: "numeric" })
            : "";
          return endMonthYear ? `${startMonthYear} - ${endMonthYear}` : `${startMonthYear} - Present`;
        }
        return `${startMonthYear} - Present`;
      }
    }

    return "No treatment dates recorded";
  })();

  /* Timeline entries straight from the patient's plan and saved cycles with clear status categories.
     If a cycle spans multiple days, each day is rendered as its own distinct card
     (e.g., CYCLE 01 DAY 01, CYCLE 01 DAY 02) to provide complete clarity. */
  const timelineItems = (() => {
    if (!plan && planCyclesSorted.length === 0 && !currentCycleInfo) {
      return [];
    }

    const isPlanCompleted =
      (plan?.treatment_status ?? "").toUpperCase() === "COMPLETED" ||
      (plan?.planned_cycles != null &&
        plan?.completed_cycles != null &&
        plan.completed_cycles >= plan.planned_cycles);

    const inProgressCycle = planCyclesSorted.find(
      (c) => (c.cycle_status ?? "").toUpperCase() === "IN_PROGRESS"
    );
    const activeCycleNum = isPlanCompleted
      ? null
      : inProgressCycle
      ? inProgressCycle.cycle_number
      : currentCycleInfo?.cycle ?? (plan?.completed_cycles ? plan.completed_cycles + 1 : 1);

    const maxRecordedCycle = planCyclesSorted.reduce(
      (max, c) => Math.max(max, c.cycle_number || 0),
      0
    );

    const totalCycles = Math.max(
      plan?.planned_cycles || (maxRecordedCycle > 0 ? maxRecordedCycle : 6),
      plan?.completed_cycles || 0,
      maxRecordedCycle,
      activeCycleNum || 0,
      1
    );

    const interval = plan?.cycle_interval_days || 21;
    const startDate = plan?.treatment_start_date ? new Date(plan.treatment_start_date) : null;

    const existingMap = new Map();
    const existingDayMap = new Map();
    planCyclesSorted.forEach((c) => {
      if (c.cycle_number != null) {
        existingMap.set(c.cycle_number, c);
        const dayKey = `${c.cycle_number}-${c.cycle_day ?? 1}`;
        if (!existingDayMap.has(dayKey)) {
          existingDayMap.set(dayKey, c);
        }
      }
    });

    const getDaysForCycle = (cNum: number): number[] => {
      const set = new Set<number>();
      const explicitDays = Number(regimenProtocol?.no_of_days);
      if (Number.isFinite(explicitDays) && explicitDays > 0) {
        for (let d = 1; d <= explicitDays; d++) set.add(d);
      }
      (regimenProtocol?.chemotherapy_regimen_protocol_days ?? []).forEach((d: any) => {
        const num = Number(d.day_number);
        if (Number.isFinite(num) && num > 0) set.add(num);
      });
      (regimenProtocol?.chemotherapy_regimen_protocol_items ?? []).forEach((item: any) => {
        const num = Number(item.administration_day ?? item.cycle_day);
        if (Number.isFinite(num) && num > 0) set.add(num);
      });
      (plan?.chemotherapy_plan_items ?? []).forEach((item) => {
        const num = Number(item.administration_day ?? item.cycle_day);
        if (Number.isFinite(num) && num > 0) set.add(num);
      });
      const matchingCycles = planCyclesSorted.filter((c) => c.cycle_number === cNum);
      matchingCycles.forEach((c) => {
        if (c.cycle_day != null && Number(c.cycle_day) > 0) set.add(Number(c.cycle_day));
        (c.chemotherapy_administration ?? []).forEach((adm: any) => {
          if (adm.administration_day != null && Number(adm.administration_day) > 0) {
            set.add(Number(adm.administration_day));
          }
        });
      });
      const sorted = Array.from(set).sort((a, b) => a - b);
      return sorted.length > 0 ? sorted : [1];
    };

    const items: Array<{
      id: string;
      cycle: string;
      date: string;
      description: string;
      final: boolean;
      status: string;
      category: "COMPLETED" | "CURRENT" | "UPCOMING";
      cycleNumber: number;
      dayNumber: number;
    }> = [];

    // Reverse order from totalCycles down to Cycle 1 (Cycle 6 at top, Cycle 1 at bottom)
    for (let cNum = totalCycles; cNum >= 1; cNum--) {
      const existing = existingMap.get(cNum);
      const detail = existing
        ? cycleDetails.find((d) => d.chemotherapy_cycle_id === existing.chemotherapy_cycle_id)
        : null;

      const isCompleted =
        isPlanCompleted ||
        (existing && (existing.cycle_status ?? "").toUpperCase() === "COMPLETED") ||
        (plan?.completed_cycles != null && cNum <= plan.completed_cycles) ||
        (activeCycleNum != null && cNum < activeCycleNum);

      const isCurrent =
        !isCompleted &&
        Boolean(
          (existing && (existing.cycle_status ?? "").toUpperCase() === "IN_PROGRESS") ||
            (activeCycleNum && cNum === activeCycleNum)
        );

      const cycleDaysAsc = getDaysForCycle(cNum);
      const hasManyDays = cycleDaysAsc.length > 1;
      const isFinalCycle = cNum === totalCycles;
      const maxCycleDay = cycleDaysAsc[cycleDaysAsc.length - 1];
      // Highest day on top and lowest day of the cycle at bottom
      const cycleDaysDescending = [...cycleDaysAsc].sort((a, b) => b - a);

      for (const dNum of cycleDaysDescending) {
        const isFinalDay = dNum === maxCycleDay;
        const isFinalCard = isFinalCycle && isFinalDay;

        const specificCycleDay = existingDayMap.get(`${cNum}-${dNum}`);
        const specificDetail = specificCycleDay
          ? cycleDetails.find((d) => d.chemotherapy_cycle_id === specificCycleDay.chemotherapy_cycle_id)
          : null;

        // Determine category for this day
        let dayCategory: "COMPLETED" | "CURRENT" | "UPCOMING" = "UPCOMING";
        if (
          isCompleted ||
          (specificCycleDay && (specificCycleDay.cycle_status ?? "").toUpperCase() === "COMPLETED")
        ) {
          dayCategory = "COMPLETED";
        } else if (activeCycleNum != null && cNum > activeCycleNum) {
          dayCategory = "UPCOMING";
        } else if (isCurrent) {
          const dayAdmin = (detail?.chemotherapy_administration ?? existing?.chemotherapy_administration ?? []).find(
            (adm: any) => Number(adm.administration_day) === dNum
          );
          if (dayAdmin && (dayAdmin.administration_status === "Completed" || dayAdmin.infusion_completed)) {
            dayCategory = "COMPLETED";
          } else if (currentCycleInfo?.day != null && hasManyDays) {
            if (dNum < currentCycleInfo.day) {
              dayCategory = "COMPLETED";
            } else if (dNum === currentCycleInfo.day) {
              dayCategory = "CURRENT";
            } else {
              dayCategory = "UPCOMING";
            }
          } else {
            dayCategory = dNum === 1 || !hasManyDays ? "CURRENT" : "UPCOMING";
          }
        } else {
          dayCategory = "UPCOMING";
        }

        // Dynamic real date for this day
        let dayDateStr = "";
        if (specificCycleDay?.actual_date || specificCycleDay?.planned_date) {
          const act = fmtTimelineDate(specificDetail?.actual_date || specificCycleDay.actual_date);
          const pln = fmtTimelineDate(specificDetail?.planned_date || specificCycleDay.planned_date);
          if (act && pln && act !== pln) {
            dayDateStr = `${pln} - ${act}`;
          } else {
            dayDateStr = act || pln || "";
          }
        }

        if (!dayDateStr) {
          const dayAdmin = (detail?.chemotherapy_administration ?? existing?.chemotherapy_administration ?? []).find(
            (adm: any) => Number(adm.administration_day) === dNum
          );
          if (dayAdmin?.administration_date) {
            dayDateStr = fmtTimelineDate(dayAdmin.administration_date);
          }
        }

        if (!dayDateStr && (detail?.actual_date || existing?.actual_date || detail?.planned_date || existing?.planned_date)) {
          const baseDateVal = detail?.actual_date || existing?.actual_date || detail?.planned_date || existing?.planned_date;
          const baseDate = new Date(baseDateVal as string);
          if (!Number.isNaN(baseDate.getTime())) {
            if (dNum === 1 || !hasManyDays) {
              const plannedStr = fmtTimelineDate(detail?.planned_date || existing?.planned_date);
              const actualStr = fmtTimelineDate(detail?.actual_date || existing?.actual_date);
              if (plannedStr && actualStr && plannedStr !== actualStr) {
                dayDateStr = `${plannedStr} - ${actualStr}`;
              } else {
                dayDateStr = actualStr || plannedStr || fmtTimelineDate(baseDate);
              }
            } else {
              const offsetDate = new Date(baseDate);
              offsetDate.setDate(offsetDate.getDate() + (dNum - 1));
              dayDateStr = fmtTimelineDate(offsetDate);
            }
          }
        }

        if (!dayDateStr && startDate && !Number.isNaN(startDate.getTime())) {
          const d = new Date(startDate);
          d.setDate(startDate.getDate() + (cNum - 1) * interval + (dNum - 1));
          dayDateStr = fmtTimelineDate(d);
        }

        // Title: CYCLE 01 DAY 01, CYCLE 01 DAY 02 if multi-day, else CYCLE 01
        let cycleTitle = hasManyDays
          ? `CYCLE ${String(cNum).padStart(2, "0")} DAY ${String(dNum).padStart(2, "0")}`
          : `CYCLE ${String(cNum).padStart(2, "0")}`;

        if (isFinalCard) {
          cycleTitle += " (FINAL)";
        }

        // Dynamic description from drugs scheduled for this day, remarks, or adverse events
        const dayMedicines = (plan?.chemotherapy_plan_items ?? [])
          .filter((item) => {
            if (!hasManyDays) return true;
            const itemDay = Number(item.administration_day ?? item.cycle_day ?? 1);
            return itemDay === dNum;
          })
          .map((item) => item.medicine_master?.medicine_name)
          .filter(Boolean);

        let description = "";
        if (dayMedicines.length > 0) {
          description = `Administered: ${dayMedicines.join(", ")}.`;
        }

        const remarksText =
          specificDetail?.remarks ||
          detail?.remarks ||
          specificCycleDay?.remarks ||
          existing?.remarks;
        if (remarksText?.trim()) {
          description = description
            ? `${description} ${remarksText.trim()}`
            : remarksText.trim();
        }

        if (!description) {
          const adverseEvents =
            specificDetail?.chemotherapy_adverse_event ??
            detail?.chemotherapy_adverse_event ??
            existing?.chemotherapy_adverse_event ??
            [];
          if (adverseEvents.length > 0) {
            const names = adverseEvents
              .map((ae) => {
                const grade = ae.ctcae_grade || ae.reaction_grade || ae.severity;
                return `${ae.adverse_event_name || "Adverse event"}${
                  grade ? ` (Grade ${grade})` : ""
                }`;
              })
              .join(", ");
            description = `Adverse events: ${names}.`;
          }
        }

        if (!description) {
          const dayLabel = hasManyDays
            ? `Day ${String(dNum).padStart(2, "0")}`
            : "Cycle";
          if (dayCategory === "CURRENT") {
            description = plan?.regimen_name
              ? `${dayLabel} in progress per ${plan.regimen_name} protocol.`
              : `${dayLabel} in progress as scheduled.`;
          } else if (dayCategory === "COMPLETED") {
            const comp =
              specificDetail?.completion_status ||
              detail?.completion_status ||
              existing?.completion_status;
            description = comp
              ? `${dayLabel} completed (${comp.replace(/_/g, " ")}).`
              : isFinalCard
              ? "Protocol completed. All planned cycles successfully administered."
              : `${dayLabel} completed as scheduled.`;
          } else {
            description = hasManyDays
              ? `Scheduled for Day ${String(dNum).padStart(2, "0")} administration per protocol.`
              : "Scheduled per treatment protocol.";
          }
        }

        const status = (
          specificCycleDay?.cycle_status ||
          (dayCategory === "COMPLETED"
            ? "COMPLETED"
            : dayCategory === "CURRENT"
            ? "IN_PROGRESS"
            : "SCHEDULED")
        ).toUpperCase();

        items.push({
          id: `cycle-${cNum}-day-${dNum}`,
          cycle: cycleTitle,
          date: dayDateStr,
          description,
          final: isFinalCard,
          status,
          category: dayCategory,
          cycleNumber: cNum,
          dayNumber: dNum,
        });
      }
    }

    return items;
  })();

  /* =========================================================
     CONTENT (PATIENT HEADER + HISTORY SECTIONS + ACTIONS)
  ========================================================= */

  const content = (
    <>
      {/* LIVE DATA STATUS */}
      {(historyLoading || historyError) && (
        <div className="p-6 pb-0">
          {historyLoading && (
            <div className="flex items-center rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
              <i className="fa-solid fa-circle-notch fa-spin mr-2" /> Loading
              treatment history…
            </div>
          )}
          {!historyLoading && historyError && (
            <div className="flex items-center rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <i className="fa-solid fa-triangle-exclamation mr-2" />{" "}
              {historyError}
            </div>
          )}
        </div>
      )}

      {/* TIMELINE + RIGHT COLUMN */}
      <div className="p-6 grid lg:grid-cols-3 gap-6 bg-slate-50/50">
        {/* LEFT */}
        <div className="lg:col-span-2">
          <div id="treatment-timeline-section" className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-chart-line text-blue-600" />

                <h2 className="text-lg font-bold text-gray-900">
                  Treatment Timeline
                </h2>
              </div>

              <span className="text-sm font-medium text-gray-500">
                {historyTimelineRange || "No treatment dates recorded"}
              </span>
            </div>

            {/* Timeline */}
            <div className="relative pl-4 space-y-4 max-h-[560px] overflow-y-auto pr-2" style={{ scrollbarWidth: "thin", scrollbarColor: "#2563eb #f1f5f9" }}>
              {timelineItems.length > 0 && (
                <div
                  aria-hidden="true"
                  className="absolute left-[21px] top-4 bottom-4 w-px bg-gray-200"
                />
              )}

              {timelineItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500">
                  No chemotherapy cycles found for this patient yet. Save a
                  Treatment Plan and record cycles to build the timeline.
                </div>
              ) : (
                timelineItems.map((item) => {
                  const isCompleted = item.category === "COMPLETED";
                  const isCurrent = item.category === "CURRENT";
                  const isUpcoming = item.category === "UPCOMING";

                  return (
                    <div
                      key={item.id}
                      className="relative flex items-start"
                    >
                      {/* Node circle on the vertical line with status colors */}
                      <div
                        className={`absolute left-[11px] top-3.5 w-5 h-5 rounded-full flex items-center justify-center ring-4 z-10 shadow-sm ${
                          isCompleted
                            ? "bg-emerald-600 ring-white"
                            : isCurrent
                            ? "bg-blue-600 ring-blue-100"
                            : "bg-slate-300 ring-white"
                        }`}
                      >
                        {isCompleted ? (
                          <i className="fa-solid fa-check text-white text-[10px]" />
                        ) : isCurrent ? (
                          <i className="fa-solid fa-play text-white text-[9px] ml-0.5" />
                        ) : (
                          <i className="fa-regular fa-calendar text-slate-600 text-[10px]" />
                        )}
                      </div>

                      {/* Clean timeline card matching design with green/blue/grey colors */}
                      <div
                        className={`ml-8 w-full rounded-xl p-4 transition hover:shadow-sm ${
                          isCompleted
                            ? "bg-white border border-emerald-200"
                            : isCurrent
                            ? "bg-blue-50/60 border border-blue-200"
                            : "bg-slate-50/60 border border-dashed border-slate-200"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1.5 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <h3
                              className={`font-bold text-sm ${
                                isCompleted
                                  ? "text-emerald-900"
                                  : isCurrent
                                  ? "text-blue-700"
                                  : "text-slate-600"
                              }`}
                            >
                              {item.cycle}
                            </h3>

                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                                isCompleted
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : isCurrent
                                  ? "bg-blue-100 text-blue-700 border-blue-200"
                                  : "bg-slate-100 text-slate-500 border-slate-200"
                              }`}
                            >
                              {isCompleted
                                ? "Completed"
                                : isCurrent
                                ? "Current"
                                : "Upcoming"}
                            </span>
                          </div>

                          <span
                            className={`text-xs sm:text-sm font-medium ${
                              isCurrent
                                ? "text-blue-600 font-semibold"
                                : isCompleted
                                ? "text-gray-500"
                                : "text-slate-400"
                            }`}
                          >
                            {item.date || "—"}
                          </span>
                        </div>

                        <p
                          className={`text-xs sm:text-sm leading-relaxed ${
                            isCompleted
                              ? "text-gray-600"
                              : isCurrent
                              ? "text-gray-700 font-medium"
                              : "text-slate-500"
                          }`}
                        >
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-6">
          {/* VITAL TREND */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-4">
              Vitals Trend History
            </h2>

            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 uppercase font-semibold mb-2">
                <span>WEIGHT (KG)</span>
                <span>
                  {weightTrendAvg != null
                    ? `Avg ${weightTrendAvg.toFixed(1)}`
                    : "No data"}
                </span>
              </div>

              <div className="flex items-end h-12 gap-1">
                {weightTrend.length === 0 ? (
                  <p className="text-xs text-gray-400">
                    No vitals recorded for any cycle yet.
                  </p>
                ) : (
                  weightTrend.map((entry) => (
                    <div
                      key={entry.cycleNumber}
                      title={`Cycle ${entry.cycleNumber}: ${(
                        entry.weight ?? 0
                      ).toFixed(1)} kg`}
                      className="w-full bg-blue-600 rounded-t"
                      style={{
                        height: `${Math.max(
                          8,
                          Math.round(((entry.weight ?? 0) / weightTrendMax) * 100)
                        )}%`,
                      }}
                    />
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-medium">
                BP / PULSE / TEMP
              </span>

              <button
                type="button"
                className="text-blue-600 font-bold hover:underline"
              >
                VIEW DETAILED CHARTS
              </button>
            </div>
          </div>

          {/* DOCUMENT HISTORY */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-gray-900">
                Document History
              </h2>
            </div>

            {prescriptionsLoading ? (
              <div className="text-xs text-gray-500">Loading prescriptions…</div>
            ) : prescriptionsError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{prescriptionsError}</div>
            ) : prescriptions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50/50 p-4 text-center text-xs text-gray-400">
                No prescriptions found for this patient yet.
              </div>
            ) : (
                  <div className="space-y-3">
                {selectedPrescription && pdfUrl && (
                  <>
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                      <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="text-base font-bold text-red-800">{selectedPrescription.diagnosis?.diagnosis_name || '—'}</div>
                              {selectedPrescription.chief_complaint && (
                                <div className="text-xs text-red-700 mt-1">{selectedPrescription.chief_complaint}</div>
                              )}
                            </div>
                            <div className="text-xs text-red-600">
                              {selectedPrescription.prescription_date ? new Date(selectedPrescription.prescription_date).toLocaleDateString() : '—'}
                            </div>
                          </div>
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700"
                          >
                            View
                          </a>
                          <button
                            type="button"
                            className="text-xs px-3 py-1.5 rounded border border-red-300 text-red-700 hover:bg-red-50"
                            onClick={async () => {
                              try {
                                const data = buildPrescriptionData(selectedPrescription);
                                const { url } = await generatePrescriptionPdf(data as any);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `prescription-${selectedPrescription.prescription_id}.pdf`;
                                a.click();
                                URL.revokeObjectURL(url);
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                          >
                            Download
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-3">
                        <button
                          type="button"
                          className="text-[10px] px-2 py-1 rounded border border-gray-300 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                          disabled={prescriptionIndex === null || prescriptionIndex <= 0}
                          onClick={() => {
                            if (prescriptionIndex !== null && prescriptionIndex > 0) {
                              const newIdx = prescriptionIndex - 1;
                              openPrescriptionPdf(prescriptions[newIdx], newIdx);
                            }
                          }}
                        >
                          Previous
                        </button>
                        <span className="text-[10px] text-gray-600">
                          {prescriptions.length > 0 && prescriptionIndex !== null ? `${prescriptionIndex + 1} / ${prescriptions.length}` : '0 / 0'}
                        </span>
                        <button
                          type="button"
                          className="text-[10px] px-2 py-1 rounded border border-gray-300 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                          disabled={prescriptionIndex === null || prescriptionIndex >= prescriptions.length - 1}
                          onClick={() => {
                            if (prescriptionIndex !== null && prescriptionIndex < prescriptions.length - 1) {
                              const newIdx = prescriptionIndex + 1;
                              openPrescriptionPdf(prescriptions[newIdx], newIdx);
                            }
                          }}
                        >
                          Next
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

      {/* CHEMOTHERAPY CYCLE HISTORY */}
      <section id="chemotherapy-cycle-history" className="px-6 pb-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex justify-between items-center p-5 border-b border-gray-200 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-900">
              Chemotherapy Cycle History
            </h2>

            <button
              type="button"
              onClick={() => {
                document.getElementById("treatment-timeline-section")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-sm text-blue-600 font-bold hover:underline"
            >
              View Protocol Details
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 font-semibold">
                    Cycle
                  </th>

                  <th className="px-6 py-3 font-semibold">
                    Dates
                  </th>

                  <th className="px-6 py-3 font-semibold">
                    Agent
                  </th>

                  <th className="px-6 py-3 font-semibold">
                    Planned Dose
                  </th>

                  <th className="px-6 py-3 font-semibold">
                    Actual Dose
                  </th>

                  <th className="px-6 py-3 font-semibold text-right">
                    Outcome
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {cycleHistoryRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-6 text-center text-xs text-gray-400"
                    >
                      No chemotherapy cycles recorded for this patient yet.
                    </td>
                  </tr>
                ) : (
                  cycleHistoryRows.map((row) => (
                    <tr
                      key={row.cycle}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {row.cycle}
                      </td>

                      <td className="px-6 py-4 text-gray-500">
                        {row.dates || "—"}
                      </td>

                      <td className="px-6 py-4 text-gray-700">
                        {row.agent}
                      </td>

                      <td className="px-6 py-4 text-gray-700">
                        {row.plannedDose}
                      </td>

                      <td className="px-6 py-4 text-gray-700">
                        {row.actualDose}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            row.status === "COMPLETED"
                              ? "bg-green-100 text-green-800"
                              : row.status === "IN_PROGRESS" ||
                                row.status === "ADMINISTERED"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {row.status === "COMPLETED"
                            ? "SUCCESSFUL"
                            : row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* MEDICATION HISTORY */}
      <section className="px-6 pb-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex justify-between items-center p-5 border-b border-gray-200 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-900">
              Medication History
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 font-semibold">
                    Medication
                  </th>

                  <th className="px-6 py-3 font-semibold">
                    Start Date
                  </th>

                  <th className="px-6 py-3 font-semibold">
                    End Date
                  </th>

                  <th className="px-6 py-3 font-semibold">
                    Dosage
                  </th>

                  <th className="px-6 py-3 font-semibold">
                    Route
                  </th>

                  <th className="px-6 py-3 font-semibold text-right">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {medicationRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-6 text-center text-xs text-gray-400"
                    >
                      No medications prescribed for this patient yet.
                    </td>
                  </tr>
                ) : (
                  medicationRows.map((medication) => (
                    <tr
                      key={medication.medication}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {medication.medication}
                      </td>

                      <td className="px-6 py-4 text-gray-500">
                        {medication.start || "—"}
                      </td>

                      <td className="px-6 py-4 text-gray-500">
                        {medication.end}
                      </td>

                      <td className="px-6 py-4 text-gray-700">
                        {medication.dosage}
                      </td>

                      <td className="px-6 py-4 text-gray-700">
                        {medication.route}
                      </td>

                      <td className="px-6 py-4 text-right">
                        {medication.active ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            COMPLETED
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ADVERSE EVENTS */}
      <section className="px-6 pb-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex justify-between items-center p-5 border-b border-gray-200 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-900">
              Adverse Events History
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 font-semibold">
                    Date
                  </th>

                  <th className="px-6 py-3 font-semibold">
                    Event
                  </th>

                  <th className="px-6 py-3 font-semibold">
                    Grade
                  </th>

                  <th className="px-6 py-3 font-semibold">
                    Action Taken
                  </th>

                  <th className="px-6 py-3 font-semibold text-right">
                    Outcome
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {adverseEventRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-6 text-center text-xs text-gray-400"
                    >
                      No adverse events recorded for this patient yet.
                    </td>
                  </tr>
                ) : (
                  adverseEventRows.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-500">
                        {event.date || "—"}
                      </td>

                      <td className="px-6 py-4 font-medium text-gray-900">
                        {event.event}
                      </td>

                      <td className="px-6 py-4 text-gray-700">
                        {event.grade}
                      </td>

                      <td className="px-6 py-4 text-gray-700">
                        {event.action}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            event.outcome === "ONGOING"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {event.outcome}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ACTION BUTTONS */}
      <div className="px-6 pb-8 flex justify-end gap-4">
        <button
          type="button"
          className="px-6 py-2.5 border border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-sm"
        >
          Save &amp; Exit
        </button>

        <button
          type="button"
          className="px-6 py-2.5 border border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors text-sm"
        >
          Generate Report
        </button>

        <button
          type="button"
          className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm"
        >
          Submit Review
        </button>
      </div>
    </>
  );

  if (embedded) {
    return (
      <>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
        <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {content}
        </div>
      </>
    );
  }

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
      />
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans">
        {/* TOP HEADER */}
        <header className="bg-[#f2f4f7] border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          

          <div className="flex items-center gap-6">
            <BellNotificationButton size="md" />

            <span className="text-blue-600 font-semibold text-sm">
              HMS
            </span>

            <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-300 flex items-center justify-center overflow-hidden">
              <i className="fa-solid fa-user text-white text-xs" />
            </div>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className="max-w-[1400px] mx-auto bg-white flex-grow pb-12 w-full shadow-sm">
          {content}
        </main>

        {/* FOOTER */}
        <footer className="bg-white border-t border-gray-200 mt-auto">
          <div className="max-w-[1400px] mx-auto px-6 py-6 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
            <div className="mb-4 md:mb-0">
              © 2026 Hospital Management System. All rights reserved.
            </div>

            <div className="flex gap-6">
              <button className="hover:text-gray-900 transition-colors">
                Privacy Policy
              </button>

              <button className="hover:text-gray-900 transition-colors">
                Terms of Service
              </button>

              <button className="hover:text-gray-900 transition-colors">
                Help Center
              </button>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

/* ============================================================
   PATIENT DISCHARGE DASHBOARD COMPONENT
   (combined from client/pages/doctor/discharage  details.tsx —
    renamed PatientDischargeDashboard → DischargeDetailsPortal
    so it can live in this file, original file left untouched)
============================================================ */

function DischargeDetailsPortal({
  onBack,
  patientId,
}: {
  onBack?: () => void;
  patientId?: string;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [showNotesDocs, setShowNotesDocs] = useState(false);
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [planPreview, setPlanPreview] = useState<ChemoPlanPreview | null>(null);
  const [stagingDetail, setStagingDetail] =
    useState<StagingDetailRecord | null>(null);
  const [planPreviewLoading, setPlanPreviewLoading] = useState(false);
  const [planPreviewError, setPlanPreviewError] = useState("");
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [dischargePlan, setDischargePlan] = useState<SummaryPlan | null>(null);


  /* Latest vitals (encounter + chemo merged, one shared fetch set)
     - also supplies the drug-reaction count for this portal.
     Re-runs when the branch selection changes so scoped fallbacks and
     the chemo chain pick up the new x-branch-id header. */
  const { selectedBranchId } = useBranchFilter();
  const {
    latestEncounter,
    latestChemoVitals,
    adverseEventCount: reactionCount,
    vitals: mergedVitals,
    vitalEntries,
    lastCheckedLabel,
    scopeHint,
  } = useLatestPatientVitals(patientId, selectedBranchId);
  const [dischargeAllergies, setDischargeAllergies] = useState<
    PatientAllergyRecord[]
  >([]);

  // Recent details for THIS selected patient via
  // /chemotherapy/plans/preview?staging_detail_id=<latest staging detail>.
  // Also loads the live patient record (api/patient.api) and the saved
  // chemotherapy plan; vitals + adverse events come from the hook above.
  useEffect(() => {
    if (!patientId) {
      setPlanPreview(null);
      setStagingDetail(null);
      setPatient(null);
      setDischargePlan(null);
      setPlanPreviewLoading(false);
      setPlanPreviewError(
        "No patient selected. Open this page from a patient consultation to load recent details."
      );
      return;
    }
    let cancelled = false;
    setPlanPreviewLoading(true);
    setPlanPreviewError("");

    /* Live patient identity via GET /patients/:id (api/patient.api). */
    patientApi
      .getById(patientId)
      .then((response) => {
        if (!cancelled) setPatient(response.data?.data ?? null);
      })
      .catch(() => {
        /* Header falls back to staging/patient bio when unavailable. */
      });

    /* Saved plan (intent, cycle stats, treatment status). */
    loadLatestChemoPlan(patientId)
      .then((loaded) => {
        if (!cancelled) setDischargePlan(loaded);
      })
      .catch(() => {
        /* Plan-dependent panels fall back to their empty states. */
      });

    loadLatestPlanPreview(patientId)
      .then(({ preview, staging, error }) => {
        if (cancelled) return;
        setPlanPreview(preview);
        setStagingDetail(staging);
        setPlanPreviewError(error);
      })
      .finally(() => {
        if (!cancelled) setPlanPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [patientId, selectedBranchId]);

  useEffect(() => {
    if (!patientId) {
      setDischargeAllergies([]);
      return;
    }
    let cancelled = false;
    API.get<{ success: boolean; data: PatientAllergyRecord[] }>(
      `/clinical-details/patients/${patientId}/allergies`
    )
      .then((response) => {
        if (!cancelled) setDischargeAllergies(response.data?.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setDischargeAllergies([]);
      });
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const dischargeAllergyNames = dischargeAllergies
    .map((item) => item.allergy_master?.substance_name)
    .filter(Boolean)
    .join(", ");

  const orderSummaryDiagnosis = planPreview
    ? [planPreview.cancer_type, planPreview.cancer_subtype]
        .filter(Boolean)
        .join(" — ")
    : "";

  /* Every non-empty saved field, ready to render. */
  const fmtDate = (value?: string | null) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return `${String(d.getDate()).padStart(2, "0")}-${String(
      d.getMonth() + 1
    ).padStart(2, "0")}-${d.getFullYear()}`;
  };

  const buildEntries = (pairs: [string, unknown][]): [string, string][] =>
    pairs
      .map(([label, value]) => {
        let v: unknown = value;
        if (v === null || v === undefined || v === "") return null;
        if (typeof v === "object") v = JSON.stringify(v);
        return [label, String(v)] as [string, string];
      })
      .filter((p): p is [string, string] => p !== null);

  const sd = stagingDetail;
  const ihc = sd?.ihc_results ?? null;
  const mol = sd?.molecular_results ?? null;
  const der = sd?.derived_fields ?? null;

  const diagnosisEntries = buildEntries([
    ["Cancer Type", sd?.cancer_types?.cancer_type],
    ["Subtype", sd?.cancer_subtypes?.subtype_name],
    ["Clinical Stage", sd?.clinical_stage],
    ["Staging System", sd?.staging_system],
    ["T Stage", sd?.t_stage],
    ["N Stage", sd?.n_stage],
    ["M Stage", sd?.m_stage],
    ["Laterality", sd?.laterality],
    ["Performance Status", sd?.performance_status],
    ["Metastasis Sites", sd?.metastasis_sites],
    ["ICD-10", sd?.icd10_code],
    ["ICD-O-3 Topography", sd?.icd_o3_topo],
    ["ICD-O-3 Morphology", sd?.icd_o3_morpho],
    ["Visit Date", sd?.visit_date ? fmtDate(sd.visit_date) : ""],
    ["Diagnosis Date", sd?.diagnosis_date ? fmtDate(sd.diagnosis_date) : ""],
    ["Biopsy Date", sd?.biopsy_date ? fmtDate(sd.biopsy_date) : ""],
    [
      "Consulting Oncologist",
      sd?.consulting_oncologist ||
        (sd?.employees
          ? [sd.employees.first_name, sd.employees.last_name]
              .filter(Boolean)
              .join(" ")
          : ""),
    ],
    ["Patient", sd?.patient_bio_data
      ? [
          sd.patient_bio_data.patient_first_name,
          sd.patient_bio_data.patient_last_name,
        ]
          .filter(Boolean)
          .join(" ") +
        (sd.patient_bio_data.patient_gender ||
        sd.patient_bio_data.patient_age
          ? ` — ${
              sd.patient_bio_data.patient_age ?? ""
            } ${sd.patient_bio_data.patient_gender ?? ""}`.trim()
          : "")
      : ""],
    ["Diagnosis ID", sd?.diagnosis_id],
    ["Staging Detail ID", sd?.staging_detail_id],
    ["Saved On", sd?.created_at ? fmtDate(sd.created_at) : ""],
  ]);

  const derivedEntries = der
    ? buildEntries([
        ["AJCC Stage (auto)", der.ajcc_stage],
        ["Breast Molecular Subtype", der.breast_mol_subtype],
        ["TNBC Subtype", der.tnbc_subtype],
        ["ELN Risk", der.eln_risk],
        ["Deauville Score", der.lymphoma_deauville],
        ["PD-L1 Score Type", der.pdl1_score_type],
        ["Suggested Therapy", der.suggested_therapy],
        ["Recommended Tests", der.recommended_tests],
        ["ICD-10 (auto)", der.icd10_auto],
        ["ICD-O-3 (auto)", der.icd_o3_auto],
        [
          "Germline Referral",
          der.germline_referral_flag == null
            ? ""
            : der.germline_referral_flag
            ? "Required"
            : "Not required",
        ],
        [
          "Lynch Syndrome",
          der.lynch_syndrome_flag == null
            ? ""
            : der.lynch_syndrome_flag
            ? "Positive"
            : "Negative",
        ],
        [
          "HER2 Positive",
          sd && sd.her2_positive != null
            ? sd.her2_positive
              ? "Yes"
              : "No"
            : "",
        ],
      ])
    : [];

  const ihcEntries = ihc
    ? buildEntries([
        ["ER Status", ihc.er_status],
        ["ER %", ihc.er_percent],
        ["PR Status", ihc.pr_status],
        ["PR %", ihc.pr_percent],
        ["HER2 IHC", ihc.her2_ihc],
        ["HER2 FISH", ihc.her2_fish],
        ["HER2 FISH Ratio", ihc.her2_fish_ratio],
        ["HER2 Avg Copy", ihc.her2_avg_copy],
        ["Ki-67 %", ihc.ki67_percent],
        ["PD-L1 TPS", ihc.pdl1_tps],
        ["PD-L1 CPS", ihc.pdl1_cps],
        ["PD-L1 Clone", ihc.pdl1_clone],
        ["MMR MLH1", ihc.mmr_mlh1],
        ["MMR MSH2", ihc.mmr_msh2],
        ["MMR MSH6", ihc.mmr_msh6],
        ["MMR PMS2", ihc.mmr_pms2],
        ["MMR Overall", ihc.mmr_overall],
        ["p53 IHC", ihc.p53_ihc],
        ["AR Status", ihc.ar_status],
        ["MLH1 Methylation", ihc.mlh1_methylation],
      ])
    : [];

  const molecularEntries = mol
    ? buildEntries([
        ["EGFR Status", mol.egfr_status],
        ["EGFR Mutation Type", mol.egfr_mutation_type],
        ["ALK Status", mol.alk_status],
        ["ALK Test Method", mol.alk_test_method],
        ["ROS1 Status", mol.ros1_status],
        ["KRAS G12C", mol.kras_g12c],
        ["KRAS Mutation", mol.kras_mutation],
        ["BRAF V600E", mol.braf_v600e],
        ["BRCA1 Germline", mol.brca1_germline],
        ["BRCA2 Germline", mol.brca2_germline],
        ["BRCA Somatic", mol.brca_somatic],
        ["HRD Status", mol.hrd_status],
        ["HRD Score", mol.hrd_score],
        ["HRD Assay", mol.hrd_assay],
        ["MSI Status", mol.msi_status],
        ["MSI Test Method", mol.msi_test_method],
        ["TMB", mol.tmb],
        ["TMB Assay", mol.tmb_assay],
        ["NGS Panel", mol.ngs_panel],
        ["FLT3-ITD", mol.flt3_itd],
        ["FLT3-ITD Allelic Ratio", mol.flt3_itd_allelic_ratio],
        ["FLT3 TKD", mol.flt3_tkd],
        ["NPM1 Mutation", mol.npm1_mutation],
        ["IDH1 Mutation", mol.idh1_mutation],
        ["IDH2 Mutation", mol.idh2_mutation],
        ["BCR-ABL1", mol.bcr_abl1],
        ["BCR-ABL1 Transcript", mol.bcr_abl1_transcript],
      ])
    : [];

  const renderEntryGrid = (entries: [string, string][]) => (
    <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
      {entries.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/60 p-4">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="break-words text-sm font-semibold text-slate-800">{value}</p>
        </div>
      ))}
    </div>
  );

  const tabs = [
    "Order Summary",
    "Medications",
    "Discharge",
    "History",
    "Notes & Documents",
  ];

  /* =========================================================
     REAL DATA DERIVATIONS (patient record, saved plan, latest
     recorded vitals, staging details)
  ========================================================= */

  const dischargeName = patient
    ? [
        patient.patient_first_name,
        patient.patient_middle_name,
        patient.patient_last_name,
      ]
        .filter(Boolean)
        .join(" ") || patient.patient_id
    : sd?.patient_bio_data
    ? [
        sd.patient_bio_data.patient_first_name,
        sd.patient_bio_data.patient_last_name,
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  const dischargeAgeSex = patient
    ? `${patient.patient_age ?? "—"}Y / ${patient.patient_gender ?? ""}`
    : sd?.patient_bio_data
    ? `${sd.patient_bio_data.patient_age ?? "—"}Y / ${
        sd.patient_bio_data.patient_gender ?? ""
      }`
    : "";

  const dischargePhoto = patient?.patient_photo_url || "";

  const dischargeDiagnosis =
    [
      orderSummaryDiagnosis,
      stagingDetail?.clinical_stage || planPreview?.clinical_stage,
    ]
      .filter(Boolean)
      .join(" • ") || "";

  /* Vital display values come from useLatestPatientVitals above
     (encounter first, chemo-cycle fallback per field; BSA falls back
     to a Mosteller derivation from height & weight). */
  const headerVitals = (label: string) =>
    vitalEntries.find(([key]) => key === label)?.[1] || "—";

  const intentTherapy =
    dischargePlan?.regimen_name ||
    planPreview?.matching_protocols?.[0]?.regimen_name ||
    planPreview?.suggested_therapy ||
    "";
  const intentLabel = dischargePlan?.treatment_intent || "";

  /* Take-home medications: REAL rows fetched from
     GET /chemotherapy/regimen-protocols/:protocolId/discharge-medicines -
     the protocol is the saved plan's source protocol, falling back to
     the first matching protocol of the diagnosis preview. */
  const dischargeProtocolId =
    dischargePlan?.source_protocol_id ||
    planPreview?.matching_protocols?.[0]?.protocol_id ||
    "";
  const {
    rows: dischargeMedicineRows,
    loading: dischargeMedsLoading,
    error: dischargeMedsError,
  } = useDischargeMedicines(dischargeProtocolId);

  const medications = dischargeMedicineRows.map((item) => ({
    id:
      item.discharge_instruction_id ??
      `${item.protocol_id}-${item.drug_sequence ?? ""}`,
    medication: item.medicine_master?.medicine_name ?? "—",
    composition:
      item.composition || item.medicine_master?.generic_name || "—",
    dose:
      item.patient_dose != null && item.patient_dose !== ""
        ? `${item.patient_dose} ${
            item.patient_dose_unit ?? item.medicine_master?.unit ?? ""
          }`.trim()
        : "—",
    frequency: item.frequency || "—",
    duration: item.duration || "—",
  }));

  /* Final vital signs - freshest recorded values (encounter first,
     chemo-cycle fallback per field). */
  const vitals = [
    {
      label: "BP",
      value:
        mergedVitals.bpSystolic != null && mergedVitals.bpDiastolic != null
          ? `${mergedVitals.bpSystolic}/${mergedVitals.bpDiastolic}`
          : "—",
      status:
        latestEncounter?.systolic_bp != null ||
        latestEncounter?.diastolic_bp != null
          ? "Recorded"
          : latestChemoVitals?.vital_stage || "Not recorded",
    },
    {
      label: "Pulse",
      value: mergedVitals.pulse != null ? `${mergedVitals.pulse} bpm` : "—",
      status: "Recorded",
    },
    {
      label: "Temp",
      value: mergedVitals.temp != null ? `${mergedVitals.temp} °C` : "—",
      status: "Recorded",
    },
    {
      label: "SpO2",
      value: mergedVitals.spo2 != null ? `${mergedVitals.spo2}%` : "—",
      status: latestChemoVitals?.oxygen_support ? "On Support" : "Room Air",
    },
  ];

  /* Cycle stats computed from the saved plan + its cycles. */
  const allDischargeCycles = dischargePlan?.chemotherapy_cycle ?? [];
  const administeredCount = allDischargeCycles.filter((cycle) =>
    ((cycle.cycle_status ?? "")).toUpperCase() === "COMPLETED"
  ).length;
  const treatmentDurationLabel = (() => {
    const start = dischargePlan?.treatment_start_date
      ? new Date(dischargePlan.treatment_start_date)
      : null;
    const endCandidates = allDischargeCycles
      .map((cycle) => cycle.actual_date ?? cycle.planned_date)
      .filter(Boolean)
      .sort();
    const end = endCandidates.length
      ? new Date(endCandidates[endCandidates.length - 1])
      : dischargePlan?.expected_end_date
      ? new Date(dischargePlan.expected_end_date)
      : null;
    if (
      !start ||
      !end ||
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      return "";
    }
    const days = Math.max(
      0,
      Math.round((end.getTime() - start.getTime()) / 86400000)
    );
    return `${days} day${days === 1 ? "" : "s"}`;
  })();
  const checklist: string[] = [];

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
      <div className="font-[Inter,sans-serif] text-[#1e293b] antialiased flex h-screen overflow-hidden bg-[#f8fafc]">

{/* BEGIN: Main Content */}
<main className="flex-1 flex flex-col h-full overflow-hidden bg-[#f8fafc] relative">
{/* BEGIN: Top Header */}
<header className="h-[72px] bg-[#f8fafc] border-b border-[#e2e8f0] flex items-center justify-between px-8 shrink-0 z-10">
<div className="flex items-center gap-4">
{onBack && (
<button type="button" aria-label="Go back" onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-slate-100">
<svg viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
<path d="M19 12H5" />
<path d="m12 19-7-7 7-7" />
</svg>
</button>
)}

</div>
<div className="flex items-center space-x-6">
<BellNotificationButton size="md" />
<div className="flex items-center space-x-3 cursor-pointer pl-6 border-l border-[#e2e8f0]">
<span className="text-sm font-bold text-[#1d4ed8]">HMS</span>
<div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white">
<i className="fa-solid fa-user text-sm"></i>
</div>
</div>
</div>
</header>
{/* END: Top Header */}
<div className="flex-1 overflow-y-auto relative">
<div className="p-8 max-w-[1400px] mx-auto pb-32">
{/* BEGIN: Patient Header Card */}
<div className="bg-white rounded-[16px] border border-[#e2e8f0] p-6 shadow-sm mb-6 flex justify-between items-center">
<div className="flex items-center">
{dischargePhoto ? (
<img alt={dischargeName} className="w-20 h-20 rounded-full border-4 border-white shadow-sm object-cover" src={dischargePhoto}/>
) : (
<div className="w-20 h-20 rounded-full border-4 border-white shadow-sm bg-slate-100 flex items-center justify-center text-slate-500">
<i className="fa-solid fa-user text-2xl"></i>
</div>
)}
<div className="ml-6">
<div className="flex items-center space-x-3 mb-1">
<h2 className="text-xl font-bold text-[#1e293b]">{dischargeName || "—"}</h2>
<span className="bg-slate-100 text-[#64748b] px-3 py-1 rounded-full text-xs font-semibold">{patientId || sd?.patient_id || ""}</span>
</div>
<div className="text-sm text-[#64748b] flex items-center space-x-3">
<span>{dischargeAgeSex || "—"}</span>
<span className="w-1 h-1 rounded-full bg-slate-300"></span>
<span className="text-[#1d4ed8] font-semibold">{dischargeDiagnosis || "No diagnosis saved yet"}</span>
</div>
</div>
</div>
<div className="flex items-center">
<div className="flex space-x-8 px-8 border-r border-[#e2e8f0]">
<div className="space-y-4">
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">HEIGHT</div>
<div className="font-bold text-sm">{headerVitals("HEIGHT")}</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">BP</div>
<div className="font-bold text-sm">{headerVitals("BP")}</div>
</div>
</div>
<div className="space-y-4">
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">WEIGHT</div>
<div className="font-bold text-sm">{headerVitals("WEIGHT")}</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">PULSE</div>
<div className="font-bold text-sm">{headerVitals("PULSE")}</div>
</div>
</div>
<div className="space-y-4">
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">BSA</div>
<div className="font-bold text-sm">{headerVitals("BSA")}</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">TEMP</div>
<div className="font-bold text-sm">{headerVitals("TEMP")}</div>
</div>
</div>
<div className="space-y-4">
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">BMI</div>
<div className="font-bold text-sm">{headerVitals("BMI")}</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">SPO2</div>
<div className="font-bold text-sm">{headerVitals("SPO2")}</div>
</div>
</div>
</div>
<div className="pl-8">
<div className="bg-blue-50/50 border border-blue-100 rounded-[12px] p-4 w-[220px]">
<div className="text-[10px] font-bold text-[#1d4ed8] uppercase tracking-wider mb-1.5">INTENT: {intentLabel || "NOT RECORDED"}</div>
<div className="text-[15px] font-bold text-[#1d4ed8] mb-2.5">{intentTherapy || "—"}</div>
<div className="flex items-center text-xs text-[#64748b] font-medium">
<span className={`w-2 h-2 rounded-full mr-2 ${((dischargePlan?.treatment_status ?? "")).toUpperCase() === "COMPLETED" ? "bg-[#10b981]" : "bg-[#f59e0b]"}`}></span> {((dischargePlan?.treatment_status ?? "").toUpperCase() === "COMPLETED" ? "Protocol Completed" : dischargePlan ? "Active Protocol" : "No Plan Saved")}
                    </div>
</div>
</div>
</div>
</div>
{/* END: Patient Header Card */}
{/* BEGIN: Alerts Banner */}
<div className="flex items-center justify-between text-sm mb-8 border-b border-[#e2e8f0] pb-4">
<div className="flex items-center space-x-8">
<div className="flex items-center">
<i className="fa-solid fa-triangle-exclamation text-[#ef4444] mr-2"></i>
<span className="text-[#ef4444] font-semibold">Allergy:</span> <span className="ml-1 text-[#1e293b]">{dischargeAllergyNames || "—"}</span>
</div>
<div className="flex items-center">
<i className="fa-solid fa-clock-rotate-left text-[#f59e0b] mr-2"></i>
<span className="text-[#f59e0b] font-semibold">Previous Cycle:</span> <span className="ml-1 text-[#1e293b]">{dischargePlan?.completed_cycles ? `Cycle ${dischargePlan.completed_cycles} completed` : "—"}</span>
</div>
</div>
</div>
{/* END: Alerts Banner */}
{/* BEGIN: Tabs */}
<div className="border-b border-[#e2e8f0] mb-6">
<nav className="flex space-x-8">
{tabs.map((tab) => {
const isActive = showNotesDocs ? tab === "Notes & Documents" : showHistory ? tab === "History" : showOrderSummary ? tab === "Order Summary" : tab === "Discharge";
return (
<button key={tab} type="button" onClick={() => { if (tab === "History") { setShowHistory(true); setShowNotesDocs(false); setShowOrderSummary(false); return; } if (tab === "Notes & Documents") { setShowNotesDocs(true); setShowHistory(false); setShowOrderSummary(false); return; } if (tab === "Order Summary") { setShowHistory(false); setShowNotesDocs(false); setShowOrderSummary(true); return; } setShowHistory(false); setShowNotesDocs(false); setShowOrderSummary(false); if (tab !== "Discharge") { onBack?.(); } }} className={`px-1 py-3 border-b-2 text-sm font-medium transition-colors ${isActive ? "border-[#1d4ed8] text-[#1d4ed8] font-semibold" : "border-transparent text-[#64748b] hover:text-[#1e293b] hover:border-slate-300"}`}>
{tab}
</button>
);
})}
</nav>
</div>
{/* END: Tabs */}
{/* BEGIN: Branch scope hint */}
{scopeHint && (
<div className="mb-6 flex items-center rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
<i className="fa-solid fa-triangle-exclamation mr-2"></i> Multiple branches assigned — select your branch to load plan, discharge &amp; appointment details:
<InlineBranchPicker />
</div>
)}
{/* END: Branch scope hint */}


          
          {/* =====================================================
              MAIN GRID
          ====================================================== */}
          {showHistory ? (
            <HistoryDashboard embedded patientId={patientId} initialPlan={dischargePlan} />
          ) : showNotesDocs ? (
            <PatientNotesDocuments embedded patientId={patientId} />
          ) : showOrderSummary ? (
          /* =================================================
              ORDER SUMMARY - ALL recent details of the selected
              patient fetched from the backend
          ================================================== */
          <div className="space-y-6">
            {planPreviewLoading && (
              <div className="flex items-center rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Loading recent details…
              </div>
            )}
            {!planPreviewLoading && planPreviewError && (
              <div className="flex items-center rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                <i className="fa-solid fa-triangle-exclamation mr-2"></i> {planPreviewError}
              </div>
            )}
            {!planPreviewLoading && (planPreview || stagingDetail) && (
              <>
                <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <SectionHeader icon="fa-solid fa-file-medical" title={`Diagnosis & Staging — ${orderSummaryDiagnosis || "—"}`} badge={stagingDetail?.clinical_stage || planPreview?.clinical_stage || "—"} />
                  {diagnosisEntries.length > 0 ? renderEntryGrid(diagnosisEntries) : (
                    <p className="px-6 py-6 text-sm text-slate-400">No diagnosis fields saved yet.</p>
                  )}
                </section>

                {derivedEntries.length > 0 && (
                  <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <SectionHeader icon="fa-solid fa-wand-magic-sparkles" title="Auto-Derived Classification" badge="Derived Fields" badgeClass="bg-purple-100 text-purple-700" />
                    {renderEntryGrid(derivedEntries)}
                  </section>
                )}

                {ihc && ihcEntries.length > 0 && (
                  <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <SectionHeader icon="fa-solid fa-microscope" title={`IHC Results${ihc.ihc_id ? ` — ${ihc.ihc_id}` : ""}`} badge={`${ihcEntries.length} Values`} badgeClass="bg-cyan-100 text-cyan-700" />
                    {renderEntryGrid(ihcEntries)}
                  </section>
                )}

                {mol && molecularEntries.length > 0 && (
                  <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <SectionHeader icon="fa-solid fa-dna" title={`Molecular Results${mol.mol_id ? ` — ${mol.mol_id}` : ""}`} badge={`${molecularEntries.length} Values`} badgeClass="bg-emerald-100 text-emerald-700" />
                    {renderEntryGrid(molecularEntries)}
                  </section>
                )}
              </>
            )}
          </div>
          ) : (
          <div className="grid gap-6 xl:grid-cols-3">
            {/* ===================================================
                LEFT COLUMN
            ==================================================== */}
            <div className="space-y-6 xl:col-span-2">
              {/* =================================================
                  DISCHARGE STATUS SUMMARY
              ================================================== */}
              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {/* Section Header */}
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Discharge Status Summary
                  </h3>

                  {((dischargePlan?.treatment_status ?? "").toUpperCase() === "COMPLETED") ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                      <i className="fa-regular fa-circle-check mr-1.5" />
                      Protocol Completed
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
                      <i className="fa-regular fa-clock mr-1.5" />
                      {dischargePlan ? "Treatment In Progress" : "Not Recorded"}
                    </span>
                  )}
                </div>

                {/* Section Body */}
                <div className="flex flex-col gap-6 p-6 lg:flex-row">
                  {/* Details */}
                  <div className="flex-1 space-y-5">
                    {/* Treatment Outcome */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-sm text-gray-500">
                        Treatment
                        <br />
                        Outcome
                      </div>

                      <div className={`col-span-2 text-lg font-semibold ${((dischargePlan?.treatment_status ?? "").toUpperCase() === "COMPLETED") ? "text-green-700" : "text-gray-500"}`}>
                        {dischargePlan?.treatment_status || "Not recorded"}
                      </div>
                    </div>

                    {/* Discharge Date */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center text-sm text-gray-500">
                        Discharge Date
                      </div>

                      <div className="col-span-2 flex items-center font-semibold text-gray-500">
                        Not recorded
                      </div>
                    </div>

                    {/* Discharge Time */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center text-sm text-gray-500">
                        Discharge Time
                      </div>

                      <div className="col-span-2 flex items-center font-semibold text-gray-500">
                        Not recorded
                      </div>
                    </div>

                    {/* Physician */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center text-sm text-gray-500">
                        Admitting Physician
                      </div>

                      <div className="col-span-2 flex items-center font-semibold text-gray-900">
                        {sd?.consulting_oncologist ||
                          (sd?.employees
                            ? [
                                sd.employees.first_name,
                                sd.employees.last_name,
                              ]
                                .filter(Boolean)
                                .join(" ")
                            : "") ||
                          (dischargePlan?.employees
                            ? [
                                dischargePlan.employees.first_name,
                                dischargePlan.employees.last_name,
                              ]
                                .filter(Boolean)
                                .join(" ")
                            : "") ||
                          "—"}
                      </div>
                    </div>
                  </div>

                  {/* Treatment Cycle Stats */}
                  <div className="w-full rounded-lg border border-dashed border-gray-300 bg-white p-5 lg:w-80">
                    <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Treatment Cycle Stats
                    </h4>

                    <div className="grid gap-y-4 sm:grid-cols-2">
                      {/* Planned */}
                      <div>
                        <p className="mb-1 text-xs text-gray-500">
                          Cycles Planned
                        </p>
                        <p className="text-xl font-medium text-gray-900">
                          {dischargePlan?.planned_cycles ?? 0}
                        </p>
                      </div>

                      {/* Administered */}
                      <div>
                        <p className="mb-1 text-xs text-gray-500">
                          Cycles Administered
                        </p>
                        <p className="text-xl font-medium text-blue-800">
                          {administeredCount}
                        </p>
                      </div>

                      {/* Duration */}
                      <div>
                        <p className="mb-1 text-xs text-gray-500">
                          Total Duration
                        </p>
                        <p className="text-base text-gray-900">{treatmentDurationLabel || "—"}</p>
                      </div>

                      {/* Reactions */}
                      <div>
                        <p className="mb-1 text-xs text-gray-500">
                          Adverse Reactions
                        </p>
                        <p className={`text-base font-medium ${reactionCount > 0 ? "text-red-600" : "text-green-700"}`}>
                          {reactionCount > 0 ? reactionCount : "None"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* =================================================
                  TAKE HOME MEDICATIONS
              ================================================== */}
              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Take-Home Medications{" "}
                    {!dischargeMedsLoading && medications.length > 0 && (
                      <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 align-middle text-xs font-bold text-blue-700">
                        {medications.length}
                      </span>
                    )}
                  </h3>

                  <button
                    type="button"
                    className="flex items-center text-sm font-medium text-blue-800 transition hover:underline"
                    onClick={() => window.print()}
                  >
                    <i className="fa-solid fa-print mr-2" />
                    Print Rx
                  </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Medication
                        </th>

                        <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Composition
                        </th>

                        <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Dose
                        </th>

                        <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Frequency
                        </th>

                        <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Duration
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200 bg-white">
                      {dischargeMedsLoading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-6 text-center text-xs text-slate-400">
                            <i className="fa-solid fa-circle-notch fa-spin mr-2" /> Loading discharge medicines…
                          </td>
                        </tr>
                      ) : dischargeMedsError ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-6 text-center text-xs text-red-500">
                            <i className="fa-solid fa-triangle-exclamation mr-2" /> {dischargeMedsError}
                          </td>
                        </tr>
                      ) : medications.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-6 text-center text-xs text-slate-400">
                            {dischargeProtocolId
                              ? "No discharge medicines recorded on this patient's regimen protocol yet."
                              : "No regimen protocol linked to this patient's plan yet."}
                          </td>
                        </tr>
                      ) : (
                        medications.map((medication) => (
                        <tr key={medication.id}>
                          <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
                            {medication.medication}
                          </td>

                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            {medication.composition}
                          </td>

                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {medication.dose}
                          </td>

                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {medication.frequency}
                          </td>

                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {medication.duration}
                          </td>
                        </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            {/* ===================================================
                RIGHT COLUMN
            ==================================================== */}
            <div className="space-y-6">
              {/* =================================================
                  FINAL VITAL SIGNS
              ================================================== */}
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-end justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Final Vital Signs
                  </h3>

                  <span className="text-xs text-gray-500">
                    {lastCheckedLabel || "No vitals recorded"}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {vitals.map((vital) => (
                    <div
                      key={vital.label}
                      className="rounded-lg bg-slate-50 p-4"
                    >
                      <p className="mb-1 text-xs text-gray-500">
                        {vital.label}
                      </p>

                      <p className="text-xl font-bold text-gray-900">
                        {vital.value}
                      </p>

                      <p className="mt-1 text-xs font-medium uppercase text-green-700">
                        {vital.status}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* =================================================
                  CHECKLIST
              ================================================== */}
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Checklist
                  </h3>

                  <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                    {checklist.length}/{checklist.length} Done
                  </span>
                </div>

                <ul className="space-y-4">
                  {checklist.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-400">
                      No discharge checklist recorded for this patient yet.
                    </li>
                  ) : (
                    checklist.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <i className="fa-solid fa-circle-check mr-3 mt-0.5 text-lg text-green-500" />

                        <span className="text-sm text-gray-700">{item}</span>
                      </li>
                    ))
                  )}
                </ul>
              </section>
            </div>
          </div>
          )}
</div>
</div>
 </main>
{/* END: Main Content */}

      </div>

    </>
  );
}

/* ============================================================
   PATIENT NOTES & DOCUMENTS COMPONENT
   (combined from client/pages/doctor/notes and doc.tsx —
    component name PatientNotesDocuments kept the same,
    embedded prop added so it can live in this file as an
    embedded step, original "notes and doc.tsx" file left
    untouched)
============================================================ */

interface ClinicalNoteRecord {
  id: string;
  encounterNo?: string;
  title: string;
  dateTime: string;
  encounter: string;
  doctor: string;
  department: string;
  branch: string;
  chiefComplaint: string;
  clinicalAssessment: string[];
  examination: string[];
  diagnosis: string;
  treatmentPlan: string[];
  medications: string;
  investigations: string[];
  followUp: string;
  status: "Completed" | "In Progress" | "Draft";
  createdBy: string;
}

const INITIAL_CLINICAL_NOTES: ClinicalNoteRecord[] = [];

function mapEncounterToClinicalNote(
  enc: EncounterRecord,
  index: number,
  totalEncounters: number,
  plan: SummaryPlan | null,
  prescriptionsList: any[] = [],
  labOrdersList: any[] = []
): ClinicalNoteRecord {
  const rawDate = enc.encounter_ts || enc.created_at || enc.appointment?.appointment_date;
  let formattedDateTime = "—";
  if (rawDate) {
    const d = new Date(rawDate);
    if (!Number.isNaN(d.getTime())) {
      const timeStr = enc.appointment?.appointment_time || d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      formattedDateTime = `${d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}, ${timeStr}`;
    }
  }

  const docName = [enc.employees?.first_name, enc.employees?.last_name].filter(Boolean).join(" ");
  const doctor = docName
    ? (docName.toLowerCase().startsWith("dr") ? docName : `Dr. ${docName}`)
    : (plan?.doctor_name ? (plan.doctor_name.toLowerCase().startsWith("dr") ? plan.doctor_name : `Dr. ${plan.doctor_name}`) : "Attending Doctor");

  const department = enc.department_master?.department_name || enc.employees?.specialization || (plan ? "Oncology" : "General OPD");
  const branch = enc.branch?.branch_name || "Main Branch";

  const rawStatus = (enc.status || "").toUpperCase();
  const status: "Completed" | "In Progress" | "Draft" =
    rawStatus === "CLOSED" || rawStatus === "COMPLETED" || rawStatus === "DONE"
      ? "Completed"
      : rawStatus === "OPEN" || rawStatus === "IN_PROGRESS" || rawStatus === "IN_CONSULTATION" || rawStatus === "CHECKED_IN"
      ? "In Progress"
      : "Completed";

  const cycleNum = totalEncounters - index;
  const encounterType = enc.encounter_type && enc.encounter_type !== "OPD"
    ? enc.encounter_type
    : (plan ? "Chemotherapy Follow-up" : "Outpatient Consultation");

  let chiefComplaint = enc.chief_complaint?.trim();
  if (!chiefComplaint) {
    chiefComplaint = plan
      ? `Patient presents for Cycle ${cycleNum > 0 ? cycleNum : 1} chemotherapy evaluation.`
      : "Patient presents for routine clinical follow-up and evaluation.";
  }

  const assessmentItems: string[] = [];
  if (enc.clinical_notes?.trim()) {
    assessmentItems.push(...enc.clinical_notes.split("\n").map((s) => s.trim()).filter(Boolean));
  }
  if (assessmentItems.length === 0) {
    assessmentItems.push("Clinical assessment completed. Patient stable.");
  }

  const vitalsParts: string[] = [];
  if (enc.systolic_bp && enc.diastolic_bp) vitalsParts.push(`BP: ${enc.systolic_bp}/${enc.diastolic_bp} mmHg`);
  if (enc.pulse) vitalsParts.push(`Pulse: ${enc.pulse} bpm`);
  if (enc.temperature) vitalsParts.push(`Temp: ${enc.temperature}°F`);
  if (enc.spo2) vitalsParts.push(`SpO2: ${enc.spo2}%`);
  if (enc.respiratory_rate) vitalsParts.push(`RR: ${enc.respiratory_rate}/min`);
  if (enc.blood_sugar) vitalsParts.push(`Blood Sugar: ${enc.blood_sugar} mg/dL`);

  if (vitalsParts.length > 0) {
    assessmentItems.push(`Vitals recorded: ${vitalsParts.join(", ")}.`);
  }

  const examItems: string[] = [];
  if ((enc as any).physical_examination?.trim()) {
    examItems.push(...(enc as any).physical_examination.split("\n").map((s: string) => s.trim()).filter(Boolean));
  } else {
    examItems.push("General physical condition stable.");
  }
  if (enc.pain_score != null) {
    examItems.push(`Pain score: ${enc.pain_score}/10.`);
  }
  if (enc.weight || enc.height) {
    const wt = enc.weight ? `Weight: ${enc.weight} kg` : "";
    const ht = enc.height ? `Height: ${enc.height} cm` : "";
    const bmi = enc.BMI ? `BMI: ${enc.BMI}` : "";
    const physicalStr = [wt, ht, bmi].filter(Boolean).join(", ");
    if (physicalStr) examItems.push(`Physical metrics: ${physicalStr}.`);
  }

  const diagnosis = enc.diagnosis_text || (plan?.cancer_type
    ? `${plan.cancer_type} – ongoing treatment.`
    : "Clinical evaluation - diagnosis pending.");

  const planItems: string[] = [];
  const matchingRx = prescriptionsList.find((rx: any) =>
    (rx.encounter_no && rx.encounter_no === enc.encounter_no) ||
    (rx.prescription_date && enc.encounter_ts && rx.prescription_date.slice(0, 10) === enc.encounter_ts.slice(0, 10))
  );

  if (matchingRx?.prescription_items?.length) {
    for (const item of matchingRx.prescription_items) {
      const medName = item.medicine_name || item.medicine_master?.medicine_name || item.drug_name;
      const dose = [item.dosage || item.dose, item.unit].filter(Boolean).join(" ");
      const route = item.route || item.administration_route || "";
      if (medName) {
        planItems.push(`${[medName, dose, route].filter(Boolean).join(" ")} prescribed.`);
      }
    }
  } else if (plan?.chemotherapy_plan_items?.length) {
    for (const item of plan.chemotherapy_plan_items) {
      const medName = item.medicine_master?.medicine_name || item.drug_role;
      if (medName) {
        const dose = [item.calculated_dose ?? item.protocol_dose, item.calculated_dose_unit ?? item.protocol_dose_unit].filter(Boolean).join(" ");
        const route = item.administration_route ? item.administration_route : "";
        planItems.push(`${[medName, dose, route].filter(Boolean).join(" ")} administered.`);
      }
    }
  }

  if (enc.advice?.trim()) {
    planItems.push(...enc.advice.split("\n").map((s) => s.trim()).filter(Boolean));
  } else if (plan) {
    planItems.push("Continue planned chemotherapy protocol.");
    planItems.push("Monitor for adverse reactions.");
  } else if (planItems.length === 0) {
    planItems.push("Continue prescribed care protocol and clinical monitoring.");
  }
  planItems.push("Follow-up as scheduled.");

  let medications = "";
  if (matchingRx?.prescription_items?.length) {
    medications = matchingRx.prescription_items
      .map((item: any) => {
        const medName = item.medicine_name || item.medicine_master?.medicine_name || item.drug_name;
        const dose = [item.dosage || item.dose, item.unit].filter(Boolean).join(" ");
        const route = item.route || "";
        return [medName, dose, route].filter(Boolean).join(" ");
      })
      .filter(Boolean)
      .join(", ");
  } else if (plan?.chemotherapy_plan_items?.length) {
    medications = plan.chemotherapy_plan_items
      .map((item) => {
        const medName = item.medicine_master?.medicine_name || item.drug_role;
        const dose = [item.calculated_dose ?? item.protocol_dose, item.calculated_dose_unit ?? item.protocol_dose_unit].filter(Boolean).join(" ");
        const route = item.administration_route || "";
        return [medName, dose, route].filter(Boolean).join(" ").trim();
      })
      .filter(Boolean)
      .join(", ");
  }
  if (!medications) {
    medications = "None recorded for this visit.";
  }

  const invItems: string[] = [];
  const matchingLabs = labOrdersList.filter((order: any) =>
    (order.encounter_no && order.encounter_no === enc.encounter_no) ||
    (order.patient_id === enc.patient_id)
  );
  if (matchingLabs.length > 0 && matchingLabs[0]?.lab_order_items?.length) {
    const testNames = matchingLabs[0].lab_order_items
      .map((it: any) => it.test_name || it.test_master?.test_name)
      .filter(Boolean);
    if (testNames.length > 0) {
      invItems.push(`${testNames.join(", ")} ordered/reviewed.`);
      invItems.push("Results acceptable for treatment.");
    }
  }
  if (invItems.length === 0) {
    invItems.push("No laboratory investigations ordered for this encounter.");
  }

  let followUp = "";
  if (enc.follow_up_date) {
    const fd = new Date(enc.follow_up_date);
    if (!Number.isNaN(fd.getTime())) {
      followUp = `Next visit scheduled for ${fd.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}.`;
    }
  }
  if (!followUp) {
    followUp = plan
      ? "Next chemotherapy cycle as per treatment plan."
      : "Next routine follow-up as scheduled.";
  }

  return {
    id: enc.encounter_id ? String(enc.encounter_id) : `enc-${enc.encounter_no || index}`,
    encounterNo: enc.encounter_no,
    title: index === 0 ? "RECENT CLINICAL NOTE" : "CLINICAL NOTE",
    dateTime: formattedDateTime,
    encounter: encounterType,
    doctor,
    department,
    branch,
    chiefComplaint,
    clinicalAssessment: assessmentItems,
    examination: examItems,
    diagnosis,
    treatmentPlan: planItems,
    medications,
    investigations: invItems,
    followUp,
    status,
    createdBy: doctor,
  };
}

const PatientNotesDocuments: React.FC<{
  embedded?: boolean;
  patientId?: string;
}> = ({ embedded = false, patientId }) => {
  const [activeTab, setActiveTab] = useState("Notes & Documents");
  const [labTab, setLabTab] = useState("Chemistry");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [clinicalNotes, setClinicalNotes] = useState<ClinicalNoteRecord[]>(INITIAL_CLINICAL_NOTES);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [notesActivities, setNotesActivities] = useState<
    { title: string; description: string; time: string; dot: string }[]
  >([]);
  const [isEditNoteModalOpen, setIsEditNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<{
    id: string;
    encounterNo?: string;
    title: string;
    dateTime: string;
    encounter: string;
    doctor: string;
    department: string;
    branch: string;
    chiefComplaint: string;
    clinicalAssessment: string;
    examination: string;
    diagnosis: string;
    treatmentPlan: string;
    medications: string;
    investigations: string;
    followUp: string;
    status: "Completed" | "In Progress" | "Draft";
    createdBy: string;
  } | null>(null);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null);
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);

  const [notesPlan, setNotesPlan] = useState<SummaryPlan | null>(null);
  const [notesAllergies, setNotesAllergies] = useState<PatientAllergyRecord[]>(
    []
  );
  const [documents, setDocuments] = useState<PatientDocumentItem[]>([]);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docSuccessMsg, setDocSuccessMsg] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<PatientDocumentItem | null>(null);

  /* Load stored patient documents from IndexedDB */
  useEffect(() => {
    if (!patientId) {
      setDocuments([]);
      return;
    }
    let cancelled = false;
    loadPatientDocuments(patientId)
      .then((items) => {
        if (!cancelled) setDocuments(items);
      })
      .catch((err) => {
        console.warn("Failed to load patient documents:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  /* Fetch real encounters, chemo plan, allergies, and prescriptions for the selected patient */
  useEffect(() => {
    if (!patientId) {
      setNotesPlan(null);
      setNotesAllergies([]);
      setClinicalNotes(INITIAL_CLINICAL_NOTES);
      setNotesActivities([]);
      return;
    }
    let cancelled = false;
    setIsLoadingNotes(true);

    // 1. Allergies
    API.get<{ success: boolean; data: PatientAllergyRecord[] }>(
      `/clinical-details/patients/${patientId}/allergies`
    )
      .then((response) => {
        if (!cancelled) setNotesAllergies(response.data?.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setNotesAllergies([]);
      });

    // 2. Fetch encounters & build clinical notes for every visited encounter
    const fetchEncountersAndBuildNotes = async () => {
      let loadedPlan: SummaryPlan | null = null;
      try {
        loadedPlan = await loadLatestChemoPlan(patientId);
        if (!cancelled) setNotesPlan(loadedPlan);
      } catch {
        if (!cancelled) setNotesPlan(null);
      }

      let rawEncounters: EncounterRecord[] = [];
      try {
        const resp = await encounterApi.getLatest(patientId, 50);
        rawEncounters = resp.data?.data?.encounters ?? [];
      } catch (err) {
        console.warn("getLatest encounters failed, trying getAll", err);
      }

      if (rawEncounters.length === 0) {
        try {
          const resp = await encounterApi.getAll({ patientId, limit: 50 });
          rawEncounters = resp.data?.data?.encounters ?? [];
        } catch (err) {
          console.warn("getAll encounters fallback failed", err);
        }
      }

      if (rawEncounters.length === 0) {
        try {
          const resp = await API.get<{ data?: { encounters?: EncounterRecord[] }; encounters?: EncounterRecord[] }>(
            "/encounters/latest",
            { params: { patientId, limit: 50 } }
          );
          rawEncounters = resp.data?.data?.encounters || resp.data?.encounters || [];
        } catch {}
      }

      let prescriptionsList: any[] = [];
      try {
        const rxRes = await API.get(`/prescriptions/patient/${patientId}`);
        prescriptionsList = rxRes.data?.data?.prescriptions || rxRes.data?.data || [];
      } catch {}

      let labOrdersList: any[] = [];
      try {
        const labRes = await API.get('/lab-order');
        labOrdersList = (labRes.data?.data || []).filter((lo: any) => lo.patient_id === patientId);
      } catch {}

      if (cancelled) return;

      if (rawEncounters.length > 0) {
        // Sort encounters newest first
        rawEncounters.sort((a, b) => {
          const timeA = new Date(a.encounter_ts || a.created_at || 0).getTime();
          const timeB = new Date(b.encounter_ts || b.created_at || 0).getTime();
          return timeB - timeA;
        });

        const generatedNotes = rawEncounters.map((enc, idx) =>
          mapEncounterToClinicalNote(
            enc,
            idx,
            rawEncounters.length,
            loadedPlan,
            prescriptionsList,
            labOrdersList
          )
        );
        setClinicalNotes(generatedNotes);
        setCurrentNoteIndex(0);

        const builtActivities = rawEncounters.slice(0, 5).map((enc, i) => {
          const doc = enc.employees?.first_name ? `Dr. ${enc.employees.first_name}` : (loadedPlan?.doctor_name ? (loadedPlan.doctor_name.toLowerCase().startsWith("dr") ? loadedPlan.doctor_name : `Dr. ${loadedPlan.doctor_name}`) : "Doctor");
          const encType = enc.encounter_type && enc.encounter_type !== "OPD" ? enc.encounter_type : (loadedPlan ? "Chemo Follow-up" : "Consultation");
          const dateStr = enc.encounter_ts ? new Date(enc.encounter_ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "RECENT";
          return {
            title: encType,
            description: `${doc} completed clinical evaluation`,
            time: dateStr.toUpperCase(),
            dot: i === 0 ? "bg-blue-500" : "bg-slate-400",
          };
        });
        setNotesActivities(builtActivities);
      } else {
        setClinicalNotes([]);
        setCurrentNoteIndex(0);
        setNotesActivities([]);
      }

      setIsLoadingNotes(false);
    };

    fetchEncountersAndBuildNotes();

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  /* Live counts derived from fetched records (no hardcoded values). */
  const prescriptionsCount = (notesPlan?.chemotherapy_plan_items ?? []).length;
  const activities = notesActivities;

  const handleFileUpload = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingDoc(true);
    const targetPatientId = patientId || "unknown";

    const newItems: PatientDocumentItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;
      try {
        const savedDoc = await savePatientDocument(targetPatientId, file);
        newItems.push(savedDoc);
      } catch (err) {
        console.error("Failed to save document:", file.name, err);
      }
    }

    if (newItems.length > 0) {
      setDocuments((prev) => [...newItems, ...prev]);
      setSelectedFile(files[0]);
      setDocSuccessMsg(
        `${newItems.length === 1 ? `"${newItems[0].name}"` : `${newItems.length} documents`} uploaded to Document Library!`
      );
      setTimeout(() => setDocSuccessMsg(null), 4000);
    }
    setIsUploadingDoc(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    handleFileUpload(event.target.files);
  };

  const handleSelectFiles = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    if (e.dataTransfer?.files?.length) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleDownload = (doc: PatientDocumentItem) => {
    downloadDocument(doc);
  };

  const handleView = (doc: PatientDocumentItem) => {
    setPreviewDoc(doc);
  };

  const handleDeleteDoc = async (docId: string, docName: string) => {
    if (window.confirm(`Are you sure you want to remove "${docName}" from Document Library?`)) {
      await deletePatientDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (previewDoc?.id === docId) {
        setPreviewDoc(null);
      }
    }
  };

  const handleEditNote = (note: ClinicalNoteRecord) => {
    setEditingNote({
      id: note.id,
      encounterNo: note.encounterNo,
      title: note.title,
      dateTime: note.dateTime,
      encounter: note.encounter,
      doctor: note.doctor,
      department: note.department,
      branch: note.branch,
      chiefComplaint: note.chiefComplaint,
      clinicalAssessment: (note.clinicalAssessment || []).join("\n"),
      examination: (note.examination || []).join("\n"),
      diagnosis: note.diagnosis,
      treatmentPlan: (note.treatmentPlan || []).join("\n"),
      medications: note.medications,
      investigations: (note.investigations || []).join("\n"),
      followUp: note.followUp,
      status: note.status,
      createdBy: note.createdBy,
    });
    setIsEditNoteModalOpen(true);
  };

  const handleSaveEditedNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote) return;

    setIsSavingNote(true);

    const updatedRecord: Partial<ClinicalNoteRecord> = {
      chiefComplaint: editingNote.chiefComplaint,
      clinicalAssessment: editingNote.clinicalAssessment
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      examination: editingNote.examination
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      diagnosis: editingNote.diagnosis,
      treatmentPlan: editingNote.treatmentPlan
        .split("\n")
        .map((s) => s.trim().replace(/^[•\-\*]\s*/, ""))
        .filter(Boolean),
      medications: editingNote.medications,
      investigations: editingNote.investigations
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      followUp: editingNote.followUp,
      status: editingNote.status,
    };

    setClinicalNotes((prev) =>
      prev.map((n) => (n.id === editingNote.id ? { ...n, ...updatedRecord } : n))
    );

    if (editingNote.encounterNo) {
      try {
        await encounterApi.update(editingNote.encounterNo, {
          chief_complaint: editingNote.chiefComplaint,
          clinical_notes: editingNote.clinicalAssessment,
          diagnosis_text: editingNote.diagnosis,
          advice: editingNote.treatmentPlan,
        });
      } catch (err) {
        console.warn("Could not persist encounter update to backend:", err);
      }
    }

    setIsSavingNote(false);
    setIsEditNoteModalOpen(false);
    setEditingNote(null);
    setEditSuccessMsg("Clinical note updated successfully!");
    setTimeout(() => setEditSuccessMsg(null), 3000);
  };

  const handleSave = () => {
    console.log("Save Notes & Changes clicked");
  };

  /* =========================================================
     CONTENT (TAB NAVIGATION + TWO COLUMN LAYOUT)
  ========================================================= */

  const safeNoteIndex = Math.min(
    Math.max(0, currentNoteIndex),
    Math.max(0, clinicalNotes.length - 1)
  );
  const activeNote = clinicalNotes[safeNoteIndex];

  const content = (
    <>
      {/* ===================================================
          TAB NAVIGATION (hidden when embedded — the parent
          portal already renders its own tab bar)
      ==================================================== */}
      {!embedded && (
        <div className="mb-6 border-b border-slate-200">
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = activeTab === tab;

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-[#0052cc] font-semibold text-[#0052cc]"
                      : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* ===================================================
          TWO COLUMN LAYOUT
      ==================================================== */}
      <div className="flex flex-col gap-6 xl:flex-row">

        {/* =================================================
            LEFT / MAIN COLUMN
        ================================================== */}
        <div className="min-w-0 flex-1">

          {/* =================================================
              SUMMARY CARDS
          ================================================== */}
          <div className="mb-8 grid gap-4 md:grid-cols-4">

            {/* Total Notes */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mr-4 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <i className="fa-regular fa-file-lines text-lg" />
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Total Notes
                </p>
                <p className="text-xl font-bold text-slate-900">
                  {clinicalNotes.length}
                </p>
              </div>
            </div>

            {/* Documents */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mr-4 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <i className="fa-regular fa-folder-open text-lg" />
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Documents
                </p>
                <p className="text-xl font-bold text-slate-900">
                  {documents.length}
                </p>
              </div>
            </div>

            {/* Reports */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mr-4 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600">
                <i className="fa-solid fa-chart-simple text-lg" />
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Reports
                </p>
                <p className="text-xl font-bold text-slate-900">
                  0
                </p>
              </div>
            </div>

            {/* Prescriptions */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mr-4 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                <i className="fa-solid fa-prescription-bottle-medical text-lg" />
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Prescriptions
                </p>
                <p className="text-xl font-bold text-slate-900">
                  {prescriptionsCount}
                </p>
              </div>
            </div>
          </div>

          {/* =================================================
              RECENT CLINICAL NOTES
          ================================================== */}
          <section className="mb-8 rounded-xl border border-slate-200 bg-white shadow-sm">

            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-slate-900">
                  Recent Clinical Notes
                </h3>
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-[#0052cc]">
                  {clinicalNotes.length} {clinicalNotes.length === 1 ? "Note" : "Notes"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {clinicalNotes.length > 1 && (
                  <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                    <button
                      type="button"
                      disabled={safeNoteIndex === 0}
                      onClick={() => setCurrentNoteIndex((prev) => Math.max(0, prev - 1))}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Previous note (newer visit)"
                    >
                      <i className="fa-solid fa-chevron-left text-xs" />
                    </button>
                    <span className="px-2 text-xs font-semibold text-slate-600">
                      {safeNoteIndex + 1} / {clinicalNotes.length}
                    </span>
                    <button
                      type="button"
                      disabled={safeNoteIndex === clinicalNotes.length - 1}
                      onClick={() => setCurrentNoteIndex((prev) => Math.min(clinicalNotes.length - 1, prev + 1))}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Next note (older visit)"
                    >
                      <i className="fa-solid fa-chevron-right text-xs" />
                    </button>
                  </div>
                )}

                {activeNote && (
                  <button
                    type="button"
                    onClick={() => handleEditNote(activeNote)}
                    className="flex items-center rounded-md bg-[#0052cc] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 shadow-sm"
                  >
                    <i className="fa-solid fa-pen-to-square mr-1.5" />
                    Edit Note
                  </button>
                )}
              </div>
            </div>

            {/* Edit Success Notification */}
            {editSuccessMsg && (
              <div className="mx-6 mt-3 flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-circle-check text-emerald-600 text-sm" />
                  <span>{editSuccessMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditSuccessMsg(null)}
                  className="text-emerald-600 hover:text-emerald-800"
                >
                  <i className="fa-solid fa-xmark text-xs" />
                </button>
              </div>
            )}

            {/* Navigation Bar (when 2+ notes exist) */}
            {clinicalNotes.length > 1 && (
              <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-blue-50/20 to-slate-50 px-5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Left: Quick jump visit pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Visits:
                    </span>
                    <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-[500px]">
                      {clinicalNotes.map((n, idx) => {
                        const isSelected = idx === safeNoteIndex;
                        return (
                          <button
                            key={n.id || idx}
                            type="button"
                            onClick={() => setCurrentNoteIndex(idx)}
                            className={`group flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                              isSelected
                                ? "bg-[#0052cc] text-white shadow-sm ring-2 ring-[#0052cc]/30"
                                : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-100"
                            }`}
                            title={`Jump to Note ${idx + 1}: ${n.encounter} (${n.dateTime})`}
                          >
                            <span className="font-bold">
                              {idx === 0 ? "Latest Visit" : `Visit #${clinicalNotes.length - idx}`}
                            </span>
                            {n.encounterNo && (
                              <span
                                className={`rounded px-1 text-[10px] ${
                                  isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                #{n.encounterNo}
                              </span>
                            )}
                            <span
                              className={`text-[11px] ${
                                isSelected ? "text-blue-100" : "text-slate-400 group-hover:text-slate-500"
                              }`}
                            >
                              • {n.dateTime.split(",")[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right: Prev / Next Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={safeNoteIndex === 0}
                      onClick={() => setCurrentNoteIndex((prev) => Math.max(0, prev - 1))}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <i className="fa-solid fa-arrow-left text-[11px]" />
                      Previous Note
                    </button>
                    <button
                      type="button"
                      disabled={safeNoteIndex === clinicalNotes.length - 1}
                      onClick={() => setCurrentNoteIndex((prev) => Math.min(clinicalNotes.length - 1, prev + 1))}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next Note
                      <i className="fa-solid fa-arrow-right text-[11px]" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Content: Single Clinical Note Card */}
            <div className="p-6">
              {isLoadingNotes ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <i className="fa-solid fa-circle-notch fa-spin mb-3 text-3xl text-[#0052cc]" />
                  <p className="text-sm font-medium">Loading clinical notes for patient encounters...</p>
                </div>
              ) : clinicalNotes.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <i className="fa-regular fa-file-lines mb-2 text-2xl text-slate-300" />
                  <p className="text-sm font-medium text-slate-500">
                    No clinical notes recorded for this patient yet.
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Notes added from consultations will appear here.
                  </p>
                </div>
              ) : activeNote ? (
                <div className="space-y-5">
                  <div
                    key={activeNote.id}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow"
                  >
                    {/* Note Card Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-blue-50/60 via-slate-50 to-white px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0052cc] text-white shadow-sm">
                          <i className="fa-solid fa-notes-medical text-sm" />
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#0052cc]">
                              {safeNoteIndex === 0 ? "RECENT CLINICAL NOTE" : "CLINICAL NOTE"}
                            </span>
                            {safeNoteIndex === 0 && (
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                                Latest Visit
                              </span>
                            )}
                            {activeNote.encounterNo && (
                              <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                #{activeNote.encounterNo}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="font-semibold text-slate-800">{activeNote.encounter}</span>
                            <span>•</span>
                            <span>{activeNote.dateTime}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          <i className="fa-solid fa-circle-check text-[10px]" />
                          {activeNote.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleEditNote(activeNote)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-[#0052cc]/30 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#0052cc] transition-colors hover:bg-[#0052cc] hover:text-white"
                          title="Edit Clinical Note"
                        >
                          <i className="fa-solid fa-pen-to-square" />
                          Edit Note
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintNote(activeNote)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                          title="Print Note"
                        >
                          <i className="fa-solid fa-print" />
                          Print
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const noteHeader = `${safeNoteIndex === 0 ? "RECENT CLINICAL NOTE" : "CLINICAL NOTE"}${activeNote.encounterNo ? ` (#${activeNote.encounterNo})` : ""}`;
                            const textToCopy = `${noteHeader}\n\nDate & Time: ${activeNote.dateTime}\nEncounter: ${activeNote.encounter}\nDoctor: ${activeNote.doctor}\nDepartment: ${activeNote.department}\nBranch: ${activeNote.branch}\n\nChief Complaint\n${activeNote.chiefComplaint}\n\nClinical Assessment\n${activeNote.clinicalAssessment.join("\n")}\n\nExamination\n${activeNote.examination.join("\n")}\n\nDiagnosis\n${activeNote.diagnosis}\n\nTreatment / Plan\n${activeNote.treatmentPlan.map((p) => `• ${p}`).join("\n")}\n\nMedications\n${activeNote.medications}\n\nInvestigations\n${activeNote.investigations.join("\n")}\n\nFollow-up\n${activeNote.followUp}\n\nStatus: ${activeNote.status}\nCreated by: ${activeNote.createdBy}`;
                            navigator.clipboard?.writeText(textToCopy);
                            setCopiedNoteId(activeNote.id);
                            setTimeout(() => setCopiedNoteId(null), 2000);
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                          title="Copy Note Text"
                        >
                          <i className={`fa-solid ${copiedNoteId === activeNote.id ? "fa-check text-emerald-600" : "fa-copy"}`} />
                          {copiedNoteId === activeNote.id ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>

                    {/* Meta Grid */}
                    <div className="grid grid-cols-2 gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3 sm:grid-cols-3 lg:grid-cols-5 text-xs">
                      <div>
                        <p className="text-[11px] font-medium text-slate-500">Date & Time</p>
                        <p className="mt-0.5 font-semibold text-slate-800">{activeNote.dateTime}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-500">Encounter</p>
                        <p className="mt-0.5 font-semibold text-slate-800">{activeNote.encounter}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-500">Doctor</p>
                        <p className="mt-0.5 font-semibold text-slate-800">{activeNote.doctor}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-500">Department</p>
                        <p className="mt-0.5 font-semibold text-slate-800">{activeNote.department}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-500">Branch</p>
                        <p className="mt-0.5 font-semibold text-slate-800">{activeNote.branch}</p>
                      </div>
                    </div>

                    {/* Note Content Sections */}
                    <div className="space-y-4 p-5 text-sm">
                      {/* Chief Complaint */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Chief Complaint
                        </h4>
                        <p className="mt-1 font-medium text-slate-800">
                          {activeNote.chiefComplaint}
                        </p>
                      </div>

                      {/* Clinical Assessment & Examination */}
                      <div className="grid gap-4 md:grid-cols-2 rounded-lg bg-slate-50/60 p-3.5 border border-slate-100">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Clinical Assessment
                          </h4>
                          <div className="mt-1 space-y-1 text-slate-700">
                            {activeNote.clinicalAssessment.map((item, idx) => (
                              <p key={idx}>{item}</p>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Examination
                          </h4>
                          <div className="mt-1 space-y-1 text-slate-700">
                            {activeNote.examination.map((item, idx) => (
                              <p key={idx}>{item}</p>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Diagnosis */}
                      <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#0052cc]">
                          Diagnosis
                        </h4>
                        <p className="mt-1 font-semibold text-slate-900">
                          {activeNote.diagnosis}
                        </p>
                      </div>

                      {/* Treatment / Plan */}
                      <div className="rounded-lg border border-slate-200 bg-white p-3.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                          Treatment / Plan
                        </h4>
                        <ul className="mt-1.5 space-y-1 text-slate-700">
                          {activeNote.treatmentPlan.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-[#0052cc] font-bold">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Medications & Investigations */}
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Medications
                          </h4>
                          <p className="mt-1 font-semibold text-slate-900">
                            {activeNote.medications}
                          </p>
                        </div>

                        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Investigations
                          </h4>
                          <div className="mt-1 space-y-1 text-slate-700">
                            {activeNote.investigations.map((item, idx) => (
                              <p key={idx}>{item}</p>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Follow-up */}
                      <div className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                          Follow-up
                        </h4>
                        <p className="mt-1 font-medium text-slate-800">
                          {activeNote.followUp}
                        </p>
                      </div>
                    </div>

                    {/* Card Footer: Status & Created By */}
                    <div className="flex flex-wrap items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-700">Status:</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                          <i className="fa-solid fa-check text-[10px]" />
                          {activeNote.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <span>Created by:</span>
                        <span className="font-bold text-[#0052cc]">{activeNote.createdBy}</span>
                        <span className="ml-1 inline-flex items-center rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                          <i className="fa-solid fa-signature mr-1" />
                          E-Signed
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Navigation Bar */}
                  {clinicalNotes.length > 1 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs">
                      <button
                        type="button"
                        disabled={safeNoteIndex === 0}
                        onClick={() => {
                          setCurrentNoteIndex((prev) => Math.max(0, prev - 1));
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <i className="fa-solid fa-chevron-left text-[10px]" />
                        Previous Note
                        {safeNoteIndex > 0 && (
                          <span className="text-slate-400">
                            ({clinicalNotes[safeNoteIndex - 1].dateTime.split(",")[0]})
                          </span>
                        )}
                      </button>

                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">
                          Showing note <strong>{safeNoteIndex + 1}</strong> of <strong>{clinicalNotes.length}</strong>
                        </span>
                        {safeNoteIndex === 0 ? (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                            Latest Encounter
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                            Historical Visit
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={safeNoteIndex === clinicalNotes.length - 1}
                        onClick={() => {
                          setCurrentNoteIndex((prev) => Math.min(clinicalNotes.length - 1, prev + 1));
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next Note
                        {safeNoteIndex < clinicalNotes.length - 1 && (
                          <span className="text-slate-400">
                            ({clinicalNotes[safeNoteIndex + 1].dateTime.split(",")[0]})
                          </span>
                        )}
                        <i className="fa-solid fa-chevron-right text-[10px]" />
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </section>

          {/* =================================================
              DOCUMENT LIBRARY
          ================================================== */}
          <section className="mb-8">

            <div className="mb-4 flex items-end justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Document Library
              </h3>

              <button
                type="button"
                className="flex items-center text-sm font-medium text-blue-600 transition-colors hover:text-blue-800"
              >
                View All Documents
                <i className="fa-solid fa-arrow-right ml-1" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {documents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-400 md:col-span-3">
                  No documents uploaded for this patient yet. Use the upload
                  panel to add files.
                </div>
              ) : (
                documents.map((document) => (
                <div
                  key={document.id}
                  className={`group relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md ${document.hover}`}
                >
                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteDoc(document.id, document.name)}
                    className="absolute right-3 top-3 text-slate-300 hover:text-red-500 transition-colors"
                    title={`Delete ${document.name}`}
                    aria-label={`Delete ${document.name}`}
                  >
                    <i className="fa-solid fa-trash-can text-sm" />
                  </button>

                  {/* Icon */}
                  <div
                    className={`mb-3 text-2xl ${document.color}`}
                  >
                    <i className={`fa-solid ${document.icon}`} />
                  </div>

                  {/* Name */}
                  <h4
                    className="mb-1 truncate text-sm font-bold text-slate-900"
                    title={document.name}
                  >
                    {document.name}
                  </h4>

                  {/* Details */}
                  <p className="mb-4 text-xs text-slate-500">
                    {document.info}
                  </p>

                  {/* Buttons */}
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => handleView(document)}
                      className="flex-1 rounded bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 flex items-center justify-center gap-1.5"
                    >
                      <i className="fa-regular fa-eye text-xs" />
                      View
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownload(document)}
                      className="flex-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 flex items-center justify-center gap-1.5"
                    >
                      <i className="fa-solid fa-download text-xs" />
                      Download
                    </button>
                  </div>
                </div>
              ))
              )}
            </div>
          </section>

          {/* =================================================
              LAB & DIAGNOSTIC REPORTS
          ================================================== */}
          <section className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

            {/* Header */}
            <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 md:flex-row md:items-center">
              <h3 className="text-lg font-semibold text-slate-900">
                Lab & Diagnostic Reports
              </h3>

              <div className="flex w-fit space-x-2 rounded-lg bg-slate-100 p-1">
                {["CBC", "Chemistry", "Radiology"].map((tab) => {
                  const active = labTab === tab;

                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setLabTab(tab)}
                      className={`rounded-md px-3 py-1 text-sm font-medium transition-all ${
                        active
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-slate-600 hover:bg-white hover:shadow-sm"
                      }`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-white text-sm text-slate-500">
                    <th className="w-1/4 p-4 pl-6 font-medium">
                      Test Name
                    </th>

                    <th className="w-1/5 p-4 font-medium">
                      Date
                    </th>

                    <th className="w-1/5 p-4 font-medium">
                      Result
                    </th>

                    <th className="w-1/4 p-4 font-medium">
                      Trend
                    </th>

                    <th className="p-4 pr-6 text-center font-medium">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  <tr>
                    <td
                      colSpan={5}
                      className="p-6 pl-6 text-center text-xs text-slate-400"
                    >
                      No lab or diagnostic reports available for this patient
                      yet.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* =================================================
            RIGHT SIDEBAR
        ================================================== */}
        <aside className="flex w-full flex-shrink-0 flex-col gap-6 xl:w-80">

          {/* =================================================
              UPLOAD DOCUMENT
          ================================================== */}
          <div
            onClick={handleSelectFiles}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all ${
              isDraggingFile
                ? "border-blue-500 bg-blue-100/70 shadow-md ring-2 ring-blue-400"
                : "border-blue-300 bg-blue-50/50 hover:bg-blue-50"
            }`}
          >
            <div
              className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full text-xl transition-transform ${
                isDraggingFile ? "scale-110 bg-blue-600 text-white" : "bg-blue-100 text-blue-600"
              }`}
            >
              <i className={`fa-solid ${isUploadingDoc ? "fa-spinner fa-spin" : "fa-file-arrow-up"}`} />
            </div>

            <h4 className="mb-1 text-base font-bold text-slate-900">
              {isUploadingDoc ? "Uploading..." : "Upload Document"}
            </h4>

            <p className="mb-4 px-4 text-xs text-slate-500">
              Drag & Drop or click to browse files (PDF, JPG, PNG, DOCX)
            </p>

            <button
              type="button"
              disabled={isUploadingDoc}
              onClick={(event) => {
                event.stopPropagation();
                handleSelectFiles();
              }}
              className="rounded-md border border-blue-600 bg-white px-6 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 disabled:opacity-50"
            >
              {isUploadingDoc ? "Uploading..." : "Select Files"}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.txt"
              className="hidden"
              onChange={handleFileChange}
            />

            {docSuccessMsg && (
              <p className="mt-3 max-w-full rounded bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                <i className="fa-solid fa-circle-check mr-1.5" />
                {docSuccessMsg}
              </p>
            )}
          </div>

          {/* =================================================
              RECENT ACTIVITY
          ================================================== */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">
              Recent Activity
            </h3>

            <div className="relative pl-4">
              {/* Vertical Line */}
              <div className="absolute bottom-0 left-5 top-0 w-0.5 bg-gradient-to-b from-transparent via-slate-200 to-transparent" />

              <div className="space-y-6">
                {activities.length === 0 ? (
                  <p className="py-2 text-xs text-slate-400">
                    No recent activity recorded for this patient yet.
                  </p>
                ) : (
                  activities.map((activity) => (
                  <div
                    key={activity.title}
                    className="group relative flex items-start gap-4"
                  >
                    {/* Dot */}
                    <div
                      className={`absolute -left-[5px] top-1.5 h-3 w-3 rounded-full border-2 border-white ring-2 ring-slate-100 ${activity.dot}`}
                    />

                    <div className="pl-4">
                      <h4 className="text-sm font-semibold text-slate-900">
                        {activity.title}
                      </h4>

                      <p className="mt-0.5 text-xs text-slate-600">
                        {activity.description}
                      </p>

                      <span className="mt-1 block text-[10px] font-medium uppercase text-slate-400">
                        {activity.time}
                      </span>
                    </div>
                  </div>
                ))
                )}
              </div>
            </div>
          </section>

          {/* =================================================
              IMPORTANT FLAGS (real allergies from the API)
          ================================================== */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Important Flags
              </h3>

              <i className="fa-solid fa-thumbtack text-slate-400" />
            </div>

            <div className="space-y-3">
              {notesAllergies.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-400">
                  No allergy alerts recorded for this patient.
                </p>
              ) : (
                notesAllergies.map((allergy) => {
                  const severe =
                    (allergy.severity ?? "").toUpperCase() === "SEVERE" ||
                    (allergy.allergy_master?.severity_level ?? "")
                      .toUpperCase()
                      .startsWith("SEVERE");
                  return (
                    <div
                      key={allergy.id}
                      className={`rounded-r-lg border-l-4 p-3 ${
                        severe
                          ? "border-red-500 bg-red-50"
                          : "border-orange-500 bg-orange-50"
                      }`}
                    >
                      <h4
                        className={`mb-1 text-sm font-bold ${
                          severe ? "text-red-800" : "text-orange-800"
                        }`}
                      >
                        Allergy Warning
                      </h4>

                      <p
                        className={`text-xs leading-snug ${
                          severe ? "text-red-700" : "text-orange-700"
                        }`}
                      >
                        {[allergy.allergy_master?.substance_name, allergy.reaction]
                          .filter(Boolean)
                          .join(" — ") || "Recorded allergy"}
                        {allergy.allergy_master?.severity_level ||
                        allergy.severity
                          ? ` (Severity: ${
                              allergy.allergy_master?.severity_level ??
                              allergy.severity
                            })`
                          : ""}
                        {allergy.status
                          ? ` · Status: ${allergy.status}`
                          : ""}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </aside>
      </div>

      {/* ===================================================
          EDIT CLINICAL NOTE MODAL
      ==================================================== */}
      {isEditNoteModalOpen && editingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0052cc] text-white shadow-sm">
                  <i className="fa-solid fa-pen-to-square text-sm" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Edit Clinical Note
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingNote.encounterNo ? `#${editingNote.encounterNo} • ` : ""}{editingNote.encounter} • {editingNote.dateTime}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSavingNote}
                onClick={() => {
                  setIsEditNoteModalOpen(false);
                  setEditingNote(null);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors disabled:opacity-50"
              >
                <i className="fa-solid fa-xmark text-lg" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEditedNote} className="flex flex-1 flex-col overflow-y-auto p-6 space-y-4 text-xs">
              {/* Meta information row */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <label className="mb-0.5 block text-[10px] font-bold uppercase text-slate-500">Encounter</label>
                  <p className="font-semibold text-slate-800 text-xs truncate" title={editingNote.encounter}>{editingNote.encounter}</p>
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] font-bold uppercase text-slate-500">Doctor</label>
                  <p className="font-semibold text-slate-800 text-xs truncate" title={editingNote.doctor}>{editingNote.doctor}</p>
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] font-bold uppercase text-slate-500">Department</label>
                  <p className="font-semibold text-slate-800 text-xs truncate" title={editingNote.department}>{editingNote.department}</p>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Status</label>
                  <select
                    value={editingNote.status}
                    onChange={(e) => setEditingNote({ ...editingNote, status: e.target.value as any })}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-[#0052cc] focus:outline-none bg-white font-medium"
                  >
                    <option value="Completed">Completed</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">Chief Complaint</label>
                <input
                  type="text"
                  required
                  value={editingNote.chiefComplaint}
                  onChange={(e) => setEditingNote({ ...editingNote, chiefComplaint: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-[#0052cc] focus:outline-none"
                  placeholder="Chief complaint"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Clinical Assessment (1 per line)</label>
                  <textarea
                    rows={3}
                    value={editingNote.clinicalAssessment}
                    onChange={(e) => setEditingNote({ ...editingNote, clinicalAssessment: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0052cc] focus:outline-none"
                    placeholder="Clinical assessment items"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Examination (1 per line)</label>
                  <textarea
                    rows={3}
                    value={editingNote.examination}
                    onChange={(e) => setEditingNote({ ...editingNote, examination: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0052cc] focus:outline-none"
                    placeholder="Physical examination notes"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">Diagnosis</label>
                <input
                  type="text"
                  value={editingNote.diagnosis}
                  onChange={(e) => setEditingNote({ ...editingNote, diagnosis: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-[#0052cc] focus:outline-none"
                  placeholder="Primary clinical diagnosis"
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">Treatment / Plan (1 item per line)</label>
                <textarea
                  rows={3}
                  value={editingNote.treatmentPlan}
                  onChange={(e) => setEditingNote({ ...editingNote, treatmentPlan: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0052cc] focus:outline-none"
                  placeholder="Treatment plan items"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Medications</label>
                  <input
                    type="text"
                    value={editingNote.medications}
                    onChange={(e) => setEditingNote({ ...editingNote, medications: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-[#0052cc] focus:outline-none"
                    placeholder="Prescribed medications"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Investigations (1 per line)</label>
                  <input
                    type="text"
                    value={editingNote.investigations}
                    onChange={(e) => setEditingNote({ ...editingNote, investigations: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-[#0052cc] focus:outline-none"
                    placeholder="Lab tests and investigations"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">Follow-up</label>
                <input
                  type="text"
                  value={editingNote.followUp}
                  onChange={(e) => setEditingNote({ ...editingNote, followUp: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-[#0052cc] focus:outline-none"
                  placeholder="Follow-up instructions"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  disabled={isSavingNote}
                  onClick={() => {
                    setIsEditNoteModalOpen(false);
                    setEditingNote(null);
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingNote}
                  className="flex items-center gap-1.5 rounded-lg bg-[#0052cc] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 shadow-sm disabled:opacity-50"
                >
                  {isSavingNote ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =======================================================
          DOCUMENT PREVIEW MODAL
      ======================================================== */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className={`text-2xl ${previewDoc.color}`}>
                  <i className={`fa-solid ${previewDoc.icon}`} />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold text-slate-900" title={previewDoc.name}>
                    {previewDoc.name}
                  </h3>
                  <p className="text-xs text-slate-500">{previewDoc.info}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.open(previewDoc.url, "_blank")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  title="Open in new window"
                >
                  <i className="fa-solid fa-up-right-from-square text-xs" />
                  Open in New Tab
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(previewDoc)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                  title="Download file"
                >
                  <i className="fa-solid fa-download text-xs" />
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  aria-label="Close preview"
                >
                  <i className="fa-solid fa-xmark text-base" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto bg-slate-100 p-4 min-h-[300px] flex items-center justify-center">
              {previewDoc.type.includes("pdf") || previewDoc.name.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={previewDoc.url}
                  className="h-[70vh] w-full rounded-lg border border-slate-200 bg-white"
                  title={previewDoc.name}
                />
              ) : previewDoc.type.startsWith("image/") ||
                /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(previewDoc.name) ? (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.name}
                  className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-sm"
                />
              ) : (
                <div className="py-12 text-center">
                  <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm text-3xl ${previewDoc.color}`}>
                    <i className={`fa-solid ${previewDoc.icon}`} />
                  </div>
                  <h4 className="text-base font-semibold text-slate-900 mb-1">{previewDoc.name}</h4>
                  <p className="text-xs text-slate-500 mb-4">{previewDoc.info}</p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mb-5">
                    Direct in-browser preview is not supported for this file type. Click below to download and view it locally.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDownload(previewDoc)}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <i className="fa-solid fa-download" />
                    Download File
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (embedded) {
    return (
      <>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
        {content}
      </>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-50 text-slate-800 antialiased font-sans">
      {/* =========================================================
          MAIN CONTENT AREA
      ========================================================== */}
      <div className="relative flex h-screen flex-col overflow-hidden">
        {/* =======================================================
            TOP HEADER
        ======================================================== */}
        <header className="z-10 flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
          {/* Branch */}
          
          {/* Header Actions */}
          <div className="flex items-center space-x-4">
            {/* Notification */}
            <BellNotificationButton size="md" />

            {/* HMS */}
            <span className="rounded bg-blue-50 px-2 py-1 text-sm font-medium text-blue-600">
              HMS
            </span>

            {/* User */}
            <img
              alt="User"
              className="h-8 w-8 cursor-pointer rounded-full border border-slate-200 object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDlp4Z9SpVdXaVjgWZ4_KJ2BK03faz2udRJkhREXle-y5y2rTeFCwW4cbRgPfipcwrkUgzEHseDbPrPvNEe_LapOJGREVcYW0M369brOZfN0BTfuLLYfu0i4w4HpxvhO9ZSkb6fT5V_FaljJqtWdRO0L6kZAPR45Uo2fY1juqc7pc031lqOhWAxw8XzQ5u-o242ARI4GCY9VzzSZzaHG9i7vz6KrxDGT5zlthoATD7Ljf0DI-aEZ7RrJA"
            />
          </div>
        </header>

        {/* =======================================================
            SCROLLABLE CONTENT
        ======================================================== */}
        <main className="relative flex-1 overflow-y-auto bg-slate-50">
          <div className="mx-auto max-w-7xl px-6 pb-28 pt-6">
            {content}
          </div>
        </main>

        {/* =======================================================
            BOTTOM ACTION BAR
        ======================================================== */}
        <div className="absolute bottom-0 left-0 right-0 z-20 flex h-16 flex-shrink-0 items-center justify-between border-t border-slate-200 bg-white px-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">

          <div className="text-sm text-slate-500">
            Showing {documents.length} of {documents.length} total records
          </div>

          <div className="flex space-x-3">

            {/* Download All */}
            <button
              type="button"
              disabled={documents.length === 0}
              onClick={() => downloadAllDocuments(documents)}
              className="flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fa-solid fa-download mr-2" />
              Download All
            </button>

            {/* Export */}
            <button
              type="button"
              onClick={() => console.log("Export Documents")}
              className="flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <i className="fa-solid fa-file-export mr-2" />
              Export Documents
            </button>

            {/* Save */}
            <button
              type="button"
              onClick={handleSave}
              className="rounded-md bg-[#0052cc] px-6 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              Save Notes & Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* Compact branch dropdown for the full-screen portals. They render
   OUTSIDE AppLayout, so the header BranchSelector isn't available and
   multi-branch users would otherwise 403 on every scoped call with no
   way to pick a branch on-page. Uses the real selectBranch, so the
   localStorage key and the axios x-branch-id header stay in sync with
   the rest of the app. */
function InlineBranchPicker() {
  const { branches, loading, selectedBranchId, selectBranch } =
    useBranchFilter();
  const hasSelection =
    !!selectedBranchId &&
    selectedBranchId !== ALL_BRANCHES_VALUE &&
    selectedBranchId !== NO_BRANCH_VALUE;
  return (
    <select
      value={hasSelection ? selectedBranchId : ""}
      disabled={loading}
      onChange={(event) => selectBranch(event.target.value)}
      className="ml-2 rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-semibold text-[#1e293b] focus:outline-none"
    >
      {!hasSelection && <option value="">Select branch…</option>}
      {branches.map((branch) => (
        <option key={branch.id} value={branch.id}>
          {branch.name}
          {branch.area && branch.area !== "N/A" ? ` – ${branch.area}` : ""}
        </option>
      ))}
    </select>
  );
}

const PatientDetails: React.FC = () => {
  const navigate = useNavigate();
  return (
    <BranchFilterProvider>
      <HMSPatientPortal onBack={() => navigate(-1)} />
    </BranchFilterProvider>
  );
};

export default PatientDetails;
