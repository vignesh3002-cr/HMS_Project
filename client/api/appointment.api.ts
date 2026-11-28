import type { AxiosRequestConfig } from "axios";
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
  patient_visit_type?: string;
  referred_by?: string;

  // IPD admission-request fields (book-first flow). Sent only for
  // Inpatient (IPD) bookings with an Admission/Daycare visit type; the
  // backend ignores unknown keys today and a real `admission` row is
  // created separately at admit time.
  requested_ward_id?: string;
  requested_bed_id?: string;
  ipd_payment_mode?: string;
  expected_stay_days?: number;
  advance_amount?: number;
  provisional_diagnosis?: string;
  duration_minutes?: number;
  schedule_id?: string;
}

export interface AvailableSlot {
  schedule_id: string | number;
  shift_name: string;
  time: string;
  end_time?: string;
  label?: string;
  total_minutes?: number;
  booked_minutes?: number;
  remaining_minutes?: number;
  estimated_start_time?: string;
  available_from?: string;
  is_available: boolean;
  phase_number?: number;
  phase_label?: string;
  is_phase_open?: boolean;
  is_past?: boolean;
  is_completed?: boolean;
  slot_date?: string;
  is_next_day?: boolean;
  status?: string;
}

export interface SessionPhase {
  phase_number: number;
  schedule_id?: string | number;
  shift_name?: string;
  start_time: string;
  end_time: string;
  label: string;
  total_minutes: number;
  booked_minutes: number;
  remaining_minutes: number;
  is_completed: boolean;
  is_open: boolean;
  status: "ACTIVE" | "COMPLETED" | "LOCKED";
}

export interface AvailableSlotsResult {
  date: string;
  day_of_week: string;
  phases?: SessionPhase[];
  active_phase_number?: number;
  slots: AvailableSlot[];
  is_cancelled?: boolean;
  is_on_leave?: boolean;
  leave_reason?: string | null;
}

export interface AppointmentResponse {
  appointment_id: string;
  patient_id: string;
  appointment_date: string;
  appointment_time: string;
  appointment_status: string;
  token_number?: number | null;
  duration_minutes?: number | null;
  estimated_start_time?: string | null;
  estimated_end_time?: string | null;
  slot_window?: string | null;
  patient_visit_type?: string;
  Patient_visit_type?: string;
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
  duration_minutes?: number | null;
  estimated_start_time?: string | null;
  estimated_end_time?: string | null;
  slot_window?: string | null;
  status: string | null;
  reason_for_visit: string | null;
  Patient_visit_type?: string | null;
  branch_id: string | null;
  department_id: string | null;
  employee_id: string | null;
  created_at: string | null;
  patient_type: string | null;
  patient_visit_type: string | null;
  referred_by: string | null;
  chemo_fitness?: string | null;
  chemo_unfit_reason?: string | null;
  patient_bio_data: {
    patient_id: string;
    patient_first_name: string;
    patient_middle_name: string | null;
    patient_last_name: string | null;
    patient_gender: string | null;
    patient_primary_mobile: string | null;
    patient_dob?: string | null;
    patient_age?: number | null;
    patient_blood_group?: string | null;
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
  doctor_schedule?: {
    schedule_id: string | number | null;
    day_of_week: string | null;
    shift_name: string | null;
    start_time: string | null;
    end_time: string | null;
    consultation_minutes: number | null;
  } | null;
}

export interface UpdateAppointmentPayload {
  employee_id?: string;
  branch_id?: string;
  department_id?: string;
  appointment_date?: string;
  appointment_time?: string;
  reason_for_visit?: string;
  referred_by?: string;
  patient_type?: string;
  patient_visit_type?: string;
  duration_minutes?: number;
  schedule_id?: string;
}

export interface GetAppointmentsParams {
  branchId?: string;
  employeeId?: string;
  patientId?: string;
  status?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  excludeStatuses?: string;
  sortBy?: "appointment_date" | "created_at" | "token_number" | "status";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
  viewMode?: string;
}

export const appointmentApi = {
  create: (data: CreateAppointmentPayload) =>
    API.post<{ success: boolean; message: string; data: AppointmentResponse }>("/appointments", data),

  getAvailableSlots: (
    employeeId: string,
    branchId: string,
    date: string,
    options?: { includePast?: boolean; duration?: number },
  ) =>
    API.get<{ success: boolean; data: AvailableSlotsResult }>("/appointments/available-slots", {
      params: { employeeId, branchId, date, ...options },
    }),

  getDoctorSlotSummary: (employeeId: string, date: string) =>
    API.get<{
      success: boolean;
      data: {
        date: string;
        day_of_week: string;
        total_slots: number;
        booked_count: number;
        percentage: number;
      };
    }>("/appointments/doctor-slot-summary", {
      params: { employeeId, date },
    }),

  getDoctorWeekSlotSummary: (employeeId: string, date: string) =>
    API.get<{
      success: boolean;
      data: {
        week_start: string;
        week_end: string;
        total_slots: number;
        booked_count: number;
        percentage: number;
      };
    }>("/appointments/doctor-week-slot-summary", {
      params: { employeeId, date },
    }),

  cancel: (appointmentNo: string, cancelReason: string, cancelledBy?: string) =>
    API.delete<{ success: boolean; message: string; data: AppointmentRecord }>(
      `/appointments/${appointmentNo}`,
      { data: { cancel_reason: cancelReason, cancelled_by: cancelledBy } },
    ),

  getOne: (appointmentNo: string) =>
    API.get<{ success: boolean; data: AppointmentRecord }>(`/appointments/${appointmentNo}`),

  update: (appointmentNo: string, data: UpdateAppointmentPayload) =>
    API.put<{ success: boolean; message: string; data: AppointmentRecord }>(
      `/appointments/${appointmentNo}`,
      data,
    ),

  updateStatus: (appointmentNo: string, status: string, cancelReason?: string, cancelledBy?: string) =>
    API.patch<{ success: boolean; message: string; data: AppointmentRecord }>(
      `/appointments/${appointmentNo}/status`,
      { status, cancel_reason: cancelReason, cancelled_by: cancelledBy },
    ),

  updateChemoFitness: (
    appointmentNo: string,
    payload: { fitness: "FIT" | "UNFIT" | "PENDING"; reason?: string; notes?: string }
  ) =>
    API.patch<{ success: boolean; message: string; data: AppointmentRecord }>(
      `/appointments/${appointmentNo}/chemo-fitness`,
      payload
    ),

  sandwich: (
    appointmentNo: string,
    insertAfterAppointmentNo?: string | null
  ) =>
    API.post<{ success: boolean; message: string; data: any }>(
      `/appointments/${appointmentNo}/sandwich`,
      { insertAfterAppointmentNo }
    ),

  getAll: (params?: GetAppointmentsParams, config?: AxiosRequestConfig) =>
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
    }>("/appointments", { params, ...config }),
};
