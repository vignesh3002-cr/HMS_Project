import { useEffect, useState } from "react";
import { encounterApi, type EncounterRecord } from "../../../api/encounter.api";
import { computeBsa } from "../../../utils/vitals";
import type {
  ChemoVitalsEntry,
  DischargeMedicineRecord,
  LatestPatientVitalsValues,
  UseLatestPatientVitalsResult,
} from "./types";
import { loadLatestChemoPlan, loadCycleDetail, loadDischargeMedicines } from "./api";

/* Data hooks shared by the patient details page and its tabs. */

export function useDischargeMedicines(protocolId: string) {
  const [rows, setRows] = useState<DischargeMedicineRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!protocolId) {
      setRows([]);
      setLoading(false);
      setError("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    loadDischargeMedicines(protocolId)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err: any) => {
        if (!cancelled) {
          setRows([]);
          setError(
            err?.response?.data?.message ||
              err?.message ||
              "Failed to load discharge medicines."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [protocolId]);

  return { rows, loading, error };
}

export const formatLastChecked = (values: (string | null | undefined)[]) => {
  const timestamps = values
    .filter((value): value is string => !!value)
    .map((value) => new Date(value).getTime())
    .filter((time) => !Number.isNaN(time));
  if (timestamps.length === 0) return "";
  const d = new Date(Math.max(...timestamps));
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const meridiem = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `Last checked: ${String(hours).padStart(2, "0")}:${minutes} ${meridiem}`;
};

/* ============================================================
   LATEST PATIENT VITALS HOOK
   The freshest recorded vitals across BOTH sources for a
   patient, fetched once and shared by every portal that shows
   vitals (Order Summary header strip, Discharge portal):
   - latest OPD encounter via GET /encounters/latest
     (newest-first, branch-independent on the backend)
   - newest chemotherapy-cycle vitals row (recorded BSA source;
     missing BSA is derived from height & weight via utils/vitals)
   Merged per-field: encounter value first, chemo fallback.
   ============================================================ */
export function useLatestPatientVitals(
  patientId?: string,
  /** Changes when the user picks a different branch - triggers refetch
      so scoped calls use the fresh x-branch-id header. */
  scopeKey?: string
): UseLatestPatientVitalsResult {
  const [latestEncounter, setLatestEncounter] =
    useState<EncounterRecord | null>(null);
  const [encounterRows, setEncounterRows] =
    useState<EncounterRecord[]>([]);
  const [latestChemoVitals, setLatestChemoVitals] =
    useState<ChemoVitalsEntry | null>(null);
  const [adverseEventCount, setAdverseEventCount] = useState(0);
  const [scopeHint, setScopeHint] = useState(false);
  const [loading, setLoading] = useState(!!patientId);

  useEffect(() => {
    if (!patientId) {
      setLatestEncounter(null);
      setEncounterRows([]);
      setLatestChemoVitals(null);
      setAdverseEventCount(0);
      setScopeHint(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    /* Flag scope-style rejections so the UI can nudge the user to
       pick a branch ("Please select a branch first." / "No branch
       has been assigned to your account."). */
    const noteScopeError = (message?: string) => {
      if (/select a branch|branch has been assigned/i.test(message ?? "")) {
        if (!cancelled) setScopeHint(true);
      }
    };

    /* Latest OPD/encounter vitals via GET /encounters/latest
       (newest-first, branch-independent - access resolves from the
       caller's ACTIVE branch mappings server-side). Falls through to
       the branch-scoped encounter list when it fails OR comes back
       empty, so single-branch auto-scoping / a valid selection still
       shows vitals. */
    const loadEncounterVitals = async () => {
      let rows: EncounterRecord[] = [];
      let latest: EncounterRecord | null = null;
      try {
        const response = await encounterApi.getLatest(patientId, 20);
        const encs = response.data?.data?.encounters ?? [];
        rows = [...encs].sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        );
        latest = rows[0] ?? null;
      } catch (error: any) {
        const message = error?.response?.data?.message;
        console.error(
          "Failed to load latest encounter vitals:",
          message ?? error
        );
        noteScopeError(message);
      }
      if (!latest || rows.length === 0) {
        try {
          const response = await encounterApi.getAll({
            patientId,
            limit: 20,
          });
          if (cancelled) return;
          rows = [...(response.data?.data?.encounters ?? [])].sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          );
          latest = rows[0] ?? null;
        } catch (error: any) {
          const message = error?.response?.data?.message;
          console.error(
            "Encounter vitals fallback failed:",
            message ?? error
          );
          noteScopeError(message);
        }
      }
      if (!cancelled) {
        setLatestEncounter(latest);
        setEncounterRows(rows);
      }
    };
    loadEncounterVitals();

    /* Newest chemotherapy-cycle vitals + adverse-event count
       (single chain fetch, same as the Discharge portal used). */
    loadLatestChemoPlan(patientId)
      .then(async (loaded) => {
        const sortedCycles = [...(loaded?.chemotherapy_cycle ?? [])].sort(
          (a, b) =>
            (b.actual_date ?? b.planned_date ?? "").localeCompare(
              a.actual_date ?? a.planned_date ?? ""
            ) || b.cycle_number - a.cycle_number
        );
        const newestWithId = sortedCycles.find(
          (cycle) => cycle.chemotherapy_cycle_id
        );
        if (!newestWithId?.chemotherapy_cycle_id) return;
        try {
          const detail = await loadCycleDetail(
            newestWithId.chemotherapy_cycle_id as string
          );
          if (cancelled || !detail) return;
          const vitalsRows = (detail.chemotherapy_vitals ?? []).slice();
          vitalsRows.sort((a, b) =>
            (b.recorded_at ?? "").localeCompare(a.recorded_at ?? "")
          );
          setLatestChemoVitals(vitalsRows[0] ?? null);
          setAdverseEventCount(
            (detail.chemotherapy_adverse_event ?? []).length
          );
        } catch (error: any) {
          const message = error?.response?.data?.message;
          console.error(
            "Failed to load chemo cycle vitals:",
            message ?? error
          );
          noteScopeError(message);
          /* Vitals stay empty - panels show placeholders. */
        }
      })
      .catch((error: any) => {
        const message = error?.response?.data?.message;
        console.error(
          "Failed to load chemotherapy plan for vitals:",
          message ?? error
        );
        noteScopeError(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [patientId, scopeKey]);

  const num = (value?: string | number | null) => {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  };
  const encNum = (value: number | string | null | undefined) =>
    num(value ?? null);

  const firstNonNull = <T,>(rows: T[], getter: (r: T) => any) => {
    for (const r of rows) {
      const v = getter(r);
      if (v !== null && v !== undefined && v !== "") return v;
    }
    return null;
  };
  const firstEncounterValue = (getter: (e: EncounterRecord) => any) => {
    return firstNonNull(encounterRows, getter);
  };

  const heightValue =
    encNum(firstEncounterValue(e => e.height)) ?? num(latestChemoVitals?.height);
  const weightValue =
    encNum(firstEncounterValue(e => e.weight)) ?? num(latestChemoVitals?.weight);

  const vitals: LatestPatientVitalsValues = {
    height: heightValue,
    weight: weightValue,
    bpSystolic:
      encNum(firstEncounterValue(e => e.systolic_bp)) ??
      num(latestChemoVitals?.blood_pressure_systolic),
    bpDiastolic:
      encNum(firstEncounterValue(e => e.diastolic_bp)) ??
      num(latestChemoVitals?.blood_pressure_diastolic),
    pulse: encNum(firstEncounterValue(e => e.pulse)) ?? num(latestChemoVitals?.pulse_rate),
    temp:
      encNum(firstEncounterValue(e => e.temperature)) ??
      num(latestChemoVitals?.body_temperature),
    spo2: encNum(firstEncounterValue(e => e.spo2)) ?? num(latestChemoVitals?.spo2),
    bmi: encNum(firstEncounterValue(e => e.BMI)) ?? num(latestChemoVitals?.bmi),
    /* Recorded chemo value wins; otherwise derive from height & weight
        (Mosteller - see utils/vitals.ts). */
    bsa:
      num(latestChemoVitals?.body_surface_area) ??
      computeBsa(heightValue, weightValue),
    painScore: encNum(firstEncounterValue(e => e.pain_score)),
  };

  const vitalEntries: [string, string][] = [
    ["HEIGHT", vitals.height != null ? `${vitals.height} cm` : ""],
    [
      "BP",
      vitals.bpSystolic != null && vitals.bpDiastolic != null
        ? `${vitals.bpSystolic}/${vitals.bpDiastolic}`
        : "",
    ],
    ["WEIGHT", vitals.weight != null ? `${vitals.weight} kg` : ""],
    ["PULSE", vitals.pulse != null ? `${vitals.pulse} bpm` : ""],
    ["BSA", vitals.bsa != null ? `${vitals.bsa} m²` : ""],
    ["TEMP", vitals.temp != null ? `${vitals.temp} °C` : ""],
    ["BMI", vitals.bmi != null ? `${vitals.bmi}` : ""],
    ["SPO2", vitals.spo2 != null ? `${vitals.spo2}%` : ""],
    ["PAIN", vitals.painScore != null ? `${vitals.painScore}/10` : ""],
  ];

  const lastCheckedLabel = formatLastChecked([
    latestEncounter?.checkin_time,
    latestEncounter?.created_at,
    latestChemoVitals?.recorded_at,
  ]);

  return {
    latestEncounter,
    latestChemoVitals,
    loading,
    adverseEventCount,
    vitals,
    vitalEntries,
    lastCheckedLabel,
    scopeHint,
  };
}
