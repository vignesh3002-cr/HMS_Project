import { useCallback, useEffect, useState } from "react";
import {
  clinicalDetailsApi,
  getApiErrorMessage,
  type AllergyOption,
  type ComorbidityOption,
  type EncounterClinicalDetails,
  type PerformanceStatusOption,
  type SymptomOption,
} from "@/api/clinicalDetails.api";

export interface ClinicalDetailsDraft {
  performanceStatusId: number | null;
  symptoms: Array<{
    symptomId: number;
    severity?: string;
    durationDays?: number;
    onsetDate?: string;
    clinicalNotes?: string;
  }>;
  allergies: Array<{
    allergyId: number;
    reaction?: string;
    severity?: string;
    clinicalNotes?: string;
  }>;
  comorbidities: Array<{
    diagnosisId: string;
    clinicalNotes?: string;
  }>;
}

export interface UseClinicalDetailsParams {
  patientId?: string | null;
  encounterNo?: string | null;
}

interface UseClinicalDetailsResult {
  loading: boolean;
  error: string | null;
  retry: () => void;

  performanceStatusOptions: PerformanceStatusOption[];
  symptomOptions: SymptomOption[];
  allergyOptions: AllergyOption[];
  comorbidityOptions: ComorbidityOption[];

  saved: EncounterClinicalDetails | null;

  saving: boolean;
  saveError: string | null;
  saveSuccess: boolean;
  saveClinicalDetails: (
    draft: ClinicalDetailsDraft,
  ) => Promise<EncounterClinicalDetails | null>;
}

const EMPTY_SAVED: EncounterClinicalDetails = {
  encounter: { encounterNo: "", patientId: "", encounterTs: "", status: "" },
  performanceStatus: null,
  symptoms: [],
  allergies: [],
  comorbidities: [],
};

