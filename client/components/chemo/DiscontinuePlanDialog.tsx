import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { chemotherapyApi } from "@/api/chemotherapy.api";

interface DiscontinuePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string | null;
  patientName?: string;
  protocolName?: string;
  onDiscontinued?: () => void;
}

/*
 * Discontinues an ACTIVE plan through the existing
 * PATCH /chemotherapy/plans/:planId/status. PLANNED plans can only be
 * CANCELLED, so this action is only offered for ACTIVE ones; a reason is
 * required because the backend audits it.
 */
export function DiscontinuePlanDialog({
  open,
  onOpenChange,
  planId,
  patientName,
  protocolName,
  onDiscontinued,
}: DiscontinuePlanDialogProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReason("");
    setSaving(false);
  }, [open, planId]);

  const handleConfirm = async () => {
    if (!planId) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      toast({ title: "A reason is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      await chemotherapyApi.changePlanStatus(planId, {
        status: "DISCONTINUED",
        reason: trimmed,
      });
      toast({ title: "Plan discontinued", description: `${patientName ?? "Patient"} is no longer on this course.` });
      onOpenChange(false);
      onDiscontinued?.();
    } catch (error: any) {
      toast({
        title: "Could not discontinue the plan",
        description:
          error?.response?.data?.message ?? error?.message ?? "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-[#0F172A]">
            Discontinue Plan
          </DialogTitle>
          <DialogDescription className="text-xs text-[#6B7280]">
            {patientName ?? "Patient"}
            {protocolName ? ` · ${protocolName}` : ""} — the course stops and the plan moves
            to the Cancelled tab as Discontinued.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1">
          <label
            className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6B7280]"
            htmlFor="discontinue-reason"
          >
            Reason
          </label>
          <textarea
            id="discontinue-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Disease progression, patient opted out, toxicity"
            className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-clinical-body placeholder:text-clinical-label shadow-sm outline-none transition-all duration-150 hover:border-clinical-blue-mid focus:border-clinical-blue focus:ring-2 focus:ring-clinical-blue/15"
          />
        </div>

        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="h-9 rounded-lg border border-[#E5E7EB] bg-white px-4 text-xs font-semibold text-[#424752] transition-colors hover:bg-[#F2F4F6] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving || !planId}
            className="flex h-9 items-center gap-2 rounded-lg bg-red-600 px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Discontinue
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
