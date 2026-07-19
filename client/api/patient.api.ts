import API from "./axios";

// Shape matches the real `patient_bio_data` Prisma model (patient_* columns) plus
// username/password, which live on the shared `user_table` (same pattern as employees).
// Address and emergency-contact fields are intentionally omitted — patient_bio_data
// has no columns for those yet.
export interface CreatePatientPayload {
  username: string;
  password: string;
  branch_id: string;
  patient_first_name: string;
  patient_middle_name?: string;
  patient_last_name?: string;
  patient_gender?: string;
  patient_dob?: string;
  patient_blood_group?: string;
  patient_primary_mobile: string;
  patient_alternate_mobile?: string;
  patient_email?: string;
  patient_marital_status?: string;
  patient_nationality?: string;
  patient_photo_url?: string;
}

export interface CreatePatientResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

export const patientApi = {
  create: (data: CreatePatientPayload) =>
    API.post<CreatePatientResponse>("/patients", data),
};
