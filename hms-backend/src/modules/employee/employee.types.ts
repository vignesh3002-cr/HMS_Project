export interface CreateEmployeeDto {

  // Login Details
  username: string;
  password: string;
  role_type:
    | "BRANCH_ADMIN"
    | "DOCTOR"
    | "NURSE"
    | "RECEPTIONIST"
    | "LAB_TECHNICIAN"
    | "PHARMACIST"
    | "ACCOUNTANT";

  // Basic Details
  first_name: string;
  middle_name?: string;
  last_name: string;

  email?: string;
  mobile_no?: string;

  department_id?: string;
  designation?: string;

  branch_id: string;

  blood_group?: string;
  nationality?: string;
  marital_status?: string;

  qualification?: string;
  specialization?: string;

  joining_date?: string;

  aadhaar_no?: string;
  pan_no?: string;

  current_address?: string;
  parmanant_address?: string;

  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_number?: string;

  // Doctor
  license_no?: string;
  consultation_minutes?: number;

  // Lab Technician
  certification_no?: string;
  skill_notes?: string;

  // Receptionist
  remarks?: string;
}