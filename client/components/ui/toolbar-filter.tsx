import { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FilterPanel } from "@/components/Filter/FilterPanel";
import type { FilterField } from "@/components/Filter/types";
import { Funnel } from "lucide-react";
import { getUser } from "@/utils/token";

interface ToolbarFilterProps {
  fields: FilterField[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  onApply: () => void;
  onClear: () => void;
  title?: string;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// NEW: StatusToggle component for showing/hiding deactivated records
// Only available to HEAD_ADMIN and SUPER_ADMIN roles
const STATUS_TOGGLE_ROLES = ["HEAD_ADMIN", "SUPER_ADMIN"];

interface StatusToggleProps {
  showDeactivated: boolean;
  onChange: (showDeactivated: boolean) => void;
  activeTitle?: string;
  deactivatedTitle?: string;
}

export function resolveFilterRole(user: { role_type?: string; role?: string } | null): string {
  return String(user?.role_type || user?.role || "").trim().toUpperCase();
}

// The Filters toolbar button is shown by default to every role (no admin
// gating) -- the filter popover logic lives here directly.
export function ToolbarFilter({
  fields,
  values,
  onChange,
  onApply,
  onClear,
  title = "Advanced Filters",
  trigger,
  open,
  onOpenChange,
}: ToolbarFilterProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <button className="flex items-center gap-2 h-[27px] px-4 rounded-md border border-[#E5E7EB] text-[#374151] text-sm font-medium transition-colors duration-150 hover:bg-[#F2F4F6] hover:border-[#00488D]">
            <Funnel className="w-4 h-4" />
            Filters
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[280px] rounded-[16px] border border-[#E5E7EB] bg-white p-0 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.16)]" align="end">
        <FilterPanel
          title={title}
          fields={fields}
          values={values}
          onChange={onChange}
          onApply={onApply}
          onClear={onClear}
        />
      </PopoverContent>
    </Popover>
  );
}

// STATUS TOGGLE COMPONENT
// Replaces the inline Active/Deactivated toggle buttons
// Provides consistent UI and role-based access control
export function StatusToggle({
  showDeactivated,
  onChange,
  activeTitle = "Show active records",
  deactivatedTitle = "Show deactivated records",
}: StatusToggleProps) {
  const user = getUser();

  const role = String(
    user?.role_type || user?.role || ""
  )
    .trim()
    .toUpperCase();

  // Only Head Admin and Super Admin can access this toggle
  if (!STATUS_TOGGLE_ROLES.includes(role)) {
    return null;
  }

  return (
    <div className="flex border border-[#E5E7EB] rounded-md overflow-hidden bg-[#F2F4F6] p-0.5">
      <button
        type="button"
        onClick={() => onChange(false)}
        title={activeTitle}
        className={`px-2 py-1.5 rounded text-[11px] font-semibold ${
          !showDeactivated
            ? "bg-white shadow-sm text-[#00488D]"
            : "text-[#6B7280]"
        }`}
      >
        Active
      </button>

      <button
        type="button"
        onClick={() => onChange(true)}
        title={deactivatedTitle}
        className={`px-2 py-1.5 rounded text-[11px] font-semibold ${
          showDeactivated
            ? "bg-white shadow-sm text-[#00488D]"
            : "text-[#6B7280]"
        }`}
      >
        Deactivated
      </button>
    </div>
  );
}