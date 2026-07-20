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

export interface PatientResponse {
  patient_id: string;
  username: string;
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
  current_address?: string;
  permanent_address?: string;
  emergency_mobile?: string;
  emergency_name?: string;
  emergency_relation?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdatePatientPayload {
  branch_id: string;
  first_name: string;
  middle_name?: string;
  last_name?: string;
  gender?: string;
  dob?: string;
  blood_group?: string;
  mobile: string;
  alternate_mobile?: string;
  email?: string;
  marital_status?: string;
  nationality?: string;
  photo?: string;
}

export const patientApi = {
  // Real route is POST /api/patients/create (see patient.routes.ts).
  create: (data: CreatePatientPayload) =>
    API.post<{ success: boolean; message: string; data?: unknown }>("/patients/create", data),

  getById: (patientId: string) =>
    API.get<{ success: boolean; data: PatientResponse }>(`/patients/${patientId}`),

  update: (patientId: string, data: UpdatePatientPayload) =>
    API.put<{ success: boolean; message: string; data?: unknown }>(`/patients/${patientId}`, data),
};
