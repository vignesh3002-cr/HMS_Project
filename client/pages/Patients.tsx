import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from 'react-router-dom';
import CalendarPicker from "@/components/hms/Calender";
import { format, isToday, isTomorrow, isYesterday, addDays, subDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ChevronDown,
  Check,
  Infinity,
  List,
  LayoutGrid,
  Plus,
  MoreVertical,
  CalendarCheck,
  User,
  File,
  Loader2,
} from "lucide-react";

import ExportReport from "@/components/ui/ExportReport";

// Filter system
import { FilterPopover, useFilterPanel } from "@/components/Filter";
import type { FilterField } from "@/components/Filter/types";
import { filterDataByValues } from "@/components/Filter/utils";
import { useToast } from "@/hooks/use-toast";
import { patientApi, type PatientRecord } from "@/api/patient.api";

function getPatientFullName(p: PatientRecord): string {
  return [p.patient_first_name, p.patient_middle_name, p.patient_last_name]
    .filter(Boolean)
    .join(" ");
}

function getPatientStatus(p: PatientRecord): "Active" | "Inactive" {
  return p.patient_active === "Active" ? "Active" : "Inactive";
}

// Grid view needs: id, name, age, gender, mobile, bloodGroup, photo, status —
// all real patient_bio_data columns.
function mapToGridPatient(p: PatientRecord) {
  return {
    id: p.patient_id,
    name: getPatientFullName(p),
    age: p.patient_age ?? "—",
    gender: p.patient_gender ?? "—",
    mobile: p.patient_primary_mobile ?? "—",
    bloodGroup: p.patient_blood_group ?? "—",
    photo: p.patient_photo_url ?? "",
    status: getPatientStatus(p),
  };
}

// List view additionally shows diagnose + assigned doctor, but GET /patients
// doesn't join patient_history/appointment_history today, so that data isn't
// available yet — shown as a clear placeholder instead of guessing.
function mapToListPatient(p: PatientRecord) {
  return {
    id: p.patient_id,
    name: getPatientFullName(p),
    age: p.patient_age ?? "—",
    gender: p.patient_gender ?? "—",
    mobile: p.patient_primary_mobile ?? "—",
    diagnose: "Not recorded",
    diagnoseBg: "#F3F4F6",
    diagnoseColor: "#6B7280",
    doctor: "Unassigned",
    doctorId: "—",
    doctorAvatar: "?",
    doctorColor: "#6B7280",
    doctorBg: "#F3F4F6",
    status: getPatientStatus(p),
  };
}

// ============================================================
// SHARED SUB-COMPONENTS (used by both list & grid views)
// ============================================================

// 1. Avatar
const Avatar = ({ text, color, bg }: { text: string; color: string; bg: string }) => (
  <div className="flex items-center justify-center w-7 h-7 rounded-xl flex-shrink-0 hms-avatar-text" style={{ backgroundColor: bg, color: color }}>
    {text}
  </div>
);

