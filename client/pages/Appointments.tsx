import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Download,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  MoreVertical,
  Loader2,
} from "lucide-react";
import HmsTable from "@/components/hms/HmsTable";
import { format, isToday, isTomorrow, isYesterday, addDays, subDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import CalendarPicker from "@/components/hms/Calender";
import { FilterPopover, useFilterPanel } from "@/components/Filter";
import type { FilterField } from "@/components/Filter/types";
import { filterDataByValues } from "@/components/Filter/utils";
import { appointmentApi, type AppointmentRecord } from "@/api/appointment.api";
import { useToast } from "@/hooks/use-toast";

import DayView from "./Day view";
import WeekView from "./Week view";
import ExportReport from "@/components/ui/ExportReport";


interface Appointment {
  id: string;
  tokenId: string;
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


const statusStyles: Record<string, string> = {
  Scheduled: "bg-blue-50 text-blue-600",
  Conformed: "bg-green-50 text-green-600",
  Cancelled: "bg-red-50 text-red-600",
  Rescheduled: "bg-amber-50 text-amber-600",
  "Checked In": "bg-indigo-50 text-indigo-600",
  "In Consultation": "bg-purple-50 text-purple-600",
  Completed: "bg-emerald-50 text-emerald-600",
  "No Show": "bg-gray-100 text-gray-600",
};

// Backend appointment_history.status values (see APPOINTMENT_STATUS in
// Backend/HMS_Backend/src/modules/appointment/appointment.constants.ts)
// mapped to the labels this page already renders/styles.
const STATUS_LABELS: Record<string, string> = {
  BOOKED: "Scheduled",
  CONFIRMED: "Conformed",
  CHECKED_IN: "Checked In",
  IN_CONSULTATION: "In Consultation",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

const APPOINTMENT_AVATAR_COLORS = [
  "bg-blue-100 text-blue-600",
  "bg-green-100 text-green-600",
  "bg-amber-100 text-amber-600",
  "bg-purple-100 text-purple-600",
  "bg-rose-100 text-rose-600",
];

function getInitials(name: string): string {
  const words = name.replace(/^Dr\.?\s*/i, "").trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

function formatPatientName(p: AppointmentRecord["patient_bio_data"]): string {
  if (!p) return "Unknown Patient";
  return [p.patient_first_name, p.patient_middle_name, p.patient_last_name]
    .filter(Boolean)
    .join(" ");
}

function formatDoctorName(e: AppointmentRecord["employees"]): string {
  if (!e) return "Unassigned";
  return `Dr. ${[e.first_name, e.middle_name, e.last_name].filter(Boolean).join(" ")}`;
}

// appointment_date/appointment_time are stored as UTC-anchored Date/Time
// values (see appointment.utils.ts on the backend), so formatting must read
// UTC getters directly -- local getters would shift the day/hour in
// timezones behind UTC.
function formatAppointmentDate(date: string): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${month}/${day}/${d.getUTCFullYear()}`;
}

function formatAppointmentTime(time: string): string {
  const t = new Date(time);
  if (isNaN(t.getTime())) return "—";
  const minutes = String(t.getUTCMinutes()).padStart(2, "0");
  const period = t.getUTCHours() >= 12 ? "PM" : "AM";
  const hours12 = t.getUTCHours() % 12 || 12;
  return `${String(hours12).padStart(2, "0")}:${minutes} ${period}`;
}

function mapAppointmentRecord(record: AppointmentRecord, index: number): Appointment {
  const patientName = formatPatientName(record.patient_bio_data);
  const doctorName = formatDoctorName(record.employees);

  return {
    id: record.appointment_id,
    tokenId: record.token_number != null ? String(record.token_number) : "—",
    patient: patientName,
    patientId: record.patient_id,
    patientInitial: getInitials(patientName),
    avatarColor: APPOINTMENT_AVATAR_COLORS[index % APPOINTMENT_AVATAR_COLORS.length],
    branch: record.branch?.branch_name ?? "—",
    doctor: doctorName,
    doctorId: record.employee_id ?? "—",
    doctorInitial: getInitials(doctorName),
    date: formatAppointmentDate(record.appointment_date),
    time: formatAppointmentTime(record.appointment_time),
    status: STATUS_LABELS[record.status ?? ""] ?? (record.status || "Unknown"),
  };
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
        className={`absolute right-0 top-full mt-1 w-44 bg-white border border-[#E5E7EB] rounded-md shadow-lg overflow-hidden z-40 transition-all duration-150 ${
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
  const { toast } = useToast();

  // Appointment data fetched from GET /appointments (mutable so status
  // changes like cancellation can be reflected). No dummy fallback — an
  // empty/failed fetch just shows an empty state.
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isAppointmentsLoading, setIsAppointmentsLoading] = useState(true);

  useEffect(() => {
    appointmentApi
      .getAll()
      .then((res) => {
        const records = res.data?.data?.appointments || [];
        setAppointments(records.map(mapAppointmentRecord));
        if (records.length === 0) {
          toast({
            title: "No appointment records found",
            description: "The appointments API returned no records.",
          });
        }
      })
      .catch((err) => {
        console.error("[Appointments Page] Error:", err);
        toast({
          title: "Failed to load appointments",
          description: "Couldn't reach the appointments API.",
          variant: "destructive",
        });
      })
      .finally(() => {
        setIsAppointmentsLoading(false);
      });
  }, []);

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
    [appointments],
  );

  const statusOptions = useMemo(
    () =>
      Array.from(new Set(appointments.map((item) => item.status))).map((value) => ({
        label: value,
        value,
      })),
    [appointments],
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

          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col transition-all duration-300 hover:shadow-md">


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
                        onClick={() => {
                          setIsViewMenuOpen(false);
                          if (opt.key === "day") {
                            navigate("/appointments/day-view");
                          } else if (opt.key === "week") {
                            navigate("/appointments/week-view");
                          } else {
                            setViewType(opt.key);
                          }
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
                    className="pl-8 pr-3 py-1.5 bg-[#F2F4F6] text-xs text-[#6B7280] placeholder:text-[#6B7280] outline-none w-[150px] sm:w-[200px] rounded-md transition-all duration-200 focus:rounded-none focus:w-[200px] sm:focus:w-[250px]"
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

            {isAppointmentsLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#6B7280] text-sm">
                <Loader2 size={24} className="animate-spin text-[#00488D]" />
                Loading appointments...
              </div>
            ) : (
              <HmsTable
                columns={[
                  { key: "id", label: "Appointment No", render: (r: Appointment) => (
                    <span className="hms-id-text font-bold !text-blue-600 !text-[13px]">{r.id}</span>
                  )},
                  { key: "tokenId", label: "Token Id", render: (r: Appointment) => (
                    <span className="hms-id-text font-bold !text-blue-600 !text-[13px]">{r.tokenId}</span>
                  )},
                  { key: "patient", label: "Patient", render: (r: Appointment) => (
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center hms-avatar-text ${r.avatarColor}`}>{r.patientInitial}</div>
                      <div><div className="hms-name-text capitalize">{r.patient}</div><div className="hms-id-text">{r.patientId}</div></div>
                    </div>
                  )},
                  { key: "branch", label: "Branch", render: (r: Appointment) => <span className="hms-content-text text-[#191C1E]">{r.branch}</span> },
                  { key: "doctor", label: "Doctor", render: (r: Appointment) => (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center hms-avatar-text">{r.doctorInitial}</div>
                      <div><div className="hms-name-text capitalize">{r.doctor}</div><div className="hms-id-text">{r.doctorId}</div></div>
                    </div>
                  )},
                  { key: "date", label: "Appointment Date", render: (r: Appointment) => (
                    <div className="hms-content-text text-[#191C1E] leading-4"><div>{r.date}</div><div className="text-[11px] font-medium text-[#8C8D8F] mt-1">{r.time}</div></div>
                  )},
                  { key: "status", label: "Status", render: (r: Appointment) => (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusStyles[r.status] ?? "bg-indigo-50 text-indigo-600"}`}>{r.status}</span>
                  )},
                  { key: "actions", label: "Action", sortable: false, render: (r: Appointment) => (
                    <ActionMenu
                      onView={() => alert(`Viewing appointment ${r.id}`)}
                      onEdit={() => alert(`Editing appointment ${r.id}`)}
                      onCancel={() => alert(`Cancelling appointment ${r.id}`)}
                    />
                  )},
                ]}
                data={currentRows}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                currentPage={currentPage}
                totalPages={totalPages}
                totalRecords={totalRecords}
                rowsPerPage={rowsPerPage}
                visibleStart={visibleStart}
                visibleEnd={visibleEnd}
                onPageChange={setCurrentPage}
                onRowsPerPageChange={(val) => { setRowsPerPage(val); setCurrentPage(1); }}
                rowsPerPageOptions={[5, 10, 20]}
                emptyMessage="No appointments found matching the current filters."
                rowKey={(r: Appointment, i: number) => r.id + i}
              />
            )}
          </div>
        </main>
      </div>
    </div>

  );

};

export default AppointmentSchedule;
