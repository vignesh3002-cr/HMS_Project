import { useEffect, useMemo, useState } from "react";
import API from "../../api/axios";

/* =========================================================
   TYPES
   ========================================================= */

interface TimeSlot {
  id: string;
  start: string;
  end: string;
  branchId?: string;
  shiftName?: string;
}

interface DaySchedule {
  day: string;
  enabled: boolean;
  onLeave: boolean;
  slots: TimeSlot[];
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

    branches?: Array<{
      branch_id: string;
      branch_name: string;
      status?: number;
    }>;

    doctorSchedules?: Array<{
      schedule_id?: string;
      branch_id?: string;
      day_of_week?: string;
      start_time?: string | null;
      end_time?: string | null;
      shift_name?: string | null;
      is_active?: boolean;
    }>;
  };
}

interface UpdateEmployeeResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
}

/* =========================================================
   CONSTANTS
   ========================================================= */

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const DAY_SHORT = [
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
  "SUN",
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

  return `${String(displayHour).padStart(
    2,
    "0"
  )}:${minute} ${suffix}`;
}

function toInputTime(value: string): string {
  if (!value) return "";

  const match = value.match(
    /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
  );

  if (!match) {
    const normal = value.match(
      /(\d{1,2}):(\d{2})/
    );

    if (!normal) return "";

    return `${String(
      Number(normal[1])
    ).padStart(2, "0")}:${normal[2]}`;
  }

  let hour = Number(match[1]);

  const minute = match[2];

  const suffix = match[3].toUpperCase();

  if (suffix === "AM" && hour === 12) {
    hour = 0;
  }

  if (suffix === "PM" && hour !== 12) {
    hour += 12;
  }

  return `${String(hour).padStart(
    2,
    "0"
  )}:${minute}`;
}

function toApiTime(value: string): string {
  const match = value
    .trim()
    .match(
      /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
    );

  if (!match) {
    return value.length === 5
      ? `${value}:00`
      : value;
  }

  let hour = Number(match[1]);

  const minute = match[2];

  const suffix = match[3].toUpperCase();

  if (suffix === "AM" && hour === 12) {
    hour = 0;
  }

  if (suffix === "PM" && hour !== 12) {
    hour += 12;
  }

  return `${String(hour).padStart(
    2,
    "0"
  )}:${minute}:00`;
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
      day.slice(0, 3).toUpperCase() ===
      upper.slice(0, 3)
  );

  return shortDay ?? value;
}

/* =========================================================
   BACKEND -> FRONTEND
   ========================================================= */

function scheduleFromBackend(
  schedules: DoctorResponse["data"]["doctorSchedules"]
): DaySchedule[] {
  const result = emptySchedule();

  for (const item of schedules ?? []) {
    const dayName = normalizeDay(
      item.day_of_week
    );

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
        `${dayName}-${item.start_time}-${item.end_time}-${Math.random()}`,

      start: formatTime(item.start_time),

      end: formatTime(item.end_time),

      branchId: item.branch_id,

      shiftName:
        item.shift_name ?? "Consulting",
    });
  }

  return result;
}

/* =========================================================
   ICON COMPONENT
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
   SLOT CARD
   ========================================================= */

