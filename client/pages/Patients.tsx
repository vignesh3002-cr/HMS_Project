import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from 'react-router-dom';
import { 
  ChevronDown, 
  Check, 
  FileText, 
  List,
  LayoutGrid,
  Plus
} from "lucide-react";

// Assuming these components exist based on your provided reference
import { FilterPopover, useFilterPanel } from "@/components/Filter";
import type { FilterField } from "@/components/Filter/types";
import { filterDataByValues } from "@/components/Filter/utils";

// --- Mock Data (Based on the screenshot) ---
const patientsData = [
  {
    id: "PAT-0025",
    name: "James wilson",
    age: 37,
    gender: "M",
    mobile: "+91 91234 56789",
    diagnose: "Cancer",
    diagnoseBg: "#FEF3C7",
    diagnoseColor: "#D97706",
    doctor: "Dr. sarah Johnson",
    doctorId: "DOC-0034",
    doctorAvatar: "SJ",
    doctorColor: "#00488D",
    doctorBg: "#D6E3FF",
    status: "Active",
  },
  {
    id: "PAT-0002",
    name: "Madhu",
    age: 33,
    gender: "F",
    mobile: "+91 93456 78901",
    diagnose: "Diabetics",
    diagnoseBg: "#D1FAE5",
    diagnoseColor: "#059669",
    doctor: "Dr. William",
    doctorId: "DOC-0035",
    doctorAvatar: "W",
    doctorColor: "#00488D",
    doctorBg: "#D6E3FF",
    status: "Inactive",
  },
  {
    id: "PAT-0003",
    name: "James",
    age: 30,
    gender: "M",
    mobile: "+91 93456 78901",
    diagnose: "Asthma",
    diagnoseBg: "#FFE4E6",
    diagnoseColor: "#BE123C",
    doctor: "Dr. Wilson",
    doctorId: "DOC-0038",
    doctorAvatar: "W",
    doctorColor: "#00488D",
    doctorBg: "#D6E3FF",
    status: "Active",
  },
  {
    id: "PAT-0004",
    name: "Ramesh",
    age: 30,
    gender: "M",
    mobile: "+91 91234 56789",
    diagnose: "Asthma",
    diagnoseBg: "#FFE4E6",
    diagnoseColor: "#BE123C",
    doctor: "Dr. Baskar",
    doctorId: "DOC-0039",
    doctorAvatar: "B",
    doctorColor: "#00488D",
    doctorBg: "#D6E3FF",
    status: "Inactive",
  },
  {
    id: "PAT-0005",
    name: "Priyanka",
    age: 30,
    gender: "M",
    mobile: "+91 92345 67890",
    diagnose: "Cancer",
    diagnoseBg: "#FEF3C7",
    diagnoseColor: "#D97706",
    doctor: "Dr. Ramesh",
    doctorId: "DOC-0040",
    doctorAvatar: "R",
    doctorColor: "#00488D",
    doctorBg: "#D6E3FF",
    status: "Active",
  },
  {
    id: "PAT-0006",
    name: "Baskar",
    age: 30,
    gender: "M",
    mobile: "+91 93456 78901",
    diagnose: "Cancer",
    diagnoseBg: "#FEF3C7",
    diagnoseColor: "#D97706",
    doctor: "Dr. James wilson",
    doctorId: "DOC-0041",
    doctorAvatar: "JW",
    doctorColor: "#00488D",
    doctorBg: "#D6E3FF",
    status: "Active",
  },
  {
    id: "PAT-0007",
    name: "Kavitha",
    age: 28,
    gender: "F",
    mobile: "+91 98765 43210",
    diagnose: "Cancer",
    diagnoseBg: "#FEF3C7",
    diagnoseColor: "#D97706",
    doctor: "Dr. Ramesh",
    doctorId: "DOC-0040",
    doctorAvatar: "R",
    doctorColor: "#00488D",
    doctorBg: "#D6E3FF",
    status: "Inactive",
  },
] as const;

