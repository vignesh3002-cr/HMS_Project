import API from "./axios";

export interface DashboardAuthResponse {
  success: boolean;
  user: {
    user_id: string;
    role_type?: string;
    role?: string;
    employee_id: string | null;
    [key: string]: unknown;
  };
}

export interface DashboardBranch {
  branch_id: string;
  branch_name: string;
  status?: number;
  assigned_date?: string;
}

export interface DashboardSchedule {
  schedule_id?: string;
  employee_id?: string;
  branch_id?: string;
  day_of_week?: string;
  shift_name?: string;
  start_time?: string | null;
  end_time?: string | null;
  is_active?: boolean;
  branch?: {
    branch_name?: string;
  };
}

export interface DashboardEmployee {
  employee_id: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  mobile_no?: string | null;
  employee_photo_URL?: string | null;
  designation?: string | null;
  specialization?: string | null;
  emp_status?: boolean;
}

export interface DashboardDoctorResponse {
  success: boolean;
  data: {
    employee: DashboardEmployee;
    user?: {
      user_id?: string;
      role_type?: string;
      username?: string;
      user_status?: number;
      branch_id?: string;
    };
    branches?: DashboardBranch[];
    doctorProfile?: Record<string, unknown> | null;
    doctorSchedules?: DashboardSchedule[];
  };
}

export interface DashboardAppointment {
  appointment_id?: string;
  appointment_no?: string;
  appointment_date: string;
  appointment_time: string;
  Patient_visit_type?: string;
  status: string;
  patient_bio_data?: {
    patient_id?: string;
    patient_first_name?: string | null;
    patient_middle_name?: string | null;
    patient_last_name?: string | null;
    patient_primary_mobile?: string | null;
  } | null;
  employees?: {
    employee_id?: string;
    first_name?: string;
    middle_name?: string | null;
    last_name?: string;
  } | null;
}

export interface DashboardAppointmentsResponse {
  success: boolean;
  message: string;
  data: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    appointments: DashboardAppointment[];
  };
}

export interface DashboardPatientCountResponse {
  success: boolean;
  message: string;
  data: {
    employeeId: string;
    branchId: string | null;
    totalPatients: number;
  };
}

export const doctorDashboardApi = {
  getCurrentUser() {
    return API.get<DashboardAuthResponse>("/auth/me");
  },

  getDoctor(employeeId: string) {
    return API.get<DashboardDoctorResponse>(`/employees/${employeeId}`);
  },

  getAppointments(params: {
    employeeId: string;
    branchId?: string;
    date?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    return API.get<DashboardAppointmentsResponse>("/appointments", {
      params,
    });
  },

  getPatientCount(params: { employeeId: string; branchId?: string | null }) {
    return API.get<DashboardPatientCountResponse>("/appointments/patient-count", {
      params,
    });
  },
};