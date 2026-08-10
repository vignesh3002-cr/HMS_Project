import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Loader2 } from "lucide-react";
import { format, isToday, isTomorrow, isYesterday, addDays, subDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import CalendarPicker from "@/components/hms/Calender";
import ExportReport from "@/components/ui/ExportReport";
import { useToast } from "@/hooks/use-toast";
import { appointmentApi, type AppointmentRecord } from "@/api/appointment.api";
import { employeeApi, type EmployeeRecord, type DoctorScheduleRecord } from "@/api/employee.api";
import { branchApi } from "@/api/branch.api";
import { FilterPopover, useFilterPanel } from "@/components/Filter";
import type { FilterField } from "@/components/Filter/types";

/* ============================= Types ============================= */

interface DayDoctorColumn {
  employeeId: string;
  branchId: string;
  departmentId: string;
  name: string;
  spec: string;
}

interface AppointmentSlot {
  count: number;
  label: string;
  fill: number;
  dark: boolean;
  // Present only on an open ("New slot available") cell -- carries what
  // AddAppointment needs to open pre-filled with just the patient left to pick.
  booking?: {
    doctorId: string;
    branchId: string;
    departmentId: string;
    date: string;
    time: string;
  };
}

interface ScheduleRow {
  time: string;
  slots: (AppointmentSlot | null)[];
}

type ScheduleViewType = "list" | "day" | "week";

interface AppointmentScheduleProps {
  onViewChange?: (view: ScheduleViewType) => void;
}

/* ============================= Icons ============================= */

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M3 6h18M6 12h12M10 18h4" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M8 1v10M3 6h10" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <circle cx={11} cy={11} r={7} />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function DotIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <path d="M5 1v8M1 5h8" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

/* ============================= Data ============================= */

// Hourly rows shown in the grid, covering the full 24-hour day (12:00 AM -
// 11:00 PM). Real appointment counts per doctor/hour are computed from the
// appointments API response in the scheduleRows useMemo below.
const TIME_ROW_HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const TIME_ROW_LABELS = TIME_ROW_HOURS.map((hour) => {
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${String(h12).padStart(2, "0")}:00 ${period}`;
});

function slot(
  count: number,
  label: string,
  fill: number,
  dark = false,
  booking?: AppointmentSlot["booking"],
): AppointmentSlot {
  return { count, label, fill, dark, booking };
}

const EMPTY = null;

// doctor_schedule start_time/end_time come back as ISO timestamps on the
// epoch date (e.g. "1970-01-01T10:30:00.000Z") -- only the UTC hour/minute
// digits carry the actual shift boundary.
function timeStringToMinutes(time: string): number {
  const d = new Date(time);
  return isNaN(d.getTime()) ? NaN : d.getUTCHours() * 60 + d.getUTCMinutes();
}

/* ============================= Sub-components ============================= */

function EmptySlot({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[52px] w-full items-center justify-center rounded border border-dashed border-[#c3c6d7] transition-colors hover:border-[#00488D] hover:bg-[#F7F9FB]"
    >
      <DotIcon className="h-[10px] w-[10px] text-[#c3c6d7]" />
    </button>
  );
}


function AppointmentCard({ cell }: { cell: AppointmentSlot }) {
  const navigate = useNavigate();

  if (cell.count === 0) {
    return (
      <button
        type="button"
        onClick={() => cell.booking && navigate("/appointments/add", { state: { slot: cell.booking } })}
        className="flex h-[52px] w-full items-center justify-center rounded-[2px] border-l-2 border-l-[#004ac6] bg-[rgba(0,74,198,0.05)] p-1 text-center opacity-50 transition-opacity hover:opacity-80"
      >
        <span className="font-['Manrope',sans-serif] text-[9px] font-bold leading-[13px] text-[#004ac6]">
          New slot available
        </span>
      </button>
    );
  }

  const variant = cell.fill >= 100 ? "orange" : cell.dark ? "green-dark" : "green";

  const cardClass =
    variant === "orange"
      ? "bg-[#fff7ed] border-l-[#fb923c]"
      : variant === "green-dark"
        ? "bg-[rgba(0,125,85,0.1)] border-l-[#006242]"
        : "bg-[rgba(0,125,85,0.05)] border-l-[#006242]";

  const labelClass = variant === "orange" ? "text-[#c2410c]" : "text-[#006242]";

  return (
    <button
      type="button"
      className={`flex h-[52px] w-full flex-col justify-between rounded-[2px] border-l-2 p-1 pl-1.5 text-left ${cardClass}`}
    >
      <span className={`font-['Manrope',sans-serif] text-[10px] font-bold leading-[15px] ${labelClass}`}>
        {cell.label}
      </span>
      <span className="relative block h-1 w-full overflow-hidden rounded-xl bg-[#e0e3e5]">
        {variant === "orange" ? (
          <span className="block h-full w-full rounded-xl bg-[#fb923c]" />
        ) : (
          <span className="absolute inset-0 rounded-xl bg-[#006242]" style={{ width: `${cell.fill}%` }} />
        )}
      </span>
    </button>
  );
}

const AVATAR_PALETTE = [
  { initials: "rgba(10, 92, 58, 0.7)" },
  { initials: "#f87171" },
  { initials: "#4a8fe8" },
  { initials: "#a78bfa" },
  { initials: "rgba(255, 107, 53, 0.7)" },
];

function getInitials(name: string): string {
  const words = name.replace(/^Dr\.?\s*/i, "").trim().split(/\s+/);
  return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

function mapEmployeeToDayColumn(emp: EmployeeRecord): DayDoctorColumn {
  return {
    employeeId: emp.employee_id,
    branchId: emp.branch_id,
    departmentId: emp.department_id,
    name: `Dr. ${[emp.first_name, emp.middle_name, emp.last_name].filter(Boolean).join(" ")}`,
    spec: emp.department_master?.department_name || emp.specialization || "General",
  };
}

/* ============================= Main component ============================= */

const AppointmentSchedule = ({ onViewChange }: AppointmentScheduleProps = {}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [toolbarSearchTerm, setToolbarSearchTerm] = useState("");
  const [selectedDoctorName, setSelectedDoctorName] = useState<string | null>(null);
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement>(null);

  // Multi-doctor filter -- same FilterPopover used on the other pages.
  // Selecting doctors here narrows the grid down to exactly those doctors,
  // same as the toolbar search.
  const {
    values: filterValues,
    appliedValues,
    isOpen: isFilterOpen,
    setIsOpen: setIsFilterOpen,
    handleChange: handleFilterChange,
    handleApply: handleApplyFilter,
    handleClear: handleClearFilter,
  } = useFilterPanel();

  // Real appointments for the selected date, fetched from GET /appointments
  // -- the doctor columns and hourly slot counts below are both derived from
  // this instead of dummy data.
  const [dayAppointments, setDayAppointments] = useState<AppointmentRecord[]>([]);
  const [isLoadingDay, setIsLoadingDay] = useState(true);

  useEffect(() => {
    setIsLoadingDay(true);
    appointmentApi
      .getAll({ date: format(selectedDate, "yyyy-MM-dd") })
      .then((res) => {
        setDayAppointments(res.data?.data?.appointments || []);
      })
      .catch((err) => {
        console.error("[Day View] Error:", err);
        setDayAppointments([]);
        toast({
          title: "Failed to load appointments",
          description: "Couldn't reach the appointments API.",
          variant: "destructive",
        });
      })
      .finally(() => setIsLoadingDay(false));
  }, [selectedDate]);

  // All doctors (not just ones with an appointment today), so every doctor
  // gets a column and their real schedule decides which empty hours are
  // actually open.
  const [doctorColumns, setDoctorColumns] = useState<DayDoctorColumn[]>([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);

  // Active branch ids -- GET /branches only ever returns branch_status:
  // "Active" rows, so this doubles as an allowlist. A doctor_schedule row can
  // outlive its branch being deactivated; getAvailableSlots rejects any
  // inactive branch outright, so a schedule pointing at one must not be
  // offered as "New slot available".
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
    employeeApi
      .getAll({ limit: 1000 })
      .then((res) => {
        const employees = res.data?.data?.employees || [];
        // Inactive doctors can still have leftover active doctor_schedule rows
        // (deactivation doesn't retire their schedule) -- getAvailableSlots
        // rejects any inactive doctor outright, so a column for one would
        // only ever offer slots that can never actually be booked.
        const doctors = employees.filter(
          (e) => e.user_table?.role_type === "DOCTOR" && e.emp_status !== false,
        );
        setDoctorColumns(doctors.map(mapEmployeeToDayColumn));
      })
      .catch((err) => {
        console.error("[Day View] Failed to load doctors:", err);
        setDoctorColumns([]);
      })
      .finally(() => setIsLoadingDoctors(false));
  }, []);

  // GET /employees/:id returns each doctor's real doctor_schedule rows --
  // day_of_week decides which doctors get a column on the selected date,
  // and the start_time/end_time on each active shift is what drives which
  // hourly cells show "New slot available" below (varies per doctor, per
  // shift, not a fixed hour range). Deliberately NOT using
  // GET /appointments/available-slots here -- that endpoint hides any time
  // already past on today's date, which under-reports a doctor's full
  // shift; every scheduled, unbooked hour should show as available.
  const [doctorScheduleDays, setDoctorScheduleDays] = useState<Record<string, string[]>>({});
  const [doctorSchedulesByEmployee, setDoctorSchedulesByEmployee] = useState<Record<string, DoctorScheduleRecord[]>>({});
  // Which branches each doctor actually has an active user_branch_mapping to --
  // GET /appointments/available-slots 400s with "Doctor is not assigned to the
  // selected branch" for any branch outside this list, so a schedule row whose
  // branch isn't in here can never produce a real booking and must not be
  // offered as "New slot available".
  const [doctorMappedBranches, setDoctorMappedBranches] = useState<Record<string, Set<string>>>({});
  const [isLoadingScheduleDays, setIsLoadingScheduleDays] = useState(true);

  useEffect(() => {
    if (doctorColumns.length === 0) {
      setDoctorScheduleDays({});
      setDoctorSchedulesByEmployee({});
      setDoctorMappedBranches({});
      setIsLoadingScheduleDays(false);
      return;
    }

    setIsLoadingScheduleDays(true);

    Promise.all(
      doctorColumns.map((doc) =>
        employeeApi
          .getOne(doc.employeeId)
          .then((res) => {
            const activeSchedules = (res.data?.data?.doctorSchedules ?? []).filter((s) => s.is_active && s.day_of_week);
            const days = activeSchedules.map((s) => s.day_of_week as string);
            const mappedBranches = new Set((res.data?.data?.branches ?? []).map((b) => b.branch_id));
            return { employeeId: doc.employeeId, days, schedules: activeSchedules, mappedBranches };
          })
          .catch(() => ({
            employeeId: doc.employeeId,
            days: [] as string[],
            schedules: [] as DoctorScheduleRecord[],
            mappedBranches: new Set<string>(),
          })),
      ),
    )
      .then((entries) => {
        setDoctorScheduleDays(Object.fromEntries(entries.map((e) => [e.employeeId, e.days])));
        setDoctorSchedulesByEmployee(Object.fromEntries(entries.map((e) => [e.employeeId, e.schedules])));
        setDoctorMappedBranches(Object.fromEntries(entries.map((e) => [e.employeeId, e.mappedBranches])));
      })
      .finally(() => setIsLoadingScheduleDays(false));
  }, [doctorColumns]);

  // Doctor filter options, built from the real doctor list -- lets the
  // toolbar Filter popover pick any number of specific doctors.
  const doctorFilterFields: FilterField[] = useMemo(() => [
    {
      id: "doctorIds",
      label: "Doctor",
      type: "multiselect",
      options: doctorColumns.map((doc) => ({ label: doc.name, value: doc.employeeId })),
    },
  ], [doctorColumns]);

  // Only doctors matching the toolbar search, the picked doctor (if any),
  // the multi-select Filter popover, and -- once schedule data has loaded --
  // an active doctor_schedule row for the selected date's day of week get a
  // column at all. e.g. selecting a Monday only shows doctors who actually
  // work Mondays, instead of every doctor with an all-empty column.
  const selectedDayOfWeek = format(selectedDate, "EEEE").toUpperCase();
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");

  const visibleDoctorColumns = useMemo(() => {
    const term = toolbarSearchTerm.trim().toLowerCase();
    const selectedIds: string[] = Array.isArray(appliedValues.doctorIds) ? appliedValues.doctorIds : [];

    return doctorColumns.filter((doc) => {
      const gridName = doc.name.toLowerCase();

      if (term && !gridName.includes(term)) return false;

      if (selectedDoctorName) {
        const pickedName = selectedDoctorName.toLowerCase();
        const matches = pickedName.includes(gridName) || gridName.includes(pickedName);
        if (!matches) return false;
      }

      if (selectedIds.length > 0 && !selectedIds.includes(doc.employeeId)) return false;

      if (!isLoadingScheduleDays) {
        const days = doctorScheduleDays[doc.employeeId] ?? [];
        if (!days.includes(selectedDayOfWeek)) return false;
      }

      return true;
    });
  }, [
    doctorColumns,
    toolbarSearchTerm,
    selectedDoctorName,
    appliedValues,
    doctorScheduleDays,
    isLoadingScheduleDays,
    selectedDayOfWeek,
  ]);

  const scheduleRows: ScheduleRow[] = useMemo(() => {
    return TIME_ROW_HOURS.map((hour, idx) => ({
      time: TIME_ROW_LABELS[idx],
      slots: visibleDoctorColumns.map((doc) => {
        const count = dayAppointments.filter((appt) => {
          if (appt.employees?.employee_id !== doc.employeeId) return false;
          const t = new Date(appt.appointment_time);
          return !isNaN(t.getTime()) && t.getUTCHours() === hour;
        }).length;

        if (count > 0) {
          const fill = count >= 3 ? 100 : count === 2 ? 66 : 33;
          return slot(count, `${count} Patient${count > 1 ? "s" : ""}`, fill, false);
        }

        // Overlap check in minutes, not whole hours -- a shift ending at
        // 19:30 still has a bookable slot inside the 19:00-20:00 grid row,
        // so comparing only rounded-down hours was dropping that last
        // partial-hour row (and any partial-hour start) from every shift.
        // Both ends use a strict `<`/`>` -- a shift ending exactly on the
        // hour (e.g. 17:00) has zero overlap with that hour's row (17:00-
        // 18:00), so that row must NOT show as available; using `<=` here
        // previously marked it available anyway, offering a "5:00 PM" slot
        // the doctor's actual shift (and consultation-length generateTimeSlots
        // on the backend) never produced -- the real last bookable start was
        // 16:40 (last 20-min slot fitting before 17:00), so clicking the
        // 5:00 PM cell always landed on a nonexistent slot.
        const hourStart = hour * 60;
        const hourEnd = hourStart + 60;
        const mappedBranches = doctorMappedBranches[doc.employeeId];
        const matchedSchedule = (doctorSchedulesByEmployee[doc.employeeId] ?? []).find((s) => {
          // Trim/uppercase before comparing -- some doctor_schedule rows have
          // stray whitespace in day_of_week (e.g. " WEDNESDAY"), which still
          // reads as the right day to a human but fails the backend's exact
          // string match, silently zeroing out getAvailableSlots for that row.
          if ((s.day_of_week ?? "").trim().toUpperCase() !== selectedDayOfWeek || !s.start_time || !s.end_time) {
            return false;
          }
          // A schedule whose branch this doctor isn't actively mapped to, or
          // whose branch has been deactivated, can never actually be booked
          // -- getAvailableSlots rejects both -- so don't offer it as
          // "New slot available" in the first place.
          if (mappedBranches && s.branch_id && !mappedBranches.has(s.branch_id)) return false;
          if (activeBranchIds && s.branch_id && !activeBranchIds.has(s.branch_id)) return false;
          const startMinutes = timeStringToMinutes(s.start_time);
          const endMinutes = timeStringToMinutes(s.end_time);
          return !isNaN(startMinutes) && !isNaN(endMinutes) && hourStart < endMinutes && hourEnd > startMinutes;
        });

        if (!matchedSchedule) return EMPTY;

        return slot(0, "New slot available", 0, false, {
          doctorId: doc.employeeId,
          branchId: matchedSchedule.branch_id || doc.branchId,
          departmentId: doc.departmentId,
          date: selectedDateStr,
          time: `${String(hour).padStart(2, "0")}:00`,
        });
      }),
    }));
  }, [visibleDoctorColumns, dayAppointments, doctorSchedulesByEmployee, doctorMappedBranches, selectedDayOfWeek, selectedDateStr]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) {
        setIsViewMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const viewOptions: { key: ScheduleViewType; label: string }[] = [
     { key: "day", label: "Day View" },
     { key: "list", label: "List View" },
    { key: "week", label: "Week View" },
  ];

  const handleViewSelect = (view: ScheduleViewType) => {
    setIsViewMenuOpen(false);
    if (view === "week") {
      navigate("/appointments/week-view");
    } else if (view === "list") {
      if (onViewChange) {
        onViewChange(view);
      } else {
        navigate("/appointments");
      }
    } else {
      onViewChange?.(view);
    }
  };

  const dateLabel = isToday(selectedDate)
    ? "Today"
    : isYesterday(selectedDate)
      ? "Yesterday"
      : isTomorrow(selectedDate)
        ? "Tomorrow"
        : format(selectedDate, "dd/MM/yyyy");

  const totalAppointments = dayAppointments.length;

  return (
    <div className="flex w-full font-[Manrope,sans-serif] bg-[#F7F9FB] min-h-screen">
      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex flex-col gap-6">

          {/* ==================== HEADER ==================== */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">

            <div>
              <h1 className="hms-heading">
                Appointment Schedule
              </h1>

              <p className="hms-subheading mt-1">
                Total Appointments: {totalAppointments}
              </p>

            </div>


            <div className="flex items-center gap-3">
              <ExportReport />



              <button
                className="flex items-center gap-2 px-4 py-2 bg-[#004785] rounded-lg text-white text-xs font-semibold shadow-sm hover:bg-[#003a6b] transition-colors"
              >

                <Plus className="w-4 h-4" />
                Add Appointment

              </button>


            </div>


          </div>

          {/* ==================== MAIN CARD ==================== */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col min-h-[500px] transition-all duration-300 hover:shadow-md">

          {/* Toolbar */}
          <div
            role="toolbar"
            aria-label="Schedule filters and actions"
            className="px-5 py-4 border-b border-[#E5E7EB] flex flex-nowrap items-center gap-2 md:gap-2.5"
          >


        {/* View Type - Day View */}
        <div className="relative flex flex-col items-start gap-1.5" ref={viewMenuRef}>

          <button
            type="button"
            onClick={() => setIsViewMenuOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-1.5 border border-[#e5e7eb] rounded-md text-xs font-semibold text-[#374151] hover:border-[#00488D] transition-colors"
          >

            <span>Day View</span>
            <ChevronDownIcon
              className={`w-3 h-3 flex-none text-[#6b7280] transition-transform duration-200 ${isViewMenuOpen ? "rotate-180" : ""}`}
            />
          </button>

          <div
            className={`absolute left-0 top-full mt-1 w-32 bg-white border border-[#e5e7eb] rounded-md shadow-lg overflow-hidden z-20 transition-all duration-150 ${
              isViewMenuOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
            }`}
          >
            {viewOptions.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => handleViewSelect(opt.key)}
                className={`flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-left transition-colors ${
                  opt.key === "day" ? "bg-[#D6E3FF] text-[#00488D]" : "text-[#374151] hover:bg-[#F2F4F6]"
                }`}
              >
                {opt.label}
                {opt.key === "day" && <CheckIcon className="w-3 h-3" />}
              </button>
            ))}
          </div>
        </div>

        {/* Search doctors */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search"
            value={toolbarSearchTerm}
            onChange={(e) => setToolbarSearchTerm(e.target.value)}
            aria-label="Search doctors in schedule"
            className="pl-8 pr-3 py-1.5 bg-[#F2F4F6] text-xs text-[#6B7280] placeholder:text-[#6B7280] outline-none w-[150px] sm:w-[200px] rounded-md transition-all duration-200 focus:w-[200px] sm:focus:w-[250px]"
          />
          <SearchIcon className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#424752]" />
        </div>

        {/* Filter doctors */}
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

        {/* Date navigation */}
        <div role="group" aria-label="Date navigation" className="flex items-center">
          <button
            type="button"
            aria-label="Previous day"
            onClick={() => setSelectedDate((prev) => subDays(prev, 1))}
            className="flex h-[34px] w-[25px] items-center justify-center rounded-l-lg border border-[#e5e7eb] bg-white"
          >
            <ChevronLeftIcon className="h-4 w-4 text-[#6b7280]" />
          </button>

          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="h-[34px] w-[90px] whitespace-nowrap border-y border-[#e5e7eb] bg-white px-[17px] py-[9px] text-center font-['Inter',sans-serif] text-[10px] font-medium leading-4 shadow-[0_1px_1px_rgba(0,0,0,0.05)]"
              >
                {dateLabel}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-[#e5e7eb] shadow-lg">
              <CalendarPicker
                selected={selectedDate}
                hideThemePicker
                onSelect={(date) => {
                  setSelectedDate(date);
                  setIsCalendarOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>

          <button
            type="button"
            aria-label="Next day"
            onClick={() => setSelectedDate((prev) => addDays(prev, 1))}
            className="flex h-[34px] w-[25px] items-center justify-center rounded-r-lg border border-[#e5e7eb] bg-white"
          >
            <ChevronRightIcon className="h-4 w-4 text-[#6b7280]" />
          </button>
        </div>
      </div>

          {/* Content */}
          <div className="p-5 flex flex-col items-start gap-[29px] lg:flex-row">
        {/* Schedule grid */}
        <section
          aria-label="Doctor appointment schedule grid"
          className="max-w-full overflow-x-auto rounded-xl border border-[#E5E7EB] bg-white shadow-sm"
        >
          {isLoadingDay || isLoadingDoctors || isLoadingScheduleDays ? (
            <div className="flex min-w-[400px] flex-col items-center justify-center gap-2 py-16 text-[#6B7280] text-sm">
              <Loader2 size={24} className="animate-spin text-[#00488D]" />
              Loading schedule...
            </div>
          ) : doctorColumns.length === 0 ? (
            <div className="flex min-w-[400px] items-center justify-center py-16 text-[#6B7280] text-sm">
              No doctors found.
            </div>
          ) : visibleDoctorColumns.length === 0 ? (
            <div className="flex min-w-[400px] items-center justify-center py-16 text-[#6B7280] text-sm">
              No doctors match your search or filters.
            </div>
          ) : (
          <div
            role="table"
            style={{ width: `${70 + visibleDoctorColumns.length * 90}px` }}
          >
            {/* Header row */}
            <div className="border-b border-[#c3c6d7] bg-white">
              <div
                role="row"
                className="grid min-h-[39px]"
                style={{ gridTemplateColumns: `70px repeat(${visibleDoctorColumns.length}, 90px)` }}
              >
                <div
                  role="columnheader"
                  className="sticky left-0 z-10 flex items-center justify-center border-r border-[#c3c6d7] bg-white pb-[12.75px] pl-2 pr-[9px] pt-[12.75px]"
                >
                  <span className="whitespace-nowrap text-center font-['Manrope',sans-serif] text-[9px] font-bold leading-[13.5px] text-[#515f74]">
                    {format(selectedDate, "dd-MM-yyyy")}
                  </span>
                </div>

                {visibleDoctorColumns.map((doc, i) => (
                  <div
                    key={doc.employeeId}
                    role="columnheader"
                    title={`${doc.name} - ${doc.spec}`}
                    className={`flex w-full flex-col items-center justify-center gap-0.5 overflow-hidden pb-1.5 pl-1.5 pr-[7px] pt-1.5 text-center ${
                      i !== visibleDoctorColumns.length - 1 ? "border-r border-[#c3c6d7]" : ""
                    }`}
                  >
                    <span className="line-clamp-2 w-full break-words font-['Manrope',sans-serif] text-[10px] font-bold leading-[13px] text-[#004ac6]">
                      {doc.name}
                    </span>
                    <span className="w-full truncate font-['Manrope',sans-serif] text-[8px] uppercase leading-3 text-[#515f74]">
                      {doc.spec}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Time rows */}
            {scheduleRows.map((row, rowIdx) => (
              <div
                key={row.time}
                className={rowIdx !== scheduleRows.length - 1 ? "border-b border-[#c3c6d7]" : ""}
              >
                <div
                  role="row"
                  className="grid"
                  style={{ gridTemplateColumns: `70px repeat(${visibleDoctorColumns.length}, 90px)` }}
                >
                  <div
                    role="rowheader"
                    className="sticky left-0 z-10 flex h-[60px] items-center justify-center border-r border-[#c3c6d7] bg-[#f2f4f6] pb-2 pl-2 pr-[9px] pt-2"
                  >
                    <span className="whitespace-nowrap font-['Manrope',sans-serif] text-[10px] leading-[10px] text-[#515f74]">
                      {row.time}
                    </span>
                  </div>

                  {row.slots.map((cell, i) => (
                    <div
                      key={i}
                      role="cell"
                      className={`h-[60px] pb-1 pl-1 pr-[5px] pt-1 ${
                        i !== row.slots.length - 1 ? "border-r border-[#c3c6d7]" : ""
                      }`}
                    >
                      {cell ? (
                        <AppointmentCard cell={cell} />
                      ) : (
                        <EmptySlot />
                      )}
                    </div>
                  ))}
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
    </div>
  );
};

export default AppointmentSchedule;
