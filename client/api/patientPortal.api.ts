import api from "./axios";

export interface PatientBio {
  patient_id: string;
  patient_first_name?: string | null;
  patient_middle_name?: string | null;
  patient_last_name?: string | null;
  full_name?: string;
  patient_gender?: string | null;
  patient_dob?: string | null;
  patient_age?: number | null;
  patient_blood_group?: string | null;
  patient_primary_mobile?: string | null;
  patient_email?: string | null;
  branch?: {
    branch_name?: string | null;
    branch_area?: string | null;
  } | null;
}

export interface PatientAppointment {
  appointment_id: string;
  employee_id?: string | null;
  branch_id?: string | null;
  department_id?: string | null;
  doctor_name: string;
  department?: string | null;
  appointment_date: string;
  appointment_time: string;
  token_number?: number | null;
  status: string;
  reason_for_visit?: string | null;
  consultation_fee?: number | string | null;
  created_at?: string;
  branch?: {
    branch_id?: string | null;
    branch_name?: string | null;
    branch_area?: string | null;
  } | null;
}

export interface LabOrderItem {
  lab_order_item_id?: string;
  order_item_id?: string;
  test_name?: string;
  test_code?: string;
  sample_type?: string;
  item_status?: string;
  is_ready?: boolean;
  barcode?: string;
  lab_test_master?: {
    test_name?: string | null;
    test_code?: string | null;
    sample_type?: string | null;
  } | null;
  lab_report?: {
    lab_report_id?: string;
    report_number?: string | null;
    report_status?: string | null;
    generated_date?: string | null;
    generated_datetime?: string | null;
    report_file?: string | null;
    clinical_notes?: string | null;
    technician_notes?: string | null;
    doctor_notes?: string | null;
    verified_by?: string | null;
    approved_by?: string | null;
    report_data?: any;
    report_comment?: any;
  } | null;
  sample_collection?: {
    barcode?: string | null;
    collection_status?: string | null;
    collection_datetime?: string | null;
  } | any | null;
}

export interface PatientLabReport {
  lab_report_id?: string;
  report_number?: string | null;
  report_status?: string | null;
  generated_datetime?: string | null;
  report_file?: string | null;
  approved_by?: string | null;
  clinical_notes?: string | null;
  technician_notes?: string | null;
  doctor_notes?: string | null;
  report_data?: any;
}

export interface PatientLabOrder {
  order_id: string;
  order_date: string;
  created_at?: string;
  order_status?: string;
  notes?: string | null;
  employees?: {
    first_name?: string | null;
    last_name?: string | null;
  } | null;
  department_master?: {
    department_name?: string | null;
  } | null;
  lab_order_item?: LabOrderItem[];
  lab_report?: PatientLabReport[];
}

export interface PrescriptionMedicine {
  id?: string;
  prescription_item_id?: string;
  medicine_id?: string;
  drug_name?: string | null;
  dosage?: string | null;
  dose?: string | number;
  unit?: string | null;
  frequency?: string | null;
  duration?: string | null;
  days?: number | null;
  quantity?: number | null;
  route?: string | null;
  instruction?: string | null;
  instructions?: string | null;
  timing?: string | null;
  food_relation?: string | null;
  before_after_food?: string | null;
  morning?: boolean | number;
  afternoon?: boolean | number;
  night?: boolean | number;
  drug_role?: string | null;
  drug_type?: string | null;
  medicine_master?: {
    medicine_name?: string | null;
    dosage_form?: string | null;
    generic_name?: string | null;
    strength?: string | null;
  } | null;
}

