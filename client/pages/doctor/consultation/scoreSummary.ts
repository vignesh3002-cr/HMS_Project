/* Persisted score summaries, cross-visit history, pre-save validation and a
   deterministic one-line interpretation. Kept pure so the Summary printout,
   the workspace history panel and the CSV export all agree. */

import {
  methodLabel,
  type ScoreDefinition,
  type ScoreEvaluation,
  type ScoreMethod,
  type VariableValue,
} from "./scoreEngine";

export type StoredScoreSummary = {
  scoreId: string;
  name: string;
  method: string | null;
  methodLabel: string | null;
  total: number | null;
  totalLabel: string | null;
  group: string | null;
  status: "complete" | "incomplete" | "not_applicable";
  note: string;
  summary: string;
  updatedAt: string | null;
  values: Record<string, VariableValue>;
};

export type ScoreHistoryEntry = StoredScoreSummary & {
  date: string | null;
  stagingDetailId: string;
};

export type ScoreHistory = Record<string, ScoreHistoryEntry[]>;

export type ScoreWarning = {
  severity: "error" | "warning";
  scoreId: string;
  name: string;
  message: string;
};

const asMethodLabel = (method: string | null): string | null => {
  if (!method) return null;
  return methodLabel(method as ScoreMethod);
};

const resultText = (
  total: number | null,
  totalLabel: string | null,
  group: string | null
): string => {
  const parts: string[] = [];
  if (total != null) parts.push(formatScoreNumber(total));
  else if (totalLabel) parts.push(totalLabel);
  if (group) parts.push(group);
  return parts.join(" - ");
};

/* Trim binary noise without turning 10 into 1 (a whole number has no
   fractional part to strip). */
export const formatScoreNumber = (value: number | null): string => {
  if (value == null) return "";
  if (Number.isInteger(value)) return String(value);
  const text = String(Math.round(value * 10000) / 10000);
  return text.includes(".")
    ? text.replace(/0+$/, "").replace(/\.$/, "")
    : text;
};

const valuesOf = (raw: unknown): Record<string, VariableValue> => {
  if (!raw || typeof raw !== "object") return {};
  const source = raw as Record<string, unknown>;
  const values: Record<string, VariableValue> = {};
  for (const [key, item] of Object.entries(source)) {
    if (!item || typeof item !== "object") continue;
    const value = item as Record<string, unknown>;
    values[key] = {
      raw: String(value.raw ?? value.source_value ?? value.selected_criterion ?? ""),
      numeric: typeof value.numeric === "number" ? value.numeric : null,
      points: typeof value.points === "number" ? value.points : null,
      source:
        value.source === "auto" || value.source === "manual"
          ? value.source
          : null,
      autoSource:
        typeof value.autoSource === "string" ? value.autoSource : undefined,
      reason: typeof value.reason === "string" ? value.reason : undefined,
    };
  }
  return values;
};

/* Read the v2 payload ({ version: 2, scores: [...] }) or a legacy
   single-score map, using the staging-detail columns as a fallback. */
export const readStoredScores = (
  raw: unknown,
  fallback?: {
    scoreId?: string | null;
    name?: string | null;
    total?: number | null;
    group?: string | null;
    summary?: string | null;
  }
): StoredScoreSummary[] => {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const source = raw as Record<string, unknown>;
    const list = Array.isArray(source.scores)
      ? (source.scores as Record<string, unknown>[])
      : source.scoreId
        ? [source]
        : null;

    if (list) {
      return list
        .filter((item) => item && typeof item === "object")
        .map((item) => {
          /* Older v2 saves only stored the values and status; the staging
             detail's scalar columns hold the one score's result. */
          const single = list.length === 1 ? fallback : undefined;
          const scoreId = String(item.scoreId ?? "");
          const method = item.method ? String(item.method) : null;
          const total =
            typeof item.total === "number"
              ? item.total
              : single?.total ?? null;
          const totalLabel = item.totalLabel ? String(item.totalLabel) : null;
          const group = item.group
            ? String(item.group)
            : single?.group ?? null;
          const status: StoredScoreSummary["status"] =
            item.status === "complete" || item.status === "not_applicable"
              ? item.status
              : "incomplete";
          const values = valuesOf(item.values);
          const summary =
            typeof item.summary === "string" && item.summary.trim()
              ? item.summary
              : single?.summary?.trim() ||
                resultText(total, totalLabel, group);
          return {
            scoreId,
            name: String(item.name ?? single?.name ?? scoreId),
            method,
            methodLabel: item.methodLabel
              ? String(item.methodLabel)
              : asMethodLabel(method),
            total,
            totalLabel,
            group,
            status,
            note: String(item.note ?? ""),
            summary,
            updatedAt: item.updatedAt ? String(item.updatedAt) : null,
            values,
          };
        })
        .filter((item) => item.scoreId);
    }
  }

  /* Legacy single-score map: only the scalar columns know the result. */
  if (
    fallback &&
    (fallback.total != null || fallback.group || fallback.summary)
  ) {
    return [
      {
        scoreId: fallback.scoreId ?? "legacy",
        name: fallback.name?.trim() || fallback.scoreId || "Score",
        method: null,
        methodLabel: null,
        total: fallback.total ?? null,
        totalLabel: null,
        group: fallback.group ?? null,
        status: "complete",
        note: "",
        summary:
          fallback.summary?.trim() ||
          resultText(fallback.total ?? null, null, fallback.group ?? null),
        updatedAt: null,
        values: {},
      },
    ];
  }

  return [];
};

