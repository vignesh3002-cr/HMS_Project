import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  patientPortalApi,
  PatientDashboardData,
  PatientAppointment,
} from "@/api/patientPortal.api";
import { PatientAppointmentCard } from "@/components/patient-portal/PatientAppointmentCard";
import { PatientLabReportCard } from "@/components/patient-portal/PatientLabReportCard";
import { PatientPrescriptionCard } from "@/components/patient-portal/PatientPrescriptionCard";
import { PatientVitalsCard } from "@/components/patient-portal/PatientVitalsCard";
import { BookAppointmentModal } from "@/components/patient-portal/BookAppointmentModal";
import { CancelAppointmentModal } from "@/components/patient-portal/CancelAppointmentModal";
import { RescheduleAppointmentModal } from "@/components/patient-portal/RescheduleAppointmentModal";
import { formatChemoDate } from "./PatientChemotherapy";
import {
  CalendarCheck,
  FileText,
  Pill,
  HeartPulse,
  PhoneCall,
  Loader2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Plus,
  Activity,
  Calendar,
} from "lucide-react";

export default function PatientDashboard() {
  const [data, setData] = useState<PatientDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBookModal, setShowBookModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<PatientAppointment | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<PatientAppointment | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const result = await patientPortalApi.getDashboard();
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || "Failed to load dashboard data"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#00488D]" />
        <p className="text-xs font-semibold text-slate-500">Loading your health dashboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">Unable to load dashboard</h3>
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

  const {
    patient,
    nextAppointment,
    recentOrders,
    activePrescription,
    latestVitals,
    activeChemoPlan,
  } = data;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#00488D] to-[#0066CC] rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-xs">
              Verified Patient
            </span>
            <span className="text-xs text-blue-100">
              UHID: <strong className="text-white font-mono">{patient.patient_id}</strong>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Welcome back, {patient.full_name || "Patient"}
          </h1>
          <p className="text-xs text-blue-100/90 mt-1 max-w-xl">
            View your upcoming consultations, verified diagnostic test reports, active prescriptions,
            and complete clinical health history in one secure portal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowBookModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#00488D] text-xs font-bold hover:bg-blue-50 transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Book Appointment</span>
          </button>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div className="text-xs">
              <div className="font-bold text-white">Records Protected</div>
              <div className="text-[11px] text-blue-100">Directly synchronized with Hospital EHR</div>
            </div>
          </div>
        </div>
      </div>

      {/* Active / Planned Chemotherapy Care Pathway Spotlight */}
      {activeChemoPlan && (
        <div className="bg-gradient-to-br from-indigo-900 via-[#003875] to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-sm relative overflow-hidden border border-indigo-400/30">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-44 h-44 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2.5 max-w-xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/25 text-indigo-200 border border-indigo-400/30">
                  <Activity className="h-3.5 w-3.5 text-indigo-300" />
                  Chemotherapy Care Pathway
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                    activeChemoPlan.treatment_status === "ACTIVE"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                      : "bg-blue-500/20 text-blue-200 border border-blue-400/30"
                  }`}
                >
                  {activeChemoPlan.treatment_status || "Planned"}
                </span>
                {activeChemoPlan.treatment_intent && (
                  <span className="text-[11px] text-slate-300">
                    • Intent: <strong className="text-white capitalize">{activeChemoPlan.treatment_intent.toLowerCase()}</strong>
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {activeChemoPlan.regimen_name}
                </h3>
                <p className="text-xs text-indigo-100/80 mt-0.5">
                  {activeChemoPlan.cancer_type && `${activeChemoPlan.cancer_type} • `}
                  {activeChemoPlan.cancer_stage && `Stage: ${activeChemoPlan.cancer_stage} • `}
                  {activeChemoPlan.doctor_name && `Medical Oncologist: ${activeChemoPlan.doctor_name}`}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="pt-0.5 max-w-md">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-indigo-200 font-semibold">
                    Cycle Progress: {activeChemoPlan.completed_cycles} of {activeChemoPlan.planned_cycles} Completed
                  </span>
                  <span className="font-bold text-white">{activeChemoPlan.progress_percentage}%</span>
                </div>
                <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-teal-400 to-indigo-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, activeChemoPlan.progress_percentage))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Upcoming Cycle Spotlight & Action Button */}
            <div className="w-full lg:w-auto flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between gap-3">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15 min-w-[220px]">
                <div className="text-[11px] font-semibold text-indigo-200 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-indigo-300" />
                  <span>Next Scheduled Cycle</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="text-sm font-bold text-white">
                    {activeChemoPlan.next_cycle?.cycle_number ? `Cycle #${activeChemoPlan.next_cycle.cycle_number}` : "All Planned Complete"}
                  </span>
                  {activeChemoPlan.next_cycle?.cycle_status && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/20 text-indigo-100">
                      {activeChemoPlan.next_cycle.cycle_status}
                    </span>
                  )}
                </div>
                <div className="text-xs text-indigo-100 font-medium mt-0.5">
                  {activeChemoPlan.next_cycle?.planned_date
                    ? formatChemoDate(activeChemoPlan.next_cycle.planned_date, { includeWeekday: true })
                    : "Date pending oncologist scheduling"}
                </div>
              </div>

              <Link
                to="/patient/chemotherapy"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#00488D] text-xs font-bold hover:bg-indigo-50 transition-all shadow-sm"
              >
                <span>View Chemo Care Plan</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Quick Access Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/patient/appointments"
          className="bg-white p-4 rounded-xl border border-slate-200/90 hover:border-blue-400 hover:shadow-xs transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Next Consultation</span>
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-[#00488D] flex items-center justify-center group-hover:scale-105 transition-transform">
              <CalendarCheck className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-sm font-bold text-slate-800 truncate">
            {nextAppointment ? nextAppointment.doctor_name : "None Scheduled"}
          </div>
          <div className="mt-1 text-[11px] text-[#00488D] font-semibold flex items-center gap-1">
            <span>View appointments</span>
            <ArrowRight className="h-3 w-3" />
          </div>
        </Link>

        <Link
          to="/patient/reports"
          className="bg-white p-4 rounded-xl border border-slate-200/90 hover:border-teal-400 hover:shadow-xs transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Lab Reports</span>
            <span className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileText className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-sm font-bold text-slate-800">
            {recentOrders.length} Recent Order(s)
          </div>
          <div className="mt-1 text-[11px] text-teal-700 font-semibold flex items-center gap-1">
            <span>Download reports</span>
            <ArrowRight className="h-3 w-3" />
          </div>
        </Link>

        <Link
          to="/patient/prescriptions"
          className="bg-white p-4 rounded-xl border border-slate-200/90 hover:border-indigo-400 hover:shadow-xs transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Medications</span>
            <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Pill className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-sm font-bold text-slate-800">
            {activePrescription?.prescription_items?.length || 0} Prescribed Meds
          </div>
          <div className="mt-1 text-[11px] text-indigo-700 font-semibold flex items-center gap-1">
            <span>View prescription</span>
            <ArrowRight className="h-3 w-3" />
          </div>
        </Link>

        <Link
          to="/patient/history"
          className="bg-white p-4 rounded-xl border border-slate-200/90 hover:border-rose-400 hover:shadow-xs transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Latest Vitals</span>
            <span className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <HeartPulse className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-sm font-bold text-slate-800">
            {latestVitals?.systolic_bp && latestVitals?.diastolic_bp
              ? `BP: ${latestVitals.systolic_bp}/${latestVitals.diastolic_bp}`
              : latestVitals?.pulse
              ? `Pulse: ${latestVitals.pulse} bpm`
              : "Recorded in OPD"}
          </div>
          <div className="mt-1 text-[11px] text-rose-600 font-semibold flex items-center gap-1">
            <span>Health records</span>
            <ArrowRight className="h-3 w-3" />
          </div>
        </Link>
      </div>

      {/* Main Grid: Next Appointment + Recent Lab Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next Appointment */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-[#00488D]" />
              <span>Upcoming Appointment</span>
            </h2>
            <Link
              to="/patient/appointments"
              className="text-xs font-semibold text-[#00488D] hover:underline"
            >
              All visits
            </Link>
          </div>

          {nextAppointment ? (
            <PatientAppointmentCard
              appointment={nextAppointment}
              compact={false}
              onCancel={(apt) => setCancelTarget(apt)}
              onReschedule={(apt) => setRescheduleTarget(apt)}
            />
          ) : (
            <div className="bg-white rounded-xl p-8 border border-slate-200 text-center flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-700">No Upcoming Appointments</h4>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                You have no scheduled consultations at this time. Pick a specialist and book your OPD consultation online.
              </p>
              <button
                type="button"
                onClick={() => setShowBookModal(true)}
                className="mt-3.5 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00488D] text-white text-xs font-bold hover:bg-blue-800 transition-all shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Book Consultation</span>
              </button>
            </div>
          )}
        </div>

        {/* Recent Lab Test Reports */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FileText className="h-4 w-4 text-teal-700" />
              <span>Diagnostic Reports</span>
            </h2>
            <Link
              to="/patient/reports"
              className="text-xs font-semibold text-[#00488D] hover:underline"
            >
              All reports
            </Link>
          </div>

          {recentOrders.length > 0 ? (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <PatientLabReportCard key={order.order_id} order={order} compact={true} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-8 border border-slate-200 text-center flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
                <FileText className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-700">No Recent Lab Orders</h4>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                Your lab investigations and pathology reports will appear here once requested by your doctor.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Secondary Grid: Active Medications + Latest Vitals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Medications */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Pill className="h-4 w-4 text-indigo-700" />
              <span>Current Prescriptions</span>
            </h2>
            <Link
              to="/patient/prescriptions"
              className="text-xs font-semibold text-[#00488D] hover:underline"
            >
              All prescriptions
            </Link>
          </div>

          {activePrescription ? (
            <PatientPrescriptionCard prescription={activePrescription} compact={false} />
          ) : (
            <div className="bg-white rounded-xl p-8 border border-slate-200 text-center flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
                <Pill className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-700">No Active Prescriptions</h4>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                No active medicines currently prescribed. Previous prescriptions can be viewed in your records.
              </p>
            </div>
          )}
        </div>

        {/* Latest Vitals Snapshot */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-rose-600" />
              <span>Vitals & Examination</span>
            </h2>
            <Link
              to="/patient/history"
              className="text-xs font-semibold text-[#00488D] hover:underline"
            >
              Vitals history
            </Link>
          </div>

          {latestVitals &&
          (latestVitals.systolic_bp != null ||
            latestVitals.pulse != null ||
            latestVitals.temperature != null ||
            latestVitals.oxygen_saturation != null ||
            latestVitals.weight != null) ? (
            <PatientVitalsCard vitals={latestVitals} compact={true} />
          ) : (
            <div className="bg-white rounded-xl p-8 border border-slate-200 text-center flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
                <HeartPulse className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-700">No Vitals Recorded</h4>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                Vitals recorded during your consultations will be displayed here.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Book Appointment Modal */}
      <BookAppointmentModal
        isOpen={showBookModal}
        onClose={() => setShowBookModal(false)}
        onSuccess={() => {
          fetchDashboard();
        }}
      />

      {/* Cancel Appointment Modal */}
      <CancelAppointmentModal
        isOpen={Boolean(cancelTarget)}
        appointment={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onSuccess={() => {
          fetchDashboard();
        }}
      />

      {/* Reschedule Appointment Modal */}
      <RescheduleAppointmentModal
        isOpen={Boolean(rescheduleTarget)}
        appointment={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onSuccess={() => {
          fetchDashboard();
        }}
      />
    </div>
  );
}
