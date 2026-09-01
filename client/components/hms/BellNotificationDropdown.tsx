import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, Check, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/context/NotificationContext";
import { globalNotificationApi, GlobalNotification } from "@/api/globalNotification.api";
import { getActiveBranchId } from "@/api/axios";
import { getUser } from "@/utils/token";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function timeAgo(timestamp: number) {
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
}

function getEntityLabel(entityType: string): string {
  const map: Record<string, string> = {
    patient: "Patient",
    employee: "Staff",
    doctor: "Doctor",
    appointment: "Appointment",
    department: "Department",
    branch: "Branch",
    encounter: "Encounter",
    chemotherapy: "Chemotherapy",
    prescription: "Prescription",
    lab_order: "Lab Order",
    lab_test: "Lab Test",
    diagnosis: "Diagnosis",
    protocol: "Protocol",
    schedule: "Schedule",
    leave: "Leave",
    transfer: "Transfer",
  };
  return map[entityType] || entityType.charAt(0).toUpperCase() + entityType.slice(1);
}

function getActionPastTense(action: string): string {
  if (action === "CREATE") return "created";
  if (action === "UPDATE") return "updated";
  if (action === "DELETE") return "deleted";
  return action.toLowerCase();
}

function getActionColor(action: string): string {
  if (action === "CREATE") return "text-emerald-600";
  if (action === "UPDATE") return "text-blue-600";
  if (action === "DELETE") return "text-red-500";
  return "text-gray-600";
}

function getActionBg(action: string): string {
  if (action === "CREATE") return "bg-emerald-50";
  if (action === "UPDATE") return "bg-blue-50";
  if (action === "DELETE") return "bg-red-50";
  return "bg-gray-50";
}

interface BellNotificationDropdownProps {
  className?: string;
  size?: number;
}

export function BellNotificationDropdown({ className, size = 20 }: BellNotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const [backendNotifications, setBackendNotifications] = useState<GlobalNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const user = getUser();
  const employeeId = user?.employee_id || "";
  const branchId = getActiveBranchId() || undefined;

  const fetchBackendNotifications = useCallback(async () => {
    if (!employeeId) return;
    try {
      const [notifsRes, countRes] = await Promise.all([
        globalNotificationApi.getAll({ employeeId, branchId, limit: 50 }),
        globalNotificationApi.getUnreadCount({ employeeId, branchId }),
      ]);
      setBackendNotifications(notifsRes.data?.data?.notifications || []);
      setUnreadCount(countRes.data?.data?.unreadCount || 0);
    } catch {
      // Silently fail - backend notifications are supplementary
    }
  }, [employeeId, branchId]);

  useEffect(() => {
    fetchBackendNotifications();
    pollRef.current = setInterval(() => {
      if (!document.hidden) {
        fetchBackendNotifications();
      }
    }, 15000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchBackendNotifications]);

  const handleMarkAllRead = async () => {
    if (!employeeId) return;
    try {
      await globalNotificationApi.markAllRead({ employeeId, branchId });
      setUnreadCount(0);
      setBackendNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
    } catch {
      // ignore
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await globalNotificationApi.markAsRead(id);
      setBackendNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await globalNotificationApi.delete(id);
      setBackendNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // ignore
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "relative p-2 rounded-lg hover:bg-slate-100 transition-colors",
            className
          )}
          title="Notifications"
        >
          <Bell size={size} className="text-[#475569]" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[380px] p-0 rounded-xl border border-[#E5E7EB] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.16)] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#F8F9FF] border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-[#0B1C30]">Notifications</h3>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold text-white bg-[#00488D] rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[#00488D] hover:bg-[#E6E8EA] rounded-md transition-colors"
              >
                <Check size={12} />
                Mark all read
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="p-1 hover:bg-[#E6E8EA] rounded-md transition-colors"
            >
              <X size={14} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Notification List */}
        <div className="max-h-[400px] overflow-y-auto">
          {backendNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <Bell size={32} strokeWidth={1.5} />
              <p className="mt-2 text-sm">No notifications yet</p>
              <p className="text-xs mt-1">Changes will appear here</p>
            </div>
          ) : (
            backendNotifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors",
                  !notification.is_read && "bg-blue-50/40"
                )}
              >
                {/* Action Icon */}
                <div
                  className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mt-0.5",
                    getActionBg(notification.action),
                    getActionColor(notification.action)
                  )}
                >
                  {notification.action === "CREATE"
                    ? "+"
                    : notification.action === "UPDATE"
                    ? "~"
                    : "−"}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#0B1C30] leading-snug">
                    <span className="font-semibold capitalize">
                      {getEntityLabel(notification.entity_type)}
                    </span>{" "}
                    <span className={cn("font-medium", getActionColor(notification.action))}>
                      {notification.action.toLowerCase()}
                    </span>
                    {" — "}
                    <span className="font-medium">{notification.record_name}</span>{" "}
                    was {getActionPastTense(notification.action)}.
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-gray-400">
                      {timeAgo(new Date(notification.created_at).getTime())}
                    </span>
                    {notification.actor_name && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="text-[11px] text-gray-400">
                          by {notification.actor_name}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!notification.is_read && (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title="Mark as read"
                    >
                      <Check size={12} className="text-gray-400" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notification.id)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={12} className="text-gray-400" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {backendNotifications.length > 0 && (
          <div className="px-4 py-2.5 bg-[#F8F9FF] border-t border-[#E5E7EB]">
            <a
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-semibold text-[#00488D] hover:underline"
            >
              View all notifications
            </a>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