export interface PatientPrescription {
  prescription_id: string;
  prescription_date: string;
  visit_type?: string | null;
  chief_complaint?: string | null;
  clinical_notes?: string | null;
  notes?: string | null;
  advice?: string | null;
  followup_date?: string | null;
  prescription_status?: string | null;
  prescription_type?: string | null;
  branch_id?: string | null;
  branch?: {
    branch_name?: string | null;
    branch_area?: string | null;
  } | null;
  employees?: {
    first_name?: string | null;
    last_name?: string | null;
    specialization?: string | null;
  } | null;
  department_master?: {
    department_name?: string | null;
  } | null;
  diagnosis?: {
    diagnosis_name?: string | null;
    icd10_code?: string | null;
  } | null;
  patient_history?: {
    patient_id?: string | null;
    mrn_no?: string | null;
    visit_date?: string | null;
    visit_type?: string | null;
    systolic_bp?: number | string | null;
    diastolic_bp?: number | string | null;
    pulse?: number | string | null;
    temperature?: number | string | null;
    weight?: number | string | null;
    height?: number | string | null;
    bmi?: number | string | null;
    oxygen_saturation?: number | string | null;
    allergy_history?: string | null;
    clinical_notes?: string | null;
    patient_bio_data?: PatientBio | null;
  } | null;
  prescription_items?: PrescriptionMedicine[];
}

export interface PatientVitals {
  id?: string;
  patient_history_id?: string;
  visit_date?: string | null;
  visit_type?: string | null;
  treating_doctor_name?: string | null;
  systolic_bp?: number | string | null;
  diastolic_bp?: number | string | null;
  pulse?: number | string | null;
  temperature?: number | string | null;
  weight?: number | string | null;
  height?: number | string | null;
  bmi?: number | string | null;
  blood_sugar?: number | string | null;
  oxygen_saturation?: number | string | null;
  respiratory_rate?: number | string | null;
  allergy_history?: string | null;
  chronic_disease?: string | null;
  clinical_notes?: string | null;
}

export interface PatientAllergyItem {
  id: string | number;
  allergy_id?: string | number | null;
  substance_name: string;
  substance_code?: string | null;
  substance_type?: string | null;
  severity?: string | null;
  reaction?: string | null;
  status: string;
  clinical_notes?: string | null;
  identified_at?: string | null;
  duration_value?: number | null;
  duration_unit?: string | null;
  doctor_name?: string | null;
  source?: string;
}

export interface PatientAllergiesResponse {
  total: number;
  active_count: number;
  allergies: PatientAllergyItem[];
}

export interface PatientDashboardData {
  patient: PatientBio;
  nextAppointment: PatientAppointment | null;
  recentOrders: PatientLabOrder[];
  activePrescription: PatientPrescription | null;
  latestVitals: PatientVitals | null;
  activeChemoPlan?: PatientChemoSummary | null;
}

export interface PatientChemoAdministration {
  administration_id: string;
  chemotherapy_cycle_id?: string | null;
  chemotherapy_plan_item_id?: string | null;
  plan_order_id?: string | null;
  administration_date?: string | null;
  administration_start_time?: string | null;
  administration_end_time?: string | null;
  administration_status?: string | null; // "GIVEN", "PENDING", "SKIPPED", "CANCELLED", etc.
  administered_dose?: number | string | null;
  administered_dose_unit?: string | null;
  administration_route?: string | null;
  infusion_completed?: boolean | null;
  iv_access_type?: string | null;
  iv_site?: string | null;
  cannula_size?: string | null;
  drug_name: string;
  drug_role?: string | null;
  medicine_name?: string | null;
  generic_name?: string | null;
  dosage_form?: string | null;
  administered_by?: string | null;
  administered_by_name?: string | null;
  verified_by?: string | null;
  nursing_notes?: string | null;
  remarks?: string | null;
  status_reason?: string | null;
}

export interface PatientChemoDischargeMedication {
  id: string;
  medicine_name: string;
  brand_name?: string | null;
  generic_name?: string | null;
  dosage_form?: string | null;
  dose?: number | string | null;
  dose_unit?: string | null;
  frequency?: string | null;
  administration_route?: string | null;
  administration_detail?: string | null;
  duration?: string | null;
  instructions?: string | null;
  source?: string | null;
  is_administered?: boolean;
  administration_status?: string | null;
  administered_date?: string | null;
  administered_dose?: number | string | null;
  administered_dose_unit?: string | null;
  administered_route?: string | null;
  administered_by_name?: string | null;
  nursing_notes?: string | null;
  administration_id?: string | null;
}

