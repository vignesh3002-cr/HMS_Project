import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { format } from "date-fns";
import {
  User, IdCard, Phone, Mail, MapPin, Cake, Droplet,
  VenusAndMars, Briefcase, X, Loader2, Star, CalendarOff,
  RotateCw, CheckCircle2, ArrowLeft, Stethoscope,
  GraduationCap, Hospital, Clock, Calendar,
  Plus, Sun, Calendar as CalendarIcon,
  UserCircle, Quote, Ban, Coffee, Send, ClipboardList,
  CalendarX,
} from "lucide-react";
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
import AffectedAppointmentsDialog from "@/components/hms/AffectedAppointmentsDialog";
import { employeeApi, type EmployeeDetailResponse, type DoctorScheduleRecord, type EmployeeRecord } from "@/api/employee.api";
import { doctorLeaveApi } from "@/api/doctorLeave.api";
import { doctorScheduleApi,
  type ScheduleChangeMode,
  type ScheduleChangeRecord,
} from "@/api/doctorSchedule.api";
import {
  doctorTransferApi,
  type TransferAppointmentSummary,
} from "@/api/doctorTransfer.api";
import { getUser } from "@/utils/token";
import type { DoctorLeaveRecord } from "@/api/doctorLeave.api";
import {
  findLeaveConflictingAppointments,
  formatTimeOfDay,
  type LeaveConflict,
} from "@/utils/leaveConflicts";
import { useToast } from "@/hooks/use-toast";

function formatDoctorFullName(e: EmployeeDetailResponse["employee"] | null): string {
  if (!e) return "Doctor";
  return `Dr. ${[e.first_name, e.middle_name, e.last_name].filter(Boolean).join(" ")}`;
}

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

function weekDateToISO(dateStr: string): string {
  const [dd, mm, yy] = dateStr.split("/").map(Number);
  const date = new Date(2000 + yy, mm - 1, dd);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeChangeDate(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? "");
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return value ?? "";
}

function addIsoDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  const shifted = new Date(year, month - 1, day + days);
  const y = shifted.getFullYear();
  const m = String(shifted.getMonth() + 1).padStart(2, "0");
  const d = String(shifted.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

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

const getWeekDates = (reference: Date) => {
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

const shiftDate = (dateStr: string, days: number) => {
  const [dd, mm, yy] = dateStr.split("/").map(Number);
  const date = new Date(2000 + yy, mm - 1, dd);
  date.setDate(date.getDate() + days);
  const newDd = String(date.getDate()).padStart(2, "0");
  const newMm = String(date.getMonth() + 1).padStart(2, "0");
  const newYy = String(date.getFullYear() % 100).padStart(2, "0");
  return `${newDd}/${newMm}/${newYy}`;
};

interface WeekBlock {
  key: string;
  type: "template" | "ADD" | "OVERRIDE" | "CANCEL";
  time: string;
  branch: string;
  branchId: string;
  scheduleId: string | number | null;
  changeId?: string | number | null;
  startTime: string;
  endTime: string;
  consultationMinutes?: number | null;
}

export default function DoctorProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { toast } = useToast();

  const showAlert = (message: string, variant: "default" | "destructive" = "default") => {
    toast({ description: message, ...(variant === "destructive" ? { variant } : {}) });
  };

  const [activeTab, setActiveTab] = useState(() =>
    location.pathname.includes("/doctor/day-view") ? "day" : "week",
  );
  const slotModalRef = useRef<ScheduleSlotModalHandle>(null);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [leaveType, setLeaveType] = useState<"Emergency" | "Vacation" | "Sick Leave">("Emergency");
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
  const [leaveConflicts, setLeaveConflicts] = useState<LeaveConflict[]>([]);
  const [leaveConflictsOpen, setLeaveConflictsOpen] = useState(false);
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
  const [openDoctors, setOpenDoctors] = useState<EmployeeRecord[]>([]);
  const [weekDates, setWeekDates] = useState(() => getWeekDates(new Date()));
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<Date | null>(() => {
    const first = getWeekDates(new Date())[0];
    const [dd, mm, yy] = first.split("/").map(Number);
    return new Date(2000 + yy, mm - 1, dd);
  });
  const [selectedDates, setSelectedDates] = useState<Date[]>(() => {
    const week = getWeekDates(new Date());
    return week.map((d) => {
      const [dd, mm, yy] = d.split("/").map(Number);
      return new Date(2000 + yy, mm - 1, dd);
    });
  });
  const [calendarWeekStart, setCalendarWeekStart] = useState<Date>(() => {
    const first = getWeekDates(new Date())[0];
    const [dd, mm, yy] = first.split("/").map(Number);
    return new Date(2000 + yy, mm - 1, dd);
  });
  const [doctorDetail, setDoctorDetail] = useState<EmployeeDetailResponse | null>(null);
  const [weekChanges, setWeekChanges] = useState<ScheduleChangeRecord[]>([]);
  const [weekChangesLoading, setWeekChangesLoading] = useState(false);
  const [approvedLeaves, setApprovedLeaves] = useState<DoctorLeaveRecord[]>([]);

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

  const leaveByIso = useMemo(() => {
    const map = new Map<string, DoctorLeaveRecord>();
    for (const leave of approvedLeaves) {
      const startIso = String(leave.leave_start_date).slice(0, 10);
      const endIso = String(leave.leave_end_date).slice(0, 10);
      if (!startIso || !endIso) continue;
      let cursor = startIso;
      let guard = 0;
      while (cursor <= endIso && guard < 732) {
        map.set(cursor, leave);
        cursor = addIsoDays(cursor, 1);
        guard += 1;
      }
    }
    return map;
  }, [approvedLeaves]);

  useEffect(() => {
    employeeApi
      .getAll({ roleType: "DOCTOR", limit: 1000 })
      .then((res) => setOpenDoctors(res.data?.data?.employees ?? []))
      .catch((err) => console.error("[Doctor Profile] Failed to load doctors:", err));
  }, []);

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

  const doctorEmployee = doctorDetail?.employee ?? null;
  const doctorName = formatDoctorFullName(doctorEmployee);
  const doctorSpecialization = doctorDetail?.doctorProfile?.specialization || doctorEmployee?.specialization || "—";
  const doctorQualification = doctorDetail?.doctorProfile?.qualification || doctorEmployee?.qualification || "—";
  const doctorBranchNames = (doctorDetail?.branches?.length
    ? doctorDetail.branches.map((b) => b.branch_name)
    : doctorEmployee?.branch?.branch_name
      ? [doctorEmployee.branch.branch_name]
      : []
  );
  const doctorIsAvailable = doctorEmployee?.emp_status === true || doctorDetail?.user?.user_status === 0;
  const doctorPhoto = doctorEmployee?.employee_photo_URL || "";
  const doctorLicenseNo = doctorDetail?.doctorProfile?.license_no || doctorEmployee?.license_no || "—";
  const doctorPhone = doctorEmployee?.mobile_no || "—";
  const doctorEmail = doctorEmployee?.email || "—";
  const doctorLocation = doctorEmployee?.current_address || doctorEmployee?.parmanent_address || "—";
  const doctorBloodGroup = doctorEmployee?.blood_group || "—";
  const doctorExperience = doctorEmployee?.employee_no_experence != null ? `${doctorEmployee.employee_no_experence}+ yrs` : "—";
  const doctorDOB = (doctorEmployee as any)?.dob
    ? format(new Date((doctorEmployee as any).dob), "dd MMM yyyy")
    : "—";
  const doctorGender = (doctorEmployee as any)?.gender || "—";

  const todayIso = format(new Date(), "yyyy-MM-dd");
  const doctorSchedules: DoctorScheduleRecord[] = doctorDetail?.doctorSchedules ?? [];

  const scheduleByDay = useMemo(() => {
    const map: Record<
      string,
      { time: string; branch: string; branchId: string; startTime: string; endTime: string; scheduleId: string | number; consultationMinutes: number | null }[]
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
        consultationMinutes: s.consultation_minutes ?? null,
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
            entry.consultationMinutes,
          ] as [string, string, string, string | number, string, string, string, number | null])
        : (["+", "empty"] as [string, string]);
    }),
  );

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
        consultationMinutes: e.consultationMinutes ?? null,
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
          entry.consultationMinutes ?? null,
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
          number | null,
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

  const handleDateChange = async ({
    day,
    date,
    branchId,
    startTime,
    endTime,
    changeMode,
    changeId,
    transferReason,
    bypassPending,
  }: {
    day: string;
    date: string;
    branchId: string;
    startTime: string;
    endTime: string;
    changeMode?: ScheduleChangeMode;
    changeId?: string | number | null;
    transferReason?: string;
    bypassPending?: boolean;
  }): Promise<boolean> => {
    if (!date) {
      showAlert("Date is required.", "destructive");
      return false;
    }
    if (!changeMode) {
      showAlert("Please choose a change type (Add / Override / Cancel).", "destructive");
      return false;
    }
    if (changeMode !== "CANCEL" && (!startTime || !endTime)) {
      showAlert("Please select start time and end time.", "destructive");
      return false;
    }

    // A full-day CANCEL does not need a branch pick - fall back to that
    // weekday's template slot branch, then to the doctor's first branch.
    let effectiveBranchId = branchId;
    if (!effectiveBranchId && changeMode === "CANCEL") {
      const templateSlots = scheduleByDay[(day || "").toUpperCase()] ?? [];
      effectiveBranchId =
        templateSlots[0]?.branchId || doctorDetail?.branches?.[0]?.branch_id || "";
    }
    if (!id || !effectiveBranchId) {
      showAlert("Please select a branch location.", "destructive");
      return false;
    }

    if (changeMode !== "CANCEL" && startTime && endTime) {
      const isoDate = normalizeChangeDate(date);
      const newStart = toMinutes(startTime);
      const newEnd = toMinutes(endTime);

      // An OVERRIDE replaces the whole day, so overlapping anything is
      // expected. An ADD is an EXTRA slot and must respect both other
      // date-changes and the recurring template rows for that weekday.
      if (changeMode === "ADD") {
        const templateSlots = scheduleByDay[(day || "").toUpperCase()] ?? [];
        const templateConflict = templateSlots.find(
          (entry) =>
            newStart < toMinutes(entry.endTime) && toMinutes(entry.startTime) < newEnd,
        );
        if (templateConflict) {
          const fmt = (mins: number) =>
            `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
          showAlert(
            `This extra slot overlaps the recurring ${day} hours ` +
              `(${fmt(toMinutes(templateConflict.startTime))}-${fmt(toMinutes(templateConflict.endTime))})` +
              `${templateConflict.branch ? ` at ${templateConflict.branch}` : ""}. ` +
              `Use Override if you intend to replace that day's schedule.`,
            "destructive",
          );
          return false;
        }
      }

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
          "destructive",
        );
        return false;
      }
    }

    setSavingSlot(true);
    try {
      const res = await doctorTransferApi.initiateTransfer(id, {
        mode: "ADD_BRANCH",
        new_branch_id: effectiveBranchId,
        effective_date: date,
        transfer_reason: transferReason?.trim() || `${changeMode} ${date}`,
        schedule_change: {
          action: changeId != null ? "UPDATE" : "CREATE",
          mode: changeMode!,
          branch_id: effectiveBranchId,
          change_date: date,
          start_time: changeMode === "CANCEL" ? undefined : startTime,
          end_time: changeMode === "CANCEL" ? undefined : endTime,
          reason: transferReason?.trim(),
          change_id: changeId != null ? Number(changeId) : undefined,
        },
      }, bypassPending);

      const data = res.data?.data;
      if (!data) {
        showAlert(res.data?.message || "Failed to save schedule change.", "destructive");
        return false;
      }

      if (data.status === "PENDING_CONFIRMATION") {
        setPendingTransfer({
          transferId: data.transfer_id,
          appointments: data.appointments ?? [],
          message: data.message ?? "",
        });
        return true;
      }

      await refetchWeekChanges();
      showAlert(data.message || `Schedule change saved for ${day}.`);
      return true;
    } catch (err: any) {
      showAlert(err?.response?.data?.message || err?.message || "Failed to save schedule change.", "destructive");
      return false;
    } finally {
      setSavingSlot(false);
    }
  };

  const handleAddSlot = async (payload: ScheduleSlotAddPayload) => {
    if (payload.mode === "date" && payload.changeMode) {
      if (payload.consultationMinutes) {
        try {
          await employeeApi.update(id, { consultation_minutes: Number(payload.consultationMinutes) });
        } catch {}
      }
      return handleDateChange({
        day: payload.day,
        date: payload.date || payload.effectiveDate || "",
        branchId: payload.branchId,
        startTime: payload.startTime,
        endTime: payload.endTime,
        changeMode: payload.changeMode,
        transferReason: payload.transferReason,
        bypassPending: payload.bypassPending,
      });
    }

    const {
      day,
      branchId,
      startTime,
      endTime,
    } = payload;

    if (!id || !branchId) {
      showAlert("Please select a branch location.", "destructive");
      return false;
    }

    if (!startTime || !endTime) {
      showAlert("Please select start time and end time.", "destructive");
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
        consultation_minutes: payload.consultationMinutes ? Number(payload.consultationMinutes) : undefined,
        effective_from: null,
        effective_to: null,
      });
      await refetchDoctor();
      showAlert(`Schedule slot added for ${day}.`);
      return true;
    } catch (err: any) {
      showAlert(err?.response?.data?.message || err?.message || "Failed to add schedule slot.", "destructive");
      return false;
    } finally {
      setSavingSlot(false);
    }
  };

  const handleUpdateSlot = async (payload: ScheduleSlotEditPayload) => {
    if (!id || !payload.branchId) {
      showAlert("Please select a branch location.", "destructive");
      return false;
    }

    if (payload.mode === "date" && payload.changeMode) {
      if (payload.consultationMinutes) {
        try {
          await employeeApi.update(id, { consultation_minutes: Number(payload.consultationMinutes) });
        } catch {}
      }
      return handleDateChange({
        day: payload.day,
        date: payload.date || payload.effectiveDate || "",
        branchId: payload.branchId,
        startTime: payload.startTime,
        endTime: payload.endTime,
        changeMode: payload.changeMode,
        changeId: payload.changeId,
        transferReason: payload.transferReason,
        bypassPending: payload.bypassPending,
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
        consultation_minutes: payload.consultationMinutes ? Number(payload.consultationMinutes) : undefined,
        effective_from: null,
        effective_to: null,
      });
      await refetchDoctor();
      showAlert(`Schedule slot updated for ${payload.day}.`);
      return true;
    } catch (err: any) {
      showAlert(err?.response?.data?.message || err?.message || "Failed to update schedule slot.", "destructive");
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
        showAlert("Schedule slot removed.");
      } else if (payload.scheduleId != null) {
        const slot = doctorSchedules.find(
          (s) => String(s.schedule_id) === String(payload.scheduleId),
        );
        const slotBranchId = slot?.branch_id;
        if (!slotBranchId) {
          showAlert("Unable to resolve the branch for this schedule slot.", "destructive");
          return;
        }

        const res = await doctorTransferApi.initiateTransfer(id, {
          mode: "ADD_BRANCH",
          close_schedule_ids: [Number(payload.scheduleId)],
          new_branch_id: slotBranchId,
          effective_date: todayIso,
          transfer_reason: "Recurring slot removed from Schedule page",
        }, payload.bypassPending);

        const data = res.data?.data;
        if (!data) {
          showAlert(res.data?.message || "Failed to remove schedule slot.", "destructive");
          return;
        }

        if (data.status === "PENDING_CONFIRMATION") {
          setPendingTransfer({
            transferId: data.transfer_id,
            appointments: data.appointments ?? [],
            message: data.message ?? "",
          });
          return;
        }

        await refetchDoctor();
        await refetchWeekChanges();
        showAlert(data.message || "Schedule slot removed.");
      }
    } catch (err: any) {
      showAlert(err?.response?.data?.message || err?.message || "Failed to remove schedule slot.", "destructive");
    } finally {
      setSavingSlot(false);
    }
  };

  const openBlockCancel = (event: React.MouseEvent, rowIndex: number, colIndex: number) => {
    event.stopPropagation();
    if (!canManageSchedule) return;
    if (activeTab === "week" && weekDateToISO(weekDates[colIndex]) < todayIso) return;
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

  const handleTransferCompleted = async () => {
    setPendingTransfer(null);
    await refetchDoctor();
    await refetchWeekChanges();
    showAlert("Transfer action completed.");
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
      const [dd, mm, yy] = newDates[0].split("/").map(Number);
      const newWeekStart = new Date(2000 + yy, mm - 1, dd);
      setCalendarSelectedDate(newWeekStart);
      setCalendarWeekStart(newWeekStart);
      const newSelectedDates = newDates.map((d) => {
        const [dd2, mm2, yy2] = d.split("/").map(Number);
        return new Date(2000 + yy2, mm2 - 1, dd2);
      });
      setSelectedDates(newSelectedDates);
      return newDates;
    });
  };

  const submitLeave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formEl = e.currentTarget;
    leaveFormRef.current = formEl;

    if (!id) {
      showToastMissingDoctor();
      return;
    }

    const form = new FormData(formEl);
    const reason = String(form.get("reason") || "").trim();

    if (!fromDate || !toDate || !reason) {
      showAlert("Please fill in all leave details.", "destructive");
      return;
    }

    if (toDate < fromDate) {
      showAlert("The To date cannot be before the From date.", "destructive");
      return;
    }

    setLeaveConfirmOpen(true);
  };

  const doApplyLeave = async () => {
    if (!id) {
      setLeaveConfirmOpen(false);
      showToastMissingDoctor();
      return;
    }

    if (!fromDate || !toDate) {
      setLeaveConfirmOpen(false);
      return;
    }

    try {
      setProcessingLeave(true);

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
      showAlert(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to check appointments for this leave period.",
        "destructive"
      );
    } finally {
      setProcessingLeave(false);
    }
  };

  const applyLeaveNow = async (queueConflicts: boolean) => {
    if (!id) {
      setLeaveConflictsOpen(false);
      showToastMissingDoctor();
      return;
    }

    try {
      setSubmittingLeave(true);

      const loggedInUser = getUser();

      if (!loggedInUser?.user_id) {
        setLeaveConflictsOpen(false);
        showAlert("Logged-in user information is missing. Please log in again.", "destructive");
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
        leave_type: leaveType,
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
            reason: `${leaveType} absence${reason ? ` - ${reason}` : ""}`,
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

      void loadApprovedLeaves();

      formEl?.reset();
      setFromDate(null);
      setToDate(null);
    } catch (error: any) {
      console.error("Leave application failed:", error);
      console.error("Backend response:", error?.response?.data);

      setLeaveConfirmOpen(false);
      setLeaveConflictsOpen(false);

      showAlert(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to apply for leave.",
        "destructive"
      );
    } finally {
      setSubmittingLeave(false);
    }
  };

  const showToastMissingDoctor = () => {
    showAlert("Doctor ID is missing.", "destructive");
  };

  const aboutItems = [
    { label: "Medical Licence Number", value: doctorLicenseNo, icon: <IdCard className="h-4 w-4" /> },
    { label: "Phone Number", value: doctorPhone, icon: <Phone className="h-4 w-4" /> },
    { label: "Email", value: doctorEmail, icon: <Mail className="h-4 w-4" /> },
    { label: "Location", value: doctorLocation, icon: <MapPin className="h-4 w-4" /> },
    { label: "DOB", value: doctorDOB, icon: <Cake className="h-4 w-4" /> },
    { label: "Blood group", value: doctorBloodGroup, icon: <Droplet className="h-4 w-4" /> },
    { label: "Gender", value: doctorGender, icon: <VenusAndMars className="h-4 w-4" /> },
    { label: "Experience", value: doctorExperience, icon: <Briefcase className="h-4 w-4" /> },
  ];

  const reviews = [
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
  ];

  return (
    <div className=" bg-[#F7F9FB] p-0 font-[Manrope,sans-serif]">
      <div className="mx-auto max-w-[1300px]">

        {/* Back Button */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            title="Go back"
            aria-label="Go back"
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-[#424752]">Back to Doctors</span>
        </div>

        {/* Profile Header */}
        <div className="mb-6 flex flex-col items-start gap-6 rounded-xl border border-[#E5E7EB] bg-white p-7 shadow-sm transition-all duration-300 hover:shadow-md sm:flex-row sm:items-center sm:gap-7">
          <div className="relative flex h-[112px] w-[112px] shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#EDF3FB] shadow-md">
            {doctorPhoto ? (
              <img src={doctorPhoto} alt={doctorName} className="h-full w-full rounded-full object-cover" />
            ) : (
              <User className="h-12 w-12 text-[#00488D]/40" />
            )}
            {doctorIsAvailable && (
              <span className="absolute bottom-1 right-1 h-[16px] w-[16px] animate-pulse rounded-full border-[3px] border-white bg-[#22C55E]" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-[#191C1E]">{doctorName}</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D6E3FF] px-3 py-1 text-xs font-semibold text-[#00488D]">
                <Stethoscope className="h-3.5 w-3.5" />
                {doctorSpecialization}
              </span>
            </div>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-[#424752]">
              <GraduationCap className="h-4 w-4 shrink-0 text-[#00488D]" />
              {doctorQualification}
            </p>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-[#6B7280]">
              <Hospital className="h-4 w-4 shrink-0 text-[#00488D]" />
              Hospital: {doctorBranchNames?.join(", ") || "-"}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              {doctorIsAvailable ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-[#E7F4EE] px-3 py-1 text-xs font-semibold text-[#2E7D5B]">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#22C55E]" />
                  Available
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-[#FCF1DD] px-3 py-1 text-xs font-semibold text-[#A8720F]">
                  <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                  Unavailable
                </span>
              )}
              <button
                onClick={() => { if(!id) return; navigate("/appointments/add", { state: { doctorId: id } }); }}
                className="inline-flex items-center gap-2 rounded-lg bg-[#004785] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#003A6B] hover:shadow-md active:scale-[0.98]"
              >
                Book Appointment
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </button>
            </div>
          </div>
        </div>

        {/* About Card */}
        <div className="mb-6 rounded-xl border border-[#E5E7EB] bg-white p-7 shadow-sm transition-all duration-300 hover:shadow-md">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2.5 text-lg font-bold text-[#191C1E]">
              <UserCircle className="h-5 w-5 text-[#00488D]" />
              About
            </h2>
            <button
              onClick={() => navigate(`/staff/view/${id}`)}
              className="flex items-center gap-1.5 text-sm font-semibold text-[#00488D] transition-colors duration-200 hover:text-[#003A6B] hover:underline"
            >
              View More
              <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {aboutItems.map((item) => (
              <div key={item.label} className="group flex items-start gap-3 rounded-lg p-3 transition-colors duration-200 hover:bg-[#F7F9FB]">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EDF3FB] text-[#00488D] transition-colors duration-200 group-hover:bg-[#D6E3FF]">
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <strong className="block text-[10px] font-bold uppercase tracking-[0.5px] text-[#8C8D8F]">{item.label}</strong>
                  <span className="truncate text-sm font-semibold text-[#191C1E]">{item.value ?? "-"}</span>
                </div>
              </div>
            ))}
          </div>

          <hr className="my-5 border-t border-[#E5E7EB]" />
          <div>
            <h3 className="mb-1.5 flex items-center gap-2 text-base font-semibold text-[#191C1E]">
              <Quote className="h-3.5 w-3.5 text-[#00488D]" />
              Short Bio
            </h3>
            <p className="text-sm leading-relaxed text-[#424752]">{doctorDetail?.doctorProfile?.doctor_bio || "No bio available."}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 inline-flex rounded-lg border border-[#E5E7EB] bg-white p-1 shadow-sm">
          {(["day", "week"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex items-center gap-1.5 rounded-md px-6 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-[0.98] ${
                activeTab === t
                  ? "bg-[#004785] text-white shadow-sm"
                  : "text-[#424752] hover:bg-[#F2F4F6]"
              }`}
            >
              {t === "day" ? <Sun className="h-3.5 w-3.5" /> : <Calendar className="h-3.5 w-3.5" />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Main Grid */}
        <div className="space-y-6">
            {/* Availability */}
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-7 shadow-sm transition-all duration-300 hover:shadow-md">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2.5 text-lg font-bold text-[#191C1E]">
                  <Clock className="h-5 w-5 text-[#00488D]" />
                  Availability
                  {activeTab === "week" && weekChangesLoading && (
                    <Loader2 className="h-4 w-4 animate-spin text-[#00488D]" />
                  )}
                </h2>
                <div className="flex flex-wrap items-center gap-3">
                  {activeTab === "week" && (
                    <div className="flex items-center">
                      <button
                        onClick={() => shiftWeek(-1)}
                        title="Previous week"
                        className="flex h-[27px] w-[25px] items-center justify-center rounded-l-lg border border-[#E5E7EB] bg-white transition-colors duration-150 hover:bg-[#F2F4F6] active:scale-[0.95]"
                      >
                        <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
                          <path d="M5 1L1 5L5 9" stroke="#424752" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            title="Pick a week"
                            className="flex h-[27px] w-[150px] items-center justify-center border-t border-b border-[#E5E7EB] bg-white px-2 text-xs font-medium text-[#191C1E] transition-colors duration-150 hover:bg-[#F2F4F6]"
                          >
                            {weekDates[0]} – {weekDates[6]}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto rounded-xl border-[#E5E7EB] p-0 shadow-lg" align="start">
                          <CalendarPicker
                            theme="light"
                            hideThemePicker
                            mode="week"
                            weekStart={calendarWeekStart}
                            onWeekChange={setCalendarWeekStart}
                            highlightDates={selectedDates}
                            onDatesChange={setSelectedDates}
                            selected={calendarSelectedDate}
                            onSelect={(date) => {
                              if (!date) return;
                              if (date instanceof Date === false) return;
                              setCalendarSelectedDate(date);
                              const week = getWeekDates(date);
                              setWeekDates(week);
                              const [dd, mm, yy] = week[0].split("/").map(Number);
                              const newWeekStart = new Date(2000 + yy, mm - 1, dd);
                              setCalendarWeekStart(newWeekStart);
                              const newSelectedDates = week.map((d) => {
                                const [dd2, mm2, yy2] = d.split("/").map(Number);
                                return new Date(2000 + yy2, mm2 - 1, dd2);
                              });
                              setSelectedDates(newSelectedDates);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                      <button
                        onClick={() => shiftWeek(1)}
                        title="Next week"
                        className="flex h-[27px] w-[25px] items-center justify-center rounded-r-lg border border-[#E5E7EB] bg-white transition-colors duration-150 hover:bg-[#F2F4F6] active:scale-[0.95]"
                      >
                        <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
                          <path d="M1 1L5 5L1 9" stroke="#424752" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
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
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#004785] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#003A6B] hover:shadow-md active:scale-[0.98]"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Slot
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-[#E5E7EB]">
                <div className="hide-scrollbar overflow-x-auto p-0.5">
                  <div className="min-w-[860px]">
                    {/* Header */}
                    <div className="grid grid-cols-7 border-b border-[#E5E7EB] bg-[#F7F9FB]">
                      {WEEK_DAYS.map(([day], dayIdx) => (
                        <div
                          key={day}
                          className={`border-r border-[#E5E7EB] p-3 text-center text-xs font-bold text-[#00488D] last:border-r-0 transition-colors duration-200 ${
                            activeTab === "day" ? "flex items-center justify-center" : ""
                          }`}
                        >
                          <div>
                            {day}
                            {activeTab === "week" && (
                              <span className="mt-0.5 block text-[10px] font-normal normal-case text-[#6B7280]">
                                {weekDates[dayIdx]}
                              </span>
                            )}
                          </div>
                          {activeTab === "week" && weekDateToISO(weekDates[dayIdx]) >= todayIso && (
                            <div className="mt-1.5 flex items-center justify-center gap-1">
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
                                className="flex h-6 w-6 items-center justify-center rounded-md border border-[#E5E7EB] bg-white text-[#00488D] transition-all duration-200 hover:border-[#004785] hover:bg-[#004785] hover:text-white active:scale-90"
                              >
                                <Plus className="h-3 w-3" />
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
                                className="flex h-6 w-6 items-center justify-center rounded-md border border-[#E5E7EB] bg-white text-[#A8720F] transition-all duration-200 hover:border-[#A8720F] hover:bg-[#A8720F] hover:text-white active:scale-90"
                              >
                                <RotateCw className="h-3 w-3" />
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
                                className="flex h-6 w-6 items-center justify-center rounded-md border border-[#E5E7EB] bg-white text-[#B5433E] transition-all duration-200 hover:border-[#B5433E] hover:bg-[#B5433E] hover:text-white active:scale-90"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                          {activeTab === "week" && leaveByIso.has(weekDateToISO(weekDates[dayIdx])) && (
                            <div className="mt-1.5 flex justify-center">
                              <span
                                title="Approved leave covers this date"
                                className="rounded bg-[#FBEAE9] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[#B5433E]"
                              >
                                <CalendarX className="mr-0.5 inline h-2.5 w-2.5" /> Leave
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Rows */}
                    {(activeTab === "week" ? weekSchedule : schedule).map((row, rowIndex) => (
                      <div
                        key={rowIndex}
                        className={`grid grid-cols-7 min-h-[84px] border-b border-[#E5E7EB] last:border-b-0 ${rowIndex % 2 === 0 ? "bg-white" : "bg-[#FBFCFD]"}`}
                      >
                        {row.map((cell, index) => {
                          const cellArr = cell as any[];
                          const text = cellArr[0];
                          const type = cellArr[1];
                          const branch = cellArr[2];
                          const scheduleId = cellArr[3];
                          const branchId = cellArr[4];
                          const startTime = cellArr[5];
                          const endTime = cellArr[6];
                          const changeId = activeTab === "week" ? cellArr[7] ?? null : null;
                          const changeMode = activeTab === "week" ? cellArr[8] : undefined;
                          const consultationMinutes = activeTab === "week" ? (cellArr[9] ?? null) : (cellArr[7] ?? null);
                          const colorType =
                            type === "template" ? "blue" : type === "ADD" ? "green" : type === "OVERRIDE" ? "orange" : type;
                          const isColored = ["green", "blue", "orange"].includes(colorType);
                          const isCancelled = type === "CANCEL";
                          const weekIso = activeTab === "week" ? weekDateToISO(weekDates[index]) : "";

                          const openBlockEdit = () => {
                            if (!canManageSchedule) return;
                            slotModalRef.current?.openEditSlot({
                              scheduleId: scheduleId ?? null,
                              changeId: changeId ?? null,
                              day: WEEK_DAYS[index][0],
                              date: activeTab === "week" ? weekIso : undefined,
                              branchId: branchId ?? "",
                              startTime: startTime ?? "",
                              endTime: endTime ?? "",
                              consultationMinutes: consultationMinutes ?? undefined,
                              mode: activeTab === "week" ? "date" : "weekly",
                              changeMode: changeMode,
                            });
                          };

                          const leaveForCell =
                            activeTab === "week"
                              ? leaveByIso.get(weekIso)
                              : undefined;

                          return (
                            <div key={index} className="min-h-[84px] border-r border-[#E5E7EB] p-1 last:border-r-0 transition-colors duration-200 hover:bg-[rgba(0,71,133,0.02)]">
                              {leaveForCell && (
                                <div
                                  title={leaveForCell.leave_reason ?? "Approved leave"}
                                  className="flex h-[64px] flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border-2 border-dashed border-[#F5B7B7] bg-[#FBEAE9] px-2 text-center transition-shadow duration-200 hover:shadow-sm"
                                >
                                  <span className="text-[9px] font-bold uppercase tracking-wide text-[#B5433E]">
                                    <CalendarX className="mr-1 inline h-3 w-3" /> Doctor Leave
                                  </span>
                                  {leaveForCell.leave_reason && (
                                    <span className="line-clamp-2 px-0.5 text-[8px] leading-[10px] text-[#B5433E]/80">
                                      {leaveForCell.leave_reason}
                                    </span>
                                  )}
                                </div>
                              )}

                              {isCancelled && !leaveForCell && (
                                <div className="relative flex h-[64px] flex-col justify-start gap-0.5 overflow-hidden rounded-lg border-l-4 border-[#9CA3AF] bg-gradient-to-br from-[#F3F4F6] to-[#E8EAED] p-2.5 text-[#6B7280]">
                                  {showDelete && (
                                    <button
                                      type="button"
                                      title="Restore this date"
                                      onClick={(e) => openBlockCancel(e, rowIndex, index)}
                                      className="absolute right-1 top-1 rounded-full p-0.5 text-[#9AA3B0] transition-all duration-200 hover:bg-[#FBEAE9] hover:text-[#B5433E] active:scale-90"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                  <strong className="pl-0.5 text-[9px] font-bold">
                                    <Ban className="mr-1 inline h-3 w-3" /> {text}
                                  </strong>
                                </div>
                              )}

                              {type === "off" && !leaveForCell && (
                                <div className="flex h-[64px] items-center justify-center rounded-lg border-2 border-dashed border-[#E5E7EB] bg-[#FAFBFC] text-[11px] font-semibold text-[#8C8D8F] transition-all duration-200 hover:border-[#B9C6D9] hover:bg-[#F2F4F6]">
                                  <Coffee className="mr-1.5 inline h-3.5 w-3.5" /> Week Off
                                </div>
                              )}

                              {type === "empty" && !leaveForCell && (
                                canManageSchedule ? (
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
                                    className="flex h-[90px] cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-[#E5E7EB] text-xl text-[#B0B8C4] transition-all duration-200 hover:border-[#004785] hover:bg-[#F7F9FB] hover:text-[#004785] active:scale-[0.97]"
                                  >
                                    <Plus className="h-5 w-5" />
                                  </div>
                                ) : (
                                  <div className="flex h-[64px] items-center justify-center rounded-lg border-2 border-dashed border-[#EEF0F3] text-xl text-[#C8CED7]">
                                    <Plus className="h-5 w-5" />
                                  </div>
                                )
                              )}

                              {isColored && !leaveForCell && (
                                <div
                                  onClick={openBlockEdit}
                                  className={`relative flex h-full min-h-[64px] w-full cursor-pointer flex-col items-start gap-[5px] overflow-hidden rounded-lg border-l-4 ${
                                    showDelete ? "px-2.5 pb-2 pt-7" : "p-2.5"
                                  } transition-all duration-200 hover:shadow-sm active:scale-[0.98] ${
                                    colorType === "green"
                                      ? "border-l-[#2E7D5B] bg-[#EAF7F0] text-[#2E7D5B] hover:bg-[#DDF0E6]"
                                      : colorType === "blue"
                                      ? "border-l-[#00488D] bg-[#EDF3FB] text-[#00488D] hover:bg-[#E1ECF8]"
                                      : "border-l-[#A8720F] bg-[#FCF3E4] text-[#A8720F] hover:bg-[#FAEBD3]"
                                  }`}
                                >
                                  {showDelete && (
                                    <button
                                      type="button"
                                      title={activeTab === "week" && changeId != null ? "Remove this date change" : "Delete slot"}
                                      onClick={(e) => openBlockCancel(e, rowIndex, index)}
                                      className="absolute right-1 top-1 rounded-full p-0.5 text-[#9AA3B0] transition-all duration-200 hover:bg-[#FBEAE9] hover:text-[#B5433E] active:bg-[#B5433E] active:text-white active:shadow-[0_0_0_5px_rgba(220,53,69,0.30)] active:scale-90"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                  <strong className="flex flex-col items-start gap-0.5 pl-0.5 text-[11px] font-bold">
                                    <span className="flex items-center gap-2">
                                      <Clock className="h-4 w-4 shrink-0" /> {text}
                                    </span>
                                  </strong>
                                  <small className="flex items-center gap-1 pl-0.5 text-[11px] leading-[10px] mt-1">
                                    <Hospital className="h-4 w-4 shrink-0" />
                                    <span className="truncate">{branch || "Central Hospital"}</span>
                                  </small>
                                  {activeTab === "week" && changeId != null && (
                                    <small className="pl-0.5 text-[7px] uppercase tracking-wide text-[#8C8D8F] mt-0.5">
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
              </div>
            </div>

            {/* Leave Submission + Reviews rail */}
            <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
              {/* Leave Submission */}
              <div className="rounded-xl border border-[#E5E7EB] bg-white p-7 shadow-sm transition-all duration-300 hover:shadow-md">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FBEAE9] text-[#B5433E]">
                    <CalendarOff className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-bold text-[#191C1E]">Leave Submission</h2>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-[#F7F9FB] px-3 py-1.5 text-[10px] font-semibold tracking-[0.7px] text-[#8C8D8F]">
                  <ClipboardList className="h-3 w-3" /> LEAVE MANAGEMENT
                </span>
              </div>

              <form onSubmit={submitLeave} className="w-full">
                <div className="mb-4">
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.5px] text-[#6B7280]">
                    Leave Type
                  </label>
                  <div className="flex gap-2">
                    {(["Emergency", "Vacation", "Sick Leave"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setLeaveType(type)}
                        className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold ${
                          leaveType === type
                            ? "border-[#004785] bg-[#004785] text-white"
                            : "border-[#E5E7EB] bg-white text-[#424752] hover:bg-[#F2F4F6]"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 max-[700px]:grid-cols-1">
                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.5px] text-[#6B7280]">
                      <CalendarIcon className="h-3 w-3" /> From
                    </label>
                    <Popover open={isFromCalendarOpen} onOpenChange={setIsFromCalendarOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-full rounded-lg border border-[#E5E7EB] bg-white p-3 text-left text-sm font-medium text-[#191C1E] outline-none transition-all duration-200 hover:border-[#B9C6D9] focus:border-[#00488D] focus:ring-2 focus:ring-[#D6E3FF]"
                        >
                          {fromDate ? format(fromDate, "dd/MM/yyyy") : "Select date"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto rounded-xl border-[#E5E7EB] p-0 shadow-lg">
                        <CalendarPicker
                          selected={fromDate}
                          minDate={new Date()}
                          hideThemePicker
                          onSelect={(date) => {
                            if (!(date instanceof Date)) return;
                            setFromDate(date);
                            setIsFromCalendarOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.5px] text-[#6B7280]">
                      <CalendarIcon className="h-3 w-3" /> To
                    </label>
                    <Popover open={isToCalendarOpen} onOpenChange={setIsToCalendarOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-full rounded-lg border border-[#E5E7EB] bg-white p-3 text-left text-sm font-medium text-[#191C1E] outline-none transition-all duration-200 hover:border-[#B9C6D9] focus:border-[#00488D] focus:ring-2 focus:ring-[#D6E3FF]"
                        >
                          {toDate ? format(toDate, "dd/MM/yyyy") : "Select date"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto rounded-xl border-[#E5E7EB] p-0 shadow-lg">
                        <CalendarPicker
                          selected={toDate}
                          minDate={new Date()}
                          hideThemePicker
                          onSelect={(date) => {
                            if (!(date instanceof Date)) return;
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
                  className="mt-4 min-h-[70px] w-full resize-y rounded-lg border border-[#E5E7EB] bg-white p-3 text-sm text-[#191C1E] outline-none transition-all duration-200 placeholder:text-[#B0B8C4] hover:border-[#B9C6D9] focus:border-[#00488D] focus:ring-2 focus:ring-[#D6E3FF]"
                />

                <div className="mt-5 flex justify-end gap-3">
                  <button
                    type="reset"
                    onClick={() => {
                      setFromDate(null);
                      setToDate(null);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-6 py-2.5 text-sm font-semibold text-[#424752] transition-all duration-200 hover:bg-[#F2F4F6] active:scale-[0.98]"
                  >
                    <X className="h-4 w-4" /> Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingLeave || processingLeave}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#004785] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#003A6B] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {submittingLeave || processingLeave ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" /> Submit
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

              {/* Reviews rail */}
  <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm transition-all duration-300 hover:shadow-md">
    {reviews.map((review) => (
      <div key={review.name} className="border-b border-[#F2F4F6] p-4 transition-colors duration-200 last:border-b-0 hover:bg-[#FAFBFC]">
        <div className="flex items-start gap-3">
          <img
            src={review.image}
            alt={review.name}
            className="h-9 w-9 rounded-full border border-[#E5E7EB] object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-[#191C1E] truncate">{review.name}</h3>
            <span className="text-[10px] text-[#8C8D8F]">
              <Clock className="mr-0.5 inline h-3 w-3" /> {review.time}
            </span>
          </div>
          <div className="flex items-center gap-0.5 text-xs tracking-wider text-[#F5A623] flex-shrink-0">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${i < review.rating ? "fill-current" : "text-[#E5E7EB]"}`}
              />
            ))}
          </div>
        </div>
        <hr className="my-2.5 border-t border-[#F2F4F6]" />
        <p className="text-xs leading-relaxed text-[#424752] line-clamp-3">{review.text}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {review.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[#D6E3FF] px-2 py-0.5 text-[9px] font-semibold text-[#00488D] transition-colors duration-200 hover:bg-[#00488D] hover:text-white"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    ))}
    <button
      onClick={() => showAlert("All reviews opened.")}
      className="flex w-full items-center justify-center gap-2 border-t border-[#F2F4F6] bg-[#F7F9FB] py-3 text-sm font-semibold text-[#00488D] transition-colors duration-200 hover:bg-[#004785] hover:text-white active:scale-[0.99]"
    >
      Read All Reviews <ArrowLeft className="h-4 w-4 rotate-180" />
    </button>
  </div>
            </div>
        </div>
      </div>

      {/* Pending Transfer / Affected Appointments Dialog */}
      <AffectedAppointmentsDialog
        open={pendingTransfer !== null}
        onOpenChange={(open) => {
          if (!open) setPendingTransfer(null);
        }}
        employeeId={id ?? ""}
        branches={doctorDetail?.branches ?? []}
        doctors={openDoctors}
        transfers={
          pendingTransfer
            ? [{ transfer_id: pendingTransfer.transferId, message: pendingTransfer.message }]
            : []
        }
        appointments={pendingTransfer?.appointments ?? []}
        title="Affected Appointments"
        onCompleted={() => {
          void handleTransferCompleted();
        }}
      />

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
            <AlertDialogTitle className="flex items-center gap-2 text-[#2E7D5B]">
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

          <div className="max-h-[220px] overflow-y-auto rounded-lg border border-[#E5E7EB]">
            {leaveConflicts.map((conflict) => (
              <div
                key={conflict.appointment_id}
                className="flex items-center justify-between gap-3 border-b border-[#F2F4F6] px-3 py-2 text-[12px] last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#191C1E]">
                    {conflict.patientName}
                  </p>
                  <p className="text-[#6B7280]">
                    {format(new Date(conflict.appointment_date), "dd/MM/yyyy")}
                    {formatTimeOfDay(conflict.appointment_time)
                      ? ` · ${formatTimeOfDay(conflict.appointment_time)}`
                      : ""}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[#F2F4F6] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#424752]">
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
              className="border border-[#E5E7EB] bg-white text-[#424752] hover:bg-[#F2F4F6]"
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
        showBypassOption={viewerIsAdmin}
      />
    </div>
  );
}
