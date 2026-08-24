import type { AppointmentRecord } from "@/api/appointment.api";

export const DEFAULT_CONSULTATION_MINUTES = 20;

// Appointments already closed for modification keep their real status no
// matter how long ago their consultation slot was.
export const TERMINAL_STATUSES = new Set(["COMPLETED", "CANCELLED", "NO_SHOW", "NOT_CHECKED_IN"]);

// Builds the appointment's start instant as LOCAL wall-clock time. The
// backend stores appointment_time as UTC such that its UTC time-of-day is the
// displayed HH:mm (see appointment.utils.ts formatTimeOfDay), so the wall
// clock shown to users must be interpreted in the viewer's local timezone for
// the "today 4:20 -> 4:40" case to resolve against the real current time.
function consultationStartMs(record: AppointmentRecord): number | null {
  const date = new Date(record.appointment_date);
  const time = new Date(record.appointment_time);
  if (isNaN(date.getTime()) || isNaN(time.getTime())) return null;
  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    time.getUTCHours(),
    time.getUTCMinutes(),
    time.getUTCSeconds(),
  ).getTime();
}

// Returns "NOT_CHECKED_IN" when the doctor's consultation window for the
// appointment has fully elapsed (appointment_time + consultation_minutes),
// otherwise returns the appointment's real status unchanged. Only
// non-terminal appointments are overridden. The backend job
// (appointment-status.job.ts) persists this transition within minutes, so
// this is just the instant display fallback.
export function getEffectiveAppointmentStatus(
  record: AppointmentRecord,
  now: Date = new Date(),
): string {
  const status = record.status ?? "";
  if (!status || TERMINAL_STATUSES.has(status)) return status;

  const startMs = consultationStartMs(record);
  if (startMs === null) return status;

  const minutes =
    record.doctor_schedule?.consultation_minutes ?? DEFAULT_CONSULTATION_MINUTES;
  if (minutes <= 0) return status;

  return now.getTime() >= startMs + minutes * 60000 ? "NOT_CHECKED_IN" : status;
}
