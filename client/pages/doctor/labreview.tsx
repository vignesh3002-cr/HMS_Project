import React, { useState } from "react";

interface Investigation {
  name: string;
  orderedDate: string;
  status: "Completed";
}

const investigations: Investigation[] = [
  {
    name: "Complete Blood Count (CBC)",
    orderedDate: "01-06-2026",
    status: "Completed",
  },
  {
    name: "Liver Function Test (LFT)",
    orderedDate: "01-06-2026",
    status: "Completed",
  },
  {
    name: "CT Scan Abdomen & Pelvis",
    orderedDate: "02-06-2026",
    status: "Completed",
  },
  {
    name: "Chest X-Ray",
    orderedDate: "02-06-2026",
    status: "Completed",
  },
];

const CheckIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 20 20"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
    />
  </svg>
);

const BackIcon = () => (
  <svg
    className="h-6 w-6"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
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
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ArrowRightIcon = () => (
  <svg
    className="h-5 w-5"
    fill="currentColor"
    viewBox="0 0 20 20"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
    />
  </svg>
);

const App: React.FC = () => {
  const [observations, setObservations] = useState("");
  const [notifications, setNotifications] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCancel = () => {
    setObservations("");
    setSaved(false);
  };

  const handleSaveDraft = () => {
    setSaved(true);
  };

  const handleProceed = () => {
    alert("Proceeding to Treatment Plan");
  };

  const handleViewReport = (name: string) => {
    alert(`Viewing report: ${name}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FB] text-[#1F2937]">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Go back"
            onClick={() => window.history.back()}
            className="text-gray-600 transition-colors hover:text-gray-900 focus:outline-none"
          >
            <BackIcon />
          </button>

          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            Patients
          </h1>
        </div>

        <div className="flex items-center gap-6">
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => setNotifications((prev) => !prev)}
            className="relative text-gray-500 transition-colors hover:text-gray-700 focus:outline-none"
          >
            <NotificationIcon />

            <span className="absolute right-0 top-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />

            {notifications && (
              <div className="absolute right-0 top-8 w-52 rounded-lg border border-gray-200 bg-white p-3 text-left text-sm text-gray-600 shadow-lg">
                No new notifications
              </div>
            )}
          </button>

          <div className="flex items-center gap-3">
            <span className="font-semibold text-gray-700">HMS</span>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1E3A8A] font-bold text-white shadow-sm">
              DR
            </div>
          </div>
        </div>
      </header>

      {/* Workflow Stepper */}
      <section className="relative bg-[#F8F9FB] pb-0 pt-8">
        <div className="mx-auto max-w-5xl px-6">
          <div className="relative flex items-end justify-between">
            {/* Consultation */}
            <div className="relative z-10 flex flex-1 flex-col items-center pb-6">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-400 text-white">
                <CheckIcon />
              </div>

              <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
                Consultation
              </span>

              <div className="absolute bottom-0 left-0 right-[-50%] h-1 rounded bg-white" />
            </div>

            {/* Lab Report Review */}
            <div className="relative z-10 flex flex-1 flex-col items-center pb-6">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white ring-4 ring-green-100">
                <CheckIcon />
              </div>

              <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
                Lab Report Review
              </span>

              <div className="absolute bottom-0 left-0 right-0 mx-auto h-1 w-[95%] rounded bg-green-500" />
            </div>

            {/* Diagnosis */}
            <div className="relative z-10 flex flex-1 flex-col items-center pb-6">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-400 text-white">
                <CheckIcon />
              </div>

              <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
                Diagnosis
              </span>

              <div className="absolute bottom-0 left-[-50%] right-0 h-1 rounded bg-white" />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-grow px-6 py-8">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Laboratory Investigations */}
          <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
            {/* Card Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-8 py-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Laboratory Investigations
              </h2>

              <span className="text-sm font-medium text-gray-500">
                {investigations.length} Reports Found
              </span>
            </div>

            {/* Table */}
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-white">
                    <th className="w-2/5 px-8 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                      Investigation Name
                    </th>

                    <th className="w-1/5 px-8 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                      Ordered Date
                    </th>

                    <th className="w-1/5 px-8 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                      Status
                    </th>

                    <th className="w-1/5 px-8 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white text-gray-700">
                  {investigations.map((investigation) => (
                    <tr
                      key={investigation.name}
                      className="border-b border-[#F3F4F6] transition-colors last:border-b-0 hover:bg-gray-50"
                    >
                      <td className="px-8 py-5 text-[15px] font-semibold">
                        {investigation.name}
                      </td>

                      <td className="px-8 py-5 text-gray-600">
                        {investigation.orderedDate}
                      </td>

                      <td className="px-8 py-5">
                        <span className="inline-flex items-center rounded-full bg-[#DCFCE7] px-3 py-1 text-sm font-semibold text-[#166534]">
                          {investigation.status}
                        </span>
                      </td>

                      <td className="px-8 py-5 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            handleViewReport(investigation.name)
                          }
                          className="inline-flex items-center justify-center rounded-lg bg-[#F0F5FF] px-4 py-2 text-sm font-semibold text-[#2563EB] transition-colors hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                        >
                          View Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Clinical Remarks */}
          <section className="rounded-xl border border-gray-100 bg-white p-8 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
            <h2 className="mb-6 text-2xl font-bold text-gray-900">
              Clinical Remarks
            </h2>

            <div className="space-y-3">
              <label
                htmlFor="observations"
                className="block text-[13px] font-bold uppercase tracking-widest text-[#9CA3AF]"
              >
                Observations & Notes
              </label>

              <textarea
                id="observations"
                name="observations"
                value={observations}
                onChange={(event) => setObservations(event.target.value)}
                placeholder="Enter clinical observations based on the laboratory reports..."
                rows={6}
                className="block w-full resize-y rounded-xl border-[#E5E7EB] bg-[#F8FAFC] p-4 text-[15px] text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {saved && (
              <p className="mt-3 text-sm font-medium text-green-600">
                Draft saved successfully.
              </p>
            )}
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="sticky bottom-0 z-20 border-t border-gray-200 bg-white px-6 py-6">
        <div className="mx-auto flex max-w-5xl justify-center gap-4">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-xl border border-gray-300 px-8 py-3 text-[15px] font-bold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            className="rounded-xl border border-blue-600 px-8 py-3 text-[15px] font-bold text-blue-600 transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Save as Draft
          </button>

          <button
            type="button"
            onClick={handleProceed}
            className="flex items-center gap-2 rounded-xl bg-[#2563EB] px-8 py-3 text-[15px] font-bold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Proceed to Treatment Plan
            <ArrowRightIcon />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;import React, { useState } from "react";

interface Investigation {
  name: string;
  orderedDate: string;
  status: "Completed";
}

const investigations: Investigation[] = [
  {
    name: "Complete Blood Count (CBC)",
    orderedDate: "01-06-2026",
    status: "Completed",
  },
  {
    name: "Liver Function Test (LFT)",
    orderedDate: "01-06-2026",
    status: "Completed",
  },
  {
    name: "CT Scan Abdomen & Pelvis",
    orderedDate: "02-06-2026",
    status: "Completed",
  },
  {
    name: "Chest X-Ray",
    orderedDate: "02-06-2026",
    status: "Completed",
  },
];

const CheckIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 20 20"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
    />
  </svg>
);

const BackIcon = () => (
  <svg
    className="h-6 w-6"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
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
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ArrowRightIcon = () => (
  <svg
    className="h-5 w-5"
    fill="currentColor"
    viewBox="0 0 20 20"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
    />
  </svg>
);

const App: React.FC = () => {
  const [observations, setObservations] = useState("");
  const [notifications, setNotifications] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCancel = () => {
    setObservations("");
    setSaved(false);
  };

  const handleSaveDraft = () => {
    setSaved(true);
  };

  const handleProceed = () => {
    alert("Proceeding to Treatment Plan");
  };

  const handleViewReport = (name: string) => {
    alert(`Viewing report: ${name}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FB] text-[#1F2937]">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Go back"
            onClick={() => window.history.back()}
            className="text-gray-600 transition-colors hover:text-gray-900 focus:outline-none"
          >
            <BackIcon />
          </button>

          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            Patients
          </h1>
        </div>

        <div className="flex items-center gap-6">
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => setNotifications((prev) => !prev)}
            className="relative text-gray-500 transition-colors hover:text-gray-700 focus:outline-none"
          >
            <NotificationIcon />

            <span className="absolute right-0 top-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />

            {notifications && (
              <div className="absolute right-0 top-8 w-52 rounded-lg border border-gray-200 bg-white p-3 text-left text-sm text-gray-600 shadow-lg">
                No new notifications
              </div>
            )}
          </button>

          <div className="flex items-center gap-3">
            <span className="font-semibold text-gray-700">HMS</span>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1E3A8A] font-bold text-white shadow-sm">
              DR
            </div>
          </div>
        </div>
      </header>

      {/* Workflow Stepper */}
      <section className="relative bg-[#F8F9FB] pb-0 pt-8">
        <div className="mx-auto max-w-5xl px-6">
          <div className="relative flex items-end justify-between">
            {/* Consultation */}
            <div className="relative z-10 flex flex-1 flex-col items-center pb-6">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-400 text-white">
                <CheckIcon />
              </div>

              <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
                Consultation
              </span>

              <div className="absolute bottom-0 left-0 right-[-50%] h-1 rounded bg-white" />
            </div>

            {/* Lab Report Review */}
            <div className="relative z-10 flex flex-1 flex-col items-center pb-6">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white ring-4 ring-green-100">
                <CheckIcon />
              </div>

              <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
                Lab Report Review
              </span>

              <div className="absolute bottom-0 left-0 right-0 mx-auto h-1 w-[95%] rounded bg-green-500" />
            </div>

            {/* Diagnosis */}
            <div className="relative z-10 flex flex-1 flex-col items-center pb-6">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-400 text-white">
                <CheckIcon />
              </div>

              <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
                Diagnosis
              </span>

              <div className="absolute bottom-0 left-[-50%] right-0 h-1 rounded bg-white" />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-grow px-6 py-8">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Laboratory Investigations */}
          <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
            {/* Card Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-8 py-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Laboratory Investigations
              </h2>

              <span className="text-sm font-medium text-gray-500">
                {investigations.length} Reports Found
              </span>
            </div>

            {/* Table */}
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-white">
                    <th className="w-2/5 px-8 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                      Investigation Name
                    </th>

                    <th className="w-1/5 px-8 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                      Ordered Date
                    </th>

                    <th className="w-1/5 px-8 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                      Status
                    </th>

                    <th className="w-1/5 px-8 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white text-gray-700">
                  {investigations.map((investigation) => (
                    <tr
                      key={investigation.name}
                      className="border-b border-[#F3F4F6] transition-colors last:border-b-0 hover:bg-gray-50"
                    >
                      <td className="px-8 py-5 text-[15px] font-semibold">
                        {investigation.name}
                      </td>

                      <td className="px-8 py-5 text-gray-600">
                        {investigation.orderedDate}
                      </td>

                      <td className="px-8 py-5">
                        <span className="inline-flex items-center rounded-full bg-[#DCFCE7] px-3 py-1 text-sm font-semibold text-[#166534]">
                          {investigation.status}
                        </span>
                      </td>

                      <td className="px-8 py-5 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            handleViewReport(investigation.name)
                          }
                          className="inline-flex items-center justify-center rounded-lg bg-[#F0F5FF] px-4 py-2 text-sm font-semibold text-[#2563EB] transition-colors hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                        >
                          View Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Clinical Remarks */}
          <section className="rounded-xl border border-gray-100 bg-white p-8 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
            <h2 className="mb-6 text-2xl font-bold text-gray-900">
              Clinical Remarks
            </h2>

            <div className="space-y-3">
              <label
                htmlFor="observations"
                className="block text-[13px] font-bold uppercase tracking-widest text-[#9CA3AF]"
              >
                Observations & Notes
              </label>

              <textarea
                id="observations"
                name="observations"
                value={observations}
                onChange={(event) => setObservations(event.target.value)}
                placeholder="Enter clinical observations based on the laboratory reports..."
                rows={6}
                className="block w-full resize-y rounded-xl border-[#E5E7EB] bg-[#F8FAFC] p-4 text-[15px] text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {saved && (
              <p className="mt-3 text-sm font-medium text-green-600">
                Draft saved successfully.
              </p>
            )}
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="sticky bottom-0 z-20 border-t border-gray-200 bg-white px-6 py-6">
        <div className="mx-auto flex max-w-5xl justify-center gap-4">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-xl border border-gray-300 px-8 py-3 text-[15px] font-bold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            className="rounded-xl border border-blue-600 px-8 py-3 text-[15px] font-bold text-blue-600 transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Save as Draft
          </button>

          <button
            type="button"
            onClick={handleProceed}
            className="flex items-center gap-2 rounded-xl bg-[#2563EB] px-8 py-3 text-[15px] font-bold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Proceed to Treatment Plan
            <ArrowRightIcon />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
