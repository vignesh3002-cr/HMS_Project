import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Download,
  Plus,
  ChevronDown,
  Check,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
} from "lucide-react";
import { format, isToday, isTomorrow, isYesterday, addDays, subDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import CalendarPicker from "@/components/hms/Calender";
import { FilterPopover, useFilterPanel } from "@/components/Filter";
import type { FilterField } from "@/components/Filter/types";
import { filterDataByValues } from "@/components/Filter/utils";

import DayView from "./Day view";
import WeekView from "./Week view";
import ExportReport from "@/components/ui/ExportReport";


interface Appointment {
  id: string;
  patient: string;
  patientId: string;
  patientInitial: string;
  avatarColor: string;
  branch: string;
  
  doctor: string;
  doctorId: string;
  doctorInitial: string;
  date: string;
  time: string;
  status: string;
}


const initialAppointments: Appointment[] = [
  {
    id: "APT-2026-8842",
    patient: "James Wilson",
    patientId: "PAT-0025",
    patientInitial: "JW",
    avatarColor: "bg-blue-100 text-blue-600",
    branch: "Central Hospital Tambaram",
    doctor: "Dr. Sarah Johnson",
    doctorId: "DOC-0001",
    doctorInitial: "SJ",
    date: "05/20/2026",
    time: "11:20 AM",
    status: "Scheduled",
  },

  {
    id: "APT-2026-8843",
    patient: "Priya",
    patientId: "PAT-0002",
    patientInitial: "P",
    avatarColor: "bg-green-100 text-green-600",
    branch: "Central Hospital Tambaram",
    doctor: "Dr. Emily Blunt",
    doctorId: "DOC-0002",
    doctorInitial: "EB",
    date: "05/20/2026",
    time: "11:40 AM",
    status: "Conformed",
  },

  {
    id: "APT-2026-8845",
    patient: "Ramesh",
    patientId: "PAT-0003",
    patientInitial: "R",
    avatarColor: "bg-blue-100 text-blue-600",
    branch: "Central Hospital Egmore",
    doctor: "Dr. Robert Fox",
    doctorId: "DOC-0003",
    doctorInitial: "RF",
    date: "05/20/2026",
    time: "01:30 PM",
    status: "Scheduled",
  },
  {
    id: "APT-2026-8846",
    patient: "John Cena",
    patientId: "PAT-0004",
    patientInitial: "JC",
    avatarColor: "bg-blue-100 text-blue-600",
    branch: "Central Hospital Egmore",
    doctor: "Dr. Alan Walker",
    doctorId: "DOC-0004",
    doctorInitial: "AW",
    date: "05/20/2026",
    time: "01:30 PM",
    status: "Cancelled",
  },
  {
    id: "APT-2026-8847",
    patient: "Jaden Smith",
    patientId: "PAT-0005",
    patientInitial: "JS",
    avatarColor: "bg-blue-100 text-blue-600",
    branch: "Central Hospital Egmore",
    doctor: "Dr. Suriya Sharma",
    doctorId: "DOC-0005",
    doctorInitial: "SS",
    date: "05/20/2026",
    time: "01:30 PM",
    status: "Rescheduled",
  },
  {
    id: "APT-2026-8848",
    patient: "Tom Cruise",
    patientId: "PAT-0006",
    patientInitial: "TC",
    avatarColor: "bg-blue-100 text-blue-600",
    branch: "Central Hospital Egmore",
    doctor: "Dr. Robert Fox",
    doctorId: "DOC-0003",
    doctorInitial: "RF",
    date: "05/20/2026",
    time: "01:30 PM",
    status: "Scheduled",
  },
  {
    id: "APT-2026-8847",
    patient: "Robert Downey Jr.",
    patientId: "PAT-0006",
    patientInitial: "RDJ",
    avatarColor: "bg-blue-100 text-blue-600",
    branch: "Central Hospital Egmore",
    doctor: "Dr. Robert Fox",
    doctorId: "DOC-0003",
    doctorInitial: "RF",
    date: "05/20/2026",
    time: "01:30 PM",
    status: "Scheduled",
  },
  {
    id: "APT-2026-8845",
    patient: "Jane",
    patientId: "PAT-0003",
    patientInitial: "J",
    avatarColor: "bg-blue-100 text-blue-600",
    branch: "Central Hospital Egmore",
    doctor: "Dr. Robert Fox",
    doctorId: "DOC-0003",
    doctorInitial: "RF",
    date: "05/20/2026",
    time: "01:30 PM",
    status: "Scheduled",
  },
  {
    id: "APT-2026-8845",
    patient: "Jane",
    patientId: "PAT-0003",
    patientInitial: "J",
    avatarColor: "bg-blue-100 text-blue-600",
    branch: "Central Hospital Egmore",
    doctor: "Dr. Robert Fox",
    doctorId: "DOC-0003",
    doctorInitial: "RF",
    date: "05/20/2026",
    time: "01:30 PM",
    status: "Scheduled",
  },
  {
    id: "APT-2026-8845",
    patient: "Jane",
    patientId: "PAT-0003",
    patientInitial: "J",
    avatarColor: "bg-blue-100 text-blue-600",
    branch: "Central Hospital Egmore",
    doctor: "Dr. Robert Fox",
    doctorId: "DOC-0003",
    doctorInitial: "RF",
    date: "05/20/2026",
    time: "01:30 PM",
    status: "Scheduled",
  },
  {
    id: "APT-2026-8845",
    patient: "Jane",
    patientId: "PAT-0003",
    patientInitial: "J",
    avatarColor: "bg-blue-100 text-blue-600",
    branch: "Central Hospital Egmore",
    doctor: "Dr. Robert Fox",
    doctorId: "DOC-0003",
    doctorInitial: "RF",
    date: "05/20/2026",
    time: "01:30 PM",
    status: "Scheduled",
  },
  {
    id: "APT-2026-8845",
    patient: "Jane",
    patientId: "PAT-0003",
    patientInitial: "J",
    avatarColor: "bg-blue-100 text-blue-600",
    branch: "Central Hospital Egmore",
    doctor: "Dr. Robert Fox",
    doctorId: "DOC-0003",
    doctorInitial: "RF",
    date: "01/01/2026",
    time: "01:30 PM",
    status: "Scheduled",
  },
];


const statusStyles: Record<string, string> = {
  Scheduled: "bg-blue-50 text-blue-600",
  Conformed: "bg-green-50 text-green-600",
  Cancelled: "bg-red-50 text-red-600",
  Rescheduled: "bg-amber-50 text-amber-600",
};

// Rows-per-page dropdown (matches Dashboard.tsx / Patients.tsx / Staff.tsx)
function RowsPerPageSelect({
  value,
  onChange,
  options = [5, 10, 20],
}: {
  value: number;
  onChange: (val: number) => void;
  options?: number[];
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 text-xs font-semibold text-[#374151] bg-white border rounded-md pl-2.5 pr-2 py-1 transition-colors ${
          open ? "border-[#00488D] ring-2 ring-[#D6E3FF]" : "border-[#E5E7EB] hover:border-[#00488D]"
        }`}
      >
        {value}
        <ChevronDown className={`w-3 h-3 text-[#6B7280] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <div
        className={`absolute right-0 top-full mt-1 w-16 bg-white border border-[#E5E7EB] rounded-md shadow-lg overflow-hidden z-20 transition-all duration-150 ${
          open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => { onChange(opt); setOpen(false); }}
            className={`flex items-center justify-between w-full px-2.5 py-1.5 text-xs font-semibold text-left transition-colors ${
              value === opt ? "bg-[#D6E3FF] text-[#00488D]" : "text-[#374151] hover:bg-[#F2F4F6]"
            }`}
          >
            {opt}
            {value === opt && <Check className="w-3 h-3" />}
          </button>
        ))}
      </div>
    </div>
  );
}

// Action menu for the three-dot button on each appointment row
function ActionMenu({
  onView,
  onEdit,
  onCancel,
}: {
  onView: () => void;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-center p-1.5 border border-[#E5E7EB] rounded-md hover:border-[#00488D] transition-colors"
      >
        <MoreVertical className="w-4 h-4 text-[#6B7280]" />
      </button>

      <div
        className={`absolute right-0 top-full mt-1 w-44 bg-white border border-[#E5E7EB] rounded-md shadow-lg overflow-hidden z-20 transition-all duration-150 ${
          open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <button
          type="button"
          onClick={() => { setOpen(false); onView(); }}
          className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-left transition-colors text-green-400 hover:bg-[#F2F4F6]"
        >
          View Appointment
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); onEdit(); }}
          className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-left transition-colors text-indigo-600 hover:bg-[#F2F4F6]"
        >
          Edit Appointment
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); onCancel(); }}
          className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-left transition-colors text-red-600 hover:bg-red-50"
        >
          Cancel Appointment
        </button>
      </div>
    </div>
  );
}