/* Every visit that recorded any score, grouped by score id, newest first. */
export const readScoreHistory = (rows: unknown[]): ScoreHistory => {
  const history: ScoreHistory = {};
  for (const raw of rows) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const stagingDetailId = String(
      row.staging_detail_id ?? row.id ?? row.encounter_no ?? ""
    );
    if (!stagingDetailId) continue;
    const dateValue =
      row.visit_date ?? row.diagnosis_date ?? row.created_at ?? row.updated_at;
    const date = dateValue ? String(dateValue) : null;

    const scores = readStoredScores(row.score_variables ?? null, {
      scoreId: String(row.score ?? ""),
      name: String(row.score ?? ""),
      total: typeof row.score_points === "number" ? row.score_points : null,
      group: row.risk_group ? String(row.risk_group) : null,
      summary: row.score_result ? String(row.score_result) : null,
    });

    for (const score of scores) {
      if (!score.scoreId || score.scoreId === "legacy") continue;
      const entry: ScoreHistoryEntry = {
        ...score,
        date,
        stagingDetailId,
      };
      const list = history[score.scoreId] ?? [];
      if (!list.some((item) => item.stagingDetailId === stagingDetailId)) {
        list.push(entry);
      }
      history[score.scoreId] = list;
    }
  }

  for (const scoreId of Object.keys(history)) {
    history[scoreId].sort((a, b) =>
      String(b.date ?? "").localeCompare(String(a.date ?? ""))
    );
  }
  return history;
};

/* The most recent visit before the one being recorded now. */
export const previousScoreEntry = (
  history: ScoreHistory,
  scoreId: string,
  currentStagingDetailId?: string | null
): ScoreHistoryEntry | null => {
  const list = history[scoreId] ?? [];
  return (
    list.find(
      (entry) => !currentStagingDetailId || entry.stagingDetailId !== currentStagingDetailId
    ) ?? null
  );
};

export const scoreDelta = (
  current: number | null,
  previous: number | null
): number | null => {
  if (current == null || previous == null) return null;
  return Math.round((current - previous) * 100) / 100;
};

/* Warnings shown before saving a visit's scores. */
export const scoreWarnings = (
  entries: {
    definition: ScoreDefinition;
    evaluation: ScoreEvaluation;
  }[]
): ScoreWarning[] => {
  const warnings: ScoreWarning[] = [];
  for (const entry of entries) {
    const { definition, evaluation } = entry;
    if (evaluation.status === "not_applicable") continue;

    if (evaluation.errors.length > 0) {
      warnings.push({
        severity: "error",
        scoreId: definition.scoreId,
        name: definition.name,
        message: `${definition.name}: ${evaluation.errors.join(" ")}`,
      });
    }
    if (evaluation.status === "incomplete") {
      const missing = evaluation.missing.slice(0, 4);
      warnings.push({
        severity: "warning",
        scoreId: definition.scoreId,
        name: definition.name,
        message:
          missing.length > 0
            ? `${definition.name}: still needs ${missing.join(", ")}${
                evaluation.missing.length > 4
                  ? ` +${evaluation.missing.length - 4} more`
                  : ""
              }.`
            : `${definition.name}: no risk group assigned yet.`,
      });
    }
  }
  return warnings;
};

/* Human result line used by the card header, history panel and printout. */
export const scoreResultText = (
  total: number | null,
  totalLabel: string | null,
  group: string | null
): string => resultText(total, totalLabel, group);

/* "+2" / "-1" for the previous-visit comparison; null when not comparable. */
export const scoreDeltaText = (delta: number | null): string | null => {
  if (delta == null) return null;
  if (delta === 0) return "no change";
  return `${delta > 0 ? "+" : ""}${delta}`;
};

/* A deterministic one-line impression the doctor can add to the note. */
export const scoreInterpretation = (
  definition: ScoreDefinition,
  evaluation: ScoreEvaluation
): string => {
  if (evaluation.status === "not_applicable") {
    return `${definition.name}: not applicable for this patient.`;
  }
  let text = definition.name;
  if (evaluation.total != null) {
    text += ` ${formatScoreNumber(evaluation.total)}`;
  }
  if (evaluation.groupLabel) {
    text +=
      evaluation.total != null
        ? `, ${evaluation.groupLabel}`
        : `: ${evaluation.groupLabel}`;
  }
  if (text === definition.name) {
    return `${definition.name}: not yet scored.`;
  }
  if (evaluation.groupReason && !evaluation.groupReason.startsWith("Selected")) {
    text += ` (${evaluation.groupReason.toLowerCase()})`;
  }
  return `${text}.`;
};

const csvCell = (value: unknown): string => {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/* Research/audit export of every recorded score across visits. */
export const scoresToCsv = (history: ScoreHistory): string => {
  const rows: (string | number | null)[][] = [
    ["Score", "Method", "Visit date", "Total", "Risk group", "Status", "Note"],
  ];
  const flat = Object.values(history)
    .flat()
    .sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")));
  for (const entry of flat) {
    rows.push([
      entry.name,
      entry.methodLabel ?? entry.method ?? "",
      entry.date ? entry.date.slice(0, 10) : "",
      entry.total,
      entry.group ?? "",
      entry.status,
      entry.note,
    ]);
  }
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
};
