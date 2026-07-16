import axios from "axios";

const API = axios.create({
  baseURL: "https://hms-backend-qjmr.onrender.com",
});

export interface LoginResponse {
  token: string;
  user: any;
}

export const login = async (
  username: string,
  password: string
): Promise<LoginResponse> => {
  const res = await API.post("/auth/login", {
    username,
    password,
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
};