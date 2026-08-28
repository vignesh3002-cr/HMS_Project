import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Sun, Moon, Leaf, Wind, Palette, Star, CalendarOff, RotateCw, X } from "lucide-react";

/**
 * Themeable Calendar
 * ---------------------------------------------------------
 * Drop this component anywhere. Switch themes with the pills
 * in the header, or control it externally by passing `theme`.
 *
 * To add your own preset theme: add an entry to THEMES below with
 * the same keys as any existing theme. Every color in the component
 * is read from CSS variables, so a new theme is a drop-in swap.
 *
 * There's also a "Custom" pill (paint palette icon) that lets the
 * person pick their own background, accent, and text color live —
 * the rest of the palette (borders, hover states, muted text) is
 * derived automatically with color-mix() so it still looks cohesive.
 */

type ThemeName = "light" | "dark" | "forest" | "breeze" | "custom";

interface Theme {
  label: string;
  icon: React.ComponentType<{ size?: number | string }>;
  vars: Record<string, string>;
}

const THEMES: Record<ThemeName, Theme> = {
  light: {
    label: "Light",
    icon: Sun,
    vars: {
      "--cal-bg": "#ffffff",
      "--cal-surface": "#f8f9fb",
      "--cal-border": "#e5e7eb",
      "--cal-text": "#111827",
      "--cal-text-muted": "#6B7280",
      "--cal-accent": "#00488D",
      "--cal-accent-text": "#ffffff",
      "--cal-today-ring": "#00488D",
      "--cal-hover": "#D6E3FF",
      "--cal-range-bg": "rgba(0, 72, 141, 0.1)",
      "--cal-range-border": "#00488D",
      "--cal-shadow": "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)",
    },
  },
  dark: {
    label: "Dark",
    icon: Moon,
    vars: {
      "--cal-bg": "#17181c",
      "--cal-surface": "#1f2025",
      "--cal-border": "#2c2d33",
      "--cal-text": "#f3f4f6",
      "--cal-text-muted": "#6b7280",
      "--cal-accent": "#818cf8",
      "--cal-accent-text": "#0b0b0d",
      "--cal-today-ring": "#818cf8",
      "--cal-hover": "#26262e",
      "--cal-range-bg": "rgba(129, 140, 248, 0.2)",
      "--cal-range-border": "#818cf8",
      "--cal-shadow": "0 1px 2px rgba(0,0,0,0.3), 0 12px 28px rgba(0,0,0,0.45)",
    },
  },
  forest: {
    label: "Forest",
    icon: Leaf,
    vars: {
      "--cal-bg": "#f4f7f1",
      "--cal-surface": "#eaf0e4",
      "--cal-border": "#d3ddc9",
      "--cal-text": "#26331e",
      "--cal-text-muted": "#7c8c70",
      "--cal-accent": "#3f6212",
      "--cal-accent-text": "#f4f7f1",
      "--cal-today-ring": "#65a30d",
      "--cal-hover": "#dde8d3",
      "--cal-range-bg": "rgba(63, 98, 18, 0.15)",
      "--cal-range-border": "#3f6212",
      "--cal-shadow": "0 1px 2px rgba(38,51,30,0.06), 0 10px 24px rgba(38,51,30,0.10)",
    },
  },
  breeze: {
    label: "Breeze",
    icon: Wind,
    vars: {
      "--cal-bg": "#f2f9fb",
      "--cal-surface": "#e7f3f7",
      "--cal-border": "#cfe6ec",
      "--cal-text": "#1e3a45",
      "--cal-text-muted": "#7fa3ae",
      "--cal-accent": "#0ea5b7",
      "--cal-accent-text": "#f2f9fb",
      "--cal-today-ring": "#0ea5b7",
      "--cal-hover": "#dcf0f4",
      "--cal-range-bg": "rgba(14, 165, 183, 0.15)",
      "--cal-range-border": "#0ea5b7",
      "--cal-shadow": "0 1px 2px rgba(14,110,125,0.05), 0 10px 24px rgba(14,110,125,0.10)",
    },
  },
  custom: {
    label: "Custom",
    icon: Palette,
    vars: {
      "--cal-bg": "#fdf6ec",
      "--cal-surface": "#fef7ed",
      "--cal-border": "#f3d8c4",
      "--cal-text": "#2b2118",
      "--cal-text-muted": "#8a6f57",
      "--cal-accent": "#e0703f",
      "--cal-accent-text": "#ffffff",
      "--cal-today-ring": "#e0703f",
      "--cal-hover": "#fde7d8",
      "--cal-range-bg": "rgba(224, 112, 63, 0.15)",
      "--cal-range-border": "#e0703f",
      "--cal-shadow": "0 1px 2px rgba(0,0,0,0.05), 0 10px 24px rgba(0,0,0,0.08)",
    },
  },
};

