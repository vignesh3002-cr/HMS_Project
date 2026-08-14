import { useState } from "react";

interface TimeSlot {
  id: string;
  start: string;
  end: string;
}

interface DaySchedule {
  day: string;
  enabled: boolean;
  onLeave: boolean;
  slots: TimeSlot[];
}

const HOSPITALS = [
  "City Hospital",
  "Apollo Hospital",
  "Global Hospital",
];

const INITIAL_SCHEDULE: DaySchedule[] = [
  {
    day: "Monday",
    enabled: true,
    onLeave: false,
    slots: [
      {
        id: "monday-1",
        start: "09:00 AM",
        end: "01:00 PM",
      },
      {
        id: "monday-2",
        start: "02:00 PM",
        end: "05:00 PM",
      },
    ],
  },
  {
    day: "Tuesday",
    enabled: true,
    onLeave: false,
    slots: [
      {
        id: "tuesday-1",
        start: "09:00 AM",
        end: "01:00 PM",
      },
    ],
  },
  {
    day: "Wednesday",
    enabled: true,
    onLeave: false,
    slots: [
      {
        id: "wednesday-1",
        start: "09:00 AM",
        end: "01:00 PM",
      },
      {
        id: "wednesday-2",
        start: "02:00 PM",
        end: "05:00 PM",
      },
    ],
  },
  {
    day: "Thursday",
    enabled: true,
    onLeave: false,
    slots: [
      {
        id: "thursday-1",
        start: "09:00 AM",
        end: "01:00 PM",
      },
    ],
  },
  {
    day: "Friday",
    enabled: true,
    onLeave: false,
    slots: [
      {
        id: "friday-1",
        start: "09:00 AM",
        end: "01:00 PM",
      },
      {
        id: "friday-2",
        start: "02:00 PM",
        end: "05:00 PM",
      },
    ],
  },
  {
    day: "Saturday",
    enabled: false,
    onLeave: false,
    slots: [
      {
        id: "saturday-1",
        start: "09:00 AM",
        end: "01:00 PM",
      },
    ],
  },
  {
    day: "Sunday",
    enabled: false,
    onLeave: false,
    slots: [],
  },
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const TRACK_WIDTH = 44;
const TRACK_HEIGHT = 24;
const KNOB_SIZE = 18;
const KNOB_INSET = 3;

interface ScheduleViewToggleProps {
  view: "day" | "week";
  onViewChange: (view: "day" | "week") => void;
  monthLabel: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

function ScheduleViewToggle({
  view,
  onViewChange,
  monthLabel,
  onPrevMonth,
  onNextMonth,
}: ScheduleViewToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 text-sm">
      <button
        type="button"
        onClick={() => onViewChange("day")}
        className={`px-3 py-1.5 rounded-md font-medium ${
          view === "day"
            ? "bg-blue-50 text-blue-700"
            : "text-gray-500"
        }`}
      >
        Day
      </button>

      <button
        type="button"
        onClick={() => onViewChange("week")}
        className={`px-3 py-1.5 rounded-md font-medium ${
          view === "week"
            ? "bg-blue-50 text-blue-700"
            : "text-gray-500"
        }`}
      >
        Week
      </button>

      <span className="w-px h-5 bg-gray-200 mx-1" />

      <button
        type="button"
        onClick={onPrevMonth}
        aria-label="Previous month"
        className="px-2 text-gray-400 hover:text-gray-600"
      >
        ‹
      </button>

      <span className="px-1 font-semibold text-gray-800 whitespace-nowrap">
        {monthLabel}
      </span>

      <button
        type="button"
        onClick={onNextMonth}
        aria-label="Next month"
        className="px-2 text-gray-400 hover:text-gray-600"
      >
        ›
      </button>
    </div>
  );
}

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: ToggleSwitchProps) {
  const knobOffset = checked
    ? TRACK_WIDTH - KNOB_SIZE - KNOB_INSET
    : KNOB_INSET;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        width: TRACK_WIDTH,
        height: TRACK_HEIGHT,
      }}
      className={`relative shrink-0 rounded-full transition-colors duration-200 ${
        checked ? "bg-blue-800" : "bg-gray-200"
      }`}
    >
      <span
        style={{
          width: KNOB_SIZE,
          height: KNOB_SIZE,
          transform: `translateX(${knobOffset}px)`,
          top: (TRACK_HEIGHT - KNOB_SIZE) / 2,
        }}
        className="absolute left-0 rounded-full bg-white shadow-md transition-transform duration-200"
      />
    </button>
  );
}

interface TimeSlotChipProps {
  slot: TimeSlot;
  onRemove: () => void;
  disabled?: boolean;
}

