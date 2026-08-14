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
  employeeId?: string;
  patientId?: string;
  appointmentId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export const encounterApi = {
  create: (data: CreateEncounterPayload) =>
    API.post<{ success: boolean; message: string; data: EncounterRecord }>("/encounters", data),

  getAll: (params?: GetEncountersParams) =>
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
    }>("/encounters", { params }),

  getByNumber: (encounterNo: string) =>
    API.get<{ success: boolean; data: EncounterRecord }>(`/encounters/${encounterNo}`),

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
};