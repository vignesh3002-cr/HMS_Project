import axios from "axios";
import { getToken, remove } from "../utils/token";

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  withCredentials: true,
});

let activeBranchId: string | null = null;

export function setActiveBranchId(id: string | null) {
  activeBranchId = id;
}

export function getActiveBranchId(): string | null {
  if (activeBranchId) return activeBranchId;
  const stored = localStorage.getItem("hms_selected_branch_id");
  if (stored && stored !== "__ALL_BRANCHES__") return stored;
  return null;
}

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const branchId = getActiveBranchId();
  if (branchId) {
    config.headers["x-branch-id"] = branchId;
  }

  if (config.method === "get") {
    config.params = { ...(config.params || {}), _: Date.now() };
    config.headers["Cache-Control"] = "no-cache";
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = (error.config?.url ?? "").includes("/auth/login");

    if (error.response?.status === 401 && !isLoginRequest) {
      if (error.response.data) {
        error.response.data.message =
          "Your session has expired. Please log in again.";
      }

      remove();
      localStorage.removeItem("user_info");

      setTimeout(() => {
        if (window.location.pathname !== "/") {
          window.location.href = "/";
        }
      }, 1200);
    }

    return Promise.reject(error);
  },
);

export default api;
