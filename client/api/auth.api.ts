import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  withCredentials: true,
});

export interface LoginResponse {
  token: string;
  user: any;
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
      rememberMe
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
      "Login failed";
    throw new Error(message);
  }
};