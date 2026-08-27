import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormDropdown } from "@/components/ui/form-dropdown";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  doctorTransferApi,
  type TransferAppointmentSummary,
  type TransferAction,
} from "@/api/doctorTransfer.api";

const NOTIFY_CHANNELS = ["SMS", "EMAIL", "WHATSAPP"];

const labelCls = "text-[10.5px] font-bold text-blue-600 uppercase tracking-[0.04em] mb-1.5 block";
const inputCls =
  "w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#191C1E] focus:outline-none focus:ring-2 focus:ring-[#00488D]/30";

export interface AffectedDialogTransfer {
  transfer_id: string;
  message?: string;
}

interface AffectedAppointmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  branches: { branch_id: string; branch_name?: string | null }[];
  doctors: {
    employee_id: string;
    first_name?: string;
    middle_name?: string | null;
    last_name?: string | null;
    department_id?: string | null;
    emp_status?: boolean;
  }[];
  transfers: AffectedDialogTransfer[];
  appointments: TransferAppointmentSummary[];
  title?: string;
  onCompleted?: (
    summary: {
      total: number;
      successful: number;
      conflicts: number;
      queued: number;
      cancelled: number;
    },
    conflicts: { appointment_id: string; reason: string }[],
  ) => void;
}

interface AggregateSummary {
  total: number;
  successful: number;
  queued: number;
  cancelled: number;
  conflictCount: number;
  conflicts: { appointment_id: string; reason: string }[];
}

function emptyAggregate(): AggregateSummary {
  return { total: 0, successful: 0, conflicts: 0, queued: 0, cancelled: 0, conflictCount: 0, conflicts: [] };
}