/** Pick a readable foreground (near-black or near-white) for a given hex background. */
function contrastFor(hex: string): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const r = parseInt(full.substring(0, 2), 16) || 0;
  const g = parseInt(full.substring(2, 4), 16) || 0;
  const b = parseInt(full.substring(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111827" : "#ffffff";
}

/** Build a full theme palette from just three user-picked colors. */
function buildCustomVars(bg: string, accent: string, text: string): Record<string, string> {
  return {
    "--cal-bg": bg,
    "--cal-surface": `color-mix(in srgb, ${bg}, ${text} 5%)`,
    "--cal-border": `color-mix(in srgb, ${bg}, ${text} 15%)`,
    "--cal-text": text,
    "--cal-text-muted": `color-mix(in srgb, ${text}, ${bg} 45%)`,
    "--cal-accent": accent,
    "--cal-accent-text": contrastFor(accent),
    "--cal-today-ring": accent,
    "--cal-hover": `color-mix(in srgb, ${bg}, ${accent} 14%)`,
    "--cal-range-bg": `color-mix(in srgb, ${bg}, ${accent} 12%)`,
    "--cal-range-border": accent,
    "--cal-shadow": "0 1px 2px rgba(0,0,0,0.05), 0 10px 24px rgba(0,0,0,0.08)",
  };
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface CustomColors {
  bg: string;
  accent: string;
  text: string;
}

const DEFAULT_CUSTOM: CustomColors = { bg: "#fdf6ec", accent: "#e0703f", text: "#2b2118" };

export type DateRange = { from: Date; to: Date };

interface CalendarProps {
  /** Controlled theme. If omitted, the calendar manages its own theme with the picker. */
  theme?: ThemeName;
  /** Selection mode: "single" (default) | "range" | "multi" | "week" */
  mode?: "single" | "range" | "multi" | "week";
  /** Controlled selected date(s). Single mode: Date | null. Range mode: DateRange | null. Multi mode: Date[]. Week mode: Date (week start Monday). */
  selected?: Date | DateRange | Date[] | null;
  /** Called when the user picks a date or range. */
  onSelect?: (date: Date | DateRange | null) => void;
  /** Called when multi-select dates change. */
  onDatesChange?: (dates: Date[]) => void;
  /** Called when week changes via prev/next week buttons. */
  onWeekChange?: (weekStart: Date) => void;
  /** Hide the built-in theme picker (useful if you control theme externally). */
  hideThemePicker?: boolean;
  /** Starting colors for the "Custom" theme (background, accent, text). */
  defaultCustomColors?: CustomColors;
  /** Earliest year selectable in the year dropdown. Defaults to 80 years before the current year. */
  minYear?: number;
  /** Latest year selectable in the year dropdown. Defaults to 10 years after the current year. */
  maxYear?: number;
  /** Earliest date users may pick (dates before it are disabled). */
  minDate?: Date;
  /** Latest date users may pick (dates after it are disabled). */
  maxDate?: Date;
  /** Extra per-date disablement (e.g. non-working days). Disabled dates are greyed out and unselectable. */
  isDateDisabled?: (date: Date) => boolean;
  /** Current week start date (Monday) for week-based navigation. */
  weekStart?: Date;
  /** Enable week navigation mode (shows week label, prev/next week buttons). */
  weekMode?: boolean;
  /** Additional dates to highlight (e.g., for multi-select display in week mode). */
  highlightDates?: Date[];
}

export default function Calendar({
  theme,
  mode = "single",
  selected: controlledSelected,
  onSelect,
  onDatesChange,
  onWeekChange,
  hideThemePicker,
  defaultCustomColors,
  minYear,
  maxYear,
  minDate,
  maxDate,
  isDateDisabled,
  weekStart: controlledWeekStart,
  weekMode = false,
  highlightDates,
}: CalendarProps) {
  const [internalTheme, setInternalTheme] = useState<ThemeName>("light");
  const [customColors, setCustomColors] = useState<CustomColors>(
    defaultCustomColors ?? DEFAULT_CUSTOM
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const activeTheme = theme ?? internalTheme;
  const themeVars =
    activeTheme === "custom"
      ? buildCustomVars(customColors.bg, customColors.accent, customColors.text)
      : THEMES[activeTheme].vars;

  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Internal selection state - supports both single date and range
  const [internalSelected, setInternalSelected] = useState<Date | DateRange | Date[] | null>(null);
  const selected = controlledSelected ?? internalSelected;

  // Multi-select state
  const [internalMultiSelected, setInternalMultiSelected] = useState<Date[]>([]);
  const multiSelected = Array.isArray(controlledSelected) ? controlledSelected : internalMultiSelected;

  // Week navigation state
  const [internalWeekStart, setInternalWeekStart] = useState<Date>(() => {
    if (controlledWeekStart) return controlledWeekStart;
    const now = new Date();
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    return monday;
  });
  const weekStart = controlledWeekStart ?? internalWeekStart;

  // Range selection state
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const days = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: { date: Date; inMonth: boolean }[] = [];

    for (let i = startOffset - 1; i >= 0; i--) {
      cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(year, month, d), inMonth: true });
    }
    while (cells.length % 7 !== 0 || cells.length < 42) {
      const last = cells[cells.length - 1].date;
      cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
    }
    return cells;
  }, [cursor]);

  const goToMonth = (delta: number) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  const currentYear = today.getFullYear();
  const yearOptions = useMemo(() => {
    const start = minYear ?? currentYear - 80;
    const end = maxYear ?? currentYear + 10;
    const years: number[] = [];
    for (let y = start; y <= end; y++) years.push(y);
    return years;
  }, [minYear, maxYear, currentYear]);

  const handleMonthChange = (monthIndex: number) =>
    setCursor((c) => new Date(c.getFullYear(), monthIndex, 1));

  const handleYearChange = (year: number) =>
    setCursor((c) => new Date(year, c.getMonth(), 1));

  // Week navigation functions
  const goToWeek = useCallback((delta: number) => {
    setCursor((c) => {
      const newCursor = new Date(c.getFullYear(), c.getMonth(), c.getDate() + delta * 7);
      // Set to Monday of that week
      const day = newCursor.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const monday = new Date(newCursor);
      monday.setDate(newCursor.getDate() + mondayOffset);
      setInternalWeekStart(monday);
      onWeekChange?.(monday);
      return monday;
    });
  }, [onWeekChange]);

  const getWeekLabel = (weekStartDate: Date): string => {
    const endDate = new Date(weekStartDate);
    endDate.setDate(weekStartDate.getDate() + 6);
    const startStr = weekStartDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const endStr = endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} – ${endStr}`;
  };

  const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const isDisabled = (date: Date) =>
    (minDate && dayStart(date) < dayStart(minDate)) ||
    (maxDate && dayStart(date) > dayStart(maxDate)) ||
    (isDateDisabled ? isDateDisabled(date) : false);

  // Range helpers
  const getRange = (start: Date, end: Date): DateRange => ({
    from: start < end ? start : end,
    to: start > end ? start : end,
  });

  const isInRange = (date: Date): boolean => {
    if (mode !== "range") return false;
    if (!rangeStart || !hoverDate) return false;
    const { from, to } = getRange(rangeStart, hoverDate);
    return dayStart(date) >= dayStart(from) && dayStart(date) <= dayStart(to);
  };

  const isRangeStart = (date: Date): boolean => {
    if (mode !== "range") return false;
    if (!rangeStart || !hoverDate) return false;
    const { from } = getRange(rangeStart, hoverDate);
    return isSameDay(date, from);
  };

  const isRangeEnd = (date: Date): boolean => {
    if (mode !== "range") return false;
    if (!rangeStart || !hoverDate) return false;
    const { to } = getRange(rangeStart, hoverDate);
    return isSameDay(date, to);
  };

  const isSelectedSingle = (date: Date): boolean => {
    if (mode !== "single") return false;
    return selected && isSameDay(date, selected as Date);
  };

  const isSelectedRange = (date: Date): boolean => {
    if (mode !== "range") return false;
    if (!selected || typeof selected === "object" && "from" in selected === false) return false;
    const range = selected as DateRange;
    return dayStart(date) >= dayStart(range.from) && dayStart(date) <= dayStart(range.to);
  };

  const isSelectedMulti = (date: Date): boolean => {
    if (mode !== "multi") return false;
    return multiSelected.some((d) => isSameDay(date, d));
  };

  const isWeekSelected = (date: Date): boolean => {
    if (mode !== "week") return false;
    const weekStartDate = weekStart;
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);
    return dayStart(date) >= dayStart(weekStartDate) && dayStart(date) <= dayStart(weekEndDate);
  };

  const isHighlighted = (date: Date): boolean => {
    if (!highlightDates || highlightDates.length === 0) return false;
    return highlightDates.some((d) => isSameDay(date, d));
  };

  // Handle mouse events for drag selection
  const handleMouseDown = (date: Date) => {
    if (isDisabled(date) || mode !== "range") return;
    setRangeStart(date);
    setHoverDate(date);
    setIsDragging(true);
  };

  const handleMouseEnter = (date: Date) => {
    if (isDisabled(date)) return;
    setHoverDate(date);
    if (isDragging && mode === "range" && rangeStart) {
      // Preview range during drag
      const range = getRange(rangeStart, date);
      setInternalSelected(range);
    }
  };

  const handleMouseUp = () => {
    if (isDragging && mode === "range" && rangeStart && hoverDate) {
      const range = getRange(rangeStart, hoverDate);
      setInternalSelected(range);
      onSelect?.(range);
    }
    setIsDragging(false);
    setRangeStart(null);
    setHoverDate(null);
  };

  // Handle click (single or shift+click for range, double-click/Ctrl+click for multi)
  const handleClick = (date: Date, shiftKey: boolean, ctrlKey: boolean = false, isDoubleClick: boolean = false) => {
    if (isDisabled(date)) return;

    if (mode === "single") {
      setInternalSelected(date);
      onSelect?.(date);
      return;
    }

    if (mode === "multi") {
      // Double-click or Ctrl+Click to toggle multi-selection
      if (isDoubleClick || ctrlKey) {
        const newMultiSelected = isSelectedMulti(date)
          ? multiSelected.filter((d) => !isSameDay(d, date))
          : [...multiSelected, date];
        setInternalMultiSelected(newMultiSelected);
        onDatesChange?.(newMultiSelected);
      } else {
        // Single click in multi mode = replace with single date (like single mode)
        setInternalMultiSelected([date]);
        onDatesChange?.([date]);
        onSelect?.(date);
      }
      return;
    }

    if (mode === "week") {
      // Click in week mode selects the week
      const day = date.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const monday = new Date(date);
      monday.setDate(date.getDate() + mondayOffset);
      setInternalWeekStart(monday);
      setInternalSelected(monday);
      onWeekChange?.(monday);
      onSelect?.(monday);
      return;
    }

    // Range mode
    if (shiftKey && rangeStart) {
      // Shift+click: create range from rangeStart to clicked date
      const range = getRange(rangeStart, date);
      setInternalSelected(range);
      onSelect?.(range);
      setRangeStart(null);
    } else if (!isDragging) {
      // First click: set range start
      setRangeStart(date);
      setHoverDate(date);
    }
  };

  // Handle keyboard for accessibility
  const handleKeyDown = (e: React.KeyboardEvent, date: Date) => {
    if (isDisabled(date)) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick(date, e.shiftKey);
    }
  };

  // Cleanup on mouse leave
  useEffect(() => {
    const handleMouseLeave = () => {
      if (isDragging) {
        handleMouseUp();
      }
      setHoverDate(null);
    };

    const grid = gridRef.current;
    if (grid) {
      grid.addEventListener("mouseleave", handleMouseLeave);
    }
    return () => {
      if (grid) {
        grid.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, [isDragging, rangeStart, hoverDate]);

  // Sync internal selection when controlled prop changes
  useEffect(() => {
    if (controlledSelected !== undefined) {
      setInternalSelected(controlledSelected);
      if (Array.isArray(controlledSelected)) {
        setInternalMultiSelected(controlledSelected);
      }
      setRangeStart(null);
      setHoverDate(null);
      setIsDragging(false);
    }
  }, [controlledSelected]);

  // Sync week start when controlled prop changes
  useEffect(() => {
    if (controlledWeekStart !== undefined) {
      setInternalWeekStart(controlledWeekStart);
    }
  }, [controlledWeekStart]);

  return (
    <div
      style={themeVars as React.CSSProperties}
      className="cal-root"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="cal-card">
        <div className="cal-header">
          <button
            type="button"
            aria-label={weekMode ? "Previous week" : "Previous month"}
            className="cal-nav-btn"
            onClick={weekMode ? () => goToWeek(-1) : () => goToMonth(-1)}
          >
            <ChevronLeft size={18} />
          </button>
          <div className="cal-month-year-selects">
            {weekMode ? (
              <>
                <span className="cal-week-label" style={{fontWeight: 600, fontSize: '13px', color: 'var(--cal-text)'}}>
                  {getWeekLabel(weekStart)}
                </span>
              </>
            ) : (
              <>
                <select
                  className="cal-select"
                  value={cursor.getMonth()}
                  onChange={(e) => handleMonthChange(Number(e.target.value))}
                  aria-label="Select month"
                >
                  {MONTH_NAMES.map((m, i) => (
                    <option key={m} value={i}>{m}</option>
                  ))}
                </select>
                <select
                  className="cal-select"
                  value={cursor.getFullYear()}
                  onChange={(e) => handleYearChange(Number(e.target.value))}
                  aria-label="Select year"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </>
            )}
          </div>
          <button
            type="button"
            aria-label={weekMode ? "Next week" : "Next month"}
            className="cal-nav-btn"
            onClick={weekMode ? () => goToWeek(1) : () => goToMonth(1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="cal-weekdays">
          {WEEKDAYS.map((w) => (
            <div key={w} className="cal-weekday">{w}</div>
          ))}
        </div>

        <div className="cal-grid" ref={gridRef}>
          {days.map(({ date, inMonth }, i) => {
            const isToday = isSameDay(date, today);
            const disabled = isDisabled(date);
            const selectedSingle = isSelectedSingle(date);
            const selectedRange = isSelectedRange(date);
            const selectedMulti = isSelectedMulti(date);
            const weekSelected = isWeekSelected(date);
            const highlighted = isHighlighted(date);
            const inRange = isInRange(date);
            const rangeStart = isRangeStart(date);
            const rangeEnd = isRangeEnd(date);

            return (
              <button
                type="button"
                key={i}
                onClick={(e) => handleClick(date, e.shiftKey, e.ctrlKey || e.metaKey, false)}
                onDoubleClick={(e) => handleClick(date, e.shiftKey, e.ctrlKey || e.metaKey, true)}
                onMouseDown={() => handleMouseDown(date)}
                onMouseEnter={() => handleMouseEnter(date)}
                onKeyDown={(e) => handleKeyDown(e, date)}
                disabled={disabled}
                className="cal-day"
                data-in-month={inMonth}
                data-today={isToday}
                data-selected={selectedSingle || selectedRange || selectedMulti || weekSelected || highlighted}
                data-multi-selected={selectedMulti}
                data-week-selected={weekSelected}
                data-highlighted={highlighted}
                data-range-start={rangeStart}
                data-range-end={rangeEnd}
                data-in-range={inRange}
                data-disabled={disabled}
                tabIndex={disabled ? -1 : 0}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>

        {!hideThemePicker && (
          <>
            <div className="cal-theme-picker">
              {(Object.keys(THEMES) as ThemeName[]).map((name) => {
                const t = THEMES[name];
                const Icon = t.icon;
                const active = name === activeTheme;
                return (
                  <button
                    type="button"
                    key={name}
                    className="cal-theme-pill"
                    data-active={active}
                    onClick={() => {
                      setInternalTheme(name);
                      setPickerOpen(false);
                    }}
                    aria-label={`Switch to ${t.label} theme`}
                    title={t.label}
                  >
                    <Icon size={14} />
                  </button>
                );
              })}
              <button
                type="button"
                className="cal-theme-pill"
                data-active={activeTheme === "custom"}
                onClick={() => {
                  setInternalTheme("custom");
                  setPickerOpen(true);
                }}
                aria-label="Switch to Custom theme"
                title="Custom"
              >
                <Palette size={14} />
              </button>
            </div>

            {activeTheme === "custom" && pickerOpen && (
              <div className="cal-custom-panel">
                <label className="cal-custom-row">
                  <span>Background</span>
                  <input
                    type="color"
                    value={customColors.bg}
                    onChange={(e) => setCustomColors((c) => ({ ...c, bg: e.target.value }))}
                  />
                </label>
                <label className="cal-custom-row">
                  <span>Accent</span>
                  <input
                    type="color"
                    value={customColors.accent}
                    onChange={(e) => setCustomColors((c) => ({ ...c, accent: e.target.value }))}
                  />
                </label>
                <label className="cal-custom-row">
                  <span>Text</span>
                  <input
                    type="color"
                    value={customColors.text}
                    onChange={(e) => setCustomColors((c) => ({ ...c, text: e.target.value }))}
                  />
                </label>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        .cal-root {
          --radius: 14px;
          display: block;
          width: 100%;
          height: 100%;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif;
        }
        .cal-card {
          background: var(--cal-bg);
          border: 1px solid var(--cal-border);
          border-radius: var(--radius);
          box-shadow: var(--cal-shadow);
          padding: 18px;
          width: 100%;
          height: 100%;
          min-width: 280px;
          min-height: 320px;
          color: var(--cal-text);
          transition: background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }
        .cal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
          flex-shrink: 0;
        }
        .cal-week-label {
          font-weight: 600;
          font-size: 13px;
          color: var(--cal-text);
          white-space: nowrap;
        }
        .cal-month-year-selects {
          display: flex;
          gap: 6px;
        }
        .cal-select {
          font-weight: 600;
          font-size: 13px;
          letter-spacing: 0.01em;
          color: var(--cal-text);
          background: var(--cal-surface);
          border: 1px solid var(--cal-border);
          border-radius: 7px;
          padding: 5px 8px;
          cursor: pointer;
          appearance: auto;
          font-family: inherit;
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .cal-select:hover {
          background: var(--cal-hover);
        }
        .cal-select:focus {
          outline: none;
          border-color: var(--cal-accent);
        }
        .cal-nav-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--cal-text-muted);
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .cal-nav-btn:hover {
          background: var(--cal-hover);
          color: var(--cal-text);
        }
        .cal-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          margin-bottom: 4px;
          flex-shrink: 0;
        }
        .cal-weekday {
          font-size: 11px;
          font-weight: 600;
          text-align: center;
          color: var(--cal-text-muted);
          padding: 6px 0;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .cal-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
          flex: 1;
          min-height: 0;
        }
        .cal-day {
          position: relative;
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          border: none;
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          color: var(--cal-text);
          transition: background 0.15s ease, color 0.15s ease, transform 0.1s ease;
        }
        .cal-day[data-in-month="false"] {
          color: var(--cal-text-muted);
          opacity: 0.5;
        }
        .cal-day:hover:not([data-disabled="true"]) {
          background: var(--cal-hover);
        }
        .cal-day:active:not([data-disabled="true"]) {
          transform: scale(0.94);
        }
        .cal-day[data-today="true"] {
          box-shadow: inset 0 0 0 1.5px var(--cal-today-ring);
          font-weight: 600;
        }
        /* Single selection */
        .cal-day[data-selected="true"]:not([data-in-range="true"]):not([data-range-start="true"]):not([data-range-end="true"]) {
          background: var(--cal-accent);
          color: var(--cal-accent-text);
          font-weight: 600;
        }
        /* Range selection */
        .cal-day[data-in-range="true"] {
          background: var(--cal-range-bg);
          border-radius: 0;
        }
        .cal-day[data-range-start="true"] {
          border-radius: 8px 0 0 8px;
          background: var(--cal-accent);
          color: var(--cal-accent-text);
          font-weight: 600;
        }
        .cal-day[data-range-end="true"] {
          border-radius: 0 8px 8px 0;
          background: var(--cal-accent);
          color: var(--cal-accent-text);
          font-weight: 600;
        }
        .cal-day[data-range-start="true"][data-range-end="true"] {
          border-radius: 8px;
        }
        /* Multi selection */
        .cal-day[data-multi-selected="true"] {
          background: var(--cal-accent);
          color: var(--cal-accent-text);
          font-weight: 600;
          box-shadow: 0 0 0 2px var(--cal-accent);
        }
        /* Week selection */
        .cal-day[data-week-selected="true"] {
          background: var(--cal-range-bg);
          border-radius: 0;
        }
        .cal-day[data-week-selected="true"]:first-child {
          border-radius: 8px 0 0 8px;
        }
        .cal-day[data-week-selected="true"]:last-child {
          border-radius: 0 8px 8px 0;
        }
        /* Highlighted dates (for multi-select display in week mode) */
        .cal-day[data-highlighted="true"] {
          background: var(--cal-range-bg);
          box-shadow: inset 0 0 0 2px var(--cal-accent);
          color: var(--cal-accent);
          font-weight: 600;
        }
        /* Disabled state */
        .cal-day[data-disabled="true"] {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .cal-day[data-disabled="true"]:hover {
          background: transparent;
        }
        .cal-theme-picker {
          display: flex;
          gap: 6px;
          justify-content: center;
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid var(--cal-border);
        }
        .cal-theme-pill {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 1px solid var(--cal-border);
          background: var(--cal-surface);
          color: var(--cal-text-muted);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .cal-theme-pill:hover {
          color: var(--cal-text);
        }
        .cal-theme-pill[data-active="true"] {
          background: var(--cal-accent);
          border-color: var(--cal-accent);
          color: var(--cal-accent-text);
        }
        .cal-custom-panel {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 10px;
          padding: 12px;
          border-radius: 10px;
          background: var(--cal-surface);
          border: 1px solid var(--cal-border);
        }
        .cal-custom-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          color: var(--cal-text-muted);
          cursor: pointer;
        }
        .cal-custom-row input[type="color"] {
          width: 28px;
          height: 22px;
          border: 1px solid var(--cal-border);
          border-radius: 6px;
          background: none;
          cursor: pointer;
          padding: 0;
        }
      `}</style>
    </div>
  );
}