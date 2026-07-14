// client/api/branch.ts
import API from "./axios";

// Shape actually returned by GET /branch (see hms-backend BranchService.getAllBranches)
export interface Branch {
  branch_id: string;
  branch_name: string | null;
  branch_area: string | null;
  branch_email: string | null;
  branch_contact_number: string | null;
  hospital_name: string;
  hospital_id: string;
}

// Shape accepted by POST /branch (see hms-backend CreateBranchDto). Only branch_name,
// username and password are actually required by the service today; the rest are optional
// so callers can send whatever the form collects.
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
  username: string;
  password: string;
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

// ✅ Make sure branchApi is exported with 'export const'
export const branchApi = {
  // Get all branches
  getAll: () => API.get<{
    branches: any[]; success: boolean; data: Branch[] 
}>("/branch"),

  // Create new branch (also creates its branch-admin user)
  create: (data: CreateBranchPayload) =>
    API.post<CreateBranchResponse>("/branch", data),
};