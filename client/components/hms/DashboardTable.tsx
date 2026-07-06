import { useState, type ReactNode } from "react";

export type TableRow = Record<string, string | number>;

export type TableColumn = {
  key: string;
  label: string;
  sortable?: boolean;
};

type TableViewProps = {
  columns: TableColumn[];
  rows: TableRow[];
  sortField: string;
  sortDirection: "asc" | "desc";
  onSort: (field: string) => void;
  renderRow: (row: TableRow, index: number) => ReactNode;
};


function getRowId(row: TableRow) {
  if (typeof row.id === "string") {
    const digits = row.id.replace(/[^0-9]/g, "");
    return digits ? Number(digits) : 0;
  }
  return Number(row.id);
}

export function TableView({ columns, rows, sortField, sortDirection, onSort, renderRow }: TableViewProps) {
  return (
    <table className="w-full min-w-[640px]">
      <thead className="sticky top-0 z-10 bg-slate-100">
        <tr className="bg-[rgba(242,244,246,0.40)]">
          {columns.map((column) => (
            <th
              key={column.key}
              onClick={() => column.sortable !== false && onSort(column.key)}
               className={`px-5 py-2.5 hms-table-header ${
                column.sortable === false ? "text-right" : "text-left"
              } ${column.sortable !== false ? "cursor-pointer select-none whitespace-nowrap" : "whitespace-nowrap"}`}
            >
              <span className="inline-flex items-center gap-1">
                <span>{column.label}</span>
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
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${String(row.id)}-${index}`} className="border-t border-[rgba(194,198,212,0.05)] hover:bg-[#F7F9FB] transition-colors">
            {renderRow(row, index)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ActionButtons({ onEdit, onView, id }: { onEdit: (id: number) => void; onView: (id: number) => void; id: number }) {
  return (
    <div className="flex items-center justify-end gap-3">
      <button title="Edit" onClick={() => onEdit(id)} className="p-1.5 rounded transition-colors duration-200 hover:bg-blue-50 group">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.36" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200 stroke-[#003EA8] group-hover:stroke-[#5E87CF] lucide lucide-square-pen">
          <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
        </svg>
      </button>
      <button title="View" onClick={() => onView(id)} className="p-1.5 rounded transition-colors duration-200 hover:bg-none group">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200 stroke-[#1B1D20] group-hover:stroke-[#505F76] lucide lucide-eye">
          <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
    </div>
  );
}

export function DoctorsTableView({ rows, sortField, sortDirection, onSort, onEdit, onView }: { rows: TableRow[]; sortField: string; sortDirection: "asc" | "desc"; onSort: (field: string) => void; onEdit: (id: number) => void; onView: (id: number) => void }) {
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

export function StaffTableView({ rows, sortField, sortDirection, onSort, onEdit, onView }: { rows: TableRow[]; sortField: string; sortDirection: "asc" | "desc"; onSort: (field: string) => void; onEdit: (id: number) => void; onView: (id: number) => void }) {
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

export function AppointmentsTableView({ rows, sortField, sortDirection, onSort, onEdit, onView }: { rows: TableRow[]; sortField: string; sortDirection: "asc" | "desc"; onSort: (field: string) => void; onEdit: (id: number) => void; onView: (id: number) => void }) {
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
      renderRow={(row) => {
        const status = String(row.status);
        const isActive = status === "Active";

        return (
          <>
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

            <td className="px-5 py-3">
              <span className="px-3 py-1 rounded-[20px] hms-content-text inline-block" style={{ background: "#EEF2FF", color: "#4F46E5" }}>
                {String(row.appointmentNo)}
              </span>
            </td>

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

            <td className="px-5 py-3 text-[#191C1E] hms-content-text leading-4">
              {String(row.reason)}
            </td>

            <td className="px-5 py-3 text-[#191C1E] hms-content-text leading-4">
              <div>{String(row.date)}</div>
              <div className="text-[#8C8D8F] hms-department-text">
                {String(row.time)}
              </div>
            </td>

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
