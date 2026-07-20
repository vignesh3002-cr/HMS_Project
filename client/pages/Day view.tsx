import { useState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { format, isToday, isTomorrow, isYesterday, addDays, subDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import CalendarPicker from "@/components/hms/Calender";
import ExportReport from "@/components/ui/ExportReport";
import { useToast } from "@/hooks/use-toast";
import { doctorApi, type DoctorRecord } from "@/api/doctor.api";

/* ============================= Types ============================= */

interface Doctor {
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

const doctors: Doctor[] = [
  { name: "Sarah", spec: "Oncology" },
  { name: "Jones", spec: "RAD" },
  { name: "Lee", spec: "SURG" },
  { name: "Adams", spec: "HEM" },
  { name: "Baker", spec: "GYN" },
  { name: "Carter", spec: "NEURO" },
  { name: "Davis", spec: "PED" },
  { name: "Evans", spec: "URO" },
  { name: "Foster", spec: "RADL" },
];

function slot(count: number, label: string, fill: number, dark = false): AppointmentSlot {
  return { count, label, fill, dark };
}

const EMPTY = null;

const scheduleRows: ScheduleRow[] = [
  {
    time: "09:00 AM",
    slots: [
      slot(2, "2 Patients", 66, false),
      slot(1, "1 Patient", 33, false),
      slot(3, "3 Patients", 100, false),
      slot(1, "1 Patient", 33, false),
      EMPTY,
      slot(2, "2 Patients", 66, false),
      EMPTY,
      slot(3, "3 Patients", 100, false),
      slot(1, "1 Patient", 33, true),
    ],
  },
  {
    time: "10:00 AM",
    slots: [
      EMPTY,
      slot(2, "2 Patients", 66, false),
      slot(3, "3 Patients", 100, false),
      slot(1, "1 Patient", 33, false),
      slot(2, "2 Patients", 66, false),
      EMPTY,
      slot(3, "3 Patients", 100, false),
      slot(1, "1 Patient", 33, true),
      EMPTY,
    ],
  },
  {
    time: "12:00 PM",
    slots: [
      slot(2, "2 Patients", 66, false),
      EMPTY,
      slot(3, "3 Patients", 100, false),
      EMPTY,
      slot(1, "1 Patient", 33, false),
      slot(2, "2 Patients", 66, false),
      EMPTY,
      slot(3, "3 Patients", 100, false),
      EMPTY,
    ],
  },
  {
    time: "01:00 PM",
    slots: [
      slot(1, "1 Patients", 66, false),
      EMPTY,
      slot(3, "3 Patients", 100, false),
      EMPTY,
      slot(1, "1 Patient", 33, false),
      slot(2, "2 Patients", 66, false),
      EMPTY,
      slot(3, "3 Patients", 100, false),
      EMPTY,
    ],
  },
  {
    time: "02:00 PM",
    slots: [
      slot(1, "1 Patient", 33, false),
      EMPTY,
      slot(2, "2 Patients", 66, false),
      slot(3, "3 Patients", 100, false),
      slot(1, "1 Patient", 33, false),
      EMPTY,
      slot(2, "2 Patients", 66, false),
      slot(3, "3 Patients", 100, false),
      EMPTY,
    ],
  },
  {
    time: "04:00 PM",
    slots: [
      EMPTY,
      slot(1, "1 Patient", 33, false),
      slot(2, "2 Patients", 66, false),
      EMPTY,
      slot(3, "3 Patients", 100, false),
      slot(1, "1 Patient", 33, false),
      EMPTY,
      slot(2, "2 Patients", 66, true),
      EMPTY,
    ],
  },
];

const doctorDirectory: DoctorDirectoryEntry[] = [
  { initials: "SJ", color: "rgba(10, 92, 58, 0.7)", name: "Dr. Sarah Johnson", spec: "Cardiologist" },
  { initials: "MB", color: "#f87171", name: "Dr. Michael Brown", spec: "Neurologist" },
  { initials: "ED", color: "#4a8fe8", name: "Dr. Emily Davis", spec: "Pediatrician" },
  { initials: "DW", color: "#a78bfa", name: "Dr. David Wilson", spec: "Orthopedic" },
  { initials: "JL", color: "rgba(255, 107, 53, 0.7)", name: "Dr. Jessica Lee", spec: "Dermatologist" },
];

/* ============================= Sub-components ============================= */

function EmptySlot() {
  return (
    <div className="flex h-[52px] w-full items-center justify-center rounded border border-dashed border-[#c3c6d7]">
      <DotIcon className="h-[10px] w-[10px] text-[#c3c6d7]" />
    </div>
  );
}

function AppointmentCard({ cell }: { cell: AppointmentSlot }) {
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
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement>(null);

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
    onViewChange?.(view);
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

  const activeDoctorDirectory = realDoctorDirectory ?? doctorDirectory;
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

  const totalAppointments = scheduleRows.reduce(
    (total, row) => total + row.slots.filter((cell) => cell !== null).length,
    0,
  );

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
          <div role="table" className="w-full min-w-[620px] md:min-w-[691px]">
            {/* Header row */}
            <div className="border-b border-[#c3c6d7] bg-[#f2f4f6]">
              <div role="row" className="grid min-h-[39px] grid-cols-[70px_repeat(9,minmax(65px,1fr))]">
                <div
                  role="columnheader"
                  className="flex items-center justify-center border-r border-[#c3c6d7] bg-[#f2f4f6] pb-[12.75px] pl-2 pr-[9px] pt-[12.75px]"
                >
                  <span className="whitespace-nowrap text-center font-['Manrope',sans-serif] text-[9px] font-bold leading-[13.5px] text-[#515f74]">
                    {format(selectedDate, "dd-MM-yyyy")}
                  </span>
                </div>

                {doctors.map((doc, i) => (
                  <div
                    key={doc.name}
                    role="columnheader"
                    className={`flex flex-col items-center justify-center pb-1.5 pl-1.5 pr-[7px] pt-1.5 text-center ${
                      i !== doctors.length - 1 ? "border-r border-[#c3c6d7]" : ""
                    }`}
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
                <div role="row" className="grid grid-cols-[70px_repeat(9,minmax(65px,1fr))]">
                  <div
                    role="rowheader"
                    className="flex h-[60px] items-center justify-center border-r border-[#c3c6d7] bg-[rgba(242,244,246,0.5)] pb-2 pl-2 pr-[9px] pt-2"
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
                      {cell ? <AppointmentCard cell={cell} /> : <EmptySlot />}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Aside */}
        <aside
          aria-label="Calendar and doctor directory"
          className="flex w-full flex-1 flex-col gap-4 md:flex-row lg:w-[288px] lg:flex-none lg:flex-col lg:gap-[50px]"
        >

          {/* Select doctor */}
          <div className="flex w-full flex-1 flex-col gap-4 rounded-xl border border-[#e5e7eb] bg-white p-[21px] shadow-[0_1px_1px_rgba(0,0,0,0.05)] lg:flex-none">
            <span className="font-['Manrope',sans-serif] text-[10px] font-bold leading-[15px] text-[#1f2937]">
              Select Doctor
            </span>

            <div className="relative w-full">
              <SearchIcon className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6b7280]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search doctor..."
                aria-label="Search doctor"
                className="w-full rounded-md border border-[#e5e7eb] bg-[#f9fafb] py-[13px] pl-[37px] pr-[13px] font-['Inter',sans-serif] text-[10px] text-[#1f2937] placeholder:text-[#6b7280]"
              />
            </div>

            <ul className="flex max-h-[300px] w-full flex-col gap-3 overflow-y-auto pr-1">
              {filteredDoctorDirectory.length > 0 ? (
                filteredDoctorDirectory.map((doc) => (
                  <li
                    key={doc.name}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-[#f9fafb]"
                  >
                    <span
                      className="flex h-8 w-8 flex-none items-center justify-center rounded-[16px] font-['DM_Sans',sans-serif] text-[11px] font-bold text-[#dee8ff]"
                      style={{ background: doc.color }}
                    >
                      {doc.initials}
                    </span>
                    <span className="flex flex-col text-left">
                      <span className="font-['Manrope',sans-serif] text-[10px] font-bold leading-[15px] text-[#1f2937]">
                        {doc.name}
                      </span>
                      <span className="font-['Manrope',sans-serif] text-[10px] leading-[15px] text-[#9ca3af]">
                        {doc.spec}
                      </span>
                    </span>
                  </li>
                ))
              ) : (
                <li className="py-4 text-center font-['Manrope',sans-serif] text-[10px] text-[#9ca3af]">
                  No doctors found.
                </li>
              )}
            </ul>
          </div>
        </aside>
          </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppointmentSchedule;
