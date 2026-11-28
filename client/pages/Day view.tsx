import { useState, useEffect, useRef, useMemo, useDeferredValue, memo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  Loader2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Check,
  Clock,
  Calendar as CalendarIcon,
  User,
  Phone,
  FileText,
  ExternalLink,
  Edit,
  Stethoscope,
  X,
  UserCheck,
} from "lucide-react";
import { format, isToday, isTomorrow, isYesterday, addDays, subDays } from "date-fns";
import {
  getTodayInActiveTimezone,
  getNowMinutesInActiveTimezone,
  dayKeyOf,
  formatInBranchTimezone,
  isTodayInActiveTimezone,
  isYesterdayInActiveTimezone,
  isTomorrowInActiveTimezone,
} from "@/utils/timezone";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CalendarPicker from "@/components/hms/Calender";
import ExportReport from "@/components/ui/ExportReport";
import { downloadExportCsv, exportErrorMessage } from "@/api/export.api";
import { useToast } from "@/hooks/use-toast";
import { appointmentApi, type AppointmentRecord } from "@/api/appointment.api";
import { doctorScheduleApi, type ActiveScheduleRecord } from "@/api/doctorSchedule.api";
import {
  employeeApi,
  type EmployeeRecord,
  type EmployeeDetailResponse,
} from "@/api/employee.api";
import { FilterPopover, useFilterPanel, useScheduleFilters } from "@/components/Filter";
import { usePermission } from "@/context/PermissionContext";
import { branchApi } from "@/api/branch.api";
import { RefreshButton } from "@/components/hms/RefreshButton";
import { StatusBadge } from "@/components/hms/StatusBadge";
import { cn } from "@/lib/utils";

/* ============================= Types ============================= */

interface DayDoctorColumn {
  employeeId: string;
  branchId: string;
  departmentId: string;
  name: string;
  spec: string;
  initials: string;
  isOnDutyToday: boolean;
  shiftLabel: string;
}

interface DoctorHourCell {
  hour: number;
  isPast: boolean;
  isOnDuty: boolean;
  shiftSchedule?: ActiveScheduleRecord;
  appointments: AppointmentRecord[];
}

interface HourRow {
  hour: number;
  label: string;
  isCurrentHour: boolean;
  currentMinuteOffset?: number;
  isOffHours: boolean;
  isPastHour: boolean;
  perDoctor: DoctorHourCell[];
}

type ScheduleViewType = "list" | "day" | "week";

interface AppointmentScheduleProps {
  onViewChange?: (view: ScheduleViewType) => void;
  initialDate?: Date;
  onDateChange?: (date: Date) => void;
}

/* ============================= Helper Functions ============================= */

