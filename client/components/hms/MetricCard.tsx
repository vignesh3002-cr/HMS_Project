import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricTone = "blue" | "green" | "amber" | "rose";

type MetricCardProps = {
  title: string;
  value: string;
  detail: string;
  trend?: string;
  trendDirection?: "up" | "down";
  icon: LucideIcon;
  tone?: MetricTone;
};

const toneClasses: Record<MetricTone, string> = {
  blue: "bg-blue-50 text-blue-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700",
};

export function MetricCard({
  title,
  value,
  detail,
  trend,
  trendDirection = "up",
  icon: Icon,
  tone = "blue",
}: MetricCardProps) {
  const TrendIcon = trendDirection === "up" ? ArrowUpRight : ArrowDownRight;

  return (
    <Card className="rounded-lg border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 p-5 pb-2">
        <CardTitle className="text-sm font-semibold text-slate-600">
          {title}
        </CardTitle>
        <span className={cn("rounded-md p-2", toneClasses[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <div className="text-3xl font-extrabold tracking-normal text-slate-950">
          {value}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          {trend ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 font-semibold",
                trendDirection === "up" ? "text-emerald-700" : "text-rose-700",
              )}
            >
              <TrendIcon className="h-4 w-4" />
              {trend}
            </span>
          ) : null}
          <span className="text-slate-500">{detail}</span>
        </div>
      </CardContent>
    </Card>
  );
}
