import { useState, useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { format, subDays, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { PopoverContent } from "@/components/ui/popover";
import type { DateRange as CalendarDateRange } from "@/components/hms/Calender";
import { chemotherapyApi, type ProtocolPerformanceItem } from "@/api/chemotherapy.api";
import PerformanceChart, { type PerformanceChartItem } from "./performanceChart";

export type ProtocolPerfRange =
  | "allTime"
  | "thisMonth"
  | "lastMonth"
  | "thisWeek"
  | "lastWeek"
  | "today"
  | "yesterday"
  | "custom";

const PROTOCOL_PERF_RANGE_OPTIONS: { value: ProtocolPerfRange; label: string }[] = [
  { value: "allTime", label: "All Time" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "thisWeek", label: "This Week" },
  { value: "lastWeek", label: "Last Week" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "custom", label: "Custom Range" },
];

interface ProtocolPerfRangeResult {
  dateFrom: string;
  dateTo: string;
  prevDateFrom: string;
  prevDateTo: string;
  dateLabel: string;
  compareLabel: string;
}

function calculatePercentage(actual: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((actual / total) * 100)));
}

type Trend =
  | { kind: "none" }
  | { kind: "new"; count: number }
  | { kind: "dropped"; count: number }
  | { kind: "change"; pct: number; delta: number };

function computeTrend(current: number, previous: number): Trend {
  if (previous === 0 && current === 0) return { kind: "none" };
  if (previous === 0 && current > 0) return { kind: "new", count: current };
  if (previous > 0 && current === 0) return { kind: "dropped", count: previous };
  const delta = current - previous;
  const pct = Math.round((delta / previous) * 100);
  return { kind: "change", pct, delta };
}

function formatTrend(t: Trend): string {
  switch (t.kind) {
    case "none":
      return "No change";
    case "new":
      return `+${t.count} order${t.count === 1 ? "" : "s"} (new)`;
    case "dropped":
      return `-${t.count} order${t.count === 1 ? "" : "s"} (-100%)`;
    case "change": {
      const sign = t.delta > 0 ? "+" : "";
      return `${sign}${t.delta} order${Math.abs(t.delta) === 1 ? "" : "s"} (${sign}${t.pct}%)`;
    }
  }
}

function formatComparisonRange(from: Date, to: Date): string {
  return `${format(from, "MMM d")} - ${format(to, "MMM d")}`;
}

