export interface CreateBranchDto {
  // Branch
  branch_name: string;
  branch_code: string;
  branch_type: string;
  email: string;
  contact_number: string;
  emergency_number?: string;
  address: string;
  city: string;
  state_name: string;
  branch_Address: string;
  country: string;
  pincode: string;
  license_number: string;
  total_beds: number;
  icu_beds: number;
  consultation_rooms: number;
  operation_theaters: number;
  medical_services: string;
  date_of_establish: string;

  // Branch Admin
  admin_name: string;
  admin_email: string;
  mobile: string;
  username: string;
  password: string;
}