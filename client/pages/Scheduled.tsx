import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { User, IdCard, Phone, Mail, MapPin, Cake, Droplet, VenusAndMars, Briefcase, X, Loader2, Star, CalendarOff, RotateCw, CheckCircle2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import CalendarPicker from "@/components/hms/Calender";
import ScheduleSlotModal, {
  type ScheduleSlotModalHandle,
  type ScheduleSlotAddPayload,
  type ScheduleSlotEditPayload,
  type ScheduleSlotCancelPayload,
} from "@/components/hms/ScheduleSlotModal";
import { employeeApi, type EmployeeDetailResponse, type DoctorScheduleRecord } from "@/api/employee.api";
import { appointmentApi, type AvailableSlotsResult } from "@/api/appointment.api";
import { doctorLeaveApi } from "@/api/doctorLeave.api";
import {
  doctorScheduleApi,
  type ScheduleChangeMode,
  type ScheduleChangeRecord,
} from "@/api/doctorSchedule.api";
import {
  doctorTransferApi,
  type TransferAppointmentSummary,
  type TransferAction,
} from "@/api/doctorTransfer.api";
import { getUser } from "@/utils/token";
import type { DoctorLeaveRecord } from "@/api/doctorLeave.api";
import {
  findLeaveConflictingAppointments,
  formatTimeOfDay,
  type LeaveConflict,
} from "@/utils/leaveConflicts";
import { DepartmentPill } from "@/components/hms/DepartmentBadge";
import { StatusBadge } from "@/components/hms/StatusBadge";

function formatDoctorFullName(e: EmployeeDetailResponse["employee"] | null): string {
  if (!e) return "Doctor";
  return `Dr. ${[e.first_name, e.middle_name, e.last_name].filter(Boolean).join(" ")}`;
}

// doctor_schedule.start_time/end_time come back as UTC-anchored time values
// (see toTimeInputValue in Edit Appointment.tsx for the same pattern) -- read
// with UTC getters so the displayed hour doesn't shift with the browser's
// local timezone.
function formatScheduleTime(time: string | null): string {
  if (!time) return "";
  const d = new Date(time);
  if (isNaN(d.getTime())) return "";
  const hours = d.getUTCHours();
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${minutes} ${period}`;
}

function toTimeInputValue(time: string | null | undefined): string {
  if (!time) return "";
  const d = new Date(time);
  if (isNaN(d.getTime())) return "";
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function deriveShiftName(startTime: string): string {
  const hour = Number(startTime.split(":")[0]);
  return hour < 12 ? "Morning" : "Evening";
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// dd/mm/yy -> yyyy-mm-dd (used to match doctor_schedule_change.change_date).
function weekDateToISO(dateStr: string): string {
  const [dd, mm, yy] = dateStr.split("/").map(Number);
  const date = new Date(2000 + yy, mm - 1, dd);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// change_date arrives as an ISO/date string; keep only the yyyy-mm-dd part.
function normalizeChangeDate(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? "");
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return value ?? "";
}

// Shifts a "yyyy-mm-dd" string by N days using the local
// calendar (used to expand approved-leave date ranges).
function addIsoDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate
    .slice(0, 10)
    .split("-")
    .map(Number);
  const shifted = new Date(year, month - 1, day + days);
  const y = shifted.getFullYear();
  const m = String(shifted.getMonth() + 1).padStart(2, "0");
  const d = String(shifted.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Handles both "HH:mm" / "HH:mm:ss" strings and UTC-anchored Date/ISO values.
function formatChangeTime(time: string | null | undefined): string {
  if (!time) return "";
  if (/^\d{1,2}:\d{2}/.test(time)) {
    const [h, m] = time.split(":");
    const hours = Number(h);
    const minutes = String(Number(m)).padStart(2, "0");
    const period = hours >= 12 ? "PM" : "AM";
    const h12 = hours % 12 || 12;
    return `${String(h12).padStart(2, "0")}:${minutes} ${period}`;
  }
  return formatScheduleTime(time);
}

// Input-value variant (HH:mm) of formatChangeTime for the edit modal.
function changeTimeInputValue(time: string | null | undefined): string {
  if (!time) return "";
  if (/^\d{1,2}:\d{2}/.test(time)) {
    const [h, m] = time.split(":");
    return `${String(Number(h)).padStart(2, "0")}:${String(Number(m)).padStart(2, "0")}`;
  }
  return toTimeInputValue(time);
}

const WEEK_DAYS = [
  ["Monday"],
  ["Tuesday"],
  ["Wednesday"],
  ["Thursday"],
  ["Friday"],
  ["Saturday"],
  ["Sunday"],
];

// Monday-Sunday dates (dd/mm/yy) for the week containing `reference`.
const getWeekDates = (reference) => {
  const day = reference.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(reference);
  monday.setDate(monday.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear() % 100).padStart(2, "0");
    return `${dd}/${mm}/${yy}`;
  });
};

const shiftDate = (dateStr, days) => {
  const [dd, mm, yy] = dateStr.split("/").map(Number);
  const date = new Date(2000 + yy, mm - 1, dd);
  date.setDate(date.getDate() + days);
  const newDd = String(date.getDate()).padStart(2, "0");
  const newMm = String(date.getMonth() + 1).padStart(2, "0");
  const newYy = String(date.getFullYear() % 100).padStart(2, "0");
  return `${newDd}/${newMm}/${newYy}`;
};

const parseDate = (dateStr) => {
  const [dd, mm, yy] = dateStr.split("/").map(Number);
  return new Date(2000 + yy, mm - 1, dd);
};

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const dateKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

const buildCalendarDays = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];

  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true });
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
  }

  return cells;
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const getMonthYearLabel = (year, month) => `${MONTH_NAMES[month]} ${year}`;

export default function DoctorProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  // Entering via /doctor/day-view/:id opens on the Day tab, /doctor/view/:id
  // opens on Week -- both routes render this same merged page now, so the
  // entry URL just decides the initial tab instead of navigating to a
  // separate page.
  const [activeTab, setActiveTab] = useState(() =>
    location.pathname.includes("/doctor/day-view") ? "day" : "week",
  );
  const [toggledDates, setToggledDates] = useState<Set<string>>(new Set());
  const slotModalRef = useRef<ScheduleSlotModalHandle>(null);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [leaveSuccessOpen, setLeaveSuccessOpen] = useState(false);
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [leaveSuccessInfo, setLeaveSuccessInfo] = useState<{
    from: string;
    to: string;
    leaveId?: string;
    queuedCount?: number;
    queueFailed?: boolean;
  } | null>(null);
  const [leaveConflicts, setLeaveConflicts] = useState<
    LeaveConflict[]
  >([]);
  const [leaveConflictsOpen, setLeaveConflictsOpen] =
    useState(false);
  const [processingLeave, setProcessingLeave] = useState(false);
  const leaveFormRef = useRef<HTMLFormElement | null>(null);
  const [isFromCalendarOpen, setIsFromCalendarOpen] = useState(false);
  const [isToCalendarOpen, setIsToCalendarOpen] = useState(false);
  const [savingSlot, setSavingSlot] = useState(false);
  const [pendingTransfer, setPendingTransfer] = useState<{
    transferId: string;
    appointments: TransferAppointmentSummary[];
    message: string;
  } | null>(null);
  const [transferAction, setTransferAction] = useState<TransferAction | null>(null);
  const [replacementDoctorId, setReplacementDoctorId] = useState("");
  const [isConfirmingTransfer, setIsConfirmingTransfer] = useState(false);
  const [weekDates, setWeekDates] = useState(() => getWeekDates(new Date()));
  const [calendarViewYear, setCalendarViewYear] = useState(() => new Date().getFullYear());
  const [calendarViewMonth, setCalendarViewMonth] = useState(() => new Date().getMonth());
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<Date | null>(() => {
    const first = weekDates[0];
    const [dd, mm, yy] = first.split("/").map(Number);
    return new Date(2000 + yy, mm - 1, dd);
  });

  // Multi-select dates for calendar (double-click + Ctrl+Click)
  const [selectedDates, setSelectedDates] = useState<Date[]>(() => {
    // Default to Monday-Sunday of current week
    const week = getWeekDates(new Date());
    return week.map((d) => {
      const [dd, mm, yy] = d.split("/").map(Number);
      return new Date(2000 + yy, mm - 1, dd);
    });
  });

  // Week start for calendar sync
  const [calendarWeekStart, setCalendarWeekStart] = useState<Date>(() => {
    const first = weekDates[0];
    const [dd, mm, yy] = first.split("/").map(Number);
    return new Date(2000 + yy, mm - 1, dd);
  });

  const [doctorDetail, setDoctorDetail] = useState<EmployeeDetailResponse | null>(null);

  // Date-specific (non-recurring) schedule changes for the doctor: ADD /
  // OVERRIDE / CANCEL records loaded for the Week tab.
  const [weekChanges, setWeekChanges] = useState<ScheduleChangeRecord[]>([]);
  const [weekChangesLoading, setWeekChangesLoading] = useState(false);

  // APPROVED leaves for this doctor — week view marks covered
  // days with a "Doctor Leave" banner.
  const [approvedLeaves, setApprovedLeaves] = useState<
    DoctorLeaveRecord[]
  >([]);

  const loadApprovedLeaves = useCallback(async () => {
    if (!id) {
      setApprovedLeaves([]);
      return;
    }

    try {
      const response = await doctorLeaveApi.getApprovedLeavesForDoctor(id);
      setApprovedLeaves(response.data?.leaves ?? []);
    } catch (err) {
      console.error("[Doctor Profile] Failed to load approved leaves:", err);
      setApprovedLeaves([]);
    }
  }, [id]);

  useEffect(() => {
    void loadApprovedLeaves();
  }, [loadApprovedLeaves]);

  /* =======================================================
     APPROVED LEAVES BY DATE
     ======================================================= */

  // Expands each APPROVED leave into every calendar day it
  // covers (yyyy-mm-dd keys, matching weekDateToISO output)
  // so the week grid can flag covered columns directly.
  const leaveByIso = useMemo(() => {
    const map = new Map<string, DoctorLeaveRecord>();

    for (const leave of approvedLeaves) {
      const startIso = String(
        leave.leave_start_date
      ).slice(0, 10);
      const endIso = String(
        leave.leave_end_date
      ).slice(0, 10);

      if (!startIso || !endIso) {
        continue;
      }

      let cursor = startIso;
      let guard = 0;

      while (
        cursor <= endIso &&
        guard < 732
      ) {
        map.set(cursor, leave);
        cursor = addIsoDays(cursor, 1);
        guard += 1;
      }
    }

    return map;
  }, [approvedLeaves]);

  useEffect(() => {
    if (!id) return;
    employeeApi
      .getOne(id)
      .then((res) => {
        setDoctorDetail(res.data?.data ?? null);
      })
      .catch((err) => {
        console.error("[Doctor Profile] Error:", err);
        setDoctorDetail(null);
      });
  }, [id]);

  // Real available slots for the selected day (today), fetched from the
  // appointments API for the doctor being viewed here.
  const [todaySlots, setTodaySlots] = useState<AvailableSlotsResult | null>(null);
  const [isSlotsLoading, setIsSlotsLoading] = useState(false);

  const doctorEmployee = doctorDetail?.employee ?? null;
  const doctorName = formatDoctorFullName(doctorEmployee);
  const doctorSpecialization = doctorDetail?.doctorProfile?.specialization || doctorEmployee?.specialization || "";
  const doctorQualification = doctorDetail?.doctorProfile?.qualification || doctorEmployee?.qualification || "";
  const doctorBranchNames = (doctorDetail?.branches?.length
    ? doctorDetail.branches.map((b) => b.branch_name)
    : doctorEmployee?.branch?.branch_name
      ? [doctorEmployee.branch.branch_name]
      : []
  );
  const doctorIsAvailable = doctorEmployee?.emp_status === true || doctorDetail?.user?.user_status === 0;
  // Only a real photo URL from the backend is used -- no stock/fallback
  // image, so the avatar block simply doesn't render when the doctor has
  // no employee_photo_URL on file.
  const doctorPhoto = doctorEmployee?.employee_photo_URL || "";
  const doctorLicenseNo = doctorDetail?.doctorProfile?.license_no || doctorEmployee?.license_no || "";
  const doctorPhone = doctorEmployee?.mobile_no || "";
  const doctorEmail = doctorEmployee?.email || "";
  const doctorLocation = doctorEmployee?.current_address || doctorEmployee?.parmanent_address || "";
  const doctorBloodGroup = doctorEmployee?.blood_group || "";
  const doctorExperience = doctorEmployee?.employee_no_experence != null ? `${doctorEmployee.employee_no_experence}+ yrs` : "";
  const doctorDOB = (doctorEmployee as any)?.dob
    ? format(new Date((doctorEmployee as any).dob), "dd MMM yyyy")
    : "";
  const doctorGender = (doctorEmployee as any)?.gender || "";

  useEffect(() => {
    const branchId = doctorDetail?.branches?.[0]?.branch_id;
    if (!id || !branchId) return;

    setIsSlotsLoading(true);
    appointmentApi
      .getAvailableSlots(id, branchId, format(new Date(), "yyyy-MM-dd"))
      .then((res) => {
        setTodaySlots(res.data?.data ?? null);
      })
      .catch((err) => {
        console.error("[Doctor Profile] Failed to load available slots:", err);
        setTodaySlots(null);
      })
      .finally(() => {
        setIsSlotsLoading(false);
      });
  }, [id, doctorDetail]);

  const calendarDays = buildCalendarDays(calendarViewYear, calendarViewMonth);

  // Past-dated notes are frozen in Week view: no add/override/cancel/edit/delete.
  const todayIso = format(new Date(), "yyyy-MM-dd");

  // Real weekly availability, grouped by day_of_week from the doctor's
  // active doctor_schedule rows (part of the same employeeApi.getOne(id)
  // response used above) -- no fake/placeholder slots. Since doctor_schedule
  // is a recurring weekly template (day_of_week, not a specific date), the
  // same grid applies to every week; only the displayed dates change when
  // navigating weeks.
  const doctorSchedules: DoctorScheduleRecord[] = doctorDetail?.doctorSchedules ?? [];

  const scheduleByDay = useMemo(() => {
    const map: Record<
      string,
      { time: string; branch: string; branchId: string; startTime: string; endTime: string; scheduleId: string | number }[]
    > = {};
    WEEK_DAYS.forEach(([day]) => {
      map[day.toUpperCase()] = [];
    });
    doctorSchedules.forEach((s) => {
      const key = (s.day_of_week || "").toUpperCase();
      if (!(key in map)) return;
      map[key].push({
        time: `${formatScheduleTime(s.start_time)} - ${formatScheduleTime(s.end_time)}`,
        branch: s.branch?.branch_name || "",
        branchId: s.branch_id,
        startTime: toTimeInputValue(s.start_time),
        endTime: toTimeInputValue(s.end_time),
        scheduleId: s.schedule_id,
      });
    });
    return map;
  }, [doctorSchedules]);

  const maxScheduleRows = Math.max(
    1,
    ...WEEK_DAYS.map(([day]) => scheduleByDay[day.toUpperCase()]?.length || 0),
  );

  const schedule = Array.from({ length: maxScheduleRows }, (_, rowIndex) =>
    WEEK_DAYS.map(([day]) => {
      const entry = scheduleByDay[day.toUpperCase()]?.[rowIndex];
      return entry
        ? ([
            entry.time,
            "blue",
            entry.branch,
            entry.scheduleId,
            entry.branchId,
            entry.startTime,
            entry.endTime,
          ] as [string, string, string, string | number, string, string, string])
        : (["+", "empty"] as [string, string]);
    }),
  );

  // Role-based permission: only the doctor themselves or an admin may modify
  // the doctor's date-specific schedule changes. Everyone else views
  // read-only (controls are hidden; the backend enforces this too).
  const viewer = getUser();
  const viewerEmployeeId = viewer?.employee_id ?? viewer?.id ?? null;
  const viewerRole = String(viewer?.role_type ?? viewer?.role ?? "").toUpperCase();
  const viewerIsAdmin = ["HEAD_ADMIN", "SUPER_ADMIN", "ADMIN", "BRANCH_ADMIN"].includes(viewerRole);
  const viewerIsSelf = !!id && String(viewerEmployeeId) === String(id);
  const canManageSchedule = viewerIsSelf || viewerIsAdmin;

  const refetchWeekChanges = useCallback(async () => {
    if (!id || activeTab !== "week") return;
    setWeekChangesLoading(true);
    try {
      const res = await doctorScheduleApi.getChanges(id);
      setWeekChanges(res.data?.data ?? []);
    } catch (err) {
      console.error("[Doctor Profile] Failed to load schedule changes:", err);
      setWeekChanges([]);
    } finally {
      setWeekChangesLoading(false);
    }
  }, [id, activeTab]);

  useEffect(() => {
    refetchWeekChanges();
  }, [refetchWeekChanges]);

  const branchNameById = (branchId: string): string =>
    doctorDetail?.branches?.find((b) => b.branch_id === branchId)?.branch_name ?? "";

  // Effective per-day grid for the Week tab: the recurring weekly template
  // merged with the doctor's date-specific changes. Uses the same rules the
  // backend applies in getEffectiveSchedules - CANCEL wins for the whole
  // day, OVERRIDE replaces the template, ADD appends extra blocks.
  type WeekBlock = {
    key: string;
    type: "template" | "ADD" | "OVERRIDE" | "CANCEL";
    time: string;
    branch: string;
    branchId: string;
    scheduleId: string | number | null;
    changeId?: string | number | null;
    startTime: string;
    endTime: string;
  };

  const weekSchedule = useMemo(() => {
    if (activeTab !== "week") return [];

    const perDay: WeekBlock[][] = WEEK_DAYS.map((_, dayIdx) => {
      const iso = weekDateToISO(weekDates[dayIdx]);
      const dayChanges = weekChanges.filter((c) => normalizeChangeDate(c.change_date) === iso);

      const cancelChange = dayChanges.find((c) => c.mode === "CANCEL");
      if (cancelChange) {
        return [
          {
            key: `cancel-${iso}`,
            type: "CANCEL",
            time: "Day cancelled",
            branch: "",
            branchId: cancelChange.branch_id,
            scheduleId: null,
            changeId: cancelChange.change_id,
            startTime: "",
            endTime: "",
          },
        ];
      }

      const overrideChanges = dayChanges.filter(
        (c) => c.mode === "OVERRIDE" && c.start_time && c.end_time,
      );
      const addChanges = dayChanges.filter((c) => c.mode === "ADD" && c.start_time && c.end_time);

      const templateBlocks: WeekBlock[] = (
        scheduleByDay[WEEK_DAYS[dayIdx][0].toUpperCase()] ?? []
      ).map((e) => ({
        key: `tmpl-${e.scheduleId}`,
        type: "template",
        time: e.time,
        branch: e.branch,
        branchId: e.branchId,
        scheduleId: e.scheduleId,
        startTime: e.startTime,
        endTime: e.endTime,
      }));

      let blocks: WeekBlock[] =
        overrideChanges.length > 0
          ? overrideChanges.map((c) => ({
              key: `ovr-${c.change_id}`,
              type: "OVERRIDE" as const,
              time: `${formatChangeTime(c.start_time)} - ${formatChangeTime(c.end_time)}`,
              branch: branchNameById(c.branch_id),
              branchId: c.branch_id,
              scheduleId: templateBlocks[0]?.scheduleId ?? null,
              changeId: c.change_id,
              startTime: changeTimeInputValue(c.start_time),
              endTime: changeTimeInputValue(c.end_time),
            }))
          : templateBlocks;

      for (const c of addChanges) {
        blocks = [
          ...blocks,
          {
            key: `add-${c.change_id}`,
            type: "ADD" as const,
            time: `${formatChangeTime(c.start_time)} - ${formatChangeTime(c.end_time)}`,
            branch: branchNameById(c.branch_id),
            branchId: c.branch_id,
            scheduleId: blocks[0]?.scheduleId ?? null,
            changeId: c.change_id,
            startTime: changeTimeInputValue(c.start_time),
            endTime: changeTimeInputValue(c.end_time),
          },
        ];
      }

      return blocks;
    });

    const rows = Math.max(1, ...perDay.map((d) => d.length));

    return Array.from({ length: rows }, (_, r) =>
      WEEK_DAYS.map((_, dayIdx) => {
        const entry = perDay[dayIdx][r];
        if (!entry) return ["+", "empty"] as [string, string];
        return [
          entry.time,
          entry.type,
          entry.branch,
          entry.scheduleId,
          entry.branchId,
          entry.startTime,
          entry.endTime,
          entry.changeId ?? null,
          entry.type,
        ] as [
          string,
          string,
          string,
          string | number | null,
          string,
          string,
          string,
          string | number | null,
          string,
        ];
      }),
    );
  }, [activeTab, weekDates, weekChanges, scheduleByDay, doctorDetail]);


  const refetchDoctor = () => {
    if (!id) return;
    employeeApi
      .getOne(id)
      .then((res) => setDoctorDetail(res.data?.data ?? null))
      .catch((err) => console.error("[Doctor Profile] Failed to refresh schedule:", err));
  };

  const replacementDoctors = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of pendingTransfer?.appointments ?? []) {
      for (const d of a.eligible_replacement_doctors ?? []) {
        if (!map.has(d.employee_id)) map.set(d.employee_id, d.name);
      }
    }
    return Array.from(map, ([employee_id, name]) => ({ employee_id, name }));
  }, [pendingTransfer]);

  // Creates or updates a date-specific (non-recurring) schedule change
  // (ADD / OVERRIDE / CANCEL) via the doctor_schedule_change table. Used by
  // the Week tab; the Day tab keeps its existing transfer-based flow.
  const handleDateChange = async ({
    day,
    date,
    branchId,
    startTime,
    endTime,
    changeMode,
    changeId,
    transferReason,
  }: {
    day: string;
    date: string;
    branchId: string;
    startTime: string;
    endTime: string;
    changeMode?: ScheduleChangeMode;
    changeId?: string | number | null;
    transferReason?: string;
  }): Promise<boolean> => {
    if (!id || !branchId) {
      showAlert("Please select a branch location.");
      return false;
    }
    if (!date) {
      showAlert("Date is required.");
      return false;
    }
    if (!changeMode) {
      showAlert("Please choose a change type (Add / Override / Cancel).");
      return false;
    }
    if (changeMode !== "CANCEL" && (!startTime || !endTime)) {
      showAlert("Please select start time and end time.");
      return false;
    }

    // Client-side pre-check mirroring the backend cross-branch ADD /
    // OVERRIDE overlap rule - instant feedback only; backend stays authoritative.
    if (changeMode !== "CANCEL" && startTime && endTime) {
      const isoDate = normalizeChangeDate(date);
      const newStart = toMinutes(startTime);
      const newEnd = toMinutes(endTime);

      const conflict = weekChanges.find((c) => {
        if (c.is_active === false) return false;
        if (String(c.change_id) === String(changeId ?? "")) return false;
        if (normalizeChangeDate(c.change_date) !== isoDate) return false;
        if (c.mode !== "ADD" && c.mode !== "OVERRIDE") return false;
        if (!c.start_time || !c.end_time) return false;
        const existingStart = toMinutes(changeTimeInputValue(c.start_time));
        const existingEnd = toMinutes(changeTimeInputValue(c.end_time));
        return newStart < existingEnd && newEnd > existingStart;
      });

      if (conflict) {
        const fmt = (mins: number) =>
          `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
        const cStart = toMinutes(changeTimeInputValue(conflict.start_time));
        const cEnd = toMinutes(changeTimeInputValue(conflict.end_time));
        const conflictBranch = branchNameById(conflict.branch_id);
        showAlert(
          `This ${changeMode} overlaps an existing ${conflict.mode} on this date ` +
            `(${fmt(cStart)}-${fmt(cEnd)})${conflictBranch ? ` at ${conflictBranch}` : ""}. Adjust the times.`,
        );
        return false;
      }
    }

    setSavingSlot(true);
    try {
      // Date-changes ride the transfer machinery so affected appointments
      // receive the same Transfer / Reschedule / Cancel popup as slots.
      const res = await doctorTransferApi.initiateTransfer(id, {
        mode: "ADD_BRANCH",
        new_branch_id: branchId,
        effective_date: date,
        transfer_reason: transferReason?.trim() || `${changeMode} ${date}`,
        schedule_change: {
          action: changeId != null ? "UPDATE" : "CREATE",
          mode: changeMode!,
          branch_id: branchId,
          change_date: date,
          start_time: changeMode === "CANCEL" ? undefined : startTime,
          end_time: changeMode === "CANCEL" ? undefined : endTime,
          reason: transferReason?.trim(),
          change_id: changeId != null ? Number(changeId) : undefined,
        },
      });

      const data = res.data?.data;
      if (!data) {
        showAlert(res.data?.message || "Failed to save schedule change.");
        return false;
      }

      if (data.status === "PENDING_CONFIRMATION") {
        setPendingTransfer({
          transferId: data.transfer_id,
          appointments: data.appointments ?? [],
          message: data.message ?? "",
        });
        setTransferAction(null);
        setReplacementDoctorId("");
        return true;
      }

      await refetchWeekChanges();
      showAlert(data.message || `Schedule change saved for ${day}.`);
      return true;
    } catch (err: any) {
      showAlert(err?.response?.data?.message || err?.message || "Failed to save schedule change.");
      return false;
    } finally {
      setSavingSlot(false);
    }
  };

  const handleAddSlot = async (payload: ScheduleSlotAddPayload) => {
    if (payload.mode === "date" && payload.changeMode) {
      return handleDateChange({
        day: payload.day,
        date: payload.date || payload.effectiveDate || "",
        branchId: payload.branchId,
        startTime: payload.startTime,
        endTime: payload.endTime,
        changeMode: payload.changeMode,
        transferReason: payload.transferReason,
      });
    }

    const {
      day,
      branchId,
      branchName,
      startTime,
      endTime,
      timeLabel,
      effectiveDate,
      consultationMinutes,
      transferReason,
    } = payload;

    if (!id || !branchId) {
      showAlert("Please select a branch location.");
      return false;
    }

    if (!startTime || !endTime) {
      showAlert("Please select start time and end time.");
      return false;
    }

    setSavingSlot(true);
    try {
      await employeeApi.addScheduleSlot(id, {
        branch_id: branchId,
        day_of_week: day.toUpperCase() as any,
        shift_name: deriveShiftName(startTime),
        start_time: startTime,
        end_time: endTime,
        effective_from: null,
        effective_to: null,
      });
      await refetchDoctor();
      showAlert(`Schedule slot added for ${day}.`);
      return true;
    } catch (err: any) {
      showAlert(err?.response?.data?.message || err?.message || "Failed to add schedule slot.");
      return false;
    } finally {
      setSavingSlot(false);
    }
  };

  const handleUpdateSlot = async (payload: ScheduleSlotEditPayload) => {
    if (!id || !payload.branchId) {
      showAlert("Please select a branch location.");
      return false;
    }

    if (payload.mode === "date" && payload.changeMode) {
      return handleDateChange({
        day: payload.day,
        date: payload.date || payload.effectiveDate || "",
        branchId: payload.branchId,
        startTime: payload.startTime,
        endTime: payload.endTime,
        changeMode: payload.changeMode,
        changeId: payload.changeId,
        transferReason: payload.transferReason,
      });
    }

    setSavingSlot(true);
    try {
      await employeeApi.updateScheduleSlot(id, payload.scheduleId, {
        branch_id: payload.branchId,
        day_of_week: payload.day.toUpperCase() as any,
        shift_name: deriveShiftName(payload.startTime),
        start_time: payload.startTime,
        end_time: payload.endTime,
        effective_from: null,
        effective_to: null,
      });
      await refetchDoctor();
      showAlert(`Schedule slot updated for ${payload.day}.`);
      return true;
    } catch (err: any) {
      showAlert(err?.response?.data?.message || err?.message || "Failed to update schedule slot.");
      return false;
    } finally {
      setSavingSlot(false);
    }
  };

  const handleCancelSlot = async (payload: ScheduleSlotCancelPayload) => {
    if (!id) return;

    setSavingSlot(true);
    try {
      if (payload.changeId != null) {
        await doctorScheduleApi.cancelChange(String(payload.changeId));
        await refetchWeekChanges();
      } else if (payload.scheduleId != null) {
        await employeeApi.removeScheduleSlot(id, payload.scheduleId);
        await refetchDoctor();
      }
      showAlert("Schedule slot removed.");
    } catch (err: any) {
      showAlert(err?.response?.data?.message || err?.message || "Failed to remove schedule slot.");
    } finally {
      setSavingSlot(false);
    }
  };

  const openBlockCancel = (event: React.MouseEvent, rowIndex: number, colIndex: number) => {
    event.stopPropagation();
    if (!canManageSchedule) return;
    const cell = (activeTab === "week" ? weekSchedule : schedule)[rowIndex]?.[colIndex] as any[] | undefined;
    if (!cell) return;
    slotModalRef.current?.openCancelSlot(
      WEEK_DAYS[colIndex][0],
      rowIndex,
      colIndex,
      cell[0],
      cell[2],
      cell[3] ?? null,
      cell[7] ?? null,
      cell[8],
    );
  };

  const showDelete = canManageSchedule && (activeTab !== "week" || weekDates.some((date) => weekDateToISO(date) >= todayIso));

  const confirmPendingTransfer = async (action: TransferAction) => {
    if (!pendingTransfer || !id) return;
    if (action === "TRANSFER" && !replacementDoctorId) {
      showAlert("Please select a replacement doctor.");
      return;
    }
    setIsConfirmingTransfer(true);
    try {
      await doctorTransferApi.confirmTransfer(id, {
        transfer_id: pendingTransfer.transferId,
        action,
        replacement_employee_id: action === "TRANSFER" ? replacementDoctorId : undefined,
      });
      setPendingTransfer(null);
      setTransferAction(null);
      await refetchDoctor();
      await refetchWeekChanges();
      showAlert("Transfer action completed.");
    } catch (err: any) {
      showAlert(err?.response?.data?.message || err?.message || "Failed to complete transfer action.");
    } finally {
      setIsConfirmingTransfer(false);
    }
  };

  const shiftWeek = (dir: number) => {
    setWeekDates((prev) => {
      const newDates = prev.map((d) => {
        const [dd, mm, yy] = d.split("/").map(Number);
        const dt = new Date(2000 + yy, mm - 1, dd);
        dt.setDate(dt.getDate() + dir * 7);
        const nd = String(dt.getDate()).padStart(2, "0");
        const nm = String(dt.getMonth() + 1).padStart(2, "0");
        const ny = String(dt.getFullYear() % 100).padStart(2, "0");
        return `${nd}/${nm}/${ny}`;
      });
      // sync calendar selection to first day of the new week
      const [dd, mm, yy] = newDates[0].split("/").map(Number);
      const newWeekStart = new Date(2000 + yy, mm - 1, dd);
      setCalendarSelectedDate(newWeekStart);
      setCalendarWeekStart(newWeekStart);
      // Update selected dates to new week's Mon-Sun (default behavior)
      const newSelectedDates = newDates.map((d) => {
        const [dd2, mm2, yy2] = d.split("/").map(Number);
        return new Date(2000 + yy2, mm2 - 1, dd2);
      });
      setSelectedDates(newSelectedDates);
      return newDates;
    });
  };

  const showAlert = (message) => {
    alert(message);
  };