// --- Sub-components ---

// 1. Avatar Component
const Avatar = ({ text, color, bg }: { text: string; color: string; bg: string }) => (
  <div className="flex items-center justify-center w-7 h-7 rounded-xl flex-shrink-0 hms-avatar-text" style={{ backgroundColor: bg, color: color }}>
    {text}
  </div>
);

// 2. Rows Per Page Select (Reused from Dashboard)
function RowsPerPageSelect({ value, onChange, options = [5, 10, 20] }: { value: number; onChange: (val: number) => void; options?: number[] }) {
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
      </div>
    </div>
  );
}

// --- Main Page Component ---
export default function PatientsManagement() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list"); // Currently unused, just a visual placeholder
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Sort state
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

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

  // --- Filter Fields Configuration ---
  const patientFilterFields: FilterField[] = [
    { id: "name", label: "Patient Name", type: "text", placeholder: "Search by name" },
    { id: "id", label: "Patient ID", type: "text", placeholder: "Enter ID" },
    { id: "diagnose", label: "Diagnosis", type: "text", placeholder: "Search diagnosis" },
    { id: "doctor", label: "Assigned Doctor", type: "text", placeholder: "Search doctor" },
    { id: "status", label: "Status", type: "multiselect", options: [
      { label: "Active", value: "Active" },
      { label: "Inactive", value: "Inactive" },
    ]},
  ];

  // --- Sorting Logic ---
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // --- Filtering Logic ---
  const filteredData = useMemo(() => {
    let result = [...patientsData];

    // Search Filter
    if (searchQuery) {
      result = result.filter((item) =>
        [item.name, item.id, item.diagnose, item.doctor, item.status]
          .join(" ")
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      );
    }

    // Advanced Filters
    result = filterDataByValues(result, appliedValues);

    return result;
  }, [searchQuery, appliedValues]);

  // --- Sorting Data ---
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const aValue = String(a[sortField as keyof typeof a] ?? "").toLowerCase();
      const bValue = String(b[sortField as keyof typeof b] ?? "").toLowerCase();
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortDirection]);

  // --- Pagination Calculation ---
  const totalRecords = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRows = sortedData.slice(startIndex, endIndex);
  const visibleStart = totalRecords === 0 ? 0 : startIndex + 1;
  const visibleEnd = Math.min(endIndex, totalRecords);

  // --- Action Handlers ---
  const handleView = (id: string) => navigate(`/patients/view/${id}`);
  const handleEdit = (id: string) => navigate(`/patients/edit/${id}`);
  const handleDelete = (id: string) => alert(`Delete logic for patient ${id}`);

  return (
    <div className="flex flex-col w-full font-[Manrope,sans-serif] bg-[#F7F9FB] min-h-screen p-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="hms-heading">Patients management</h1>
          <p className="hms-subheading">Manage patient full data</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-[#E5E7EB] bg-white rounded-lg text-[#424752] text-xs font-semibold shadow-sm hover:bg-[#F2F4F6] transition-colors">
            <FileText className="w-4 h-4" />
            Export report
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#004785] rounded-lg text-white text-xs font-semibold shadow-sm hover:bg-[#003a6b] transition-colors">
            <Plus className="w-4 h-4" />
            Add new Patient
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col min-h-[500px]">
        
        {/* Toolbar / Filter Bar */}
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 border-r border-[#E5E7EB] pr-4">
              <span className="text-[#191C1E] text-sm font-bold">List View</span>
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
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded ${viewMode === "list" ? "bg-white shadow-sm" : "text-[#6B7280]"}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded ${viewMode === "grid" ? "bg-white shadow-sm" : "text-[#6B7280]"}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center">
              <button className="flex items-center justify-center w-[25px] h-[27px] border border-[#E5E7EB] rounded-l-lg transition-colors duration-150 hover:bg-[#F2F4F6]">
                <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
                  <path d="M5 1L1 5L5 9" stroke="black" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="flex items-center justify-center h-[27px] w-[70px] px-2 border-t border-b border-[#E5E7EB] bg-white text-xs font-medium transition-colors duration-150 hover:bg-[#F2F4F6]">
                Today
              </button>
              <button className="flex items-center justify-center w-[25px] h-[27px] border border-[#E5E7EB] rounded-r-lg transition-colors duration-150 hover:bg-[#F2F4F6]">
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

        {/* Table Body */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full min-w-[800px] border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
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
                            {isSorted ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
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
                  <tr key={patient.id + index} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F2F4F6] transition-colors group">
                    {/* Name & ID */}
                    <td className="px-5 py-4 pl-8">
                      <div className="flex items-center gap-3">
                        <Avatar text={patient.name[0]} color="#00488D" bg="#D6E3FF" />
                        <div>
                          <p className="hms-name-text">{patient.name}</p>
                          <p className="hms-id-text">{patient.id}</p>
                        </div>
                      </div>
                    </td>
                    
                    {/* Age/Gender */}
                    <td className="px-5 py-4 text-[#191C1E] hms-content-text">
                      {patient.age} / {patient.gender}
                    </td>
                    
                    {/* Mobile */}
                    <td className="px-5 py-4 text-[#191C1E] hms-content-text">
                      {patient.mobile}
                    </td>
                    
                    {/* Diagnose */}
                    <td className="px-5 py-4">
                      <span 
                        className="px-3 py-1 rounded-full text-[10px] font-bold uppercase"
                        style={{ backgroundColor: patient.diagnoseBg, color: patient.diagnoseColor }}
                      >
                        {patient.diagnose}
                      </span>
                    </td>
                    
                    {/* Assigned Doctor */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar text={patient.doctorAvatar} color={patient.doctorColor} bg={patient.doctorBg} />
                        <div>
                          <p className="hms-name-text">{patient.doctor}</p>
                          <p className="hms-id-text">{patient.doctorId}</p>
                        </div>
                      </div>
                    </td>
                    
                    {/* Status */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{
                        background: patient.status === "Active" ? "#F0FDF4" : "#F3F4F6",
                        color: patient.status === "Active" ? "#16A34A" : "#6B7280",
                      }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{
                          background: patient.status === "Active" ? "#22C55E" : "#9CA3AF",
                        }} />
                        {patient.status}
                      </span>
                    </td>
                    
                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleView(patient.id)} title="View" className="p-1.5 rounded transition-colors duration-200 hover:bg-none group">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200 stroke-[#1B1D20] group-hover:stroke-[#505F76]">
                            <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                        <button onClick={() => handleEdit(patient.id)} title="Edit" className="p-1.5 rounded transition-colors duration-200 hover:bg-blue-50 group">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.36" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200 stroke-[#003EA8] group-hover:stroke-[#5E87CF]">
                            <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(patient.id)} title="Delete" className="p-1.5 rounded transition-colors duration-200 hover:bg-red-50 group">
                          <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200 stroke-[#6B7280] group-hover:stroke-red-600">
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

        {/* Pagination Section */}
        <div className="mt-auto shrink-0 flex flex-wrap items-center justify-between px-5 py-3 border-t border-[rgba(194,198,212,0.10)] bg-[rgba(242,244,246,0.95)] backdrop-blur gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-[#424752] tracking-[0.8px] capitalize">
              Showing {visibleStart}-{visibleEnd} of {totalRecords} Patients
            </span>
            <RowsPerPageSelect
              value={rowsPerPage}
              onChange={(val) => { setRowsPerPage(val); setCurrentPage(1); }}
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
              // Logic to show pages around current, simple version just maps all
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

      {/* FAB Action (Optional, based on screenshot) */}

      <button className="fixed bottom-6 right-6 w-12 h-12 bg-[#00488D] rounded-2xl flex items-center justify-center shadow-lg z-10 hover:bg-[#003a6b] transition-colors">
        <Plus className="w-5 h-5 text-white" />
      </button>

    </div>
  );
}