import { useMemo } from "react";
import type { FilterField, SelectOption } from "./types";
import { toSortedOptions } from "./utils";

export interface ProtocolFilterRow {
  protocol_id: string;
  name: string;
  cancer_type: string;
  status: string;
  intent: string;
  [key: string]: any;
}

interface UseProtocolFiltersParams {
  protocolRows: readonly ProtocolFilterRow[];
}

interface UseProtocolFiltersResult {
  protocolFilterFields: FilterField[];
}

export function useProtocolFilters({
  protocolRows,
}: UseProtocolFiltersParams): UseProtocolFiltersResult {
  const protocolOptions = useMemo<SelectOption[]>(() => {
    const seen = new Set<string>();
    const res: SelectOption[] = [];
    protocolRows.forEach((r) => {
      const id = r.protocol_id;
      if (id && !seen.has(id)) {
        seen.add(id);
        const name = String(r.name || "").trim();
        res.push({
          label: name || id,
          sublabel: name && name !== id ? id : undefined,
          value: id,
        });
      }
    });
    res.sort((a, b) => a.label.localeCompare(b.label));
    return res;
  }, [protocolRows]);

  const cancerOptions = useMemo(() => {
    const set = new Set<string>();
    protocolRows.forEach((r) => {
      if (r.cancer_type && r.cancer_type !== "—") {
        r.cancer_type.split(",").forEach((c) => {
          const trimmed = c.trim();
          if (trimmed) set.add(trimmed);
        });
      }
    });
    return Array.from(set).sort().map((c) => ({ label: c, value: c }));
  }, [protocolRows]);

  const intentOptions = useMemo(() => {
    const set = new Set<string>();
    protocolRows.forEach((r) => {
      if (r.intent && r.intent !== "—") {
        const trimmed = r.intent.trim();
        if (trimmed) set.add(trimmed);
      }
    });
    return Array.from(set).sort().map((i) => ({ label: i, value: i }));
  }, [protocolRows]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    protocolRows.forEach((r) => {
      if (r.status) set.add(r.status);
    });
    return Array.from(set).sort().map((s) => ({ label: s, value: s }));
  }, [protocolRows]);

  const protocolFilterFields: FilterField[] = [
    {
      id: "protocol",
      label: "Protocol Name / ID",
      type: "multiselect",
      placeholder: "Search protocol name or ID",
      options: protocolOptions,
      matchKeys: ["name", "protocol_id"],
      compact: true,
    },
    {
      id: "cancer_type",
      label: "Cancer Type",
      type: "multiselect",
      options: cancerOptions,
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
      id: "status",
      label: "Status",
      type: "multiselect",
      options: statusOptions,
      compact: true,
    },
  ];

  return { protocolFilterFields };
}