export function useClinicalDetails({
  patientId,
  encounterNo,
}: UseClinicalDetailsParams): UseClinicalDetailsResult {
  const [performanceStatusOptions, setPerformanceStatusOptions] = useState<
    PerformanceStatusOption[]
  >([]);
  const [symptomOptions, setSymptomOptions] = useState<SymptomOption[]>([]);
  const [allergyOptions, setAllergyOptions] = useState<AllergyOption[]>([]);
  const [comorbidityOptions, setComorbidityOptions] = useState<
    ComorbidityOption[]
  >([]);

  const [saved, setSaved] = useState<EncounterClinicalDetails | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [loadVersion, setLoadVersion] = useState(0);

  const hasContext = Boolean(patientId && encounterNo);

  /* ============================================================
     LOAD: master/reference options + saved encounter clinical details
  ============================================================ */
  useEffect(() => {
    let cancelled = false;

    if (!hasContext) {
      setSaved(null);
      setPerformanceStatusOptions([]);
      setSymptomOptions([]);
      setAllergyOptions([]);
      setComorbidityOptions([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [
          performanceRes,
          symptomRes,
          allergyRes,
          categoryRes,
          clinicalRes,
        ] = await Promise.all([
          clinicalDetailsApi.getPerformanceStatusOptions(),
          clinicalDetailsApi.getSymptomOptions(),
          clinicalDetailsApi.getAllergyOptions(),
          clinicalDetailsApi.getDiagnosisCategories(),
          clinicalDetailsApi.getEncounterClinicalDetails(encounterNo!),
        ]);

        if (cancelled) return;

        const categories = categoryRes.data.data?.categories ?? [];

        // Skip categories with no id - fetching them would hit the broken
        // "/diagnosis/categories//diagnoses" endpoint (404).
        const categoryResults = await Promise.all(
          categories
            .filter((category) => category.diagnosis_catogory_id)
            .map((category) =>
              clinicalDetailsApi.getDiagnosesByCategory(
                category.diagnosis_catogory_id,
              ),
            ),
        );

        if (cancelled) return;

        const comorbidityOptions = categoryResults.flatMap(
          (result) => result.data.data?.diagnoses ?? [],
        );

        setPerformanceStatusOptions(
          performanceRes.data.data?.items ?? [],
        );
        setSymptomOptions(symptomRes.data.data?.items ?? []);
        setAllergyOptions(allergyRes.data.data?.items ?? []);
        setComorbidityOptions(comorbidityOptions);

        setSaved(clinicalRes.data.data ?? EMPTY_SAVED);
      } catch (err) {
        console.error(
          "[useClinicalDetails] Failed to load clinical details:",
          err,
        );
        if (cancelled) return;
        setError(getApiErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [patientId, encounterNo, hasContext, loadVersion]);

  const retry = useCallback(() => {
    setLoadVersion((version) => version + 1);
  }, []);

  /* ============================================================
     SAVE: sends the current draft to the backend, then re-fetches
     the saved state from the server so local state matches the DB.
     ECOG + symptoms are encounter-specific; allergies + comorbidities
     are patient-level and saved through their own endpoints.
  ============================================================ */
  const saveClinicalDetails = useCallback(
    async (draft: ClinicalDetailsDraft): Promise<EncounterClinicalDetails | null> => {
      if (!patientId || !encounterNo) {
        setSaveError("Missing patient or encounter context.");
        return null;
      }

      setSaving(true);
      setSaveError(null);
      setSaveSuccess(false);

      try {
        const current = saved;

        // ---- 1. ECOG (upsert, encounter-specific) ----
        if (draft.performanceStatusId != null) {
          await clinicalDetailsApi.setEncounterPerformanceStatus(encounterNo, {
            performanceStatusId: draft.performanceStatusId,
          });
        }

        // ---- 2. Symptoms (encounter-specific) ----
        const savedSymptoms = current?.symptoms ?? [];
        const draftSymptomIds = draft.symptoms.map(
          (symptom) => symptom.symptomId,
        );

        for (const savedSymptom of savedSymptoms) {
          if (!draftSymptomIds.includes(Number(savedSymptom.symptomId))) {
            await clinicalDetailsApi.removeEncounterSymptom(
              encounterNo,
              Number(savedSymptom.symptomId),
            );
          }
        }

        for (const symptom of draft.symptoms) {
          const existing = savedSymptoms.find(
            (savedSymptom) =>
              Number(savedSymptom.symptomId) === symptom.symptomId,
          );

          if (!existing) {
            await clinicalDetailsApi.addEncounterSymptom(encounterNo, {
              symptomId: symptom.symptomId,
              severity: symptom.severity || undefined,
              durationDays: symptom.durationDays,
              onsetDate: symptom.onsetDate,
              clinicalNotes: symptom.clinicalNotes || undefined,
            });
          } else if (
            (existing.severity ?? "") !== (symptom.severity ?? "") ||
            (existing.durationDays ?? null) !==
              (symptom.durationDays ?? null) ||
            (existing.onsetDate ?? "") !== (symptom.onsetDate ?? "") ||
            (existing.clinicalNotes ?? "") !==
              (symptom.clinicalNotes ?? "")
          ) {
            await clinicalDetailsApi.updateEncounterSymptom(
              encounterNo,
              Number(existing.symptomId),
              {
                severity: symptom.severity || undefined,
                durationDays: symptom.durationDays,
                onsetDate: symptom.onsetDate,
                clinicalNotes: symptom.clinicalNotes || undefined,
              },
            );
          }
        }

        // ---- 3. Allergies (patient-level, longitudinal) ----
        const savedAllergies = current?.allergies ?? [];
        const draftAllergyIds = draft.allergies.map(
          (allergy) => allergy.allergyId,
        );

        for (const savedAllergy of savedAllergies) {
          if (!draftAllergyIds.includes(Number(savedAllergy.allergyId))) {
            await clinicalDetailsApi.removePatientAllergy(
              patientId,
              Number(savedAllergy.id),
            );
          }
        }

        for (const allergy of draft.allergies) {
          const existing = savedAllergies.find(
            (savedAllergy) =>
              Number(savedAllergy.allergyId) === allergy.allergyId,
          );

          if (!existing) {
            await clinicalDetailsApi.addPatientAllergy(patientId, {
              allergyId: allergy.allergyId,
              reaction: allergy.reaction || undefined,
              severity: allergy.severity || undefined,
              clinicalNotes: allergy.clinicalNotes || undefined,
              identifiedAtEncounterNo: encounterNo,
            });
          } else if (
            (existing.reaction ?? "") !== (allergy.reaction ?? "") ||
            (existing.severity ?? "") !== (allergy.severity ?? "") ||
            (existing.clinicalNotes ?? "") !==
              (allergy.clinicalNotes ?? "")
          ) {
            await clinicalDetailsApi.updatePatientAllergy(
              patientId,
              Number(existing.id),
              {
                reaction: allergy.reaction || undefined,
                severity: allergy.severity || undefined,
                clinicalNotes: allergy.clinicalNotes || undefined,
              },
            );
          }
        }

        // ---- 4. Comorbidities (patient-level, longitudinal) ----
        const savedComorbidities = current?.comorbidities ?? [];
        const draftComorbidityIds = draft.comorbidities.map(
          (comorbidity) => comorbidity.diagnosisId,
        );

        for (const savedComorbidity of savedComorbidities) {
          if (!draftComorbidityIds.includes(savedComorbidity.diagnosisId)) {
            await clinicalDetailsApi.removePatientComorbidity(
              patientId,
              Number(savedComorbidity.id),
            );
          }
        }

        for (const comorbidity of draft.comorbidities) {
          const existing = savedComorbidities.find(
            (savedComorbidity) =>
              savedComorbidity.diagnosisId === comorbidity.diagnosisId,
          );

          if (!existing) {
            await clinicalDetailsApi.addPatientComorbidity(patientId, {
              diagnosisId: comorbidity.diagnosisId,
              clinicalNotes: comorbidity.clinicalNotes || undefined,
              identifiedAtEncounterNo: encounterNo,
            });
          } else if (
            (existing.clinicalNotes ?? "") !==
            (comorbidity.clinicalNotes ?? "")
          ) {
            await clinicalDetailsApi.updatePatientComorbidity(
              patientId,
              Number(existing.id),
              {
                clinicalNotes: comorbidity.clinicalNotes || undefined,
              },
            );
          }
        }

        // ---- 5. Refresh from server so local state mirrors the DB ----
        const fresh = await clinicalDetailsApi.getEncounterClinicalDetails(
          encounterNo,
        );
        const freshData = fresh.data.data ?? EMPTY_SAVED;
        setSaved(freshData);
        setSaveSuccess(true);
        return freshData;
      } catch (err) {
        console.error(
          "[useClinicalDetails] Failed to save clinical details:",
          err,
        );
        setSaveError(getApiErrorMessage(err));
        return null;
      } finally {
        setSaving(false);
      }
    },
    [patientId, encounterNo, saved],
  );

  return {
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
  };
}