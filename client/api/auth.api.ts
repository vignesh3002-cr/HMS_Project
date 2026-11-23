import axios from "axios";

const API = axios.create({
  baseURL:
    import.meta.env.VITE_BACKEND_URL ||
    import.meta.env.VITE_BACKEND_URL_PROD ||
    "/api",
  withCredentials: true,
});

export interface LoginResponse {
  token?: string;
  user?: any;
  requiresOtp?: boolean;
  username?: string;
  message?: string;
}

export const login = async (
  username: string,
  password: string,
  rememberMe: boolean
): Promise<LoginResponse> => {
  try {
    const res = await API.post("/auth/login", {
      username,
      password,
      rememberMe,
    });

    if (!res.data.success) {
      throw new Error(res.data.message);
    }

    const payload = res.data?.data ?? {};
    const user = payload.user_details ?? payload.user ?? null;

    return {
      token: payload.token,
      user,
      requiresOtp: payload.requiresOtp ?? true,
      username: payload.username ?? username,
      message: res.data.message,
    };
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Login failed";
    throw new Error(message);
  }
};

export const sendOtp = async (username: string): Promise<{ message: string }> => {
  try {
    const res = await API.post("/auth/send-otp", { username });
    if (!res.data.success) {
      throw new Error(res.data.message);
    }
    return res.data;
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Failed to send OTP";
    throw new Error(message);
  }
};

export const verifyOtp = async (
  username: string,
  otp: string,
  rememberMe: boolean = false
): Promise<{ token: string; user: any }> => {
  try {
    const res = await API.post("/auth/verify-otp", {
      username,
      otp,
      rememberMe,
    });

    if (!res.data.success) {
      throw new Error(res.data.message);
    }

    const payload = res.data?.data ?? {};
    const user = payload.user_details ?? payload.user ?? null;

    return {
      token: payload.token,
      user,
    };
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Invalid OTP";
    throw new Error(message);
  }
};

export const requestForgotPasswordOtp = async (
  username: string
): Promise<{
  success: boolean;
  message: string;
  destination: string;
  defaultMethod?: string;
}> => {
  try {
    const res = await API.post("/auth/forgot-password/request-otp", { username });
    if (!res.data.success) {
      throw new Error(res.data.message);
    }
    return res.data;
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Failed to request verification code";
    throw new Error(message);
  }
};

export const verifyForgotPasswordOtp = async (
  username: string,
  code: string
): Promise<{
  success: boolean;
  message: string;
  resetToken: string;
}> => {
  try {
    const res = await API.post("/auth/forgot-password/verify-otp", { username, code });
    if (!res.data.success) {
      throw new Error(res.data.message);
    }
    return res.data;
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Failed to verify code";
    throw new Error(message);
  }
};

export const resetForgotPassword = async (
  username: string,
  resetToken: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const res = await API.post("/auth/forgot-password/reset", {
      username,
      resetToken,
      newPassword,
    });
    if (!res.data.success) {
      throw new Error(res.data.message);
    }
    return res.data;
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Failed to reset password";
    throw new Error(message);
  }
};