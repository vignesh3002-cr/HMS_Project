import type { AxiosRequestConfig } from "axios";
import API from "./axios";

export interface CreateHospitalPayload {
  hospital_name: string;
  hospital_address?: string | null;
  contact_number?: string | null;
  email_id?: string | null;
  website_address?: string | null;
  hospital_type?: string | null;
  hospital_license_no?: string | null;
  hospital_country?: string | null;
  hospital_state?: string | null;
  hospital_district?: string | null;
  hospital_area?: string | null;
  pincode?: string | null;
  timezone?: string | null;
}

export interface UpdateHospitalPayload {
  hospital_name?: string;
  hospital_address?: string | null;
  contact_number?: string | null;
  email_id?: string | null;
  website_address?: string | null;
  hospital_type?: string | null;
  hospital_license_no?: string | null;
  hospital_country?: string | null;
  hospital_state?: string | null;
  hospital_district?: string | null;
  hospital_area?: string | null;
  pincode?: string | null;
  timezone?: string | null;
}

export interface HospitalRecord {
  hospital_id: string;
  hospital_name: string;
  Hospital_address: string | null;
  pincode: string | null;
  contact_number: string | null;
  fax_number: string | null;
  email_id: string | null;
  website_address: string | null;
  hospital_type: string | null;
  hospital_license_no: string | null;
  hospital_country: string | null;
  hospital_state: string | null;
  hospital_district: string | null;
  hospital_area: string | null;
  timezone: string | null;
  branch_count?: number;
}

export interface HospitalListResponse {
  hospitals: HospitalRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const hospitalApi = {
  getAll: (page = 1, limit = 50, config?: AxiosRequestConfig) =>
    API.get<{ success: boolean; message: string; data: HospitalRecord[]; pagination: HospitalListResponse }>(
      "/hospitals",
      { params: { page, limit }, ...config }
    ),

  getById: (hospitalId: string, config?: AxiosRequestConfig) =>
    API.get<{ success: boolean; message: string; data: HospitalRecord }>(
      `/hospitals/${hospitalId}`,
      config
    ),

  create: (data: CreateHospitalPayload, config?: AxiosRequestConfig) =>
    API.post<{ success: boolean; message: string; data: HospitalRecord }>(
      "/hospitals",
      data,
      config
    ),

  update: (hospitalId: string, data: UpdateHospitalPayload, config?: AxiosRequestConfig) =>
    API.put<{ success: boolean; message: string; data: HospitalRecord }>(
      `/hospitals/${hospitalId}`,
      data,
      config
    ),
};