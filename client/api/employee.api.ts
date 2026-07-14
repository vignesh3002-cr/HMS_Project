import API from "./axios";

export interface CreateEmployeePayload {
  username: string;
  password: string;
  role_type: "DOCTOR" | "NURSE" | "PHARMACIST" | "STAFF";
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
  // Only doctors/nurses/pharmacists send these — staff roles omit them
  // (the employees table columns are nullable, see schema.prisma).
  specialization?: string;
  qualification?: string;
  doc_license_no?: string;
  joining_date: string;
  emp_status: boolean;
  branch_ids: string[];
  consultation_minutes?: number;
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

export const employeeApi = {
  create: (data: CreateEmployeePayload) =>
    API.post<CreateEmployeeResponse>("/employees/create", data),
};
