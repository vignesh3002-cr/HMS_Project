import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Sun, Moon, Leaf, Wind, Palette } from "lucide-react";
 
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
  icon: React.ComponentType<{ size?: number }>;
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
      "--cal-shadow": "0 1px 2px rgba(14,110,125,0.05), 0 10px 24px rgba(14,110,125,0.10)",
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
 
interface CalendarProps {
  /** Controlled theme. If omitted, the calendar manages its own theme with the picker. */
  theme?: ThemeName;
  /** Controlled selected date. If omitted, the calendar manages its own selection. */
  selected?: Date | null;
  /** Called when the user picks a date. */
  onSelect?: (date: Date) => void;
  /** Hide the built-in theme picker (useful if you control theme externally). */
  hideThemePicker?: boolean;
  /** Starting colors for the "Custom" theme (background, accent, text). */
  defaultCustomColors?: CustomColors;
  /** Earliest year selectable in the year dropdown. Defaults to 80 years before the current year. */
  minYear?: number;
  /** Latest year selectable in the year dropdown. Defaults to 10 years after the current year. */
  maxYear?: number;
}

export default function Calendar({
  theme,
  selected: controlledSelected,
  onSelect,
  hideThemePicker,
  defaultCustomColors,
  minYear,
  maxYear,
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
  const [internalSelected, setInternalSelected] = useState<Date | null>(null);
  const selected = controlledSelected ?? internalSelected;
 
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
 
  const handlePick = (date: Date) => {
    setInternalSelected(date);
    onSelect?.(date);
  };
 
  return (
    <div
      style={themeVars as React.CSSProperties}
      className="cal-root"
    >
      <div className="cal-card">
        <div className="cal-header">
          <button
            aria-label="Previous month"
            className="cal-nav-btn"
            onClick={() => goToMonth(-1)}
          >
            <ChevronLeft size={18} />
          </button>
          <div className="cal-month-year-selects">
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
          </div>
          <button
            aria-label="Next month"
            className="cal-nav-btn"
            onClick={() => goToMonth(1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
 
        <div className="cal-weekdays">
          {WEEKDAYS.map((w) => (
            <div key={w} className="cal-weekday">{w}</div>
          ))}
        </div>
 
        <div className="cal-grid">
          {days.map(({ date, inMonth }, i) => {
            const isToday = isSameDay(date, today);
            const isSelected = selected && isSameDay(date, selected);
            return (
              <button
                key={i}
                onClick={() => handlePick(date)}
                className="cal-day"
                data-in-month={inMonth}
                data-today={isToday}
                data-selected={isSelected}
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
          display: inline-block;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif;
        }
        .cal-card {
          background: var(--cal-bg);
          border: 1px solid var(--cal-border);
          border-radius: var(--radius);
          box-shadow: var(--cal-shadow);
          padding: 18px;
          width: 320px;
          color: var(--cal-text);
          transition: background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
        }
        .cal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
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
        .cal-day:hover {
          background: var(--cal-hover);
        }
        .cal-day:active {
          transform: scale(0.94);
        }
        .cal-day[data-today="true"] {
          box-shadow: inset 0 0 0 1.5px var(--cal-today-ring);
          font-weight: 600;
        }
        .cal-day[data-selected="true"] {
          background: var(--cal-accent);
          color: var(--cal-accent-text);
          font-weight: 600;
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