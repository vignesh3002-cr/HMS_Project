import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import API from "../../../api/axios";
import { isChemoPlanClosed } from "../../../api/chemotherapy.api";
import { getUser } from "../../../utils/token";
import { BellNotificationButton } from "@/components/hms/BellNotificationButton";
import { MultiSelectDropdown } from "../../../components/ui/multi-select-dropdown";
import { UserProfileDropdown } from "../../../components/ui/User_profile_dropdown";
import VoiceToText from "@/components/ui/voicetotext";
import { Calendar } from "../../../components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../components/ui/popover";
import type { ConsultationState, FormData } from "./types";
import {
  findActiveEncounter,
  findStagingDetailForEncounter,
  formatPickedDate,
  parsePickedDate,
  resolveDiagnosisId,
  toIsoDate,
} from "./helpers";
import {
  BackIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  DoubleArrowIcon,
} from "./icons";

/* ============================================================
   DIAGNOSIS COMPONENT
   (combined from client/pages/doctor/diagonisis.tsx ”
    renamed App ’ Diagnosis, duplicate React import removed,
    CheckIcon / BackIcon / NotificationIcon reused from above)
============================================================ */

/* Normalize an API date (ISO "YYYY-MM-DD..." or DD-MM-YYYY) to the
   YYYY-MM-DD value expected by <input type="date">. */
