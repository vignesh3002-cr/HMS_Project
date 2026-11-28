import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormDropdown } from "@/components/ui/form-dropdown";
import { ToolbarFilter } from "@/components/ui/toolbar-filter";
import { useFilterPanel, useRescheduleQueueFilters } from "@/components/Filter";
import { filterDataByValues } from "@/components/Filter/utils";
import TimepickerWheel from "@/components/ui/timepicker-wheel";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/hms/StatusBadge";
import { getDepartmentColors } from "@/components/hms/DepartmentBadge";
import HmsTable, { type HmsColumn } from "@/components/hms/HmsTable";
import { RefreshButton } from "@/components/hms/RefreshButton";
import {
  doctorTransferApi,
  RescheduleQueueEntry,
} from "@/api/doctorTransfer.api";
import { appointmentApi, type AvailableSlot } from "@/api/appointment.api";
import { doctorLeaveApi, DoctorLeaveRecord, LeaveStatus } from "@/api/doctorLeave.api";
import { useDoctors } from "@/hooks/useMasterData";
import { useBranchFilter } from "@/context/BranchFilterContext";
import { employeeApi, EmployeeRecord, DoctorScheduleRecord } from "@/api/employee.api";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getUser } from "@/utils/token";
import { useCriticalPatients } from "@/hooks/useCriticalPatients";
import { CriticalWrapper, CriticalCorner, CriticalDot } from "@/components/hms/CriticalPatientIndicator";

const TRANSFER_ADMIN_ROLES = ["HEAD_ADMIN", "SUPER_ADMIN", "BRANCH_ADMIN"];

