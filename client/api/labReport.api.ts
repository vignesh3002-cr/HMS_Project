import API from "./axios";

/* A lab report's comment, stored as JSON. Older reports may hold it as a
   JSON string or plain text - read it with parseReportComment. */
export interface LabReportComment {
  text?: string;
  parameters?: any[];
  clinicalCorrelation?: string;
  overallDecision?: "Approved" | "Rejected" | "Pending";
}

export const parseReportComment = (
  value: LabReportComment | string | null | undefined
): { meta: LabReportComment | null; text: string } => {
  if (!value) return { meta: null, text: "" };
  if (typeof value === "object") return { meta: value, text: value.text ?? "" };
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object") {
      return { meta: parsed, text: parsed.text ?? "" };
    }
  } catch {
    // plain text
  }
  return { meta: null, text: value };
};

export interface LabReportRecord {
  id: number;
  lab_report_id: string;
  lab_order_id: string;
  report_number?: string | null;
  generated_datetime?: string | null;
  approved_by?: string | null;
  approved_datetime?: string | null;
  report_status?: string | null;
  report_file?: string | null;
  digital_signature?: string | null;
  report_comment?: LabReportComment | string | null;
  delivered_to?: string | null;
  delivered_datetime?: string | null;
  branch_id?: string | null;
  user_id?: string | null;
  created_at?: string;
  updated_at?: string;
  employees?: {
    employee_id: string;
    first_name: string;
    last_name?: string | null;
    designation?: string | null;
  } | null;
  lab_order?: {
    lab_order_id: string;
    patient_history_id?: string | null;
    order_datetime?: string | null;
    patient_history?: {
      patient_history_id: string;
      patient_id: string;
    } | null;
    employees?: {
      employee_id: string;
      first_name: string;
      last_name?: string | null;
      designation?: string | null;
      email?: string | null;
    } | null;
    department_master?: {
      department_id: string;
      department_name: string;
    } | null;
    lab_order_item?: {
      lab_order_item_id: string;
      lab_order_id: string;
      lab_test_id: string;
      item_status?: string | null;
      remarks?: string | null;
      barcode?: string | null;
      specimen_type?: string | null;
      lab_test_master?: {
        lab_test_id: string;
        test_name: string;
        test_code?: string | null;
        sample_type?: string | null;
        reference_range?: string | null;
      } | null;
      sample_collection?: {
        sample_collection_id: string;
        barcode?: string | null;
        container_type?: string | null;
      }[];
    }[];
  } | null;
}

export const labReportApi = {
  getAll: () =>
    API.get<{ success: boolean; data: LabReportRecord[] }>("/lab-report"),

  getById: (id: string) =>
    API.get<{ success: boolean; data: LabReportRecord }>(
      `/lab-report/${encodeURIComponent(id)}`
    ),

  getByOrderId: (orderId: string) =>
    API.get<{ success: boolean; data: LabReportRecord }>(
      `/lab-report/order/${encodeURIComponent(orderId)}`
    ),

  create: (payload: {
    lab_order_id: string;
    report_number?: string;
    generated_datetime?: string | Date;
    approved_by?: string;
    approved_datetime?: string | Date;
    report_status?: string;
    report_file?: string;
    digital_signature?: string;
    report_comment?: string | LabReportComment;
    delivered_to?: string;
    delivered_datetime?: string | Date;
    branch_id?: string;
    user_id?: string;
    parameters?: any[];
    clinical_correlation?: string;
    overall_decision?: string;
    lab_order_item_id?: string;
  }) =>
    API.post<{ success: boolean; message: string; data: LabReportRecord }>(
      "/lab-report",
      payload
    ),

  update: (
    id: string,
    payload: Partial<LabReportRecord> & {
      parameters?: any[];
      clinical_correlation?: string;
      overall_decision?: string;
    }
  ) =>
    API.put<{ success: boolean; message: string; data: LabReportRecord }>(
      `/lab-report/${encodeURIComponent(id)}`,
      payload
    ),

  transfer: (
    id: string,
    payload: {
      delivered_to: string;
      delivered_datetime?: string | Date;
      channel?: string;
      remarks?: string;
      report_status?: string;
    }
  ) =>
    API.put<{ success: boolean; message: string; data: LabReportRecord }>(
      `/lab-report/${encodeURIComponent(id)}/transfer`,
      payload
    ),

  delete: (id: string) =>
    API.delete<{ success: boolean; message: string }>(
      `/lab-report/${encodeURIComponent(id)}`
    ),
};
