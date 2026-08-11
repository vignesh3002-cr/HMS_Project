import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Loader2 } from "lucide-react";
import { format, isToday, isTomorrow, isYesterday, addDays, subDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import CalendarPicker from "@/components/hms/Calender";
import ExportReport from "@/components/ui/ExportReport";
import { downloadExportCsv, exportErrorMessage } from "@/api/export.api";
import { useToast } from "@/hooks/use-toast";
import { appointmentApi, type AppointmentRecord, type AvailableSlot } from "@/api/appointment.api";
import { employeeApi, type EmployeeRecord, type DoctorScheduleRecord, type DayOfWeek } from "@/api/employee.api";
import { FilterPopover, useFilterPanel, useScheduleFilters } from "@/components/Filter";
import { usePermission } from "@/context/PermissionContext";
import { branchApi } from "@/api/branch.api";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";

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

// One row per hour of the day (12:00 AM through 11:00 PM), always present
// regardless of any doctor's actual shift -- each column stacks every one of
// that doctor's real slots (booked or open) whose start time falls in that
// hour, so a doctor with e.g. two 30-minute slots in the same hour shows both.
interface HourRow {
  hour: number;
  label: string;
  perDoctor: AppointmentSlot[][];
}

interface DoctorDaySlot extends AvailableSlot {
  branchId: string;
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

// Rows are built from the backend's exact HH:mm slot list. This keeps the
// grid aligned with each doctor's configured shift and consultation length.
function formatHHmmLabel(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

function hhmmToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Available-slots times normally come back as plain "HH:MM", but guard
// against the ISO-datetime-on-epoch-date shape (e.g.
// "1970-01-01T09:00:00.000Z") just in case -- normalize both to "HH:MM"
// before they are used as row times or booking payloads.
function normalizeSlotTime(time: string): string {
  if (!time.includes("T")) return time;
  const d = new Date(time);
  if (isNaN(d.getTime())) return time;
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

// Mirrors Backend/HMS_Backend/src/modules/appointment/appointment.utils.ts
// generateTimeSlots -- every start-to-end tick of the shift, INCLUDING the
// trailing tick when the shift doesn't end on a consultation boundary
// (minutes < endMinutes), so no single slot of a doctor's shift is ever
// missed. POST /appointments accepts any start within [start_time, end_time)
// (pickScheduleForTime in appointment.service.ts), so the tail tick is
// bookable too.
function generateSlotTimes(startMinutes: number, endMinutes: number, consultationMinutes: number): string[] {
  const times: string[] = [];
  const step = consultationMinutes > 0 ? consultationMinutes : 30;
  for (let minutes = startMinutes; minutes < endMinutes; minutes += step) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    times.push(`${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`);
  }
  return times;
}

// doctor_schedule start_time/end_time come back as ISO timestamps on the
// epoch date (e.g. "1970-01-01T10:30:00.000Z") -- only the UTC hour/minute
// digits carry the actual shift boundary.
function timeStringToMinutes(time: string): number {
  const d = new Date(time);
  return isNaN(d.getTime()) ? NaN : d.getUTCHours() * 60 + d.getUTCMinutes();
}

function slot(
  count: number,
  label: string,
  fill: number,
  dark = false,
  booking?: AppointmentSlot["booking"],
): AppointmentSlot {
  return { count, label, fill, dark, booking };
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
      className={`flex h-[52px] w-full flex-col items-start justify-center rounded-[2px] border-l-2 p-1 pl-1.5 text-left ${cardClass}`}
    >
      <span className={`font-['Manrope',sans-serif] text-[10px] font-bold leading-[15px] ${labelClass}`}>
        {cell.label}
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
  const { can } = usePermission();
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

  // Load every appointment page for the selected day. The backend slot API is
  // authoritative for availability, while these records provide the booked
  // cards and the accurate total in the header.
  const [dayAppointments, setDayAppointments] = useState<AppointmentRecord[]>([]);
  const [isLoadingDay, setIsLoadingDay] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadDayAppointments = async () => {
      setIsLoadingDay(true);

      try {
        const date = format(selectedDate, "yyyy-MM-dd");
        const firstPage = await appointmentApi.getAll({ date, page: 1, limit: 100 });
        const firstData = firstPage.data?.data;
        const remainingPages = Array.from(
          { length: Math.max(0, (firstData?.totalPages ?? 1) - 1) },
          (_, index) => appointmentApi.getAll({ date, page: index + 2, limit: 100 }),
        );
        const remainingResults = await Promise.all(remainingPages);
        const appointments = [
          ...(firstData?.appointments ?? []),
          ...remainingResults.flatMap((res) => res.data?.data?.appointments ?? []),
        ];

        if (!cancelled) setDayAppointments(appointments);
      } catch (err) {
        console.error("[Day View] Error:", err);
        if (!cancelled) {
          setDayAppointments([]);
          toast({
            title: "Failed to load appointments",
            description: "Couldn't reach the appointments API.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setIsLoadingDay(false);
      }
    };

    void loadDayAppointments();
    return () => {
      cancelled = true;
    };
  }, [selectedDate, toast]);

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
    const loadAllEmployees = async () => {
      // GET /employees is paginated -- a single page (even a generously sized
      // one) can't be assumed to hold every employee, so page 1's totalPages
      // decides how many more pages to pull before a doctor is allowed to be
      // silently missing from the grid.
      const firstPage = await employeeApi.getAll({ page: 1, limit: 1000 });
      const firstData = firstPage.data?.data;
      const remainingPages = Array.from(
        { length: Math.max(0, (firstData?.totalPages ?? 1) - 1) },
        (_, index) => employeeApi.getAll({ page: index + 2, limit: 1000 }),
      );
      const remainingResults = await Promise.all(remainingPages);
      return [
        ...(firstData?.employees ?? []),
        ...remainingResults.flatMap((res) => res.data?.data?.employees ?? []),
      ];
    };

    loadAllEmployees()
      .then((employees) => {
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
  // and the start_time/end_time on each active shift defines the
  // start-to-end range. The real slot list itself (and which of those slots
  // are booked) is then fetched from GET /appointments/available-slots with
  // includePast=true -- unlike the default call it does NOT hide times
  // already past on today's date, so a doctor's full shift still shows as
  // "New slot available" below.
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
            // status: 1 = active, 0 = deactivated/historical (see branches
            // mapping in Backend/HMS_Backend/src/modules/employee/employee.repository.ts)
            // -- findDoctorBranchMapping only matches status: 1, so an
            // inactive mapping here would still offer a schedule's branch as
            // "New slot available" even though POST /appointments (and
            // getAvailableSlots) would 400 with "Doctor is not assigned to
            // the selected branch".
            const mappedBranches = new Set(
              (res.data?.data?.branches ?? [])
                .filter((b) => b.status === undefined || b.status === 1)
                .map((b) => b.branch_id),
            );
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

  // Re-pulls one doctor's schedule rows after addScheduleSlot creates a new
  // one, so the just-added slot shows up on the grid without a full reload.
  const refreshDoctorSchedule = async (employeeId: string) => {
    try {
      const res = await employeeApi.getOne(employeeId);
      const activeSchedules = (res.data?.data?.doctorSchedules ?? []).filter((s) => s.is_active && s.day_of_week);
      const days = activeSchedules.map((s) => s.day_of_week as string);
      const mappedBranches = new Set(
        (res.data?.data?.branches ?? [])
          .filter((b) => b.status === undefined || b.status === 1)
          .map((b) => b.branch_id),
      );
      setDoctorScheduleDays((prev) => ({ ...prev, [employeeId]: days }));
      setDoctorSchedulesByEmployee((prev) => ({ ...prev, [employeeId]: activeSchedules }));
      setDoctorMappedBranches((prev) => ({ ...prev, [employeeId]: mappedBranches }));
    } catch (err) {
      console.error("[Day View] Failed to refresh doctor schedule:", err);
    }
  };

  // The empty (dashed) cell means this doctor has no schedule covering that
  // hour at all -- clicking it asks for confirmation, then addScheduleSlot
  // creates a real doctor_schedule row for exactly that hour so it becomes a
  // bookable "New slot available" cell (which already routes to
  // AddAppointment via its `booking` payload, same as any other open slot).
  const [addSlotTarget, setAddSlotTarget] = useState<{
    doctorId: string;
    branchId: string;
    hour: number;
  } | null>(null);
  const [isAddingSlot, setIsAddingSlot] = useState(false);

  const handleAddSlotConfirm = async () => {
    if (!addSlotTarget) return;
    setIsAddingSlot(true);
    try {
      const startTime = `${String(addSlotTarget.hour).padStart(2, "0")}:00`;
      const endTime = addSlotTarget.hour === 23 ? "23:59" : `${String(addSlotTarget.hour + 1).padStart(2, "0")}:00`;

      await employeeApi.addScheduleSlot(addSlotTarget.doctorId, {
        branch_id: addSlotTarget.branchId,
        day_of_week: selectedDayOfWeek as DayOfWeek,
        shift_name: "Custom",
        start_time: startTime,
        end_time: endTime,
      });

      toast({ title: "Slot added", description: "The new slot is now available to book." });
      await refreshDoctorSchedule(addSlotTarget.doctorId);
      setAddSlotTarget(null);
    } catch (err: any) {
      toast({
        title: "Failed to add slot",
        description: err?.response?.data?.message || err.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsAddingSlot(false);
    }
  };

  // Doctor filter options, built from the real doctor list -- lets the
  // toolbar Filter popover pick any number of specific doctors.
  const { doctorFilterFields } = useScheduleFilters({
    doctors: doctorColumns,
    idKey: "doctorIds",
    valueField: "employeeId",
  });

  // Only doctors matching the toolbar search, the picked doctor (if any),
  // the multi-select Filter popover, and -- once schedule data has loaded --
  // an active doctor_schedule row for the selected date's day of week get a
  // column at all. e.g. selecting a Monday only shows doctors who actually
  // work Mondays, instead of every doctor with an all-empty column.
  const selectedDayOfWeek = format(selectedDate, "EEEE").toUpperCase();
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");

  // Real per-doctor slots for the selected day, fetched from
  // GET /appointments/available-slots with includePast=true so the FULL
  // shift shows even after those times have passed on today's date --
  // the backend's own generateTimeSlots is the source of truth for the
  // slot list, and its is_available flag (booked = any non-cancelled,
  // non-no-show appointment at that time) decides which cells read
  // "New slot available" vs a booked card.
  const [realSlotsByDoctor, setRealSlotsByDoctor] = useState<Record<string, AvailableSlot[]>>({});

  useEffect(() => {
    if (doctorColumns.length === 0 || isLoadingScheduleDays) {
      setRealSlotsByDoctor({});
      return;
    }

    let cancelled = false;

    const fetchRealSlots = async () => {
      const dateStr = format(selectedDate, "yyyy-MM-dd");

      const entries = await Promise.all(
        doctorColumns.map(async (doc) => {
          // Branches = those of this doctor's active schedules for the
          // selected day, minus any they're not actively mapped to or whose
          // branch was deactivated (same guards as the grid's fallback path
          // -- getAvailableSlots 400s on both, so those can never book).
          const branchIds = new Set<string>();
          for (const s of doctorSchedulesByEmployee[doc.employeeId] ?? []) {
            if ((s.day_of_week ?? "").trim().toUpperCase() !== selectedDayOfWeek) continue;
            if (!s.start_time || !s.end_time || !s.branch_id) continue;
            const doctorMapped = doctorMappedBranches[doc.employeeId];
            if (doctorMapped && !doctorMapped.has(s.branch_id)) continue;
            if (activeBranchIds && !activeBranchIds.has(s.branch_id)) continue;
            branchIds.add(s.branch_id);
          }

          const lists = await Promise.all(
            Array.from(branchIds).map((branchId) =>
              appointmentApi
                .getAvailableSlots(doc.employeeId, branchId, dateStr, { includePast: true })
                .then((res) => res.data?.data?.slots ?? [])
                .catch(() => null),
            ),
          );

          // A doctor whose fetch failed on every branch keeps [] so the grid
          // falls back to appointment-count availability for their column.
          const allFetchesFailed = lists.length > 0 && lists.every((l) => l === null);
          return [doc.employeeId, allFetchesFailed ? [] : lists.flatMap((l) => l ?? [])] as const;
        }),
      );

      if (!cancelled) setRealSlotsByDoctor(Object.fromEntries(entries));
    };

    void fetchRealSlots();
    return () => {
      cancelled = true;
    };
  }, [
    doctorColumns,
    isLoadingScheduleDays,
    doctorSchedulesByEmployee,
    doctorMappedBranches,
    activeBranchIds,
    selectedDate,
    selectedDayOfWeek,
  ]);

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
        if (!days.some((d) => (d ?? "").trim().toUpperCase() === selectedDayOfWeek)) return false;
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

  // Cancelled/no-show appointments don't block a slot on the backend either
  // (see NON_BLOCKING_APPOINTMENT_STATUSES in
  // Backend/HMS_Backend/src/modules/appointment/appointment.constants.ts) --
  // matching that here means a cancelled booking correctly frees its slot
  // back up as "New slot available" instead of looking permanently taken.
  const NON_BLOCKING_STATUSES = useMemo(() => new Set(["CANCELLED", "NO_SHOW"]), []);

  // Fixed 24-hour axis, 12:00 AM through 11:00 PM, always fully shown --
  // independent of any doctor's actual shift, so the grid never hides part
  // of the day. Each doctor column stacks every one of THAT doctor's own
  // real slots (booked or open) whose start time falls in a given hour.
  const HOURS = useMemo(() => Array.from({ length: 24 }, (_, h) => h), []);

  const scheduleRows: HourRow[] = useMemo(() => {
    // The real per-doctor slots from GET /appointments/available-slots
    // (includePast=true) are the source of truth: for any time the backend
    // returned for that doctor, its is_available flag decides booked vs
    // open (findBookedAppointmentTimes in the backend excludes the same
    // NON_BLOCKING statuses as below). A doctor's own schedule ranges
    // (validated for day-of-week, branch mapping, and active-branch status)
    // fill in the rest as a fallback while backend slots are loading or if
    // a doctor's available-slots fetch failed -- every in-range tick from
    // that doctor's OWN consultation length, including a shift's trailing
    // tick, stays bookable, matching pickScheduleForTime, which only
    // range-checks [start_time, end_time).
    //
    // Each doctor's times are generated independently (not against a row
    // grid shared across doctors of different consultation lengths), so no
    // alignment/snapping is needed -- every time considered here is already
    // one of that doctor's own real ticks.
    const scheduleIdToBranch = new Map<string | number, string>();
    for (const schedules of Object.values(doctorSchedulesByEmployee)) {
      for (const s of schedules) {
        if (s.schedule_id != null && s.branch_id) scheduleIdToBranch.set(s.schedule_id, s.branch_id);
      }
    }

    const appointmentsAt = (doc: DayDoctorColumn, time: string): AppointmentRecord[] =>
      dayAppointments.filter((appt) => {
        if (appt.employees?.employee_id !== doc.employeeId) return false;
        if (appt.status && NON_BLOCKING_STATUSES.has(appt.status)) return false;
        const t = new Date(appt.appointment_time);
        if (isNaN(t.getTime())) return false;
        const apptTime = `${String(t.getUTCHours()).padStart(2, "0")}:${String(t.getUTCMinutes()).padStart(2, "0")}`;
        return apptTime === time;
      });

    const patientNameOf = (appt: AppointmentRecord): string => {
      const bio = appt.patient_bio_data;
      if (!bio) return "Patient";
      return [bio.patient_first_name, bio.patient_middle_name, bio.patient_last_name].filter(Boolean).join(" ");
    };

    const bookedCard = (appts: AppointmentRecord[]) => {
      const count = appts.length;
      const fill = count >= 3 ? 100 : count === 2 ? 66 : 33;
      const names = appts.map(patientNameOf);
      const label = names.length > 1 ? `${names[0]} +${names.length - 1} more` : names[0] || "1 Patient";
      return slot(Math.max(1, count), label, fill, false);
    };

    const cellsByDoctor = new Map<string, { time: string; cell: AppointmentSlot }[]>();

    for (const doc of visibleDoctorColumns) {
      const doctorMapped = doctorMappedBranches[doc.employeeId];
      const ranges: { start: number; end: number; schedule: DoctorScheduleRecord }[] = [];

      for (const s of doctorSchedulesByEmployee[doc.employeeId] ?? []) {
        // Trim/uppercase before comparing -- some doctor_schedule rows have
        // stray whitespace in day_of_week (e.g. " WEDNESDAY"), which still
        // reads as the right day to a human but fails the backend's exact
        // string match, silently zeroing out getAvailableSlots for that row.
        if ((s.day_of_week ?? "").trim().toUpperCase() !== selectedDayOfWeek || !s.start_time || !s.end_time) {
          continue;
        }
        // A schedule whose branch this doctor isn't actively mapped to, or
        // whose branch has been deactivated, can never actually be booked
        // -- getAvailableSlots rejects both -- so don't offer it as
        // "New slot available" in the first place.
        if (doctorMapped && s.branch_id && !doctorMapped.has(s.branch_id)) continue;
        if (activeBranchIds && s.branch_id && !activeBranchIds.has(s.branch_id)) continue;

        const startMinutes = timeStringToMinutes(s.start_time);
        const endMinutes = timeStringToMinutes(s.end_time);
        if (isNaN(startMinutes) || isNaN(endMinutes)) continue;

        ranges.push({ start: startMinutes, end: endMinutes, schedule: s });
      }

      // Real backend slots (grouped by normalized time) for this doctor.
      const backendByTime = new Map<string, AvailableSlot[]>();
      for (const s of realSlotsByDoctor[doc.employeeId] ?? []) {
        const t = normalizeSlotTime(s.time);
        const list = backendByTime.get(t);
        if (list) list.push(s);
        else backendByTime.set(t, [s]);
      }

      // Every time this doctor could possibly have a cell for: their own
      // real backend times, unioned with every tick generated from their
      // own schedule ranges (the fallback generator).
      const doctorTimes = new Set<string>(backendByTime.keys());
      for (const r of ranges) {
        for (const t of generateSlotTimes(r.start, r.end, r.schedule.consultation_minutes ?? 20)) {
          doctorTimes.add(t);
        }
      }

      const sortedDoctorTimes = Array.from(doctorTimes).sort((a, b) => hhmmToMinutes(a) - hhmmToMinutes(b));

      const cells: { time: string; cell: AppointmentSlot }[] = [];

      for (const time of sortedDoctorTimes) {
        // Backend-authoritative cell: the slot was returned by
        // available-slots for this doctor, so is_available decides it.
        const backendAtTime = backendByTime.get(time);
        if (backendAtTime && backendAtTime.length > 0) {
          // A time the doctor runs on more than one branch counts as open
          // as long as ANY of its occurrences is still bookable.
          const open = backendAtTime.find((s) => s.is_available);
          if (open) {
            cells.push({
              time,
              cell: slot(0, "New slot available", 0, false, {
                doctorId: doc.employeeId,
                branchId: scheduleIdToBranch.get(open.schedule_id) || doc.branchId,
                departmentId: doc.departmentId,
                date: selectedDateStr,
                time,
              }),
            });
          } else {
            cells.push({ time, cell: bookedCard(appointmentsAt(doc, time)) });
          }
          continue;
        }

        // Fallback cell: no backend slot at this exact time -- only real if
        // it falls inside one of this doctor's own shift ranges.
        const rowMinutes = hhmmToMinutes(time);
        const matchedRange = ranges.find((r) => rowMinutes >= r.start && rowMinutes < r.end);
        if (!matchedRange) continue;

        const apptsHere = appointmentsAt(doc, time);
        if (apptsHere.length > 0) {
          cells.push({ time, cell: bookedCard(apptsHere) });
          continue;
        }

        cells.push({
          time,
          cell: slot(0, "New slot available", 0, false, {
            doctorId: doc.employeeId,
            branchId: matchedRange.schedule.branch_id || doc.branchId,
            departmentId: doc.departmentId,
            date: selectedDateStr,
            time,
          }),
        });
      }

      cellsByDoctor.set(doc.employeeId, cells);
    }

    return HOURS.map((hour) => ({
      hour,
      label: formatHHmmLabel(`${String(hour).padStart(2, "0")}:00`),
      perDoctor: visibleDoctorColumns.map((doc) =>
        (cellsByDoctor.get(doc.employeeId) ?? [])
          .filter((entry) => Math.floor(hhmmToMinutes(entry.time) / 60) === hour)
          .map((entry) => entry.cell),
      ),
    }));
  }, [
    HOURS,
    visibleDoctorColumns,
    dayAppointments,
    realSlotsByDoctor,
    doctorSchedulesByEmployee,
    doctorMappedBranches,
    activeBranchIds,
    selectedDayOfWeek,
    selectedDateStr,
    NON_BLOCKING_STATUSES,
  ]);

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

  // ---- EXPORT ----
  const handleExport = async (exportFormat: string) => {
    if (exportFormat !== "csv") return;
    try {
      const day = format(selectedDate, "yyyy-MM-dd");
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
              {can("report.export") && <ExportReport onExport={handleExport} />}



              {can("appointment.create") && (
              <button
                onClick={() => navigate("/appointments/add")}
                className="flex items-center gap-2 px-4 py-2 bg-[#004785] rounded-lg text-white text-xs font-semibold shadow-sm hover:bg-[#003a6b] transition-colors"
              >

                <Plus className="w-4 h-4" />
                Add Appointment

              </button>
              )}


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

            {/* Time rows -- fixed 12:00 AM..11:00 PM axis; each cell stacks
                every one of that doctor's real slots inside the hour. */}
            {scheduleRows.map((row, rowIdx) => (
              <div
                key={row.hour}
                className={rowIdx !== scheduleRows.length - 1 ? "border-b border-[#c3c6d7]" : ""}
              >
                <div
                  role="row"
                  className="grid"
                  style={{ gridTemplateColumns: `70px repeat(${visibleDoctorColumns.length}, 90px)` }}
                >
                  <div
                    role="rowheader"
                    className="sticky left-0 z-10 flex h-full min-h-[60px] items-center justify-center border-r border-[#c3c6d7] bg-[#f2f4f6] pb-2 pl-2 pr-[9px] pt-2"
                  >
                    <span className="whitespace-nowrap font-['Manrope',sans-serif] text-[10px] leading-[10px] text-[#515f74]">
                      {row.label}
                    </span>
                  </div>

                  {row.perDoctor.map((cells, i) => (
                    <div
                      key={i}
                      role="cell"
                      className={`flex h-full min-h-[60px] flex-col gap-1 p-1 ${
                        i !== row.perDoctor.length - 1 ? "border-r border-[#c3c6d7]" : ""
                      }`}
                    >
                      {cells.length === 0 ? (
                        <EmptySlot
                          onClick={() => {
                            const doc = visibleDoctorColumns[i];
                            // Reuse the branch of this doctor's existing schedule for the
                            // selected day (if any), so the new slot lands on the same
                            // branch as their real slots and getAvailableSlots returns both
                            // together -- otherwise picking an arbitrary mapped branch here
                            // can silently split the new slot onto a different branch than
                            // the doctor's normal schedule, hiding the old slots from it.
                            const existingBranch = (doctorSchedulesByEmployee[doc.employeeId] ?? []).find(
                              (s) => (s.day_of_week ?? "").trim().toUpperCase() === selectedDayOfWeek && s.branch_id,
                            )?.branch_id;
                            const mapped = doctorMappedBranches[doc.employeeId];
                            const branchId =
                              existingBranch ||
                              (mapped && mapped.size > 0 ? Array.from(mapped)[0] : null) ||
                              doc.branchId;
                            setAddSlotTarget({ doctorId: doc.employeeId, branchId, hour: row.hour });
                          }}
                        />
                      ) : (
                        cells.map((cell, cellIdx) => <AppointmentCard key={cellIdx} cell={cell} />)
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

      <ConfirmationDialog
        open={Boolean(addSlotTarget)}
        onConfirm={handleAddSlotConfirm}
        onCancel={() => setAddSlotTarget(null)}
        type="question"
        title="Add Slot"
        description={
          addSlotTarget
            ? `Add a new bookable slot for ${
                doctorColumns.find((d) => d.employeeId === addSlotTarget.doctorId)?.name ?? "this doctor"
              } at ${formatHHmmLabel(`${String(addSlotTarget.hour).padStart(2, "0")}:00`)}?`
            : ""
        }
        confirmText="Add Slots"
        cancelText="Back"
        loading={isAddingSlot}
      />
    </div>
  );
};

export default AppointmentSchedule;
