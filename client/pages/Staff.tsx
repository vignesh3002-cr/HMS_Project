import { useState, useEffect, useRef, useMemo, Fragment } from "react";
import CalendarPicker from "@/components/hms/Calender";
import { format, isToday, isTomorrow, isYesterday, addDays, subDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, FileText, File, ChevronDown, Check, Plus } from "lucide-react";

import { FilterPopover, useFilterPanel } from "@/components/Filter";
import type { FilterField } from "@/components/Filter/types";
import { filterDataByValues } from "@/components/Filter/utils";
import { useToast } from "@/hooks/use-toast";
import { employeeApi, type EmployeeRecord } from "@/api/employee.api";

interface StaffMember {
  initials: string;
  name: string;
  phone: string;
  id: string;
  dept: string;
  deptClass: string;
  branch: string[];
  status: "active" | "leave" | "inactive";
}

interface MedicalStaffRow {
  initials: string;
  name: string;
  phone: string;
  id: string;
  dept: string;
  deptClass: string;
  branch: string;
  status: "active" | "leave" | "inactive";
}

interface AdministrativeStaffRow {
  initials: string;
  avatar: "purple" | "indigo";
  name: string;
  id: string;
  role: string;
  roleColor: "purple" | "indigo";
  branch: string;
  access: string;
  accessColor: "purple" | "indigo";
  login: string;
  loginDot: "green" | "orange";
  status: "active" | "leave";
}

interface SupportStaffRow {
  initials: string;
  name: string;
  phone: string;
  id: string;
  dept: string;
  deptClass: "blue" | "purple" | "yellow" | "green" | "red";
  branch: string;
  status: "active" | "leave";
}

const staffData: StaffMember[] = [
  {
    initials: "SJ",
    name: "Dr. Sarah Jenkins",
    phone: "+1 (555) 123-4567",
    id: "DOC-9042",
    dept: "Neuroscience",
    deptClass: "bg-[#D6E3FF] text-[#475C7F]",
    branch: ["Central Hospital Tambaram"],
    status: "active",
  },
  {
    initials: "AM",
    name: "Dr. Ajay Mehta",
    phone: "+1 (555) 123-4567",
    id: "DOC-9042",
    dept: "Cardiology",
    deptClass: "bg-[#EDE9FE] text-[#475C7F]",
    branch: ["Central Hospital Tambaram"],
    status: "leave",
  },
  {
    initials: "RL",
    name: "Dr. Robert lee",
    phone: "+1 (555) 234-5678",
    id: "DOC-4431",
    dept: "Pediatrics",
    deptClass: "bg-[#FDE68A] text-[#CE6228]",
    branch: ["Central Hospital Saidapet"],
    status: "active",
  },
  {
    initials: "MD",
    name: "Mahesh Dhori",
    phone: "+1 (555) 345-6789",
    id: "NUR-0098",
    dept: "Nursing",
    deptClass: "bg-[#D1FAE5] text-[#0D9651]",
    branch: ["Central Hospital Egmore"],
    status: "leave",
  },
  {
    initials: "DT",
    name: "David Tan",
    phone: "+1 (555) 456-7890",
    id: "ADM-0032",
    dept: "Admin",
    deptClass: "bg-lime-100 text-lime-700",
    branch: ["East wing"],
    status: "inactive",
  },
  {
    initials: "EW",
    name: "Elena Wright",
    phone: "+1 (555) 567-8901",
    id: "DOC-1192",
    dept: "Cardiology",
    deptClass: "bg-[#FEE2E2] text-[#8C3789]",
    branch: ["North wing"],
    status: "active",
  },
  {
    initials: "SS",
    name: "Dr. Steven Strange",
    phone: "+1 (555) 123-4567",
    id: "DOC-9042",
    dept: "Neuroscience",
    deptClass: "bg-[#D6E3FF] text-[#475C7F]",
    branch: ["Central Hospital Tambaram"],
    status: "active",
  },
  {
    initials: "SR",
    name: "Dr. Steve Rogers",
    phone: "+1 (555) 123-4567",
    id: "DOC-9042",
    dept: "Cardiology",
    deptClass: "bg-[#EDE9FE] text-[#475C7F]",
    branch: ["Central Hospital Tambaram"],
    status: "leave",
  },
  {
    initials: "BB",
    name: "Bruce Banner",
    phone: "+1 (555) 456-7890",
    id: "ADM-0032",
    dept: "Admin",
    deptClass: "bg-lime-100 text-lime-700",
    branch: ["East wing"],
    status: "inactive",
  },
  {
    initials: "NR",
    name: "Natasha Romanoff",
    phone: "+1 (555) 567-8901",
    id: "DOC-1192",
    dept: "Cardiology",
    deptClass: "bg-[#FEE2E2] text-[#8C3789]",
    branch: ["North wing"],
    status: "active",
  },
];

