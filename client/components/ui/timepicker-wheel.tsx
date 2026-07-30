import { useState, useRef, useEffect, useCallback } from "react";
import { Clock } from "lucide-react";

interface TimepickerWheelProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

function to12h(
  value: string,
): { hour: string; minute: string; period: string } {
  if (!value || !value.includes(":"))
    return { hour: "12", minute: "00", period: "AM" };
  const [h, m] = value.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return {
    hour: String(hour12).padStart(2, "0"),
    minute: String(m).padStart(2, "0"),
    period,
  };
}

function to24h(hour: string, minute: string, period: string): string {
  let h = parseInt(hour, 10);
  if (period === "AM" && h === 12) h = 0;
  if (period === "PM" && h !== 12) h += 12;
  return `${String(h).padStart(2, "0")}:${minute}`;
}

const HOURS = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, "0"),
);

const MINUTES = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, "0"),
);

const PERIODS = ["AM", "PM"];

export default function TimepickerWheel({
  value,
  onChange,
  disabled = false,
  placeholder = "Select time",
  className = "",
}: TimepickerWheelProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const init = to12h(value);
  const [tempHour, setTempHour] = useState(init.hour);
  const [tempMinute, setTempMinute] = useState(init.minute);
  const [tempPeriod, setTempPeriod] = useState(init.period);

  const displayText = value
    ? (() => {
        const d = to12h(value);
        return `${d.hour} : ${d.minute} ${d.period}`;
      })()
    : "";

  useEffect(() => {
    if (!value) return;
    const d = to12h(value);
    setTempHour(d.hour);
    setTempMinute(d.minute);
    setTempPeriod(d.period);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleOptionClick = useCallback(
    (key: "hour" | "minute" | "period", val: string) => {
      const newHour = key === "hour" ? val : tempHour;
      const newMinute = key === "minute" ? val : tempMinute;
      const newPeriod = key === "period" ? val : tempPeriod;
      if (key === "hour") setTempHour(val);
      if (key === "minute") setTempMinute(val);
      if (key === "period") setTempPeriod(val);
      onChange(to24h(newHour, newMinute, newPeriod));
    },
    [tempHour, tempMinute, tempPeriod, onChange],
  );

  const selectedHour = to12h(value).hour;

  return (
    <div ref={containerRef} className="relative w-full" style={{ zIndex: open ? 50 : "auto" }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center w-full h-10 px-4 bg-white border rounded-xl cursor-pointer transition-all duration-200 box-border disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed ${
          open
            ? "border-blue-500 ring-[3px] ring-blue-500/15"
            : "border-gray-200 hover:border-gray-300"
        } ${className}`}
      >
        <Clock className="h-4 w-4 mr-3 flex-shrink-0 text-gray-400" />
        <span className="flex-1 text-left text-[13.5px] font-medium text-gray-900">
          {displayText || (
            <span className="text-gray-400 font-normal">{placeholder}</span>
          )}
        </span>
        <svg
          className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div
        className={`absolute top-full left-0 right-0 mt-2 bg-white border border-[#e5e7eb] rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.05)] flex p-2 gap-1 z-50 transition-all duration-200 origin-top ${
          open
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
        }`}
      >
        {/* Hours column */}
        <div className="flex-1 h-[220px] overflow-y-auto hide-scrollbar text-center border-r border-[#f3f4f6] px-1">
          {HOURS.map((h) => (
            <div
              key={h}
              onClick={() => handleOptionClick("hour", h)}
              className={`px-0 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors duration-150 my-0.5 ${
                h === selectedHour
                  ? "bg-[#004ac6] text-white"
                  : "text-[#4b5563] hover:bg-[#f3f4f6] hover:text-[#111827]"
              }`}
            >
              {h}
            </div>
          ))}
        </div>

        {/* Minutes column */}
        <div className="flex-1 h-[220px] overflow-y-auto hide-scrollbar text-center border-r border-[#f3f4f6] px-1">
          {MINUTES.map((m) => (
            <div
              key={m}
              onClick={() => handleOptionClick("minute", m)}
              className={`px-0 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors duration-150 my-0.5 ${
                m === tempMinute
                  ? "bg-[#004ac6] text-white"
                  : "text-[#4b5563] hover:bg-[#f3f4f6] hover:text-[#111827]"
              }`}
            >
              {m}
            </div>
          ))}
        </div>

        {/* Period column — only 2 options, so it sizes to content instead of stretching to the other columns' 220px */}
        <div className="flex-1 self-start text-center px-1">
          {PERIODS.map((p) => (
            <div
              key={p}
              onClick={() => handleOptionClick("period", p)}
              className={`px-0 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors duration-150 my-0.5 ${
                p === tempPeriod
                  ? "bg-[#004ac6] text-white"
                  : "text-[#4b5563] hover:bg-[#f3f4f6] hover:text-[#111827]"
              }`}
            >
              {p}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
