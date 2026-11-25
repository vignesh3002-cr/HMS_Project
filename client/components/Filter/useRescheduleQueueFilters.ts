import { useMemo } from "react";
import type { FilterField, SelectOption } from "./types";
import { toSortedOptions, isMultiBranchUser } from "./utils";
import type { RescheduleQueueEntry } from "@/api/doctorTransfer.api";
import type { DoctorLeaveRecord } from "@/api/doctorLeave.api";
import type { EmployeeRecord } from "@/api/employee.api";

interface UseRescheduleQueueFiltersParams {
  entries: RescheduleQueueEntry[];
  leaveEntries: DoctorLeaveRecord[];
  doctors: EmployeeRecord[];
  branches: { branch_id?: string; branch_name?: string; name?: string; area?: string | null }[];
}

interface UseRescheduleQueueFiltersResult {
  queueFilterFields: FilterField[];
  leaveFilterFields: FilterField[];
}

export function useRescheduleQueueFilters({
  entries,
  leaveEntries,
  doctors,
  branches,
}: UseRescheduleQueueFiltersParams): UseRescheduleQueueFiltersResult {
  const showBranch = isMultiBranchUser();

  // Patient options from transfer queue entries
  const patientOptions = useMemo<SelectOption[]>(() => {
    const seen = new Set<string>();
    const res: SelectOption[] = [];
    entries.forEach((e) => {
      const pid = e.patient_id;
      if (pid && !seen.has(pid)) {
        seen.add(pid);
        const p = e.patient_bio_data;
        const name = [p?.patient_first_name, p?.patient_last_name].filter(Boolean).join(" ").trim();
        res.push({
          label: name || pid,
          sublabel: name && name !== pid ? pid : undefined,
          value: pid,
        });
      }
    });
    res.sort((a, b) => a.label.localeCompare(b.label));
    return res;
  }, [entries]);

  // Doctor options from doctors directory
  const doctorOptions = useMemo<SelectOption[]>(() => {
    const seen = new Set<string>();
    const res: SelectOption[] = [];
    doctors.forEach((d) => {
      const id = d.employee_id;
      if (id && !seen.has(id)) {
        seen.add(id);
        const name = `Dr. ${[d.first_name, d.middle_name, d.last_name].filter(Boolean).join(" ").trim()}`;
        res.push({
          label: name,
          sublabel: id,
          value: id,
        });
      }
    });
    res.sort((a, b) => a.label.localeCompare(b.label));
    return res;
  }, [doctors]);

  // Branch options
  const branchOptions = useMemo<SelectOption[]>(() => {
    return branches.map((b) => {
      const name = b.branch_name || b.name || "";
      const val = b.branch_id || name;
      return {
        label: b.area && b.area !== "N/A" ? `${name} (${b.area})` : name,
        value: val,
      };
    });
  }, [branches]);

  const queueStatusOptions: SelectOption[] = [
    { label: "Pending", value: "PENDING" },
    { label: "Assigned", value: "ASSIGNED" },
    { label: "Confirmed", value: "CONFIRMED" },
    { label: "Cancelled", value: "CANCELLED" },
  ];

  const priorityOptions: SelectOption[] = [
    { label: "Normal", value: "NORMAL" },
    { label: "High", value: "HIGH" },
    { label: "Urgent", value: "URGENT" },
  ];

  const leaveStatusOptions: SelectOption[] = [
    { label: "Pending", value: "PENDING" },
    { label: "Approved", value: "APPROVED" },
    { label: "Rejected", value: "REJECTED" },
  ];

  const queueFilterFields: FilterField[] = [
    {
      id: "patient",
      label: "Patient Name / ID",
      type: "multiselect",
      placeholder: "Search patient name or ID",
      options: patientOptions,
      matchKeys: ["patient_id", "patientName"],
      compact: true,
    },
    {
      id: "doctor",
      label: "Doctor Name / ID",
      type: "multiselect",
      placeholder: "Search doctor name or ID",
      options: doctorOptions,
      matchKeys: ["employee_id", "assigned_employee_id"],
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
            matchKeys: ["branch_id"],
            compact: true,
          },
        ]
      : []),
    {
      id: "status",
      label: "Status",
      type: "multiselect",
      placeholder: "Select status",
      options: queueStatusOptions,
      compact: true,
    },
    {
      id: "priority",
      label: "Priority",
      type: "multiselect",
      placeholder: "Select priority",
      options: priorityOptions,
      compact: true,
    },
  ];

  const leaveFilterFields: FilterField[] = [
    {
      id: "doctor",
      label: "Doctor Name / ID",
      type: "multiselect",
      placeholder: "Search doctor name or ID",
      options: doctorOptions,
      matchKeys: ["employee_id"],
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
            matchKeys: ["branch_id"],
            compact: true,
          },
        ]
      : []),
    {
      id: "status",
      label: "Status",
      type: "multiselect",
      placeholder: "Select status",
      options: leaveStatusOptions,
      compact: true,
    },
  ];

  return { queueFilterFields, leaveFilterFields };
}
