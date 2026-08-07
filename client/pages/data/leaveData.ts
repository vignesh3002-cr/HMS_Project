import type { AbsenceTypeOption, ChecklistItem, EntitlementItem, LoggedAbsence } from "../types";

export const ABSENCE_TYPES: AbsenceTypeOption[] = [
  { id: "emergency", label: "Emergency Leave" },
  { id: "vacation", label: "Vacation" },
  { id: "sick", label: "Sick Leave" },
];

export const CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: "handover-notes", label: "Handover notes shared with covering doctor", checked: false },
  { id: "pending-files", label: "Reviewed pending patient files", checked: false },
  { id: "reception-notified", label: "Notified reception team", checked: false },
  { id: "calendar-updated", label: "Updated availability calendar", checked: false },
];

export const ENTITLEMENTS: EntitlementItem[] = [
  { label: "Annual Leave", used: 5, total: 20 },
  { label: "Sick Leave", used: 2, total: 10 },
  { label: "Emergency Leave", used: 1, total: 5 },
];

export const LOGGED_ABSENCES: LoggedAbsence[] = [
  { id: "1", type: "Vacation", duration: "5 Days", dateLogged: "May 12, 2026" },
  { id: "2", type: "Sick Leave", duration: "2 Days", dateLogged: "Apr 3, 2026" },
  { id: "3", type: "Emergency", duration: "1 Day", dateLogged: "Feb 20, 2026" },
];
