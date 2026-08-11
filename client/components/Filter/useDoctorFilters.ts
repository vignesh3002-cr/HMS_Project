import { useMemo } from "react";
import type { FilterField, SelectOption } from "./types";
import { toBranchOptions, toNameIdOptions, toSortedOptions } from "./utils";

interface BranchOption {
  name: string;
  area?: string | null;
}

interface DoctorFilterRow {
  id: string | number;
  name: string;
  dept?: string | null;
  branch?: string | null;
  status?: string | null;
}

interface UseDoctorFiltersParams {
  doctorRows: DoctorFilterRow[];
  branches: BranchOption[];
}

interface UseDoctorFiltersResult {
  doctorFilterFields: FilterField[];
}

// Doctor.tsx's filter field definitions, moved here so Filter/ is the single
// source of truth for what the Doctor page's Filter popover shows. Name/ID
// is one searchable combobox (matches Staff.tsx/Dashboard.tsx), and
// Department/Branch/Status options come from the real rows/branch directory
// passed in instead of a fixed list, so a real doctor whose department or
// branch wasn't on that list is filterable again.
export function useDoctorFilters({ doctorRows, branches }: UseDoctorFiltersParams): UseDoctorFiltersResult {
  const branchFilterOptions = useMemo<SelectOption[]>(() => toBranchOptions(branches), [branches]);
  const deptOptions = useMemo(() => toSortedOptions(doctorRows.map((d) => d.dept)), [doctorRows]);
  const statusOptions = useMemo(() => toSortedOptions(doctorRows.map((d) => d.status)), [doctorRows]);
  const nameOptions = useMemo<SelectOption[]>(() => toNameIdOptions(doctorRows), [doctorRows]);

  const doctorFilterFields: FilterField[] = [
    {
      id: "name",
      label: "Doctor Name",
      type: "combobox",
      placeholder: "Search by name or ID",
      options: nameOptions,
      matchKeys: ["name", "id"],
    },
    { id: "dept", label: "Department", type: "multiselect", options: deptOptions },
    { id: "branch", label: "Branch", type: "multiselect", options: branchFilterOptions },
    { id: "status", label: "Status", type: "multiselect", options: statusOptions },
  ];

  return { doctorFilterFields };
}