// 2. Rows Per Page Select with infinite scroll option
function RowsPerPageSelect({
  value,
  onChange,
  onInfiniteScroll,
  showInfiniteScroll = true,
  options = [12],
}: {
  value: number;
  onChange: (val: number) => void;
  onInfiniteScroll?: () => void;
  showInfiniteScroll?: boolean;
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

      <div className={`absolute right-0 top-full mt-1 w-16 bg-white border border-[#E5E7EB] rounded-md shadow-lg overflow-hidden z-20 transition-all duration-150 ${
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
        {showInfiniteScroll && (
          <>
            <div className="border-t border-[#E5E7EB]" />
            <button
              type="button"
              onClick={() => { onInfiniteScroll?.(); setOpen(false); }}
              className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs font-semibold text-left text-[#374151] hover:bg-[#F2F4F6] transition-colors"
            >
              <Infinity className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// GRID-VIEW SUB-COMPONENTS
// ============================================================

// 3. Photo avatar with fallback
const PatientPhoto = ({ photo, name }: { photo: string; name: string }) => (
  <div className="w-16 h-16 rounded-full overflow-hidden bg-[#E5E7EB] flex items-center justify-center flex-shrink-0">
    {photo ? (
      <img src={photo} alt={name} className="w-full h-full object-cover" />
    ) : (
      <User className="w-8 h-8 text-[#B0B4BB]" strokeWidth={1.5} />
    )}
  </div>
);

// 4. Three-dot card menu
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

// ============================================================
// MAIN COMPONENT (merged list + grid views)
// ============================================================
export default function PatientsManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Real patients fetched from the backend. No dummy fallback — an
  // empty/failed fetch just shows an empty state.
  const [realPatients, setRealPatients] = useState<PatientRecord[] | null>(null);
  const [isPatientsLoading, setIsPatientsLoading] = useState(true);

  useEffect(() => {
    patientApi
      .getAll()
      .then((res) => {
        const patients = res.data?.data?.patients || [];
        setRealPatients(patients);
        if (patients.length === 0) {
          toast({
            title: "No patient records found",
            description: "The patients API returned no records.",
          });
        }
      })
      .catch((err) => {
        console.error("[Patients Page] Error:", err);
        toast({
          title: "Failed to load patients",
          description: "Couldn't reach the patients API.",
          variant: "destructive",
        });
      })
      .finally(() => {
        setIsPatientsLoading(false);
      });
  }, []);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Date selection
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Grid-only: infinite scroll
  const [infiniteScroll, setInfiniteScroll] = useState(false);
  const [visibleCount, setVisibleCount] = useState(rowsPerPage);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // List-only: sorting
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Navigation helpers
  const handleAddDoctor = () => {
    navigate('/patients/add');
  };

  const handleViewToggle = (mode: "list" | "grid") => {
    setViewMode(mode);
    setCurrentPage(1);
    setInfiniteScroll(false);
    handleClearFilter();
  };

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

  // ---- FILTER FIELDS ----
  // (a) List view filters
  const listFilterFields: FilterField[] = [
    { id: "name", label: "Patient Name", type: "text", placeholder: "Search by name" },
    {
      id: "id",
      label: "Patient ID",
      type: "combobox",
      placeholder: "Search ID",
      options: (realPatients ?? []).map((p) => ({ label: p.patient_id, value: p.patient_id })),
    },
    { id: "diagnose", label: "Diagnosis", type: "text", placeholder: "Search diagnosis" },
    { id: "doctor", label: "Assigned Doctor", type: "text", placeholder: "Search doctor" },
    { id: "status", label: "Status", type: "multiselect", options: [
      { label: "Active", value: "Active" },
      { label: "Inactive", value: "Inactive" },
    ]},
  ];

  // (b) Grid view filters
  const gridFilterFields: FilterField[] = [
    { id: "name", label: "Patient Name", type: "text", placeholder: "Search by name" },
    {
      id: "id",
      label: "Patient ID",
      type: "combobox",
      placeholder: "Search ID",
      options: (realPatients ?? []).map((p) => ({ label: p.patient_id, value: p.patient_id })),
    },
    { id: "bloodGroup", label: "Blood Group", type: "text", placeholder: "Search blood group" },
    { id: "status", label: "Status", type: "multiselect", options: [
      { label: "Active", value: "Active" },
      { label: "Inactive", value: "Inactive" },
    ]},
  ];

  const patientFilterFields = viewMode === "grid" ? gridFilterFields : listFilterFields;

  // ---- SEARCH & FILTER ----
  const searchableFields = useMemo(
    () => viewMode === "grid"
      ? ["name", "id", "mobile", "bloodGroup", "status", "age", "gender"]
      : ["name", "id", "mobile", "diagnose", "doctor", "status", "age", "gender"],
    [viewMode],
  );

  const filteredData = useMemo(() => {
    const rawData: Record<string, string | number>[] = !realPatients
      ? []
      : viewMode === "grid"
        ? (realPatients.map(mapToGridPatient) as unknown as Record<string, string | number>[])
        : (realPatients.map(mapToListPatient) as unknown as Record<string, string | number>[]);
    let result = rawData;

    if (searchQuery) {
      result = result.filter((item) =>
        searchableFields.some((field) =>
          String(item[field] ?? "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
        )
      );
    }

    result = filterDataByValues(result, appliedValues);

    return result;
  }, [searchQuery, searchableFields, appliedValues, viewMode, realPatients]);

  // ---- SORTING (list only) ----
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedData = useMemo(() => {
    if (viewMode !== "list") return filteredData;
    return [...filteredData].sort((a, b) => {
      const aValue = String(a[sortField] ?? "").toLowerCase();
      const bValue = String(b[sortField] ?? "").toLowerCase();
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortDirection, viewMode]);

  const displayData = viewMode === "list" ? sortedData : filteredData;

  // ---- PAGINATION ----
  const totalRecords = displayData.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRows = displayData.slice(startIndex, endIndex);
  const visibleStart = totalRecords === 0 ? 0 : startIndex + 1;
  const visibleEnd = Math.min(endIndex, totalRecords);

  // ---- INFINITE SCROLL (grid only) ----
  useEffect(() => {
    if (!infiniteScroll || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && visibleCount < filteredData.length) {
          setVisibleCount(Math.min(visibleCount + rowsPerPage, filteredData.length));
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [infiniteScroll, visibleCount, filteredData.length, rowsPerPage]);

  useEffect(() => {
    if (infiniteScroll) {
      setVisibleCount(rowsPerPage);
    }
  }, [searchQuery, appliedValues]);

  const displayCards = infiniteScroll
    ? filteredData.slice(0, visibleCount)
    : currentRows;

  // ---- ACTION HANDLERS ----
  const handleView = (id: string) => navigate(`/patients/view/${id}`);
  const handleEdit = (id: string) => navigate(`/patients/edit/${id}`);
  const handleDelete = (id: string) => alert(`Delete logic for patient ${id}`);
  const handleSchedule = (id: string) => navigate(`/patients/schedule/${id}`);

  return (
    <div className="flex w-full font-[Manrope,sans-serif] bg-[#F7F9FB] min-h-screen">
      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex flex-col gap-6">

          {/* ==================== HEADER ==================== */}
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="hms-heading">Patients management</h1>
              <p className="hms-subheading">Real-time performance across all branches.</p>
            </div>
<div className="flex items-center gap-3">
    <ExportReport />
    <button
                onClick={handleAddDoctor}
                className="flex items-center gap-2 px-4 py-2 bg-[#004785] rounded-lg text-white text-xs font-semibold shadow-sm hover:bg-[#003a6b] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add new Patient
              </button>
            </div>
          </div>

          {/* ==================== MAIN CARD ==================== */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col min-h-[500px] transition-all duration-300 hover:shadow-md">

            {/* ==================== TOOLBAR ==================== */}
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 border-r border-[#E5E7EB] pr-4">
                  <span className="text-[#191C1E] text-sm font-bold">{viewMode === "grid" ? "Grid View" : "List View"}</span>
                  <span className="bg-[#E6F0FF] text-[#00488D] px-2.5 py-0.5 rounded-full text-[10px] font-semibold">
                    Total Patients : {totalRecords}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Search Box */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="pl-8 pr-3 py-1.5 bg-[#F2F4F6] text-xs text-[#6B7280] placeholder:text-[#6B7280] outline-none w-[150px] sm:w-[200px] rounded-md transition-all duration-200 focus:w-[200px] sm:focus:w-[250px]"
                  />
                  <svg className="absolute left-2 top-1/2 -translate-y-1/2" width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M11.0667 11.5713L6.86667 7.3713C6.53333 7.638 6.15 7.8491 5.71667 8.0046C5.28333 8.1602 4.82222 8.238 4.33333 8.238C3.12222 8.238 2.09722 7.8185 1.25833 6.9796C0.419444 6.1407 0 5.1157 0 3.90462C0 2.69351.419444 1.66851 1.25833.82962C2.09722-.00927 3.12222-.42871 4.33333-.42871C5.54444-.42871 6.56944-.00927 7.40833.82962C8.24722 1.66851 8.66667 2.69351 8.66667 3.90462C8.66667 4.3935 8.58889 4.8546 8.43333 5.288C8.27778 5.7213 8.06667 6.1046 7.8 6.438L12 10.638L11.0667 11.5713ZM4.33333 6.9046C5.16667 6.9046 5.875 6.613 6.45833 6.0296C7.04167 5.4463 7.33333 4.738 7.33333 3.90462C7.33333 3.07129 7.04167 2.36296 6.45833 1.77962C5.875 1.19629 5.16667.90462 4.33333.90462C3.5.90462 2.79167 1.19629 2.20833 1.77962C1.625 2.36296 1.33333 3.07129 1.33333 3.90462C1.33333 4.738 1.625 5.4463 2.20833 6.0296C2.79167 6.613 3.5 6.9046 4.33333 6.9046Z" fill="#424752"/>
                  </svg>
                </div>

                {/* View Mode Toggle */}
                <div className="flex border border-[#E5E7EB] rounded-md overflow-hidden bg-[#F2F4F6] p-0.5">
                  <button
                    onClick={() => handleViewToggle("list")}
                    className={`p-1.5 rounded ${viewMode === "list" ? "bg-white shadow-sm" : "text-[#6B7280]"}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleViewToggle("grid")}
                    className={`p-1.5 rounded ${viewMode === "grid" ? "bg-white shadow-sm" : "text-[#6B7280]"}`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
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
                  fields={patientFilterFields}
                  values={filterValues}
                  onChange={handleFilterChange}
                  onApply={handleApplyFilter}
                  onClear={handleClearFilter}
                  open={isFilterOpen}
                  onOpenChange={setIsFilterOpen}
                />
              </div>
            </div>

            {/* ================================================================ */}
            {/* BODY: LIST VIEW (sortable table with diagnose/doctor columns)   */}
            {/* ================================================================ */}
            {isPatientsLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#6B7280] text-sm">
                <Loader2 size={24} className="animate-spin text-[#00488D]" />
                Loading patients...
              </div>
            ) : viewMode === "list" ? (
              <div className="overflow-x-auto flex-1">
                <table className="w-full min-w-[800px]">
                  <thead className="hms-columnHeading-style">
                    <tr className="bg-[rgba(242,244,246,0.40)]">
                      {["Name", "Age/Gender", "Mobile", "Diagnose", "Assigned Doctor", "Status", "Actions"].map((header, idx) => {
                        const sortKey = header.toLowerCase().replace(/[ /]/g, '');
                        const isSorted = sortField === sortKey;
                        return (
                          <th
                            key={header}
                            className={`px-5 py-3 hms-table-header text-left ${idx === 0 ? 'pl-8' : ''}`}
                          >
                            <div className="flex items-center gap-1 cursor-pointer select-none" onClick={sortKey !== 'actions' ? () => handleSort(sortKey) : undefined}>
                              <span>{header}</span>
                              {sortKey !== 'actions' && (
                                <span className="inline-flex h-3 w-3 items-center justify-center text-[7px] shrink-0">
                                  {isSorted ? (sortDirection === "asc" ? "\u2191" : "\u2193") : "\u2195"}
                                </span>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {currentRows.length > 0 ? (
                      currentRows.map((patient, index) => (
                        <tr key={String(patient.id) + index} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F7F9FB] transition-colors group">
                          {/* Name & ID */}
                          <td className="px-5 py-4 pl-8">
                            <div className="flex items-center gap-3">
                              <Avatar text={String(patient.name)[0]} color="#00488D" bg="#D6E3FF" />
                              <div>
                                <p className="hms-name-text">{String(patient.name)}</p>
                                <p className="hms-id-text">{String(patient.id)}</p>
                              </div>
                            </div>
                          </td>

                          {/* Age/Gender */}
                          <td className="px-5 py-4 text-[#191C1E] hms-content-text">
                            {patient.age} / {String(patient.gender)}
                          </td>

                          {/* Mobile */}
                          <td className="px-5 py-4 text-[#191C1E] hms-content-text">
                            {String(patient.mobile)}
                          </td>

                          {/* Diagnose */}
                          <td className="px-5 py-4">
                            <span
                              className="px-3 py-1 rounded-full text-[10px] font-bold uppercase"
                              style={{
                                backgroundColor: String(patient.diagnoseBg ?? "#F3F4F6"),
                                color: String(patient.diagnoseColor ?? "#6B7280"),
                              }}
                            >
                              {String(patient.diagnose ?? "")}
                            </span>
                          </td>

                          {/* Assigned Doctor */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar
                                text={String(patient.doctorAvatar ?? "?")}
                                color={String(patient.doctorColor ?? "#00488D")}
                                bg={String(patient.doctorBg ?? "#D6E3FF")}
                              />
                              <div>
                                <p className="hms-name-text">{String(patient.doctor ?? "")}</p>
                                <p className="hms-id-text">{String(patient.doctorId ?? "")}</p>
                              </div>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{
                              background: String(patient.status) === "Active" ? "#F0FDF4" : "#F3F4F6",
                              color: String(patient.status) === "Active" ? "#16A34A" : "#6B7280",
                            }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{
                                background: String(patient.status) === "Active" ? "#22C55E" : "#9CA3AF",
                              }} />
                              {String(patient.status)}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleView(String(patient.id))} title="View" className="p-1.5 rounded transition-colors duration-200 hover:bg-none group">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200 stroke-[#1B1D20] hover:stroke-slate-500">
                                  <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </button>
                              <button onClick={() => handleEdit(String(patient.id))} title="Edit" className="p-1.5 rounded transition-colors duration-200 hover:bg-blue-50 group">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.36" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200 stroke-[#003EA8] hover:stroke-[#5E87CF]">
                                  <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
                                </svg>
                              </button>
                              <button onClick={() => handleDelete(String(patient.id))} title="Delete" className="p-1.5 rounded transition-colors duration-200 hover:bg-red-50 group">
                                <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200 stroke-[#6B7280] hover:stroke-red-600">
                                  <path d="M10 11v6"/>
                                  <path d="M14 11v6"/>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                                  <path d="M3 6h18"/>
                                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-5 py-10 text-center text-[#6B7280] text-sm">
                          No patients found matching the current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* ================================================================ */
              /* BODY: GRID VIEW (cards with photo, blood group, infinite scroll) */
              /* ================================================================ */
              <div className={`flex-1 p-5 hide-scrollbar max-h-[450px] ${infiniteScroll ? " overflow-y-auto max-h-[500px]":"" }`}>
                {displayCards.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {displayCards.map((patient: any) => (
                      <div
                        key={patient.id}
                        className="relative flex items-start gap-4 p-4 border border-[#E5E7EB] rounded-xl hover:shadow-md hover:border-[#D6E3FF] transition-all duration-200 group"
                      >
                        <PatientPhoto photo={patient.photo} name={patient.name} />

                        <div className="flex-1 min-w-0">
                          <p className="hms-name-text truncate">{patient.name}</p>
                          <p className="hms-id-text">{patient.id}</p>
                          <p className="hms-content-text text-[#191C1E] mt-1">
                            {patient.age}/{patient.gender}
                          </p>
                          <p className="hms-content-text text-[#191C1E]">{patient.mobile}</p>
                          <p className="hms-content-text text-[#191C1E] font-semibold">{patient.bloodGroup}</p>
                        </div>

                        <div className="absolute top-3 right-3">
                          <CardMenu
                            onView={() => handleView(patient.id)}
                            onEdit={() => handleEdit(patient.id)}
                            onDelete={() => handleDelete(patient.id)}
                          />
                        </div>

                        <button
                          onClick={() => handleSchedule(patient.id)}
                          title="Schedule"
                          className="absolute bottom-3 right-3 w-6 h-6 flex items-center justify-center rounded-md border border-[#E5E7EB] bg-white hover:bg-[#F2F4F6] transition-colors"
                        >
                          <CalendarCheck className="w-3.5 h-3.5 text-[#00488D]" />
                        </button>
                      </div>
                    ))}
                    {infiniteScroll && (
                      <div ref={sentinelRef} className="col-span-full flex justify-center py-4">
                        {visibleCount < filteredData.length ? (
                          <span className="text-xs text-[#6B7280]">Loading more...</span>
                        ) : (
                          <span className="text-xs text-[#6B7280]">All patients loaded</span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full py-16 text-center text-[#6B7280] text-sm">
                    No patients found matching the current filters.
                  </div>
                )}
              </div>
            )}

            {/* ==================== PAGINATION ==================== */}
            <div className="mt-auto shrink-0 flex flex-wrap items-center justify-between px-5 py-3 border-t border-[rgba(194,198,212,0.10)] bg-[rgba(242,244,246,0.95)] backdrop-blur gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-[#424752] tracking-[0.8px] capitalize">
                  {infiniteScroll
                    ? `Showing ${Math.min(visibleCount, totalRecords)} of ${totalRecords} patients`
                    : `Showing ${visibleStart} to ${visibleEnd} of ${totalRecords} patients`}
                </span>
                <RowsPerPageSelect
                  value={rowsPerPage}
                  onChange={(val) => { setRowsPerPage(val); setCurrentPage(1); }}
                  onInfiniteScroll={() => { setInfiniteScroll(true); setVisibleCount(rowsPerPage); }}
                  showInfiniteScroll={viewMode === "grid"}
                  options={viewMode === "grid" ? [10, 12, 20, 50] : [5, 10, 20]}
                />
              </div>

              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                  className="w-6 h-6 flex items-center justify-center rounded-md disabled:opacity-30 hover:bg-[#E5E7EB] transition-colors"
                >
                  <svg width="5" height="8" viewBox="0 0 5 8" fill="none">
                    <path d="M4 8L0 4L4 0L4.93333.933333L1.86667 4L4.93333 7.06667L4 8Z" fill="#424752"/>
                  </svg>
                </button>

                {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => {
                  return (
                    <button
                      key={index}
                      onClick={() => setCurrentPage(index + 1)}
                      className={`w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-semibold transition-colors ${
                        currentPage === index + 1
                          ? "bg-[#004785] text-white"
                          : "text-[#1D1A1A] hover:bg-[#F2F4F6]"
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
                {totalPages > 5 && <span className="text-[#6B7280] text-xs">...</span>}

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  className="w-6 h-6 flex items-center justify-center rounded-md disabled:opacity-30 hover:bg-[#E5E7EB] transition-colors"
                >
                  <svg width="5" height="8" viewBox="0 0 5 8" fill="none">
                    <path d="M1 8L5 4L1 0L.0666656.933333L3.13333 4L.0666656 7.06667L1 8Z" fill="#424752"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
