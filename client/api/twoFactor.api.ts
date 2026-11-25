import api from "./axios";

export interface TwoFactorStatus {
  isEnabled: boolean;
  totpConfigured: boolean;
  primaryEmail: string | null;
  maskedPrimaryEmail: string;
  alternateEmail: string | null;
  maskedAlternateEmail: string;
  alternateEmailVerified: boolean;
  preferredEmailTarget: "PRIMARY" | "SECONDARY";
  primaryMobile: string | null;
  maskedPrimaryMobile: string;
  alternateMobile: string | null;
  maskedAlternateMobile: string;
  alternateMobileVerified: boolean;
  preferredMobileTarget: "PRIMARY" | "SECONDARY";
  whatsappEnabled: boolean;
  defaultLoginMethod: string;
  remainingRecoveryCodes: number;
}

export interface TotpSetupData {
  secret: string;
  otpauthUrl: string;
  qrSvg: string;
  qrDataUrl: string;
}

export interface LoginMethodOption {
  id:
    | "TOTP"
    | "PRIMARY_EMAIL"
    | "ALT_EMAIL"
    | "PRIMARY_MOBILE"
    | "ALT_MOBILE"
    | "SMS"
    | "WHATSAPP"
    | "RECOVERY";
  label: string;
  description: string;
  destination?: string;
  icon: string;
}

export interface AvailableLoginMethodsResponse {
  username: string;
  preferredEmailTarget: "PRIMARY" | "SECONDARY";
  preferredMobileTarget: "PRIMARY" | "SECONDARY";
  methods: LoginMethodOption[];
}

export const getTwoFactorStatus = async (): Promise<TwoFactorStatus> => {
  const res = await api.get("/auth/2fa/status");
  return res.data.data;
};

export const setupTotp = async (): Promise<TotpSetupData> => {
  const res = await api.post("/auth/2fa/totp/setup");
  return res.data.data;
};

export const confirmTotp = async (secret: string, code: string): Promise<{ success: boolean; recoveryCodes: string[] }> => {
  const res = await api.post("/auth/2fa/totp/confirm", { secret, code });
  return res.data.data;
};

export const disableTwoFactor = async (password: string): Promise<{ success: boolean; message: string }> => {
  const res = await api.post("/auth/2fa/disable", { password });
  return res.data;
};

export const sendAlternateEmailOtp = async (alternateEmail: string): Promise<{ success: boolean; message: string }> => {
  const res = await api.post("/auth/2fa/alternate-email/send-otp", { alternateEmail });
  return res.data;
};

export const confirmAlternateEmail = async (alternateEmail: string, code: string): Promise<{ success: boolean; message: string }> => {
  const res = await api.post("/auth/2fa/alternate-email/confirm", { alternateEmail, code });
  return res.data;
};

export const removeAlternateEmail = async (): Promise<{ success: boolean; message: string }> => {
  const res = await api.delete("/auth/2fa/alternate-email");
  return res.data;
};

export const sendAlternateMobileOtp = async (
  alternateMobile: string,
  viaWhatsApp: boolean = false
): Promise<{ success: boolean; message: string }> => {
  const res = await api.post("/auth/2fa/alternate-mobile/send-otp", { alternateMobile, viaWhatsApp });
  return res.data;
};

export const confirmAlternateMobile = async (alternateMobile: string, code: string): Promise<{ success: boolean; message: string }> => {
  const res = await api.post("/auth/2fa/alternate-mobile/confirm", { alternateMobile, code });
  return res.data;
};

export const removeAlternateMobile = async (): Promise<{ success: boolean; message: string }> => {
  const res = await api.delete("/auth/2fa/alternate-mobile");
  return res.data;
};

export const requestAddAlternateAuthOtp = async (): Promise<{
  success: boolean;
  authorized?: boolean;
  message: string;
  destination: string;
  defaultMethod?: string;
}> => {
  const res = await api.post("/auth/2fa/alternate/request-auth-otp");
  return res.data;
};

export const verifyAddAlternateAuthOtp = async (
  code: string
): Promise<{ success: boolean; message: string }> => {
  const res = await api.post("/auth/2fa/alternate/verify-auth-otp", { code });
  return res.data;
};

export interface UpdateSecurityPreferencesPayload {
  defaultLoginMethod?:
    | "PRIMARY_EMAIL"
    | "SECONDARY_EMAIL"
    | "PRIMARY_MOBILE"
    | "SECONDARY_MOBILE"
    | "TOTP"
    | string;
  preferredEmailTarget?: "PRIMARY" | "SECONDARY";
  preferredMobileTarget?: "PRIMARY" | "SECONDARY";
  whatsappEnabled?: boolean;
}

export const updateSecurityPreferences = async (
  prefs: UpdateSecurityPreferencesPayload
): Promise<{ success: boolean; message: string }> => {
  const res = await api.put("/auth/2fa/preferences", prefs);
  return res.data;
};

export const getAvailableLoginMethods = async (username: string): Promise<AvailableLoginMethodsResponse> => {
  const res = await api.post("/auth/2fa/methods", { username });
  return res.data.data;
};

export const resendLoginOtp = async (
  username: string,
  channel:
    | "PRIMARY_EMAIL"
    | "ALT_EMAIL"
    | "PRIMARY_MOBILE"
    | "ALT_MOBILE"
    | "SMS"
    | "WHATSAPP"
): Promise<{
  success: boolean;
  message: string;
  destination: string;
  /** "queued" = the SMS gateway accepted it but delivery is not confirmed. */
  deliveryStatus?: "sent" | "queued";
}> => {
  const res = await api.post("/auth/2fa/resend-login-otp", { username, channel });
  return res.data;
};

export const verifyCustomLoginFactor = async (
  username: string,
  code: string,
  method: "TOTP" | "RECOVERY"
): Promise<any> => {
  const res = await api.post("/auth/2fa/verify-custom-login", { username, code, method });
  return res.data.data;
};

export const requestPasswordChangeOtp = async (
  oldPassword: string,
  channel?: string
): Promise<{
  success: boolean;
  message: string;
  destination: string;
  currentChannel: string;
  availableChannels: Array<{ id: string; label: string; destination: string }>;
}> => {
  const res = await api.post("/auth/me/password/request-otp", { oldPassword, channel });
  return res.data;
};

export const verifyPasswordChangeOtp = async (code: string): Promise<{ success: boolean; message: string }> => {
  const res = await api.post("/auth/me/password/verify-otp", { code });
  return res.data;
};

export const finalizePasswordChange = async (
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> => {
  const res = await api.patch("/auth/me/password", { oldPassword, newPassword });
  return res.data;
};
