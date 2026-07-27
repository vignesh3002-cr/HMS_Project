import axios from "axios";
import { remove, saveToken, saveUser } from "../utils/token";

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
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
  const token = localStorage.getItem("token");

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
    if (error.response?.status === 401) {
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

if (import.meta.env.DEV && !localStorage.getItem("token")) {
  (async () => {
    try {
      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/auth/login`, {
        username: "admin",
        password: "Admin@123",
      });
      if (res.data?.success && res.data?.data?.token) {
        const token = res.data.data.token;
        const user = res.data.data.user_details || res.data.data.user || {};
        saveToken(token);
        saveUser(user);
        console.log("[dev] Auto-login successful, token saved to localStorage");
      }
    } catch (e) {
      console.warn("[dev] Auto-login failed:", e);
    }
  })();
}

export default api;
