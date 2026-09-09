import { useEffect, useState, useCallback, useRef } from "react";
import { patientApi } from "@/api/patient.api";
import type { PatientDetail, ErrorState } from "@/types/patient";
import { isPatientDetail, getErrorMessage } from "@/utils/patient";

interface UsePatientResult {
  patient: PatientDetail | null;
  loading: boolean;
  error: ErrorState | null;
  refetch: () => void;
}

export function usePatient(id: string | undefined): UsePatientResult {
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorState | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const fetchPatient = useCallback(async () => {
    if (!id) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    mountedRef.current = true;

    setLoading(true);
    setError(null);

    try {
      const response = await patientApi.getById(id, {
        signal: abortController.signal,
      });

      if (!mountedRef.current) return;

      if (isPatientDetail(response.data?.data)) {
        setPatient(response.data.data);
      } else {
        throw new Error("Invalid patient data format");
      }
    } catch (err) {
      if (!mountedRef.current) return;
      if ((err as { name?: string }).name === "AbortError") return;
      setError(getErrorMessage(err));
      setPatient(null);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    mountedRef.current = true;
    fetchPatient();

    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchPatient]);

  const refetch = useCallback(() => {
    fetchPatient();
  }, [fetchPatient]);

  return { patient, loading, error, refetch };
}