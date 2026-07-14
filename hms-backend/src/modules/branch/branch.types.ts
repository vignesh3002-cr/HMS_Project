// Mirrors the columns actually present on the `branch` table (see prisma/schema.prisma).
// Only branch_name, username and password are required by the service; everything else
// maps 1:1 to a nullable branch column.
export interface CreateBranchDto {
  // Branch
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

  // Branch Admin (user_table)
  username: string;
  password: string;
}