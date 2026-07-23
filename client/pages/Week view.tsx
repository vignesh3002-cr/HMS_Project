import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  Check,
} from "lucide-react";
import { format, addDays, subDays, startOfWeek, isSameWeek } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import CalendarPicker from "@/components/hms/Calender";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ExportReport from "@/components/ui/ExportReport";

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

const initialDoctors: Doctor[] = [
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Michael Brown",
    department: "RADIATION",
    schedule: [
      { patients: 16, progress: 100, color: "red" },
      { patients: 0, progress: 0, color: "gray", off: true },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 12, progress: 85, color: "blue" },
      { patients: 9, progress: 65, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Elena Rodriguez",
    department: "PEDIATRIC",
    schedule: [
      { patients: 6, progress: 40, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 12, progress: 85, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 13, progress: 90, color: "blue" },
      { patients: 4, progress: 30, color: "gray" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
];

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
  const [doctors, setDoctors] = useState<Doctor[]>(initialDoctors);
  const [isAddSlotOpen, setIsAddSlotOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ doctorIdx: number; colIdx: number } | null>(null);

  const [searchTerm, setSearchTerm] = useState("");

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
    if (view === "day") {
      navigate("/appointments/day-view");
    } else {
      onViewChange?.(view);
    }
  };

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const dateLabel = isSameWeek(selectedDate, new Date(), { weekStartsOn: 1 })
    ? "This Week"
    : `${format(weekStart, "dd MMM")} - ${format(addDays(weekStart, 6), "dd MMM")}`;

  const isDoctorDimmed = (doctorName: string) =>
    Boolean(searchTerm) && !doctorName.toLowerCase().includes(searchTerm.toLowerCase());

  const handleAddSlot = () => {
    if (selectedSlot) {
      setDoctors((prev) =>
        prev.map((doctor, doctorIdx) =>
          doctorIdx !== selectedSlot.doctorIdx
            ? doctor
            : {
                ...doctor,
                schedule: doctor.schedule.map((item, colIdx) =>
                  colIdx !== selectedSlot.colIdx
                    ? item
                    : { patients: 0, progress: 0, color: "blue", off: false },
                ),
              },
        ),
      );
    }
    setIsAddSlotOpen(false);
    setSelectedSlot(null);
  };

  const handleCancelAddSlot = () => {
    setIsAddSlotOpen(false);
    setSelectedSlot(null);
  };

  const [isCancelSlotOpen, setIsCancelSlotOpen] = useState(false);

  const handleConfirmCancelSlot = () => {
    if (selectedSlot) {
      setDoctors((prev) =>
        prev.map((doctor, doctorIdx) =>
          doctorIdx !== selectedSlot.doctorIdx
            ? doctor
            : {
                ...doctor,
                schedule: doctor.schedule.map((item, colIdx) =>
                  colIdx !== selectedSlot.colIdx
                    ? item
                    : { patients: 0, progress: 0, color: "gray", off: true },
                ),
              },
        ),
      );
    }
    setIsCancelSlotOpen(false);
    setSelectedSlot(null);
  };

  const handleBackFromCancelSlot = () => {
    setIsCancelSlotOpen(false);
    setSelectedSlot(null);
  };

  const totalAppointments = doctors.reduce(
    (total, doctor) => total + doctor.schedule.filter((item) => !item.off).length,
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

            {doctors.map((doctor, doctorIdx) => (
              <tr
                key={doctor.name + doctorIdx}
                className={`border-b border-[#c3c6d7] last:border-b-0 transition-opacity ${
                  isDoctorDimmed(doctor.name) ? "opacity-30" : ""
                }`}
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
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSlot({ doctorIdx, colIdx: index });
                            setIsAddSlotOpen(true);
                          }}
                          className="flex h-[52px] w-full items-center justify-center rounded border border-dashed border-[#c3c6d7] transition-colors hover:border-[#00488D] hover:bg-[#F7F9FB]"
                        >
                          <span className="font-['Manrope',sans-serif] text-[9px] font-bold uppercase tracking-wide text-[#9aa1ad]">
                            OFF
                          </span>
                        </button>
                      </td>
                    );
                  }

                  if (item.patients === 0) {
                    return (
                      <td key={index} className="border-r border-[#c3c6d7] last:border-r-0 p-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSlot({ doctorIdx, colIdx: index });
                            setIsCancelSlotOpen(true);
                          }}
                          className="flex h-[52px] w-full items-center justify-center rounded-[2px] border-l-2 border-l-[#004ac6] bg-[rgba(0,74,198,0.05)] p-1 text-center transition-colors hover:bg-[rgba(0,74,198,0.1)]"
                        >
                          <span className="font-['Manrope',sans-serif] text-[9px] font-bold leading-[13px] text-[#004ac6]">
                            New slot available
                          </span>
                        </button>
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

      </section>

          </div>
          </div>
        </main>
      </div>

      <Dialog
        open={isAddSlotOpen}
        onOpenChange={(open) => {
          setIsAddSlotOpen(open);
          if (!open) setSelectedSlot(null);
        }}
      >
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Add Slot</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleAddSlot}
              className="flex-1 rounded-lg bg-[#004785] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#003a6b]"
            >
              Add Slot
            </button>
            <button
              type="button"
              onClick={handleCancelAddSlot}
              className="flex-1 rounded-lg border border-[#E5E7EB] px-4 py-2 text-xs font-semibold text-[#374151] transition-colors hover:bg-[#F2F4F6]"
            >
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCancelSlotOpen}
        onOpenChange={(open) => {
          setIsCancelSlotOpen(open);
          if (!open) setSelectedSlot(null);
        }}
      >
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="text-black">Cancel Slot</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleConfirmCancelSlot}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
            >
              Cancel Slot
            </button>
            <button
              type="button"
              onClick={handleBackFromCancelSlot}
              className="flex-1 rounded-lg border border-[#E5E7EB] px-4 py-2 text-xs font-semibold text-[#374151] transition-colors hover:bg-[#F2F4F6]"
            >
              Back
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentSchedule;