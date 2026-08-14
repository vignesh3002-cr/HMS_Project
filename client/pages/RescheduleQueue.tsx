import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  UserRound,
  CheckCircle2,
  CalendarClock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormDropdown } from "@/components/ui/form-dropdown";
import TimepickerWheel from "@/components/ui/timepicker-wheel";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { StatusBadge } from "@/components/hms/StatusBadge";
import {
  doctorTransferApi,
  RescheduleQueueEntry,
} from "@/api/doctorTransfer.api";
import { branchApi, Branch } from "@/api/branch.api";
import { employeeApi, EmployeeRecord, DoctorScheduleRecord } from "@/api/employee.api";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getUser } from "@/utils/token";

const TRANSFER_ADMIN_ROLES = ["HEAD_ADMIN", "SUPER_ADMIN", "BRANCH_ADMIN"];

const STATUS_FILTERS = [
  { label: "All status", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Assigned", value: "ASSIGNED" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const QUEUE_TONE: Record<string, "amber" | "blue" | "green" | "red"> = {
  PENDING: "amber",
  ASSIGNED: "blue",
  CONFIRMED: "green",
  CANCELLED: "red",
};

const PRIORITY_TONE: Record<string, "slate" | "amber" | "red"> = {
  NORMAL: "slate",
  HIGH: "amber",
  URGENT: "red",
};

const PAGE_SIZE = 10;

const labelCls = "text-[10.5px] font-bold text-blue-600 uppercase tracking-[0.04em] mb-1.5 block";
const inputCls =
  "w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#191C1E] focus:outline-none focus:ring-2 focus:ring-[#00488D]/30";

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${String(d.getUTCDate()).padStart(2, "0")} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function formatTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

function toDateInputValue(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

function todayISODate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

const DAY_OF_WEEK_NAMES = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;

function dayOfWeekOf(dateStr: string): string {
  if (!dateStr) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (m) return DAY_OF_WEEK_NAMES[new Date(+m[1], +m[2] - 1, +m[3]).getDay()];
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? "" : DAY_OF_WEEK_NAMES[d.getDay()];
}

function dayLabelOf(day: string): string {
  return day ? day.charAt(0) + day.slice(1).toLowerCase() : day;
}

function patientNameOf(entry: RescheduleQueueEntry): string {
  const p = entry.patient_bio_data;
  return [p?.patient_first_name, p?.patient_last_name].filter(Boolean).join(" ") || entry.patient_id;
}

export default function RescheduleQueue() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [roleOk, setRoleOk] = useState(false);
  const [loading, setLoading] = useState(true);

  const [entries, setEntries] = useState<RescheduleQueueEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  const [statusFilter, setStatusFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [search, setSearch] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [doctors, setDoctors] = useState<EmployeeRecord[]>([]);

  // Action dialogs
  const [assignTarget, setAssignTarget] = useState<RescheduleQueueEntry | null>(null);
  const [assignDoctorId, setAssignDoctorId] = useState("");
  const [assignBranchId, setAssignBranchId] = useState("");
  const [assignDepartmentId, setAssignDepartmentId] = useState("");
  const [assignDate, setAssignDate] = useState("");
  const [assignTime, setAssignTime] = useState("");
  const [assignReason, setAssignReason] = useState("");
  const [assignDone, setAssignDone] = useState(false);
  const [assignDoneMessage, setAssignDoneMessage] = useState("");
  const [doctorSchedulesById, setDoctorSchedulesById] = useState<Record<string, DoctorScheduleRecord[]>>({});
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [schedulesLoaded, setSchedulesLoaded] = useState(false);
  const [departmentOptions, setDepartmentOptions] = useState<{ department_id: string; department_name: string }[]>([]);
  const [countsLoading, setCountsLoading] = useState(false);
  const [autoSuggestedDoctorId, setAutoSuggestedDoctorId] = useState("");

  const [confirmTarget, setConfirmTarget] = useState<RescheduleQueueEntry | null>(null);
  const [confirmReason, setConfirmReason] = useState("");

  const [cancelTarget, setCancelTarget] = useState<RescheduleQueueEntry | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const user = getUser();
    const role = (user?.role_type || user?.role || "").toUpperCase();
    setRoleOk(TRANSFER_ADMIN_ROLES.includes(role));
  }, []);

  useEffect(() => {
    if (!roleOk) return;
    const initial = async () => {
      try {
        const [branchRes, docRes] = await Promise.all([
          branchApi.getAll(),
          employeeApi.getAll({ roleType: "DOCTOR", limit: 500 }),
        ]);
        setBranches(branchRes.data?.data || branchRes.data?.branches || []);
        setDoctors(docRes.data?.data?.employees || []);
      } catch (err) {
        console.error("[RescheduleQueue] Init error", err);
      }
    };
    initial();
  }, [roleOk]);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await doctorTransferApi.getRescheduleQueue({
        status: statusFilter || undefined,
        branchId: branchFilter || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setEntries(res.data.data.entries || []);
      setTotal(res.data.data.total ?? 0);
      setTotalPages(res.data.data.totalPages ?? 1);
    } catch (err: any) {
      toast({
        title: "Failed to load reschedule queue",
        description: err?.response?.data?.message || err?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, branchFilter, page, toast]);

  useEffect(() => {
    if (roleOk) fetchQueue();
  }, [roleOk, fetchQueue]);

  const doctorNameById = useCallback(
    (id?: string | null) => {
      if (!id) return null;
      const doc = doctors.find((d) => d.employee_id === id);
      if (!doc) return id;
      return `Dr. ${[doc.first_name, doc.middle_name, doc.last_name].filter(Boolean).join(" ")}`;
    },
    [doctors],
  );

  const branchLabelOf = useCallback(
    (branchId: string) => {
      const b = branches.find((x) => x.branch_id === branchId);
      return b?.branch_name ? `${b.branch_name} (${branchId})` : branchId;
    },
    [branches],
  );

const assignDay = useMemo(() => dayOfWeekOf(assignDate), [assignDate]);

  // Exact time string in HH:MM format for schedule comparison
  const assignTimeOfDay = useMemo(() => {
    if (!assignTime) return "";
    return assignTime.length === 5 ? assignTime : assignTime.slice(0, 5);
  }, [assignTime]);

  const assignDoctorFiltering = useMemo(
    () => schedulesLoaded && !!assignDepartmentId && !!assignDay,
    [schedulesLoaded, assignDepartmentId, assignDay],
  );

  const isAssignDoctorEligible = useCallback(
    (doctorId: string, branchId: string, day: string, targetTime?: string) =>
      (doctorSchedulesById[doctorId] || []).some(
        (s) =>
          s.is_active !== false &&
          s.branch_id === branchId &&
          s.day_of_week === day &&
          (!targetTime || (s.start_time && s.end_time && s.start_time <= targetTime && s.end_time > targetTime)),
      ),
    [doctorSchedulesById],
  );

  // Department options for the selected branch (derived from doctors at that branch)
  const branchDepartmentOptions = useMemo(() => {
    if (!assignBranchId) return [];
    const deptMap = new Map<string, string>();
    doctors
      .filter((d) => d.emp_status !== false && d.branch_id === assignBranchId)
      .forEach((d) => {
        if (d.department_id && !deptMap.has(d.department_id)) {
          const deptName = d.department_master?.department_name || d.department_id;
          deptMap.set(d.department_id, deptName);
        }
      });
    // Keep the defaulted department listed even when no active doctors remain at the
    // branch, so the dropdown shows the appointment's department instead of the placeholder.
    if (assignDepartmentId && !deptMap.has(assignDepartmentId)) {
      const deptDoc = doctors.find((d) => d.department_id === assignDepartmentId);
      deptMap.set(
        assignDepartmentId,
        deptDoc?.department_master?.department_name || assignDepartmentId,
      );
    }
    return Array.from(deptMap.entries()).map(([department_id, department_name]) => ({
      department_id,
      department_name,
    }));
  }, [assignBranchId, assignDepartmentId, doctors]);

  const assignBranchOptions = useMemo(
    () =>
      branches.map((b) => ({
        label: `${b.branch_id}${b.branch_name ? ` - ${b.branch_name}` : ""}`,
        value: b.branch_id,
        highlight: b.branch_id === assignTarget?.branch_id,
        badge: b.branch_id === assignTarget?.branch_id ? "Appointment's branch" : undefined,
      })),
    [branches, assignTarget],
  );
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      const name = [e.patient_bio_data?.patient_first_name, e.patient_bio_data?.patient_last_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const mobile = e.patient_bio_data?.patient_primary_mobile?.toLowerCase() || "";
      const pid = e.patient_id.toLowerCase();
      return name.includes(q) || mobile.includes(q) || pid.includes(q);
    });
  }, [entries, search]);

  // Compute doctor appointment counts from queue entries (frontend-only load balancing)
  const doctorQueueCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((entry) => {
      if (entry.assigned_employee_id && entry.status !== "CANCELLED") {
        counts[entry.assigned_employee_id] = (counts[entry.assigned_employee_id] || 0) + 1;
      }
    });
    return counts;
  }, [filtered]);

  const assignDoctorOptions = useMemo(() => {
    const active = doctors.filter((d) => d.emp_status !== false);
    const labelOf = (d: EmployeeRecord) =>
      `Dr. ${[d.first_name, d.middle_name, d.last_name].filter(Boolean).join(" ")}`;

    // Base filter: always apply branch + department when selected
    let eligible = active;
    if (assignBranchId) {
      eligible = eligible.filter((d) => d.branch_id === assignBranchId);
    }
    if (assignDepartmentId) {
      eligible = eligible.filter((d) => d.department_id === assignDepartmentId);
    }

    // Time/schedule filter when branch + department + day are ready
    if (assignDoctorFiltering) {
      eligible = eligible.filter((d) =>
        isAssignDoctorEligible(d.employee_id, assignBranchId, assignDay, assignTimeOfDay || undefined),
      );
    }

    // Sort by queue count (ascending) for auto-suggestion
    const withCounts = eligible.map((d) => ({
      ...d,
      queueCount: doctorQueueCounts[d.employee_id] || 0,
    }));
    withCounts.sort((a, b) => a.queueCount - b.queueCount);
    return withCounts.map((d) => ({
      label: labelOf(d),
      value: d.employee_id,
      badge: d.queueCount === 0 ? "Lowest load" : `${d.queueCount} queued`,
    }));
  }, [
    doctors,
    assignDoctorFiltering,
    isAssignDoctorEligible,
    assignBranchId,
    assignDay,
    assignTimeOfDay,
    assignDepartmentId,
  ]);

  const openAssign = (entry: RescheduleQueueEntry) => {
    setAssignDoctorId("");
    setAssignBranchId(entry.branch_id);
    const defaultDepartmentId =
      entry.department_id ||
      doctors.find((d) => d.employee_id === entry.employee_id)?.department_id ||
      "";
    setAssignDepartmentId(defaultDepartmentId);
    setAssignDate(entry.old_appointment_date ? toDateInputValue(entry.old_appointment_date) : todayISODate());
    setAssignTime(entry.old_appointment_time ? formatTime(entry.old_appointment_time) : "");
    setAssignReason("");
    setAssignDone(false);
    setAssignDoneMessage("");
    setAutoSuggestedDoctorId("");
    setAssignTarget(entry);
    if (entry.department_id) {
      const needIds = doctors
        .filter((d) => d.emp_status !== false && d.department_id === entry.department_id)
        .map((d) => d.employee_id)
        .filter((id) => !doctorSchedulesById[id]);
      if (needIds.length === 0) {
        setSchedulesLoaded(true);
        return;
      }
      setSchedulesLoading(true);
      setSchedulesLoaded(false);
      Promise.all(needIds.map((id) => employeeApi.getOne(id)))
        .then((resps) => {
          setDoctorSchedulesById((prev) => {
            const next = { ...prev };
            resps.forEach((r, i) => {
              const id = needIds[i];
              next[id] = (r.data?.data?.doctorSchedules || []).filter(
                (s) => s.is_active !== false && s.branch_id,
              );
            });
            return next;
          });
        })
        .catch((err) => {
          console.error("[RescheduleQueue] Failed to load doctor schedules", err);
          setSchedulesLoaded(false);
        })
        .finally(() => setSchedulesLoading(false));
    } else {
      setSchedulesLoaded(false);
    }
  };

  const doAssign = async () => {
    if (!assignTarget) return;
    if (assignDoctorFiltering && assignDoctorOptions.length === 0) {
      toast({
        title: "No doctor available",
        description: `No doctor from the same department works at ${branchLabelOf(assignBranchId)} on ${dayLabelOf(assignDay)}.`,
        variant: "destructive",
      });
      return;
    }
    if (!assignDoctorId) {
      toast({ title: "Choose a doctor", variant: "destructive" });
      return;
    }
    if (!assignDate) {
      toast({ title: "Pick an appointment date", variant: "destructive" });
      return;
    }
    if (!assignTime) {
      toast({ title: "Pick an appointment time", variant: "destructive" });
      return;
    }
    setProcessing(true);
    try {
      const res = await doctorTransferApi.processRescheduleAction(assignTarget.appointment_id, {
        action: "ASSIGN",
        employee_id: assignDoctorId,
        branch_id: assignBranchId,
        appointment_date: assignDate,
        appointment_time: assignTime,
        reason: assignReason.trim() || undefined,
      });
      setAssignDoneMessage(res.data.message);
      setAssignDone(true);
      fetchQueue();
    } catch (err: any) {
      toast({
        title: "Failed to assign slot",
        description: err?.response?.data?.message || err?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const doConfirm = async () => {
    if (!confirmTarget) return;
    setProcessing(true);
    try {
      const res = await doctorTransferApi.processRescheduleAction(confirmTarget.appointment_id, {
        action: "CONFIRM",
        reason: confirmReason.trim() || undefined,
      });
      toast({ title: "Reschedule confirmed", description: res.data.message });
      setConfirmTarget(null);
      fetchQueue();
    } catch (err: any) {
      toast({
        title: "Failed to confirm reschedule",
        description: err?.response?.data?.message || err?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const doCancel = async () => {
    if (!cancelTarget) return;
    setProcessing(true);
    try {
      const res = await doctorTransferApi.processRescheduleAction(cancelTarget.appointment_id, {
        action: "CANCEL",
        reason: cancelReason.trim() || undefined,
      });
      toast({ title: "Request cancelled", description: res.data.message });
      setCancelTarget(null);
      fetchQueue();
    } catch (err: any) {
      toast({
        title: "Failed to cancel request",
        description: err?.response?.data?.message || err?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const assignDoneFooter = (
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
        onClick={() => {
          setAssignDone(false);
          setAssignTarget(null);
        }}
        className={cn(buttonVariants({ variant: "default" }), "gap-2")}
      >
        OK
      </button>
    </div>
  );

  if (!roleOk) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center">
        <h2 className="text-lg font-bold text-[#191C1E]">Access restricted</h2>
        <p className="text-sm text-[#64748B] mt-1">
          Only Super Admin, Head Admin and Branch Admin can manage the reschedule queue.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-[#E6E8EA] transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4 text-[#475569]" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-[#191C1E]">Reschedule queue</h1>
          <p className="text-xs text-[#64748B]">
            Appointments flagged Reschedule Required when a doctor left or was transferred
          </p>
        </div>
        <button
          onClick={fetchQueue}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-[#475569] hover:bg-[#F2F4F6]"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 mb-4 flex flex-wrap items-end gap-3">
        <div className="w-44">
          <label className={labelCls}>Status</label>
          <FormDropdown
            name="queue_status"
            className={inputCls}
            options={STATUS_FILTERS}
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
            placeholder="All status"
          />
        </div>
        <div className="w-56">
          <label className={labelCls}>Branch</label>
          <FormDropdown
            name="queue_branch"
            className={inputCls}
            options={branches.map((b) => ({
              label: `${b.branch_id}${b.branch_name ? ` - ${b.branch_name}` : ""}`,
              value: b.branch_id,
            }))}
            value={branchFilter}
            onValueChange={(v) => {
              setBranchFilter(v);
              setPage(1);
            }}
            placeholder="All branches"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className={labelCls}>Search patient</label>
          <input
            type="text"
            className={inputCls}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, mobile or patient ID"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#EEF1F4] flex items-center justify-between">
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
            Queue ({total} total)
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#00488D]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <CalendarClock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-[#64748B]">No queue entries match the current filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F1F5F9]">
            {filtered.map((entry) => {
              const patient = entry.patient_bio_data;
              const name = [patient?.patient_first_name, patient?.patient_last_name]
                .filter(Boolean)
                .join(" ");
              return (
                <div key={entry.queue_id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-[#E6E8EA] flex items-center justify-center shrink-0">
                    <UserRound className="w-4 h-4 text-[#475569]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#191C1E] truncate">
                        {name || entry.patient_id}
                      </span>
                      <span className="text-[11px] text-[#94A3B8] font-mono">{entry.patient_id}</span>
                    </div>
                    <div className="text-xs text-[#64748B] mt-0.5">
                      {formatDate(entry.old_appointment_date)} · {formatTime(entry.old_appointment_time)}
                      {entry.branch?.branch_name ? ` · ${entry.branch.branch_name}` : ` · ${entry.branch_id}`}
                    </div>
                    {entry.transfer_id && (
                      <div className="text-[11px] text-[#94A3B8] mt-0.5">Transfer {entry.transfer_id}</div>
                    )}
                    {entry.status === "ASSIGNED" && (
                      <div className="text-[11px] text-[#00488D] mt-0.5">
                        Assigned: {doctorNameById(entry.assigned_employee_id)} ·{" "}
                        {formatDate(entry.assigned_date)} {formatTime(entry.assigned_time)}
                      </div>
                    )}
                  </div>
                  <div className="hidden sm:flex flex-col items-end gap-1">
                    <StatusBadge tone={PRIORITY_TONE[entry.priority] || "slate"} status={entry.priority.toLowerCase()} />
                  </div>
                  <StatusBadge tone={QUEUE_TONE[entry.status] || "slate"} status={entry.status.toLowerCase()} />
                  <div className="flex items-center gap-1.5 shrink-0">
                    {entry.status === "PENDING" && (
                      <button
                        onClick={() => openAssign(entry)}
                        className="px-2 py-1 rounded bg-[#00488D] text-white text-[10px] font-semibold hover:bg-[#003A70]"
                      >
                        Assign slot
                      </button>
                    )}
                    {entry.status === "ASSIGNED" && (
                      <button
                        onClick={() => {
                          setConfirmReason("");
                          setConfirmTarget(entry);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700"
                      >
                        Confirm
                      </button>
                    )}
                    {(entry.status === "PENDING" || entry.status === "ASSIGNED") && (
                      <button
                        onClick={() => {
                          setCancelReason("");
                          setCancelTarget(entry);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50"
                      >
                        Cancel
                      </button>
                    )}
                    {entry.status === "CONFIRMED" && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                        <CheckCircle2 className="w-4 h-4" /> Rescheduled
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#EEF1F4]">
            <span className="text-xs text-[#64748B]">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-[#475569] disabled:opacity-40 hover:bg-[#F2F4F6]"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-[#475569] disabled:opacity-40 hover:bg-[#F2F4F6]"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Assign slot dialog */}
      <ConfirmationDialog
        open={!!assignTarget}
        type={assignDone ? "success" : "info"}
        title={assignDone ? "Slot assigned" : "Assign a new slot"}
        description={
          assignDone
            ? "The appointment has been reassigned and the queue updated."
            : "Pick a branch, a doctor and a slot. Only doctors who work at the selected branch on the selected day are listed."
        }
        confirmText="Assign slot"
        loading={processing}
        hideCancelButton={assignDone}
        showCloseButton={!assignDone}
        footer={assignDone ? assignDoneFooter : undefined}
        onConfirm={doAssign}
        onCancel={() => {
          setAssignDone(false);
          setAssignTarget(null);
        }}
      >
        {assignDone ? (
          <div className="w-full space-y-3 text-left">
            <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2.5 text-sm text-green-700">
              {assignDoneMessage || "The appointment has been reassigned."}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide">Patient</div>
                <div className="text-[#191C1E] font-medium">
                  {assignTarget ? patientNameOf(assignTarget) : "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide">Branch</div>
                <div className="text-[#191C1E] font-medium">{branchLabelOf(assignBranchId)}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide">Doctor</div>
                <div className="text-[#191C1E] font-medium">{doctorNameById(assignDoctorId) || "—"}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide">Date · Time</div>
                <div className="text-[#191C1E] font-medium">
                  {assignDate} · {assignTime}
                </div>
              </div>
            </div>
          </div>
        ) : (
        <div className="w-full space-y-3 text-left">
          <div>
            <label className={labelCls}>Assign at branch</label>
            <FormDropdown
              name="assign_branch"
              className={
                assignTarget && assignBranchId === assignTarget.branch_id
                  ? "w-full bg-blue-50 border border-blue-500 rounded-xl px-3 py-2 text-sm text-[#00488D] focus:outline-none focus:ring-2 focus:ring-[#00488D]/30"
                  : inputCls
              }
              options={assignBranchOptions}
              value={assignBranchId}
              onValueChange={(v) => {
                setAssignBranchId(v);
                setAssignDepartmentId("");
                setAssignDoctorId("");
                // Department options will update via branchDepartmentOptions memo
              }}
              placeholder="Select branch"
            />
            {assignTarget && assignBranchId === assignTarget.branch_id && (
              <p className="text-[11px] text-blue-600 mt-1">
                Defaults to the appointment's branch — changeable.
              </p>
            )}
          </div>
          {/* Department dropdown */}
          <div>
            <label className={labelCls}>Department</label>
            <FormDropdown
              name="assign_department"
              className={inputCls}
              options={branchDepartmentOptions.map((d) => ({
                label: d.department_name,
                value: d.department_id,
                highlight: d.department_id === assignTarget?.department_id,
                badge: d.department_id === assignTarget?.department_id ? "Appointment's department" : undefined,
              }))}
              value={assignDepartmentId}
              onValueChange={(v) => {
                setAssignDepartmentId(v);
                setAssignDoctorId("");
              }}
              placeholder={branchDepartmentOptions.length ? "Select department" : "No departments at this branch"}
            />
            {assignTarget && assignDepartmentId === assignTarget.department_id && assignDepartmentId && (
              <p className="text-[11px] text-blue-600 mt-1">
                Defaults to the appointment's department — changeable.
              </p>
            )}
          </div>
          <div>
            <label className={labelCls}>Doctor</label>
            <FormDropdown
              name="assign_doctor"
              className={inputCls}
              options={assignDoctorOptions}
              value={assignDoctorId}
              onValueChange={setAssignDoctorId}
              disabled={schedulesLoading}
              placeholder={
                assignDoctorFiltering && assignDoctorOptions.length === 0
                  ? "No doctors available"
                  : "Select doctor"
              }
              emptyMessage="No doctors available"
            />
            {schedulesLoading ? (
              <p className="text-[11px] text-[#94A3B8] mt-1">
                <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
                Checking doctor availability…
              </p>
            ) : assignDoctorFiltering && assignDoctorOptions.length === 0 ? (
              <p className="text-[11px] text-[#94A3B8] mt-1">
                No doctor from the same department works at {branchLabelOf(assignBranchId)} on{" "}
                {dayLabelOf(assignDay)} at {assignTimeOfDay}.
              </p>
            ) : assignDoctorFiltering ? (
              <p className="text-[11px] text-[#94A3B8] mt-1">
                Showing {assignDoctorOptions.length} doctor(s) working at {branchLabelOf(assignBranchId)} on{" "}
                {dayLabelOf(assignDay)}
                {assignTimeOfDay ? ` at ${assignTimeOfDay}` : ""} — sorted by queue load (lowest first).
              </p>
            ) : assignTarget?.department_id ? (
              <p className="text-[11px] text-[#94A3B8] mt-1">
                Showing all active doctor(s) — pick a date first to filter by working days.
              </p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Date</label>
              <input
                type="date"
                min={todayISODate()}
                className={inputCls}
                value={assignDate}
                onChange={(e) => {
                  const v = e.target.value;
                  setAssignDate(v);
                  const day = dayOfWeekOf(v);
                  if (
                    schedulesLoaded &&
                    assignDepartmentId &&
                    day &&
                    assignDoctorId &&
                    !isAssignDoctorEligible(assignDoctorId, assignBranchId, day, assignTimeOfDay)
                  ) {
                    setAssignDoctorId("");
                  }
                }}
              />
            </div>
            <div>
              <label className={labelCls}>Time</label>
              <TimepickerWheel value={assignTime} onChange={setAssignTime} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Reason (optional)</label>
            <textarea
              rows={2}
              className={inputCls}
              value={assignReason}
              onChange={(e) => setAssignReason(e.target.value)}
            />
          </div>
        </div>
        )}
      </ConfirmationDialog>

      {/* Confirm reschedule dialog */}
      <ConfirmationDialog
        open={!!confirmTarget}
        type="warning"
        title="Confirm reschedule"
        description={
          confirmTarget
            ? `This moves the appointment to ${doctorNameById(confirmTarget.assigned_employee_id) || "the assigned doctor"} on ${formatDate(confirmTarget.assigned_date)} at ${formatTime(confirmTarget.assigned_time)}. The patient's appointment record is updated and marked Rescheduled.`
            : ""
        }
        confirmText="Confirm reschedule"
        loading={processing}
        onConfirm={doConfirm}
        onCancel={() => setConfirmTarget(null)}
      >
        <div className="w-full text-left">
          <label className={labelCls}>Reason (optional)</label>
          <textarea
            rows={2}
            className={inputCls}
            value={confirmReason}
            onChange={(e) => setConfirmReason(e.target.value)}
          />
        </div>
      </ConfirmationDialog>

      {/* Cancel dialog */}
      <ConfirmationDialog
        open={!!cancelTarget}
        type="danger"
        title="Cancel reschedule request?"
        description="The appointment will be marked Cancelled and removed from the queue. This cannot be undone."
        confirmText="Cancel appointment"
        loading={processing}
        onConfirm={doCancel}
        onCancel={() => setCancelTarget(null)}
      >
        <div className="w-full text-left">
          <label className={labelCls}>Reason (optional)</label>
          <textarea
            rows={2}
            className={inputCls}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </div>
      </ConfirmationDialog>
    </div>
  );
}