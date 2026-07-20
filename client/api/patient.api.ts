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
  patient_type?: string;
  photo?: string;
}

// Shape actually returned by GET /patients — matches the real `patient_bio_data`
// columns plus the `branch`/`user_table` relations the repository includes
// (see Backend/HMS_Backend patient.repository.ts getPatients). Note this does
// NOT include diagnosis or assigned-doctor info — getPatients doesn't join
// patient_history/appointment_history, so that data isn't available yet.
export interface PatientRecord {
  patient_id: string;
  user_id: string | null;
  branch_id: string | null;
  patient_first_name: string;
  patient_middle_name: string | null;
  patient_last_name: string | null;
  patient_gender: string | null;
  patient_dob: string | null;
  patient_age: number | null;
  patient_blood_group: string | null;
  patient_primary_mobile: string | null;
  patient_alternate_mobile: string | null;
  patient_email: string | null;
  patient_marital_status: string | null;
  patient_nationality: string | null;
  patient_photo_url: string | null;
  patient_type: string | null;
  patient_active: string | null;
  branch: { branch_name: string | null } | null;
  user_table: { role_type: string | null; user_status: number | null } | null;
}

export interface GetPatientsParams {
  branchId?: string;
  patientType?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const patientApi = {
  // Real route is POST /api/patients/create (see patient.routes.ts).
  create: (data: CreatePatientPayload) =>
    API.post<{ success: boolean; message: string; data?: unknown }>("/patients/create", data),

  getAll: (params?: GetPatientsParams) =>
    API.get<{
      success: boolean;
      message: string;
      data: { total: number; page: number; limit: number; totalPages: number; patients: PatientRecord[] };
    }>("/patients", { params }),

  getById: (patientId: string) =>
    API.get<{ success: boolean; data: PatientResponse }>(`/patients/${patientId}`),

  update: (patientId: string, data: UpdatePatientPayload) =>
    API.put<{ success: boolean; message: string; data?: unknown }>(`/patients/${patientId}`, data),
};
