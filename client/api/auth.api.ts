import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
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

  return {
    token: res.data.data.token,
    user: res.data.data.user,
  };
};