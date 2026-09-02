import API from "./axios";

export interface MedicineOption {
  medicine_id: string;
  medicine_name: string;
  generic_name?: string;
  strength?: string;
  dosage_form?: string;
  unit?: string;
  route?: string;
}

export interface RegimenProtocolDilution {
  protocol_dilution_id?: string;
  medicine_id?: string | null;
  form?: string | null;
  dose?: string | number | null;
  dose_unit?: string | null;
  dilution_volume?: string | number | null;
  dilution_volume_unit?: string | null;
  diluent?: string | null;
  comment?: string | null;
}

export interface RegimenProtocolDilutionInput {
  protocol_dilution_id?: string;
  medicine_id?: string | null;
  form?: string | null;
  dose?: string | number | null;
  dose_unit?: string | null;
  dilution_volume?: string | number | null;
  dilution_volume_unit?: string | null;
  diluent?: string | null;
  comment?: string | null;
}

export interface DischargeInstruction {
  discharge_instruction_id: string;
  protocol_id: string;
  medicine_id: string | null;
  drug_sequence: number | null;
  drug_from: string | null;
  frequency: string | null;
  composition: string | null;
  duration: string | null;
  patient_dose: string | number | null;
  patient_dose_unit: string | null;
  administration_detail: string | null;
  dose_change: string | number | null;
  comment: string | null;
  source_resource_id: string | null;
  active_status: number | null;
  medicine_master: { medicine_name: string | null } | null;
}

export interface DischargeInstructionInput {
  discharge_instruction_id?: string;
  medicine_id?: string | null;
  drug_sequence?: number | null;
  drug_from?: string | null;
  frequency?: string | null;
  duration?: string | null;
  patient_dose?: number | null;
  patient_dose_unit?: string | null;
  administration_detail?: string | null;
  comment?: string | null;
}

export interface RegimenProtocolItem {
  protocol_item_id: string;
  medicine_id: string;
  drug_role: string;
  drug_sequence: number;
  drug_type: string | null;
  dosage: string | null;
  dosage_unit: string | null;
  dose_calculation_method: string | null;
  administration_route: string | null;
  infusion_type: string | null;
  infusion_duration_minutes: number | null;
  administration_day: number | null;
  cycle_day: number | null;
  frequency: string | null;
  timing_relative_to_primary: string | null;
  patient_dose: string | null;
  patient_dose_unit: string | null;
  administration_detail: string | null;
  previous_toxicity: string | null;
  remarks: string | null;
  medicine_master: { medicine_name: string | null } | null;
  chemotherapy_protocol_dilutions?: RegimenProtocolDilution[] | null;
}

export interface RegimenProtocol {
  protocol_id: string;
  regimen_code: string;
  regimen_name: string;
  protocol_version: string | null;
  cancer_type_id: string;
  subtype_id: string | null;
  treatment_intent: string | null;
  standard_cycles: number | null;
  no_of_days: number | null;
  guideline_source: string | null;
  notes: string | null;
  active_status: number | null;
  created_at: string | null;
  updated_at: string | null;
  cancer_types: { cancer_type: string | null } | null;
  cancer_subtypes: { subtype_name: string | null } | null;
  chemotherapy_regimen_protocol_items: RegimenProtocolItem[];
  protocol_dilutions?: RegimenProtocolDilution[] | null;
  protocol_discharge_instructions?: DischargeInstruction[] | null;
}

export interface RegimenProtocolItemInput {
  medicine_id?: string;
  drug_role?: string;
  drug_type?: string | null;
  drug_sequence: number;
  dosage?: string | null;
  dosage_unit?: string | null;
  dose_calculation_method?: string | null;
  administration_route?: string | null;
  infusion_type?: string | null;
  infusion_duration_minutes?: number | null;
  administration_day?: number | null;
  cycle_day?: number | null;
  frequency?: string | null;
  timing_relative_to_primary?: string | null;
  patient_dose?: string | null;
  patient_dose_unit?: string | null;
  administration_detail?: string | null;
  previous_toxicity?: string | null;
  remarks?: string | null;
  dilutions?: RegimenProtocolDilutionInput[] | null;
}

export interface ChemoPlanCycle {
  chemotherapy_cycle_id?: string;
  cycle_number: number;
  cycle_day?: number | null;
  planned_date?: string | null;
  actual_date?: string | null;
  next_cycle_date?: string | null;
  cycle_status?: string | null;
  completion_status?: string | null;
}

