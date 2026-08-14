import { useMemo } from "react";
import type { FilterField } from "./types";

interface ScheduleDoctorRow {
  name: string;
  employeeId?: string;
}

interface UseScheduleFiltersParams {
  doctors: ScheduleDoctorRow[];
  idKey: string;
  valueField: "employeeId" | "name";
}

interface UseScheduleFiltersResult {
  doctorFilterFields: FilterField[];
}

// Shared by Day view.tsx and Week view.tsx -- both toolbars offer the exact
// same single "Doctor" multiselect, built from the real doctors currently
// on screen, differing only in which field identifies a doctor (Day view
// keys columns by employeeId, Week view dedupes rows by name).
export function useScheduleFilters({
  doctors,
  idKey,
  valueField,
}: UseScheduleFiltersParams): UseScheduleFiltersResult {
  const options = useMemo(
    () =>
      doctors.map((doc) => ({
        label: doc.name,
        value: valueField === "employeeId" ? doc.employeeId ?? doc.name : doc.name,
      })),
    [doctors, valueField],
  );

  const doctorFilterFields: FilterField[] = useMemo(
    () => [{ id: idKey, label: "Doctor", type: "multiselect", options }],
    [idKey, options],
  );

  return { doctorFilterFields };
}
