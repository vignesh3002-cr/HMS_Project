import API from "./axios";

export interface CreateAppointmentPayload {
  patient_id: string;
  patient_name: string;
  patient_number?: string;
  branch_id: string;
  department_id: string;
  employee_id: string;
  appointment_date: string;
  appointment_time: string;
  reason_for_visit?: string;
  patient_type?: string;
}

export interface AvailableSlot {
  schedule_id: string | number;
  shift_name: string;
  time: string;
  is_available: boolean;
}

export interface AvailableSlotsResult {
  date: string;
  day_of_week: string;
  slots: AvailableSlot[];
}

export interface AppointmentResponse {
  appointment_id: string;
  patient_id: string;
  appointment_date: string;
  appointment_time: string;
  appointment_status: string;
}

// Shape actually returned by GET /appointments — matches the
// `appointmentDetailInclude` relations in
// Backend/HMS_Backend/src/modules/appointment/appointment.repository.ts
export interface AppointmentRecord {
  appointment_id: string;
  patient_id: string;
  doctor_name: string;
  department: string | null;
  appointment_date: string;
  appointment_time: string;
  token_number: number | null;
  status: string | null;
  reason_for_visit: string | null;
  branch_id: string | null;
  department_id: string | null;
  employee_id: string | null;
  created_at: string | null;
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
}

export interface GetAppointmentsParams {
  branchId?: string;
  employeeId?: string;
  patientId?: string;
  status?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "appointment_date" | "created_at" | "token_number" | "status";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export const appointmentApi = {
  create: (data: CreateAppointmentPayload) =>
    API.post<{ success: boolean; message: string; data: AppointmentResponse }>("/appointments", data),

  getAvailableSlots: (employeeId: string, branchId: string, date: string) =>
    API.get<{ success: boolean; data: AvailableSlotsResult }>("/appointments/available-slots", {
      params: { employeeId, branchId, date },
    }),

  getAll: (params?: GetAppointmentsParams) =>
    API.get<{
      success: boolean;
      message: string;
      data: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        appointments: AppointmentRecord[];
      };
    }>("/appointments", { params }),
};
