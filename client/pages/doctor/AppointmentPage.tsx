import { useCallback, useEffect, useMemo, useState } from "react";
import {
  appointmentApi,
  type AppointmentRecord,
} from "../../api/appointment.api";
import { employeeApi } from "../../api/employee.api";
import { getActiveBranchId } from "../../api/axios";
import { getUser } from "../../utils/token";

type AppointmentStatus =
  | "Checked Out"
  | "Confirmed"
  | "Checked In"
  | "Cancelled"
  | "Reschedule"
  | "In Consultation"
  | "No Show"
  | "Transfer Review"
  | "Reschedule Required";

interface Patient {
  id: string;
  name: string;
  patientCode: string;
  age?: number;
  gender?: string;
  phone?: string;
  bloodGroup?: string;
  appointmentDate: string;
  status: AppointmentStatus;
  avatarUrl?: string;
}

const STATUS_TO_DISPLAY: Record<string, AppointmentStatus> = {
  SCHEDULED: "Confirmed",
  RESCHEDULED: "Reschedule",
  CHECKED_IN: "Checked In",
  IN_CONSULTATION: "In Consultation",
  COMPLETED: "Checked Out",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
  TRANSFER_REVIEW_REQUIRED: "Transfer Review",
  RESCHEDULE_REQUIRED: "Reschedule Required",
};

function toDisplayStatus(status: string | null | undefined): AppointmentStatus {
  if (!status) return "Confirmed";
  return STATUS_TO_DISPLAY[status] ?? "Confirmed";
}

function buildPatientName(bio?: AppointmentRecord["patient_bio_data"]): string {
  if (!bio) return "Unknown Patient";
  const parts = [
    bio.patient_first_name,
    bio.patient_middle_name,
    bio.patient_last_name,
  ].filter(Boolean);
  return parts.join(" ") || "Unknown Patient";
}

function formatAppointmentTime(time?: string | null): string {
  if (!time) return "";
  let hours: number;
  let minutes: number;
  if (time.includes("T")) {
    const date = new Date(time);
    if (isNaN(date.getTime())) return time;
    hours = date.getUTCHours();
    minutes = date.getUTCMinutes();
  } else {
    const [h, m] = time.split(":");
    hours = Number(h);
    minutes = Number(m ?? "0");
    if (isNaN(hours)) return time;
  }
  const period = hours < 12 ? "AM" : "PM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(hour12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
}

function toPatient(a: AppointmentRecord): Patient {
  const bio = a.patient_bio_data;
  const gender = bio?.patient_gender
    ? bio.patient_gender.charAt(0).toUpperCase() +
      bio.patient_gender.slice(1).toLowerCase()
    : "—";
  const dateFallback = a.appointment_date
    ? a.appointment_date.slice(0, 10)
    : "—";

  return {
    id: a.appointment_id,
    name: buildPatientName(bio),
    patientCode: bio?.patient_id ?? `Token ${a.token_number ?? ""}`.trim(),
    gender,
    phone: bio?.patient_primary_mobile ?? "—",
    appointmentDate: formatAppointmentTime(a.appointment_time) || dateFallback,
    status: toDisplayStatus(a.status),
  };
}

const PAGE_SIZE = 9;

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

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  "Checked Out": "bg-emerald-50 text-emerald-600",
  Confirmed: "bg-blue-50 text-blue-600",
  "Checked In": "bg-amber-50 text-amber-600",
  Cancelled: "bg-red-50 text-red-500",
  Reschedule: "bg-purple-50 text-purple-600",
  "In Consultation": "bg-cyan-50 text-cyan-600",
  "No Show": "bg-gray-50 text-gray-500",
  "Transfer Review": "bg-indigo-50 text-indigo-600",
  "Reschedule Required": "bg-purple-50 text-purple-600",
};

function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span
      className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

interface ToolbarProps {
  totalPatients: number;
  view: "grid" | "list";
  onViewChange: (view: "grid" | "list") => void;
  search: string;
  onSearchChange: (value: string) => void;
}