function formatHHmmLabel(hhmm: string): string {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${String(m || 0).padStart(2, "0")} ${period}`;
}

function hhmmToMinutes(time: string): number {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function normalizeAppointmentTime(time: string): string {
  if (!time) return "";
  if (!time.includes("T")) return time.slice(0, 5);
  const d = new Date(time);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

function timeStringToMinutes(time: string): number {
  if (!time) return NaN;
  if (!time.includes("T")) {
    const parts = time.split(":").map(Number);
    return parts[0] * 60 + (parts[1] || 0);
  }
  const d = new Date(time);
  return isNaN(d.getTime()) ? NaN : d.getUTCHours() * 60 + d.getUTCMinutes();
}

function formatMinutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

function formatTimeRange(timeStr: string, durationMinutes?: number | null) {
  const normalized = normalizeAppointmentTime(timeStr);
  const startM = hhmmToMinutes(normalized);
  const dur = durationMinutes && durationMinutes > 0 ? durationMinutes : 30;
  const endM = startM + dur;

  return {
    start: formatHHmmLabel(normalized),
    end: formatMinutesToTime(endM),
    duration: `${dur} mins`,
  };
}

function getInitials(name: string): string {
  const clean = name.replace(/^Dr\.?\s*/i, "").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "DR";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function mapEmployeeToDayColumn(
  emp: EmployeeRecord,
  schedules: ActiveScheduleRecord[] = [],
  selectedDayOfWeek: string = "",
): DayDoctorColumn {
  const name = `Dr. ${[emp.first_name, emp.middle_name, emp.last_name].filter(Boolean).join(" ")}`;
  const todaysShifts = schedules.filter(
    (s) => (s.day_of_week ?? "").trim().toUpperCase() === selectedDayOfWeek && s.start_time && s.end_time,
  );
  const isOnDutyToday = todaysShifts.length > 0;
  let shiftLabel = "Off Duty";

  if (isOnDutyToday) {
    const s = todaysShifts[0];
    const sM = timeStringToMinutes(s.start_time);
    const eM = timeStringToMinutes(s.end_time);
    if (!isNaN(sM) && !isNaN(eM)) {
      shiftLabel = `${formatMinutesToTime(sM)} – ${formatMinutesToTime(eM)}`;
    } else {
      shiftLabel = "On Duty";
    }
  }

  return {
    employeeId: emp.employee_id,
    branchId: emp.branch_id,
    departmentId: emp.department_id,
    name,
    spec: emp.department_master?.department_name || emp.specialization || "General",
    initials: getInitials(name),
    isOnDutyToday,
    shiftLabel,
  };
}

function formatPatientFullName(bio?: AppointmentRecord["patient_bio_data"]): string {
  if (!bio) return "Unknown Patient";
  return [bio.patient_first_name, bio.patient_middle_name, bio.patient_last_name].filter(Boolean).join(" ");
}

/* ============================= Sub-Components ============================= */

const STATUS_BORDER_COLORS: Record<string, string> = {
  SCHEDULED: "border-l-blue-500 bg-blue-50/40 hover:bg-blue-50/80",
  CHECKED_IN: "border-l-amber-500 bg-amber-50/40 hover:bg-amber-50/80",
  IN_CONSULTATION: "border-l-purple-500 bg-purple-50/40 hover:bg-purple-50/80",
  COMPLETED: "border-l-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/80",
  CANCELLED: "border-l-rose-400 bg-rose-50/30 hover:bg-rose-50/60 opacity-70",
  NO_SHOW: "border-l-gray-400 bg-gray-50/50 hover:bg-gray-50/80 opacity-70",
  RESCHEDULED: "border-l-indigo-500 bg-indigo-50/40 hover:bg-indigo-50/80",
};

const BookedCard = memo(function BookedCard({
  record,
  onClick,
}: {
  record: AppointmentRecord;
  onClick: (record: AppointmentRecord) => void;
}) {
  const patientName = formatPatientFullName(record.patient_bio_data);
  const status = record.status || "SCHEDULED";
  const statusStyle = STATUS_BORDER_COLORS[status] || STATUS_BORDER_COLORS.SCHEDULED;
  const { start, end, duration } = formatTimeRange(record.appointment_time, record.duration_minutes);

  return (
    <button
      type="button"
      onClick={() => onClick(record)}
      title={`Click to view details: ${patientName} (${status})`}
      className={cn(
        "group relative flex w-full flex-col justify-between rounded-lg border border-[#E2E8F0] border-l-[3.5px] p-2 text-left shadow-xs transition-all duration-150 hover:shadow-md hover:scale-[1.01] focus:outline-none focus:ring-1 focus:ring-clinical-blue",
        statusStyle,
      )}
    >
      {/* Patient Name & Duration */}
      <div className="flex items-start justify-between gap-1 w-full">
        <span className="text-[12px] font-bold text-gray-900 group-hover:text-clinical-blue leading-snug break-words whitespace-normal flex-1">
          {patientName}
        </span>
        <span className="flex-none rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-gray-700 shadow-2xs">
          {duration}
        </span>
      </div>

      {/* From-To Time Range & Token */}
      <div className="mt-1.5 flex items-center justify-between gap-1 text-[10px]">
        <span className="font-semibold text-gray-700 flex items-center gap-1">
          <Clock className="h-3 w-3 text-clinical-blue" />
          <span>{start} – {end}</span>
        </span>
        <span className="text-gray-500 font-medium">
          {record.token_number ? `#${record.token_number}` : ""}
        </span>
      </div>

      {/* Status & Visit Type */}
      <div className="mt-1 flex items-center justify-between gap-1 text-[10px] pt-1 border-t border-gray-200/50">
        <span className="text-gray-500 truncate max-w-[110px]">
          {record.patient_visit_type || "Consultation"}
        </span>
        <StatusBadge status={status} />
      </div>
    </button>
  );
});

const AddSlotButton = memo(function AddSlotButton({
  isPast,
  onBook,
}: {
  isPast: boolean;
  onBook: () => void;
}) {
  if (isPast) {
    return (
      <div className="flex h-7 w-full items-center justify-center rounded-md border border-gray-100 bg-gray-50/70 text-[10px] font-medium text-gray-400 select-none">
        Past Hour
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onBook}
      title="Add appointment for this hour"
      className="group flex h-7 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-clinical-blue/40 bg-clinical-blue/[0.02] text-[11px] font-semibold text-clinical-blue transition-all duration-150 hover:border-clinical-blue hover:bg-clinical-blue/10 active:scale-98 shadow-2xs"
    >
      <Plus className="h-3.5 w-3.5 text-clinical-blue transition-transform group-hover:rotate-90" />
      <span>Add Appointment</span>
    </button>
  );
});

const OffDutySlot = memo(function OffDutySlot() {
  return (
    <div className="flex h-7 w-full items-center justify-center rounded border border-transparent bg-gray-50/40">
      <span className="text-[10px] text-gray-300 font-light">—</span>
    </div>
  );
});

/* ============================= Main Component ============================= */

