import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import {
  labNotificationApi,
  LabNotificationItem,
  LabNotificationResponse,
} from "@/api/labNotification.api";

interface LabNotificationContextType {
  notifications: LabNotificationItem[];
  unreadCount: number;
  statCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => Promise<void>;
  dismissNotification: (id: string) => void;
  clearAll: () => void;
  refetch: () => Promise<void>;
}

const LabNotificationContext = createContext<LabNotificationContextType | undefined>(undefined);

export const LabNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<LabNotificationResponse>({
    notifications: [],
    total: 0,
    unreadCount: 0,
    statCount: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await labNotificationApi.getNotifications();
      setData(res);
    } catch (err) {
      console.error("Failed to fetch lab notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchNotifications();

    // Poll every 25s for new lab orders & STAT alerts
    const interval = setInterval(fetchNotifications, 25000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = useCallback((id: string) => {
    labNotificationApi.markAsRead(id);
    setData((prev) => {
      const updated = prev.notifications.map((item) =>
        item.id === id ? { ...item, read: true } : item
      );
      return {
        ...prev,
        notifications: updated,
        unreadCount: updated.filter((item) => !item.read).length,
        statCount: updated.filter((item) => !item.read && (item.priority === "STAT" || item.priority === "URGENT")).length,
      };
    });
  }, []);

  const markAllAsRead = useCallback(async () => {
    const ids = data.notifications.map((n) => n.id);
    await labNotificationApi.markAllAsRead(ids);
    setData((prev) => ({
      ...prev,
      notifications: prev.notifications.map((item) => ({ ...item, read: true })),
      unreadCount: 0,
      statCount: 0,
    }));
  }, [data.notifications]);

  const dismissNotification = useCallback((id: string) => {
    labNotificationApi.dismiss(id);
    setData((prev) => {
      const updated = prev.notifications.filter((item) => item.id !== id);
      return {
        ...prev,
        notifications: updated,
        total: updated.length,
        unreadCount: updated.filter((item) => !item.read).length,
        statCount: updated.filter((item) => !item.read && (item.priority === "STAT" || item.priority === "URGENT")).length,
      };
    });
  }, []);

  const clearAll = useCallback(() => {
    const ids = data.notifications.map((n) => n.id);
    labNotificationApi.clearAll(ids);
    setData({
      notifications: [],
      total: 0,
      unreadCount: 0,
      statCount: 0,
    });
  }, [data.notifications]);

  const value = useMemo(
    () => ({
      notifications: data.notifications,
      unreadCount: data.unreadCount,
      statCount: data.statCount,
      isLoading,
      markAsRead,
      markAllAsRead,
      dismissNotification,
      clearAll,
      refetch: fetchNotifications,
    }),
    [data, isLoading, markAsRead, markAllAsRead, dismissNotification, clearAll, fetchNotifications]
  );

  return (
    <LabNotificationContext.Provider value={value}>
      {children}
    </LabNotificationContext.Provider>
  );
};

export const useLabNotifications = (): LabNotificationContextType => {
  const context = useContext(LabNotificationContext);
  if (!context) {
    // If used outside provider, return safe standalone fallback
    return {
      notifications: [],
      unreadCount: 0,
      statCount: 0,
      isLoading: false,
      markAsRead: () => {},
      markAllAsRead: async () => {},
      dismissNotification: () => {},
      clearAll: () => {},
      refetch: async () => {},
    };
  }
  return context;
};