export interface PatientChemoItem {
  chemotherapy_plan_item_id: string;
  drug_name?: string | null;
  drug_role: string;
  calculated_dose?: number | string | null;
  calculated_dose_unit?: string | null;
  protocol_dose?: number | string | null;
  protocol_dose_unit?: string | null;
  administration_route?: string | null;
  administration_detail?: string | null;
  duration?: string | null;
  infusion_duration_minutes?: number | null;
  dilution_solution?: string | null;
  dilution_volume?: string | null;
  cycle_day?: number | null;
  remarks?: string | null;
}

export interface PatientChemoInvestigation {
  investigation_id: string;
  investigation_name: string;
  investigation_type?: string | null;
  investigation_category?: string | null;
  priority?: string | null;
  target_date?: string | null;
  clinical_notes?: string | null;
  item_status?: string | null;
}

export interface PatientChemoPlanOrder {
  plan_order_id: string;
  cycle_day: number;
  chemo_instructions?: string | null;
  additional_notes?: string | null;
  items: PatientChemoItem[];
  investigations: PatientChemoInvestigation[];
}

export interface PatientChemoCycle {
  chemotherapy_cycle_id: string;
  cycle_number: number;
  cycle_day?: number | null;
  planned_date: string;
  actual_date?: string | null;
  cycle_status?: string | null;
  completion_status?: string | null;
  treatment_delay?: boolean | null;
  delay_days?: number | null;
  delay_reason?: string | null;
  rescheduled_date?: string | null;
  remarks?: string | null;
  physician_approved?: boolean | null;
  approval_date?: string | null;
  orders: PatientChemoPlanOrder[];
  administrations?: PatientChemoAdministration[];
}

export interface PatientChemoSummary {
  chemotherapy_plan_id: string;
  regimen_name: string;
  protocol_name?: string | null;
  treatment_status?: string | null;
  treatment_intent?: string | null;
  cancer_type?: string | null;
  cancer_stage?: string | null;
  planned_cycles: number;
  completed_cycles: number;
  cycle_interval_days?: number | null;
  treatment_start_date: string;
  doctor_name?: string | null;
  specialization?: string | null;
  progress_percentage: number;
  next_cycle?: {
    cycle_number: number;
    planned_date: string;
    cycle_status?: string | null;
    treatment_delay?: boolean | null;
  } | null;
}

export interface PatientChemotherapyPlan {
  chemotherapy_plan_id: string;
  patient_id: string;
  regimen_name: string;
  regimen_code?: string | null;
  protocol_name?: string | null;
  treatment_status?: string | null;
  treatment_intent?: string | null;
  cancer_stage?: string | null;
  cancer_type?: string | null;
  cancer_subtype?: string | null;
  planned_cycles: number;
  completed_cycles: number;
  cycle_interval_days?: number | null;
  treatment_start_date: string;
  expected_end_date?: string | null;
  remarks?: string | null;
  discussion?: string | null;
  dosing_height_cm?: string | number | null;
  dosing_weight_kg?: string | number | null;
  dosing_bsa?: string | number | null;
  doctor?: {
    name?: string | null;
    specialization?: string | null;
    designation?: string | null;
  } | null;
  branch?: {
    branch_id?: string | null;
    branch_name?: string | null;
    branch_area?: string | null;
    emergency_no?: string | null;
    address?: string | null;
  } | null;
  progress_percentage: number;
  next_upcoming_cycle?: PatientChemoCycle | null;
  discharge_medications?: PatientChemoDischargeMedication[];
  cycles: PatientChemoCycle[];
}

export interface PatientAppointmentsData {
  total: number;
  upcoming: PatientAppointment[];
  past: PatientAppointment[];
}

export interface PortalBranch {
  branch_id: string;
  branch_name: string;
  branch_area?: string | null;
  district?: string | null;
  state_name?: string | null;
  address?: string | null;
  emergency_no?: string | null;
}

export interface PortalDepartment {
  department_id: string;
  department_name: string;
}

