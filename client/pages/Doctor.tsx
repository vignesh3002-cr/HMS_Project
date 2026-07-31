import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import CalendarPicker from "@/components/hms/Calender";
import { format, isToday, isTomorrow, isYesterday, addDays, subDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Search,
  List,
  LayoutGrid,
  Plus,
  MoreVertical,
  User,
  Loader2,
} from "lucide-react";
import HmsTable from "@/components/hms/HmsTable";

import { FilterPopover, useFilterPanel } from "@/components/Filter";
import type { FilterField } from "@/components/Filter/types";
import { filterDataByValues } from "@/components/Filter/utils";
import ExportReport from "@/components/ui/ExportReport";
import { useToast } from "@/hooks/use-toast";
import { employeeApi, type EmployeeRecord } from "@/api/employee.api";
import { appointmentApi } from "@/api/appointment.api";
import { RefreshButton } from "@/components/hms/RefreshButton";
import { StatusBadge } from "@/components/hms/StatusBadge";
import { useBranchFilter } from "@/context/BranchFilterContext";

// ============================================================
// SHARED SUB-COMPONENTS
// ============================================================

// Photo avatar with fallback (grid only)
const DoctorPhoto = ({ photo, name }: { photo: string; name: string }) => (
  <div className="w-16 h-16 rounded-full overflow-hidden bg-[#E5E7EB] flex items-center justify-center flex-shrink-0">
    {photo ? (
      <img src={photo} alt={name} className="w-full h-full object-cover" />
    ) : (
      <User className="w-8 h-8 text-[#B0B4BB]" strokeWidth={1.5} />
    )}
  </div>
);

// Doctor slot-booking progress bar (list view, replaces qualification column)
// Green while there's still availability; red once booked count reaches
// (or would exceed) the doctor's total slot capacity for the day.
function getSlotBand(percentage: number) {
  if (percentage >= 100) return { color: "#EF4444", label: "Fully booked" };
  return { color: "#16A34A", label: "Available" };
}

