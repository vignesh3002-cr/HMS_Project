import { useState, useEffect, useRef, useMemo, useDeferredValue, memo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  Check,
  Loader2,
  Calendar as CalendarIcon,
  Clock,
  User,
  Stethoscope,
  ExternalLink,
  CalendarDays,
  X,
  Phone,
} from "lucide-react";
import { format, addDays, subDays, startOfWeek, isSameDay } from "date-fns";
import {
  dayKeyOf,
  formatInBranchTimezone,
  getTodayInActiveTimezone,
  isTodayInActiveTimezone,
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
import { appointmentApi, type AppointmentRecord } from "@/api/appointment.api";
import { doctorScheduleApi, type ActiveScheduleRecord } from "@/api/doctorSchedule.api";
import {
  employeeApi,
  type EmployeeRecord,
  type EmployeeDetailResponse,
} from "@/api/employee.api";
import { FilterPopover, useFilterPanel, useScheduleFilters } from "@/components/Filter";
import { usePermission } from "@/context/PermissionContext";
import { useToast } from "@/hooks/use-toast";
import { RefreshButton } from "@/components/hms/RefreshButton";
import { StatusBadge } from "@/components/hms/StatusBadge";
import { cn } from "@/lib/utils";

/* ============================= Types ============================= */

interface DayScheduleData {
  date: Date;
  dateKey: string;
  isOff: boolean;
  shiftLabel?: string;
  startMinutes?: number;
  endMinutes?: number;
  consultationMinutes?: number;
  maxCapacity: number;
  bookedCount: number;
  progressPercent: number;
  appointments: AppointmentRecord[];
  color: "green" | "blue" | "amber" | "red" | "gray";
}

interface DoctorRow {
  employeeId: string;
  branchId: string;
  name: string;
  initials: string;
  department: string;
  days: DayScheduleData[];
  totalWeekPatients: number;
  workingDaysCount: number;
}

type ScheduleViewType = "list" | "day" | "week";

interface AppointmentScheduleProps {
  onViewChange?: (view: ScheduleViewType) => void;
  initialDate?: Date;
  onDateChange?: (date: Date) => void;
}

/* ============================= Helper Functions ============================= */

function utcDateKey(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

function getInitials(name: string): string {
  const clean = name.replace(/^Dr\.?\s*/i, "").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "DR";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function formatPatientFullName(bio?: AppointmentRecord["patient_bio_data"]): string {
  if (!bio) return "Unknown Patient";
  return [bio.patient_first_name, bio.patient_middle_name, bio.patient_last_name].filter(Boolean).join(" ");
}

const colorStyles = {
  green: {
    bg: "bg-emerald-50/50 hover:bg-emerald-50/80",
    border: "border-l-emerald-500",
    text: "text-emerald-700",
    fill: "bg-emerald-500",
    badge: "bg-emerald-100/70 text-emerald-800",
  },
  blue: {
    bg: "bg-blue-50/50 hover:bg-blue-50/80",
    border: "border-l-clinical-blue",
    text: "text-clinical-blue",
    fill: "bg-clinical-blue",
    badge: "bg-blue-100/70 text-blue-800",
  },
  amber: {
    bg: "bg-amber-50/50 hover:bg-amber-50/80",
    border: "border-l-amber-500",
    text: "text-amber-700",
    fill: "bg-amber-500",
    badge: "bg-amber-100/70 text-amber-800",
  },
  red: {
    bg: "bg-rose-50/50 hover:bg-rose-50/80",
    border: "border-l-rose-500",
    text: "text-rose-700",
    fill: "bg-rose-500",
    badge: "bg-rose-100/70 text-rose-800",
  },
  gray: {
    bg: "bg-[#FAFBFD]",
    border: "border-l-gray-300",
    text: "text-gray-400",
    fill: "bg-gray-300",
    badge: "bg-gray-100 text-gray-500",
  },
};

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

  const [viewType, setViewType] = useState<ScheduleViewType>("week");
  const [dataVersion, setDataVersion] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("ALL");

  // Selected cell modal for inspecting the day's appointments
  const [inspectDayData, setInspectDayData] = useState<{
    doctor: DoctorRow;
    day: DayScheduleData;
  } | null>(null);

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

  const handleWeekStep = (days: number) => {
    const next = addDays(selectedDate, days);
    setSelectedDate(next);
    onDateChange?.(next);
  };

  // Week Date Bounds Calculation
  const [anchorY, anchorM, anchorD] = dayKeyOf(selectedDate).split("-").map(Number);
  const weekAnchor = new Date(anchorY, anchorM - 1, anchorD);
  const weekStart = startOfWeek(weekAnchor, { weekStartsOn: 1 });
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekDateFrom = dayKeyOf(weekStart);
  const weekDateTo = dayKeyOf(addDays(weekStart, 6));

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

  /* ----------------- 1. Fetch Week Appointments (In-Memory Cached & Calendar Mode) ----------------- */
  const weekAppointmentsCacheRef = useRef<Map<string, AppointmentRecord[]>>(new Map());
  const [weekAppointments, setWeekAppointments] = useState<AppointmentRecord[]>([]);
  const [isLoadingWeek, setIsLoadingWeek] = useState(true);
  const [weekLoadFailed, setWeekLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = `${weekDateFrom}_${weekDateTo}`;

    // Instant switch if cached
    if (weekAppointmentsCacheRef.current.has(cacheKey)) {
      setWeekAppointments(weekAppointmentsCacheRef.current.get(cacheKey)!);
      setIsLoadingWeek(false);
    } else {
      setIsLoadingWeek(true);
    }
    setWeekLoadFailed(false);

    const loadWeekAppointments = async () => {
      try {
        const firstPage = await appointmentApi.getAll({
          dateFrom: weekDateFrom,
          dateTo: weekDateTo,
          page: 1,
          limit: 100,
          viewMode: "calendar",
        });
        const firstData = firstPage.data?.data;
        const totalPages = firstData?.totalPages ?? 1;

        let appointments = firstData?.appointments ?? [];

        if (totalPages > 1) {
          const remainingPages = Array.from({ length: totalPages - 1 }, (_, index) =>
            appointmentApi.getAll({
              dateFrom: weekDateFrom,
              dateTo: weekDateTo,
              page: index + 2,
              limit: 100,
              viewMode: "calendar",
            }),
          );
          const remainingResults = await Promise.all(remainingPages);
          appointments = [
            ...appointments,
            ...remainingResults.flatMap((res) => res.data?.data?.appointments ?? []),
          ];
        }

        if (!cancelled) {
          weekAppointmentsCacheRef.current.set(cacheKey, appointments);
          setWeekAppointments(appointments);
        }
      } catch (err) {
        console.error("[Week View] Error:", err);
        if (!cancelled && !weekAppointmentsCacheRef.current.has(cacheKey)) {
          setWeekAppointments([]);
          setWeekLoadFailed(true);
          toast({
            title: "Failed to load appointments",
            description: "Couldn't reach the appointments API.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setIsLoadingWeek(false);
      }
    };

    void loadWeekAppointments();
    return () => {
      cancelled = true;
    };
  }, [weekDateFrom, weekDateTo, toast, dataVersion]);

  /* ----------------- 2. Fetch Active Doctors ----------------- */
  const [allDoctors, setAllDoctors] = useState<
    { employeeId: string; branchId: string; name: string; department: string; initials: string }[]
  >([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);
  const [doctorsFailed, setDoctorsFailed] = useState(false);

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
          const activeDoctors = employees.filter((emp) => emp.emp_status === true);
          setAllDoctors(
            activeDoctors.map((emp) => {
              const name = `Dr. ${[emp.first_name, emp.middle_name, emp.last_name].filter(Boolean).join(" ")}`;
              return {
                employeeId: emp.employee_id,
                branchId: emp.branch_id,
                name,
                initials: getInitials(name),
                department: emp.department_master?.department_name || emp.specialization || "General",
              };
            }),
          );
        }
      } catch (err) {
        console.error("[Week View] Failed to load doctors:", err);
        if (!cancelled) {
          setAllDoctors([]);
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
  const [doctorSchedulesMap, setDoctorSchedulesMap] = useState<Record<string, ActiveScheduleRecord[]>>({});
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingSchedules(true);

    doctorScheduleApi
      .getAllActive()
      .then((res) => {
        if (cancelled) return;
        const list = res.data?.data ?? [];
        const map: Record<string, ActiveScheduleRecord[]> = {};
        list.forEach((item) => {
          if (!map[item.employee_id]) {
            map[item.employee_id] = [];
          }
          map[item.employee_id].push({
            schedule_id: item.schedule_id,
            employee_id: item.employee_id,
            branch_id: item.branch_id,
            day_of_week: item.day_of_week,
            shift_name: item.shift_name,
            start_time: item.start_time,
            end_time: item.end_time,
            consultation_minutes: item.consultation_minutes,
          });
        });
        setDoctorSchedulesMap(map);
      })
      .catch((err) => {
        console.error("[Week View] Failed to load active schedules:", err);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSchedules(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dataVersion]);

  /* ----------------- 4. Compute Doctor Weekly Grid & Capacity (O(1) Indexed) ----------------- */
  const NON_BLOCKING_STATUSES = useMemo(() => new Set(["CANCELLED", "NO_SHOW"]), []);

  // Pre-index appointments by `${docId}_${dateKey}` for instant O(1) cell lookup
  const appointmentsByDocAndDateKey = useMemo(() => {
    const map = new Map<string, AppointmentRecord[]>();
    for (const a of weekAppointments) {
      if (NON_BLOCKING_STATUSES.has(a.status || "")) continue;
      const docId = a.employees?.employee_id;
      if (!docId) continue;
      const dKey = utcDateKey(a.appointment_date);
      if (!dKey) continue;
      const key = `${docId}_${dKey}`;
      const list = map.get(key);
      if (list) {
        list.push(a);
      } else {
        map.set(key, [a]);
      }
    }
    return map;
  }, [weekAppointments, NON_BLOCKING_STATUSES]);

  const doctorRows: DoctorRow[] = useMemo(() => {
    return allDoctors.map((doc) => {
      const schedules = doctorSchedulesMap[doc.employeeId] ?? [];
      let totalWeekPatients = 0;
      let workingDaysCount = 0;

      const days: DayScheduleData[] = weekDays.map((dayDate) => {
        const dateKey = dayKeyOf(dayDate);
        const dayOfWeekStr = formatInBranchTimezone(dayDate, "EEEE").toUpperCase();

        const activeShifts = schedules.filter(
          (s) => (s.day_of_week ?? "").trim().toUpperCase() === dayOfWeekStr && s.start_time && s.end_time,
        );

        // Instant O(1) Map lookup
        const appointments = appointmentsByDocAndDateKey.get(`${doc.employeeId}_${dateKey}`) ?? [];
        const bookedCount = appointments.length;

        if (activeShifts.length === 0) {
          // If no scheduled shift, but appointments were booked (e.g. ad-hoc/emergency)
          if (bookedCount > 0) {
            totalWeekPatients += bookedCount;
            workingDaysCount += 1;
            return {
              date: dayDate,
              dateKey,
              isOff: false,
              shiftLabel: "Ad-hoc Shift",
              maxCapacity: Math.max(bookedCount, 1),
              bookedCount,
              progressPercent: 100,
              appointments,
              color: "amber",
            };
          }

          return {
            date: dayDate,
            dateKey,
            isOff: true,
            maxCapacity: 0,
            bookedCount: 0,
            progressPercent: 0,
            appointments: [],
            color: "gray",
          };
        }

        workingDaysCount += 1;
        totalWeekPatients += bookedCount;

        // Calculate true capacity from shift duration and consultation minutes
        let totalShiftMinutes = 0;
        let consultMinutes = 30;

        activeShifts.forEach((s) => {
          const startM = timeStringToMinutes(s.start_time);
          const endM = timeStringToMinutes(s.end_time);
          if (!isNaN(startM) && !isNaN(endM) && endM > startM) {
            totalShiftMinutes += endM - startM;
          }
          if (s.consultation_minutes && s.consultation_minutes > 0) {
            consultMinutes = s.consultation_minutes;
          }
        });

        const maxCapacity = Math.max(1, Math.floor(totalShiftMinutes / consultMinutes));
        const progressPercent = Math.min(100, Math.round((bookedCount / maxCapacity) * 100));

        // Format shift timing label
        const firstShift = activeShifts[0];
        const sM = timeStringToMinutes(firstShift.start_time);
        const eM = timeStringToMinutes(firstShift.end_time);
        const shiftLabel = `${formatMinutesToTime(sM)} - ${formatMinutesToTime(eM)}`;

        // Dynamic color based on capacity
        let color: DayScheduleData["color"] = "green";
        if (progressPercent >= 90) color = "red";
        else if (progressPercent >= 50) color = "blue";
        else if (bookedCount > 0) color = "green";
        else color = "blue"; // 0 booked but available

        return {
          date: dayDate,
          dateKey,
          isOff: false,
          shiftLabel,
          startMinutes: sM,
          endMinutes: eM,
          consultationMinutes: consultMinutes,
          maxCapacity,
          bookedCount,
          progressPercent,
          appointments,
          color,
        };
      });

      return {
        ...doc,
        days,
        totalWeekPatients,
        workingDaysCount,
      };
    });
  }, [allDoctors, doctorSchedulesMap, weekDays, appointmentsByDocAndDateKey]);

  /* ----------------- 5. Filters ----------------- */
  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    allDoctors.forEach((d) => {
      if (d.department) set.add(d.department);
    });
    return Array.from(set).sort();
  }, [allDoctors]);

  const { doctorFilterFields } = useScheduleFilters({
    doctors: doctorRows,
    idKey: "doctorNames",
    valueField: "name",
  });

  const selectedDoctorNames: string[] = Array.isArray(appliedValues.doctorNames) ? appliedValues.doctorNames : [];

  const visibleDoctors = useMemo(() => {
    const term = deferredSearchTerm.trim().toLowerCase();

    return doctorRows.filter((doctor) => {
      if (selectedDepartment !== "ALL" && doctor.department !== selectedDepartment) return false;
      if (term && !doctor.name.toLowerCase().includes(term) && !doctor.department.toLowerCase().includes(term)) {
        return false;
      }
      if (selectedDoctorNames.length > 0 && !selectedDoctorNames.includes(doctor.name)) return false;
      return true;
    });
  }, [doctorRows, deferredSearchTerm, selectedDepartment, selectedDoctorNames]);

  // View switch handler
  const handleViewSelect = (view: ScheduleViewType) => {
    setViewType(view);
    if (onViewChange) {
      onViewChange(view);
    } else {
      const dateStr = dayKeyOf(selectedDate);
      if (view === "day") navigate(`/appointments/day-view?date=${dateStr}`);
      else if (view === "list") navigate(`/appointments?date=${dateStr}`);
    }
  };

  const jumpToDayView = (date: Date) => {
    handleDateSelect(date);
    if (onViewChange) {
      onViewChange("day");
    }
    navigate(`/appointments/day-view?date=${dayKeyOf(date)}`);
  };

  const todayIso = getTodayInActiveTimezone();
  const isCurrentWeek = todayIso >= weekDateFrom && todayIso <= weekDateTo;
  const dateLabel = isCurrentWeek
    ? "This Week"
    : `${formatInBranchTimezone(weekStart, "dd MMM")} - ${formatInBranchTimezone(addDays(weekStart, 6), "dd MMM")}`;

  const totalAppointments = weekAppointments.length;

  const handleExport = async (exportFormat: string) => {
    if (exportFormat !== "csv") return;
    try {
      await downloadExportCsv("appointments", {
        from: weekDateFrom,
        to: weekDateTo,
      });
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
                  Week View
                </span>
              </h1>
              <p className="hms-subheading mt-1 flex items-center gap-2">
                <span>
                  {formatInBranchTimezone(weekStart, "MMM d")} – {formatInBranchTimezone(addDays(weekStart, 6), "MMM d, yyyy")}
                </span>
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
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col min-h-[550px] transition-all">
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
                    <span>{viewTypeOptions.find((opt) => opt.key === viewType)?.label ?? "Week View"}</span>
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
                            if (opt.key === "day") navigate(`/appointments/day-view?date=${dateStr}`);
                            else if (opt.key === "list") navigate(`/appointments?date=${dateStr}`);
                            else navigate(`/appointments/week-view?date=${dateStr}`);
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
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-[#F2F4F6] text-xs text-[#6B7280] placeholder:text-[#6B7280] outline-none w-[150px] sm:w-[200px] rounded-md transition-all duration-200 focus:rounded-none focus:w-[200px] sm:focus:w-[250px]"
                  />
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#424752]" />
                </div>

                {/* Week Navigation */}
                <div className="flex items-center rounded-lg border border-[#E5E7EB] bg-white shadow-2xs">
                  <button
                    type="button"
                    onClick={() => handleWeekStep(-7)}
                    title="Previous Week"
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
                    onClick={() => handleWeekStep(7)}
                    title="Next Week"
                    className="flex items-center justify-center w-7 h-7 border-l border-[#E5E7EB] text-[#424752] hover:bg-[#F2F4F6] transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Filter */}
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
                  isLoading={isLoadingWeek || isLoadingDoctors || isLoadingSchedules}
                />
              </div>
            </div>

            {/* ==================== WEEKLY SCHEDULE TABLE ==================== */}
            <div className="p-4 flex-1">
              <section
                aria-label="Doctor weekly appointment schedule grid"
                className="w-full overflow-x-auto rounded-lg border border-[#E2E8F0] bg-white shadow-2xs"
              >
                {isLoadingWeek || isLoadingDoctors ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-24 text-sm text-gray-500">
                    <Loader2 size={28} className="animate-spin text-clinical-blue" />
                    <span>Loading weekly schedules and appointments...</span>
                  </div>
                ) : weekLoadFailed ? (
                  <div className="flex items-center justify-center py-24 text-sm text-gray-500">
                    Couldn't load appointments. Check your connection and try again.
                  </div>
                ) : doctorsFailed ? (
                  <div className="flex items-center justify-center py-24 text-sm text-gray-500">
                    Couldn't load doctors. Check your connection and try again.
                  </div>
                ) : visibleDoctors.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-sm text-gray-500 gap-2">
                    <User className="h-8 w-8 text-gray-300" />
                    <span>No doctors match your search or filters.</span>
                  </div>
                ) : (
                  <table className="w-full min-w-[1100px] table-fixed border-collapse">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                        {/* Doctor Column */}
                        <th className="sticky left-0 z-20 w-[190px] border-r border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-left">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Doctor / Specialist</span>
                        </th>

                        {/* 7 Days of the Week */}
                        {weekDays.map((day) => {
                          const isTodayDate = isTodayInActiveTimezone(day);
                          return (
                            <th
                              key={day.toISOString()}
                              className={cn(
                                "border-r border-[#E2E8F0] px-3 py-2.5 text-center transition-colors",
                                isTodayDate && "bg-blue-50/60",
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => jumpToDayView(day)}
                                title="Click to view full Day Schedule for this date"
                                className="group inline-flex flex-col items-center justify-center"
                              >
                                <span className={cn(
                                  "text-[10px] font-bold uppercase tracking-wider",
                                  isTodayDate ? "text-clinical-blue" : "text-gray-400 group-hover:text-clinical-blue",
                                )}>
                                  {formatInBranchTimezone(day, "EEEE")}
                                </span>
                                <span className={cn(
                                  "text-[13px] font-bold mt-0.5 px-2 py-0.5 rounded-full transition-colors",
                                  isTodayDate ? "bg-clinical-blue text-white" : "text-gray-700 group-hover:bg-gray-100",
                                )}>
                                  {formatInBranchTimezone(day, "MMM d")}
                                </span>
                              </button>
                            </th>
                          );
                        })}

                        {/* Weekly Summary Column */}
                        <th className="w-[120px] px-3 py-3 text-center bg-[#F8FAFC]">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Weekly Total</span>
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#E2E8F0]">
                      {visibleDoctors.map((doctor) => (
                        <tr
                          key={doctor.employeeId}
                          style={{ contentVisibility: "auto", containIntrinsicSize: "0 82px" }}
                          className="hover:bg-gray-50/30 transition-colors"
                        >
                          {/* Doctor Info Sticky Header */}
                          <td className="sticky left-0 z-10 w-[190px] border-r border-[#E2E8F0] bg-white px-3.5 py-3 align-middle">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-clinical-blue/10 text-xs font-bold text-clinical-blue">
                                {doctor.initials}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <h3 className="truncate text-[12px] font-bold text-gray-900" title={doctor.name}>
                                  {doctor.name}
                                </h3>
                                <p className="truncate text-[10px] font-medium text-gray-500 uppercase tracking-wide" title={doctor.department}>
                                  {doctor.department}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Days Cells */}
                          {doctor.days.map((dayItem, dayIdx) => {
                            if (dayItem.isOff) {
                              return (
                                <td key={dayIdx} className="border-r border-[#E2E8F0] p-2 align-middle text-center">
                                  <div className="flex h-[56px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/40">
                                    <span className="text-[10px] font-bold tracking-wider text-gray-400">OFF</span>
                                  </div>
                                </td>
                              );
                            }

                            if (dayItem.bookedCount === 0) {
                              return (
                                <td key={dayIdx} className="border-r border-[#E2E8F0] p-2 align-middle">
                                  <button
                                    type="button"
                                    onClick={() => setInspectDayData({ doctor, day: dayItem })}
                                    className="group flex h-[56px] w-full flex-col justify-between rounded-lg border border-dashed border-clinical-blue/40 bg-clinical-blue/[0.02] p-2 text-left transition-all hover:border-clinical-blue hover:bg-clinical-blue/10"
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span className="text-[10px] font-bold text-clinical-blue">
                                        Open ({dayItem.maxCapacity} slots)
                                      </span>
                                      <Plus className="h-3.5 w-3.5 text-clinical-blue opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <span className="text-[9px] text-gray-400 truncate">
                                      {dayItem.shiftLabel}
                                    </span>
                                  </button>
                                </td>
                              );
                            }

                            const style = colorStyles[dayItem.color];

                            return (
                              <td key={dayIdx} className="border-r border-[#E2E8F0] p-2 align-middle">
                                <button
                                  type="button"
                                  onClick={() => setInspectDayData({ doctor, day: dayItem })}
                                  title={`Click to view ${dayItem.bookedCount} appointments`}
                                  className={cn(
                                    "group flex h-[56px] w-full flex-col justify-between rounded-lg border border-l-[3.5px] p-2 text-left shadow-2xs transition-all hover:scale-[1.01] hover:shadow-sm",
                                    style.bg,
                                    style.border,
                                  )}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span className={cn("text-[11px] font-bold leading-tight", style.text)}>
                                      {dayItem.bookedCount} Patients
                                    </span>
                                    <span className={cn("text-[9px] font-bold px-1.5 py-0.2 rounded-full", style.badge)}>
                                      {dayItem.progressPercent}%
                                    </span>
                                  </div>

                                  <div className="flex flex-col gap-1 w-full">
                                    <div className="relative block h-1 w-full overflow-hidden rounded-full bg-gray-200/70">
                                      <div
                                        className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-300", style.fill)}
                                        style={{ width: `${dayItem.progressPercent}%` }}
                                      />
                                    </div>
                                    <span className="text-[9px] text-gray-500 truncate leading-none">
                                      {dayItem.bookedCount}/{dayItem.maxCapacity} booked
                                    </span>
                                  </div>
                                </button>
                              </td>
                            );
                          })}

                          {/* Doctor Weekly Summary */}
                          <td className="px-3 py-3 align-middle text-center bg-gray-50/30">
                            <div className="flex flex-col items-center justify-center">
                              <span className="text-sm font-bold text-gray-900">
                                {doctor.totalWeekPatients}
                              </span>
                              <span className="text-[10px] text-gray-400 font-medium">
                                in {doctor.workingDaysCount} shifts
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            </div>
          </div>
        </main>
      </div>

      {/* ==================== DAY APPOINTMENTS INSPECTOR DIALOG ==================== */}
      <Dialog open={Boolean(inspectDayData)} onOpenChange={(open) => !open && setInspectDayData(null)}>
        <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden rounded-xl border border-[#E2E8F0] shadow-2xl">
          {inspectDayData && (
            <div>
              {/* Header */}
              <div className="bg-gradient-to-r from-clinical-blue to-clinical-blue-mid p-5 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                      Doctor Daily Schedule
                    </span>
                    <h2 className="text-lg font-bold mt-0.5">{inspectDayData.doctor.name}</h2>
                    <p className="text-xs text-blue-100 flex items-center gap-1.5 mt-1">
                      <span>{inspectDayData.doctor.department}</span>
                      <span>•</span>
                      <span>{formatInBranchTimezone(inspectDayData.day.date, "EEEE, MMMM d, yyyy")}</span>
                    </p>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="bg-white/10 backdrop-blur-xs px-2.5 py-1 rounded-full text-xs font-semibold text-white">
                      {inspectDayData.day.bookedCount} / {inspectDayData.day.maxCapacity} Booked
                    </span>
                    {inspectDayData.day.shiftLabel && (
                      <span className="text-[10px] text-blue-200 mt-1">{inspectDayData.day.shiftLabel}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Body: List of Appointments */}
              <div className="p-5 flex flex-col gap-3 max-h-[380px] overflow-y-auto">
                {inspectDayData.day.appointments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center gap-2 text-gray-400">
                    <CalendarDays className="h-8 w-8 text-gray-300" />
                    <p className="text-xs">No appointments booked for this shift yet.</p>
                    <p className="text-[11px] text-gray-400">
                      {inspectDayData.day.maxCapacity} consultation slots are available for booking.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col divide-y divide-gray-100">
                    {inspectDayData.day.appointments.map((appt) => (
                      <div
                        key={appt.appointment_id}
                        className="py-2.5 flex items-center justify-between gap-3 hover:bg-gray-50 px-2 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-clinical-blue">
                            {appt.token_number || "•"}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-xs text-gray-900 truncate">
                              {formatPatientFullName(appt.patient_bio_data)}
                            </span>
                            <span className="text-[10px] text-gray-500 flex items-center gap-1.5">
                              <span>{appt.appointment_time?.slice(0, 5) || "—"}</span>
                              <span>•</span>
                              <span>{appt.patient_visit_type || "Consultation"}</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-none">
                          <StatusBadge status={appt.status || "SCHEDULED"} />
                          <button
                            type="button"
                            onClick={() => {
                              const id = appt.appointment_id;
                              setInspectDayData(null);
                              navigate(`/appointments/view/${id}`);
                            }}
                            title="View appointment details"
                            className="p-1 rounded text-gray-400 hover:text-clinical-blue hover:bg-gray-100 transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setInspectDayData(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Close
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const d = inspectDayData.day.date;
                      setInspectDayData(null);
                      jumpToDayView(d);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 bg-white rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <CalendarDays className="h-3.5 w-3.5 text-clinical-blue" />
                    <span>Open in Day View</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const docId = inspectDayData.doctor.employeeId;
                      const branchId = inspectDayData.doctor.branchId;
                      const dStr = inspectDayData.day.dateKey;
                      setInspectDayData(null);
                      navigate("/appointments/add", {
                        state: {
                          slot: {
                            doctorId: docId,
                            branchId,
                            date: dStr,
                          },
                        },
                      });
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-clinical-blue text-white rounded-lg text-xs font-semibold hover:bg-clinical-blue-mid transition-colors shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Book Appointment</span>
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
