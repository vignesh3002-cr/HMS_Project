import type { ScoreAssessment } from "./scoreEngine";

/* ------------------------------------------------------------------ */
/* Score change fingerprint                                           */
/* ------------------------------------------------------------------ */

/* Save compares the form's selections against the staging detail it was
   filled from to decide "nothing changed" (see formStateSignature in
   Diagnosis.tsx). That signature does not contain score assessments, so
   editing only a criterion used to look unchanged and was never persisted.

   This module builds a canonical fingerprint of everything the doctor can
   change by hand in a score: the variable inputs (raw value, numeric value
   and whether it was typed or auto-filled), the picked group, the note and
   the computed status. Derived totals/points are left out - they are
   recomputed from the inputs, so a formula change alone is not a change.

   Two equal fingerprints mean the recorded assessment is identical, which is
   what lets Save safely reuse the baseline row. */

type FingerprintValue = {
  raw: string;
  numeric: number | null;
  source: "auto" | "manual" | null;
};

type FingerprintEntry = {
  scoreId: string;
  values: Record<string, FingerprintValue>;
  selectedGroup: string | null;
  note: string;
  status: string;
};

const normalizeValue = (value: unknown): FingerprintValue => {
  const source = (value ?? {}) as Record<string, unknown>;
  return {
    raw: String(source.raw ?? "").trim(),
    numeric:
      typeof source.numeric === "number" && Number.isFinite(source.numeric)
        ? source.numeric
        : null,
    source:
      source.source === "auto" || source.source === "manual"
        ? source.source
        : null,
  };
};

const normalizeEntry = (entry: unknown): FingerprintEntry => {
  const source = (entry ?? {}) as Record<string, unknown>;
  const values: Record<string, FingerprintValue> = {};
  const rawValues =
    source.values && typeof source.values === "object"
      ? (source.values as Record<string, unknown>)
      : {};

  for (const key of Object.keys(rawValues).sort()) {
    const value = normalizeValue(rawValues[key]);
    /* Untouched variables are simply absent from the stored payload. */
    if (!value.raw && value.numeric === null && value.source === null) continue;
    values[key] = value;
  }

  return {
    scoreId: String(source.scoreId ?? ""),
    values,
    selectedGroup: source.selectedGroup ? String(source.selectedGroup) : null,
    note: String(source.note ?? "").trim(),
    status:
      source.status === "complete" || source.status === "not_applicable"
        ? source.status
        : "incomplete",
  };
};

const canonical = (entries: unknown[]): string =>
  JSON.stringify(
    entries
      .map(normalizeEntry)
      .filter((entry) => entry.scoreId.length > 0)
      .sort((a, b) => a.scoreId.localeCompare(b.scoreId))
  );

/* The fingerprint of the assessment currently on screen. */
export const scoreFingerprint = (
  entries: Array<{ assessment: ScoreAssessment; status: string }>
): string =>
  canonical(
    entries.map(({ assessment, status }) => ({
      ...assessment,
      status,
    }))
  );

/* The fingerprint of an assessment payload already stored on a staging
   detail. v2 ({ version: 2, scores: [...] } or a single score object) is
   comparable; the legacy variable map cannot be compared without the score
   definitions, so null forces a write (which also upgrades the row to v2).
   A row with no scores at all compares as empty. */
export const scoreFingerprintFromStored = (raw: unknown): string | null => {
  if (raw == null) return canonical([]);
  if (typeof raw !== "object" || Array.isArray(raw)) return null;

  const source = raw as Record<string, unknown>;

  if (Object.keys(source).length === 0) return canonical([]);
  if (Array.isArray(source.scores)) return canonical(source.scores);
  if (source.scoreId && source.values) return canonical([source]);

  return null;
};
