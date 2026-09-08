import { useState, useEffect } from "react";
import { fetchPatientMedications, PatientMedicationData } from "../utils/medicationFetcher";

export function usePatientMedications(patientId: string) {
  const [data, setData] = useState<PatientMedicationData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchPatientMedications(patientId)
      .then((result) => {
        if (!cancelled) {
          setData(result);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || "Failed to fetch medications");
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  return { data, loading, error };
}
