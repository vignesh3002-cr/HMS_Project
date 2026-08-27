import API from "./axios";

export interface AuditLogRecord {
  audit_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  performed_by: string;
  patient_id?: string | null;
  branch_id?: string | null;
  change_summary: string;
  performed_at: string;
}

export interface GetAuditLogsParams {
  entity_type?: string;
  entity_id?: string;
  patient_id?: string;
  branchId?: string;
  performed_by?: string;
  action?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export const auditApi = {
  getLogs: (params?: GetAuditLogsParams) =>
    API.get<{
      success: boolean;
      message: string;
      data: AuditLogRecord[];
      pagination: { total: number; page: number; limit: number };
    }>("/audit/logs", { params }),
};
