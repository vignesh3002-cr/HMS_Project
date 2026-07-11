export interface CreateBranchDto {
  // Branch
  branch_code: string;
  branch_type: string;
  branch_name: string;
  email: string;
  contact_number: string;
  emergency_number: string;
  address: string;
  district: string;
  state_name: string;
  country: string;
  pincode: number;
  license_number: string;
  total_beds: number;
  icu_beds: number;
  consultation_rooms: number;
  operation_theaters: number;
  medical_services: string;
  gst_no: string;
  pan_no: string;
  website_address: string;
  area: string;

  // Branch Admin
  admin_name: string;
  mobile: string;
  username: string;
  password: string;
}