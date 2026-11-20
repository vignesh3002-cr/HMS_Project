import { useState, useMemo } from "react";
import { PopoverContent } from "@/components/ui/popover";
import PerformanceChart, { type PerformanceChartItem } from "./performanceChart";
import { fmtDate, isOpenPlan, toTime } from "@/pages/orderMasterCycles";

export interface CycleOrderRow {
  plan_id: string;
  patient_id?: string;
  patient_name: string;
  protocol: string;
  protocol_code?: string;
  diagnosis?: string;
  intent?: string;
  branch?: string;
  oncologist?: string;
  cycle_label: string;
  cycles_label: string;
  cycle_progress: number;
  next_cycle_date: string;
  raw_status: string;
  date?: string;
}

interface CycleProgressChartProps {
  rows?: CycleOrderRow[];
  compact?: boolean;
  className?: string;
  onView?: (row: CycleOrderRow) => void;
}

const CYCLE_COLORS = [
  "#004888", "#00A878", "#C7701C", "#7B3200", "#6D5BC5",
  "#0E86C4", "#3D8C40", "#B54A7E", "#C49A2A", "#57627A",
  "#2E9DB3", "#8F4FB0", "#D9534F", "#3E7CB1", "#A8720F",
];

export default function CycleProgressChart({
  rows = [],
  compact = false,
  className,
  onView,
}: CycleProgressChartProps) {
  const [scope, setScope] = useState<"top3" | "all">("top3");

  // Cycle Progress logic:
  // Open plans with cycle_progress > 0, furthest along first
  const cyclePlans = useMemo(() => {
    return [...rows]
      .filter((row) => isOpenPlan(row.raw_status) && row.cycle_progress > 0)
      .sort(
        (a, b) =>
          b.cycle_progress - a.cycle_progress ||
          toTime(a.next_cycle_date) - toTime(b.next_cycle_date)
      );
  }, [rows]);

  // Format into standard PerformanceChartItem list
  const chartItems = useMemo<PerformanceChartItem[]>(() => {
    return cyclePlans.map((r, index) => {
      const nextDateFormatted = r.next_cycle_date ? fmtDate(r.next_cycle_date) : null;
      const subtext = nextDateFormatted ? `Next: ${nextDateFormatted}` : "Completed all cycles";

      return {
        id: r.plan_id,
        title: r.patient_name,
        // Crucial: NO StatusBadge as instructed
        subtitle: `${r.protocol} · ${r.cycles_label}`,
        value: r.cycle_progress,
        valueLabel: `${r.cycle_progress}%`,
        share: r.cycle_progress,
        shareLabel: r.cycles_label,
        color: CYCLE_COLORS[index % CYCLE_COLORS.length],
        subtext,
        subtextColor: nextDateFormatted ? "#004785" : "#16A34A",
        isTop: index === 0,
        rawItem: r,
      };
    });
  }, [cyclePlans]);

  return (
    <PerformanceChart
      title="Cycle Progress"
      compact={compact}
      className={className}
      showVizSelector={false}
      showDateFilter={false}
      items={chartItems}
      totalValue={chartItems.length}
      totalValueUnit="Plans"
      displayedFooterValue={scope === "top3" ? Math.min(3, chartItems.length) : chartItems.length}
      dateLabel="Active chemotherapy regimens"
      scope={scope}
      onScopeToggle={() => setScope(scope === "top3" ? "all" : "top3")}
      top3FooterLabel="Top 3 Furthest Along"
      totalFooterLabel="All In-Progress Cycles"
      emptyMessage="No open orders with cycles in progress."
      onItemClick={(item) => onView && onView(item.rawItem)}
      renderHoverCard={(item, close) => {
        const r = item.rawItem as CycleOrderRow;
        return (
          <PopoverContent
            side="right"
            align="start"
            sideOffset={10}
            className="w-72 p-0 border-[#E5E7EB] shadow-lg z-50 bg-white"
            onClick={() => {
              if (onView) {
                onView(r);
                close();
              }
            }}
          >
            {/* Header */}
            <div className="bg-[#F8FAFC] px-4 py-3 border-b border-[#E5E7EB] rounded-t-md">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#191C1E] text-xs font-bold truncate">{r.patient_name}</span>
                {r.patient_id && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-[#EBF3FF] text-[#004785]">
                    {r.patient_id}
                  </span>
                )}
              </div>
              <div className="text-[#6B7280] text-[10px] mt-0.5 truncate">
                {r.protocol}
                {r.intent && r.intent !== "—" ? ` · ${r.intent}` : ""}
              </div>
            </div>

            {/* KPI Details */}
            <div className="px-4 py-3 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-[#6B7280] text-[10px] font-medium">Current Cycle & Day</span>
                <span className="text-[#191C1E] text-xs font-bold">{r.cycle_label}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#6B7280] text-[10px] font-medium">Completed Cycles</span>
                <span className="text-[#004785] text-xs font-bold">{r.cycles_label}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#6B7280] text-[10px] font-medium">Cycle Progress</span>
                <span className="text-[#16A34A] text-xs font-bold">{r.cycle_progress}%</span>
              </div>

              {r.next_cycle_date && (
                <div className="flex justify-between items-center">
                  <span className="text-[#6B7280] text-[10px] font-medium">Next Scheduled Cycle</span>
                  <span className="text-[#191C1E] text-[10px] font-semibold">{fmtDate(r.next_cycle_date)}</span>
                </div>
              )}

              {r.diagnosis && r.diagnosis !== "—" && (
                <div className="flex justify-between items-start pt-1 border-t border-[#F2F4F6]">
                  <span className="text-[#6B7280] text-[10px] font-medium">Diagnosis</span>
                  <span className="text-[#191C1E] text-[10px] font-semibold text-right max-w-[140px] truncate">
                    {r.diagnosis}
                  </span>
                </div>
              )}

              {r.oncologist && r.oncologist !== "—" && (
                <div className="flex justify-between items-center">
                  <span className="text-[#6B7280] text-[10px] font-medium">Oncologist</span>
                  <span className="text-[#191C1E] text-[10px] font-semibold truncate max-w-[140px]">
                    {r.oncologist}
                  </span>
                </div>
              )}
            </div>

            {onView && (
              <div className="bg-[#F8FAFC] px-4 py-1.5 border-t border-[#E5E7EB] text-center text-[10px] text-[#004785] font-medium rounded-b-md cursor-pointer hover:bg-[#EEF4FF]">
                Click to view chemotherapy plan →
              </div>
            )}
          </PopoverContent>
        );
      }}
    />
  );
}
