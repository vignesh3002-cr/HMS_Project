import React from "react";

const PatientDischargeDashboard: React.FC = () => {
  const medications = [
    {
      medication: "Ondansetron",
      purpose: "Anti-nausea",
      dose: "1 Tablet",
      frequency: "TID (Every 8 Hours)",
      duration: "3 Days",
    },
  ];

  const vitals = [
    {
      label: "BP",
      value: "118/76",
      status: "Stable",
    },
    {
      label: "Pulse",
      value: "74 bpm",
      status: "Normal",
    },
    {
      label: "Temp",
      value: "98.6°F",
      status: "Apyrexic",
    },
    {
      label: "SpO2",
      value: "99%",
      status: "Room Air",
    },
  ];

  const checklist = [
    "Infusion protocol complete",
    "Vitals stable for 30 mins",
    "Allergy status verified",
    "Discharge instructions provided",
    "Medications reviewed",
    "Follow-up appointment scheduled",
    "Patient education completed",
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-gray-800">
      {/* =========================================================
          MAIN CONTENT
      ========================================================== */}
      <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-white">
        {/* =======================================================
            TOP HEADER
        ======================================================== */}
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-8 py-4">
          {/* Branch Selector */}
          <button
            type="button"
            className="flex items-center text-sm font-medium text-gray-600 transition hover:text-blue-700"
          >
            <i className="fa-solid fa-code-branch mr-2" />
            <span>Main Branch</span>
            <i className="fa-solid fa-chevron-down ml-2 text-[10px]" />
          </button>

          {/* Header Actions */}
          <div className="flex items-center space-x-6">
            {/* Notification */}
            <button
              type="button"
              aria-label="Notifications"
              className="relative text-gray-400 transition hover:text-gray-600"
            >
              <i className="fa-regular fa-bell text-xl" />

              <span className="absolute right-0 top-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>

            {/* HMS */}
            <span className="border-l border-gray-200 pl-6 text-sm font-medium text-blue-800">
              HMS
            </span>

            {/* User Avatar */}
            <img
              alt="User Avatar"
              className="h-8 w-8 rounded-full border border-gray-200 object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCIHvJge2LvW3eFD4wTRhjQKbm3gnRoVrLkP3VBa4O4COpx_fZtctxdLqVy9urkxL-4uufp5zE05ex8uATVruTBv8w3RnxlljNpLHnqsZd6xOKqZh7WnTU3UCA8FhoGVUGmoXnSJiFPy-3x4EH15iT3zgBRjrHNFeR9sfsk6gP0488Sn6S1ZonFNh1QB0_5LK3qCeSptn1A9VZ606w0fgrv3_erZzcv0vv0DAggBroA9clcMV21oxE"
            />
          </div>
        </header>

        {/* =======================================================
            SCROLLABLE CONTENT
        ======================================================== */}
        <div className="flex-1 overflow-y-auto bg-[#fafafa] p-8">
          {/* =====================================================
              PATIENT HEADER CARD
          ====================================================== */}
          <section className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            {/* Alerts */}
            <div className="mt-0 flex items-center justify-between border-t border-gray-100 pt-0">
              <div className="flex flex-wrap gap-3">
                {/* Allergy */}
                <span className="inline-flex items-center rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700">
                  <i className="fa-solid fa-triangle-exclamation mr-2 text-xs" />
                  Allergy: Penicillin
                </span>

                {/* Previous Cycle */}
                <span className="inline-flex items-center rounded-md bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-800">
                  <i className="fa-solid fa-clock-rotate-left mr-2 text-xs" />
                  Previous Cycle: Grade 2 Neutropenia
                </span>

                {/* Central Line */}
                <span className="inline-flex items-center rounded-md bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700">
                  <i className="fa-regular fa-circle-check mr-2 text-xs" />
                  Central Line Available
                </span>
              </div>

              <button
                type="button"
                className="ml-4 flex shrink-0 items-center text-sm font-medium text-blue-800 transition hover:underline"
              >
                View Full Alerts (2)
                <i className="fa-solid fa-arrow-right ml-1 text-xs" />
              </button>
            </div>
          </section>

          {/* =====================================================
              NAVIGATION TABS
          ====================================================== */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex gap-8 overflow-x-auto">
              {/* Order Summary */}
              <button
                type="button"
                className="whitespace-nowrap border-b-2 border-transparent px-1 py-4 text-lg font-medium text-gray-500 transition hover:border-gray-300 hover:text-gray-700"
              >
                Order Summary
              </button>

              {/* Medications */}
              <button
                type="button"
                className="whitespace-nowrap border-b-2 border-transparent px-1 py-4 text-lg font-medium text-gray-500 transition hover:border-gray-300 hover:text-gray-700"
              >
                Medications
              </button>

              {/* Discharge - Active */}
              <button
                type="button"
                className="whitespace-nowrap border-b-2 border-blue-800 px-1 py-4 text-lg font-medium text-blue-800"
              >
                Discharge
              </button>

              {/* History */}
              <button
                type="button"
                className="whitespace-nowrap border-b-2 border-transparent px-1 py-4 text-lg font-medium text-gray-500 transition hover:border-gray-300 hover:text-gray-700"
              >
                History
              </button>

              {/* Notes */}
              <button
                type="button"
                className="whitespace-nowrap border-b-2 border-transparent px-1 py-4 text-lg font-medium text-gray-500 transition hover:border-gray-300 hover:text-gray-700"
              >
                Notes & Documents
              </button>
            </nav>
          </div>

          {/* =====================================================
              MAIN GRID
          ====================================================== */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
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

                  <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                    <i className="fa-regular fa-circle-check mr-1.5" />
                    Ready for Discharge
                  </span>
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

                      <div className="col-span-2 text-lg font-semibold text-green-700">
                        Completed
                        <br />
                        Successfully
                      </div>
                    </div>

                    {/* Discharge Date */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center text-sm text-gray-500">
                        Discharge Date
                      </div>

                      <div className="col-span-2 flex items-center font-semibold text-gray-900">
                        05 Jun 2026
                      </div>
                    </div>

                    {/* Discharge Time */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center text-sm text-gray-500">
                        Discharge Time
                      </div>

                      <div className="col-span-2 flex items-center font-semibold text-gray-900">
                        04:30 PM
                      </div>
                    </div>

                    {/* Physician */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center text-sm text-gray-500">
                        Admitting Physician
                      </div>

                      <div className="col-span-2 flex items-center font-semibold text-gray-900">
                        Dr. Naveen
                      </div>
                    </div>
                  </div>

                  {/* Treatment Cycle Stats */}
                  <div className="w-full rounded-lg border border-dashed border-gray-300 bg-white p-5 lg:w-80">
                    <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Treatment Cycle Stats
                    </h4>

                    <div className="grid grid-cols-2 gap-y-4">
                      {/* Planned */}
                      <div>
                        <p className="mb-1 text-xs text-gray-500">
                          Cycles Planned
                        </p>
                        <p className="text-xl font-medium text-gray-900">
                          5
                        </p>
                      </div>

                      {/* Administered */}
                      <div>
                        <p className="mb-1 text-xs text-gray-500">
                          Cycles Administered
                        </p>
                        <p className="text-xl font-medium text-blue-800">
                          5
                        </p>
                      </div>

                      {/* Duration */}
                      <div>
                        <p className="mb-1 text-xs text-gray-500">
                          Total Duration
                        </p>
                        <p className="text-base text-gray-900">4 Hours</p>
                      </div>

                      {/* Reactions */}
                      <div>
                        <p className="mb-1 text-xs text-gray-500">
                          Infusion Reactions
                        </p>
                        <p className="text-base font-medium text-green-700">
                          None
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
                    Take-Home Medications
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
                          Purpose
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
                      {medications.map((medication, index) => (
                        <tr key={index}>
                          <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
                            {medication.medication}
                          </td>

                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            {medication.purpose}
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
                      ))}
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
                    Last checked: 04:15 PM
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                  {checklist.map((item, index) => (
                    <li key={index} className="flex items-start">
                      <i className="fa-solid fa-circle-check mr-3 mt-0.5 text-lg text-green-500" />

                      <span className="text-sm text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PatientDischargeDashboard;