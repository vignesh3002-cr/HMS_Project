import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import CalendarPicker from "@/components/hms/Calender";
import { useNavigate } from "react-router-dom";
import { format, isToday, isTomorrow, isYesterday, addDays, subDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Plus, Loader2 } from "lucide-react";
import HmsTable from "@/components/hms/HmsTable";
import { RefreshButton } from "@/components/hms/RefreshButton";
import ExportReport from "@/components/ui/ExportReport";

import { FilterPopover, useFilterPanel } from "@/components/Filter";
import type { FilterField } from "@/components/Filter/types";
import { filterDataByValues } from "@/components/Filter/utils";
import { useToast } from "@/hooks/use-toast";
import { employeeApi, type EmployeeRecord } from "@/api/employee.api";
import { useBranchFilter } from "@/context/BranchFilterContext";
import { StatusBadge } from "@/components/hms/StatusBadge";

interface StaffMember {
  initials: string;
  name: string;
  phone: string;
  id: string;
  dept: string;
  deptClass: string;
  branch: string[];
  status: "active" | "inactive";
}

interface MedicalStaffRow {
  initials: string;
  name: string;
  phone: string;
  id: string;
  designation: string;
  dept: string;
  deptClass: string;
  branch: string;
  roleType: string;
  status: "active" | "inactive";
}

interface AdministrativeStaffRow {
  initials: string;
  avatar: "purple" | "indigo";
  name: string;
  id: string;
  roleType: string;
  phone: string;
  dept: string;
  designation: string;
  designationColor: "purple" | "indigo";
  branch: string;
  access: string;
  accessColor: "purple" | "indigo";
  login: string;
  loginDot: "green" | "orange";
  status: "active" | "inactive";
}

interface SupportStaffRow {
  initials: string;
  name: string;
  phone: string;
  id: string;
  dept: string;
  designation: string;
  deptClass: "blue" | "purple" | "yellow" | "green" | "red";
  branch: string;
  roleType: string;
  status: "active" | "inactive";
}

const TABS = ["All staff", "Medical Staff", "Admin", "Staff"];

const supportBadgeColors: Record<SupportStaffRow["deptClass"], string> = {
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  yellow: "bg-yellow-100 text-yellow-700",
  green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700",
};

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

const STAFF_DESIGNATION_CATEGORY: Record<string, "administrative" | "support"> = {
  "receptionist": "administrative",
  "admin executive": "administrative",
  "accountant": "administrative",
  "hr executive": "administrative",
  "it support": "administrative",
  "office manager": "administrative",
  "security officer": "support",
  "housekeeping staff": "support",
};

function classifyStaffDesignation(designation: string | null | undefined): "administrative" | "support" {
  const key = designation?.toLowerCase().trim() || "";
  return STAFF_DESIGNATION_CATEGORY[key] ?? "administrative";
}

function getDesignationLabel(emp: EmployeeRecord): string {
  const roleType = (emp.user_table?.role_type || "STAFF").toUpperCase();
  const designation = emp.designation || "";
  switch (roleType) {
    case "DOCTOR": return "Doctor";
    case "NURSE": return "Nurse";
    case "PHARMACIST": return "Pharmacist";
    case "LAB_TECHNICIAN": return "Laboratory Technician";
    case "BRANCH_ADMIN": return "Branch Admin";
    case "ADMIN": return designation || "Admin";
    case "STAFF": return designation || "Staff";
    default: return designation || roleType;
  }
}

function getStaffCategory(emp: EmployeeRecord): "medical" | "admin" | "staff" | "doctor" {
  const roleType = (emp.user_table?.role_type || "STAFF").toUpperCase();
  if (roleType === "DOCTOR") return "doctor";
  if (roleType === "NURSE" || roleType === "PHARMACIST" || roleType === "LAB_TECHNICIAN") return "medical";
  if (roleType === "ADMIN" || roleType === "BRANCH_ADMIN") return "admin";
  if (roleType === "STAFF") return classifyStaffDesignation(emp.designation) === "administrative" ? "admin" : "staff";
  return "staff";
}

