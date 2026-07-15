import API from "./axios";

// Shape returned by GET /doctors (see hms-backend doctor.service.ts getDoctors()).
// NOTE: as of this writing the /api/doctors route is commented out in
// hms-backend/src/server.ts, so this call currently 404s until that route
// is mounted on the backend.
export interface DoctorRecord {
  employee_id: string;
  doctor_name: string;
  specialization: string | null;
  qualification: string | null;
  department: string | null;
  branch_name: string | null;
  status: boolean;
}

export const doctorApi = {
  getAll: () => API.get<{ success: boolean; data: DoctorRecord[] }>("/doctors"),
};