const medicalStaffData: MedicalStaffRow[] = [
  {
    initials: "SJ",
    name: "Dr. Sarah Jenkins",
    phone: "+1 (555) 123-4567",
    id: "DOC-9042",
    dept: "Neuroscience",
    deptClass: "bg-[#D6E3FF] text-[#475C7F]",
    branch: "Central Hospital Tambaram",
    status: "active",
  },
  {
    initials: "SJ",
    name: "Dr. Sarah Jenkins",
    phone: "+1 (555) 123-4567",
    id: "DOC-9042",
    dept: "Neuroscience",
    deptClass: "bg-[#D6E3FF] text-[#475C7F]",
    branch: "Central Hospital Tambaram",
    status: "active",
  },
  {
    initials: "SJ",
    name: "Dr. Sarah Jenkins",
    phone: "+1 (555) 123-4567",
    id: "DOC-9042",
    dept: "Neuroscience",
    deptClass: "bg-[#D6E3FF] text-[#475C7F]",
    branch: "Central Hospital Tambaram",
    status: "active",
  },
  {
    initials: "SJ",
    name: "Dr. Sarah Jenkins",
    phone: "+1 (555) 123-4567",
    id: "DOC-9042",
    dept: "Neuroscience",
    deptClass: "bg-[#D6E3FF] text-[#475C7F]",
    branch: "Central Hospital Tambaram",
    status: "active",
  },
  {
    initials: "SJ",
    name: "Dr. Sarah Jenkins",
    phone: "+1 (555) 123-4567",
    id: "DOC-9042",
    dept: "Neuroscience",
    deptClass: "bg-[#D6E3FF] text-[#475C7F]",
    branch: "Central Hospital Tambaram",
    status: "active",
  },
  {
    initials: "AM",
    name: "Dr. Ajay Mehta",
    phone: "+1 (555) 123-4567",
    id: "DOC-9043",
    dept: "Cardiology",
    deptClass: "bg-[#EDE9FE] text-[#475C7F]",
    branch: "Central Hospital Tambaram",
    status: "leave",
  },
  {
    initials: "RL",
    name: "Dr. Robert Lee",
    phone: "+1 (555) 234-5678",
    id: "DOC-4431",
    dept: "Pediatrics",
    deptClass: "bg-[#FDE68A] text-[#CE6228]",
    branch: "Central Hospital Saidapet",
    status: "active",
  },
  {
    initials: "AM",
    name: "Angela Moore",
    phone: "+1 (555) 345-6789",
    id: "NUR-0098",
    dept: "Nursing",
    deptClass: "bg-[#D1FAE5] text-[#0D9651]",
    branch: "Central Hospital Egmore",
    status: "leave",
  },
  {
    initials: "EW",
    name: "Elena Wright",
    phone: "+1 (555) 567-8901",
    id: "DOC-1192",
    dept: "Cardiology",
    deptClass: "bg-[#FEE2E2] text-[#8C3789]",
    branch: "North Wing",
    status: "active",
  },
  {
    initials: "SS",
    name: "Dr. Steven Strange",
    phone: "+1 (555) 123-4567",
    id: "DOC-9044",
    dept: "Neuroscience",
    deptClass: "bg-[#D6E3FF] text-[#475C7F]",
    branch: "Central Hospital Tambaram",
    status: "active",
  },
];

const administrativeStaffData: AdministrativeStaffRow[] = [
  {
    initials: "SK",
    avatar: "purple",
    name: "Shankar Kumar",
    id: "ADM-9042",
    role: "Head Admin",
    roleColor: "purple",
    branch: "Central Hospital Tambaram",
    access: "Super Admin",
    accessColor: "purple",
    login: "Today ,09:42 AM",
    loginDot: "green",
    status: "active",
  },
  {
    initials: "D",
    avatar: "indigo",
    name: "David",
    id: "RC-9042",
    role: "Branch Admin",
    roleColor: "indigo",
    branch: "Central Hospital Saidapet",
    access: "Admin",
    accessColor: "indigo",
    login: "Today, 10:30 AM",
    loginDot: "green",
    status: "active",
  },
   {
    initials: "SK",
    avatar: "purple",
    name: "Shankar Kumar",
    id: "ADM-9042",
    role: "Head Admin",
    roleColor: "purple",
    branch: "Central Hospital Tambaram",
    access: "Super Admin",
    accessColor: "purple",
    login: "Today ,09:42 AM",
    loginDot: "green",
    status: "active",
  },
  {
    initials: "R",
    avatar: "indigo",
    name: "Rajesh",
    id: "ADM-9043",
    role: "Branch Admin",
    roleColor: "indigo",
    branch: "Central Hospital Chromepet",
    access: "Admin",
    accessColor: "indigo",
    login: "Today ,09:42 AM",
    loginDot: "green",
    status: "active",
  },
   {
    initials: "SK",
    avatar: "purple",
    name: "Shankar Kumar",
    id: "ADM-9042",
    role: "Head Admin",
    roleColor: "purple",
    branch: "Central Hospital Tambaram",
    access: "Super Admin",
    accessColor: "purple",
    login: "Today ,09:42 AM",
    loginDot: "green",
    status: "active",
  },
  {
    initials: "SK",
    avatar: "purple",
    name: "Shankar Kumar",
    id: "ADM-9044",
    role: "Head Admin",
    roleColor: "purple",
    branch: "Central Hospital Egmore",
    access: "Super Admin",
    accessColor: "purple",
    login: "Yesterday ,08:20 PM",
    loginDot: "orange",
    status: "leave",
  },
   {
    initials: "SK",
    avatar: "purple",
    name: "Shankar Kumar",
    id: "ADM-9042",
    role: "Head Admin",
    roleColor: "purple",
    branch: "Central Hospital Tambaram",
    access: "Super Admin",
    accessColor: "purple",
    login: "Today ,09:42 AM",
    loginDot: "green",
    status: "active",
  },
  {
    initials: "AK",
    avatar: "indigo",
    name: "Ajith Kumar",
    id: "ADM-9045",
    role: "Branch Admin",
    roleColor: "indigo",
    branch: "Central Hospital Triplicane",
    access: "Admin",
    accessColor: "indigo",
    login: "Today ,09:42 AM",
    loginDot: "green",
    status: "active",
  },
   {
    initials: "SK",
    avatar: "purple",
    name: "Shankar Kumar",
    id: "ADM-9042",
    role: "Head Admin",
    roleColor: "purple",
    branch: "Central Hospital Tambaram",
    access: "Super Admin",
    accessColor: "purple",
    login: "Today ,09:42 AM",
    loginDot: "green",
    status: "active",
  },
   {
    initials: "SK",
    avatar: "purple",
    name: "Shankar Kumar",
    id: "ADM-9042",
    role: "Head Admin",
    roleColor: "purple",
    branch: "Central Hospital Tambaram",
    access: "Super Admin",
    accessColor: "purple",
    login: "Today ,09:42 AM",
    loginDot: "green",
    status: "active",
  },
];

