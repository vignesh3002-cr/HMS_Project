import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  Check,
  Loader2,
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
    border: "border-l-[#004ac6]",
    text: "text-[#004ac6]",
    fill: "bg-[#004ac6]",
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
    bg: "bg-gray-100",
    border: "border-l-gray-500",
    text: "text-gray-600",
    fill: "bg-gray-500",
  },
};

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

  const viewOptions: { key: ScheduleViewType; label: string }[] = [
    { key: "week", label: "Week View" },
    { key: "day", label: "Day View" },
    { key: "list", label: "List View" },
  ];

  const handleViewSelect = (view: ScheduleViewType) => {
    setIsViewMenuOpen(false);
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

  // Real appointments for the selected week, fetched from GET /appointments
  // -- the doctor rows and per-day patient counts below are both derived
  // from this instead of dummy data.
  const [weekAppointments, setWeekAppointments] = useState<AppointmentRecord[]>([]);
  const [isLoadingWeek, setIsLoadingWeek] = useState(true);

  useEffect(() => {
    setIsLoadingWeek(true);
    appointmentApi
      .getAll({
        dateFrom: format(weekStart, "yyyy-MM-dd"),
        dateTo: format(addDays(weekStart, 6), "yyyy-MM-dd"),
        limit: 100,
      })
      .then((res) => {
        setWeekAppointments(res.data?.data?.appointments || []);
      })
      .catch((err) => {
        console.error("[Week View] Error:", err);
        setWeekAppointments([]);
      })
      .finally(() => setIsLoadingWeek(false));
  }, [selectedDate]);

  // All doctors (not just ones with an appointment this week), so every
  // doctor gets a row -- same approach as Day view.tsx.
  const [allDoctors, setAllDoctors] = useState<
    { employeeId: string; branchId: string; name: string; department: string }[]
  >([]);

  useEffect(() => {
    employeeApi
      .getAll({ roleType: "DOCTOR", limit: 1000 })
      .then((res) => {
        const employees = res.data?.data?.employees || [];
        setAllDoctors(
          employees.map((emp) => ({
            employeeId: emp.employee_id,
            branchId: emp.branch_id,
            name: `Dr. ${[emp.first_name, emp.middle_name, emp.last_name].filter(Boolean).join(" ")}`,
            department: (emp.department_master?.department_name || emp.specialization || "General").toUpperCase(),
          })),
        );
      })
      .catch((err) => {
        console.error("[Week View] Failed to load doctors:", err);
        setAllDoctors([]);
      });
  }, []);

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
      return;
    }

    Promise.all(
      pairs.map((doc) =>
        employeeApi
          .getOne(doc.employeeId)
          .then((res) => {
            const mapped = (res.data?.data?.branches ?? []).map((b) => b.branch_id);
            return [doc.employeeId, mapped.length ? mapped : [doc.branchId]] as const;
          })
          .catch(() => [doc.employeeId, [doc.branchId]] as const),
      ),
    ).then((branchEntries) => {
      const branchMap = Object.fromEntries(branchEntries);
      setDoctorBranchIds(branchMap);

      const dayKeys = weekDays.map((d) => format(d, "yyyy-MM-dd"));

      return Promise.all(
        pairs.flatMap((doc) => {
          const branchIds = branchMap[doc.employeeId] ?? [doc.branchId];
          return dayKeys.map((dateStr) =>
            Promise.all(
              branchIds.map((branchId) =>
                appointmentApi
                  .getAvailableSlots(doc.employeeId, branchId, dateStr)
                  .then((res) => (res.data?.data?.slots ?? []).some((s) => s.is_available))
                  .catch(() => false),
              ),
            ).then((results) => [`${doc.employeeId}|${dateStr}`, results.some(Boolean)] as const),
          );
        }),
      );
    }).then((entries) => {
      if (entries) setAvailableByDoctorDay(Object.fromEntries(entries));
    });
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
        from: format(weekStart, "yyyy-MM-dd"),
        to: format(addDays(weekStart, 6), "yyyy-MM-dd"),
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

        {/* View Type - Week View */}
        <div className="relative flex flex-col items-start gap-1.5" ref={viewMenuRef}>

          <button
            type="button"
            onClick={() => setIsViewMenuOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-1.5 border border-[#e5e7eb] rounded-md text-xs font-semibold text-[#374151] hover:border-[#00488D] transition-colors"
          >

            <span>Week View</span>
            <ChevronDown
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
                  opt.key === "week" ? "bg-[#D6E3FF] text-[#00488D]" : "text-[#374151] hover:bg-[#F2F4F6]"
                }`}
              >
                {opt.label}
                {opt.key === "week" && <Check className="w-3 h-3" />}
              </button>
            ))}
          </div>
        </div>

        {/* Search doctors */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search doctors in schedule"
            className="pl-8 pr-3 py-1.5 bg-[#F2F4F6] text-xs text-[#6B7280] placeholder:text-[#6B7280] outline-none w-[150px] sm:w-[200px] rounded-md transition-all duration-200 focus:w-[200px] sm:focus:w-[250px]"
          />
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#424752]" />
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

        {/* Week navigation */}
        <div role="group" aria-label="Week navigation" className="flex items-center">
          <button
            type="button"
            aria-label="Previous week"
            onClick={() => setSelectedDate((prev) => subDays(prev, 7))}
            className="flex h-[34px] w-[25px] items-center justify-center rounded-l-lg border border-[#e5e7eb] bg-white"
          >
            <ChevronLeft className="h-4 w-4 text-[#6b7280]" />
          </button>

          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="h-[34px] w-[110px] whitespace-nowrap border-y border-[#e5e7eb] bg-white px-[10px] py-[9px] text-center font-['Inter',sans-serif] text-[10px] font-medium leading-4 shadow-[0_1px_1px_rgba(0,0,0,0.05)]"
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
            aria-label="Next week"
            onClick={() => setSelectedDate((prev) => addDays(prev, 7))}
            className="flex h-[34px] w-[25px] items-center justify-center rounded-r-lg border border-[#e5e7eb] bg-white"
          >
            <ChevronRight className="h-4 w-4 text-[#6b7280]" />
          </button>
        </div>
      </div>

          {/* Content */}
          <div className="p-5 flex flex-col items-start gap-[29px] lg:flex-row">
          <section
            aria-label="Doctor weekly appointment schedule grid"
            className="w-full overflow-x-auto rounded-xl border border-[#E5E7EB] bg-white shadow-sm"
          >

            {isLoadingWeek ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#6B7280] text-sm">
                <Loader2 size={24} className="animate-spin text-[#00488D]" />
                Loading schedule...
              </div>
            ) : doctors.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-[#6B7280] text-sm">
                No appointments found for this week.
              </div>
            ) : visibleDoctors.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-[#6B7280] text-sm">
                No doctors match your search or filters.
              </div>
            ) : (
            <table className="w-full min-w-[1070px] table-fixed border-collapse">

          <thead>

            <tr className="bg-white border-b border-[#c3c6d7]">

              <th className="sticky left-0 z-10 w-[160px] border-r border-[#c3c6d7] bg-white px-4 py-3 text-left font-['Manrope',sans-serif] text-[10px] font-bold uppercase leading-[15px] text-[#515f74]">
                Specialist
              </th>

              {weekDays.map((day) => (
                <th
                  key={day.toISOString()}
                  className="w-[130px] border-r border-[#c3c6d7] last:border-r-0 px-4 py-3 text-center font-['Manrope',sans-serif] text-[10px] font-bold uppercase leading-[15px] text-[#515f74]"
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
                className="border-b border-[#c3c6d7] last:border-b-0"
              >
                <td className="sticky left-0 z-10 w-[160px] border-r border-[#c3c6d7] bg-[#f2f4f6] px-4 py-3 align-top">

                  <h3 className="font-['Manrope',sans-serif] text-[10px] font-bold leading-[15px] text-[#004ac6]">
                    {doctor.name}
                  </h3>

                  <p className="mt-1 font-['Manrope',sans-serif] text-[8px] font-bold uppercase leading-3 tracking-wide text-[#515f74]">
                    {doctor.department}
                  </p>

                </td>

                {doctor.schedule.map((item, index) => {
                  if (item.off) {
                    return (
                      <td
                        key={index}
                        className="border-r border-[#c3c6d7] last:border-r-0 p-1 align-middle"
                      >
                        <div className="flex h-[52px] w-full items-center justify-center rounded border border-dashed border-[#c3c6d7]">
                          <span className="font-['Manrope',sans-serif] text-[9px] font-bold uppercase tracking-wide text-[#9aa1ad]">
                            OFF
                          </span>
                        </div>
                      </td>
                    );
                  }

                  if (item.patients === 0) {
                    return (
                      <td key={index} className="border-r border-[#c3c6d7] last:border-r-0 p-1">
                        <div className="flex h-[52px] w-full items-center justify-center rounded-[2px] border-l-2 border-l-[#004ac6] bg-[rgba(0,74,198,0.05)] p-1 text-center">
                          <span className="font-['Manrope',sans-serif] text-[9px] font-bold leading-[13px] text-[#004ac6]">
                            New slot available
                          </span>
                        </div>
                      </td>
                    );
                  }

                  const style = colorStyles[item.color];

                  return (
                    <td key={index} className="border-r border-[#c3c6d7] last:border-r-0 p-1">
                      <div
                        className={`flex h-[52px] w-full flex-col justify-between rounded-[2px] border-l-2 p-1 pl-1.5 ${style.bg} ${style.border}`}
                      >
                        <p className={`font-['Manrope',sans-serif] text-[10px] font-bold leading-[15px] ${style.text}`}>
                          {item.patients} Patients
                        </p>

                        <div className="relative block h-1 w-full overflow-hidden rounded-xl bg-[#e0e3e5]">
                          <div
                            className={`absolute inset-0 rounded-xl ${style.fill}`}
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