export interface PortalDoctor {
  employee_id: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  full_name: string;
  specialization: string;
  designation: string;
  qualification?: string | null;
  photo_url?: string | null;
  consultation_fee?: number;
  branch_id?: string | null;
  branch_name?: string | null;
  department_id?: string | null;
  department_name?: string | null;
}

export interface PortalSlot {
  schedule_id?: string | number;
  shift_name?: string;
  time: string;
  end_time?: string;
  label?: string;
  is_available: boolean;
  phase_number?: number;
  phase_label?: string;
  is_phase_open?: boolean;
}

export interface PortalAvailableSlotsResult {
  date: string;
  day_of_week?: string;
  slots: PortalSlot[];
  is_on_leave?: boolean;
  leave_reason?: string | null;
  schedule_summary?: any;
}

export interface BookAppointmentPayload {
  branch_id: string;
  department_id: string;
  employee_id: string;
  appointment_date: string;
  appointment_time: string;
  reason_for_visit?: string;
  patient_visit_type?: string;
  duration_minutes?: number;
}

export interface RescheduleAppointmentPayload {
  employee_id?: string;
  branch_id?: string;
  department_id?: string;
  appointment_date: string;
  appointment_time: string;
  reason_for_visit?: string;
  patient_visit_type?: string;
}

export const patientPortalApi = {
  getDashboard: async (): Promise<PatientDashboardData> => {
    const res = await api.get("/patient-portal/dashboard");
    return res.data.data;
  },

  getAppointments: async (): Promise<PatientAppointmentsData> => {
    const res = await api.get("/patient-portal/appointments");
    return res.data.data;
  },

  getLabReports: async (): Promise<PatientLabOrder[]> => {
    const res = await api.get("/patient-portal/lab-reports");
    return res.data.data;
  },

  getPrescriptions: async (): Promise<PatientPrescription[]> => {
    const res = await api.get("/patient-portal/prescriptions");
    return res.data.data;
  },

  getVitalsHistory: async (): Promise<PatientVitals[]> => {
    const res = await api.get("/patient-portal/vitals");
    return res.data.data;
  },

  getAllergies: async (): Promise<PatientAllergiesResponse> => {
    const res = await api.get("/patient-portal/allergies");
    return res.data?.data || { total: 0, active_count: 0, allergies: [] };
  },

  getBranches: async (): Promise<PortalBranch[]> => {
    const res = await api.get("/patient-portal/branches");
    return res.data.data;
  },

  getDepartments: async (branchId?: string): Promise<PortalDepartment[]> => {
    const res = await api.get("/patient-portal/departments", {
      params: branchId ? { branchId } : {},
    });
    return res.data.data;
  },

  getDoctors: async (params: {
    branchId?: string;
    departmentId?: string;
  }): Promise<PortalDoctor[]> => {
    const res = await api.get("/patient-portal/doctors", { params });
    return res.data.data;
  },

  getAvailableSlots: async (params: {
    employeeId: string;
    branchId: string;
    date: string;
  }): Promise<PortalAvailableSlotsResult> => {
    const res = await api.get("/patient-portal/available-slots", { params });
    return res.data.data;
  },

  bookAppointment: async (payload: BookAppointmentPayload): Promise<any> => {
    const res = await api.post("/patient-portal/appointments", payload);
    return res.data.data;
  },

  cancelAppointment: async (appointmentId: string, reason?: string): Promise<any> => {
    const res = await api.post(`/patient-portal/appointments/${appointmentId}/cancel`, {
      reason,
    });
    return res.data.data;
  },

  rescheduleAppointment: async (
    appointmentId: string,
    payload: RescheduleAppointmentPayload
  ): Promise<any> => {
    const res = await api.post(
      `/patient-portal/appointments/${appointmentId}/reschedule`,
      payload
    );
    return res.data.data;
  },

  getChemotherapyPlans: async (): Promise<PatientChemotherapyPlan[]> => {
    const res = await api.get("/patient-portal/chemotherapy");
    return res.data.data;
  },
};
