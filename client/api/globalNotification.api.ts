import api from "./axios";

export interface GlobalNotification {
  id: string;
  entity_type: string;
  record_id: string;
  record_name: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  actor_name: string;
  branch_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface GlobalNotificationsResponse {
  notifications: GlobalNotification[];
  total: number;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export const globalNotificationApi = {
  getAll: (params: {
    employeeId: string;
    branchId?: string;
    limit?: number;
    offset?: number;
  }) => api.get<{ success: boolean; data: GlobalNotificationsResponse }>("/global-notifications", { params }),

  getUnreadCount: (params: {
    employeeId: string;
    branchId?: string;
  }) => api.get<{ success: boolean; data: UnreadCountResponse }>("/global-notifications/unread-count", { params }),

  markAllRead: (data: { employeeId: string; branchId?: string }) =>
    api.put<{ success: boolean; data: { updated: number } }>("/global-notifications/read-all", data),

  markAsRead: (id: string) =>
    api.put<{ success: boolean; data: GlobalNotification }>(`/global-notifications/read/${id}`),

  delete: (id: string) =>
    api.delete<{ success: boolean; data: GlobalNotification }>(`/global-notifications/${id}`),
};
