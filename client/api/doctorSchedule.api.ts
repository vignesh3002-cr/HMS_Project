import API from "./axios";

export type ScheduleChangeMode = "ADD" | "OVERRIDE" | "CANCEL";

export interface ScheduleChangeRecord {
  change_id: string;
  employee_id: string;
  branch_id: string;
  change_date: string;
  mode: ScheduleChangeMode;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateScheduleChangePayload {
  employee_id: string;
  branch_id: string;
  change_date: string;
  mode: ScheduleChangeMode;
  start_time?: string;
  end_time?: string;
  reason?: string;
  created_by?: string;
}

export interface UpdateScheduleChangePayload {
  change_date?: string;
  mode?: ScheduleChangeMode;
  start_time?: string;
  end_time?: string;
  reason?: string;
  is_active?: boolean;
}

// Date-specific (non-recurring) doctor schedule changes: ADD / OVERRIDE /
// CANCEL for a particular date. Backed by the doctor_schedule_change table.
// Only the doctor themselves or an admin may create/update/cancel (the
// backend enforces this; the UI hides the controls otherwise).
export const doctorScheduleApi = {
  createChange: (data: CreateScheduleChangePayload) =>
    API.post<{ success: boolean; message: string; data: ScheduleChangeRecord }>(
      "/doctor-schedule/change",
      data,
    ),

  getChanges: (employeeId: string) =>
    API.get<{ success: boolean; data: ScheduleChangeRecord[] }>(
      `/doctor-schedule/${employeeId}/changes`,
    ),

  getChangesByDate: (employeeId: string, date: string) =>
    API.get<{ success: boolean; data: ScheduleChangeRecord[] }>(
      `/doctor-schedule/${employeeId}/changes/${date}`,
    ),

  updateChange: (changeId: string, data: UpdateScheduleChangePayload) =>
    API.patch<{ success: boolean; message: string; data: ScheduleChangeRecord }>(
      `/doctor-schedule/change/${changeId}`,
      data,
    ),

  cancelChange: (changeId: string) =>
    API.patch<{ success: boolean; message: string; data: ScheduleChangeRecord }>(
      `/doctor-schedule/change/${changeId}/cancel`,
    ),
};