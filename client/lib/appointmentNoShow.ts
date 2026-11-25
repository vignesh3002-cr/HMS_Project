import { getTodayInActiveTimezone } from "@/utils/timezone";

/**
 * Frontend-only "no show" derivation.
 *
 * Any appointment dated BEFORE today (in the ACTIVE BRANCH timezone, never the
 * viewer's laptop date) is displayed as "No Show" -- i.e. everything up to and
 * including yesterday 11:59 PM, for the whole day. Today and future dates keep
 * their real status.
 *
 * This is deliberately display-only: nothing here is written back to the API or
 * the database, so the stored status stays exactly what it was. Callers keep
 * their own label mapping (`STATUS_LABELS`, `formatAppointmentStatus`, ...) and
 * simply bypass it when this returns true.
 *
 * Appointments are day-scoped (date only, no time-of-day), so a date comparison
 * is the whole rule -- no clock maths needed.
 */
export function isPastAppointmentNoShow(
  appointmentDateISO?: string | null,
): boolean {
  const day = String(appointmentDateISO ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  return day < getTodayInActiveTimezone();
}
