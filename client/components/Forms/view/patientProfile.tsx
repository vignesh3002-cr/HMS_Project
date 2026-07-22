import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  UserRound,
  Droplet,
  VenusAndMars,
  Calendar,
  MapPin,
  Phone,
  MoreVertical,
  Heart,
  Thermometer,
  Weight,
  Activity,
  Loader2,
} from "lucide-react";
import { format, isToday, isTomorrow, isYesterday, addDays, subDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import CalendarPicker from "@/components/hms/Calender";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/hms/StatusBadge";
import { FilterPopover, useFilterPanel } from "@/components/Filter";
import type { FilterField } from "@/components/Filter/types";
import { filterDataByValues } from "@/components/Filter/utils";
import { QuickAddFab } from "@/components/hms/QuickAddFab";
import HmsTable from "@/components/hms/HmsTable";
import { patientApi, type PatientRecord } from "@/api/patient.api";

const appointments = [
  {
    id: "APT-2026-00125",
    date: "25 Apr 2026",
    time: "08:20 AM",
    doctor: "Dr. Sarah Johnson",
    doctorId: "DOC-2210",
    department: "Oncologist",
    status: "Schedule" as const,
  },
  {
    id: "APT-2026-00124",
    date: "20 May 2026",
    time: "11:40 AM",
    doctor: "Dr. Sarah Johnson",
    doctorId: "DOC-2210",
    department: "Oncologist",
    status: "Completed" as const,
  },
  {
    id: "APT-2026-00123",
    date: "02 May 2026",
    time: "08:20 AM",
    doctor: "Dr. Sarah Johnson",
    doctorId: "DOC-2210",
    department: "Oncologist",
    status: "Cancelled" as const,
  },
  {
    id: "APT-2026-00122",
    date: "27 Mar 2026",
    time: "02:00 PM",
    doctor: "Dr. David Lee",
    doctorId: "DOC-0006",
    department: "Oncologist",
    status: "Completed" as const,
  },
  {
    id: "APT-2026-00121",
    date: "12 Mar 2026",
    time: "05:40 PM",
    doctor: "Dr. Sarah Johnson",
    doctorId: "DOC-0002",
    department: "Orthopedics",
    status: "Completed" as const,
  },
] as const;

const statusVariant: Record<string, "blue" | "green" | "rose" | "amber"> = {
  Schedule: "blue",
  Completed: "green",
  Cancelled: "rose",
};

function CardMenu({ onView, onEdit, onDelete }: { onView: () => void; onEdit: () => void; onDelete: () => void }) {
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
      <button onClick={() => setOpen((o) => !o)} className="p-1 rounded hover:bg-[#F2F4F6] transition-colors">
        <MoreVertical className="w-4 h-4 text-[#6B7280]" />
      </button>
      <div className={`absolute right-0 top-full mt-1 w-28 bg-white border border-[#E5E7EB] rounded-md shadow-lg overflow-hidden z-20 transition-all duration-150 ${
          open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <button onClick={() => { onView(); setOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-medium text-[#374151] hover:bg-[#F2F4F6]">View</button>
        <button onClick={() => { onEdit(); setOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-medium text-[#374151] hover:bg-[#F2F4F6]">Edit</button>
        <button onClick={() => { onDelete(); setOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50">Delete</button>
      </div>
    </div>
  );
}

export default function PatientProfile() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    patientApi
      .getById(id)
      .then((res) => setPatient(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  function fullName(p: PatientRecord) {
    return [p.patient_first_name, p.patient_middle_name, p.patient_last_name].filter(Boolean).join(" ");
  }

  function formatDob(dob: string | null) {
    if (!dob) return "—";
    const d = new Date(dob);
    return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  }

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [underline, setUnderline] = useState({ left: 0, width: 0 });

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
    const container = tabsContainerRef.current;
    if (!container) return;
    const activeButton = container.querySelector<HTMLButtonElement>(`[data-tab="appointments"]`);
    if (activeButton) {
      setUnderline({ left: activeButton.offsetLeft, width: activeButton.offsetWidth });
    }
  }, []);

  const filterFields: FilterField[] = [
    { id: "appointmentId", label: "Appointment ID", type: "text", placeholder: "Search ID" },
    { id: "doctor", label: "Doctor Name", type: "text", placeholder: "Search doctor" },
    { id: "department", label: "Department", type: "text", placeholder: "Search department" },
    { id: "status", label: "Status", type: "multiselect", options: [
      { label: "Schedule", value: "Schedule" },
      { label: "Completed", value: "Completed" },
      { label: "Cancelled", value: "Cancelled" },
    ]},
  ];

  const filteredData = useMemo(() => {
    let result = [...appointments];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((apt) =>
        [apt.id, apt.doctor, apt.department, apt.status, apt.date].some((f) =>
          f.toLowerCase().includes(q)
        )
      );
    }
    result = filterDataByValues(result as unknown as Record<string, string | number>[], appliedValues) as typeof result;
    return result;
  }, [searchQuery, appliedValues]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const aVal = String(a[sortField as keyof typeof a] ?? "").toLowerCase();
      const bVal = String(b[sortField as keyof typeof b] ?? "").toLowerCase();
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortDirection]);

  const totalRecords = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRows = sortedData.slice(startIndex, endIndex);
  const visibleStart = totalRecords === 0 ? 0 : startIndex + 1;
  const visibleEnd = Math.min(endIndex, totalRecords);

  const handleView = (id: string) => alert(`View appointment ${id}`);
  const handleEdit = (id: string) => alert(`Edit appointment ${id}`);
  const handleDelete = (id: string) => alert(`Delete appointment ${id}`);

  if (loading) {
    return (
      <div className="flex w-full font-[Manrope,sans-serif] bg-[#F7F9FB] min-h-screen items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#00488D]" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex w-full font-[Manrope,sans-serif] bg-[#F7F9FB] min-h-screen items-center justify-center text-[#6B7280] text-sm">
        Patient not found.
      </div>
    );
  }

  const patientName = fullName(patient);
  const patientInitial = (patient.patient_first_name?.[0] ?? "?").toUpperCase();

  return (
    <div className="flex w-full font-[Manrope,sans-serif] bg-[#F7F9FB] min-h-screen">
      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex flex-col gap-6 p-6 md:p-8">
          {/* Patient Header Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1/3 h-full bg-slate-50 opacity-50 rounded-l-full transform translate-x-1/4 -translate-y-1/4 pointer-events-none" />
            <div className="relative z-10 flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24 rounded-2xl border border-slate-200">
                    <AvatarFallback className="rounded-2xl bg-slate-100 text-slate-400 text-2xl font-bold">
                      {patientInitial}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">{patientName}</h1>
                    <p className="hms-id-text mt-0.5">#{patient.patient_id}</p>
                    <div className="flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center mt-2">
                      {(patient as any).patient_current_address && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                          <span>{(patient as any).patient_current_address}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center">
                      {patient.patient_primary_mobile && (
                        <div className="flex items-center gap-1.5 border-r border-slate-200 pr-4">
                          <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                          <span>Phone : {patient.patient_primary_mobile}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                        <span>Gender : <span className="font-medium text-slate-900">{patient.patient_gender ?? "—"}</span></span>
                      </div>
                    </div>
                </div>
              </div>
              <div className="z-10 flex w-full flex-col items-center gap-4 md:w-auto md:flex-row">
                <Button variant="outline" size="icon" className="rounded-full">
                  <Phone className="h-4 w-4" />
                </Button>
                <div className="flex flex-col items-center gap-1 sm:items-stretch">
                  <Button className="flex w-full items-center gap-2 bg-[#004785] hover:bg-[#003a6b] sm:w-auto">
                    <Calendar className="h-4 w-4" />
                    Book Appointment
                  </Button>
                  <a href="#" className="text-center text-sm font-semibold text-[#00488D] hover:underline">
                    View Full Record
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* About & Vital Signs Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* About Card */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6">
              <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <UserRound className="h-5 w-5 text-slate-400" />
                About
              </h2>
              <div className="grid grid-cols-1 gap-6 gap-x-4 sm:grid-cols-2">
              <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                      <Calendar className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">DOB</p>
                      <p className="text-sm font-medium text-slate-900">{formatDob(patient.patient_dob)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
                      <Droplet className="h-4 w-4 text-red-500" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Blood Group</p>
                      <p className="text-sm font-medium text-slate-900">{patient.patient_blood_group ?? "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                      <VenusAndMars className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Gender</p>
                      <p className="text-sm font-medium text-slate-900">{patient.patient_gender ?? "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                      <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Email</p>
                      <p className="text-sm font-medium text-slate-900 truncate max-w-[150px] sm:max-w-none">{patient.patient_email || "—"}</p>
                    </div>
                  </div>
              </div>
            </div>

            {/* Vital Signs Card */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6">
              <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Activity className="h-5 w-5 text-slate-400" />
                Vital Signs
              </h2>
              <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#EFF6FF]">
                    <div className="h-4 w-4 rounded-full border-2 border-blue-500 opacity-70" />
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-slate-500">Blood Pressure</p>
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      <p className="text-sm font-semibold text-slate-900">100/67 <span className="text-xs font-normal text-slate-500">mmHg</span></p>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#FEF2F2]">
                    <Heart className="h-4 w-4 text-red-400" />
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-slate-500">Heart Rate</p>
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      <p className="text-sm font-semibold text-slate-900">89 <span className="text-xs font-normal text-slate-500">Bpm</span></p>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#ECFDF5]">
                    <div className="h-4 w-4 rounded bg-green-200 opacity-50" />
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-slate-500">SPO2</p>
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      <p className="text-sm font-semibold text-slate-900">98 <span className="text-xs font-normal text-slate-500">%</span></p>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#FFF7ED]">
                    <Thermometer className="h-4 w-4 text-orange-400" />
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-slate-500">Temperature</p>
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      <p className="text-sm font-semibold text-slate-900">101 <span className="text-xs font-normal text-slate-500">C</span></p>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#F0FDFA]">
                    <svg className="h-4 w-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-slate-500">Respiratory Rate</p>
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      <p className="text-sm font-semibold text-slate-900">24 <span className="text-xs font-normal text-slate-500">rpm</span></p>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#FAF5FF]">
                    <Weight className="h-4 w-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-slate-500">Weight</p>
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      <p className="text-sm font-semibold text-slate-900">62 <span className="text-xs font-normal text-slate-500">kg</span></p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Appointments Section */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col">
            {/* Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-5 py-4 border-b border-[#E5E7EB]">
              <nav className="relative flex items-center gap-6" ref={tabsContainerRef}>
                <button
                  data-tab="appointments"
                  className="relative pb-1 text-xs font-semibold tracking-[1.2px] capitalize transition-colors duration-200"
                  style={{ color: "#00488D" }}
                >
                  Appointments
                </button>
                <div
                  className="absolute bottom-0 h-0.5 bg-[#00488D] transition-all duration-300 ease-out"
                  style={{ left: underline.left, width: underline.width }}
                />
              </nav>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="pl-8 pr-3 py-1.5 bg-[#F2F4F6] text-xs text-[#6B7280] placeholder:text-[#6B7280] outline-none w-[150px] sm:w-[200px] rounded-md transition-all duration-200 focus:rounded-none focus:w-[200px] sm:focus:w-[250px]"
                  />
                  <svg className="absolute left-2 top-1/2 -translate-y-1/2" width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M11.0667 11.5713L6.86667 7.3713C6.53333 7.638 6.15 7.8491 5.71667 8.0046C5.28333 8.1602 4.82222 8.238 4.33333 8.238C3.12222 8.238 2.09722 7.8185 1.25833 6.9796C0.419444 6.1407 0 5.1157 0 3.90462C0 2.69351.419444 1.66851 1.25833.82962C2.09722-.00927 3.12222-.42871 4.33333-.42871C5.54444-.42871 6.56944-.00927 7.40833.82962C8.24722 1.66851 8.66667 2.69351 8.66667 3.90462C8.66667 4.3935 8.58889 4.8546 8.43333 5.288C8.27778 5.7213 8.06667 6.1046 7.8 6.438L12 10.638L11.0667 11.5713ZM4.33333 6.9046C5.16667 6.9046 5.875 6.613 6.45833 6.0296C7.04167 5.4463 7.33333 4.738 7.33333 3.90462C7.33333 3.07129 7.04167 2.36296 6.45833 1.77962C5.875 1.19629 5.16667.90462 4.33333.90462C3.5.90462 2.79167 1.19629 2.20833 1.77962C1.625 2.36296 1.33333 3.07129 1.33333 3.90462C1.33333 4.738 1.625 5.4463 2.20833 6.0296C2.79167 6.613 3.5 6.9046 4.33333 6.9046Z" fill="#424752"/>
                  </svg>
                </div>
                {/* Date nav */}
                <div className="flex items-center">
                  <button
                    onClick={() => setSelectedDate((prev) => subDays(prev, 1))}
                    className="flex items-center justify-center w-[25px] h-[27px] border border-[#E5E7EB] rounded-l-lg transition-colors duration-150 hover:bg-[#F2F4F6]"
                  >
                    <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
                      <path d="M5 1L1 5L5 9" stroke="black" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
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
                    <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
                      <path d="M1 1L5 5L1 9" stroke="black" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
                {/* Filters */}
                <FilterPopover
                  title="Filters"
                  fields={filterFields}
                  values={filterValues}
                  onChange={handleFilterChange}
                  onApply={handleApplyFilter}
                  onClear={handleClearFilter}
                  open={isFilterOpen}
                  onOpenChange={setIsFilterOpen}
                />
              </div>
            </div>

            <HmsTable
              scrollable={false}
              columns={[
                { key: "id", label: "Appointment ID", sortable: true, render: (apt) => <span className="hms-name-text">{(apt as any).id}</span> },
                { key: "date", label: "Appointment Date", sortable: true, render: (apt) => {
                  const a = apt as any;
                  return (
                    <div className="whitespace-nowrap">
                      <div className="hms-name-text">{a.date}</div>
                      <div className="flex items-center gap-1 hms-id-text mt-0.5">
                        {a.time}
                      </div>
                    </div>
                  );
                }},
                { key: "doctor", label: "Assigned Doctor", sortable: true, render: (apt) => {
                  const a = apt as any;
                  return (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-7 h-7 rounded-xl flex-shrink-0 hms-avatar-text" style={{ backgroundColor: "#D6E3FF", color: "#00488D" }}>
                        {a.doctor.split(" ").slice(1).map((w: string) => w[0]).join("")}
                      </div>
                      <div>
                        <p className="hms-name-text">{a.doctor}</p>
                        <p className="hms-id-text">{a.doctorId}</p>
                      </div>
                    </div>
                  );
                }},
                { key: "department", label: "Department", sortable: true, render: (apt) => <span className="hms-content-text text-[#191C1E]">{(apt as any).department}</span> },
                { key: "status", label: "Status", sortable: true, render: (apt) => {
                  const a = apt as any;
                  return <StatusBadge tone={statusVariant[a.status]}>{a.status}</StatusBadge>;
                }},
                { key: "actions", label: "Actions", sortable: false, render: (apt) => {
                  const a = apt as any;
                  return <CardMenu onView={() => handleView(a.id)} onEdit={() => handleEdit(a.id)} onDelete={() => handleDelete(a.id)} />;
                }},
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
              rowsPerPageOptions={[10, 20, 50]}
              emptyMessage="No appointments found matching the current filters."
              rowKey={(apt) => (apt as any).id}
            />
          </div>
        </main>
      </div>
      <QuickAddFab />
    </div>
  );
}
