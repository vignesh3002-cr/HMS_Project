import API, { getActiveBranchId } from "../../../api/axios";
import { appointmentApi } from "../../../api/appointment.api";
import { getUser } from "../../../utils/token";
import { encounterApi, type EncounterRecord } from "../../../api/encounter.api";
import type { FormData, RegimenProtocolDetail } from "./types";

export const formatPickedDate = (date: Date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${date.getFullYear()}`;
};

export const parsePickedDate = (value: string) => {
  const match = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return undefined;
  return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
};

export const parseDateValue = (value?: string | null): Date | null => {
  if (!value) return null;
  const trimmed = value.trim();
  const dmy = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmy) {
    return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  }
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/* ============================================================
   PROTOCOL-DRIVEN NEXT VISIT DATE
   The "Next Visit Date" shown in the Follow Up and Summary steps
   is derived from the selected regimen protocol's cycle interval
   and the treatment start date stated in the Treatment Plan /
   Chemo Order: next visit = start date + protocol.cycle_interval_days.
   ============================================================ */

export const computeProtocolNextVisitDate = (
  startDateValue?: string | null,
  intervalDays?: number | null
): string => {
  const begin = parseDateValue(startDateValue);
  if (!begin) return "";
  const interval =
    intervalDays && intervalDays > 0 ? Math.round(intervalDays) : 21;
  const next = new Date(begin);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + interval);
  const day = String(next.getDate()).padStart(2, "0");
  const month = String(next.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${next.getFullYear()}`;
};

/* Resolve the date the oncologist stated for the treatment start:
   prefer the Chemo Order's stated start date, fall back to the
   Treatment Plan's planned start date. */
export const getStatedTreatmentStartDate = (patientId: string): string => {
  try {
    const draft = JSON.parse(
      localStorage.getItem(`hms_chemo_order_${patientId}`) ?? ""
    ) as { startDate?: string } | null;
    if (draft?.startDate) return draft.startDate;
  } catch {
    // Malformed draft - fall through to the treatment plan.
  }
  return localStorage.getItem(`hms_planned_start_date_${patientId}`) ?? "";
};

/* Pull the cycle number out of a "Cycle N / Day M" label. */
export const getStoredCycleNumber = (value: string): number | null => {
  const match = value.trim().match(/^Cycle\s+(\d+)/i);
  return match ? Number(match[1]) : null;
};

/* Resolve the effective treatment start date used to derive the next
   visit date. If neither the Chemo Order nor the Treatment Plan has an
   explicit date (the user accepted the auto-filled default), reconstruct
   the base date from the Chemo Order's pushed next-cycle value - the
   Chemotherapy Order always persists that value, keyed off the same
   base start date + (cycleNumber - 1) * interval. */
