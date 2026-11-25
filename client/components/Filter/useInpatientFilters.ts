import { useMemo } from "react";
import type { FilterField, SelectOption } from "./types";
import { toSortedOptions, isMultiBranchUser } from "./utils";
import type { AdmissionRecord, WardRecord } from "@/api/ipd.api";

interface UseInpatientFiltersParams {
  admissions: AdmissionRecord[];
  wards: WardRecord[];
  filterValues?: Record<string, any>;
}

interface UseInpatientFiltersResult {
  inpatientFilterFields: FilterField[];
}

export function useInpatientFilters({
  admissions,
  wards,
  filterValues,
}: UseInpatientFiltersParams): UseInpatientFiltersResult {
  const showBranch = isMultiBranchUser();

  // IP Number options
  const ipOptions = useMemo<SelectOption[]>(() => {
    const seen = new Set<string>();
    const res: SelectOption[] = [];
    admissions.forEach((a) => {
      if (a.ip_number && !seen.has(a.ip_number)) {
        seen.add(a.ip_number);
        res.push({ label: a.ip_number, value: a.ip_number });
      }
    });
    res.sort((a, b) => a.label.localeCompare(b.label));
    return res;
  }, [admissions]);

  // Patient Name / ID options
  const patientOptions = useMemo<SelectOption[]>(() => {
    const seen = new Set<string>();
    const res: SelectOption[] = [];
    admissions.forEach((a) => {
      const pid = a.patient_id;
      if (pid && !seen.has(pid)) {
        seen.add(pid);
        const p = a.patient_bio_data;
        const name = [p?.patient_first_name, p?.patient_middle_name, p?.patient_last_name]
          .filter(Boolean)
          .join(" ")
          .trim();
        res.push({
          label: name || pid,
          sublabel: name && name !== pid ? pid : undefined,
          value: pid,
        });
      }
    });
    res.sort((a, b) => a.label.localeCompare(b.label));
    return res;
  }, [admissions]);

  // Branch options
  const branchOptions = useMemo<SelectOption[]>(() => {
    const map = new Map<string, string>();
    admissions.forEach((a) => {
      if (a.branch_id && a.branch?.branch_name) {
        map.set(a.branch_id, a.branch.branch_name);
      }
    });
    return Array.from(map.entries())
      .map(([value, label]) => ({ label, value }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [admissions]);

  // Selected branches from draft filterValues
  const selectedBranches = useMemo<string[]>(() => {
    const val = filterValues?.branch;
    if (Array.isArray(val)) return val.map(String);
    if (typeof val === "string" && val) return [val];
    return [];
  }, [filterValues?.branch]);

  // Selected wards from draft filterValues
  const selectedWards = useMemo<string[]>(() => {
    const val = filterValues?.wardId;
    if (Array.isArray(val)) return val.map(String);
    if (typeof val === "string" && val) return [val];
    return [];
  }, [filterValues?.wardId]);

  // Ward options - filtered by selected branch if branch selected
  const wardOptions = useMemo<SelectOption[]>(() => {
    const branchFilteredWards = selectedBranches.length > 0
      ? wards.filter((w) => selectedBranches.includes(String(w.branch_id)))
      : wards;

    const seen = new Set<string>();
    const res: SelectOption[] = [];
    branchFilteredWards.forEach((w) => {
      if (w.ward_id && !seen.has(w.ward_id)) {
        seen.add(w.ward_id);
        res.push({ label: w.ward_name, value: w.ward_id });
      }
    });
    res.sort((a, b) => a.label.localeCompare(b.label));
    return res;
  }, [wards, selectedBranches]);

  // Bed options - filtered by selected branch and ward
  const bedOptions = useMemo<SelectOption[]>(() => {
    const seen = new Set<string>();
    const res: SelectOption[] = [];
    admissions.forEach((a) => {
      if (!a.bed_id || !a.bed_master?.bed_number) return;
      if (selectedBranches.length > 0 && !selectedBranches.includes(String(a.branch_id))) return;
      if (selectedWards.length > 0 && !selectedWards.includes(String(a.ward_id))) return;

      if (!seen.has(a.bed_id)) {
        seen.add(a.bed_id);
        const bedLabel = a.ward_master?.ward_name
          ? `${a.ward_master.ward_name} - ${a.bed_master.bed_number}`
          : `Bed ${a.bed_master.bed_number}`;
        res.push({ label: bedLabel, value: a.bed_id });
      }
    });
    res.sort((a, b) => a.label.localeCompare(b.label));
    return res;
  }, [admissions, selectedBranches, selectedWards]);

  // Primary Doctor options
  const primaryDoctorOptions = useMemo<SelectOption[]>(() => {
    const seen = new Set<string>();
    const res: SelectOption[] = [];
    admissions.forEach((a) => {
      const doc = a.employees;
      const id = a.employee_id || doc?.employee_id;
      if (id && !seen.has(id)) {
        seen.add(id);
        const name = doc
          ? `Dr. ${[doc.first_name, doc.middle_name, doc.last_name].filter(Boolean).join(" ").trim()}`
          : id;
        res.push({
          label: name,
          sublabel: doc && id !== name ? id : undefined,
          value: id,
        });
      }
    });
    res.sort((a, b) => a.label.localeCompare(b.label));
    return res;
  }, [admissions]);

  // Duty Doctor options
  const dutyDoctorOptions = useMemo<SelectOption[]>(() => {
    const seen = new Set<string>();
    const res: SelectOption[] = [];
    admissions.forEach((a) => {
      const doc = a.assigned_doctor;
      const id = a.current_assigned_doctor_id || doc?.employee_id;
      if (id && !seen.has(id)) {
        seen.add(id);
        const name = doc
          ? `Dr. ${[doc.first_name, doc.middle_name, doc.last_name].filter(Boolean).join(" ").trim()}`
          : id;
        res.push({
          label: name,
          sublabel: doc && id !== name ? id : undefined,
          value: id,
        });
      }
    });
    res.sort((a, b) => a.label.localeCompare(b.label));
    return res;
  }, [admissions]);

  // Duty Nurse options
  const dutyNurseOptions = useMemo<SelectOption[]>(() => {
    const seen = new Set<string>();
    const res: SelectOption[] = [];
    admissions.forEach((a) => {
      const nurse = a.assigned_nurse;
      const id = a.current_nurse_id || nurse?.employee_id;
      if (id && !seen.has(id)) {
        seen.add(id);
        const name = nurse
          ? [nurse.first_name, nurse.middle_name, nurse.last_name].filter(Boolean).join(" ").trim()
          : id;
        res.push({
          label: name,
          sublabel: nurse && id !== name ? id : undefined,
          value: id,
        });
      }
    });
    res.sort((a, b) => a.label.localeCompare(b.label));
    return res;
  }, [admissions]);

  const statusOptions: SelectOption[] = [
    { label: "Planned", value: "PLANNED" },
    { label: "Admitted", value: "ADMITTED" },
    { label: "Discharged", value: "DISCHARGED" },
    { label: "Cancelled", value: "CANCELLED" },
    { label: "No-Show", value: "NO_SHOW" },
  ];

  const inpatientFilterFields: FilterField[] = [
    {
      id: "ip_number",
      label: "IP No",
      type: "multiselect",
      placeholder: "Search IP number",
      options: ipOptions,
      compact: true,
    },
    {
      id: "patient",
      label: "Patient Name / ID",
      type: "multiselect",
      placeholder: "Search patient name or ID",
      options: patientOptions,
      matchKeys: ["patient_id", "patientName"],
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
            matchKeys: ["branch_id", "branchName"],
            compact: true,
          },
        ]
      : []),
    {
      id: "wardId",
      label: "Ward",
      type: "multiselect",
      placeholder: "Select ward",
      options: wardOptions,
      matchKeys: ["ward_id"],
      compact: true,
    },
    {
      id: "bedId",
      label: "Bed",
      type: "multiselect",
      placeholder: "Select bed",
      options: bedOptions,
      matchKeys: ["bed_id"],
      compact: true,
    },
    {
      id: "primaryDoctor",
      label: "Primary Doctor",
      type: "multiselect",
      placeholder: "Search doctor name or ID",
      options: primaryDoctorOptions,
      matchKeys: ["employee_id", "primaryDoctorName"],
      compact: true,
    },
    {
      id: "dutyDoctor",
      label: "Duty Doctor",
      type: "multiselect",
      placeholder: "Search doctor name or ID",
      options: dutyDoctorOptions,
      matchKeys: ["current_assigned_doctor_id", "dutyDoctorName"],
      compact: true,
    },
    {
      id: "dutyNurse",
      label: "Duty Nurse",
      type: "multiselect",
      placeholder: "Search nurse name or ID",
      options: dutyNurseOptions,
      matchKeys: ["current_nurse_id", "dutyNurseName"],
      compact: true,
    },
    {
      id: "status",
      label: "Status",
      type: "multiselect",
      placeholder: "Select status",
      options: statusOptions,
      compact: true,
    },
  ];

  return { inpatientFilterFields };
}
