import API from "./axios";

export type ScheduleChangeMode = "ADD" | "OVERRIDE" | "CANCEL";

export interface ScheduleChangeRecord {
  change_id: string | number;
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
  updated_at: string | null;
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
  mode: ScheduleChangeMode;
  start_time?: string;
  end_time?: string;
  reason?: string;
}

export const doctorScheduleApi = {
  getChanges: (employeeId: string) =>
    API.get<{ success?: boolean; message?: string; data?: ScheduleChangeRecord[] }>(
      `/doctor-schedule/${employeeId}/changes`,
    ),

  createChange: (data: CreateScheduleChangePayload) =>
    API.post<{ success?: boolean; message?: string; data?: ScheduleChangeRecord }>(
      "/doctor-schedule/change",
      data,
    ),

updateChange: (changeId: string, data: UpdateScheduleChangePayload) =>
    API.patch<{ success?: boolean; message?: string; data?: ScheduleChangeRecord }>(
      `/doctor-schedule/change/${changeId}`,
      data,
    ),

  cancelChange: (changeId: string) =>
    API.patch<{ success?: boolean; message?: string; data?: ScheduleChangeRecord }>(
      `/doctor-schedule/change/${changeId}/cancel`,
    ),
};