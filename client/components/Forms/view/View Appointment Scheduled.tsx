import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Printer,
  Pencil,
  MoreVertical,
  Calendar,
  Clock,
  User,
  FileText,
  Phone,
  MapPin,
  ShieldCheck,
  ClipboardList,
  ArrowRight,
  Check,
  Loader2,
} from "lucide-react";
import { appointmentApi, type AppointmentRecord } from "@/api/appointment.api";

const STATUS_LABELS: Record<string, string> = {
  BOOKED: "Scheduled",
  CONFIRMED: "Conformed",
  CHECKED_IN: "Checked In",
  IN_CONSULTATION: "In Consultation",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
  RESCHEDULED: "Rescheduled",
};

function getInitials(name: string): string {
  const words = name.replace(/^Dr\.?\s*/i, "").trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

function formatPatientName(p: AppointmentRecord["patient_bio_data"]): string {
  if (!p) return "Unknown Patient";
  return [p.patient_first_name, p.patient_middle_name, p.patient_last_name]
    .filter(Boolean)
    .join(" ");
}

function formatDoctorName(e: AppointmentRecord["employees"]): string {
  if (!e) return "Unassigned";
  return `Dr. ${[e.first_name, e.middle_name, e.last_name].filter(Boolean).join(" ")}`;
}

// appointment_date/appointment_time are stored as UTC-anchored Date/Time
// values, so formatting must read UTC getters directly.
function formatAppointmentDate(date?: string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

function formatAppointmentTime(time?: string | null): string {
  if (!time) return "—";
  const t = new Date(time);
  if (isNaN(t.getTime())) return "—";
  const minutes = String(t.getUTCMinutes()).padStart(2, "0");
  const period = t.getUTCHours() >= 12 ? "PM" : "AM";
  const hours12 = t.getUTCHours() % 12 || 12;
  return `${String(hours12).padStart(2, "0")}:${minutes} ${period}`;
}

function formatCreatedAt(date?: string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

const AppointmentDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [appointment, setAppointment] = useState<AppointmentRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }
    appointmentApi
      .getOne(id)
      .then((res) => {
        setAppointment(res.data?.data ?? null);
      })
      .catch((err) => {
        console.error("[View Appointment] Error:", err);
        setAppointment(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center gap-2 bg-slate-50 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        Loading appointment...
      </main>
    );
  }

  if (!appointment) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Appointment not found.
      </main>
    );
  }

  const statusLabel = STATUS_LABELS[appointment.status ?? ""] ?? (appointment.status || "Unknown");
  const patientName = formatPatientName(appointment.patient_bio_data);
  const doctorName = formatDoctorName(appointment.employees);
  const dateLabel = formatAppointmentDate(appointment.appointment_date);
  const timeLabel = formatAppointmentTime(appointment.appointment_time);
  const branchAddress = [appointment.branch?.branch_area].filter(Boolean).join(", ");

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <header className="flex items-center justify-between pb-4">
          <div className="flex items-center gap-4">
            <button
              aria-label="Go back"
              onClick={() => navigate(-1)}
              className="rounded-full p-2 transition-colors hover:bg-slate-200"
            >
              <ArrowLeft className="h-6 w-6 text-slate-600" />
            </button>

            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Appointment Details
              </h1>

              <p className="text-sm font-medium text-slate-500">
                Ref ID: #{appointment.appointment_id} • Created {formatCreatedAt(appointment.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 shadow-sm transition-all hover:bg-white"
            >
              <Printer className="h-5 w-5" />
              Print
            </button>

            <button className="flex items-center gap-2 rounded-lg border border-blue-600 bg-white px-6 py-2 font-semibold text-blue-600 shadow-sm transition-all hover:bg-blue-50">
              <Pencil className="h-5 w-5" />
              Edit
            </button>

            <button className="p-2 text-slate-400 transition-colors hover:text-slate-600">
              <MoreVertical className="h-6 w-6" />
            </button>
          </div>
        </header>

        {/* Status Bar */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 items-center gap-6 xl:grid-cols-[1.5fr_1fr_1fr_2fr]">

            {/* Main Status */}
            <div className="flex items-center gap-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <div className="rounded-xl bg-white p-3 text-blue-600 shadow-sm">
                <Calendar className="h-8 w-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold leading-tight text-blue-900">
                  {statusLabel}
                </h3>

                <p className="mt-1 text-xs text-blue-700/80">
                  Created on {formatCreatedAt(appointment.created_at)}
                </p>
              </div>
            </div>

            {/* Date */}
            <InfoItem
              icon={<Calendar className="h-6 w-6" />}
              label="Date"
              value={dateLabel}
            />

            {/* Time */}
            <InfoItem
              icon={<Clock className="h-6 w-6" />}
              label="Time"
              value={timeLabel}
            />

            {/* Follow-up */}
            <div className="flex items-center gap-4 border-l border-slate-100 pl-6">
              <div className="rounded-full bg-emerald-50 p-2.5 text-emerald-500">
                <User className="h-6 w-6" />
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Follow-up Status
                  </p>

                  <span className="rounded bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase text-orange-600">
                    Pending
                  </span>
                </div>

                <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                  Last follow-up: 18 May 2026, 10:30 AM
                </p>

                <p className="text-xs text-slate-500">
                  By: Mary Joseph (Admin)
                </p>

                <div className="mt-1 flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    Status: Confirmed by patient
                  </p>

                  <button className="rounded border border-blue-200 px-2 py-1 text-[11px] font-bold text-blue-600 transition-colors hover:bg-blue-50">
                    Full History
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Left Column */}
          <div className="space-y-6">

            {/* Clinical Provider */}
            <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
              <SectionHeader
                icon={<FileText className="h-6 w-6 text-blue-600" />}
                title="Clinical Provider"
                link="View profile"
              />

              <div className="flex items-start gap-6 border-b border-slate-100 pb-8">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">
                  {getInitials(doctorName)}
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-xl font-bold text-slate-900">
                    {doctorName}
                  </h3>

                  <div className="inline-block rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    ID: {appointment.employee_id ?? "—"}
                  </div>

                  <p className="pt-1 font-medium text-slate-600">
                    {appointment.employees?.specialization ?? "—"}
                  </p>

                  <div className="pt-2">
                    <span className="rounded-md border border-blue-100 bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-600">
                      {appointment.department_master?.department_name ?? appointment.department ?? "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <ContactItem
                  icon={<Phone className="h-5 w-5" />}
                  text={appointment.employees?.mobile_no ?? "—"}
                />
              </div>
            </section>

            {/* Appointment Information */}
            <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
              <SectionTitle
                icon={<Calendar className="h-6 w-6 text-blue-600" />}
                title="Appointment Information"
              />

              <div className="space-y-6">
                <DetailRow
                  icon={<Calendar className="h-5 w-5" />}
                  label="Date"
                  value={dateLabel}
                />

                <DetailRow
                  icon={<Clock className="h-5 w-5" />}
                  label="Time"
                  value={timeLabel}
                />

                <DetailRow
                  icon={<MapPin className="h-5 w-5" />}
                  label="Location"
                  value={
                    <div className="text-right">
                      <p>{appointment.branch?.branch_name ?? "—"}</p>
                      {branchAddress && <p>{branchAddress}</p>}
                    </div>
                  }
                />

                <DetailRow
                  icon={<FileText className="h-5 w-5" />}
                  label="Token No."
                  value={appointment.token_number != null ? String(appointment.token_number) : "—"}
                />
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-6">

            {/* Patient Profile */}
            <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
              <SectionHeader
                icon={<User className="h-6 w-6 text-blue-600" />}
                title="Patient Profile"
                link="View Full Record"
              />

              <div className="flex items-start gap-6 border-b border-slate-100 pb-8">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">
                  {getInitials(patientName)}
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-2xl font-bold text-slate-900">
                    {patientName}
                  </h3>

                  <div className="flex items-center gap-3">
                    <div className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      ID: {appointment.patient_id}
                    </div>

                    <span className="font-medium text-slate-500">
                      {appointment.patient_bio_data?.patient_gender ?? "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-12 gap-y-4 py-6">
                <ContactItem
                  icon={<Phone className="h-5 w-5 text-emerald-500" />}
                  text={appointment.patient_bio_data?.patient_primary_mobile ?? "—"}
                />
              </div>

              {/* Insurance */}
              <div className="mt-4 flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="rounded-lg bg-blue-100 p-2.5 text-blue-600">
                  <ShieldCheck className="h-6 w-6" />
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Insurance
                  </p>

                  <p className="font-bold text-slate-800">
                    BlueCross BlueShield – Premium Care
                  </p>
                </div>
              </div>
            </section>

            {/* Visit Details */}
            <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
              <SectionTitle
                icon={<ClipboardList className="h-6 w-6 text-blue-600" />}
                title="Visit Details"
              />

              <div className="space-y-8">

                {/* Chief Complaint */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900">
                    Chief complaint reason
                  </h4>

                  <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50 p-6">
                    <p className="leading-relaxed text-slate-700">
                      {appointment.reason_for_visit || "No reason provided."}
                    </p>
                  </div>
                </div>

                {/* Questionnaire */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900">
                    Pre-visit questionnaire
                  </h4>

                  <ul className="space-y-4">
                    <ChecklistItem
                      text="Medication list updated and reviewed."
                      type="success"
                    />

                    <ChecklistItem
                      text="Recent lab results (Lipid panel) available in system."
                      type="success"
                    />

                    <ChecklistItem
                      text="Vitals taken (Pending at triage)."
                      type="pending"
                    />
                  </ul>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
};

/* =========================
   Reusable Components
========================= */

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const InfoItem: React.FC<InfoItemProps> = ({ icon, label, value }) => {
  return (
    <div className="flex items-center gap-4 border-l border-slate-100 pl-6">
      <div className="rounded-lg bg-blue-50 p-2.5 text-blue-500">
        {icon}
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <p className="text-base font-bold text-slate-800">
          {value}
        </p>
      </div>
    </div>
  );
};

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  link?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon,
  title,
  link,
}) => {
  return (
    <div className="mb-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {icon}

        <h2 className="text-xl font-bold text-slate-800">
          {title}
        </h2>
      </div>

      {link && (
        <button className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline">
          {link}
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

interface SectionTitleProps {
  icon: React.ReactNode;
  title: string;
}

const SectionTitle: React.FC<SectionTitleProps> = ({
  icon,
  title,
}) => {
  return (
    <div className="mb-8 flex items-center gap-3">
      {icon}

      <h2 className="text-xl font-bold text-slate-800">
        {title}
      </h2>
    </div>
  );
};

interface ContactItemProps {
  icon: React.ReactNode;
  text: string;
}

const ContactItem: React.FC<ContactItemProps> = ({
  icon,
  text,
}) => {
  return (
    <div className="flex items-center gap-3 text-slate-600">
      <span className="text-slate-400">
        {icon}
      </span>

      <span className="font-medium">
        {text}
      </span>
    </div>
  );
};

interface DetailRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

const DetailRow: React.FC<DetailRowProps> = ({
  icon,
  label,
  value,
}) => {
  return (
    <div className="flex items-start gap-4">
      <div className="mt-1 rounded-lg bg-blue-50 p-2 text-blue-500">
        {icon}
      </div>

      <div className="flex flex-1 items-start justify-between gap-4">
        <p className="font-medium text-slate-500">
          {label}
        </p>

        <div className="font-bold text-slate-900">
          {value}
        </div>
      </div>
    </div>
  );
};

interface ChecklistItemProps {
  text: string;
  type: "success" | "pending";
}

const ChecklistItem: React.FC<ChecklistItemProps> = ({
  text,
  type,
}) => {
  return (
    <li className="flex items-start gap-3">
      <div
        className={`mt-0.5 rounded-md p-1 text-white ${
          type === "success"
            ? "bg-emerald-500"
            : "bg-orange-500"
        }`}
      >
        {type === "success" ? (
          <Check className="h-3 w-3" strokeWidth={4} />
        ) : (
          <Clock className="h-3.5 w-3.5" />
        )}
      </div>

      <span className="font-medium text-slate-700">
        {text}
      </span>
    </li>
  );
};

export default AppointmentDetails;