export interface ChemoPlan {
  chemotherapy_plan_id: string;
  patient_id: string;
  patient_history_id: string;
  encounter_no?: string | null;
  appointment_id?: string | null;
  diagnosis_id: string;
  branch_id: string;
  regimen_name?: string | null;
  regimen_code?: string | null;
  protocol_name?: string | null;
  protocol_version?: string | null;
  treatment_type?: string | null;
  treatment_intent?: string | null;
  cancer_stage?: string | null;
  cancer_type?: string | null;
  cancer_subtype?: string | null;
  ecog_status?: string | null;
  planned_cycles?: number | null;
  completed_cycles?: number | null;
  cycle_interval_days?: number | null;
  treatment_start_date?: string | null;
  expected_end_date?: string | null;
  treatment_status?: string | null;
  remarks?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  patient_bio_data?: {
    patient_id?: string;
    patient_first_name?: string | null;
    patient_last_name?: string | null;
  } | null;
  chemotherapy_regimen_protocol?: {
    protocol_id?: string;
    regimen_code?: string | null;
    regimen_name?: string | null;
  } | null;
  chemotherapy_cycle?: ChemoPlanCycle[] | null;
}

export interface LabReviewRecord {
  lab_review_id?: string;
  chemotherapy_cycle_id?: string;
  review_date?: string | null;
  hemoglobin?: number | string | null;
  wbc?: number | string | null;
  platelet_count?: number | string | null;
  cbc_normal?: boolean | null;
  chemotherapy_fit?: boolean | null;
  review_notes?: string | null;
}