function mapEmployeeToStaffData(emp: EmployeeRecord, index: number) {
  const palette = AVATAR_PALETTE[index % AVATAR_PALETTE.length];
  const fullName = `${emp.first_name} ${emp.middle_name ? emp.middle_name + " " : ""}${emp.last_name}`;
  const roleType = (emp.user_table?.role_type || "STAFF").toUpperCase();
  const isActive = emp.emp_status === true || emp.user_table?.user_status === 0;
  const branchName = formatBranch(emp.branch);
  const deptName = emp.department_master?.department_name || emp.specialization || "Unassigned";

  if (roleType === "NURSE" || roleType === "PHARMACIST" || roleType === "LAB_TECHNICIAN") {
    return {
      initials: getInitials(fullName),
      name: fullName,
      phone: emp.mobile_no,
      id: emp.employee_id,
      designation: getDesignationLabel(emp),
      dept: deptName,
      deptClass: "bg-[#D6E3FF] text-[#475C7F]",
      branch: branchName,
      roleType,
      status: isActive ? "active" : "inactive",
    } as MedicalStaffRow;
  } else if (roleType === "ADMIN" || roleType === "BRANCH_ADMIN") {
    return {
      initials: getInitials(fullName),
      avatar: (index % 2 === 0 ? "purple" : "indigo") as "purple" | "indigo",
      name: fullName,
      id: emp.employee_id,
      roleType,
      phone: emp.mobile_no,
      dept: deptName,
      designation: getDesignationLabel(emp),
      designationColor: (index % 2 === 0 ? "purple" : "indigo") as "purple" | "indigo",
      branch: branchName,
      access: "Full Access",
      accessColor: (index % 2 === 0 ? "purple" : "indigo") as "purple" | "indigo",
      login: isActive ? "Online" : "Offline",
      loginDot: isActive ? "green" : "orange",
      status: isActive ? "active" : "inactive",
    } as AdministrativeStaffRow;
  } else if (roleType === "STAFF") {
    const isAdmin = classifyStaffDesignation(emp.designation) === "administrative";
    if (isAdmin) {
        return {
          initials: getInitials(fullName),
          avatar: (index % 2 === 0 ? "purple" : "indigo") as "purple" | "indigo",
          name: fullName,
          id: emp.employee_id,
          roleType,
          phone: emp.mobile_no,
          dept: deptName,
          designation: getDesignationLabel(emp),
          designationColor: (index % 2 === 0 ? "purple" : "indigo") as "purple" | "indigo",
          branch: branchName,
          access: "Full Access",
          accessColor: (index % 2 === 0 ? "purple" : "indigo") as "purple" | "indigo",
          login: isActive ? "Online" : "Offline",
          loginDot: isActive ? "green" : "orange",
          status: isActive ? "active" : "inactive",
        } as AdministrativeStaffRow;
    } else {
      return {
        initials: getInitials(fullName),
        name: fullName,
        phone: emp.mobile_no,
        id: emp.employee_id,
        dept: deptName,
        designation: getDesignationLabel(emp),
        deptClass: "blue",
        branch: branchName,
        roleType,
        status: isActive ? "active" : "inactive",
      } as SupportStaffRow;
    }
  }
  return {
    initials: getInitials(fullName),
    name: fullName,
    phone: emp.mobile_no,
    id: emp.employee_id,
    designation: getDesignationLabel(emp),
    dept: deptName,
    deptClass: "bg-[#D6E3FF] text-[#475C7F]",
    branch: branchName,
    roleType,
    status: isActive ? "active" : "inactive",
  } as MedicalStaffRow;
}

const badgeClass = (color: "purple" | "indigo") =>
  color === "purple"
    ? "bg-purple-200/60 text-purple-800"
    : "bg-indigo-100 text-indigo-700";



