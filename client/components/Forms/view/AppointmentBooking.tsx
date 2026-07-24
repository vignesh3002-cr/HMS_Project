import { FormEvent, useState } from "react";

const timeSlots = [
  "09:00 AM",
  "09:20 AM",
  "09:40 AM",
  "10:00 AM",
  "10:20 AM",
  "10:40 AM",
  "11:00 AM",
  "11:20 AM",
  "11:40 AM",
  "12:00 PM",
  "12:20 PM",
  "12:40 PM",
];

export default function CreateAppointment() {
  const [selectedSlot, setSelectedSlot] = useState("11:20 AM");
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState({
    appointmentId: "APT-2026-8842",
    patientNumber: "+91 XXXXX XXXXX",
    patientName: "James Wilson",
    patientId: "PM-0235",
    branch: "Central Hospital (Tambaram)",
    department: "Cardiology",
    doctor: "Dr. James smith (Cardiologist)",
    date: "03/25/2026",
    reason: "Consultation",
    referredBy: "",
    patientType: "General Patient",
    comment: "",
    smsConfirm: false,
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value,
    }));
  };

  const handleReset = () => {
    setFormData({
      appointmentId: "APT-2026-8842",
      patientNumber: "+91 XXXXX XXXXX",
      patientName: "James Wilson",
      patientId: "PM-0235",
      branch: "Central Hospital (Tambaram)",
      department: "Cardiology",
      doctor: "Dr. James smith (Cardiologist)",
      date: "03/25/2026",
      reason: "Consultation",
      referredBy: "",
      patientType: "General Patient",
      comment: "",
      smsConfirm: false,
    });

    setSelectedSlot("11:20 AM");
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    console.log({
      ...formData,
      selectedTime: selectedSlot,
    });

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 text-slate-800">
      {showSuccess && (
        <div className="fixed right-6 top-6 z-50 flex items-center gap-3 rounded-lg border border-green-200 bg-green-100 px-5 py-3 shadow-lg">
          <svg
            className="h-5 w-5 flex-none text-green-800"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M5 13l4 4L19 7"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>

          <span className="text-sm font-semibold text-green-800">
            Booked successfully
          </span>
        </div>
      )}

      <div className="mx-auto max-w-6xl overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        {/* Header */}
        <header className="flex items-start justify-between border-b border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label="Back"
              onClick={() => window.history.back()}
              className="rounded-full p-2 transition-colors hover:bg-gray-100"
            >
              <svg
                className="h-6 w-6 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </button>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Create New Appointment
              </h1>

              <p className="text-sm text-gray-500">
                Fill in the details to schedule a new appointment
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
            Reset
          </button>
        </header>

        {/* Main Content */}
        <main className="p-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Patient Details */}
            <section className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Appointment ID */}
                <div className="w-full">
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Appointment ID
                  </label>

                  <input
                    value={formData.appointmentId}
                    readOnly
                    className="w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-500 outline-none"
                  />
                </div>

                <div />

                {/* Left Column */}
                <div className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Patient Number <span className="text-red-500">*</span>
                    </label>

                    <input
                      name="patientNumber"
                      value={formData.patientNumber}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none transition focus:border-blue-900 focus:ring-1 focus:ring-blue-900"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Patient Name <span className="text-red-500">*</span>
                    </label>

                    <input
                      name="patientName"
                      value={formData.patientName}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none transition focus:border-blue-900 focus:ring-1 focus:ring-blue-900"
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="block text-sm font-semibold text-gray-700">
                        Patient_ID{" "}
                        <span className="text-red-500">*</span>
                      </label>

                      <button
                        type="button"
                        className="text-sm font-bold text-blue-800 hover:underline"
                      >
                        + Add New
                      </button>
                    </div>

                    <input
                      name="patientId"
                      value={formData.patientId}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none transition focus:border-blue-900 focus:ring-1 focus:ring-blue-900"
                    />
                  </div>
                </div>
              </div>
            </section>

            <hr className="border-gray-200" />

            {/* Clinic Details */}
            <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Branch <span className="text-red-500">*</span>
                </label>

                <select
                  name="branch"
                  value={formData.branch}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900"
                >
                  <option>Central Hospital (Tambaram)</option>
                  <option>City Hospital (Chennai)</option>
                  <option>North Branch Hospital</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Department <span className="text-red-500">*</span>
                </label>

                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900"
                >
                  <option>Cardiology</option>
                  <option>Neurology</option>
                  <option>Orthopedics</option>
                  <option>General Medicine</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Doctor Name <span className="text-red-500">*</span>
                </label>

                <select
                  name="doctor"
                  value={formData.doctor}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900"
                >
                  <option>Dr. James smith (Cardiologist)</option>
                  <option>Dr. Sarah Wilson (Neurologist)</option>
                  <option>Dr. Robert Brown (Orthopedic)</option>
                </select>
              </div>
            </section>

            {/* Date and Time */}
            <section className="space-y-6">
              <div className="w-full md:w-1/3">
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Select Date <span className="text-red-500">*</span>
                </label>

                <div className="relative">
                  <input
                    type="date"
                    name="date"
                    value="2026-03-25"
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900"
                  />

                  <svg
                    className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-800"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
            
                  </svg>
                </div>
              </div>

              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-700">
                    Available Time Slots
                  </h3>

                  <div className="flex items-center text-xs text-gray-500">
                    <svg
                      className="mr-1 h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                    Showing available slots
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
                  {timeSlots.map((slot) => {
                    const isSelected = selectedSlot === slot;

                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`rounded-lg border px-4 py-3 text-sm font-bold transition-all ${
                          isSelected
                            ? "border-emerald-800 bg-emerald-800 text-white"
                            : "border-emerald-600 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <hr className="border-gray-200" />

            {/* Additional Information */}
            <section className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Reason for visit{" "}
                    <span className="text-red-500">*</span>
                  </label>

                  <select
                    name="reason"
                    value={formData.reason}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900"
                  >
                    <option>Consultation</option>
                    <option>Follow-up</option>
                    <option>Emergency</option>
                    <option>Routine Checkup</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Referred by
                  </label>

                  <input
                    name="referredBy"
                    value={formData.referredBy}
                    onChange={handleChange}
                    placeholder="Select Referrer (Optional)"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Patient type
                  </label>

                  <input
                    name="patientType"
                    value={formData.patientType}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Patient Comment/Reason
                </label>

                <textarea
                  name="comment"
                  value={formData.comment}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Add any additional comments (optional)"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900"
                />
              </div>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="smsConfirm"
                  checked={formData.smsConfirm}
                  onChange={handleChange}
                  className="h-5 w-5 rounded border-gray-300 text-blue-900 focus:ring-blue-900"
                />

                <span className="text-sm font-medium text-gray-700">
                  Send appointment confirmation via SMS
                </span>
              </label>
            </section>

            <hr className="border-gray-200" />

            {/* Actions */}
            <footer className="flex justify-end gap-4 pt-4">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="rounded-lg border border-gray-300 px-10 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="rounded-lg bg-blue-900 px-10 py-2.5 font-semibold text-white transition-colors hover:bg-blue-950"
              >
                Conform Appointment
              </button>
            </footer>
          </form>
        </main>
      </div>
    </div>
  );
}