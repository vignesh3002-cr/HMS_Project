import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Loader2 } from "lucide-react";
import { format, isToday, isTomorrow, isYesterday, addDays, subDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import CalendarPicker from "@/components/hms/Calender";
import ExportReport from "@/components/ui/ExportReport";
import { useToast } from "@/hooks/use-toast";
import { doctorApi, type DoctorRecord } from "@/api/doctor.api";
import { appointmentApi, type AppointmentRecord } from "@/api/appointment.api";

/* ============================= Types ============================= */

interface DayDoctorColumn {
  employeeId: string;
  name: string;
  spec: string;
}

interface AppointmentSlot {
  count: number;
  label: string;
  fill: number;
  dark: boolean;
}

interface ScheduleRow {
  time: string;
  slots: (AppointmentSlot | null)[];
}

interface DoctorDirectoryEntry {
  initials: string;
  color: string;
  name: string;
  spec: string;
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

// Hourly rows shown in the grid (09:00 AM - 04:00 PM). Real appointment
// counts per doctor/hour are computed from the appointments API response
// in the scheduleRows useMemo below.
const TIME_ROW_HOURS = [9, 10, 11, 12, 13, 14, 15, 16];
const TIME_ROW_LABELS = [
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
];

function slot(count: number, label: string, fill: number, dark = false): AppointmentSlot {
  return { count, label, fill, dark };
}

const EMPTY = null;

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

function AppointmentCard({ cell, onCancel }: { cell: AppointmentSlot; onCancel?: () => void }) {
  if (cell.count === 0) {
    return (
      <button
        type="button"
        onClick={onCancel}
        className="flex h-[52px] w-full items-center justify-center rounded-[2px] border-l-2 border-l-[#004ac6] bg-[rgba(0,74,198,0.05)] p-1 text-center transition-colors hover:bg-[rgba(0,74,198,0.1)]"
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

function mapDoctorRecord(doc: DoctorRecord, index: number): DoctorDirectoryEntry {
  return {
    initials: getInitials(doc.doctor_name),
    color: AVATAR_PALETTE[index % AVATAR_PALETTE.length].initials,
    name: doc.doctor_name,
    spec: doc.specialization || doc.department || "General",
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

  const doctorColumns: DayDoctorColumn[] = useMemo(() => {
    const byId = new Map<string, DayDoctorColumn>();
    dayAppointments.forEach((appt) => {
      const emp = appt.employees;
      if (!emp || byId.has(emp.employee_id)) return;
      byId.set(emp.employee_id, {
        employeeId: emp.employee_id,
        name: `Dr. ${[emp.first_name, emp.middle_name, emp.last_name].filter(Boolean).join(" ")}`,
        spec: emp.specialization || "General",
      });
    });
    return Array.from(byId.values());
  }, [dayAppointments]);

  const scheduleRows: ScheduleRow[] = useMemo(() => {
    return TIME_ROW_HOURS.map((hour, idx) => ({
      time: TIME_ROW_LABELS[idx],
      slots: doctorColumns.map((doc) => {
        const count = dayAppointments.filter((appt) => {
          if (appt.employees?.employee_id !== doc.employeeId) return false;
          const t = new Date(appt.appointment_time);
          return !isNaN(t.getTime()) && t.getUTCHours() === hour;
        }).length;

        if (count === 0) return EMPTY;

        const fill = count >= 3 ? 100 : count === 2 ? 66 : 33;
        return slot(count, `${count} Patient${count > 1 ? "s" : ""}`, fill, false);
      }),
    }));
  }, [doctorColumns, dayAppointments]);

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
    } else {
      onViewChange?.(view);
    }
  };

  const [realDoctorDirectory, setRealDoctorDirectory] = useState<DoctorDirectoryEntry[] | null>(null);

  useEffect(() => {
    doctorApi
      .getAll()
      .then((res) => {
        const records = res.data?.data;
        if (records && records.length > 0) {
          setRealDoctorDirectory(records.map(mapDoctorRecord));
        } else {
          toast({
            title: "Using fallback data",
            description: "No doctor records returned yet — showing sample data.",
            variant: "destructive",
          });
        }
      })
      .catch(() => {
        toast({
          title: "Using fallback data",
          description: "Couldn't reach the doctors API — showing sample data.",
          variant: "destructive",
        });
      });
  }, []);

  const activeDoctorDirectory = realDoctorDirectory ?? [];
  const filteredDoctorDirectory = activeDoctorDirectory.filter((doc) =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const dateLabel = isToday(selectedDate)
    ? "Today"
    : isYesterday(selectedDate)
      ? "Yesterday"
      : isTomorrow(selectedDate)
        ? "Tomorrow"
        : format(selectedDate, "dd/MM/yyyy");

  const totalAppointments = dayAppointments.length;

  const isDoctorDimmed = (gridDoctorName: string) => {
    const gridName = gridDoctorName.toLowerCase();

    if (toolbarSearchTerm && !gridName.includes(toolbarSearchTerm.toLowerCase())) {
      return true;
    }

    if (selectedDoctorName) {
      const pickedName = selectedDoctorName.toLowerCase();
      const matches = pickedName.includes(gridName) || gridName.includes(pickedName);
      if (!matches) return true;
    }

    return false;
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
          className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-[#E5E7EB] bg-white shadow-sm"
        >
          {isLoadingDay ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#6B7280] text-sm">
              <Loader2 size={24} className="animate-spin text-[#00488D]" />
              Loading schedule...
            </div>
          ) : doctorColumns.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-[#6B7280] text-sm">
              No appointments found for this date.
            </div>
          ) : (
          <div role="table" className="w-full min-w-[620px] md:min-w-[691px]">
            {/* Header row */}
            <div className="border-b border-[#c3c6d7] bg-white">
              <div
                role="row"
                className="grid min-h-[39px]"
                style={{ gridTemplateColumns: `70px repeat(${doctorColumns.length}, 90px)` }}
              >
                <div
                  role="columnheader"
                  className="sticky left-0 z-10 flex items-center justify-center border-r border-[#c3c6d7] bg-white pb-[12.75px] pl-2 pr-[9px] pt-[12.75px]"
                >
                  <span className="whitespace-nowrap text-center font-['Manrope',sans-serif] text-[9px] font-bold leading-[13.5px] text-[#515f74]">
                    {format(selectedDate, "dd-MM-yyyy")}
                  </span>
                </div>

                {doctorColumns.map((doc, i) => (
                  <div
                    key={doc.employeeId}
                    role="columnheader"
                    className={`flex flex-col items-center justify-center pb-1.5 pl-1.5 pr-[7px] pt-1.5 text-center transition-opacity ${
                      i !== doctorColumns.length - 1 ? "border-r border-[#c3c6d7]" : ""
                    } ${isDoctorDimmed(doc.name) ? "opacity-30" : ""}`}
                  >
                    <span className="whitespace-nowrap font-['Manrope',sans-serif] text-[10px] font-bold leading-[15px] text-[#004ac6]">
                      {doc.name}
                    </span>
                    <span className="whitespace-nowrap font-['Manrope',sans-serif] text-[8px] uppercase leading-3 text-[#515f74]">
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
                  style={{ gridTemplateColumns: `70px repeat(${doctorColumns.length}, 90px)` }}
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
                      className={`h-[60px] pb-1 pl-1 pr-[5px] pt-1 transition-opacity ${
                        i !== row.slots.length - 1 ? "border-r border-[#c3c6d7]" : ""
                      } ${isDoctorDimmed(doctorColumns[i].name) ? "opacity-30" : ""}`}
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