const ActionIcons = ({ id, roleType }: { id?: string; roleType?: string } = {}) => {
  const navigate = useNavigate();
  // Every role now edits through the same AddEmployee.tsx form (Create/Edit
  // mode) — Doctors keep the /doctor/edit/:id path, everyone else uses
  // /staff/edit/:id; both routes render the same component.
  const canEdit = !!id;
  const editPath = roleType === "DOCTOR" ? `/doctor/edit/${id}` : `/staff/edit/${id}`;

  return (
    <div className="flex items-center gap-1">
      <button title="View" className="p-1.5 rounded transition-colors duration-200 hover:bg-none group">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200 stroke-[#1B1D20] hover:stroke-slate-500">
          <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
      <button
        title="Edit"
        onClick={canEdit ? () => navigate(editPath) : undefined}
        disabled={!canEdit}
        className={`p-1.5 rounded transition-colors duration-200 group ${canEdit ? "hover:bg-blue-50 cursor-pointer" : "opacity-40 cursor-not-allowed"}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.36" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200 stroke-[#003EA8] hover:stroke-[#5E87CF]">
          <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
        </svg>
      </button>
      <button title="Delete" className="p-1.5 rounded transition-colors duration-200 hover:bg-red-50 group">
        <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200 stroke-[#6B7280] hover:stroke-red-600">
          <path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    </div>
  );
};

export default function Staff() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedBranchId, isAllBranches } = useBranchFilter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const tabsMenuRef = useRef<HTMLElement>(null);
  const tabsContainerRef = useRef<HTMLUListElement>(null);
  const [underline, setUnderline] = useState({ left: 0, width: 0 });

  const handleAddStaff = () => {
    navigate("/STAFF/add?role=staff");
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tabsMenuRef.current && !tabsMenuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;
    const activeButton = container.querySelector<HTMLButtonElement>(`[data-tab="${activeTab}"]`);
    if (activeButton) {
      setUnderline({ left: activeButton.offsetLeft, width: activeButton.offsetWidth });
    }
  }, [activeTab]);

  const [searchQuery, setSearchQuery] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const {
    values: filterValues,
    appliedValues,
    isOpen: isFilterOpen,
    setIsOpen: setIsFilterOpen,
    handleChange: handleFilterChange,
    handleApply: handleApplyFilter,
    handleClear: handleClearFilter,
  } = useFilterPanel();

  const activeTabName = TABS[activeTab];
  const isMedicalTab = activeTabName === "Medical Staff";
  const isAdminTab = activeTabName === "Admin";
  const isStaffTab = activeTabName === "Staff";

  const [realStaff, setRealStaff] = useState<EmployeeRecord[] | null>(null);
  const [isStaffLoading, setIsStaffLoading] = useState(true);

  const fetchStaff = useCallback(async () => {
    setIsStaffLoading(true);
    console.log("[Staff Page] Fetching all employees from employeeApi...");
    try {
      const res = await employeeApi.getAll({
        branchId: isAllBranches ? undefined : selectedBranchId,
      });
      console.log("[Staff Page] Response:", res.data);
      const allEmployees = res.data?.data?.employees || [];
      const staff = allEmployees.filter((e) => e.user_table?.role_type !== "DOCTOR");
      setRealStaff(staff);
      if (staff.length === 0) {
        toast({
          title: "No staff records found",
          description: "The employees API returned no staff records.",
        });
      }
    } catch (err: any) {
      console.error("[Staff Page] Error:", err);
      console.error("[Staff Page] Error response:", err.response?.data);
      console.error("[Staff Page] Error status:", err.response?.status);
      toast({
        title: "Failed to load staff",
        description: err.response?.data?.message || "Couldn't reach the employees API.",
        variant: "destructive",
      });
    } finally {
      setIsStaffLoading(false);
    }
  }, [toast, selectedBranchId, isAllBranches]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    setCurrentPage(1);
    handleClearFilter();
  }, [activeTab]);

  const staffFilterFields: FilterField[] = [
    { id: "id", label: "Staff ID", type: "text", placeholder: "Enter ID" },
    {
      id: "dept", label: "Department", type: "multiselect", options: [
        { label: "Neuroscience", value: "Neuroscience" },
        { label: "Cardiology", value: "Cardiology" },
        { label: "Pediatrics", value: "Pediatrics" },
        { label: "Nursing", value: "Nursing" },
        { label: "Admin", value: "Admin" },
      ],
    },
    {
      id: "branch", label: "Branch", type: "multiselect", options: [
        { label: "Central Hospital", value: "Central Hospital" },
        { label: "Tambaram", value: "Tambaram" },
        { label: "Saidapet", value: "Saidapet" },
        { label: "Egmore", value: "Egmore" },
        { label: "East wing", value: "East wing" },
        { label: "North wing", value: "North wing" },
      ],
    },
    {
      id: "status", label: "Status", type: "multiselect", options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
        { label: "Resigned", value: "Resigned" },
        { label: "Suspended", value: "Suspended" },
      ],
    },
    { id: "designation", label: "Designation", type: "multiselect", options: [
      { label: "Doctor", value: "Doctor" },
      { label: "Nurse", value: "Nurse" },
      { label: "Pharmacist", value: "Pharmacist" },
      { label: "Laboratory Technician", value: "Laboratory Technician" },
      { label: "Head Admin", value: "Head Admin" },
      { label: "Branch Admin", value: "Branch Admin" },
      { label: "Staff Admin", value: "Staff Admin" },
      { label: "Receptionist", value: "Receptionist" },
    ]},
  ];

  // ---- SEARCH & FILTER ----
  const filteredData = useMemo(() => {
    const employeesForTab = !realStaff
      ? []
      : isMedicalTab
        ? realStaff.filter((e) => getStaffCategory(e) === "medical")
        : isAdminTab
          ? realStaff.filter((e) => getStaffCategory(e) === "admin")
          : isStaffTab
            ? realStaff.filter((e) => getStaffCategory(e) === "staff")
            : realStaff.filter((e) => getStaffCategory(e) !== "doctor");

    const sourceData: (StaffMember | MedicalStaffRow | AdministrativeStaffRow | SupportStaffRow)[] =
      employeesForTab.map((e, i) => mapEmployeeToStaffData(e, i));

    let result = sourceData;

    if (searchQuery) {
      result = result.filter((staff) =>
        Object.values(staff as any)
          .map((value: any) => (Array.isArray(value) ? value.join(" ") : String(value ?? "")))
          .join(" ")
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      );
    }

    result = filterDataByValues(result, appliedValues);

    return result;
  }, [searchQuery, appliedValues, isMedicalTab, isAdminTab, isStaffTab, realStaff]);

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
    return [...filteredData].sort((a, b) => {
      const aValue = String((a as any)[sortField] ?? "").toLowerCase();
      const bValue = String((b as any)[sortField] ?? "").toLowerCase();
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
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

  const baseColumns = [
    { key: "name", label: "Name" },
    { key: "phone", label: "Phone Number" },
    { key: "dept", label: "Department" },
    { key: "branch", label: "Branch" },
    { key: "status", label: "Status" },
    { key: "actions", label: "Action" },
  ];

  const hmsColumnsByTab = (): any[] => {
    if (isAdminTab) {
      return [
        { key: "name", label: "Name", render: (r: any) => (
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-7 h-7 rounded-xl flex-shrink-0 hms-avatar-text ${badgeClass(r.avatar)}`}>{r.initials}</div>
            <div><div className="hms-name-text">{r.name}</div><div className="hms-id-text">{r.id}</div></div>
          </div>
        )},
        { key: "designation", label: "Department", render: (r: any) => (
          <span className={`px-1.5 py-0.5 rounded-sm hms-department-text tracking-[-0.4px] ${badgeClass(r.designationColor)}`}>{r.designation}</span>
        )},
        { key: "branch", label: "Branch", render: (r: any) => <span className="text-[#191C1E] hms-content-text">{r.branch}</span> },
        { key: "access", label: "Access Level", render: (r: any) => (
          <span className={`px-1.5 py-0.5 rounded-sm hms-department-text tracking-[-0.4px] ${badgeClass(r.accessColor)}`}>{r.access}</span>
        )},
        { key: "login", label: "Last Login", render: (r: any) => (
          <span className="inline-flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${r.loginDot === "green" ? "bg-green-500" : "bg-orange-500"}`} />
            <span className="text-[#191C1E] hms-content-text whitespace-nowrap">{r.login}</span>
          </span>
        )},
        { key: "status", label: "Status", render: (r: any) => <StatusBadge status={r.status} /> },
        { key: "actions", label: "Action", sortable: false, render: (r: any) => <ActionIcons id={r.id} roleType={r.roleType} /> },
      ];
    }
    if (isStaffTab) {
      return [
        { key: "name", label: "Name", render: (r: any) => (
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-7 h-7 rounded-xl flex-shrink-0 hms-avatar-text ${supportBadgeColors[r.deptClass]}`}>{r.initials}</div>
            <div><div className="hms-name-text">{r.name}</div><div className="hms-id-text">{r.id}</div></div>
          </div>
        )},
        { key: "phone", label: "Phone Number", render: (r: any) => <span className="text-[#191C1E] hms-content-text">{r.phone}</span> },
        { key: "designation", label: "Department", render: (r: any) => (
          <span className={`px-1.5 py-0.5 rounded-sm hms-department-text tracking-[-0.4px] ${supportBadgeColors[r.deptClass]}`}>{r.designation}</span>
        )},
        { key: "branch", label: "Branch", render: (r: any) => <span className="text-[#191C1E] hms-content-text">{r.branch}</span> },
        { key: "status", label: "Status", render: (r: any) => <StatusBadge status={r.status} /> },
        { key: "actions", label: "Action", sortable: false, render: (r: any) => <ActionIcons id={r.id} roleType={r.roleType} /> },
      ];
    }
    // Medical or All staff
    return [
      { key: "name", label: "Name", render: (r: any) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-7 h-7 rounded-xl flex-shrink-0 bg-emerald-100 text-emerald-600 hms-avatar-text">{r.initials}</div>
          <div><div className="hms-name-text">{r.name}</div><div className="hms-id-text">{r.id}</div></div>
        </div>
      )},
      { key: "phone", label: "Phone Number", render: (r: any) => <span className="text-[#191C1E] hms-content-text">{r.phone}</span> },
      { key: "designation", label: "Department", render: (r: any) => (
        <span className="px-1.5 py-0.5 rounded-sm hms-department-text tracking-[-0.4px] capitalize bg-emerald-100 text-emerald-700">{r.designation}</span>
      )},
      { key: "branch", label: "Branch", render: (r: any) => (
        <span className="text-[#191C1E] hms-content-text">
          {(Array.isArray(r.branch) ? r.branch : [r.branch]).map((b: string, i: number) => (
            <span key={b}>{b}{i < (Array.isArray(r.branch) ? r.branch.length : 1) - 1 && <br />}</span>
          ))}
        </span>
      )},
      { key: "status", label: "Status", render: (r: any) => <StatusBadge status={r.status} /> },
      { key: "actions", label: "Action", sortable: false, render: (r: any) => <ActionIcons id={r.id} roleType={r.roleType} /> },
    ];
  };

  return (
    <div className="flex w-full font-[Manrope,sans-serif] bg-[#F7F9FB] min-h-screen">
      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex flex-col gap-[17px]">

          {/* ==================== HEADER ==================== */}
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="hms-heading">Staff Management</h1>
              <p className="hms-subheading">Manage and overview all staff members across branches.</p>
            </div>
            <div className="flex items-center gap-3">
              <ExportReport />

              <button
                onClick={handleAddStaff}
                className="flex items-center gap-2 px-4 py-2 bg-[#004785] rounded-lg text-white text-xs font-semibold shadow-sm hover:bg-[#003a6b] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add new staff
              </button>
            </div>
          </div>

          {/* ==================== MAIN CARD ==================== */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col transition-all duration-300 hover:shadow-md">

            {/* ==================== TOOLBAR ==================== */}
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-4">

              {/* TABS */}
              <nav
                ref={tabsMenuRef}
                aria-label="Staff table sections"
                className="relative flex items-center gap-6"
              >
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-expanded={menuOpen}
                  aria-controls="staff-tabs-menu"
                  className="hidden max-[1024px]:flex w-9 h-9 shrink-0 items-center justify-center flex-col gap-1 border border-[#E5E7EB] rounded-md mr-2"
                >
                  <span className="sr-only">Toggle sections menu</span>
                  <span className="w-4 h-[2px] bg-gray-600" />
                  <span className="w-4 h-[2px] bg-gray-600" />
                  <span className="w-4 h-[2px] bg-gray-600" />
                </button>

                <ul
                  id="staff-tabs-menu"
                  ref={tabsContainerRef}
                  className={[
                    "relative flex items-center gap-6 list-none m-0 p-0",
                    "max-[1024px]:flex-col max-[1024px]:items-start max-[1024px]:gap-3 max-[1024px]:absolute max-[1024px]:left-0 max-[1024px]:top-[calc(100%+8px)] max-[1024px]:z-20 max-[1024px]:w-48 max-[1024px]:bg-white max-[1024px]:border max-[1024px]:border-[#E5E7EB] max-[1024px]:rounded-lg max-[1024px]:shadow-lg max-[1024px]:overflow-hidden max-[1024px]:px-4 max-[1024px]:transition-[max-height,opacity,padding] max-[1024px]:duration-300 max-[1024px]:ease-in-out",
                    menuOpen
                      ? "max-[1024px]:max-h-[240px] max-[1024px]:opacity-100 max-[1024px]:py-3"
                      : "max-[1024px]:max-h-0 max-[1024px]:opacity-0 max-[1024px]:py-0 max-[1024px]:pointer-events-none max-[1024px]:border-transparent max-[1024px]:shadow-none",
                  ].join(" ")}
                >
                  {TABS.map((tab, index) => (
                    <li key={tab}>
                      <button
                        data-tab={index}
                        onClick={() => {
                          setActiveTab(index);
                          setMenuOpen(false);
                        }}
                        className={`pb-1 text-xs font-semibold tracking-[1.2px] capitalize transition-colors duration-200 ${
                          activeTab === index ? "text-[#00488D]" : "text-[#424752]"
                        }`}
                      >
                        {tab}
                      </button>
                    </li>
                  ))}
                  <div
                    className="absolute bottom-0 h-[2px] bg-[#00488D] transition-all duration-300 ease-out max-[1024px]:hidden"
                    style={{ left: underline.left, width: underline.width }}
                  />
                </ul>
              </nav>

              {/* SEARCH / DATE / FILTERS */}
              <div className="flex items-center gap-3 flex-wrap">
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
                      <button className="flex items-center justify-center h-[27px] w-[90px] px-2 border-t border-b border-[#E5E7EB] bg-white text-xs font-medium drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] transition-colors duration-150 hover:bg-[#F2F4F6]">
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

                <FilterPopover
                  title="Filters"
                  fields={staffFilterFields}
                  values={filterValues}
                  onChange={handleFilterChange}
                  onApply={handleApplyFilter}
                  onClear={handleClearFilter}
                  open={isFilterOpen}
                  onOpenChange={setIsFilterOpen}
                />
                <RefreshButton onClick={fetchStaff} isLoading={isStaffLoading} />
              </div>
            </div>

            {/* ==================== TABLE ==================== */}
            {isStaffLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#6B7280] text-sm">
                <Loader2 size={24} className="animate-spin text-[#00488D]" />
                Loading staff data...
              </div>
            ) : (
              <HmsTable
                columns={hmsColumnsByTab()}
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
                emptyMessage="No staff found matching the current filters."
                rowKey={(r: any, i: number) => String(r.id) + i}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
