import {
  doctorLeaveApi,
  type LeaveConflictDto,
} from "@/api/doctorLeave.api";

export interface LeaveConflict {
  appointment_id: string;
  patientName: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
}

/**
 * Active (non-terminal, not already queued) appointments for
 * a doctor between two ISO dates — used before applying leave.
 *
 * Uses the dedicated doctor-leave conflicts endpoint, which is
 * branch-agnostic (a leave affects every branch the doctor
 * works at) and therefore never triggers the "Please select a
 * branch first." branch-scope error.
 */
export async function findLeaveConflictingAppointments(
  employeeId: string,
  dateFrom: string,
  dateTo: string
): Promise<LeaveConflict[]> {
  const response = await doctorLeaveApi.getConflicts(employeeId, {
    date_from: dateFrom,
    date_to: dateTo,
  });

  const records: LeaveConflictDto[] = response.data?.data ?? [];

  return records.map((record) => ({
    appointment_id: record.appointment_id,
    patientName:
      [
        record.patient_first_name,
        record.patient_middle_name,
        record.patient_last_name,
      ]
        .filter(Boolean)
        .join(" ") || "A patient",
    appointment_date: record.appointment_date,
    appointment_time: record.appointment_time,
    status: record.status,
  }));
}

export function formatTimeOfDay(time?: string | null): string {
  if (!time) return "";
  const d = new Date(time);
  if (isNaN(d.getTime())) return "";
  const hours = d.getUTCHours();
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${h12}:${minutes} ${period}`;
}
