import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  UserRound,
  Plus,
  Building2,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { FormDropdown } from "@/components/ui/form-dropdown";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import TimepickerWheel from "@/components/ui/timepicker-wheel";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { StatusBadge } from "@/components/hms/StatusBadge";
import {
  employeeApi,
  EmployeeDetailResponse,
  EmployeeRecord,
  DoctorScheduleRecord,
} from "@/api/employee.api";
import { branchApi, Branch } from "@/api/branch.api";
import { departmentApi, Department } from "@/api/department.api";
import {
  doctorTransferApi,
  InitiateTransferPayload,
  InitiateTransferResult,
  TransferAppointmentSummary,
  ConfirmTransferPayload,
  ConfirmTransferResult,
} from "@/api/doctorTransfer.api";
import { getUser } from "@/utils/token";

const TRANSFER_ADMIN_ROLES = ["HEAD_ADMIN", "SUPER_ADMIN", "BRANCH_ADMIN"];

const DAYS_OF_WEEK: { value: string; label: string }[] = [
  { value: "MONDAY", label: "Monday" },
  { value: "TUESDAY", label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY", label: "Thursday" },
  { value: "FRIDAY", label: "Friday" },
  { value: "SATURDAY", label: "Saturday" },
  { value: "SUNDAY", label: "Sunday" },
];

const NOTIFY_CHANNELS = ["SMS", "EMAIL", "WHATSAPP"];

interface ScheduleEntry {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  branch_id: string;
}

interface BranchTransfer {
  branchId: string;
  result: InitiateTransferResult;
}

function toTimeInputValue(time: string | null | undefined): string {
  if (!time) return "";
  const d = new Date(time);
  if (isNaN(d.getTime())) return "";
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function todayISODate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function mergeConfirmResults(results: ConfirmTransferResult[]): ConfirmTransferResult {
  return {
    transfer_id: results[0]?.transfer_id ?? "",
    action: results[0]?.action ?? "TRANSFER",
    status: "COMPLETED",
    summary: results.reduce(
      (acc, r) => ({
        total: acc.total + r.summary.total,
        successful: acc.successful + r.summary.successful,
        conflicts: acc.conflicts + r.summary.conflicts,
        queued: acc.queued + r.summary.queued,
        cancelled: acc.cancelled + r.summary.cancelled,
      }),
      { total: 0, successful: 0, conflicts: 0, queued: 0, cancelled: 0 },
    ),
    successful: results.flatMap((r) => r.successful),
    conflicts: results.flatMap((r) => r.conflicts),
  };
}

const labelCls = "text-[10.5px] font-bold text-blue-600 uppercase tracking-[0.04em] mb-1.5 block";
const inputCls =
  "w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#191C1E] focus:outline-none focus:ring-2 focus:ring-[#00488D]/30";

export default function TransferDoctor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [roleOk, setRoleOk] = useState(false);
  const [loading, setLoading] = useState(true);

  const [employee, setEmployee] = useState<EmployeeDetailResponse | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [openDoctors, setOpenDoctors] = useState<EmployeeRecord[]>([]);

  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [activeBranchId, setActiveBranchId] = useState("");
  const [scheduleByBranch, setScheduleByBranch] = useState<Record<string, ScheduleEntry[]>>({});
  const [newDepartmentId, setNewDepartmentId] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(todayISODate());
  const [transferReason, setTransferReason] = useState("");
  const [consultationMinutes, setConsultationMinutes] = useState("20");
  const [submitting, setSubmitting] = useState(false);

  const [transfers, setTransfers] = useState<BranchTransfer[]>([]);

  // Confirm-action state (step 2)
  const [replacementEmployeeId, setReplacementEmployeeId] = useState("");
  const [replacementBranchId, setReplacementBranchId] = useState("");
  const [notifyChannels, setNotifyChannels] = useState<string[]>([]);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [priority, setPriority] = useState("NORMAL");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmResult, setConfirmResult] = useState<ConfirmTransferResult | null>(null);

  const [replacementOpen, setReplacementOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [confirmDone, setConfirmDone] = useState(false);

  useEffect(() => {
    const user = getUser();
    const role = (user?.role_type || user?.role || "").toUpperCase();
    setRoleOk(TRANSFER_ADMIN_ROLES.includes(role));
  }, []);

  useEffect(() => {
    if (!roleOk) return;

    const initial = async () => {
      try {
        const [empRes, branchRes, deptRes, docRes] = await Promise.all([
          employeeApi.getOne(id!),
          branchApi.getAll(),
          departmentApi.getAll(),
          employeeApi.getAll({ roleType: "DOCTOR", limit: 1000 }),
        ]);
        const detail = empRes.data?.data;
        setEmployee(detail);
        setBranches(branchRes.data?.data || branchRes.data?.branches || []);
        setDepartments(deptRes.data?.data || []);
        setOpenDoctors(docRes.data?.data?.employees || []);
        if (detail) {
          setNewDepartmentId(detail.employee.department_id || "");
          if (detail.doctorProfile?.consultation_minutes) {
            setConsultationMinutes(String(detail.doctorProfile.consultation_minutes));
          }
          const grouped: Record<string, ScheduleEntry[]> = {};
          (detail.doctorSchedules || [])
            .filter((s) => s.is_active !== false && s.branch_id)
            .forEach((s: DoctorScheduleRecord, i: number) => {
              const bid = s.branch_id as string;
              (grouped[bid] = grouped[bid] || []).push({
                id: `seed-${bid}-${i}`,
                day_of_week: s.day_of_week || "MONDAY",
                start_time: toTimeInputValue(s.start_time),
                end_time: toTimeInputValue(s.end_time),
                branch_id: bid,
              });
            });
          setScheduleByBranch(grouped);
          const seededIds = Object.keys(grouped);
          setSelectedBranchIds(seededIds);
          if (seededIds.length > 0) setActiveBranchId(seededIds[0]);
        }
      } catch (err) {
        console.error("[Transfer] Init error", err);
        toast({
          title: "Failed to load doctor",
          description: "Couldn't fetch doctor details for the transfer.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    initial();
  }, [roleOk, id]);

  const doctorSummary = useMemo(() => {
    if (!employee) return null;
    const emp = employee.employee;
    return {
      name: [emp.first_name, emp.middle_name, emp.last_name].filter(Boolean).join(" "),
      designation: emp.designation || "Doctor",
      specialization: emp.specialization || "General",
      active: emp.emp_status === true,
    };
  }, [employee]);

  const assignedBranchIds = useMemo(
    () => new Set((employee?.branches ?? []).map((b) => b.branch_id)),
    [employee],
  );

  const fromBranchNames = useMemo(
    () =>
      (employee?.branches ?? []).map((b) => b.branch_name).filter(Boolean).join(", ") ||
      employee?.employee.branch?.branch_name ||
      "\u2014",
    [employee],
  );

  const branchLabelOf = (branchId: string) => {
    const b = branches.find((x) => x.branch_id === branchId);
    if (!b) return branchId;
    return b.branch_name ? b.branch_name : b.branch_id;
  };

  const branchOptions = useMemo(
    () =>
      branches.map((b) => ({
        label: `${b.branch_name || b.branch_id}${assignedBranchIds.has(b.branch_id) ? " (currently assigned)" : ""}`,
        value: b.branch_id,
      })),
    [branches, assignedBranchIds],
  );

  const activeSchedule = useMemo(
    () => (activeBranchId ? scheduleByBranch[activeBranchId] ?? [] : []),
    [activeBranchId, scheduleByBranch],
  );

  const otherBranchIds = useMemo(
    () => selectedBranchIds.filter((b) => b !== activeBranchId),
    [selectedBranchIds, activeBranchId],
  );

  const dayLabelOf = (day: string) =>
    DAYS_OF_WEEK.find((d) => d.value === day)?.label || day;

  const handleBranchesChange = (vals: string[]) => {
    const added = vals.filter((v) => !selectedBranchIds.includes(v));
    const removed = selectedBranchIds.filter((v) => !vals.includes(v));
    setSelectedBranchIds(vals);
    if (removed.includes(activeBranchId)) {
      setActiveBranchId(vals[0] ?? "");
    } else if (added.length > 0) {
      setActiveBranchId(added[added.length - 1]);
    }
  };

  const addScheduleRow = () => {
    if (!activeBranchId) return;
    setScheduleByBranch((p) => ({
      ...p,
      [activeBranchId]: [
        ...(p[activeBranchId] ?? []),
        {
          id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          day_of_week: "MONDAY",
          start_time: "",
          end_time: "",
          branch_id: activeBranchId,
        },
      ],
    }));
  };

  const updateScheduleRow = (rowId: string, field: keyof ScheduleEntry, value: string) => {
    if (!activeBranchId) return;
    setScheduleByBranch((p) => ({
      ...p,
      [activeBranchId]: (p[activeBranchId] ?? []).map((s) =>
        s.id === rowId ? { ...s, [field]: value } : s,
      ),
    }));
  };

  const removeScheduleRow = (rowId: string) => {
    if (!activeBranchId) return;
    setScheduleByBranch((p) => ({
      ...p,
      [activeBranchId]: (p[activeBranchId] ?? []).filter((s) => s.id !== rowId),
    }));
  };

  const handleInitiate = async () => {
    if (!id) return;
    if (selectedBranchIds.length === 0) {
      toast({ title: "Select at least one branch", variant: "destructive" });
      return;
    }
    if (!effectiveDate) {
      toast({ title: "Effective date is required", variant: "destructive" });
      return;
    }
    if (!transferReason.trim()) {
      toast({ title: "Transfer reason is required", variant: "destructive" });
      return;
    }
    for (const branchId of selectedBranchIds) {
      const rows = scheduleByBranch[branchId] ?? [];
      if (rows.length === 0) {
        toast({
          title: `Add working hours for ${branchLabelOf(branchId)}`,
          description: "Every assigned branch needs at least one working hour slot.",
          variant: "destructive",
        });
        return;
      }
      for (const row of rows) {
        if (!row.start_time || !row.end_time) {
          toast({
            title: `Every slot needs both a start and end time (${branchLabelOf(branchId)})`,
            variant: "destructive",
          });
          return;
        }
        if (row.start_time >= row.end_time) {
          toast({
            title: `Start time must be before end time (${branchLabelOf(branchId)})`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    const payloads: InitiateTransferPayload[] = selectedBranchIds.map((branchId) => ({
      new_branch_id: branchId,
      new_department_id: newDepartmentId || undefined,
      effective_date: effectiveDate,
      transfer_reason: transferReason.trim(),
      working_hours: (scheduleByBranch[branchId] ?? [])
        .filter((s) => s.branch_id === branchId)
        .map((s) => ({
          branch_id: s.branch_id,
          day_of_week: s.day_of_week as InitiateTransferPayload["working_hours"][number]["day_of_week"],
          shift_name: Number(s.start_time.split(":")[0]) < 12 ? "Morning" : "Evening",
          start_time: s.start_time,
          end_time: s.end_time,
        })),
      consultation_minutes: Number(consultationMinutes) || 20,
    }));

    setSubmitting(true);
    try {
      const results = await Promise.allSettled(
        payloads.map((payload) => doctorTransferApi.initiateTransfer(id, payload)),
      );
      const succeeded: BranchTransfer[] = payloads.flatMap((payload, i) => {
        const r = results[i];
        return r.status === "fulfilled"
          ? [{ branchId: payload.new_branch_id, result: r.value.data.data }]
          : [];
      });
      const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");

      if (succeeded.length === 0) {
        const first = rejected[0]?.reason;
        throw new Error(
          first?.response?.data?.message || first?.message || "Failed to initiate transfer",
        );
      }

      setTransfers(succeeded);
      const allCompleted = succeeded.every((t) => t.result.status === "COMPLETED");
      toast({
        title: allCompleted ? "Transfer completed" : "Transfer request created",
        description:
          rejected.length > 0
            ? `Processed ${succeeded.length} of ${payloads.length} branch(es). ${rejected.length} branch assignment(s) failed.`
            : `Assignments initiated for ${succeeded.length} branch(es).`,
        variant: rejected.length > 0 ? "destructive" : undefined,
      });
    } catch (err: any) {
      toast({
        title: "Failed to initiate transfer",
        description: err?.response?.data?.message || err?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const replacementOptions = useMemo(() => {
    const dept = employee?.employee.department_id;
    return openDoctors
      .filter(
        (d) =>
          d.employee_id !== id &&
          d.emp_status !== false &&
          (dept ? d.department_id === dept : true),
      )
      .map((d) => ({
        label: `Dr. ${[d.first_name, d.middle_name, d.last_name].filter(Boolean).join(" ")}`,
        value: d.employee_id,
      }));
  }, [openDoctors, employee, id]);

  const pendingTransferIds = useMemo(
    () =>
      transfers
        .filter((t) => t.result.status === "PENDING_CONFIRMATION")
        .map((t) => t.result.transfer_id),
    [transfers],
  );

  const combinedAppointments = useMemo(() => {
    const seen = new Set<string>();
    const out: TransferAppointmentSummary[] = [];
    for (const t of transfers) {
      for (const a of t.result.appointments ?? []) {
        if (!seen.has(a.appointment_id)) {
          seen.add(a.appointment_id);
          out.push(a);
        }
      }
    }
    return out;
  }, [transfers]);

  const branchAppointmentCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of transfers) {
      for (const a of t.result.appointments ?? []) {
        if (!a.branch_id) continue;
        counts.set(a.branch_id, (counts.get(a.branch_id) ?? 0) + 1);
      }
    }
    return counts;
  }, [transfers]);

  const defaultReplacementBranchId = useMemo(() => {
    let best: string | null = null;
    let bestCount = 0;
    for (const [bid, count] of branchAppointmentCounts) {
      if (count > bestCount) {
        best = bid;
        bestCount = count;
      }
    }
    return best ?? employee?.employee.branch_id ?? "";
  }, [branchAppointmentCounts, employee]);

  const branchEligibility = useMemo(() => {
    const acc: Record<
      string,
      {
        total: number;
        doctors: Map<string, { employee_id: string; name: string; covered: number }>;
      }
    > = {};
    for (const t of transfers) {
      for (const a of t.result.appointments ?? []) {
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
    }
    return acc;
  }, [transfers]);

  const replacementBranchOptions = useMemo(
    () => [
      { label: "Appointment's own branch (auto)", value: "" },
      ...branches.map((b) => ({
        label: `${b.branch_id}${b.branch_name ? ` - ${b.branch_name}` : ""}`,
        value: b.branch_id,
        highlight: b.branch_id === defaultReplacementBranchId,
        badge: branchAppointmentCounts.has(b.branch_id)
          ? `${branchAppointmentCounts.get(b.branch_id)} affected appointment(s)`
          : b.branch_id === defaultReplacementBranchId
            ? "Branch the doctor left"
            : undefined,
      })),
    ],
    [branches, defaultReplacementBranchId, branchAppointmentCounts],
  );

  const branchFilteredDoctorOptions = useMemo(() => {
    const elig = branchEligibility[replacementBranchId];
    if (!elig) return null;
    return Array.from(elig.doctors.values())
      .filter((d) => d.employee_id !== id)
      .sort((x, y) => y.covered - x.covered)
      .map((d) => ({
        label: `Dr. ${d.name}`,
        value: d.employee_id,
        badge: `covers ${d.covered} of ${elig.total} affected appointment(s)`,
      }));
  }, [branchEligibility, replacementBranchId, id]);

  const replacementDoctorOptions = branchFilteredDoctorOptions ?? replacementOptions;

  const transferSummaryMessage = useMemo(() => {
    const unique = Array.from(new Set(transfers.map((t) => t.result.message).filter(Boolean)));
    if (transfers.length === 1) return unique[0] ?? "";
    if (unique.length === 1) return `${unique[0]} Applies to all ${transfers.length} branch assignment(s).`;
    return unique.join(" ");
  }, [transfers]);

  const doConfirm = async (payload: Omit<ConfirmTransferPayload, "transfer_id">) => {
    if (!id) return;
    if (pendingTransferIds.length === 0) {
      toast({
        title: "Nothing to process",
        description: "No transfer requests are awaiting an action for the affected appointments.",
      });
      return;
    }
    setConfirming(true);
    try {
      const results = await Promise.allSettled(
        pendingTransferIds.map((transferId) =>
          doctorTransferApi.confirmTransfer(id, { ...payload, transfer_id: transferId }),
        ),
      );
      const fulfilled = results.flatMap((r) => (r.status === "fulfilled" ? [r.value.data.data] : []));
      const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");

      if (fulfilled.length === 0) {
        const first = rejected[0]?.reason;
        throw new Error(
          first?.response?.data?.message || first?.message || "Failed to process transfer action",
        );
      }

      setConfirmResult(mergeConfirmResults(fulfilled));
      setConfirmDone(true);
      if (rejected.length > 0) {
        toast({
          title: "Transfer action partially completed",
          description: `Processed ${fulfilled.length} of ${results.length} transfer request(s).`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Transfer action completed",
          description: `Processed ${fulfilled.length} transfer request(s).`,
        });
      }
    } catch (err: any) {
      toast({
        title: "Failed to process transfer action",
        description: err?.response?.data?.message || err?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-[#00488D]" />
      </div>
    );
  }

  if (!roleOk) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center">
        <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[#191C1E]">Access restricted</h2>
        <p className="text-sm text-[#64748B] mt-1">
          Only Super Admin, Head Admin and Branch Admin can transfer doctors.
        </p>
      </div>
    );
  }

  const allCompleted = transfers.length > 0 && transfers.every((t) => t.result.status === "COMPLETED");

  const doneFooter = (onOk: () => void) => (
    <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={() => navigate("/dashboard")}
        className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
      >
        Home
      </button>
      <button
        type="button"
        onClick={onOk}
        className={cn(buttonVariants({ variant: "default" }), "gap-2")}
      >
        OK
      </button>
    </div>
  );

  const doneStats = (rows: { label: string; value: number }[]) => (
    <div className="grid w-full grid-cols-3 gap-2">
      {rows.map((r) => (
        <div key={r.label} className="bg-[#F8FAFC] rounded-lg p-2.5">
          <div className="text-lg font-black text-[#191C1E]">{String(r.value)}</div>
          <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wide">
            {r.label}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-[#E6E8EA] transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4 text-[#475569]" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-[#191C1E]">Transfer Doctor</h1>
          <p className="text-xs text-[#64748B]">
            Reassign, reschedule or cancel future appointments
          </p>
        </div>
        {transfers.length > 0 && (
          <StatusBadge
            tone={allCompleted ? "green" : "amber"}
            status={allCompleted ? "Completed" : "Pending Confirmation"}
          />
        )}
      </div>

      {/* Doctor summary */}
      {doctorSummary && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 mb-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#D6E3FF] flex items-center justify-center font-bold text-[#00488D]">
            {doctorSummary.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm text-[#191C1E]">
              Dr. {doctorSummary.name}
            </div>
            <div className="text-xs text-[#64748B] mt-0.5">
              {doctorSummary.designation} · {doctorSummary.specialization}
            </div>
          </div>
          <StatusBadge status={doctorSummary.active ? "active" : "inactive"} />
        </div>
      )}

      {confirmResult ? (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h2 className="font-bold text-[#191C1E]">Transfer processed</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
            <SummaryStat label="Total affected" value={confirmResult.summary.total} />
            <SummaryStat label="Transferred" value={confirmResult.summary.successful} />
            <SummaryStat label="Queued" value={confirmResult.summary.queued} />
            <SummaryStat label="Conflicts" value={confirmResult.summary.conflicts} />
            <SummaryStat label="Cancelled" value={confirmResult.summary.cancelled} />
          </div>
          {confirmResult.conflicts.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-bold text-[#7B3200] uppercase tracking-wide mb-2">
                Conflicts needing review
              </h3>
              <ul className="text-xs text-[#64748B] space-y-1 list-disc list-inside">
                {confirmResult.conflicts.map((c) => (
                  <li key={c.appointment_id}>
                    {c.appointment_id} — {c.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            onClick={() => {
              setConfirmResult(null);
              setTransfers([]);
            }}
            className="px-4 py-2 rounded-lg bg-[#00488D] text-white text-xs font-semibold hover:bg-[#003A70]"
          >
            Start another transfer
          </button>
        </div>
      ) : transfers.length === 0 ? (
        /* ── STEP 1: initiate form ── */
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 space-y-5">
          <h2 className="font-bold text-sm text-[#191C1E]">1. Transfer details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>From branch</label>
              <div className={`${inputCls} bg-gray-50 text-gray-500 cursor-not-allowed`}>
                {fromBranchNames}
              </div>
            </div>
            <div>
              <label className={labelCls}>Department</label>
              <FormDropdown
                name="new_dept"
                className={inputCls}
                options={departments.map((d) => ({
                  label: d.department_name,
                  value: d.department_id,
                }))}
                value={newDepartmentId}
                onValueChange={setNewDepartmentId}
                placeholder="Select department"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Assign to branch(es)</label>
              <MultiSelectDropdown
                className={inputCls}
                options={branchOptions}
                value={selectedBranchIds}
                onValueChange={handleBranchesChange}
                placeholder={branches.length ? "Select one or more branches" : "No branches available"}
                disabled={branches.length === 0}
              />
              <p className="text-[11px] text-[#94A3B8] mt-1">
                The doctor can be assigned to several branches — each branch gets its own working hours below.
              </p>
            </div>
            <div>
              <label className={labelCls}>Effective date</label>
              <input
                type="date"
                min={todayISODate()}
                className={inputCls}
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Consultation minutes</label>
              <input
                type="number"
                min={1}
                className={inputCls}
                value={consultationMinutes}
                onChange={(e) => setConsultationMinutes(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Transfer reason</label>
              <textarea
                rows={2}
                className={inputCls}
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="Why is this doctor being transferred?"
              />
            </div>
          </div>

          {selectedBranchIds.length > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5">
              <Building2 className="w-4 h-4 text-[#00488D] shrink-0" />
              <p className="text-xs font-medium text-[#00488D]">
                This doctor will be assigned to {selectedBranchIds.length} branch(es) with respective working hours.
              </p>
            </div>
          )}

          {selectedBranchIds.length > 0 && (
            <div className="pt-1">
              <div className="flex items-center justify-between mb-3">
                <label className="text-[12px] font-bold text-[#00488D] uppercase tracking-wide">
                  Working hours per branch
                </label>
              </div>

              {/* Branch tabs */}
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedBranchIds.map((bid) => {
                  const count = (scheduleByBranch[bid] ?? []).length;
                  const active = bid === activeBranchId;
                  return (
                    <button
                      key={bid}
                      type="button"
                      onClick={() => setActiveBranchId(bid)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        active
                          ? "bg-[#00488D] text-white"
                          : "bg-white text-[#475569] border border-gray-200 hover:bg-[#F2F4F6]"
                      }`}
                    >
                      {branchLabelOf(bid)}
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          active ? "bg-white/20 text-white" : "bg-[#E6E8EA] text-[#475569]"
                        }`}
                      >
                        {count} slot{count === 1 ? "" : "s"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active branch editor */}
              {activeBranchId && (
                <div className="rounded-xl border border-[#E5E7EB]">
                  <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-[#F8FAFC] border-b border-[#E5E7EB] rounded-t-xl">
                    <span className="text-xs font-bold text-[#191C1E] truncate">
                      {branchLabelOf(activeBranchId)} — working hours
                    </span>
                    <button
                      type="button"
                      onClick={addScheduleRow}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#00488D] bg-[#D6E3FF] hover:bg-[#C3D6FF] px-3 py-1.5 rounded-lg transition-colors shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add slot
                    </button>
                  </div>
                  {activeSchedule.length === 0 ? (
                    <p className="text-[13px] text-gray-400 px-4 py-3">
                      No working hours for this branch yet — add at least one slot.
                    </p>
                  ) : (
                    <div className="space-y-2.5 p-3">
                      {activeSchedule.map((row) => (
                        <div
                          key={row.id}
                          className="flex flex-wrap items-end gap-3 bg-[#F8FAFC] border border-gray-200 border-l-[4px] border-l-blue-600 rounded-[10px] px-4 py-3"
                        >
                          <div>
                            <label className={labelCls}>Day</label>
                            <FormDropdown
                              name={`day-${row.id}`}
                              className={inputCls + " !h-9 !w-[150px]"}
                              options={DAYS_OF_WEEK}
                              value={row.day_of_week}
                              onValueChange={(v) => updateScheduleRow(row.id, "day_of_week", v)}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Start</label>
                            <TimepickerWheel
                              value={row.start_time}
                              onChange={(v) => updateScheduleRow(row.id, "start_time", v)}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>End</label>
                            <TimepickerWheel
                              value={row.end_time}
                              onChange={(v) => updateScheduleRow(row.id, "end_time", v)}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeScheduleRow(row.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-[6px] border border-red-300 bg-red-50 text-red-600 hover:bg-red-100 ml-1"
                            aria-label="Remove slot"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Collapsed summaries for other branches */}
              {otherBranchIds.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
                  {otherBranchIds.map((bid) => {
                    const rows = scheduleByBranch[bid] ?? [];
                    return (
                      <div
                        key={bid}
                        className="bg-[#F8FAFC] border border-gray-200 rounded-xl p-3"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-[#191C1E]">
                            {branchLabelOf(bid)}
                          </span>
                          <span className="text-[10px] font-semibold text-[#64748B] bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                            {rows.length} slot{rows.length === 1 ? "" : "s"}
                          </span>
                        </div>
                        {rows.length === 0 ? (
                          <p className="text-[11px] text-gray-400">No working hours added yet.</p>
                        ) : (
                          <ul className="text-[11px] text-[#64748B] space-y-0.5">
                            {rows.map((r) => (
                              <li key={r.id}>
                                {dayLabelOf(r.day_of_week)}: {r.start_time || "--:--"} – {r.end_time || "--:--"}
                              </li>
                            ))}
                          </ul>
                        )}
                        <button
                          type="button"
                          onClick={() => setActiveBranchId(bid)}
                          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#00488D] hover:underline"
                        >
                          Configure hours <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-[#475569]"
            >
              Cancel
            </button>
            <button
              onClick={handleInitiate}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#00488D] text-white text-xs font-semibold hover:bg-[#003A70] disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Preview affected appointments
            </button>
          </div>
        </div>
      ) : (
        /* ── STEP 2: affected appointments + action ── */
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <h2 className="font-bold text-sm text-[#191C1E]">
                {combinedAppointments.length} future appointment(s) affected
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {transfers.map((t) => (
                  <span
                    key={t.branchId}
                    className="text-[10px] font-semibold text-[#00488D] bg-[#D6E3FF] px-2 py-1 rounded-full whitespace-nowrap"
                  >
                    {branchLabelOf(t.branchId)} · {t.result.affected_appointment_count ?? 0} affected
                  </span>
                ))}
              </div>
            </div>
            <p className="text-xs text-[#64748B]">{transferSummaryMessage}</p>
          </div>

          {combinedAppointments.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#EEF1F4] text-xs font-bold text-gray-600 uppercase tracking-wide">
                Appointments affected
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-[#F1F5F9]">
                {combinedAppointments.map((a) => (
                  <div key={a.appointment_id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-[#E6E8EA] flex items-center justify-center">
                      <UserRound className="w-4 h-4 text-[#475569]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#191C1E] truncate">
                        {a.patient_name || a.patient_id}
                      </div>
                      <div className="text-xs text-[#64748B]">
                        {a.appointment_date} · {a.appointment_time} · Branch {a.branch_id}
                      </div>
                    </div>
                    {a.eligible_replacement_doctors && a.eligible_replacement_doctors.length > 0 && (
                      <span className="text-[10px] font-semibold text-[#00488D] bg-[#D6E3FF] px-2 py-1 rounded-full whitespace-nowrap">
                        {a.eligible_replacement_doctors.length} replacement available
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {combinedAppointments.length === 0 ? (
            <div className="flex items-center justify-between gap-3 bg-white rounded-xl border border-[#E5E7EB] p-4">
              <div>
                <p className="text-xs font-semibold text-[#191C1E]">
                  No future appointments were affected
                </p>
                <p className="text-xs text-[#64748B] mt-0.5">
                  The doctor was assigned to the selected branch(es) immediately — nothing to transfer, reschedule or cancel.
                </p>
              </div>
              <button
                onClick={() => navigate("/dashboard")}
                className="px-4 py-2 rounded-lg bg-[#00488D] text-white text-xs font-semibold hover:bg-[#003A70] shrink-0"
              >
                Home
              </button>
            </div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ActionCard
              title="Transfer to replacement"
              description="Reassign every appointment to another doctor of the same department with a slot for the same day."
              tone="blue"
              onClick={() => {
                setConfirmDone(false);
                setReplacementEmployeeId("");
                setReplacementBranchId(defaultReplacementBranchId);
                setReplacementOpen(true);
              }}
            />
            <ActionCard
              title="Reschedule required"
              description="Flag appointments as Reschedule Required — they'll be reassigned later via the Edit Appointment form."
              tone="amber"
              onClick={() => {
                setConfirmDone(false);
                setRescheduleOpen(true);
              }}
            />
            <ActionCard
              title="Cancel appointments"
              description="Bulk-cancel the affected appointments and optionally notify patients."
              tone="red"
              onClick={() => {
                setConfirmDone(false);
                setCancelOpen(true);
              }}
            />
          </div>
          )}
        </div>
      )}

      {/* Replacement doctor dialog */}
      <ConfirmationDialog
        open={replacementOpen}
        type={confirmDone ? "success" : "info"}
        title={confirmDone ? "Transfer appointments processed" : "Transfer to a replacement doctor"}
        description={
          confirmDone
            ? "The affected appointments have been reassigned where possible. Full details are shown on the page behind this window."
            : "Pick a doctor from the same department. Each appointment is only reassigned where the replacement has a matching slot for the same day."
        }
        confirmText="Transfer appointments"
        loading={confirming}
        hideCancelButton={confirmDone}
        showCloseButton={!confirmDone}
        footer={confirmDone ? doneFooter(() => {
          setConfirmDone(false);
          setReplacementOpen(false);
        }) : undefined}
        onConfirm={() => {
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
          doConfirm({
            action: "TRANSFER",
            replacement_employee_id: replacementEmployeeId,
            replacement_branch_id: replacementBranchId || undefined,
          });
        }}
        onCancel={() => {
          setConfirmDone(false);
          setReplacementOpen(false);
        }}
      >
        {confirmDone ? (
          <div className="w-full">
            {doneStats([
              { label: "Total", value: confirmResult?.summary.total ?? 0 },
              { label: "Transferred", value: confirmResult?.summary.successful ?? 0 },
              { label: "Conflicts", value: confirmResult?.summary.conflicts ?? 0 },
            ])}
          </div>
        ) : (
        <div className="w-full space-y-3 text-left">
          <div>
            <label className={labelCls}>Replace at branch</label>
            <FormDropdown
              name="replacement_branch"
              className={
                replacementBranchId === defaultReplacementBranchId && defaultReplacementBranchId
                  ? "w-full bg-blue-50 border border-blue-500 rounded-xl px-3 py-2 text-sm text-[#00488D] focus:outline-none focus:ring-2 focus:ring-[#00488D]/30"
                  : inputCls
              }
              options={replacementBranchOptions}
              value={replacementBranchId}
              onValueChange={(v) => {
                setReplacementBranchId(v);
                if (v && branchEligibility[v]) {
                  const allowed = new Set(
                    Array.from(branchEligibility[v].doctors.values())
                      .filter((d) => d.employee_id !== id)
                      .map((d) => d.employee_id),
                  );
                  if (!allowed.has(replacementEmployeeId)) setReplacementEmployeeId("");
                }
              }}
              placeholder="Select branch"
            />
            {replacementBranchId === defaultReplacementBranchId && defaultReplacementBranchId && (
              <p className="text-[11px] text-blue-600 mt-1">
                Defaults to the branch the doctor left — changeable.
              </p>
            )}
          </div>
          <div>
            <label className={labelCls}>Replacement doctor</label>
            <FormDropdown
              name="replacement"
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
                  No doctor from the same department works at {branchLabelOf(replacementBranchId)} on the affected date(s).
                </p>
              ) : (
                <p className="text-[11px] text-[#94A3B8] mt-1">
                  Showing {branchFilteredDoctorOptions.length} doctor(s) working at{" "}
                  {branchLabelOf(replacementBranchId)} on the affected date(s) — only these are listed.
                </p>
              )
            ) : (
              <p className="text-[11px] text-[#94A3B8] mt-1">
                No affected appointments to filter by — showing all {replacementOptions.length} doctor(s) in the department.
              </p>
            )}
          </div>
        </div>
        )}
      </ConfirmationDialog>

      {/* Reschedule dialog */}
      <ConfirmationDialog
        open={rescheduleOpen}
        type={confirmDone ? "success" : "warning"}
        title={confirmDone ? "Reschedule queue updated" : "Flag appointments as Reschedule Required"}
        description={
          confirmDone
            ? "The affected appointments have been queued for reassignment. Full details are shown on the page behind this window."
            : "The affected appointments will be unlinked from the doctor and queued for reassignment. You will pick a doctor later in the Edit Appointment form."
        }
        confirmText="Queue for reschedule"
        loading={confirming}
        hideCancelButton={confirmDone}
        showCloseButton={!confirmDone}
        footer={confirmDone ? doneFooter(() => {
          setConfirmDone(false);
          setRescheduleOpen(false);
        }) : undefined}
        onConfirm={() => {
          doConfirm({
            action: "RESCHEDULE",
            priority,
            reason: rescheduleReason.trim() || transferReason,
          });
        }}
        onCancel={() => {
          setConfirmDone(false);
          setRescheduleOpen(false);
        }}
      >
        {confirmDone ? (
          <div className="w-full">
            {doneStats([
              { label: "Total", value: confirmResult?.summary.total ?? 0 },
              { label: "Queued", value: confirmResult?.summary.queued ?? 0 },
              { label: "Conflicts", value: confirmResult?.summary.conflicts ?? 0 },
            ])}
          </div>
        ) : (
        <div className="w-full space-y-3 text-left">
          <div>
            <label className={labelCls}>Priority</label>
            <FormDropdown
              name="priority"
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
      </ConfirmationDialog>

      {/* Cancel dialog */}
      <ConfirmationDialog
        open={cancelOpen}
        type={confirmDone ? "success" : "danger"}
        title={confirmDone ? "Appointments cancelled" : "Cancel all affected appointments?"}
        description={
          confirmDone
            ? "The affected appointments have been cancelled. Full details are shown on the page behind this window."
            : "This will mark every affected future appointment as cancelled. Patients can be notified via the channels below."
        }
        confirmText="Cancel appointments"
        loading={confirming}
        hideCancelButton={confirmDone}
        showCloseButton={!confirmDone}
        footer={confirmDone ? doneFooter(() => {
          setConfirmDone(false);
          setCancelOpen(false);
        }) : undefined}
        onConfirm={() => {
          if (!cancelConfirm) {
            toast({ title: "Please confirm to proceed", variant: "destructive" });
            return;
          }
          doConfirm({
            action: "CANCEL",
            confirm: true,
            notify_channels: notifyChannels,
          });
        }}
        onCancel={() => {
          setConfirmDone(false);
          setCancelOpen(false);
        }}
      >
        {confirmDone ? (
          <div className="w-full">
            {doneStats([
              { label: "Total", value: confirmResult?.summary.total ?? 0 },
              { label: "Cancelled", value: confirmResult?.summary.cancelled ?? 0 },
              { label: "Conflicts", value: confirmResult?.summary.conflicts ?? 0 },
            ])}
          </div>
        ) : (
        <div className="w-full space-y-3 text-left">
          <label className="flex items-center gap-2 text-sm font-medium text-[#191C1E]">
            <input
              type="checkbox"
              checked={cancelConfirm}
              onChange={(e) => setCancelConfirm(e.target.checked)}
              className="accent-[#00488D]"
            />
            I understand this is permanent
          </label>
          <div>
            <label className={labelCls}>Notify patients via (optional)</label>
            <div className="flex flex-wrap gap-2">
              {NOTIFY_CHANNELS.map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() =>
                    setNotifyChannels((p) =>
                      p.includes(ch) ? p.filter((x) => x !== ch) : [...p, ch],
                    )
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    notifyChannels.includes(ch)
                      ? "bg-[#00488D] text-white border-[#00488D]"
                      : "bg-white text-[#475569] border-[#E5E7EB]"
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>
        </div>
        )}
      </ConfirmationDialog>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-[#F8FAFC] rounded-lg p-3">
      <div className="text-xl font-black text-[#191C1E]">{String(value)}</div>
      <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}

function ActionCard({
  title,
  description,
  tone,
  onClick,
}: {
  title: string;
  description: string;
  tone: "blue" | "amber" | "red";
  onClick: () => void;
}) {
  const toneClasses = {
    blue: "border-blue-200 hover:border-blue-400 bg-blue-50",
    amber: "border-amber-200 hover:border-amber-400 bg-amber-50",
    red: "border-red-200 hover:border-red-400 bg-red-50",
  };
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl border p-4 transition-colors ${toneClasses[tone]}`}
    >
      <div className="font-bold text-sm mb-1 text-[#191C1E]">{title}</div>
      <p className="text-xs text-[#64748B] leading-relaxed">{description}</p>
    </button>
  );
}
