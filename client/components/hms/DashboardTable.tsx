import { useState, type ReactNode } from "react";

// Type definition for table row data - each row is an object with string or number values
export type TableRow = Record<string, string | number>;

// Type definition for table column configuration
export type TableColumn = {
  key: string;          // Unique identifier for the column, matches row data keys
  label: string;        // Display text for column header
  sortable?: boolean;   // Optional: determines if column can be sorted (defaults to true)
};

// Props interface for the base TableView component
type TableViewProps = {
  columns: TableColumn[];           // Array of column configurations
  rows: TableRow[];                 // Array of row data objects
  sortField: string;                // Currently sorted column key
  sortDirection: "asc" | "desc";    // Current sort direction
  onSort: (field: string) => void;  // Callback function when sorting is triggered
  renderRow: (row: TableRow, index: number) => ReactNode; // Function to render each row's content
};

/**
 * Extracts and converts row ID to a number for action buttons
 * Handles both string IDs (with potential non-numeric characters) and numeric IDs
 * @param row - The table row data object
 * @returns Numeric ID (defaults to 0 if no valid ID found)
 */
function getRowId(row: TableRow) {
  // If ID is a string, extract only digits and convert to number
  if (typeof row.id === "string") {
    const digits = row.id.replace(/[^0-9]/g, "");
    return digits ? Number(digits) : 0;
  }
  // If ID is already a number, return it directly
  return Number(row.id);
}

/**
 * Base TableView component - a reusable, sortable table with customizable columns and rows
 * This is the core table component that handles rendering, sorting, and structure
 */