export default function AffectedAppointmentsDialog({
  open,
  onOpenChange,
  employeeId,
  branches,
  doctors,
  transfers,
  appointments,
  title = "Affected Appointments",
  onCompleted,
}: AffectedAppointmentsDialogProps) {
  const { toast } = useToast();

  const [action, setAction] = useState<TransferAction | null>(null);
  const [busy, setBusy] = useState(false);

  const [replacementBranchId, setReplacementBranchId] = useState("");
  const [replacementEmployeeId, setReplacementEmployeeId] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [cancelChecked, setCancelChecked] = useState(false);
  const [notifyChannels, setNotifyChannels] = useState<string[]>([]);

  const [result, setResult] = useState<AggregateSummary | null>(null);

  const resetFormState = () => {
    setAction(null);
    setBusy(false);
    setReplacementBranchId("");
    setReplacementEmployeeId("");
    setPriority("NORMAL");
    setRescheduleReason("");
    setCancelChecked(false);
    setNotifyChannels([]);
  };

  useEffect(() => {
    if (!open) return;
    resetFormState();
    setResult(null);
    if (appointments.length > 0 && defaultReplacementBranchId) {
      setReplacementBranchId(defaultReplacementBranchId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClose = (next: boolean) => {
    if (!next) {
      resetFormState();
      setResult(null);
    }
    onOpenChange(next);
  };

  const summaryMessage = transfers.find((t) => t.message)?.message ?? "";

  const branchAppointmentCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of appointments) {
      if (!a.branch_id) continue;
      counts.set(a.branch_id, (counts.get(a.branch_id) ?? 0) + 1);
    }
    return counts;
  }, [appointments]);

  const defaultReplacementBranchId = useMemo(() => {
    let best: string | null = null;
    let bestCount = 0;
    for (const [bid, count] of branchAppointmentCounts) {
      if (count > bestCount) {
        best = bid;
        bestCount = count;
      }
    }
    return best ?? "";
  }, [branchAppointmentCounts]);

  const branchEligibility = useMemo(() => {
    const acc: Record<
      string,
      { total: number; doctors: Map<string, { employee_id: string; name: string; covered: number }> }
    > = {};
    for (const a of appointments) {
      const bid = a.branch_id ?? "";
      if (!bid) continue;
      const entry = (acc[bid] ??= { total: 0, doctors: new Map() });
      entry.total += 1;
      for (const doc of a.eligible_replacement_doctors ?? []) {
        const existing = entry.doctors.get(doc.employee_id);
        if (existing) existing.covered += 1;
        else
          entry.doctors.set(doc.employee_id, {
            employee_id: doc.employee_id,
            name: doc.name,
            covered: 1,
          });
      }
    }
    return acc;
  }, [appointments]);

  const branchLabelOf = (branchId: string | null | undefined) => {
    if (!branchId) return "—";
    return branches.find((b) => b.branch_id === branchId)?.branch_name || branchId;
  };

  const departmentOfDoctor = (employee_id: string) =>
    String(
      doctors.find((d) => String(d.employee_id) === String(employee_id))?.department_id ?? "",
    );

  const fallbackDoctorOptions = useMemo(() => {
    const dept = departmentOfDoctor(employeeId);
    return doctors
      .filter(
        (d) =>
          String(d.employee_id) !== String(employeeId) &&
          d.emp_status !== false &&
          (dept ? String(d.department_id ?? "") === dept : true),
      )
      .map((d) => ({
        label: `Dr. ${[d.first_name, d.middle_name, d.last_name].filter(Boolean).join(" ")}`,
        value: d.employee_id,
      }));
  }, [doctors, employeeId]);

  const branchFilteredDoctorOptions = useMemo(() => {
    if (!replacementBranchId) return null;
    const elig = branchEligibility[replacementBranchId];
    if (!elig) return null;
    return Array.from(elig.doctors.values())
      .filter((d) => String(d.employee_id) !== String(employeeId))
      .sort((x, y) => y.covered - x.covered)
      .map((d) => ({
        label: `Dr. ${d.name}`,
        value: d.employee_id,
        badge: `covers ${d.covered} of ${elig.total} affected appointment(s)`,
      }));
  }, [branchEligibility, replacementBranchId, employeeId]);

  const replacementDoctorOptions = branchFilteredDoctorOptions ?? fallbackDoctorOptions;

  const runForAllTransfers = async (payload: Record<string, unknown>) => {
    if (transfers.length === 0) return;
    setBusy(true);
    const aggregate = emptyAggregate();
    try {
      for (const t of transfers) {
        const res = await doctorTransferApi.confirmTransfer(employeeId, {
          transfer_id: t.transfer_id,
          ...(payload as object),
        } as any);
        const data = res.data?.data;
        if (data?.summary) {
          aggregate.total += data.summary.total ?? 0;
          aggregate.successful += data.summary.successful ?? 0;
          aggregate.conflictCount += data.summary.conflicts ?? 0;
          aggregate.queued += data.summary.queued ?? 0;
          aggregate.cancelled += data.summary.cancelled ?? 0;
        }
        if (data?.conflicts?.length) {
          aggregate.conflicts.push(...data.conflicts);
        }
      }
      setResult(aggregate);
      onCompleted?.(
        {
          total: aggregate.total,
          successful: aggregate.successful,
          conflicts: aggregate.conflictCount,
          queued: aggregate.queued,
          cancelled: aggregate.cancelled,
        },
        aggregate.conflicts,
      );
    } catch (err: any) {
      toast({
        title: "Failed to process transfer action",
        description: err?.response?.data?.message || err?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const handlePrimaryAction = () => {
    if (!action) return;

    if (action === "TRANSFER") {
      if (branchFilteredDoctorOptions && branchFilteredDoctorOptions.length === 0) {
        toast({
          title: "No doctor available",
          description: `No doctor from the same department works at ${branchLabelOf(replacementBranchId)} on the affected date(s).`,
          variant: "destructive",
        });
        return;
      }
      if (!replacementEmployeeId) {
        toast({ title: "Choose a replacement doctor", variant: "destructive" });
        return;
      }
      void runForAllTransfers({
        action: "TRANSFER",
        replacement_employee_id: replacementEmployeeId,
        replacement_branch_id: replacementBranchId || undefined,
      });
      return;
    }

    if (action === "RESCHEDULE") {
      void runForAllTransfers({
        action: "RESCHEDULE",
        priority,
        reason: rescheduleReason.trim() || undefined,
      });
      return;
    }

    if (!cancelChecked) {
      toast({ title: "Please tick the confirmation checkbox to proceed", variant: "destructive" });
      return;
    }
    void runForAllTransfers({
      action: "CANCEL",
      confirm: true,
      notify_channels: notifyChannels.length > 0 ? notifyChannels : undefined,
    });
  };

  const toggleChannel = (channel: string) => {
    setNotifyChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel],
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-xs">
            Choose how the affected future appointments should be handled before the schedule
            change is applied.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <h2 className="font-bold text-[#191C1E]">Appointments processed</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Total affected", value: result.total },
                { label: "Transferred", value: result.successful },
                { label: "Queued", value: result.queued },
                { label: "Conflicts", value: result.conflictCount },
                { label: "Cancelled", value: result.cancelled },
              ].map((stat) => (
                <div key={stat.label} className="bg-[#F8FAFC] rounded-lg p-3 text-center">
                  <div className="text-lg font-black text-[#191C1E]">{String(stat.value)}</div>
                  <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wide">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
            {result.conflicts.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-[#7B3200] uppercase tracking-wide mb-2">
                  Conflicts needing review
                </h3>
                <ul className="text-xs text-[#64748B] space-y-1 list-disc list-inside">
                  {result.conflicts.map((c) => (
                    <li key={c.appointment_id}>
                      {c.appointment_id} — {c.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button
              onClick={() => handleClose(false)}
              className="px-4 py-2 rounded-lg bg-[#00488D] text-white text-xs font-semibold hover:bg-[#003A70]"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="font-bold text-sm text-[#191C1E]">
                {appointments.length} future appointment(s) affected
              </h2>
              {summaryMessage && (
                <span className="text-[10px] font-semibold text-[#00488D] bg-[#D6E3FF] px-2 py-1 rounded-full whitespace-nowrap">
                  {transfers.length} pending change(s)
                </span>
              )}
            </div>
            {summaryMessage && <p className="text-xs text-[#64748B]">{summaryMessage}</p>}

            {appointments.length > 0 && (
              <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#EEF1F4] text-xs font-bold text-gray-600 uppercase tracking-wide">
                  Appointments affected
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-[#F1F5F9]">
                  {appointments.map((a) => (
                    <div key={a.appointment_id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-full bg-[#E6E8EA] flex items-center justify-center shrink-0">
                        <UserRound className="w-4 h-4 text-[#475569]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[#191C1E] truncate">
                          {a.patient_name || a.patient_id}
                        </div>
                        <div className="text-xs text-[#64748B]">
                          {a.appointment_date} · {a.appointment_time} ·{" "}
                          {branchLabelOf(a.branch_id)}
                        </div>
                      </div>
                      {(a.eligible_replacement_doctors?.length ?? 0) > 0 && (
                        <span className="text-[10px] font-semibold text-[#00488D] bg-[#D6E3FF] px-2 py-1 rounded-full whitespace-nowrap shrink-0">
                          {a.eligible_replacement_doctors!.length} replacement available
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(
                [
                  {
                    key: "TRANSFER" as const,
                    cardTitle: "Transfer to replacement",
                    description:
                      "Reassign every appointment to another doctor of the same department with a slot for the same day.",
                    activeCls: "border-[#00488D] bg-[#EAF2FF]",
                    textCls: "text-[#00488D]",
                  },
                  {
                    key: "RESCHEDULE" as const,
                    cardTitle: "Reschedule required",
                    description:
                      "Flag appointments as Reschedule Required — they'll be reassigned later via the Edit Appointment form.",
                    activeCls: "border-[#A8720F] bg-[#FCF1DD]",
                    textCls: "text-[#A8720F]",
                  },
                  {
                    key: "CANCEL" as const,
                    cardTitle: "Cancel appointments",
                    description:
                      "Bulk-cancel the affected appointments and optionally notify patients.",
                    activeCls: "border-[#B5433E] bg-[#FBEAE9]",
                    textCls: "text-[#B5433E]",
                  },
                ]
              ).map((card) => (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => setAction(card.key)}
                  className={`text-left rounded-xl border p-4 transition-colors ${
                    action === card.key
                      ? `${card.activeCls} ring-1 ring-current`
                      : "border-[#E5E7EB] bg-white hover:border-[#B8CCE8]"
                  }`}
                >
                  <div className={cn("text-sm font-bold", action === card.key ? card.textCls : "text-[#191C1E]")}>
                    {card.cardTitle}
                  </div>
                  <p className="text-xs text-[#64748B] mt-1 leading-relaxed">{card.description}</p>
                </button>
              ))}
            </div>

            {action === "TRANSFER" && (
              <div className="space-y-3 border border-[#E5E7EB] rounded-xl p-4">
                <div>
                  <label className={labelCls}>Replace at branch</label>
                  <FormDropdown
                    name="affected-replacement-branch"
                    className={inputCls}
                    options={[
                      { label: "Appointment's own branch (auto)", value: "" },
                      ...branches.map((b) => ({
                        label: `${b.branch_name || b.branch_id}${
                          branchAppointmentCounts.has(b.branch_id)
                            ? ` (${branchAppointmentCounts.get(b.branch_id)} affected)`
                            : ""
                        }`,
                        value: b.branch_id,
                      })),
                    ]}
                    value={replacementBranchId}
                    onValueChange={(v) => {
                      setReplacementBranchId(v);
                      if (v && branchEligibility[v]) {
                        const allowed = new Set(
                          Array.from(branchEligibility[v].doctors.values())
                            .filter((d) => String(d.employee_id) !== String(employeeId))
                            .map((d) => d.employee_id),
                        );
                        if (!allowed.has(replacementEmployeeId)) setReplacementEmployeeId("");
                      }
                    }}
                    placeholder="Select branch"
                  />
                  {!replacementBranchId && defaultReplacementBranchId && (
                    <p className="text-[11px] text-blue-600 mt-1">
                      Defaults to each appointment's own branch ({branchLabelOf(defaultReplacementBranchId)} has the most).
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelCls}>Replacement doctor</label>
                  <FormDropdown
                    name="affected-replacement-doctor"
                    className={inputCls}
                    options={replacementDoctorOptions}
                    value={replacementEmployeeId}
                    onValueChange={setReplacementEmployeeId}
                    placeholder={
                      branchFilteredDoctorOptions?.length === 0
                        ? "No doctors available"
                        : "Select doctor"
                    }
                    emptyMessage="No doctors available"
                  />
                  {branchFilteredDoctorOptions ? (
                    branchFilteredDoctorOptions.length === 0 ? (
                      <p className="text-[11px] text-[#94A3B8] mt-1">
                        No doctor from the same department works at{" "}
                        {branchLabelOf(replacementBranchId)} on the affected date(s).
                      </p>
                    ) : (
                      <p className="text-[11px] text-[#94A3B8] mt-1">
                        Showing {branchFilteredDoctorOptions.length} doctor(s) working at{" "}
                        {branchLabelOf(replacementBranchId)} on the affected date(s).
                      </p>
                    )
                  ) : null}
                </div>
              </div>
            )}

            {action === "RESCHEDULE" && (
              <div className="space-y-3 border border-[#E5E7EB] rounded-xl p-4">
                <div>
                  <label className={labelCls}>Priority</label>
                  <FormDropdown
                    name="affected-priority"
                    className={inputCls}
                    options={[
                      { label: "Normal", value: "NORMAL" },
                      { label: "High", value: "HIGH" },
                      { label: "Urgent", value: "URGENT" },
                    ]}
                    value={priority}
                    onValueChange={setPriority}
                  />
                </div>
                <div>
                  <label className={labelCls}>Reason (optional)</label>
                  <textarea
                    rows={2}
                    className={inputCls}
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                  />
                </div>
              </div>
            )}

            {action === "CANCEL" && (
              <div className="space-y-3 border border-[#E5E7EB] rounded-xl p-4">
                <label className="flex items-center gap-2 text-sm font-medium text-[#191C1E]">
                  <input
                    type="checkbox"
                    checked={cancelChecked}
                    onChange={(e) => setCancelChecked(e.target.checked)}
                    className="accent-[#00488D]"
                  />
                  I understand this permanently cancels the listed appointments
                </label>
                <div>
                  <label className={labelCls}>Notify patients via</label>
                  <div className="flex gap-2 flex-wrap">
                    {NOTIFY_CHANNELS.map((channel) => (
                      <button
                        key={channel}
                        type="button"
                        onClick={() => toggleChannel(channel)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          notifyChannels.includes(channel)
                            ? "border-[#00488D] bg-[#EAF2FF] text-[#00488D]"
                            : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        {channel}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => handleClose(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-[#475569] disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!action || busy}
                onClick={handlePrimaryAction}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-50",
                  action === "CANCEL" ? "bg-[#B5433E] hover:bg-[#9E3935]" : "bg-[#00488D] hover:bg-[#003A70]",
                )}
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {action === "TRANSFER"
                  ? "Transfer appointments"
                  : action === "RESCHEDULE"
                    ? "Add to reschedule queue"
                    : "Confirm cancel"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
