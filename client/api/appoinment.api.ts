import API from "./axios";

// Shape returned by GET /departments (see hms-backend department.services.ts,
// which queries prisma.department_master.findMany()).
export interface Appointment {
  patient_name: string;
  appointment_no: string;
  appointment_time: string;
  status: string;
  reason_for_visit: string;
  token_number: number;
  department_name: string;
  doctor_name: string;
  branch_name: string;

}

export const appointmentApi = {
  getAll: () => API.get<{ success: boolean; data: Appointment[] }>("/appointments"),
  // POST /appointments already exists on the backend (appointment.routes.ts) — used
  // when the user picks "Others" and types an appointment name that doesn't exist yet.
  create: (data: { department_name: string }) =>
    API.post<{ success: boolean; data: Appointment }>("/appointments", data),
};