import { useEffect, useMemo, useRef, useState } from "react";
import API from "../../api/axios";
import ScheduleSlotModal, {
  type ScheduleSlotModalHandle,
  type ScheduleSlotAddPayload,
} from "@/components/hms/ScheduleSlotModal";
import { employeeApi } from "@/api/employee.api";

/* =========================================================
   TYPES
   ========================================================= */

type DoctorScheduleChangeMode = "ADD" | "OVERRIDE" | "CANCEL";

interface TimeSlot {
  id: string;
  start: string;
  end: string;
  branchId?: string;
  shiftName?: string;
  source?: "NORMAL" | "ADD" | "OVERRIDE";
  changeId?: string;
  pending?: boolean;
}

// Day tab draft -- edits are collected locally against the recurring
// doctor_schedule template and applied in one batch on "Save changes".
interface DayDraftSlot {
  key: string;
  scheduleId: string | number | null;
  start24: string;
  end24: string;
  displayStart: string;
  displayEnd: string;
  branchId: string;
  branchName: string;
  shiftName: string;
  isNew: boolean;
  removed: boolean;
}

interface DayDraft {
  enabled: boolean;
  slots: DayDraftSlot[];
}

interface DaySchedule {
  day: string;
  enabled: boolean;
  onLeave: boolean;
  slots: TimeSlot[];
}

interface Branch {
  branch_id: string;
  branch_name: string;
  status?: number;
}

interface DoctorSchedule {
  schedule_id?: string;
  branch_id?: string;
  day_of_week?: string;
  start_time?: string | null;
  end_time?: string | null;
  shift_name?: string | null;
  is_active?: boolean;
}

interface AuthMeResponse {
  success?: boolean;
  user?: {
    employee_id?: string | null;
    [key: string]: unknown;
  };
}

interface DoctorResponse {
  success?: boolean;
  data?: {
    employee?: {
      employee_id?: string;
      first_name?: string;
      last_name?: string;
    };
    branches?: Branch[];
    doctorSchedules?: DoctorSchedule[];
  };
}

interface ScheduleChange {
  change_id: string;
  employee_id: string;
  branch_id: string;
  change_date: string;
  mode: DoctorScheduleChangeMode;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ScheduleChangesResponse {
  success?: boolean;
  message?: string;
  data?: ScheduleChange[];
}

interface CreateScheduleChangePayload {
  employee_id: string;
  branch_id: string;
  change_date: string;
  mode: DoctorScheduleChangeMode;
  start_time?: string;
  end_time?: string;
  reason?: string;
  created_by?: string;
}

interface PendingChange {
  id: string;
  employee_id: string;
  branch_id: string;
  change_date: string;
  mode: DoctorScheduleChangeMode;
  start_time?: string;
  end_time?: string;
  reason?: string;
  created_by?: string;
}

/* =========================================================
   CONSTANTS
   ========================================================= */

const SCHEDULE_API_BASE = "/doctor-schedule";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const emptySchedule = (): DaySchedule[] =>
  DAYS.map((day) => ({
    day,
    enabled: false,
    onLeave: false,
    slots: [],
  }));

/* =========================================================
   DATE HELPERS
   ========================================================= */

function startOfWeek(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);

  const day = result.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + mondayOffset);

  return result;
}

function addDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function addWeeks(date: Date, amount: number): Date {
  return addDays(date, amount * 7);
}

function sameDate(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatWeekDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatFullDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/* =========================================================
   TIME HELPERS
   ========================================================= */

function formatTime(value?: string | null): string {
  if (!value) return "";

  const match = value.match(/(\d{1,2}):(\d{2})/);

  if (!match) return value;

  const hour = Number(match[1]);
  const minute = match[2];

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${String(displayHour).padStart(2, "0")}:${minute} ${suffix}`;
}

function toInputTime(value?: string | null): string {
  if (!value) return "";

  const amPmMatch = value.match(
    /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
  );

  if (amPmMatch) {
    let hour = Number(amPmMatch[1]);
    const minute = amPmMatch[2];
    const suffix = amPmMatch[3].toUpperCase();

    if (suffix === "AM" && hour === 12) {
      hour = 0;
    }

    if (suffix === "PM" && hour !== 12) {
      hour += 12;
    }

    return `${String(hour).padStart(2, "0")}:${minute}`;
  }

  const normalMatch = value.match(/(\d{1,2}):(\d{2})/);

  if (!normalMatch) return "";

  return `${String(Number(normalMatch[1])).padStart(2, "0")}:${normalMatch[2]}`;
}

function toApiTime(value?: string): string {
  if (!value) return "";

  const trimmed = value.trim();

  const amPmMatch = trimmed.match(
    /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
  );

  if (!amPmMatch) {
    if (/^\d{2}:\d{2}$/.test(trimmed)) {
      return `${trimmed}:00`;
    }

    if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    return trimmed;
  }

  let hour = Number(amPmMatch[1]);
  const minute = amPmMatch[2];
  const suffix = amPmMatch[3].toUpperCase();

  if (suffix === "AM" && hour === 12) {
    hour = 0;
  }

  if (suffix === "PM" && hour !== 12) {
    hour += 12;
  }

  return `${String(hour).padStart(2, "0")}:${minute}:00`;
}

/* =========================================================
   DAY NORMALIZATION
   ========================================================= */

function normalizeDay(value?: string | null): string {
  if (!value) return "";

  const upper = value.toUpperCase();

  const fullDay = DAYS.find(
    (day) => day.toUpperCase() === upper
  );

  if (fullDay) return fullDay;

  const shortDay = DAYS.find(
    (day) =>
      day.slice(0, 3).toUpperCase() === upper.slice(0, 3)
  );

  return shortDay ?? value;
}

/* =========================================================
   NORMAL WEEKLY SCHEDULE
   ========================================================= */

function scheduleFromBackend(
  schedules: DoctorSchedule[]
): DaySchedule[] {
  const result = emptySchedule();

  for (const item of schedules ?? []) {
    const dayName = normalizeDay(item.day_of_week);

    const day = result.find(
      (entry) => entry.day === dayName
    );

    if (!day) continue;

    if (item.is_active === false) {
      continue;
    }

    day.enabled = true;

    day.slots.push({
      id:
        item.schedule_id ??
        `${dayName}-${item.start_time}-${item.end_time}`,

      start: formatTime(item.start_time),
      end: formatTime(item.end_time),

      branchId: item.branch_id,

      shiftName: item.shift_name ?? "Consulting",

      source: "NORMAL",
    });
  }

  return result;
}

/* =========================================================
   ICON
   ========================================================= */

function Icon({
  children,
  className = "h-5 w-5",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/* =========================================================
   MODE BADGE
   ========================================================= */

function ModeBadge({
  mode,
  size = "sm",
}: {
  mode: DoctorScheduleChangeMode;
  size?: "xs" | "sm";
}) {
  const sizeClasses =
    size === "xs"
      ? "px-1.5 py-px text-[9px]"
      : "px-2 py-0.5 text-[10px]";

  if (mode === "ADD") {
    return (
      <span
        className={`inline-flex items-center rounded-full font-semibold text-green-700 bg-green-100 ${sizeClasses}`}
      >
        ADD
      </span>
    );
  }

  if (mode === "OVERRIDE") {
    return (
      <span
        className={`inline-flex items-center rounded-full font-semibold text-blue-700 bg-blue-100 ${sizeClasses}`}
      >
        OVERRIDE
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold text-red-700 bg-red-100 ${sizeClasses}`}
    >
      CANCEL
    </span>
  );
}

/* =========================================================
   SLOT CARD
   ========================================================= */

interface SlotCardProps {
  slot: TimeSlot;
  onChange?: (
    field: "start" | "end",
    value: string
  ) => void;
  onDelete?: () => void;
  compact?: boolean;
  highlighted?: boolean;
}

