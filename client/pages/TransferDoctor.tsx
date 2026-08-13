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
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { FormDropdown } from "@/components/ui/form-dropdown";
import TimepickerWheel from "@/components/ui/timepicker-wheel";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { StatusBadge } from "@/components/hms/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  employeeApi,
  EmployeeDetailResponse,
  EmployeeRecord,
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
  transferId: string;
  fromBranchId: string;
  toBranchId: string;
  effectiveDate: string;
  result: InitiateTransferResult;
}

interface BranchTransferDetails {
  departmentId: string;
  effectiveDate: string;
  consultationMinutes: string;
  transferReason: string;
}

function todayISODate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
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
  const [submitting, setSubmitting] = useState(false);

  const defaultBranchDetails = (): BranchTransferDetails => ({
    departmentId: employee?.employee.department_id || "",
    effectiveDate: todayISODate(),
    consultationMinutes: employee?.doctorProfile?.consultation_minutes
      ? String(employee.doctorProfile.consultation_minutes)
      : "20",
    transferReason: "",
  });

  // Sequential single-transfer state
  const [fromBranchId, setFromBranchId] = useState<string>(""); // Doctor's current branch (from employee.branches)
  const [toBranchId, setToBranchId] = useState<string>("");     // Target branch for transfer
  const [details, setDetails] = useState<BranchTransferDetails>(defaultBranchDetails());
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [recentTransfers, setRecentTransfers] = useState<BranchTransfer[]>([]);

  // Step 2 modal — which recent transfer is being viewed
  const [viewingTransferId, setViewingTransferId] = useState<string | null>(null);

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
          // Initialize default details from doctor's current profile
          const seededDetails: BranchTransferDetails = {
            departmentId: detail.employee.department_id || "",
            effectiveDate: todayISODate(),
            consultationMinutes: detail.doctorProfile?.consultation_minutes
              ? String(detail.doctorProfile.consultation_minutes)
              : "20",
            transferReason: "",
          };
          setDetails(seededDetails);
          // schedules start empty - user will add them for the toBranch
          setSchedules([]);
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

  // Doctor's currently assigned branches (from user_branch_mapping) - for From Branch dropdown
  const fromBranchOptions = useMemo(
    () =>
      (employee?.branches ?? []).map((b) => ({
        label: `${b.branch_name || b.branch_id}`,
        value: b.branch_id,
      })),
    [employee],
  );

  // All branches except the selected From Branch - for To Branch dropdown
  const toBranchOptions = useMemo(
    () =>
      branches
        .filter((b) => b.branch_id !== fromBranchId)
        .map((b) => ({
          label: `${b.branch_name || b.branch_id}`,
          value: b.branch_id,
        })),
    [branches, fromBranchId],
  );

  const branchLabelOf = (branchId: string | undefined | null) => {
    if (!branchId) return "—";
    const b = branches.find((x) => x.branch_id === branchId);
    if (!b) return branchId;
    return b.branch_name ? b.branch_name : b.branch_id;
  };

  // Reset form after successful transfer (reset both From and To)
  const resetForm = () => {
    setFromBranchId("");
    setToBranchId("");
    setDetails(defaultBranchDetails());
    setSchedules([]);
  };

  // Add schedule row for the current toBranch
  const addScheduleRow = () => {
    if (!toBranchId) return;
    setSchedules((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        day_of_week: "MONDAY",
        start_time: "",
        end_time: "",
        branch_id: toBranchId,
      },
    ]);
  };

  // Update schedule row
  const updateScheduleRow = (rowId: string, field: keyof ScheduleEntry, value: string) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === rowId ? { ...s, [field]: value } : s)),
    );
  };

  // Remove schedule row
  const removeScheduleRow = (rowId: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== rowId));
  };

  // Update form details
  const updateDetails = (field: keyof BranchTransferDetails, value: string) => {
    setDetails((prev) => ({ ...prev, [field]: value }));
  };

  // Handle From Branch change - reset To Branch and schedules
  const handleFromBranchChange = (branchId: string) => {
    setFromBranchId(branchId);
    setToBranchId(""); // Reset To Branch when From Branch changes
    setSchedules([]);  // Clear schedules since they're tied to To Branch
  };

  // Handle To Branch change - reset schedules
  const handleToBranchChange = (branchId: string) => {
    setToBranchId(branchId);
    setSchedules([]); // Clear schedules for new branch
  };

  const handleInitiate = async () => {
    if (!id) return;
    if (!fromBranchId) {
      toast({ title: "Select From Branch", variant: "destructive" });
      return;
    }
    if (!toBranchId) {
      toast({ title: "Select To Branch", variant: "destructive" });
      return;
    }
    if (!details.effectiveDate) {
      toast({ title: "Effective date is required", variant: "destructive" });
      return;
    }
    if (!details.transferReason.trim()) {
      toast({ title: "Transfer reason is required", variant: "destructive" });
      return;
    }
    if (schedules.length === 0) {
      toast({
        title: `Add working hours for ${branchLabelOf(toBranchId)}`,
        description: "At least one working hour slot is required.",
        variant: "destructive",
      });
      return;
    }
    for (const row of schedules) {
      if (!row.start_time || !row.end_time) {
        toast({
          title: `Every slot needs both a start and end time`,
          variant: "destructive",
        });
        return;
      }
      if (row.start_time >= row.end_time) {
        toast({
          title: `Start time must be before end time`,
          variant: "destructive",
        });
        return;
      }
    }

    const payload: InitiateTransferPayload = {
      new_branch_id: toBranchId,
      new_department_id: details.departmentId || undefined,
      effective_date: details.effectiveDate,
      transfer_reason: details.transferReason.trim(),
      working_hours: schedules.map((s) => ({
        branch_id: s.branch_id,
        day_of_week: s.day_of_week as InitiateTransferPayload["working_hours"][number]["day_of_week"],
        shift_name: Number(s.start_time.split(":")[0]) < 12 ? "Morning" : "Evening",
        start_time: s.start_time,
        end_time: s.end_time,
      })),
      consultation_minutes: Number(details.consultationMinutes) || 20,
    };

    setSubmitting(true);
    try {
      const res = await doctorTransferApi.initiateTransfer(id, payload);
      const newTransfer: BranchTransfer = {
        transferId: res.data.data.transfer_id,
        fromBranchId,
        toBranchId,
        effectiveDate: details.effectiveDate,
        result: res.data.data,
      };
      // Add to recent transfers list
      setRecentTransfers((prev) => [newTransfer, ...prev]);
      // Reset form for next transfer (reset both From and To)
      resetForm();

      const allCompleted = newTransfer.result.status === "COMPLETED";
      toast({
        title: allCompleted ? "Transfer completed" : "Transfer request created",
        description: `Transfer initiated for ${branchLabelOf(fromBranchId)} → ${branchLabelOf(toBranchId)}.`,
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

  // The recent transfer whose details are open in the Step 2 modal
  const viewingTransfer = useMemo(
    () => recentTransfers.find((t) => t.transferId === viewingTransferId) ?? null,
    [recentTransfers, viewingTransferId],
  );

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

  const combinedAppointments = useMemo(
    () => viewingTransfer?.result.appointments ?? [],
    [viewingTransfer],
  );

  const branchAppointmentCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of viewingTransfer?.result.appointments ?? []) {
      if (!a.branch_id) continue;
      counts.set(a.branch_id, (counts.get(a.branch_id) ?? 0) + 1);
    }
    return counts;
  }, [viewingTransfer]);

  const defaultReplacementBranchId = useMemo(() => {
    let best: string | null = null;
    let bestCount = 0;
    for (const [bid, count] of branchAppointmentCounts) {
      if (count > bestCount) {
        best = bid;
        bestCount = count;
      }
    }
    return best ?? viewingTransfer?.fromBranchId ?? employee?.employee.branch_id ?? "";
  }, [branchAppointmentCounts, viewingTransfer, employee]);

  const branchEligibility = useMemo(() => {
    const acc: Record<
      string,
      {
        total: number;
        doctors: Map<string, { employee_id: string; name: string; covered: number }>;
      }
    > = {};
    for (const a of viewingTransfer?.result.appointments ?? []) {
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
  }, [viewingTransfer]);

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

  const transferSummaryMessage = viewingTransfer?.result.message ?? "";

  const doConfirm = async (payload: Omit<ConfirmTransferPayload, "transfer_id">) => {
    if (!id || !viewingTransfer) return;
    if (viewingTransfer.result.status !== "PENDING_CONFIRMATION") {
      toast({
        title: "Nothing to process",
        description: "This transfer has already been completed.",
      });
      return;
    }
    setConfirming(true);
    try {
      const res = await doctorTransferApi.confirmTransfer(id, {
        ...payload,
        transfer_id: viewingTransfer.result.transfer_id,
      });
      setConfirmResult(res.data.data);
      setConfirmDone(true);
      // Mark the transfer as completed in the recent transfers list
      setRecentTransfers((prev) =>
        prev.map((t) =>
          t.transferId === viewingTransfer.result.transfer_id
            ? { ...t, result: { ...t.result, status: "COMPLETED" } }
            : t,
        ),
      );
      toast({
        title: "Transfer action completed",
        description: `Processed ${res.data.data.summary.total} appointment(s).`,
      });
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

  const closeViewingModal = () => {
    setViewingTransferId(null);
    setConfirmResult(null);
    setConfirmDone(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
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
        {recentTransfers.length > 0 && (
          <StatusBadge
            tone={recentTransfers[0].result.status === "COMPLETED" ? "green" : "amber"}
            status={
              recentTransfers[0].result.status === "COMPLETED"
                ? "Completed"
                : "Pending Confirmation"
            }
          />
        )}
      </div>

      {/* Doctor summary */}
      {doctorSummary && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 flex items-center gap-4">
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

      {/* ── STEP 1: New Transfer ── */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 space-y-5">
        <h2 className="font-bold text-sm text-[#191C1E]">1. New Transfer</h2>

        {/* From Branch / To Branch */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>From branch (current)</label>
            <FormDropdown
              name="from-branch"
              className={inputCls}
              options={fromBranchOptions}
              value={fromBranchId}
              onValueChange={handleFromBranchChange}
              placeholder="Select from branch"
              emptyMessage="No branches assigned to this doctor"
            />
          </div>
          <div>
            <label className={labelCls}>To branch</label>
            <FormDropdown
              name="to-branch"
              className={inputCls}
              options={toBranchOptions}
              value={toBranchId}
              onValueChange={handleToBranchChange}
              disabled={!fromBranchId}
              placeholder={fromBranchId ? "Select to branch" : "Select from branch first"}
              emptyMessage="No other branches available"
            />
          </div>
        </div>

        {/* Department / Effective Date / Consultation Minutes / Reason */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Department</label>
            <FormDropdown
              name="department"
              className={inputCls}
              options={departments.map((d) => ({
                label: d.department_name,
                value: d.department_id,
              }))}
              value={details.departmentId}
              onValueChange={(v) => updateDetails("departmentId", v)}
              placeholder="Select department"
            />
          </div>
          <div>
            <label className={labelCls}>Effective date</label>
            <input
              type="date"
              min={todayISODate()}
              className={inputCls}
              value={details.effectiveDate}
              onChange={(e) => updateDetails("effectiveDate", e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Consultation minutes</label>
            <input
              type="number"
              min={1}
              className={inputCls}
              value={details.consultationMinutes}
              onChange={(e) => updateDetails("consultationMinutes", e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Transfer reason</label>
            <textarea
              rows={2}
              className={inputCls}
              value={details.transferReason}
              onChange={(e) => updateDetails("transferReason", e.target.value)}
              placeholder="Why is this doctor being transferred?"
            />
          </div>
        </div>

        {/* Working hours for the destination branch */}
        <div className="border-t border-[#E5E7EB] pt-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[11px] font-bold text-[#00488D] uppercase tracking-wide">
              Working hours for {toBranchId ? branchLabelOf(toBranchId) : "the destination branch"}
            </span>
            <button
              type="button"
              onClick={addScheduleRow}
              disabled={!toBranchId}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#00488D] bg-[#D6E3FF] hover:bg-[#C3D6FF] px-3 py-1.5 rounded-lg transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-3.5 h-3.5" /> Add slot
            </button>
          </div>
          {!toBranchId ? (
            <p className="text-[13px] text-gray-400">
              Select a To Branch first — working hours are tied to the destination branch.
            </p>
          ) : schedules.length === 0 ? (
            <p className="text-[13px] text-gray-400">
              No working hours for this branch yet — add at least one slot.
            </p>
          ) : (
            <div className="space-y-2.5">
              {schedules.map((row) => (
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

        <div className="flex flex-col gap-3 border-t border-[#E5E7EB] pt-4 sm:flex-row sm:items-center sm:justify-end">
          <div className="flex items-center gap-3 shrink-0">
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
      </div>

      {/* ── Recent Transfers ── */}
      {recentTransfers.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#EEF1F4] text-xs font-bold text-gray-600 uppercase tracking-wide">
            Recent Transfers
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {recentTransfers.map((t) => (
              <div key={t.transferId} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#191C1E] flex items-center gap-1.5 flex-wrap">
                    <span>{branchLabelOf(t.fromBranchId)}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8] shrink-0" />
                    <span>{branchLabelOf(t.toBranchId)}</span>
                  </div>
                  <div className="text-xs text-[#64748B] mt-0.5">{t.effectiveDate}</div>
                </div>
                <StatusBadge
                  tone={t.result.status === "COMPLETED" ? "green" : "amber"}
                  status={t.result.status === "COMPLETED" ? "Completed" : "Pending Confirmation"}
                />
                <button
                  onClick={() => {
                    setConfirmResult(null);
                    setConfirmDone(false);
                    setViewingTransferId(t.transferId);
                  }}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#00488D] bg-[#D6E3FF] hover:bg-[#C3D6FF] transition-colors"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 2 modal: affected appointments + action ── */}
      <Dialog open={viewingTransfer !== null} onOpenChange={(open) => { if (!open) closeViewingModal(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transfer Details</DialogTitle>
            <DialogDescription className="text-xs">
              {branchLabelOf(viewingTransfer?.fromBranchId)} → {branchLabelOf(viewingTransfer?.toBranchId)}
              {" · effective "}
              {viewingTransfer?.effectiveDate}
            </DialogDescription>
          </DialogHeader>

          {confirmResult ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h2 className="font-bold text-[#191C1E]">Transfer processed</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <SummaryStat label="Total affected" value={confirmResult.summary.total} />
                <SummaryStat label="Transferred" value={confirmResult.summary.successful} />
                <SummaryStat label="Queued" value={confirmResult.summary.queued} />
                <SummaryStat label="Conflicts" value={confirmResult.summary.conflicts} />
                <SummaryStat label="Cancelled" value={confirmResult.summary.cancelled} />
              </div>
              {confirmResult.conflicts.length > 0 && (
                <div>
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
                onClick={closeViewingModal}
                className="px-4 py-2 rounded-lg bg-[#00488D] text-white text-xs font-semibold hover:bg-[#003A70]"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <h2 className="font-bold text-sm text-[#191C1E]">
                  {combinedAppointments.length} future appointment(s) affected
                </h2>
                <span className="text-[10px] font-semibold text-[#00488D] bg-[#D6E3FF] px-2 py-1 rounded-full whitespace-nowrap">
                  {branchLabelOf(viewingTransfer?.toBranchId)} · {viewingTransfer?.result.affected_appointment_count ?? 0} affected
                </span>
              </div>
              <p className="text-xs text-[#64748B]">{transferSummaryMessage}</p>

              {combinedAppointments.length > 0 && (
                <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#EEF1F4] text-xs font-bold text-gray-600 uppercase tracking-wide">
                    Appointments affected
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-[#F1F5F9]">
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
                            {a.appointment_date} · {a.appointment_time} · Branch {branchLabelOf(a.branch_id)}
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
                      The doctor was assigned to the selected branch immediately — nothing to transfer, reschedule or cancel.
                    </p>
                  </div>
                  <button
                    onClick={closeViewingModal}
                    className="px-4 py-2 rounded-lg bg-[#00488D] text-white text-xs font-semibold hover:bg-[#003A70] shrink-0"
                  >
                    Done
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
        </DialogContent>
      </Dialog>

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
            reason: rescheduleReason.trim() || details.transferReason || "",
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
