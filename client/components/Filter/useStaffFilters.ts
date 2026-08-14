import { useMemo } from "react";
import type { FilterField, SelectOption } from "./types";
import { toBranchOptions, toNameIdOptions, toSortedOptions } from "./utils";

interface BranchOption {
  name: string;
  area?: string | null;
}

interface StaffFilterRow {
  id: string | number;
  name: string;
  dept?: string | null;
  designation?: string | null;
  status?: string | null;
}

interface UseStaffFiltersParams {
  staffRows: StaffFilterRow[];
  branches: BranchOption[];
}

interface UseStaffFiltersResult {
  staffFilterFields: FilterField[];
}

// Staff.tsx's filter field definitions, moved here so Filter/ is the single
// source of truth for what the Staff page's Filter popover shows.
// Department/Designation/Status options are the distinct values actually
// present among the current tab's real employees -- e.g. Supporting only
// ever offers the Staff designations that exist there, not a fixed list
// that includes roles (Doctor, Head Admin, ...) that can never appear there.
export function useStaffFilters({ staffRows, branches }: UseStaffFiltersParams): UseStaffFiltersResult {
  const branchFilterOptions = useMemo<SelectOption[]>(() => toBranchOptions(branches), [branches]);
  const departmentOptions = useMemo(() => toSortedOptions(staffRows.map((r) => r.dept)), [staffRows]);
  const designationOptions = useMemo(
    () => toSortedOptions(staffRows.map((r) => r.designation)),
    [staffRows],
  );
  const statusOptions = useMemo(() => {
    const unique = Array.from(new Set(staffRows.map((r) => r.status).filter(Boolean)));
    return unique.sort().map((s) => ({ label: s === "active" ? "Active" : "Inactive", value: s as string }));
  }, [staffRows]);

  // One searchable dropdown listing every real staff member in the current
  // tab -- each row shows the name (larger) with their ID underneath
  // (smaller, muted), and typing matches either. Selecting a person filters
  // straight to that one row via their unique id.
  const nameFilterOptions = useMemo<SelectOption[]>(() => toNameIdOptions(staffRows), [staffRows]);

  const staffFilterFields: FilterField[] = [
    {
      id: "name",
      label: "Name / ID",
      type: "combobox",
      placeholder: "Search by name or ID",
      options: nameFilterOptions,
      matchKeys: ["name", "id"],
    },
    { id: "dept", label: "Department", type: "multiselect", options: departmentOptions },
    { id: "branch", label: "Branch", type: "multiselect", options: branchFilterOptions },
    { id: "status", label: "Status", type: "multiselect", options: statusOptions },
    { id: "designation", label: "Designation", type: "multiselect", options: designationOptions },
  ];

  return { staffFilterFields };
}