export function TableView({ columns, rows, sortField, sortDirection, onSort, renderRow }: TableViewProps) {
  return (
    <table className="w-full min-w-[640px]">
      {/* Table Header Section */}
      <thead className="hms-columnHeading-style">
        <tr className="bg-[rgba(242,244,246,0.40)]">
          {columns.map((column) => (
            <th
              key={column.key}
              // Click handler for sorting - only triggers if column is sortable
              onClick={() => column.sortable !== false && onSort(column.key)}
              className={`px-5 py-2.5 hms-table-header ${
                // Right-align non-sortable columns (like Actions), left-align others
                column.sortable === false ? "text-right" : "text-left"
              } ${column.sortable !== false ? "cursor-pointer select-none whitespace-nowrap" : "whitespace-nowrap"}`}
            >
              <span className="inline-flex items-center gap-1">
                <span>{column.label}</span>
                {/* Sort indicator - shows up/down arrow or neutral icon */}
                {column.sortable !== false && (
                  <span className="inline-flex h-3 w-3 items-center justify-center text-[7px] shrink-0">
                    {sortField === column.key ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                  </span>
                )}
              </span>
            </th>
          ))}
        </tr>
      </thead>
      {/* Table Body - Renders each row using the provided renderRow function */}
      <tbody>
        {rows.map((row, index) => (
          <tr 
            key={`${String(row.id)}-${index}`}  // Unique key combining ID and index
            className="border-t border-[rgba(194,198,212,0.05)] hover:bg-[#F7F9FB] transition-colors"
          >
            {renderRow(row, index)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * ActionButtons Component - Renders Edit and View buttons with hover effects
 * Used for row-level actions in various table views
 * @param onEdit - Callback for edit action, receives row ID
 * @param onView - Callback for view action, receives row ID
 * @param id - The row ID to pass to action callbacks
 */
export function ActionButtons({ onEdit, onView, id }: { onEdit: (id: number) => void; onView: (id: number) => void; id: number }) {
  return (
    <div className="flex items-center justify-end gap-3">
      {/* Edit Button - Blue themed, with hover effect */}
      <button 
        title="Edit" 
        onClick={() => onEdit(id)} 
        className="p-1.5 rounded transition-colors duration-200 hover:bg-blue-50 group"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.36" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200 stroke-[#003EA8] group-hover:stroke-[#5E87CF] lucide lucide-square-pen">
          <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
        </svg>
      </button>
      {/* View Button - Dark themed, with hover effect */}
      <button 
        title="View" 
        onClick={() => onView(id)} 
        className="p-1.5 rounded transition-colors duration-200 hover:bg-none group"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200 stroke-[#1B1D20] group-hover:stroke-[#505F76] lucide lucide-eye">
          <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
    </div>
  );
}

/**
 * DoctorsTableView - Specialized table view for displaying doctor records
 * Extends the base TableView with doctor-specific columns and rendering
 * Features: Name with avatar, Department badge, Status indicator, Action buttons
 */
export function DoctorsTableView({ rows, sortField, sortDirection, onSort, onEdit, onView }: { 
  rows: TableRow[]; 
  sortField: string; 
  sortDirection: "asc" | "desc"; 
  onSort: (field: string) => void; 
  onEdit: (id: number) => void; 
  onView: (id: number) => void 
}) {
  return (
    <TableView
      columns={[
        { key: "name", label: "Name" },
        { key: "dept", label: "Department" },
        { key: "branch", label: "Branch" },
        { key: "status", label: "Status" },
        { key: "actions", label: "Actions", sortable: false }, // Actions column is NOT sortable
      ]}
      rows={rows}
      sortField={sortField}
      sortDirection={sortDirection}
      onSort={onSort}
      // Custom render function for doctor rows
      renderRow={(row) => {
        const status = String(row.status);
        const isActive = status === "Active";
        return (
          <>
            {/* Name column with avatar and ID */}
            <td className="px-5 py-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 flex items-center justify-center rounded-xl flex-shrink-0 hms-avatar-text" style={{ background: String(row.initBg), color: String(row.avatarColor) }}>
                  {String(row.avatar)}
                </div>
                <div>
                  <div className="hms-name-text">{String(row.name)}</div>
                  <div className="hms-id-text">{String(row.id)}</div>
                </div>
              </div>
            </td>
            {/* Department column with colored badge */}
            <td className="px-5 py-3">
              <span className="px-1.5 py-0.5 rounded-sm hms-department-text tracking-[-0.4px] capitalize" style={{ background: String(row.deptBg), color: String(row.deptColor) }}>
                {String(row.dept)}
              </span>
            </td>
            {/* Branch column */}
            <td className="px-5 py-3 text-[#191C1E] hms-content-text leading-4">{String(row.branch)}</td>
            {/* Status column with dynamic styling based on active/inactive */}
            <td className="px-5 py-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: isActive ? "#F0FDF4" : "#FFF7ED", color: isActive ? "#16A34A" : "#F97316" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: isActive ? "#22C55E" : "#F97316" }} />
                {status}
              </span>
            </td>
            {/* Action buttons - Edit and View */}
            <td className="px-5 py-3">
              <ActionButtons onEdit={onEdit} onView={onView} id={getRowId(row)} />
            </td>
          </>
        );
      }}
    />
  );
}

/**
 * StaffTableView - Specialized table view for displaying staff records
 * Similar structure to DoctorsTableView but for staff members
 * Features: Name with avatar, Department badge, Status indicator, Action buttons
 */
export function StaffTableView({ rows, sortField, sortDirection, onSort, onEdit, onView }: { 
  rows: TableRow[]; 
  sortField: string; 
  sortDirection: "asc" | "desc"; 
  onSort: (field: string) => void; 
  onEdit: (id: number) => void; 
  onView: (id: number) => void 
}) {
  return (
    <TableView
      columns={[
        { key: "name", label: "Name" },
        { key: "dept", label: "Department" },
        { key: "branch", label: "Branch" },
        { key: "status", label: "Status" },
        { key: "actions", label: "Actions", sortable: false },
      ]}
      rows={rows}
      sortField={sortField}
      sortDirection={sortDirection}
      onSort={onSort}
      // Similar render function to DoctorsTableView
      renderRow={(row) => {
        const status = String(row.status);
        const isActive = status === "Active";
        return (
          <>
            <td className="px-5 py-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 flex items-center justify-center rounded-xl flex-shrink-0 hms-avatar-text" style={{ background: String(row.initBg), color: String(row.avatarColor) }}>
                  {String(row.avatar)}
                </div>
                <div>
                  <div className="hms-name-text">{String(row.name)}</div>
                  <div className="hms-id-text">{String(row.id)}</div>
                </div>
              </div>
            </td>
            <td className="px-5 py-3">
              <span className="px-1.5 py-0.5 rounded-sm hms-department-text tracking-[-0.4px] capitalize" style={{ background: String(row.deptBg), color: String(row.deptColor) }}>
                {String(row.dept)}
              </span>
            </td>
            <td className="px-5 py-3 text-[#191C1E] hms-content-text leading-4">{String(row.branch)}</td>
            <td className="px-5 py-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: isActive ? "#F0FDF4" : "#FFF7ED", color: isActive ? "#16A34A" : "#F97316" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: isActive ? "#22C55E" : "#F97316" }} />
                {status}
              </span>
            </td>
            <td className="px-5 py-3">
              <ActionButtons onEdit={onEdit} onView={onView} id={getRowId(row)} />
            </td>
          </>
        );
      }}
    />
  );
}

/**
 * AppointmentsTableView - Specialized table view for displaying appointment records
 * Most complex view showing patient details, doctor assignment, timing, and status
 * Features: Patient info, Appointment number, Doctor info, Reason, Date/Time, Status
 */
export function AppointmentsTableView({ rows, sortField, sortDirection, onSort, onEdit, onView }: { 
  rows: TableRow[]; 
  sortField: string; 
  sortDirection: "asc" | "desc"; 
  onSort: (field: string) => void; 
  onEdit: (id: number) => void; 
  onView: (id: number) => void 
}) {
  return (
    <TableView
      columns={[
        { key: "patientName", label: "Patient Name" },
        { key: "appointmentNo", label: "Appointment No" },
        { key: "doctorName", label: "Assigned Doctor" },
        { key: "reason", label: "Reason" },
        { key: "date", label: "Timing" },
        { key: "status", label: "Status" },
        { key: "actions", label: "Action", sortable: false },
      ]}
      rows={rows}
      sortField={sortField}
      sortDirection={sortDirection}
      onSort={onSort}
      // Complex render function for appointment rows
      renderRow={(row) => {
        const status = String(row.status);
        const isActive = status === "Active";

        return (
          <>
            {/* Patient Name column with avatar and patient ID */}
            <td className="px-5 py-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 flex items-center justify-center rounded-xl flex-shrink-0 hms-avatar-text" style={{ background: String(row.avatarBg), color: String(row.avatarColor) }}>
                  {String(row.avatar)}
                </div>
                <div>
                  <div className="hms-name-text">
                    {String(row.patientName)}
                  </div>
                  <div className="hms-id-text">
                    {String(row.patientId)}
                  </div>
                </div>
              </div>
            </td>

            {/* Appointment Number with styled badge */}
            <td className="px-5 py-3">
              <span className="px-3 py-1 rounded-[20px] hms-content-text inline-block" style={{ background: "#EEF2FF", color: "#4F46E5" }}>
                {String(row.appointmentNo)}
              </span>
            </td>

            {/* Assigned Doctor column with avatar and doctor ID */}
            <td className="px-5 py-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 flex items-center justify-center rounded-xl flex-shrink-0 hms-avatar-text" style={{ background: String(row.doctorAvatarBg), color: String(row.doctorAvatarcolor) }}>
                  {String(row.doctorAvatar)}
                </div>
                <div>
                  <div className="hms-name-text">
                    {String(row.doctorName)}
                  </div>
                  <div className="hms-id-text">
                    {String(row.doctorId)}
                  </div>
                </div>
              </div>
            </td>

            {/* Reason for appointment */}
            <td className="px-5 py-3 text-[#191C1E] hms-content-text leading-4">
              {String(row.reason)}
            </td>

            {/* Date and Time column - shows both date and time in separate lines */}
            <td className="px-5 py-3 text-[#191C1E] hms-content-text leading-4">
              <div>{String(row.date)}</div>
              <div className="text-[#8C8D8F] hms-department-text">
                {String(row.time)}
              </div>
            </td>

            {/* Status column with active/inactive styling */}
            <td className="px-5 py-3">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: isActive ? "#F0FDF4" : "#FFF7ED",
                  color: isActive ? "#16A34A" : "#F97316",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: isActive ? "#22C55E" : "#F97316",
                  }}
                />
                {status}
              </span>
            </td>

            {/* Action buttons for appointment */}
            <td className="px-5 py-3">
              <ActionButtons
                onEdit={onEdit}
                onView={onView}
                id={getRowId(row)}
              />
            </td>
          </>
        );
      }}
    />
  );
}