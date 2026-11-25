import React, { useEffect, useState, useCallback } from "react";
import {
  patientPortalApi,
  PatientAppointmentsData,
  PatientAppointment,
} from "@/api/patientPortal.api";
import { PatientAppointmentCard } from "@/components/patient-portal/PatientAppointmentCard";
import { BookAppointmentModal } from "@/components/patient-portal/BookAppointmentModal";
import { CancelAppointmentModal } from "@/components/patient-portal/CancelAppointmentModal";
import { RescheduleAppointmentModal } from "@/components/patient-portal/RescheduleAppointmentModal";
import {
  CalendarCheck,
  History,
  Clock,
  Loader2,
  AlertCircle,
  PhoneCall,
  Plus,
} from "lucide-react";

export default function PatientAppointments() {
  const [data, setData] = useState<PatientAppointmentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  // Modals state
  const [showBookModal, setShowBookModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<PatientAppointment | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<PatientAppointment | null>(null);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const result = await patientPortalApi.getAppointments();
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || "Failed to load appointments"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#00488D]" />
        <p className="text-xs font-semibold text-slate-500">Loading your appointments...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">Unable to load appointments</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 rounded-lg bg-[#00488D] text-white text-xs font-semibold hover:bg-blue-800 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const upcoming = data.upcoming || [];
  const past = data.past || [];
  const currentList = tab === "upcoming" ? upcoming : past;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-[#00488D]" />
            <span>My Consultations & Appointments</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View upcoming doctor bookings, scheduled time slots, and your complete past consultation history.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Primary Action Button */}
          <button
            type="button"
            onClick={() => setShowBookModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#00488D] text-white rounded-xl text-xs font-bold hover:bg-blue-800 shadow-xs transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Book New Appointment</span>
          </button>

          {/* Support callout */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-100 text-xs text-[#00488D] font-medium">
            <PhoneCall className="h-3.5 w-3.5" />
            <span>044-2456-7890</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab("upcoming")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            tab === "upcoming"
              ? "border-[#00488D] text-[#00488D]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <CalendarCheck className="h-4 w-4" />
          <span>Upcoming Appointments</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              tab === "upcoming" ? "bg-blue-100 text-[#00488D]" : "bg-slate-100 text-slate-600"
            }`}
          >
            {upcoming.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTab("past")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            tab === "past"
              ? "border-[#00488D] text-[#00488D]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <History className="h-4 w-4" />
          <span>Past Visits</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              tab === "past" ? "bg-blue-100 text-[#00488D]" : "bg-slate-100 text-slate-600"
            }`}
          >
            {past.length}
          </span>
        </button>
      </div>

      {/* Appointments List */}
      {currentList.length > 0 ? (
        <div className="space-y-4">
          {currentList.map((appointment) => (
            <PatientAppointmentCard
              key={appointment.appointment_id}
              appointment={appointment}
              compact={false}
              onCancel={(apt) => setCancelTarget(apt)}
              onReschedule={(apt) => setRescheduleTarget(apt)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl p-12 border border-slate-200 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            <CalendarCheck className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            {tab === "upcoming" ? "No Upcoming Appointments" : "No Past Visit Records"}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            {tab === "upcoming"
              ? "You do not have any upcoming doctor appointments scheduled. You can book an Outpatient (OPD) slot online instantly."
              : "No completed or historical appointment records were found for your account."}
          </p>
          {tab === "upcoming" && (
            <button
              type="button"
              onClick={() => setShowBookModal(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-[#00488D] text-white rounded-xl text-xs font-bold hover:bg-blue-800 shadow-xs transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Book Consultation Now</span>
            </button>
          )}
        </div>
      )}

      {/* Book Appointment Modal */}
      <BookAppointmentModal
        isOpen={showBookModal}
        onClose={() => setShowBookModal(false)}
        onSuccess={() => {
          fetchAppointments();
        }}
      />

      {/* Cancel Appointment Modal */}
      <CancelAppointmentModal
        isOpen={Boolean(cancelTarget)}
        appointment={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onSuccess={() => {
          fetchAppointments();
        }}
      />

      {/* Reschedule Appointment Modal */}
      <RescheduleAppointmentModal
        isOpen={Boolean(rescheduleTarget)}
        appointment={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onSuccess={() => {
          fetchAppointments();
        }}
      />
    </div>
  );
}