const AppointmentSchedule = ({
  onViewChange,
  initialDate,
  onDateChange,
}: AppointmentScheduleProps = {}) => {
  const navigate = useNavigate();
  const { can } = usePermission();
  const { toast } = useToast();

  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get("date");
  const parsedDateFromUrl = useMemo(() => {
    if (!dateParam) return null;
    const parts = dateParam.split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return null;
  }, [dateParam]);

  const [selectedDate, setSelectedDate] = useState<Date>(parsedDateFromUrl || initialDate || new Date());
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const currentHourRowRef = useRef<HTMLDivElement>(null);

  const [viewType, setViewType] = useState<ScheduleViewType>("day");
  const [dataVersion, setDataVersion] = useState(0);
  const [toolbarSearchTerm, setToolbarSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(toolbarSearchTerm);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("ALL");
  const [showOnDutyOnly, setShowOnDutyOnly] = useState<boolean>(false);

  // Selected appointment modal state
  const [inspectAppointment, setInspectAppointment] = useState<AppointmentRecord | null>(null);

  // Close view menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) {
        setIsViewMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const viewTypeOptions: { key: ScheduleViewType; label: string }[] = [
    { key: "list", label: "List View" },
    { key: "day", label: "Day View" },
    { key: "week", label: "Week View" },
  ];

  // Sync external date if provided or URL param changes
  useEffect(() => {
    if (parsedDateFromUrl && parsedDateFromUrl.getTime() !== selectedDate.getTime()) {
      setSelectedDate(parsedDateFromUrl);
    } else if (initialDate && initialDate.getTime() !== selectedDate.getTime()) {
      setSelectedDate(initialDate);
    }
  }, [parsedDateFromUrl, initialDate]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    onDateChange?.(date);
    setIsCalendarOpen(false);
  };

  const handleDateStep = (days: number) => {
    const next = addDays(selectedDate, days);
    setSelectedDate(next);
    onDateChange?.(next);
  };

  // Filter hook
  const {
    values: filterValues,
    appliedValues,
    isOpen: isFilterOpen,
    setIsOpen: setIsFilterOpen,
    handleChange: handleFilterChange,
    handleApply: handleApplyFilter,
    handleClear: handleClearFilter,
  } = useFilterPanel();

  /* ----------------- 1. Fetch Day Appointments (In-Memory Cached & Antilag) ----------------- */
  const dayAppointmentsCacheRef = useRef<Map<string, AppointmentRecord[]>>(new Map());
  const [dayAppointments, setDayAppointments] = useState<AppointmentRecord[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
  const [appointmentsFailed, setAppointmentsFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const date = dayKeyOf(selectedDate);

    // If already in memory cache, show immediately without spinner flash (0ms latency)
    if (dayAppointmentsCacheRef.current.has(date)) {
      setDayAppointments(dayAppointmentsCacheRef.current.get(date)!);
      setIsLoadingAppointments(false);
    } else {
      setIsLoadingAppointments(true);
    }
    setAppointmentsFailed(false);

    const loadDayAppointments = async () => {
      try {
        const firstPage = await appointmentApi.getAll({ date, page: 1, limit: 100, viewMode: "calendar" });
        const firstData = firstPage.data?.data;
        const totalPages = firstData?.totalPages ?? 1;

        let appointments = firstData?.appointments ?? [];

        if (totalPages > 1) {
          const remainingPages = Array.from({ length: totalPages - 1 }, (_, index) =>
            appointmentApi.getAll({ date, page: index + 2, limit: 100, viewMode: "calendar" }),
          );
          const remainingResults = await Promise.all(remainingPages);
          appointments = [
            ...appointments,
            ...remainingResults.flatMap((res) => res.data?.data?.appointments ?? []),
          ];
        }

        if (!cancelled) {
          dayAppointmentsCacheRef.current.set(date, appointments);
          setDayAppointments(appointments);
        }
      } catch (err) {
        console.error("[Day View] Failed to load appointments:", err);
        if (!cancelled && !dayAppointmentsCacheRef.current.has(date)) {
          setDayAppointments([]);
          setAppointmentsFailed(true);
          toast({
            title: "Failed to load appointments",
            description: "Couldn't reach the appointments API.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setIsLoadingAppointments(false);
      }
    };

    void loadDayAppointments();
    return () => {
      cancelled = true;
    };
  }, [selectedDate, toast, dataVersion]);

  /* ----------------- 2. Fetch Active Doctors & Branches ----------------- */
  const [rawDoctors, setRawDoctors] = useState<EmployeeRecord[]>([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);
  const [doctorsFailed, setDoctorsFailed] = useState(false);
  const [activeBranchIds, setActiveBranchIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    branchApi
      .getAll()
      .then((res) => {
        const branches = res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setActiveBranchIds(new Set(branches.map((b: { branch_id: string }) => b.branch_id)));
      })
      .catch(() => setActiveBranchIds(new Set()));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadDoctors = async () => {
      setIsLoadingDoctors(true);
      setDoctorsFailed(false);

      try {
        const firstPage = await employeeApi.getAll({ roleType: "DOCTOR", page: 1, limit: 1000 });
        const firstData = firstPage.data?.data;
        const totalPages = firstData?.totalPages ?? 1;
        let employees = firstData?.employees ?? [];

        if (totalPages > 1) {
          const remainingPages = Array.from({ length: totalPages - 1 }, (_, index) =>
            employeeApi.getAll({ roleType: "DOCTOR", page: index + 2, limit: 1000 }),
          );
          const remainingResults = await Promise.all(remainingPages);
          employees = [...employees, ...remainingResults.flatMap((res) => res.data?.data?.employees ?? [])];
        }

        if (!cancelled) {
          const activeDoctors = employees.filter((e) => e.emp_status === true);
          setRawDoctors(activeDoctors);
        }
      } catch (err) {
        console.error("[Day View] Failed to load doctors:", err);
        if (!cancelled) {
          setRawDoctors([]);
          setDoctorsFailed(true);
          toast({
            title: "Failed to load doctors",
            description: "Couldn't reach the employees API.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setIsLoadingDoctors(false);
      }
    };

    void loadDoctors();
    return () => {
      cancelled = true;
    };
  }, [toast, dataVersion]);

  /* ----------------- 3. Fetch All Active Doctor Schedules (1 Fast Batch Request) ----------------- */
  const [doctorSchedulesByEmployee, setDoctorSchedulesByEmployee] = useState<Record<string, ActiveScheduleRecord[]>>({});
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingSchedules(true);

    doctorScheduleApi
      .getAllActive()
      .then((res) => {
        if (cancelled) return;
        const list = res.data?.data ?? [];
        const schedulesMap: Record<string, ActiveScheduleRecord[]> = {};
        list.forEach((item) => {
          if (!schedulesMap[item.employee_id]) {
            schedulesMap[item.employee_id] = [];
          }
          schedulesMap[item.employee_id].push({
            schedule_id: Number(item.schedule_id),
            employee_id: item.employee_id,
            branch_id: item.branch_id,
            day_of_week: item.day_of_week,
            shift_name: item.shift_name,
            start_time: item.start_time,
            end_time: item.end_time,
            consultation_minutes: item.consultation_minutes,
          });
        });
        setDoctorSchedulesByEmployee(schedulesMap);
      })
      .catch((err) => {
        console.error("[Day View] Failed to load active doctor schedules:", err);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSchedules(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dataVersion]);

  /* ----------------- 4. Visible Filtered Doctors (Using Deferred Search) ----------------- */
  const selectedDayOfWeek = formatInBranchTimezone(selectedDate, "EEEE").toUpperCase();
  const selectedDateStr = dayKeyOf(selectedDate);

  const doctorColumns: DayDoctorColumn[] = useMemo(() => {
    return rawDoctors.map((doc) =>
      mapEmployeeToDayColumn(doc, doctorSchedulesByEmployee[doc.employee_id] ?? [], selectedDayOfWeek),
    );
  }, [rawDoctors, doctorSchedulesByEmployee, selectedDayOfWeek]);

  // Departments list for quick filter tabs
  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    doctorColumns.forEach((d) => {
      if (d.spec) set.add(d.spec);
    });
    return Array.from(set).sort();
  }, [doctorColumns]);

  const { doctorFilterFields } = useScheduleFilters({
    doctors: doctorColumns,
    idKey: "doctorIds",
    valueField: "employeeId",
  });

  const visibleDoctorColumns = useMemo(() => {
    const term = deferredSearchTerm.trim().toLowerCase();
    const selectedIds: string[] = Array.isArray(appliedValues.doctorIds) ? appliedValues.doctorIds : [];

    return doctorColumns.filter((doc) => {
      if (selectedDepartment !== "ALL" && doc.spec !== selectedDepartment) return false;
      if (term && !doc.name.toLowerCase().includes(term) && !doc.spec.toLowerCase().includes(term)) return false;
      if (selectedIds.length > 0 && !selectedIds.includes(doc.employeeId)) return false;

      // If user activated "On Duty Only" filter, narrow down to on-duty or doctors with appointments today
      if (showOnDutyOnly) {
        const hasApptToday = dayAppointments.some((a) => a.employees?.employee_id === doc.employeeId);
        return doc.isOnDutyToday || hasApptToday;
      }

      // Default: show all matching doctors!
      return true;
    });
  }, [
    doctorColumns,
    deferredSearchTerm,
    selectedDepartment,
    appliedValues,
    showOnDutyOnly,
    dayAppointments,
  ]);

  /* ----------------- 5. Grid Assembly (24 Hours, O(1) Pre-Indexed Hash Map) ----------------- */
  const NON_BLOCKING_STATUSES = useMemo(() => new Set(["CANCELLED", "NO_SHOW"]), []);
  const HOURS = useMemo(() => Array.from({ length: 24 }, (_, h) => h), []);

  const todayStr = getTodayInActiveTimezone();
  const isSelectedDateToday = selectedDateStr === todayStr;
  const isSelectedDatePast = selectedDateStr < todayStr;
  const nowMinutes = getNowMinutesInActiveTimezone();
  const currentHour = Math.floor(nowMinutes / 60);
  const currentMinuteInHour = nowMinutes % 60;

  // O(1) Pre-indexed Appointment Lookup Map
  const appointmentsByDocAndHour = useMemo(() => {
    const map = new Map<string, AppointmentRecord[]>();
    for (const a of dayAppointments) {
      if (NON_BLOCKING_STATUSES.has(a.status || "")) continue;
      const docId = a.employees?.employee_id;
      if (!docId) continue;
      const t = normalizeAppointmentTime(a.appointment_time);
      if (!t) continue;
      const apptHour = Math.floor(hhmmToMinutes(t) / 60);
      const key = `${docId}_${apptHour}`;
      const list = map.get(key);
      if (list) {
        list.push(a);
      } else {
        map.set(key, [a]);
      }
    }
    return map;
  }, [dayAppointments, NON_BLOCKING_STATUSES]);

  const scheduleRows: HourRow[] = useMemo(() => {
    return HOURS.map((hour) => {
      const isCurHour = isSelectedDateToday && hour === currentHour;
      const isOffHours = hour < 8 || hour >= 20;

      // Past check: if selected date is in the past, or if today and this hour has already concluded
      const isPastHour = isSelectedDatePast || (isSelectedDateToday && (hour + 1) * 60 <= nowMinutes);

      const perDoctor: DoctorHourCell[] = visibleDoctorColumns.map((doc) => {
        const schedules = doctorSchedulesByEmployee[doc.employeeId] ?? [];
        const todaysShifts = schedules.filter((s) => {
          if ((s.day_of_week ?? "").trim().toUpperCase() !== selectedDayOfWeek) return false;
          if (!s.start_time || !s.end_time) return false;
          if (activeBranchIds && s.branch_id && !activeBranchIds.has(s.branch_id)) return false;
          return true;
        });

        // Does doctor have an active shift during this hour?
        const shiftMatchingHour = todaysShifts.find((s) => {
          const sM = timeStringToMinutes(s.start_time);
          const eM = timeStringToMinutes(s.end_time);
          if (isNaN(sM) || isNaN(eM)) return false;
          // Shift covers this hour if shift starts before the hour ends and ends after the hour starts
          return sM < (hour + 1) * 60 && eM > hour * 60;
        });

        // Instant O(1) Map lookup
        const hourAppointments = appointmentsByDocAndHour.get(`${doc.employeeId}_${hour}`) ?? [];

        return {
          hour,
          isPast: isPastHour,
          isOnDuty: Boolean(shiftMatchingHour),
          shiftSchedule: shiftMatchingHour,
          appointments: hourAppointments,
        };
      });

      return {
        hour,
        label: formatHHmmLabel(`${String(hour).padStart(2, "0")}:00`),
        isCurrentHour: isCurHour,
        currentMinuteOffset: isCurHour ? (currentMinuteInHour / 60) * 100 : undefined,
        isOffHours,
        isPastHour,
        perDoctor,
      };
    });
  }, [
    HOURS,
    visibleDoctorColumns,
    doctorSchedulesByEmployee,
    appointmentsByDocAndHour,
    selectedDayOfWeek,
    activeBranchIds,
    isSelectedDateToday,
    isSelectedDatePast,
    nowMinutes,
    currentHour,
    currentMinuteInHour,
  ]);

  /* ----------------- 6. Auto-Scroll to Current Time on Mount / Reload ----------------- */
  const isDataLoaded = !isLoadingAppointments && !isLoadingDoctors && !isLoadingSchedules;

  useEffect(() => {
    if (!isDataLoaded) return;

    const timer = setTimeout(() => {
      const container = gridContainerRef.current;
      if (!container) return;

      if (isSelectedDateToday && currentHourRowRef.current) {
        const rowTop = currentHourRowRef.current.offsetTop;
        container.scrollTo({
          top: Math.max(0, rowTop - 130),
          behavior: "smooth",
        });
      } else {
        // Scroll to 8 AM row (~8 * 76px = 608px)
        container.scrollTo({
          top: 608,
          behavior: "smooth",
        });
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [isDataLoaded, selectedDateStr, visibleDoctorColumns.length]);

  // View selector handler
  const handleViewSelect = (view: ScheduleViewType) => {
    setViewType(view);
    if (onViewChange) {
      onViewChange(view);
    } else {
      const dateStr = dayKeyOf(selectedDate);
      if (view === "week") navigate(`/appointments/week-view?date=${dateStr}`);
      else if (view === "list") navigate(`/appointments?date=${dateStr}`);
    }
  };

  const handleBookAtHour = (doc: DayDoctorColumn, hour: number, shift?: ActiveScheduleRecord) => {
    const timeFormatted = `${String(hour).padStart(2, "0")}:00`;
    navigate("/appointments/add", {
      state: {
        slot: {
          doctorId: doc.employeeId,
          branchId: shift?.branch_id || doc.branchId,
          departmentId: doc.departmentId,
          date: selectedDateStr,
          time: timeFormatted,
        },
      },
    });
  };

  const dateLabel = isTodayInActiveTimezone(selectedDate)
    ? "Today"
    : isYesterdayInActiveTimezone(selectedDate)
      ? "Yesterday"
      : isTomorrowInActiveTimezone(selectedDate)
        ? "Tomorrow"
        : formatInBranchTimezone(selectedDate, "dd/MM/yyyy");

  const totalAppointments = dayAppointments.length;

  const handleExport = async (exportFormat: string) => {
    if (exportFormat !== "csv") return;
    try {
      const day = dayKeyOf(selectedDate);
      await downloadExportCsv("appointments", { from: day, to: day });
      toast({ title: "Export complete", description: "The CSV file has been downloaded." });
    } catch (err: any) {
      toast({
        title: "Export failed",
        description: exportErrorMessage(err),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex w-full font-manrope bg-clinical-page-bg min-h-screen">
      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex flex-col gap-5">
          {/* ==================== HEADER ==================== */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="hms-heading flex items-center gap-2.5">
                <span>Appointment Schedule</span>
                <span className="rounded-full bg-clinical-blue/10 px-2.5 py-0.5 text-xs font-semibold text-clinical-blue">
                  Day View
                </span>
              </h1>
              <p className="hms-subheading mt-1 flex items-center gap-2">
                <span>{formatInBranchTimezone(selectedDate, "EEEE, MMMM d, yyyy")}</span>
                <span>•</span>
                <span className="font-semibold text-gray-700">{totalAppointments} Appointments Scheduled</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              {can("report.export") && <ExportReport onExport={handleExport} />}

              {can("appointment.create") && (
                <button
                  type="button"
                  onClick={() => navigate("/appointments/add")}
                  className="flex items-center gap-2 px-4 py-2 bg-clinical-blue rounded-lg text-white text-xs font-semibold shadow-xs shadow-clinical-blue/20 transition-all hover:bg-clinical-blue-mid active:scale-98"
                >
                  <Plus className="w-4 h-4" />
                  Add Appointment
                </button>
              )}
            </div>
          </div>

          {/* ==================== MAIN CARD ==================== */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col min-h-[600px] transition-all">
            {/* ==================== TOOLBAR ==================== */}
            <div className="px-5 py-3.5 border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-3">
              {/* Left Toolbar Controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* View Switcher */}
                <div className="relative" ref={viewMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsViewMenuOpen((o) => !o)}
                    className="flex items-center gap-2 px-3 py-1.5 border border-[#E5E7EB] rounded-md text-xs font-semibold text-[#374151] hover:border-[#00488D] transition-colors bg-white shadow-2xs"
                  >
                    <span>{viewTypeOptions.find((opt) => opt.key === viewType)?.label ?? "Day View"}</span>
                    <ChevronDown
                      className={cn(
                        "w-3.5 h-3.5 text-[#6B7280] transition-transform duration-200",
                        isViewMenuOpen && "rotate-180",
                      )}
                    />
                  </button>

                  {isViewMenuOpen && (
                    <div className="absolute left-0 top-full mt-1 w-36 bg-white border border-[#E5E7EB] rounded-md shadow-lg overflow-hidden z-40">
                      {viewTypeOptions.map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => {
                            setIsViewMenuOpen(false);
                            setViewType(opt.key);
                            const dateStr = dayKeyOf(selectedDate);
                            if (onViewChange) {
                              onViewChange(opt.key);
                            }
                            if (opt.key === "week") navigate(`/appointments/week-view?date=${dateStr}`);
                            else if (opt.key === "list") navigate(`/appointments?date=${dateStr}`);
                            else navigate(`/appointments/day-view?date=${dateStr}`);
                          }}
                          className={cn(
                            "flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-left transition-colors",
                            viewType === opt.key
                              ? "bg-[#D6E3FF] text-[#00488D]"
                              : "text-[#374151] hover:bg-[#F2F4F6]",
                          )}
                        >
                          <span>{opt.label}</span>
                          {viewType === opt.key && <Check className="w-3.5 h-3.5 text-[#00488D]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* On-Duty Only Filter Toggle */}
                <button
                  type="button"
                  onClick={() => setShowOnDutyOnly(!showOnDutyOnly)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all",
                    showOnDutyOnly
                      ? "bg-clinical-blue text-white border-clinical-blue shadow-2xs"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50",
                  )}
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>On-Duty Only</span>
                </button>

                {/* Department Quick Filter */}
                {availableDepartments.length > 0 && (
                  <div className="hidden sm:flex items-center gap-1 border-l border-gray-200 pl-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedDepartment("ALL")}
                      className={cn(
                        "px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors",
                        selectedDepartment === "ALL"
                          ? "bg-clinical-blue text-white shadow-2xs"
                          : "text-gray-600 hover:bg-gray-100",
                      )}
                    >
                      All Depts
                    </button>
                    {availableDepartments.slice(0, 4).map((dept) => (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => setSelectedDepartment(dept)}
                        className={cn(
                          "px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors truncate max-w-[120px]",
                          selectedDepartment === dept
                            ? "bg-clinical-blue text-white shadow-2xs"
                            : "text-gray-600 hover:bg-gray-100",
                        )}
                        title={dept}
                      >
                        {dept}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Toolbar Controls */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search"
                    value={toolbarSearchTerm}
                    onChange={(e) => setToolbarSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-[#F2F4F6] text-xs text-[#6B7280] placeholder:text-[#6B7280] outline-none w-[150px] sm:w-[200px] rounded-md transition-all duration-200 focus:rounded-none focus:w-[200px] sm:focus:w-[250px]"
                  />
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#424752]" />
                </div>

                {/* Date Navigation */}
                <div className="flex items-center rounded-lg border border-[#E5E7EB] bg-white shadow-2xs">
                  <button
                    type="button"
                    onClick={() => handleDateStep(-1)}
                    title="Previous Day"
                    className="flex items-center justify-center w-7 h-7 border-r border-[#E5E7EB] text-[#424752] hover:bg-[#F2F4F6] transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center justify-center h-7 px-3 text-xs font-semibold text-[#374151] hover:bg-[#F2F4F6] transition-colors gap-1.5"
                      >
                        <CalendarIcon className="w-3.5 h-3.5 text-[#00488D]" />
                        <span>{dateLabel}</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-[#E5E7EB] shadow-xl" align="center">
                      <CalendarPicker
                        selected={selectedDate}
                        hideThemePicker
                        onSelect={(date) => {
                          if (date instanceof Date) {
                            handleDateSelect(date);
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>

                  <button
                    type="button"
                    onClick={() => handleDateStep(1)}
                    title="Next Day"
                    className="flex items-center justify-center w-7 h-7 border-l border-[#E5E7EB] text-[#424752] hover:bg-[#F2F4F6] transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Multi-Doctor Filter */}
                <FilterPopover
                  title="Filter Doctors"
                  fields={doctorFilterFields}
                  values={filterValues}
                  onChange={handleFilterChange}
                  onApply={handleApplyFilter}
                  onClear={handleClearFilter}
                  open={isFilterOpen}
                  onOpenChange={setIsFilterOpen}
                />

                <RefreshButton
                  onClick={() => setDataVersion((v) => v + 1)}
                  isLoading={isLoadingAppointments || isLoadingDoctors || isLoadingSchedules}
                />
              </div>
            </div>

            {/* ==================== SCHEDULE GRID ==================== */}
            <div className="p-4 flex-1">
              <section
                aria-label="Doctor appointment schedule 24-hour grid"
                ref={gridContainerRef}
                className="w-full max-h-[750px] overflow-auto rounded-lg border border-[#E2E8F0] bg-white shadow-2xs relative"
              >
                {isLoadingAppointments || isLoadingDoctors ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-24 text-sm text-gray-500">
                    <Loader2 size={28} className="animate-spin text-clinical-blue" />
                    <span>Loading doctors and daily appointments...</span>
                  </div>
                ) : doctorsFailed ? (
                  <div className="flex items-center justify-center py-24 text-sm text-gray-500">
                    Couldn't load doctors. Please refresh to try again.
                  </div>
                ) : appointmentsFailed ? (
                  <div className="flex items-center justify-center py-24 text-sm text-gray-500">
                    Couldn't load appointments. Please refresh to try again.
                  </div>
                ) : visibleDoctorColumns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-sm text-gray-500 gap-3">
                    <User className="h-8 w-8 text-gray-300" />
                    <span>No doctors match your search or filter criteria.</span>
                    {showOnDutyOnly && (
                      <button
                        type="button"
                        onClick={() => setShowOnDutyOnly(false)}
                        className="text-xs text-clinical-blue font-semibold hover:underline"
                      >
                        Show all doctors
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    role="table"
                    className="min-w-full"
                    style={{
                      width: `${80 + visibleDoctorColumns.length * 240}px`,
                    }}
                  >
                    {/* Header Row */}
                    <div className="sticky top-0 z-30 border-b border-[#E2E8F0] bg-white shadow-2xs">
                      <div
                        role="row"
                        className="grid"
                        style={{
                          gridTemplateColumns: `80px repeat(${visibleDoctorColumns.length}, minmax(230px, 1fr))`,
                        }}
                      >
                        {/* Corner Timeline Header */}
                        <div
                          role="columnheader"
                          className="sticky left-0 z-40 flex flex-col items-center justify-center border-r border-[#E2E8F0] bg-[#F8FAFC] px-2 py-3"
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Time</span>
                          <span className="text-[11px] font-bold text-gray-700">24 Hours</span>
                        </div>

                        {/* Doctor Column Headers (Full Names Visible) */}
                        {visibleDoctorColumns.map((doc, idx) => {
                          const docApptCount = dayAppointments.filter(
                            (a) => a.employees?.employee_id === doc.employeeId && !NON_BLOCKING_STATUSES.has(a.status || ""),
                          ).length;

                          return (
                            <div
                              key={doc.employeeId}
                              role="columnheader"
                              className={cn(
                                "flex flex-col justify-between p-3 bg-white transition-colors min-h-[76px]",
                                idx !== visibleDoctorColumns.length - 1 && "border-r border-[#E2E8F0]",
                              )}
                            >
                              <div className="flex items-start gap-2.5 w-full">
                                <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-clinical-blue/10 text-xs font-bold text-clinical-blue shadow-2xs">
                                  {doc.initials}
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                  <h3
                                    className="text-[13px] font-bold text-gray-900 leading-snug break-words whitespace-normal"
                                    title={doc.name}
                                  >
                                    {doc.name}
                                  </h3>
                                  <p
                                    className="text-[10px] font-semibold text-clinical-blue uppercase tracking-wider mt-0.5 truncate"
                                    title={doc.spec}
                                  >
                                    {doc.spec}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-2 flex items-center justify-between text-[10px] pt-1.5 border-t border-gray-100">
                                <span
                                  className={cn(
                                    "font-semibold px-2 py-0.5 rounded-full text-[9px]",
                                    doc.isOnDutyToday
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                      : "bg-gray-100 text-gray-500",
                                  )}
                                >
                                  {doc.shiftLabel}
                                </span>
                                <span className="font-bold text-gray-600 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200/60">
                                  {docApptCount} {docApptCount === 1 ? "Appt" : "Appts"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 24-Hour Time Rows */}
                    {scheduleRows.map((row) => (
                      <div
                        key={row.hour}
                        ref={row.isCurrentHour ? currentHourRowRef : undefined}
                        style={{ contentVisibility: "auto", containIntrinsicSize: "0 68px" }}
                        className={cn(
                          "relative border-b border-[#E2E8F0] transition-colors",
                          row.isOffHours ? "bg-[#FAFBFD]" : "bg-white",
                        )}
                      >
                        {/* Live Current Time Red Line */}
                        {row.isCurrentHour && row.currentMinuteOffset !== undefined && (
                          <div
                            className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                            style={{ top: `${row.currentMinuteOffset}%` }}
                          >
                            <div className="h-2.5 w-2.5 rounded-full bg-red-500 -ml-1 flex-none shadow-xs" />
                            <div className="h-[2px] w-full bg-red-500 shadow-xs" />
                            <span className="absolute left-20 -top-2.5 rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs">
                              NOW
                            </span>
                          </div>
                        )}

                        <div
                          role="row"
                          className="grid min-h-[68px]"
                          style={{
                            gridTemplateColumns: `80px repeat(${visibleDoctorColumns.length}, minmax(230px, 1fr))`,
                          }}
                        >
                          {/* Left Hour Label */}
                          <div
                            role="rowheader"
                            className={cn(
                              "sticky left-0 z-10 flex flex-col items-center justify-center border-r border-[#E2E8F0] px-2 py-2 text-center select-none",
                              row.isCurrentHour ? "bg-red-50/50 text-red-600 font-bold" : "bg-[#F8FAFC] text-gray-500",
                            )}
                          >
                            <span className="text-[11px] font-semibold tracking-tight leading-tight">
                              {row.label.split(" ")[0]}
                            </span>
                            <span className="text-[9px] uppercase font-bold text-gray-400">
                              {row.label.split(" ")[1]}
                            </span>
                          </div>

                          {/* Doctor Hour Slot Cells */}
                          {row.perDoctor.map((cell, docIdx) => {
                            const doc = visibleDoctorColumns[docIdx];
                            const hasAppointments = cell.appointments.length > 0;

                            return (
                              <div
                                key={docIdx}
                                role="cell"
                                className={cn(
                                  "flex flex-col gap-1.5 p-2 justify-center",
                                  docIdx !== row.perDoctor.length - 1 && "border-r border-[#E2E8F0]",
                                )}
                              >
                                {/* 1. Render all booked appointments in this hour */}
                                {hasAppointments && (
                                  <div className="flex flex-col gap-1.5 w-full">
                                    {cell.appointments.map((appt) => (
                                      <BookedCard
                                        key={appt.appointment_id}
                                        record={appt}
                                        onClick={(record) => setInspectAppointment(record)}
                                      />
                                    ))}
                                  </div>
                                )}

                                {/* 2. Render "+ Add Appointment" button if doctor is on duty */}
                                {cell.isOnDuty ? (
                                  <AddSlotButton
                                    isPast={cell.isPast}
                                    onBook={() => handleBookAtHour(doc, cell.hour, cell.shiftSchedule)}
                                  />
                                ) : !hasAppointments ? (
                                  <OffDutySlot />
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </main>
      </div>

      {/* ==================== APPOINTMENT QUICK INSPECT DIALOG ==================== */}
      <Dialog open={Boolean(inspectAppointment)} onOpenChange={(open) => !open && setInspectAppointment(null)}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-xl border border-[#E2E8F0] shadow-2xl">
          {inspectAppointment && (
            <div>
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-clinical-blue to-clinical-blue-mid p-5 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                      Appointment Details
                    </span>
                    <h2 className="text-lg font-bold mt-0.5 break-words whitespace-normal">
                      {formatPatientFullName(inspectAppointment.patient_bio_data)}
                    </h2>
                    <p className="text-xs text-blue-100 flex items-center gap-1.5 mt-1">
                      <span>Token #{inspectAppointment.token_number || "—"}</span>
                      <span>•</span>
                      <span>{inspectAppointment.patient_visit_type || "Consultation"}</span>
                    </p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-xs px-2.5 py-1 rounded-full text-xs font-semibold text-white flex-none">
                    {inspectAppointment.status || "SCHEDULED"}
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-5 flex flex-col gap-4 text-xs">
                {/* Doctor & Dept Card */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-clinical-blue/10 text-clinical-blue flex-none">
                    <Stethoscope className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 break-words">
                      Dr. {inspectAppointment.employees?.first_name} {inspectAppointment.employees?.last_name}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {inspectAppointment.department_master?.department_name || inspectAppointment.employees?.specialization || "General"}
                    </p>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-100">
                    <Clock className="h-4 w-4 text-clinical-blue flex-none" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400">Scheduled Time</p>
                      <p className="font-semibold text-gray-800 truncate">
                        {formatTimeRange(inspectAppointment.appointment_time, inspectAppointment.duration_minutes).start}
                        {" – "}
                        {formatTimeRange(inspectAppointment.appointment_time, inspectAppointment.duration_minutes).end}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-100">
                    <CalendarIcon className="h-4 w-4 text-clinical-blue flex-none" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400">Date</p>
                      <p className="font-semibold text-gray-800">
                        {formatInBranchTimezone(new Date(inspectAppointment.appointment_date), "dd/MM/yyyy")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-100">
                    <User className="h-4 w-4 text-clinical-blue flex-none" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400">Patient ID</p>
                      <p className="font-semibold text-gray-800">
                        {inspectAppointment.patient_id || inspectAppointment.patient_bio_data?.patient_id || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-100">
                    <Phone className="h-4 w-4 text-clinical-blue flex-none" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400">Mobile</p>
                      <p className="font-semibold text-gray-800">
                        {inspectAppointment.patient_bio_data?.patient_primary_mobile || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Duration */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="text-gray-500 font-medium">Consultation Duration:</span>
                  <span className="font-bold text-gray-900">
                    {inspectAppointment.duration_minutes ? `${inspectAppointment.duration_minutes} minutes` : "30 minutes"}
                  </span>
                </div>

                {/* Reason for visit */}
                {inspectAppointment.reason_for_visit && (
                  <div className="p-3 rounded-lg bg-blue-50/40 border border-blue-100/60">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-clinical-blue">Reason for Visit</p>
                    <p className="mt-1 text-gray-700">{inspectAppointment.reason_for_visit}</p>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setInspectAppointment(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors"
                >
                  Close
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const id = inspectAppointment.appointment_id;
                      setInspectAppointment(null);
                      navigate(`/appointments/edit/${id}`);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 bg-white rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const id = inspectAppointment.appointment_id;
                      setInspectAppointment(null);
                      navigate(`/appointments/view/${id}`);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-clinical-blue text-white rounded-lg font-semibold hover:bg-clinical-blue-mid transition-colors shadow-xs"
                  >
                    <span>View Full Details</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentSchedule;
