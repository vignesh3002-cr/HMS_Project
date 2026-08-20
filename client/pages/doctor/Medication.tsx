import React, { useState } from "react";

type Tab = "Order Summary" | "Medications" | "Discharge" | "History" | "Notes & Documents";

const tabs: Tab[] = [
  "Order Summary",
  "Medications",
  "Discharge",
  "History",
  "Notes & Documents",
];

const premedications = [
  { no: 1, medication: "Decadron", sub: "(Dexamethasone)", dose: "12 mg", route: ["IV", "Push"], timing: ["T-30", "mins"] },
  { no: 2, medication: "Avil (Pheniramine)", sub: "", dose: "22.75", dose2: "mg", route: ["IV", "Push"], timing: ["T-15", "mins"] },
  { no: 3, medication: "Palzen (Palonosetron)", sub: "", dose: "0.25", dose2: "mg", route: ["IV", "Push"], timing: ["T-10", "mins"] },
];

const chemoDrugs = [
  { no: 1, drug: "Taxol (Paclitaxel)", calc: "80 mg/m²", actual: "137.6 mg", route: "IV Infusion", diluent: "NS 250ml", status: "GIVEN" },
  { no: 2, drug: "Herceptin (Trastuzumab)", calc: "2 mg", actual: "128 mg", route: "IV Infusion", diluent: "NS 100ml", status: "PENDING" },
  { no: 3, drug: "Carboplatin", calc: "AUC 6", actual: "450 mg", route: "IV Infusion", diluent: "D5W 500ml", status: "PENDING" },
];

