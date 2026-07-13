// client/api/branch.ts
import API from "./axios";

export interface Branch {
  id: string;
  name: string;
  code?: string;
  hospital_name: string;
  hospital_id?: string;
  address?: string;
  phone?: string;
  email?: string;
  status?: 'active' | 'inactive' | 'pending';
  created_at?: string;
  updated_at?: string;
}

export interface CreateBranchData {
  name: string;
  code?: string;
  hospital_name: string;
  hospital_id?: string;
  address?: string;
  phone?: string;
  email?: string;
  status?: 'active' | 'inactive' | 'pending';
}

export interface UpdateBranchData extends Partial<CreateBranchData> {}

// ✅ Make sure branchApi is exported with 'export const'
export const branchApi = {
  // Get all branches
  getAll: () => API.get<Branch[]>("/branch"),
  
  // Get single branch by ID
  getById: (id: string) => API.get<Branch>(`/branch/${id}`),
  
  // Create new branch
  create: (data: CreateBranchData) => API.post<Branch>("/branch", data),
  
  // Update branch
  update: (id: string, data: UpdateBranchData) => 
    API.put<Branch>(`/branch/${id}`, data),
  
  // Delete branch
  delete: (id: string) => API.delete(`/branch/${id}`),
  
  // Get branches by hospital
  getByHospital: (hospitalId: string) => 
    API.get<Branch[]>(`/branch/hospital/${hospitalId}`),
};