import { useMemo } from "react";
import type { FilterField, SelectOption } from "./types";
import { toSortedOptions, isMultiBranchUser } from "./utils";

export interface AppointmentFilterRow {
  id?: string;
  tokenId?: string;
  patient?: string;
  patientId?: string;
  doctor?: string;
  doctorId?: string;
  branch?: string | null;
  status?: string | null;
  visitType?: string | null;
  [key: string]: any;
}

interface UseAppointmentFiltersParams {
  appointmentRows: AppointmentFilterRow[];
  filterValues?: Record<string, any>;
}

interface UseAppointmentFiltersResult {
  appointmentFilterFields: FilterField[];
}

export function useAppointmentFilters({
  appointmentRows,
  filterValues,
}: UseAppointmentFiltersParams): UseAppointmentFiltersResult {
  const showBranch = isMultiBranchUser();

  const patientOptions = useMemo<SelectOption[]>(() => {
    const seen = new Set<string>();
    const res: SelectOption[] = [];
    appointmentRows.forEach((a) => {
      const key = a.patientId || a.patient;
      if (key && !seen.has(key)) {
        seen.add(key);
        const name = String(a.patient || "").trim();
        const id = String(a.patientId || "").trim();
        res.push({
          label: name || id,
          sublabel: name && id && name !== id ? id : undefined,
          value: id || name,
        });
      }
    });
    res.sort((a, b) => a.label.localeCompare(b.label));
    return res;
  }, [appointmentRows]);

  const doctorOptions = useMemo<SelectOption[]>(() => {
    const seen = new Set<string>();
    const res: SelectOption[] = [];
    appointmentRows.forEach((a) => {
      const key = a.doctorId || a.doctor;
      if (key && key !== "—" && !seen.has(key)) {
        seen.add(key);
        const name = String(a.doctor || "").trim();
        const id = String(a.doctorId || "").trim();
        res.push({
          label: name || id,
          sublabel: name && id && name !== id && id !== "—" ? id : undefined,
          value: id && id !== "—" ? id : name,
        });
      }
    });
    res.sort((a, b) => a.label.localeCompare(b.label));
    return res;
  }, [appointmentRows]);

  const branchOptions = useMemo(
    () => toSortedOptions(appointmentRows.map((a) => a.branch)),
    [appointmentRows],
  );

  const statusOptions = useMemo(
    () => toSortedOptions(appointmentRows.map((a) => a.status)),
    [appointmentRows],
  );

  const visitTypeOptions = useMemo(
    () => toSortedOptions(appointmentRows.map((a) => a.visitType)),
    [appointmentRows],
  );

  const appointmentNoOptions = useMemo(
    () => toSortedOptions(appointmentRows.map((a) => a.id)),
    [appointmentRows],
  );

  const selectedDoctors = Array.isArray(filterValues?.doctor)
    ? filterValues.doctor
    : filterValues?.doctor
      ? [filterValues.doctor]
      : [];
  const isSingleDoctorSelected = selectedDoctors.length === 1;
  const selectedDoc = isSingleDoctorSelected ? String(selectedDoctors[0]) : null;

  const tokenOptions = useMemo(() => {
    if (!selectedDoc) return [];
    const pool = appointmentRows.filter(
      (a) => String(a.doctorId) === selectedDoc || String(a.doctor) === selectedDoc,
    );
    return toSortedOptions(pool.map((a) => a.tokenId).filter((t) => t && t !== "—"));
  }, [appointmentRows, selectedDoc]);

  const appointmentFilterFields: FilterField[] = [
    {
      id: "patient",
      label: "Patient Name / ID",
      type: "multiselect",
      placeholder: "Search patient name or ID",
      options: patientOptions,
      matchKeys: ["patient", "patientId"],
      compact: true,
    },
    {
      id: "doctor",
      label: "Doctor Name / ID",
      type: "multiselect",
      placeholder: "Search doctor name or ID",
      options: doctorOptions,
      matchKeys: ["doctor", "doctorId"],
      compact: true,
    },
    {
      id: "tokenId",
      label: "Token ID",
      type: "multiselect",
      placeholder: isSingleDoctorSelected ? "Select Token ID" : "Select a doctor first",
      options: tokenOptions,
      disabled: !isSingleDoctorSelected,
      compact: true,
    },
    {
      id: "visitType",
      label: "Visit Type",
      type: "multiselect",
      placeholder: "Select visit type",
      options: visitTypeOptions,
      compact: true,
    },
    {
      id: "id",
      label: "Appointment No",
      type: "multiselect",
      placeholder: "Select appointment no",
      options: appointmentNoOptions,
      compact: true,
    },
    ...(showBranch
      ? [
          {
            id: "branch",
            label: "Branch",
            type: "multiselect" as const,
            placeholder: "Select branch",
            options: branchOptions,
            compact: true,
          },
        ]
      : []),
    {
      id: "status",
      label: "Status",
      type: "multiselect",
      placeholder: "Select status",
      options: statusOptions,
      compact: true,
    },
  ];

  return { appointmentFilterFields };
}
