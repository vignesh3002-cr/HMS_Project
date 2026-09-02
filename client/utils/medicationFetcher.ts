import API from "../api/axios";

export interface CycleMedication {
  chemotherapy_plan_item_id: string;
  drug_role: string | null;
  medicine_master: {
    medicine_name: string;
    generic_name: string | null;
    dosage_form: string | null;
    unit: string | null;
  } | null;
  protocol_dose: number | null;
  protocol_dose_unit: string | null;
  calculated_dose?: number | string | null;
  administration_route: string | null;
  frequency: string | null;
  dilution_volume: string | null;
  remarks: string | null;
  cycle_day?: number | null;
  administration_day?: number | null;
}

export interface CycleWithMedications {
  cycleId: string;
  cycleNumber: number;
  plannedDate: string | null;
  actualDate: string | null;
  cycleStatus: string | null;
  medications: CycleMedication[];
}

export interface PatientMedicationData {
  planId: string;
  patientId: string;
  regimenName: string;
  treatmentIntent: string | null;
  treatmentStatus: string | null;
  cycles: CycleWithMedications[];
}

/**
 * Fetch all medications for a given patient across all cycles of their latest plan.
 * Uses existing GET /chemotherapy/plans/latest-for-patient and
 * GET /chemotherapy/cycles/:cycleId endpoints.
 */
export async function fetchPatientMedications(
  patientId: string
): Promise<PatientMedicationData | null> {
  const planResponse = await API.get<{
    success: boolean;
    data: any;
  }>("/chemotherapy/plans/latest-for-patient", {
    params: { patient_id: patientId },
  });

  const plan = planResponse.data?.data;
  if (!plan) {
    return null;
  }

  const cycles = plan.chemotherapy_cycle ?? [];
  const planId = plan.chemotherapy_plan_id;
  const regimenName = plan.regimen_name || "";
  const treatmentIntent = plan.treatment_intent || null;
  const treatmentStatus = plan.treatment_status || null;

  const cyclePromises = cycles
    .filter((c: any) => c.chemotherapy_cycle_id)
    .map(async (cycle: any) => {
      try {
        const cycleResponse = await API.get<{
          success: boolean;
          data: any;
        }>(`/chemotherapy/cycles/${encodeURIComponent(cycle.chemotherapy_cycle_id)}`);

        const items = cycleResponse.data?.data?.chemotherapy_plan_items ?? [];

        return {
          cycleId: cycle.chemotherapy_cycle_id,
          cycleNumber: cycle.cycle_number,
          plannedDate: cycle.planned_date || null,
          actualDate: cycle.actual_date || null,
          cycleStatus: cycle.cycle_status || null,
          medications: items as CycleMedication[],
        };
      } catch (error) {
        console.warn(`Failed to fetch medications for cycle ${cycle.cycle_number}`, error);
        return {
          cycleId: cycle.chemotherapy_cycle_id,
          cycleNumber: cycle.cycle_number,
          plannedDate: cycle.planned_date || null,
          actualDate: cycle.actual_date || null,
          cycleStatus: cycle.cycle_status || null,
          medications: [],
        };
      }
    });

  const cyclesWithMeds = await Promise.all(cyclePromises);

  return {
    planId,
    patientId,
    regimenName,
    treatmentIntent,
    treatmentStatus,
    cycles: cyclesWithMeds,
  };
}