const AppointmentSchedule: React.FC = () => {
  const navigate = useNavigate();

  // Appointment data (mutable so status changes like cancellation can be reflected)
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);

  const handleCancelAppointment = (target: Appointment) => {
    setAppointments((prev) =>
      prev.map((appt) => (appt === target ? { ...appt, status: "Cancelled" } : appt)),
    );
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Sort state
  const [sortField, setSortField] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Date selection
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // View type dropdown (List View / Day View / Week View)
  const [viewType, setViewType] = useState<"list" | "day" | "week">("list");
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

  const viewTypeOptions: { key: "list" | "day" | "week"; label: string }[] = [
    { key: "list", label: "List View" },
    { key: "day", label: "Day View" },
    { key: "week", label: "Week View" },
  ];

  // Filters
  const {
    values: filterValues,
    appliedValues,
    isOpen: isFilterOpen,
    setIsOpen: setIsFilterOpen,
    handleChange: handleFilterChange,
    handleApply: handleApplyFilter,
    handleClear: handleClearFilter,
  } = useFilterPanel();

  const branchOptions = useMemo(
    () =>
      Array.from(new Set(appointments.map((item) => item.branch))).map((value) => ({
        label: value,
        value,
      })),
    [],
  );

  const statusOptions = useMemo(
    () =>
      Array.from(new Set(appointments.map((item) => item.status))).map((value) => ({
        label: value,
        value,
      })),
    [],
  );

  const appointmentFilterFields: FilterField[] = [
    { id: "patient", label: "Patient Name", type: "text", placeholder: "Search by name" },
    { id: "patientId", label: "Patient ID", type: "text", placeholder: "Enter ID" },
    { id: "date", label: "Appointment Date", type: "text", placeholder: "Enter date" },
    { id: "branch", label: "Branch", type: "multiselect", options: branchOptions },
    { id: "doctor", label: "Doctor Name", type: "text", placeholder: "Search by doctor" },
    { id: "status", label: "Status", type: "multiselect", options: statusOptions },
  ];

  // Search & filter
  const searchableFields: (keyof Appointment)[] = [
    "id",
    "patient",
    "patientId",
    "branch",
    "date",
    "doctor",
    "doctorId",
    "status",
  ];

  const filteredData = useMemo(() => {
    let result: Appointment[] = [...appointments];

    if (searchQuery) {
      result = result.filter((item) =>
        searchableFields.some((field) =>
          String(item[field] ?? "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
        ),
      );
    }

    result = filterDataByValues(
      result as unknown as Record<string, string | number>[],
      appliedValues,
    ) as unknown as Appointment[];

    return result;
  }, [searchQuery, appliedValues, appointments]);

  // ---- SORTING ----
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aValue = String(a[sortField as keyof Appointment] ?? "").toLowerCase();
      const bValue = String(b[sortField as keyof Appointment] ?? "").toLowerCase();
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortDirection]);

  // ---- PAGINATION ----
  const totalRecords = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRows = sortedData.slice(startIndex, endIndex);
  const visibleStart = totalRecords === 0 ? 0 : startIndex + 1;
  const visibleEnd = Math.min(endIndex, totalRecords);

  if (viewType === "day") {
    return <DayView onViewChange={setViewType} />;
  }

  if (viewType === "week") {
    return <WeekView />;
  }

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
                Total Appointments: {appointments.length}
              </p>

            </div>


            <div className="flex items-center gap-3">
              <ExportReport />



