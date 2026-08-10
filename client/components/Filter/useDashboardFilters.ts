import { useMemo } from "react";
import type { FilterField, SelectOption } from "./types";
import { toBranchOptions, toNameIdOptions, toSortedOptions } from "./utils";

interface BranchOption {
  name: string;
  area?: string | null;
}

interface UseDashboardFiltersParams {
  activeTab: string;
  realDoctors: Record<string, unknown>[] | null;
  realStaff: Record<string, unknown>[] | null;
  realAppointments: Record<string, unknown>[] | null;
  branches: BranchOption[];
}

interface UseDashboardFiltersResult {
  doctorFilterFields: FilterField[];
  staffFilterFields: FilterField[];
  appointmentFilterFields: FilterField[];
  activeFilterFields: FilterField[];
}

// Dashboard-specific filter field definitions -- the one part of Dashboard's
// filter functionality that can't live in the generic engine (types.ts /
// utils.ts / FilterField.tsx / useFilterPanel.ts), since it depends on
// Dashboard's own row shapes (mapEmployeeRecord's dept/status/name/id,
// mapAppointmentRecord's status). Everything here is a pure transform of
// data Dashboard already fetched and passed in -- nothing is fetched here,
// so there's no duplicate API call and no second filter implementation;
// this is the single place that builds Dashboard's filter fields.
export function useDashboardFilters({
  activeTab,
  realDoctors,
  realStaff,
  realAppointments,
  branches,
}: UseDashboardFiltersParams): UseDashboardFiltersResult {
  const branchFilterOptions = useMemo<SelectOption[]>(() => toBranchOptions(branches), [branches]);

  const doctorDeptOptions = useMemo(
    () => toSortedOptions((realDoctors ?? []).map((d: any) => d.dept)),
    [realDoctors],
  );
  const doctorStatusOptions = useMemo(
    () => toSortedOptions((realDoctors ?? []).map((d: any) => d.status)),
    [realDoctors],
  );
  const doctorNameOptions = useMemo<SelectOption[]>(
    () => toNameIdOptions((realDoctors ?? []) as { id: string; name?: string | null }[]),
    [realDoctors],
  );

  const staffDeptOptions = useMemo(
    () => toSortedOptions((realStaff ?? []).map((s: any) => s.dept)),
    [realStaff],
  );
  const staffStatusOptions = useMemo(
    () => toSortedOptions((realStaff ?? []).map((s: any) => s.status)),
    [realStaff],
  );
  const staffNameOptions = useMemo<SelectOption[]>(
    () => toNameIdOptions((realStaff ?? []) as { id: string; name?: string | null }[]),
    [realStaff],
  );

  // Appointment status is derived from the appointments actually loaded for
  // the selected day/branch (not the full fixed workflow enum), so a quiet
  // day can show fewer options -- that tradeoff was a deliberate choice.
  const appointmentStatusOptions = useMemo(
    () => toSortedOptions((realAppointments ?? []).map((a: any) => a.status)),
    [realAppointments],
  );

  const doctorFilterFields: FilterField[] = [
    {
      id: "name",
      label: "Doctor Name",
      type: "combobox",
      placeholder: "Search by name or ID",
      options: doctorNameOptions,
      matchKeys: ["name", "id"],
    },
    { id: "dept", label: "Department", type: "multiselect", options: doctorDeptOptions },
    { id: "branch", label: "Branch", type: "multiselect", options: branchFilterOptions, compact: true },
    { id: "status", label: "Status", type: "multiselect", options: doctorStatusOptions },
  ];

  const staffFilterFields: FilterField[] = [
    {
      id: "name",
      label: "Staff Name",
      type: "combobox",
      placeholder: "Search by name or ID",
      options: staffNameOptions,
      matchKeys: ["name", "id"],
    },
    { id: "dept", label: "Department", type: "multiselect", options: staffDeptOptions },
    { id: "branch", label: "Branch", type: "multiselect", options: branchFilterOptions, compact: true },
    { id: "status", label: "Status", type: "multiselect", options: staffStatusOptions },
  ];

  const appointmentFilterFields: FilterField[] = [
    { id: "patientName", label: "Patient Name", type: "text", placeholder: "Search by name" },
    { id: "doctorName", label: "Doctor Name", type: "text", placeholder: "Search by doctor" },
    { id: "reason", label: "Reason", type: "text", placeholder: "Search reason" },
    { id: "status", label: "Status", type: "multiselect", options: appointmentStatusOptions },
  ];

  const activeFilterFields =
    activeTab === "staff" ? staffFilterFields :
    activeTab === "appointments" ? appointmentFilterFields :
    doctorFilterFields;

  return { doctorFilterFields, staffFilterFields, appointmentFilterFields, activeFilterFields };
}
