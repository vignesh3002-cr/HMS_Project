// client/api/branch.ts
import API from "./axios";

export interface Branch {
  branch_id: string;
  branch_name: string | null;
  branch_area: string | null;
  branch_email: string | null;
  branch_contact_number: string | null;
  hospital_name: string;
  hospital_id: string;
  admin_name?: string;
  admin_employee_id?: string;
}

export type BranchAdminMode = "EXISTING" | "NEW";

export interface NewBranchAdminPayload {
  first_name: string;
  middle_name?: string;
  last_name?: string;
  email: string;
  mobile_no: string;
  username: string;
  password: string;
  designation?: string;
  department_id?: string;

  blood_group?: string;
  nationality?: string;
  marital_status?: string;
  aadhaar_no?: string;
  pan_no?: string;
  passport_no?: string;
  permanent_address?: string;
  current_address?: string;
  employee_photo_URL?: string;
  employee_state?: string;
  employee_district?: string;
  employee_area?: string;
  employee_pincode?: number;
  employee_no_experence?: number;
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_number?: string;
  joining_date?: string;
}

export interface CreateBranchPayload {
  branch_code?: string;
  branch_name: string;
  branch_type: string;
  email?: string;
  emergency_number?: string;
  address?: string;
  district?: string;
  state_name?: string;
  country?: string;
  country_id?: string;
  area?: string;
  pincode?: number;
  license_number?: string;
  total_beds?: number;
  total_no_emp?: string;
  fax_no?: string;
  medical_services?: string;
  gst_no?: string;
  pan_no?: string;
  website_address?: string;
  date_of_establish?: string;

  admin_mode: BranchAdminMode;
  admin_user_id?: string;
  admin?: NewBranchAdminPayload;
}

export interface CreateBranchResponse {
  success: boolean;
  message: string;
  data: {
    branch: {
      branch_id: string;
      emergency_number: string | null;
      address: string | null;
      branch_email: string | null;
      branch_area: string | null;
    };
    admin: {
      user_id: string | null;
      branch_name: string | null;
      username: string | null;
    };
  };
}

export interface AssignableUser {
  user_id: string;
  employee_id: string | null;
  full_name: string;
  email: string | null;
  role_type: string;
  current_branches: string[];
  current_branch_names: (string | null)[];
}

export interface CurrentBranchAdmin {
  user_id: string;
  employee_id: string | null;
  full_name: string;
  email: string | null;
  mobile_no: string | null;
  username: string | null;
  designation: string | null;
  employee_photo_URL: string | null;
  assigned_date: string | null;
}

// Full row shape returned by GET /branch/:branchId (see branch.service.ts#getBranchById) —
// every `branch` table column plus the derived `current_admin` (or null if unassigned).
export interface BranchDetail {
  branch_id: string;
  branch_code: string | null;
  branch_name: string | null;
  branch_type: string;
  branch_area: string | null;
  district: string | null;
  state_name: string | null;
  country: string | null;
  branch_pincode: number | null;
  branch_license_no: string | null;
  emergency_no: string | null;
  branch_email: string | null;
  address: string | null;
  date_of_establish: string | null;
  total_beds: number | null;
  total_no_emp: string | null;
  fax_no: string | null;
  gst_no: string | null;
  pan_no: string | null;
  website_address: string | null;
  medical_services: string | null;
  branch_status: string | null;
  current_admin: CurrentBranchAdmin | null;
}

export const branchApi = {
  getAll: () =>
    API.get<{
      branches: any[];
      success: boolean;
      data: Branch[];
    }>("/branch"),

  create: (data: CreateBranchPayload) =>
    API.post<CreateBranchResponse>("/branch", data),

  getById: (branchId: string) =>
    API.get<{ success: boolean; data: BranchDetail }>(`/branch/${branchId}`),

  update: (branchId: string, data: Partial<CreateBranchPayload>) =>
    API.put<{ success: boolean; message: string; data?: unknown }>(
      `/branch/${branchId}`,
      data
    ),

  remove: (branchId: string) =>
    API.delete<{ success: boolean; message: string }>(`/branch/${branchId}`),

  getAssignableAdmins: (search?: string) =>
    API.get<{ success: boolean; data: AssignableUser[] }>(
      "/branch/assignable-admins",
      {
        params: search ? { search } : undefined,
      }
    ),

  assignAdmin: (branchId: string, userId: string) =>
    API.patch<{ success: boolean; message: string }>(
      `/branch/${branchId}/admin`,
      { user_id: userId }
    ),

  unassignAdmin: (userId: string) =>
    API.patch<{ success: boolean; message: string }>(
      `/branch/admin/${userId}/unassign`
    ),
};