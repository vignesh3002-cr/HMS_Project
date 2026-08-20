import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  Check,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import { format, addDays, subDays, startOfWeek, isSameWeek } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import CalendarPicker from "@/components/hms/Calender";
import ExportReport from "@/components/ui/ExportReport";
import { downloadExportCsv, exportErrorMessage } from "@/api/export.api";
import { appointmentApi, type AppointmentRecord } from "@/api/appointment.api";
import { employeeApi } from "@/api/employee.api";
import { FilterPopover, useFilterPanel, useScheduleFilters } from "@/components/Filter";
import { usePermission } from "@/context/PermissionContext";
import { useToast } from "@/hooks/use-toast";
import { RefreshButton } from "@/components/hms/RefreshButton";
import { cn } from "@/lib/utils";

interface Schedule {
  patients: number;
  progress: number;
  color: "blue" | "green" | "red" | "gray";
  off?: boolean;
}

interface Doctor {
  name: string;
  department: string;
  schedule: Schedule[];
}

type ScheduleViewType = "list" | "day" | "week";

interface AppointmentScheduleProps {
  onViewChange?: (view: ScheduleViewType) => void;
}

// appointment_date is stored as a UTC-anchored Date (see appointment.utils.ts
// on the backend), so this must read UTC getters directly -- local getters
// would shift the day in timezones behind UTC.
function utcDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const colorStyles = {
  blue: {
    bg: "bg-[rgba(0,74,198,0.05)]",
    border: "border-l-clinical-blue",
    text: "text-clinical-blue",
    fill: "bg-clinical-blue",
  },
  green: {
    bg: "bg-[rgba(0,125,85,0.05)]",
    border: "border-l-[#006242]",
    text: "text-[#006242]",
    fill: "bg-[#006242]",
  },
  red: {
    bg: "bg-[#fff7ed]",
    border: "border-l-[#fb923c]",
    text: "text-[#c2410c]",
    fill: "bg-[#fb923c]",
  },
  gray: {
    bg: "bg-[#F8FAFC]",
    border: "border-l-[#94A3B8]",
    text: "text-[#64748B]",
    fill: "bg-[#94A3B8]",
  },
};

// Successful available-slots responses are cached per employee|date|branch so
// revisiting a week (or re-running after a date change) doesn't re-hit the API.
type AvailabilityResult = boolean | null; // null = request failed
const availabilityCacheRef = new Map<string, boolean>();

