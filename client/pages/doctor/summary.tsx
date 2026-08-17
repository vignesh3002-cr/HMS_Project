import React from "react";

const PatientSummary: React.FC = () => {
  const chemotherapyOrders = [
    {
      drug: "Oxaliplatin",
      form: "Injection",
      dose: "85",
      unit: "Mg/M2",
      volume: "250 Ml",
    },
    {
      drug: "Leucovorin",
      form: "Injection",
      dose: "200",
      unit: "Mg/M2",
      volume: "250 Ml",
    },
    {
      drug: "5 Fluorouracil",
      form: "Injection",
      dose: "240",
      unit: "Mg/M2",
      volume: "CIV",
    },
  ];

  const premedications = [
    {
      drug: "Ondansetron",
      dose: "8 mg",
      route: "IV",
      time: "30 mins before chemo",
    },
    {
      drug: "Dexamethasone",
      dose: "8 mg",
      route: "IV",
      time: "30 mins before chemo",
    },
    {
      drug: "Ranitidine",
      dose: "50 mg",
      route: "IV",
      time: "30 mins before chemo",
    },
  ];

  const dischargeMedications = [
    {
      drug: "Capecitabine",
      dose: "500 mg",
      frequency: "2-0-2",
      instruction: "After Food",
      duration: "14 Days",
    },
    {
      drug: "Domstal",
      dose: "10 mg",
      frequency: "1-1-1",
      instruction: "Before Food",
      duration: "10 Days",
    },
    {
      drug: "Loperamide",
      dose: "2 mg",
      frequency: "1-0-0",
      instruction: "After Food",
      duration: "5 Days",
    },
    {
      drug: "Pantoprazole",
      dose: "40 mg",
      frequency: "1-0-1",
      instruction: "Before Food",
      duration: "15 Days",
    },
  ];

  const Step = ({
    label,
    active = false,
  }: {
    label: string;
    active?: boolean;
  }) => (
    <div className="relative z-10 flex w-48 flex-col items-center gap-3">
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs text-white ${
          active ? "bg-green-500" : "bg-slate-400"
        }`}
      >
        ✓
      </div>

      <span
        className={`text-center text-xs font-bold uppercase tracking-wider ${
          active ? "text-slate-800" : "text-slate-600"
        }`}
      >
        {label}
      </span>

      {active && (
        <div className="absolute -bottom-6 h-1 w-full rounded-t-sm bg-green-500" />
      )}
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      {/* =========================================================
          LEFT SIDEBAR
      ========================================================== */}
      <aside className="z-10 flex h-full w-[320px] shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white">
        {/* Patient Profile */}
        <div className="flex flex-col items-center border-b border-slate-100 p-8">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuALJiAbRuWXhNDLo3GQYHiqj16204Ep5hRrCI4UBcdw8TvdrPcM4ZuO18hxvBFPvlQn7KxzuaUry244h6sEa-VxJy_8uUoXwDmN_S2_Si68ZHQl-S3bbey-UNtzaIZsTSnrMNMheaqusgLznpVaO76fbp2SQSy8ZWKrqz0dkh2IOa1xzkffUQIzMPeroYMp72bTxyTtcHadZmyGu7HjlwSTdwupK9f7Fg7ScDl4J1jSQvI_wG6TirJNydXFqQSnMU-mpQ"
            alt="Patient Avatar"
            className="mb-4 h-24 w-24 rounded-full border-2 border-white object-cover shadow-sm"
          />

          <h2 className="mb-1 text-xl font-bold text-slate-900">
            Vijaya Nallusamy
          </h2>

          <p className="mb-4 text-sm text-slate-500">51 Y / Female</p>

          <span className="mb-6 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            ONC-2026-10025
          </span>

          <p className="text-center text-sm font-semibold tracking-wide text-blue-600">
            DUCTAL CARCINOMA STAGE II
          </p>
        </div>

        {/* Contact Information */}
        <div className="flex flex-col gap-6 border-b border-slate-100 p-6">
          {/* Phone */}
          <div className="flex items-center gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400">
              <span className="text-sm">☎</span>
            </div>

            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">
                Phone
              </p>

              <p className="text-sm font-medium text-slate-800">
                +91 98765 43210
              </p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400">
              <span className="text-sm">✉</span>
            </div>

            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">
                Email
              </p>

              <p className="text-sm font-medium text-slate-700">
                vijaya.n@example.com
              </p>
            </div>
          </div>
        </div>

        {/* Vitals */}
        <div className="mb-6 grid grid-cols-2 gap-x-4 gap-y-6 p-6">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">
              Height
            </p>
            <p className="font-semibold text-slate-800">154 cm</p>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">
              Weight
            </p>
            <p className="font-semibold text-slate-800">52 kg</p>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">
              BSA
            </p>
            <p className="font-semibold text-slate-800">1.49 m²</p>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">
              BMI
            </p>
            <p className="font-semibold text-slate-800">21.93</p>
          </div>
        </div>

        {/* Profile Button */}
        <div className="px-6 pb-6">
          <button
            type="button"
            className="w-full rounded-md border border-blue-600 px-4 py-2.5 font-medium text-blue-600 transition-colors hover:bg-blue-50"
          >
            View Full Profile
          </button>
        </div>
      </aside>

      {/* =========================================================
          MAIN CONTENT
      ========================================================== */}
      <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-slate-50">
        {/* =======================================================
            TOP NAVIGATION
        ======================================================== */}
        <header className="z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="text-slate-500 transition-colors hover:text-slate-700"
              aria-label="Back"
            >
              <span className="text-lg">←</span>
            </button>

            <h1 className="text-xl font-semibold text-slate-800">
              Patients
            </h1>
          </div>

          <div className="flex items-center gap-6">
            {/* Notification */}
            <button
              type="button"
              className="relative text-slate-500 transition-colors hover:text-slate-700"
              aria-label="Notifications"
            >
              <span className="text-xl">♧</span>

              <span className="absolute right-0 top-0 h-2 w-2 rounded-full border border-white bg-red-500" />
            </button>

            {/* User */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-600">
                HMS
              </span>

              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1E3A8A] text-xs font-semibold text-white">
                DR
              </div>
            </div>
          </div>
        </header>

        {/* =======================================================
            SCROLLABLE CONTENT
        ======================================================== */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto flex w-full max-w-[1000px] flex-col">
            {/* ===================================================
                PROGRESS STEPPER
            ==================================================== */}
            <div className="relative mb-px flex justify-between rounded-t-xl border border-slate-200 bg-white p-6">
              {/* Background connector */}
              <div className="absolute left-24 right-24 top-9 h-[2px] bg-slate-100" />

              {/* Green progress */}
              <div className="absolute left-24 top-9 h-[2px] w-1/2 bg-green-500" />

              <Step label="Discharge Medication" />

              <Step label="Follow Up" />

              <Step label="Summary" active />
            </div>

            {/* ===================================================
                SUMMARY CARD
            ==================================================== */}
            <div className="mb-6 flex flex-1 flex-col rounded-b-xl border border-slate-200 bg-white shadow-sm">
              {/* Summary Heading */}
              <div className="flex justify-center border-b border-slate-100 p-4">
                <h2 className="text-xl font-semibold text-blue-700">
                  Summary
                </h2>
              </div>

              <div className="flex flex-1 flex-col gap-10 p-8">
                {/* =================================================
                    PATIENT INFORMATION
                ================================================== */}
                <section>
                  <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="mb-2 font-medium text-slate-900">
                        Cancer Type
                      </p>
                      <p className="text-sm text-slate-500">
                        Colon Cancer
                      </p>
                    </div>

                    <div>
                      <p className="mb-2 font-medium text-slate-900">
                        Stage
                      </p>

                      <p className="flex items-center gap-2 text-sm text-slate-500">
                        Stage II (T3N0M0)
                        <span className="text-slate-400">◷</span>
                      </p>
                    </div>

                    <div>
                      <p className="mb-2 font-medium text-slate-900">
                        Context
                      </p>

                      <p className="text-sm text-slate-500">Curative</p>
                    </div>

                    <div />

                    <div>
                      <p className="mb-2 font-medium text-slate-900">
                        Protocol
                      </p>

                      <p className="flex items-center gap-2 text-sm text-slate-500">
                        FOLFOX (2 Weekly)
                        <span className="text-slate-400">◷</span>
                      </p>
                    </div>

                    <div>
                      <p className="mb-2 font-medium text-slate-900">
                        Duration
                      </p>

                      <p className="text-sm text-slate-500">
                        12 Cycles
                      </p>
                    </div>

                    <div>
                      <p className="mb-2 font-medium text-slate-900">
                        Current
                      </p>

                      <p className="text-sm text-slate-500">
                        Day 1
                        <span className="ml-4">20-06-2026</span>
                      </p>
                    </div>
                  </div>
                </section>

                {/* =================================================
                    CHEMOTHERAPY ORDERS
                ================================================== */}
                <section>
                  <h3 className="mb-4 text-lg font-medium text-indigo-900">
                    Chemotherapy Orders
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[650px] text-left text-sm">
                      <thead>
                        <tr>
                          <th className="w-1/4 pb-3 font-medium text-slate-900">
                            Drug Name
                          </th>

                          <th className="w-1/5 pb-3 font-medium text-slate-900">
                            Form
                          </th>

                          <th className="w-1/5 pb-3 font-medium text-slate-900">
                            Dose
                          </th>

                          <th className="w-1/5 pb-3 font-medium text-slate-900">
                            Unit
                          </th>

                          <th className="pb-3 font-medium text-slate-900">
                            Volume
                          </th>
                        </tr>
                      </thead>

                      <tbody className="text-slate-500">
                        {chemotherapyOrders.map((item) => (
                          <tr key={item.drug}>
                            <td className="py-3">{item.drug}</td>
                            <td className="py-3">{item.form}</td>
                            <td className="py-3">{item.dose}</td>
                            <td className="py-3 text-xs uppercase">
                              {item.unit}
                            </td>
                            <td className="py-3 text-xs uppercase">
                              {item.volume}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* =================================================
                    PREMEDICATION
                ================================================== */}
                <section>
                  <h3 className="mb-4 text-lg font-medium text-indigo-900">
                    Premedication
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px] text-left text-sm">
                      <thead>
                        <tr>
                          <th className="w-1/4 pb-3 font-medium text-slate-900">
                            Drug Name
                          </th>

                          <th className="w-1/5 pb-3 font-medium text-slate-900">
                            Dose
                          </th>

                          <th className="w-1/5 pb-3 font-medium text-slate-900">
                            Route
                          </th>

                          <th className="pb-3 font-medium text-slate-900">
                            Time
                          </th>
                        </tr>
                      </thead>

                      <tbody className="text-slate-800">
                        {premedications.map((item) => (
                          <tr key={item.drug}>
                            <td className="py-3">{item.drug}</td>
                            <td className="py-3">{item.dose}</td>
                            <td className="py-3">{item.route}</td>
                            <td className="py-3">{item.time}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* =================================================
                    DISCHARGE MEDICATION
                ================================================== */}
                <section>
                  <h3 className="mb-4 text-lg font-medium text-indigo-900">
                    Discharge Medication
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left text-sm">
                      <thead>
                        <tr>
                          <th className="w-1/5 pb-3 font-medium text-slate-900">
                            Drug Name
                          </th>

                          <th className="w-1/6 pb-3 font-medium text-slate-900">
                            Dose
                          </th>

                          <th className="w-1/6 pb-3 font-medium text-slate-900">
                            Frequency
                          </th>

                          <th className="w-1/4 pb-3 font-medium text-slate-900">
                            Instruction
                          </th>

                          <th className="pb-3 font-medium text-slate-900">
                            Duration
                          </th>
                        </tr>
                      </thead>

                      <tbody className="text-slate-800">
                        {dischargeMedications.map((item) => (
                          <tr key={item.drug}>
                            <td className="py-3">{item.drug}</td>
                            <td className="py-3">{item.dose}</td>
                            <td className="py-3">{item.frequency}</td>
                            <td className="py-3">{item.instruction}</td>
                            <td className="py-3">{item.duration}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* =================================================
                    FOOTER DATES
                ================================================== */}
                <section className="grid grid-cols-1 gap-6 border-t border-slate-100 pt-6 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-900">
                      Next Visit Date
                    </p>

                    <p className="text-slate-600">04-07-2026</p>
                  </div>

                  <div className="sm:pl-8">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-900">
                      Next Cycle
                    </p>

                    <p className="flex items-center gap-2 text-slate-600">
                      Cycle 2 / Day 1
                      <span className="text-slate-400">◷</span>
                    </p>
                  </div>
                </section>
              </div>
            </div>

            {/* ===================================================
                ACTION BUTTONS
            ==================================================== */}
            <div className="mb-8 flex flex-wrap justify-end gap-4">
              <button
                type="button"
                className="rounded-md bg-[#5624D0] px-8 py-3 font-medium text-white shadow-sm transition-colors hover:bg-[#4a1fb5]"
              >
                Submit
              </button>

              <button
                type="button"
                className="rounded-md bg-[#5624D0] px-8 py-3 font-medium text-white shadow-sm transition-colors hover:bg-[#4a1fb5]"
              >
                Print / Download Summary
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PatientSummary;