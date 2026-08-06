import { useMemo, useState } from "react";
import { PATIENTS } from "../data/patients";
import type { AppointmentStatus, Patient } from "../types";

const PAGE_SIZE = 9;
const TOTAL_DOCTORS = 156; // mirrors the "Showing X to Y of 156 doctors" footer from the design

/* ---------- avatar color helper (used by PatientTable below) ---------- */

const AVATAR_PALETTE = [
  { bg: "bg-orange-50", text: "text-orange-500" },
  { bg: "bg-blue-50", text: "text-blue-500" },
  { bg: "bg-emerald-50", text: "text-emerald-500" },
  { bg: "bg-purple-50", text: "text-purple-500" },
  { bg: "bg-pink-50", text: "text-pink-500" },
  { bg: "bg-amber-50", text: "text-amber-600" },
];

function getAvatarColor(name: string) {
  const index = name.charCodeAt(0) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
}

/* ---------- StatusBadge ---------- */

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  "Checked Out": "bg-emerald-50 text-emerald-600",
  Confirmed: "bg-blue-50 text-blue-600",
  "Checked In": "bg-amber-50 text-amber-600",
  Cancelled: "bg-red-50 text-red-500",
  Reschedule: "bg-purple-50 text-purple-600",
};

function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

/* ---------- AppointmentToolbar ---------- */

interface ToolbarProps {
  totalPatients: number;
  view: "grid" | "list";
  onViewChange: (view: "grid" | "list") => void;
  search: string;
  onSearchChange: (value: string) => void;
}

