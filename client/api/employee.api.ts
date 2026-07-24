import API from "./axios";

export interface CreateEmployeePayload {
  username: string;
  password: string;
  role_type: "DOCTOR" | "NURSE" | "PHARMACIST" | "LAB_TECHNICIAN" | "RECEPTIONIST" | "STAFF";
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  mobile_no: string;
  blood_group?: string;
  nationality?: string;
  marital_status?: string;
  aadhaar_no?: string;
  pan_no?: string;
  passport_no?: string;
  permanent_address?: string;
  current_address?: string;
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_number?: string;
  department_id: string;
  designation: string;
  specialization?: string;
  qualification?: string;
  doc_license_no?: string;
  joining_date: string;
  emp_status: boolean;
  branch_ids: string[];
  consultation_minutes?: number;
  working_hours?: WorkingHourPayload[];
}

export type DayOfWeek = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

export interface WorkingHourPayload {
  branch_id: string;
  day_of_week: DayOfWeek;
  shift_name: string;
  start_time: string;
  end_time: string;
}

export interface EmployeeRecord {
  employee_id: string;
  user_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  blood_group: string | null;
  nationality: string | null;
  marital_status: string | null;
  mobile_no: string;
  parmanant_address: string | null;
  current_address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_relationship: string | null;
  emergency_contact_number: string | null;
  aadhaar_no: string | null;
  pan_no: string | null;
  passport_no: string | null;
  designation: string | null;
  specialization: string | null;
  qualification: string | null;
  doc_license_no: string | null;
  joining_date: string;
  branch_id: string;
  emp_status: boolean | null;
  email: string;
  department_id: string;
  department_master?: 
  { department_name: string } | null;
  user_table: {
    role_type: string;
    user_status: number;
  };
  branch: {
    branch_name: string;
    branch_area?: string | null;
  } | null;
  photo?: string | null;
}

export interface EmployeeDetailResponse {
  employee: EmployeeRecord & {
    employee_photo_URL?: string | null;
    employee_no_experence?: number | null;
    current_address?: string | null;
    parmanant_address?: string | null;
  };
  user: { role_type: string; user_status: number } | null;
  branches: { branch_id: string; branch_name: string }[];
  doctorProfile?: {
    specialization: string | null;
    qualification: string | null;
    license_no: string | null;
    consultation_minutes: number | null;
  } | null;
  doctorSchedules?: unknown[];
}

export interface CreateEmployeeResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      user_username: string;
      user_id: string;
      role_type: string;
      user_status: number;
    };
    employee: {
      employee_id: string;
      first_name: string;
      middle_name: string | null;
    };
  };
}

export interface GetEmployeesParams {
  role_type?: "DOCTOR" | "NURSE" | "PHARMACIST" | "LAB_TECHNICIAN" | "RECEPTIONIST" | "STAFF";
  branch_id?: string;
  department_id?: string;
  status?: boolean;
  page?: number;
  limit?: number;
}

export interface UpdateEmployeePayload {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  email?: string;
  mobile_no?: string;
  blood_group?: string;
  nationality?: string;
  marital_status?: string;
  aadhaar_no?: string;
  pan_no?: string;
  passport_no?: string;
  permanent_address?: string;
  current_address?: string;
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_number?: string;
  department_id?: string;
  designation?: string;
  specialization?: string;
  qualification?: string;
  doc_license_no?: string;
  joining_date?: string;
  emp_status?: boolean;
  // Not yet persisted by PUT /employees/:employeeId (the backend's updateEmployee
  // only maps the fields above) — sent anyway so the request already carries them
  // once the backend adds support, without another frontend change.
  branch_ids?: string[];
  consultation_minutes?: number;
  working_hours?: WorkingHourPayload[];
  photo?: string;
}

export const employeeApi = {
  create: (data: CreateEmployeePayload) =>
    API.post<CreateEmployeeResponse>("/employees/create", data),

  getAll: (params?: GetEmployeesParams) =>
    API.get<{ success: boolean; data: { employees: EmployeeRecord[]; total: number; page: number; limit: number } }>("/employees", { params }),

  getOne: (employeeId: string) =>
    API.get<{ success: boolean; data: EmployeeDetailResponse }>(`/employees/${employeeId}`),

  update: (employeeId: string, data: UpdateEmployeePayload) =>
    API.put<{ success: boolean; data: any; message?: string }>(`/employees/${employeeId}`, data),
};