const supportBadgeColors: Record<string, string> = {
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  yellow: "bg-yellow-200 text-yellow-700",
  green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700",
};

const supportStaffData: SupportStaffRow[] = [
  {
    initials: "W",
    name: "Watt",
    phone: "+1 (555) 234-1001",
    id: "REC-9042",
    dept: "Receptionist",
    deptClass: "blue",
    branch: "Central Hospital",
    status: "active",
  },
  {
    initials: "W",
    name: "Watt",
    phone: "+1 (555) 234-1001",
    id: "REC-9042",
    dept: "Receptionist",
    deptClass: "blue",
    branch: "Central Hospital",
    status: "active",
  },
  {
    initials: "W",
    name: "Watt",
    phone: "+1 (555) 234-1001",
    id: "REC-9042",
    dept: "Receptionist",
    deptClass: "blue",
    branch: "Central Hospital",
    status: "active",
  },
  {
    initials: "W",
    name: "Watt",
    phone: "+1 (555) 234-1001",
    id: "REC-9042",
    dept: "Receptionist",
    deptClass: "blue",
    branch: "Central Hospital",
    status: "active",
  },
  {
    initials: "W",
    name: "Watt",
    phone: "+1 (555) 234-1001",
    id: "REC-9042",
    dept: "Receptionist",
    deptClass: "blue",
    branch: "Central Hospital",
    status: "active",
  },
  {
    initials: "W",
    name: "Watt",
    phone: "+1 (555) 234-1001",
    id: "REC-9042",
    dept: "Receptionist",
    deptClass: "blue",
    branch: "Central Hospital",
    status: "active",
  },
  {
    initials: "S",
    name: "Sarah",
    phone: "+1 (555) 234-1002",
    id: "HK-9042",
    dept: "House Keeping",
    deptClass: "purple",
    branch: "City Clinic",
    status: "leave",
  },
  {
    initials: "L",
    name: "Lee",
    phone: "+1 (555) 234-1003",
    id: "LO-4431",
    dept: "Lift Operator",
    deptClass: "yellow",
    branch: "North Beach",
    status: "leave",
  },
  {
    initials: "A",
    name: "Angela",
    phone: "+1 (555) 234-1004",
    id: "REC-0098",
    dept: "Receptionist",
    deptClass: "green",
    branch: "Central Hospital",
    status: "active",
  },
  {
    initials: "W",
    name: "Wright",
    phone: "+1 (555) 234-1005",
    id: "SG-1192",
    dept: "Security Guard",
    deptClass: "red",
    branch: "North Wing",
    status: "leave",
  },
];

const statusConfig = {
  active: {
    label: "Active",
    className: "bg-green-50 text-green-600",
    dot: "bg-green-500",
  },
  leave: {
    label: "Leave",
    className: "bg-orange-50 text-orange-500",
    dot: "bg-orange-500",
  },
  inactive: {
    label: "Inactive",
    className: "bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
  },
};

const TABS = ["All staff", "Medical", "Administrative", "Support"];

// Rows-per-page dropdown (matches Doctor.tsx / Patients.tsx)
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

