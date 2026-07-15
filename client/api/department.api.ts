import API from "./axios";

// Shape returned by GET /departments (see hms-backend department.services.ts,
// which queries prisma.department_master.findMany()).
export interface Department {
  department_id: string;
  department_name: string;
}

export const departmentApi = {
  getAll: () => API.get<{ success: boolean; data: Department[] }>("/departments"),
};
