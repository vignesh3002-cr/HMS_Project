import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import API from "../../../api/axios";
import { getUser } from "../../../utils/token";
import { BellNotificationButton } from "@/components/hms/BellNotificationButton";
import { MultiSelectDropdown } from "../../../components/ui/multi-select-dropdown";
import { UserProfileDropdown } from "../../../components/ui/User_profile_dropdown";
import VoiceToText from "@/components/ui/voicetotext";
import type { ConsultationState, FormData } from "./types";
import {
  formatPickedDate,
  parsePickedDate,
  resolveDiagnosisId,
  resolveStagingDetailId,
  toIsoDate,
} from "./helpers";
import { BackIcon, CheckIcon, ChevronDownIcon, DoubleArrowIcon } from "./icons";

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
      "preDiagnosis",
      "molecularTesting",
      "molecularTestingNote",
      "molecularTestingDate",
      "diseaseStatus",
      "laterality",
      "bodySite",
      "survivor",
      "type",
      "histomorphology",
      "grade",
      "icdCode",
      "notes",
    ];
    if (scalarKeys.some((key) => Boolean(data[key]))) return true;
    const arrayKeys = ["subType", "cancerStage", "tStage", "nStage", "mStage"];
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

/* Molecular tests selectable under the Diagnosis > Molecular Testing
   section. Picking a test reveals the note / date fields. */
const MOLECULAR_TESTS = [
  "PCR / RT-PCR",
  "NGS (Next-Generation Sequencing)",
  "FISH",
  "ISH / CISH",
  "IHC",
  "Liquid biopsy / ctDNA",
  "Gene-expression profiling",
  "MSI / MMR testing",
  "TMB testing",
  "BRCA1/BRCA2 and HRR testing",
];

/* Standard options for the single-select Diagnosis fields that had no
   dropdown list defined (the old <select> rendered only the placeholder). */


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

