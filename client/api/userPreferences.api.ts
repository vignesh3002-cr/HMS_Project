import API from "@/api/axios";

export interface KpiPreferencesResponse {
  success: boolean;
  data: { kpis: string[] };
}

export const getKpiPreferences = async (): Promise<string[]> => {
  const res = await API.get<KpiPreferencesResponse>("/auth/me/kpi-preferences");
  return res.data?.data?.kpis ?? [];
};

export const saveKpiPreferences = async (kpis: string[]): Promise<string[]> => {
  const res = await API.put<KpiPreferencesResponse>("/auth/me/kpi-preferences", { kpis });
  return res.data?.data?.kpis ?? [];
};