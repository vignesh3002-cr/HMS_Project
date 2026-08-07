import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatusTone =
  | "green"
  | "orange"
  | "slate"
  | "blue"
  | "red"
  | "amber"
  | "indigo"
  | "purple"
  | "emerald"
  | "gray"
  | "rose";

type StatusBadgeProps = {
  children?: ReactNode;
  status?: string;
  tone?: StatusTone;
};

const toneClasses: Record<StatusTone, { container: string; dot: string }> = {
  green:    { container: "bg-green-50 text-green-600", dot: "bg-green-500" },
  orange:   { container: "bg-orange-50 text-orange-500", dot: "bg-orange-500" },
  slate:    { container: "bg-[#F1F5F9] text-[#475569]", dot: "bg-[#94A3B8]" },
  blue:     { container: "bg-blue-50 text-blue-600", dot: "bg-blue-500" },
  red:      { container: "bg-red-50 text-red-600", dot: "bg-red-500" },
  amber:    { container: "bg-amber-50 text-amber-600", dot: "bg-amber-500" },
  indigo:   { container: "bg-indigo-50 text-indigo-600", dot: "bg-indigo-500" },
  purple:   { container: "bg-purple-50 text-purple-600", dot: "bg-purple-500" },
  emerald:  { container: "bg-emerald-50 text-emerald-600", dot: "bg-emerald-500" },
  gray:     { container: "bg-gray-100 text-gray-600", dot: "bg-gray-400" },
  rose:     { container: "bg-rose-50 text-rose-600", dot: "bg-rose-500" },
};

const statusToneMap: Record<string, StatusTone> = {
  active: "green",
  leave: "orange",
  inactive: "slate",
  scheduled: "blue",
  booked: "blue",
  confirmed: "green",
  cancelled: "red",
  rescheduled: "amber",
  "checked in": "indigo",
  "in consultation": "purple",
  completed: "emerald",
  "no show": "gray",
  "reschedule required": "amber",
  "transfer review required": "indigo",
  pending: "amber",
  assigned: "blue",
};

function resolveTone(status?: string, tone?: StatusTone): StatusTone {
  if (tone) return tone;
  if (status) {
    const key = status.toLowerCase().trim();
    return statusToneMap[key] || "slate";
  }
  return "slate";
}

function toTitleCase(str: string): string {
  return str
    .split(/[_ ]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function StatusBadge({ children, status, tone }: StatusBadgeProps) {
  const resolvedTone = resolveTone(status, tone);
  const { container, dot } = toneClasses[resolvedTone];
  const label = children || (status ? toTitleCase(status) : "");

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold", container)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", dot)} />
      {label}
    </span>
  );
}
