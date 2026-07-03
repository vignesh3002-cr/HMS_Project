export function isFilterActive(values: Record<string, any>): boolean {
  return Object.values(values).some((val) => val !== undefined && val !== null && val !== "");
}

export function filterDataByValues<T extends Record<string, any>>(
  data: readonly T[],
  values: Record<string, any>,
): T[] {
  const activeFilters = Object.entries(values).filter(
    ([, val]) => val !== undefined && val !== null && val !== "" && !(Array.isArray(val) && val.length === 0),
  );

  if (activeFilters.length === 0) return [...data];

  return data.filter((item) =>
    activeFilters.every(([key, val]) => {
      const itemVal = String(item[key] ?? "").toLowerCase();

      if (Array.isArray(val)) {
        return val.some((v) => itemVal.includes(String(v).toLowerCase()));
      }

      const filterVal = String(val).toLowerCase();
      return itemVal.includes(filterVal);
    }),
  );
}
