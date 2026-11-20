import { useMemo } from "react";
import type { FilterField, SelectOption } from "./types";
import { toNameIdOptions, toSortedOptions } from "./utils";

interface PatientFilterRow {
  id: string;
  name: string;
  status?: string | null;
}

interface UsePatientFiltersParams {
  viewMode: "list" | "grid";
  patientRows: PatientFilterRow[];
}

interface UsePatientFiltersResult {
  patientFilterFields: FilterField[];
}

// Patients.tsx's filter field definitions, moved here so Filter/ is the
// single source of truth for what the Patients page's Filter popover shows.
// Name/ID is one searchable combobox (matches Staff.tsx/Doctor.tsx/
// Dashboard.tsx). List and grid view show slightly different remaining
// fields (Diagnosis/Doctor vs Blood Group), same as before this extraction.
// Status options are derived from the real patients passed in rather than a
// fixed list.
const BLOOD_GROUP_OPTIONS: SelectOption[] = [
  { label: "A+", value: "A+" },
  { label: "A-", value: "A-" },
  { label: "B+", value: "B+" },
  { label: "B-", value: "B-" },
  { label: "AB+", value: "AB+" },
  { label: "AB-", value: "AB-" },
  { label: "O+", value: "O+" },
  { label: "O-", value: "O-" },
];

export function usePatientFilters({ viewMode, patientRows }: UsePatientFiltersParams): UsePatientFiltersResult {
  const nameOptions = useMemo<SelectOption[]>(() => toNameIdOptions(patientRows), [patientRows]);
  const statusOptions = useMemo(() => toSortedOptions(patientRows.map((p) => p.status)), [patientRows]);

  const nameField: FilterField = {
    id: "name",
    label: "Patient Name / ID",
    type: "multiselect",
    placeholder: "Search by name or ID",
    options: nameOptions,
    matchKeys: ["name", "id"],
    compact: true,
  };

  const bloodGroupField: FilterField = {
    id: "bloodGroup",
    label: "Blood Group",
    type: "multiselect",
    options: BLOOD_GROUP_OPTIONS,
    compact: true,
  };

  const statusField: FilterField = {
    id: "status",
    label: "Status",
    type: "multiselect",
    options: statusOptions,
    defaultValue: ["Active"],
  };

  const priorityField: FilterField = {
    id: "priority",
    label: "Priority",
    type: "multiselect",
    options: [{ label: "Critical Only", value: "critical" }],
    compact: true,
  };

  const listFilterFields: FilterField[] = [
    nameField,
    bloodGroupField,
    { id: "diagnose", label: "Diagnosis", type: "text", placeholder: "Search diagnosis" },
    { id: "doctor", label: "Assigned Doctor", type: "text", placeholder: "Search doctor" },
    priorityField,
    statusField,
  ];

  const gridFilterFields: FilterField[] = [
    nameField,
    bloodGroupField,
    priorityField,
    statusField,
  ];

  return { patientFilterFields: viewMode === "grid" ? gridFilterFields : listFilterFields };
}
