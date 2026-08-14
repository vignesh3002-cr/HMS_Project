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
export function usePatientFilters({ viewMode, patientRows }: UsePatientFiltersParams): UsePatientFiltersResult {
  const nameOptions = useMemo<SelectOption[]>(() => toNameIdOptions(patientRows), [patientRows]);
  const statusOptions = useMemo(() => toSortedOptions(patientRows.map((p) => p.status)), [patientRows]);

  const nameField: FilterField = {
    id: "name",
    label: "Patient Name / ID",
    type: "combobox",
    placeholder: "Search by name or ID",
    options: nameOptions,
    matchKeys: ["name", "id"],
  };

  const listFilterFields: FilterField[] = [
    nameField,
    { id: "diagnose", label: "Diagnosis", type: "text", placeholder: "Search diagnosis" },
    { id: "doctor", label: "Assigned Doctor", type: "text", placeholder: "Search doctor" },
    { id: "status", label: "Status", type: "multiselect", options: statusOptions },
  ];

  const gridFilterFields: FilterField[] = [
    nameField,
    { id: "bloodGroup", label: "Blood Group", type: "text", placeholder: "Search blood group" },
    { id: "status", label: "Status", type: "multiselect", options: statusOptions },
  ];

  return { patientFilterFields: viewMode === "grid" ? gridFilterFields : listFilterFields };
}