// Medical staff table (rendered when the "Medical" tab is active)
function MedicalTableView({
  rows,
  sortField,
  sortDirection,
  onSort,
}: {
  rows: MedicalStaffRow[];
  sortField: string;
  sortDirection: "asc" | "desc";
  onSort: (field: string) => void;
}) {
  const columns = [
    { key: "name", label: "Name" },
    { key: "phone", label: "Phone Number" },
    { key: "dept", label: "Department" },
    { key: "branch", label: "Branch" },
    { key: "status", label: "Status" },
    { key: "actions", label: "Action" },
  ];

  return (
    <table className="w-full min-w-[900px]">
      <thead className="hms-columnHeading-style">
        <tr className="bg-[rgba(242,244,246,0.40)]">
          {columns.map(({ key, label }, idx) => {
            const isSorted = sortField === key;
            return (
              <th key={key} className={`px-5 py-3 hms-table-header text-center ${idx === 0 ? "pl-8" : ""}`}>
                <div
                  className={`flex items-center justify-center gap-1 cursor-pointer select-none ${idx === 0 ? "-ml-3" : ""}`}
                  onClick={key !== "actions" ? () => onSort(key) : undefined}
                >
                  <span>{label}</span>
                  {key !== "actions" && (
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
        {rows.length > 0 ? (
          rows.map((staff, index) => (
            <tr key={staff.id + index} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F7F9FB] transition-colors group">
              <td className="px-5 py-4 pl-8">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-xl flex-shrink-0 bg-emerald-100 text-emerald-600 hms-avatar-text">
                    {staff.initials}
                  </div>
                  <div>
                    <p className="hms-name-text">{staff.name}</p>
                    <p className="hms-id-text">{staff.id}</p>
                  </div>
                </div>
              </td>

              <td className="px-5 py-4 text-center">
                <span className="text-[#191C1E] hms-content-text">{staff.phone}</span>
              </td>

              <td className="px-5 py-4 text-center">
                <span className={`px-1.5 py-0.5 rounded-sm hms-department-text tracking-[-0.4px] capitalize ${staff.deptClass}`}>
                  {staff.dept}
                </span>
              </td>

              <td className="px-5 py-4 text-center">
                <span className="text-[#191C1E] hms-content-text">{staff.branch}</span>
              </td>

              <td className="px-5 py-4 text-center">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusConfig[staff.status].className}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[staff.status].dot}`} />
                  {statusConfig[staff.status].label}
                </span>
              </td>

              <td className="px-5 py-4 text-center">
                <div className="flex items-center justify-center gap-1">
                  <button title="View" className="p-1.5 rounded transition-colors duration-200 hover:bg-none group">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200 stroke-[#1B1D20] hover:stroke-slate-500">
                      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                  <button title="Edit" className="p-1.5 rounded transition-colors duration-200 hover:bg-blue-50 group">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.36" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200 stroke-[#003EA8] hover:stroke-[#5E87CF]">
                      <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
                    </svg>
                  </button>
                  <button title="Delete" className="p-1.5 rounded transition-colors duration-200 hover:bg-red-50 group">
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
            <td colSpan={6} className="px-5 py-10 text-center text-[#6B7280] text-sm">
              No medical staff found matching the current filters.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

// Administrative staff table (rendered when the "Administrative" tab is active)
function AdministrativeTableView({
  rows,
  sortField,
  sortDirection,
  onSort,
}: {
  rows: AdministrativeStaffRow[];
  sortField: string;
  sortDirection: "asc" | "desc";
  onSort: (field: string) => void;
}) {
  const columns = [
    { key: "name", label: "Name" },
    { key: "role", label: "Role/Department" },
    { key: "branch", label: "Branch" },
    { key: "access", label: "Access Level" },
    { key: "login", label: "Last Login" },
    { key: "status", label: "Status" },
    { key: "actions", label: "Action" },
  ];

  const badgeClass = (color: "purple" | "indigo") =>
    color === "purple"
      ? "bg-purple-200/60 text-purple-800"
      : "bg-indigo-100 text-indigo-700";

  return (
    <table className="w-full min-w-[900px]">
      <thead className="hms-columnHeading-style">
        <tr className="bg-[rgba(242,244,246,0.40)]">
          {columns.map(({ key, label }, idx) => {
            const isSorted = sortField === key;
            return (
              <th key={key} className={`px-5 py-3 hms-table-header text-center ${idx === 0 ? "pl-8" : ""}`}>
                <div
                  className={`flex items-center justify-center gap-1 cursor-pointer select-none ${idx === 0 ? "-ml-3" : ""}`}
                  onClick={key !== "actions" ? () => onSort(key) : undefined}
                >
                  <span>{label}</span>
                  {key !== "actions" && (
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
        {rows.length > 0 ? (
          rows.map((staff, index) => (
            <tr key={staff.id + index} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F7F9FB] transition-colors group">
              <td className="px-5 py-4 pl-8">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-7 h-7 rounded-xl flex-shrink-0 hms-avatar-text ${badgeClass(staff.avatar)}`}>
                    {staff.initials}
                  </div>
                  <div>
                    <p className="hms-name-text">{staff.name}</p>
                    <p className="hms-id-text">{staff.id}</p>
                  </div>
                </div>
              </td>

              <td className="px-5 py-4 text-center">
                <span className={`px-1.5 py-0.5 rounded-sm hms-department-text tracking-[-0.4px] ${badgeClass(staff.roleColor)}`}>
                  {staff.role}
                </span>
              </td>

              <td className="px-5 py-4 text-center">
                <span className="text-[#191C1E] hms-content-text">
                  {staff.branch}
                  <br />
                
                </span>
              </td>

              <td className="px-5 py-4 text-center">
                <span className={`px-1.5 py-0.5 rounded-sm hms-department-text tracking-[-0.4px] ${badgeClass(staff.accessColor)}`}>
                  {staff.access}
                </span>
              </td>

              <td className="px-5 py-4 text-center">
                <span className="inline-flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${staff.loginDot === "green" ? "bg-green-500" : "bg-orange-500"}`} />
                  <span className="text-[#191C1E] hms-content-text whitespace-nowrap">{staff.login}</span>
                </span>
              </td>

              <td className="px-5 py-4 text-center">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusConfig[staff.status].className}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[staff.status].dot}`} />
                  {statusConfig[staff.status].label}
                </span>
              </td>

              <td className="px-5 py-4 text-center">
                <div className="flex items-center justify-center gap-1">
                  <button title="View" className="p-1.5 rounded transition-colors duration-200 hover:bg-none group">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200 stroke-[#1B1D20] hover:stroke-slate-500">
                      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                  <button title="Edit" className="p-1.5 rounded transition-colors duration-200 hover:bg-blue-50 group">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.36" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200 stroke-[#003EA8] hover:stroke-[#5E87CF]">
                      <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
                    </svg>
                  </button>
                  <button title="Delete" className="p-1.5 rounded transition-colors duration-200 hover:bg-red-50 group">
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
              No administrative staff found matching the current filters.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

// Support staff table (rendered when the "Support" tab is active)
function SupportTableView({
  rows,
  sortField,
  sortDirection,
  onSort,
}: {
  rows: SupportStaffRow[];
  sortField: string;
  sortDirection: "asc" | "desc";
  onSort: (field: string) => void;
}) {
  const columns = [
    { key: "name", label: "Name" },
    { key: "phone", label: "Phone Number" },
    { key: "dept", label: "Department" },
    { key: "branch", label: "Branch" },
    { key: "status", label: "Status" },
    { key: "actions", label: "Action" },
  ];

  return (
    <table className="w-full min-w-[900px]">
      <thead className="hms-columnHeading-style">
        <tr className="bg-[rgba(242,244,246,0.40)]">
          {columns.map(({ key, label }, idx) => {
            const isSorted = sortField === key;
            return (
              <th key={key} className={`px-5 py-3 hms-table-header text-center ${idx === 0 ? "pl-8" : ""}`}>
                <div
                  className={`flex items-center justify-center gap-1 cursor-pointer select-none ${idx === 0 ? "-ml-3" : ""}`}
                  onClick={key !== "actions" ? () => onSort(key) : undefined}
                >
                  <span>{label}</span>
                  {key !== "actions" && (
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
        {rows.length > 0 ? (
          rows.map((staff, index) => (
            <tr key={staff.id + index} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F7F9FB] transition-colors group">
              <td className="px-5 py-4 pl-8">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-7 h-7 rounded-xl flex-shrink-0 hms-avatar-text ${supportBadgeColors[staff.deptClass]}`}>
                    {staff.initials}
                  </div>
                  <div>
                    <p className="hms-name-text">{staff.name}</p>
                    <p className="hms-id-text">{staff.id}</p>
                  </div>
                </div>
              </td>

              <td className="px-5 py-4 text-center">
                <span className="text-[#191C1E] hms-content-text">{staff.phone}</span>
              </td>

              <td className="px-5 py-4 text-center">
                <span className={`px-1.5 py-0.5 rounded-sm hms-department-text tracking-[-0.4px] ${supportBadgeColors[staff.deptClass]}`}>
                  {staff.dept}
                </span>
              </td>

              <td className="px-5 py-4 text-center">
                <span className="text-[#191C1E] hms-content-text">{staff.branch}</span>
              </td>

              <td className="px-5 py-4 text-center">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusConfig[staff.status].className}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[staff.status].dot}`} />
                  {statusConfig[staff.status].label}
                </span>
              </td>

              <td className="px-5 py-4 text-center">
                <div className="flex items-center justify-center gap-1">
                  <button title="View" className="p-1.5 rounded transition-colors duration-200 hover:bg-none group">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200 stroke-[#1B1D20] hover:stroke-slate-500">
                      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                  <button title="Edit" className="p-1.5 rounded transition-colors duration-200 hover:bg-blue-50 group">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.36" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200 stroke-[#003EA8] hover:stroke-[#5E87CF]">
                      <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
                    </svg>
                  </button>
                  <button title="Delete" className="p-1.5 rounded transition-colors duration-200 hover:bg-red-50 group">
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
            <td colSpan={6} className="px-5 py-10 text-center text-[#6B7280] text-sm">
              No support staff found matching the current filters.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

// Map EmployeeRecord (from API) to Staff format for UI compatibility
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

function mapEmployeeToStaffData(emp: EmployeeRecord, index: number) {
  const palette = AVATAR_PALETTE[index % AVATAR_PALETTE.length];
  const fullName = `${emp.first_name} ${emp.middle_name ? emp.middle_name + " " : ""}${emp.last_name}`;
  const roleType = emp.user_table?.role_type || "STAFF";
  const isDoctor = roleType === "DOCTOR";
  const isMedical = ["DOCTOR", "NURSE", "PHARMACIST"].includes(roleType);
  
  // Map role_type to dept/status
  const status = (emp.emp_status === true || emp.user_table?.user_status === 1) ? "active" : "leave";
  
  if (isMedical) {
    // Medical staff (Doctor, Nurse, Pharmacist)
    return {
      initials: getInitials(fullName),
      name: fullName,
      phone: emp.mobile_no,
      id: emp.employee_id,
      dept: emp.specialization || emp.designation || roleType,
      deptClass: "bg-[#D6E3FF] text-[#475C7F]",
      branch: emp.branch?.branch_name ? [emp.branch.branch_name] : ["—"],
      status: status as "active" | "leave" | "inactive",
    };
  } else if (roleType === "STAFF") {
    // Administrative staff
    const avatars = ["purple", "indigo"] as const;
    const accessColors = ["purple", "indigo"] as const;
    const loginDots = ["green", "orange"] as const;
    const avatarIdx = index % 2;
    
    return {
      initials: getInitials(fullName),
      avatar: avatars[avatarIdx],
      name: fullName,
      id: emp.employee_id,
      role: emp.designation || "Staff",
      roleColor: accessColors[avatarIdx],
      branch: emp.branch?.branch_name || "—",
      access: emp.department_id || "Standard",
      accessColor: accessColors[avatarIdx],
      login: new Date().toLocaleDateString(),
      loginDot: loginDots[avatarIdx],
      status: status as "active" | "leave",
    };
  } else {
    // Support staff
    const deptColors = ["blue", "purple", "yellow", "green", "red"] as const;
    const deptIdx = index % 5;
    
    return {
      initials: getInitials(fullName),
      name: fullName,
      phone: emp.mobile_no,
      id: emp.employee_id,
      dept: emp.designation || "Support",
      deptClass: `bg-${deptColors[deptIdx]}-100 text-${deptColors[deptIdx]}-700` as const,
      branch: emp.branch?.branch_name || "—",
      status: status as "active" | "leave",
    };
  }
}

export default function Staff() {
  const { toast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const tabsMenuRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tabsMenuRef.current && !tabsMenuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Date selection
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState("name");
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

  const activeTabName = TABS[activeTab];
  const isMedicalTab = activeTabName === "Medical";
  const isAdministrativeTab = activeTabName === "Administrative";
  const isSupportTab = activeTabName === "Support";

  // Fetch all employees from backend and filter by role_type (exclude DOCTOR for staff)
  const [realStaff, setRealStaff] = useState<EmployeeRecord[] | null>(null);

  useEffect(() => {
    console.log("[Staff Page] Fetching all employees from employeeApi...");
    employeeApi
      .getAll()
      .then((res) => {
        console.log("[Staff Page] Response:", res.data);
        const allEmployees = res.data?.data?.employees || [];
        // Filter on frontend: exclude DOCTOR role_type
        const staff = allEmployees.filter((e) => e.user_table?.role_type !== "DOCTOR");
        if (staff.length > 0) {
          setRealStaff(staff);
        } else {
          toast({
            title: "Using fallback data",
            description: "No staff records returned yet — showing sample data.",
            variant: "destructive",
          });
        }
      })
      .catch((err) => {
        console.error("[Staff Page] Error:", err);
        console.error("[Staff Page] Error response:", err.response?.data);
        console.error("[Staff Page] Error status:", err.response?.status);
        toast({
          title: "Using fallback data",
          description: "Couldn't reach the employees API — showing sample data.",
          variant: "destructive",
        });
      });
  }, []);

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
        { label: "Leave", value: "leave" },
        { label: "Inactive", value: "inactive" },
         { label: "Resigned", value: "Resigned" },
      { label: "Suspended", value: "Suspended" },
      ],
    },
    
    { id: "role", label: "Role", type: "multiselect", options: [
      { label: "Cardiologist", value: "Cardiologist" },
      { label: "Oncologist", value: "Oncologist" },
      { label: "Pediatrician", value: "Pediatrician" },
      { label: "Neurologist", value: "Neurologist" },
      { label: "Head Nurse", value: "Head Nurse" },
      { label: "Radiologist", value: "Radiologist" },
      { label: "General Surgeon", value: "General Surgeon" },
    ]},
    
  ];

  // ---- EXPORT DROPDOWN ----
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const exportOptions = [
    { id: "pdf", label: "Export as PDF", icon: FileText },
    { id: "csv", label: "Export as CSV", icon: File },
  ];
  const handleExport = (format: string) => {
    console.log(`Exporting as ${format}`);
    setExportOpen(false);
  };
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Map EmployeeRecord to appropriate staff data format
  const AVATAR_PALETTE = [
    { avatarColor: "#00488D", initBg: "#D6E3FF" },
    { avatarColor: "#7B3200", initBg: "#FFDBCB" },
    { avatarColor: "#00C896", initBg: "rgba(0,200,150,0.12)" },
    { avatarColor: "#475C7F", initBg: "#E6E8EA" },
  ];

  function getInitials(name: string): string {
    const words = name.trim().split(/\s+/);
    return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
  }

  function mapEmployeeToStaffData(emp: EmployeeRecord, index: number) {
    const palette = AVATAR_PALETTE[index % AVATAR_PALETTE.length];
    const fullName = `${emp.first_name} ${emp.middle_name ? emp.middle_name + " " : ""}${emp.last_name}`;
    const roleType = emp.user_table?.role_type || "STAFF";
    const isActive = emp.emp_status === true || emp.user_table?.user_status === 1;
    const branchName = emp.branch?.branch_name || "—";
    const deptName = emp.specialization || emp.designation || "Unassigned";

    // Determine which tab this employee belongs to
    if (roleType === "NURSE" || roleType === "PHARMACIST") {
      // Medical tab
      return {
        initials: getInitials(fullName),
        name: fullName,
        phone: emp.mobile_no,
        id: emp.employee_id,
        dept: deptName,
        deptClass: "bg-[#D6E3FF] text-[#475C7F]",
        branch: branchName,
        status: isActive ? "active" : "leave",
      } as MedicalStaffRow;
    } else if (roleType === "STAFF") {
      // Administrative or Support tab - determine by designation
      const designation = emp.designation?.toLowerCase() || "";
      const isAdmin = ["admin", "executive", "accountant", "hr", "it", "manager", "receptionist"].some(d => designation.includes(d));
      
      if (isAdmin) {
        return {
          initials: getInitials(fullName),
          avatar: (index % 2 === 0 ? "purple" : "indigo") as "purple" | "indigo",
          name: fullName,
          id: emp.employee_id,
          role: emp.designation || "Staff",
          roleColor: (index % 2 === 0 ? "purple" : "indigo") as "purple" | "indigo",
          branch: branchName,
          access: "Full Access",
          accessColor: (index % 2 === 0 ? "purple" : "indigo") as "purple" | "indigo",
          login: isActive ? "Online" : "Offline",
          loginDot: isActive ? "green" : "orange",
          status: isActive ? "active" : "leave",
        } as AdministrativeStaffRow;
      } else {
        return {
          initials: getInitials(fullName),
          name: fullName,
          phone: emp.mobile_no,
          id: emp.employee_id,
          dept: deptName,
          deptClass: "blue",
          branch: branchName,
          status: isActive ? "active" : "leave",
        } as SupportStaffRow;
      }
    }
    // Default to medical staff
    return {
      initials: getInitials(fullName),
      name: fullName,
      phone: emp.mobile_no,
      id: emp.employee_id,
      dept: deptName,
      deptClass: "bg-[#D6E3FF] text-[#475C7F]",
      branch: branchName,
      status: isActive ? "active" : "leave",
    } as MedicalStaffRow;
  }

  // ---- SEARCH & FILTER ----
  const filteredData = useMemo(() => {
    // Use real data from API if available, otherwise fallback to static data
    let sourceData: (StaffMember | MedicalStaffRow | AdministrativeStaffRow | SupportStaffRow)[] = [];
    
    if (realStaff && realStaff.length > 0) {
      sourceData = realStaff.map(mapEmployeeToStaffData);
    } else if (isMedicalTab) {
      sourceData = [...medicalStaffData];
    } else if (isAdministrativeTab) {
      sourceData = [...administrativeStaffData];
    } else if (isSupportTab) {
      sourceData = [...supportStaffData];
    } else {
      sourceData = [...staffData];
    }

    let result = sourceData;

    if (searchQuery) {
      result = result.filter((staff) =>
        Object.values(staff)
          .map((value) => (Array.isArray(value) ? value.join(" ") : String(value ?? "")))
          .join(" ")
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      );
    }

    result = filterDataByValues(result, appliedValues);

    return result;
  }, [searchQuery, appliedValues, isMedicalTab, isAdministrativeTab, isSupportTab, realStaff]);

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

  // ---- PAGINATION ----
  const totalRecords = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRows = sortedData.slice(startIndex, endIndex);
  const visibleStart = totalRecords === 0 ? 0 : startIndex + 1;
  const visibleEnd = Math.min(endIndex, totalRecords);

  const columns = [
    { key: "name", label: "Name" },
    { key: "phone", label: "Phone Number" },
    { key: "dept", label: "Department" },
    { key: "branch", label: "Branch" },
    { key: "status", label: "Status" },
    { key: "actions", label: "Action" },
  ];

  return (
    <div className="flex w-full font-[Manrope,sans-serif] bg-[#F7F9FB] min-h-screen">
      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex flex-col gap-[17px]">

          {/* ==================== HEADER ==================== */}
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="hms-heading">Staff Management</h1>
              <p className="text-[#64748B] text-xs font-medium leading-4">Manage and overview all staff members across branches.</p>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="relative" ref={exportRef}>
                <button
                  onClick={() => setExportOpen(!exportOpen)}
                  className="flex items-center gap-[6px] h-[34px] px-[21px] py-[11px] border border-[#D1D5DB] bg-white rounded-[10px] text-[#374151] text-[13px] font-semibold hover:bg-[#F2F4F6] transition-colors"
                >
                  <FileText className="w-[14px] h-[14px]" />
                  Export report
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${exportOpen ? "rotate-180" : ""}`} />
                </button>

                {exportOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-[#E5E7EB] py-1 z-10 animate-slideDown">
                    {exportOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => handleExport(option.id)}
                        className="flex items-center gap-2 w-full px-4 py-2 text-[#424752] text-xs font-medium hover:bg-[#F2F4F6] transition-colors"
                      >
                        <option.icon className="w-4 h-4" />
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button className="flex items-center gap-[6px] h-[34px] px-[20px] py-[10px] bg-[#004785] rounded-[10px] text-white text-[12px] font-semibold hover:bg-[#003a6b] transition-colors">
                <Plus className="w-4 h-4" />
                Add new staff
              </button>
            </div>
          </div>

          {/* ==================== MAIN CARD ==================== */}
          <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] flex flex-col min-h-[500px]">

            {/* ==================== TOOLBAR ==================== */}
            <div className="min-h-[52px] px-[24px] py-3 border-b border-[#F1F5F9] flex flex-wrap items-center justify-between gap-4">

              {/* TABS */}
              <nav
                ref={tabsMenuRef}
                aria-label="Staff table sections"
                className="relative flex items-center"
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
                  className={[
                    "flex items-center gap-6 list-none m-0 p-0",
                    "max-[1024px]:flex-col max-[1024px]:items-start max-[1024px]:gap-3 max-[1024px]:absolute max-[1024px]:left-0 max-[1024px]:top-[calc(100%+8px)] max-[1024px]:z-20 max-[1024px]:w-48 max-[1024px]:bg-white max-[1024px]:border max-[1024px]:border-[#E5E7EB] max-[1024px]:rounded-lg max-[1024px]:shadow-lg max-[1024px]:overflow-hidden max-[1024px]:px-4 max-[1024px]:transition-[max-height,opacity,padding] max-[1024px]:duration-300 max-[1024px]:ease-in-out",
                    menuOpen
                      ? "max-[1024px]:max-h-[240px] max-[1024px]:opacity-100 max-[1024px]:py-3"
                      : "max-[1024px]:max-h-0 max-[1024px]:opacity-0 max-[1024px]:py-0 max-[1024px]:pointer-events-none max-[1024px]:border-transparent max-[1024px]:shadow-none",
                  ].join(" ")}
                >
                  {TABS.map((tab, index) => (
                    <li key={tab} className="relative">
                      <button
                        onClick={() => {
                          setActiveTab(index);
                          setMenuOpen(false);
                        }}
                        className={`py-1 text-xs font-semibold capitalize ${
                          activeTab === index ? "text-[#00488D] tracking-[1.2px]" : "text-[#424752]"
                        }`}
                      >
                        {tab}
                      </button>

                      {activeTab === index && (
                        <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[#00488D] max-[1024px]:hidden" />
                      )}
                    </li>
                  ))}
                </ul>
              </nav>

              {/* SEARCH / DATE / FILTERS */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search Box */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="pl-8 pr-3 py-[5px] bg-[#F2F4F6] text-xs text-[#6B7280] placeholder:text-[#6B7280] outline-none w-[224px] rounded-[4px] focus:ring-1 focus:ring-[#00488D]/30 transition-shadow duration-150"
                  />
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#424752]" />
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

                {/* Filters */}
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
              </div>
            </div>

            {/* ==================== TABLE ==================== */}
            <div className="overflow-x-auto flex-1">
              {isMedicalTab ? (
                <MedicalTableView
                  rows={currentRows as MedicalStaffRow[]}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              ) : isAdministrativeTab ? (
                <AdministrativeTableView
                  rows={currentRows as AdministrativeStaffRow[]}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              ) : isSupportTab ? (
                <SupportTableView
                  rows={currentRows as SupportStaffRow[]}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              ) : (
              <table className="w-full min-w-[900px]">
                <thead className="hms-columnHeading-style">
                  <tr className="bg-[rgba(242,244,246,0.40)]">
                    {columns.map(({ key, label }, idx) => {
                      const isSorted = sortField === key;
                      return (
                        <th
                          key={key}
                          className={`px-5 py-3 hms-table-header text-center ${idx === 0 ? "pl-8" : ""}`}
                        >
                          <div
                            className={`flex items-center justify-center gap-1 cursor-pointer select-none ${idx === 0 ? "-ml-8" : ""}`}
                            onClick={key !== "actions" ? () => handleSort(key) : undefined}
                          >
                            <span>{label}</span>
                            {key !== "actions" && (
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
                  {(currentRows as StaffMember[]).length > 0 ? (
                    (currentRows as StaffMember[]).map((staff, index) => (
                      <tr key={staff.id + index} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F7F9FB] transition-colors group">

                        {/* NAME */}
                        <td className="px-5 py-4 pl-8">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-7 h-7 rounded-xl flex-shrink-0 bg-emerald-100 text-emerald-600 hms-avatar-text">
                              {staff.initials}
                            </div>
                            <div>
                              <p className="hms-name-text">{staff.name}</p>
                              <p className="hms-id-text">{staff.id}</p>
                            </div>
                          </div>
                        </td>

                        {/* PHONE */}
                        <td className="px-5 py-4 text-center">
                          <span className="text-[#191C1E] hms-content-text">
                            {staff.phone}
                          </span>
                        </td>

                        {/* DEPARTMENT */}
                        <td className="px-5 py-4 text-center">
                          <span className={`px-1.5 py-0.5 rounded-sm hms-department-text tracking-[-0.4px] capitalize ${staff.deptClass}`}>
                            {staff.dept}
                          </span>
                        </td>

                        {/* BRANCH */}
                        <td className="px-5 py-4 text-center">
                          <span className="text-[#191C1E] hms-content-text">
                            {(Array.isArray(staff.branch) ? staff.branch : [staff.branch]).map((b, i) => (
                              <Fragment key={b}>
                                {b}
                                {i < (Array.isArray(staff.branch) ? staff.branch.length : 1) - 1 && <br />}
                              </Fragment>
                            ))}
                          </span>
                        </td>

                        {/* STATUS */}
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusConfig[staff.status].className}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[staff.status].dot}`} />
                            {statusConfig[staff.status].label}
                          </span>
                        </td>

                        {/* ACTIONS */}
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button title="View" className="p-1.5 rounded transition-colors duration-200 hover:bg-none group">
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200 stroke-[#1B1D20] hover:stroke-slate-500">
                                <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>
                            <button title="Edit" className="p-1.5 rounded transition-colors duration-200 hover:bg-blue-50 group">
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.36" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200 stroke-[#003EA8] hover:stroke-[#5E87CF]">
                                <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
                              </svg>
                            </button>
                            <button title="Delete" className="p-1.5 rounded transition-colors duration-200 hover:bg-red-50 group">
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
                      <td colSpan={6} className="px-5 py-10 text-center text-[#6B7280] text-sm">
                        No staff found matching the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              )}
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
                  <svg width="5" height="8" viewBox="0 0 5 8" fill="none">
                    <path d="M4 8L0 4L4 0L4.93333.933333L1.86667 4L4.93333 7.06667L4 8Z" fill="#424752"/>
                  </svg>
                </button>

                {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => (
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
                ))}
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
