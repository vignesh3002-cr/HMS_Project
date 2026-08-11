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
  User,
  Loader2,
  MoreVertical,
} from "lucide-react";
import HmsTable from "@/components/hms/HmsTable";
 
import { FilterPopover, useFilterPanel, useDoctorFilters } from "@/components/Filter";
import { filterDataByValues } from "@/components/Filter/utils";
import ExportReport from "@/components/ui/ExportReport";
import { downloadExportCsv, exportErrorMessage } from "@/api/export.api";
import { useToast } from "@/hooks/use-toast";
import { employeeApi, type EmployeeRecord } from "@/api/employee.api";
import { appointmentApi } from "@/api/appointment.api";
import { RefreshButton } from "@/components/hms/RefreshButton";
import { StatusBadge } from "@/components/hms/StatusBadge";
import { DepartmentPill, DepartmentAvatarText } from "@/components/hms/DepartmentBadge";
import { useBranchFilter } from "@/context/BranchFilterContext";
import { usePermission } from "@/context/PermissionContext";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { getUser } from "@/utils/token";
 
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
 
function SlotProgress({ booked, total, loading }: { booked: number; total: number; loading?: boolean }) {
  if (loading) {
    return (
      <div className="min-w-[140px]">
        <div className="flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin text-[#9CA3AF]" />
          <span className="text-xs font-bold text-[#9CA3AF]">Loading...</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full rounded-full bg-[#E5E7EB] overflow-hidden">
          <div className="h-full w-1/3 rounded-full bg-[#D1D5DB] animate-pulse" />
        </div>
      </div>
    );
  }

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
function CardMenu({ onView, onEdit, onDelete, onTransfer }: { onView: () => void; onEdit: () => void; onDelete: () => void; onTransfer: () => void }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { can } = usePermission();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!can("doctor.read") && !can("doctor.update") && !can("doctor.transfer") && !can("employee.delete")) return null;

  return (
    <div className="relative" ref={wrapperRef}>
      <button onClick={() => setOpen((o) => !o)} className="p-1 rounded hover:bg-[#F2F4F6] transition-colors">
        <MoreVertical className="w-4 h-4 text-[#6B7280]" />
      </button>
      <div className={`absolute right-0 top-full mt-1 w-28 bg-white border border-[#E5E7EB] rounded-md shadow-lg overflow-hidden z-20 transition-all duration-150 ${
          open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        {can("doctor.read") && (
          <button onClick={() => { onView(); setOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-medium text-[#374151] hover:bg-[#F2F4F6]">View</button>
        )}
        {can("doctor.update") && (
          <button onClick={() => { onEdit(); setOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-medium text-[#374151] hover:bg-[#F2F4F6]">Edit</button>
        )}
        {can("doctor.transfer") && (
          <button onClick={() => { onTransfer(); setOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-medium text-[#374151] hover:bg-[#F2F4F6]">Transfer</button>
        )}
        {can("employee.delete") && (
          <button onClick={() => { onDelete(); setOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50">Deactivate</button>
        )}
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
    status: (emp.emp_status === true || emp.user_table?.user_status === 0) ? "Active" : "Leave",
    qualification: emp.qualification || "—",
    mobile: emp.mobile_no || "—",
    photo: emp.employee_photo_URL || "",
  };
}
 
// ============================================================
// MAIN COMPONENT (merged list + grid views)
// ============================================================
export default function Doctor() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { can } = usePermission();
  const { selectedBranchId, isAllBranches, branches } = useBranchFilter();
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
      const me = getUser();
      const isAdmin = ["SUPER_ADMIN", "HEAD_ADMIN", "BRANCH_ADMIN"].includes(
        String(me?.role_type ?? "").toUpperCase()
      );
      const doctors = allEmployees.filter(
        (e) =>
          e.user_table?.role_type === "DOCTOR" &&
          !(isAdmin && me?.employee_id && e.employee_id === me.employee_id)
      );
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

      // Fetch in small concurrent batches instead of firing one request per
      // doctor all at once - hosts that are fine locally can rate-limit or
      // choke on dozens of simultaneous connections in production. Each
      // batch's results are merged in as soon as they land (rather than
      // waiting for every doctor to finish) so rows show their real slot
      // count progressively instead of all flipping at once at the end.
      const BATCH_SIZE = 5;

      for (let i = 0; i < doctors.length; i += BATCH_SIZE) {
        if (signal.cancelled) return;
        const batch = doctors.slice(i, i + BATCH_SIZE);
        const batchEntries = await Promise.all(
          batch.map(async (doc) => {
            try {
              const res = await appointmentApi.getDoctorSlotSummary(doc.employee_id, dateStr);
              const data = res.data?.data;
              return [doc.employee_id, { total: data?.total_slots ?? 0, booked: data?.booked_count ?? 0 }] as const;
            } catch (err: any) {
              console.error(
                `[Doctor Page] Slot summary fetch failed for ${doc.employee_id}:`,
                err?.response?.status,
                err?.response?.data || err?.message,
              );
              return [doc.employee_id, { total: 0, booked: 0 }] as const;
            }
          }),
        );

        if (signal.cancelled) return;
        setSlotSummaries((prev) => ({ ...prev, ...Object.fromEntries(batchEntries) }));
      }
    },
    [],
  );
 
  useEffect(() => {
    if (!realDoctors || realDoctors.length === 0 || viewMode !== "list") return;
    const signal = { cancelled: false };

    // Reset so every row shows its loading state again for the newly
    // selected date/doctor set, instead of briefly showing the previous
    // date's stale counts while the fresh fetch is in flight.
    setSlotSummaries({});
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
 
  // Mapped doctor rows -- shared by the filter field options below and the
  // search/filter step, so both work off the exact same real data.
  const doctorRows = useMemo(
    () => (realDoctors ? realDoctors.map((emp, index) => mapEmployeeToDoctorData(emp, index)) : []),
    [realDoctors],
  );

  const { doctorFilterFields } = useDoctorFilters({ doctorRows, branches });

  // ---- SEARCH & FILTER ----
  const filteredData = useMemo(() => {
    let result: Record<string, string | number>[] = [...doctorRows];

    if (searchQuery) {
      result = result.filter((doctor) =>
        ["name", "id", "dept", "branch", "status", "mobile"]
          .map((f) => String(doctor[f] ?? ""))
          .join(" ")
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      );
    }
 
    result = filterDataByValues(result, appliedValues, doctorFilterFields);

    return result;
  }, [searchQuery, appliedValues, doctorRows, doctorFilterFields]);

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
  const handleTransfer = (id: number | string) => navigate(`/doctor/transfer/${id}`);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = (id: number | string) => setDeleteTarget(String(id));

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await employeeApi.remove(deleteTarget);
      if (!res.data.success) {
        throw new Error(res.data.message);
      }
      toast({
        title: "Doctor deactivated",
        description: `Doctor ${deleteTarget} has been deactivated.`,
      });
      setDeleteTarget(null);
      fetchDoctors();
    } catch (err: any) {
      toast({
        title: "Failed to deactivate doctor",
        description: err.response?.data?.message ?? err.message ?? "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };
 
  // ---- EXPORT ----
  const handleExport = async (exportFormat: string) => {
    if (exportFormat !== "csv") return;
    try {
      await downloadExportCsv("employees", {
        branchId: isAllBranches ? undefined : selectedBranchId,
        roleType: "DOCTOR",
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
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="hms-heading">Doctor Management</h1>
              <p className="hms-subheading">Real-time performance across all branches.</p>
            </div>
            <div className="flex items-center gap-3">
              {can("report.export") && <ExportReport onExport={handleExport} />}
              {can("doctor.create") && (
                <button
                  onClick={handleAddDoctor}
                  className="flex items-center gap-2 px-4 py-2 bg-[#004785] rounded-lg text-white text-xs font-semibold shadow-sm hover:bg-[#003a6b] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add new doctor
                </button>
              )}
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
                      <DepartmentAvatarText department={r.dept}>{String(r.avatar)}</DepartmentAvatarText>
                      <div><div className="hms-name-text">{String(r.name)}</div><div className="hms-id-text">{String(r.id)}</div></div>
                    </div>
                  )},
                  { key: "dept", label: "Department", render: (r: any) => (
                    <DepartmentPill department={r.dept}>{String(r.dept)}</DepartmentPill>
                  )},
                  { key: "slots", label: "Slots", sortable: true, render: (r: any) => {
                    const summary = slotSummaries[String(r.id)];
                    return <SlotProgress booked={summary?.booked ?? 0} total={summary?.total ?? 0} loading={!summary} />;
                  }},
                  { key: "mobile", label: "Mobile No", render: (r: any) => (
                    <span className="text-[#191C1E] hms-content-text leading-4">{String(r.mobile)}</span>
                  )},
                  { key: "actions", label: "Actions", sortable: false, className: "w-px", headerClassName: "w-px", render: (r: any) => (
                    <div className="flex items-center gap-1">
                      {can("doctor.read") && (
                        <button onClick={() => handleView(r.id)} title="View" className="p-1.5 rounded transition-colors duration-200 hover:bg-none group">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200 stroke-[#1B1D20] hover:stroke-slate-500">
                            <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      )}
                      {can("doctor.update") && (
                        <button onClick={() => handleEdit(r.id)} title="Edit" className="p-1.5 rounded transition-colors duration-200 hover:bg-blue-50 group">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.36" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200 stroke-[#003EA8] hover:stroke-[#5E87CF]">
                            <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
                          </svg>
                        </button>
                      )}
                      {can("doctor.transfer") && (
                        <button onClick={() => handleTransfer(r.id)} title="Transfer" className="p-1.5 rounded transition-colors duration-200 hover:bg-blue-50 group">
                          <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200 stroke-[#003EA8] hover:stroke-[#5E87CF]">
                            <path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>
                          </svg>
                        </button>
                      )}
                      {can("employee.delete") && (
                        <button onClick={() => handleDelete(r.id)} title="Deactivate" className="p-1.5 rounded transition-colors duration-200 hover:bg-red-50 group">
                          <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200 stroke-[#6B7280] hover:stroke-red-600">
                            <path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      )}
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
             
              <div className={`flex-1 p-5 hide-scrollbar overflow-y-auto ${infiniteScroll ? "max-h-[500px]" : "max-h-[450px]"}`}>
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
                          <DepartmentPill department={doctor.dept}>{doctor.dept}</DepartmentPill>
                          <p className="hms-content-text text-[#191C1E] mt-1.5">
                            <span className="font-semibold">Status</span>{" : "}
                            <span className={doctor.status === "Active" ? "font-bold text-[#16A34A]" : "font-bold text-[#F97316]"}>{doctor.status}</span>
                          </p>
                          <p className="hms-content-text text-[#191C1E] mt-1 truncate">{doctor.branch}</p>
                        </div>
                        <div className="absolute top-3 right-3">
                          <CardMenu onView={() => handleView(doctor.id)} onEdit={() => handleEdit(doctor.id)} onDelete={() => handleDelete(doctor.id)} onTransfer={() => handleTransfer(doctor.id)} />
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

      <ConfirmationDialog
        open={!!deleteTarget}
        type="danger"
        title="Deactivate Doctor?"
        description={
          deleteTarget
            ? `Doctor ${deleteTarget} will be deactivated. They will be hidden from all lists, blocked from login, their branch assignments removed, and their future appointments flagged "Reschedule Required" for reassignment. Historical records are kept. This cannot be undone from the app.`
            : ""
        }
        confirmText="Deactivate"
        cancelText="Cancel"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}