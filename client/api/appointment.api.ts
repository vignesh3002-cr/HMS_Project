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

export const appointmentApi = {
  create: (data: CreateAppointmentPayload) =>
    API.post<{ success: boolean; message: string; data: AppointmentResponse }>("/appointments", data),

  getAvailableSlots: (employeeId: string, branchId: string, date: string) =>
    API.get<{ success: boolean; data: AvailableSlotsResult }>("/appointments/available-slots", {
      params: { employeeId, branchId, date },
    }),
};
