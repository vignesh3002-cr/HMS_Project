import React, { useState } from "react";
import {
  evaluateScore,
  groupOptions,
  methodHint,
  methodLabel,
  type ScoreAssessment,
  type ScoreDefinition,
} from "./scoreEngine";
import { ScoreVariableInput } from "./ScoreVariableInput";

const METHOD_STYLES: Record<string, string> = {
  points_sum: "bg-[#e8f0fb] text-[#004785] ring-[#c9dcf5]",
  formula: "bg-violet-50 text-violet-700 ring-violet-100",
  criteria_auto: "bg-amber-50 text-amber-700 ring-amber-100",
  criteria_checklist: "bg-cyan-50 text-cyan-700 ring-cyan-100",
  direct_select: "bg-rose-50 text-rose-700 ring-rose-100",
  numeric_auto_group: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  online_calculator: "bg-slate-100 text-slate-700 ring-slate-200",
};

const STATUS_STYLES: Record<string, string> = {
  complete: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  incomplete: "bg-amber-50 text-amber-700 ring-amber-100",
  not_applicable: "bg-slate-100 text-slate-500 ring-slate-200",
};

const numberText = (value: number | null): string => {
  if (value == null) return "—";
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 10000) / 10000);
};

const ScoreCard: React.FC<{
  definition: ScoreDefinition;
  assessment: ScoreAssessment;
  onChange: (next: ScoreAssessment) => void;
  onRemove: () => void;
  onAutoFill?: () => void;
}> = ({ definition, assessment, onChange, onRemove, onAutoFill }) => {
  const [expanded, setExpanded] = useState(true);
  const evaluation = evaluateScore(definition, assessment);
  const groups = groupOptions(definition.groups);
  const notApplicable = assessment.status === "not_applicable";

  const setValue = (variableId: string, raw: string) => {
    onChange({
      ...assessment,
      values: {
        ...assessment.values,
        [variableId]: {
          raw,
          numeric: null,
          points: null,
          source: "manual",
        },
      },
      status: assessment.status === "not_applicable" ? "incomplete" : assessment.status,
      updatedAt: new Date().toISOString(),
    });
  };

  const setGroup = (groupId: string) => {
    onChange({
      ...assessment,
      selectedGroup: groupId || null,
      updatedAt: new Date().toISOString(),
    });
  };

  const toggleNotApplicable = () => {
    onChange({
      ...assessment,
      status: notApplicable ? "incomplete" : "not_applicable",
      updatedAt: new Date().toISOString(),
    });
  };

  const resultText =
    evaluation.groupLabel ??
    (evaluation.total != null ? numberText(evaluation.total) : null);

  const progress =
    evaluation.totalVariables > 0
      ? Math.round((evaluation.completed / evaluation.totalVariables) * 100)
      : 0;

  const selectedGroupId =
    assessment.selectedGroup ??
    (evaluation.autoGroup ? evaluation.group?.score_group_id ?? "" : "");

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <button
        type="button"
        onClick={() => setExpanded((previous) => !previous)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50/70"
      >
        <span
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#004785] text-[10px] font-bold text-white"
          aria-hidden="true"
        >
          {expanded ? "–" : "+"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-[12px] font-bold text-slate-900">
              {definition.name}
            </span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ring-1 ring-inset ${
                METHOD_STYLES[definition.method] ?? METHOD_STYLES.online_calculator
              }`}
            >
              {methodLabel(definition.method)}
            </span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ring-1 ring-inset ${
                STATUS_STYLES[evaluation.status] ?? STATUS_STYLES.incomplete
              }`}
            >
              {evaluation.status === "complete"
                ? "Complete"
                : evaluation.status === "not_applicable"
                  ? "Not applicable"
                  : "Incomplete"}
            </span>
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500">
            {definition.purpose && <span>{definition.purpose}</span>}
            {definition.whenToRecord && (
              <>
                <span aria-hidden="true">·</span>
                <span>Record at {definition.whenToRecord.toLowerCase()}</span>
              </>
            )}
            {evaluation.totalVariables > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  {evaluation.completed}/{evaluation.totalVariables} entered
                </span>
              </>
            )}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-[12px] font-bold text-[#004785]">
            {resultText ?? "Not scored"}
          </span>
          {evaluation.total != null &&
            definition.method !== "criteria_checklist" && (
              <span className="text-[9px] font-medium text-slate-400">
                {definition.method === "points_sum"
                  ? `${numberText(evaluation.total)} points`
                  : definition.method === "formula"
                    ? "calculated"
                    : "value"}
              </span>
            )}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-4 py-3">
          <p className="mb-3 text-[10px] leading-relaxed text-slate-500">
            {methodHint(definition.method)}
          </p>

          {notApplicable ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-[10px] text-slate-500">
              This score is marked not applicable for this patient. It will be
              saved as “Not applicable”.
            </div>
          ) : (
            <>
              {definition.variables.length > 0 ? (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {definition.variables.map((variable) => (
                    <ScoreVariableInput
                      key={variable.id}
                      variable={variable}
                      value={
                        assessment.values[variable.id] ?? {
                          raw: "",
                          numeric: null,
                          points: null,
                          source: null,
                        }
                      }
                      onChange={(raw) => setValue(variable.id, raw)}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-[10px] text-slate-500">
                  This score has no structured variables. Record it as a free
                  text score above.
                </p>
              )}

              {evaluation.missing.length > 0 && !evaluation.groupLabel && (
                <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[10px] text-amber-800 ring-1 ring-inset ring-amber-100">
                  Still needed: {evaluation.missing.join(", ")}
                </div>
              )}
              {evaluation.errors.length > 0 && (
                <div className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-[10px] text-rose-700 ring-1 ring-inset ring-rose-100">
                  {evaluation.errors.join(" ")}
                </div>
              )}

              {groups.length > 0 && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                  <label className="mb-1 flex items-center justify-between text-[10px] font-semibold text-slate-700">
                    <span>Risk group</span>
                    {evaluation.autoGroup && !assessment.selectedGroup && (
                      <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
                        auto-assigned
                      </span>
                    )}
                  </label>
                  <select
                    value={selectedGroupId}
                    onChange={(event) => setGroup(event.target.value)}
                    className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px] text-slate-800 shadow-sm focus:border-[#004785] focus:outline-none focus:ring-2 focus:ring-[#004785]/15"
                  >
                    <option value="">
                      {definition.method === "direct_select" ||
                      definition.method === "online_calculator"
                        ? "Select risk group…"
                        : "Auto / select a group…"}
                    </option>
                    {groups.map((group) => (
                      <option key={group.value} value={group.value}>
                        {group.label}
                        {group.detail ? ` (${group.detail})` : ""}
                      </option>
                    ))}
                  </select>
                  {evaluation.group && (
                    <p className="mt-1.5 text-[10px] text-slate-500">
                      Selected: <strong className="text-slate-700">{evaluation.groupLabel}</strong>
                      {evaluation.group.group_range
                        ? ` — ${evaluation.group.group_range}`
                        : ""}
                    </p>
                  )}
                </div>
              )}

              {(evaluation.expression || evaluation.breakdown.length > 0) && (
                <details className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <summary className="cursor-pointer text-[10px] font-semibold text-slate-600">
                    Working
                  </summary>
                  {evaluation.expression && (
                    <p className="mt-1.5 break-words font-mono text-[10px] text-violet-700">
                      {evaluation.expression}
                    </p>
                  )}
                  {evaluation.breakdown.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                      {evaluation.breakdown.map((item, index) => (
                        <li
                          key={`${item.label}-${index}`}
                          className="flex items-start justify-between gap-2 text-[10px] text-slate-500"
                        >
                          <span>{item.label}</span>
                          <span className="font-mono text-slate-700">
                            {item.value}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </details>
              )}
            </>
          )}

          <div className="mt-3">
            <label className="mb-1 block text-[10px] font-semibold text-slate-600">
              Clinical note
            </label>
            <textarea
              rows={2}
              value={assessment.note}
              onChange={(event) =>
                onChange({ ...assessment, note: event.target.value })
              }
              placeholder="Optional comment for this score at this visit"
              className="block w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px] text-slate-800 shadow-sm focus:border-[#004785] focus:outline-none focus:ring-2 focus:ring-[#004785]/15"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleNotApplicable}
                className={
                  "rounded-lg border px-2.5 py-1.5 text-[10px] font-medium transition " +
                  (notApplicable
                    ? "border-[#004785] bg-[#004785] text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")
                }
              >
                {notApplicable ? "Undo not applicable" : "Mark not applicable"}
              </button>
              {onAutoFill && !notApplicable && (
                <button
                  type="button"
                  onClick={onAutoFill}
                  className="rounded-lg border border-[#004785]/25 bg-[#f4f8fd] px-2.5 py-1.5 text-[10px] font-semibold text-[#004785] transition hover:border-[#004785]/40 hover:bg-[#e8f0fb] active:scale-[0.98]"
                >
                  Auto-fill from patient data
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {evaluation.totalVariables > 0 && (
                <span className="flex items-center gap-1.5 text-[9px] text-slate-400">
                  <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                    <span
                      className="block h-full rounded-full bg-[#004785] transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </span>
                  {progress}%
                </span>
              )}
              <button
                type="button"
                onClick={onRemove}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-medium text-rose-600 transition hover:border-rose-200 hover:bg-rose-50"
              >
                Remove score
              </button>
            </div>
          </div>

          <details className="mt-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
            <summary className="cursor-pointer text-[10px] font-semibold text-slate-500">
              About this score
            </summary>
            <dl className="mt-2 space-y-1 text-[10px] text-slate-500">
              {definition.range && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 font-medium text-slate-600">Range</dt>
                  <dd>{definition.range}</dd>
                </div>
              )}
              {definition.riskGroups && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 font-medium text-slate-600">Groups</dt>
                  <dd>{definition.riskGroups}</dd>
                </div>
              )}
              {definition.status && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 font-medium text-slate-600">Status</dt>
                  <dd>{definition.status}</dd>
                </div>
              )}
              {definition.reference && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 font-medium text-slate-600">Reference</dt>
                  <dd>{definition.reference}</dd>
                </div>
              )}
              {definition.developerNote && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 font-medium text-slate-600">Note</dt>
                  <dd>{definition.developerNote}</dd>
                </div>
              )}
            </dl>
          </details>
        </div>
      )}
    </div>
  );
};