function AppointmentToolbar({
  totalPatients,
  view,
  onViewChange,
  search,
  onSearchChange,
}: ToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap px-5 py-3 border-b border-[rgba(194,198,212,0.10)]">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold tracking-[1.2px] uppercase text-[#424752]">
          Appointment
        </span>

        <span className="px-2.5 py-1 rounded-full bg-[#EEF2FF] text-[#4F46E5] text-[10px] font-semibold">
          Total Patients : {totalPatients}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-end">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="pl-8 pr-3 py-1.5 bg-[#F2F4F6] text-xs text-[#6B7280] placeholder:text-[#6B7280] outline-none w-[150px] sm:w-[200px] rounded-md transition-all duration-200 focus:rounded-none focus:w-[200px] sm:focus:w-[250px]"
          />
          <svg
            className="absolute left-2 top-1/2 -translate-y-1/2"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
          >
            <path
              d="M11.0667 11.5713L6.86667 7.3713C6.53333 7.638 6.15 7.8491 5.71667 8.0046C5.28333 8.1602 4.82222 8.238 4.33333 8.238C3.12222 8.238 2.09722 7.8185 1.25833 6.9796C0.419444 6.1407 0 5.1157 0 3.90462C0 2.69351.419444 1.66851 1.25833.82962C2.09722-.00927 3.12222-.42871 4.33333-.42871C5.54444-.42871 6.56944-.00927 7.40833.82962C8.24722 1.66851 8.66667 2.69351 8.66667 3.90462C8.66667 4.3935 8.58889 4.8546 8.43333 5.288C8.27778 5.7213 8.06667 6.1046 7.8 6.438L12 10.638L11.0667 11.5713ZM4.33333 6.9046C5.16667 6.9046 5.875 6.613 6.45833 6.0296C7.04167 5.4463 7.33333 4.738 7.33333 3.90462C7.33333 3.07129 7.04167 2.36296 6.45833 1.77962C5.875 1.19629 5.16667.90462 4.33333.90462C3.5.90462 2.79167 1.19629 2.20833 1.77962C1.625 2.36296 1.33333 3.07129 1.33333 3.90462C1.33333 4.738 1.625 5.4463 2.20833 6.0296C2.79167 6.613 3.5 6.9046 4.33333 6.9046Z"
              fill="#424752"
            />
          </svg>
        </div>

        {/* View toggle */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => onViewChange("list")}
            aria-label="List view"
            aria-pressed={view === "list"}
            className={`flex items-center justify-center w-[25px] h-[27px] border border-[#E5E7EB] rounded-l-lg transition-colors duration-150 ${
              view === "list"
                ? "bg-[#00488D] text-white"
                : "bg-white text-[#424752] hover:bg-[#F2F4F6]"
            }`}
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => onViewChange("grid")}
            aria-label="Grid view"
            aria-pressed={view === "grid"}
            className={`flex items-center justify-center w-[25px] h-[27px] border border-[#E5E7EB] rounded-r-lg transition-colors duration-150 ${
              view === "grid"
                ? "bg-[#00488D] text-white"
                : "bg-white text-[#424752] hover:bg-[#F2F4F6]"
            }`}
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </button>
        </div>

        {/* Date nav */}
        <div className="flex items-center">
          <button
            type="button"
            aria-label="Previous day"
            className="flex items-center justify-center w-[25px] h-[27px] border border-[#E5E7EB] rounded-l-lg transition-colors duration-150 hover:bg-[#F2F4F6]"
          >
            <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
              <path
                d="M5 1L1 5L5 9"
                stroke="black"
                strokeWidth="1.33"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button
            type="button"
            className="flex items-center justify-center h-[27px] w-[90px] px-2 border-t border-b border-[#E5E7EB] bg-white text-xs font-medium transition-colors duration-150 hover:bg-[#F2F4F6]"
          >
            Today
          </button>

          <button
            type="button"
            aria-label="Next day"
            className="flex items-center justify-center w-[25px] h-[27px] border border-[#E5E7EB] rounded-r-lg transition-colors duration-150 hover:bg-[#F2F4F6]"
          >
            <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
              <path
                d="M1 1L5 5L1 9"
                stroke="black"
                strokeWidth="1.33"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <button
          type="button"
          className="flex items-center gap-1.5 px-4 py-2 bg-[#004785] rounded-[10px] text-white text-xs font-semibold whitespace-nowrap hover:opacity-90 transition-opacity"
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 5h16l-6 8v5l-4 2v-7L4 5z" />
          </svg>
          Filters
        </button>
      </div>
    </div>
  );
}

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
          <svg
            className="w-10 h-10 text-gray-300"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" />
          </svg>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-gray-900 truncate">
            {patient.name}
          </h3>

          <button
            type="button"
            aria-label="More options"
            className="text-gray-400 hover:text-gray-600 -mt-1 -mr-1 px-1"
          >
            ⋮
          </button>
        </div>

        <p className="text-xs font-medium text-blue-600">
          {patient.patientCode}
        </p>

        <p className="text-xs text-gray-400 mt-0.5">
          {patient.age !== undefined
            ? `${patient.age}/${patient.gender}`
            : patient.gender}
        </p>

        <p className="text-xs text-gray-500 mt-2">{patient.phone}</p>

        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-semibold text-gray-700">
            {patient.bloodGroup ?? "—"}
          </span>

          <button
            type="button"
            aria-label={`Schedule appointment for ${patient.name}`}
            className="w-7 h-7 flex items-center justify-center rounded-md bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect
                x="3"
                y="4"
                width="18"
                height="17"
                rx="2"
              />
              <path d="M3 9h18M8 2v4M16 2v4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

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
    <svg
      className="w-3 h-3 inline ml-1 text-gray-300"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />
    </svg>
  );
}

