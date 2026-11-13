import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Loader2,
  UserRound,
  Clock,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FormDropdown, type FormDropdownOption } from "@/components/ui/form-dropdown";
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
  type ConfirmTransferAppointmentItem,
  type TransferReplacementDoctorCandidate,
} from "@/api/doctorTransfer.api";

const NOTIFY_CHANNELS = ["SMS", "EMAIL", "WHATSAPP"];

const labelCls = "text-[10.5px] font-bold text-blue-600 uppercase tracking-[0.04em] mb-1.5 block";
const inputCls =
  "w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#191C1E] focus:outline-none focus:ring-2 focus:ring-[#00488D]/30";

export interface AffectedDialogTransfer {
  transfer_id: string;
  message?: string;
  old_branch_id?: string;
}

interface AffectedAppointmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  oldBranchId?: string;
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
  return { total: 0, successful: 0, queued: 0, cancelled: 0, conflictCount: 0, conflicts: [] };
}

export default function AffectedAppointmentsDialog({
  open,
  onOpenChange,
  employeeId,
  oldBranchId,
  branches,
  doctors,
  transfers,
  appointments,
  title = "Affected Appointments",
  onCompleted,
}: AffectedAppointmentsDialogProps) {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [action, setAction] = useState<TransferAction | null>(null);
  const [busy, setBusy] = useState(false);

  const [replacementBranchId, setReplacementBranchId] = useState("");
  const [replacementEmployeeId, setReplacementEmployeeId] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [cancelChecked, setCancelChecked] = useState(false);
  const [notifyChannels, setNotifyChannels] = useState<string[]>([]);

  // Per-appointment configuration (Doctor, Custom Time, Action)
  const [apptAssignments, setApptAssignments] = useState<
    Record<string, { action: TransferAction; doctorId: string; customTime: string }>
  >({});

  // Multi-patient selection for batch operations
  const [selectedApptIds, setSelectedApptIds] = useState<Set<string>>(new Set());
  const [batchDoctorId, setBatchDoctorId] = useState("");
  const [batchAction, setBatchAction] = useState<TransferAction>("TRANSFER");

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
    setApptAssignments({});
    setSelectedApptIds(new Set());
    setBatchDoctorId("");
    setBatchAction("TRANSFER");
  };

  const transferringDoctor = doctors.find(
    (d) => String(d.employee_id) === String(employeeId),
  );
  const transferringDoctorName = transferringDoctor
    ? `Dr. ${[transferringDoctor.first_name, transferringDoctor.middle_name, transferringDoctor.last_name].filter(Boolean).join(" ")}`
    : "Transferring Doctor";

  useEffect(() => {
    if (!open) return;
    resetFormState();
    setResult(null);

    const initial: Record<string, { action: TransferAction; doctorId: string; customTime: string }> = {};
    let firstCandidate = "";
    for (const a of appointments) {
      const topDoc =
        a.eligible_replacement_doctors && a.eligible_replacement_doctors.length > 0
          ? a.eligible_replacement_doctors[0].employee_id
          : "";
      if (!firstCandidate && topDoc) firstCandidate = topDoc;

      let formattedTime = "";
      if (a.appointment_time) {
        if (a.appointment_time.includes("T")) {
          try {
            const d = new Date(a.appointment_time);
            formattedTime = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
          } catch {
            formattedTime = a.appointment_time.slice(0, 5);
          }
        } else {
          formattedTime = a.appointment_time.slice(0, 5);
        }
      }

      initial[a.appointment_id] = {
        action: "TRANSFER",
        doctorId: topDoc,
        customTime: formattedTime,
      };
    }
    setApptAssignments(initial);
    if (firstCandidate) {
      setBatchDoctorId(firstCandidate);
    }

    if (appointments.length > 0 && defaultReplacementBranchId) {
      setReplacementBranchId(defaultReplacementBranchId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, appointments]);

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
        badge: "Active in department",
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

  const replacementDoctorOptions = useMemo(() => {
    if (branchFilteredDoctorOptions && branchFilteredDoctorOptions.length > 0) {
      return branchFilteredDoctorOptions;
    }
    return fallbackDoctorOptions;
  }, [branchFilteredDoctorOptions, fallbackDoctorOptions]);

  // Combined eligible doctor options for bulk selection across all appointments
  const bulkDoctorOptions = useMemo(() => {
    const map = new Map<string, { employee_id: string; name: string; covered: number }>();
    for (const a of appointments) {
      for (const d of a.eligible_replacement_doctors ?? []) {
        const existing = map.get(d.employee_id);
        if (existing) {
          existing.covered += 1;
        } else {
          map.set(d.employee_id, {
            employee_id: d.employee_id,
            name: d.name,
            covered: 1,
          });
        }
      }
    }
    if (map.size > 0) {
      return Array.from(map.values())
        .sort((x, y) => y.covered - x.covered)
        .map((d) => ({
          label: `Dr. ${d.name}`,
          value: d.employee_id,
          badge: `Covers ${d.covered} of ${appointments.length} appointment(s)`,
        }));
    }
    return replacementDoctorOptions;
  }, [appointments, replacementDoctorOptions]);

  const updateApptAssignment = (
    apptId: string,
    patch: Partial<{ action: TransferAction; doctorId: string; customTime: string }>,
  ) => {
    setApptAssignments((prev) => ({
      ...prev,
      [apptId]: {
        ...(prev[apptId] ?? { action: "TRANSFER", doctorId: "", customTime: "" }),
        ...patch,
      },
    }));
  };

  const toggleSelectAppt = (apptId: string) => {
    setSelectedApptIds((prev) => {
      const next = new Set(prev);
      if (next.has(apptId)) next.delete(apptId);
      else next.add(apptId);
      return next;
    });
  };

  const isAllSelected = appointments.length > 0 && selectedApptIds.size === appointments.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedApptIds(new Set());
    } else {
      setSelectedApptIds(new Set(appointments.map((a) => a.appointment_id)));
    }
  };

  const handleApplyBatchToSelected = () => {
    if (selectedApptIds.size === 0) {
      toast({
        title: "No patients selected",
        description: "Please check one or more patients to apply this action.",
        variant: "destructive",
      });
      return;
    }
    if (batchAction === "TRANSFER" && !batchDoctorId) {
      toast({
        title: "Replacement doctor required",
        description: "Please choose a replacement doctor for the selected patients.",
        variant: "destructive",
      });
      return;
    }

    setApptAssignments((prev) => {
      const next = { ...prev };
      for (const id of selectedApptIds) {
        next[id] = {
          ...(next[id] ?? { customTime: "" }),
          action: batchAction,
          doctorId: batchAction === "TRANSFER" ? batchDoctorId : "",
        };
      }
      return next;
    });

    const docObj = bulkDoctorOptions.find((d) => d.value === batchDoctorId);
    toast({
      title: "Batch Applied",
      description:
        batchAction === "TRANSFER"
          ? `Assigned ${selectedApptIds.size} patient(s) to ${docObj?.label || "replacement doctor"}.`
          : `Updated ${selectedApptIds.size} patient(s) to ${batchAction}.`,
    });
  };

  const getDoctorOptionsForAppt = (a: TransferAppointmentSummary): FormDropdownOption[] => {
    if (a.eligible_replacement_doctors && a.eligible_replacement_doctors.length > 0) {
      return a.eligible_replacement_doctors.map((d) => {
        let badge = "";
        let badgeTone: "info" | "danger" = "info";
        if (d.match_type === "EXACT_SESSION") {
          badge = `🟢 Exact 1-hr session (${d.session_label || "matched"})`;
          badgeTone = "info";
        } else if (d.match_type === "BUFFER_MATCH") {
          badge = `🔵 Buffer match (${d.mismatch_text || "±30m"})`;
          badgeTone = "info";
        } else if (d.match_type === "MISMATCH") {
          badge = `🟠 ${d.mismatch_text || "Timing mismatch"}`;
          badgeTone = "danger";
        } else {
          badge = "⚪ Off-duty / No session";
          badgeTone = "danger";
        }
        return {
          label: `Dr. ${d.name}`,
          value: d.employee_id,
          badge,
          badgeTone,
        };
      });
    }
    return replacementDoctorOptions;
  };

  const runForAllTransfers = async (payload: Record<string, unknown>) => {
    if (transfers.length === 0) return;
    setBusy(true);
    const aggregate = emptyAggregate();
    try {
      for (const t of transfers) {
        const resolvedOldBranchId = t.old_branch_id || oldBranchId || undefined;
        const res = await doctorTransferApi.confirmTransfer(employeeId, {
          transfer_id: t.transfer_id,
          ...(resolvedOldBranchId ? { old_branch_id: resolvedOldBranchId } : {}),
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
      const unassigned = appointments.find((a) => {
        const cfg = apptAssignments[a.appointment_id];
        const itemAction = cfg?.action ?? "TRANSFER";
        return itemAction === "TRANSFER" && !cfg?.doctorId;
      });

      if (unassigned) {
        toast({
          title: "Doctor selection required",
          description: `Please select a replacement doctor for appointment ${unassigned.appointment_id} (${unassigned.patient_name || unassigned.patient_id}), or switch its action to Reschedule/Cancel.`,
          variant: "destructive",
        });
        return;
      }

      const appointmentItems: ConfirmTransferAppointmentItem[] = appointments.map((a) => {
        const cfg = apptAssignments[a.appointment_id] ?? {
          action: "TRANSFER",
          doctorId: "",
          customTime: "",
        };
        return {
          appointment_id: a.appointment_id,
          action: cfg.action,
          replacement_employee_id: cfg.action === "TRANSFER" ? cfg.doctorId : undefined,
          replacement_branch_id: a.branch_id || undefined,
          custom_time: cfg.action === "TRANSFER" && cfg.customTime ? cfg.customTime : undefined,
        };
      });

      const primaryDoctor =
        appointmentItems.find((i) => i.action === "TRANSFER" && i.replacement_employee_id)
          ?.replacement_employee_id ||
        batchDoctorId ||
        replacementEmployeeId;

      void runForAllTransfers({
        action: "TRANSFER",
        replacement_employee_id: primaryDoctor || undefined,
        replacement_branch_id: replacementBranchId || undefined,
        appointments: appointmentItems,
        notify_channels: notifyChannels.length > 0 ? notifyChannels : undefined,
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
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-xs">
            Review and coordinate affected future appointments before schedule changes take effect.
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
                <div key={stat.label} className="bg-[#F8FAFC] rounded-lg p-3 text-center border border-gray-100">
                  <div className="text-lg font-black text-[#191C1E]">{String(stat.value)}</div>
                  <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wide">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {result.conflicts.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wide">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Conflicts Routed to Reschedule Queue
                </div>
                <p className="text-xs text-amber-900 leading-relaxed">
                  The following appointment(s) could not be directly transferred and have been
                  automatically enrolled into the <strong>Reschedule Queue</strong> with High priority:
                </p>
                <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
                  {result.conflicts.map((c) => (
                    <li key={c.appointment_id}>
                      <span className="font-semibold">{c.appointment_id}</span> — {c.reason}
                    </li>
                  ))}
                </ul>
                <div className="pt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleClose(false);
                      navigate("/reschedule-queue");
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold shadow-sm transition-colors"
                  >
                    Open Reschedule Queue <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => handleClose(false)}
                className="px-5 py-2 rounded-lg bg-[#00488D] text-white text-xs font-semibold hover:bg-[#003A70] transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Contextual Transfer Header: From Doctor A */}
            <div className="bg-[#EBF3FF] border border-[#C5DCFF] rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#00488D] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  From
                </div>
                <div>
                  <div className="text-xs font-bold text-[#002D5C] flex items-center gap-2">
                    <span>Transferring Patients from {transferringDoctorName}</span>
                    <span className="text-[10px] font-semibold bg-[#D6E3FF] text-[#00488D] px-2 py-0.5 rounded-full">
                      {appointments.length} affected booking(s)
                    </span>
                  </div>
                  <div className="text-[11px] text-[#42658A] mt-0.5">
                    Select and reassign these patients to replacement doctors at their respective branches.
                  </div>
                </div>
              </div>
              {summaryMessage && (
                <span className="text-[10px] font-semibold text-[#00488D] bg-white border border-[#B3D1FF] px-2.5 py-1 rounded-full whitespace-nowrap self-start sm:self-auto">
                  {summaryMessage}
                </span>
              )}
            </div>

            {/* Action cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(
                [
                  {
                    key: "TRANSFER" as const,
                    cardTitle: "Transfer to replacement",
                    description:
                      "Assign appointments to replacement doctors with exact 1-hr session matching or adjustable slot times.",
                    activeCls: "border-[#00488D] bg-[#EAF2FF]",
                    textCls: "text-[#00488D]",
                  },
                  {
                    key: "RESCHEDULE" as const,
                    cardTitle: "Reschedule required",
                    description:
                      "Enroll appointments into the Reschedule Queue for coordinator triage and reassignment.",
                    activeCls: "border-[#A8720F] bg-[#FCF1DD]",
                    textCls: "text-[#A8720F]",
                  },
                  {
                    key: "CANCEL" as const,
                    cardTitle: "Cancel appointments",
                    description:
                      "Bulk-cancel affected appointments and optionally notify patients.",
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

            {/* If TRANSFER selected: show Multi-Patient Batch Action Bar + Per-appointment cards */}
            {action === "TRANSFER" && (
              <div className="space-y-4">
                {/* Batch Patient Action Bar: active when 1 or more patients are checked */}
                {selectedApptIds.size > 0 && (
                  <div className="bg-[#191C1E] text-white rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-md animate-in fade-in duration-200">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold bg-[#00488D] text-white px-2.5 py-1 rounded-full">
                        {selectedApptIds.size} of {appointments.length} patients selected
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedApptIds(new Set())}
                        className="text-[11px] text-gray-400 hover:text-white underline transition-colors"
                      >
                        Clear selection
                      </button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Action selector for selected */}
                      <div className="inline-flex rounded-lg border border-gray-700 bg-gray-800 p-0.5 text-xs">
                        {(["TRANSFER", "RESCHEDULE", "CANCEL"] as TransferAction[]).map((act) => (
                          <button
                            key={act}
                            type="button"
                            onClick={() => setBatchAction(act)}
                            className={cn(
                              "px-2.5 py-1 rounded text-xs font-medium transition-all",
                              batchAction === act
                                ? act === "TRANSFER"
                                  ? "bg-blue-600 text-white shadow-xs"
                                  : act === "RESCHEDULE"
                                    ? "bg-amber-600 text-white shadow-xs"
                                    : "bg-red-600 text-white shadow-xs"
                                : "text-gray-400 hover:text-gray-200",
                            )}
                          >
                            {act === "TRANSFER" ? "Transfer" : act === "RESCHEDULE" ? "Reschedule" : "Cancel"}
                          </button>
                        ))}
                      </div>

                      {batchAction === "TRANSFER" && (
                        <div className="min-w-[210px]">
                          <FormDropdown
                            portal={false}
                            name="batch-doctor-select"
                            className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00488D]/30"
                            options={bulkDoctorOptions}
                            value={batchDoctorId}
                            onValueChange={setBatchDoctorId}
                            placeholder="Choose replacement doctor..."
                            emptyMessage="No doctors available"
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleApplyBatchToSelected}
                        className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shrink-0 transition-colors shadow-xs"
                      >
                        Apply to Selected ({selectedApptIds.size})
                      </button>
                    </div>
                  </div>
                )}

                {/* Per-appointment flexible assignment list */}
                <div className="border border-[#E5E7EB] rounded-xl overflow-hidden divide-y divide-[#F1F5F9] bg-white">
                  <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#EEF1F4] flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="accent-[#00488D] h-4 w-4 rounded cursor-pointer"
                      />
                      <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                        Select All Patients ({appointments.length})
                      </span>
                    </label>
                    <span className="text-[11px] text-gray-500">
                      Multi-assign selected patients or customize doctor & time individually
                    </span>
                  </div>

                  <div className="max-h-[380px] overflow-y-auto divide-y divide-[#F1F5F9]">
                    {appointments.map((a) => {
                      const cfg = apptAssignments[a.appointment_id] ?? {
                        action: "TRANSFER",
                        doctorId: "",
                        customTime: a.appointment_time?.slice(0, 5) || "",
                      };
                      const doctorOpts = getDoctorOptionsForAppt(a);
                      const originalTimeClean = a.appointment_time
                        ? a.appointment_time.includes("T")
                          ? a.appointment_time.slice(11, 16)
                          : a.appointment_time.slice(0, 5)
                        : "";
                      const isTimeModified = Boolean(cfg.customTime && cfg.customTime !== originalTimeClean);
                      const isChecked = selectedApptIds.has(a.appointment_id);

                      return (
                        <div
                          key={a.appointment_id}
                          className={cn(
                            "p-3.5 hover:bg-gray-50/50 transition-colors space-y-2.5",
                            isChecked && "bg-blue-50/30 border-l-4 border-l-[#00488D]",
                          )}
                        >
                          {/* Row 1: Checkbox + Patient summary + Action pill */}
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-3 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSelectAppt(a.appointment_id)}
                                className="accent-[#00488D] h-4 w-4 rounded shrink-0 cursor-pointer"
                              />
                              <div className="w-8 h-8 rounded-full bg-[#EBF1FA] flex items-center justify-center shrink-0">
                                <UserRound className="w-4 h-4 text-[#00488D]" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-[#191C1E] flex items-center gap-2">
                                  <span className="truncate">{a.patient_name || a.patient_id}</span>
                                  <span className="text-[10px] font-normal text-gray-500 font-mono">
                                    #{a.appointment_id}
                                  </span>
                                  {a.patient_mobile && (
                                    <span className="text-[10px] text-gray-400 font-normal">
                                      • {a.patient_mobile}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-[#64748B] flex items-center gap-1.5 flex-wrap mt-0.5">
                                  <span className="font-medium text-slate-700">From {transferringDoctorName}</span>
                                  <span>·</span>
                                  <span>{a.appointment_date}</span>
                                  <span>·</span>
                                  <span>Original: {a.appointment_time || "—"}</span>
                                  <span>·</span>
                                  <span className="font-medium text-gray-700">{branchLabelOf(a.branch_id)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Action selector for this specific appointment */}
                            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-[11px]">
                              {(["TRANSFER", "RESCHEDULE", "CANCEL"] as TransferAction[]).map((act) => (
                                <button
                                  key={act}
                                  type="button"
                                  onClick={() => updateApptAssignment(a.appointment_id, { action: act })}
                                  className={cn(
                                    "px-2.5 py-1 rounded-md font-semibold transition-all",
                                    cfg.action === act
                                      ? act === "TRANSFER"
                                        ? "bg-blue-600 text-white shadow-xs"
                                        : act === "RESCHEDULE"
                                          ? "bg-amber-600 text-white shadow-xs"
                                          : "bg-red-600 text-white shadow-xs"
                                      : "text-gray-600 hover:text-gray-900",
                                  )}
                                >
                                  {act === "TRANSFER" ? "Transfer" : act === "RESCHEDULE" ? "Reschedule" : "Cancel"}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Row 2: Target doctor & editable timing if action is TRANSFER */}
                          {cfg.action === "TRANSFER" && (
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 pl-7">
                              <div className="flex-1 min-w-[200px]">
                                <FormDropdown
                                  portal={false}
                                  name={`doc-${a.appointment_id}`}
                                  className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-[#191C1E] focus:outline-none focus:ring-2 focus:ring-[#00488D]/30"
                                  options={doctorOpts}
                                  value={cfg.doctorId}
                                  onValueChange={(val) => updateApptAssignment(a.appointment_id, { doctorId: val })}
                                  placeholder={
                                    doctorOpts.length === 0
                                      ? "No doctors at this branch/date"
                                      : "Transfer to replacement doctor..."
                                  }
                                  emptyMessage="No doctors available for this branch & department"
                                />
                              </div>

                              {/* Editable Timing Input */}
                              <div className="flex items-center gap-1.5 shrink-0 bg-gray-50/80 border border-gray-200 rounded-lg px-2.5 py-1">
                                <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span className="text-[11px] font-semibold text-gray-600">New Slot Time:</span>
                                <input
                                  type="time"
                                  value={cfg.customTime}
                                  onChange={(e) =>
                                    updateApptAssignment(a.appointment_id, { customTime: e.target.value })
                                  }
                                  className="bg-white border border-gray-200 rounded px-1.5 py-0.5 text-xs text-[#191C1E] focus:outline-none focus:ring-1 focus:ring-[#00488D]"
                                />
                                {isTimeModified && (
                                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                    Modified
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {cfg.action === "RESCHEDULE" && (
                            <div className="text-[11px] text-amber-800 bg-amber-50/70 border border-amber-200/60 rounded-lg px-3 py-1.5 ml-7">
                              This appointment will be placed into the Reschedule Queue with High priority.
                            </div>
                          )}

                          {cfg.action === "CANCEL" && (
                            <div className="text-[11px] text-red-700 bg-red-50/70 border border-red-200/60 rounded-lg px-3 py-1.5 ml-7">
                              This appointment will be cancelled when transfer is confirmed.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Optional patient notification toggle */}
                <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-[#191C1E]">
                      Notify Patients of Reassignment (Optional)
                    </div>
                    <div className="text-[11px] text-[#64748B] mt-0.5">
                      Send SMS, WhatsApp, or Email updates with their new doctor and slot details.
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {NOTIFY_CHANNELS.map((channel) => (
                      <button
                        key={channel}
                        type="button"
                        onClick={() => toggleChannel(channel)}
                        className={`rounded-lg border px-3 py-1 text-xs font-semibold transition-colors ${
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

            {/* If RESCHEDULE selected */}
            {action === "RESCHEDULE" && (
              <div className="space-y-3 border border-[#E5E7EB] rounded-xl p-4 bg-white">
                <div>
                  <label className={labelCls}>Queue Priority</label>
                  <FormDropdown
                    name="affected-priority"
                    className={inputCls}
                    options={[
                      { label: "Normal Priority", value: "NORMAL" },
                      { label: "High Priority (Recommended for doctor transfers)", value: "HIGH" },
                      { label: "Urgent Priority", value: "URGENT" },
                    ]}
                    value={priority}
                    onValueChange={setPriority}
                  />
                </div>
                <div>
                  <label className={labelCls}>Reschedule Note / Reason (optional)</label>
                  <textarea
                    rows={2}
                    className={inputCls}
                    placeholder="e.g. Doctor branch transfer reassignment"
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* If CANCEL selected */}
            {action === "CANCEL" && (
              <div className="space-y-3 border border-[#E5E7EB] rounded-xl p-4 bg-white">
                <label className="flex items-center gap-2 text-sm font-medium text-[#191C1E] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cancelChecked}
                    onChange={(e) => setCancelChecked(e.target.checked)}
                    className="accent-[#00488D] h-4 w-4 rounded"
                  />
                  I understand this permanently cancels all {appointments.length} affected appointment(s)
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

            {/* Read-only overview when no action has been clicked yet */}
            {action === null && appointments.length > 0 && (
              <div className="border border-[#E5E7EB] rounded-xl overflow-hidden bg-white">
                <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#EEF1F4] text-xs font-bold text-gray-600 uppercase tracking-wide">
                  Affected Appointments Preview ({appointments.length})
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
                          {a.appointment_date} · {a.appointment_time} · {branchLabelOf(a.branch_id)}
                        </div>
                      </div>
                      {(a.eligible_replacement_doctors?.length ?? 0) > 0 && (
                        <span className="text-[10px] font-semibold text-[#00488D] bg-[#D6E3FF] px-2 py-1 rounded-full whitespace-nowrap shrink-0">
                          {a.eligible_replacement_doctors!.length} replacement(s) available
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => handleClose(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-[#475569] hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
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
