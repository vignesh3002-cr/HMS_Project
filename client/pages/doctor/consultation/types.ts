export interface ConsultationState {
  patientId?: string;
  appointmentId?: string;
  branchId?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  consultedBy?: string;
  visit_type?: string;
}

export interface MeasurementValues {
  height: string;
  weight: string;
  bsa: string;
  bmi: string;
  bp: string;
  pulse: string;
  temp: string;
  spo2: string;
  painScore: string;
}

export type FormData = {
  /* DD-MM-YYYY, picked from the calendar popovers. */
  diagnosisDate: string;
  progressionDate: string;
  relapseDate: string;
  preDiagnosis: string;
  molecularTesting: string;
  molecularTestingNote: string;
  molecularTestingDate: string;
  diseaseStatus: string;
  /* Laterality / Body Site / Grade / Score are grouped per selected cancer
     type like T/N/M; values are qualified as `${cancerType}|${label}`. */
  laterality: string[];
  bodySite: string[];
  survivor: string;
  /* Primary (first) cancer type, plus the full multi-select list. */
  type: string;
  cancerTypes: string[];
  subType: string[];
  histomorphology: string;
  cancerStage: string[];
  grade: string[];
  score: string[];
  tStage: string[];
  nStage: string[];
  mStage: string[];
  icdCode: string;
  notes: string;
};

/* Row shape returned by
   GET /chemotherapy/regimen-protocols/:protocolId/discharge-medicines */
export type DischargeMedicineRecord = {
  discharge_instruction_id?: string;
  protocol_id?: string;
  drug_sequence?: number | null;
  drug_from?: string | null;
  frequency?: string | null;
  composition?: string | null;
  duration?: string | null;
  patient_dose?: number | string | null;
  patient_dose_unit?: string | null;
  administration_detail?: string | null;
  comment?: string | null;
  medicine_master?: {
    medicine_name: string | null;
    generic_name?: string | null;
    dosage_form?: string | null;
    unit?: string | null;
  } | null;
};

export type Drug = {
  id: number;
  name: string;
  form: string;
  dose: string;
  unit: string;
  volume: string;
  planItemId?: string;
  medicineId?: string;
  /* Unscaled protocol dose (item.dosage / protocol_dose). Rows derived
     from the protocol carry this so the displayed dose can be re-scaled
     live when the dose calculator selection changes (BMI vs BSA). Rows
     the doctor typed or edited themselves have no raw dosage and are
     never re-scaled. */
  rawDose?: number | null;
};

export type RegimenProtocolDay = {
  protocol_day_id: string;
  day_number: number;
  day_sequence: number | null;
  same_as_day_one: boolean | null;
  protocol_item_id: string | null;
  medicine_count: string | null;
  chemotherapy_regimen_protocol_items: RegimenProtocolItem | null;
};

export type RegimenProtocolItem = {
  protocol_item_id: string;
  medicine_id: string;
  drug_role: string | null;
  drug_sequence: number;
  drug_type: string | null;
  dosage: number | null;
  dosage_unit: string | null;
  administration_route: string | null;
  infusion_type: string | null;
  infusion_duration_minutes: number | null;
  administration_day: number | null;
  cycle_day: number | null;
  frequency: string | null;
  timing_relative_to_primary: string | null;
  remarks: string | null;
  administration_detail: string | null;
  medicine_master: {
    medicine_name: string;
    generic_name: string | null;
    dosage_form: string | null;
    unit: string | null;
  } | null;
};

export type RegimenProtocolDilution = {
  protocol_dilution_id: string;
  protocol_item_id: string | null;
  medicine_id: string | null;
  form: string | null;
  dose: number | null;
  dose_unit: string | null;
  dilution_volume: number | null;
  dilution_volume_unit: string | null;
  diluent: string | null;
  comment: string | null;
  hydration_stage: string | null;
  drug_brand_name: string | null;
  medicine_master: { medicine_name: string } | null;
};

export type RegimenProtocolDetail = {
  protocol_id: string;
  regimen_code: string | null;
  regimen_name: string;
  treatment_intent: string | null;
  standard_cycles: number | null;
  cycle_interval_days: number | null;
  no_of_days: number | null;
  chemotherapy_regimen_protocol_days: RegimenProtocolDay[] | null;
  chemotherapy_regimen_protocol_items: RegimenProtocolItem[];
  protocol_dilutions?: RegimenProtocolDilution[] | null;
};