const submitLeave = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  const formEl = e.currentTarget;
  leaveFormRef.current = formEl;

  if (!id) {
    alert("Doctor ID is missing.");
    return;
  }

  const form = new FormData(formEl);
  const reason = String(form.get("reason") || "").trim();

  if (!fromDate || !toDate || !reason) {
    alert("Please fill in all leave details.");
    return;
  }

  if (toDate < fromDate) {
    alert("The To date cannot be before the From date.");
    return;
  }

  setLeaveConfirmOpen(true);
};

const doApplyLeave = async () => {
  if (!id) {
    setLeaveConfirmOpen(false);
    alert("Doctor ID is missing.");
    return;
  }

  if (!fromDate || !toDate) {
    setLeaveConfirmOpen(false);
    return;
  }

  try {
    setProcessingLeave(true);

    // Check for booked appointments inside the leave range
    // before actually applying.
    const conflicts = await findLeaveConflictingAppointments(
      id,
      format(fromDate, "yyyy-MM-dd"),
      format(toDate, "yyyy-MM-dd")
    );

    setLeaveConfirmOpen(false);

    if (conflicts.length > 0) {
      setLeaveConflicts(conflicts);
      setLeaveConflictsOpen(true);
      return;
    }

    await applyLeaveNow(false);
  } catch (error: any) {
    console.error("Leave conflict check failed:", error);

    alert(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to check appointments for this leave period."
    );
  } finally {
    setProcessingLeave(false);
  }
};

