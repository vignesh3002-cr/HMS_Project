import React from "react";
import type { ParsedVariable, VariableValue } from "./scoreEngine";
import { normalizeClinicalText } from "./scoreEngine";

const SOURCE_STYLES: Record<string, string> = {
  REG: "bg-blue-50 text-blue-700 ring-blue-100",
  VIT: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  LAB: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  STG: "bg-amber-50 text-amber-700 ring-amber-100",
  IHC: "bg-rose-50 text-rose-700 ring-rose-100",
  GEN: "bg-purple-50 text-purple-700 ring-purple-100",
  DER: "bg-orange-50 text-orange-700 ring-orange-100",
  PATH: "bg-slate-50 text-slate-600 ring-slate-200",
  CLIN: "bg-slate-50 text-slate-600 ring-slate-200",
};

const SOURCE_LABEL: Record<string, string> = {
  REG: "Registration",
  VIT: "Vitals",
  LAB: "Lab",
  STG: "Staging",
  IHC: "IHC",
  GEN: "Genomics",
  DER: "Derived",
  PATH: "Pathology",
  CLIN: "Clinician",
};

const INPUT_CLASS =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px] text-slate-800 shadow-sm transition focus:border-[#004785] focus:outline-none focus:ring-2 focus:ring-[#004785]/15";

const sameText = (a: string, b: string) =>
  normalizeClinicalText(a).toLowerCase() === normalizeClinicalText(b).toLowerCase();

/* One variable of a score. The widget follows the parsed variable kind so a
   points-sum score gets pick-one buttons, a checklist gets Yes/No ticks and
   a formula gets numeric boxes. */
export const ScoreVariableInput: React.FC<{
  variable: ParsedVariable;
  value: VariableValue;
  onChange: (raw: string) => void;
  /* Derived variables are locked while their source score has a result.
     False means the source is missing/incomplete, so manual entry is open. */
  derivedReady?: boolean;
}> = ({ variable, value, onChange, derivedReady }) => {
  const [derivedOverride, setDerivedOverride] = React.useState(false);
  const source = variable.source || "CLIN";
  const sourceStyle = SOURCE_STYLES[source] ?? SOURCE_STYLES.CLIN;
  const filled = Boolean(value.raw?.trim());
  const isAutofilled = value.source === "auto";
  const derivedEditable =
    derivedOverride || derivedReady === false || value.source === "manual";

  const pointsBadge =
    variable.kind === "choice"
      ? null
      : variable.singlePoint != null
        ? `+${variable.singlePoint}`
        : null;

  return (
    <div
      className={
        "rounded-xl border p-3 transition " +
        (filled
          ? "border-[#004785]/25 bg-[#f7fafd]"
          : "border-slate-200 bg-white hover:border-slate-300")
      }
    >
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-semibold text-slate-800">
          {variable.name}
        </span>
        {variable.optional && (
          <span className="text-[9px] font-medium text-slate-400">optional</span>
        )}
        <span
          className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ring-1 ring-inset ${sourceStyle}`}
        >
          {SOURCE_LABEL[source] ?? source}
        </span>
        {isAutofilled && (
          <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-100">
            auto-filled
          </span>
        )}
        {isAutofilled && variable.kind !== "derived" && (
          <button
            type="button"
            onClick={() => onChange("")}
            title="Clear the auto-filled value"
            className="rounded-full border border-slate-200 px-1.5 py-0.5 text-[9px] font-medium text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
          >
            clear
          </button>
        )}
        {pointsBadge && (
          <span className="ml-auto rounded-full bg-[#e8f0fb] px-1.5 py-0.5 text-[9px] font-bold text-[#004785]">
            {pointsBadge} pt
          </span>
        )}
      </div>

      {variable.hint && (
        <p className="mb-2 text-[10px] leading-relaxed text-slate-500">
          {variable.hint}
        </p>
      )}

      {variable.kind === "choice" && variable.options.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {variable.options.map((option) => {
            const active = sameText(value.raw, option.label);
            return (
              <button
                key={option.label}
                type="button"
                onClick={() => onChange(option.label)}
                aria-pressed={active}
                className={
                  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-medium transition active:scale-[0.98] " +
                  (active
                    ? "border-[#004785] bg-[#004785] text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-[#004785]/40 hover:bg-[#f2f6fb]")
                }
              >
                <span>{option.label}</span>
                <span
                  className={
                    "rounded px-1 text-[9px] font-bold " +
                    (active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600")
                  }
                >
                  +{option.points}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {variable.kind === "boolean" && (
        <div className="inline-flex overflow-hidden rounded-lg border border-slate-200">
          {["Yes", "No"].map((option) => {
            const active = sameText(value.raw, option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => onChange(option)}
                aria-pressed={active}
                className={
                  "px-4 py-1.5 text-[10px] font-semibold transition " +
                  (active
                    ? option === "Yes"
                      ? "bg-[#004785] text-white"
                      : "bg-slate-600 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50")
                }
              >
                {option}
              </button>
            );
          })}
        </div>
      )}

      {variable.kind === "numeric" && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={value.raw}
            onChange={(event) => onChange(event.target.value)}
            placeholder={variable.min != null || variable.max != null ? "Enter value" : "Value"}
            className={INPUT_CLASS + " max-w-[180px]"}
          />
          {variable.unit && (
            <span className="text-[10px] font-medium text-slate-500">
              {variable.unit}
            </span>
          )}
          {(variable.min != null || variable.max != null) && (
            <span className="text-[9px] text-slate-400">
              {variable.min != null ? `min ${variable.min}` : ""}
              {variable.min != null && variable.max != null ? " · " : ""}
              {variable.max != null ? `max ${variable.max}` : ""}
            </span>
          )}
        </div>
      )}

      {variable.kind === "text" && (
        <input
          type="text"
          value={value.raw}
          onChange={(event) => onChange(event.target.value)}
          placeholder={variable.sourceField ?? "Enter finding"}
          className={INPUT_CLASS}
        />
      )}

      {variable.kind === "derived" && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={value.raw}
            onChange={(event) => onChange(event.target.value)}
            readOnly={!derivedEditable}
            placeholder={
              variable.derivedFrom
                ? derivedReady === false
                  ? `Enter ${variable.criterion ?? "value"}`
                  : `Auto value from ${variable.derivedFrom}`
                : "Derived value"
            }
            className={
              INPUT_CLASS +
              " max-w-[220px]" +
              (derivedEditable ? "" : " cursor-not-allowed bg-slate-50 text-slate-600")
            }
          />
          <span className="text-[9px] font-medium text-orange-600">
            from {variable.derivedFrom ?? "another score"}
          </span>
          {derivedReady !== false &&
            !derivedOverride &&
            value.source !== "manual" && (
              <button
                type="button"
                onClick={() => setDerivedOverride(true)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[9px] font-semibold text-[#004785] transition hover:border-[#004785]/30 hover:bg-[#f4f8fd]"
              >
                Enter manually
              </button>
            )}
        </div>
      )}

      {variable.kind === "derived" && derivedReady === false && variable.derivedFrom && (
        <p className="mt-1.5 text-[9px] leading-relaxed text-amber-700">
          {variable.derivedFrom} is not complete — enter{" "}
          {variable.criterion ?? "the value"} or finish {variable.derivedFrom}.
        </p>
      )}

      {isAutofilled && value.reason && (
        <p className="mt-1.5 text-[9px] text-emerald-700">
          Auto-filled: {value.reason}
        </p>
      )}

      {variable.criterion && variable.kind !== "choice" && (
        <p className="mt-1.5 text-[9px] text-slate-400">
          Criterion: {variable.criterion}
        </p>
      )}
    </div>
  );
};

export default ScoreVariableInput;
