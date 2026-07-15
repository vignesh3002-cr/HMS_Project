import * as React from "react";

export interface TimeSelect12hProps {
  value: string; // 24-hr "HH:MM", e.g. "09:00"
  onChange: (value: string) => void;
  disabled?: boolean;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,10,...,55

function parse24Hour(value: string) {
  const [h, m] = value.split(":").map(Number);
  const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  let hour12 = h % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute: m || 0, period };
}

function to24Hour(hour12: number, minute: number, period: "AM" | "PM") {
  let hour = hour12 % 12;
  if (period === "PM") hour += 12;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

// Native <input type="time"> renders in whatever clock format the browser/OS
// locale dictates, so a 12-hour AM/PM display can't be guaranteed that way —
// this composes the same "HH:MM" 24-hr value from three explicit selects instead.
export function TimeSelect12h({ value, onChange, disabled }: TimeSelect12hProps) {
  const { hour12, minute, period } = parse24Hour(value);

  const selectClass =
    "rounded-lg border border-gray-200 bg-white px-1.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed";

  const emit = (h: number, m: number, p: "AM" | "PM") => onChange(to24Hour(h, m, p));

  return (
    <div className="flex items-center gap-1">
      <select
        value={hour12}
        disabled={disabled}
        onChange={(e) => emit(Number(e.target.value), minute, period)}
        className={selectClass}
      >
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="text-gray-400">:</span>
      <select
        value={minute}
        disabled={disabled}
        onChange={(e) => emit(hour12, Number(e.target.value), period)}
        className={selectClass}
      >
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {String(m).padStart(2, "0")}
          </option>
        ))}
      </select>
      <select
        value={period}
        disabled={disabled}
        onChange={(e) => emit(hour12, minute, e.target.value as "AM" | "PM")}
        className={selectClass}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}