const STATUS_FILTERS = [
  { label: "All status", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Assigned", value: "ASSIGNED" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const LEAVE_STATUS_FILTERS = [
  { label: "All status", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
];

const QUEUE_TONE: Record<string, "amber" | "blue" | "green" | "red"> = {
  PENDING: "amber",
  ASSIGNED: "blue",
  CONFIRMED: "green",
  CANCELLED: "red",
};

const LEAVE_STATUS_TONE: Record<string, "amber" | "green" | "red"> = {
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
};

const PRIORITY_TONE: Record<string, "slate" | "amber" | "red"> = {
  NORMAL: "slate",
  HIGH: "amber",
  URGENT: "red",
};

const PAGE_SIZE = 10;

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

function parseTimeToMinutes(timeStr?: string | null): number {
  if (!timeStr) return 0;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/);
  if (!match) return 0;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && h < 12) h += 12;
  if (meridiem === "AM" && h === 12) h = 0;
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
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

// Today's date in UTC -- appointment dates are stored UTC-anchored, so
// "has the appointment's date passed" must be decided in UTC too.
function todayUTCISODate(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(
    now.getUTCDate(),
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

function Avatar({ text }: { text: string }) {
  return (
    <div
      className="flex items-center justify-center w-7 h-7 rounded-xl flex-shrink-0 hms-avatar-text"
      style={{ backgroundColor: "#D6E3FF", color: "#00488D" }}
    >
      {text.charAt(0).toUpperCase() || "?"}
    </div>
  );
}

export default function RescheduleQueue() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [roleOk, setRoleOk] = useState(false);
  const [queueLoading, setQueueLoading] = useState(true);
  const [leaveLoading, setLeaveLoading] = useState(true);

  const [entries, setEntries] = useState<RescheduleQueueEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const [sortField, setSortField] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [statusFilter, setStatusFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [search, setSearch] = useState("");
  const [leaveSearch, setLeaveSearch] = useState("");

  const { selectedBranchId, isAllBranches, branches } = useBranchFilter();

  // Branch scope: a Branch Admin may only ever see / act on their own branch.
  // Head Admin and Super Admin stay multi-branch. Resolved once from the stored
  // session so it cannot drift between renders or be widened by the filter UI.
  const { isBranchAdmin, userBranchId } = useMemo(() => {
    const user = getUser();
    const role = String(user?.role_type || user?.role || "").trim().toUpperCase();
    return {
      isBranchAdmin: role === "BRANCH_ADMIN",
      userBranchId: String(user?.branch_id || "").trim(),
    };
  }, []);

  const effectiveBranchId = isBranchAdmin ? userBranchId : (isAllBranches ? undefined : selectedBranchId);

  const { doctors: queryDoctors } = useDoctors(
    effectiveBranchId || undefined,
    roleOk && (!isBranchAdmin || Boolean(userBranchId)),
  );
  const [extraDoctors, setExtraDoctors] = useState<EmployeeRecord[]>([]);
  const doctors = useMemo(() => {
    const byId = new Map(queryDoctors.map((d) => [d.employee_id, d]));
    extraDoctors.forEach((e) => {
      if (!byId.has(e.employee_id)) byId.set(e.employee_id, e);
    });
    return Array.from(byId.values());
  }, [queryDoctors, extraDoctors]);
  // Backend-computed doctor_status ("ACTIVE" | "LEAVE" | "INACTIVE") for the
  // assign dialog's selected branch + date -- the source of truth for which
  // doctors are eligible to take the slot (see employee.repository.ts
  // computeDoctorStatuses: ACTIVE = has an active schedule that weekday).
  const [doctorStatusMap, setDoctorStatusMap] = useState<Record<string, "ACTIVE" | "LEAVE" | "INACTIVE">>({});
  const [statusesLoading, setStatusesLoading] = useState(false);
  const [statusesLoaded, setStatusesLoaded] = useState(false);
  const [statusesFailed, setStatusesFailed] = useState(false);

  // Action dialogs
  const [assignTarget, setAssignTarget] = useState<RescheduleQueueEntry | null>(null);
  const [assignDoctorId, setAssignDoctorId] = useState("");
  const [assignBranchId, setAssignBranchId] = useState("");
  const [assignDepartmentId, setAssignDepartmentId] = useState("");
  const [assignDate, setAssignDate] = useState("");
  const [assignTime, setAssignTime] = useState("");
  const [assignScheduleId, setAssignScheduleId] = useState<string | number | null>(null);
  const [assignSlots, setAssignSlots] = useState<AvailableSlot[]>([]);
  const [assignSlotsLoading, setAssignSlotsLoading] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [useManualTime, setUseManualTime] = useState(false);
  const [assignReason, setAssignReason] = useState("");
  const [assignDone, setAssignDone] = useState(false);
  const [assignDoneMessage, setAssignDoneMessage] = useState("");
  const [doctorSchedulesById, setDoctorSchedulesById] = useState<Record<string, DoctorScheduleRecord[]>>({});
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [schedulesLoaded, setSchedulesLoaded] = useState(false);

  const [confirmTarget, setConfirmTarget] = useState<RescheduleQueueEntry | null>(null);
  const [confirmReason, setConfirmReason] = useState("");

  const [cancelTarget, setCancelTarget] = useState<RescheduleQueueEntry | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const [processing, setProcessing] = useState(false);
  const [autoCancelling, setAutoCancelling] = useState(false);
  const autoCancelAttempted = useRef<Set<string>>(new Set());

  // View mode toggle
  const [viewMode, setViewMode] = useState<"transfer" | "leave">("transfer");

  // Leave queue state
  const [leaveEntries, setLeaveEntries] = useState<DoctorLeaveRecord[]>([]);
  const [leaveTotal, setLeaveTotal] = useState(0);
  const [leaveTotalPages, setLeaveTotalPages] = useState(1);
  const [leavePage, setLeavePage] = useState(1);
  const [leavePageSize, setLeavePageSize] = useState(PAGE_SIZE);
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<LeaveStatus | "">("");
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState<DoctorLeaveRecord | null>(null);
  const [approveRemarks, setApproveRemarks] = useState("");
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [declineTarget, setDeclineTarget] = useState<DoctorLeaveRecord | null>(null);
  const [declineRemarks, setDeclineRemarks] = useState("");
  const [leaveConflicts, setLeaveConflicts] = useState<any[]>([]);
  const [leaveConflictDialogOpen, setLeaveConflictDialogOpen] = useState(false);
  const [pendingApprove, setPendingApprove] = useState<DoctorLeaveRecord | null>(null);

  const {
    values: queueFilterValues,
    appliedValues: queueAppliedValues,
    isOpen: isQueueFilterOpen,
    setIsOpen: setIsQueueFilterOpen,
    handleChange: handleQueueFilterChange,
    handleApply: handleQueueApply,
    handleClear: handleQueueClear,
  } = useFilterPanel();

  const {
    values: leaveFilterValues,
    appliedValues: leaveAppliedValues,
    isOpen: isLeaveFilterOpen,
    setIsOpen: setIsLeaveFilterOpen,
    handleChange: handleLeaveFilterChange,
    handleApply: handleLeaveApply,
    handleClear: handleLeaveClear,
  } = useFilterPanel();

  const { queueFilterFields, leaveFilterFields } = useRescheduleQueueFilters({
    entries,
    leaveEntries,
    doctors,
    branches,
  });

  useEffect(() => {
    const user = getUser();
    const role = (user?.role_type || user?.role || "").toUpperCase();
    setRoleOk(TRANSFER_ADMIN_ROLES.includes(role));
  }, []);

  // Fetch each doctor's backend-computed status for the assign dialog's
  // branch + date. Only "ACTIVE" doctors (active schedule on that weekday
  // at that branch) are offered in the dropdown once both are chosen.
  useEffect(() => {
    if (!assignBranchId || !assignDate) {
      setDoctorStatusMap({});
      setStatusesLoading(false);
      setStatusesLoaded(false);
      setStatusesFailed(false);
      return;
    }
    let cancelled = false;
    setStatusesLoading(true);
    setStatusesLoaded(false);
    setStatusesFailed(false);
    employeeApi
      .getAll({
        roleType: "DOCTOR",
        branchId: assignBranchId,
        date: assignDate,
        limit: 500,
      })
      .then((res) => {
        if (cancelled) return;
        const map: Record<string, "ACTIVE" | "LEAVE" | "INACTIVE"> = {};
        const fetched = res.data?.data?.employees || [];
        fetched.forEach((e) => {
          map[e.employee_id] = e.doctor_status || "INACTIVE";
        });
        setDoctorStatusMap(map);
        setStatusesLoaded(true);
        // Union freshly-fetched doctors into the list so a doctor created
        // after the page loaded still appears in the dropdown.
        setExtraDoctors((prev) => {
          const byId = new Map(prev.map((d) => [d.employee_id, d]));
          fetched.forEach((e) => {
            if (!byId.has(e.employee_id)) byId.set(e.employee_id, e);
          });
          return Array.from(byId.values());
        });
      })
      .catch(() => {
        if (cancelled) return;
        setDoctorStatusMap({});
        setStatusesFailed(true);
      })
      .finally(() => {
        if (!cancelled) setStatusesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [assignBranchId, assignDate]);

  const fetchQueue = useCallback(async () => {
    // Branch Admin is always pinned to their own branch.
    if (isBranchAdmin && !userBranchId) {
      setEntries([]);
      setTotal(0);
      setTotalPages(1);
      setQueueLoading(false);
      return;
    }
    setQueueLoading(true);
    try {
      const res = await doctorTransferApi.getRescheduleQueue({
        status: statusFilter || undefined,
        branchId: effectiveBranchId || undefined,
        page,
        limit: pageSize,
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
      setQueueLoading(false);
    }
  }, [statusFilter, page, pageSize, toast, isBranchAdmin, userBranchId, effectiveBranchId]);

  const fetchLeaves = useCallback(async () => {
    if (isBranchAdmin && !userBranchId) {
      setLeaveEntries([]);
      setLeaveTotal(0);
      setLeaveTotalPages(1);
      setLeaveLoading(false);
      return;
    }
    setLeaveLoading(true);
    try {
      const res = await doctorLeaveApi.getAll({
        status: leaveStatusFilter || undefined,
        branchId: effectiveBranchId || undefined,
        page: leavePage,
        limit: leavePageSize,
      });
      setLeaveEntries(res.data.leaves || []);
      setLeaveTotal(res.data.total ?? 0);
      setLeaveTotalPages(res.data.totalPages ?? 1);
    } catch (err: any) {
      toast({
        title: "Failed to load leave requests",
        description: err?.response?.data?.message || err?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLeaveLoading(false);
    }
  }, [leaveStatusFilter, leavePage, leavePageSize, toast, isBranchAdmin, userBranchId, effectiveBranchId]);

  useEffect(() => {
    if (roleOk) fetchQueue();
  }, [roleOk, fetchQueue, effectiveBranchId]);

  useEffect(() => {
    if (roleOk && viewMode === "leave") {
      fetchLeaves();
    }
  }, [roleOk, viewMode, fetchLeaves, effectiveBranchId]);

  // Auto-cancel queue entries whose appointment date has already passed
  // (the original date for PENDING, the assigned date for ASSIGNED) -- a
  // reschedule is no longer actionable once the appointment's own date is
  // in the past, so the appointment is cancelled instead of sitting in the
  // queue forever.
  const autoCancelExpired = useCallback(async () => {
    if (!roleOk || autoCancelling) return;
    const today = todayUTCISODate();
    const expired = entries.filter((e) => {
      if (e.status !== "PENDING" && e.status !== "ASSIGNED") return false;
      if (autoCancelAttempted.current.has(e.appointment_id)) return false;
      const effectiveDate =
        e.status === "ASSIGNED" && e.assigned_date
          ? toDateInputValue(e.assigned_date)
          : toDateInputValue(e.old_appointment_date);
      return Boolean(effectiveDate) && effectiveDate < today;
    });
    if (expired.length === 0) return;
    setAutoCancelling(true);
    let cancelled = 0;
    try {
      for (const entry of expired) {
        autoCancelAttempted.current.add(entry.appointment_id);
        try {
          await doctorTransferApi.processRescheduleAction(entry.appointment_id, {
            action: "CANCEL",
            reason: "Auto-cancelled: appointment date has passed",
          });
          cancelled += 1;
        } catch (err) {
          console.error(
            "[RescheduleQueue] Auto-cancel failed for",
            entry.appointment_id,
            err,
          );
        }
      }
      if (cancelled > 0) {
        toast({
          title: `Auto-cancelled ${cancelled} expired appointment${cancelled === 1 ? "" : "s"}`,
          description: "Their appointment date had already passed.",
        });
        fetchQueue();
      }
    } finally {
      setAutoCancelling(false);
    }
  }, [roleOk, autoCancelling, entries, fetchQueue, toast]);

  useEffect(() => {
    if (roleOk && entries.length > 0) autoCancelExpired();
  }, [roleOk, entries, autoCancelExpired]);

  const doctorNameById = useCallback(
    (id?: string | null) => {
      if (!id) return null;
      const doc = doctors.find((d) => d.employee_id === id);
      if (!doc) return id;
      return `Dr. ${[doc.first_name, doc.middle_name, doc.last_name].filter(Boolean).join(" ")}`;
    },
    [doctors],
  );

  const doctorDepartmentNameById = useCallback(
    (id?: string | null) => {
      if (!id) return null;
      const doc = doctors.find((d) => d.employee_id === id);
      if (!doc) return null;
      return doc.department_master?.department_name || doc.department_id || null;
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
    (doctorId: string, branchId: string, day: string, targetTime?: string) => {
      const schedules = doctorSchedulesById[doctorId] || [];
      if (!targetTime) {
        return schedules.some((s) => s.is_active !== false && s.branch_id === branchId && s.day_of_week === day);
      }
      const [th, tm] = targetTime.split(":").map(Number);
      const targetMin = (Number.isFinite(th) ? th : 0) * 60 + (Number.isFinite(tm) ? tm : 0);
      const bufferMin = Math.max(0, targetMin - 30);
      const bufferMax = targetMin + 30;

      return schedules.some((s) => {
        if (s.is_active === false || s.branch_id !== branchId || s.day_of_week !== day) return false;
        if (!s.start_time || !s.end_time) return false;
        const [sh, sm] = s.start_time.split(":").map(Number);
        const [eh, em] = s.end_time.split(":").map(Number);
        const sStart = (Number.isFinite(sh) ? sh : 0) * 60 + (Number.isFinite(sm) ? sm : 0);
        let sEnd = (Number.isFinite(eh) ? eh : 0) * 60 + (Number.isFinite(em) ? em : 0);
        if (sEnd <= sStart) sEnd += 1440; // Overnight
        let reqMin = targetMin;
        if (reqMin < sStart && sEnd > 1440) reqMin += 1440;
        return sStart <= bufferMax && sEnd > bufferMin;
      });
    },
    [doctorSchedulesById],
  );

  // Department options for the selected branch (derived from doctors at that branch)
  const branchDepartmentOptions = useMemo(() => {
    if (!assignBranchId) return [];
    const deptMap = new Map<string, string>();
    doctors
      .filter(
        (d) =>
          d.emp_status !== false &&
          (d.branches?.some((b) => b.branch_id === assignBranchId) ?? false),
      )
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

  const assignBranchOptions = useMemo(() => {
    const scopedBranches =
      isBranchAdmin && userBranchId
        ? branches.filter((b) => b.branch_id === userBranchId)
        : branches;
    return scopedBranches.map((b) => ({
      label: `${b.branch_id}${b.branch_name ? ` - ${b.branch_name}` : ""}`,
      value: b.branch_id,
      highlight: b.branch_id === assignTarget?.branch_id,
      badge: b.branch_id === assignTarget?.branch_id ? "Appointment's branch" : undefined,
    }));
  }, [branches, assignTarget, isBranchAdmin, userBranchId]);

  const branchFilterOptions = useMemo(
    () =>
      branches.map((b) => ({
        label: `${b.branch_id}${b.branch_name ? ` - ${b.branch_name}` : ""}`,
        value: b.branch_id,
      })),
    [branches],
  );

  const filtered = useMemo(() => {
    let result = entries;

    if (effectiveBranchId) {
      result = result.filter((e) => e.branch_id === effectiveBranchId);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((e) => {
        const name = [e.patient_bio_data?.patient_first_name, e.patient_bio_data?.patient_last_name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const mobile = e.patient_bio_data?.patient_primary_mobile?.toLowerCase() || "";
        const pid = e.patient_id.toLowerCase();
        return name.includes(q) || mobile.includes(q) || pid.includes(q);
      });
    }

    result = filterDataByValues(
      result.map((e) => ({
        ...e,
        patientName: [e.patient_bio_data?.patient_first_name, e.patient_bio_data?.patient_last_name]
          .filter(Boolean)
          .join(" "),
      })),
      queueAppliedValues,
      queueFilterFields
    ) as unknown as RescheduleQueueEntry[];

    // Apply sorting
    if (sortField && sortDirection) {
      result = [...result].sort((a, b) => {
        let av: string | number = "";
        let bv: string | number = "";
        switch (sortField) {
          case "patient":
            av = patientNameOf(a).toLowerCase();
            bv = patientNameOf(b).toLowerCase();
            break;
          case "appointment":
            av = (a.old_appointment_date || "") + (a.old_appointment_time || "");
            bv = (b.old_appointment_date || "") + (b.old_appointment_time || "");
            break;
          case "priority":
            av = a.priority?.toLowerCase() || "";
            bv = b.priority?.toLowerCase() || "";
            break;
          case "transferredBy":
            av = doctorNameById(a.created_by)?.toLowerCase() || a.created_by?.toLowerCase() || "";
            bv = doctorNameById(b.created_by)?.toLowerCase() || b.created_by?.toLowerCase() || "";
            break;
          case "status":
            av = (a.status || "").toLowerCase();
            bv = (b.status || "").toLowerCase();
            break;
          default:
            return 0;
        }
        if (av < bv) return sortDirection === "asc" ? -1 : 1;
        if (av > bv) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [entries, search, effectiveBranchId, queueAppliedValues, queueFilterFields, sortField, sortDirection, doctorNameById]);

  const filteredLeaves = useMemo(() => {
    let result = leaveEntries;
    if (effectiveBranchId) {
      result = result.filter((e) => e.branch_id === effectiveBranchId);
    }

    const q = leaveSearch.trim().toLowerCase();
    if (q) {
      result = result.filter((e) => {
        const doctor = (doctorNameById(e.employee_id) || e.employee_id).toLowerCase();
        const lid = e.leave_id.toLowerCase();
        return doctor.includes(q) || lid.includes(q);
      });
    }

    result = filterDataByValues(
      result,
      leaveAppliedValues,
      leaveFilterFields
    ) as unknown as DoctorLeaveRecord[];

    // Apply sorting
    if (sortField && sortDirection) {
      result = [...result].sort((a, b) => {
        let av: string | number = "";
        let bv: string | number = "";
        switch (sortField) {
          case "doctor":
            av = (doctorNameById(a.employee_id) || a.employee_id).toLowerCase();
            bv = (doctorNameById(b.employee_id) || b.employee_id).toLowerCase();
            break;
          case "period":
            av = a.leave_start_date || "";
            bv = b.leave_start_date || "";
            break;
          case "type":
            av = (a.leave_type || "").toLowerCase();
            bv = (b.leave_type || "").toLowerCase();
            break;
          case "approvedRejectedBy": {
            const actorA = a.status === "APPROVED" ? a.approved_by : a.rejected_by;
            const actorB = b.status === "APPROVED" ? b.approved_by : b.rejected_by;
            av = (doctorNameById(actorA) || actorA || "").toLowerCase();
            bv = (doctorNameById(actorB) || actorB || "").toLowerCase();
            break;
          }
          case "status":
            av = (a.status || "").toLowerCase();
            bv = (b.status || "").toLowerCase();
            break;
          default:
            return 0;
        }
        if (av < bv) return sortDirection === "asc" ? -1 : 1;
        if (av > bv) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [leaveEntries, leaveSearch, effectiveBranchId, leaveAppliedValues, leaveFilterFields, sortField, sortDirection, doctorNameById]);

  const queuePatientAgeData = useMemo(() => {
    return filtered.map((e) => ({
      patientId: e.patient_id,
    }));
  }, [filtered]);

  const { getCriticalInfo } = useCriticalPatients(queuePatientAgeData);

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
      eligible = eligible.filter(
        (d) => d.branches?.some((b) => b.branch_id === assignBranchId) ?? false,
      );
    }
    if (assignDepartmentId) {
      eligible = eligible.filter((d) => d.department_id === assignDepartmentId);
    }

    // Status gate: only filter if active status results in at least 1 doctor, so list is never blanked
    if (assignBranchId && assignDate && statusesLoaded) {
      const activeForDate = eligible.filter(
        (d) =>
          doctorStatusMap[d.employee_id] === "ACTIVE" ||
          d.employee_id === assignDoctorId,
      );
      if (activeForDate.length > 0) {
        eligible = activeForDate;
      }
    }

    // Rate buffer match vs general day match
    const withCounts = eligible.map((d) => {
      const isBufferMatch = isAssignDoctorEligible(d.employee_id, assignBranchId, assignDay, assignTimeOfDay || undefined);
      const isDayMatch = isAssignDoctorEligible(d.employee_id, assignBranchId, assignDay);
      return {
        ...d,
        isBufferMatch,
        isDayMatch,
        queueCount: doctorQueueCounts[d.employee_id] || 0,
      };
    });

    // Sort: buffer matches first, then day matches, then lowest queue count
    withCounts.sort((a, b) => {
      if (a.isBufferMatch !== b.isBufferMatch) return a.isBufferMatch ? -1 : 1;
      if (a.isDayMatch !== b.isDayMatch) return a.isDayMatch ? -1 : 1;
      return a.queueCount - b.queueCount;
    });

    return withCounts.map((d) => ({
      label: labelOf(d),
      value: d.employee_id,
      badge: d.isBufferMatch
        ? (d.queueCount === 0 ? "Buffer match" : `${d.queueCount} queued (match)`)
        : d.isDayMatch
        ? (d.queueCount === 0 ? "Active today" : `${d.queueCount} queued`)
        : "Available",
    }));
  }, [
    doctors,
    isAssignDoctorEligible,
    assignBranchId,
    assignDay,
    assignTimeOfDay,
    assignDepartmentId,
    assignDate,
    assignDoctorId,
    doctorStatusMap,
    statusesLoaded,
    doctorQueueCounts,
  ]);

  const openAssign = (entry: RescheduleQueueEntry) => {
    setAssignDoctorId("");
    // Branch Admin can only reassign within their own branch.
    setAssignBranchId(isBranchAdmin ? userBranchId || entry.branch_id : entry.branch_id);
    const defaultDepartmentId =
      entry.department_id ||
      doctors.find((d) => d.employee_id === entry.employee_id)?.department_id ||
      "";
    setAssignDepartmentId(defaultDepartmentId);
    setAssignDate(entry.old_appointment_date ? toDateInputValue(entry.old_appointment_date) : todayISODate());
    setAssignTime(entry.old_appointment_time ? formatTime(entry.old_appointment_time) : "");
    setAssignScheduleId(null);
    setAssignSlots([]);
    setSelectedSlotIndex(null);
    setUseManualTime(false);
    setAssignReason("");
    setAssignDone(false);
    setAssignDoneMessage("");
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

  useEffect(() => {
    if (!assignDoctorId || !assignBranchId || !assignDate) {
      setAssignSlots([]);
      return;
    }
    let cancelled = false;
    setAssignSlotsLoading(true);
    const duration = assignTarget?.appointment_history?.duration_minutes ?? 10;
    appointmentApi
      .getAvailableSlots(assignDoctorId, assignBranchId, assignDate, { duration })
      .then((res) => {
        if (cancelled) return;
        const slots = res.data?.data?.slots ?? [];
        setAssignSlots(slots);
        if (slots.length > 0 && assignTime) {
          const targetMin = parseTimeToMinutes(assignTime);
          let bestIdx = -1;
          let bestDiff = Infinity;
          slots.forEach((s: AvailableSlot, idx: number) => {
            if (s.is_past || s.is_completed || !s.is_available) return;
            const sMin = parseTimeToMinutes(s.available_from || s.time);
            const diff = Math.abs(sMin - targetMin);
            if (diff <= 30 && diff < bestDiff) {
              bestDiff = diff;
              bestIdx = idx;
            }
          });
          if (bestIdx >= 0) {
            setSelectedSlotIndex(bestIdx);
            setAssignTime(slots[bestIdx].time);
            setAssignScheduleId(slots[bestIdx].schedule_id);
          }
        }
      })
      .catch((err) => {
        console.error("[RescheduleQueue] Failed to load available slots", err);
        if (!cancelled) setAssignSlots([]);
      })
      .finally(() => {
        if (!cancelled) setAssignSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [assignDoctorId, assignBranchId, assignDate, assignTarget]);

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
        schedule_id: assignScheduleId || undefined,
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

  const handleApproveLeave = async (queueForReschedule = false) => {
    if (!approveTarget) return;
    const user = getUser();
    const approvedBy = user?.user_id || user?.employee_id || "";
    if (!approvedBy) {
      toast({ title: "Unable to determine approver", variant: "destructive" });
      return;
    }
    setProcessing(true);
    try {
      await doctorLeaveApi.approve(approveTarget.leave_id, {
        approved_by: approvedBy,
        remarks: approveRemarks.trim() || undefined,
      });
      if (queueForReschedule) {
        const priority = (approveTarget.leave_type === "Emergency") ? "HIGH" : "NORMAL";
        await doctorLeaveApi.queueReschedule(approveTarget.employee_id, {
          date_from: approveTarget.leave_start_date,
          date_to: approveTarget.leave_end_date,
          reason: `Leave approved: ${approveTarget.leave_reason}`,
          priority,
        });
      }
      toast({ title: "Leave approved", description: queueForReschedule ? "Appointments queued for reschedule" : "Leave approved" });
      setApproveDialogOpen(false);
      setApproveTarget(null);
      setApproveRemarks("");
      setLeaveConflictDialogOpen(false);
      setPendingApprove(null);
      fetchLeaves();
      if (queueForReschedule) fetchQueue();
    } catch (err: any) {
      toast({
        title: "Failed to approve leave",
        description: err?.response?.data?.message || err?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDeclineLeave = async () => {
    if (!declineTarget || !declineRemarks.trim()) {
      toast({ title: "Remarks are required to decline", variant: "destructive" });
      return;
    }
    const user = getUser();
    const rejectedBy = user?.user_id || user?.employee_id || "";
    if (!rejectedBy) {
      toast({ title: "Unable to determine rejector", variant: "destructive" });
      return;
    }
    setProcessing(true);
    try {
      await doctorLeaveApi.reject(declineTarget.leave_id, {
        rejected_by: rejectedBy,
        remarks: declineRemarks.trim(),
      });
      toast({ title: "Leave declined", description: "Leave request has been rejected" });
      setDeclineDialogOpen(false);
      setDeclineTarget(null);
      setDeclineRemarks("");
      fetchLeaves();
    } catch (err: any) {
      toast({
        title: "Failed to decline leave",
        description: err?.response?.data?.message || err?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const openApproveLeave = async (leave: DoctorLeaveRecord) => {
    setApproveTarget(leave);
    setApproveRemarks(leave.remarks || "");
    // Check conflicts first -- only surface the approval dialog when there is
    // nothing to warn about, otherwise show the conflict dialog directly.
    try {
      const conflicts = await doctorLeaveApi.getConflicts(leave.employee_id, {
        date_from: leave.leave_start_date,
        date_to: leave.leave_end_date,
      });
      if (conflicts.data?.data?.length > 0) {
        setLeaveConflicts(conflicts.data.data);
        setLeaveConflictDialogOpen(true);
        setPendingApprove(leave);
        return;
      }
    } catch (err) {
      console.error("[RescheduleQueue] Conflict check failed", err);
    }
    setApproveDialogOpen(true);
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

  const transferColumns: HmsColumn<RescheduleQueueEntry>[] = [
    {
      key: "patient",
      label: "Patient",
      sortable: true,
      render: (entry) => {
        const crit = getCriticalInfo(entry.patient_id);
        const name = patientNameOf(entry);
        const assignedDept = entry.assigned_employee_id
          ? doctorDepartmentNameById(entry.assigned_employee_id)
          : null;
        const { bg: avatarBg, text: avatarColor } = getDepartmentColors(assignedDept);
        return (
          <CriticalWrapper className="flex items-center gap-2.5" reasons={crit.reasons}>
            <CriticalCorner reasons={crit.reasons} />
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center hms-avatar-text shrink-0"
              style={{ backgroundColor: avatarBg, color: avatarColor }}
            >
              {name?.charAt(0).toUpperCase() || entry.patient_id.charAt(0).toUpperCase() || "?"}
            </div>
            <div className="min-w-0">
              <div className="hms-name-text flex items-center gap-1 truncate">
                {name}
                <CriticalDot reasons={crit.reasons} />
              </div>
              <div className="hms-id-text">{entry.patient_id}</div>
            </div>
          </CriticalWrapper>
        );
      },
    },
    {
      key: "appointment",
      label: "Appointment",
      sortable: true,
      render: (entry) => (
        <div>
          <div className="hms-content-text text-[#191C1E]">
            {formatDate(entry.old_appointment_date)} · {formatTime(entry.old_appointment_time)}
          </div>
          <div className="hms-id-text">
            {entry.branch?.branch_name || entry.branch_id}
            {entry.transfer_id ? ` · Transfer ${entry.transfer_id}` : ""}
          </div>
        </div>
      ),
    },
    {
      key: "transferredBy",
      label: "Transferred by",
      sortable: true,
      render: (entry) => {
        const dept = doctorDepartmentNameById(entry.created_by);
        const { bg: avatarBg, text: avatarColor } = getDepartmentColors(dept);
        const initials = doctorNameById(entry.created_by)
          ?.split(" ")
          .map((w) => w.charAt(0).toUpperCase())
          .slice(0, 2)
          .join("") || entry.created_by?.charAt(0).toUpperCase() || "?";
        return (
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center hms-avatar-text shrink-0"
              style={{ backgroundColor: avatarBg, color: avatarColor }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <div className="hms-name-text truncate text-[#191C1E]">
                {doctorNameById(entry.created_by) || entry.created_by}
              </div>
              <div className="hms-id-text">{formatDate(entry.created_at)}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: "priority",
      label: "Priority",
      sortable: true,
      render: (entry) => (
        <StatusBadge tone={PRIORITY_TONE[entry.priority] || "slate"} status={entry.priority} />
      ),
    },
    {
      key: "assigned",
      label: "Assigned slot",
      sortable: false,
      render: (entry) =>
        entry.status === "ASSIGNED" ? (
          <div>
            <div className="hms-name-text">{doctorNameById(entry.assigned_employee_id)}</div>
            <div className="hms-id-text">
              {formatDate(entry.assigned_date)} · {formatTime(entry.assigned_time)}
            </div>
          </div>
        ) : (
          <span className="text-[#9CA3AF]">—</span>
        ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (entry) => (
        <StatusBadge tone={QUEUE_TONE[entry.status] || "slate"} status={entry.status} />
      ),
    },
  ];

  const leaveColumns: HmsColumn<DoctorLeaveRecord>[] = [
    {
      key: "doctor",
      label: "Doctor",
      sortable: true,
      render: (leave) => {
        const doctorName = doctorNameById(leave.employee_id);
        const dept = doctorDepartmentNameById(leave.employee_id);
        const { bg: avatarBg, text: avatarColor } = getDepartmentColors(dept);
        const initials = doctorName
          ?.split(" ")
          .map((w) => w.charAt(0).toUpperCase())
          .slice(0, 2)
          .join("") || leave.employee_id.charAt(0).toUpperCase();
        return (
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center hms-avatar-text shrink-0"
              style={{ backgroundColor: avatarBg, color: avatarColor }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <div className="hms-name-text truncate">{doctorName || leave.employee_id}</div>
              <div className="hms-id-text">{leave.leave_id}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: "period",
      label: "Leave period",
      sortable: true,
      render: (leave) => (
        <div>
          <div className="hms-content-text text-[#191C1E]">
            {formatDate(leave.leave_start_date)} – {formatDate(leave.leave_end_date)}
          </div>
          <div className="hms-id-text">{branchLabelOf(leave.branch_id)}</div>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      sortable: true,
      render: (leave) => (
        <StatusBadge
          tone={leave.leave_type === "Emergency" ? "red" : "slate"}
          status={leave.leave_type || "Normal"}
        />
      ),
    },
    {
      key: "approvedRejectedBy",
      label: "Approved/Rejected by",
      sortable: true,
      render: (leave) => {
        const actor = leave.status === "APPROVED" ? leave.approved_by : leave.rejected_by;
        const actionAt =
          leave.status === "APPROVED" ? leave.approved_at : leave.rejected_at;
        if (!actor) return <span className="text-[#9CA3AF]">—</span>;
        const dept = doctorDepartmentNameById(actor);
        const { bg: avatarBg, text: avatarColor } = getDepartmentColors(dept);
        const initials = doctorNameById(actor)
          ?.split(" ")
          .map((w) => w.charAt(0).toUpperCase())
          .slice(0, 2)
          .join("") || actor.charAt(0).toUpperCase();
        return (
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center hms-avatar-text shrink-0"
              style={{ backgroundColor: avatarBg, color: avatarColor }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <div className="hms-name-text truncate text-[#191C1E]">
                {doctorNameById(actor) || actor}
              </div>
              <div className="hms-id-text">{formatDate(actionAt)}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: "reason",
      label: "Reason",
      sortable: false,
      className: "max-w-[240px]",
      render: (leave) => (
        <span className="hms-content-text text-[#4B5563] line-clamp-2 whitespace-normal">
          {leave.leave_reason || "—"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (leave) => (
        <StatusBadge tone={LEAVE_STATUS_TONE[leave.status] || "slate"} status={leave.status} />
      ),
    },
  ];

  if (!roleOk) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F9FB] p-6 font-[Manrope,sans-serif]">
        <div className="max-w-lg rounded-xl border border-[#E5E7EB] bg-white p-8 text-center shadow-sm">
          <h2 className="hms-heading">Access restricted</h2>
          <p className="hms-subheading mt-2">
            Only Super Admin, Head Admin and Branch Admin can manage the reschedule queue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full font-[Manrope,sans-serif] bg-[#F7F9FB] min-h-screen p-6">
      <div className="flex flex-col flex-1 min-w-0 gap-6">
        {/* ==================== HEADER ==================== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F2F4F6] transition-colors shadow-2xs"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4 text-[#191C1E]" />
            </button>
            <div>
              <h1 className="hms-heading">Reschedule Queue</h1>
              <p className="hms-subheading">
                Appointments flagged Reschedule Required when a doctor left or was transferred.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-[36px] items-center border border-[#E5E7EB] rounded-lg overflow-hidden bg-[#F2F4F6] p-0.5 text-xs font-semibold">
              <button
                onClick={() => {
                  setViewMode("transfer");
                  setPage(1);
                }}
                className={`h-full px-3 rounded-md transition-all ${
                  viewMode === "transfer"
                    ? "bg-white text-[#00488D] shadow-xs"
                    : "text-[#6B7280] hover:text-[#111827]"
                }`}
              >
                Appointment Transfer
              </button>
              <button
                onClick={() => {
                  setViewMode("leave");
                  setLeavePage(1);
                }}
                className={`h-full px-3 rounded-md transition-all ${
                  viewMode === "leave"
                    ? "bg-white text-[#00488D] shadow-xs"
                    : "text-[#6B7280] hover:text-[#111827]"
                }`}
              >
                Leave Requests
              </button>
            </div>
          </div>
        </div>

        {/* ==================== MAIN CARD ==================== */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col transition-all duration-300 hover:shadow-md">
          {/* ==================== TOOLBAR ==================== */}
          <div className="px-5 py-3.5 border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-[#191C1E] text-sm font-bold">
                {viewMode === "transfer" ? "Transfer Queue" : "Leave Requests"}
              </span>
              <span className="bg-[#E6F0FF] text-[#00488D] px-2.5 py-0.5 rounded-full text-[10px] font-semibold">
                Total : {viewMode === "transfer" ? total : leaveTotal}
              </span>
              {viewMode === "transfer" && autoCancelling && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Auto-cancelling expired…
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto flex-wrap">
              {viewMode === "transfer" ? (
                <>
                  {/* Search — current expand-on-focus pattern */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search this page…"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                      className="pl-8 pr-3 py-1.5 bg-[#F2F4F6] text-xs text-[#6B7280] placeholder:text-[#6B7280] outline-none w-[150px] sm:w-[200px] rounded-md transition-all duration-200 focus:rounded-none focus:w-[200px] sm:focus:w-[250px]"
                    />
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#424752]" />
                  </div>
                  {/* Filter */}
                  <ToolbarFilter
                    title="Filter Queue"
                    fields={queueFilterFields}
                    values={queueFilterValues}
                    appliedValues={queueAppliedValues}
                    onChange={handleQueueFilterChange}
                    onApply={() => {
                      handleQueueApply();
                      setPage(1);
                    }}
                    onClear={() => {
                      handleQueueClear();
                      setPage(1);
                    }}
                    open={isQueueFilterOpen}
                    onOpenChange={setIsQueueFilterOpen}
                  />
                  {/* Refresh — rightmost */}
                  <RefreshButton
                    onClick={fetchQueue}
                    isLoading={queueLoading}
                    className="!h-[32px] px-2.5 text-xs rounded-lg"
                  />
                </>
              ) : (
                <>
                  {/* Search — current expand-on-focus pattern */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search this page…"
                      value={leaveSearch}
                      onChange={(e) => {
                        setLeaveSearch(e.target.value);
                        setLeavePage(1);
                      }}
                      className="pl-8 pr-3 py-1.5 bg-[#F2F4F6] text-xs text-[#6B7280] placeholder:text-[#6B7280] outline-none w-[150px] sm:w-[200px] rounded-md transition-all duration-200 focus:rounded-none focus:w-[200px] sm:focus:w-[250px]"
                    />
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#424752]" />
                  </div>
                  {/* Filter */}
                  <ToolbarFilter
                    title="Filter Leaves"
                    fields={leaveFilterFields}
                    values={leaveFilterValues}
                    appliedValues={leaveAppliedValues}
                    onChange={handleLeaveFilterChange}
                    onApply={() => {
                      handleLeaveApply();
                      setLeavePage(1);
                    }}
                    onClear={() => {
                      handleLeaveClear();
                      setLeavePage(1);
                    }}
                    open={isLeaveFilterOpen}
                    onOpenChange={setIsLeaveFilterOpen}
                  />
                  {/* Refresh — rightmost */}
                  <RefreshButton
                    onClick={fetchLeaves}
                    isLoading={leaveLoading}
                    className="!h-[32px] px-2.5 text-xs rounded-lg"
                  />
                </>
              )}
            </div>
          </div>

          {/* ==================== BODY ==================== */}
          {viewMode === "transfer" ? (
            queueLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#6B7280] text-sm">
                <Loader2 size={24} className="animate-spin text-[#00488D]" />
                Loading reschedule queue...
              </div>
            ) : (
              <HmsTable
                columns={transferColumns}
                data={filtered}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={(field) => {
                  if (sortField === field) {
                    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                  } else {
                    setSortField(field);
                    setSortDirection("asc");
                  }
                }}
                currentPage={page}
                totalPages={totalPages}
                totalRecords={total}
                rowsPerPage={pageSize}
                visibleStart={total === 0 ? 0 : (page - 1) * pageSize + 1}
                visibleEnd={Math.min(page * pageSize, total)}
                onPageChange={setPage}
                onRowsPerPageChange={(val) => {
                  setPageSize(val);
                  setPage(1);
                }}
                emptyMessage="No transfer requests match the current filters."
                minWidth="980px"
                rowKey={(entry) => entry.queue_id}
              />
            )
          ) : leaveLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#6B7280] text-sm">
              <Loader2 size={24} className="animate-spin text-[#00488D]" />
              Loading leave requests...
            </div>
          ) : (
            <HmsTable
              columns={leaveColumns}
              data={filteredLeaves}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={(field) => {
                if (sortField === field) {
                  setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                } else {
                  setSortField(field);
                  setSortDirection("asc");
                }
              }}
              currentPage={leavePage}
              totalPages={leaveTotalPages}
              totalRecords={leaveTotal}
              rowsPerPage={leavePageSize}
              visibleStart={leaveTotal === 0 ? 0 : (leavePage - 1) * leavePageSize + 1}
              visibleEnd={Math.min(leavePage * leavePageSize, leaveTotal)}
              onPageChange={setLeavePage}
              onRowsPerPageChange={(val) => {
                setLeavePageSize(val);
                setLeavePage(1);
              }}
              emptyMessage="No leave requests match the current filters."
              minWidth="900px"
              rowKey={(leave) => leave.leave_id}
            />
          )}
        </div>
      </div>

      {/* Assign slot dialog */}
      <Dialog
        open={!!assignTarget}
        onOpenChange={(open) => {
          if (!open) {
            setAssignDone(false);
            setAssignTarget(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl w-[95vw] max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl shadow-2xl border border-gray-100 bg-white font-[Manrope,sans-serif]">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50/60 to-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E8F0FE] text-[#00488D] flex items-center justify-center shrink-0">
                <CalendarClock className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[#191C1E]">
                  {assignDone ? "Slot Assigned Successfully" : "Assign Appointment Slot"}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#64748B] mt-0.5">
                  {assignDone
                    ? "The appointment has been reassigned to the new doctor's schedule."
                    : "Select a branch, doctor, and an available 1-hour session to reassign this patient."}
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Patient Context Card */}
          {assignTarget && !assignDone && (
            <div className="mx-6 mt-4 p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-200/60 text-[#00488D] font-bold flex items-center justify-center text-xs">
                  {patientNameOf(assignTarget).charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-[#191C1E]">{patientNameOf(assignTarget)}</div>
                  <div className="text-[11px] text-[#64748B]">{assignTarget.patient_id}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-[#64748B] flex-wrap">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Original Schedule</span>
                  <span className="font-medium text-[#191C1E]">
                    {formatDate(assignTarget.old_appointment_date)} at {formatTime(assignTarget.old_appointment_time)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Original Doctor</span>
                  <span className="font-medium text-[#191C1E]">
                    {doctorNameById(assignTarget.employee_id) || assignTarget.employee_id}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Priority</span>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5",
                      assignTarget.priority === "URGENT"
                        ? "bg-red-100 text-red-700"
                        : assignTarget.priority === "HIGH"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-blue-100 text-[#00488D]",
                    )}
                  >
                    {assignTarget.priority}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {assignDone ? (
              <div className="space-y-4 py-4 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[#191C1E]">Reassignment Complete</h3>
                  <p className="text-xs text-[#64748B]">
                    {assignDoneMessage || "The appointment has been successfully rescheduled."}
                  </p>
                </div>
                <div className="max-w-md mx-auto grid grid-cols-2 gap-3 p-4 bg-gray-50 border border-gray-200/80 rounded-xl text-left text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Patient</span>
                    <span className="font-semibold text-gray-900">{assignTarget ? patientNameOf(assignTarget) : "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Assigned Doctor</span>
                    <span className="font-semibold text-gray-900">{doctorNameById(assignDoctorId) || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Branch</span>
                    <span className="font-semibold text-gray-900">{branchLabelOf(assignBranchId)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Date & Time</span>
                    <span className="font-semibold text-emerald-700">{assignDate} at {assignTime}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 2-Column Row 1: Branch & Department */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-30">
                  <div>
                    <label className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1.5 block">
                      Assign at branch
                    </label>
                    <FormDropdown
                      portal={false}
                      name="assign_branch"
                      className={
                        assignTarget && assignBranchId === assignTarget.branch_id
                          ? "w-full bg-blue-50/50 border border-blue-400 rounded-xl px-3 py-2 text-sm text-[#00488D] focus:outline-none focus:ring-2 focus:ring-[#00488D]/30"
                          : inputCls
                      }
                      options={assignBranchOptions}
                      value={assignBranchId}
                      onValueChange={(v) => {
                        setAssignBranchId(v);
                        setAssignDepartmentId("");
                        setAssignDoctorId("");
                      }}
                      disabled={isBranchAdmin}
                      placeholder="Select branch"
                    />
                    {isBranchAdmin ? (
                      <p className="text-[11px] text-blue-600 mt-1">
                        Locked to your assigned branch — reassignment stays in-branch.
                      </p>
                    ) : assignTarget && assignBranchId === assignTarget.branch_id ? (
                      <p className="text-[11px] text-blue-600 mt-1">
                        Defaults to the appointment's branch — changeable.
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1.5 block">
                      Department
                    </label>
                    <FormDropdown
                      portal={false}
                      name="assign_department"
                      className={inputCls}
                      options={branchDepartmentOptions.map((d) => ({
                        label: d.department_name,
                        value: d.department_id,
                        highlight: d.department_id === assignTarget?.department_id,
                        badge: d.department_id === assignTarget?.department_id ? "Appointment's dept" : undefined,
                      }))}
                      value={assignDepartmentId}
                      onValueChange={(v) => {
                        setAssignDepartmentId(v);
                        setAssignDoctorId("");
                      }}
                      placeholder={branchDepartmentOptions.length ? "Select department" : "No departments at branch"}
                    />
                    {assignTarget && assignDepartmentId === assignTarget.department_id && assignDepartmentId && (
                      <p className="text-[11px] text-blue-600 mt-1">
                        Defaults to the appointment's department — changeable.
                      </p>
                    )}
                  </div>
                </div>

                {/* 2-Column Row 2: Doctor & Target Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-20">
                  <div>
                    <label className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1.5 block">
                      Doctor
                    </label>
                    <FormDropdown
                      portal={false}
                      name="assign_doctor"
                      className={inputCls}
                      options={assignDoctorOptions}
                      value={assignDoctorId}
                      onValueChange={setAssignDoctorId}
                      disabled={schedulesLoading || statusesLoading}
                      placeholder={
                        assignDoctorOptions.length === 0
                          ? "No doctors in department"
                          : "Select replacement doctor"
                      }
                      emptyMessage="No doctors available"
                    />
                    {schedulesLoading || statusesLoading ? (
                      <p className="text-[11px] text-[#94A3B8] mt-1 flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin text-[#00488D]" />
                        Checking doctor schedules…
                      </p>
                    ) : statusesFailed && assignBranchId && assignDate ? (
                      <p className="text-[11px] text-amber-600 mt-1">
                        Couldn't verify doctor availability — showing all doctors at this branch.
                      </p>
                    ) : assignDoctorOptions.length > 0 ? (
                      <p className="text-[11px] text-[#64748B] mt-1">
                        Showing {assignDoctorOptions.length} doctor(s) — buffer matches prioritized at top.
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1.5 block">
                      Target Date
                    </label>
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
                          !isAssignDoctorEligible(assignDoctorId, assignBranchId, day)
                        ) {
                          setAssignDoctorId("");
                        }
                      }}
                    />
                    {assignDate && (
                      <p className="text-[11px] text-[#64748B] mt-1">
                        Selected: <span className="font-semibold text-gray-800">{dayLabelOf(assignDay)}</span> ({assignDate})
                      </p>
                    )}
                  </div>
                </div>

                {/* Available 1-Hour Session Slots */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
                        Available 1-Hour Sessions
                      </span>
                      <span className="text-[11px] text-[#64748B]">
                        Session slots for the selected doctor. Slots within ±30m buffer are auto-detected.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUseManualTime(!useManualTime)}
                      className="text-xs text-[#00488D] hover:underline font-semibold"
                    >
                      {useManualTime ? "Pick from 1-hour sessions" : "Manual time"}
                    </button>
                  </div>

                  {useManualTime ? (
                    <div className="pt-1">
                      <TimepickerWheel value={assignTime} onChange={setAssignTime} />
                    </div>
                  ) : assignSlotsLoading ? (
                    <div className="py-8 text-center text-xs text-gray-500 flex flex-col items-center justify-center gap-2 bg-gray-50/60 rounded-xl border border-gray-100">
                      <Loader2 className="w-5 h-5 animate-spin text-[#00488D]" />
                      <span>Loading doctor session slots…</span>
                    </div>
                  ) : !assignDoctorId ? (
                    <div className="p-4 bg-gray-50 border border-gray-200/70 rounded-xl text-xs text-gray-500 text-center">
                      Select a doctor to view their available 1-hour sessions.
                    </div>
                  ) : assignSlots.length === 0 ? (
                    <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-800 text-center">
                      No active sessions found for this doctor on {assignDate}. Pick another date or switch to manual time.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1.5 rounded-xl border border-gray-200/80 bg-gray-50/40">
                      {assignSlots.map((slot, idx) => {
                        const isSelected = selectedSlotIndex === idx || assignTime === slot.time;
                        const isDisabled = slot.is_past || slot.is_completed || !slot.is_available;
                        const sMin = parseTimeToMinutes(slot.available_from || slot.time);
                        const targetMin = assignTimeOfDay ? parseTimeToMinutes(assignTimeOfDay) : null;
                        const delta = targetMin !== null ? sMin - targetMin : null;
                        const bufferBadge = delta === null
                          ? null
                          : Math.abs(delta) === 0
                          ? "Exact time"
                          : Math.abs(delta) <= 30
                          ? (delta > 0 ? `+${delta}m buffer` : `${delta}m buffer`)
                          : (delta > 0 ? `+${delta}m` : `${delta}m`);
                        return (
                          <button
                            key={`${slot.time}-${idx}`}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => {
                              setSelectedSlotIndex(idx);
                              setAssignTime(slot.time);
                              setAssignScheduleId(slot.schedule_id);
                            }}
                            className={`p-3 text-xs rounded-xl border text-left transition-all ${
                              isSelected
                                ? "bg-[#00488D] text-white border-[#00488D] shadow-sm ring-1 ring-[#00488D]"
                                : isDisabled
                                ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed opacity-60"
                                : "bg-white text-gray-800 border-gray-200 hover:border-[#00488D] hover:bg-blue-50/40 shadow-2xs"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold truncate text-[12.5px]">{slot.label || slot.time}</span>
                              {bufferBadge && (
                                <span
                                  className={`text-[9.5px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                                    Math.abs(delta ?? 999) <= 30
                                      ? isSelected ? "bg-white/20 text-white" : "bg-blue-100 text-[#00488D]"
                                      : isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                                  }`}
                                >
                                  {bufferBadge}
                                </span>
                              )}
                            </div>
                            <div className="text-[10.5px] opacity-80 mt-1">
                              {slot.available_from ? `Starts ${slot.available_from} · ` : ""}
                              {slot.is_completed ? "Full" : slot.is_past ? "Past" : slot.is_available ? "Available" : "Full"}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Reason */}
                <div>
                  <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1 block">
                    Reason / Remarks (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Doctor transferred to another branch"
                    className={inputCls}
                    value={assignReason}
                    onChange={(e) => setAssignReason(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sticky Bottom Actions */}
          <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between gap-3">
            {assignDone ? (
              <div className="flex justify-end w-full gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAssignDone(false);
                    setAssignTarget(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-[#00488D] text-xs font-semibold text-white hover:bg-[#003A70] transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="text-xs">
                  {assignTime ? (
                    <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Ready: {assignDate} at {assignTime}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">Pick a doctor, date, and 1-hour session</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAssignDone(false);
                      setAssignTarget(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={processing || !assignDoctorId || !assignDate || !assignTime}
                    onClick={doAssign}
                    className="px-5 py-2 rounded-xl bg-[#00488D] text-xs font-semibold text-white hover:bg-[#003A70] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
                  >
                    {processing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Assign Slot</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
          <label className="text-[10.5px] font-bold text-blue-600 uppercase tracking-[0.04em] mb-1.5 block">
            Reason (optional)
          </label>
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
          <label className="text-[10.5px] font-bold text-blue-600 uppercase tracking-[0.04em] mb-1.5 block">
            Reason (optional)
          </label>
          <textarea
            rows={2}
            className={inputCls}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </div>
      </ConfirmationDialog>

      {/* Approve Leave Dialog */}
      <ConfirmationDialog
        open={approveDialogOpen}
        type="info"
        title="Approve leave request"
        description={
          approveTarget
            ? `Approve leave for ${doctorNameById(approveTarget.employee_id)} from ${formatDate(approveTarget.leave_start_date)} to ${formatDate(approveTarget.leave_end_date)}?`
            : ""
        }
        confirmText="Approve"
        loading={processing}
        onConfirm={() => handleApproveLeave(false)}
        onCancel={() => {
          setApproveDialogOpen(false);
          setApproveTarget(null);
          setApproveRemarks("");
        }}
      >
        <div className="w-full text-left space-y-3">
          <div>
            <label className="text-[10.5px] font-bold text-blue-600 uppercase tracking-[0.04em] mb-1.5 block">
              Remarks (optional)
            </label>
            <textarea
              rows={2}
              className={inputCls}
              value={approveRemarks}
              onChange={(e) => setApproveRemarks(e.target.value)}
              placeholder="Add remarks..."
            />
          </div>
        </div>
      </ConfirmationDialog>

      {/* Decline Leave Dialog */}
      <ConfirmationDialog
        open={declineDialogOpen}
        type="danger"
        title="Decline leave request"
        description={
          declineTarget
            ? `Decline leave request for ${doctorNameById(declineTarget.employee_id)}? Remarks are required.`
            : ""
        }
        confirmText="Decline"
        loading={processing}
        onConfirm={handleDeclineLeave}
        onCancel={() => {
          setDeclineDialogOpen(false);
          setDeclineTarget(null);
          setDeclineRemarks("");
        }}
      >
        <div className="w-full text-left space-y-3">
          <div>
            <label className="text-[10.5px] font-bold text-blue-600 uppercase tracking-[0.04em] mb-1.5 block">
              Remarks *
            </label>
            <textarea
              rows={2}
              className={inputCls}
              value={declineRemarks}
              onChange={(e) => setDeclineRemarks(e.target.value)}
              placeholder="Reason for decline..."
            />
          </div>
        </div>
      </ConfirmationDialog>

      {/* Leave Conflict Dialog */}
      <ConfirmationDialog
        open={leaveConflictDialogOpen}
        type="warning"
        title="Conflicting appointments found"
        description={
          pendingApprove
            ? `There are ${leaveConflicts.length} appointments conflicting with the leave period. You can approve anyway or approve and queue them for reschedule.`
            : ""
        }
        confirmText="Approve & Queue"
        loading={processing}
        onConfirm={() => {
          if (pendingApprove) {
            handleApproveLeave(true);
          }
        }}
        onCancel={() => {
          setLeaveConflictDialogOpen(false);
          setPendingApprove(null);
        }}
      >
        <div className="w-full text-left space-y-3">
          <div className="max-h-[200px] overflow-y-auto rounded-lg border border-[#E5E7EB]">
            {leaveConflicts.map((c: any) => (
              <div key={c.appointment_id} className="px-3 py-2 border-b last:border-b-0 text-xs">
                <div className="font-medium">
                  {c.patient_first_name} {c.patient_last_name}
                </div>
                <div className="text-[#64748B]">
                  {c.appointment_date} {c.appointment_time} · {c.status}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs"
              onClick={() => {
                if (pendingApprove) {
                  handleApproveLeave(false);
                }
              }}
            >
              Approve Anyway
            </button>
          </div>
        </div>
      </ConfirmationDialog>
    </div>
  );
}
