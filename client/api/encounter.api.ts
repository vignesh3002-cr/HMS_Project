import type { AxiosRequestConfig } from "axios";
import API from "./axios";

export interface CreateEncounterPayload {
  appointment_id: string;
}

export interface EncounterRecord {
  encounter_id: string;
  encounter_no: string;
  patient_id: string;
  branch_id: string;
  department_id: string | null;
  appointment_id: string;
  employee_id: string;
  schedule_id: string | number;
  encounter_type: string;
  status: string;
  chief_complaint: string | null;
  symptoms: string | null;
  diagnosis_id: string | null;
  clinical_notes: string | null;
  advice: string | null;
  follow_up_date: string | null;
   height: number | null;
   weight: number | null;
   pulse: number | null;
   systolic_bp: number | null;
   diastolic_bp: number | null;
   temperature: number | null;
   respiratory_rate: number | null;
   spo2: number | null;
   blood_sugar: number | string | null;
   pain_score: number | string | null;
   BMI: number | string | null;
  checkin_time: string | null;
  checkout_time: string | null;
  closed_by: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  patient_bio_data: {
    patient_id: string;
    patient_first_name: string;
    patient_middle_name: string | null;
    patient_last_name: string | null;
    patient_gender: string | null;
    patient_primary_mobile: string | null;
  } | null;
  employees: {
    employee_id: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    specialization: string | null;
    mobile_no: string;
  } | null;
  branch: {
    branch_id: string;
    branch_name: string;
    branch_area: string | null;
  } | null;
  department_master: {
    department_id: string;
    department_name: string;
  } | null;
  appointment: {
    appointment_id: string;
    appointment_date: string;
    appointment_time: string;
    status: string | null;
  } | null;
}

export interface GetEncountersParams {
  branchId?: string;
  doctorId?: string;
  patientId?: string;
  appointmentId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface PatientHistoryPayload {
  patientId: string;
  appointmentId?: string;
  systolicBp?: number;
  diastolicBp?: number;
  pulse?: number;
  respiratoryRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
  bloodSugar?: string;
  weight?: number;
  height?: number;
  painScore?: number;
  severity?: number;
  clinicalNotes?: string;
}

export interface PatientHistoryResponse {
  patientHistoryId: string;
  patientId: string;
  appointmentId: string | null;
  visitDate: string;
  systolicBp: number | null;
  diastolicBp: number | null;
  pulse: number | null;
  respiratoryRate: number | null;
  temperature: number | null;
  oxygenSaturation: number | null;
  bloodSugar: string | null;
  weight: number | null;
  height: number | null;
  bmi: number | null;
  painScore: number | null;
  severity: number | null;
  visitType: string;
  visitStatus: string;
  clinicalNotes: string | null;
}

export const encounterApi = {
  create: (data: CreateEncounterPayload) =>
    API.post<{ success: boolean; message: string; data: EncounterRecord }>("/encounters", data),

  getAll: (params?: GetEncountersParams, config?: AxiosRequestConfig) =>
    API.get<{
      success: boolean;
      message: string;
      data: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        encounters: EncounterRecord[];
      };
    }>("/encounters", { params, ...config }),

  getByNumber: (encounterNo: string, config?: AxiosRequestConfig) =>
    API.get<{ success: boolean; data: EncounterRecord }>(`/encounters/${encounterNo}`, config),

  /**
   * Selection-independent lookup used by clinical flows. The backend checks
   * the caller's active branch mappings against the encounter's branch, so
   * this works for multi-branch doctors even when no branch is selected.
   */
  getByAppointment: (appointmentId: string) =>
    API.get<{ success: boolean; data: EncounterRecord }>(
      `/encounters/by-appointment/${appointmentId}`,
    ),

  update: (encounterNo: string, data: Partial<EncounterRecord>) =>
    API.put<{ success: boolean; message: string; data: EncounterRecord }>(
      `/encounters/${encounterNo}`,
      data,
    ),

  close: (encounterNo: string, closedBy: string) =>
    API.put<{ success: boolean; message: string; data: EncounterRecord }>(
      `/encounters/${encounterNo}/close`,
      { closedBy },
    ),

  createPatientHistory: (data: PatientHistoryPayload) =>
    API.post<{ success: boolean; data: PatientHistoryResponse }>("/patients/history", data),
};