const Diagnosis: React.FC<{
  embedded?: boolean;
  patientId?: string;
  onNext?: () => void;
  visitDate?: string;
  onVisitDateChange?: (value: string) => void;
}> = ({
  embedded = false,
  patientId,
  onNext,
  visitDate = "",
  onVisitDateChange,
}) => {
  const location = useLocation();
  const statePatientId =
    (location.state as ConsultationState | null)?.patientId ?? "";
  const resolvedPatientId = patientId || statePatientId;

  const [userAvatarUrl, setUserAvatarUrl] = useState<string>(() => localStorage.getItem("user_photo") || "");
  const [avatarLoading, setAvatarLoading] = useState<boolean>(() => !localStorage.getItem("user_photo"));

  const [formData, setFormData] = useState<FormData>({
    preDiagnosis: "",
    molecularTesting: "",
    molecularTestingNote: "",
    molecularTestingDate: "",
    diseaseStatus: "",
    laterality: "",
    bodySite: "",
    survivor: "",
    type: "",
    subType: [],
    histomorphology: "",
    cancerStage: [],
    grade: "",
    tStage: [],
    nStage: [],
    mStage: [],
    icdCode: "",
    notes: "",
  });

  const diagnosisDraftKey = `hms_diagnosis_form_${resolvedPatientId}`;

  useEffect(() => {
    if (!resolvedPatientId) return;
    const saved = localStorage.getItem(diagnosisDraftKey);

    if (!saved) return;

    try {
      const data = JSON.parse(saved) as Partial<FormData>;
      /* Normalize legacy drafts: subType / cancerStage used to be single
         strings, they are now multi-select arrays. */
      const asArray = (value: unknown): string[] => {
        if (Array.isArray(value)) return value.map(String);
        if (typeof value === "string" && value.length > 0) return [value];
        return [];
      };
      setFormData((previous) => ({
        ...previous,
        ...data,
        subType: asArray(data.subType),
        cancerStage: asArray(data.cancerStage),
        tStage: asArray(data.tStage),
        nStage: asArray(data.nStage),
        mStage: asArray(data.mStage),
      }));
    } catch (error) {
      console.error("Failed to restore diagnosis draft:", error);
    }
  }, [diagnosisDraftKey, resolvedPatientId]);

  /* One-time server hydration: when there's no local draft yet, pull the
     latest staging detail and seed the visit date + suggested molecular
     test fields so a fresh browser shows what was previously saved. A
     local draft always wins over this server seed. Runs before the
     draft-save effect so the empty initial draft can't suppress it. */
  useEffect(() => {
    if (!resolvedPatientId) return;
    const rawDraft = localStorage.getItem(diagnosisDraftKey);
    if (rawDraft && hasDraftContent(rawDraft)) return;
    let cancelled = false;
    const hydrate = async () => {
      try {
        const stored = JSON.parse(
          localStorage.getItem(`hms_staging_detail_id_${resolvedPatientId}`) ??
            "{}"
        ) as { staging_detail_id?: string } | null;
        if (!stored?.staging_detail_id) return;
        const response = await API.get<{
          success: boolean;
          data: {
            visit_date?: string | null;
            suggested_molecular_test?: string | null;
            suggested_molecular_test_note?: string | null;
            suggested_molecular_test_date?: string | null;
            notes?: string | null;
          } | null;
        }>(
          `/oncology/staging-details/${encodeURIComponent(
            stored.staging_detail_id
          )}`
        );
        const detail = response.data.data;
        if (!detail || cancelled) return;
        setFormData((previous) => ({
          ...previous,
          molecularTesting:
            previous.molecularTesting ||
            detail.suggested_molecular_test ||
            "",
          molecularTestingNote:
            previous.molecularTestingNote ||
            detail.suggested_molecular_test_note ||
            "",
          molecularTestingDate:
            previous.molecularTestingDate ||
            toDateInputValue(detail.suggested_molecular_test_date ?? "") ||
            "",
          notes: previous.notes || detail.notes || "",
        }));
        const visitDateIso = toDateInputValue(detail.visit_date ?? "");
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
  }, [diagnosisDraftKey, resolvedPatientId, onVisitDateChange]);

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
    field: "subType" | "cancerStage" | "tStage" | "nStage" | "mStage"
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

  /* Sync the diagnosis selection (cancer_type_id + subtype_id +
     diagnosis_id) to localStorage so downstream steps (Treatment Plan)
     can read the IDs to query regimen protocols from the backend. */
  useEffect(() => {
    if (!formData.type || formData.subType.length === 0) return;

    /* Primary subtype = the first selected one. */
    const primarySubtype = splitQualified(formData.subType[0]).raw;
    const matchedType = cancerTypes.find(
      (item) => item.cancer_type === formData.type
    );
    const matchedSubtype = subtypes.find(
      (item) => item.subtype_name === primarySubtype
    );

    if (matchedType && matchedSubtype) {
      /* Resolve diagnosis_id by matching the subtype's ICD-10 code
         against the loaded diagnosis catalog. */
      let diagnosisId = "";
      const subtypeIcd = matchedSubtype.icd10_subtype?.trim();
      if (subtypeIcd && diagnosisCatalogRef.current.length > 0) {
        const match = diagnosisCatalogRef.current.find(
          (entry) =>
            entry.icd_code?.toUpperCase() === subtypeIcd.toUpperCase()
        );
        if (match) diagnosisId = match.diagnosis_id;
      }

      localStorage.setItem(
        "hms_diagnosis_selection",
        JSON.stringify({
          cancer_type_id: matchedType.cancer_type_id,
          subtype_id: matchedSubtype.subtype_id,
          cancer_type: matchedType.cancer_type,
          subtype_name: matchedSubtype.subtype_name,
          diagnosis_id: diagnosisId,
        })
      );

      window.dispatchEvent(
        new CustomEvent("cancer-type-changed", {
          detail: {
            patientId: resolvedPatientId,
            cancerType: matchedType.cancer_type,
            cancerSubtype: matchedSubtype.subtype_name,
          },
        })
      );
    }
  }, [formData.type, formData.subType, cancerTypes, subtypes, diagnosisCatalogReady, resolvedPatientId]);

  const [stageLabels, setStageLabels] = useState<StageOption[]>([]);

  const [tnmStages, setTnmStages] = useState<string[]>([]);
  const [tOptions, setTOptions] = useState<StageOption[]>([]);
  const [nOptions, setNOptions] = useState<StageOption[]>([]);
  const [mOptions, setMOptions] = useState<StageOption[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [bodySiteOptions, setBodySiteOptions] = useState<AnatomicalSiteItem[]>([]);
  const [gradeMasterOptions, setGradeMasterOptions] = useState<CancerGradeItem[]>([]);
  const [metastasisSites, setMetastasisSites] = useState<string[]>([]);
  const [diagnosisLoading, setDiagnosisLoading] = useState(false);
  const [diagnosisError, setDiagnosisError] = useState("");
  const [savingDiagnosis, setSavingDiagnosis] = useState(false);

  const diagnosisRequestRef = useRef(0);
  const stagingRequestRef = useRef(0);
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

  const loadSitesForCancerType = (cancerTypeId: string) => {
    if (!cancerTypeId) {
      setBodySiteOptions([]);
      return;
    }

    API.get<{ success: boolean; data: AnatomicalSiteItem[] }>(
      `/oncology/reference/cancer-types/${cancerTypeId}/sites`
    )
      .then((response) => setBodySiteOptions(response.data.data ?? []))
      .catch((error) => {
        console.error("Failed to load anatomical sites:", error);
        setBodySiteOptions([]);
      });
  };

  const loadGradesForCancerType = (cancerTypeId: string) => {
    if (!cancerTypeId) {
      setGradeMasterOptions([]);
      return;
    }

    API.get<{ success: boolean; data: CancerGradeItem[] }>(
      `/oncology/reference/cancer-types/${cancerTypeId}/grades`
    )
      .then((response) => setGradeMasterOptions(response.data.data ?? []))
      .catch((error) => {
        console.error("Failed to load cancer grades:", error);
        setGradeMasterOptions([]);
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
    setTnmStages([]);
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
        const seenTnm = new Set<string>();
        const seenT = new Set<string>();
        const seenN = new Set<string>();
        const seenM = new Set<string>();
        const seenGrade = new Set<string>();

        const stageOptions: StageOption[] = [];
        const tnmOptionsAggregated: string[] = [];
        const tOptionsAggregated: StageOption[] = [];
        const nOptionsAggregated: StageOption[] = [];
        const mOptionsAggregated: StageOption[] = [];
        const gradeOptions: string[] = [];

        for (const result of results) {
          const { cancerTypeName, items } = result;

          const tnmOptions: string[] = [];
          for (const item of items) {
            const stageLabel = item.stage_label;
            if (
              stageLabel &&
              !seenStage.has(`${cancerTypeName}|${stageLabel}`)
            ) {
              seenStage.add(`${cancerTypeName}|${stageLabel}`);
              stageOptions.push({ value: stageLabel, cancerType: cancerTypeName });
            }
            const criteria = (item.tnm_criteria ?? "")
              .replace(/\([^)]*\)/g, " ")
              .replace(/\s+/g, " ")
              .replace(/\s*[-“]\s*$/g, "")
              .trim();
            if (criteria && /(\b[TNM]\d|\bAny\s+[TNM])/i.test(criteria)) {
              if (!tnmOptions.includes(criteria)) tnmOptions.push(criteria);
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
              if (!seenGrade.has(grade)) {
                seenGrade.add(grade);
                gradeOptions.push(grade);
              }
            }
          }

          for (const criteria of tnmOptions) {
            if (!seenTnm.has(criteria)) {
              seenTnm.add(criteria);
              tnmOptionsAggregated.push(criteria);
            }
          }

          const expandTnmRange = (token: string): string[] => {
            const rangeMatch = token.match(/^([TNM])(\d+)([a-z])?-([a-z\d]+)$/i);
            if (!rangeMatch) return [token];
            const prefix = rangeMatch[1].toUpperCase();
            const startNum = parseInt(rangeMatch[2], 10);
            const startLetter = rangeMatch[3] || "";
            const endStr = rangeMatch[4];
            const results: string[] = [];
            const endNum = parseInt(endStr, 10);
            if (!startLetter && !isNaN(endNum)) {
              for (let i = startNum; i <= endNum; i++) results.push(`${prefix}${i}`);
            } else if (startLetter && endStr.length === 1) {
              const startCode = startLetter.charCodeAt(0);
              const endCode = endStr.charCodeAt(0);
              for (let c = startCode; c <= endCode; c++) results.push(`${prefix}${startNum}${String.fromCharCode(c)}`);
            }
            return results.length > 0 ? results : [token];
          };

          const tSet = new Set<string>();
          const nSet = new Set<string>();
          const mSet = new Set<string>();
          for (const option of tnmOptions) {
            const parts = option.split(/\s+/);
            for (const part of parts) {
              if (/^T\d/i.test(part)) expandTnmRange(part).forEach((v) => tSet.add(v));
              else if (/^N\d/i.test(part) || /^N[a-z]/i.test(part)) expandTnmRange(part).forEach((v) => nSet.add(v));
              else if (/^M\d/i.test(part) || /^M[a-z]/i.test(part)) expandTnmRange(part).forEach((v) => mSet.add(v));
            }
          }
          for (const value of [...tSet].sort()) {
            if (!seenT.has(`${cancerTypeName}|${value}`)) {
              seenT.add(`${cancerTypeName}|${value}`);
              tOptionsAggregated.push({ value, cancerType: cancerTypeName });
            }
          }
          for (const value of [...nSet].sort()) {
            if (!seenN.has(`${cancerTypeName}|${value}`)) {
              seenN.add(`${cancerTypeName}|${value}`);
              nOptionsAggregated.push({ value, cancerType: cancerTypeName });
            }
          }
          for (const value of [...mSet].sort()) {
            if (!seenM.has(`${cancerTypeName}|${value}`)) {
              seenM.add(`${cancerTypeName}|${value}`);
              mOptionsAggregated.push({ value, cancerType: cancerTypeName });
            }
          }
        }

        setStageLabels(stageOptions);
        setTnmStages(tnmOptionsAggregated.sort());
        setTOptions(tOptionsAggregated);
        setNOptions(nOptionsAggregated);
        setMOptions(mOptionsAggregated);
        setGrades(gradeOptions.sort());
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

        let savedType = "";
        try {
          const savedDraft = JSON.parse(
            localStorage.getItem(diagnosisDraftKey) ?? ""
          ) as Partial<FormData> | null;
          savedType = savedDraft?.type ?? "";
        } catch (error) {
          console.error("Failed to read diagnosis draft:", error);
        }

        const matchedSavedType = savedType
          ? fetched.find((item) => item.cancer_type === savedType)
          : undefined;

        if (matchedSavedType) {
          // Restoring a saved draft: reload options for the saved
          // type without overwriting the user's selections.
          loadSubtypesForCancerTypes([
            {
              cancerTypeId: matchedSavedType.cancer_type_id,
              cancerTypeName: matchedSavedType.cancer_type,
            },
          ], false);
          loadStagesForCancerTypes([
            {
              cancerTypeId: matchedSavedType.cancer_type_id,
              cancerTypeName: matchedSavedType.cancer_type,
            },
          ], false);
          loadSitesForCancerType(matchedSavedType.cancer_type_id);
          loadGradesForCancerType(matchedSavedType.cancer_type_id);
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
          loadSitesForCancerType(initial.cancer_type_id);
          loadGradesForCancerType(initial.cancer_type_id);
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
    setFormData((previous) => ({
      ...previous,
      type: primaryType,
      subType: [],
      icdCode: "",
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

    /* Body Site and Grade masters follow the primary (first) type. */
    const primaryCancerType = cancerTypes.find(
      (item) => item.cancer_type === primaryType
    );
    if (primaryCancerType) {
      loadSitesForCancerType(primaryCancerType.cancer_type_id);
      loadGradesForCancerType(primaryCancerType.cancer_type_id);
    }
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

    setDiagnosisError("");
    setSavingDiagnosis(true);

    try {
      const matchedType = cancerTypes.find(
        (item) => item.cancer_type === formData.type
      );
      const primarySubtype =
        formData.subType.length > 0
          ? splitQualified(formData.subType[0]).raw
          : "";
      const matchedSubtype = subtypes.find(
        (item) => item.subtype_name === primarySubtype
      );

      const diagnosisId = await resolveDiagnosisId(
        resolvedPatientId,
        formData.icdCode
      );

      const matchedGrade = gradeMasterOptions.find(
        (item) => item.grade_value === formData.grade
      );

      const visitDateIso = toIsoDate(visitDate);

      const stagingFields: Record<string, unknown> = {
        cancer_type_id: matchedType?.cancer_type_id ?? "",
        cancer_subtype_id: matchedSubtype?.subtype_id ?? "",
        ...(diagnosisId ? { diagnosis_id: diagnosisId } : {}),
        ...(formData.cancerStage.length > 0
          ? {
              clinical_stage: formData.cancerStage
                .map((stage) => splitQualified(stage).raw)
                .join(", "),
            }
          : {}),
        ...(formData.tStage.length > 0
          ? {
              t_stage: formData.tStage
                .map((stage) => splitQualified(stage).raw)
                .join(", "),
            }
          : {}),
        ...(formData.nStage.length > 0
          ? {
              n_stage: formData.nStage
                .map((stage) => splitQualified(stage).raw)
                .join(", "),
            }
          : {}),
        ...(formData.mStage.length > 0
          ? {
              m_stage: formData.mStage
                .map((stage) => splitQualified(stage).raw)
                .join(", "),
            }
          : {}),
        ...(metastasisSites.length > 0
          ? { metastasis_sites: metastasisSites }
          : {}),
        ...(formData.preDiagnosis
          ? { pre_diagnosis: formData.preDiagnosis }
          : {}),
        ...(formData.diseaseStatus
          ? { disease_status: formData.diseaseStatus }
          : {}),
        ...(formData.laterality ? { laterality: formData.laterality } : {}),
        ...(formData.bodySite ? { site: formData.bodySite } : {}),
        ...(formData.grade ? { grade: formData.grade } : {}),
        ...(matchedGrade ? { grade_system: matchedGrade.grade_system } : {}),
        ...(visitDateIso ? { visit_date: visitDateIso } : {}),
        ...(formData.molecularTesting
          ? { suggested_molecular_test: formData.molecularTesting }
          : {}),
        ...(formData.molecularTestingNote
          ? { suggested_molecular_test_note: formData.molecularTestingNote }
          : {}),
        ...(formData.molecularTestingDate
          ? { suggested_molecular_test_date: formData.molecularTestingDate }
          : {}),
        ...(formData.notes.trim() ? { notes: formData.notes.trim() } : {}),
      };

      let existingStagingDetailId = "";
      try {
        existingStagingDetailId = await resolveStagingDetailId(
          resolvedPatientId
        );
      } catch (error) {
        console.error("Failed to resolve staging detail id:", error);
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
            data: { chemotherapy_plan_id: string } | null;
          }>("/chemotherapy/plans/latest-for-patient", {
            params: {
              patient_id: resolvedPatientId,
            },
          });
          const existingPlanId =
            existingPlan.data.data?.chemotherapy_plan_id;
          if (existingPlanId) {
            const planChanges: Record<string, unknown> = {
              staging_detail_id: stagingDetailId,
            };
            if (matchedType?.cancer_type_id) {
              planChanges.cancer_type_id = matchedType.cancer_type_id;
              planChanges.cancer_type = matchedType.cancer_type;
            }
            if (matchedSubtype?.subtype_id) {
              planChanges.subtype_id = matchedSubtype.subtype_id;
              planChanges.cancer_subtype = matchedSubtype.subtype_name;
            }
            if (formData.cancerStage.length > 0) {
              planChanges.cancer_stage = formData.cancerStage
                .map((stage) => splitQualified(stage).raw)
                .join(", ");
            }
            await API.put(
              `/chemotherapy/plans/${existingPlanId}`,
              planChanges
            );
          }
        } catch (planSyncError: any) {
          console.error(
            "Failed to sync new diagnosis onto existing plan:",
            planSyncError?.response?.data?.message ?? planSyncError?.message
          );
        }
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

          {/* Laterality */}
          <DiagnosisCheckboxSelect
            title="Laterality"
            options={[
              "Left",
              "Right",
              "Bilateral",
              "Midline",
              "Not Applicable",
            ]}
            value={formData.laterality}
            onChange={(value) =>
              setFormData((previous) => ({
                ...previous,
                laterality: value,
              }))
            }
            placeholder="Select Laterality"
          />

          {/* Body Site */}
          <DiagnosisCheckboxSelect
            title="Body Site"
            options={
              bodySiteOptions.length > 0
                ? bodySiteOptions.map((site) => site.site_name)
                : BODY_SITE_OPTIONS
            }
            value={formData.bodySite}
            onChange={(value) =>
              setFormData((previous) => ({
                ...previous,
                bodySite: value,
              }))
            }
            placeholder="Select Body Site"
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
          <DiagnosisCheckboxSelect
            title="Grade"
            options={
              gradeMasterOptions.length > 0
                ? gradeMasterOptions.map((gradeItem) => gradeItem.grade_value)
                : grades
            }
            value={formData.grade}
            onChange={(value) =>
              setFormData((previous) => ({
                ...previous,
                grade: value,
              }))
            }
            loading={diagnosisLoading}
            placeholder="Select Grade"
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

          {/* Molecular Testing */}
          <DiagnosisCheckboxSelect
            title="Molecular Testing"
            options={MOLECULAR_TESTS}
            value={formData.molecularTesting}
            onChange={(value) =>
              setFormData((previous) => ({
                ...previous,
                molecularTesting: value,
              }))
            }
            placeholder="Select Molecular Testing"
          />

          {formData.molecularTesting && (
            <>
              <div>
                <label
                  htmlFor="molecularTestingNote"
                  className="mb-2 block text-sm font-semibold text-gray-600"
                >
                  Enter Note
                </label>

                <input
                  id="molecularTestingNote"
                  name="molecularTestingNote"
                  type="text"
                  value={formData.molecularTestingNote}
                  onChange={handleChange}
                  placeholder="Type a note..."
                  className="block w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 shadow-sm focus:border-[#1d4ed8] focus:outline-none focus:ring-[#1d4ed8]"
                />
              </div>

              <div>
                <label
                  htmlFor="molecularTestingDate"
                  className="mb-2 block text-sm font-semibold text-gray-600"
                >
                  Select Date
                </label>

                <input
                  id="molecularTestingDate"
                  name="molecularTestingDate"
                  type="date"
                  value={formData.molecularTestingDate}
                  onChange={handleChange}
                  className="block w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 shadow-sm focus:border-[#1d4ed8] focus:outline-none focus:ring-[#1d4ed8]"
                />
              </div>
            </>
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
