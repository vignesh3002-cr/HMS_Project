import { useState, useEffect, useCallback, useRef } from "react";
import { encounterApi, type EncounterRecord } from "@/api/encounter.api";
import { patientApi } from "@/api/patient.api";
import type { CriticalInfo } from "@/components/hms/CriticalPatientIndicator";

interface PatientAgeData {
  patientId: string;
  age?: number | null;
  dob?: string | null;
}

function computeAge(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function checkAbnormalVitals(enc: EncounterRecord): string[] {
  const reasons: string[] = [];
  if (enc.pain_score != null) {
    const ps = Number(enc.pain_score);
    if (ps >= 7) reasons.push(`Pain Score: ${ps}/10`);
  }
  if (enc.systolic_bp != null && enc.diastolic_bp != null) {
    const sys = Number(enc.systolic_bp);
    const dia = Number(enc.diastolic_bp);
    if (sys > 180 || dia > 120) reasons.push(`High BP: ${sys}/${dia}`);
    else if (sys < 90 || dia < 60) reasons.push(`Low BP: ${sys}/${dia}`);
  }
  if (enc.spo2 != null) {
    const spo2 = Number(enc.spo2);
    if (spo2 < 90) reasons.push(`SpO2: ${spo2}%`);
  }
  if (enc.temperature != null) {
    const temp = Number(enc.temperature);
    if (temp > 39.5) reasons.push(`Temp: ${temp}\u00B0F`);
  }
  if (enc.pulse != null) {
    const pulse = Number(enc.pulse);
    if (pulse > 120 || pulse < 40) reasons.push(`Pulse: ${pulse} bpm`);
  }
  return reasons;
}

function checkClinicalStatus(enc: EncounterRecord): string[] {
  const reasons: string[] = [];
  const notes = (enc.clinical_notes || "").toLowerCase();
  if (
    notes.includes("not doing well") ||
    notes.includes("critical") ||
    notes.includes("deteriorating") ||
    notes.includes("urgent")
  ) {
    reasons.push("Clinical Status: Not Doing Well");
  }
  return reasons;
}

export function useCriticalPatients(
  patientAgeData: PatientAgeData[],
  enabled = true
) {
  const [encounterCache, setEncounterCache] = useState<
    Record<string, EncounterRecord>
  >({});
  const [dobCache, setDobCache] = useState<Record<string, string>>({});
  const fetchedRef = useRef<Set<string>>(new Set());
  const dobFetchedRef = useRef<Set<string>>(new Set());

  const patientIds = patientAgeData.map((p) => p.patientId);
  const key = [...patientIds].sort().join(",");

  const fetchEncounters = useCallback(async () => {
    if (!enabled || patientAgeData.length === 0) return;

    const toFetch = patientAgeData.filter(
      (p) => !fetchedRef.current.has(p.patientId)
    );
    if (toFetch.length === 0) return;

    const results = await Promise.allSettled(
      toFetch.map(async (p) => {
        try {
          const res = await encounterApi.getLatest(p.patientId, 1);
          const enc = res.data?.data?.encounters?.[0];
          if (enc) return { patientId: p.patientId, encounter: enc };
        } catch {
          // silent
        }
        return null;
      })
    );

    const newEntries: Record<string, EncounterRecord> = {};
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        newEntries[r.value.patientId] = r.value.encounter;
      }
    }

    if (Object.keys(newEntries).length > 0) {
      setEncounterCache((prev) => ({ ...prev, ...newEntries }));
    }

    for (const p of toFetch) {
      fetchedRef.current.add(p.patientId);
    }
  }, [key, enabled]);

  useEffect(() => {
    fetchEncounters();
  }, [fetchEncounters]);

  const fetchMissingDobs = useCallback(async () => {
    if (!enabled || patientAgeData.length === 0) return;

    const needDob = patientAgeData.filter(
      (p) =>
        !dobFetchedRef.current.has(p.patientId) &&
        p.age == null &&
        !p.dob
    );
    if (needDob.length === 0) return;

    const results = await Promise.allSettled(
      needDob.map(async (p) => {
        try {
          const res = await patientApi.getById(p.patientId);
          const patient = res.data?.data;
          if (patient?.patient_dob) {
            return { patientId: p.patientId, dob: patient.patient_dob };
          }
        } catch {
          // silent
        }
        return null;
      })
    );

    const newDobs: Record<string, string> = {};
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        newDobs[r.value.patientId] = r.value.dob;
      }
    }

    if (Object.keys(newDobs).length > 0) {
      setDobCache((prev) => ({ ...prev, ...newDobs }));
    }

    for (const p of needDob) {
      dobFetchedRef.current.add(p.patientId);
    }
  }, [key, enabled]);

  useEffect(() => {
    fetchMissingDobs();
  }, [fetchMissingDobs]);

  useEffect(() => {
    fetchedRef.current.clear();
    dobFetchedRef.current.clear();
  }, [key]);

  const getCriticalInfo = useCallback(
    (patientId: string): CriticalInfo => {
      const reasons: string[] = [];

      const ageData = patientAgeData.find((p) => p.patientId === patientId);
      let resolvedDob = ageData?.dob ?? dobCache[patientId] ?? null;
      const age =
        ageData?.age ??
        (resolvedDob ? computeAge(resolvedDob) : null);

      if (age != null) {
        if (age < 18) reasons.push(`Age < 18 (Pediatric)`);
        if (age > 75) reasons.push(`Age > 75 (Elderly)`);
      }

      const enc = encounterCache[patientId];
      if (enc) {
        reasons.push(...checkAbnormalVitals(enc));
        reasons.push(...checkClinicalStatus(enc));
      }

      return { isCritical: reasons.length > 0, reasons };
    },
    [patientAgeData, encounterCache, dobCache]
  );

  return { getCriticalInfo, refetch: fetchEncounters };
}
