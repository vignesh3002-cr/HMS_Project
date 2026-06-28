import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusTone = "blue" | "green" | "amber" | "rose" | "slate";

type StatusBadgeProps = {
  children: ReactNode;
  tone?: StatusTone;
};

const toneClasses: Record<StatusTone, string> = {
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
};

export function StatusBadge({ children, tone = "slate" }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-md px-2 py-1 font-bold", toneClasses[tone])}
    >
      {children}
    </Badge>
  );
}
