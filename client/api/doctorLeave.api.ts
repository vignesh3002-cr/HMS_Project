import API from "./axios";

/**

* Doctor Leave
*
* Backend routes:
*
* POST  /api/doctor-leave/:employeeId/apply
* PATCH /api/doctor-leave/:leaveId/approve
* PATCH /api/doctor-leave/:leaveId/reject
* GET   /api/doctor-leave
  */

export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ApplyDoctorLeavePayload {
leave_start_date: string;
leave_end_date: string;
leave_reason: string;
replacement_employee_id?: string;
requested_by: string;
}

export interface ApproveDoctorLeavePayload {
approved_by: string;
remarks?: string;
}

export interface RejectDoctorLeavePayload {
  rejected_by: string;
  remarks: string;
}

export interface QueueReschedulePayload {
  date_from: string;
  date_to: string;
  reason?: string;
  priority?: "LOW" | "NORMAL" | "HIGH";
}

export interface LeaveConflictDto {
  appointment_id: string;
  patient_first_name: string | null;
  patient_middle_name: string | null;
  patient_last_name: string | null;
  appointment_date: string;
  appointment_time: string;
  status: string;
}

export interface DoctorLeaveRecord {
id: string;
leave_id: string;
employee_id: string;
replacement_employee_id: string | null;

leave_start_date: string;
leave_end_date: string;

leave_reason: string;
status: LeaveStatus;

requested_by: string;
requested_at: string;

approved_by: string | null;
approved_at: string | null;

rejected_by: string | null;
rejected_at: string | null;

remarks: string | null;

branch_id: string;
}

export interface DoctorLeaveListData {
total: number;
page: number;
limit: number;
totalPages: number;
leaves: DoctorLeaveRecord[];
}

export interface GetDoctorLeavesParams {
employee_id?: string;
status?: LeaveStatus;
page?: number;
limit?: number;
}

export interface DoctorLeaveResponse {
message: string;
leave: DoctorLeaveRecord;
}

export interface DoctorLeaveListResponse {
total: number;
page: number;
limit: number;
totalPages: number;
leaves: DoctorLeaveRecord[];
}

export const doctorLeaveApi = {
/**

* Apply for doctor leave
*
* POST /api/doctor-leave/:employeeId/apply
  */
  apply: (
  employeeId: string,
  data: ApplyDoctorLeavePayload,
  ) =>
  API.post<{
  success?: boolean;
  message: string;
  leave: DoctorLeaveRecord;
  }>(
  `/doctor-leave/${employeeId}/apply`,
  data,
  ),

/**

* Approve doctor leave
*
* PATCH /api/doctor-leave/:leaveId/approve
  */
  approve: (
  leaveId: string,
  data: ApproveDoctorLeavePayload,
  ) =>
  API.patch<{
  success?: boolean;
  message: string;
  leave: DoctorLeaveRecord;
  }>(
  `/doctor-leave/${leaveId}/approve`,
  data,
  ),

/**

* Reject doctor leave
*
* PATCH /api/doctor-leave/:leaveId/reject
  */
  reject: (
  leaveId: string,
  data: RejectDoctorLeavePayload,
  ) =>
  API.patch<{
  success?: boolean;
  message: string;
  leave: DoctorLeaveRecord;
  }>(
  `/doctor-leave/${leaveId}/reject`,
  data,
  ),

/**

* Get doctor leave records
*
* GET /api/doctor-leave
  */
  getAll: (
  params?: GetDoctorLeavesParams,
  ) =>
  API.get<DoctorLeaveListResponse>(
  "/doctor-leave",
  {
  params,
  },
  ),

/**

* Get all approved leaves for a doctor.
*
* This helper is intended for the appointment UI.
*
* We only consider APPROVED leaves when deciding whether
* a doctor is unavailable for appointment booking.
  */
  getApprovedLeavesForDoctor: (
  employeeId: string,
  ) =>
  API.get<DoctorLeaveListResponse>(
  "/doctor-leave",
  {
  params: {
  employee_id: employeeId,
  status: "APPROVED",
  page: 1,
  limit: 100,
  },
  },
  ),

/**
* Queue a doctor's active appointments (inside a date
* range) for reschedule — used when applying leave that
* conflicts with booked appointments.
*
* POST /api/doctor-leave/:employeeId/queue-reschedule
*/
queueReschedule: (
employeeId: string,
data: QueueReschedulePayload,
) =>
API.post<{
success?: boolean;
message: string;
data: { total: number; queued: number };
}>(
`/doctor-leave/${employeeId}/queue-reschedule`,
data,
),

/**
* Active appointments for the doctor inside a leave
* date range — conflict pre-check before applying.
*
* GET /api/doctor-leave/:employeeId/conflicts
*/
getConflicts: (
employeeId: string,
params: { date_from: string; date_to: string },
) =>
API.get<{
success?: boolean;
message: string;
data: LeaveConflictDto[];
}>(
`/doctor-leave/${employeeId}/conflicts`,
{ params },
),
  };
