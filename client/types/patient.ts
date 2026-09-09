import type { PatientRecord } from "@/api/patient.api";

export type PatientDetail = PatientRecord & {
  current_address?: string | null;
  permanent_address?: string | null;
  emergency_name?: string | null;
  emergency_relation?: string | null;
  emergency_mobile?: string | null;
  branch?: { branch_id?: string; branch_name?: string | null } | null;
  user_table?: {
    username?: string | null;
    role_type?: string | null;
    user_status?: number | null;
    created_at?: string | null;
  } | null;
};

export type ErrorType = "not-found" | "forbidden" | "server" | "network" | null;

export interface ErrorState {
  type: ErrorType;
  message: string;
  retryable: boolean;
}

export interface ErrorDisplayProps {
  error: ErrorState;
  onRetry: () => void;
  onBack: () => void;
}

export interface PatientSummaryCardProps {
  patient: PatientDetail;
  patientName: string;
  patientDOB: string;
  patientAge: string;
  isActive: boolean;
  lastVisitDate?: string;
}

export interface RelatedActionsDropdownProps {
  patientId: string;
  patientName: string;
  onEdit: () => void;
}