/* The Score workspace: one card per selected score, rendered full-width
   below the Score field. */
export const ScoreWorkspace: React.FC<{
  entries: { definition: ScoreDefinition; assessment: ScoreAssessment }[];
  loading: Record<string, boolean>;
  autoFillBusy?: boolean;
  autoFillNotice?: string | null;
  onAutoFillAll?: () => void;
  onAutoFillOne?: (scoreId: string) => void;
  onAssessmentChange: (scoreId: string, assessment: ScoreAssessment) => void;
  onRemove: (scoreId: string) => void;
}> = ({
  entries,
  loading,
  autoFillBusy = false,
  autoFillNotice = null,
  onAutoFillAll,
  onAutoFillOne,
  onAssessmentChange,
  onRemove,
}) => {
  const loadingIds = Object.keys(loading).filter((key) => loading[key]);
  if (entries.length === 0 && loadingIds.length === 0) return null;

  return (
    <div className="col-span-full mt-2 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[10px] font-bold text-[#334155]">
          Score details
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-slate-400">
            {entries.length} recorded
          </span>
          {onAutoFillAll && entries.length > 0 && (
            <button
              type="button"
              onClick={onAutoFillAll}
              disabled={autoFillBusy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#004785]/25 bg-[#f4f8fd] px-2.5 py-1.5 text-[10px] font-semibold text-[#004785] transition hover:border-[#004785]/40 hover:bg-[#e8f0fb] active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
            >
              {autoFillBusy && (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#004785]/30 border-t-[#004785]" />
              )}
              Auto-fill all from patient data
            </button>
          )}
        </div>
      </div>

      {autoFillNotice && (
        <div className="rounded-lg bg-[#f4f8fd] px-3 py-2 text-[10px] text-[#004785] ring-1 ring-inset ring-[#004785]/10">
          {autoFillNotice}
        </div>
      )}

      {loadingIds.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[10px] text-slate-500">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-[#004785]" />
          Loading score details…
        </div>
      )}

      {entries.length === 0 && loadingIds.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-[10px] text-slate-500">
          Pick a score above to record its variables.
        </p>
      )}

      <div className="space-y-3">
        {entries.map((entry) => (
          <ScoreCard
            key={entry.definition.scoreId}
            definition={entry.definition}
            assessment={entry.assessment}
            onChange={(next) =>
              onAssessmentChange(entry.definition.scoreId, next)
            }
            onRemove={() => onRemove(entry.definition.scoreId)}
            onAutoFill={
              onAutoFillOne
                ? () => onAutoFillOne(entry.definition.scoreId)
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
};

export default ScoreWorkspace;
