import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, X } from "lucide-react";
import {
  appointmentApi,
  type AppointmentRecord,
} from "../../api/appointment.api";
import { encounterApi } from "../../api/encounter.api";
import {
  doctorDashboardApi,
  type DoctorNotificationItem,
} from "../../api/doctorDashboard.api";
import { employeeApi } from "../../api/employee.api";
import API, { getActiveBranchId } from "../../api/axios";
import { getUser } from "../../utils/token";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import CalendarPicker from "@/components/hms/Calender";

type AppointmentStatus =
  | "Checked Out"
  | "Confirmed"
  | "Checked In"
  | "Cancelled"
  | "Reschedule"
  | "In Consultation"
  | "No Show"
  | "Not Checked In"
  | "Transfer Review"
  | "Reschedule Required";

interface Patient {
  id: string;
  patientId: string;
  name: string;
  patientCode: string;
  age?: number;
  gender?: string;
  phone?: string;
  bloodGroup?: string;
  appointmentDate: string;
  appointmentDateRaw: string;
  appointmentTimeRaw: string;
  originalStatus: string;
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
  NOT_CHECKED_IN: "Not Checked In",
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

function computeAge(dob?: string | null): number | undefined {
  if (!dob) return undefined;
  const parsed = new Date(dob);
  if (isNaN(parsed.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - parsed.getFullYear();
  const monthDiff = now.getMonth() - parsed.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getDate() < parsed.getDate())
  ) {
    age -= 1;
  }
  return age >= 0 && age < 130 ? age : undefined;
}

// Date-filter keys are "YYYY-MM-DD" strings in UTC convention
// (matching how the backend serializes appointment_date). These
// helpers convert between that key and the calendar picker's
// local Date without any timezone drift.
function isoToPickerDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function pickerDateToKey(date: Date): string {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shiftIsoDay(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  return pickerDateToKey(
    new Date(year, month - 1, day + days),
  );
}

function todayIso(): string {
  return pickerDateToKey(new Date());
}

function isBeforeToday(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const apptDate = new Date(dateStr);
  return apptDate < today;
}

function toPatient(a: AppointmentRecord): Patient | null {
  const effectiveStatus = a.status ?? "";
  const isCancelled = effectiveStatus === "CANCELLED";
  const apptDate = a.appointment_date;

  // Only show: SCHEDULED, RESCHEDULED, CANCELLED (up to yesterday)
  const allowedStatuses = new Set(["SCHEDULED", "RESCHEDULED", "CANCELLED"]);
  if (!allowedStatuses.has(effectiveStatus)) return null;
  if (isCancelled && !isBeforeToday(apptDate)) return null;
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
    patientId: a.patient_id,
    name: buildPatientName(bio),
    patientCode: bio?.patient_id ?? `Token ${a.token_number ?? ""}`.trim(),
    gender,
    phone: bio?.patient_primary_mobile ?? "—",
    appointmentDate: formatAppointmentTime(a.appointment_time) || dateFallback,
    appointmentDateRaw: a.appointment_date
      ? a.appointment_date.slice(0, 10)
      : "",
    appointmentTimeRaw: a.appointment_time ?? "",
    originalStatus: a.status ?? "",
    age: bio?.patient_age ?? computeAge(bio?.patient_dob),
    bloodGroup: bio?.patient_blood_group ?? undefined,
    status: toDisplayStatus(effectiveStatus),
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
  "Not Checked In": "bg-gray-50 text-gray-600",
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
  selectedDateKey: string | null;
  onShiftDate: (days: number) => void;
  onJumpToToday: () => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
}

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "SCHEDULED", label: "Confirmed" },
  { value: "CHECKED_IN", label: "Checked In" },
  { value: "IN_CONSULTATION", label: "In Consultation" },
  { value: "COMPLETED", label: "Checked Out" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No Show" },
  { value: "RESCHEDULED", label: "Reschedule" },
];

function AppointmentToolbar({
  totalPatients,
  view,
  onViewChange,
  search,
  onSearchChange,
  selectedDateKey,
  onShiftDate,
  onJumpToToday,
  statusFilter,
  onStatusFilterChange,
}: ToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const todayKey = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  })();

  const anchorKey = selectedDateKey ?? todayKey;

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
            onClick={() => onShiftDate(-1)}
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
            onClick={onJumpToToday}
            title="Jump to today"
            className={`flex items-center justify-center h-[27px] w-[90px] px-2 border-t border-b border-[#E5E7EB] text-xs font-medium transition-colors duration-150 hover:bg-[#F2F4F6] ${
              selectedDateKey === todayKey
                ? "bg-[#EEF2FF] text-[#4F46E5]"
                : "bg-white"
            }`}
          >
            {selectedDateKey
              ? (() => {
                  const [y, m, d] = selectedDateKey.split("-").map(Number);
                  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                  });
                })()
              : "All dates"}
          </button>

          <button
            type="button"
            aria-label="Next day"
            onClick={() => onShiftDate(1)}
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

        {/* Status filter */}
        <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-xs font-semibold whitespace-nowrap transition-opacity ${
                statusFilter
                  ? "bg-[#062f6e] text-white"
                  : "bg-[#004785] text-white hover:opacity-90"
              }`}
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
              {statusFilter
                ? STATUS_FILTER_OPTIONS.find(
                    (option) => option.value === statusFilter,
                  )?.label ?? "Filters"
                : "Filters"}
            </button>
          </PopoverTrigger>

          <PopoverContent align="end" className="w-52 p-1 border-[#E5E7EB]">
            <button
              type="button"
              onClick={() => {
                onStatusFilterChange("");
                setFiltersOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs rounded-md transition-colors ${
                statusFilter === ""
                  ? "bg-blue-50 font-semibold text-blue-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              All statuses
            </button>
            {STATUS_FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onStatusFilterChange(option.value);
                  setFiltersOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs rounded-md transition-colors ${
                  statusFilter === option.value
                    ? "bg-blue-50 font-semibold text-blue-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

function PatientCard({
  patient,
  actionBusyId,
  onCheckIn,
  onProceed,
  onCancelRequest,
}: { patient: Patient } & PatientActionProps) {
  const canCheckIn = CHECKIN_STATUSES.includes(patient.originalStatus);
  const canProceed = PROCEED_STATUSES.includes(patient.originalStatus);
  const isBusy = actionBusyId === patient.id;

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

        {(canCheckIn || canProceed) && (
          <div className="flex items-center gap-2 mt-3">
            {canCheckIn && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onCheckIn(patient)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#00488D] text-white text-xs font-semibold hover:bg-[#003a72] disabled:opacity-60"
              >
                {isBusy && <Loader2 className="w-3 h-3 animate-spin" />}
                Check In
              </button>
            )}

            {canProceed && (
              <button
                type="button"
                onClick={() => onProceed(patient)}
                className="px-3 py-1.5 rounded-lg border border-[#00488D] text-[#00488D] text-xs font-semibold hover:bg-blue-50"
              >
                Proceed
              </button>
            )}
          </div>
        )}
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

// Statuses that allow the Check In transition (mirrors the dashboard).
const CHECKIN_STATUSES = ["SCHEDULED", "RESCHEDULED", "NOT_CHECKED_IN"];
// Statuses that can proceed to the consultation screen.
const PROCEED_STATUSES = ["CHECKED_IN", "IN_CONSULTATION"];
// Statuses that can no longer be cancelled.
const NON_CANCELABLE_STATUSES = ["COMPLETED", "CANCELLED", "NO_SHOW"];

interface PatientActionProps {
  actionBusyId: string | null;
  onCheckIn: (patient: Patient) => void;
  onProceed: (patient: Patient) => void;
  onCancelRequest: (patient: Patient) => void;
}

function PatientActions({ patient, actionBusyId, onCheckIn, onProceed, onCancelRequest }: PatientActionProps & { patient: Patient }) {
  const canCheckIn = CHECKIN_STATUSES.includes(patient.originalStatus);
  const canProceed = PROCEED_STATUSES.includes(patient.originalStatus);
  const canCancel = !NON_CANCELABLE_STATUSES.includes(patient.originalStatus);
  const isBusy = actionBusyId === patient.id;

  if (!canCheckIn && !canProceed && !canCancel) {
    return (
      <div className="flex items-center justify-end gap-3 text-gray-400">
        —
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {canCheckIn && (
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onCheckIn(patient)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#00488D] text-white text-xs font-semibold hover:bg-[#003a72] disabled:opacity-60"
        >
          {isBusy && <Loader2 className="w-3 h-3 animate-spin" />}
          Check In
        </button>
      )}

      {canProceed && (
        <button
          type="button"
          onClick={() => onProceed(patient)}
          className="px-2.5 py-1 rounded-md border border-[#00488D] text-[#00488D] text-xs font-semibold hover:bg-blue-50"
        >
          Proceed
        </button>
      )}

      {canCancel && (
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onCancelRequest(patient)}
          title="Cancel this appointment"
          className="px-2.5 py-1 rounded-md border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 disabled:opacity-60"
        >
          Cancel
        </button>
      )}
    </div>
  );
}

function PatientTable({
  patients,
  actionBusyId,
  onCheckIn,
  onProceed,
  onCancelRequest,
}: {
  patients: Patient[];
} & PatientActionProps) {
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
                  <PatientActions
                    patient={patient}
                    actionBusyId={actionBusyId}
                    onCheckIn={onCheckIn}
                    onProceed={onProceed}
                    onCancelRequest={onCancelRequest}
                  />
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

  // Optional date filter — seeded from ?date=YYYY-MM-DD (the
  // dashboard's "View All" links here with today's date).
  // null = show every date. The key is a plain "YYYY-MM-DD"
  // string in UTC convention — identical to how appointment_date
  // is serialized — so chip, rows and URL can never disagree.
  const [searchParams] = useSearchParams();
  const [selectedDateKey, setSelectedDateKey] = useState<
    string | null
  >(() => {
    const raw = searchParams.get("date");
    return raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
  });
  const [dateFilterOpen, setDateFilterOpen] = useState(false);

  const handleSelectDate = (key: string | null) => {
    setSelectedDateKey(key);
    setPage(1);
  };

  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadErrorMsg, setLoadErrorMsg] = useState("");

  // This page shows ONLY the logged-in doctor's appointments. The doctor's
  // employee_id comes from /auth/me (server truth — the same source the
  // dashboard uses); the cached login snapshot is only a fallback. Branches
  // come from /employees/me so bookings in any mapped branch are included
  // (backend branchScope 403s multi-branch users unless a branch is sent).
  const [targetDoctorId, setTargetDoctorId] = useState<string | null>(null);
  // Every employee_id that belongs to this user account. Duplicate doctor
  // rows can exist (documented), so ownership accepts any of them.
  const [ownEmployeeIds, setOwnEmployeeIds] = useState<string[]>([]);
  const [resolved, setResolved] = useState(false);
  const [branchIds, setBranchIds] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    const resolveDoctorAndBranches = async () => {
      let doctorId: string | null = null;
      let userId: string | null = null;

      // Server truth first; cached snapshot is only a fallback.
      try {
        const authMe = await doctorDashboardApi.getCurrentUser();
        doctorId = authMe.data?.user?.employee_id ?? null;
        userId = authMe.data?.user?.user_id ?? null;
      } catch (err) {
        console.error(
          "[AppointmentPage] /auth/me failed, falling back to session:",
          err,
        );
        doctorId = getUser()?.employee_id ?? null;
      }

      let resolvedBranches: string[] | null = null;

      try {
        const me = await employeeApi.getMe();
        const branches = (me.data?.data?.branches ?? [])
          .filter((b) => b.status !== 0)
          .map((b) => b.branch_id)
          .filter((b): b is string => Boolean(b));
        resolvedBranches =
          branches.length > 0 ? [...new Set(branches)] : null;
      } catch (err) {
        console.error("[AppointmentPage] Failed to resolve branches:", err);
      }

      if (!cancelled) {
        setTargetDoctorId(doctorId);
        setOwnEmployeeIds(doctorId ? [doctorId] : []);
      }

      // Duplicate-record safety net: gather every employee_id
      // mapped to this user account so ownership checks can't
      // be defeated by a stale/secondary doctor row.
      if (userId && !cancelled) {
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
              employeeApi
                .getAll({
                  roleType: "DOCTOR",
                  page: index + 2,
                  limit: 1000,
                })
                .catch(() => null),
          );
          const remainingResults = await Promise.all(remainingPages);
          const employees = [
            ...(firstData?.employees ?? []),
            ...remainingResults.flatMap(
              (res) => res?.data?.data?.employees ?? [],
            ),
          ];

          const matchedIds = employees
            .filter(
              (emp) =>
                String((emp as any).user_id ?? "") ===
                String(userId),
            )
            .map((emp) => emp.employee_id)
            .filter(Boolean);

          if (matchedIds.length > 0) {
            setOwnEmployeeIds([
              ...new Set([...(doctorId ? [doctorId] : []), ...matchedIds]),
            ]);
          }
        } catch (err) {
          console.error(
            "[AppointmentPage] Duplicate employee-id scan failed:",
            err,
          );
        }
      }

      if (!cancelled) {
        setBranchIds(resolvedBranches);
        setResolved(true);
      }
    };

    void resolveDoctorAndBranches();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchAppointments = useCallback(async () => {
    // Wait until the doctor/branch resolution finished — otherwise the
    // first run fires with no filters and races the real one.
    if (!resolved) return;

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

      // Fetch every page for a branch so lists larger than one
      // 100-row page are not silently truncated.
      const fetchAllForBranch = async (
        branchId: string | undefined,
      ): Promise<AppointmentRecord[]> => {
        const first = await appointmentApi.getAll({
          branchId,
          employeeId,
          page: 1,
          limit: 100,
        });
        const data = first.data?.data;
        const items = data?.appointments ?? [];
        const extraPages = Array.from(
          { length: Math.max(0, (data?.totalPages ?? 1) - 1) },
          (_, index) =>
            appointmentApi
              .getAll({
                branchId,
                employeeId,
                page: index + 2,
                limit: 100,
              })
              .catch(() => null),
        );
        const rest = await Promise.all(extraPages);
        return [
          ...items,
          ...rest.flatMap((res) => res?.data?.data?.appointments ?? []),
        ];
      };

      let appointments: AppointmentRecord[] = [];

      if (branchIds && branchIds.length > 0) {
        // Query every branch the doctor is mapped to and merge the results,
        // so appointments booked in a non-primary branch are not missed.
        const results = await Promise.all(
          branchIds.map((branchId) =>
            fetchAllForBranch(branchId).catch(() => []),
          ),
        );
        const seen = new Set<string>();
        for (const branchAppointments of results) {
          for (const appointment of branchAppointments) {
            if (!seen.has(appointment.appointment_id)) {
              seen.add(appointment.appointment_id);
              appointments.push(appointment);
            }
          }
        }
      } else {
        appointments = await fetchAllForBranch(primaryBranchId);
      }

      // Only this doctor's appointments, newest date first.
      const ownAppointments = appointments
        .filter(
          (a) =>
            ownEmployeeIds.includes(
              a.employees?.employee_id ?? "",
            ),
        )
        .sort((x, y) =>
          (y.appointment_date ?? "").localeCompare(x.appointment_date ?? ""),
        );

      setPatients(ownAppointments.map(toPatient).filter((p): p is Patient => p !== null));
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
  }, [resolved, targetDoctorId, branchIds, ownEmployeeIds]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  /* =======================================================
     ROW ACTIONS
     ======================================================= */

  const navigate = useNavigate();

  const [actionBusyId, setActionBusyId] = useState<
    string | null
  >(null);
  const [cancelTarget, setCancelTarget] =
    useState<Patient | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const handleCheckIn = async (
    patient: Patient,
  ): Promise<void> => {
    try {
      setActionBusyId(patient.id);
      await appointmentApi.updateStatus(
        patient.id,
        "IN_CONSULTATION",
      );
      // Same flow as the dashboard card: checking in also
      // opens the clinical encounter.
      await encounterApi.create({
        appointment_id: patient.id,
      });
      await fetchAppointments();
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to check in patient."
      );
    } finally {
      setActionBusyId(null);
    }
  };

  const handleProceed = (patient: Patient): void => {
    navigate("/doctor/patient-consultation", {
      state: {
        patientId: patient.patientId,
        appointmentId: patient.id,
        branchId:
          getActiveBranchId() ?? getUser()?.branch_id ?? undefined,
        appointmentDate: patient.appointmentDateRaw,
        appointmentTime: patient.appointmentTimeRaw,
        consultedBy: "",
      },
    });
  };

  const handleCancelAppointment = async (): Promise<void> => {
    if (!cancelTarget) return;

    try {
      setCancelling(true);
      await appointmentApi.cancel(
        cancelTarget.id,
        "Cancelled by doctor from appointments page",
      );
      setCancelTarget(null);
      await fetchAppointments();
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to cancel appointment."
      );
    } finally {
      setCancelling(false);
    }
  };

  /* =======================================================
     HEADER NOTIFICATIONS
     ======================================================= */

  const [notificationsOpen, setNotificationsOpen] =
    useState(false);
  const [notifications, setNotifications] = useState<
    DoctorNotificationItem[]
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef<HTMLDivElement>(null);

  const bellEmployeeId =
    targetDoctorId ?? getUser()?.employee_id ?? null;

  useEffect(() => {
    if (!bellEmployeeId) return;

    let cancelled = false;

    const load = () => {
      doctorDashboardApi
        .getNotifications(bellEmployeeId)
        .then((res) => {
          if (cancelled) return;
          // Show ALL change notifications — no status filtering here.
          setNotifications(res.data?.data?.notifications ?? []);
          setUnreadCount(res.data?.data?.unreadCount ?? 0);
        })
        .catch(() => {});
    };

    load();
    const intervalId = window.setInterval(load, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [bellEmployeeId]);

  // Opening the panel clears unread state (server + badge).
  useEffect(() => {
    if (
      notificationsOpen &&
      unreadCount > 0 &&
      bellEmployeeId
    ) {
      setUnreadCount(0);
      doctorDashboardApi
        .markNotificationsRead(bellEmployeeId)
        .catch(() => {});
    }
  }, [notificationsOpen, unreadCount, bellEmployeeId]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        !notificationRef.current?.contains(
          event.target as Node,
        )
      ) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () =>
      document.removeEventListener("mousedown", handleClick);
  }, []);

  function timeAgo(iso: string): string {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return "";

    const seconds = Math.max(
      0,
      Math.floor((Date.now() - then) / 1000),
    );

    if (seconds < 60) return "Just now";

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  /* =======================================================
     FILTERS
     ======================================================= */

  const [statusFilter, setStatusFilter] = useState("");

  const shiftDateBy = (days: number): void => {
    const base = selectedDateKey ?? todayIso();
    handleSelectDate(shiftIsoDay(base, days));
  };

  const jumpToToday = (): void => {
    handleSelectDate(todayIso());
  };

  const filtered = useMemo(
    () =>
      patients.filter((p) => {
        const matchesSearch = `${p.name} ${p.patientCode}`
          .toLowerCase()
          .includes(search.toLowerCase());
        const matchesDate =
          !selectedDateKey || p.appointmentDateRaw === selectedDateKey;
        const matchesStatus =
          !statusFilter || p.originalStatus === statusFilter;
        return matchesSearch && matchesDate && matchesStatus;
      }),
    [patients, search, selectedDateKey, statusFilter]
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
          <div className="relative" ref={notificationRef}>
            <button
              type="button"
              aria-label="Notifications"
              onClick={() =>
                setNotificationsOpen((value) => !value)
              }
              className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
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

              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold leading-none text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 top-12 z-50 w-[300px] rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
                <h3 className="mb-2 text-sm font-semibold text-gray-800">
                  Notifications
                </h3>

                {notifications.length === 0 ? (
                  <div className="py-5 text-center text-xs text-gray-400">
                    No new notifications
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto">
                    {notifications.map(
                      (item, index) => {
                        const patientBio =
                          item.appointment_history
                            ?.patient_bio_data;
                        const patientName =
                          [
                            patientBio?.patient_first_name,
                            patientBio?.patient_middle_name,
                            patientBio?.patient_last_name,
                          ]
                            .filter(Boolean)
                            .join(" ") || "A patient";

                        const isBooking =
                          item.notification_type ===
                          "BOOKING";

                        return (
                          <div
                            key={item.notification_id}
                            className={`py-2.5 text-xs text-gray-600 ${
                              index <
                              notifications.length - 1
                                ? "border-b border-gray-100"
                                : ""
                            }`}
                          >
                            <p className="leading-4">
                              {item.status === "UNREAD" && (
                                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-blue-500 align-middle" />
                              )}
                              {isBooking ? (
                                <>
                                  <span className="font-semibold text-gray-800">
                                    {patientName}
                                  </span>{" "}
                                  booked an appointment
                                  {item.appointment_history
                                    ? ` for ${new Date(
                                        item.appointment_history.appointment_date,
                                      ).toLocaleDateString("en-GB")}`
                                    : ""}
                                  .
                                </>
                              ) : (
                                <>
                                  <span className="font-semibold text-gray-800">
                                    {patientName}
                                  </span>{" "}
                                  checked in.
                                </>
                              )}
                            </p>

                            <span className="text-[10px] text-gray-400">
                              {timeAgo(item.created_at)}
                            </span>
                          </div>
                        );
                      },
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <span className="h-6 w-px bg-gray-200" />

          <Popover open={dateFilterOpen} onOpenChange={setDateFilterOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`flex items-center gap-2 h-[27px] px-3 border rounded-lg bg-white text-xs font-medium transition-colors ${
                  selectedDateKey
                    ? "border-[#003d9b] text-[#003d9b]"
                    : "border-[#E5E7EB] text-[#424752] hover:border-[#003d9b]"
                }`}
              >
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

                {selectedDateKey
                  ? isoToPickerDate(selectedDateKey).toLocaleDateString(
                      "en-GB",
                      {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      },
                    )
                  : "All dates"}
              </button>
            </PopoverTrigger>

            <PopoverContent
              align="end"
              className="w-auto border-[#E5E7EB] p-0 shadow-lg"
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Filter by date
                </span>
                {selectedDateKey && (
                  <button
                    type="button"
                    onClick={() => handleSelectDate(null)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
                  >
                    <X className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>

              <CalendarPicker
                selected={
                  selectedDateKey
                    ? isoToPickerDate(selectedDateKey)
                    : null
                }
                hideThemePicker
                onSelect={(date) => {
                  if (date instanceof Date) {
                    handleSelectDate(pickerDateToKey(date));
                    setDateFilterOpen(false);
                  }
                }}
              />
            </PopoverContent>
          </Popover>
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
          selectedDateKey={selectedDateKey}
          onShiftDate={shiftDateBy}
          onJumpToToday={jumpToToday}
          statusFilter={statusFilter}
          onStatusFilterChange={(status) => {
            setStatusFilter(status);
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
                  actionBusyId={actionBusyId}
                  onCheckIn={handleCheckIn}
                  onProceed={handleProceed}
                  onCancelRequest={setCancelTarget}
                />
              ))}
            </div>
          ) : (
            <PatientTable
              patients={pageItems}
              actionBusyId={actionBusyId}
              onCheckIn={handleCheckIn}
              onProceed={handleProceed}
              onCancelRequest={setCancelTarget}
            />
          )
        ) : (
          <div className="text-center text-sm text-gray-500 py-10">
            {selectedDateKey
              ? `No appointments on ${isoToPickerDate(
                  selectedDateKey,
                ).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}${
                  search ? ` matching "${search}"` : ""
                }. Clear the date filter to see all.`
              : search
              ? `No patients match "${search}".`
              : "No appointments found."}
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

      <ConfirmationDialog
        open={!!cancelTarget}
        title="Cancel this appointment?"
        description={`Cancel ${
          cancelTarget?.name ?? "this patient"
        }'s appointment? The slot will be released and the patient marked as cancelled.`}
        confirmText="Yes, cancel it"
        cancelText="Keep appointment"
        loading={cancelling}
        onConfirm={handleCancelAppointment}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
