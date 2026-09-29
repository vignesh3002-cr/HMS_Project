import React, { useState } from "react";
import { BellNotificationButton } from "@/components/hms/BellNotificationButton";
import {
  SummaryPlan,
  Tab,
  tabs,
  StatusBadge,
  SectionHeader,
  PatientAllergyRecord,
  useDischargeMedicines,
  useLatestPatientVitals,
} from "./shared";
import { HistoryDashboard } from "./History";
import { DischargeDetailsPortal } from "./Discharge";
import { PatientNotesDocuments } from "./NotesDocuments";

/* ============================================================
   MEDICATION PORTAL COMPONENT
   (combined from client/pages/doctor/Medication.tsx —
    renamed HMSPatientPortal → MedicationPortal so it can live
    in this file, original Medication.tsx file left untouched)
============================================================ */

export const MedicationPortal: React.FC<{
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
