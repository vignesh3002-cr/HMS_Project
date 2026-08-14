import { useMemo } from "react";
import type { FilterField } from "./types";
import { toSortedOptions } from "./utils";

interface AppointmentFilterRow {
  branch?: string | null;
  status?: string | null;
}

interface UseAppointmentFiltersParams {
  appointmentRows: AppointmentFilterRow[];
}

interface UseAppointmentFiltersResult {
  appointmentFilterFields: FilterField[];
}

// Appointments.tsx's filter field definitions, moved here so Filter/ is the
// single source of truth for what the Appointments page's Filter popover
// shows. Branch and Status options are the distinct values actually present
// among the appointments currently loaded, same as before this extraction.
export function useAppointmentFilters({
  appointmentRows,
}: UseAppointmentFiltersParams): UseAppointmentFiltersResult {
  const branchOptions = useMemo(
    () => toSortedOptions(appointmentRows.map((a) => a.branch)),
    [appointmentRows],
  );
  const statusOptions = useMemo(
    () => toSortedOptions(appointmentRows.map((a) => a.status)),
    [appointmentRows],
  );

  const appointmentFilterFields: FilterField[] = [
    { id: "patient", label: "Patient Name", type: "text", placeholder: "Search by name" },
    { id: "patientId", label: "Patient ID", type: "text", placeholder: "Enter ID" },
    { id: "date", label: "Appointment Date", type: "text", placeholder: "Enter date" },
    { id: "branch", label: "Branch", type: "multiselect", options: branchOptions },
    { id: "doctor", label: "Doctor Name", type: "text", placeholder: "Search by doctor" },
    { id: "status", label: "Status", type: "multiselect", options: statusOptions },
  ];

  return { appointmentFilterFields };
}