export const chemotherapyApi = {
  listRegimenProtocols: (params?: {
    cancer_type_id?: string;
    subtype_id?: string;
  }) =>
    API.get<{ success: boolean; message: string; data: RegimenProtocol[] }>(
      "/chemotherapy/regimen-protocols",
      { params }
    ),
  listPlans: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    date_from?: string;
    date_to?: string;
  }) =>
    API.get<{
      success: boolean;
      message: string;
      data: ChemoPlan[];
      pagination: { total: number; page: number; limit: number };
    }>("/chemotherapy/plans", { params }),
  listLabReviews: (cycleId: string) =>
    API.get<{ success: boolean; message: string; data: LabReviewRecord[] }>(
      `/chemotherapy/cycles/${cycleId}/lab-review`
    ),
  changePlanStatus: (
    planId: string,
    payload: { status: string; reason?: string }
  ) =>
    API.patch<{ success: boolean; message: string; data: ChemoPlan }>(
      `/chemotherapy/plans/${planId}/status`,
      payload
    ),
  getRegimenProtocol: (protocolId: string) =>
    API.get<{ success: boolean; message: string; data: RegimenProtocol }>(
      `/chemotherapy/regimen-protocols/${protocolId}`
    ),
  createRegimenProtocol: (payload: {
    regimen_code: string;
    regimen_name: string;
    original_protocol?: string | null;
    protocol_version?: string | null;
    cancer_type_id: string;
    subtype_id?: string | null;
    treatment_intent?: string | null;
    standard_cycles?: number | null;
    cycle_interval_days?: number | null;
    no_of_days?: number | null;
    days?: Array<{
        protocol_day_id?: string;
        day_number: number;
        day_sequence?: number | null;
        same_as_day_one?: boolean | null;
        active_status?: number | null;
        source_day_resource_id?: string | null;
    }> | null;
    guideline_source?: string | null;
    notes?: string | null;
    items: Array<{
      medicine_id: string;
      drug_role?: string;
      drug_type?: string | null;
      drug_sequence: number;
      dosage?: string | null;
      dosage_unit?: string | null;
      dose_calculation_method?: string | null;
      administration_route?: string | null;
      frequency?: string | null;
      remarks?: string | null;
      patient_dose?: string | null;
      patient_dose_unit?: string | null;
      administration_detail?: string | null;
      previous_toxicity?: string | null;
      administration_day?: number | null;
      dilutions?: RegimenProtocolDilutionInput[] | null;
    }>;
    discharge_instructions?: DischargeInstructionInput[];
  }) =>
    API.post<{ success: boolean; message: string; data: RegimenProtocol }>(
      "/chemotherapy/regimen-protocols",
      payload
    ),
  updateRegimenProtocol: (
    protocolId: string,
    payload: {
      regimen_code?: string;
      regimen_name?: string;
      original_protocol?: string | null;
      protocol_version?: string | null;
      cancer_type_id?: string;
      subtype_id?: string | null;
      treatment_intent?: string | null;
      standard_cycles?: number | null;
      cycle_interval_days?: number | null;
      no_of_days?: number | null;
      days?: Array<{
        protocol_day_id?: string;
        day_number: number;
        day_sequence?: number | null;
        same_as_day_one?: boolean | null;
        active_status?: number | null;
        source_day_resource_id?: string | null;
      }> | null;
      guideline_source?: string | null;
      notes?: string | null;
      items?: Array<{
        medicine_id: string;
        drug_role?: string;
        drug_type?: string | null;
        drug_sequence: number;
        dosage?: string | null;
        dosage_unit?: string | null;
        dose_calculation_method?: string | null;
        administration_route?: string | null;
        frequency?: string | null;
        remarks?: string | null;
        patient_dose?: string | null;
        patient_dose_unit?: string | null;
        administration_detail?: string | null;
        previous_toxicity?: string | null;
        administration_day?: number | null;
        dilutions?: RegimenProtocolDilutionInput[] | null;
      }>;
      discharge_instructions?: DischargeInstructionInput[];
    }
  ) =>
    API.put<{ success: boolean; message: string; data: RegimenProtocol }>(
      `/chemotherapy/regimen-protocols/${protocolId}`,
      payload
    ),
  deleteRegimenProtocol: (protocolId: string) =>
    API.delete<{ success: boolean; message: string; data: RegimenProtocol }>(
      `/chemotherapy/regimen-protocols/${protocolId}`
    ),
  addRegimenProtocolItem: (
    protocolId: string,
    payload: RegimenProtocolItemInput & { medicine_id: string }
  ) =>
    API.post<{ success: boolean; message: string; data: RegimenProtocol }>(
      `/chemotherapy/regimen-protocols/${protocolId}/items`,
      payload
    ),
  updateRegimenProtocolItem: (
    protocolId: string,
    protocolItemId: string,
    payload: RegimenProtocolItemInput
  ) =>
    API.put<{ success: boolean; message: string; data: RegimenProtocol }>(
      `/chemotherapy/regimen-protocols/${protocolId}/items/${protocolItemId}`,
      payload
    ),
  removeRegimenProtocolItem: (protocolId: string, protocolItemId: string) =>
    API.delete<{ success: boolean; message: string; data: RegimenProtocol }>(
      `/chemotherapy/regimen-protocols/${protocolId}/items/${protocolItemId}`
    ),
  listCancerTypes: () =>
    API.get<{
      success: boolean;
      message: string;
      data: Array<{ cancer_type_id: string; cancer_type: string }>;
    }>("/oncology/reference/cancer-types"),
  listCancerSubtypes: (cancerTypeId: string) =>
    API.get<{
      success: boolean;
      message: string;
      data: Array<{ subtype_id: string; subtype_name: string; cancer_type_id: string }>;
    }>(`/oncology/reference/cancer-types/${cancerTypeId}/subtypes`),
  listMedicines: () =>
    API.get<{ success: boolean; message: string; data: MedicineOption[] }>(
      "/chemotherapy/medicines"
    ),
  listDilutionMedicines: () =>
    API.get<{ success: boolean; message: string; data: MedicineOption[] }>(
      "/chemotherapy/medicines/dilution-medicines"
    ),
  listMedicinesByRole: (drugRole: string) =>
    API.get<{ success: boolean; message: string; data: MedicineOption[] }>(
      "/chemotherapy/medicines/by-role",
      { params: { drug_role: drugRole } }
    ),
  getProtocolFieldOptions: () =>
    API.get<{
      success: boolean;
      message: string;
      data: {
        dosage_units: string[];
        dilution_forms: string[];
        dilution_dose_units: string[];
        dilution_volume_units: string[];
        diluents: string[];
      };
    }>("/chemotherapy/protocol-field-options"),
  listMedicinesByCancerSubtype: (
    cancerTypeId: string,
    subtypeId: string | undefined,
    drugRole: string
  ) =>
    API.get<{ success: boolean; message: string; data: MedicineOption[] }>(
      "/chemotherapy/medicines/by-cancer-subtype",
      { params: { cancer_type_id: cancerTypeId, subtype_id: subtypeId || undefined, drug_role: drugRole } }
    ),
  addDischargeInstruction: (
    protocolId: string,
    payload: DischargeInstructionInput
  ) =>
    API.post<{ success: boolean; message: string; data: RegimenProtocol }>(
      `/chemotherapy/regimen-protocols/${protocolId}/discharge-instructions`,
      payload
    ),
  updateDischargeInstruction: (
    protocolId: string,
    dischargeInstructionId: string,
    payload: DischargeInstructionInput
  ) =>
    API.put<{ success: boolean; message: string; data: RegimenProtocol }>(
      `/chemotherapy/regimen-protocols/${protocolId}/discharge-instructions/${dischargeInstructionId}`,
      payload
    ),
  removeDischargeInstruction: (
    protocolId: string,
    dischargeInstructionId: string
  ) =>
    API.delete<{ success: boolean; message: string; data: RegimenProtocol }>(
      `/chemotherapy/regimen-protocols/${protocolId}/discharge-instructions/${dischargeInstructionId}`
    ),
};