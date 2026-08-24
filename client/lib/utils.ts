import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Filters a user's branch mapping list down to their REAL, current
 * assignments: only status 1 (active) rows, deduplicated by branch_id.
 * Historical/deactivated mappings (status 0) and duplicate active rows
 * left behind by transfer cycles must never render as assigned branches.
 */
export function activeBranches<T extends { branch_id: string; status?: number }>(
  branches: T[] | null | undefined,
): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const b of branches ?? []) {
    if (b.status !== undefined && b.status !== 1) continue;
    if (seen.has(b.branch_id)) continue;
    seen.add(b.branch_id);
    result.push(b);
  }
  return result;
}