const AppointmentSchedule = ({ onViewChange }: AppointmentScheduleProps = {}) => {
  const navigate = useNavigate();
  const { can } = usePermission();
  const { toast } = useToast();
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const [searchTerm, setSearchTerm] = useState("");

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement>(null);
  const [viewType, setViewType] = useState<ScheduleViewType>("week");
  const [dataVersion, setDataVersion] = useState(0);

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

  const handleViewSelect = (view: ScheduleViewType) => {
    setIsViewMenuOpen(false);
    setViewType(view);
    if (view === "day") {
      navigate("/appointments/day-view");
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

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekDateFrom = format(weekStart, "yyyy-MM-dd");
  const weekDateTo = format(addDays(weekStart, 6), "yyyy-MM-dd");

  // Real appointments for the selected week, fetched from GET /appointments
  // -- the doctor rows and per-day patient counts below are both derived
  // from this instead of dummy data. All pages are pulled (totalPages loop),
  // so a busy week of more than 100 appointments is never truncated.
  const [weekAppointments, setWeekAppointments] = useState<AppointmentRecord[]>([]);
  const [isLoadingWeek, setIsLoadingWeek] = useState(true);
  const [weekLoadFailed, setWeekLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadWeekAppointments = async () => {
      setIsLoadingWeek(true);
      setWeekLoadFailed(false);

      try {
        const firstPage = await appointmentApi.getAll({
          dateFrom: weekDateFrom,
          dateTo: weekDateTo,
          page: 1,
          limit: 100,
        });
        const firstData = firstPage.data?.data;
        const remainingPages = Array.from(
          { length: Math.max(0, (firstData?.totalPages ?? 1) - 1) },
          (_, index) =>
            appointmentApi.getAll({
              dateFrom: weekDateFrom,
              dateTo: weekDateTo,
              page: index + 2,
              limit: 100,
            }),
        );
        const remainingResults = await Promise.all(remainingPages);
        const appointments = [
          ...(firstData?.appointments ?? []),
          ...remainingResults.flatMap((res) => res.data?.data?.appointments ?? []),
        ];

        if (!cancelled) setWeekAppointments(appointments);
      } catch (err) {
        console.error("[Week View] Error:", err);
        if (!cancelled) {
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

  // All doctors (not just ones with an appointment this week), so every
  // doctor gets a row -- same approach as Day view.tsx. Paginated like the
  // Day view, and only DOCTORs are requested.
  const [allDoctors, setAllDoctors] = useState<
    { employeeId: string; branchId: string; name: string; department: string }[]
  >([]);
  const [doctorsFailed, setDoctorsFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadAllDoctors = async () => {
      const firstPage = await employeeApi.getAll({ roleType: "DOCTOR", page: 1, limit: 1000 });
      const firstData = firstPage.data?.data;
      const remainingPages = Array.from(
        { length: Math.max(0, (firstData?.totalPages ?? 1) - 1) },
        (_, index) => employeeApi.getAll({ roleType: "DOCTOR", page: index + 2, limit: 1000 }),
      );
      const remainingResults = await Promise.all(remainingPages);
      return [
        ...(firstData?.employees ?? []),
        ...remainingResults.flatMap((res) => res.data?.data?.employees ?? []),
      ];
    };

    loadAllDoctors()
      .then((employees) => {
        // Only an explicit emp_status === true counts as active -- a null
        // status would otherwise leak deactivated doctors into the grid.
        const activeDoctors = employees.filter((emp) => emp.emp_status === true);
        if (cancelled) return;
        setAllDoctors(
          activeDoctors.map((emp) => ({
            employeeId: emp.employee_id,
            branchId: emp.branch_id,
            name: `Dr. ${[emp.first_name, emp.middle_name, emp.last_name].filter(Boolean).join(" ")}`,
            department: (emp.department_master?.department_name || emp.specialization || "General").toUpperCase(),
          })),
        );
      })
      .catch((err) => {
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
      });
    return () => {
      cancelled = true;
    };
  }, [toast, dataVersion]);

  // A doctor's real mapped branches (via user_branch_mapping) -- their
  // doctor_schedule rows can be tied to any of these, not just the single
  // `employees.branch_id`/appointment `branch_id` fallback, so availability
  // has to be checked across all of them or a multi-branch doctor's open
  // slots get missed entirely (same fix as Day view.tsx).
  const [doctorBranchIds, setDoctorBranchIds] = useState<Record<string, string[]>>({});

  // Real per-doctor available slots for each day of the selected week, from
  // GET /appointments/available-slots -- lets an unbooked-but-scheduled day
  // show "New slot available" instead of "OFF" (same distinction Day
  // view.tsx makes). Keyed by `${employeeId}|${yyyy-MM-dd}`.
  const [availableByDoctorDay, setAvailableByDoctorDay] = useState<Record<string, boolean>>({});
  // True when every availability request for the week failed -- the "OFF"
  // cells would be misleading then, so a warning is shown above the grid.
  const [availabilityWarning, setAvailabilityWarning] = useState(false);

  useEffect(() => {
    const byIdForSlots = new Map<string, { employeeId: string; branchId: string }>();
    allDoctors.forEach((doc) => byIdForSlots.set(doc.employeeId, doc));
    weekAppointments.forEach((appt) => {
      const emp = appt.employees;
      if (!emp || !appt.branch_id || byIdForSlots.has(emp.employee_id)) return;
      byIdForSlots.set(emp.employee_id, { employeeId: emp.employee_id, branchId: appt.branch_id });
    });

    const pairs = Array.from(byIdForSlots.values());
    if (pairs.length === 0) {
      setDoctorBranchIds({});
      setAvailableByDoctorDay({});
      setAvailabilityWarning(false);
      return;
    }

    let cancelled = false;

    const fetchAvailability = async () => {
      const branchEntries = await Promise.all(
        pairs.map((doc) =>
          employeeApi
            .getOne(doc.employeeId)
            .then((res) => {
              const mapped = (res.data?.data?.branches ?? []).map((b) => b.branch_id);
              return [doc.employeeId, mapped.length ? mapped : [doc.branchId]] as const;
            })
            .catch(() => [doc.employeeId, [doc.branchId]] as const),
        ),
      );
      if (cancelled) return;

      const branchMap = Object.fromEntries(branchEntries);
      setDoctorBranchIds(branchMap);

      const dayKeys = weekDays.map((d) => format(d, "yyyy-MM-dd"));

      // Chunk the requests (5 at a time) so a large doctor roster doesn't
      // fire hundreds of parallel calls at the backend at once.
      const jobs: (() => Promise<readonly [string, boolean | null]>)[] = [];
      for (const doc of pairs) {
        const branchIds = branchMap[doc.employeeId] ?? [doc.branchId];
        for (const dateStr of dayKeys) {
          jobs.push(async () => {
            const results: AvailabilityResult[] = await Promise.all(
              branchIds.map((branchId) => {
                const cacheKey = `${doc.employeeId}|${dateStr}|${branchId}`;
                const cached = availabilityCacheRef.get(cacheKey);
                if (cached !== undefined) return Promise.resolve(cached);
                return appointmentApi
                  .getAvailableSlots(doc.employeeId, branchId, dateStr)
                  .then((res) => {
                    const available = (res.data?.data?.slots ?? []).some((s) => s.is_available);
                    availabilityCacheRef.set(cacheKey, available);
                    return available as boolean;
                  })
                  .catch(() => null);
              }),
            );
            if (results.some((r) => r === true)) return [doc.employeeId + "|" + dateStr, true] as const;
            if (results.every((r) => r === null)) return [doc.employeeId + "|" + dateStr, null] as const;
            return [doc.employeeId + "|" + dateStr, false] as const;
          });
        }
      }

      const entries = new Map<string, boolean | null>();
      for (let i = 0; i < jobs.length; i += 5) {
        const chunk = jobs.slice(i, i + 5);
        const results = await Promise.all(chunk.map((job) => job()));
        if (cancelled) return;
        results.forEach(([key, value]) => entries.set(key, value));
      }

      const confirmed = new Map<string, boolean>();
      let failures = 0;
      let successes = 0;
      entries.forEach((value, key) => {
        if (value === null) {
          failures++;
        } else {
          successes++;
          confirmed.set(key, value);
        }
      });

      if (!cancelled) {
        setAvailableByDoctorDay(Object.fromEntries(confirmed));
        setAvailabilityWarning(failures > 0 && successes === 0);
      }
    };

    void fetchAvailability();
    return () => {
      cancelled = true;
    };
  }, [allDoctors, weekAppointments, selectedDate]);

  useEffect(() => {
    const dayKeys = weekDays.map((d) => format(d, "yyyy-MM-dd"));

    const byId = new Map<string, { employeeId: string; name: string; department: string }>();
    allDoctors.forEach((doc) => byId.set(doc.employeeId, doc));
    weekAppointments.forEach((appt) => {
      const emp = appt.employees;
      if (!emp || byId.has(emp.employee_id)) return;
      byId.set(emp.employee_id, {
        employeeId: emp.employee_id,
        name: `Dr. ${[emp.first_name, emp.middle_name, emp.last_name].filter(Boolean).join(" ")}`,
        department: (emp.specialization || "General").toUpperCase(),
      });
    });

    // Same doctor can have more than one employee_id (e.g. duplicate records,
    // multi-branch mappings) -- group by name so they render as one row
    // instead of repeating, while still counting appointments from every
    // employee_id that maps to that name.
    const byName = new Map<string, { employeeIds: string[]; name: string; department: string }>();
    byId.forEach((doc) => {
      const existing = byName.get(doc.name);
      if (existing) {
        existing.employeeIds.push(doc.employeeId);
      } else {
        byName.set(doc.name, { employeeIds: [doc.employeeId], name: doc.name, department: doc.department });
      }
    });

    const derivedDoctors: Doctor[] = Array.from(byName.values()).map((doc) => ({
      name: doc.name,
      department: doc.department,
      schedule: dayKeys.map((key) => {
        const count = weekAppointments.filter(
          (appt) =>
            appt.employees && doc.employeeIds.includes(appt.employees.employee_id) &&
            utcDateKey(appt.appointment_date) === key,
        ).length;

        if (count === 0) {
          const hasOpenSlot = doc.employeeIds.some((id) => availableByDoctorDay[`${id}|${key}`]);
          return hasOpenSlot
            ? { patients: 0, progress: 0, color: "blue", off: false }
            : { patients: 0, progress: 0, color: "gray", off: true };
        }

        const progress = Math.min(100, count * 10);
        const color: Schedule["color"] = progress >= 100 ? "red" : progress <= 40 ? "green" : "blue";
        return { patients: count, progress, color };
      }),
    }));

    setDoctors(derivedDoctors);
  }, [weekAppointments, allDoctors, selectedDate, availableByDoctorDay]);

  const dateLabel = isSameWeek(selectedDate, new Date(), { weekStartsOn: 1 })
    ? "This Week"
    : `${format(weekStart, "dd MMM")} - ${format(addDays(weekStart, 6), "dd MMM")}`;

  // Doctor filter options, built from the real (deduped) doctor rows -- lets
  // the toolbar Filter popover pick any number of specific doctors.
  const { doctorFilterFields } = useScheduleFilters({
    doctors,
    idKey: "doctorNames",
    valueField: "name",
  });

  // Only doctors matching the search and the multi-select Filter popover get
  // a row at all -- narrowing down to specific doctors hides every other
  // doctor's row entirely instead of just dimming it.
  const selectedDoctorNames: string[] = Array.isArray(appliedValues.doctorNames) ? appliedValues.doctorNames : [];

  const visibleDoctors = doctors.filter((doctor) => {
    if (searchTerm && !doctor.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (selectedDoctorNames.length > 0 && !selectedDoctorNames.includes(doctor.name)) return false;
    return true;
  });

  const totalAppointments = weekAppointments.length;

  // ---- EXPORT ----
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
                  className="flex items-center gap-2 px-4 py-2.5 bg-clinical-blue rounded-lg text-white text-xs font-semibold shadow-sm shadow-clinical-blue/20 transition-colors hover:bg-clinical-blue-mid"
                >
                  <Plus className="w-4 h-4" />
                  Add Appointment
                </button>
              )}

            </div>

          </div>

          {/* ==================== MAIN CARD ==================== */}

          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col min-h-[500px] transition-all duration-300 hover:shadow-md">

            {/* ==================== TOOLBAR ==================== */}

            <div className="px-5 py-4 border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-4">


              <div className="flex flex-wrap items-center gap-3">


                <div className="relative" ref={viewMenuRef}>

                  <button
                    type="button"
                    onClick={() => setIsViewMenuOpen((o) => !o)}
                    className="flex items-center gap-2 px-3 py-1.5 border border-[#E5E7EB] rounded-md text-xs font-semibold text-[#374151] hover:border-[#00488D] transition-colors"
                  >

                    {viewTypeOptions.find((opt) => opt.key === viewType)?.label}

                    <ChevronDown className={`w-3 h-3 text-[#6B7280] transition-transform duration-200 ${isViewMenuOpen ? "rotate-180" : ""}`} />

                  </button>

                  <div
                    className={`absolute left-0 top-full mt-1 w-32 bg-white border border-[#E5E7EB] rounded-md shadow-lg overflow-hidden z-40 transition-all duration-150 ${
                      isViewMenuOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                    }`}
                  >
                    {viewTypeOptions.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => { handleViewSelect(opt.key); }}
                        className={`flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-left transition-colors ${
                          viewType === opt.key ? "bg-[#D6E3FF] text-[#00488D]" : "text-[#374151] hover:bg-[#F2F4F6]"
                        }`}
                      >
                        {opt.label}
                        {viewType === opt.key && <Check className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>

                </div>


              </div>


              <div className="flex items-center gap-3 flex-wrap">

                {/* Search doctors */}

                <div className="relative">

                  <input
                    type="text"
                    placeholder="Search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="Search doctors in schedule"
                    className="pl-8 pr-3 py-1.5 bg-[#F2F4F6] text-xs text-[#6B7280] placeholder:text-[#6B7280] outline-none w-[150px] sm:w-[200px] rounded-md transition-all duration-200 focus:rounded-none focus:w-[200px] sm:focus:w-[250px]"
                  />

                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#424752]" />

                </div>

                {/* Week navigation */}

                <div className="flex items-center">

                  <button
                    onClick={() => setSelectedDate((prev) => subDays(prev, 7))}
                    className="flex items-center justify-center w-[25px] h-[27px] border border-[#E5E7EB] rounded-l-lg transition-colors duration-150 hover:bg-[#F2F4F6]"
                  >
                    <ChevronLeft className="w-3 h-3 text-[#424752]" />
                  </button>


                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <button className="flex items-center justify-center h-[27px] w-[90px] px-2 border-t border-b border-[#E5E7EB] bg-white text-xs font-medium transition-colors duration-150 hover:bg-[#F2F4F6]">
                        {dateLabel}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-[#E5E7EB] shadow-lg">
                      <CalendarPicker
                        selected={selectedDate}
                        hideThemePicker
                        onSelect={(date) => {
                          if (date instanceof Date) setSelectedDate(date);
                          setIsCalendarOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>


                  <button
                    onClick={() => setSelectedDate((prev) => addDays(prev, 7))}
                    className="flex items-center justify-center w-[25px] h-[27px] border border-[#E5E7EB] rounded-r-lg transition-colors duration-150 hover:bg-[#F2F4F6]"
                  >
                    <ChevronRight className="w-3 h-3 text-[#424752]" />
                  </button>

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

                <RefreshButton onClick={() => setDataVersion((v) => v + 1)} isLoading={isLoadingWeek} />

              </div>

            </div>

            {/* Content */}
            <div className="p-5 flex flex-col items-start gap-[29px] lg:flex-row">
              <section
                aria-label="Doctor weekly appointment schedule grid"
                className="w-full overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white shadow-sm"
              >

                {isLoadingWeek ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-clinical-label">
                    <Loader2 size={24} className="animate-spin text-clinical-blue" />
                    Loading schedule...
                  </div>
                ) : weekLoadFailed ? (
                  <div className="flex items-center justify-center py-16 text-sm text-clinical-label">
                    Couldn't load appointments. Check the connection and try again.
                  </div>
                ) : doctorsFailed ? (
                  <div className="flex items-center justify-center py-16 text-sm text-clinical-label">
                    Couldn't load doctors. Check the connection and try again.
                  </div>
                ) : doctors.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-sm text-clinical-label">
                    No appointments found for this week.
                  </div>
                ) : visibleDoctors.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-sm text-clinical-label">
                    No doctors match your search or filters.
                  </div>
                ) : (
                  <>
                    {availabilityWarning && (
                      <div className="flex items-center gap-2 border-b border-[#E2E8F0] bg-amber-50 px-4 py-2.5 text-[11px] font-medium text-amber-700">
                        <TriangleAlert className="h-3.5 w-3.5 flex-none" />
                        Couldn't verify slot availability — days without bookings may show as OFF.
                      </div>
                    )}
                    <table className="w-full min-w-[1070px] table-fixed border-collapse">

                      <thead>

                        <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">

                          <th className="sticky left-0 z-10 w-[160px] border-r border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-clinical-label">
                            Specialist
                          </th>

                          {weekDays.map((day) => (
                            <th
                              key={day.toISOString()}
                              className="w-[130px] border-r border-[#E2E8F0] last:border-r-0 px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-clinical-label"
                            >
                              {format(day, "EEE d")}
                            </th>
                          ))}

                        </tr>

                      </thead>

                      <tbody>

                        {visibleDoctors.map((doctor) => (
                          <tr
                            key={doctor.name}
                            className="border-b border-[#E2E8F0] last:border-b-0"
                          >
                            <td className="sticky left-0 z-10 w-[160px] border-r border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 align-top">

                              <h3 className="text-[12px] font-bold leading-[15px] text-clinical-blue">
                                {doctor.name}
                              </h3>

                              <p className="mt-1 text-[10px] font-bold uppercase leading-3 tracking-wide text-clinical-label">
                                {doctor.department}
                              </p>

                            </td>

                            {doctor.schedule.map((item, index) => {
                              if (item.off) {
                                return (
                                  <td
                                    key={index}
                                    className="border-r border-[#E2E8F0] last:border-r-0 p-1.5 align-middle"
                                  >
                                    <div className="flex h-[52px] w-full items-center justify-center rounded-md border border-dashed border-clinical-blue/30">
                                      <span className="text-[10px] font-bold uppercase tracking-wide text-clinical-label">
                                        OFF
                                      </span>
                                    </div>
                                  </td>
                                );
                              }

                              if (item.patients === 0) {
                                return (
                                  <td key={index} className="border-r border-[#E2E8F0] last:border-r-0 p-1.5">
                                    <div className="flex h-[52px] w-full items-center justify-center rounded-md border-l-2 border-l-clinical-blue bg-clinical-blue/5 p-1 text-center">
                                      <span className="text-[10px] font-bold leading-[13px] text-clinical-blue">
                                        New slot available
                                      </span>
                                    </div>
                                  </td>
                                );
                              }

                              const style = colorStyles[item.color];

                              return (
                                <td key={index} className="border-r border-[#E2E8F0] last:border-r-0 p-1.5">
                                  <div
                                    className={cn(
                                      "flex h-[52px] w-full flex-col justify-between rounded-md border-l-2 p-1.5 pl-2",
                                      style.bg,
                                      style.border,
                                    )}
                                  >
                                    <p className={cn("text-[11px] font-bold leading-[15px]", style.text)}>
                                      {item.patients} Patients
                                    </p>

                                    <div className="relative block h-1 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
                                      <div
                                        className={cn("absolute inset-y-0 left-0 rounded-full", style.fill)}
                                        style={{ width: `${item.progress}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}

                      </tbody>

                    </table>
                  </>
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