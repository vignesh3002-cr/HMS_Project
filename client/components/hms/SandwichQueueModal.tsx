import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { ArrowDownUp, Clock, User, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { appointmentApi } from "@/api/appointment.api";
import { useToast } from "@/hooks/use-toast";

export interface QueuePatientItem {
  id: string;
  patientName: string;
  tokenNumber?: number | string | null;
  startTime?: string | null;
  endTime?: string | null;
  durationMinutes?: number | null;
  status: string;
}

export interface SandwichQueueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetAppointment: {
    id: string;
    patientName: string;
    patientId?: string;
    tokenNumber?: number | string | null;
    durationMinutes?: number | null;
    status: string;
    employeeId?: string | null;
    doctorName?: string | null;
  } | null;
  activeAppointments?: QueuePatientItem[];
  onSuccess: () => void;
}

export function SandwichQueueModal({
  open,
  onOpenChange,
  targetAppointment,
  activeAppointments = [],
  onSuccess
}: SandwichQueueModalProps) {
  const { toast } = useToast();
  const [placementMode, setPlacementMode] = useState<"NEXT_IN_LINE" | "SPECIFIC">("NEXT_IN_LINE");
  const [insertAfterId, setInsertAfterId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Eligible active appointments in queue to sandwich after
  const eligibleQueue = useMemo(() => {
    return activeAppointments.filter((a) => {
      if (a.id === targetAppointment?.id) return false;
      const norm = (a.status || "").toUpperCase().replace(/\s+/g, "_");
      return norm !== "CANCELLED" && norm !== "NO_SHOW";
    });
  }, [activeAppointments, targetAppointment]);

  // Set default insertAfterId when switching to SPECIFIC
  React.useEffect(() => {
    if (placementMode === "SPECIFIC" && eligibleQueue.length > 0 && !insertAfterId) {
      setInsertAfterId(eligibleQueue[0].id);
    }
  }, [placementMode, eligibleQueue, insertAfterId]);

  const targetDuration = targetAppointment?.durationMinutes || 10;

  const handleSubmit = async () => {
    if (!targetAppointment) return;

    setIsSubmitting(true);
    try {
      const chosenAfter = placementMode === "SPECIFIC" ? insertAfterId : null;
      await appointmentApi.sandwich(targetAppointment.id, chosenAfter);

      toast({
        title: "Patient Sandwiched Successfully",
        description: `Token #${targetAppointment.tokenNumber ?? "?"} (${targetAppointment.patientName}) has been inserted into the queue.`
      });

      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      console.error("[SandwichQueueModal] Error:", err);
      toast({
        title: "Failed to sandwich patient",
        description: err.response?.data?.message || err.message || "An error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!targetAppointment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl bg-white border border-[#E5E7EB] shadow-xl">
        <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-r from-blue-50/80 via-white to-white border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00488D]/10 text-[#00488D] flex items-center justify-center">
              <ArrowDownUp className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-[#191C1E]">
                Sandwich Patient into Queue
              </DialogTitle>
              <DialogDescription className="text-xs text-[#6B7280]">
                Insert late-arriving patient flexibly between active queue patients.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Patient Card */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#191C1E]">
                  {targetAppointment.patientName}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#00488D] text-white">
                  Token #{targetAppointment.tokenNumber ?? "N/A"}
                </span>
              </div>
              <p className="text-xs text-[#6B7280]">
                ID: {targetAppointment.patientId || targetAppointment.id}
                {targetAppointment.doctorName ? ` • Doctor: ${targetAppointment.doctorName}` : ""}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-amber-300 text-amber-800 text-xs font-semibold shadow-sm">
                <Clock className="w-3.5 h-3.5" />
                {targetDuration} mins
              </span>
              <p className="text-[10px] text-amber-700 mt-1 font-medium">Late Arrival</p>
            </div>
          </div>

          {/* Placement Options */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-[#374151] uppercase tracking-wider">
              Where should this patient be placed?
            </label>

            <div className="space-y-2.5">
              {/* Option 1: Next In Line */}
              <label
                onClick={() => setPlacementMode("NEXT_IN_LINE")}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  placementMode === "NEXT_IN_LINE"
                    ? "border-[#00488D] bg-blue-50/40 ring-1 ring-[#00488D]"
                    : "border-[#E5E7EB] hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="placementMode"
                  checked={placementMode === "NEXT_IN_LINE"}
                  onChange={() => setPlacementMode("NEXT_IN_LINE")}
                  className="mt-0.5 text-[#00488D] focus:ring-[#00488D]"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#191C1E]">
                      Next in Line
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-[#6B7280]">
                    Places right after the current consultation or last completed patient. Downstream patients shift forward by {targetDuration} mins.
                  </p>
                </div>
              </label>

              {/* Option 2: Specific Token */}
              <label
                onClick={() => setPlacementMode("SPECIFIC")}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  placementMode === "SPECIFIC"
                    ? "border-[#00488D] bg-blue-50/40 ring-1 ring-[#00488D]"
                    : "border-[#E5E7EB] hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="placementMode"
                  checked={placementMode === "SPECIFIC"}
                  onChange={() => setPlacementMode("SPECIFIC")}
                  className="mt-0.5 text-[#00488D] focus:ring-[#00488D]"
                />
                <div className="space-y-2 flex-1">
                  <div>
                    <span className="text-xs font-bold text-[#191C1E]">
                      Sandwich After Specific Patient
                    </span>
                    <p className="text-xs text-[#6B7280]">
                      Choose an exact patient in queue to place Token #{targetAppointment.tokenNumber ?? "?"} immediately after.
                    </p>
                  </div>

                  {placementMode === "SPECIFIC" && (
                    <div className="pt-2">
                      <select
                        value={insertAfterId}
                        onChange={(e) => setInsertAfterId(e.target.value)}
                        className="w-full text-xs font-medium rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-[#191C1E] focus:outline-none focus:ring-2 focus:ring-[#00488D]"
                      >
                        {eligibleQueue.map((appt) => (
                          <option key={appt.id} value={appt.id}>
                            After Token #{appt.tokenNumber ?? "?"} — {appt.patientName} {appt.startTime ? `(${appt.startTime})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Queue Impact Notice */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 flex items-start gap-2.5 text-xs text-[#1E40AF]">
            <CheckCircle2 className="w-4 h-4 text-[#00488D] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Elastic Queue Recalculation</p>
              <p className="text-[11px] text-[#3B82F6] mt-0.5">
                Token #{targetAppointment.tokenNumber ?? "?"} keeps their static token ID. Subsequent appointments shift by +{targetDuration} minutes automatically.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 bg-gray-50/70 border-t border-[#E5E7EB] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-[#D1D5DB] rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#00488D] rounded-lg hover:bg-[#003870] transition-colors shadow-sm disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Sandwiching...
              </>
            ) : (
              <>
                <ArrowDownUp className="w-3.5 h-3.5" />
                Confirm & Insert into Queue
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

