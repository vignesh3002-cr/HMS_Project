import API from "./axios";

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
  remarks: string | null;
  medicine_master: { medicine_name: string | null } | null;
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
    guideline_source?: string | null;
    notes?: string | null;
    items: Array<{
      medicine_id: string;
      drug_role?: string;
      drug_sequence: number;
      dosage?: string | null;
      dosage_unit?: string | null;
      administration_route?: string | null;
      frequency?: string | null;
      remarks?: string | null;
      administration_day?: number | null;
    }>;
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
      guideline_source?: string | null;
      notes?: string | null;
      items?: Array<{
        medicine_id: string;
        drug_role?: string;
        drug_sequence: number;
        dosage?: string | null;
        dosage_unit?: string | null;
        administration_route?: string | null;
        frequency?: string | null;
        remarks?: string | null;
        administration_day?: number | null;
      }>;
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
};