import API from "./axios";

/* Chemotherapy consent lives on one planned course:
   - e-signatures in chemotherapy_plan_consent (one row per plan),
   - physically signed forms in patient_document.chemotherapy_plan_id.
   A new plan therefore starts with no inherited consent. */

export type PlanConsentStatus = "DRAFT" | "SIGNED";

export interface PlanConsentRecord {
  consent_id: string;
  chemotherapy_plan_id: string;
  patient_id: string;
  patient_signature: string | null;
  witness_signature: string | null;
  doctor_signature: string | null;
  patient_name: string | null;
  witness_name: string | null;
  witness_relation: string | null;
  doctor_name: string | null;
  doctor_reg_no: string | null;
  consent_date: string | null;
  status: PlanConsentStatus | string;
  signed_at: string | null;
  signed_by: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SavePlanConsentPayload {
  patient_signature?: string | null;
  witness_signature?: string | null;
  doctor_signature?: string | null;
  patient_name?: string | null;
  witness_name?: string | null;
  witness_relation?: string | null;
  doctor_name?: string | null;
  doctor_reg_no?: string | null;
  /* ISO date (YYYY-MM-DD); the backend defaults it when all three
     signatures are present. */
  consent_date?: string | null;
}

export interface ConsentDocumentRecord {
  id: string;
  document_id: string;
  patient_id: string;
  file_name: string;
  original_name?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  category?: string | null;
  uploaded_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  encounter_no?: string | null;
  document_type?: string | null;
  chemotherapy_plan_id?: string | null;
}

export interface UploadConsentDocumentPayload {
  patient_id: string;
  file_name: string;
  original_name?: string;
  file_type: string;
  file_size: number;
  file_data: string;
  category?: string;
  uploaded_by?: string;
  encounter_no?: string;
  document_type: "CONSENT_FORM";
  chemotherapy_plan_id: string;
}

export const consentApi = {
  getPlanConsent: (planId: string) =>
    API.get<{ success: boolean; message?: string; data: PlanConsentRecord | null }>(
      `/chemotherapy/plans/${encodeURIComponent(planId)}/consent`
    ),

  savePlanConsent: (planId: string, payload: SavePlanConsentPayload) =>
    API.put<{ success: boolean; message?: string; data: PlanConsentRecord | null }>(
      `/chemotherapy/plans/${encodeURIComponent(planId)}/consent`,
      payload
    ),

  /* Consent forms attached to (or filed against the visit of) one plan. */
  listPlanConsentForms: (planId: string) =>
    API.get<{ success: boolean; data: ConsentDocumentRecord[] }>(
      `/patient-documents/plan/${encodeURIComponent(planId)}`,
      { params: { document_type: "CONSENT_FORM" } }
    ),

  /* Legacy patient-level consent forms not yet attached to any plan. */
  listUnassignedConsentForms: (patientId: string) =>
    API.get<{ success: boolean; data: ConsentDocumentRecord[] }>(
      `/patient-documents/patient/${encodeURIComponent(patientId)}`,
      { params: { document_type: "CONSENT_FORM", unassigned: true } }
    ),

  attachConsentFormToPlan: (documentId: string, planId: string) =>
    API.put<{ success: boolean; message?: string; data: ConsentDocumentRecord }>(
      `/patient-documents/${encodeURIComponent(documentId)}/attach-plan`,
      { chemotherapy_plan_id: planId }
    ),

  uploadConsentForm: (payload: UploadConsentDocumentPayload) =>
    API.post<{ success: boolean; message?: string; data: ConsentDocumentRecord }>(
      "/patient-documents/upload",
      payload
    ),

  deleteConsentForm: (documentId: string) =>
    API.delete<{ success: boolean; message?: string }>(
      `/patient-documents/${encodeURIComponent(documentId)}`
    ),

  /* Metadata + bytes for one consent form (used by the print flow). */
  downloadConsentForm: (documentId: string) =>
    API.get<Blob>(
      `/patient-documents/${encodeURIComponent(documentId)}/download`,
      { responseType: "blob" }
    ),

  viewUrl: (documentId: string, token?: string | null) => {
    const base =
      import.meta.env.VITE_BACKEND_URL ||
      import.meta.env.VITE_BACKEND_URL_PROD ||
      "/api";
    const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : "";
    return `${base}/patient-documents/${encodeURIComponent(documentId)}/view${tokenQuery}`;
  },
};
