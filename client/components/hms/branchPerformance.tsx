import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { format, addDays, subDays, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { dayKeyOf } from "@/utils/timezone";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import CalendarPicker, { type DateRange as CalendarDateRange } from "@/components/hms/Calender";
import { appointmentApi, type AppointmentRecord } from "@/api/appointment.api";
import { branchApi } from "@/api/branch.api";
import PerformanceChart, { type PerformanceChartItem } from "./performanceChart";

export type BranchPerfRange = "today" | "yesterday" | "tomorrow" | "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth" | "custom";

const BRANCH_PERF_RANGE_OPTIONS: { value: BranchPerfRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "thisWeek", label: "This Week" },
  { value: "lastWeek", label: "Last Week" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "custom", label: "Custom Range" },
];

interface BranchPerfRangeResult {
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

function systemSharePct(branchBookedCount: number, totalSystemBookedCount: number): number {
  if (totalSystemBookedCount <= 0) return 0;
  return Math.round((branchBookedCount / totalSystemBookedCount) * 100);
}

function utilizationPct(bookedCount: number, totalSlots: number): number | null {
  if (totalSlots <= 0) return null;
  return Math.round((bookedCount / totalSlots) * 100);
}

function utilizationConfidence(totalSlots: number): "low" | "normal" {
  return totalSlots < 5 ? "low" : "normal";
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
      return `+${t.count} appt${t.count === 1 ? "" : "s"} (new)`;
    case "dropped":
      return `-${t.count} appt${t.count === 1 ? "" : "s"} (-100%)`;
    case "change": {
      const sign = t.delta > 0 ? "+" : "";
      return `${sign}${t.delta} appt${Math.abs(t.delta) === 1 ? "" : "s"} (${sign}${t.pct}%)`;
    }
  }
}

