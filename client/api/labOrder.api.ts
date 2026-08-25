import API from "./axios";

export interface LabOrderRecord {
  id: number;
  lab_order_id: string;
  appointment_id?: string | null;
  doctor_employee_id: string;
  department_id?: string | null;
  order_datetime?: string | null;
  priority?: string | null;
  clinical_notes?: string | null;
  provisional_diagnosis?: string | null;
  order_status?: string | null;
  branch_id?: string | null;
  user_id?: string | null;
  patient_history_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LabOrderItemRecord {
  id: number;
  lab_order_item_id: string;
  lab_order_id: string;
  lab_test_id: string;
  quantity?: number | null;
  price?: number | string | null;
  discount?: number | string | null;
  net_amount?: number | string | null;
  item_status?: string | null;
  remarks?: string | null;
  created_at?: string;
  updated_at?: string;
  branch_id?: string | null;
  user_id?: string | null;
  lab_order?: LabOrderRecord & {
    patient_history?: {
      patient_history_id: string;
      patient_id: string;
      visit_type?: string | null;
      visit_status?: string | null;
    } | null;
  };
  lab_test_master?: {
    lab_test_id: string;
    test_name: string;
    test_code?: string | null;
    unit?: string | null;
    reference_range?: string | null;
  } | null;
}

export const labOrderApi = {
  create: (payload: {
    patient_id?: string;
    patient_history_id?: string;
    doctor_employee_id: string;
    department_id?: string;
    branch_id?: string;
    priority?: "Normal" | "Urgent" | "Stat";
    clinical_notes?: string;
  }) => API.post<{ success: boolean; data: LabOrderRecord }>("/lab-order", payload),

  getAll: () =>
    API.get<{ success: boolean; data: LabOrderRecord[] }>("/lab-order"),
};

export const labOrderItemApi = {
  create: (payload: {
    lab_order_id: string;
    lab_test_id: string;
    quantity?: number;
    remarks?: string;
    branch_id?: string;
    user_id?: string;
  }) =>
    API.post<{ success: boolean; data: LabOrderItemRecord }>(
      "/lab-order-item",
      payload,
    ),

  getAll: () =>
    API.get<{ success: boolean; data: LabOrderItemRecord[] }>("/lab-order-item"),
};
