import { useState, useEffect, useRef, useMemo, useCallback, type ReactNode } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import CalendarPicker, { type DateRange as CalendarDateRange } from "@/components/hms/Calender";

export type PerformanceChartViz = "bars" | "pie";

export interface PerformanceChartItem {
  id: string;
  title: string;
  subtitle?: string;
  value: number;
  valueLabel?: string;
  share: number; // 0-100 percentage for animated progress bar
  shareLabel?: string;
  color: string;
  subtext?: string;
  subtextColor?: string;
  isTop?: boolean;
  rawItem?: any;
}

export interface PerformanceChartProps {
  title: string;
  compact?: boolean;
  className?: string;
  isUpdating?: boolean;
  isLoading?: boolean;
  error?: string | null;
  items: PerformanceChartItem[];
  totalValue: number;
  totalValueUnit?: string;
  displayedFooterValue?: number | string;
  dateLabel?: string;
  compareLabel?: string;
  showVizSelector?: boolean;
  showDateFilter?: boolean;
  selectedRange?: string;
  onRangeChange?: (range: string) => void;
  rangeOptions?: { value: string; label: string }[];
  customDateRange?: CalendarDateRange | null;
  onCustomRangeSelect?: (range: CalendarDateRange) => void;
  scope: "top3" | "all";
  onScopeToggle: () => void;
  top3FooterLabel: string;
  totalFooterLabel: string;
  renderHoverCard?: (item: PerformanceChartItem, close: () => void) => ReactNode;
  onItemClick?: (item: PerformanceChartItem) => void;
  emptyMessage?: string;
}

const DEFAULT_COLORS = [
  "#004888", "#00A878", "#C7701C", "#7B3200", "#6D5BC5",
  "#0E86C4", "#3D8C40", "#B54A7E", "#C49A2A", "#57627A",
  "#2E9DB3", "#8F4FB0", "#D9534F", "#3E7CB1", "#A8720F",
];

function formatComparisonRange(from: Date, to: Date): string {
  return `${format(from, "MMM d")} - ${format(to, "MMM d")}`;
}

