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
  consultation_minutes?: number | null;
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

// Row returned by GET /doctor-schedule/active. The backend selects only these
// fields, so this is intentionally narrower than DoctorScheduleRecord (which
// also requires effective_from / effective_to / deleted_by).
export interface ActiveScheduleRecord {
  schedule_id: string | number;
  employee_id: string;
  branch_id: string;
  day_of_week: string;
  shift_name?: string | null;
  start_time: string;
  end_time: string;
  consultation_minutes?: number | null;
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

  getAllActive: (branchId?: string) =>
    API.get<{
      success?: boolean;
      message?: string;
      data: ActiveScheduleRecord[];
    }>("/doctor-schedule/active", { params: { branchId } }),
};