function AppointmentToolbar({ totalPatients, view, onViewChange, search, onSearchChange }: ToolbarProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-gray-800">Grid View</span>
        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
          Total Patients : {totalPatients}
        </span>
      </div>

      <div className="flex-1 min-w-[180px] relative">
        <svg
          className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-3.8-3.8" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search..."
          className="w-full text-sm bg-gray-50 rounded-lg pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
        <button
          onClick={() => onViewChange("list")}
          aria-label="List view"
          aria-pressed={view === "list"}
          className={`w-8 h-8 flex items-center justify-center rounded-md ${
            view === "list" ? "bg-white shadow-sm text-gray-700" : "text-gray-400"
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <button
          onClick={() => onViewChange("grid")}
          aria-label="Grid view"
          aria-pressed={view === "grid"}
          className={`w-8 h-8 flex items-center justify-center rounded-md ${
            view === "grid" ? "bg-white shadow-sm text-blue-700" : "text-gray-400"
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-600">
        <button aria-label="Previous day" className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-50">
          ‹
        </button>
        <span className="px-2 font-medium">Today</span>
        <button aria-label="Next day" className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-50">
          ›
        </button>
      </div>

      <button className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 5h16l-6 8v5l-4 2v-7L4 5z" />
        </svg>
        Filters
      </button>
    </div>
  );
}

/* ---------- PatientCard (grid view) ---------- */

function PatientCard({ patient }: { patient: Patient }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4">
      {patient.avatarUrl ? (
        <img
          src={patient.avatarUrl}
          alt={patient.name}
          className="w-20 h-20 rounded-xl object-cover shrink-0"
        />
      ) : (
        <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
          <svg className="w-10 h-10 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" />
          </svg>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-gray-900 truncate">{patient.name}</h3>
          <button aria-label="More options" className="text-gray-400 hover:text-gray-600 -mt-1 -mr-1 px-1">
            ⋮
          </button>
        </div>
        <p className="text-xs font-medium text-blue-600">{patient.patientCode}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {patient.age}/{patient.gender}
        </p>
        <p className="text-xs text-gray-500 mt-2">{patient.phone}</p>

        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-semibold text-gray-700">{patient.bloodGroup}</span>
          <button
            aria-label={`Schedule appointment for ${patient.name}`}
            className="w-7 h-7 flex items-center justify-center rounded-md bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="17" rx="2" />
              <path d="M3 9h18M8 2v4M16 2v4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- PatientTable (list view) ---------- */

const COLUMNS: { key: string; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "age", label: "Age/Gender" },
  { key: "phone", label: "Mobile" },
  { key: "bloodGroup", label: "Blood Group" },
  { key: "appointmentDate", label: "Appointment" },
  { key: "status", label: "Status" },
];

function SortIcon() {
  return (
    <svg className="w-3 h-3 inline ml-1 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />
    </svg>
  );
}

function PatientTable({ patients }: { patients: Patient[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
            {COLUMNS.map((col) => (
              <th key={col.key} className="font-medium py-3 px-3 whitespace-nowrap select-none cursor-pointer">
                {col.label}
                <SortIcon />
              </th>
            ))}
            <th className="font-medium py-3 px-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((patient) => {
            const color = getAvatarColor(patient.name);
            return (
              <tr key={patient.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-3">
                    {patient.avatarUrl ? (
                      <img src={patient.avatarUrl} alt={patient.name} className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <span
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${color.bg} ${color.text}`}
                      >
                        {patient.name.charAt(0)}
                      </span>
                    )}
                    <div>
                      <p className="font-medium text-gray-800">{patient.name}</p>
                      <p className="text-xs text-gray-400">{patient.patientCode}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
                  {patient.age} / {patient.gender}
                </td>
                <td className="py-3 px-3 text-gray-600 whitespace-nowrap">{patient.phone}</td>
                <td className="py-3 px-3">
                  <span className="text-xs font-semibold text-red-500 bg-red-50 px-2.5 py-1 rounded-md">
                    {patient.bloodGroup}
                  </span>
                </td>
                <td className="py-3 px-3 text-gray-600 whitespace-nowrap">{patient.appointmentDate}</td>
                <td className="py-3 px-3">
                  <StatusBadge status={patient.status} />
                </td>
                <td className="py-3 px-3">
                  <div className="flex items-center justify-end gap-3 text-gray-400">
                    <button aria-label={`Edit ${patient.name}`} className="hover:text-blue-600">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </button>
                    <button aria-label={`View ${patient.name}`} className="hover:text-blue-600">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                    <button aria-label={`Delete ${patient.name}`} className="hover:text-red-500">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18" />
                        <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Pagination ---------- */

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  rangeLabel: string;
}

function Pagination({ page, totalPages, onPageChange, rangeLabel }: PaginationProps) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-gray-500">{rangeLabel}</p>

      <div className="flex items-center gap-1">
        <button
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
          className="w-8 h-8 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          ‹
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => onPageChange(n)}
            aria-current={n === page ? "page" : undefined}
            className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium ${
              n === page ? "bg-blue-700 text-white" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            {n}
          </button>
        ))}
        <button
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
          className="w-8 h-8 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          ›
        </button>
      </div>
    </div>
  );
}

/* ---------- AppointmentPage ---------- */

export default function AppointmentPage() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () =>
      PATIENTS.filter((p) =>
        `${p.name} ${p.patientCode}`.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Appointment</h2>

        <div className="flex items-center gap-4">
          <button
            aria-label="Notifications"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.7 21a2 2 0 01-3.4 0" />
            </svg>
          </button>
          <span className="h-6 w-px bg-gray-200" />
          <span className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="4" width="18" height="17" rx="2" />
              <path d="M3 9h18M8 2v4M16 2v4" />
            </svg>
            May 30, 2026
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
        <AppointmentToolbar
          totalPatients={PATIENTS.length}
          view={view}
          onViewChange={setView}
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />

        {pageItems.length > 0 ? (
          view === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pageItems.map((patient) => (
                <PatientCard key={patient.id} patient={patient} />
              ))}
            </div>
          ) : (
            <PatientTable patients={pageItems} />
          )
        ) : (
          <div className="text-center text-sm text-gray-500 py-10">
            No patients match "{search}".
          </div>
        )}

        <Pagination
          page={currentPage}
          totalPages={totalPages}
          onPageChange={setPage}
          rangeLabel={`Showing ${filtered.length === 0 ? 0 : start + 1} to ${Math.min(
            start + PAGE_SIZE,
            filtered.length
          )} of ${TOTAL_DOCTORS} doctors`}
        />
      </div>
    </div>
  );
}