function PatientTable({ patients }: { patients: Patient[] }) {
  return (
    <div className="overflow-x-auto px-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className="font-medium py-3 px-3 whitespace-nowrap select-none cursor-pointer"
              >
                {col.label}
                <SortIcon />
              </th>
            ))}

            <th className="font-medium py-3 px-3 text-right">
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          {patients.map((patient) => {
            const color = getAvatarColor(patient.name);

            return (
              <tr
                key={patient.id}
                className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60"
              >
                <td className="py-3 px-3">
                  <div className="flex items-center gap-3">
                    {patient.avatarUrl ? (
                      <img
                        src={patient.avatarUrl}
                        alt={patient.name}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <span
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${color.bg} ${color.text}`}
                      >
                        {patient.name.charAt(0)}
                      </span>
                    )}

                    <div>
                      <p className="font-medium text-gray-800">
                        {patient.name}
                      </p>

                      <p className="text-xs text-gray-400">
                        {patient.patientCode}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
                  {patient.age !== undefined
                    ? `${patient.age} / ${patient.gender}`
                    : patient.gender}
                </td>

                <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
                  {patient.phone}
                </td>

                <td className="py-3 px-3">
                  <span className="text-xs font-semibold text-red-500 bg-red-50 px-2.5 py-1 rounded-md">
                    {patient.bloodGroup ?? "—"}
                  </span>
                </td>

                <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
                  {patient.appointmentDate}
                </td>

                <td className="py-3 px-3">
                  <StatusBadge status={patient.status} />
                </td>

                <td className="py-3 px-3">
                  <div className="flex items-center justify-end gap-3 text-gray-400">
                    <button
                      type="button"
                      aria-label={`Edit ${patient.name}`}
                      className="hover:text-blue-600"
                    >
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      aria-label={`View ${patient.name}`}
                      className="hover:text-blue-600"
                    >
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      aria-label={`Delete ${patient.name}`}
                      className="hover:text-red-500"
                    >
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
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

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  rangeLabel: string;
}

function Pagination({
  page,
  totalPages,
  onPageChange,
  rangeLabel,
}: PaginationProps) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <p className="text-sm text-gray-500">{rangeLabel}</p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
          className="w-8 h-8 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          ‹
        </button>

        {Array.from(
          { length: totalPages },
          (_, i) => i + 1
        ).map((n) => (
          <button
            type="button"
            key={n}
            onClick={() => onPageChange(n)}
            aria-current={n === page ? "page" : undefined}
            className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium ${
              n === page
                ? "bg-blue-700 text-white"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            {n}
          </button>
        ))}

        <button
          type="button"
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

export default function AppointmentPage() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadErrorMsg, setLoadErrorMsg] = useState("");

  // This page is the logged-in doctor's appointment list. It must only ever
  // show patients booked with THAT doctor ("Senthil") -- never everyone
  // else's. Resolve the doctor's employee_id from the employee list (name
  // match on "senthil"), falling back to the logged-in user's own
  // employee_id, then filter every GET /appointments call by it.
  const [targetDoctorId, setTargetDoctorId] = useState<string | null>(null);
  // The branches this user is actually mapped to (GET /employees/me →
  // data.branches). A doctor's appointments can live in a branch OTHER than
  // their primary one (Senthil's all sit in BRA005, his primary mapping is
  // BRA004), and the backend branchScope 403s multi-branch users unless an
  // explicit branch is sent -- so we must query every mapped branch.
  const [branchIds, setBranchIds] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    const resolveDoctorAndBranches = async () => {
      let doctorId: string | null = null;

      try {
        const firstPage = await employeeApi.getAll({
          roleType: "DOCTOR",
          page: 1,
          limit: 1000,
        });
        const firstData = firstPage.data?.data;
        const remainingPages = Array.from(
          { length: Math.max(0, (firstData?.totalPages ?? 1) - 1) },
          (_, index) =>
            employeeApi.getAll({
              roleType: "DOCTOR",
              page: index + 2,
              limit: 1000,
            }),
        );
        const remainingResults = await Promise.all(remainingPages);
        const employees = [
          ...(firstData?.employees ?? []),
          ...remainingResults.flatMap((res) => res.data?.data?.employees ?? []),
        ];

        const senthil = employees.find((emp) =>
          `${emp.first_name} ${emp.middle_name ?? ""} ${emp.last_name ?? ""}`
            .toLowerCase()
            .includes("senthil"),
        );

        doctorId = senthil?.employee_id ?? null;
      } catch (err) {
        console.error("[AppointmentPage] Failed to resolve doctor:", err);
      }

      if (!cancelled) {
        setTargetDoctorId(doctorId ?? getUser()?.employee_id ?? null);
      }

      try {
        const me = await employeeApi.getMe();
        const branches = (me.data?.data?.branches ?? [])
          .filter((b) => b.status !== 0)
          .map((b) => b.branch_id)
          .filter((b): b is string => Boolean(b));
        if (!cancelled) {
          setBranchIds(branches.length > 0 ? [...new Set(branches)] : null);
        }
      } catch (err) {
        console.error("[AppointmentPage] Failed to resolve branches:", err);
        if (!cancelled) {
          setBranchIds(null);
        }
      }
    };

    void resolveDoctorAndBranches();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchAppointments = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(false);
      setLoadErrorMsg("");

      const employeeId = targetDoctorId ?? getUser()?.employee_id ?? undefined;
      // GET /appointments is branch-scoped on the backend (branchScope
      // middleware 403s "Please select a branch first." when no branch is
      // sent and the user maps to more than one branch).
      const primaryBranchId =
        getActiveBranchId() ?? getUser()?.branch_id ?? undefined;

      let appointments: AppointmentRecord[] = [];

      if (branchIds && branchIds.length > 0) {
        // Query every branch the doctor is mapped to and merge the results,
        // so appointments booked in a non-primary branch are not missed.
        const results = await Promise.all(
          branchIds.map((branchId) =>
            appointmentApi
              .getAll({
                branchId,
                employeeId,
                page: 1,
                limit: 100,
              })
              .catch(() => null),
          ),
        );
        const seen = new Set<string>();
        for (const res of results) {
          for (const appointment of res?.data?.data?.appointments ?? []) {
            if (!seen.has(appointment.appointment_id)) {
              seen.add(appointment.appointment_id);
              appointments.push(appointment);
            }
          }
        }
      } else {
        const res = await appointmentApi.getAll({
          branchId: primaryBranchId,
          employeeId,
          page: 1,
          limit: 100,
        });
        appointments = res.data?.data?.appointments ?? [];
      }

      // Belt and braces: even if the employee_id filter is missed (e.g.
      // doctor_name stored differently), never surface another doctor's
      // patient on this page.
      const senthilAppointments = appointments
        .filter(
          (a) =>
            (a.doctor_name ?? "").toLowerCase().includes("senthil") ||
            (employeeId != null && a.employees?.employee_id === employeeId),
        )
        .sort((x, y) =>
          (y.appointment_date ?? "").localeCompare(x.appointment_date ?? ""),
        );

      setPatients(senthilAppointments.map(toPatient));
    } catch (err: any) {
      console.error(
        "[AppointmentPage] Failed to load appointments:",
        err
      );
      setLoadError(true);
      setLoadErrorMsg(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load appointments."
      );
    } finally {
      setIsLoading(false);
    }
  }, [targetDoctorId, branchIds]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const filtered = useMemo(
    () =>
      patients.filter((p) =>
        `${p.name} ${p.patientCode}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [patients, search]
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const start = (currentPage - 1) * PAGE_SIZE;

  const pageItems = filtered.slice(
    start,
    start + PAGE_SIZE
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="hms-heading">Appointment</h2>
          <p className="hms-subheading">
            Real-time doctor appointments and patients.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Notifications"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.7 21a2 2 0 01-3.4 0" />
            </svg>
          </button>

          <span className="h-6 w-px bg-gray-200" />

          <span className="flex items-center gap-2 h-[27px] px-3 border border-[#E5E7EB] rounded-lg bg-white text-xs font-medium text-[#424752]">
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <rect
                x="3"
                y="4"
                width="18"
                height="17"
                rx="2"
              />
              <path d="M3 9h18M8 2v4M16 2v4" />
            </svg>

            August 12, 2026
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col overflow-hidden">
        <AppointmentToolbar
          totalPatients={patients.length}
          view={view}
          onViewChange={setView}
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />

        {isLoading ? (
          <div className="text-center text-sm text-gray-500 py-10">
            Loading appointments...
          </div>
        ) : loadError ? (
          <div className="text-center text-sm text-gray-500 py-10 space-y-3">
            <p>{loadErrorMsg || "Failed to load appointments."}</p>
            <button
              type="button"
              onClick={fetchAppointments}
              className="text-blue-600 font-medium hover:underline"
            >
              Retry
            </button>
          </div>
        ) : pageItems.length > 0 ? (
          view === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
              {pageItems.map((patient) => (
                <PatientCard
                  key={patient.id}
                  patient={patient}
                />
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

        {!isLoading && !loadError && (
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
            rangeLabel={`Showing ${
              filtered.length === 0 ? 0 : start + 1
            } to ${Math.min(
              start + PAGE_SIZE,
              filtered.length
            )} of ${filtered.length} patients`}
          />
        )}
      </div>
    </div>
  );
}
