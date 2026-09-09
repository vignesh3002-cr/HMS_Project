import { format } from "date-fns";
import type { PatientDetail } from "@/types/patient";
import type { ErrorState } from "@/types/patient";

export function getPatientFullName(p: PatientDetail | null): string {
  if (!p) return "Patient";
  return [p.patient_first_name, p.patient_middle_name, p.patient_last_name]
    .filter(Boolean)
    .join(" ") || "Patient";
}

export function val(v?: string | null | number): string {
  return v !== undefined && v !== null && String(v).trim() !== "" ? String(v) : "—";
}

export function calculateAge(dob?: string | null): string {
  if (!dob) return "—";
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return "—";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? `${age}` : "—";
}

export function safeFormatDate(
  date: string | null | undefined,
  formatStr: string = "dd MMM yyyy"
): string {
  if (!date) return "—";
  try {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) return "—";
    return format(parsedDate, formatStr);
  } catch {
    return "—";
  }
}

export function isPatientDetail(data: unknown): data is PatientDetail {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.patient_id === "string" &&
    typeof obj.patient_first_name === "string" &&
    (obj.patient_middle_name === undefined ||
      obj.patient_middle_name === null ||
      typeof obj.patient_middle_name === "string") &&
    typeof obj.patient_last_name === "string"
  );
}

export function getErrorMessage(error: unknown): ErrorState {
  if (!error) {
    return { type: "network", message: "An unknown error occurred", retryable: true };
  }

  const axiosError = error as {
    response?: { status?: number; data?: { message?: string } };
    message?: string;
    name?: string;
    code?: string;
  };

  if (axiosError.name === "AbortError" || axiosError.code === "ERR_CANCELED") {
    return { type: null, message: "", retryable: false };
  }

  const status = axiosError.response?.status;
  const message = axiosError.response?.data?.message || axiosError.message;

  switch (status) {
    case 404:
      return {
        type: "not-found",
        message: "Patient not found",
        retryable: false,
      };
    case 403:
      return {
        type: "forbidden",
        message: "Access denied. You don't have permission to view this patient.",
        retryable: false,
      };
    case 500:
    case 502:
    case 503:
    case 504:
      return {
        type: "server",
        message: "Server error. Please try again later.",
        retryable: true,
      };
    default:
      if (!navigator.onLine || axiosError.code === "ECONNABORTED" || axiosError.message?.includes("Network")) {
        return {
          type: "network",
          message: "Connection issue. Please check your network and try again.",
          retryable: true,
        };
      }
      return {
        type: "server",
        message: message || "Failed to load patient details",
        retryable: true,
      };
  }
}

const DIGITS_ONLY = /[^\d]/g;

function digits(value: string | null | undefined): string {
  return (value ?? "").replace(DIGITS_ONLY, "");
}

export function formatMobile(value: string | null | undefined): string {
  const d = digits(value);
  if (!d) return value || "";
  const local = d.length > 10 ? d.slice(-10) : d;
  if (local.length < 10) return local;
  const cc = d.length > 10 ? d.slice(0, d.length - 10) : "91";
  return `+${cc}-${local.slice(0, 5)}-${local.slice(5)}`;
}