export const resolveEffectiveStartDate = (
  patientId: string,
  intervalDays?: number | null
): string => {
  const typedStartDate = getStatedTreatmentStartDate(patientId);
  if (typedStartDate) return typedStartDate;

  const interval =
    intervalDays && intervalDays > 0 ? Math.round(intervalDays) : 21;
  const pushedDate = parseDateValue(
    localStorage.getItem(`hms_next_cycle_date_${patientId}`)
  );
  if (!pushedDate) return "";

  const cycleNumber =
    getStoredCycleNumber(
      localStorage.getItem(`hms_next_cycle_${patientId}`) ?? ""
    ) ?? 1;
  const base = new Date(pushedDate);
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() - (cycleNumber - 1) * interval);
  const day = String(base.getDate()).padStart(2, "0");
  const month = String(base.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${base.getFullYear()}`;
};

/* Past History shares the encounter's clinical_notes column with
   Consultation Notes. This marker separates the two sections so they
   can be split back apart when the encounter is loaded again. */
export const PAST_HISTORY_MARKER = "[Past History]";

/* ============================================================
   ACTIVE ENCOUNTER LOOKUP
   The encounter exists in the DB but scoped queries can still come
   back empty or 403 when the active branch selector points at a
   different branch than the one the encounter was created under,
   or when a multi-branch doctor has no branch selected. Strategy:
     0. By appointment_id (exact key, branch-independent)
     1. Active branch + OPEN        (original behaviour)
     2. Cross-branch + OPEN         (x-branch-id header suppressed)
     3. Cross-branch, any state, OPEN preferred
     4. Self-heal: recreate from the in-progress appointment
   Scope errors (403) are collected so the UI can show the real
   reason instead of a generic "not found".
   ============================================================ */

export const collectScopeError = (error: any, sink: string[]) => {
  if (error?.response?.status === 403) {
    const message = error?.response?.data?.message;
    if (message) sink.push(message);
    return;
  }
  console.error("Failed to load encounter:", error);
};

export const BRANCH_HINT =
  " (or pick your branch from the selector in the header)";

export const findActiveEncounter = async (
  patientId: string,
  appointmentId?: string,
  branchId?: string,
): Promise<{ encounter: EncounterRecord | null; scopeError?: string }> => {
  const scopeErrors: string[] = [];
  /* Real reason encounter creation failed (400-class backend messages).
     Preferred over scopeErrors when present: a failed POST /encounters is
     the actionable root cause, while scoped-list 403s are just fallout. */
  const createErrors: string[] = [];
  const crossBranchConfig = { skipBranchScope: true };

  /* 0. Precise hit - dedicated endpoint resolves by appointment_id with
        mapping-based branch isolation (no active selection required). */
  if (appointmentId) {
    let missing = false;
    try {
      const response = await encounterApi.getByAppointment(appointmentId);
      const exact = response.data.data;
      if (exact && exact.patient_id === patientId) {
        return { encounter: exact };
      }
    } catch (error: any) {
      if (error?.response?.status === 404) {
        // No encounter yet for this appointment.
        missing = true;
      } else {
        collectScopeError(error, scopeErrors);
      }
    }

    /* Encounter not created yet - create it directly from this
       appointment (POST /encounters has no branchScope) and re-read it
       through the mapping-checked endpoint. Deliberately no scoped list
       calls here: they would 403 a multi-branch doctor with no selection. */
    if (missing) {
      try {
        await encounterApi.create({ appointment_id: appointmentId });
      } catch (error: any) {
        // "Encounter already exists" or not creatable - verify decides.
        const message = error?.response?.data?.message;
        if (message && !/already exists/i.test(message)) {
          createErrors.push(message);
        }
      }
      try {
        const response = await encounterApi.getByAppointment(appointmentId);
        const healed = response.data.data;
        if (healed && healed.patient_id === patientId) {
          return { encounter: healed };
        }
      } catch (error: any) {
        collectScopeError(error, scopeErrors);
      }
    }
  }

  /* An ALLOWED branchId query param makes branchScope validate membership
     and pass through instead of demanding an active selection, so the nav
     state's branch (dashboard context) unblocks multi-branch doctors. */
  const activeBranch =
    branchId ?? getActiveBranchId() ?? getUser()?.branch_id ?? undefined;

  // 1. Known/active branch + OPEN (original behaviour)
  try {
    const response = await encounterApi.getAll({
      ...(activeBranch ? { branchId: activeBranch } : {}),
      patientId,
      status: "OPEN",
      page: 1,
      limit: 5,
    });
    const encounters = response.data.data?.encounters ?? [];
    const current =
      encounters.find((item) => item.patient_id === patientId) ??
      encounters[0] ??
      null;
    if (current) return { encounter: current };
  } catch (error: any) {
    collectScopeError(error, scopeErrors);
  }

  // 2. Any allowed branch + OPEN - recovers a branch mismatch.
  try {
    const response = await encounterApi.getAll(
      { patientId, status: "OPEN", page: 1, limit: 10 },
      crossBranchConfig,
    );
    const openEncounters = response.data.data?.encounters ?? [];
    const openMatch = openEncounters.find(
      (item) => item.patient_id === patientId,
    );
    if (openMatch) return { encounter: openMatch };
  } catch (error: any) {
    collectScopeError(error, scopeErrors);
  }

  // 3. Any allowed branch, any state, OPEN preferred.
  try {
    const response = await encounterApi.getAll(
      { patientId, page: 1, limit: 10 },
      crossBranchConfig,
    );
    const encounters = response.data.data?.encounters ?? [];
    const anyOpen = encounters.find(
      (item) => item.patient_id === patientId && item.status === "OPEN",
    );
    if (anyOpen) return { encounter: anyOpen };
  } catch (error: any) {
    collectScopeError(error, scopeErrors);
  }

  /* ============================================================
     SELF-HEAL
     Check-in flips the appointment status before the encounter
     is created; when creation failed (e.g. the linked schedule
     was deactivated) the appointment is stuck with no encounter.
     Recreate it here from the patient's most recent in-progress
     appointment so clinical details load instead of erroring.
     Verification uses the mapping-checked by-appointment endpoint,
     never a scoped list query.
     ============================================================ */

  const inProgressStatuses = ["IN_CONSULTATION", "CHECKED_IN"];
  for (const status of inProgressStatuses) {
    let candidates: { appointment_id: string }[] = [];
    try {
      const apptResponse = await appointmentApi.getAll(
        {
          ...(activeBranch ? { branchId: activeBranch } : {}),
          patientId,
          status,
          sortBy: "created_at",
          sortOrder: "desc",
          page: 1,
          limit: 5,
        },
        crossBranchConfig,
      );
      candidates = apptResponse.data.data?.appointments ?? [];
    } catch {
      continue;
    }
    for (const appt of candidates) {
      try {
        await encounterApi.create({ appointment_id: appt.appointment_id });
      } catch (error: any) {
        // "Encounter already exists" or not creatable - verify decides.
        const message = error?.response?.data?.message;
        if (message && !/already exists/i.test(message)) {
          createErrors.push(message);
        }
      }
      try {
        const response = await encounterApi.getByAppointment(
          appt.appointment_id,
        );
        const healed = response.data.data;
        if (healed && healed.patient_id === patientId) {
          return { encounter: healed };
        }
      } catch (error: any) {
        collectScopeError(error, scopeErrors);
      }
    }
  }

  /* Prefer the real creation-failure reason over scope fallout: if POST
     /encounters told us why it refused, that beats "Please select a branch
     first." produced by the fallback list queries. */
  const primaryMessage = createErrors[0] ?? scopeErrors[0];

  return {
    encounter: null,
    scopeError: primaryMessage
      ? `${primaryMessage}${
          /select a branch/i.test(primaryMessage) ? BRANCH_HINT : ""
        }`
      : undefined,
  };
};

/* ============================================================
   ONCOLOGY DIAGNOSIS + CHEMOTHERAPY PLAN HELPERS
   Shared by the Diagnosis (staging-detail persist) and
   ChemotherapyOrder (plan persist) steps. These resolve foreign
   keys the backend requires that the UI form fields alone don't
   capture: the diagnosis_id comes from the ICD catalog (with a
   malignancy fallback), the staging_detail_id comes from the
   [diagnosis|staging] steps, and employee/department/branch come
   from the active encounter + the logged-in session.
   ============================================================ */

export const toIsoDate = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
};

/* Load every diagnosis (ICD catalog) the backend exposes so a
   diagnosis_id can be matched from an ICD code. The DB has few
   oncology-friendly codes, so a malignancy regex fallback targets
   DIS000130 (Z85.9 "Personal History of Malignant Neoplasm"). */
export const loadAllIcdDiagnoses = async (): Promise<
  { diagnosis_id: string; icd_code: string | null }[]
> => {
  const categoriesResponse = await API.get<{
    success: boolean;
    data: { categories: { diagnosis_catogory_id: string }[] };
  }>("/diagnosis/categories");
  const categories = (
    categoriesResponse.data.data?.categories ?? []
  ).filter((category) => Boolean(category.diagnosis_catogory_id));
  const responses = await Promise.all(
    categories.map((category) =>
      API.get<{
        success: boolean;
        data: {
          diagnoses: { diagnosis_id: string; icd_code: string | null }[];
        };
      }>(`/diagnosis/categories/${category.diagnosis_catogory_id}/diagnoses`)
    )
  );
  return responses.flatMap((response) => response.data.data?.diagnoses ?? []);
};

/* Resolve the patient's diagnosis_id from the ICD catalog. Priority:
   1. The active encounter's diagnosis_id when already recorded.
   2. Exact ICD code match (from the Diagnosis form's icdCode).
   3. Malignancy fallback (regex / ICD [CZ]\d prefix). */
export const resolveDiagnosisId = async (
  patientId: string,
  icdCodeOverride?: string
): Promise<string> => {
  let icdCode = icdCodeOverride?.trim() ?? "";
  if (!icdCode) {
    try {
      const draft = JSON.parse(
        localStorage.getItem(`hms_diagnosis_form_${patientId}`) ?? ""
      ) as Partial<FormData> | null;
      icdCode = draft?.icdCode?.trim() ?? "";
    } catch {
      icdCode = "";
    }
  }

  try {
    const diagnoses = await loadAllIcdDiagnoses();
    if (icdCode) {
      const exact = diagnoses.find(
        (d) =>
          d.icd_code?.trim().toUpperCase() === icdCode.toUpperCase()
      );
      if (exact?.diagnosis_id) return exact.diagnosis_id;
    }
    const fallback = diagnoses.find(
      (d) =>
        /malign|neoplasm|carcinom|tumou?r|leuk|lymphoma|oncol/i.test(
          d.icd_code ?? ""
        ) || /^[CZ]\d/i.test(d.icd_code ?? "")
    );
    if (fallback?.diagnosis_id) return fallback.diagnosis_id;
  } catch (error) {
    console.error("Failed to resolve diagnosis_id from ICD catalog:", error);
  }
  return "";
};

/* Resolve the patient's most recent staging_detail_id (persisted by
   the Diagnosis step, else the latest on record). */
export const resolveStagingDetailId = async (patientId: string): Promise<string> => {
  try {
    const stored = JSON.parse(
      localStorage.getItem(`hms_staging_detail_id_${patientId}`) ?? ""
    ) as { staging_detail_id?: string } | null;
    if (stored?.staging_detail_id) return stored.staging_detail_id;
  } catch {
    // Malformed draft - fall through to the server lookup.
  }
  try {
    const response = await API.get<{
      success: boolean;
      data: { staging_detail_id: string }[];
    }>("/oncology/staging-details", {
      params: { patient_id: patientId, page: 1, limit: 1 },
    });
    const found = response.data.data?.[0]?.staging_detail_id ?? "";
    if (found) {
      localStorage.setItem(
        `hms_staging_detail_id_${patientId}`,
        JSON.stringify({ staging_detail_id: found })
      );
    }
    return found;
  } catch (error) {
    console.error("Failed to resolve staging_detail_id:", error);
    return "";
  }
};

/* Fetch the regimen protocol the Treatment Plan selected so an existing
   plan can be brought in line with it - copying the protocol's cadence
   (standard_cycles / cycle_interval_days) and display names exactly like
   the backend's createPlan one-time copy does on first creation. */
export const loadProtocolSyncData = async (
  protocolId: string
): Promise<{
  source_protocol_id: string;
  regimen_name: string;
  regimen_code: string;
  protocol_name: string;
  planned_cycles: number;
  cycle_interval_days: number;
} | null> => {
  try {
    const response = await API.get<{
      success: boolean;
      data: RegimenProtocolDetail;
    }>(`/chemotherapy/regimen-protocols/${encodeURIComponent(protocolId)}`);
    const protocol = response.data.data;
    if (!protocol) return null;
    return {
      source_protocol_id: protocol.protocol_id,
      regimen_name: protocol.regimen_name,
      regimen_code: protocol.regimen_code ?? "",
      protocol_name: protocol.regimen_name,
      planned_cycles: protocol.standard_cycles ?? 0,
      cycle_interval_days: protocol.cycle_interval_days ?? 0,
    };
  } catch (error) {
    console.error("Failed to load regimen protocol for plan sync:", error);
    return null;
  }
};

/* Resolve the cancer context of the patient's latest staging detail so an
   existing plan can be re-linked when the diagnosis changes. */
export const loadStagingSyncData = async (
  stagingDetailId: string
): Promise<{
  staging_detail_id: string;
  cancer_type: string;
  cancer_subtype: string;
  cancer_stage: string;
  cancer_type_id: string;
  subtype_id: string;
} | null> => {
  try {
    const response = await API.get<{
      success: boolean;
      data: {
        cancer_type_id?: string | null;
        cancer_subtype_id?: string | null;
        clinical_stage?: string | null;
        cancer_types?: { cancer_type?: string | null } | null;
        cancer_subtypes?: { subtype_name?: string | null } | null;
      };
    }>(`/oncology/staging-details/${encodeURIComponent(stagingDetailId)}`);
    const staging = response.data.data;
    if (!staging) return null;
    return {
      staging_detail_id: stagingDetailId,
      cancer_type: staging.cancer_types?.cancer_type ?? "",
      cancer_subtype: staging.cancer_subtypes?.subtype_name ?? "",
      cancer_stage: staging.clinical_stage ?? "",
      cancer_type_id: staging.cancer_type_id ?? "",
      subtype_id: staging.cancer_subtype_id ?? "",
    };
  } catch (error) {
    console.error("Failed to load staging detail for plan sync:", error);
    return null;
  }
};

/* Ensure a chemotherapy plan exists for the patient, returning its id.
   Used by the ChemotherapyOrder Save button and as a safety net before
   the Summary step creates a prescription. Re-uses an existing plan when
   one is already on record; otherwise POSTs a new one. */
export const createChemotherapyPlanForPatient = async (
  patientId: string,
  startDateValue?: string | null,
  planItems?: Array<{
    medicine_id: string;
    drug_role: string;
    drug_sequence: number;
    dosage?: number;
    dosage_unit?: string;
    administration_route?: string;
    remarks?: string;
  }>,
  plannedCycles?: number,
  discussion?: string | null
): Promise<{ planId: string | null; error?: string }> => {
  const { encounter, scopeError } = await findActiveEncounter(patientId);
  if (!encounter) {
    return {
      planId: null,
      error:
        scopeError ||
        "No active encounter found. Open this page from a patient consultation to continue.",
    };
  }

  const employeeId =
    getUser()?.employee_id ?? encounter.employee_id ?? "";
  const departmentId = encounter.department_id ?? "";
  const branchId =
    getActiveBranchId() ??
    getUser()?.branch_id ??
    encounter.branch_id ??
    "";
  const protocolId =
    localStorage.getItem(`hms_selected_protocol_id_${patientId}`) ?? "";

  const diagnosisId = await resolveDiagnosisId(patientId);
  const stagingDetailId = await resolveStagingDetailId(patientId);
  const treatmentStartDate = toIsoDate(
    startDateValue ??
      localStorage.getItem(`hms_planned_start_date_${patientId}`)
  );

  /* Prefer an existing plan for this patient; creation only happens once
     per diagnosis so repeated Saves don't stack duplicates.
     When an existing plan is found, the latest oncology selections are
     pushed onto it: the protocol (name + cadence -> planned_cycles and
     cycle_interval_days) and the cancer context from the latest staging
     detail, so downstream viewers (patient-details) show the new days
     and cycles immediately. When planItems are provided, they are also
     synced (delete old items then add new ones). */
  try {
    /* Look the plan up via the mapping-scoped /plans/latest-for-patient
       endpoint (same one patient-details reads) so the existing plan we
       sync is the plan being displayed and branch-scoped list 403s don't
       silently skip the update. */
    const existing = await API.get<{
      success: boolean;
      data: { chemotherapy_plan_id: string } | null;
    }>("/chemotherapy/plans/latest-for-patient", {
      params: { patient_id: patientId },
    });
    const existingPlanId = existing.data.data?.chemotherapy_plan_id;
    if (existingPlanId) {
      /* Resolve the selected protocol + latest staging detail so the
         existing plan is re-linked to the current selection. Both are
         null-safe: only what is actually selected gets synced. */
      const [protocolSync, stagingSync] = await Promise.all([
        protocolId ? loadProtocolSyncData(protocolId) : Promise.resolve(null),
        stagingDetailId
          ? loadStagingSyncData(stagingDetailId)
          : Promise.resolve(null),
      ]);

      const planChanges: Record<string, unknown> = {};
      if (protocolSync) {
        planChanges.source_protocol_id = protocolSync.source_protocol_id;
        if (protocolSync.regimen_name) {
          planChanges.regimen_name = protocolSync.regimen_name;
          planChanges.protocol_name = protocolSync.regimen_name;
        }
        if (protocolSync.regimen_code) {
          planChanges.regimen_code = protocolSync.regimen_code;
        }
        if (protocolSync.planned_cycles > 0) {
          planChanges.planned_cycles = protocolSync.planned_cycles;
        }
        if (protocolSync.cycle_interval_days > 0) {
          planChanges.cycle_interval_days = protocolSync.cycle_interval_days;
        }
      }
      if (stagingSync) {
        planChanges.staging_detail_id = stagingSync.staging_detail_id;
        if (stagingSync.cancer_type) planChanges.cancer_type = stagingSync.cancer_type;
        if (stagingSync.cancer_subtype) planChanges.cancer_subtype = stagingSync.cancer_subtype;
        if (stagingSync.cancer_stage) planChanges.cancer_stage = stagingSync.cancer_stage;
        if (stagingSync.cancer_type_id) planChanges.cancer_type_id = stagingSync.cancer_type_id;
        if (stagingSync.subtype_id) planChanges.subtype_id = stagingSync.subtype_id;
      }

      if (Object.keys(planChanges).length > 0) {
        try {
          await API.put(
            `/chemotherapy/plans/${existingPlanId}`,
            planChanges
          );
        } catch (syncErr: any) {
          console.error(
            "Failed to sync protocol/cancer context onto existing plan:",
            syncErr?.response?.data?.message ?? syncErr?.message
          );
        }
      }

      if (planItems && planItems.length > 0) {
        try {
          /* Fetch current items so we can remove stale ones. */
          const planDetail = await API.get<{
            success: boolean;
            data: {
              chemotherapy_plan_items: { chemotherapy_plan_item_id: string }[];
            };
          }>(`/chemotherapy/plans/${existingPlanId}`);
          const currentItems =
            planDetail.data.data?.chemotherapy_plan_items ?? [];
          for (const ci of currentItems) {
            await API.delete(
              `/chemotherapy/plans/${existingPlanId}/items/${ci.chemotherapy_plan_item_id}`
            );
          }
          for (const pi of planItems) {
            await API.post(
              `/chemotherapy/plans/${existingPlanId}/items`,
              pi
            );
          }
        } catch (syncErr: any) {
          console.error(
            "Failed to sync plan items to existing plan:",
            syncErr?.response?.data?.message ?? syncErr?.message
          );
        }
      }
      if (discussion !== undefined) {
        try {
          await API.put(`/chemotherapy/plans/${existingPlanId}`, {
            discussion: discussion || null,
          });
        } catch (discussionError: any) {
          console.error(
            "Failed to save plan discussion:",
            discussionError?.response?.data?.message ?? discussionError?.message
          );
        }
      }
      return { planId: existingPlanId };
    }
  } catch (error) {
    // Missing/incapable plan lookups fall through to creation.
    console.error("Existing plan lookup failed:", error);
  }

  if (!stagingDetailId) {
    return {
      planId: null,
      error:
        "No oncology staging detail found for this patient. Complete the Diagnosis step first.",
    };
  }
  if (!employeeId) {
    return { planId: null, error: "Consulting doctor could not be identified." };
  }
  if (!departmentId) {
    return {
      planId: null,
      error: "The patient's encounter has no department assigned.",
    };
  }
  if (!branchId) {
    return {
      planId: null,
      error: "Please select a branch from the selector in the header.",
    };
  }

  try {
    const response = await API.post<{
      success: boolean;
      data: { chemotherapy_plan_id: string };
    }>("/chemotherapy/plans", {
      patient_id: patientId,
      staging_detail_id: stagingDetailId,
      ...(diagnosisId ? { diagnosis_id: diagnosisId } : {}),
      employee_id: employeeId,
      department_id: departmentId,
      branch_id: branchId,
      appointment_id: encounter.appointment_id ?? undefined,
      encounter_no: encounter.encounter_no ?? undefined,
      ...(protocolId ? { protocol_id: protocolId } : {}),
      ...(treatmentStartDate
        ? { treatment_start_date: treatmentStartDate }
        : {}),
      confirm_suggested_therapy: true,
      ...(plannedCycles ? { planned_cycles: plannedCycles } : {}),
      ...(planItems && planItems.length > 0 ? { plan_items: planItems } : {}),
      ...(discussion !== undefined ? { discussion: discussion || null } : {}),
    });
    return { planId: response.data.data?.chemotherapy_plan_id ?? null };
  } catch (error: any) {
    console.error("Failed to create chemotherapy plan:", error);
    return {
      planId: null,
      error:
        error?.response?.data?.message ||
        "Failed to create the chemotherapy plan.",
    };
  }
};

export const formatDateDMY = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${date.getFullYear()}`;
};

export const formatTimeAMPM = (value?: string | null) => {
  if (!value) return "";
  const timeMatch = value.match(
    /(?:T|\s)?(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?/
  );
  if (timeMatch) {
    let hour = Number(timeMatch[1]);
    const minute = timeMatch[2];
    const suffix = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${String(hour).padStart(2, "0")}:${minute} ${suffix}`;
  }
  return value;
};
