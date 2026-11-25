import { useEffect, useMemo, useState } from "react";
import type { FilterField, SelectOption } from "./types";
import { toSortedOptions, isMultiBranchUser } from "./utils";
import { getActiveBranchId } from "@/api/axios";
import { chemotherapyApi } from "@/api/chemotherapy.api";
import { usePermission } from "@/context/PermissionContext";
import { useBranches, useDoctors } from "@/hooks/useMasterData";

// The fields the Chemotherapy Orders page (OrderMaster.tsx) shows in its
// Filter popover. Kept here with the other page filters so Filter/ stays the
// single source of truth for what each page's popover offers.
export interface OrderFilterRow {
  patient_id?: string | null;
  patient_name?: string | null;
  protocol?: string | null;
  protocol_code?: string | null;
  intent?: string | null;
  branch?: string | null;
  oncologist?: string | null;
  /* cancer_type / cancer_subtype / cancer_stage combined into one string;
     the text filter matches any part of it. */
  diagnosis?: string | null;
  raw_status?: string | null;
  [key: string]: any;
}

interface UseOrderFiltersParams {
  orderRows: readonly OrderFilterRow[];
}

interface UseOrderFiltersResult {
  orderFilterFields: FilterField[];
}

/* The backend's standard intents (chemotherapy.repository.ts). Kept here as
   the always-available base list: the catalog endpoint requires
   chemo.protocol.read, which an Orders-only user may not have. */
export const TREATMENT_INTENTS = [
  "Curative",
  "Neoadjuvant",
  "Adjuvant",
  "Palliative",
  "Maintenance",
  "Neoadjuvant/Adjuvant",
  "Maintenance/Adjuvant",
];

/* Same "First Last" shape the page builds each row's oncologist from, so an
   option always matches the row it is meant to select. */
function doctorName(doctor: { first_name?: string | null; last_name?: string | null }): string {
  return [doctor.first_name, doctor.last_name].filter(Boolean).join(" ").trim();
}

const ORDER_STATUS_FILTER_OPTIONS: SelectOption[] = [
  { label: "Scheduled", value: "Scheduled" },
  { label: "In Progress", value: "In Progress" },
  { label: "Completed", value: "Completed" },
  { label: "Cancelled", value: "Cancelled" },
];

const CYCLE_ALERT_FILTER_OPTIONS: SelectOption[] = [
  { label: "Orders Due Today", value: "dueToday" },
  { label: "Delayed / Overdue", value: "delayed" },
];

export function useOrderFilters({
  orderRows,
}: UseOrderFiltersParams): UseOrderFiltersResult {
  const { can } = usePermission();
  const canReadProtocols = can("chemo.protocol.read");

  const { branches } = useBranches();
  const { doctors } = useDoctors(getActiveBranchId() ?? undefined);

  const [intentCatalog, setIntentCatalog] = useState<string[]>(TREATMENT_INTENTS);

  useEffect(() => {
    if (!canReadProtocols) return;
    let cancelled = false;
    chemotherapyApi
      .listTreatmentIntents()
      .then((res) => {
        const list = res.data?.data;
        if (!cancelled && Array.isArray(list) && list.length > 0) {
          setIntentCatalog(list);
        }
      })
      .catch(() => {
        // Keep the standard list; the dropdown must never end up empty.
      });
    return () => {
      cancelled = true;
    };
  }, [canReadProtocols]);

  const patientOptions = useMemo<SelectOption[]>(() => {
    const seen = new Set<string>();
    const res: SelectOption[] = [];
    orderRows.forEach((r) => {
      const pid = r.patient_id;
      if (pid && !seen.has(pid)) {
        seen.add(pid);
        const name = (r.patient_name || pid).trim();
        res.push({
          label: name || pid,
          sublabel: name && name !== pid ? pid : undefined,
          value: pid,
        });
      }
    });
    res.sort((a, b) => a.label.localeCompare(b.label));
    return res;
  }, [orderRows]);

  const protocolOptions = useMemo<SelectOption[]>(() => {
    const seen = new Set<string>();
    const res: SelectOption[] = [];
    orderRows.forEach((r) => {
      const proto = r.protocol;
      const code = r.protocol_code;
      const key = proto || code;
      if (key && !seen.has(key)) {
        seen.add(key);
        res.push({
          label: proto || code,
          sublabel: proto && code && proto !== code ? code : undefined,
          value: key,
        });
      }
    });
    res.sort((a, b) => a.label.localeCompare(b.label));
    return res;
  }, [orderRows]);

  const intentOptions = useMemo(
    () => toSortedOptions([...intentCatalog, ...orderRows.map((row) => row.intent)]),
    [intentCatalog, orderRows],
  );
  const branchOptions = useMemo(
    () =>
      toSortedOptions([
        ...branches.map((branch) => branch.branch_name),
        ...orderRows.map((row) => row.branch),
      ]),
    [branches, orderRows],
  );
  const oncologistOptions = useMemo(
    () =>
      toSortedOptions([
        ...doctors.map(doctorName),
        ...orderRows.map((row) => row.oncologist),
      ]),
    [doctors, orderRows],
  );

  const orderFilterFields = useMemo<FilterField[]>(
    () => [
      {
        id: "patient",
        label: "Patient Name / ID",
        type: "multiselect",
        placeholder: "Search patient name or ID",
        options: patientOptions,
        matchKeys: ["patient_name", "patient_id"],
        compact: true,
      },
      {
        id: "protocol",
        label: "Protocol Name / Code",
        type: "multiselect",
        placeholder: "Search protocol",
        options: protocolOptions,
        matchKeys: ["protocol", "protocol_code"],
        compact: true,
      },
      ...(isMultiBranchUser()
        ? [
            {
              id: "branch",
              label: "Branch",
              type: "multiselect" as const,
              options: branchOptions,
              matchKeys: ["branch"],
              compact: true,
            },
          ]
        : []),
      {
        id: "oncologist",
        label: "Oncologist",
        type: "multiselect",
        options: oncologistOptions,
        matchKeys: ["oncologist"],
        compact: true,
      },
      {
        id: "intent",
        label: "Treatment Intent",
        type: "multiselect",
        options: intentOptions,
        compact: true,
      },
      {
        id: "diagnosis",
        label: "Diagnosis",
        type: "text",
        placeholder: "Cancer type, subtype or stage",
        matchKeys: ["diagnosis"],
      },
      {
        id: "status",
        label: "Status",
        type: "multiselect",
        options: ORDER_STATUS_FILTER_OPTIONS,
        compact: true,
      },
      {
        id: "cycleAlert",
        label: "Cycle Alerts",
        type: "multiselect",
        options: CYCLE_ALERT_FILTER_OPTIONS,
        compact: true,
      },
    ],
    [patientOptions, protocolOptions, branchOptions, oncologistOptions, intentOptions],
  );

  return { orderFilterFields };
}