interface SlotCardProps {
  slot: TimeSlot;
  onChange: (
    field: "start" | "end",
    value: string
  ) => void;
  onDelete: () => void;
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
  return (
    <div
      className={`
        group relative rounded-md border
        ${
          highlighted
            ? "border-blue-500 bg-blue-50/40"
            : "border-gray-200 bg-white"
        }
        ${
          compact
            ? "p-2"
            : "p-3"
        }
        transition
        hover:border-blue-300
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div
            className={`
              font-semibold text-gray-800
              ${compact ? "text-[10px]" : "text-sm"}
            `}
          >
            <input
              type="time"
              value={toInputTime(slot.start)}
              onChange={(e) =>
                onChange(
                  "start",
                  e.target.value
                )
              }
              className="
                w-[72px]
                border-0
                bg-transparent
                p-0
                text-[11px]
                font-semibold
                text-gray-800
                outline-none
                focus:ring-0
              "
            />

            <span className="mx-1 text-gray-400">
              -
            </span>

            <input
              type="time"
              value={toInputTime(slot.end)}
              onChange={(e) =>
                onChange(
                  "end",
                  e.target.value
                )
              }
              className="
                w-[72px]
                border-0
                bg-transparent
                p-0
                text-[11px]
                font-semibold
                text-gray-800
                outline-none
                focus:ring-0
              "
            />
          </div>

          {slot.shiftName && (
            <div
              className={`
                mt-1 truncate
                text-gray-500
                ${
                  compact
                    ? "text-[8px]"
                    : "text-[10px]"
                }
              `}
            >
              {slot.shiftName}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onDelete}
          title="Delete slot"
          className="
            shrink-0
            rounded
            p-1
            text-gray-300
            opacity-0
            transition
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
      </div>
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
   ========================================================= */

export default function MySchedulePage() {
  const [employeeId, setEmployeeId] =
    useState("");

  const [schedule, setSchedule] =
    useState<DaySchedule[]>(
      emptySchedule()
    );

  const [branchId, setBranchId] =
    useState("");

  const [branchName, setBranchName] =
    useState("");

  const [viewMode, setViewMode] =
    useState<"day" | "week">("week");

  const [selectedWeek, setSelectedWeek] =
    useState<Date>(
      startOfWeek(new Date())
    );

  const [selectedDate, setSelectedDate] =
    useState<Date>(new Date());

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [isDirty, setIsDirty] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  /* =====================================================
     LOAD SCHEDULE
     ===================================================== */

  const loadSchedule = async () => {
    setLoading(true);
    setError("");

    try {
      const authResponse =
        await API.get<AuthMeResponse>(
          "/auth/me"
        );

      const id =
        authResponse.data?.user
          ?.employee_id;

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

      const data =
        doctorResponse.data?.data;

      const activeBranch =
        data?.branches?.find(
          (branch) =>
            branch.status !== 0
        ) ??
        data?.branches?.[0];

      const schedules =
        data?.doctorSchedules ?? [];

      const selectedBranch =
        activeBranch?.branch_id ??
        schedules[0]?.branch_id ??
        "";

      setBranchId(
        selectedBranch
      );

      setBranchName(
        activeBranch?.branch_name ??
          ""
      );

      setSchedule(
        scheduleFromBackend(
          schedules
        )
      );

      setIsDirty(false);
    } catch (err: any) {
      console.error(
        "Failed to load schedule:",
        err
      );

      setError(
        err?.response?.data
          ?.message ||
          err?.message ||
          "Unable to load your schedule."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSchedule();
  }, []);

  /* =====================================================
     WEEK DAYS
     ===================================================== */

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

  /* =====================================================
     SELECTED DAY
     ===================================================== */

  const selectedDayName = useMemo(() => {
    const day =
      selectedDate.getDay();

    return DAYS[
      day === 0 ? 6 : day - 1
    ];
  }, [selectedDate]);

  /* =====================================================
     GET DAY
     ===================================================== */

  const getDaySchedule = (
    dayName: string
  ) =>
    schedule.find(
      (day) => day.day === dayName
    );

  /* =====================================================
     UPDATE SCHEDULE
     ===================================================== */

  const updateDay = (
    dayName: string,
    updater: (
      day: DaySchedule
    ) => DaySchedule
  ) => {
    setSchedule((current) =>
      current.map((day) =>
        day.day === dayName
          ? updater(day)
          : day
      )
    );

    setIsDirty(true);
    setMessage("");
  };

  /* =====================================================
     ADD SLOT
     ===================================================== */

  const addSlot = (
    dayName: string
  ) => {
    updateDay(
      dayName,
      (day) => ({
        ...day,
        enabled: true,

        slots: [
          ...day.slots,

          {
            id: `${dayName}-${Date.now()}`,

            start: "09:00 AM",

            end: "12:00 PM",

            branchId,

            shiftName:
              "Consulting",
          },
        ],
      })
    );
  };

  /* =====================================================
     DELETE SLOT
     ===================================================== */

  const deleteSlot = (
    dayName: string,
    slotId: string
  ) => {
    updateDay(
      dayName,
      (day) => ({
        ...day,

        slots: day.slots.filter(
          (slot) =>
            slot.id !== slotId
        ),
      })
    );
  };

  /* =====================================================
     CHANGE SLOT TIME
     ===================================================== */

  const changeSlotTime = (
    dayName: string,
    slotId: string,
    field: "start" | "end",
    value: string
  ) => {
    updateDay(
      dayName,
      (day) => ({
        ...day,

        slots: day.slots.map(
          (slot) =>
            slot.id === slotId
              ? {
                  ...slot,

                  [field]:
                    formatTime(
                      value
                    ),
                }
              : slot
        ),
      })
    );
  };

  /* =====================================================
     WEEK NAVIGATION
     ===================================================== */

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
    const current =
      new Date();

    setSelectedDate(current);

    setSelectedWeek(
      startOfWeek(current)
    );
  };

  /* =====================================================
     SAVE
     ===================================================== */

  const saveSchedule = async () => {
    if (!employeeId) {
      setError(
        "Doctor information is not loaded."
      );

      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const workingHours =
        schedule.flatMap(
          (day) => {
            if (
              !day.enabled
            ) {
              return [];
            }

            return day.slots
              .filter(
                (slot) =>
                  slot.start &&
                  slot.end
              )
              .map(
                (slot) => ({
                  branch_id:
                    slot.branchId ||
                    branchId,

                  day_of_week:
                    day.day.toUpperCase(),

                  shift_name:
                    slot.shiftName ||
                    "Consulting",

                  start_time:
                    toApiTime(
                      slot.start
                    ),

                  end_time:
                    toApiTime(
                      slot.end
                    ),
                })
              );
          }
        );

      if (
        workingHours.some(
          (slot) =>
            !slot.branch_id
        )
      ) {
        throw new Error(
          "A branch is required for every schedule slot."
        );
      }

      for (const slot of workingHours) {
        if (
          slot.start_time >=
          slot.end_time
        ) {
          throw new Error(
            `${slot.day_of_week}: end time must be later than start time.`
          );
        }
      }

      await API.put<UpdateEmployeeResponse>(
        `/employees/${employeeId}`,
        {
          working_hours:
            workingHours,
        }
      );

      await loadSchedule();

      setMessage(
        "Your schedule has been saved successfully."
      );
    } catch (err: any) {
      console.error(
        "Failed to save schedule:",
        err
      );

      setError(
        err?.response?.data
          ?.message ||
          err?.message ||
          "Unable to save your schedule."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     CLEAR / CANCEL
     ===================================================== */

  const cancelChanges = () => {
    void loadSchedule();

    setMessage("");
  };

  /* =====================================================
     CALENDAR
     ===================================================== */

  const calendarDays = useMemo(() => {
    const firstDay = new Date(
      selectedWeek.getFullYear(),
      selectedWeek.getMonth(),
      1
    );

    const day =
      firstDay.getDay();

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

  /* =====================================================
     RENDER
     ===================================================== */

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-gray-800 lg:p-8">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">

        {/* Hospital */}

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            Select Hospital
          </label>

          <div className="relative">
            <select
              value={branchId}
              onChange={(e) =>
                setBranchId(
                  e.target.value
                )
              }
              className="
                min-w-[280px]
                appearance-none
                rounded-md
                border
                border-gray-300
                bg-white
                py-2.5
                pl-4
                pr-10
                text-base
                text-gray-900
                outline-none
                focus:border-blue-500
                focus:ring-2
                focus:ring-blue-100
              "
            >
              <option value="">
                Select hospital
              </option>

              {/* 
                 Branches are not stored separately in state
                 here. The current backend branch remains selected.
              */}

              {branchId && (
                <option value={branchId}>
                  {branchName ||
                    "Assigned Hospital"}
                </option>
              )}
            </select>

            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <Icon>
                <path d="m6 9 6 6 6-6" />
              </Icon>
            </div>
          </div>
        </div>

        {/* View / Navigation */}

        <div className="flex items-center gap-4 rounded-full border border-gray-200 bg-white p-1.5 shadow-sm">

          <div className="flex rounded-full bg-gray-50 p-1">

            <button
              type="button"
              onClick={() =>
                setViewMode("day")
              }
              className={`
                rounded-full
                px-4
                py-1.5
                text-sm
                font-medium
                transition
                ${
                  viewMode === "day"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-gray-500 hover:bg-gray-100"
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
                rounded-full
                px-4
                py-1.5
                text-sm
                font-medium
                transition
                ${
                  viewMode === "week"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-500 hover:bg-gray-100"
                }
              `}
            >
              Week
            </button>
          </div>

          <div className="h-6 w-px bg-gray-300" />

          <div className="flex items-center gap-3 px-3">

            <button
              type="button"
              onClick={previousWeek}
              className="text-gray-400 hover:text-gray-700"
            >
              <Icon>
                <path d="m15 18-6-6 6-6" />
              </Icon>
            </button>

            <span className="min-w-[110px] text-center text-sm font-semibold text-gray-900">
              {formatMonthYear(
                selectedWeek
              )}
            </span>

            <button
              type="button"
              onClick={nextWeek}
              className="text-gray-400 hover:text-gray-700"
            >
              <Icon>
                <path d="m9 18 6-6-6-6" />
              </Icon>
            </button>

          </div>

        </div>
      </header>

      {/* =================================================
          ERROR / MESSAGE
      ================================================= */}

      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {/* =================================================
          LOADING
      ================================================= */}

      {loading ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-700" />

          <p className="text-sm text-gray-500">
            Loading your schedule...
          </p>
        </div>
      ) : (
        <main className="grid grid-cols-1 gap-6 xl:grid-cols-3">

          {/* =================================================
              MAIN CONTENT
          ================================================= */}

          <section className="flex flex-col gap-4 xl:col-span-2">

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">

              {/* Availability header */}

              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <h2 className="text-2xl font-bold text-gray-900">
                  Availability
                </h2>

                <div className="flex items-center gap-5">

                  <div className="flex items-center gap-4 text-sm font-medium text-gray-600">

                    <button
                      type="button"
                      onClick={previousWeek}
                      className="flex items-center gap-1 hover:text-gray-900"
                    >
                      <Icon className="h-4 w-4">
                        <path d="m15 18-6-6 6-6" />
                      </Icon>

                      Previous week
                    </button>

                    <button
                      type="button"
                      onClick={nextWeek}
                      className="flex items-center gap-1 hover:text-gray-900"
                    >
                      Next week

                      <Icon className="h-4 w-4">
                        <path d="m9 18 6-6-6-6" />
                      </Icon>
                    </button>

                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      addSlot(
                        selectedDayName
                      )
                    }
                    className="
                      flex
                      items-center
                      gap-2
                      rounded-md
                      bg-[#0b5394]
                      px-4
                      py-2
                      text-sm
                      font-medium
                      text-white
                      transition
                      hover:bg-blue-800
                    "
                  >
                    <Icon className="h-4 w-4">
                      <path d="M12 5v14" />
                      <path d="M5 12h14" />
                    </Icon>

                    Add slot
                  </button>

                </div>
              </div>

              {/* =================================================
                  WEEK VIEW
              ================================================= */}

              {viewMode === "week" && (
                <div className="overflow-hidden rounded-lg border border-gray-200">

                  {/* Header */}

                  <div className="grid grid-cols-7 divide-x divide-gray-200 bg-blue-50/50">

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

                        return (
                          <button
                            type="button"
                            key={dateKey(
                              date
                            )}
                            onClick={() => {
                              setSelectedDate(
                                date
                              );
                            }}
                            className={`
                              px-2
                              py-3
                              text-center
                              transition
                              ${
                                active
                                  ? "bg-blue-100"
                                  : "hover:bg-blue-50"
                              }
                            `}
                          >
                            <div
                              className={`
                                text-xs
                                font-semibold
                                ${
                                  todayDate
                                    ? "text-blue-700"
                                    : "text-[#0b5394]"
                                }
                              `}
                            >
                              {day}
                            </div>

                            <div className="mt-1 text-xs font-semibold text-[#0b5394]">
                              {formatWeekDate(
                                date
                              )}
                            </div>
                          </button>
                        );
                      }
                    )}

                  </div>

                  {/* Body */}

                  <div className="grid min-h-[420px] grid-cols-7 divide-x divide-gray-200">

                    {weekDays.map(
                      ({
                        day,
                        date,
                      }) => {
                        const daySchedule =
                          getDaySchedule(
                            day
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

                        return (
                          <div
                            key={dateKey(
                              date
                            )}
                            className={`
                              min-h-[420px]
                              p-2
                              ${
                                isToday
                                  ? "bg-blue-50/20"
                                  : ""
                              }
                              ${
                                isSelected
                                  ? "ring-1 ring-inset ring-blue-300"
                                  : ""
                              }
                            `}
                          >

                            {daySchedule?.enabled &&
                            daySchedule.slots.length >
                              0 ? (
                              <div className="flex flex-col gap-2">

                                {daySchedule.slots.map(
                                  (
                                    slot
                                  ) => (
                                    <SlotCard
                                      key={
                                        slot.id
                                      }
                                      slot={
                                        slot
                                      }
                                      compact
                                      highlighted={
                                        branchId ===
                                        slot.branchId
                                      }
                                      onChange={(
                                        field,
                                        value
                                      ) =>
                                        changeSlotTime(
                                          day,
                                          slot.id,
                                          field,
                                          value
                                        )
                                      }
                                      onDelete={() =>
                                        deleteSlot(
                                          day,
                                          slot.id
                                        )
                                      }
                                    />
                                  )
                                )}

                                <button
                                  type="button"
                                  onClick={() =>
                                    addSlot(
                                      day
                                    )
                                  }
                                  className="
                                    flex
                                    w-full
                                    items-center
                                    justify-center
                                    rounded
                                    border
                                    border-dashed
                                    border-gray-300
                                    py-2
                                    text-xs
                                    font-medium
                                    text-gray-400
                                    transition
                                    hover:border-blue-400
                                    hover:bg-blue-50
                                    hover:text-blue-600
                                  "
                                >
                                  + Add slot
                                </button>

                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  addSlot(
                                    day
                                  )
                                }
                                className="
                                  flex
                                  h-full
                                  min-h-[390px]
                                  w-full
                                  flex-col
                                  items-center
                                  justify-center
                                  rounded
                                  border
                                  border-dashed
                                  border-gray-300
                                  text-gray-400
                                  transition
                                  hover:bg-gray-50
                                "
                              >
                                <Icon className="mb-1 h-4 w-4">
                                  <path d="M12 5v14" />
                                  <path d="M5 12h14" />
                                </Icon>

                                <span className="text-[10px] font-medium text-gray-800">
                                  Week Off
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

              {viewMode === "day" && (
                <div className="space-y-3">

                  {DAYS.map(
                    (day) => {
                      const daySchedule =
                        getDaySchedule(
                          day
                        );

                      return (
                        <div
                          key={day}
                          className="
                            flex
                            flex-col
                            gap-3
                            rounded-lg
                            border
                            border-gray-100
                            p-4
                            md:flex-row
                            md:items-start
                          "
                        >

                          <div className="w-28 shrink-0">
                            <div className="font-semibold text-gray-800">
                              {day}
                            </div>

                            <div className="mt-1 text-xs text-gray-400">
                              {daySchedule
                                ?.enabled
                                ? "Available"
                                : "Week Off"}
                            </div>
                          </div>

                          <div className="flex flex-1 flex-wrap gap-3">

                            {daySchedule
                              ?.slots
                              .map(
                                (
                                  slot
                                ) => (
                                  <SlotCard
                                    key={
                                      slot.id
                                    }
                                    slot={
                                      slot
                                    }
                                    onChange={(
                                      field,
                                      value
                                    ) =>
                                      changeSlotTime(
                                        day,
                                        slot.id,
                                        field,
                                        value
                                      )
                                    }
                                    onDelete={() =>
                                      deleteSlot(
                                        day,
                                        slot.id
                                      )
                                    }
                                  />
                                )
                              )}

                            <button
                              type="button"
                              onClick={() =>
                                addSlot(
                                  day
                                )
                              }
                              className="
                                flex
                                min-h-[70px]
                                items-center
                                justify-center
                                rounded-lg
                                border
                                border-dashed
                                border-gray-300
                                px-5
                                text-sm
                                font-medium
                                text-gray-400
                                transition
                                hover:border-blue-400
                                hover:bg-blue-50
                                hover:text-blue-600
                              "
                            >
                              + Add slot
                            </button>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>
              )}

            </div>

            {/* =================================================
                ACTION FOOTER
            ================================================= */}

            <div className="flex justify-end gap-3 rounded-xl bg-gray-50 p-4">

              <button
                type="button"
                onClick={
                  cancelChanges
                }
                disabled={
                  !isDirty ||
                  saving
                }
                className="
                  rounded-md
                  px-5
                  py-2
                  text-sm
                  font-medium
                  text-gray-600
                  hover:text-gray-900
                  disabled:cursor-not-allowed
                  disabled:text-gray-300
                "
              >
                Clear
              </button>

              <button
                type="button"
                onClick={
                  saveSchedule
                }
                disabled={
                  !isDirty ||
                  saving
                }
                className="
                  rounded-md
                  bg-[#0b5394]
                  px-5
                  py-2
                  text-sm
                  font-medium
                  text-white
                  transition
                  hover:bg-blue-800
                  disabled:cursor-not-allowed
                  disabled:bg-gray-300
                "
              >
                {saving
                  ? "Saving..."
                  : "Save changes"}
              </button>

            </div>

          </section>

          {/* =================================================
              SIDEBAR CALENDAR
          ================================================= */}

          <aside>

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">

              <div className="p-6">

                {/* Calendar header */}

                <div className="mb-6 flex items-center justify-between px-2">

                  <button
                    type="button"
                    onClick={previousWeek}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Icon>
                      <path d="m15 18-6-6 6-6" />
                    </Icon>
                  </button>

                  <h3 className="text-lg font-bold text-gray-900">
                    {formatMonthYear(
                      selectedWeek
                    )}
                  </h3>

                  <button
                    type="button"
                    onClick={nextWeek}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Icon>
                      <path d="m9 18 6-6-6-6" />
                    </Icon>
                  </button>

                </div>

                {/* Weekday */}

                <div className="mb-4 grid grid-cols-7 gap-1 text-center">

                  {[
                    "SU",
                    "MO",
                    "TU",
                    "WE",
                    "TH",
                    "FR",
                    "SA",
                  ].map(
                    (day) => (
                      <div
                        key={day}
                        className="text-xs font-semibold text-gray-400"
                      >
                        {day}
                      </div>
                    )
                  )}

                </div>

                {/* Calendar */}

                <div className="grid grid-cols-7 gap-y-2 text-center text-sm">

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
                          onClick={() => {
                            setSelectedDate(
                              date
                            );

                            setSelectedWeek(
                              startOfWeek(
                                date
                              )
                            );
                          }}
                          className="flex h-9 items-center justify-center"
                        >
                          <span
                            className={`
                              flex
                              h-8
                              w-8
                              items-center
                              justify-center
                              rounded-full
                              text-xs
                              transition
                              ${
                                !inMonth
                                  ? "text-gray-300"
                                  : "text-gray-700"
                              }
                              ${
                                currentWeek
                                  ? "bg-blue-600 text-white"
                                  : ""
                              }
                              ${
                                selected &&
                                !currentWeek
                                  ? "bg-blue-100 text-blue-700"
                                  : ""
                              }
                              ${
                                todayDate &&
                                !currentWeek
                                  ? "font-bold text-blue-700"
                                  : ""
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

                {/* Selected date */}

                <div className="mt-6 border-t border-gray-100 pt-5">

                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Selected date
                  </div>

                  <div className="mt-1 text-sm font-semibold text-gray-800">
                    {selectedDate.toLocaleDateString(
                      "en-US",
                      {
                        weekday:
                          "long",
                        month:
                          "long",
                        day: "numeric",
                        year:
                          "numeric",
                      }
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={today}
                    className="mt-3 text-xs font-semibold text-blue-700 hover:underline"
                  >
                    Go to today
                  </button>

                </div>

              </div>

              {/* Bottom action */}

              <button
                type="button"
                onClick={() =>
                  setViewMode(
                    "day"
                  )
                }
                className="
                  block
                  w-full
                  border-t
                  border-gray-200
                  bg-gray-100/80
                  py-4
                  text-center
                  text-sm
                  font-medium
                  text-[#0b5394]
                  transition
                  hover:bg-gray-200
                "
              >
                Edit weekly schedule
              </button>

            </div>

          </aside>

        </main>
      )}

    </div>
  );
}