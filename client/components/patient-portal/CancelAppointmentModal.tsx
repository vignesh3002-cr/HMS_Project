import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import {
  X,
  AlertTriangle,
  Loader2,
  Calendar,
  Clock,
  User,
  Stethoscope,
} from "lucide-react";
import {
  patientPortalApi,
  PatientAppointment,
} from "@/api/patientPortal.api";
import {
  formatTimeSlot,
  formatAppointmentDisplayDate,
} from "@/utils/formatters";
import { useToast } from "@/hooks/use-toast";

interface CancelAppointmentModalProps {
  isOpen: boolean;
  appointment: PatientAppointment | null;
  onClose: () => void;
  onSuccess: () => void;
}

const COMMON_REASONS = [
  "Schedule conflict",
  "Feeling better / symptoms resolved",
  "Need to reschedule for another date",
  "Personal / family emergency",
  "Booked by mistake",
  "Other reason",
];

export const CancelAppointmentModal: React.FC<CancelAppointmentModalProps> = ({
  isOpen,
  appointment,
  onClose,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [selectedReason, setSelectedReason] = useState<string>(COMMON_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>("");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !appointment) return null;

  const formatDate = (dateStr: string) =>
    formatAppointmentDisplayDate(dateStr, false);

  const formatTime = (timeStr: string) => formatTimeSlot(timeStr);

  const handleCancel = async () => {
    const finalReason =
      selectedReason === "Other reason" && customReason.trim()
        ? customReason.trim()
        : selectedReason;

    setLoading(true);
    try {
      await patientPortalApi.cancelAppointment(
        appointment.appointment_id,
        finalReason
      );

      toast({
        title: "Appointment Cancelled",
        description: `Your consultation with ${
          appointment.doctor_name || "doctor"
        } has been cancelled.`,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      toast({
        title: "Cancellation Failed",
        description:
          err?.response?.data?.message ||
          err?.message ||
          "Could not cancel the appointment. Please contact hospital reception.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Cancel Consultation
              </h3>
              <p className="text-[11px] text-slate-500">
                Release your booked time slot and queue token
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Appointment Preview */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-[#00488D]" />
                <span className="font-bold text-slate-800">
                  {appointment.doctor_name}
                </span>
              </div>
              {appointment.token_number && (
                <span className="font-bold text-[#00488D] bg-blue-100/70 px-2 py-0.5 rounded text-[11px]">
                  Token #{appointment.token_number}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>{formatDate(appointment.appointment_date)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>{formatTime(appointment.appointment_time)}</span>
              </div>
            </div>
          </div>

          {/* Reason Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Reason for Cancellation
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {COMMON_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {selectedReason === "Other reason" && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Please specify:
              </label>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={2}
                placeholder="Brief reason for cancellation..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
            </div>
          )}

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Note: Once cancelled, this slot will become available for other patients.
            You can book a new appointment at any time.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Keep Appointment
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleCancel}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors shadow-xs"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Cancelling...</span>
              </>
            ) : (
              <span>Confirm Cancellation</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