export default function PerformanceChart({
  title,
  compact = false,
  className,
  isUpdating = false,
  isLoading = false,
  error = null,
  items,
  totalValue,
  totalValueUnit = "Total",
  displayedFooterValue,
  dateLabel,
  compareLabel,
  showVizSelector = true,
  showDateFilter = true,
  selectedRange,
  onRangeChange,
  rangeOptions = [],
  customDateRange,
  onCustomRangeSelect,
  scope,
  onScopeToggle,
  top3FooterLabel,
  totalFooterLabel,
  renderHoverCard,
  onItemClick,
  emptyMessage = "No data available for this range.",
}: PerformanceChartProps) {
  const [vizMode, setVizMode] = useState<PerformanceChartViz>("bars");
  const [isFromCalendarOpen, setIsFromCalendarOpen] = useState(false);
  const [isTillCalendarOpen, setIsTillCalendarOpen] = useState(false);

  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter items by scope
  const displayedItems = useMemo(() => {
    if (scope === "top3") {
      return items.slice(0, 3);
    }
    return items;
  }, [items, scope]);

  // Displayed value for footer
  const displayedValue = useMemo(() => {
    if (displayedFooterValue !== undefined) {
      return displayedFooterValue;
    }
    if (scope === "top3") {
      return displayedItems.reduce((sum, item) => sum + item.value, 0);
    }
    return totalValue;
  }, [displayedFooterValue, displayedItems, scope, totalValue]);

  // Hover handlers
  const handleMouseEnter = useCallback((id: string) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHoveredItemId(id);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setHoveredItemId(null);
    }, 150);
  }, []);

  const cancelHoverClose = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  // Animated progress bar values
  const [animatedValues, setAnimatedValues] = useState<Record<string, number>>({});
  const animatedValuesRef = useRef<Record<string, number>>({});
  animatedValuesRef.current = animatedValues;

  useEffect(() => {
    const validIds = new Set(displayedItems.map((i) => i.id));
    setAnimatedValues((prev) => {
      let changed = false;
      const next: Record<string, number> = {};
      for (const [k, v] of Object.entries(prev)) {
        if (validIds.has(k)) {
          next[k] = v;
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    const intervals = displayedItems
      .filter((item) => item.share !== (animatedValuesRef.current[item.id] ?? 0))
      .map((item) => {
        const interval = window.setInterval(() => {
          setAnimatedValues((prev) => {
            const value = prev[item.id] ?? 0;
            if (value === item.share) {
              window.clearInterval(interval);
              return prev;
            }
            return {
              ...prev,
              [item.id]: value < item.share ? value + 1 : value - 1,
            };
          });
        }, 30);
        return interval;
      });

    return () => intervals.forEach((interval) => window.clearInterval(interval));
  }, [displayedItems]);

  // Pie chart data
  const pieData = useMemo(
    () =>
      displayedItems
        .filter((item) => item.value > 0)
        .map((item, idx) => ({
          name: item.title,
          value: item.value,
          share: item.share,
          color: item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
          id: item.id,
          rawItem: item,
        })),
    [displayedItems]
  );

  return (
    <div
      className={
        className ||
        (compact
          ? "bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-5 flex flex-col justify-between transition-all duration-200"
          : "bg-white rounded-lg border border-[rgba(194,198,212,0.10)] p-5 flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md")
      }
    >
      {/* Header */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className={compact ? "text-sm font-bold text-[#191C1E]" : "text-[#191C1E] font-extrabold text-base leading-6 tracking-[-0.4px]"}>
                {title}
              </h3>
              {isUpdating && (
                <span className="inline-flex items-center gap-1 text-[10px] text-[#00488D] font-medium bg-blue-50 px-2 py-0.5 rounded-full animate-fade-in">
                  <Loader2 className="w-3 h-3 animate-spin text-[#00488D]" />
                  <span>Updating...</span>
                </span>
              )}
            </div>
            {dateLabel && <p className="text-[#424752] text-[10px] font-semibold mt-0.5">{dateLabel}</p>}
            {compareLabel && <p className="text-[#8C8D8F] text-[9px] font-medium">{compareLabel}</p>}
          </div>

          <div className="flex items-center gap-1.5">
            {/* View switcher */}
            {showVizSelector && (
              <select
                value={vizMode}
                onChange={(e) => setVizMode(e.target.value as PerformanceChartViz)}
                className="px-2 py-1 rounded border border-[rgba(194,198,212,0.40)] bg-white text-[#424752] text-[9px] font-semibold tracking-[0.9px] outline-none cursor-pointer focus:border-[#00488D]"
                title="Choose visualization"
              >
                <option value="bars">Bar Diagram</option>
                <option value="pie">Pie Chart</option>
              </select>
            )}

            {/* Range Select */}
            {showDateFilter && onRangeChange && selectedRange && rangeOptions.length > 0 && (
              <select
                value={selectedRange}
                onChange={(e) => {
                  const next = e.target.value;
                  onRangeChange(next);
                  if (next === "custom" && onCustomRangeSelect) {
                    setHoveredItemId(null);
                    if (!customDateRange?.from) {
                      setIsFromCalendarOpen(true);
                    }
                  }
                }}
                className="px-2 py-1 rounded border border-[rgba(194,198,212,0.40)] bg-white text-[#424752] text-[9px] font-semibold tracking-[0.9px] outline-none cursor-pointer focus:border-[#00488D]"
                title="Choose date range"
              >
                {rangeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Dedicated Next Line for Custom Range */}
        {showDateFilter && selectedRange === "custom" && onCustomRangeSelect && (
          <div className="mt-2.5 pt-2 border-t border-[#F2F4F6] flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-[#424752] uppercase tracking-[0.5px]">
              Custom Range
            </span>
            <div className="flex items-center gap-1.5">
              {/* From Date Picker */}
              <Popover
                open={isFromCalendarOpen}
                onOpenChange={(open) => {
                  setIsFromCalendarOpen(open);
                  if (open) setHoveredItemId(null);
                }}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="px-2.5 py-1 rounded-md border border-[#00488D] bg-[#D6E3FF] text-[#00488D] text-[10px] font-semibold tracking-[0.3px] outline-none cursor-pointer flex items-center gap-1 hover:bg-[#c2d7ff] transition-colors"
                    title="Select From Date"
                  >
                    <span className="font-bold text-[#00488D]">From:</span>
                    <span>
                      {customDateRange?.from
                        ? format(customDateRange.from, "dd/MM/yyyy")
                        : "Select date"}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-[#E5E7EB] shadow-lg z-50 bg-white" align="end">
                  <div className="px-3 py-2 border-b border-[#E5E7EB] bg-[#F8FAFC] text-[11px] font-bold text-[#191C1E]">
                    Select From Date
                  </div>
                  <CalendarPicker
                    mode="single"
                    selected={customDateRange?.from ?? new Date()}
                    hideThemePicker
                    onSelect={(date) => {
                      if (date instanceof Date) {
                        const nextFrom = date;
                        const nextTo =
                          customDateRange?.to && customDateRange.to >= nextFrom
                            ? customDateRange.to
                            : nextFrom;
                        onCustomRangeSelect({ from: nextFrom, to: nextTo });
                        setIsFromCalendarOpen(false);
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>

              <span className="text-[#8C8D8F] text-[10px] font-medium">to</span>

              {/* Till Date Picker */}
              <Popover
                open={isTillCalendarOpen}
                onOpenChange={(open) => {
                  setIsTillCalendarOpen(open);
                  if (open) setHoveredItemId(null);
                }}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="px-2.5 py-1 rounded-md border border-[#00488D] bg-[#D6E3FF] text-[#00488D] text-[10px] font-semibold tracking-[0.3px] outline-none cursor-pointer flex items-center gap-1 hover:bg-[#c2d7ff] transition-colors"
                    title="Select Till Date"
                  >
                    <span className="font-bold text-[#00488D]">Till:</span>
                    <span>
                      {customDateRange?.to
                        ? format(customDateRange.to, "dd/MM/yyyy")
                        : "Select date"}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-[#E5E7EB] shadow-lg z-50 bg-white" align="end">
                  <div className="px-3 py-2 border-b border-[#E5E7EB] bg-[#F8FAFC] text-[11px] font-bold text-[#191C1E]">
                    Select Till Date
                  </div>
                  <CalendarPicker
                    mode="single"
                    selected={customDateRange?.to ?? customDateRange?.from ?? new Date()}
                    hideThemePicker
                    onSelect={(date) => {
                      if (date instanceof Date) {
                        const nextTo = date;
                        const nextFrom =
                          customDateRange?.from && customDateRange.from <= nextTo
                            ? customDateRange.from
                            : nextTo;
                        onCustomRangeSelect({ from: nextFrom, to: nextTo });
                        setIsTillCalendarOpen(false);
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}
        </div>

        {/* Error state */}
        {error && (
          <div className="mt-3 flex items-center gap-2 text-[#B91C1C] text-xs bg-[#FEF2F2] border border-[#FECACA] rounded-md px-3 py-2">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="flex flex-col gap-3 py-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col gap-1.5 animate-pulse">
                <div className="flex justify-between">
                  <div className="h-3 w-32 bg-[#F1F3F6] rounded" />
                  <div className="h-3 w-16 bg-[#F1F3F6] rounded" />
                </div>
                <div className="h-1.5 w-full bg-[#F1F3F6] rounded-full" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && displayedItems.length === 0 && (
          <div className="py-8 text-center text-xs text-[#6B7280]">
            {emptyMessage}
          </div>
        )}

        {/* BAR VIEW */}
        {!isLoading && !error && displayedItems.length > 0 && vizMode === "bars" && (
          <div
            className={`mt-4 flex flex-col gap-3 ${
              compact ? "max-h-[200px]" : "max-h-[260px]"
            } overflow-y-auto hide-scrollbar pr-1 transition-opacity duration-200 ${
              isUpdating ? "opacity-75" : "opacity-100"
            }`}
          >
            {displayedItems.map((item, index) => {
              const isTop = item.isTop ?? (index === 0 && item.value > 0);
              const isOpen = hoveredItemId === item.id;
              const sharePct = animatedValues[item.id] ?? item.share;
              const color = item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];

              const rowNode = (
                <div
                  className="relative flex flex-col gap-1 cursor-pointer rounded-md px-1.5 py-1 transition-colors duration-150 hover:bg-[#F8FAFC]"
                  onMouseEnter={() => {
                    if (isFromCalendarOpen || isTillCalendarOpen) return;
                    handleMouseEnter(item.id);
                  }}
                  onMouseLeave={handleMouseLeave}
                  onClick={() => onItemClick && onItemClick(item)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[#8C8D8F] text-[9px] font-bold w-3 flex-shrink-0">{index + 1}.</span>
                      <span className="text-[#191C1E] text-[10px] font-semibold tracking-[0.3px] truncate">
                        {item.title}
                      </span>
                      {isTop && (
                        <span className="text-[#00488D] text-[9px] leading-none" title="Top volume / furthest progress">★</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {item.valueLabel && (
                        <span className="text-[10px] font-semibold text-[#424752]">
                          {item.valueLabel}
                        </span>
                      )}
                      {item.shareLabel ? (
                        <span className="text-[9px] font-semibold tracking-[0.5px]" style={{ color }}>
                          {item.shareLabel}
                        </span>
                      ) : (
                        <span className="text-[9px] font-semibold tracking-[0.5px]" style={{ color }}>
                          {sharePct}% share
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Animated Progress Bar */}
                  <div className="h-1.5 rounded-full bg-[#ECEEF0] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(sharePct, item.value > 0 ? 3 : 0)}%`,
                        background: color,
                      }}
                    />
                  </div>

                  {/* Subtext line */}
                  <div className="flex items-center justify-between pl-[18px]">
                    {item.subtext && (
                      <span className="text-[8px] font-semibold" style={{ color: item.subtextColor || "#8C8D8F" }}>
                        {item.subtext}
                      </span>
                    )}
                    {item.subtitle && (
                      <span className="text-[8px] text-[#8C8D8F] truncate max-w-[150px]">
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                </div>
              );

              if (renderHoverCard) {
                return (
                  <Popover key={item.id} open={isOpen}>
                    <PopoverTrigger asChild>{rowNode}</PopoverTrigger>
                    <div
                      onMouseEnter={cancelHoverClose}
                      onMouseLeave={handleMouseLeave}
                    >
                      {renderHoverCard(item, () => setHoveredItemId(null))}
                    </div>
                  </Popover>
                );
              }

              return <div key={item.id}>{rowNode}</div>;
            })}
          </div>
        )}

        {/* PIE VIEW */}
        {!isLoading && !error && vizMode === "pie" && (
          pieData.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#6B7280]">
              {emptyMessage}
            </div>
          ) : (
            <div
              className={`mt-4 flex flex-col sm:flex-row items-center gap-3 transition-opacity duration-200 ${
                isUpdating ? "opacity-75" : "opacity-100"
              }`}
            >
              {/* Donut Chart */}
              <div className="relative w-full sm:w-1/2 h-[180px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={68}
                      paddingAngle={2}
                    >
                      {pieData.map((entry) => (
                        <Cell
                          key={`cell-${entry.id}`}
                          fill={entry.color}
                          opacity={hoveredItemId === null || hoveredItemId === entry.id ? 1 : 0.45}
                          className="cursor-pointer transition-opacity duration-150"
                          onMouseEnter={() => handleMouseEnter(entry.id)}
                          onMouseLeave={handleMouseLeave}
                          onClick={() => onItemClick && onItemClick(entry.rawItem)}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Center metric */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-sm font-extrabold text-[#191C1E]">{displayedValue}</span>
                  <span className="text-[9px] font-semibold text-[#8C8D8F] tracking-wide uppercase">
                    {totalValueUnit}
                  </span>
                </div>
              </div>

              {/* Legend rows */}
              <div
                className={`w-full sm:w-1/2 flex flex-col gap-1.5 ${
                  compact ? "max-h-[180px]" : "max-h-[220px]"
                } overflow-y-auto hide-scrollbar`}
              >
                {pieData.map((d) => {
                  const isOpen = hoveredItemId === d.id;
                  const legendRow = (
                    <div
                      className="flex items-center justify-between p-1 rounded cursor-pointer transition-colors hover:bg-[#F8FAFC]"
                      onMouseEnter={() => handleMouseEnter(d.id)}
                      onMouseLeave={handleMouseLeave}
                      onClick={() => onItemClick && onItemClick(d.rawItem)}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className="text-[10px] font-medium text-[#191C1E] truncate max-w-[95px]">
                          {d.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 text-[10px]">
                        <span className="font-semibold text-[#424752]">{d.value}</span>
                        <span className="text-[9px] font-bold text-[#8C8D8F]">
                          ({d.share}%)
                        </span>
                      </div>
                    </div>
                  );

                  if (renderHoverCard) {
                    return (
                      <Popover key={d.id} open={isOpen}>
                        <PopoverTrigger asChild>{legendRow}</PopoverTrigger>
                        <div
                          onMouseEnter={cancelHoverClose}
                          onMouseLeave={handleMouseLeave}
                        >
                          {renderHoverCard(d.rawItem, () => setHoveredItemId(null))}
                        </div>
                      </Popover>
                    );
                  }

                  return <div key={d.id}>{legendRow}</div>;
                })}
              </div>
            </div>
          )
        )}

      {/* Footer Summary - Clickable Toggle */}
      <div className="mt-3 pt-2.5 border-t border-[#F2F4F6] flex items-center justify-between text-[10px]">
        <button
          type="button"
          onClick={onScopeToggle}
          className="text-[#6B7280] hover:text-[#004785] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors group select-none outline-none"
          title="Click to toggle between Top 3 and Total"
        >
          <span className="underline decoration-dotted group-hover:decoration-solid">
            {scope === "top3" ? top3FooterLabel : totalFooterLabel}
          </span>
          <span className="text-[9px] text-[#9CA3AF] group-hover:text-[#004785] font-bold">⇄</span>
        </button>
        <span className="font-bold text-[#004785]">{displayedValue} {totalValueUnit.toLowerCase()}</span>
      </div>
    </div>
  );
}
