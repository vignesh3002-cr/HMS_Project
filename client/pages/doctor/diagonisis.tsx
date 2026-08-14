import React, { useState } from "react";

type FormData = {
  type: string;
  histomorphology: string;
  cancerStage: string;
  grade: string;
  tnmStage: string;
  icdCode: string;
  notes: string;
};

const CheckIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 20 20"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
      clipRule="evenodd"
    />
  </svg>
);

const BackIcon = () => (
  <svg
    className="h-6 w-6"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M10 19l-7-7m0 0l7-7m-7 7h18"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const NotificationIcon = () => (
  <svg
    className="h-6 w-6"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M18 8a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13.73 21a2 2 0 01-3.46 0"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ChevronDownIcon = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 20 20"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
      clipRule="evenodd"
    />
  </svg>
);

const DoubleArrowIcon = () => (
  <svg
    className="h-4 w-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M5 12h12"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13 6l6 6-6 6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const App: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    type: "Colon Cancer",
    histomorphology: "Adenocarcinoma",
    cancerStage: "Stage II",
    grade: "Moderately Differentiated",
    tnmStage: "T3N0M0",
    icdCode: "C18.7 Malignant neoplasm of sigmoid colon",
    notes: "Patient and family informed.",
  });

  const [notificationOpen, setNotificationOpen] = useState(false);

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleNext = () => {
    console.log("Diagnosis Data:", formData);
    alert("Diagnosis saved. Proceeding to the next step.");
  };

  const handleBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans text-[#334155] sm:p-6 lg:p-8">
      {/* Main App Container */}
      <div className="mx-auto flex min-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_0_rgba(0,0,0,0.06)]">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4 sm:px-8">
          {/* Back Button + Title */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleBack}
              aria-label="Go back"
              className="text-gray-500 transition-colors hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <BackIcon />
            </button>

            <h1 className="text-xl font-bold text-gray-800">
              Patients
            </h1>
          </div>

          {/* Notification + User */}
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setNotificationOpen((previous) => !previous)
                }
                aria-label="Notifications"
                className="relative text-gray-500 transition-colors hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <NotificationIcon />

                <span className="absolute right-0 top-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              </button>

              {notificationOpen && (
                <div className="absolute right-0 top-9 z-30 w-56 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600 shadow-lg">
                  No new notifications
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden text-sm font-semibold text-gray-700 sm:block">
                HMS
              </span>

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1e3a8a] text-sm font-bold text-white">
                DR
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex flex-1 flex-col px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
          {/* Stepper */}
          <div className="mx-auto mb-12 w-full max-w-4xl sm:mb-16">
            <div className="relative flex justify-between">
              {/* Consultation */}
              <div className="flex w-1/3 flex-col items-center text-center">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-500">
                  <CheckIcon className="h-4 w-4 text-white" />
                </div>

                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-800 sm:text-xs sm:tracking-widest">
                  Consultation
                </span>
              </div>

              {/* Lab Report Review */}
              <div className="flex w-1/3 flex-col items-center text-center">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-500">
                  <CheckIcon className="h-4 w-4 text-white" />
                </div>

                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-800 sm:text-xs sm:tracking-widest">
                  Lab Report Review
                </span>
              </div>

              {/* Diagnosis */}
              <div className="relative flex w-1/3 flex-col items-center text-center">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#22c55e]">
                  <CheckIcon className="h-4 w-4 text-white" />
                </div>

                <span className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-800 sm:text-xs sm:tracking-widest">
                  Diagnosis
                </span>

                {/* Active Indicator */}
                <div className="absolute bottom-0 h-1.5 w-full translate-y-2 rounded-full bg-[#22c55e]" />
              </div>
            </div>
          </div>

          {/* Diagnosis Form */}
          <section className="flex-1">
            <h2 className="mb-8 text-2xl font-bold text-[#334155]">
              Diagnosis
            </h2>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleNext();
              }}
              className="space-y-8"
            >
              {/* Two Column Fields */}
              <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
                {/* Type */}
                <div>
                  <label
                    htmlFor="type"
                    className="mb-2 block text-sm font-semibold text-gray-600"
                  >
                    Type
                  </label>

                  <div className="relative">
                    <select
                      id="type"
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      className="block w-full appearance-none rounded-md border-gray-300 bg-white py-3 pl-4 pr-10 text-sm text-gray-800 focus:border-[#1d4ed8] focus:outline-none focus:ring-[#1d4ed8]"
                    >
                      <option>Colon Cancer</option>
                      <option>Other</option>
                    </select>

                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                      <ChevronDownIcon />
                    </div>
                  </div>
                </div>

                {/* Histomorphology */}
                <div>
                  <label
                    htmlFor="histomorphology"
                    className="mb-2 block text-sm font-semibold text-gray-600"
                  >
                    Histomorphology
                  </label>

                  <div className="relative">
                    <select
                      id="histomorphology"
                      name="histomorphology"
                      value={formData.histomorphology}
                      onChange={handleChange}
                      className="block w-full appearance-none rounded-md border-gray-300 bg-white py-3 pl-4 pr-10 text-sm text-gray-800 focus:border-[#1d4ed8] focus:outline-none focus:ring-[#1d4ed8]"
                    >
                      <option>Adenocarcinoma</option>
                      <option>Other</option>
                    </select>

                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                      <ChevronDownIcon />
                    </div>
                  </div>
                </div>

                {/* Cancer Stage */}
                <div>
                  <label
                    htmlFor="cancerStage"
                    className="mb-2 block text-sm font-semibold text-gray-600"
                  >
                    Cancer Stage
                  </label>

                  <div className="relative">
                    <select
                      id="cancerStage"
                      name="cancerStage"
                      value={formData.cancerStage}
                      onChange={handleChange}
                      className="block w-full appearance-none rounded-md border-gray-300 bg-white py-3 pl-4 pr-10 text-sm text-gray-800 focus:border-[#1d4ed8] focus:outline-none focus:ring-[#1d4ed8]"
                    >
                      <option>Stage II</option>
                      <option>Stage III</option>
                    </select>

                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                      <ChevronDownIcon />
                    </div>
                  </div>
                </div>

                {/* Grade */}
                <div>
                  <label
                    htmlFor="grade"
                    className="mb-2 block text-sm font-semibold text-gray-600"
                  >
                    Grade
                  </label>

                  <div className="relative">
                    <select
                      id="grade"
                      name="grade"
                      value={formData.grade}
                      onChange={handleChange}
                      className="block w-full appearance-none rounded-md border-gray-300 bg-white py-3 pl-4 pr-10 text-sm text-gray-800 focus:border-[#1d4ed8] focus:outline-none focus:ring-[#1d4ed8]"
                    >
                      <option>Moderately Differentiated</option>
                      <option>Poorly Differentiated</option>
                    </select>

                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                      <ChevronDownIcon />
                    </div>
                  </div>
                </div>

                {/* TNM Stage */}
                <div>
                  <label
                    htmlFor="tnmStage"
                    className="mb-2 block text-sm font-semibold text-gray-600"
                  >
                    TNM Stage
                  </label>

                  <div className="relative">
                    <select
                      id="tnmStage"
                      name="tnmStage"
                      value={formData.tnmStage}
                      onChange={handleChange}
                      className="block w-full appearance-none rounded-md border-gray-300 bg-white py-3 pl-4 pr-10 text-sm text-gray-800 focus:border-[#1d4ed8] focus:outline-none focus:ring-[#1d4ed8]"
                    >
                      <option>T3N0M0</option>
                      <option>Other</option>
                    </select>

                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                      <ChevronDownIcon />
                    </div>
                  </div>
                </div>

                {/* ICD Code */}
                <div>
                  <label
                    htmlFor="icdCode"
                    className="mb-2 block text-sm font-semibold text-gray-600"
                  >
                    ICD Code
                  </label>

                  <input
                    id="icdCode"
                    name="icdCode"
                    type="text"
                    value={formData.icdCode}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 px-4 py-3 text-sm text-gray-800 shadow-sm focus:border-[#1d4ed8] focus:ring-[#1d4ed8]"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="pt-2">
                <label
                  htmlFor="notes"
                  className="mb-2 block text-sm font-semibold text-gray-600"
                >
                  Notes
                </label>

                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className="block w-full resize-none rounded-md border border-gray-300 px-4 py-3 text-sm text-gray-800 shadow-sm focus:border-[#1d4ed8] focus:ring-[#1d4ed8]"
                />
              </div>

              {/* Footer Action */}
              <div className="mt-12 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-md border border-transparent bg-[#1d4ed8] px-6 py-3 text-base font-medium text-white shadow-sm transition-colors hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <DoubleArrowIcon />
                  <span className="ml-2">Next</span>
                </button>
              </div>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
};

export default App;