import API, { getActiveBranchId } from "../../../api/axios";
import { getUser } from "../../../utils/token";
import type {
  SummaryPlan,
  StagingDetailRecord,
  ChemoPlanPreview,
  ChemoCycleDetail,
  DischargeMedicineRecord,
} from "./types";

/* Loaders for the patient details page and its tabs. */

/* ============================================================
   LATEST PLAN PREVIEW LOADER
   Resolves the selected patient's most recent staging detail
   (GET /oncology/staging-details, newest first) and then loads
   GET /chemotherapy/plans/preview?staging_detail_id=<latest>
   - the same chain the Order Summary panels render.

   The staging list endpoint FILTERS by the branchId query param
   but only AUTHORIZATES via the x-branch-id header. So when the
   active branch selection points somewhere else than where the
   diagnosis was saved - or nothing is selected at all - the
   strict call returns empty/403 even though data exists. Retry
   without the filter before giving up.
   ============================================================ */
export const loadLatestPlanPreview = async (
  patientId: string
): Promise<{
  preview: ChemoPlanPreview | null;
  staging: StagingDetailRecord | null;
  error: string;
}> => {
  const branchId = getActiveBranchId() ?? getUser()?.branch_id ?? undefined;

  const stagingAttempts: { params: Record<string, unknown> }[] = [
    { params: { patient_id: patientId, limit: 1, branchId } },
    { params: { patient_id: patientId, limit: 1 } },
  ];

  let lastError =
    "No staging details found for this patient yet. Complete the Diagnosis step to populate the Order Summary.";

  for (const attempt of stagingAttempts) {
    let stagingDetailId = "";

    try {
      const stagingResponse = await API.get<{
        success: boolean;
        data: { staging_detail_id: string }[];
      }>("/oncology/staging-details", attempt);
      stagingDetailId =
        stagingResponse.data?.data?.[0]?.staging_detail_id ?? "";
    } catch (error: any) {
      lastError =
        error?.response?.data?.message ||
        error?.message ||
        lastError;
      continue;
    }

    if (!stagingDetailId) continue;

    // Full record - every saved field (TNM, ICD codes, dates, IHC,
    // molecular results, derived fields, patient bio, oncologist).
    let fullStaging: StagingDetailRecord | null = null;
    try {
      const detailResponse = await API.get<{
        success: boolean;
        data: StagingDetailRecord;
      }>(`/oncology/staging-details/${encodeURIComponent(stagingDetailId)}`);
      fullStaging = detailResponse.data?.data ?? null;
    } catch {
      // The summary preview below still renders without it.
    }

    try {
      const previewResponse = await API.get<{
        success: boolean;
        data: ChemoPlanPreview;
      }>("/chemotherapy/plans/preview", {
        params: { staging_detail_id: stagingDetailId },
      });

      const preview = previewResponse.data?.data ?? null;

      // Only accept preview data for THIS selected patient.
      if (preview && preview.patient_id && preview.patient_id !== patientId) {
        return {
          preview: null,
          staging: null,
          error:
            "Saved diagnosis belongs to a different patient. Re-save the Diagnosis step for this patient.",
        };
      }

      const staging =
        fullStaging && fullStaging.patient_id === patientId
          ? fullStaging
          : null;

      return { preview, staging, error: "" };
    } catch (error: any) {
      return {
        preview: null,
        staging: null,
        error:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to load chemotherapy plan preview.",
      };
    }
  }

  return { preview: null, staging: null, error: lastError };
};

/* ============================================================
   SHARED REAL-DATA LOADERS (used by the History / Discharge /
   Notes & Documents tabs so every table shows live records)

   - loadLatestChemoPlan: GET /chemotherapy/plans?patient_id=
     (branch filter first, retry without it - same fallback as
     the Order Summary loader above).
   - loadCycleDetail: GET /chemotherapy/cycles/:id - returns a
     cycle WITH its recorded chemotherapy_vitals and
     chemotherapy_adverse_event rows.
   ============================================================ */
export const loadLatestChemoPlan = async (
  patientId: string
): Promise<SummaryPlan | null> => {
  /* Mapping-scoped endpoint (GET /plans/latest-for-patient): access is
     resolved from the caller's ACTIVE user_branch_mapping on the
     backend (like /encounters/latest), so this works with or without
     a branch selection and never 403s multi-branch staff. */
  const response = await API.get<{
    success: boolean;
    data: SummaryPlan | null;
  }>("/chemotherapy/plans/latest-for-patient", {
    params: { patient_id: patientId },
  });
  return response.data?.data ?? null;
};

export const loadCycleDetail = async (
  cycleId: string
): Promise<ChemoCycleDetail | null> => {
  const response = await API.get<{ success: boolean; data: ChemoCycleDetail }>(
    `/chemotherapy/cycles/${encodeURIComponent(cycleId)}`
  );
  return response.data?.data ?? null;
};

export const loadCyclesForPlan = async (
  planId: string
): Promise<ChemoCycleDetail[]> => {
  try {
    const response = await API.get<{ success: boolean; data: ChemoCycleDetail[] }>(
      `/chemotherapy/plans/${encodeURIComponent(planId)}/cycles`
    );
    return response.data?.data ?? [];
  } catch (err) {
    console.warn(`loadCyclesForPlan failed for plan ${planId}:`, err);
    return [];
  }
};

export const loadAllPlansForPatient = async (
  patientId: string
): Promise<SummaryPlan[]> => {
  try {
    const response = await API.get<{ success: boolean; data: any }>(
      "/chemotherapy/plans",
      { params: { patient_id: patientId, limit: 50 } }
    );
    const data = response.data?.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.rows)) return data.rows;
    return [];
  } catch (err) {
    console.warn(`loadAllPlansForPatient failed for ${patientId}:`, err);
    return [];
  }
};

/* ============================================================
   DISCHARGE (TAKE-HOME) MEDICINES LOADER
   GET /chemotherapy/regimen-protocols/:protocolId/discharge-medicines
   - real take-home rows saved on the patient's regimen protocol.
   ============================================================ */
export const loadDischargeMedicines = async (
  protocolId: string
): Promise<DischargeMedicineRecord[]> => {
  const response = await API.get<{
    success: boolean;
    data: DischargeMedicineRecord[];
  }>(
    `/chemotherapy/regimen-protocols/${encodeURIComponent(
      protocolId
    )}/discharge-medicines`
  );
  return response.data?.data ?? [];
};
