import API from "./axios";

export interface ImmunizationRecord {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface DrugConsumptionRecord {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface PersonalHistoryRecord {
  personal_history_id: string;
  encounter_no: string;
  immunization: PersonalHistoryItem[] | null;
  drug_consumption: PersonalHistoryItem[] | null;
  diet_type: string | null;
}

export interface PersonalHistoryItem {
  code: string;
  name: string;
  others?: string;
}

export interface PersonalHistoryPayload {
  immunization?: PersonalHistoryItem[] | null;
  drug_consumption?: PersonalHistoryItem[] | null;
  diet_type?: string | null;
}

export interface EncounterReportRecord {
  encounter_report_id: string;
  encounter_no: string;
  lab_test_id: string;
  report_completed_date: string | null;
  result: string | null;
  impression: string | null;
  lab_test_master?: {
    lab_test_id: string;
    test_name: string | null;
    test_code?: string | null;
  } | null;
}

export interface EncounterReportPayload {
  lab_test_id: string;
  report_completed_date?: string | null;
  result?: string | null;
  impression?: string | null;
}

export const consultationApi = {
  // ---------------- Master data ----------------
  getImmunizations: (search?: string) =>
    API.get<{ success: boolean; data: ImmunizationRecord[] }>(
      "/consultation/masters/immunizations",
      { params: search ? { search } : undefined },
    ),

  createCustomImmunization: (data: { name: string; description?: string }) =>
    API.post<{ success: boolean; message: string; data: ImmunizationRecord }>(
      "/consultation/masters/immunizations/custom",
      data,
    ),

  getDrugConsumptions: (search?: string) =>
    API.get<{ success: boolean; data: DrugConsumptionRecord[] }>(
      "/consultation/masters/drug-consumptions",
      { params: search ? { search } : undefined },
    ),

  createCustomDrugConsumption: (data: { name: string; description?: string }) =>
    API.post<{ success: boolean; message: string; data: DrugConsumptionRecord }>(
      "/consultation/masters/drug-consumptions/custom",
      data,
    ),

  getDietTypes: () =>
    API.get<{ success: boolean; data: string[] }>("/consultation/masters/diet-types"),

  // ---------------- Personal history ----------------
  getPersonalHistory: (encounterNo: string) =>
    API.get<{ success: boolean; data: PersonalHistoryRecord | null }>(
      `/consultation/encounters/${encounterNo}/personal-history`,
    ),

  savePersonalHistory: (encounterNo: string, data: PersonalHistoryPayload) =>
    API.put<{ success: boolean; message: string; data: PersonalHistoryRecord }>(
      `/consultation/encounters/${encounterNo}/personal-history`,
      data,
    ),

  // ---------------- Encounter reports ----------------
  getReports: (encounterNo: string) =>
    API.get<{ success: boolean; data: EncounterReportRecord[] }>(
      `/consultation/encounters/${encounterNo}/reports`,
    ),

  addReport: (encounterNo: string, data: EncounterReportPayload) =>
    API.post<{ success: boolean; message: string; data: EncounterReportRecord }>(
      `/consultation/encounters/${encounterNo}/reports`,
      data,
    ),

  updateReport: (encounterReportId: string, data: Partial<EncounterReportPayload>) =>
    API.put<{ success: boolean; message: string; data: EncounterReportRecord }>(
      `/consultation/reports/${encounterReportId}`,
      data,
    ),

  removeReport: (encounterReportId: string) =>
    API.delete<{ success: boolean; message: string }>(
      `/consultation/reports/${encounterReportId}`,
    ),
};
