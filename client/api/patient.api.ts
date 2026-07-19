import API from "./axios";

// Matches the real backend `CreatePatientRequest`
// (Backend/HMS_Backend/src/modules/patient/patient.types.ts) — plain field
// names. The "patient_" prefix only exists on the patient_bio_data DB
// columns; the service maps these plain names onto those columns itself.
export interface CreatePatientPayload {
  username: string;
  password: string;
  first_name: string;
  middle_name?: string;
  last_name?: string;
  gender?: string;
  dob?: string;
  age?: number;
  blood_group?: string;
  mobile: string;
  alternate_mobile?: string;
  email?: string;
  marital_status?: string;
  nationality?: string;
  patient_type?: string;
  photo?: string;
  branch_id: string;
  created_by: string;
}

export interface CreatePatientResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

export const patientApi = {
  // Real route is POST /api/patients/create (see patient.routes.ts).
  create: (data: CreatePatientPayload) =>
    API.post<CreatePatientResponse>("/patients/create", data),
};
