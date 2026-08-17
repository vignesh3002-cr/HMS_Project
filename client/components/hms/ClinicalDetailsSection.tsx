import React, { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useClinicalDetails } from "@/hooks/useClinicalDetails";

/* ============================================================
   Severity choices mirror the backend enums
   (SYMPTOM_SEVERITY / ALLERGY_SEVERITY) from the API contract.
============================================================ */

const SYMPTOM_SEVERITIES = ["MILD", "MODERATE", "SEVERE", "CRITICAL"];
const ALLERGY_SEVERITIES = ["MILD", "MODERATE", "SEVERE", "ANAPHYLACTIC"];

interface SymptomSelection {
  symptomId: string;
  symptomName: string;
  severity: string;
  durationDays: string;
  clinicalNotes: string;
}

interface AllergySelection {
  allergyId: string;
  substanceName: string;
  severity: string;
  reaction: string;
}

interface ComorbiditySelection {
  diagnosisId: string;
  diagnosisName: string;
}

interface ClinicalDetailsSectionProps {
  patientId?: string;
  encounterNo?: string | null;
}

const ChevronDownIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="#94a3b8"
    strokeWidth="1.8"
    className="pointer-events-none absolute right-3 top-2.5 h-4 w-4"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const Spinner = () => (
  <svg
    className="h-4 w-4 animate-spin text-blue-600"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

export function ClinicalDetailsSection({
  patientId,
  encounterNo,
}: ClinicalDetailsSectionProps) {
  const { toast } = useToast();

  const {
    loading,
    error,
    retry,
    performanceStatusOptions,
    symptomOptions,
    allergyOptions,
    comorbidityOptions,
    saved,
    saving,
    saveError,
    saveSuccess,
    saveClinicalDetails,
  } = useClinicalDetails({ patientId, encounterNo });

  const [ecogId, setEcogId] = useState("");
  const [symptomSelections, setSymptomSelections] = useState<
    SymptomSelection[]
  >([]);
  const [allergySelections, setAllergySelections] = useState<
    AllergySelection[]
  >([]);
  const [comorbiditySelections, setComorbiditySelections] = useState<
    ComorbiditySelection[]
  >([]);

  const disabled = loading || saving || !encounterNo || !patientId;

  /* ============================================================
     Sync local form state from the backend's saved records.
     Master lists are the available choices; `saved` holds the
     patient/encounter's actual values.
  ============================================================ */
  useEffect(() => {
    if (loading) return;

    if (saved) {
      setEcogId(
        saved.performanceStatus
          ? String(saved.performanceStatus.id)
          : "",
      );
      setSymptomSelections(
        saved.symptoms.map((symptom) => ({
          symptomId: String(symptom.symptomId),
          symptomName: symptom.symptomName,
          severity: symptom.severity ?? "",
          durationDays:
            symptom.durationDays != null ? String(symptom.durationDays) : "",
          clinicalNotes: symptom.clinicalNotes ?? "",
        })),
      );
      setAllergySelections(
        saved.allergies.map((allergy) => ({
          allergyId: String(allergy.allergyId),
          substanceName: allergy.substanceName,
          severity: allergy.severity ?? "",
          reaction: allergy.reaction ?? "",
        })),
      );
      setComorbiditySelections(
        saved.comorbidities.map((comorbidity) => ({
          diagnosisId: comorbidity.diagnosisId,
          diagnosisName: comorbidity.diagnosisName,
        })),
      );
    } else {
      setEcogId("");
      setSymptomSelections([]);
      setAllergySelections([]);
      setComorbiditySelections([]);
    }
  }, [saved, loading]);

  /* ============================================================
     Available choices for the "add" controls (active master values
     that have not already been selected).
  ============================================================ */
  const availableSymptoms = useMemo(
    () =>
      symptomOptions.filter(
        (option) =>
          !symptomSelections.some(
            (selection) => selection.symptomId === option.id,
          ),
      ),
    [symptomOptions, symptomSelections],
  );

  const availableAllergies = useMemo(
    () =>
      allergyOptions.filter(
        (option) =>
          !allergySelections.some(
            (selection) => selection.allergyId === option.id,
          ),
      ),
    [allergyOptions, allergySelections],
  );

  const availableComorbidities = useMemo(
    () =>
      comorbidityOptions.filter(
        (option) =>
          !comorbiditySelections.some(
            (selection) => selection.diagnosisId === option.diagnosis_id,
          ),
      ),
    [comorbidityOptions, comorbiditySelections],
  );

  /* ============================================================
     Local selection handlers (no backend writes until Save)
  ============================================================ */

  const addSymptom = (symptomId: string) => {
    if (!symptomId) return;
    setSymptomSelections((previous) => {
      if (previous.some((selection) => selection.symptomId === symptomId)) {
        return previous;
      }
      const option = symptomOptions.find((item) => item.id === symptomId);
      return [
        ...previous,
        {
          symptomId,
          symptomName: option?.name ?? symptomId,
          severity: "",
          durationDays: "",
          clinicalNotes: "",
        },
      ];
    });
  };

  const removeSymptom = (symptomId: string) => {
    setSymptomSelections((previous) =>
      previous.filter((selection) => selection.symptomId !== symptomId),
    );
  };

  const updateSymptom = (
    symptomId: string,
    field: keyof Omit<SymptomSelection, "symptomId" | "symptomName">,
    value: string,
  ) => {
    setSymptomSelections((previous) =>
      previous.map((selection) =>
        selection.symptomId === symptomId
          ? { ...selection, [field]: value }
          : selection,
      ),
    );
  };

  const addAllergy = (allergyId: string) => {
    if (!allergyId) return;
    setAllergySelections((previous) => {
      if (previous.some((selection) => selection.allergyId === allergyId)) {
        return previous;
      }
      const option = allergyOptions.find((item) => item.id === allergyId);
      return [
        ...previous,
        {
          allergyId,
          substanceName: option?.substance_name ?? allergyId,
          severity: "",
          reaction: "",
        },
      ];
    });
  };

  const removeAllergy = (allergyId: string) => {
    setAllergySelections((previous) =>
      previous.filter((selection) => selection.allergyId !== allergyId),
    );
  };

  const updateAllergy = (
    allergyId: string,
    field: keyof Omit<AllergySelection, "allergyId" | "substanceName">,
    value: string,
  ) => {
    setAllergySelections((previous) =>
      previous.map((selection) =>
        selection.allergyId === allergyId
          ? { ...selection, [field]: value }
          : selection,
      ),
    );
  };

  const addComorbidity = (diagnosisId: string) => {
    if (!diagnosisId) return;
    setComorbiditySelections((previous) => {
      if (
        previous.some((selection) => selection.diagnosisId === diagnosisId)
      ) {
        return previous;
      }
      const option = comorbidityOptions.find(
        (item) => item.diagnosis_id === diagnosisId,
      );
      return [
        ...previous,
        {
          diagnosisId,
          diagnosisName: option?.diagnosis_name ?? diagnosisId,
        },
      ];
    });
  };

  const removeComorbidity = (diagnosisId: string) => {
    setComorbiditySelections((previous) =>
      previous.filter((selection) => selection.diagnosisId !== diagnosisId),
    );
  };

  /* ============================================================
     Save: controlled operation sending the current local state to
     the backend (ordered diff-based sync inside the hook).
  ============================================================ */
  const handleSave = async () => {
    if (disabled) return;
    await saveClinicalDetails({
      performanceStatusId: ecogId ? Number(ecogId) : null,
      symptoms: symptomSelections.map((selection) => ({
        symptomId: Number(selection.symptomId),
        severity: selection.severity || undefined,
        durationDays: selection.durationDays
          ? Number(selection.durationDays)
          : undefined,
        clinicalNotes: selection.clinicalNotes || undefined,
      })),
      allergies: allergySelections.map((selection) => ({
        allergyId: Number(selection.allergyId),
        severity: selection.severity || undefined,
        reaction: selection.reaction || undefined,
      })),
      comorbidities: comorbiditySelections.map((selection) => ({
        diagnosisId: selection.diagnosisId,
      })),
    });
  };

  /* ============================================================
     Toast feedback driven by the hook's save state, so the current
     save result is always reflected (avoids stale closures).
  ============================================================ */
  const prevSaveError = useRef(saveError);
  useEffect(() => {
    if (saveError && saveError !== prevSaveError.current) {
      toast({
        title: "Failed to save clinical details",
        description: saveError,
        variant: "destructive",
      });
    }
    prevSaveError.current = saveError;
  }, [saveError, toast]);

  const prevSaveSuccess = useRef(saveSuccess);
  useEffect(() => {
    if (saveSuccess && !prevSaveSuccess.current) {
      toast({
        title: "Clinical details saved",
        description: "The clinical details were saved successfully.",
      });
    }
    prevSaveSuccess.current = saveSuccess;
  }, [saveSuccess, toast]);

  return (
    <div className="flex flex-col gap-4">
      {/* CLINICAL DETAILS HEADER */}
      <div className="text-xs font-bold leading-4 text-slate-700">
        Clinical Details
      </div>

      {error && (
        <div className="flex w-full flex-col gap-2 rounded-md border border-red-200 bg-red-50 p-3">
          <div className="text-xs font-medium leading-4 text-red-700">
            {error}
          </div>
          <button
            type="button"
            onClick={retry}
            className="h-7 w-fit rounded-md border border-red-200 bg-white px-3 text-xs font-semibold leading-4 text-red-700 transition hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-xs leading-4 text-slate-500">
          <Spinner />
          Loading clinical details...
        </div>
      )}

      {/* ======================================================
          PERFORMANCE STATUS (ECOG)
          Single select — value is the master id, label is the
          backend-provided description.
      ====================================================== */}
      <div className="flex flex-col gap-1">
        <div className="text-[10px] font-bold uppercase leading-[15px] tracking-[0.5px] text-slate-400">
          Performance Status (ECOG)
        </div>

        <div className="relative h-[38px]">
          <select
            value={ecogId}
            onChange={(event) => setEcogId(event.target.value)}
            disabled={disabled}
            className="h-[38px] w-full appearance-none rounded-md border border-slate-200 bg-white px-[13px] pr-10 text-sm leading-5 text-slate-700 outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">Select ECOG</option>
            {performanceStatusOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.code} - {option.description}
              </option>
            ))}
          </select>
          <ChevronDownIcon />
        </div>
      </div>

      {/* ======================================================
          SYMPTOMS
          Multi-select from symptom_master, stored per encounter.
      ====================================================== */}
      <div className="flex flex-col gap-1">
        <div className="text-[10px] font-bold uppercase leading-[15px] tracking-[0.5px] text-slate-400">
          Symptoms
        </div>

        <div className="flex min-h-[60px] w-full flex-wrap items-start gap-1.5 rounded-md border border-slate-200 bg-white p-1.5">
          {symptomSelections.map((selection) => (
            <div
              key={selection.symptomId}
              className="flex h-[26px] items-center gap-1 rounded border border-blue-100 bg-blue-50 px-[9px] py-[3px] text-xs leading-4 text-blue-700"
            >
              <span>{selection.symptomName}</span>
              <button
                type="button"
                onClick={() => removeSymptom(selection.symptomId)}
                disabled={disabled}
                className="border-0 bg-transparent p-0 text-xs leading-4 text-blue-700 disabled:cursor-not-allowed disabled:text-blue-300"
              >
                ×
              </button>
            </div>
          ))}

          <select
            value=""
            onChange={(event) => addSymptom(event.target.value)}
            disabled={disabled || availableSymptoms.length === 0}
            className="h-[26px] w-full appearance-none rounded border border-slate-200 bg-white px-2 text-xs leading-4 text-slate-500 outline-none sm:w-40 disabled:cursor-not-allowed disabled:bg-slate-50"
          >
            <option value="">
              {availableSymptoms.length === 0
                ? "No more symptoms"
                : "Add symptom..."}
            </option>
            {availableSymptoms.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

        {/* Symptom-specific fields (severity / duration / notes) */}
        {symptomSelections.length > 0 && (
          <div className="flex w-full flex-col gap-1.5 pt-1">
            {symptomSelections.map((selection) => (
              <div
                key={selection.symptomId}
                className="flex w-full items-center gap-2"
              >
                <span className="w-28 shrink-0 truncate text-xs font-medium leading-4 text-slate-600">
                  {selection.symptomName}
                </span>

                <select
                  value={selection.severity}
                  onChange={(event) =>
                    updateSymptom(
                      selection.symptomId,
                      "severity",
                      event.target.value,
                    )
                  }
                  disabled={disabled}
                  className="h-7 w-24 shrink-0 appearance-none rounded-md border border-slate-200 bg-white px-2 text-xs leading-4 text-slate-600 outline-none disabled:bg-slate-50"
                >
                  <option value="">Severity</option>
                  {SYMPTOM_SEVERITIES.map((severity) => (
                    <option key={severity} value={severity}>
                      {severity}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min={0}
                  max={9999}
                  value={selection.durationDays}
                  onChange={(event) =>
                    updateSymptom(
                      selection.symptomId,
                      "durationDays",
                      event.target.value,
                    )
                  }
                  disabled={disabled}
                  placeholder="Days"
                  className="h-7 w-16 shrink-0 rounded-md border border-slate-200 bg-white px-2 text-xs leading-4 text-slate-600 outline-none disabled:bg-slate-50"
                />

                <input
                  type="text"
                  value={selection.clinicalNotes}
                  onChange={(event) =>
                    updateSymptom(
                      selection.symptomId,
                      "clinicalNotes",
                      event.target.value,
                    )
                  }
                  disabled={disabled}
                  placeholder="Clinical notes"
                  className="h-7 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 text-xs leading-4 text-slate-600 outline-none disabled:bg-slate-50"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ======================================================
          ALLERGIES
          Existing patient allergies shown separately from the
          available allergy master options (longitudinal data).
      ====================================================== */}
      <div className="flex flex-col gap-1">
        <div className="text-[10px] font-bold uppercase leading-[15px] tracking-[0.5px] text-slate-400">
          Allergies
        </div>

        <div className="flex min-h-[38px] w-full flex-wrap items-start gap-1.5 rounded-md border border-slate-200 bg-white p-1.5">
          {allergySelections.map((selection) => (
            <div
              key={selection.allergyId}
              className="flex h-[26px] items-center gap-1 rounded border border-blue-100 bg-blue-50 px-[9px] py-[3px] text-xs leading-4 text-blue-700"
            >
              <span>{selection.substanceName}</span>

              <select
                value={selection.severity}
                onChange={(event) =>
                  updateAllergy(
                    selection.allergyId,
                    "severity",
                    event.target.value,
                  )
                }
                disabled={disabled}
                className="h-5 w-fit appearance-none bg-transparent px-1 text-[10px] font-semibold leading-4 text-blue-700 outline-none disabled:cursor-not-allowed"
              >
                <option value="">Sev</option>
                {ALLERGY_SEVERITIES.map((severity) => (
                  <option key={severity} value={severity}>
                    {severity}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => removeAllergy(selection.allergyId)}
                disabled={disabled}
                className="bg-transparent p-0 text-blue-700 disabled:cursor-not-allowed disabled:text-blue-300"
              >
                ×
              </button>
            </div>
          ))}

          <select
            value=""
            onChange={(event) => addAllergy(event.target.value)}
            disabled={disabled || availableAllergies.length === 0}
            className="h-[26px] w-full appearance-none rounded border border-slate-200 bg-white px-2 text-xs leading-4 text-slate-500 outline-none sm:w-40 disabled:cursor-not-allowed disabled:bg-slate-50"
          >
            <option value="">
              {availableAllergies.length === 0
                ? "No more allergies"
                : "Add allergy..."}
            </option>
            {availableAllergies.map((option) => (
              <option key={option.id} value={option.id}>
                {option.substance_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ======================================================
          COMORBIDITIES
          Existing active comorbidities shown separately from the
          available diagnosis reference options (longitudinal data).
      ====================================================== */}
      <div className="flex flex-col gap-1">
        <div className="text-[10px] font-bold uppercase leading-[15px] tracking-[0.5px] text-slate-400">
          Comorbidities
        </div>

        <div className="flex min-h-[38px] w-full flex-wrap items-start gap-1.5 rounded-md border border-slate-200 bg-white p-1.5">
          {comorbiditySelections.map((selection) => (
            <div
              key={selection.diagnosisId}
              className="flex h-[26px] items-center gap-1 rounded border border-blue-100 bg-blue-50 px-[9px] py-[3px] text-xs leading-4 text-blue-700"
            >
              <span>{selection.diagnosisName}</span>

              <button
                type="button"
                onClick={() => removeComorbidity(selection.diagnosisId)}
                disabled={disabled}
                className="bg-transparent p-0 text-blue-700 disabled:cursor-not-allowed disabled:text-blue-300"
              >
                ×
              </button>
            </div>
          ))}

          <select
            value=""
            onChange={(event) => addComorbidity(event.target.value)}
            disabled={disabled || availableComorbidities.length === 0}
            className="h-[26px] w-full appearance-none rounded border border-slate-200 bg-white px-2 text-xs leading-4 text-slate-500 outline-none sm:w-40 disabled:cursor-not-allowed disabled:bg-slate-50"
          >
            <option value="">
              {availableComorbidities.length === 0
                ? "No more comorbidities"
                : "Add comorbidity..."}
            </option>
            {availableComorbidities.map((option) => (
              <option key={option.diagnosis_id} value={option.diagnosis_id}>
                {option.diagnosis_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SAVE */}
      <div className="flex w-full flex-col gap-2 pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={disabled}
          className="flex h-9 w-fit items-center justify-center gap-2 rounded-lg border-0 bg-blue-700 px-[25px] py-[9px] text-sm font-bold leading-5 text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {saving && <Spinner />}
          {saving ? "Saving..." : "Save Clinical Details"}
        </button>

        {saveError && (
          <div className="text-xs font-medium leading-4 text-red-600">
            {saveError}
          </div>
        )}

        {saveSuccess && !saveError && (
          <div className="text-xs font-medium leading-4 text-green-600">
            Clinical details saved successfully.
          </div>
        )}
      </div>
    </div>
  );
}