const dischargeMeds = [
  { no: 1, medication: "Capecitabine", dose: "12 mg", frequency: "2-0-2", instruction: "Twice Daily", duration: "5 Days" },
  { no: 2, medication: "Paracetamol", dose: "22.75 mg", frequency: "2-0-2", instruction: "Once Daily", duration: "5 Days" },
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

export default function HMSPatientPortal() {
  const [activeTab, setActiveTab] = useState<Tab>("Medications");
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-[260px] -translate-x-full border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : ""}`}>
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-100 px-6 py-6">
            <h1 className="text-2xl font-bold text-[#0052cc]">HMS</h1>
            <p className="mt-1 text-xs text-slate-400">Patient Portal</p>
          </div>
          <nav className="flex-1 p-4">
            {[
              ["fa-solid fa-border-all", "Dashboard"],
              ["fa-solid fa-calendar-check", "Appointments"],
              ["fa-solid fa-pills", "Medications"],
              ["fa-solid fa-file-medical", "Reports"],
              ["fa-solid fa-user", "Profile"],
            ].map(([icon, label]) => (
              <button
                key={label}
                className={`mb-1 flex w-full items-center rounded-lg px-4 py-3 text-sm font-medium ${
                  label === "Medications" ? "bg-blue-50 text-[#0052cc]" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <i className={`${icon} mr-3 w-5 text-center`} />
                {label}
              </button>
            ))}
          </nav>
          <div className="border-t border-slate-100 p-5">
            <div className="flex items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-white">
                <i className="fa-solid fa-user" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-semibold">Vijaya Nallusamy</p>
                <p className="text-[10px] text-slate-400">Patient</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-slate-500 lg:hidden">
              <i className="fa-solid fa-bars" />
            </button>
            <div className="flex items-center text-sm font-semibold text-slate-700">
              <i className="fa-solid fa-code-branch mr-2 text-slate-400" />
              Main Branch
              <i className="fa-solid fa-chevron-down ml-2 text-[10px] text-slate-400" />
            </div>
          </div>
          <div className="flex items-center gap-5">
            <button className="relative text-slate-500 hover:text-[#0052cc]">
              <i className="fa-regular fa-bell text-xl" />
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
            </button>
            <div className="flex items-center gap-2 border-l border-slate-200 pl-5">
              <span className="font-bold text-[#0052cc]">HMS</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-white">
                <i className="fa-solid fa-user text-xs" />
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            {/* Patient header */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-[#0052cc]">
                    VN
                  </div>
                  <div className="ml-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-800">Vijaya Nallusamy</h2>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">ONC-2026-10025</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      <span>51Y / Female</span>
                      <span className="h-1 w-1 rounded-full bg-slate-300" />
                      <span className="font-semibold text-[#0052cc]">Ductal Carcinoma Stage II</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
                  {[
                    ["HEIGHT", "154 cm"], ["BP", "118/74"], ["WEIGHT", "52 kg"], ["PULSE", "78 bpm"],
                    ["BSA", "1.49 m²"], ["TEMP", "36.8 °C"], ["BMI", "21.93"], ["SPO2", "99%"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                      <p className="text-sm font-bold text-slate-800">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Tabs */}
            <div className="overflow-x-auto border-b border-slate-200">
              <nav className="flex min-w-max space-x-8">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    ["TOTAL MEDS", "8", "fa-solid fa-pills", "bg-blue-50 text-[#0052cc]"],
                    ["PREMEDS", "3", "fa-solid fa-syringe", "bg-purple-50 text-purple-600"],
                    ["CHEMO", "3", "fa-solid fa-hourglass-half", "bg-red-50 text-red-500"],
                    ["SUPPORTIVE", "2", "fa-solid fa-heart-pulse", "bg-emerald-50 text-emerald-500"],
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

                <div className="flex flex-col gap-6 lg:flex-row">
                  <div className="min-w-0 flex-1 space-y-6">
                    {/* Premeds */}
                    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      <SectionHeader icon="fa-solid fa-chevron-down" title="Premedications" badge="3 Prescribed" />
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
                            {premedications.map((m) => (
                              <tr key={m.no} className="transition-colors hover:bg-slate-50">
                                <td className="px-6 py-4 text-center text-slate-400">{m.no}</td>
                                <td className="px-6 py-4">
                                  <p className="font-bold text-slate-800">{m.medication}</p>
                                  {m.sub && <p className="text-xs text-slate-500">{m.sub}</p>}
                                </td>
                                <td className="px-6 py-4 text-slate-700">{m.dose}{m.dose2 && <><br />{m.dose2}</>}</td>
                                <td className="px-6 py-4 text-slate-700">{m.route.map((x) => <React.Fragment key={x}>{x}<br /></React.Fragment>)}</td>
                                <td className="px-6 py-4 text-slate-700">{m.timing.map((x) => <React.Fragment key={x}>{x}<br /></React.Fragment>)}</td>
                                <td className="px-6 py-4 text-center"><StatusBadge>GIVEN</StatusBadge></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>

                    {/* Chemo */}
                    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      <SectionHeader icon="fa-solid fa-chevron-down" title="Chemotherapy Drugs" badge="Active Cycle" badgeClass="border border-red-100 bg-red-50 text-red-600" />
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
                            {chemoDrugs.map((m) => (
                              <tr key={m.no} className="transition-colors hover:bg-slate-50">
                                <td className="px-6 py-4 text-center text-slate-400">{m.no}</td>
                                <td className="px-6 py-4"><a href="#" className="font-bold text-[#0052cc] hover:underline">{m.drug}</a></td>
                                <td className="px-6 py-4 text-xs text-slate-500">{m.calc}</td>
                                <td className="px-6 py-4 font-bold text-slate-800">{m.actual}</td>
                                <td className="px-6 py-4 text-slate-700">{m.route}</td>
                                <td className="px-6 py-4 text-xs text-slate-500">{m.diluent}</td>
                                <td className="px-6 py-4 text-center"><StatusBadge warning={m.status === "PENDING"}>{m.status}</StatusBadge></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>

                    {/* Discharge */}
                    <section className="mb-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      <SectionHeader icon="fa-solid fa-chevron-down" title="Discharge Medication" badge="3 Prescribed" />
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[750px] text-left text-sm">
                          <thead className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
                            <tr>
                              <th className="w-12 px-6 py-4 text-center">#</th>
                              <th className="px-6 py-4">MEDICATION</th>
                              <th className="px-6 py-4">DOSE</th>
                              <th className="px-6 py-4">FREQUENCY</th>
                              <th className="px-6 py-4">INSTRUCTION</th>
                              <th className="px-6 py-4">DURATION</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {dischargeMeds.map((m) => (
                              <tr key={m.no} className="transition-colors hover:bg-slate-50">
                                <td className="px-6 py-4 text-center text-slate-400">{m.no}</td>
                                <td className="px-6 py-4 font-bold text-slate-800">{m.medication}</td>
                                <td className="px-6 py-4 text-slate-700">{m.dose}</td>
                                <td className="px-6 py-4 text-slate-700">{m.frequency}</td>
                                <td className="px-6 py-4 font-medium text-slate-800">{m.instruction}</td>
                                <td className="px-6 py-4 font-bold text-slate-800">{m.duration}</td>
                              </tr>
                            ))}
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
                          <p className="text-lg font-bold text-slate-800">06 Jun 2026</p>
                          <p className="mb-1 text-sm text-slate-500">09:30 AM</p>
                          <p className="text-sm font-medium text-[#0052cc]">Day 2 Treatment</p>
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
                          <span className="absolute -left-6 top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-white" />
                          <p className="mb-0.5 text-sm font-bold text-slate-800">09:00 AM</p>
                          <p className="text-sm text-slate-600">Decadron Administered</p>
                          <p className="mt-0.5 text-xs text-slate-400">Nurse: Elena R.</p>
                        </div>
                        <div className="relative">
                          <span className="absolute -left-6 top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-white" />
                          <p className="mb-0.5 text-sm font-bold text-slate-800">09:15 AM</p>
                          <p className="text-sm text-slate-600">Avil Administered</p>
                        </div>
                        <div className="relative">
                          <span className="absolute -left-6 top-1.5 h-3 w-3 rounded-full bg-[#0052cc] ring-4 ring-blue-50" />
                          <p className="mb-0.5 text-sm font-bold text-slate-800">10:00 AM</p>
                          <p className="text-sm font-bold text-[#0052cc]">Taxol Infusion Started</p>
                          <p className="mt-0.5 text-xs text-slate-400">Remaining: 42 mins</p>
                        </div>
                      </div>
                    </section>
                  </aside>
                </div>
              </>
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
}
