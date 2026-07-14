import axios from "axios";
import { remove } from "../utils/token";

const api = axios.create({

    baseURL: "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {

    const token = localStorage.getItem("token");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

// A 401 here means the stored token is missing/expired/invalid (see
// hms-backend auth.middleware.ts) — clear it and send the user back to
// log in so they get a fresh, valid token instead of getting stuck on
// a cryptic "Unauthorized" error.
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

export default api;