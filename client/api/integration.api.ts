import axios from "./axios";

export type ProviderType = "EMAIL" | "SMS" | "WHATSAPP";

export interface IntegrationProviderConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  from?: string;
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
  apiUrl?: string;
  apiKey?: string;
}

export interface IntegrationProvider {
  id: string;
  provider_type: ProviderType;
  provider_name: string;
  config: IntegrationProviderConfig;
  is_active: boolean;
  is_default: boolean;
  branch_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface UserIntegrationSettings {
  id: string;
  user_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  in_app_enabled: boolean;
  email_provider_id: string | null;
  sms_provider_id: string | null;
  whatsapp_provider_id: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface UpdateUserIntegrationSettingsInput {
  email_enabled?: boolean;
  sms_enabled?: boolean;
  whatsapp_enabled?: boolean;
  in_app_enabled?: boolean;
  email_provider_id?: string | null;
  sms_provider_id?: string | null;
  whatsapp_provider_id?: string | null;
}

export interface CreateIntegrationProviderInput {
  provider_type: ProviderType;
  provider_name: string;
  config: IntegrationProviderConfig;
  is_active?: boolean;
  is_default?: boolean;
  branch_id?: string | null;
}

export interface UpdateIntegrationProviderInput {
  provider_name?: string;
  config?: IntegrationProviderConfig;
  is_active?: boolean;
  is_default?: boolean;
}

const integrationApi = {
  getProviders: (branchId?: string) =>
    axios.get<{ data: IntegrationProvider[] }>("/integrations/providers", {
      params: branchId ? { branch_id: branchId } : undefined,
    }),

  getProviderByType: (type: ProviderType, branchId?: string) =>
    axios.get<{ data: IntegrationProvider }>(`/integrations/providers/type/${type}`, {
      params: branchId ? { branch_id: branchId } : undefined,
    }),

  getProviderById: (id: string) =>
    axios.get<{ data: IntegrationProvider }>(`/integrations/providers/${id}`),

  createProvider: (data: CreateIntegrationProviderInput) =>
    axios.post<{ data: IntegrationProvider }>("/integrations/providers", data),

  updateProvider: (id: string, data: UpdateIntegrationProviderInput) =>
    axios.put<{ data: IntegrationProvider }>(`/integrations/providers/${id}`, data),

  deleteProvider: (id: string) =>
    axios.delete<{ message: string }>(`/integrations/providers/${id}`),

  getUserSettings: () =>
    axios.get<{ data: UserIntegrationSettings }>("/integrations/settings"),

  updateUserSettings: (data: UpdateUserIntegrationSettingsInput) =>
    axios.put<{ data: UserIntegrationSettings }>("/integrations/settings", data),

  getProviderConfig: (type: ProviderType, branchId?: string) =>
    axios.get<{ data: IntegrationProviderConfig }>(`/integrations/providers/type/${type}/config`, {
      params: branchId ? { branch_id: branchId } : undefined,
    }),
};

export default integrationApi;