function SlotCard({
  slot,
  onChange,
  onDelete,
  compact = false,
  highlighted = false,
}: SlotCardProps) {
  const isChange =
    slot.source === "ADD" ||
    slot.source === "OVERRIDE";

  return (
    <div
      className={`
        group relative rounded-lg border
        ${
          highlighted
            ? "border-blue-300 bg-blue-50/60 ring-1 ring-blue-100"
            : isChange
            ? slot.source === "ADD"
              ? "border-green-300 bg-green-50/50"
              : "border-blue-300 bg-blue-50/50"
            : "border-gray-200 bg-white"
        }
        ${compact ? "p-2" : "p-3"}
        transition-all
        hover:shadow-sm
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <input
              type="time"
              value={toInputTime(slot.start)}
              disabled={!onChange}
              onChange={(e) =>
                onChange?.("start", e.target.value)
              }
              className="
                w-[76px]
                border-0
                bg-transparent
                p-0
                text-xs
                font-bold
                text-gray-900
                outline-none
                focus:ring-0
                disabled:cursor-default
              "
            />

            <span className="text-gray-300">&ndash;</span>

            <input
              type="time"
              value={toInputTime(slot.end)}
              disabled={!onChange}
              onChange={(e) =>
                onChange?.("end", e.target.value)
              }
              className="
                w-[76px]
                border-0
                bg-transparent
                p-0
                text-xs
                font-bold
                text-gray-900
                outline-none
                focus:ring-0
                disabled:cursor-default
              "
            />
          </div>

          <div className="mt-1.5 flex items-center gap-1.5">
            <div
              className={`
                truncate
                text-gray-500
                ${compact ? "text-[10px]" : "text-[11px]"}
              `}
            >
              {slot.shiftName ?? "Consulting"}
            </div>

            {isChange && slot.source && (
              <ModeBadge
                size="xs"
                mode={
                  slot.source === "ADD"
                    ? "ADD"
                    : "OVERRIDE"
                }
              />
            )}
          </div>
        </div>

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            title="Delete slot"
            className="
              shrink-0
              rounded-md
              p-1
              text-gray-300
              opacity-0
              transition-all
              hover:bg-red-50
              hover:text-red-500
              group-hover:opacity-100
            "
          >
            <Icon className="h-3.5 w-3.5">
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v5" />
              <path d="M14 11v5" />
            </Icon>
          </button>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   MODE MODAL
   ========================================================= */

interface ChangeModalProps {
  open: boolean;
  date: Date | null;
  mode: DoctorScheduleChangeMode;
  setMode: (
    mode: DoctorScheduleChangeMode
  ) => void;
  startTime: string;
  setStartTime: (value: string) => void;
  endTime: string;
  setEndTime: (value: string) => void;
  reason: string;
  setReason: (value: string) => void;
  onClose: () => void;
  onAdd: () => void;
}

function ChangeModal({
  open,
  date,
  mode,
  setMode,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  reason,
  setReason,
  onClose,
  onAdd,
}: ChangeModalProps) {
  if (!open || !date) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Schedule change
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {formatFullDate(date)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <Icon className="h-5 w-5">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </Icon>
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div>
            <label className="mb-3 block text-sm font-semibold text-gray-700">
              Change type
            </label>

            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setMode("ADD")}
                className={`
                  rounded-xl border-2 px-3 py-3.5 text-center transition
                  ${
                    mode === "ADD"
                      ? "border-green-500 bg-green-50 text-green-700 shadow-sm"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  }
                `}
              >
                <span className="block text-sm font-bold">ADD</span>
                <span className="mt-1 block text-[11px] font-normal text-gray-400">
                  Extra slot for this date
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMode("OVERRIDE")}
                className={`
                  rounded-xl border-2 px-3 py-3.5 text-center transition
                  ${
                    mode === "OVERRIDE"
                      ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  }
                `}
              >
                <span className="block text-sm font-bold">OVERRIDE</span>
                <span className="mt-1 block text-[11px] font-normal text-gray-400">
                  Replace this date
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMode("CANCEL")}
                className={`
                  rounded-xl border-2 px-3 py-3.5 text-center transition
                  ${
                    mode === "CANCEL"
                      ? "border-red-500 bg-red-50 text-red-700 shadow-sm"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  }
                `}
              >
                <span className="block text-sm font-bold">CANCEL</span>
                <span className="mt-1 block text-[11px] font-normal text-gray-400">
                  Cancel this date
                </span>
              </button>
            </div>
          </div>

          {mode !== "CANCEL" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Start time
                </label>

                <input
                  type="time"
                  value={startTime}
                  onChange={(e) =>
                    setStartTime(e.target.value)
                  }
                  className="
                    w-full
                    rounded-lg
                    border
                    border-gray-300
                    px-3.5
                    py-2.5
                    text-sm
                    font-medium
                    text-gray-900
                    outline-none
                    transition
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-100
                  "
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  End time
                </label>

                <input
                  type="time"
                  value={endTime}
                  onChange={(e) =>
                    setEndTime(e.target.value)
                  }
                  className="
                    w-full
                    rounded-lg
                    border
                    border-gray-300
                    px-3.5
                    py-2.5
                    text-sm
                    font-medium
                    text-gray-900
                    outline-none
                    transition
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-100
                  "
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Reason
            </label>

            <textarea
              value={reason}
              onChange={(e) =>
                setReason(e.target.value)
              }
              rows={3}
              placeholder={
                mode === "ADD"
                  ? "Reason for adding this slot"
                  : mode === "OVERRIDE"
                  ? "Reason for changing this date"
                  : "Reason for cancelling this date"
              }
              className="
                w-full
                resize-none
                rounded-lg
                border
                border-gray-300
                px-3.5
                py-2.5
                text-sm
                text-gray-900
                placeholder:text-gray-400
                outline-none
                transition
                focus:border-blue-500
                focus:ring-2
                focus:ring-blue-100
              "
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            {mode === "ADD" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Adds extra slot
              </span>
            )}
            {mode === "OVERRIDE" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                Replaces normal schedule
              </span>
            )}
            {mode === "CANCEL" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                Removes all slots
              </span>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-5 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onAdd}
              className={`
                rounded-lg
                px-5
                py-2
                text-sm
                font-semibold
                text-white
                transition
                ${
                  mode === "CANCEL"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-[#0b5394] hover:bg-blue-800"
                }
              `}
            >
              {mode === "ADD"
                ? "Add change"
                : mode === "OVERRIDE"
                ? "Override date"
                : "Cancel date"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
   ========================================================= */

export default function MySchedulePage() {
  const [employeeId, setEmployeeId] = useState("");

  const [schedule, setSchedule] =
    useState<DaySchedule[]>(emptySchedule());

  const [branches, setBranches] =
    useState<Branch[]>([]);

  const [branchId, setBranchId] = useState("");
  const [branchName, setBranchName] = useState("");

  const [viewMode, setViewMode] =
    useState<"day" | "week">("week");

  const [selectedWeek, setSelectedWeek] =
    useState<Date>(startOfWeek(new Date()));

  const [selectedDate, setSelectedDate] =
    useState<Date>(new Date());

  const [scheduleChanges, setScheduleChanges] =
    useState<ScheduleChange[]>([]);

  const [pendingChanges, setPendingChanges] =
    useState<PendingChange[]>([]);

  const [loading, setLoading] = useState(true);
  const [changesLoading, setChangesLoading] =
    useState(false);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  /* =======================================================
     MODAL
     ======================================================= */

  const [modalOpen, setModalOpen] = useState(false);

  const [modalDate, setModalDate] =
    useState<Date | null>(null);

  const [modalMode, setModalMode] =
    useState<DoctorScheduleChangeMode>("ADD");

  const [modalStartTime, setModalStartTime] =
    useState("09:00");

  const [modalEndTime, setModalEndTime] =
    useState("12:00");

  const [modalReason, setModalReason] =
    useState("");

  /* =======================================================
     DAY TAB DRAFT
     ======================================================= */

  const [dayDraft, setDayDraft] =
    useState<Record<string, DayDraft>>({});

  const [dayDraftDirty, setDayDraftDirty] =
    useState(false);

  // Monotonic counter so locally-added draft slots always get a unique key.
  const draftKeyCounterRef = useRef(0);

  // Builds a fresh day draft from the recurring doctor_schedule template
  // (a DaySchedule[] built by scheduleFromBackend), filtered to the
  // currently selected branch. Used on entering day mode, on branch change,
  // and after save/cancel. Pass a freshly fetched schedule after saving so the
  // rebuild reflects the new server state (setSchedule is async).
  const rebuildDayDrafts = (
    sourceSchedule: DaySchedule[] = schedule,
    sourceBranchId: string = branchId
  ) => {
    const drafts: Record<string, DayDraft> = {};

    for (const day of DAYS) {
      const daySchedule =
        sourceSchedule.find((s) => s.day === day);

      const daySlots =
        daySchedule?.slots.filter(
          (slot) =>
            !sourceBranchId ||
            !slot.branchId ||
            slot.branchId === sourceBranchId
        ) ?? [];

      drafts[day] = {
        enabled: daySlots.length > 0,
        slots: daySlots.map((slot) => ({
          key: String(slot.id),
          scheduleId:
            typeof slot.id === "number" ||
            /^[a-zA-Z0-9_-]+$/.test(slot.id)
              ? slot.id
              : null,
          start24: toInputTime(slot.start),
          end24: toInputTime(slot.end),
          displayStart: slot.start,
          displayEnd: slot.end,
          branchId: slot.branchId ?? sourceBranchId,
          branchName:
            branches.find(
              (b) => b.branch_id === slot.branchId
            )?.branch_name ?? "",
          shiftName: slot.shiftName ?? "Consulting",
          isNew: false,
          removed: false,
        })),
      };
    }

    setDayDraft(drafts);
    setDayDraftDirty(false);
  };

  useEffect(() => {
    if (viewMode === "day") {
      rebuildDayDrafts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, branchId]);

  /* =======================================================
     LOAD DOCTOR
     ======================================================= */

  const fetchSchedule = async () => {
    const authResponse =
      await API.get<AuthMeResponse>("/auth/me");

    const id =
      authResponse.data?.user?.employee_id;

    if (!id) {
      throw new Error(
        "No employee ID was found for the logged-in doctor."
      );
    }

    setEmployeeId(id);

    const doctorResponse =
      await API.get<DoctorResponse>(
        `/employees/${id}`
      );

    const data = doctorResponse.data?.data;

    const doctorBranches =
      data?.branches ?? [];

    const schedules =
      data?.doctorSchedules ?? [];

    setBranches(doctorBranches);

    // Keep the currently selected branch when it's still valid -- a quiet
    // refresh (e.g. after adding a recurring slot) shouldn't reset the
    // hospital picker back to the first branch.
    const stillMapped =
      branchId &&
      doctorBranches.some(
        (branch) => branch.branch_id === branchId
      );

    const activeBranch =
      stillMapped
        ? doctorBranches.find(
            (branch) => branch.branch_id === branchId
          )
        : doctorBranches.find(
            (branch) => branch.status !== 0
          ) ?? doctorBranches[0];

    const selectedBranch =
      activeBranch?.branch_id ??
      schedules[0]?.branch_id ??
      "";

    setBranchId(selectedBranch);

    setBranchName(
      activeBranch?.branch_name ??
        doctorBranches.find(
          (branch) =>
            branch.branch_id === selectedBranch
        )?.branch_name ??
        ""
    );

    const parsedSchedule =
      scheduleFromBackend(schedules);

    setSchedule(parsedSchedule);

    return parsedSchedule;
  };

  const loadSchedule = async () => {
    setLoading(true);
    setError("");

    try {
      await fetchSchedule();
    } catch (err: any) {
      console.error(
        "Failed to load schedule:",
        err
      );

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to load your schedule."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     RECURRING SLOT MODAL (Day tab)
     ======================================================= */

  const slotModalRef =
    useRef<ScheduleSlotModalHandle>(null);

  // The Day tab edits the recurring weekly template stored in doctor_schedule
  // (day_of_week based), so a slot added on Monday shows up on every upcoming
  // Monday -- NOT a date-specific doctor_schedule_change. Edits accumulate in
  // dayDraft and are applied in one batch on "Save changes".
  const handleDayDraftToggle = (
    day: string,
    enabled: boolean
  ) => {
    setDayDraft((current) => {
      const draft = current[day];
      if (!draft) return current;

      return {
        ...current,
        [day]: {
          enabled,
          slots: draft.slots.map((slot) => ({
            ...slot,
            removed: enabled ? false : true,
          })),
        },
      };
    });

    setDayDraftDirty(true);
  };

  const handleDayDraftAddSlot = (
    payload: ScheduleSlotAddPayload
  ) => {
    if (
      !payload.day ||
      !payload.startTime ||
      !payload.endTime ||
      !payload.branchId
    ) {
      alert(
        "Please fill in day, start time, end time and branch."
      );
      return;
    }

    draftKeyCounterRef.current += 1;

    setDayDraft((current) => {
      const draft =
        current[payload.day] ?? {
          enabled: true,
          slots: [],
        };

      return {
        ...current,
        [payload.day]: {
          enabled: true,
          slots: [
            ...draft.slots,
            {
              key: `pending-${draftKeyCounterRef.current}`,
              scheduleId: null,
              start24: payload.startTime,
              end24: payload.endTime,
              displayStart: formatTime(payload.startTime),
              displayEnd: formatTime(payload.endTime),
              branchId: payload.branchId,
              branchName: payload.branchName,
              shiftName: "Consulting",
              isNew: true,
              removed: false,
            },
          ],
        },
      };
    });

    setDayDraftDirty(true);
  };

  const handleDayDraftRemoveSlot = (
    day: string,
    key: string
  ) => {
    setDayDraft((current) => {
      const draft = current[day];
      if (!draft) return current;

      return {
        ...current,
        [day]: {
          ...draft,
          slots: draft.slots.map((slot) =>
            slot.key === key
              ? { ...slot, removed: true }
              : slot
          ),
        },
      };
    });

    setDayDraftDirty(true);
  };

  const handleDayDraftCancel = () => {
    rebuildDayDrafts();
  };

  const handleDayDraftSave = async () => {
    if (!employeeId || !branchId) {
      setError(
        "Doctor or hospital information is not loaded."
      );
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      for (const day of DAYS) {
        const draft = dayDraft[day];
        if (!draft) continue;

        for (const slot of draft.slots) {
          if (slot.removed) continue;

          if (slot.isNew) {
            await employeeApi.addScheduleSlot(
              employeeId,
              {
                branch_id: slot.branchId || branchId,
                day_of_week: day
                  .toUpperCase()
                  .trim() as any,
                start_time: slot.start24,
                end_time: slot.end24,
              }
            );
          }
        }

        for (const slot of draft.slots) {
          if (!slot.removed) continue;
          if (slot.isNew) continue;
          if (slot.scheduleId == null) continue;

          await employeeApi.removeScheduleSlot(
            employeeId,
            slot.scheduleId
          );
        }
      }

      const freshSchedule =
        await fetchSchedule();
      rebuildDayDrafts(freshSchedule);

      setMessage(
        "Your recurring schedule has been saved."
      );
    } catch (err: any) {
      console.error(
        "Failed to save recurring schedule:",
        err
      );

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to save the recurring schedule."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     LOAD SCHEDULE CHANGES
     ======================================================= */

  const loadWeekChanges = async () => {
    if (!employeeId) return;

    setChangesLoading(true);

    try {
      const response =
        await API.get<ScheduleChangesResponse>(
          `${SCHEDULE_API_BASE}/${employeeId}/changes`
        );

      const data =
        response.data?.data ?? [];

      setScheduleChanges(
        data.filter(
          (change) => change.is_active
        )
      );
    } catch (err: any) {
      console.error(
        "Failed to load schedule changes:",
        err
      );
    } finally {
      setChangesLoading(false);
    }
  };

  useEffect(() => {
    void loadSchedule();
  }, []);

  useEffect(() => {
    if (employeeId) {
      void loadWeekChanges();
    }
  }, [employeeId, selectedWeek]);

  /* =======================================================
     WEEK DAYS
     ======================================================= */

  const weekDays = useMemo(() => {
    return DAYS.map((day, index) => {
      const date = addDays(
        selectedWeek,
        index
      );

      return {
        day,
        date,
        key: dateKey(date),
      };
    });
  }, [selectedWeek]);

  /* =======================================================
     GET NORMAL DAY
     ======================================================= */

  const getDaySchedule = (
    dayName: string
  ): DaySchedule | undefined =>
    schedule.find(
      (day) => day.day === dayName
    );

  /* =======================================================
     GET BACKEND CHANGES
     ======================================================= */

  const getChangesForDate = (
    date: Date
  ): ScheduleChange[] => {
    const key = dateKey(date);

    return scheduleChanges.filter(
      (change) =>
        change.change_date.slice(0, 10) === key &&
        change.is_active &&
        (!branchId ||
          change.branch_id === branchId)
    );
  };

  /* =======================================================
     GET PENDING CHANGES
     ======================================================= */

  const getPendingChangesForDate = (
    date: Date
  ): PendingChange[] => {
    const key = dateKey(date);

    return pendingChanges.filter(
      (change) =>
        change.change_date === key &&
        (!branchId ||
          change.branch_id === branchId)
    );
  };

  /* =======================================================
     EFFECTIVE SLOTS
     ======================================================= */

  const getEffectiveSlots = (
    date: Date,
    dayName: string
  ): TimeSlot[] => {
    const backendChanges =
      getChangesForDate(date);

    const pending =
      getPendingChangesForDate(date);

    /*
     * Pending changes should override
     * the backend changes for the same date
     * until the user saves.
     */
    const allChanges = [
      ...backendChanges.map(
        (change) => ({
          change_id: change.change_id,
          mode: change.mode,
          branch_id: change.branch_id,
          start_time: change.start_time,
          end_time: change.end_time,
          isPending: false,
        })
      ),

      ...pending.map(
        (change) => ({
          change_id: change.id,
          mode: change.mode,
          branch_id: change.branch_id,
          start_time:
            change.start_time ?? null,
          end_time:
            change.end_time ?? null,
          isPending: true,
        })
      ),
    ];

    /*
     * If there is a pending CANCEL,
     * it must win over everything else.
     */
    const pendingCancel =
      pending.find(
        (change) =>
          change.mode === "CANCEL"
      );

    if (pendingCancel) {
      return [];
    }

    /*
     * If there is an existing backend CANCEL
     * and no pending ADD/OVERRIDE,
     * normal schedule is cancelled.
     */
    const hasBackendCancel =
      backendChanges.some(
        (change) =>
          change.mode === "CANCEL"
      );

    /*
     * Pending OVERRIDE has priority.
     */
    const pendingOverride =
      pending.filter(
        (change) =>
          change.mode === "OVERRIDE"
      );

    if (pendingOverride.length > 0) {
      return pendingOverride
        .filter(
          (change) =>
            change.start_time &&
            change.end_time
        )
        .map(
          (change) => ({
            id: `pending-${change.id}`,
            start: formatTime(
              change.start_time
            ),
            end: formatTime(
              change.end_time
            ),
            branchId:
              change.branch_id,
            shiftName: "Override",
            source: "OVERRIDE" as const,
            changeId: change.id,
            pending: true,
          })
        );
    }

    /*
     * Backend OVERRIDE.
     */
    const backendOverride =
      backendChanges.filter(
        (change) =>
          change.mode === "OVERRIDE"
      );

    if (backendOverride.length > 0) {
      return backendOverride
        .filter(
          (change) =>
            change.start_time &&
            change.end_time
        )
        .map(
          (change) => ({
            id: `change-${change.change_id}`,
            start: formatTime(
              change.start_time
            ),
            end: formatTime(
              change.end_time
            ),
            branchId:
              change.branch_id,
            shiftName: "Override",
            source: "OVERRIDE" as const,
            changeId:
              change.change_id,
          })
        );
    }

    const normalDay =
      getDaySchedule(dayName);

    const normalSlots =
      normalDay?.slots.filter(
        (slot) =>
          !branchId ||
          !slot.branchId ||
          slot.branchId === branchId
      ) ?? [];

    /*
     * ADD changes are added to normal
     * schedule unless the date has CANCEL.
     */
    const addedSlots =
      allChanges
        .filter(
          (change) =>
            change.mode === "ADD" &&
            change.start_time &&
            change.end_time
        )
        .map(
          (change) => ({
            id: `${
              change.isPending
                ? "pending"
                : "change"
            }-${change.change_id}`,
            start: formatTime(
              change.start_time
            ),
            end: formatTime(
              change.end_time
            ),
            branchId:
              change.branch_id,
            shiftName: "Added",
            source: "ADD" as const,
            changeId:
              change.change_id,
            pending: change.isPending,
          })
        );

    /*
     * CANCEL means normal schedule disappears.
     *
     * ADD still remains because ADD explicitly
     * adds a slot for that date.
     */
    if (hasBackendCancel) {
      return addedSlots;
    }

    return [
      ...normalSlots,
      ...addedSlots,
    ];
  };

  /* =======================================================
     OPEN CHANGE MODAL
     ======================================================= */

  const openChangeModal = (
    date: Date,
    defaultMode: DoctorScheduleChangeMode = "ADD"
  ) => {
    setModalDate(date);

    setModalMode(defaultMode);

    /*
     * When opening the modal for a date that already
     * has a schedule, use its first effective slot
     * as the default time.
     */
    const dayName =
      DAYS[
        date.getDay() === 0
          ? 6
          : date.getDay() - 1
      ];

    const existingSlots =
      getEffectiveSlots(
        date,
        dayName
      );

    const firstSlot =
      existingSlots[0];

    setModalStartTime(
      firstSlot
        ? toInputTime(firstSlot.start)
        : "09:00"
    );

    setModalEndTime(
      firstSlot
        ? toInputTime(firstSlot.end)
        : "12:00"
    );

    setModalReason("");

    setError("");

    setMessage("");

    setModalOpen(true);
  };

  const closeChangeModal = () => {
    setModalOpen(false);
    setModalDate(null);
  };

  /* =======================================================
     ADD PENDING CHANGE
     ======================================================= */

  const addPendingChange = () => {
    if (!modalDate) return;

    if (!employeeId) {
      setError(
        "Doctor information is not loaded."
      );
      return;
    }

    if (!branchId) {
      setError(
        "Please select a hospital."
      );
      return;
    }

    if (
      modalMode !== "CANCEL" &&
      (!modalStartTime ||
        !modalEndTime)
    ) {
      setError(
        "Start and end time are required."
      );
      return;
    }

    if (
      modalMode !== "CANCEL" &&
      modalStartTime >= modalEndTime
    ) {
      setError(
        "End time must be later than start time."
      );
      return;
    }

    const key = dateKey(modalDate);

    const pending: PendingChange = {
      id: `pending-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,

      employee_id: employeeId,

      branch_id: branchId,

      change_date: key,

      mode: modalMode,

      start_time:
        modalMode === "CANCEL"
          ? undefined
          : toApiTime(
              modalStartTime
            ),

      end_time:
        modalMode === "CANCEL"
          ? undefined
          : toApiTime(
              modalEndTime
            ),

      reason:
        modalReason.trim() ||
        undefined,

      created_by: employeeId,
    };

    setPendingChanges(
      (current) => {
        /*
         * CANCEL completely replaces all other
         * unsaved changes for the same date.
         */
        if (modalMode === "CANCEL") {
          return [
            ...current.filter(
              (change) =>
                change.change_date !== key
            ),
            pending,
          ];
        }

        /*
         * OVERRIDE replaces pending ADD/OVERRIDE
         * changes for the same date.
         *
         * It does not matter whether the existing
         * backend schedule is normal, ADD, or OVERRIDE;
         * the effective preview will show this
         * pending OVERRIDE.
         */
        if (modalMode === "OVERRIDE") {
          return [
            ...current.filter(
              (change) =>
                change.change_date !== key
            ),
            pending,
          ];
        }

        /*
         * ADD can coexist with other ADD changes.
         *
         * If there is a pending OVERRIDE/CANCEL,
         * ADD is not allowed to coexist with it because
         * that creates ambiguous date rules.
         */
        const existingForDate =
          current.filter(
            (change) =>
              change.change_date === key
          );

        const hasOverride =
          existingForDate.some(
            (change) =>
              change.mode ===
              "OVERRIDE"
          );

        const hasCancel =
          existingForDate.some(
            (change) =>
              change.mode === "CANCEL"
          );

        if (
          hasOverride ||
          hasCancel
        ) {
          return [
            ...current.filter(
              (change) =>
                change.change_date !== key
            ),
            pending,
          ];
        }

        return [
          ...current,
          pending,
        ];
      }
    );

    setMessage("");
    setError("");

    closeChangeModal();
  };

  /* =======================================================
     REMOVE PENDING CHANGE
     ======================================================= */

  const removePendingChange = (
    id: string
  ) => {
    setPendingChanges(
      (current) =>
        current.filter(
          (change) =>
            change.id !== id
        )
    );

    setMessage("");
  };

  /* =======================================================
     CANCEL EXISTING BACKEND CHANGE
     ======================================================= */

  const cancelExistingChange = async (
    changeId: string
  ) => {
    if (saving) return;

    try {
      setSaving(true);

      setError("");
      setMessage("");

      await API.patch(
        `${SCHEDULE_API_BASE}/change/${changeId}/cancel`
      );

      await loadWeekChanges();

      setMessage(
        "Schedule change cancelled successfully."
      );
    } catch (err: any) {
      console.error(
        "Failed to cancel change:",
        err
      );

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to cancel schedule change."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     SAVE CHANGES
     ======================================================= */

  const saveSchedule = async () => {
    if (!employeeId) {
      setError(
        "Doctor information is not loaded."
      );
      return;
    }

    if (!branchId) {
      setError(
        "Please select a hospital."
      );
      return;
    }

    if (pendingChanges.length === 0) {
      setMessage(
        "There are no pending changes to save."
      );
      return;
    }

    setSaving(true);

    setError("");
    setMessage("");

    try {
      /*
       * Save sequentially so the backend receives
       * changes in a predictable order.
       */
      for (const change of pendingChanges) {
        const payload: CreateScheduleChangePayload =
          {
            employee_id:
              change.employee_id,

            branch_id:
              change.branch_id,

            change_date:
              change.change_date,

            mode:
              change.mode,

            created_by:
              change.created_by,
          };

        if (
          change.mode !==
          "CANCEL"
        ) {
          if (
            change.start_time &&
            change.end_time
          ) {
            payload.start_time =
              change.start_time;

            payload.end_time =
              change.end_time;
          }
        }

        if (change.reason) {
          payload.reason =
            change.reason;
        }

        await API.post(
          `${SCHEDULE_API_BASE}/change`,
          payload
        );
      }

      /*
       * Only clear pending changes after every
       * request has completed successfully.
       */
      setPendingChanges([]);

      await loadWeekChanges();

      setMessage(
        "Your schedule changes have been saved successfully."
      );
    } catch (err: any) {
      console.error(
        "Failed to save schedule changes:",
        err
      );

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to save schedule changes."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     WEEK NAVIGATION
     ======================================================= */

  const previousWeek = () => {
    setSelectedWeek(
      (current) =>
        addWeeks(current, -1)
    );
  };

  const nextWeek = () => {
    setSelectedWeek(
      (current) =>
        addWeeks(current, 1)
    );
  };

  const today = () => {
    const current = new Date();

    setSelectedDate(current);

    setSelectedWeek(
      startOfWeek(current)
    );
  };

  /* =======================================================
     CLEAR
     ======================================================= */

  const clearChanges = () => {
    setPendingChanges([]);

    setMessage("");

    setError("");
  };

  /* =======================================================
     CALENDAR
     ======================================================= */

  const calendarDays = useMemo(() => {
    const firstDay = new Date(
      selectedWeek.getFullYear(),
      selectedWeek.getMonth(),
      1
    );

    const day = firstDay.getDay();

    const offset =
      day === 0 ? -6 : 1 - day;

    const start = addDays(
      firstDay,
      offset
    );

    return Array.from(
      { length: 42 },
      (_, index) =>
        addDays(
          start,
          index
        )
    );
  }, [selectedWeek]);

  /* =======================================================
     SELECTED BRANCH
     ======================================================= */

  const handleBranchChange = (
    value: string
  ) => {
    setBranchId(value);

    const branch =
      branches.find(
        (item) =>
          item.branch_id === value
      );

    setBranchName(
      branch?.branch_name ?? ""
    );

    /*
     * Branch changes should not silently remove
     * unsaved changes. Instead, warn the user.
     */
    setMessage("");
    setError("");
  };

  /* =======================================================
     SELECT DATE
     ======================================================= */

  const selectWeekDate = (
    date: Date
  ) => {
    setSelectedDate(date);
    setSelectedWeek(
      startOfWeek(date)
    );
  };

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-6 text-gray-800 lg:p-8">
        {/* =================================================
            MAIN HEADER
        ================================================= */}

        <header className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-col gap-2">
            <label
              className="text-xs font-semibold uppercase tracking-wide text-gray-500"
              htmlFor="hospital-select"
            >
              Hospital
            </label>

            <div className="relative">
              <select
                id="hospital-select"
                value={branchId}
                onChange={(e) =>
                  handleBranchChange(
                    e.target.value
                  )
                }
                className="
                  min-w-[280px]
                  appearance-none
                  rounded-lg
                  border
                  border-gray-300
                  bg-white
                  py-2.5
                  pl-4
                  pr-10
                  text-sm
                  font-medium
                  text-gray-900
                  shadow-sm
                  outline-none
                  transition
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-100
                "
              >
                <option value="">
                  Select hospital
                </option>

                {branches.map(
                  (branch) => (
                    <option
                      key={
                        branch.branch_id
                      }
                      value={
                        branch.branch_id
                      }
                    >
                      {
                        branch.branch_name
                      }
                    </option>
                  )
                )}

                {!branches.length &&
                  branchId && (
                    <option
                      value={
                        branchId
                      }
                    >
                      {branchName ||
                        "Assigned Hospital"}
                    </option>
                  )}
              </select>

              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                <Icon className="h-4 w-4">
                  <path d="m6 9 6 6 6-6" />
                </Icon>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-1.5 shadow-sm">
            <div className="flex rounded-lg bg-gray-100 p-0.5">
              <button
                type="button"
                onClick={() =>
                  setViewMode("day")
                }
                className={`
                  rounded-md
                  px-4
                  py-1.5
                  text-sm
                  font-medium
                  transition
                  ${
                    viewMode ===
                    "day"
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }
                `}
              >
                Day
              </button>

              <button
                type="button"
                onClick={() =>
                  setViewMode("week")
                }
                className={`
                  rounded-md
                  px-4
                  py-1.5
                  text-sm
                  font-medium
                  transition
                  ${
                    viewMode ===
                    "week"
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }
                `}
              >
                Week
              </button>
            </div>

            <div className="h-6 w-px bg-gray-200" />

            <div className="flex items-center gap-2 px-2">
              <button
                type="button"
                onClick={previousWeek}
                className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <Icon className="h-4 w-4">
                  <path d="m15 18-6-6 6-6" />
                </Icon>
              </button>

              <span className="min-w-[120px] text-center text-sm font-bold text-gray-900">
                {formatMonthYear(
                  selectedWeek
                )}
              </span>

              <button
                type="button"
                onClick={nextWeek}
                className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <Icon className="h-4 w-4">
                  <path d="m9 18 6-6-6-6" />
                </Icon>
              </button>
            </div>
          </div>
        </header>

        {/* =================================================
            MESSAGES
        ================================================= */}

        {error && (
          <div className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <div className="flex items-center gap-2">
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
              <span>{error}</span>
            </div>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="shrink-0 rounded-md p-0.5 text-red-400 transition hover:bg-red-100 hover:text-red-700"
            >
              <Icon className="h-4 w-4">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </Icon>
            </button>
          </div>
        )}

        {message && (
          <div className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <div className="flex items-center gap-2">
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-green-500" />
              <span>{message}</span>
            </div>

            <button
              type="button"
              onClick={() =>
                setMessage("")
              }
              className="shrink-0 rounded-md p-0.5 text-green-400 transition hover:bg-green-100 hover:text-green-700"
            >
              <Icon className="h-4 w-4">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </Icon>
            </button>
          </div>
        )}

        {/* =================================================
            LOADING
        ================================================= */}

        {loading ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-16 text-center shadow-sm">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-700" />

            <p className="text-sm font-medium text-gray-500">
              Loading your schedule...
            </p>
          </div>
        ) : (
          <main className="grid grid-cols-1 gap-6 xl:grid-cols-4">
            {/* =================================================
                MAIN CONTENT
            ================================================= */}

            <section
              className={`flex flex-col gap-4 ${
                viewMode === "day"
                  ? "xl:col-span-4"
                  : "xl:col-span-3"
              }`}
            >
              <div className="flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                {/* Availability Header */}

                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Availability
                    </h2>

                    <p className="mt-1 text-sm text-gray-400">
                      {viewMode === "day"
                        ? "Manage your recurring weekly schedule"
                        : changesLoading
                        ? "Refreshing schedule changes..."
                        : "Manage date-specific schedule changes"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {viewMode === "week" && (
                      <>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <button
                            type="button"
                            onClick={
                              previousWeek
                            }
                            className="flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium transition hover:bg-gray-100 hover:text-gray-900"
                          >
                            <Icon className="h-4 w-4">
                              <path d="m15 18-6-6 6-6" />
                            </Icon>
                            Prev
                          </button>

                          <button
                            type="button"
                            onClick={
                              nextWeek
                            }
                            className="flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium transition hover:bg-gray-100 hover:text-gray-900"
                          >
                            Next
                            <Icon className="h-4 w-4">
                              <path d="m9 18 6-6-6-6" />
                            </Icon>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            openChangeModal(
                              selectedDate
                            )
                          }
                          className="
                            flex
                            items-center
                            gap-2
                            rounded-lg
                            bg-[#0b5394]
                            px-4
                            py-2
                            text-sm
                            font-semibold
                            text-white
                            shadow-sm
                            transition
                            hover:bg-blue-800
                            hover:shadow
                          "
                        >
                          <Icon className="h-4 w-4">
                            <path d="M12 5v14" />
                            <path d="M5 12h14" />
                          </Icon>

                          Add slot
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* =================================================
                    LEGEND
                ================================================= */}

                {viewMode === "week" && (
                  <div className="mb-5 flex flex-wrap items-center gap-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Legend
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-sm border border-slate-200 bg-white" />
                      <span className="text-xs text-gray-500">
                        Recurring
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-sm border border-green-300 bg-green-50" />
                      <span className="text-xs text-gray-500">
                        Extra slot
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-sm border border-blue-300 bg-blue-50" />
                      <span className="text-xs text-gray-500">
                        Override
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-sm border border-red-300 bg-red-50" />
                      <span className="text-xs text-gray-500">
                        Cancel date
                      </span>
                    </div>

                    {pendingChanges.length >
                      0 && (
                      <span className="ml-auto flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        {
                          pendingChanges.length
                        }{" "}
                        unsaved
                      </span>
                    )}
                  </div>
                )}

                {/* =================================================
                    WEEK VIEW
                ================================================= */}

                {viewMode ===
                  "week" && (
                  <div className="overflow-hidden rounded-xl border-2 border-slate-300">
                    {/* Grid Headers */}

                    <div className="flex w-full bg-slate-50">
                      {weekDays.map(
                        ({
                          day,
                          date,
                        }) => {
                          const active =
                            sameDate(
                              date,
                              selectedDate
                            );

                          const todayDate =
                            sameDate(
                              date,
                              new Date()
                            );

                          const changes =
                            getChangesForDate(
                              date
                            );

                          const pending =
                            getPendingChangesForDate(
                              date
                            );

                          return (
                            <div
                              key={dateKey(
                                date
                              )}
                              className={`
                                flex-1
                                min-w-0
                                border-r
                                border-slate-200
                                px-2
                                py-3
                                text-center
                                transition
                                last:border-r-0
                                ${
                                  active
                                    ? "bg-blue-50/50"
                                    : ""
                                }
                              `}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedDate(
                                    date
                                  )
                                }
                                className="w-full"
                              >
                                <div
                                  className={`
                                    text-sm
                                    font-semibold
                                    ${
                                      todayDate ||
                                      active
                                        ? "text-blue-800"
                                        : "text-slate-700"
                                    }
                                  `}
                                >
                                  {day}
                                </div>

                                <div
                                  className={`
                                    mt-0.5
                                    text-xs
                                    font-medium
                                    ${
                                      active
                                        ? "text-blue-700"
                                        : "text-slate-500"
                                    }
                                  `}
                                >
                                  {formatWeekDate(
                                    date
                                  )}
                                </div>
                              </button>

                              {(changes.length >
                                0 ||
                                pending.length >
                                  0) && (
                                <div className="mt-1.5 flex min-h-[16px] flex-wrap items-center justify-center gap-1">
                                  {changes.map(
                                    (
                                      change
                                    ) => (
                                      <span
                                        key={
                                          change.change_id
                                        }
                                        className="flex items-center gap-1 rounded bg-white/80 px-1 py-0.5 shadow-sm"
                                      >
                                        <span
                                          className={`
                                            h-2
                                            w-2
                                            rounded-full
                                            ${
                                              change.mode ===
                                              "ADD"
                                                ? "bg-green-500"
                                                : change.mode ===
                                                  "OVERRIDE"
                                                ? "bg-blue-500"
                                                : "bg-red-500"
                                            }
                                          `}
                                        />

                                        <button
                                          type="button"
                                          title="Deactivate this change"
                                          disabled={
                                            saving
                                          }
                                          onClick={() =>
                                            cancelExistingChange(
                                              change.change_id
                                            )
                                          }
                                          className="text-gray-300 transition hover:text-red-500 disabled:opacity-50"
                                        >
                                          <Icon className="h-2.5 w-2.5">
                                            <path d="M18 6 6 18" />
                                            <path d="m6 6 12 12" />
                                          </Icon>
                                        </button>
                                      </span>
                                    )
                                  )}

                                  {pending.map(
                                    (
                                      change
                                    ) => (
                                      <span
                                        key={
                                          change.id
                                        }
                                        className="flex items-center gap-1 rounded bg-amber-100 px-1 py-0.5 shadow-sm"
                                      >
                                        <span className="h-2 w-2 rounded-full bg-amber-500" />

                                        <button
                                          type="button"
                                          title="Remove unsaved change"
                                          onClick={() =>
                                            removePendingChange(
                                              change.id
                                            )
                                          }
                                          className="text-gray-300 transition hover:text-red-500"
                                        >
                                          <Icon className="h-2.5 w-2.5">
                                            <path d="M18 6 6 18" />
                                            <path d="m6 6 12 12" />
                                          </Icon>
                                        </button>
                                      </span>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>

                    {/* Grid Body */}

                    <div className="flex w-full overflow-y-auto">
                      {weekDays.map(
                        ({
                          day,
                          date,
                        }) => {
                          const slots =
                            getEffectiveSlots(
                              date,
                              day
                            );

                          const changes =
                            getChangesForDate(
                              date
                            );

                          const pending =
                            getPendingChangesForDate(
                              date
                            );

                          const isToday =
                            sameDate(
                              date,
                              new Date()
                            );

                          const isSelected =
                            sameDate(
                              date,
                              selectedDate
                            );

                          const hasCancel =
                            changes.some(
                              (change) =>
                                change.mode ===
                                "CANCEL"
                            ) ||
                            pending.some(
                              (change) =>
                                change.mode ===
                                "CANCEL"
                            );

                          const branchName =
                            (id?: string) =>
                              id
                                ? branches.find(
                                    (
                                      branch
                                    ) =>
                                      branch.branch_id ===
                                      id
                                  )?.branch_name ??
                                  ""
                                : "";

                          return (
                            <div
                              key={dateKey(
                                date
                              )}
                              className={`
                                flex-1
                                min-w-0
                                flex-col
                                border-r
                                border-slate-200
                                transition
                                last:border-r-0
                                ${
                                  isToday ||
                                  isSelected
                                    ? "bg-blue-50/30"
                                    : ""
                                }
                              `}
                            >
                              {slots.length >
                              0 ? (
                                <>
                                  {slots.map(
                                    (
                                      slot
                                    ) => {
                                      const cellClass =
                                        slot.source ===
                                        "ADD"
                                          ? "border-green-300 bg-green-50"
                                          : slot.source ===
                                            "OVERRIDE"
                                          ? "border-blue-300 bg-blue-50"
                                          : "border-slate-200 bg-white";

                                      const timeClass =
                                        slot.source ===
                                        "ADD"
                                          ? "text-green-900"
                                          : slot.source ===
                                            "OVERRIDE"
                                          ? "text-blue-900"
                                          : "text-slate-800";

                                      const subClass =
                                        slot.source ===
                                        "ADD"
                                          ? "text-green-600"
                                          : slot.source ===
                                            "OVERRIDE"
                                          ? "text-blue-600"
                                          : "text-slate-500";

                                      const displayedBranch =
                                        branchName(
                                          slot.branchId
                                        ) ||
                                        slot.shiftName ||
                                        "Consulting";

                                      return (
                                        <div
                                          key={
                                            slot.id
                                          }
                                          className="group relative h-[80px] border-b border-slate-200 p-1"
                                        >
                                          <div
                                            className={`
                                              flex
                                              h-full
                                              w-full
                                              flex-col
                                              items-center
                                              justify-center
                                              rounded-[4px]
                                              border
                                              text-center
                                              leading-tight
                                              transition
                                              ${cellClass}
                                            `}
                                          >
                                            <span
                                              className={`
                                                mb-1
                                                block
                                                text-[10px]
                                                font-medium
                                                ${timeClass}
                                              `}
                                            >
                                              {slot.start}{" "}
                                              -<br />
                                              {slot.end}
                                            </span>

                                            <span
                                              className={`
                                                text-[10px]
                                                ${subClass}
                                              `}
                                            >
                                              {
                                                displayedBranch
                                              }
                                            </span>
                                          </div>

                                          {slot.pending && (
                                            <span className="absolute left-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500 shadow-sm" />
                                          )}

                                          {slot.pending ||
                                          slot.changeId ? (
                                            <button
                                              type="button"
                                              title={
                                                slot.pending
                                                  ? "Remove unsaved change"
                                                  : "Deactivate this change"
                                              }
                                              disabled={
                                                !slot.pending &&
                                                saving
                                              }
                                              onClick={() =>
                                                slot.pending
                                                  ? removePendingChange(
                                                      slot.changeId!
                                                    )
                                                  : cancelExistingChange(
                                                      slot.changeId!
                                                    )
                                              }
                                              className="
                                                absolute
                                                right-1
                                                top-1
                                                rounded
                                                p-0.5
                                                text-gray-300
                                                opacity-0
                                                transition
                                                group-hover:opacity-100
                                                hover:bg-red-50
                                                hover:text-red-500
                                                disabled:opacity-50
                                              "
                                            >
                                              <Icon className="h-3 w-3">
                                                <path d="M18 6 6 18" />
                                                <path d="m6 6 12 12" />
                                              </Icon>
                                            </button>
                                          ) : null}
                                        </div>
                                      );
                                    }
                                  )}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      openChangeModal(
                                        date,
                                        "ADD"
                                      )
                                    }
                                    className="
                                      flex
                                      h-[80px]
                                      w-full
                                      flex-1
                                      items-center
                                      justify-center
                                      border-b
                                      border-slate-200
                                      p-1
                                    "
                                  >
                                    <span className="flex h-full w-full items-center justify-center rounded-[4px] border border-dashed border-slate-300 text-slate-400 transition hover:bg-slate-50">
                                      <Icon className="h-4 w-4">
                                        <path d="M12 5v14" />
                                        <path d="M5 12h14" />
                                      </Icon>
                                    </span>
                                  </button>
                                </>
                              ) : hasCancel ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openChangeModal(
                                      date
                                    )
                                  }
                                  className="
                                    flex
                                    h-[80px]
                                    w-full
                                    flex-1
                                    items-center
                                    justify-center
                                    p-1
                                  "
                                >
                                  <span className="flex h-full w-full flex-col items-center justify-center rounded-[4px] border border-dashed border-red-200 bg-red-50 text-center">
                                    <span className="text-[10px] font-bold text-red-600">
                                      Schedule cancelled
                                    </span>
                                    <span className="mt-0.5 text-[9px] text-red-400">
                                      No availability
                                    </span>
                                  </span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openChangeModal(
                                      date
                                    )
                                  }
                                  className="
                                    flex
                                    h-[80px]
                                    w-full
                                    flex-1
                                    items-center
                                    justify-center
                                    p-1
                                  "
                                >
                                  <span className="flex h-full w-full flex-col items-center justify-center rounded-[4px] border border-dashed border-slate-300 font-medium text-slate-800 transition hover:bg-slate-50">
                                    <Icon className="mb-1 h-4 w-4 text-slate-400">
                                      <path d="M12 5v14" />
                                      <path d="M5 12h14" />
                                    </Icon>
                                    <span className="text-[10px]">
                                      Week Off
                                    </span>
                                  </span>
                                </button>
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}

                {/* =================================================
                    DAY VIEW
                ================================================= */}

                {viewMode ===
                  "day" && (
                  <div>
                    {/* Schedule list card -- recurring doctor_schedule
                        template, edited locally and saved in one batch. */}
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                      <ul className="divide-y divide-gray-100" role="list">
                        {DAYS.map((day) => {
                          const draft =
                            dayDraft[day] ?? {
                              enabled: false,
                              slots: [],
                            };

                          const visibleSlots =
                            draft.slots.filter(
                              (slot) =>
                                !slot.removed
                            );

                          return (
                            <li
                              key={day}
                              className="py-6 flex flex-wrap items-center gap-x-4 gap-y-3 px-8"
                            >
                              <div className="w-32 font-medium text-[#111827] text-[15px]">
                                {day}
                              </div>

                              <div className="w-16">
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={
                                    draft.enabled
                                  }
                                  onClick={() =>
                                    handleDayDraftToggle(
                                      day,
                                      !draft.enabled
                                    )
                                  }
                                  disabled={saving}
                                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                                    draft.enabled
                                      ? "bg-[#004B87]"
                                      : "bg-gray-300"
                                  }`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                      draft.enabled
                                        ? "translate-x-5"
                                        : "translate-x-0"
                                    }`}
                                  />
                                </button>
                              </div>

                              <div className="flex-grow flex flex-wrap items-center gap-4">
                                {draft.enabled ? (
                                  visibleSlots.map(
                                    (slot) => (
                                      <div
                                        key={
                                          slot.key
                                        }
                                        className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#374151] shadow-sm"
                                      >
                                        <svg
                                          className="w-4 h-4 text-gray-500"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="1.5"
                                          viewBox="0 0 24 24"
                                          xmlns="http://www.w3.org/2000/svg"
                                        >
                                          <path
                                            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        </svg>

                                        <span>
                                          {
                                            slot.displayStart
                                          }{" "}
                                          -{" "}
                                          {
                                            slot.displayEnd
                                          }
                                        </span>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleDayDraftRemoveSlot(
                                              day,
                                              slot.key
                                            )
                                          }
                                          disabled={saving}
                                          className="text-gray-400 hover:text-gray-600 focus:outline-none ml-1 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                          <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            viewBox="0 0 24 24"
                                            xmlns="http://www.w3.org/2000/svg"
                                          >
                                            <path
                                              d="M6 18L18 6M6 6l12 12"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                            />
                                          </svg>
                                        </button>
                                      </div>
                                    )
                                  )
                                ) : (
                                  <span className="inline-flex items-center rounded-md bg-[#FDE8E8] px-3 py-1.5 text-xs font-semibold text-[#9B1C1C]">
                                    ON LEAVE
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={() =>
                                    slotModalRef.current?.openAddSlot(
                                      day
                                    )
                                  }
                                  disabled={saving}
                                  className="flex items-center gap-1 text-[#004B87] font-medium text-sm hover:underline focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      d="M12 4.5v15m7.5-7.5h-15"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                  Add Slot
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    {/* Footer actions */}
                    <div className="mt-8 flex items-center justify-end gap-6">
                      <button
                        type="button"
                        onClick={handleDayDraftCancel}
                        disabled={saving}
                        className="text-[#004B87] font-semibold text-[15px] hover:underline focus:outline-none disabled:opacity-50"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={handleDayDraftSave}
                        disabled={
                          saving ||
                          !dayDraftDirty ||
                          !employeeId ||
                          !branchId
                        }
                        className="bg-[#004B87] hover:bg-[#003A69] text-white font-semibold text-[15px] py-2.5 px-6 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004B87] transition-colors disabled:bg-gray-300 disabled:hover:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {saving
                          ? "Saving..."
                          : "Save changes"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* =================================================
                  ACTION FOOTER (Week tab only)
              ================================================= */}

              {viewMode === "week" && (
                <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    {pendingChanges.length >
                    0 ? (
                      <>
                        <span className="h-2 w-2 rounded-full bg-amber-400" />
                        <p className="text-sm font-medium text-amber-700">
                          {pendingChanges.length}{" "}
                          unsaved schedule change
                          {pendingChanges.length !==
                          1
                            ? "s"
                            : ""}
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="h-2 w-2 rounded-full bg-gray-300" />
                        <p className="text-sm text-gray-400">
                          No unsaved changes
                        </p>
                      </>
                    )}
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={
                        clearChanges
                      }
                      disabled={
                        pendingChanges.length ===
                          0 ||
                        saving
                      }
                      className="
                        rounded-lg
                        border
                        border-gray-200
                        px-5
                        py-2
                        text-sm
                        font-medium
                        text-gray-600
                        transition
                        hover:bg-gray-50
                        hover:text-gray-900
                        disabled:cursor-not-allowed
                        disabled:text-gray-300
                        disabled:hover:bg-transparent
                      "
                    >
                      Clear all
                    </button>

                    <button
                      type="button"
                      onClick={
                        saveSchedule
                      }
                      disabled={
                        saving ||
                        pendingChanges.length ===
                          0 ||
                        !employeeId ||
                        !branchId
                      }
                      className="
                        rounded-lg
                        bg-[#0b5394]
                        px-5
                        py-2
                        text-sm
                        font-semibold
                        text-white
                        shadow-sm
                        transition
                        hover:bg-blue-800
                        hover:shadow
                        disabled:cursor-not-allowed
                        disabled:bg-gray-300
                        disabled:shadow-none
                      "
                    >
                      {saving
                        ? "Saving..."
                        : "Save changes"}
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* =================================================
                SIDEBAR (week view only -- the Day tab is a
                recurring editor and doesn't need the calendar)
            ================================================= */}

            {viewMode === "week" && (
              <aside>
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="p-4">
                  {/* Calendar Header */}

                  <div className="mb-4 flex items-center justify-between px-1">
                    <button
                      type="button"
                      onClick={
                        previousWeek
                      }
                      className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                    >
                      <Icon className="h-3.5 w-3.5">
                        <path d="m15 18-6-6 6-6" />
                      </Icon>
                    </button>

                    <h3 className="text-sm font-bold text-gray-900">
                      {formatMonthYear(
                        selectedWeek
                      )}
                    </h3>

                    <button
                      type="button"
                      onClick={
                        nextWeek
                      }
                      className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                    >
                      <Icon className="h-3.5 w-3.5">
                        <path d="m9 18 6-6-6-6" />
                      </Icon>
                    </button>
                  </div>

                  {/* Weekday */}

                  <div className="mb-2 grid grid-cols-7 gap-1 text-center">
                    {[
                      "Su",
                      "Mo",
                      "Tu",
                      "We",
                      "Th",
                      "Fr",
                      "Sa",
                    ].map(
                      (day) => (
                        <div
                          key={day}
                          className="py-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-400"
                        >
                          {day}
                        </div>
                      )
                    )}
                  </div>

                  {/* Calendar */}

                  <div className="grid grid-cols-7 gap-y-0.5 text-center text-sm">
                    {calendarDays.map(
                      (date) => {
                        const inMonth =
                          date.getMonth() ===
                          selectedWeek.getMonth();

                        const selected =
                          sameDate(
                            date,
                            selectedDate
                          );

                        const currentWeek =
                          date >=
                            selectedWeek &&
                          date <=
                            addDays(
                              selectedWeek,
                              6
                            );

                        const todayDate =
                          sameDate(
                            date,
                            new Date()
                          );

                        return (
                          <button
                            type="button"
                            key={dateKey(
                              date
                            )}
                            onClick={() =>
                              selectWeekDate(
                                date
                              )
                            }
                            className="flex h-7 items-center justify-center"
                          >
                            <span
                              className={`
                                flex
                                h-6
                                w-6
                                items-center
                                justify-center
                                rounded-lg
                                text-[11px]
                                font-medium
                                transition
                                ${
                                  !inMonth
                                    ? "text-gray-300"
                                    : currentWeek
                                    ? "bg-[#0b5394] font-bold text-white shadow-sm"
                                    : selected
                                    ? "bg-blue-100 font-bold text-blue-700"
                                    : todayDate
                                    ? "font-bold text-blue-700"
                                    : "text-gray-700 hover:bg-gray-100"
                                }
                              `}
                            >
                              {date.getDate()}
                            </span>
                          </button>
                        );
                      }
                    )}
                  </div>

                  {/* Selected Date */}

                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                      Selected date
                    </div>

                    <div className="mt-1 text-sm font-semibold text-gray-900">
                      {formatFullDate(
                        selectedDate
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={today}
                      className="mt-2.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                    >
                      Go to today
                    </button>
                  </div>
                </div>

                {/* Bottom Action */}

                <button
                  type="button"
                  onClick={() =>
                    setViewMode("day")
                  }
                  className="
                    block
                    w-full
                    border-t
                    border-gray-200
                    bg-gray-50
                    py-3.5
                    text-center
                    text-sm
                    font-semibold
                    text-[#0b5394]
                    transition
                    hover:bg-gray-100
                  "
                >
                  Edit weekly schedule
                </button>
              </div>
              </aside>
            )}
          </main>
        )}

        {/* =================================================
            CHANGE MODAL
        ================================================= */}

        <ChangeModal
          open={modalOpen}
          date={modalDate}
          mode={modalMode}
          setMode={setModalMode}
          startTime={modalStartTime}
          setStartTime={
            setModalStartTime
          }
          endTime={modalEndTime}
          setEndTime={
            setModalEndTime
          }
          reason={modalReason}
          setReason={
            setModalReason
          }
          onClose={
            closeChangeModal
          }
          onAdd={
            addPendingChange
          }
        />

        {/* =================================================
            RECURRING SLOT MODAL (Day tab)
        ================================================= */}

        <ScheduleSlotModal
          ref={slotModalRef}
          branches={branches}
          hideDate
          defaultBranchId={branchId}
          onAddSlot={handleDayDraftAddSlot}
          onCancelSlot={() => {}}
        />
      </div>
    </>
  );
}