function TimeSlotChip({
  slot,
  onRemove,
  disabled,
}: TimeSlotChipProps) {
  return (
    <span
      className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-sm ${
        disabled
          ? "border-gray-100 text-gray-300 bg-gray-50"
          : "border-gray-200 text-gray-700"
      }`}
    >
      <svg
        className="w-4 h-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>

      {slot.start} - {slot.end}

      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label="Remove slot"
        className="text-gray-400 hover:text-red-500 disabled:hover:text-gray-400"
      >
        ✕
      </button>
    </span>
  );
}

interface DayScheduleRowProps {
  schedule: DaySchedule;
  onToggleDay: (enabled: boolean) => void;
  onAddSlot: () => void;
  onRemoveSlot: (slotId: string) => void;
}

function DayScheduleRow({
  schedule,
  onToggleDay,
  onAddSlot,
  onRemoveSlot,
}: DayScheduleRowProps) {
  const { day, enabled, onLeave, slots } = schedule;

  return (
    <div className="flex items-center flex-wrap gap-3 py-4 border-b border-gray-50 last:border-0">
      <span className="w-24 font-medium text-gray-800 shrink-0">
        {day}
      </span>

      <ToggleSwitch
        checked={enabled}
        onChange={onToggleDay}
        label={`Toggle ${day} availability`}
      />

      {onLeave && !enabled ? (
        <span className="text-xs font-semibold text-red-500 bg-red-50 px-3 py-1.5 rounded-full">
          ON LEAVE
        </span>
      ) : (
        slots.map((slot) => (
          <TimeSlotChip
            key={slot.id}
            slot={slot}
            onRemove={() => onRemoveSlot(slot.id)}
            disabled={!enabled}
          />
        ))
      )}

      <button
        type="button"
        onClick={onAddSlot}
        disabled={!enabled}
        className="text-sm font-medium text-blue-700 hover:underline disabled:text-gray-300 disabled:no-underline flex items-center gap-1"
      >
        + Add Slot
      </button>
    </div>
  );
}

export default function MySchedulePage() {
  const [hospital, setHospital] = useState(HOSPITALS[0]);

  const [schedule, setSchedule] =
    useState<DaySchedule[]>(INITIAL_SCHEDULE);

  const [view, setView] =
    useState<"day" | "week">("week");

  const [monthIndex, setMonthIndex] = useState(4);

  const [year, setYear] = useState(2026);

  const [isDirty, setIsDirty] = useState(false);

  const monthLabel = `${MONTHS[monthIndex]} ${year}`;

  const goToPrevMonth = () => {
    if (monthIndex === 0) {
      setMonthIndex(11);
      setYear((y) => y - 1);
    } else {
      setMonthIndex((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (monthIndex === 11) {
      setMonthIndex(0);
      setYear((y) => y + 1);
    } else {
      setMonthIndex((m) => m + 1);
    }
  };

  const updateDay = (
    dayName: string,
    updater: (day: DaySchedule) => DaySchedule
  ) => {
    setSchedule((prev) =>
      prev.map((day) =>
        day.day === dayName
          ? updater(day)
          : day
      )
    );

    setIsDirty(true);
  };

  const handleToggleDay = (
    dayName: string,
    enabled: boolean
  ) => {
    updateDay(dayName, (day) => ({
      ...day,
      enabled,
      onLeave: enabled ? false : day.onLeave,
    }));
  };

  const handleAddSlot = (dayName: string) => {
    updateDay(dayName, (day) => ({
      ...day,
      slots: [
        ...day.slots,
        {
          id: `${dayName.toLowerCase()}-${Date.now()}`,
          start: "09:00 AM",
          end: "01:00 PM",
        },
      ],
    }));
  };

  const handleRemoveSlot = (
    dayName: string,
    slotId: string
  ) => {
    updateDay(dayName, (day) => ({
      ...day,
      slots: day.slots.filter(
        (slot) => slot.id !== slotId
      ),
    }));
  };

  const handleCancel = () => {
    setSchedule(
      INITIAL_SCHEDULE.map((day) => ({
        ...day,
        slots: [...day.slots],
      }))
    );

    setIsDirty(false);
  };

  const handleSave = () => {
    console.log("Saving schedule:", {
      hospital,
      schedule,
    });

    setIsDirty(false);
  };

  return (
    <div className="space-y-6">

      {/* PAGE HEADER */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Manage Availability
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Configure your weekly consulting hours across
            locations.
          </p>
        </div>

        <div className="flex items-center gap-4">

          {/* Notification */}
          <button
            type="button"
            aria-label="Notifications"
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

            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
          </button>

          {/* Date */}
          <span className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2">
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

            May 30, 2026
          </span>
        </div>
      </div>

      {/* MAIN CARD */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">

        {/* TOP CONTROLS */}
        <div className="flex items-start justify-between flex-wrap gap-4">

          <div>
            <label className="text-xs font-semibold tracking-wide text-gray-400 mb-2 block">
              SELECT HOSPITAL
            </label>

            <select
              value={hospital}
              onChange={(e) =>
                setHospital(e.target.value)
              }
              className="w-72 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-100"
            >
              {HOSPITALS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          <ScheduleViewToggle
            view={view}
            onViewChange={setView}
            monthLabel={monthLabel}
            onPrevMonth={goToPrevMonth}
            onNextMonth={goToNextMonth}
          />
        </div>

        {/* SCHEDULE */}
        <div>
          {schedule.map((day) => (
            <DayScheduleRow
              key={day.day}
              schedule={day}
              onToggleDay={(enabled) =>
                handleToggleDay(
                  day.day,
                  enabled
                )
              }
              onAddSlot={() =>
                handleAddSlot(day.day)
              }
              onRemoveSlot={(slotId) =>
                handleRemoveSlot(
                  day.day,
                  slotId
                )
              }
            />
          ))}
        </div>

        {/* BUTTONS */}
        <div className="flex justify-end gap-3 pt-2">

          <button
            type="button"
            onClick={handleCancel}
            disabled={!isDirty}
            className="px-5 py-2.5 text-sm font-semibold text-blue-700 hover:underline disabled:text-gray-300 disabled:no-underline"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty}
            className="px-5 py-2.5 rounded-lg bg-blue-900 text-white text-sm font-semibold hover:bg-blue-800 disabled:bg-gray-200 disabled:text-gray-400"
          >
            Save changes
          </button>

        </div>
      </div>
    </div>
  );
}