const toDateInputValue = (value: string): string => {
  const trimmed = value.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${String(dmy[2]).padStart(2, "0")}-${String(
      dmy[1]
    ).padStart(2, "0")}`;
  }
  return "";
};

/* True when a diagnosis draft carries any entered content beyond the
   pristine defaults; used so server hydration only seeds a fresh/bare
   browser session and never overrides a real local draft. */
const hasDraftContent = (raw: string): boolean => {
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const scalarKeys = [
      "diagnosisDate",
      "progressionDate",
      "relapseDate",
      "preDiagnosis",
      "diseaseStatus",
      "survivor",
      "type",
      "histomorphology",
      "icdCode",
      "notes",
    ];
    if (scalarKeys.some((key) => Boolean(data[key]))) return true;
    const arrayKeys = [
      "laterality",
      "bodySite",
      "grade",
      "score",
      "subType",
      "cancerStage",
      "tStage",
      "nStage",
      "mStage",
    ];
    return arrayKeys.some((key) => {
      const value = data[key];
      return Array.isArray(value)
        ? value.length > 0
        : typeof value === "string" && value.length > 0;
    });
  } catch {
    return true;
  }
};

/* Laterality values the staging tables accept. Offered only under the
   selected cancer types it applies to (cancer type laterality_applicable:
   paired organs - Breast, Kidney, Lung, Ovarian, Prostate). */
const LATERALITY_OPTIONS = ["Left", "Right", "Bilateral"];

/* Fallback Body Site list for cancer types with no anatomical_site_master
   rows. */
const BODY_SITE_OPTIONS = [
  "Breast",
  "Lung",
  "Colon",
  "Rectum",
  "Stomach",
  "Liver",
  "Pancreas",
  "Kidney",
  "Bladder",
  "Prostate",
  "Ovary",
  "Cervix",
  "Uterus",
  "Skin",
  "Brain",
  "Head and Neck",
  "Bone",
  "Lymph Node",
  "Other",
];

type CancerTypeItem = {
  cancer_type_id: string;
  cancer_type: string;
  icd10: string | null;
  staging_system: string | null;
  laterality_applicable?: boolean;
};

type CancerSubtypeItem = {
  subtype_id: string;
  subtype_name: string;
  icd10_subtype: string | null;
};

type CancerSubtypeOption = CancerSubtypeItem & {
  cancerType: string;
};

type StageOption = {
  value: string;
  cancerType: string;
};

/* Multi-select checkbox helpers for the Histopathology (subtype) and
   Cancer Stage fields. Options are grouped under their parent cancer type;
   each stored value is qualified as `${cancerType}|${label}` so the same
   label can be selected independently for every cancer type. */
const splitQualified = (value: string) => {
  const pipe = value.indexOf("|");
  return pipe === -1
    ? { cancerType: "", raw: value }
    : { cancerType: value.slice(0, pipe), raw: value.slice(pipe + 1) };
};

/* AJCC order for T / N / M values: Tx, T0, Tis, T1, T1a ... T4d. */
const TNM_SUFFIX_ORDER = ["", "mi", "a", "b", "c", "d"];
const tnmSortKey = (value: string): [number, number] => {
  const match = value.match(/^[TNM](x|is|\d)(.*)$/i);
  if (!match) return [99, 0];
  const head = match[1].toLowerCase();
  const number = head === "x" ? -1 : head === "is" ? 0.5 : Number(head);
  return [number, TNM_SUFFIX_ORDER.indexOf(match[2].toLowerCase())];
};
const compareTnm = (a: string, b: string) => {
  const [an, as] = tnmSortKey(a);
  const [bn, bs] = tnmSortKey(b);
  return an - bn || as - bs;
};

const buildCheckboxGroups = (
  items: { value: string; cancerType: string }[]
): { cancerType: string; items: { value: string; label: string }[] }[] => {
  const map = new Map<string, { value: string; label: string }[]>();
  items.forEach((item) => {
    const group = map.get(item.cancerType) ?? [];
    group.push({ value: `${item.cancerType}|${item.value}`, label: item.value });
    map.set(item.cancerType, group);
  });
  return Array.from(map.entries()).map(([cancerType, list]) => ({
    cancerType,
    items: list,
  }));
};

/* Checkbox multi-select shown as a dropdown (same interaction as the
   Cancer Type field): the selected-chips strip acts as the trigger and
   the grouped checkbox list appears only on hover or click. */
const DiagnosisCheckboxList: React.FC<{
  title: string;
  groups: { cancerType: string; items: { value: string; label: string }[] }[];
  selected: string[];
  onToggle: (value: string, select?: boolean) => void;
  loading?: boolean;
}> = ({ title, groups, selected, onToggle, loading }) => {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  /* Close on outside click, like the Cancer Type dropdown. */
  React.useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-600">
        {title}
      </label>

      <div className="relative" ref={containerRef}>
        {/* Trigger: selected chips strip. */}
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className="flex min-h-[46px] w-full flex-wrap items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
        >
          {selected.length === 0 ? (
            <span className="text-gray-400">
              Select one or more options below
            </span>
          ) : (
            selected.map((value) => {
              const label = splitQualified(value).raw || value;
              return (
                <span
                  key={value}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                >
                  {label}
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove ${label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggle(value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        onToggle(value);
                      }
                    }}
                    className="inline-flex items-center justify-center leading-none hover:text-blue-900 cursor-pointer"
                  >
                    ×
                  </span>
                </span>
              );
            })
          )}
          <span
            className={
              "ml-auto h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 " +
              (open ? "rotate-180" : "")
            }
          >
            <ChevronDownIcon />
          </span>
        </button>

        {/* Dropdown body: only rendered on hover or click. */}
        {open && (
          <div className="absolute left-0 right-0 top-full z-20 mt-2 block w-full max-h-60 overflow-y-auto rounded-md border border-gray-300 bg-white p-3 text-sm text-gray-800 shadow-lg slim-scrollbar">
            {total === 0 && (
              <p className="text-sm text-gray-400">
                {loading
                  ? "Loading..."
                  : `No ${title.toLowerCase()} options for the selected cancer type(s)`}
              </p>
            )}

            {groups.map((group) => (
              <div key={group.cancerType} className="mb-3 last:mb-0">
                <div className="mb-1.5 border-b border-gray-100 pb-1 text-[11px] font-bold uppercase tracking-wide text-[#1d4ed8]">
                  {group.cancerType}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {group.items.map((item) => {
                    /* Ticked only for this exact group's own qualified value so
                       each option stays independent per cancer type. */
                    const hasQualified = selected.some(
                      (value) =>
                        value.includes("|") &&
                        splitQualified(value).raw === item.label
                    );
                    const isChecked =
                      selected.includes(item.value) ||
                      (!hasQualified &&
                        selected.some(
                          (value) =>
                            !value.includes("|") && value === item.label
                        ));
                    return (
                      <label
                        key={item.value}
                        className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(event) =>
                            onToggle(item.value, event.target.checked)
                          }
                          className="h-4 w-4 rounded border-gray-300 text-[#1d4ed8] accent-[#1d4ed8] focus:ring-[#1d4ed8]"
                        />
                        <span className="leading-snug">{item.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* Single-select checkbox dropdown for the Diagnosis fields that used a plain
   <select>. Styled identically to DiagnosisCheckboxList / MultiSelectDropdown:
   a chips trigger opens a checkbox list; checking an option sets it as the
   chosen value (unchecking clears it), and the selected chip is removable. */
const DiagnosisCheckboxSelect: React.FC<{
  title: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  loading?: boolean;
}> = ({ title, options, value, onChange, placeholder = "Select one option below", loading }) => {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleToggle = (option: string) => {
    onChange(option === value ? "" : option);
  };

  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-600">
        {title}
      </label>

      <div className="relative" ref={containerRef}>
        {/* Trigger: selected chips strip. */}
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className="flex min-h-[46px] w-full flex-wrap items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
        >
          {!value ? (
            <span className="text-gray-400">
              {loading && options.length === 0 ? "Loading..." : placeholder}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              {value}
              <span
                role="button"
                tabIndex={0}
                aria-label={`Remove ${value}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange("");
                  }
                }}
                className="inline-flex items-center justify-center leading-none hover:text-blue-900 cursor-pointer"
              >
                ×
              </span>
            </span>
          )}
          <span
            className={
              "ml-auto h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 " +
              (open ? "rotate-180" : "")
            }
          >
            <ChevronDownIcon />
          </span>
        </button>

        {/* Dropdown body: rendered on click. */}
        {open && (
          <div className="absolute left-0 right-0 top-full z-20 mt-2 block w-full max-h-60 overflow-y-auto rounded-md border border-gray-300 bg-white p-3 text-sm text-gray-800 shadow-lg slim-scrollbar">
            {options.length === 0 && (
              <p className="text-sm text-gray-400">
                {loading
                  ? "Loading..."
                  : `No ${title.toLowerCase()} options available`}
              </p>
            )}

            {options.map((option) => (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-1.5 py-1 text-sm text-gray-700"
              >
                <input
                  type="checkbox"
                  checked={value === option}
                  onChange={() => handleToggle(option)}
                  className="h-4 w-4 rounded border-gray-300 text-[#1d4ed8] accent-[#1d4ed8] focus:ring-[#1d4ed8]"
                />
                <span className="leading-snug">{option}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* Text date field (DD-MM-YYYY) with a clickable calendar icon that opens a
   date picker, same pattern as the Treatment Plan "Planned Start Date".
   Future dates are disabled - these are clinical event dates. */
const DiagnosisDateField: React.FC<{
  id: string;
  title: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ id, title, value, onChange }) => {
  const [open, setOpen] = React.useState(false);
  const picked = parsePickedDate(value);

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-gray-600"
      >
        {title}
      </label>

      <Popover open={open} onOpenChange={setOpen}>
        <div className="relative">
          <input
            id={id}
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="DD-MM-YYYY"
            className="block w-full rounded-md border border-gray-300 bg-white py-3 pl-4 pr-12 text-sm text-gray-800 shadow-sm focus:border-[#1d4ed8] focus:outline-none focus:ring-[#1d4ed8]"
          />

          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Select ${title}`}
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 transition-colors hover:text-[#1d4ed8] focus:outline-none"
            >
              <CalendarIcon />
            </button>
          </PopoverTrigger>
        </div>

        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={picked}
            defaultMonth={picked}
            disabled={(date) => date > new Date()}
            onSelect={(date) => {
              if (date instanceof Date) {
                onChange(formatPickedDate(date));
                setOpen(false);
              }
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

type ScoreOption = {
  cancerType: string;
  system: string;
  value: string;
};

/* Score field: a text input with a dropdown of the cancer_score values for
   the selected cancer type(s), grouped by cancer type then score system.
   Typing filters the list; Enter picks an exact match or adds the typed
   text as a custom score (e.g. an exact Ki-67 %). Selected scores show as
   removable chips. */
const DiagnosisScoreList: React.FC<{
  title: string;
  options: ScoreOption[];
  selected: string[];
  onToggle: (value: string, select?: boolean) => void;
  onAddCustom: (text: string) => void;
  loading?: boolean;
}> = ({ title, options, selected, onToggle, onAddCustom, loading }) => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? options.filter(
        (option) =>
          option.value.toLowerCase().includes(needle) ||
          option.system.toLowerCase().includes(needle)
      )
    : options;

  /* cancerType -> score system -> options, in load order. */
  const groups = new Map<string, Map<string, ScoreOption[]>>();
  filtered.forEach((option) => {
    const systems = groups.get(option.cancerType) ?? new Map();
    const list = systems.get(option.system) ?? [];
    list.push(option);
    systems.set(option.system, list);
    groups.set(option.cancerType, systems);
  });

  const commitQuery = () => {
    const text = query.trim();
    if (!text) return;
    const exact = options.find(
      (option) => option.value.toLowerCase() === text.toLowerCase()
    );
    if (exact) {
      onToggle(`${exact.cancerType}|${exact.value}`, true);
    } else {
      onAddCustom(text);
    }
    setQuery("");
  };

  return (
    <div>
      <label
        htmlFor="scoreInput"
        className="mb-2 block text-sm font-semibold text-gray-600"
      >
        {title}
      </label>

      <div className="relative" ref={containerRef}>
        {/* Trigger: selected chips + free-text input. */}
        <div
          onClick={() => setOpen(true)}
          className="flex min-h-[46px] w-full cursor-text flex-wrap items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus-within:border-transparent focus-within:ring-2 focus-within:ring-blue-500"
        >
          {selected.map((value) => {
            const label = splitQualified(value).raw || value;
            return (
              <span
                key={value}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
              >
                {label}
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Remove ${label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      onToggle(value);
                    }
                  }}
                  className="inline-flex cursor-pointer items-center justify-center leading-none hover:text-blue-900"
                >
                  ×
                </span>
              </span>
            );
          })}

          <input
            id="scoreInput"
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              /* Keep Enter from submitting the Diagnosis form. */
              if (event.key === "Enter") {
                event.preventDefault();
                commitQuery();
              } else if (event.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder={selected.length === 0 ? "Type or select score" : ""}
            className="min-w-[8rem] flex-1 border-0 bg-transparent p-0 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
          />

          <button
            type="button"
            aria-label={open ? "Close score list" : "Open score list"}
            onClick={(e) => {
              e.stopPropagation();
              setOpen((current) => !current);
            }}
            className={
              "ml-auto h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 " +
              (open ? "rotate-180" : "")
            }
          >
            <ChevronDownIcon />
          </button>
        </div>

        {open && (
          <div className="absolute left-0 right-0 top-full z-20 mt-2 block w-full max-h-72 overflow-y-auto rounded-md border border-gray-300 bg-white p-3 text-sm text-gray-800 shadow-lg slim-scrollbar">
            {query.trim() &&
              !options.some(
                (option) =>
                  option.value.toLowerCase() === query.trim().toLowerCase()
              ) && (
                <button
                  type="button"
                  onClick={commitQuery}
                  className="mb-2 w-full rounded-md bg-blue-50 px-2 py-1.5 text-left text-xs font-medium text-blue-700 hover:bg-blue-100"
                >
                  Add “{query.trim()}” as score
                </button>
              )}

            {filtered.length === 0 && (
              <p className="text-sm text-gray-400">
                {loading
                  ? "Loading..."
                  : options.length === 0
                    ? "No score options for the selected cancer type(s) / histopathology"
                    : "No matching scores"}
              </p>
            )}

            {Array.from(groups.entries()).map(([cancerType, systems]) => (
              <div key={cancerType} className="mb-3 last:mb-0">
                <div className="mb-1.5 border-b border-gray-100 pb-1 text-[11px] font-bold uppercase tracking-wide text-[#1d4ed8]">
                  {cancerType}
                </div>

                {Array.from(systems.entries()).map(([system, list]) => (
                  <div key={system} className="mb-2 last:mb-0">
                    <div className="mb-1 text-xs font-semibold text-gray-500">
                      {system}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                      {list.map((option) => {
                        const qualified = `${option.cancerType}|${option.value}`;
                        return (
                          <label
                            key={qualified}
                            className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700"
                          >
                            <input
                              type="checkbox"
                              checked={selected.includes(qualified)}
                              onChange={(event) =>
                                onToggle(qualified, event.target.checked)
                              }
                              className="h-4 w-4 rounded border-gray-300 text-[#1d4ed8] accent-[#1d4ed8] focus:ring-[#1d4ed8]"
                            />
                            <span className="leading-snug">{option.value}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* True when a subtype-specific score applies: any "|"-separated keyword
   appears as a whole word (case-insensitive) in a selected subtype. */
const matchesSubtypeKeywords = (
  keywords: string | null,
  subtypeLabels: string[]
): boolean => {
  if (!keywords) return true;
  return keywords
    .split("|")
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .some((keyword) => {
      const pattern = new RegExp(
        `(^|[^A-Za-z0-9])${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^A-Za-z0-9])`,
        "i"
      );
      return subtypeLabels.some((label) => pattern.test(label));
    });
};

/* "Cancer|label" entries -> "label, label" for the staging payload. */
const joinRaw = (values: string[]): string =>
  values.map((value) => splitQualified(value).raw).join(", ");

/* YYYY-MM-DD / DD-MM-YYYY API date -> DD-MM-YYYY for the date fields. */
const toPickedDateValue = (value?: string | null): string => {
  const iso = toDateInputValue(value ?? "");
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  return `${day}-${month}-${year}`;
};

type StagingReferenceItem = {
  stage_ref_id: string;
  cancer_type_id: string;
  subtype_label: string | null;
  staging_system: string | null;
  stage_label: string | null;
  tnm_criteria: string | null;
  risk_system: string | null;
  risk_category: string | null;
  risk_criteria: string | null;
  os_5yr_approx: string | null;
  guideline_source: string | null;
  /* Storable T / N / M values named by tnm_criteria (parsed server-side). */
  t_values?: string[];
  n_values?: string[];
  m_values?: string[];
};

type AnatomicalSiteItem = {
  site_id: string;
  site_name: string;
  site_category: string | null;
};

type CancerGradeItem = {
  grade_id: string;
  grade_value: string;
  grade_system: string;
  description: string | null;
};

type CancerScoreItem = {
  score_id: string;
  score_system: string;
  score_value: string;
  input_type: string | null;
  subtype_keywords: string | null;
};

/* An Investigation Results test of a cancer type (investigation_parameter):
   a tumour marker / monitoring test with its normal range. */
type InvestigationParameterItem = {
  parameter_id: string;
  cancer_type_id: string;
  chart_name: string;
  subtype_keywords: string | null;
  parameter_code: string;
  parameter_name: string;
  input_type: "NUMBER" | "TEXT" | "DATE" | "SELECT";
  unit: string | null;
  normal_min: string | number | null;
  normal_max: string | number | null;
  range_label: string | null;
  select_options: string | null;
  display_order: number | null;
};

/* A saved Investigation Results value of one visit
   (patient_investigation_result). */
type InvestigationResultRecord = {
  investigation_result_id: string;
  encounter_no: string;
  parameter_id: string;
  report_date: string;
  value_text: string;
  is_abnormal: boolean;
  investigation_parameter?: InvestigationParameterItem | null;
};

/* "High" / "Low" when a number test's value is outside its normal range. */
const investigationFlag = (
  parameter: InvestigationParameterItem,
  value: string
): "High" | "Low" | null => {
  if (parameter.input_type !== "NUMBER" || !value.trim()) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const min = parameter.normal_min != null ? Number(parameter.normal_min) : null;
  const max = parameter.normal_max != null ? Number(parameter.normal_max) : null;
  if (max !== null && number > max) return "High";
  if (min !== null && number < min) return "Low";
  return null;
};

const INVESTIGATION_INPUT_CLASS =
  "block w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 shadow-sm focus:border-[#1d4ed8] focus:outline-none focus:ring-[#1d4ed8]";

/* Master rows tagged with the cancer type they were loaded for, so the
   dropdowns can group them per selected cancer type like T/N/M. */
type ForCancerType<T> = T & { cancerType: string };

const Diagnosis: React.FC<{
  embedded?: boolean;
  patientId?: string;
  /* The consultation's appointment / encounter - the visit this
     diagnosis is recorded in. */
  appointmentId?: string;
  encounterNo?: string;
  onNext?: () => void;
  visitDate?: string;
  onVisitDateChange?: (value: string) => void;
}> = ({
  embedded = false,
  patientId,
  appointmentId,
  encounterNo,
  onNext,
  visitDate = "",
  onVisitDateChange,
}) => {
  const location = useLocation();
  const consultationState = location.state as ConsultationState | null;
  const statePatientId = consultationState?.patientId ?? "";
  const resolvedPatientId = patientId || statePatientId;

  /* The visit (encounter) this diagnosis is recorded in - each visit has
     its own staging detail. */
  const resolveVisitEncounterNo = async () => {
    if (encounterNo) return encounterNo;
    if (!resolvedPatientId) return "";
    const { encounter } = await findActiveEncounter(
      resolvedPatientId,
      appointmentId ?? consultationState?.appointmentId
    );
    return encounter?.encounter_no ?? "";
  };

  const [userAvatarUrl, setUserAvatarUrl] = useState<string>(() => localStorage.getItem("user_photo") || "");
  const [avatarLoading, setAvatarLoading] = useState<boolean>(() => !localStorage.getItem("user_photo"));

  const [formData, setFormData] = useState<FormData>({
    diagnosisDate: "",
    progressionDate: "",
    relapseDate: "",
    preDiagnosis: "",
    diseaseStatus: "",
    laterality: [],
    bodySite: [],
    survivor: "",
    type: "",
    cancerTypes: [],
    subType: [],
    histomorphology: "",
    cancerStage: [],
    grade: [],
    score: [],
    tStage: [],
    nStage: [],
    mStage: [],
    icdCode: "",
    notes: "",
    investigationReportDate: "",
    investigationResults: {},
  });

  const diagnosisDraftKey = `hms_diagnosis_form_${resolvedPatientId}`;

  useEffect(() => {
    if (!resolvedPatientId) return;
    const saved = localStorage.getItem(diagnosisDraftKey);

    if (!saved) return;

    try {
      const data = JSON.parse(saved) as Partial<FormData>;
      /* Normalize legacy drafts: subType / cancerStage / laterality /
         bodySite / grade used to be single strings, they are now
         multi-select arrays. */
      const asArray = (value: unknown): string[] => {
        if (Array.isArray(value)) return value.map(String);
        if (typeof value === "string" && value.length > 0) return [value];
        return [];
      };
      setFormData((previous) => ({
        ...previous,
        ...data,
        cancerTypes: asArray(data.cancerTypes),
        subType: asArray(data.subType),
        cancerStage: asArray(data.cancerStage),
        laterality: asArray(data.laterality),
        bodySite: asArray(data.bodySite),
        grade: asArray(data.grade),
        score: asArray(data.score),
        tStage: asArray(data.tStage),
        nStage: asArray(data.nStage),
        mStage: asArray(data.mStage),
        investigationReportDate:
          typeof data.investigationReportDate === "string"
            ? data.investigationReportDate
            : "",
        investigationResults:
          data.investigationResults &&
          typeof data.investigationResults === "object" &&
          !Array.isArray(data.investigationResults)
            ? data.investigationResults
            : {},
      }));
      const savedTypes = asArray(data.cancerTypes);
      if (savedTypes.length > 0) setSelectedCancerTypes(savedTypes);
    } catch (error) {
      console.error("Failed to restore diagnosis draft:", error);
    }
  }, [diagnosisDraftKey, resolvedPatientId]);

  /* One-time server hydration: when there's no local draft yet, pull the
     latest staging detail and seed the visit date, diagnosis dates and
     notes so a fresh browser shows what was previously saved. A
     local draft always wins over this server seed. Runs before the
     draft-save effect so the empty initial draft can't suppress it. */
  useEffect(() => {
    if (!resolvedPatientId) return;
    const rawDraft = localStorage.getItem(diagnosisDraftKey);
    if (rawDraft && hasDraftContent(rawDraft)) return;
    let cancelled = false;
    const hydrate = async () => {
      try {
        /* This visit's own staging detail (the Diagnosis step reopened in
           the same visit) seeds everything. Otherwise the latest earlier
           one only carries the diagnosis / progression / relapse dates -
           its visit date and notes belong to that earlier visit. */
        const visitEncounterNo = await resolveVisitEncounterNo();
        const ownStagingId = visitEncounterNo
          ? await findStagingDetailForEncounter(resolvedPatientId, visitEncounterNo)
          : "";
        const stored = JSON.parse(
          localStorage.getItem(`hms_staging_detail_id_${resolvedPatientId}`) ??
            "{}"
        ) as { staging_detail_id?: string } | null;
        const sourceStagingId = ownStagingId || stored?.staging_detail_id;
        if (!sourceStagingId || cancelled) return;
        const response = await API.get<{
          success: boolean;
          data: {
            visit_date?: string | null;
            diagnosis_date?: string | null;
            progression_date?: string | null;
            relapse_date?: string | null;
            notes?: string | null;
          } | null;
        }>(
          `/oncology/staging-details/${encodeURIComponent(sourceStagingId)}`
        );
        const detail = response.data.data;
        if (!detail || cancelled) return;
        const ownVisit = Boolean(ownStagingId);
        setFormData((previous) => ({
          ...previous,
          diagnosisDate:
            previous.diagnosisDate || toPickedDateValue(detail.diagnosis_date),
          progressionDate:
            previous.progressionDate ||
            toPickedDateValue(detail.progression_date),
          relapseDate:
            previous.relapseDate || toPickedDateValue(detail.relapse_date),
          notes: ownVisit ? previous.notes || detail.notes || "" : previous.notes,
        }));
        const visitDateIso = ownVisit
          ? toDateInputValue(detail.visit_date ?? "")
          : "";
        if (visitDateIso) {
          const parsed = parsePickedDate(visitDateIso);
          if (parsed && onVisitDateChange) {
            onVisitDateChange(formatPickedDate(parsed));
          }
        }
      } catch (error) {
        console.error("Failed to hydrate diagnosis from staging detail:", error);
      }
    };
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [diagnosisDraftKey, resolvedPatientId, onVisitDateChange, encounterNo, appointmentId]);

  useEffect(() => {
    if (!resolvedPatientId) return;
    localStorage.setItem(diagnosisDraftKey, JSON.stringify(formData));
  }, [formData, diagnosisDraftKey, resolvedPatientId]);

  const [cancerTypes, setCancerTypes] = useState<CancerTypeItem[]>([]);
  const [subtypes, setSubtypes] = useState<CancerSubtypeOption[]>([]);
  const [diagnosisCatalogReady, setDiagnosisCatalogReady] = useState(false);

  /* Multi-select Cancer Type field. The full selection is kept for
     documentation and to source the Histopathology subtype options;
     the first entry still drives the dependent fields (staging)
     exactly like the old single select. */
  const [selectedCancerTypes, setSelectedCancerTypes] = useState<string[]>([]);

  /* Toggle a qualified multi-select value on/off for the Histopathology
     (subType) and Cancer Stage (cancerStage) arrays. Each value is stored
     qualified as `${cancerType}|${label}`, so per-type selections stay
     independent. The checkbox's checked state drives add vs. remove so a
     click can never silently invert a selection. */
  const handleMultiToggle = (
    field:
      | "subType"
      | "cancerStage"
      | "tStage"
      | "nStage"
      | "mStage"
      | "laterality"
      | "bodySite"
      | "grade"
  ) => (
    value: string,
    select?: boolean
  ) => {
    setFormData((previous) => {
      const current = Array.isArray(previous[field]) ? previous[field] : [];
      const raw = splitQualified(value).raw;
      const present = current.includes(value);
      if (select === true) {
        /* Adding. Only one subtype / stage may be picked per cancer type:
           any other entry belonging to the same cancer type group (and any
           legacy raw-only entry carrying the same label) is replaced by
           this new one, so the box ticks exactly once per cancer type. */
        if (present) return previous;
        const group = splitQualified(value).cancerType;
        return {
          ...previous,
          [field]: [
            ...current.filter(
              (item) =>
                splitQualified(item).cancerType !== group && item !== raw
            ),
            value,
          ],
        };
      }
      if (select === false) {
        /* Removing. Drop the qualified value and any legacy raw-only
           entry carrying the same label. */
        return {
          ...previous,
          [field]: current.filter(
            (item) =>
              item !== value && !(item.indexOf("|") === -1 && item === raw)
          ),
        };
      }
      /* Binary toggle fallback (e.g. chip removal). */
      return present
        ? {
            ...previous,
            [field]: current.filter(
              (item) =>
                item !== value && !(item.indexOf("|") === -1 && item === raw)
            ),
          }
        : { ...previous, [field]: [...current, value] };
    });
  };

  useEffect(() => {
    setSelectedCancerTypes((previous) => {
      if (!formData.type) return previous;
      return previous.includes(formData.type)
        ? previous
        : [...previous, formData.type];
    });
  }, [formData.type]);

  /* Sync the diagnosis selection to localStorage so downstream steps can
     read it: Treatment Plan lists regimen protocols for every selected
     cancer type (cancer_type_ids) and Histopathology (subtype_ids); the
     single primary fields are kept for Summary / plan sync. */
  const lastSelectionRef = useRef("");
  useEffect(() => {
    const typeNames =
      selectedCancerTypes.length > 0
        ? selectedCancerTypes
        : formData.type
          ? [formData.type]
          : [];
    const matchedTypes = typeNames
      .map((name) => cancerTypes.find((item) => item.cancer_type === name))
      .filter((item): item is CancerTypeItem => Boolean(item?.cancer_type_id));
    if (matchedTypes.length === 0) return;

    /* Resolve each ticked Histopathology to its subtype row, matching on
       the cancer type it was ticked under. */
    const matchedSubtypes = formData.subType
      .map((value) => {
        const { cancerType, raw } = splitQualified(value);
        return subtypes.find(
          (item) =>
            item.subtype_name === raw &&
            (!cancerType || item.cancerType === cancerType)
        );
      })
      .filter((item): item is CancerSubtypeOption => Boolean(item));

    const primaryType =
      matchedTypes.find((item) => item.cancer_type === formData.type) ??
      matchedTypes[0];
    const primarySubtype =
      matchedSubtypes.find(
        (item) => item.cancerType === primaryType.cancer_type
      );

    /* Resolve diagnosis_id by matching the primary subtype's ICD-10 code
       against the loaded diagnosis catalog. */
    let diagnosisId = "";
    const subtypeIcd = primarySubtype?.icd10_subtype?.trim();
    if (subtypeIcd && diagnosisCatalogRef.current.length > 0) {
      const match = diagnosisCatalogRef.current.find(
        (entry) => entry.icd_code?.toUpperCase() === subtypeIcd.toUpperCase()
      );
      if (match) diagnosisId = match.diagnosis_id;
    }

    const selection = JSON.stringify({
      patient_id: resolvedPatientId,
      cancer_type_id: primaryType.cancer_type_id,
      subtype_id: primarySubtype?.subtype_id ?? "",
      cancer_type: primaryType.cancer_type,
      subtype_name: primarySubtype?.subtype_name ?? "",
      diagnosis_id: diagnosisId,
      cancer_type_ids: matchedTypes.map((item) => item.cancer_type_id),
      subtype_ids: Array.from(
        new Set(matchedSubtypes.map((item) => item.subtype_id))
      ),
    });
    if (selection === lastSelectionRef.current) return;
    lastSelectionRef.current = selection;

    localStorage.setItem("hms_diagnosis_selection", selection);

    window.dispatchEvent(
      new CustomEvent("cancer-type-changed", {
        detail: {
          patientId: resolvedPatientId,
          cancerType: primaryType.cancer_type,
          cancerSubtype: primarySubtype?.subtype_name ?? "",
        },
      })
    );
  }, [
    formData.type,
    formData.subType,
    selectedCancerTypes,
    cancerTypes,
    subtypes,
    diagnosisCatalogReady,
    resolvedPatientId,
  ]);

  /* Every visit's Investigation Results for the patient. This visit's
     values pre-fill the section unless the draft already holds some. */
  useEffect(() => {
    if (!resolvedPatientId) return;
    let cancelled = false;
    (async () => {
      try {
        const [visitNo, response] = await Promise.all([
          resolveVisitEncounterNo().catch(() => ""),
          API.get<{ success: boolean; data: InvestigationResultRecord[] }>(
            "/oncology/investigation-results",
            { params: { patient_id: resolvedPatientId } }
          ),
        ]);
        if (cancelled) return;
        const rows = response.data.data ?? [];
        setInvestigationVisitNo(visitNo);
        setInvestigationHistory(rows);
        const own = visitNo ? rows.filter((row) => row.encounter_no === visitNo) : [];
        if (own.length === 0) return;
        setFormData((previous) => {
          const draftHasValues = Object.values(
            previous.investigationResults ?? {}
          ).some((value) => String(value ?? "").trim());
          if (draftHasValues) return previous;
          const values: Record<string, string> = {};
          own.forEach((row) => {
            values[row.parameter_id] =
              row.investigation_parameter?.input_type === "DATE"
                ? toPickedDateValue(row.value_text)
                : row.value_text;
          });
          return {
            ...previous,
            investigationResults: values,
            investigationReportDate:
              previous.investigationReportDate ||
              toPickedDateValue(own[0].report_date),
          };
        });
      } catch (error) {
        console.error("Failed to load investigation results:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedPatientId, encounterNo, appointmentId]);

  const [stageLabels, setStageLabels] = useState<StageOption[]>([]);

  const [tOptions, setTOptions] = useState<StageOption[]>([]);
  const [nOptions, setNOptions] = useState<StageOption[]>([]);
  const [mOptions, setMOptions] = useState<StageOption[]>([]);
  /* Grades parsed out of staging_reference text; fallback for cancer
     types with no cancer_grade_master rows. */
  const [grades, setGrades] = useState<StageOption[]>([]);
  const [bodySiteOptions, setBodySiteOptions] = useState<
    ForCancerType<AnatomicalSiteItem>[]
  >([]);
  const [gradeMasterOptions, setGradeMasterOptions] = useState<
    ForCancerType<CancerGradeItem>[]
  >([]);
  const [scoreMasterOptions, setScoreMasterOptions] = useState<
    ForCancerType<CancerScoreItem>[]
  >([]);
  /* Investigation Results: the tests of the selected cancer types, every
     visit's saved values for this patient, and this visit's encounter. */
  const [investigationParameters, setInvestigationParameters] = useState<
    ForCancerType<InvestigationParameterItem>[]
  >([]);
  const [investigationHistory, setInvestigationHistory] = useState<
    InvestigationResultRecord[]
  >([]);
  const [investigationVisitNo, setInvestigationVisitNo] = useState("");
  const [metastasisSites, setMetastasisSites] = useState<string[]>([]);
  const [diagnosisLoading, setDiagnosisLoading] = useState(false);
  const [diagnosisError, setDiagnosisError] = useState("");
  const [savingDiagnosis, setSavingDiagnosis] = useState(false);

  const diagnosisRequestRef = useRef(0);
  const stagingRequestRef = useRef(0);
  const masterRequestRef = useRef(0);
  const diagnosisCatalogRef = useRef<
    { diagnosis_id: string; icd_code: string }[]
  >([]);

  const loadDiagnosisCatalog = async () => {
    const categoriesResponse = await API.get<{
      success: boolean;
      data: { categories: { diagnosis_catogory_id: string }[] };
    }>("/diagnosis/categories");
    const categories = (
      categoriesResponse.data.data?.categories ?? []
    ).filter((category) => Boolean(category.diagnosis_catogory_id));
    const responses = await Promise.all(
      categories.map((category) =>
        API.get<{
          success: boolean;
          data: {
            diagnoses: { diagnosis_id: string; icd_code: string }[];
          };
        }>(`/diagnosis/categories/${category.diagnosis_catogory_id}/diagnoses`)
      )
    );
    return responses.flatMap(
      (response) => response.data.data?.diagnoses ?? []
    );
  };

  /* Load the subtype options for every selected cancer type and merge
     them into the Histopathology dropdown. Each option remembers its
     parent cancer type so the dropdown can show the mapping. */
  const loadSubtypesForCancerTypes = (
    selections: { cancerTypeId: string; cancerTypeName: string }[],
    autoSelectIcd = true
  ) => {
    const ids = selections.filter(
      (selection) => Boolean(selection.cancerTypeId)
    );
    const requestId = ++diagnosisRequestRef.current;
    setDiagnosisError("");

    if (ids.length === 0) {
      setSubtypes([]);
      setDiagnosisLoading(false);
      return;
    }

    setDiagnosisLoading(true);

    Promise.all(
      ids.map((selection) =>
        API.get<{ success: boolean; data: CancerSubtypeItem[] }>(
          `/oncology/reference/cancer-types/${selection.cancerTypeId}/subtypes`
        )
      )
    )
      .then((responses) => {
        if (requestId !== diagnosisRequestRef.current) return;
        const merged = new Map<string, CancerSubtypeOption>();
        responses.forEach((response, index) => {
          const cancerType = ids[index].cancerTypeName;
          for (const item of response.data.data) {
            const key = `${cancerType}|${item.subtype_name}`;
            if (!merged.has(key)) {
              merged.set(key, { ...item, cancerType });
            }
          }
        });
        const items = Array.from(merged.values());
        setSubtypes(items);
        const first = items[0];
        if (first && autoSelectIcd) {
          setFormData((previous) => ({
            ...previous,
            icdCode: previous.icdCode || first.icd10_subtype || "",
          }));
        }
      })
      .catch((error) => {
        console.error("Failed to load cancer subtypes:", error);
        if (requestId === diagnosisRequestRef.current) {
          setDiagnosisError(
            error?.response?.data?.message || "Failed to load cancer subtypes."
          );
        }
      })
      .finally(() => {
        if (requestId === diagnosisRequestRef.current) {
          setDiagnosisLoading(false);
        }
      });
  };

  /* Body Site, Grade and Score masters for every selected cancer type,
     each row tagged with its cancer type for per-type grouping. */
  const loadMastersForCancerTypes = (
    selections: { cancerTypeId: string; cancerTypeName: string }[]
  ) => {
    const ids = selections.filter((selection) => Boolean(selection.cancerTypeId));
    const requestId = ++masterRequestRef.current;

    if (ids.length === 0) {
      setBodySiteOptions([]);
      setGradeMasterOptions([]);
      setScoreMasterOptions([]);
      setInvestigationParameters([]);
      return;
    }

    const fetchTagged = <T,>(path: string, label: string) =>
      Promise.all(
        ids.map((selection) =>
          API.get<{ success: boolean; data: T[] }>(
            `/oncology/reference/cancer-types/${selection.cancerTypeId}/${path}`
          )
            .then((response) =>
              (response.data.data ?? []).map((item) => ({
                ...item,
                cancerType: selection.cancerTypeName,
              }))
            )
            .catch((error) => {
              console.error(`Failed to load ${label}:`, error);
              return [] as ForCancerType<T>[];
            })
        )
      ).then((lists) => lists.flat());

    fetchTagged<AnatomicalSiteItem>("sites", "anatomical sites").then((items) => {
      if (requestId === masterRequestRef.current) setBodySiteOptions(items);
    });
    fetchTagged<CancerGradeItem>("grades", "cancer grades").then((items) => {
      if (requestId === masterRequestRef.current) setGradeMasterOptions(items);
    });
    fetchTagged<CancerScoreItem>("scores", "cancer scores").then((items) => {
      if (requestId === masterRequestRef.current) setScoreMasterOptions(items);
    });
    fetchTagged<InvestigationParameterItem>(
      "investigation-parameters",
      "investigation tests"
    ).then((items) => {
      if (requestId === masterRequestRef.current) setInvestigationParameters(items);
    });
  };

  const loadStagesForCancerTypes = (
    selections: {
      cancerTypeId: string;
      cancerTypeName: string;
    }[],
    resetStageSelection = true
  ) => {
    if (!selections.length) return;
    const requestId = ++stagingRequestRef.current;
    setDiagnosisLoading(true);
    setDiagnosisError("");
    setTOptions([]);
    setNOptions([]);
    setMOptions([]);
    setGrades([]);
    setMetastasisSites([]);

    Promise.all(
      selections.map((selection) =>
        API.get<{ success: boolean; data: StagingReferenceItem[] }>(
          "/oncology/reference/staging",
          { params: { cancer_type_id: selection.cancerTypeId } }
        ).then((response) => ({
          cancerTypeName: selection.cancerTypeName,
          items: response.data.data,
        }))
      )
    )
      .then((results) => {
        if (requestId !== stagingRequestRef.current) return;

        const seenStage = new Set<string>();
        const seenGrade = new Set<string>();

        const stageOptions: StageOption[] = [];
        const tOptionsAggregated: StageOption[] = [];
        const nOptionsAggregated: StageOption[] = [];
        const mOptionsAggregated: StageOption[] = [];
        const gradeOptions: StageOption[] = [];

        for (const result of results) {
          const { cancerTypeName, items } = result;

          for (const item of items) {
            const stageLabel = item.stage_label;
            if (
              stageLabel &&
              !seenStage.has(`${cancerTypeName}|${stageLabel}`)
            ) {
              seenStage.add(`${cancerTypeName}|${stageLabel}`);
              stageOptions.push({ value: stageLabel, cancerType: cancerTypeName });
            }
            const gradeSource = [
              item.stage_label,
              item.staging_system,
              item.subtype_label,
              item.tnm_criteria,
              item.risk_criteria,
            ]
              .filter((value): value is string => Boolean(value))
              .join(" ");
            for (const match of gradeSource.matchAll(
              /grade\s+group\s*[\d\-“]+|grade\s+[\d\-“]+/gi
            )) {
              const grade = match[0]
                .replace(/\s+/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase());
              if (!seenGrade.has(`${cancerTypeName}|${grade}`)) {
                seenGrade.add(`${cancerTypeName}|${grade}`);
                gradeOptions.push({ value: grade, cancerType: cancerTypeName });
              }
            }
          }

          /* T / N / M options: the storable values each criteria phrase
             names, parsed server-side, merged per cancer type in AJCC
             order - no "T1a/b/c"-style labels that can't be saved. */
          const valuesOf = (key: "t_values" | "n_values" | "m_values") =>
            [...new Set(items.flatMap((item) => item[key] ?? []))].sort(
              compareTnm
            );
          for (const value of valuesOf("t_values")) {
            tOptionsAggregated.push({ value, cancerType: cancerTypeName });
          }
          for (const value of valuesOf("n_values")) {
            nOptionsAggregated.push({ value, cancerType: cancerTypeName });
          }
          for (const value of valuesOf("m_values")) {
            mOptionsAggregated.push({ value, cancerType: cancerTypeName });
          }
        }

        setStageLabels(stageOptions);
        setTOptions(tOptionsAggregated);
        setNOptions(nOptionsAggregated);
        setMOptions(mOptionsAggregated);
        setGrades(
          gradeOptions.sort((a, b) => a.value.localeCompare(b.value))
        );
        if (!resetStageSelection) return;
        setFormData((previous) => ({
          ...previous,
          cancerStage: [],
        }));
      })
      .catch((error) => {
        console.error("Failed to load cancer stages:", error);
        if (requestId === stagingRequestRef.current) {
          setDiagnosisError(
            error?.response?.data?.message || "Failed to load cancer stages."
          );
        }
      })
      .finally(() => {
        if (requestId === stagingRequestRef.current) {
          setDiagnosisLoading(false);
        }
      });
  };

  useEffect(() => {
    let cancelled = false;

    API.get<{ success: boolean; data: CancerTypeItem[] }>(
      "/oncology/reference/cancer-types"
    )
      .then((response) => {
        if (cancelled) return;
        const fetched = response.data.data;
        setCancerTypes(fetched);

        let savedTypes: string[] = [];
        try {
          const savedDraft = JSON.parse(
            localStorage.getItem(diagnosisDraftKey) ?? ""
          ) as Partial<FormData> | null;
          savedTypes = Array.isArray(savedDraft?.cancerTypes)
            ? savedDraft.cancerTypes.map(String)
            : [];
          if (savedDraft?.type && !savedTypes.includes(savedDraft.type)) {
            savedTypes = [savedDraft.type, ...savedTypes];
          }
        } catch (error) {
          console.error("Failed to read diagnosis draft:", error);
        }

        const matchedSavedTypes = savedTypes
          .map((name) => fetched.find((item) => item.cancer_type === name))
          .filter(
            (item): item is CancerTypeItem =>
              Boolean(item && item.cancer_type_id)
          )
          .map((item) => ({
            cancerTypeId: item.cancer_type_id,
            cancerTypeName: item.cancer_type,
          }));

        if (matchedSavedTypes.length > 0) {
          // Restoring a saved draft: reload options for every saved
          // cancer type without overwriting the user's selections.
          loadSubtypesForCancerTypes(matchedSavedTypes, false);
          loadStagesForCancerTypes(matchedSavedTypes, false);
          loadMastersForCancerTypes(matchedSavedTypes);
          return;
        }

        const initial = fetched[0];

        if (initial) {
          setFormData((previous) => ({
            ...previous,
            type: previous.type || initial.cancer_type,
            icdCode: previous.icdCode || initial.icd10 || "",
          }));
          loadSubtypesForCancerTypes([
            {
              cancerTypeId: initial.cancer_type_id,
              cancerTypeName: initial.cancer_type,
            },
          ]);
          loadStagesForCancerTypes([
            {
              cancerTypeId: initial.cancer_type_id,
              cancerTypeName: initial.cancer_type,
            },
          ]);
          loadMastersForCancerTypes([
            {
              cancerTypeId: initial.cancer_type_id,
              cancerTypeName: initial.cancer_type,
            },
          ]);
        }
      })
      .catch((error) => {
        console.error("Failed to load cancer types:", error);
        if (!cancelled) {
          setDiagnosisError(
            error?.response?.data?.message || "Failed to load cancer types."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadDiagnosisCatalog()
      .then((diagnoses) => {
        if (cancelled) return;
        diagnosisCatalogRef.current = diagnoses;
        setDiagnosisCatalogReady(true);
      })
      .catch((error) => {
        console.error("Failed to load diagnosis catalog:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleTypesChange = (values: string[]) => {
    setSelectedCancerTypes(values);

    /* Reload the dependent fields off the first selected type. */
    const primaryType = values[0] ?? "";
    /* Drop grouped selections that belonged to a deselected cancer type. */
    const keepSelectedTypes = (items: string[]) =>
      items.filter((item) => {
        const { cancerType } = splitQualified(item);
        return !cancerType || values.includes(cancerType);
      });
    setFormData((previous) => ({
      ...previous,
      type: primaryType,
      cancerTypes: values,
      subType: [],
      icdCode: "",
      laterality: keepSelectedTypes(previous.laterality),
      bodySite: keepSelectedTypes(previous.bodySite),
      grade: keepSelectedTypes(previous.grade),
      score: keepSelectedTypes(previous.score),
    }));

/* Histopathology shows the subtypes of every selected cancer type,
       grouped under its parent cancer type. */
    const selectedTypes = values
      .map((name) => cancerTypes.find((item) => item.cancer_type === name))
      .filter(
        (item): item is CancerTypeItem =>
          Boolean(item && item.cancer_type_id)
      )
      .map((item) => ({
        cancerTypeId: item.cancer_type_id,
        cancerTypeName: item.cancer_type,
      }));
    loadSubtypesForCancerTypes(selectedTypes);
    loadStagesForCancerTypes(selectedTypes);
    loadMastersForCancerTypes(selectedTypes);
  };

  /* Per-cancer-type option groups for Laterality / Body Site / Grade, in
     the order the cancer types were selected. */
  const optionTypes =
    selectedCancerTypes.length > 0
      ? selectedCancerTypes
      : formData.type
        ? [formData.type]
        : [];

  /* Laterality only under the selected cancer types it applies to; older
     picks for other types (or retired values like "Midline") are ignored. */
  const lateralityTypes = optionTypes.filter(
    (cancerType) =>
      cancerTypes.find((item) => item.cancer_type === cancerType)
        ?.laterality_applicable
  );
  const lateralityGroups = buildCheckboxGroups(
    lateralityTypes.flatMap((cancerType) =>
      LATERALITY_OPTIONS.map((value) => ({ value, cancerType }))
    )
  );
  const lateralitySelected = formData.laterality.filter((value) => {
    const { cancerType, raw } = splitQualified(value);
    return (
      lateralityTypes.includes(cancerType || formData.type) &&
      LATERALITY_OPTIONS.includes(raw)
    );
  });

  const bodySiteGroups = buildCheckboxGroups(
    optionTypes.flatMap((cancerType) => {
      const sites = bodySiteOptions.filter(
        (site) => site.cancerType === cancerType
      );
      const names =
        sites.length > 0
          ? sites.map((site) => site.site_name)
          : BODY_SITE_OPTIONS;
      return names.map((value) => ({ value, cancerType }));
    })
  );

  const gradeGroups = buildCheckboxGroups(
    optionTypes.flatMap((cancerType) => {
      const masters = gradeMasterOptions.filter(
        (grade) => grade.cancerType === cancerType
      );
      return masters.length > 0
        ? masters.map((grade) => ({ value: grade.grade_value, cancerType }))
        : grades.filter((grade) => grade.cancerType === cancerType);
    })
  );

  /* The Histopathology values ticked under a cancer type. */
  const subtypeLabelsFor = (cancerType: string) =>
    formData.subType
      .filter((value) => {
        const parsed = splitQualified(value);
        return !parsed.cancerType || parsed.cancerType === cancerType;
      })
      .map((value) => splitQualified(value).raw);

  /* Score options: subtype-specific scores (e.g. IPI for DLBCL) only appear
     once a matching Histopathology value is ticked for that cancer type. */
  const scoreOptions: ScoreOption[] = optionTypes.flatMap((cancerType) => {
    const subtypeLabels = subtypeLabelsFor(cancerType);
    return scoreMasterOptions
      .filter(
        (score) =>
          score.cancerType === cancerType &&
          matchesSubtypeKeywords(score.subtype_keywords, subtypeLabels)
      )
      .map((score) => ({
        cancerType,
        system: score.score_system,
        value: score.score_value,
      }));
  });

  /* Investigation Results: one numbered panel per selected cancer type,
     holding only that type's tests (grouped by chart; subtype-specific
     charts once a matching Histopathology is ticked) and the values of its
     earlier visits. A test two types share (e.g. CEA) is kept per type. */
  const investigationPanels = optionTypes.map((cancerType, index) => {
    const subtypeLabels = subtypeLabelsFor(cancerType);
    const parameters = investigationParameters.filter(
      (parameter) =>
        parameter.cancerType === cancerType &&
        matchesSubtypeKeywords(parameter.subtype_keywords, subtypeLabels)
    );

    const charts: {
      name: string;
      parameters: ForCancerType<InvestigationParameterItem>[];
    }[] = [];
    parameters.forEach((parameter) => {
      let chart = charts.find((item) => item.name === parameter.chart_name);
      if (!chart) {
        chart = { name: parameter.chart_name, parameters: [] };
        charts.push(chart);
      }
      chart.parameters.push(parameter);
    });

    const shownIds = new Set(parameters.map((parameter) => parameter.parameter_id));
    const visits = new Map<
      string,
      { encounterNo: string; reportDate: string; values: Record<string, InvestigationResultRecord> }
    >();
    investigationHistory
      .filter(
        (row) =>
          row.encounter_no !== investigationVisitNo && shownIds.has(row.parameter_id)
      )
      .forEach((row) => {
        const visit = visits.get(row.encounter_no) ?? {
          encounterNo: row.encounter_no,
          reportDate: row.report_date,
          values: {},
        };
        visit.values[row.parameter_id] = row;
        visits.set(row.encounter_no, visit);
      });
    const history = [...visits.values()]
      .sort((a, b) => b.reportDate.localeCompare(a.reportDate))
      .slice(0, 5);

    return { number: index + 1, cancerType, charts, parameters, history };
  });

  const setInvestigationValue = (parameterId: string, value: string) =>
    setFormData((previous) => ({
      ...previous,
      investigationResults: {
        ...previous.investigationResults,
        [parameterId]: value,
      },
    }));

  /* One test's input: a number with its range and a High / Low tag, a
     free-text report, a date, or a +/- choice. */
  const renderInvestigationInput = (
    parameter: ForCancerType<InvestigationParameterItem>
  ) => {
    const id = `investigation-${parameter.parameter_id}`;
    const value = formData.investigationResults[parameter.parameter_id] ?? "";

    if (parameter.input_type === "DATE") {
      return (
        <DiagnosisDateField
          key={parameter.parameter_id}
          id={id}
          title={parameter.parameter_name}
          value={value}
          onChange={(next) => setInvestigationValue(parameter.parameter_id, next)}
        />
      );
    }

    const flag = investigationFlag(parameter, value);
    return (
      <div key={parameter.parameter_id}>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <label htmlFor={id} className="text-sm font-semibold text-gray-600">
            {parameter.parameter_name}
            {parameter.unit ? ` (${parameter.unit})` : ""}
          </label>
          {parameter.range_label && (
            <span className="shrink-0 text-xs text-gray-400">
              Normal {parameter.range_label}
            </span>
          )}
        </div>
        {parameter.input_type === "SELECT" ? (
          <select
            id={id}
            value={value}
            onChange={(event) =>
              setInvestigationValue(parameter.parameter_id, event.target.value)
            }
            className={INVESTIGATION_INPUT_CLASS}
          >
            <option value="">Select</option>
            {(parameter.select_options ?? "")
              .split("|")
              .map((option) => option.trim())
              .filter(Boolean)
              .map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
          </select>
        ) : parameter.input_type === "TEXT" ? (
          <textarea
            id={id}
            rows={2}
            value={value}
            onChange={(event) =>
              setInvestigationValue(parameter.parameter_id, event.target.value)
            }
            placeholder="Enter report findings"
            className={`${INVESTIGATION_INPUT_CLASS} resize-y`}
          />
        ) : (
          <div className="relative">
            <input
              id={id}
              type="text"
              inputMode="decimal"
              value={value}
              onChange={(event) =>
                setInvestigationValue(parameter.parameter_id, event.target.value)
              }
              placeholder="Value"
              className={`${INVESTIGATION_INPUT_CLASS} ${
                flag ? "border-red-300 pr-16 text-red-700" : ""
              }`}
            />
            {flag && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600 ring-1 ring-inset ring-red-200">
                {flag}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  const scoreSystemOf = (qualified: string) => {
    const { cancerType, raw } = splitQualified(qualified);
    return scoreMasterOptions.find(
      (score) => score.cancerType === cancerType && score.score_value === raw
    )?.score_system;
  };

  /* Multiple scores may be picked, but only one value per score system per
     cancer type (e.g. one IPI value), mirroring the T/N/M one-per-type rule. */
  const handleScoreToggle = (value: string, select?: boolean) => {
    setFormData((previous) => {
      const present = previous.score.includes(value);
      const adding = select ?? !present;
      if (!adding) {
        return {
          ...previous,
          score: previous.score.filter((item) => item !== value),
        };
      }
      if (present) return previous;
      const system = scoreSystemOf(value);
      const { cancerType } = splitQualified(value);
      return {
        ...previous,
        score: [
          ...previous.score.filter(
            (item) =>
              !system ||
              splitQualified(item).cancerType !== cancerType ||
              scoreSystemOf(item) !== system
          ),
          value,
        ],
      };
    });
  };

  /* Typed score that isn't in the master list; filed under the primary
     cancer type. */
  const handleScoreCustom = (text: string) => {
    const cancerType = optionTypes[0] ?? "";
    const value = cancerType ? `${cancerType}|${text}` : text;
    setFormData((previous) =>
      previous.score.includes(value)
        ? previous
        : { ...previous, score: [...previous.score, value] }
    );
  };

  const handleNext = async () => {
    if (!resolvedPatientId) {
      setDiagnosisError(
        "Patient is not selected. Open this page from a patient consultation to continue."
      );
      return;
    }

    const hasAnyData =
      formData.type ||
      formData.subType.length > 0 ||
      formData.cancerStage.length > 0 ||
      formData.score.length > 0 ||
      formData.tStage.length > 0 ||
      formData.nStage.length > 0 ||
      formData.mStage.length > 0 ||
      formData.icdCode.trim() ||
      formData.notes.trim();

    if (!hasAnyData) {
      setDiagnosisError(
        "Please select or enter the important field in the previous form."
      );
      return;
    }

    if (
      formData.mStage.some((stage) =>
        splitQualified(stage).raw.trim().toUpperCase().startsWith("M1")
      ) &&
      metastasisSites.length === 0
    ) {
      setDiagnosisError(
        "Please select at least one Metastasis Site when the M stage is M1."
      );
      return;
    }

    /* Dates are typed or picked as DD-MM-YYYY; reject anything that isn't a
       real date, and progression / relapse can't precede diagnosis. */
    const dateFields = [
      { label: "Date of Diagnosis", value: formData.diagnosisDate },
      { label: "Date of Progression", value: formData.progressionDate },
      { label: "Date of Relapse", value: formData.relapseDate },
    ];
    const invalidDate = dateFields.find(
      (field) => field.value.trim() && !parsePickedDate(field.value.trim())
    );
    if (invalidDate) {
      setDiagnosisError(`${invalidDate.label} must be in DD-MM-YYYY format.`);
      return;
    }
    const diagnosisDateIso = toIsoDate(formData.diagnosisDate);
    const progressionDateIso = toIsoDate(formData.progressionDate);
    const relapseDateIso = toIsoDate(formData.relapseDate);
    if (diagnosisDateIso) {
      if (progressionDateIso && progressionDateIso < diagnosisDateIso) {
        setDiagnosisError(
          "Date of Progression cannot be earlier than the Date of Diagnosis."
        );
        return;
      }
      if (relapseDateIso && relapseDateIso < diagnosisDateIso) {
        setDiagnosisError(
          "Date of Relapse cannot be earlier than the Date of Diagnosis."
        );
        return;
      }
    }

    /* Investigation Results: number tests must be numbers and dates real
       dates. The Report Date defaults to the Date of Diagnosis. */
    const shownInvestigationParameters = investigationPanels.flatMap(
      (panel) => panel.parameters
    );
    const enteredInvestigations = shownInvestigationParameters.filter((parameter) =>
      (formData.investigationResults[parameter.parameter_id] ?? "").trim()
    );
    for (const parameter of enteredInvestigations) {
      const value = formData.investigationResults[parameter.parameter_id].trim();
      if (parameter.input_type === "NUMBER" && !Number.isFinite(Number(value))) {
        setDiagnosisError(
          `${parameter.parameter_name} (${parameter.cancerType}) must be a number.`
        );
        return;
      }
      if (parameter.input_type === "DATE" && !parsePickedDate(value)) {
        setDiagnosisError(
          `${parameter.parameter_name} (${parameter.cancerType}) must be in DD-MM-YYYY format.`
        );
        return;
      }
    }
    const investigationReportDate =
      formData.investigationReportDate.trim() || formData.diagnosisDate.trim();
    if (investigationReportDate && !parsePickedDate(investigationReportDate)) {
      setDiagnosisError("Investigation Report Date must be in DD-MM-YYYY format.");
      return;
    }

    /* T / N / M picked from an older option list (e.g. "T1a/b/c") can't be
       stored - ask for a re-pick instead of failing on save. */
    const staleChecks: [string, string[], StageOption[]][] = [
      ["T Stage", formData.tStage, tOptions],
      ["N Stage", formData.nStage, nOptions],
      ["M Stage", formData.mStage, mOptions],
    ];
    for (const [label, values, options] of staleChecks) {
      for (const value of values) {
        const { cancerType, raw } = splitQualified(value);
        const type = cancerType || formData.type;
        const typeOptions = options.filter(
          (option) => option.cancerType === type
        );
        if (
          typeOptions.length > 0 &&
          !typeOptions.some((option) => option.value === raw)
        ) {
          setDiagnosisError(
            `Please re-select the ${label} for ${type}: "${raw}" is not a valid value.`
          );
          return;
        }
      }
    }

    /* The one value picked under a cancer type (one per type); a legacy
       unqualified value belongs to the primary type. Each cancer type's
       laterality / T / N / M is stored on its own row (primary: the
       staging detail; others: additional_cancers). */
    const valueFor = (values: string[], cancerType: string) => {
      const match = values.find((value) => {
        const parsed = splitQualified(value);
        return parsed.cancerType
          ? parsed.cancerType === cancerType
          : cancerType === formData.type;
      });
      return match ? splitQualified(match).raw : undefined;
    };
    const lateralityFor = (cancerType: string) =>
      lateralityTypes.includes(cancerType)
        ? valueFor(lateralitySelected, cancerType)
        : undefined;

    /* The histopathology ticked under a cancer type (one per type). The
       primary one must come from under the primary type - not simply the
       first box ticked, which may belong to another selected type. */
    const subtypeFor = (cancerType: string) =>
      formData.subType
        .map((value) => splitQualified(value))
        .filter(
          (parsed) => !parsed.cancerType || parsed.cancerType === cancerType
        )
        .map((parsed) =>
          subtypes.find(
            (item) =>
              item.subtype_name === parsed.raw && item.cancerType === cancerType
          )
        )
        .find((item): item is CancerSubtypeOption => Boolean(item));

    if (formData.type && !subtypeFor(formData.type)) {
      setDiagnosisError(
        `Please select a Histopathology for ${formData.type}.`
      );
      return;
    }

    setDiagnosisError("");
    setSavingDiagnosis(true);

    try {
      const matchedType = cancerTypes.find(
        (item) => item.cancer_type === formData.type
      );
      const matchedSubtype = subtypeFor(formData.type);

      /* Every other selected cancer type, with the histopathology ticked
         under it, so protocols for these cancers can be saved on the plan. */
      const additionalCancers = selectedCancerTypes
        .filter((name) => name !== formData.type)
        .map((name) => cancerTypes.find((item) => item.cancer_type === name))
        .filter((item): item is CancerTypeItem =>
          Boolean(item?.cancer_type_id)
        )
        .map((item) => ({
          cancer_type_id: item.cancer_type_id,
          cancer_subtype_id: subtypeFor(item.cancer_type)?.subtype_id ?? null,
          laterality: lateralityFor(item.cancer_type) ?? null,
          t_stage: valueFor(formData.tStage, item.cancer_type) ?? null,
          n_stage: valueFor(formData.nStage, item.cancer_type) ?? null,
          m_stage: valueFor(formData.mStage, item.cancer_type) ?? null,
        }));

      const primaryTStage = valueFor(formData.tStage, formData.type);
      const primaryNStage = valueFor(formData.nStage, formData.type);
      const primaryMStage = valueFor(formData.mStage, formData.type);
      const primaryLaterality = lateralityFor(formData.type);

      const diagnosisId = await resolveDiagnosisId(
        resolvedPatientId,
        formData.icdCode
      );

      /* Grading / scoring systems behind the picked values, de-duplicated
         (custom typed scores have no system). */
      const uniqueJoin = (items: (string | undefined)[]) =>
        Array.from(new Set(items.filter(Boolean))).join(", ");
      const gradeSystems = uniqueJoin(
        formData.grade.map((value) => {
          const { cancerType, raw } = splitQualified(value);
          return gradeMasterOptions.find(
            (item) =>
              item.grade_value === raw &&
              (!cancerType || item.cancerType === cancerType)
          )?.grade_system;
        })
      );
      const scoreSystems = uniqueJoin(formData.score.map(scoreSystemOf));

      const visitDateIso = toIsoDate(visitDate);

      const stagingFields: Record<string, unknown> = {
        cancer_type_id: matchedType?.cancer_type_id ?? "",
        cancer_subtype_id: matchedSubtype?.subtype_id ?? "",
        /* Always sent: the list is replaced, so a deselected type is removed. */
        additional_cancers: additionalCancers,
        ...(diagnosisId ? { diagnosis_id: diagnosisId } : {}),
        ...(formData.cancerStage.length > 0
          ? {
              clinical_stage: formData.cancerStage
                .map((stage) => splitQualified(stage).raw)
                .join(", "),
            }
          : {}),
        ...(primaryTStage ? { t_stage: primaryTStage } : {}),
        ...(primaryNStage ? { n_stage: primaryNStage } : {}),
        ...(primaryMStage ? { m_stage: primaryMStage } : {}),
        ...(metastasisSites.length > 0
          ? { metastasis_sites: metastasisSites }
          : {}),
        ...(formData.preDiagnosis
          ? { pre_diagnosis: formData.preDiagnosis }
          : {}),
        ...(formData.diseaseStatus
          ? { disease_status: formData.diseaseStatus }
          : {}),
        ...(primaryLaterality ? { laterality: primaryLaterality } : {}),
        ...(formData.bodySite.length > 0
          ? { site: joinRaw(formData.bodySite) }
          : {}),
        ...(formData.grade.length > 0
          ? { grade: joinRaw(formData.grade) }
          : {}),
        ...(gradeSystems ? { grade_system: gradeSystems } : {}),
        ...(formData.score.length > 0
          ? { score: joinRaw(formData.score) }
          : {}),
        ...(scoreSystems ? { score_system: scoreSystems } : {}),
        ...(visitDateIso ? { visit_date: visitDateIso } : {}),
        ...(diagnosisDateIso ? { diagnosis_date: diagnosisDateIso } : {}),
        ...(progressionDateIso
          ? { progression_date: progressionDateIso }
          : {}),
        ...(relapseDateIso ? { relapse_date: relapseDateIso } : {}),
        ...(formData.notes.trim() ? { notes: formData.notes.trim() } : {}),
      };

      /* One staging detail per visit: re-saving in this visit updates its
         row; a new visit records a new row, so earlier visits keep their
         diagnosis in the patient's history. */
      let visitEncounterNo = "";
      let existingStagingDetailId = "";
      try {
        visitEncounterNo = await resolveVisitEncounterNo();
        existingStagingDetailId = visitEncounterNo
          ? await findStagingDetailForEncounter(
              resolvedPatientId,
              visitEncounterNo
            )
          : "";
      } catch (error) {
        console.error("Failed to resolve this visit's staging detail:", error);
      }

      let stagingDetailId = existingStagingDetailId;

      if (existingStagingDetailId) {
        try {
          await API.put(
            `/oncology/staging-details/${existingStagingDetailId}`,
            stagingFields
          );
        } catch (updateError: any) {
          if (updateError?.response?.status === 404) {
            stagingDetailId = "";
          } else {
            throw updateError;
          }
        }
      }

      if (!stagingDetailId) {
        const response = await API.post<{
          success: boolean;
          data: { staging_detail_id: string };
        }>("/oncology/staging-details", {
          patient_id: resolvedPatientId,
          ...(visitEncounterNo ? { encounter_no: visitEncounterNo } : {}),
          ...stagingFields,
        });
        stagingDetailId = response.data.data?.staging_detail_id ?? "";
      }

      if (stagingDetailId) {
        localStorage.setItem(
          `hms_staging_detail_id_${resolvedPatientId}`,
          JSON.stringify({ staging_detail_id: stagingDetailId })
        );

        /* When this patient already has a chemotherapy plan, re-link it to
           the new diagnosis so downstream viewers (patient-details) show
           the updated cancer type / stage immediately. */
        try {
          const existingPlan = await API.get<{
            success: boolean;
            data: { chemotherapy_plan_id: string; treatment_status?: string | null } | null;
          }>("/chemotherapy/plans/latest-for-patient", {
            params: {
              patient_id: resolvedPatientId,
            },
          });
          const existingPlanId =
            existingPlan.data.data?.chemotherapy_plan_id;
          /* A closed course keeps the diagnosis it was treated for. */
          if (existingPlanId && !isChemoPlanClosed(existingPlan.data.data)) {
            /* The server refreshes the plan's cancer type / subtype /
               stage from this staging detail. */
            await API.put(`/chemotherapy/plans/${existingPlanId}`, {
              staging_detail_id: stagingDetailId,
            });
          }
        } catch (planSyncError: any) {
          console.error(
            "Failed to sync new diagnosis onto existing plan:",
            planSyncError?.response?.data?.message ?? planSyncError?.message
          );
        }
      }

      /* This visit's Investigation Results, saved with the diagnosis. Every
         shown test is sent - a cleared one is removed for this visit. */
      const visitHasSavedResults = investigationHistory.some(
        (row) => row.encounter_no === (visitEncounterNo || investigationVisitNo)
      );
      if (enteredInvestigations.length > 0 || visitHasSavedResults) {
        const resultsVisitNo = visitEncounterNo || investigationVisitNo;
        if (!resultsVisitNo) {
          setDiagnosisError(
            "No active encounter was found for this visit, so the investigation results could not be saved."
          );
          return;
        }
        const savedResults = await API.put<{
          success: boolean;
          data: InvestigationResultRecord[];
        }>("/oncology/investigation-results", {
          patient_id: resolvedPatientId,
          encounter_no: resultsVisitNo,
          ...(stagingDetailId ? { staging_detail_id: stagingDetailId } : {}),
          report_date:
            toIsoDate(investigationReportDate) ||
            toIsoDate(visitDate) ||
            new Date().toISOString().slice(0, 10),
          results: shownInvestigationParameters.map((parameter) => {
            const raw = (
              formData.investigationResults[parameter.parameter_id] ?? ""
            ).trim();
            return {
              parameter_id: parameter.parameter_id,
              value: parameter.input_type === "DATE" && raw ? toIsoDate(raw) : raw,
            };
          }),
        });
        setInvestigationHistory((previous) => [
          ...previous.filter((row) => row.encounter_no !== resultsVisitNo),
          ...(savedResults.data.data ?? []),
        ]);
      }

      onNext?.();
    } catch (error: any) {
      console.error("Failed to save oncology staging details:", error);
      setDiagnosisError(
        error?.response?.data?.message ||
          "Failed to save the oncology diagnosis. Please try again."
      );
    } finally {
      setSavingDiagnosis(false);
    }
  };

  const handleBack = () => {
    window.history.back();
  };

  const content = (
    <section className="flex w-full flex-1 flex-col">
      <h2 className="mb-8 text-2xl font-bold text-[#334155]">
        Diagnosis
      </h2>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleNext();
        }}
        className="space-y-8"
      >
        {/* Four Column Fields */}
        <div className="grid grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-3 lg:grid-cols-3">
          {/* Date of Diagnosis */}
          <DiagnosisDateField
            id="diagnosisDate"
            title="Date of Diagnosis"
            value={formData.diagnosisDate}
            onChange={(value) =>
              setFormData((previous) => ({ ...previous, diagnosisDate: value }))
            }
          />

          {/* Date of Progression */}
          <DiagnosisDateField
            id="progressionDate"
            title="Date of Progression"
            value={formData.progressionDate}
            onChange={(value) =>
              setFormData((previous) => ({
                ...previous,
                progressionDate: value,
              }))
            }
          />

          {/* Date of Relapse */}
          <DiagnosisDateField
            id="relapseDate"
            title="Date of Relapse"
            value={formData.relapseDate}
            onChange={(value) =>
              setFormData((previous) => ({ ...previous, relapseDate: value }))
            }
          />

          {/* Pre Diagnosis */}
          <div>
            <label
              htmlFor="preDiagnosis"
              className="mb-2 block text-sm font-semibold text-gray-600"
            >
              Pre Diagnosis
            </label>

            <div className="relative">
              <input
                id="preDiagnosis"
                name="preDiagnosis"
                type="text"
                value={formData.preDiagnosis}
                onChange={handleChange}
                placeholder="Type the pre diagnosis..."
                className="block w-full rounded-md border-gray-300 bg-white py-3 pl-4 pr-10 text-sm text-gray-800 focus:border-[#1d4ed8] focus:outline-none focus:ring-[#1d4ed8]"
              />
            </div>
          </div>


          {/* Disease Status */}
          <DiagnosisCheckboxSelect
            title="Disease Status"
            options={[
              "Newly Diagnosed",
              "In Remission",
              "Recurrence",
              "Progressive",
              "Stable",
              "Metastatic",
            ]}
            value={formData.diseaseStatus}
            onChange={(value) =>
              setFormData((previous) => ({
                ...previous,
                diseaseStatus: value,
              }))
            }
            placeholder="Select Disease Status"
          />

          {/* Cancer Type */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-600">
              Cancer Type
            </label>

            <MultiSelectDropdown
              options={cancerTypes.map((cancerType) => ({
                label: cancerType.cancer_type,
                value: cancerType.cancer_type,
              }))}
              value={selectedCancerTypes}
              onValueChange={handleTypesChange}
              placeholder="Select Cancer Type"
            />
          </div>

          {/* Laterality - only when a selected cancer type has one */}
          {lateralityTypes.length > 0 && (
            <DiagnosisCheckboxList
              title="Laterality"
              groups={lateralityGroups}
              selected={lateralitySelected}
              onToggle={handleMultiToggle("laterality")}
            />
          )}

          {/* Body Site */}
          <DiagnosisCheckboxList
            title="Body Site"
            groups={bodySiteGroups}
            selected={formData.bodySite}
            onToggle={handleMultiToggle("bodySite")}
            loading={diagnosisLoading}
          />

          {/* Histopathology */}
          <DiagnosisCheckboxList
            title="Histopathology"
            groups={buildCheckboxGroups(
              subtypes.map((item) => ({
                value: item.subtype_name,
                cancerType: item.cancerType,
              }))
            )}
            selected={formData.subType}
            onToggle={handleMultiToggle("subType")}
            loading={diagnosisLoading}
          />

          {/* Histomorphology 
          <div>
            <label
              htmlFor="histomorphology"
              className="mb-2 block text-sm font-semibold text-gray-600"
            >
              Histomorphology
            </label>

            <div className="relative">
              <select
                id="histomorphology"
                name="histomorphology"
                value={formData.histomorphology}
                onChange={handleChange}
                className="block w-full appearance-none rounded-md border-gray-300 bg-white py-3 pl-4 pr-10 text-sm text-gray-800 focus:border-[#1d4ed8] focus:outline-none focus:ring-[#1d4ed8]"
              >
              </select>

              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <ChevronDownIcon />
              </div>
            </div>
          </div>*/}

          {/* Cancer Stage */}
          <DiagnosisCheckboxList
            title="Cancer Stage"
            groups={buildCheckboxGroups(stageLabels)}
            selected={formData.cancerStage}
            onToggle={handleMultiToggle("cancerStage")}
            loading={diagnosisLoading}
          />

          {/* Grade */}
          <DiagnosisCheckboxList
            title="Grade"
            groups={gradeGroups}
            selected={formData.grade}
            onToggle={handleMultiToggle("grade")}
            loading={diagnosisLoading}
          />

          {/* Score */}
          <DiagnosisScoreList
            title="Score"
            options={scoreOptions}
            selected={formData.score}
            onToggle={handleScoreToggle}
            onAddCustom={handleScoreCustom}
            loading={diagnosisLoading}
          />

          {/* TNM Staging */}
          <div className="col-span-full grid grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-3 lg:grid-cols-3">
            {/* T Stage */}
            <DiagnosisCheckboxList
              title="T Stage"
              groups={buildCheckboxGroups(tOptions)}
              selected={formData.tStage}
              onToggle={handleMultiToggle("tStage")}
              loading={diagnosisLoading}
            />

{/* N Stage */}
            <DiagnosisCheckboxList
              title="N Stage"
              groups={buildCheckboxGroups(nOptions)}
              selected={formData.nStage}
              onToggle={handleMultiToggle("nStage")}
              loading={diagnosisLoading}
            />

            {/* M Stage */}
            <DiagnosisCheckboxList
              title="M Stage"
              groups={buildCheckboxGroups(mOptions)}
              selected={formData.mStage}
              onToggle={handleMultiToggle("mStage")}
              loading={diagnosisLoading}
            />
          </div>

          {/* Metastasis Sites - shown when M stage is M1+ */}
          {formData.mStage.some((stage) =>
            splitQualified(stage).raw.trim().toUpperCase().startsWith("M1")
          ) && (
            <div className="col-span-full">
              <label className="mb-2 block text-sm font-semibold text-gray-600">
                Metastasis Sites
              </label>
              <MultiSelectDropdown
                options={[
                  "Bone", "Liver", "Lung", "Brain", "Lymph Nodes",
                  "Adrenal Gland", "Peritoneum", "Pleura", "Skin",
                  "Contralateral Adrenal", "Ovary", "Other"
                ]}
                value={metastasisSites}
                onValueChange={setMetastasisSites}
                placeholder="Select metastasis site(s)"
              />
            </div>
          )}

          {/* ICD Code */}
          <div>
            <label
              htmlFor="icdCode"
              className="mb-2 block text-sm font-semibold text-gray-600"
            >
              ICD Code
            </label>

            <input
              id="icdCode"
              name="icdCode"
              type="text"
              value={formData.icdCode}
              onChange={handleChange}
              placeholder={
                diagnosisLoading
                  ? "Loading diagnosis"
                  : "Enter ICD code"
              }
              className="block w-full rounded-md border-gray-300 px-4 py-3 text-sm text-gray-800 shadow-sm focus:border-[#1d4ed8] focus:ring-[#1d4ed8]"
            />
          </div>

          {/* Survivor */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-600">
              Survivor
            </label>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-sm text-gray-700">
                <input
                  type="checkbox"
                  name="survivor"
                  checked={formData.survivor === "Yes"}
                  onChange={() =>
                    setFormData((previous) => ({
                      ...previous,
                      survivor: formData.survivor === "Yes" ? "" : "Yes",
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-[#1d4ed8] accent-[#1d4ed8] focus:ring-[#1d4ed8]"
                />
                Yes
              </label>
              <label className="flex items-center gap-1.5 text-sm text-gray-700">
                <input
                  type="checkbox"
                  name="survivor"
                  checked={formData.survivor === "No"}
                  onChange={() =>
                    setFormData((previous) => ({
                      ...previous,
                      survivor: formData.survivor === "No" ? "" : "No",
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-[#1d4ed8] accent-[#1d4ed8] focus:ring-[#1d4ed8]"
                />
                No
              </label>
            </div>
          </div>
        </div>

        {/* Diagnosis API Error */}
        {diagnosisError && (
          <div className="text-sm font-medium text-red-600">
            {diagnosisError}
          </div>
        )}

        {/* Notes */}
        <div className="pt-2">
          <label
            htmlFor="notes"
            className="mb-2 block text-sm font-semibold text-gray-600"
          >
            Notes
          </label>

          <VoiceToText
            value={formData.notes}
            onChange={(text) =>
              setFormData((previous) => ({ ...previous, notes: text }))
            }
            placeholder="Enter notes..."
          />
        </div>

        {/* Investigation Results - one numbered panel per selected cancer
            type (1 | 2 | 3), each with its own tests and ranges. */}
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-base font-semibold text-gray-800">
                Investigation Results
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Test report values for this visit, per selected cancer type.
                Values outside the normal range are flagged.
              </p>
            </div>
            <div className="w-full sm:w-56">
              <DiagnosisDateField
                id="investigationReportDate"
                title="Report Date"
                value={formData.investigationReportDate || formData.diagnosisDate}
                onChange={(value) =>
                  setFormData((previous) => ({
                    ...previous,
                    investigationReportDate: value,
                  }))
                }
              />
            </div>
          </div>

          {investigationPanels.length === 0 ? (
            <p className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
              Select a cancer type to enter its investigation results.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {investigationPanels.map((panel) => (
                <div
                  key={panel.cancerType}
                  className="flex flex-col rounded-lg border border-gray-200 bg-slate-50/60"
                >
                  <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1d4ed8] text-xs font-bold text-white">
                      {panel.number}
                    </span>
                    <span className="text-sm font-semibold text-gray-800">
                      {panel.cancerType}
                    </span>
                  </div>

                  <div className="flex-1 space-y-5 p-4">
                    {panel.charts.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        No investigation tests are defined for {panel.cancerType}.
                      </p>
                    ) : (
                      panel.charts.map((chart) => (
                        <div key={chart.name}>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {chart.name}
                          </p>
                          <div className="space-y-3">
                            {chart.parameters.map(renderInvestigationInput)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {panel.history.length > 0 && (
                    <div className="border-t border-gray-200 px-4 py-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Previous results
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="text-gray-500">
                              <th className="whitespace-nowrap py-1 pr-3 font-semibold">
                                Date
                              </th>
                              {panel.parameters.map((parameter) => (
                                <th
                                  key={parameter.parameter_id}
                                  className="whitespace-nowrap py-1 pr-3 font-semibold"
                                >
                                  {parameter.parameter_name}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {panel.history.map((visit) => (
                              <tr key={visit.encounterNo}>
                                <td className="whitespace-nowrap py-1.5 pr-3 text-gray-700">
                                  {toPickedDateValue(visit.reportDate) || "—"}
                                </td>
                                {panel.parameters.map((parameter) => {
                                  const row = visit.values[parameter.parameter_id];
                                  return (
                                    <td
                                      key={parameter.parameter_id}
                                      className={`py-1.5 pr-3 ${
                                        row?.is_abnormal
                                          ? "font-semibold text-red-600"
                                          : "text-gray-700"
                                      }`}
                                    >
                                      {row
                                        ? parameter.input_type === "DATE"
                                          ? toPickedDateValue(row.value_text)
                                          : row.value_text
                                        : "—"}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Action */}
        <div className="mt-12 flex justify-end">
          <button
            type="submit"
            disabled={savingDiagnosis}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-[#1d4ed8] px-6 py-3 text-base font-medium text-white shadow-sm transition-colors hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <DoubleArrowIcon />
            <span className="ml-2">{savingDiagnosis ? "Saving..." : "Next"}</span>
          </button>
        </div>
      </form>
    </section>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans text-[#334155] sm:p-6 lg:p-8">
      {/* Main App Container */}
      <div className="mx-auto flex min-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_0_rgba(0,0,0,0.06)]">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4 sm:px-8">
          {/* Back Button + Title */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleBack}
              aria-label="Go back"
              className="text-gray-500 transition-colors hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <BackIcon />
            </button>

            <h1 className="text-xl font-bold text-gray-800">
              Patients
            </h1>
          </div>

          {/* Notification + User */}
          <div className="flex items-center gap-4 sm:gap-6">
            <BellNotificationButton size="md" />

            <UserProfileDropdown
              userName={getUser()?.username || "Doctor"}
              userSubtext={getUser()?.role || "Doctor"}
              userAvatar={userAvatarUrl || undefined}
              avatarLoading={avatarLoading}
              onLogout={() => { localStorage.clear(); window.location.href = '/login'; }}
              profilePath="/doctor/profile"
              notificationsPath="/doctor/notifications"
            />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex flex-1 flex-col px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
          {/* Stepper */}
          <div className="mx-auto mb-12 w-full max-w-4xl sm:mb-16">
            <div className="relative flex justify-between">
              {/* Consultation */}
              <div className="flex w-1/3 flex-col items-center text-center">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-500">
                  <CheckIcon className="h-4 w-4 text-white" />
                </div>

                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-800 sm:text-xs sm:tracking-widest">
                  Consultation
                </span>
              </div>

              {/* Lab Report Review */}
              <div className="flex w-1/3 flex-col items-center text-center">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-500">
                  <CheckIcon className="h-4 w-4 text-white" />
                </div>

                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-800 sm:text-xs sm:tracking-widest">
                  Lab Report Review
                </span>
              </div>

              {/* Diagnosis */}
              <div className="relative flex w-1/3 flex-col items-center text-center">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#22c55e]">
                  <CheckIcon className="h-4 w-4 text-white" />
                </div>

                <span className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-800 sm:text-xs sm:tracking-widest">
                  Diagnosis
                </span>

                {/* Active Indicator */}
                <div className="absolute bottom-0 h-1.5 w-full translate-y-2 rounded-full bg-[#22c55e]" />
              </div>
            </div>
          </div>

          {content}
        </main>
      </div>
    </div>
  );
};

export default Diagnosis;
