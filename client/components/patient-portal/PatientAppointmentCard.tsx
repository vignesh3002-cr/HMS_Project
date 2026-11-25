import React from "react";
import { PatientAppointment } from "@/api/patientPortal.api";
import {
  formatTimeSlot,
  formatAppointmentDisplayDate,
} from "@/utils/formatters";
import {
  Calendar,
  Clock,
  User,
  MapPin,
  Tag,
  CheckCircle2,
  AlertCircle,
  Clock4,
  Stethoscope,
  CalendarClock,
} from "lucide-react";

interface PatientAppointmentCardProps {
  appointment: PatientAppointment;
  compact?: boolean;
  onCancel?: (appointment: PatientAppointment) => void;
  onReschedule?: (appointment: PatientAppointment) => void;
}

export const PatientAppointmentCard: React.FC<PatientAppointmentCardProps> = ({
  appointment,
  compact = false,
  onCancel,
  onReschedule,
}) => {
  const formatDate = (dateStr: string) =>
    formatAppointmentDisplayDate(dateStr, compact);

  const formatTime = (timeStr: string) => formatTimeSlot(timeStr);

  const getStatusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s === "CONFIRMED" || s === "SCHEDULED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-3 w-3" />
          {s}
        </span>
      );
    }
    if (s === "COMPLETED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </span>
      );
    }
    if (s === "CANCELLED" || s === "NO_SHOW") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
          <AlertCircle className="h-3 w-3" />
          {s}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock4 className="h-3 w-3" />
        {status || "Pending"}
      </span>
    );
  };

  if (compact) {
    return (
      <div className="bg-white rounded-xl p-4 border border-slate-200/90 hover:border-blue-300 transition-all shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-50 text-[#00488D] flex items-center justify-center font-bold text-xs">
                <Stethoscope className="h-4 w-4" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-800 line-clamp-1">
                  {appointment.doctor_name || "Assigned Physician"}
                </h4>
                <p className="text-[11px] text-slate-500 line-clamp-1">
                  {appointment.department || "General OPD"}
                </p>
              </div>
            </div>
            {getStatusBadge(appointment.status)}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{formatDate(appointment.appointment_date)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{formatTime(appointment.appointment_time)}</span>
            </div>
          </div>
        </div>

        {appointment.token_number && (
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100/60">
            <span className="text-slate-500 text-[11px]">Token No:</span>
            <span className="font-bold text-[#00488D] bg-blue-50 px-2 py-0.5 rounded">
              #{appointment.token_number}
            </span>
          </div>
        )}

        {(onReschedule || onCancel) &&
          ["SCHEDULED", "CONFIRMED", "PENDING", "RESCHEDULED", "RESCHEDULE_REQUIRED"].includes(
            (appointment.status || "").toUpperCase()
          ) && (
            <div className="mt-2.5 pt-2 border-t border-slate-100/60 flex items-center justify-end gap-3">
              {onReschedule && (
                <button
                  type="button"
                  onClick={() => onReschedule(appointment)}
                  className="text-[11px] font-semibold text-[#00488D] hover:underline flex items-center gap-1"
                >
                  <CalendarClock className="h-3 w-3" />
                  <span>Reschedule</span>
                </button>
              )}
              {onCancel && (
                <button
                  type="button"
                  onClick={() => onCancel(appointment)}
                  className="text-[11px] font-semibold text-red-600 hover:underline"
                >
                  Cancel
                </button>
              )}
            </div>
          )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 hover:border-blue-300/80 transition-all shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#00488D] flex items-center justify-center shrink-0">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800">
                {appointment.doctor_name || "Consulting Doctor"}
              </h3>
              {appointment.token_number && (
                <span className="text-xs font-bold text-[#00488D] bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                  Token #{appointment.token_number}
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              {appointment.department || "Clinical OPD"} • Appointment ID:{" "}
              <span className="font-mono text-slate-600">{appointment.appointment_id}</span>
            </p>
          </div>
        </div>
        <div>{getStatusBadge(appointment.status)}</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4 text-xs">
        <div className="flex items-center gap-2 text-slate-600 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
          <Calendar className="h-4 w-4 text-[#00488D]" />
          <div>
            <div className="text-[10px] text-slate-400 font-medium">DATE</div>
            <div className="font-semibold text-slate-700">
              {formatDate(appointment.appointment_date)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-600 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
          <Clock className="h-4 w-4 text-[#00488D]" />
          <div>
            <div className="text-[10px] text-slate-400 font-medium">TIME SLOT</div>
            <div className="font-semibold text-slate-700">
              {formatTime(appointment.appointment_time)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-600 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
          <MapPin className="h-4 w-4 text-[#00488D]" />
          <div>
            <div className="text-[10px] text-slate-400 font-medium">LOCATION / CLINIC</div>
            <div className="font-semibold text-slate-700 truncate">
              {appointment.branch?.branch_name || "Main Hospital OPD"}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3">
        <div className="space-y-1">
          {appointment.reason_for_visit && (
            <div className="text-slate-600">
              <span className="font-semibold text-slate-500">Reason: </span>
              {appointment.reason_for_visit}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {onReschedule &&
            ["SCHEDULED", "CONFIRMED", "PENDING", "RESCHEDULED", "RESCHEDULE_REQUIRED"].includes(
              (appointment.status || "").toUpperCase()
            ) && (
              <button
                type="button"
                onClick={() => onReschedule(appointment)}
                className="px-3 py-1.5 rounded-lg border border-blue-200 text-[#00488D] bg-blue-50/60 hover:bg-blue-100/80 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <CalendarClock className="h-3.5 w-3.5" />
                <span>Reschedule</span>
              </button>
            )}

          {onCancel &&
            ["SCHEDULED", "CONFIRMED", "PENDING", "RESCHEDULED", "RESCHEDULE_REQUIRED"].includes(
              (appointment.status || "").toUpperCase()
            ) && (
              <button
                type="button"
                onClick={() => onCancel(appointment)}
                className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <span>Cancel Booking</span>
              </button>
            )}
        </div>
      </div>
    </div>
  );
};