<button
                onClick={() => navigate("/appointments/add")}
                className="flex items-center gap-2 px-4 py-2 bg-[#004785] rounded-lg text-white text-xs font-semibold shadow-sm hover:bg-[#003a6b] transition-colors"
              >

                <Plus className="w-4 h-4" />
                Add Appointment

              </button>


            </div>


          </div>

          {/* ==================== MAIN CARD ==================== */}

          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col min-h-[500px] transition-all duration-300 hover:shadow-md">


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
                    className={`absolute left-0 top-full mt-1 w-32 bg-white border border-[#E5E7EB] rounded-md shadow-lg overflow-hidden z-20 transition-all duration-150 ${
                      isViewMenuOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                    }`}
                  >
                    {viewTypeOptions.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          setViewType(opt.key);
                          setIsViewMenuOpen(false);
                        }}
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

                {/* Search */}

                <div className="relative">

                  <input
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-8 pr-3 py-1.5 bg-[#F2F4F6] text-xs text-[#6B7280] placeholder:text-[#6B7280] outline-none w-[150px] sm:w-[200px] rounded-md transition-all duration-200 focus:w-[200px] sm:focus:w-[250px]"
                  />

                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#424752]" />

                </div>



                {/* Date nav */}

                <div className="flex items-center">

                  <button
                    onClick={() => setSelectedDate((prev) => subDays(prev, 1))}
                    className="flex items-center justify-center w-[25px] h-[27px] border border-[#E5E7EB] rounded-l-lg transition-colors duration-150 hover:bg-[#F2F4F6]"
                  >
                    <ChevronLeft className="w-3 h-3 text-[#424752]" />
                  </button>


                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <button className="flex items-center justify-center h-[27px] w-[90px] px-2 border-t border-b border-[#E5E7EB] bg-white text-xs font-medium transition-colors duration-150 hover:bg-[#F2F4F6]">
                        {isToday(selectedDate)
                          ? "Today"
                          : isYesterday(selectedDate)
                            ? "Yesterday"
                            : isTomorrow(selectedDate)
                              ? "Tomorrow"
                              : format(selectedDate, "dd/MM/yyyy")}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-[#E5E7EB] shadow-lg">
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
                    onClick={() => setSelectedDate((prev) => addDays(prev, 1))}
                    className="flex items-center justify-center w-[25px] h-[27px] border border-[#E5E7EB] rounded-r-lg transition-colors duration-150 hover:bg-[#F2F4F6]"
                  >
                    <ChevronRight className="w-3 h-3 text-[#424752]" />
                  </button>

                </div>



                {/* Filters */}

                <FilterPopover
                  title="Filters"
                  fields={appointmentFilterFields}
                  values={filterValues}
                  onChange={handleFilterChange}
                  onApply={() => {
                    handleApplyFilter();
                    setCurrentPage(1);
                  }}
                  onClear={() => {
                    handleClearFilter();
                    setCurrentPage(1);
                  }}
                  open={isFilterOpen}
                  onOpenChange={setIsFilterOpen}
                />


              </div>


            </div>

            {/* ==================== APPOINTMENT TABLE ==================== */}

            <div className="overflow-x-auto flex-1 hide-scrollbar">

              <table className="w-full min-w-[1100px]">


                <thead className="hms-columnHeading-style">

                  <tr className="bg-[rgba(242,244,246,0.40)]">

                    {[
                      { key: "id", label: "Token ID" },
                      { key: "patient", label: "Patient" },
                      { key: "branch", label: "Branch" },
                      { key: "doctor", label: "Doctor" },
                      { key: "date", label: "Appointment Date" },
                      { key: "status", label: "Status" },
                    ].map(({ key, label }, idx) => {
                      const isSorted = sortField === key;
                      return (
                        <th
                          key={key}
                          className={`px-5 py-3 hms-table-header text-left ${idx === 0 ? "pl-8" : ""}`}
                        >
                          <div
                            className="flex items-center gap-1 cursor-pointer select-none"
                            onClick={() => handleSort(key)}
                          >
                            <span>{label}</span>
                            <span className="inline-flex h-3 w-3 items-center justify-center text-[7px] shrink-0">
                              {isSorted ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                            </span>
                          </div>
                         
                        </th>
                      );
                    })}


                    <th className="px-5 py-3 hms-table-header text-right">
                      Action
                    </th>


                  </tr>

                </thead>



                <tbody>


                  {currentRows.length > 0 ? (

                    currentRows.map((item, index)=>(

                    <tr
                      key={item.id + index}
                      className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F7F9FB] transition-colors group"
                    >


                      {/* Appointment ID */}

                      <td className="px-5 py-4 pl-8 hms-id-text font-bold !text-blue-600 !text-[13px]">

                        {item.id}

                      </td>





                      {/* Patient */}

                      <td className="px-5 py-4">


                        <div className="flex items-center gap-3">


                          <div
                            className={`
                            w-7 h-7
                            rounded-xl
                            flex items-center
                            justify-center
                            hms-avatar-text
                            ${item.avatarColor}
                            `}
                          >

                            {item.patientInitial}

                          </div>



                          <div>


                            <p className="hms-name-text capitalize">

                              {item.patient}

                            </p>


                            <p className="hms-id-text mt-1">

                              {item.patientId}

                            </p>


                          </div>


                        </div>


                      </td>








                      {/* Branch */}

                      <td className="px-5 py-4">


                        <p className="hms-content-text text-[#191C1E]">
                          {item.branch}
                        </p>


    


                      </td>








                      {/* Doctor */}

                      <td className="px-5 py-4">


                        <div className="flex items-center gap-3">


                          <div
                            className="
                            w-7 h-7
                            rounded-xl
                            bg-indigo-100
                            text-indigo-600
                            flex
                            items-center
                            justify-center
                            hms-avatar-text
                            "
                          >

                            {item.doctorInitial}

                          </div>



                          <div>


                            <p className="hms-name-text capitalize">

                              {item.doctor}

                            </p>


                            <p className="hms-id-text mt-1">

                              {item.doctorId}

                            </p>


                          </div>


                        </div>


                      </td>








                      {/* Date */}

                      <td className="px-5 py-4">


                        <p className="hms-content-text text-[#191C1E]">
                          {item.date}
                        </p>


                        <p className="text-[11px] font-medium text-[#8C8D8F] mt-1">
                          {item.time}
                        </p>


                      </td>









                      {/* Status */}

                      <td className="px-5 py-4">


                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusStyles[item.status] ?? "bg-indigo-50 text-indigo-600"}`}
                        >

                          {item.status}

                        </span>


                      </td>








                      {/* Action */}

                      <td className="px-5 py-4 text-right">


                        <ActionMenu
                          onView={() => alert(`Viewing appointment ${item.id}`)}
                          onEdit={() => alert(`Editing appointment ${item.id}`)}
                          onCancel={() => handleCancelAppointment(item)}
                        />


                      </td>


                    </tr>


                  ))

                  ) : (

                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-[#6B7280] text-sm">
                        No appointments found matching the current filters.
                      </td>
                    </tr>

                  )}


                </tbody>


              </table>


            </div>

            {/* ==================== PAGINATION ==================== */}

            <div className="mt-auto shrink-0 flex flex-wrap items-center justify-between px-5 py-3 border-t border-[rgba(194,198,212,0.10)] bg-[rgba(242,244,246,0.95)] backdrop-blur gap-2">

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-[#424752] tracking-[0.8px] capitalize">
                  Showing {visibleStart}-{visibleEnd} of {totalRecords}
                </span>
                <RowsPerPageSelect
                  value={rowsPerPage}
                  onChange={(val) => { setRowsPerPage(val); setCurrentPage(1); }}
                  options={[5, 10, 20]}
                />
              </div>

              <div className="flex items-center gap-1">

                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                  className="w-6 h-6 flex items-center justify-center rounded-md disabled:opacity-30 hover:bg-[#E5E7EB] transition-colors"
                >

                  <ChevronLeft className="w-3 h-3 text-[#424752]" />

                </button>



                {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => (

                  <button
                    key={index}
                    onClick={()=>setCurrentPage(index + 1)}
                    className={`
                    w-6 h-6
                    flex items-center justify-center
                    rounded-md
                    text-[10px]
                    font-semibold
                    transition-colors
                    ${
                      currentPage===index + 1
                      ?
                      "bg-[#004785] text-white"
                      :
                      "text-[#1D1A1A] hover:bg-[#F2F4F6]"
                    }
                    `}
                  >

                    {index + 1}

                  </button>


                ))}

                {totalPages > 5 && <span className="text-[#6B7280] text-xs">...</span>}

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  className="w-6 h-6 flex items-center justify-center rounded-md disabled:opacity-30 hover:bg-[#E5E7EB] transition-colors"
                >

                  <ChevronRight className="w-3 h-3 text-[#424752]" />

                </button>


              </div>

            </div>


          </div>

        </main>
      </div>
    </div>

  );

};


export default AppointmentSchedule;