function getProtocolPerfRangeDates(
  range: ProtocolPerfRange,
  base: Date,
  customRange?: CalendarDateRange | null
): ProtocolPerfRangeResult {
  if (range === "allTime") {
    return {
      dateFrom: "",
      dateTo: "",
      prevDateFrom: "",
      prevDateTo: "",
      dateLabel: "All Time Protocol Usage",
      compareLabel: "All active patient orders",
    };
  }

  const weekStart = startOfWeek(base, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(base, { weekStartsOn: 1 });
  const lastWeekStart = subWeeks(weekStart, 1);
  const lastWeekEnd = subWeeks(weekEnd, 1);
  const monthStart = startOfMonth(base);
  const monthEnd = endOfMonth(base);
  const lastMonthStart = startOfMonth(subMonths(base, 1));
  const lastMonthEnd = endOfMonth(subMonths(base, 1));

  let currentFrom: Date;
  let currentTo: Date;
  let prevFrom: Date;
  let prevTo: Date;

  if (range === "custom" && customRange?.from && customRange?.to) {
    currentFrom = customRange.from;
    currentTo = customRange.to;
    const durationMs = currentTo.getTime() - currentFrom.getTime();
    prevFrom = new Date(currentFrom.getTime() - durationMs);
    prevTo = new Date(currentTo.getTime() - durationMs);
  } else {
    const ranges: Record<string, { dateFrom: Date; dateTo: Date; prevFrom: Date; prevTo: Date }> = {
      today: {
        dateFrom: base, dateTo: base,
        prevFrom: subDays(base, 1), prevTo: subDays(base, 1),
      },
      yesterday: {
        dateFrom: subDays(base, 1), dateTo: subDays(base, 1),
        prevFrom: subDays(base, 2), prevTo: subDays(base, 2),
      },
      thisWeek: {
        dateFrom: weekStart, dateTo: weekEnd,
        prevFrom: lastWeekStart, prevTo: lastWeekEnd,
      },
      lastWeek: {
        dateFrom: lastWeekStart, dateTo: lastWeekEnd,
        prevFrom: subWeeks(lastWeekStart, 1), prevTo: subWeeks(lastWeekEnd, 1),
      },
      thisMonth: {
        dateFrom: monthStart, dateTo: monthEnd,
        prevFrom: lastMonthStart, prevTo: lastMonthEnd,
      },
      lastMonth: {
        dateFrom: lastMonthStart, dateTo: lastMonthEnd,
        prevFrom: startOfMonth(subMonths(base, 2)), prevTo: endOfMonth(subMonths(base, 2)),
      },
    };

    const r = ranges[range] || ranges.thisMonth;
    currentFrom = r.dateFrom;
    currentTo = r.dateTo;
    prevFrom = r.prevFrom;
    prevTo = r.prevTo;
  }

  return {
    dateFrom: format(currentFrom, "yyyy-MM-dd"),
    dateTo: format(currentTo, "yyyy-MM-dd"),
    prevDateFrom: format(prevFrom, "yyyy-MM-dd"),
    prevDateTo: format(prevTo, "yyyy-MM-dd"),
    dateLabel: formatComparisonRange(currentFrom, currentTo),
    compareLabel: `Compared with ${formatComparisonRange(prevFrom, prevTo)}`,
  };
}

const PROTOCOL_COLORS = [
  "#004888", "#00A878", "#C7701C", "#7B3200", "#6D5BC5",
  "#0E86C4", "#3D8C40", "#B54A7E", "#C49A2A", "#57627A",
  "#2E9DB3", "#8F4FB0", "#D9534F", "#3E7CB1", "#A8720F",
];

interface ProtocolPerformanceProps {
  selectedDate?: Date;
  compact?: boolean;
  className?: string;
  onView?: (protocol: { protocol_id: string; name: string }) => void;
}

interface ProtocolHoverCardProps {
  protocol: ProtocolPerformanceItem;
  range: ProtocolPerfRange;
  onClick?: () => void;
}

function ProtocolHoverCard({ protocol, onClick }: ProtocolHoverCardProps) {
  const trendObj = computeTrend(protocol.count, protocol.previousCount);
  const formattedTrendText = formatTrend(trendObj);
  const trendColor =
    trendObj.kind === "none"
      ? "#8C8D8F"
      : trendObj.kind === "new" || (trendObj.kind === "change" && trendObj.delta > 0)
        ? "#16A34A"
        : "#EF4444";

  const details = protocol.details;

  return (
    <PopoverContent
      side="right"
      align="start"
      sideOffset={10}
      className="w-72 p-0 border-[#E5E7EB] shadow-lg z-50 bg-white"
      onClick={onClick}
    >
      {/* Header */}
      <div className="bg-[#F8FAFC] px-4 py-3 border-b border-[#E5E7EB] rounded-t-md">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[#191C1E] text-xs font-bold truncate">{protocol.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-[#EBF3FF] text-[#004785]">
            {protocol.regimen_code || protocol.id}
          </span>
        </div>
        <div className="text-[#6B7280] text-[10px] mt-0.5 truncate">
          {protocol.cancer_type !== "—" ? protocol.cancer_type : "Broad Oncology"} · {protocol.intent}
        </div>
      </div>

      {/* Main KPI Stats */}
      <div className="px-4 py-3 flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-[#6B7280] text-[10px] font-medium">Orders in Period</span>
          <span className="text-[#191C1E] text-xs font-bold">{protocol.count}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-[#6B7280] text-[10px] font-medium">Distinct Patients</span>
          <span className="text-[#191C1E] text-[11px] font-semibold">{protocol.patient_count}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-[#6B7280] text-[10px] font-medium">System Share</span>
          <span className="text-[#004785] text-[11px] font-bold">{protocol.systemShare}%</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-[#6B7280] text-[10px] font-medium">Trend vs. Prior</span>
          <span className="text-[10px] font-semibold" style={{ color: trendColor }}>
            {formattedTrendText}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-[#6B7280] text-[10px] font-medium">Cycle Duration</span>
          <span className="text-[#191C1E] text-[10px] font-semibold">{protocol.cycle_days} days</span>
        </div>
      </div>

      {/* Treatment Plan Status Breakdown */}
      {details && details.total > 0 && (
        <>
          <div className="border-t border-[#E5E7EB] mx-3" />
          <div className="px-4 py-2.5 pb-3">
            <div className="text-[#424752] text-[10px] font-semibold tracking-[0.3px] mb-1.5">
              Plan Status Breakdown
            </div>
            <div className="flex flex-col gap-1 text-[10px]">
              <div className="flex justify-between">
                <span className="text-[#6B7280] font-medium">Active Plans</span>
                <span className="text-[#16A34A] font-semibold">
                  {details.active} ({calculatePercentage(details.active, details.total)}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280] font-medium">Planned</span>
                <span className="text-[#004785] font-semibold">
                  {details.planned} ({calculatePercentage(details.planned, details.total)}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280] font-medium">Completed</span>
                <span className="text-[#424752] font-semibold">
                  {details.completed} ({calculatePercentage(details.completed, details.total)}%)
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {onClick && (
        <div className="bg-[#F8FAFC] px-4 py-1.5 border-t border-[#E5E7EB] text-center text-[10px] text-[#004785] font-medium rounded-b-md cursor-pointer hover:bg-[#EEF4FF]">
          Click to view protocol details →
        </div>
      )}
    </PopoverContent>
  );
}

export default function ProtocolPerformance({
  selectedDate = new Date(),
  compact = false,
  className,
  onView,
}: ProtocolPerformanceProps) {
  const [perfRange, setPerfRange] = useState<ProtocolPerfRange>("allTime");
  const [customDateRange, setCustomDateRange] = useState<CalendarDateRange | null>(null);
  const [scope, setScope] = useState<"top3" | "all">("top3");

  const rangeDates = useMemo(
    () => getProtocolPerfRangeDates(perfRange, selectedDate, customDateRange),
    [perfRange, selectedDate, customDateRange]
  );

  const perfQuery = useQuery({
    queryKey: ["chemo-protocol-perf", perfRange, rangeDates.dateFrom, rangeDates.dateTo, rangeDates.prevDateFrom, rangeDates.prevDateTo],
    queryFn: async () => {
      const res = await chemotherapyApi.getProtocolPerformance({
        date_from: rangeDates.dateFrom || undefined,
        date_to: rangeDates.dateTo || undefined,
        prev_date_from: rangeDates.prevDateFrom || undefined,
        prev_date_to: rangeDates.prevDateTo || undefined,
      });
      return res.data?.data;
    },
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
  });

  const isInitialLoading = perfQuery.isPending && !perfQuery.data;
  const isUpdating = perfQuery.isFetching && !!perfQuery.data;
  const error = perfQuery.error ? "Failed to load protocol usage statistics." : null;

  const rawProtocols = perfQuery.data?.protocols || [];
  const totalOrders = perfQuery.data?.totalOrders || 0;

  const protocols = useMemo(() => {
    if (totalOrders > 0) {
      return rawProtocols.filter((p) => p.count > 0);
    }
    return rawProtocols.slice(0, 5);
  }, [rawProtocols, totalOrders]);

  const chartItems = useMemo<PerformanceChartItem[]>(() => {
    return protocols.map((p, index) => {
      const trendObj = computeTrend(p.count, p.previousCount);
      const formattedTrendText = formatTrend(trendObj);
      const trendColor =
        trendObj.kind === "none"
          ? "#8C8D8F"
          : trendObj.kind === "new" || (trendObj.kind === "change" && trendObj.delta > 0)
          ? "#16A34A"
          : "#EF4444";

      return {
        id: p.id,
        title: p.name,
        subtitle: p.cancer_type !== "—" ? p.cancer_type : undefined,
        value: p.count,
        valueLabel: `${p.count} ${p.count === 1 ? "order" : "orders"}`,
        share: p.systemShare,
        color: p.color || PROTOCOL_COLORS[index % PROTOCOL_COLORS.length],
        subtext: formattedTrendText,
        subtextColor: trendColor,
        isTop: index === 0 && p.count > 0,
        rawItem: p,
      };
    });
  }, [protocols]);

  return (
    <PerformanceChart
      title="Most Used Protocols"
      compact={compact}
      className={className}
      isLoading={isInitialLoading}
      isUpdating={isUpdating}
      error={error}
      items={chartItems}
      totalValue={totalOrders}
      totalValueUnit="Orders"
      dateLabel={rangeDates.dateLabel}
      compareLabel={rangeDates.compareLabel}
      selectedRange={perfRange}
      onRangeChange={(next) => setPerfRange(next as ProtocolPerfRange)}
      rangeOptions={PROTOCOL_PERF_RANGE_OPTIONS}
      customDateRange={customDateRange}
      onCustomRangeSelect={(r) => setCustomDateRange(r)}
      scope={scope}
      onScopeToggle={() => setScope(scope === "top3" ? "all" : "top3")}
      top3FooterLabel="Top 3 Protocol usage"
      totalFooterLabel="Total Protocol usage"
      emptyMessage="No protocol orders recorded for this period."
      onItemClick={(item) => onView && onView({ protocol_id: item.id, name: item.title })}
      renderHoverCard={(item, close) => (
        <ProtocolHoverCard
          protocol={item.rawItem}
          range={perfRange}
          onClick={
            onView
              ? () => {
                  onView({ protocol_id: item.id, name: item.title });
                  close();
                }
              : undefined
          }
        />
      )}
    />
  );
}
