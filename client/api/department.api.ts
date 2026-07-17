import API from "./axios";

// Shape returned by GET /departments (see hms-backend department.services.ts,
// which queries prisma.department_master.findMany()).
export interface Department {
  department_id: string;
  department_name: string;
}

export const departmentApi = {
  getAll: () => API.get<{ success: boolean; data: Department[] }>("/departments"),
  // POST /departments already exists on the backend (department.routes.ts) — used
  // when the user picks "Others" and types a department name that doesn't exist yet.
  create: (data: { department_name: string }) =>
    API.post<{ success: boolean; data: Department }>("/departments", data),
};
