import type { FilterField, SelectOption } from "./types";

export function isFilterActive(values: Record<string, any>): boolean {
  return Object.values(values).some((val) => val !== undefined && val !== null && val !== "");
}

// Distinct, sorted filter options straight from real row values -- e.g.
// `toSortedOptions(rows.map(r => r.dept))`. Keeps a filter's dropdown
// limited to values that actually occur in the currently loaded data,
// instead of a static list that can include values nothing will ever match
// (or omit real ones). `excludePlaceholder` filters out a page's own
// empty-value marker (e.g. "—") so it doesn't show up as an option.
export function toSortedOptions(values: (string | undefined | null)[], excludePlaceholder = "—"): SelectOption[] {
  const unique = Array.from(
    new Set(values.filter((v): v is string => !!v && v !== excludePlaceholder)),
  );
  unique.sort((a, b) => a.localeCompare(b));
  return unique.map((v) => ({ label: v, value: v }));
}

// Branch options in the one format every page's branch filter uses --
// "Name (Area)" when an area is set, otherwise just the name -- so the
// option value lines up with whatever each page's own branch-formatting
// helper (e.g. formatBranch()) already puts on each row.
export function toBranchOptions(branches: { name: string; area?: string | null }[]): SelectOption[] {
  return branches.map((b) => {
    const label = b.area && b.area !== "N/A" ? `${b.name} (${b.area})` : b.name;
    return { label, value: label };
  });
}

// Name+ID combobox options (the two-row "Name" / "ID" rows used by the
// Doctor/Staff Name filters). Falls back to showing the ID alone, with no
// sublabel, when a row's name is blank/whitespace-only -- otherwise that row
// renders as an empty line above the ID, which looks broken rather than like
// a real (if incompletely filled-in) record.
export function toNameIdOptions(rows: { id: string | number; name?: string | null }[]): SelectOption[] {
  return rows.map((row) => {
    const name = String(row.name ?? "").trim();
    return {
      label: name || String(row.id),
      value: row.id,
      sublabel: name ? String(row.id) : undefined,
    };
  });
}

// `fields` is optional -- pass the same FilterField[] shown in the panel so
// a field with `matchKeys` (e.g. a combined Name/ID search) matches any of
// those data keys instead of just its own `id`. Callers that don't pass it
// keep the original single-key behavior.
export function filterDataByValues<T extends Record<string, any>>(
  data: readonly T[],
  values: Record<string, any>,
  fields?: FilterField[],
): T[] {
  const activeFilters = Object.entries(values).filter(
    ([, val]) => val !== undefined && val !== null && val !== "" && !(Array.isArray(val) && val.length === 0),
  );

  if (activeFilters.length === 0) return [...data];

  const matchKeysById = new Map(fields?.map((f) => [f.id, f.matchKeys]) ?? []);

  return data.filter((item) =>
    activeFilters.every(([key, val]) => {
      const keysToCheck = matchKeysById.get(key) ?? [key];
      const itemVal = keysToCheck
        .map((k) => String(item[k] ?? ""))
        .join(" ")
        .toLowerCase();

      if (Array.isArray(val)) {
        return val.some((v) => itemVal.includes(String(v).toLowerCase()));
      }

      const filterVal = String(val).toLowerCase();
      return itemVal.includes(filterVal);
    }),
  );
}

// Combines the two steps every page repeats -- a free-text search across a
// few fields, then the applied filter-panel values -- into the one call a
// page needs to go from raw rows to filtered rows. Purely generic (works on
// any row shape), so any page can receive its filtered results straight
// from Filter/ instead of re-implementing this sequence inline.
export function applySearchAndFilter<T extends Record<string, any>>(
  data: readonly T[],
  searchQuery: string,
  searchableFields: string[],
  appliedValues: Record<string, any>,
  fields?: FilterField[],
): T[] {
  let result: T[] = [...data];

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter((item) =>
      searchableFields.some((field) => String(item[field] ?? "").toLowerCase().includes(q)),
    );
  }

  return filterDataByValues(result, appliedValues, fields);
}
