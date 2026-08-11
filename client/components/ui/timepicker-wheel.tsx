import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimepickerWheelProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const ITEM_HEIGHT = 34;
const WHEEL_HEIGHT = 132;
const WHEEL_PAD = (WHEEL_HEIGHT - ITEM_HEIGHT) / 2;

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const PERIODS = ["AM", "PM"];

type WheelKey = "hour" | "minute" | "period";

function to12h(value: string): { hour: string; minute: string; period: string } {
  if (!value || !value.includes(":")) return { hour: "12", minute: "00", period: "AM" };
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

interface WheelColumnProps {
  items: string[];
  activeIndex: number;
  period?: boolean;
  trackRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  onJump: (index: number) => void;
}

function WheelColumn({ items, activeIndex, period, trackRef, onScroll, onJump }: WheelColumnProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    if (!el) return;
    const current = Math.round(el.scrollTop / ITEM_HEIGHT);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      el.scrollTo({ top: Math.min(current + 1, items.length - 1) * ITEM_HEIGHT, behavior: "smooth" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      el.scrollTo({ top: Math.max(current - 1, 0) * ITEM_HEIGHT, behavior: "smooth" });
    }
  };

  return (
    <div
      ref={trackRef}
      onScroll={onScroll}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="listbox"
      aria-label={period ? "Period" : "Select"}
      className={cn(
        "h-[132px] shrink-0 snap-y snap-mandatory overflow-y-auto outline-none scroll-smooth",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        period ? "w-[54px]" : "w-[60px]"
      )}
      style={{ paddingTop: WHEEL_PAD, paddingBottom: WHEEL_PAD }}
    >
      {items.map((value, i) => (
        <div
          key={`${value}-${i}`}
          role="option"
          aria-selected={i === activeIndex}
          onClick={() => onJump(i)}
          tabIndex={-1}
          className={cn(
            "flex h-[34px] snap-center select-none items-center justify-center font-mono font-bold transition-all duration-150",
            period ? "text-[11px] tracking-[0.18em]" : "text-[17px]",
            i === activeIndex
              ? "scale-105 text-clinical-blue opacity-100 [text-shadow:0_0_12px_rgba(0,72,141,0.35)]"
              : "text-slate-400 opacity-40 hover:opacity-70"
          )}
        >
          {value}
        </div>
      ))}
    </div>
  );
}

export default function TimepickerWheel({
  value,
  onChange,
  disabled = false,
  placeholder = "Select time",
  className = "",
}: TimepickerWheelProps) {
  const initial = to12h(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const periodRef = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [tempHour, setTempHour] = useState(initial.hour);
  const [tempMinute, setTempMinute] = useState(initial.minute);
  const [tempPeriod, setTempPeriod] = useState(initial.period);
  const [active, setActive] = useState<Record<WheelKey, number>>({
    hour: Math.max(HOURS.indexOf(initial.hour), 0),
    minute: Math.max(MINUTES.indexOf(initial.minute), 0),
    period: Math.max(PERIODS.indexOf(initial.period), 0),
  });

  const displayText = value
    ? (() => {
        const d = to12h(value);
        return `${d.hour}:${d.minute} ${d.period}`;
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
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = Math.max(HOURS.indexOf(tempHour), 0);
    const m = Math.max(MINUTES.indexOf(tempMinute), 0);
    const p = Math.max(PERIODS.indexOf(tempPeriod), 0);
    if (hourRef.current) hourRef.current.scrollTop = h * ITEM_HEIGHT;
    if (minuteRef.current) minuteRef.current.scrollTop = m * ITEM_HEIGHT;
    if (periodRef.current) periodRef.current.scrollTop = p * ITEM_HEIGHT;
    setActive({ hour: h, minute: m, period: p });
  }, [open]);

  const itemsFor = (key: WheelKey): string[] =>
    key === "hour" ? HOURS : key === "minute" ? MINUTES : PERIODS;

  const indexOf = (key: WheelKey): number => {
    const el = key === "hour" ? hourRef.current : key === "minute" ? minuteRef.current : periodRef.current;
    if (!el) return 0;
    return Math.min(Math.max(Math.round(el.scrollTop / ITEM_HEIGHT), 0), itemsFor(key).length - 1);
  };

  const commit = () => {
    onChange(to24h(HOURS[indexOf("hour")], MINUTES[indexOf("minute")], PERIODS[indexOf("period")]));
  };

  const handleScroll = (key: WheelKey) => () => {
    setActive((prev) => ({ ...prev, [key]: indexOf(key) }));
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(commit, 120);
  };

  const handleJump = (key: WheelKey) => (index: number) => {
    const el = key === "hour" ? hourRef.current : key === "minute" ? minuteRef.current : periodRef.current;
    if (!el) return;
    el.scrollTo({ top: index * ITEM_HEIGHT, behavior: "smooth" });
    setActive((prev) => ({ ...prev, [key]: index }));
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-lg border bg-white px-3 transition-all duration-200",
          "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400",
          open
            ? "border-clinical-blue ring-2 ring-clinical-blue/15"
            : "border-[#E2E8F0] hover:border-clinical-blue-mid",
          className
        )}
      >
        <div className="flex flex-1 items-center gap-2 overflow-hidden">
          <Clock className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
          <span className="truncate text-xs font-medium text-clinical-body">
            {displayText || <span className="font-normal text-slate-400">{placeholder}</span>}
          </span>
        </div>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 min-w-[220px] rounded-lg border border-[#E2E8F0] bg-white p-2.5 shadow-[0_8px_30px_-8px_rgba(15,23,42,0.22)]">
          <div className="relative flex items-stretch justify-center gap-1.5">
            <div className="pointer-events-none absolute inset-x-2.5 top-1/2 h-[34px] -translate-y-1/2 rounded-md border-y border-clinical-blue/30 bg-gradient-to-b from-clinical-blue/[0.08] to-clinical-blue/[0.02]" />

            <WheelColumn
              items={HOURS}
              activeIndex={active.hour}
              onScroll={handleScroll("hour")}
              onJump={handleJump("hour")}
              trackRef={hourRef}
            />

            <span className="self-center font-mono text-base font-bold text-clinical-blue-mid/60 select-none">:</span>

            <WheelColumn
              items={MINUTES}
              activeIndex={active.minute}
              onScroll={handleScroll("minute")}
              onJump={handleJump("minute")}
              trackRef={minuteRef}
            />

            <div className="my-1 w-px bg-[#E2E8F0]" />

            <WheelColumn
              items={PERIODS}
              period
              activeIndex={active.period}
              onScroll={handleScroll("period")}
              onJump={handleJump("period")}
              trackRef={periodRef}
            />
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-[#F1F5F9] pt-2">
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Selected
            </span>
            <span className="font-mono text-xs font-bold text-clinical-blue">
              {tempHour}:{tempMinute} {tempPeriod}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}