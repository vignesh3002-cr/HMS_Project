export interface MedicalStaffRow {
  initials: string;
  avatarBg: string;
  initialsColor: string;
  name: string;
  phone: string;
  id: string;
  dept: string;
  deptBg: string;
  deptColor: string;
  branch: string;
  status: "Active" | "Leave";
}

export const medicalStaffData: MedicalStaffRow[] = [
  {
    initials: "SJ",
    avatarBg: "#D6E3FF",
    initialsColor: "#475C7F",
    name: "Dr. Sarah Jenkins",
    phone: "+1 (555) 123-4567",
    id: "DOC-9042",
    dept: "Neuroscience",
    deptBg: "#D6E3FF",
    deptColor: "#475C7F",
    branch: "Central Hospital Tambaram",
    status: "Active",
  },
  {
    initials: "AM",
    avatarBg: "#EDE9FE",
    initialsColor: "#475C7F",
    name: "Dr. Ajay Mehta",
    phone: "+1 (555) 123-4567",
    id: "DOC-9043",
    dept: "Cardiology",
    deptBg: "#EDE9FE",
    deptColor: "#475C7F",
    branch: "Central Hospital Tambaram",
    status: "Leave",
  },
  {
    initials: "RL",
    avatarBg: "#FDE68A",
    initialsColor: "#CE6228",
    name: "Dr. Robert Lee",
    phone: "+1 (555) 234-5678",
    id: "DOC-4431",
    dept: "Pediatrics",
    deptBg: "#FDE68A",
    deptColor: "#CE6228",
    branch: "Central Hospital Saidapet",
    status: "Active",
  },
  {
    initials: "AM",
    avatarBg: "#D1FAE5",
    initialsColor: "#0D9651",
    name: "Angela Moore",
    phone: "+1 (555) 345-6789",
    id: "NUR-0098",
    dept: "Nursing",
    deptBg: "#D1FAE5",
    deptColor: "#0D9651",
    branch: "Central Hospital Egmore",
    status: "Leave",
  },
  {
    initials: "EW",
    avatarBg: "#FEE2E2",
    initialsColor: "#8C3789",
    name: "Elena Wright",
    phone: "+1 (555) 567-8901",
    id: "DOC-1192",
    dept: "Cardiology",
    deptBg: "#FEE2E2",
    deptColor: "#8C3789",
    branch: "North Wing",
    status: "Active",
  },
  {
    initials: "SS",
    avatarBg: "#D6E3FF",
    initialsColor: "#475C7F",
    name: "Dr. Steven Strange",
    phone: "+1 (555) 123-4567",
    id: "DOC-9044",
    dept: "Neuroscience",
    deptBg: "#D6E3FF",
    deptColor: "#475C7F",
    branch: "Central Hospital Tambaram",
    status: "Active",
  },
];

const statusStyles: Record<MedicalStaffRow["status"], { className: string; dot: string }> = {
  Active: { className: "bg-green-50 text-green-600", dot: "bg-green-500" },
  Leave: { className: "bg-orange-50 text-orange-500", dot: "bg-orange-500" },
};

export function MedicalTableView({
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
              <th key={key} className={`px-5 py-3 hms-table-header text-left ${idx === 0 ? "pl-8" : ""}`}>
                <div
                  className="flex items-center gap-1 cursor-pointer select-none"
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
                  <div
                    className="flex items-center justify-center w-7 h-7 rounded-xl flex-shrink-0 hms-avatar-text"
                    style={{ background: staff.avatarBg, color: staff.initialsColor }}
                  >
                    {staff.initials}
                  </div>
                  <div>
                    <p className="hms-name-text">{staff.name}</p>
                    <p className="hms-id-text">{staff.id}</p>
                  </div>
                </div>
              </td>

              <td className="px-5 py-4">
                <span className="text-[#191C1E] hms-content-text">{staff.phone}</span>
              </td>

              <td className="px-5 py-4">
                <span
                  className="px-1.5 py-0.5 rounded-sm hms-department-text tracking-[-0.4px] capitalize"
                  style={{ background: staff.deptBg, color: staff.deptColor }}
                >
                  {staff.dept}
                </span>
              </td>

              <td className="px-5 py-4">
                <span className="text-[#191C1E] hms-content-text">{staff.branch}</span>
              </td>

              <td className="px-5 py-4">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusStyles[staff.status].className}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusStyles[staff.status].dot}`} />
                  {staff.status}
                </span>
              </td>

              <td className="px-5 py-4">
                <div className="flex items-center gap-1">
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