const applyLeaveNow = async (queueConflicts: boolean) => {
  if (!id) {
    setLeaveConflictsOpen(false);
    alert("Doctor ID is missing.");
    return;
  }

  try {
    setSubmittingLeave(true);

    const loggedInUser = getUser();

    if (!loggedInUser?.user_id) {
      setLeaveConflictsOpen(false);
      alert("Logged-in user information is missing. Please log in again.");
      return;
    }

    const formEl = leaveFormRef.current;
    const reason = formEl
      ? String(new FormData(formEl).get("reason") || "").trim()
      : "";

    const response = await doctorLeaveApi.apply(id, {
      leave_start_date: format(fromDate, "yyyy-MM-dd"),
      leave_end_date: format(toDate, "yyyy-MM-dd"),
      leave_reason: reason,
      requested_by: loggedInUser.user_id,
    });

    if (response.data?.success === false) {
      throw new Error(response.data.message || "Failed to apply leave.");
    }

    let queuedCount: number | undefined;
    let queueFailed = false;

    if (queueConflicts && fromDate && toDate) {
      try {
        const queueResponse = await doctorLeaveApi.queueReschedule(id, {
          date_from: format(fromDate, "yyyy-MM-dd"),
          date_to: format(toDate, "yyyy-MM-dd"),
          reason,
        });
        queuedCount = queueResponse.data?.data?.queued;
      } catch (queueError: any) {
        console.error("Reschedule queueing failed:", queueError);
        queueFailed = true;
      }
    }

    setLeaveSuccessInfo({
      from: format(fromDate, "dd/MM/yyyy"),
      to: format(toDate, "dd/MM/yyyy"),
      leaveId: response.data?.leave?.leave_id,
      queuedCount,
      queueFailed,
    });

    setLeaveConflictsOpen(false);
    setLeaveSuccessOpen(true);

    // Admin-submitted leaves auto-approve, so refresh the
    // week grid's leave markers right away.
    void loadApprovedLeaves();

    formEl?.reset();
    setFromDate(null);
    setToDate(null);
  } catch (error: any) {
    console.error("Leave application failed:", error);
    console.error("Backend response:", error?.response?.data);

    setLeaveConfirmOpen(false);
    setLeaveConflictsOpen(false);

    alert(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to apply for leave."
    );
  } finally {
    setSubmittingLeave(false);
  }
};

  const previousWeek = () => {
    setWeekDates((prev) => prev.map((date) => shiftDate(date, -7)));
  };

  const nextWeek = () => {
    setWeekDates((prev) => prev.map((date) => shiftDate(date, 7)));
  };

  const previousMonth = () => {
    setCalendarViewMonth((prev) => {
      if (prev === 0) {
        setCalendarViewYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const nextMonth = () => {
    setCalendarViewMonth((prev) => {
      if (prev === 11) {
        setCalendarViewYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  return (
    <div>
      <main className="min-h-screen bg-[#f7f9fc] p-6 text-[#172033]">
        <div className="mx-auto max-w-[1580px] p-4">
          <div className="space-y-6">
            <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 px-3 py-2 border border-[#E5E7EB] bg-white rounded-lg text-sm font-medium text-[#424752] hover:bg-gray-50 mb-2">
              ← Doctors
            </button>
            {/* Profile Header */}
            <section className="bg-white border border-[#E5E7EB] rounded-[12px] p-6 flex gap-6 transition-shadow duration-200 hover:shadow-md">
              <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                {doctorPhoto ? <img src={doctorPhoto} alt={doctorName} className="w-full h-full object-cover" /> : <User className="w-12 h-12 text-gray-400" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold">{doctorName}</h1>
                  <span className="text-xs px-3 py-1 rounded-full bg-[#f1f6ff] text-[#004a91] font-semibold">{doctorSpecialization}</span>
                </div>
                <p className="text-sm text-[#424752] mt-1">{doctorQualification}</p>
                <div className="mt-4 text-sm text-[#424752]">Hospital: {doctorBranchNames?.join(", ") || "-"}</div>
                <div className="flex items-center justify-between mt-4">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-[#e9f9ee] text-[#1a9c53]">● Available</span>
                  <button
                    onClick={() => { if(!id) return; navigate("/appointments/add", { state: { doctorId: id } }) }}
                    className="bg-[#004785] text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-[#003a6b]"
                  >
                    Book Appointment
                  </button>
                </div>
              </div>
            </section>

            {/* About Card */}
            <section className="bg-white border border-[#edf0f4] rounded-[10px] p-6 transition-shadow duration-200 hover:shadow-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">About</h2>
                <button
                  onClick={() => navigate(`/staff/view/${id}`)}
                  className="text-sm text-[#135dc5] underline"
                >
                  View More
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  {label:"Medical Licence Number", value: doctorLicenseNo, icon: <IdCard className="w-4 h-4" />},
                  {label:"Phone Number", value: doctorPhone, icon: <Phone className="w-4 h-4" />},
                  {label:"Email", value: doctorEmail, icon: <Mail className="w-4 h-4" />},
                  {label:"Location", value: doctorLocation, icon: <MapPin className="w-4 h-4" />},
                  {label:"DOB", value: doctorDOB, icon: <Cake className="w-4 h-4" />},
                  {label:"Blood group", value: doctorBloodGroup, icon: <Droplet className="w-4 h-4" />},
                  {label:"Gender", value: doctorGender, icon: <VenusAndMars className="w-4 h-4" />},
                  {label:"Experience", value: doctorExperience, icon: <Briefcase className="w-4 h-4" />},
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="w-6 h-6 text-gray-600 flex-shrink-0">{item.icon}</div>
                    <div>
                      <strong className="block text-xs font-semibold text-[#222938]">{item.label}</strong>
                      <span className="text-xs text-[#6d7480]">{item.value ?? "-"}</span>
                    </div>
                  </div>
                ))}
              </div>
              <hr className="my-6 border-[#edf0f4]" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Short Bio</h3>
                <p className="text-sm text-[#5f6672] leading-6">{doctorDetail?.doctorProfile?.doctor_bio || "No bio available."}</p>
              </div>
            </section>

            {/* Tabs */}
            <div className="h-[39px] flex items-center justify-center gap-[42px] bg-transparent">
              {["day", "week"].map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`h-[39px] px-[17px] bg-transparent border-0 text-[12px] cursor-pointer ${activeTab === t ? "text-[#004a91] border-b-[2px] border-[#004a91] font-semibold" : "text-[#4c515a] border-b-[2px] border-transparent"}`}
                >
                  {t === "day" ? "Day" : "Week"}
                </button>
              ))}
            </div>
          </div>

          {/* Main grid */}
          <div className="grid lg:grid-cols-[1fr_345px] gap-6 items-start mt-6">
            <div>
            <section className="bg-white border border-[#edf0f4] rounded-[10px] p-[31px] max-[500px]:p-5 transition-shadow duration-200 hover:shadow-md">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="text-[19px] font-semibold">Availability</h2>
              <div className="flex items-center gap-4 flex-wrap">
                {activeTab === "week" && (
                  <span className="flex items-center gap-4">
                    <button onClick={() => shiftWeek(-1)} className="text-xs text-[#555e6c] hover:underline">‹ Previous week</button>
                    <button onClick={() => shiftWeek(1)} className="text-xs text-[#555e6c] hover:underline">Next week ›</button>
                  </span>
                )}
                {canManageSchedule && (
                  <button
                    onClick={() =>
                      slotModalRef.current?.openAddSlot(
                        "",
                        null,
                        null,
                        activeTab === "week" ? "date" : "weekly",
                        undefined,
                        activeTab === "week" ? "ADD" : undefined,
                      )
                    }
                    className="bg-[#004a91] text-white px-3 py-2 rounded-md text-xs font-semibold"
                  >
                    + Add slot
                  </button>
                )}
              </div>
            </div>

              {/* SCHEDULE */}
              <div className="border border-[#b9bfcb] rounded-[7px] overflow-x-auto">

                <div className="min-w-[610px]">

                  {/* HEADER */}
                  <div className="grid grid-cols-7 bg-[#f1f3f5] border-b border-[#b9bfcb]">

                    {WEEK_DAYS.map(([day], dayIdx) => (
                      <div
                        key={day}
                        className={`min-h-[43px] p-[7px_3px] border-r border-[#b9bfcb] text-center text-[#003b80] text-[8px] font-bold ${
                          activeTab === "day" ? "flex items-center justify-center" : ""
                        }`}
                      >
                        {day}
                        {activeTab === "week" && (
                          <small className="block mt-[3px] text-[7px]">
                            {weekDates[dayIdx]}
                          </small>
                        )}
                        {activeTab === "week" && (
                          <div className="flex items-center justify-center gap-[3px] mt-[3px]">
                            <button
                              type="button"
                              title="Add a shift for this date"
                              onClick={() =>
                                slotModalRef.current?.openAddSlot(
                                  WEEK_DAYS[dayIdx][0],
                                  null,
                                  null,
                                  "date",
                                  weekDateToISO(weekDates[dayIdx]),
                                  "ADD",
                                )
                              }
                              className="w-[15px] h-[15px] rounded border border-[#b9bfcb] bg-white text-[#004a91] text-[9px] leading-none cursor-pointer hover:border-[#004a91]"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              title="Override this date's schedule"
                              onClick={() =>
                                slotModalRef.current?.openAddSlot(
                                  WEEK_DAYS[dayIdx][0],
                                  null,
                                  null,
                                  "date",
                                  weekDateToISO(weekDates[dayIdx]),
                                  "OVERRIDE",
                                )
                              }
                              className="w-[15px] h-[15px] rounded border border-[#b9bfcb] bg-white text-[#b45309] text-[9px] leading-none cursor-pointer hover:border-[#b45309]"
                            >
                              <RotateCw className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              title="Cancel this date"
                              onClick={() =>
                                slotModalRef.current?.openAddSlot(
                                  WEEK_DAYS[dayIdx][0],
                                  null,
                                  null,
                                  "date",
                                  weekDateToISO(weekDates[dayIdx]),
                                  "CANCEL",
                                )
                              }
                              className="w-[15px] h-[15px] rounded border border-[#b9bfcb] bg-white text-[#ff453a] text-[9px] leading-none cursor-pointer hover:border-[#ff453a]"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        {activeTab === "week" &&
                          leaveByIso.has(
                            weekDateToISO(weekDates[dayIdx])
                          ) && (
                            <div className="mt-[3px] flex justify-center">
                              <span
                                title="Approved leave covers this date"
                                className="rounded bg-[#FDE8E8] px-1 py-0.5 text-[7px] font-bold uppercase tracking-wide text-[#9B1C1C]"
                              >
                                Doctor Leave
                              </span>
                            </div>
                          )}
                      </div>
                    ))}

                  </div>

                  {/* ROWS */}
                  {(activeTab === "week" ? weekSchedule : schedule).map((row, rowIndex) => (
                    <div
                      key={rowIndex}
                      className="grid grid-cols-7 min-h-[64px] border-b border-[#b9bfcb] last:border-b-0"
                    >
                      {row.map((cell, index) => {
                        const [text, type, branch, scheduleId, branchId, startTime, endTime, changeId, changeMode] =
                          cell as any[];
                        const colorType =
                          type === "template" ? "blue" : type === "ADD" ? "green" : type === "OVERRIDE" ? "orange" : type;
                        const isColored = ["green", "blue", "orange"].includes(colorType);
                        const isCancelled = type === "CANCEL";
                        const weekIso = activeTab === "week" ? weekDateToISO(weekDates[index]) : "";

                        const openBlockEdit = () => {
                          if (!canManageSchedule) return;
                          slotModalRef.current?.openCancelSlot(
                            WEEK_DAYS[index][0],
                            rowIndex,
                            index,
                            text,
                            branch,
                            scheduleId ?? null,
                          );
                        };


                        const leaveForCell =
                          activeTab === "week"
                            ? leaveByIso.get(weekIso)
                            : undefined;

                        return (
                          <div key={index} className="p-1 border-r border-[#b9bfcb] min-w-0">
                            {leaveForCell && (
                              <div
                                title={leaveForCell.leave_reason ?? "Approved leave"}
                                className="h-[54px] rounded-[3px] border border-dashed border-[#F5B7B7] bg-[#FDE8E8] flex flex-col items-center justify-center gap-[2px] text-center px-1 overflow-hidden"
                              >
                                <span className="text-[7px] font-bold uppercase tracking-wide text-[#9B1C1C]">
                                  Doctor Leave
                                </span>
                                {leaveForCell.leave_reason && (
                                  <span className="text-[6px] leading-[8px] text-[#9B1C1C]/80 line-clamp-2 px-0.5">
                                    {leaveForCell.leave_reason}
                                  </span>
                                )}
                              </div>
                            )}

                            {isCancelled && !leaveForCell && (
                              <div className="relative h-[54px] rounded-[3px] p-[5px] flex flex-col justify-start gap-1 overflow-hidden border-l-[3px] bg-[#f3f4f6] text-[#6b7280] border-[#9ca3af]">
                                {showDelete && (
                                  <button
                                    type="button"
                                    title="Restore this date"
                                    onClick={(e) => openBlockCancel(e, rowIndex, index)}
                                    className="absolute top-[2px] right-[2px] p-[1px] rounded-full text-[#9aa3b0] hover:text-[#ff453a] hover:bg-[#ffebea] transition-colors cursor-pointer"
                                  >
                                    <X className="size-3" />
                                  </button>
                                )}
                                <strong className="text-[6px] whitespace-nowrap pl-1">{text}</strong>
                              </div>
                            )}

                            {type === "off" && !leaveForCell && (
                              <div className="h-[54px] border border-dashed border-[#b9bfcb] rounded flex items-center justify-center text-[#657080] text-[8px]">
                                Week Off
                              </div>
                            )}

                            {type === "empty" &&
                              !leaveForCell &&
                              (canManageSchedule ? (
                                <div
                                  onClick={() =>
                                    slotModalRef.current?.openAddSlot(
                                      WEEK_DAYS[index][0],
                                      rowIndex,
                                      index,
                                      activeTab === "week" ? "date" : "weekly",
                                      activeTab === "week" ? weekIso : undefined,
                                      activeTab === "week" ? "ADD" : undefined,
                                    )
                                  }
                                  className="h-[54px] border border-dashed border-[#b9bfcb] rounded flex items-center justify-center text-[#7d8794] text-lg cursor-pointer hover:border-[#004a91] hover:text-[#004a91]"
                                >
                                  +
                                </div>
                              ) : (
                                <div className="h-[54px] border border-dashed border-[#e5e7eb] rounded flex items-center justify-center text-[#c8ced7] text-lg">
                                  +
                                </div>
                              ))}

                            {isColored && !leaveForCell && (
                              <div
                                onClick={openBlockEdit}
                                className={`relative cursor-pointer h-[54px] rounded-[3px] p-[5px] flex flex-col justify-start gap-1 overflow-hidden border-l-[3px] ${
                                  colorType === "green"
                                    ? "bg-[#f0faf6] text-[#087d53] border-[#087d53]"
                                    : colorType === "blue"
                                    ? "bg-[#f1f6ff] text-[#1e5fc7] border-[#1e5fc7]"
                                    : "bg-[#fff7ef] text-[#ed741b] border-[#ed741b]"
                                }`}
                              >
                                {showDelete && (
                                  <button
                                    type="button"
                                    title={activeTab === "week" && changeId != null ? "Remove this date change" : "Delete slot"}
                                    onClick={(e) => openBlockCancel(e, rowIndex, index)}
                                    className="absolute top-[2px] right-[2px] p-[1px] rounded-full text-[#9aa3b0] hover:text-[#ff453a] hover:bg-[#ffebea] transition-colors cursor-pointer"
                                  >
                                    <X className="size-3" />
                                  </button>
                                )}

                                <strong className="text-[6px] whitespace-nowrap pl-1">{text}</strong>

                                <small className="text-[6px] leading-[8px]">
                                  {branch || "Central Hospital"}
                                </small>

                                {activeTab === "week" && changeId != null && (
                                  <small className="text-[5px] leading-[7px] uppercase tracking-wide text-[#9aa3b0]">
                                    {colorType === "green" ? "Added" : colorType === "orange" ? "Override" : "Template"}
                                  </small>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}

                </div>

              </div>

            </section>

            {/* LEAVE SUBMISSION */}
            <section className="bg-white border border-[#edf0f4] rounded-[10px] p-[31px] max-[500px]:p-5 transition-shadow duration-200 hover:shadow-md">

              <div className="flex justify-between items-center mb-6 max-[500px]:flex-col max-[500px]:items-start max-[500px]:gap-3">

                <div className="flex items-center gap-3">

                  <div className="w-10 h-10 rounded-lg bg-[#fff1f0] text-[#ff453a] flex items-center justify-center text-[22px]">
                    <CalendarOff className="w-5 h-5" />
                  </div>

                  <h2 className="text-[19px]">
                    Leave Submission
                  </h2>

                </div>

                <span className="text-[#a0a7b1] bg-[#f7f8fa] rounded-full px-[11px] py-[5px] text-[9px] tracking-[0.7px]">
                  LEAVE MANAGEMENT
                </span>

              </div>

              <form onSubmit={submitLeave}>

                <div className="grid grid-cols-2 gap-4 max-[700px]:grid-cols-1">

                  <div>
                    <label className="block text-[#99a1ac] text-[9px] font-bold mb-[5px]">
                      FROM
                    </label>

                    <Popover open={isFromCalendarOpen} onOpenChange={setIsFromCalendarOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-full text-left border border-[#dfe4ea] rounded-[7px] outline-none p-[10px_12px] text-xs text-[#374151] focus:border-[#004a91]"
                        >
                          {fromDate ? format(fromDate, "dd/MM/yyyy") : "Select date"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 border-[#dfe4ea] shadow-lg">
                        <CalendarPicker
                          selected={fromDate}
                        minDate={new Date()}
                          hideThemePicker
                          onSelect={(date) => {
                            setFromDate(date);
                            setIsFromCalendarOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <label className="block text-[#99a1ac] text-[9px] font-bold mb-[5px]">
                      TO
                    </label>

                    <Popover open={isToCalendarOpen} onOpenChange={setIsToCalendarOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-full text-left border border-[#dfe4ea] rounded-[7px] outline-none p-[10px_12px] text-xs text-[#374151] focus:border-[#004a91]"
                        >
                          {toDate ? format(toDate, "dd/MM/yyyy") : "Select date"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 border-[#dfe4ea] shadow-lg">
                        <CalendarPicker
                          selected={toDate}
                          hideThemePicker
                          onSelect={(date) => {
                            setToDate(date);
                            setIsToCalendarOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                </div>

                <textarea
                  name="reason"
                  placeholder="Reason for leave..."
                  className="w-full min-h-[66px] mt-3 resize-y border border-[#dfe4ea] rounded-[7px] outline-none p-[10px_12px] text-xs text-[#374151] focus:border-[#004a91]"
                />

                <div className="flex justify-end gap-4 mt-4">

                  <button
                    type="reset"
                    onClick={() => {
                      setFromDate(null);
                      setToDate(null);
                    }}
                    className="h-[38px] px-7 rounded-[9px] text-sm font-semibold cursor-pointer bg-white text-[#ff453a] border-2 border-[#ff453a]"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="h-[38px] px-7 rounded-[9px] text-sm font-semibold cursor-pointer bg-[#004a91] text-white border-2 border-[#004a91]"
                  >
                    Submit
                  </button>

                </div>

              </form>

            </section>

          </div>

          {/* RIGHT COLUMN */}
          <aside className="min-w-0 max-[900px]:grid max-[900px]:grid-cols-2 max-[900px]:gap-5 max-[700px]:block">

            {/* CALENDAR (Week tab only -- the Day tab's simpler layout never had a month calendar) */}
            {activeTab === "week" && (
            <section >
              <div className="flex justify-center h-full">
                <CalendarPicker
                  theme="light"
                  hideThemePicker
                  mode="week"
                  weekStart={calendarWeekStart}
                  onWeekChange={setCalendarWeekStart}
                  highlightDates={selectedDates}
                  onDatesChange={setSelectedDates}
                  selected={calendarWeekStart}
                  onSelect={(date) => {
                    if (!date) return;
                    if (date instanceof Date === false) return; // Skip if DateRange
                    setCalendarSelectedDate(date);
                    // set week to the week containing selected date
                    const week = getWeekDates(date);
                    setWeekDates(week);
                    const [dd, mm, yy] = week[0].split("/").map(Number);
                    const newWeekStart = new Date(2000 + yy, mm - 1, dd);
                    setCalendarWeekStart(newWeekStart);
                    // Update selected dates to new week's Mon-Sun
                    const newSelectedDates = week.map((d) => {
                      const [dd2, mm2, yy2] = d.split("/").map(Number);
                      return new Date(2000 + yy2, mm2 - 1, dd2);
                    });
                    setSelectedDates(newSelectedDates);
                  }}
                />
              </div>
            </section>
            )}

            {/* REVIEWS */}
            <section className="bg-white border border-[#edf0f4] rounded-lg overflow-hidden transition-shadow duration-200 hover:shadow-md">
            { [
                {
                  name: "Sarah Jenkins",
                  time: "1 week ago",
                  image: "https://i.pravatar.cc/100?img=47",
                  rating: 4,
                  text: `"Excellent treatment manner. Wait time was a bit longer than expected, but the quality of care definitely made up for it. Highly recommended."`,
                  tags: ["Cardiology"],
                },
                {
                  name: "Robert Wilson",
                  time: "3 days ago",
                  image: "https://i.pravatar.cc/100?img=11",
                  rating: 5,
                  text: `"The staff and Dr are incredible. I've been a patient here for 2 years and the level of clinical precision and personal attention is unmatched in the city."`,
                  tags: ["Long-term Care", "Referral"],
                },
              ].map((review) => (

                <article
                  key={review.name}
                  className="p-6 border-b border-gray-200"
                >

                  <div className="flex items-start gap-[11px]">

                    <img
                      src={review.image}
                      alt={review.name}
                      className="w-[47px] h-[47px] rounded-full object-cover bg-gray-200"
                    />

                    <div>
                      <h3 className="text-sm mb-[3px]">
                        {review.name}
                      </h3>

                      <span className="text-[#4e5663] text-[10px]">
                        {review.time}
                      </span>
                    </div>

                    <div className="ml-auto text-[#f5a623] text-[13px] tracking-wider flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < review.rating ? "fill-current" : "text-[#e5e7eb]"}`}
                        />
                      ))}
                    </div>

                  </div>

                  <hr className="border-0 border-t border-gray-200 my-4" />

                  <p className="text-[#4c5360] text-[13px] leading-[22px]">
                    {review.text}
                  </p>

                  <div className="flex flex-wrap gap-[7px] mt-3">

                    {review.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-[#eef8ff] text-[#0d9bd3] rounded-full px-2 py-[3px] text-[9px]"
                      >
                        {tag}
                      </span>
                    ))}

                  </div>

                </article>

              ))}

              <button
                onClick={() => showAlert("All reviews opened.")}
                className="w-full h-9 border-0 bg-[#e9ebef] text-[#004a91] text-[11px] cursor-pointer"
              >
                Read All Reviews
              </button>

            </section>

          </aside>

        </div>
      </div>
      </main>

      {pendingTransfer && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-[10px] p-6 w-[440px] max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[16px] font-semibold text-[#172033]">
                Affected Appointments
              </h3>

              <button
                onClick={() => setPendingTransfer(null)}
                title="Close (the slot change is not applied)"
                className="p-1 rounded-full text-[#9aa3b0] hover:text-[#374151] hover:bg-[#f1f3f5] transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-[#5f6672] text-[13px] mb-2">{pendingTransfer.message}</p>

            <p className="text-[#5f6672] text-[13px] mb-3">
              {pendingTransfer.appointments.length} future appointment(s) need handling before the slot change is applied.
            </p>

            <div className="border border-[#dfe4ea] rounded-[7px] max-h-[180px] overflow-y-auto divide-y divide-[#eef1f4] mb-4">
              {pendingTransfer.appointments.map((a) => (
                <div key={a.appointment_id} className="px-3 py-2">
                  <div className="text-xs font-semibold text-[#172033]">
                    {a.patient_name || a.patient_id}
                  </div>
                  <div className="text-[11px] text-[#5f6672]">
                    {a.appointment_date}  {a.appointment_time} ·{" "}
                    {a.branch_id
                      ? doctorDetail?.branches?.find((b) => b.branch_id === a.branch_id)?.branch_name ?? a.branch_id
                      : ""}
                  </div>
                </div>
              ))}
              {pendingTransfer.appointments.length === 0 && (
                <div className="px-3 py-3 text-xs text-[#5f6672]">No affected appointments.</div>
              )}
            </div>

            <div className="flex flex-col gap-2 mb-4">
              <button
                onClick={() => {
                  setTransferAction("TRANSFER");
                  setReplacementDoctorId(replacementDoctors[0]?.employee_id ?? "");
                }}
                className={`text-left px-3 py-2 rounded-[7px] border text-xs font-semibold cursor-pointer transition-colors ${
                  transferAction === "TRANSFER"
                    ? "border-[#004a91] bg-[#eef4ff] text-[#004a91]"
                    : "border-[#dfe4ea] bg-white text-[#374151] hover:border-[#b8cce8]"
                }`}
              >
                Transfer to replacement doctor
              </button>

              <button
                onClick={() => setTransferAction("RESCHEDULE")}
                className={`text-left px-3 py-2 rounded-[7px] border text-xs font-semibold cursor-pointer transition-colors ${
                  transferAction === "RESCHEDULE"
                    ? "border-[#b45309] bg-[#fff7ed] text-[#b45309]"
                    : "border-[#dfe4ea] bg-white text-[#374151] hover:border-[#f2c9a0]"
                }`}
              >
                Reschedule queue
              </button>

              <button
                onClick={() => setTransferAction("CANCEL")}
                className={`text-left px-3 py-2 rounded-[7px] border text-xs font-semibold cursor-pointer transition-colors ${
                  transferAction === "CANCEL"
                    ? "border-[#ff453a] bg-[#fff1f0] text-[#ff453a]"
                    : "border-[#dfe4ea] bg-white text-[#374151] hover:border-[#ffc9c5]"
                }`}
              >
                Cancel appointments
              </button>
            </div>

            {transferAction === "TRANSFER" && (
              <div className="mb-4">
                <label className="block text-[#99a1ac] text-[9px] font-bold mb-[5px]">
                  REPLACEMENT DOCTOR
                </label>

                <select
                  value={replacementDoctorId}
                  onChange={(e) => setReplacementDoctorId(e.target.value)}
                  className="w-full border border-[#dfe4ea] rounded-[7px] outline-none p-[10px_12px] text-xs text-[#374151] focus:border-[#004a91]"
                >
                  <option value="">Select replacement doctor</option>
                  {replacementDoctors.map((d) => (
                    <option key={d.employee_id} value={d.employee_id}>
                      {d.name}
                    </option>
                  ))}
                </select>

                {replacementDoctors.length === 0 && (
                  <p className="text-[11px] text-[#c2410c] mt-1">
                    No eligible replacement doctors were found for these appointments.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPendingTransfer(null)}
                disabled={isConfirmingTransfer}
                className="h-9 px-4 rounded-[7px] text-[13px] font-semibold cursor-pointer bg-white text-[#555e6c] border border-[#dfe4ea] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                Back
              </button>

              <button
                onClick={() => transferAction && confirmPendingTransfer(transferAction)}
                disabled={!transferAction || isConfirmingTransfer}
                className={`h-9 px-4 rounded-[7px] text-[13px] font-semibold cursor-pointer inline-flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${
                  transferAction === "CANCEL" ? "bg-[#ff453a] text-white border-0" : "bg-[#004a91] text-white border-0"
                }`}
              >
                {isConfirmingTransfer ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Processing...
                  </>
                ) : transferAction === "TRANSFER" ? (
                  "Transfer appointments"
                ) : transferAction === "RESCHEDULE" ? (
                  "Add to reschedule queue"
                ) : (
                  "Confirm cancel"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEAVE CONFIRM DIALOG */}
      <AlertDialog
        open={leaveConfirmOpen}
        onOpenChange={(open) => {
          if (!submittingLeave) setLeaveConfirmOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Do you want to proceed with the leave?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Leave date: {fromDate ? format(fromDate, "dd/MM/yyyy") : "-"} to{" "}
              {toDate ? format(toDate, "dd/MM/yyyy") : "-"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submittingLeave || processingLeave}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={submittingLeave || processingLeave}
              onClick={(e) => {
                e.preventDefault();
                doApplyLeave();
              }}
            >
              {processingLeave ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Checking...
                </>
              ) : submittingLeave ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Proceed"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* LEAVE SUCCESS DIALOG */}
      <AlertDialog open={leaveSuccessOpen} onOpenChange={setLeaveSuccessOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="size-5" />
              Leave applied successfully
            </AlertDialogTitle>
            <AlertDialogDescription>
              {leaveSuccessInfo && (
                <>
                  Leave date: {leaveSuccessInfo.from} to {leaveSuccessInfo.to}
                  {leaveSuccessInfo.leaveId
                    ? ` · Leave ID: ${leaveSuccessInfo.leaveId}`
                    : ""}
                  {typeof leaveSuccessInfo.queuedCount === "number" &&
                  leaveSuccessInfo.queuedCount > 0
                    ? ` · ${leaveSuccessInfo.queuedCount} patient(s) sent to the reschedule queue`
                    : ""}
                  {leaveSuccessInfo.queueFailed
                    ? " · Could not add patients to the reschedule queue"
                    : ""}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setLeaveSuccessOpen(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* LEAVE CONFLICTS DIALOG */}
      <AlertDialog
        open={leaveConflictsOpen}
        onOpenChange={(open) => {
          if (!submittingLeave) setLeaveConflictsOpen(open);
        }}
      >
        <AlertDialogContent className="max-w-[460px]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {leaveConflicts.length} appointment
              {leaveConflicts.length === 1 ? "" : "s"} scheduled during this
              leave
            </AlertDialogTitle>
            <AlertDialogDescription>
              You can send these patients to the reschedule queue so staff can
              assign them new slots, or apply the leave without changes.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="max-h-[220px] overflow-y-auto rounded-md border border-slate-200">
            {leaveConflicts.map((conflict) => (
              <div
                key={conflict.appointment_id}
                className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-[12px] last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-800">
                    {conflict.patientName}
                  </p>
                  <p className="text-slate-500">
                    {format(new Date(conflict.appointment_date), "dd/MM/yyyy")}
                    {formatTimeOfDay(conflict.appointment_time)
                      ? ` · ${formatTimeOfDay(conflict.appointment_time)}`
                      : ""}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                  {conflict.status}
                </span>
              </div>
            ))}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={submittingLeave}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={submittingLeave}
              className="border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              onClick={(e) => {
                e.preventDefault();
                applyLeaveNow(false);
              }}
            >
              {submittingLeave ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Applying...
                </>
              ) : (
                "Apply leave anyway"
              )}
            </AlertDialogAction>
            <AlertDialogAction
              disabled={submittingLeave}
              onClick={(e) => {
                e.preventDefault();
                applyLeaveNow(true);
              }}
            >
              {submittingLeave ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  Apply leave &amp; queue{" "}
                  {leaveConflicts.length} patient
                  {leaveConflicts.length === 1 ? "" : "s"}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ScheduleSlotModal
        ref={slotModalRef}
        branches={doctorDetail?.branches?.filter((b) => b.status === 1) ?? []}
        defaultConsultationMinutes={doctorDetail?.doctorProfile?.consultation_minutes ?? 20}
        onAddSlot={handleAddSlot}
        onUpdateSlot={handleUpdateSlot}
        onCancelSlot={handleCancelSlot}
        isSubmitting={savingSlot}
      />
    </div>
  );
}

