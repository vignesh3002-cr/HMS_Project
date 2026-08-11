import { useMemo } from "react";
import type { FilterField } from "./types";
import { toSortedOptions } from "./utils";

interface DepartmentFilterRow {
  name?: string | null;
  status?: string | null;
}

interface UseDepartmentFiltersParams {
  departmentRows: readonly DepartmentFilterRow[];
}

interface UseDepartmentFiltersResult {
  departmentFilterFields: FilterField[];
}

// Departments.tsx's filter field definitions, moved here so Filter/ is the
// single source of truth for what the Departments page's Filter popover
// shows. Name/Status options are derived from the rows passed in rather
// than a fixed list, so they stay correct if that page's data source
// changes without anyone having to remember to update a second copy here.
export function useDepartmentFilters({
  departmentRows,
}: UseDepartmentFiltersParams): UseDepartmentFiltersResult {
  const nameOptions = useMemo(
    () => toSortedOptions(departmentRows.map((d) => d.name)),
    [departmentRows],
  );
  const statusOptions = useMemo(
    () => toSortedOptions(departmentRows.map((d) => d.status)),
    [departmentRows],
  );

  const departmentFilterFields: FilterField[] = [
    { id: "name", label: "Department", type: "multiselect", options: nameOptions },
    { id: "lead", label: "Department Head", type: "text", placeholder: "Search by name" },
    { id: "status", label: "Status", type: "multiselect", options: statusOptions },
    { id: "utilization", label: "Min Utilization", type: "number", placeholder: "Minimum %", min: 0, max: 100 },
  ];

  return { departmentFilterFields };
}
