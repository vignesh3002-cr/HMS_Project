import { FilterPopover } from "@/components/Filter";
import type { FilterField } from "@/components/Filter/types";
import { getUser } from "@/utils/token";

// The Filters toolbar button is a top-level management feature -- only
// Head Admin / Super Admin sessions render it (other roles get no dead
// button, so there's no visible "missing" control on their toolbars).
const FILTER_ADMIN_ROLES = ["HEAD_ADMIN", "SUPER_ADMIN"];

interface ToolbarFilterProps {
  fields: FilterField[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  onApply: () => void;
  onClear: () => void;
  title?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function resolveFilterRole(user: { role_type?: string; role?: string } | null): string {
  return String(user?.role_type || user?.role || "").trim().toUpperCase();
}

export function ToolbarFilter(props: ToolbarFilterProps) {
  const role = resolveFilterRole(getUser());
  if (import.meta.env.DEV) {
    console.log(
      `[ToolbarFilter] session role: "${role}" -> ${FILTER_ADMIN_ROLES.includes(role) ? "SHOW filter" : "HIDDEN (not Head/Super Admin)"}`,
    );
  }
  if (!FILTER_ADMIN_ROLES.includes(role)) return null;
  return <FilterPopover {...props} />;
}