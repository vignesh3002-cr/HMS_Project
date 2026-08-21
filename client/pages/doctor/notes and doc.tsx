import React, { useRef, useState } from "react";

const PatientNotesDocuments: React.FC = () => {
  const [activeTab, setActiveTab] = useState("Notes & Documents");
  const [labTab, setLabTab] = useState("Chemistry");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    "Order Summary",
    "Medications",
    "Administration",
    "Discharge",
    "History",
    "Notes & Documents",
  ];

  const documents = [
    {
      name: "Treatment Summary_Q1",
      info: "PDF • 2.4 MB • 12 May 2026",
      icon: "fa-file-lines",
      color: "text-blue-500",
      hover: "hover:border-blue-300",
    },
    {
      name: "Biopsy Report_Initial",
      info: "PDF • 1.1 MB • 05 Apr 2026",
      icon: "fa-file-waveform",
      color: "text-green-500",
      hover: "hover:border-green-300",
    },
    {
      name: "Prescription_Cycle_5",
      info: "PDF • 450 KB • 28 May 2026",
      icon: "fa-prescription",
      color: "text-purple-500",
      hover: "hover:border-purple-300",
    },
  ];

  const activities = [
    {
      title: "New Note Added",
      description: "Dr. Naveen added 'Treatment Assessment'",
      time: "15 MINS AGO",
      dot: "bg-blue-500",
    },
    {
      title: "Report Uploaded",
      description: "Nurse Rani uploaded 'CBC_05Jun26'",
      time: "1 HOUR AGO",
      dot: "bg-green-500",
    },
    {
      title: "Prescription Updated",
      description: "New medication orders for Taxol cycle 6",
      time: "3 HOURS AGO",
      dot: "bg-purple-500",
    },
  ];

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSelectFiles = () => {
    fileInputRef.current?.click();
  };

  const handleDownload = (name: string) => {
    console.log(`Downloading: ${name}`);
  };

  const handleView = (name: string) => {
    console.log(`Viewing: ${name}`);
  };

  const handleAddNote = () => {
    console.log("Add Note clicked");
  };

  const handleSave = () => {
    console.log("Save Notes & Changes clicked");
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50 text-slate-800 antialiased font-sans">
      {/* =========================================================
          MAIN CONTENT AREA
      ========================================================== */}
      <div className="flex h-screen flex-col overflow-hidden">
        {/* =======================================================
            TOP HEADER
        ======================================================== */}
        <header className="z-10 flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
          {/* Branch */}
          <button
            type="button"
            className="flex cursor-pointer items-center text-sm text-slate-600 transition-colors hover:text-slate-900"
          >
            <i className="fa-solid fa-share-nodes mr-2" />
            <span>Main Branch</span>
            <i className="fa-solid fa-chevron-down ml-1 text-xs" />
          </button>

          {/* Header Actions */}
          <div className="flex items-center space-x-4">
            {/* Notification */}
            <button
              type="button"
              className="relative text-slate-400 transition-colors hover:text-slate-600"
              aria-label="Notifications"
            >
              <i className="fa-regular fa-bell" />

              <span className="absolute right-0 top-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>

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

            {/* ===================================================
                TAB NAVIGATION
            ==================================================== */}
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
                <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">

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
                        18
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
                        32
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
                        12
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
                        6
                      </p>
                    </div>
                  </div>
                </div>

                {/* =================================================
                    RECENT CLINICAL NOTES
                ================================================== */}
                <section className="mb-8 rounded-xl border border-slate-200 bg-white shadow-sm">

                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-slate-200 p-5">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Recent Clinical Notes
                    </h3>

                    <button
                      type="button"
                      onClick={handleAddNote}
                      className="flex items-center rounded-md bg-[#0052cc] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    >
                      <i className="fa-solid fa-plus mr-2" />
                      Add Note
                    </button>
                  </div>

                  {/* Timeline */}
                  <div className="p-6">
                    <div className="relative">

                      {/* Note 1 */}
                      <div className="relative mb-8 pl-12">
                        {/* Timeline Line */}
                        <div className="absolute left-5 top-10 bottom-[-2rem] w-0.5 bg-slate-200" />

                        {/* Avatar */}
                        <div className="absolute left-0 top-0 z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-blue-100 text-sm font-bold text-blue-700">
                          DN
                        </div>

                        <div className="mb-2 flex items-start justify-between gap-4">
                          <div>
                            <h4 className="text-base font-bold text-slate-900">
                              Treatment Assessment
                            </h4>

                            <p className="text-sm text-slate-500">
                              Dr. Naveen • Oncologist • Today, 09:15 AM
                            </p>
                          </div>

                          <span className="rounded border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            E-Signed
                          </span>
                        </div>

                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                          Patient reporting mild fatigue following the
                          previous cycle. CBC shows ANC within acceptable
                          limits for Cycle 6 Day 1. Protocol TAXOL - WEEKLY
                          to continue as planned. Encouraged increased
                          fluid intake and moderate walking.
                        </div>
                      </div>

                      {/* Note 2 */}
                      <div className="relative pl-12">
                        {/* Avatar */}
                        <div className="absolute left-0 top-0 z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-sm font-bold text-slate-700">
                          RR
                        </div>

                        <div className="mb-2">
                          <h4 className="text-base font-bold text-slate-900">
                            Nursing Observation
                          </h4>

                          <p className="text-sm text-slate-500">
                            Nurse Rani • Oncology Nurse • Today, 08:30 AM
                          </p>
                        </div>

                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                          Vitals stable. BP: 120/80, Temp: 98.4F. Central
                          line patency confirmed. Patient appears
                          well-rested. Provided orientation for today's
                          medication administration schedule.
                        </div>
                      </div>
                    </div>
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

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {documents.map((document) => (
                      <div
                        key={document.name}
                        className={`group relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors ${document.hover}`}
                      >
                        {/* More */}
                        <button
                          type="button"
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                          aria-label={`More options for ${document.name}`}
                        >
                          <i className="fa-solid fa-ellipsis-vertical" />
                        </button>

                        {/* Icon */}
                        <div
                          className={`mb-3 text-2xl ${document.color}`}
                        >
                          <i className={`fa-solid ${document.icon}`} />
                        </div>

                        {/* Name */}
                        <h4 className="mb-1 truncate text-sm font-bold text-slate-900">
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
                            onClick={() =>
                              handleView(document.name)
                            }
                            className="flex-1 rounded bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                          >
                            View
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDownload(document.name)
                            }
                            className="flex-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    ))}
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

                        {/* Creatinine */}
                        <tr className="transition-colors hover:bg-slate-50">
                          <td className="p-4 pl-6 font-semibold text-slate-900">
                            Serum Creatinine
                          </td>

                          <td className="p-4">
                            05 Jun 2026
                          </td>

                          <td className="p-4">
                            0.48 mg/dL
                          </td>

                          <td className="p-4">
                            <div className="flex h-6 w-24 items-end">
                              <div className="group relative mx-px h-[30%] w-1/4 bg-blue-300">
                                <span className="absolute -top-5 left-0 hidden rounded bg-black px-1 text-[10px] text-white group-hover:block">
                                  0.85
                                </span>
                              </div>

                              <div className="group relative mx-px h-[40%] w-1/4 bg-blue-300">
                                <span className="absolute -top-5 left-0 hidden rounded bg-black px-1 text-[10px] text-white group-hover:block">
                                  0.95
                                </span>
                              </div>

                              <div className="group relative mx-px h-[20%] w-1/4 bg-blue-800">
                                <span className="absolute -top-5 left-0 hidden rounded bg-black px-1 text-[10px] text-white group-hover:block">
                                  0.25
                                </span>
                              </div>

                              <div className="group relative mx-px h-[25%] w-1/4 bg-blue-600">
                                <span className="absolute -top-5 left-0 hidden rounded bg-black px-1 text-[10px] text-white group-hover:block">
                                  0.48
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="p-4 pr-6 text-center">
                            <button
                              type="button"
                              className="text-blue-600 hover:text-blue-800"
                              aria-label="View Serum Creatinine"
                            >
                              <i className="fa-regular fa-eye" />
                            </button>
                          </td>
                        </tr>

                        {/* Hemoglobin */}
                        <tr className="transition-colors hover:bg-slate-50">
                          <td className="p-4 pl-6 font-semibold text-slate-900">
                            Hemoglobin (Hb)
                          </td>

                          <td className="p-4">
                            05 Jun 2026
                          </td>

                          <td className="p-4">
                            11.2 g/dL
                          </td>

                          <td className="p-4">
                            <div className="flex h-6 w-24 items-end">
                              <div className="mx-px h-[90%] w-1/4 bg-blue-300" />
                              <div className="mx-px h-[70%] w-1/4 bg-blue-300" />
                              <div className="mx-px h-[80%] w-1/4 bg-blue-600" />
                              <div className="mx-px h-[40%] w-1/4 bg-blue-800" />
                            </div>
                          </td>

                          <td className="p-4 pr-6 text-center">
                            <button
                              type="button"
                              className="text-blue-600 hover:text-blue-800"
                              aria-label="View Hemoglobin"
                            >
                              <i className="fa-regular fa-eye" />
                            </button>
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
                  className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 p-6 text-center transition-colors hover:bg-blue-50"
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-xl text-blue-600">
                    <i className="fa-solid fa-file-arrow-up" />
                  </div>

                  <h4 className="mb-1 text-base font-bold text-slate-900">
                    Upload Document
                  </h4>

                  <p className="mb-4 px-4 text-xs text-slate-500">
                    Drag & Drop or click to browse files (PDF, JPG, PNG)
                  </p>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleSelectFiles();
                    }}
                    className="rounded-md border border-blue-600 bg-white px-6 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
                  >
                    Select Files
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {selectedFile && (
                    <p className="mt-3 max-w-full truncate text-xs font-medium text-green-600">
                      Selected: {selectedFile.name}
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
                      {activities.map((activity) => (
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
                      ))}
                    </div>
                  </div>
                </section>

                {/* =================================================
                    IMPORTANT FLAGS
                ================================================== */}
                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-900">
                      Important Flags
                    </h3>

                    <i className="fa-solid fa-thumbtack text-slate-400" />
                  </div>

                  <div className="space-y-3">

                    {/* Allergy */}
                    <div className="rounded-r-lg border-l-4 border-red-500 bg-red-50 p-3">
                      <h4 className="mb-1 text-sm font-bold text-red-800">
                        Allergy Warning
                      </h4>

                      <p className="text-xs leading-snug text-red-700">
                        Patient is highly sensitive to Penicillin-based
                        antibiotics.
                      </p>
                    </div>

                    {/* Neutropenia */}
                    <div className="rounded-r-lg border-l-4 border-orange-500 bg-orange-50 p-3">
                      <h4 className="mb-1 text-sm font-bold text-orange-800">
                        Neutropenia History
                      </h4>

                      <p className="text-xs leading-snug text-orange-700">
                        Previous cycle was delayed due to Grade 2
                        Neutropenia (ANC &lt; 1500).
                      </p>
                    </div>
                  </div>
                </section>
              </aside>
            </div>
          </div>
        </main>

        {/* =======================================================
            BOTTOM ACTION BAR
        ======================================================== */}
        <div className="absolute bottom-0 left-0 right-0 z-20 flex h-16 flex-shrink-0 items-center justify-between border-t border-slate-200 bg-white px-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">

          <div className="text-sm text-slate-500">
            Showing 18 of 56 total records
          </div>

          <div className="flex space-x-3">

            {/* Download All */}
            <button
              type="button"
              onClick={() => console.log("Download All")}
              className="flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
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

      {/* =========================================================
          FONT AWESOME
          Add this to index.html if it isn't already included:
          Font Awesome 6.4
      ========================================================== */}
    </div>
  );
};

export default PatientNotesDocuments;