import React from "react";

const HealthcareDashboard: React.FC = () => {
  const vitals = [
    ["Height", "154 cm"],
    ["Weight", "52 kg"],
    ["BSA", "1.49 m²"],
    ["BMI", "21.93"],
    ["BP", "118/74"],
    ["Pulse", "78 bpm"],
    ["Temp", "36.8 °C"],
    ["SPO2", "99%"],
  ];

  const cycles = [
    {
      cycle: "CYCLE 06 (FINAL)",
      date: "16 Feb 2026 - 19 Feb 2026",
      description:
        "Protocol completed. Patient shows excellent clinical response with 80% tumor reduction.",
        final: true,
    },
    {
      cycle: "CYCLE 05",
      date: "09 Feb 2026 - 12 Feb 2026",
      description:
        "Treatment as scheduled. Grade 1 peripheral neuropathy reported. Dose maintained.",
        final: false,
    },
    {
      cycle: "CYCLE 04",
      date: "05 Feb 2026 - 07 Feb 2026",
      description:
        "Treatment as scheduled. Grade 1 peripheral neuropathy reported. Dose maintained.",
        final: false,
    },
    {
      cycle: "CYCLE 03",
      date: "01 Feb 2026 - 03 Feb 2026",
      description:
        "Treatment as scheduled. Grade 1 peripheral neuropathy reported. Dose maintained.",
        final: false,
    },
    {
      cycle: "CYCLE 02",
      date: "24 Jan 2026 - 28 Jan 2026",
      description:
        "Treatment as scheduled. Grade 1 peripheral neuropathy reported. Dose maintained.",
        final: false,
    },
    {
      cycle: "CYCLE 01",
      date: "18 Jan 2026 - 21 Jan 2026",
      description:
        "Treatment as scheduled. Grade 1 peripheral neuropathy reported. Dose maintained.",
        final: false,
    },
  ];

  const cycleHistory = [
    ["CYCLE 06", "16 Feb 2026 - 19 Feb 2026"],
    ["CYCLE 05", "09 Feb 2026 - 12 Feb 2026"],
    ["CYCLE 04", "05 Feb 2026 - 07 Feb 2026"],
    ["CYCLE 03", "01 Feb 2026 - 03 Feb 2026"],
    ["CYCLE 02", "24 Jan 2026 - 28 Jan 2026"],
    ["CYCLE 01", "18 Jan 2026 - 21 Jan 2026"],
  ];

  const medications = [
    {
      medication: "Ondansetron",
      start: "18 Jan 2026",
      end: "Present",
      dosage: "8 mg",
      route: "Oral",
      status: "ACTIVE",
    },
    {
      medication: "Dexamethasone",
      start: "18 Jan 2026",
      end: "19 Feb 2026",
      dosage: "20 mg",
      route: "IV",
      status: "COMPLETED",
    },
    {
      medication: "Filgrastim",
      start: "19 Jan 2026",
      end: "24 Jan 2026",
      dosage: "300 mcg",
      route: "Subcutaneous",
      status: "COMPLETED",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans">
      {/* TOP HEADER */}
      <header className="bg-[#f2f4f7] border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-code-branch text-gray-500" />

          <span className="font-medium text-gray-800">
            Main Branch
          </span>

          <i className="fa-solid fa-chevron-down text-gray-500 text-xs" />
        </div>

        <div className="flex items-center gap-6">
          <div className="relative">
            <i className="fa-regular fa-bell text-gray-500 text-lg" />

            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
          </div>

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
        {/* PATIENT HEADER */}
        <section className="px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-gray-100">
          {/* Patient Information */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBt7rKSZNaFi3i3xKZagY4rmx2pWgvVoKBc-7zKrEWljQtWbTxEM_AooMDKHsrdEpXEZi6ROwmDEmsftCfEfK7yDlpQaAXmNL1waiHZY8oW4lE2KaWTbbnb7Mc35h-7PyJYHHDooGo2syYLD1hlIoA7d0wmKIS5f68Dxl8xVSSf7sSBQaYBpAoXpZPqYuhQwY66tu4IyYMdRk2u7uA0rs_mI6Ov0-tvGdo8p6YrYTKVzciPc2DWlqZNmw"
                alt="Vijaya Nallusamy"
                className="w-full h-full object-cover"
              />
            </div>

            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-gray-900">
                  Vijaya Nallusamy
                </h1>

                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-medium border border-gray-200">
                  ONC-2026-10025
                </span>
              </div>

              <div className="text-sm text-gray-600 flex items-center gap-2">
                <span>51Y / Female</span>

                <span className="w-1 h-1 rounded-full bg-gray-400" />

                <span className="text-blue-600 font-medium">
                  Ductal Carcinoma Stage II
                </span>
              </div>
            </div>
          </div>

          {/* VITALS + PROTOCOL */}
          <div className="flex items-center gap-6 divide-x divide-gray-200">
            {/* Vitals */}
            <div className="grid grid-cols-4 gap-x-6 gap-y-2 text-sm pr-6">
              {vitals.map(([label, value]) => (
                <div key={label}>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">
                    {label}
                  </div>

                  <div className="font-semibold text-gray-900">
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* Protocol */}
            <div className="pl-6">
              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 w-64">
                <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                  INTENT: NEOADJUVANT
                </div>

                <div className="font-bold text-blue-800 text-sm mb-2">
                  TAXOL - WEEKLY
                </div>

                <div className="flex items-center text-xs text-gray-600">
                  <span className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                  Active Protocol
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ALERT BAR */}
        <div className="bg-[#fef2f2] border-y border-red-100 px-6 py-2 flex items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <div className="flex items-center text-red-700">
              <i className="fa-solid fa-triangle-exclamation mr-2 text-xs" />

              <span className="font-semibold mr-1">
                Allergy:
              </span>

              Penicillin
            </div>

            <div className="w-px h-4 bg-red-200" />

            <div className="flex items-center text-amber-700">
              <i className="fa-solid fa-clock-rotate-left mr-2 text-xs" />

              <span className="font-semibold mr-1">
                Previous Cycle:
              </span>

              Grade 2 Neutropenia
            </div>

            <div className="w-px h-4 bg-red-200" />

            <div className="flex items-center text-slate-700">
              <i className="fa-solid fa-link mr-2 text-xs" />

              <span className="font-semibold">
                Central Line Available
              </span>
            </div>
          </div>

          <button
            type="button"
            className="text-blue-600 font-semibold text-xs hover:underline"
          >
            View Full Alerts (2)
          </button>
        </div>

        {/* NAVIGATION */}
        <nav className="px-6 border-b border-gray-200 flex gap-8 text-sm font-medium overflow-x-auto">
          <button className="py-4 text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300 whitespace-nowrap">
            Order Summary
          </button>

          <button className="py-4 text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300 whitespace-nowrap">
            Medications
          </button>

          <button className="py-4 text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300 whitespace-nowrap">
            Discharge
          </button>

          <button className="py-4 text-blue-600 border-b-2 border-blue-600 whitespace-nowrap">
            History
          </button>

          <button className="py-4 text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300 whitespace-nowrap">
            Notes &amp; Documents
          </button>
        </nav>

        {/* TIMELINE + RIGHT COLUMN */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 bg-slate-50/50">
          {/* LEFT */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-chart-line text-blue-600" />

                  <h2 className="text-lg font-bold text-gray-900">
                    Treatment Timeline
                  </h2>
                </div>

                <span className="text-sm font-medium text-gray-500">
                  Aug 2026 - Present
                </span>
              </div>

              {/* Timeline */}
              <div className="relative pl-4 space-y-6">
                <div className="absolute left-[21px] top-4 bottom-4 w-px bg-gray-200" />

                {cycles.map((item) => (
                  <div
                    key={item.cycle}
                    className="relative flex items-start"
                  >
                    <div className="absolute left-[-4px] top-3 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center ring-4 ring-white z-10">
                      <i className="fa-solid fa-check text-white text-[10px]" />
                    </div>

                    <div
                      className={`ml-8 w-full rounded-lg p-4 transition hover:shadow-md ${
                        item.final
                          ? "bg-blue-50/40 border border-blue-100"
                          : "bg-white border border-gray-200"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3
                          className={`font-bold text-sm ${
                            item.final
                              ? "text-blue-700"
                              : "text-gray-800"
                          }`}
                        >
                          {item.cycle}
                        </h3>

                        <span className="text-sm text-gray-500">
                          {item.date}
                        </span>
                      </div>

                      <p className="text-sm text-gray-700">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
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
                  <span>Avg 51.8</span>
                </div>

                <div className="flex items-end h-12 gap-1">
                  <div className="w-full bg-blue-100 rounded-t h-[60%]" />
                  <div className="w-full bg-blue-200 rounded-t h-[65%]" />
                  <div className="w-full bg-blue-200 rounded-t h-[62%]" />
                  <div className="w-full bg-blue-200 rounded-t h-[68%]" />
                  <div className="w-full bg-blue-200 rounded-t h-[64%]" />
                  <div className="w-full bg-blue-700 rounded-t h-[70%]" />
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

                <button
                  type="button"
                  className="text-xs text-blue-600 font-bold hover:underline uppercase"
                >
                  View All
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50/50 hover:bg-gray-50 transition">
                  <div className="flex items-center gap-3">
                    <i className="fa-regular fa-file-pdf text-red-500 text-lg" />

                    <div>
                      <div className="text-sm font-semibold text-gray-800">
                        Final_Summary.pdf
                      </div>

                      <div className="text-xs text-gray-500">
                        19 Feb 2026
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <i className="fa-solid fa-download" />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50/50 hover:bg-gray-50 transition">
                  <div className="flex items-center gap-3">
                    <i className="fa-regular fa-file-pdf text-red-500 text-lg" />

                    <div>
                      <div className="text-sm font-semibold text-gray-800">
                        Cycle_6_Report.pdf
                      </div>

                      <div className="text-xs text-gray-500">
                        16 Feb 2026
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <i className="fa-solid fa-download" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CHEMOTHERAPY CYCLE HISTORY */}
        <section className="px-6 pb-6">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-gray-200 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">
                Chemotherapy Cycle History
              </h2>

              <button
                type="button"
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
                  {cycleHistory.map(([cycle, dates]) => (
                    <tr
                      key={cycle}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {cycle}
                      </td>

                      <td className="px-6 py-4 text-gray-500">
                        {dates}
                      </td>

                      <td className="px-6 py-4 text-gray-700">
                        Paclitaxel
                      </td>

                      <td className="px-6 py-4 text-gray-700">
                        80 mg/m²
                      </td>

                      <td className="px-6 py-4 text-gray-700">
                        80 mg/m²
                      </td>

                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          SUCCESSFUL
                        </span>
                      </td>
                    </tr>
                  ))}
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
                  {medications.map((medication) => (
                    <tr
                      key={medication.medication}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {medication.medication}
                      </td>

                      <td className="px-6 py-4 text-gray-500">
                        {medication.start}
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
                        {medication.status === "ACTIVE" ? (
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
                  ))}
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
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-500">
                      12 Feb 2026
                    </td>

                    <td className="px-6 py-4 font-medium text-gray-900">
                      Peripheral Neuropathy
                    </td>

                    <td className="px-6 py-4 text-gray-700">
                      Grade 1
                    </td>

                    <td className="px-6 py-4 text-gray-700">
                      Dose maintained
                    </td>

                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        ONGOING
                      </span>
                    </td>
                  </tr>
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
  );
};

export default HealthcareDashboard;