function SlotProgress({ booked, total }: { booked: number; total: number }) {
  const percentage = total > 0 ? Math.min(100, Math.round((booked / total) * 100)) : 0;
  const band = total === 0 ? { color: "#6B7280", label: "No slots" } : getSlotBand(percentage);

  return (
    <div className="min-w-[140px]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold">
          <span style={{ color: band.color }}>{booked}</span>
          <span className="text-[#9CA3AF]">/{total}</span>
        </span>
        <span className="text-xs font-bold" style={{ color: band.color }}>{band.label}</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full rounded-full bg-[#E5E7EB] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${percentage}%`, background: band.color }}
        />
      </div>
    </div>
  );
}

// Three-dot card menu (grid only)
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

// Map EmployeeRecord (from API) to the row shape this page renders
const AVATAR_PALETTE = [
  { avatarColor: "#00488D", initBg: "#D6E3FF" },
  { avatarColor: "#7B3200", initBg: "#FFDBCB" },
  { avatarColor: "#00C896", initBg: "rgba(0,200,150,0.12)" },
  { avatarColor: "#475C7F", initBg: "#E6E8EA" },
];

function getInitials(name: string): string {
  const words = name.replace(/^Dr\.?\s*/i, "").trim().split(/\s+/);
  return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

function formatBranch(branch: EmployeeRecord["branch"]): string {
  if (!branch?.branch_name) return "\u2014";
  return branch.branch_area ? `${branch.branch_name} (${branch.branch_area})` : branch.branch_name;
}

function mapEmployeeToDoctorData(emp: EmployeeRecord, index: number) {
  const palette = AVATAR_PALETTE[index % AVATAR_PALETTE.length];
  const fullName = `${emp.first_name} ${emp.middle_name ? emp.middle_name + " " : ""}${emp.last_name}`;
  return {
    id: emp.employee_id,
    name: fullName,
    avatar: getInitials(fullName),
    avatarColor: palette.avatarColor,
    initBg: palette.initBg,
    dept: emp.department_master?.department_name || emp.specialization || "Unassigned",

    deptBg: "#E6E8EA",
    deptColor: "#475C7F",
    branch: formatBranch(emp.branch),
    status: (emp.emp_status === true || emp.user_table?.user_status === 1) ? "Active" : "Leave",
    qualification: emp.qualification || "—",
    mobile: emp.mobile_no || "—",
    photo: "",
  };
}

// ============================================================
// MAIN COMPONENT (merged list + grid views)
// ============================================================
export default function Doctor() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedBranchId, isAllBranches } = useBranchFilter();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

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

  const handleAddDoctor = () => {
    navigate("/STAFF/add?role=Doctor");
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

  const doctorFilterFields: FilterField[] = [
    { id: "name", label: "Doctor Name", type: "text", placeholder: "Search by name" },
    { id: "id", label: "Doctor ID", type: "text", placeholder: "Enter ID" },
    { id: "dept", label: "Department", type: "multiselect", options: [
      { label: "Cardiology", value: "Cardiology" },
      { label: "Orthopedics", value: "Orthopedics" },
      { label: "Neurology", value: "Neurology" },
      { label: "Pediatrics", value: "Pediatrics" },
      { label: "Oncology", value: "Oncology" },
      { label: "Pediatrician", value: "Pediatrician" },
    ]},
    { id: "branch", label: "Branch", type: "multiselect", options: [
      { label: "Apollo Hospital (Tambaram)", value: "Apollo Hospital (Tambaram)" },
      { label: "Government Hospital (Saidapet)", value: "Government Hospital (Saidapet)" },
      { label: "Central Hospital (Guindy)", value: "Central Hospital (Guindy)" },
      { label: "Global Hospital (Triplicane)", value: "Global Hospital (Triplicane)" },
      { label: "Central Hospital (Tambaram)", value: "Central Hospital (Tambaram)" },
    ]},
    { id: "status", label: "Status", type: "multiselect", options: [
      { label: "Active", value: "Active" },
      { label: "Leave", value: "Leave" },
    ]},
  ];

  // Real doctors fetched from the backend
  const [realDoctors, setRealDoctors] = useState<EmployeeRecord[] | null>(null);
  const [isDoctorsLoading, setIsDoctorsLoading] = useState(true);

  // Per-doctor slot booking summary for the selected date (list view progress bar)
  const [slotSummaries, setSlotSummaries] = useState<Record<string, { total: number; booked: number }>>({});

  const fetchDoctors = useCallback(async () => {
    setIsDoctorsLoading(true);
    console.log("[Doctor Page] Fetching all employees from employeeApi...");
    try {
      const res = await employeeApi.getAll({
        branchId: isAllBranches ? undefined : selectedBranchId,
        limit: 1000,
      });
      console.log("[Doctor Page] Response:", res.data);
      const allEmployees = res.data?.data?.employees || [];
      const doctors = allEmployees.filter((e) => e.user_table?.role_type === "DOCTOR");
      setRealDoctors(doctors);
      if (doctors.length === 0) {
        toast({
          title: "No doctor records found",
          description: "The employees API returned no doctor records.",
        });
      }
    } catch (err: any) {
      console.error("[Doctor Page] Error:", err);
      console.error("[Doctor Page] Error response:", err.response?.data);
      console.error("[Doctor Page] Error status:", err.response?.status);
      toast({
        title: "Failed to load doctors",
        description: err.response?.data?.message || "Couldn't reach the employees API.",
        variant: "destructive",
      });
    } finally {
      setIsDoctorsLoading(false);
    }
  }, [toast, selectedBranchId, isAllBranches]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  // Fetch each doctor's booked/total slot counts for the selected single day
  // (list view only). Total slots = the doctor's real working-hours
  // availability that day sliced into fixed 20-minute slots (backend-computed).
  const fetchSlotSummaries = useCallback(
    async (doctors: EmployeeRecord[], date: Date, signal: { cancelled: boolean }) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const entries = await Promise.all(
        doctors.map(async (doc) => {
          try {
            const res = await appointmentApi.getDoctorSlotSummary(doc.employee_id, dateStr);
            const data = res.data?.data;
            return [doc.employee_id, { total: data?.total_slots ?? 0, booked: data?.booked_count ?? 0 }] as const;
          } catch {
            return [doc.employee_id, { total: 0, booked: 0 }] as const;
          }
        }),
      );
      if (!signal.cancelled) setSlotSummaries(Object.fromEntries(entries));
    },
    [],
  );

  useEffect(() => {
    if (!realDoctors || realDoctors.length === 0 || viewMode !== "list") return;
    const signal = { cancelled: false };

    fetchSlotSummaries(realDoctors, selectedDate, signal);

    // Keep the booked/total counts live: poll periodically, and refetch as
    // soon as the tab regains focus (e.g. after booking an appointment on
    // another page/tab), instead of only updating on next full page load.
    const intervalId = window.setInterval(() => {
      fetchSlotSummaries(realDoctors, selectedDate, signal);
    }, 15000);

    const handleFocus = () => fetchSlotSummaries(realDoctors, selectedDate, signal);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      signal.cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [realDoctors, selectedDate, viewMode, fetchSlotSummaries]);

  // ---- SEARCH & FILTER ----
  const filteredData = useMemo(() => {
    // Use real data from API if available, otherwise fallback to static data
    const sourceData = realDoctors
      ? realDoctors.map((emp, index) => mapEmployeeToDoctorData(emp, index))
      : [];
    let result: Record<string, string | number>[] = [...sourceData];

    if (searchQuery) {
      result = result.filter((doctor) =>
        ["name", "id", "dept", "branch", "status", "mobile"]
          .map((f) => String(doctor[f] ?? ""))
          .join(" ")
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      );
    }

    result = filterDataByValues(result, appliedValues);

    return result;
  }, [searchQuery, appliedValues, realDoctors]);

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
    return [...filteredData].sort((a, b) => {
      const aValue = String(a[sortField] ?? "").toLowerCase();
      const bValue = String(b[sortField] ?? "").toLowerCase();
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortDirection]);

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

  // Grid view has no page-navigation controls (unlike the list view's
  // HmsTable), so it must show every doctor matching the current
  // search/filters rather than just the first `rowsPerPage` of them.
  const displayCards = infiniteScroll
    ? filteredData.slice(0, visibleCount)
    : filteredData;

  // ---- ACTION HANDLERS ----
  const handleView = (id: number | string) => navigate(`/doctor/view/${id}`);
  const handleEdit = (id: number | string) => navigate(`/doctor/edit/${id}`);
  const handleDelete = (id: number | string) => alert(`Delete logic for doctor ${id}`);

  return (
    <div className="flex w-full font-[Manrope,sans-serif] bg-[#F7F9FB] min-h-screen">
      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex flex-col gap-6">

          {/* ==================== HEADER ==================== */}
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="hms-heading">Doctor management</h1>
              <p className="hms-subheading">Real-time performance across all branches.</p>
            </div>
            <div className="flex items-center gap-3">
              <ExportReport />
              <button
                onClick={handleAddDoctor}
                className="flex items-center gap-2 px-4 py-2 bg-[#004785] rounded-lg text-white text-xs font-semibold shadow-sm hover:bg-[#003a6b] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add new doctor
              </button>
            </div>
          </div>

          {/* ==================== MAIN CARD ==================== */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col transition-all duration-300 hover:shadow-md">

            {/* ==================== TOOLBAR ==================== */}
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 border-r border-[#E5E7EB] pr-4">
                  <span className="text-[#191C1E] text-sm font-bold">{viewMode === "grid" ? "Grid View" : "List View"}</span>
                  <span className="bg-[#E6F0FF] text-[#00488D] px-2.5 py-0.5 rounded-full text-[10px] font-semibold">
                    Total Doctors : {totalRecords}
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
                    className="pl-8 pr-3 py-1.5 bg-[#F2F4F6] text-xs text-[#6B7280] placeholder:text-[#6B7280] outline-none w-[150px] sm:w-[200px] rounded-md transition-all duration-200 focus:rounded-none focus:w-[200px] sm:focus:w-[250px]"
                  />
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#424752]" />
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
                  fields={doctorFilterFields}
                  values={filterValues}
                  onChange={handleFilterChange}
                  onApply={handleApplyFilter}
                  onClear={handleClearFilter}
                  open={isFilterOpen}
                  onOpenChange={setIsFilterOpen}
                />
                <RefreshButton onClick={fetchDoctors} isLoading={isDoctorsLoading} />
              </div>
            </div>

            {/* ================================================================ */}
            {/* BODY: LIST VIEW (table via HmsTable)                            */}
            {/* ================================================================ */}
            {isDoctorsLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#6B7280] text-sm">
                <Loader2 size={24} className="animate-spin text-[#00488D]" />
                Loading doctors...
              </div>
            ) : viewMode === "list" ? (
              <HmsTable
                columns={[
                  { key: "name", label: "Name", render: (r: any) => (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-7 h-7 rounded-xl flex-shrink-0 hms-avatar-text" style={{ background: String(r.initBg), color: String(r.avatarColor) }}>{String(r.avatar)}</div>
                      <div><div className="hms-name-text">{String(r.name)}</div><div className="hms-id-text">{String(r.id)}</div></div>
                    </div>
                  )},
                  { key: "dept", label: "Department", render: (r: any) => (
                    <span className="px-1.5 py-0.5 rounded-sm hms-department-text tracking-[-0.4px] capitalize" style={{ background: String(r.deptBg), color: String(r.deptColor) }}>{String(r.dept)}</span>
                  )},
                  { key: "qualification", label: "Qualification", render: (r: any) => (
                    <span className="text-[#191C1E] hms-content-text leading-4">{String(r.qualification)}</span>
                  )},
                  { key: "mobile", label: "Mobile No", render: (r: any) => (
                    <span className="text-[#191C1E] hms-content-text leading-4">{String(r.mobile)}</span>
                  )},
                  { key: "actions", label: "Actions", sortable: false, className: "w-px", headerClassName: "w-px", render: (r: any) => (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleView(r.id)} title="View" className="p-1.5 rounded transition-colors duration-200 hover:bg-none group">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200 stroke-[#1B1D20] hover:stroke-slate-500">
                          <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      <button onClick={() => handleEdit(r.id)} title="Edit" className="p-1.5 rounded transition-colors duration-200 hover:bg-blue-50 group">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.36" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200 stroke-[#003EA8] hover:stroke-[#5E87CF]">
                          <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(r.id)} title="Delete" className="p-1.5 rounded transition-colors duration-200 hover:bg-red-50 group">
                        <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200 stroke-[#6B7280] hover:stroke-red-600">
                          <path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
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
                emptyMessage="No doctors found matching the current filters."
                rowKey={(r: any, i: number) => String(r.id) + i}
              />
            ) : (
              <>
              
              <div className={`flex-1 p-5 hide-scrollbar max-h-[450px] ${infiniteScroll ? " overflow-y-auto max-h-[500px]" : ""}`}>
                {displayCards.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayCards.map((doctor: any) => (
                      <div
                        key={doctor.id}
                        className="relative flex items-start gap-4 p-4 border border-[#E5E7EB] rounded-xl hover:shadow-md hover:border-[#D6E3FF] transition-all duration-200 group"
                      >
                        <DoctorPhoto photo={doctor.photo} name={doctor.name} />
                        <div className="flex-1 min-w-0">
                          <p
                            onClick={() => handleView(doctor.id)}
                            className="hms-name-text truncate cursor-pointer hover:underline hover:text-[#00488D]"
                          >
                            {doctor.name}
                          </p>
                          <p className="hms-id-text">{doctor.id}</p>
                          <span className="inline-block px-1.5 py-0.5 rounded-sm hms-department-text tracking-[-0.4px] capitalize mt-1" style={{ background: doctor.deptBg, color: doctor.deptColor }}>{doctor.dept}</span>
                          <p className="hms-content-text text-[#191C1E] mt-1.5">
                            <span className="font-semibold">Status</span>{" : "}
                            <span className={doctor.status === "Active" ? "font-bold text-[#16A34A]" : "font-bold text-[#F97316]"}>{doctor.status}</span>
                          </p>
                          <p className="hms-content-text text-[#191C1E] mt-1 truncate">{doctor.branch}</p>
                        </div>
                        <div className="absolute top-3 right-3">
                          <CardMenu onView={() => handleView(doctor.id)} onEdit={() => handleEdit(doctor.id)} onDelete={() => handleDelete(doctor.id)} />
                        </div>
                      </div>
                    ))}
                    {infiniteScroll && (
                      <div ref={sentinelRef} className="col-span-full flex justify-center py-4">
                        {visibleCount < filteredData.length ? (<span className="text-xs text-[#6B7280]">Loading more...</span>) : (<span className="text-xs text-[#6B7280]">All doctors loaded</span>)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full py-16 text-center text-[#6B7280] text-sm">No doctors found matching the current filters.</div>
                )}
              </div>
              <div className="mt-auto shrink-0 flex flex-wrap items-center justify-between px-5 py-3 border-t border-[rgba(194,198,212,0.10)] bg-[rgba(242,244,246,0.95)] backdrop-blur gap-2">
                <span className="text-[10px] font-semibold text-[#424752] tracking-[0.8px] capitalize">
                  {infiniteScroll ? `Showing ${Math.min(visibleCount, totalRecords)} of ${totalRecords} doctors` : `Showing all ${totalRecords} doctors`}
                </span>
              </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