function getBranchPerfRangeDates(range: BranchPerfRange, base: Date, customRange?: CalendarDateRange | null): BranchPerfRangeResult {
  // Anchor "base" to its CALENDAR DAY in the active branch timezone: a Date
  // picker value keeps the day as picked, while "now" (the default) resolves
  // to the BRANCH's day - so every derived day/week/month range below follows
  // the branch's calendar, never the viewer's laptop clock.
  const [anchorY, anchorM, anchorD] = dayKeyOf(base).split("-").map(Number);
  base = new Date(anchorY, anchorM - 1, anchorD);

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
      tomorrow: {
        dateFrom: addDays(base, 1), dateTo: addDays(base, 1),
        prevFrom: base, prevTo: base,
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

    const r = ranges[range] || ranges.today;
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

const PIE_COLORS = [
  "#004888", "#00A878", "#C7701C", "#7B3200", "#6D5BC5",
  "#0E86C4", "#3D8C40", "#B54A7E", "#C49A2A", "#57627A",
  "#2E9DB3", "#8F4FB0", "#D9534F", "#3E7CB1", "#A8720F",
];

function formatComparisonRange(from: Date, to: Date): string {
  return `${format(from, "MMM d")} - ${format(to, "MMM d")}`;
}

interface BranchPerformanceProps {
  selectedDate?: Date;
  compact?: boolean;
  className?: string;
}

interface BranchPerfBranch {
  id: string;
  name: string;
  count: number;
  previousCount: number;
  totalSlots: number;
  systemShare: number;
  color: string;
  appointments?: AppointmentRecord[];
}

interface BranchHoverCardProps {
  branch: BranchPerfBranch;
  details: {
    total: number;
    booked: number;
    completed: number;
    cancelled: number;
    noShow: number;
    scheduled: number;
  } | null;
  loading: boolean;
  range: BranchPerfRange;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function BranchHoverCard({ branch, details, loading, range, onMouseEnter, onMouseLeave }: BranchHoverCardProps) {
  const trendObj = computeTrend(branch.count, branch.previousCount);
  const formattedTrendText = formatTrend(trendObj);
  const trendColor =
    trendObj.kind === "none"
      ? "#8C8D8F"
      : trendObj.kind === "new" || (trendObj.kind === "change" && trendObj.delta > 0)
        ? "#16A34A"
        : "#EF4444";
  const uPct = utilizationPct(branch.count, branch.totalSlots);
  const uConf = utilizationConfidence(branch.totalSlots);
  const unusedCapacity = branch.totalSlots > 0 ? branch.totalSlots - branch.count : null;

  return (
    <PopoverContent
      side="right"
      align="start"
      sideOffset={10}
      className="w-72 p-0 border-[#E5E7EB] shadow-lg"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="px-4 pt-3 pb-2">
        <div className="text-[#191C1E] font-bold text-xs tracking-[0.2px]">{branch.name}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[#424752] text-[11px] font-semibold">
            {branch.count} appointment{branch.count === 1 ? "" : "s"}
          </span>
          <span className="text-[10px] font-semibold" style={{ color: trendColor }}>
            {formattedTrendText}
          </span>
        </div>
      </div>

      <div className="border-t border-[#E5E7EB] mx-3" />

      <div className="px-4 py-2.5 flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-[#6B7280] text-[10px] font-medium">System Share</span>
          <span className="text-[#191C1E] text-[11px] font-semibold">{branch.systemShare}%</span>
        </div>

        <div className="flex justify-between items-start">
          <span className="text-[#6B7280] text-[10px] font-medium">Utilization</span>
          <div className="flex flex-col items-end gap-0.5">
            {uPct !== null ? (
              <>
                <span className="text-[#191C1E] text-[11px] font-semibold flex items-center gap-1">
                  {uPct}%
                  {uConf === "low" && (
                    <span
                      className="text-[7px] px-1 py-px rounded bg-amber-100 text-amber-700 font-medium cursor-help"
                      title="Based on small sample (<5 slots)"
                    >
                      ⚠ Low sample
                    </span>
                  )}
                </span>
                <span className="text-[#8C8D8F] text-[9px] font-normal">
                  {branch.count} / {branch.totalSlots} slots
                </span>
              </>
            ) : (
              <>
                <span className="text-[#8C8D8F] text-[11px] font-semibold">N/A</span>
                <span className="text-[#8C8D8F] text-[8px] font-normal">Capacity unavailable</span>
              </>
            )}
          </div>
        </div>

        {branch.totalSlots > 0 && (
          <>
            <div className="flex justify-between items-center">
              <span className="text-[#6B7280] text-[10px] font-medium">Capacity</span>
              <span className="text-[#191C1E] text-[10px] font-semibold">{branch.totalSlots} slots</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#6B7280] text-[10px] font-medium">Unused</span>
              <span className="text-[#191C1E] text-[10px] font-semibold">
                {unusedCapacity !== null && unusedCapacity >= 0 ? unusedCapacity : 0}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="border-t border-[#E5E7EB] mx-3" />

      <div className="px-4 py-2.5 pb-3">
        {loading && !details ? (
          <div className="flex items-center gap-2 text-[#6B7280] text-[10px] py-1">
            <Loader2 size={12} className="animate-spin text-[#00488D]" />
            Loading...
          </div>
        ) : details ? (
          range === "tomorrow" ? (
            <div className="flex flex-col gap-1.5 text-[10px]">
              <div className="text-[#424752] text-[10px] font-semibold tracking-[0.3px] mb-0.5">Upcoming</div>
              <div className="flex justify-between">
                <span className="text-[#6B7280] font-medium">Scheduled</span>
                <span className="text-[#191C1E] font-semibold">{details.scheduled}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280] font-medium">Total Appointments</span>
                <span className="text-[#191C1E] font-semibold">{details.total}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 text-[10px]">
              <div className="text-[#424752] text-[10px] font-semibold tracking-[0.3px] mb-0.5">Appointment Outcomes</div>
              <div className="flex justify-between">
                <span className="text-[#6B7280] font-medium">Completed</span>
                <span className="text-[#191C1E] font-semibold">
                  {details.completed} · {calculatePercentage(details.completed, details.booked)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280] font-medium">Cancelled</span>
                <span className="text-[#191C1E] font-semibold">
                  {details.cancelled} · {calculatePercentage(details.cancelled, details.booked)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280] font-medium">No-show</span>
                <span className="text-[#191C1E] font-semibold">
                  {details.noShow} · {calculatePercentage(details.noShow, details.booked)}%
                </span>
              </div>
            </div>
          )
        ) : (
          <div className="text-[#8C8D8F] text-[10px]">No appointment data.</div>
        )}
      </div>
    </PopoverContent>
  );
}

export default function BranchPerformance({ selectedDate = new Date(), compact = false, className }: BranchPerformanceProps) {
  const [branchPerfRange, setBranchPerfRange] = useState<BranchPerfRange>("today");
  const [customDateRange, setCustomDateRange] = useState<CalendarDateRange | null>(null);
  const [scope, setScope] = useState<"top3" | "all">("top3");

  const [branchPerfDateLabel, setBranchPerfDateLabel] = useState("");
  const [branchPerfCompareLabel, setBranchPerfCompareLabel] = useState("");

  const [branches, setBranches] = useState<BranchPerfBranch[]>([]);
  const [branchPerfError, setBranchPerfError] = useState<string | null>(null);

  const [hoveredBranchDetails, setHoveredBranchDetails] = useState<{
    total: number;
    booked: number;
    completed: number;
    cancelled: number;
    noShow: number;
    scheduled: number;
  } | null>(null);
  const [isHoverDetailsLoading, setIsHoverDetailsLoading] = useState(false);

  const branchPerfQuery = useQuery({
    queryKey: ["dashboard-branch-perf", branchPerfRange, dayKeyOf(selectedDate), customDateRange],
    queryFn: async () => {
      const branchRes = await branchApi.getAll();
      const branchList = branchRes.data?.data || [];

      const { dateFrom, dateTo, prevDateFrom, prevDateTo, dateLabel, compareLabel } = getBranchPerfRangeDates(branchPerfRange, selectedDate, customDateRange);

      async function fetchAllAppointmentsInRange(dFrom: string, dTo: string): Promise<AppointmentRecord[]> {
        const res = await appointmentApi.getAll({ dateFrom: dFrom, dateTo: dTo, limit: 100 }).catch(() => null);
        if (!res?.data?.data) return [];
        const records = [...(res.data.data.appointments || [])];
        const totalPages = res.data.data.totalPages || 1;
        if (totalPages > 1 && totalPages <= 5) {
          const pagePromises = [];
          for (let p = 2; p <= totalPages; p++) {
            pagePromises.push(appointmentApi.getAll({ dateFrom: dFrom, dateTo: dTo, limit: 100, page: p }).catch(() => null));
          }
          const pageResults = await Promise.all(pagePromises);
          for (const pr of pageResults) {
            if (pr?.data?.data?.appointments) {
              records.push(...pr.data.data.appointments);
            }
          }
        }
        return records;
      }

      const [currentAppts, prevAppts] = await Promise.all([
        fetchAllAppointmentsInRange(dateFrom, dateTo),
        fetchAllAppointmentsInRange(prevDateFrom, prevDateTo),
      ]);

      const currentByBranch: Record<string, { booked: number; total: number; appointments: AppointmentRecord[] }> = {};
      const prevByBranch: Record<string, number> = {};

      currentAppts.forEach((a: AppointmentRecord) => {
        const bId = a.branch_id;
        if (!bId) return;
        if (!currentByBranch[bId]) currentByBranch[bId] = { booked: 0, total: 0, appointments: [] };
        currentByBranch[bId].total++;
        currentByBranch[bId].appointments.push(a);
        const s = (a.status || "").toUpperCase();
        if (s !== "CANCELLED" && s !== "NO_SHOW") {
          currentByBranch[bId].booked++;
        }
      });

      prevAppts.forEach((a: AppointmentRecord) => {
        const bId = a.branch_id;
        if (!bId) return;
        const s = (a.status || "").toUpperCase();
        if (s !== "CANCELLED" && s !== "NO_SHOW") {
          prevByBranch[bId] = (prevByBranch[bId] || 0) + 1;
        }
      });

      const branchData = branchList.map((b) => ({
        id: b.branch_id,
        name: b.branch_area ? `${b.branch_name} (${b.branch_area})` : (b.branch_name || b.branch_id),
        count: currentByBranch[b.branch_id]?.booked ?? 0,
        previousCount: prevByBranch[b.branch_id] ?? 0,
        totalSlots: currentByBranch[b.branch_id]?.total ?? 0,
        appointments: currentByBranch[b.branch_id]?.appointments ?? [],
      }));

      const ranked = [...branchData].sort((a, b) => b.count - a.count);
      const totalSystemBookedCount = ranked.reduce((sum, b) => sum + b.count, 0);

      return {
        branches: ranked.map((b, index) => ({
          ...b,
          systemShare: systemSharePct(b.count, totalSystemBookedCount),
          color: PIE_COLORS[index % PIE_COLORS.length],
        })),
        dateLabel,
        compareLabel,
      };
    },
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  const isInitialLoading = branchPerfQuery.isPending && !branchPerfQuery.data;
  const isUpdating = branchPerfQuery.isFetching && !!branchPerfQuery.data;

  useEffect(() => {
    if (branchPerfQuery.data) {
      setBranches(branchPerfQuery.data.branches);
      setBranchPerfDateLabel(branchPerfQuery.data.dateLabel);
      setBranchPerfCompareLabel(branchPerfQuery.data.compareLabel);
    }
  }, [branchPerfQuery.data]);

  useEffect(() => {
    if (!branchPerfQuery.error) return;
    console.error("[BranchPerformance] Failed to load branch performance:", branchPerfQuery.error);
    setBranchPerfError("Failed to load branch performance.");
    setBranches([]);
  }, [branchPerfQuery.error]);

  const fetchBranchHoverDetails = useCallback((branchId: string) => {
    const branch = branches.find((b) => b.id === branchId);
    const appointments = branch?.appointments || [];

    let completed = 0;
    let cancelled = 0;
    let noShow = 0;
    let scheduled = 0;

    appointments.forEach((a: AppointmentRecord) => {
      const s = (a.status || "").toUpperCase();
      if (s === "COMPLETED") completed++;
      else if (s === "CANCELLED") cancelled++;
      else if (s === "NO_SHOW") noShow++;
      else scheduled++;
    });

    setHoveredBranchDetails({
      total: appointments.length,
      booked: branch?.count || 0,
      completed,
      cancelled,
      noShow,
      scheduled,
    });
    setIsHoverDetailsLoading(false);
  }, [branches]);

  const chartItems = useMemo<PerformanceChartItem[]>(() => {
    return branches.map((b, index) => {
      const trendObj = computeTrend(b.count, b.previousCount);
      const formattedTrendText = formatTrend(trendObj);
      const trendColor =
        trendObj.kind === "none"
          ? "#8C8D8F"
          : trendObj.kind === "new" || (trendObj.kind === "change" && trendObj.delta > 0)
          ? "#16A34A"
          : "#EF4444";

      return {
        id: b.id,
        title: b.name,
        value: b.count,
        valueLabel: `${b.count} ${b.count === 1 ? "appt" : "appts"}`,
        share: b.systemShare,
        color: b.color,
        subtext: formattedTrendText,
        subtextColor: trendColor,
        isTop: index === 0 && b.count > 0,
        rawItem: b,
      };
    });
  }, [branches]);

  const totalAppointments = useMemo(() => {
    return branches.reduce((sum, b) => sum + b.count, 0);
  }, [branches]);

  return (
    <PerformanceChart
      title="Branch Performance"
      compact={compact}
      className={className}
      isLoading={isInitialLoading}
      isUpdating={isUpdating}
      error={branchPerfError}
      items={chartItems}
      totalValue={totalAppointments}
      totalValueUnit="Appointments"
      dateLabel={branchPerfDateLabel}
      compareLabel={branchPerfCompareLabel}
      selectedRange={branchPerfRange}
      onRangeChange={(next) => setBranchPerfRange(next as BranchPerfRange)}
      rangeOptions={BRANCH_PERF_RANGE_OPTIONS}
      customDateRange={customDateRange}
      onCustomRangeSelect={(r) => setCustomDateRange(r)}
      scope={scope}
      onScopeToggle={() => setScope(scope === "top3" ? "all" : "top3")}
      top3FooterLabel="Top 3 Branches"
      totalFooterLabel="Total Branches"
      emptyMessage="No branch data available."
      renderHoverCard={(item) => (
        <BranchHoverCard
          branch={item.rawItem}
          details={hoveredBranchDetails}
          loading={isHoverDetailsLoading}
          range={branchPerfRange}
          onMouseEnter={() => fetchBranchHoverDetails(item.id)}
          onMouseLeave={() => {}}
        />
      )}
    />
  );
}
