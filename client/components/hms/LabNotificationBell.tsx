import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Check,
  Trash2,
  AlertTriangle,
  FlaskConical,
  TestTube,
  FileCheck,
  ClipboardList,
  ExternalLink,
  Flame,
} from "lucide-react";
import { useLabNotifications } from "@/context/LabNotificationContext";
import { LabNotificationItem } from "@/api/labNotification.api";

function timeAgo(dateString: string): string {
  const timestamp = new Date(dateString).getTime();
  if (isNaN(timestamp)) return "Recently";
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

interface LabNotificationBellProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LabNotificationBell({ className = "", size = "md" }: LabNotificationBellProps) {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    statCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAll,
  } = useLabNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "STAT" | "ORDER" | "SAMPLE" | "REPORT">("ALL");
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (filter === "STAT") return item.priority === "STAT" || item.priority === "URGENT";
      if (filter === "ORDER") return item.category === "ORDER";
      if (filter === "SAMPLE") return item.category === "SAMPLE";
      if (filter === "REPORT") return item.category === "REPORT";
      return true;
    });
  }, [notifications, filter]);

  const handleAction = (item: LabNotificationItem) => {
    markAsRead(item.id);
    setIsOpen(false);
    if (item.actionUrl) {
      navigate(item.actionUrl);
    }
  };

  const getCategoryIcon = (category: string, priority: string) => {
    if (priority === "STAT") {
      return <Flame className="w-4 h-4 text-rose-600 animate-pulse" />;
    }
    switch (category) {
      case "SAMPLE":
        return <TestTube className="w-4 h-4 text-blue-600" />;
      case "TESTING":
        return <FlaskConical className="w-4 h-4 text-amber-600" />;
      case "REPORT":
        return <FileCheck className="w-4 h-4 text-emerald-600" />;
      case "ORDER":
      default:
        return <ClipboardList className="w-4 h-4 text-[#0b4a8b]" />;
    }
  };

  const buttonSizes = {
    sm: "w-8 h-8",
    md: "w-9 h-9",
    lg: "w-10 h-10",
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Bell Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Laboratory Notifications"
        title="Lab Notifications & Alerts"
        className={`relative flex items-center justify-center ${buttonSizes[size]} rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-xs outline-none focus:ring-2 focus:ring-blue-100`}
      >
        <Bell className="w-4 h-4 text-slate-600" />

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <>
            {statCount > 0 && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-rose-500 animate-ping opacity-75" />
            )}
            <span
              className={`absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-extrabold leading-none shadow-sm ${
                statCount > 0 ? "bg-rose-600 ring-2 ring-white" : "bg-[#0b4a8b] ring-2 ring-white"
              }`}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </>
        )}
      </button>

      {/* Notification Dropdown Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full mt-2.5 w-[420px] max-w-[92vw] bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden font-sans antialiased animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-slate-100 bg-[#F8FAFC]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100/70 text-[#0b4a8b] flex items-center justify-center font-bold">
                  <FlaskConical className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">Lab Notifications</h3>
                  <p className="text-[11px] text-slate-500">Live laboratory bench & order alerts</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 text-[11px] font-semibold text-[#0b4a8b] hover:text-blue-800 transition-colors px-2 py-1 rounded-md hover:bg-blue-50 cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            {/* Quick Filter Tabs */}
            <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-slate-200/60 overflow-x-auto pb-0.5">
              {(
                [
                  ["ALL", `All (${notifications.length})`],
                  ["STAT", `STAT (${notifications.filter((n) => n.priority === "STAT" || n.priority === "URGENT").length})`],
                  ["ORDER", "Orders"],
                  ["SAMPLE", "Samples"],
                  ["REPORT", "Reports"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                    filter === key
                      ? key === "STAT"
                        ? "bg-rose-600 text-white"
                        : "bg-[#0b4a8b] text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-200/60"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2.5">
                  <Bell className="w-5 h-5 opacity-40" />
                </div>
                <h4 className="text-xs font-bold text-slate-700">No notifications in this view</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">All laboratory activities are current</p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const isStat = item.priority === "STAT";
                const isUrgent = item.priority === "URGENT";

                return (
                  <div
                    key={item.id}
                    onClick={() => handleAction(item)}
                    className={`p-3.5 hover:bg-slate-50/90 transition-colors cursor-pointer group flex items-start gap-3 relative ${
                      !item.read ? (isStat ? "bg-rose-50/40" : "bg-blue-50/25") : ""
                    }`}
                  >
                    {/* Unread dot */}
                    {!item.read && (
                      <span
                        className={`absolute left-1.5 top-5 w-1.5 h-1.5 rounded-full ${
                          isStat ? "bg-rose-600" : "bg-[#0b4a8b]"
                        }`}
                      />
                    )}

                    {/* Icon Container */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                        isStat
                          ? "bg-rose-100/80 border-rose-200"
                          : isUrgent
                          ? "bg-amber-100/80 border-amber-200"
                          : item.category === "SAMPLE"
                          ? "bg-blue-100/80 border-blue-200"
                          : item.category === "REPORT"
                          ? "bg-emerald-100/80 border-emerald-200"
                          : "bg-slate-100 border-slate-200"
                      }`}
                    >
                      {getCategoryIcon(item.category, item.priority)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4
                            className={`text-xs font-bold truncate ${
                              !item.read ? "text-slate-900" : "text-slate-700"
                            }`}
                          >
                            {item.title}
                          </h4>
                          {isStat && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200">
                              STAT
                            </span>
                          )}
                          {isUrgent && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              URGENT
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                          {timeAgo(item.createdAt)}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 mt-1 leading-snug line-clamp-2">
                        {item.message}
                      </p>

                      {/* Action & Bench info footer */}
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100/80">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          {item.orderId && <span className="font-mono">{item.orderId}</span>}
                          {item.patientName && <span>• {item.patientName}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[#0b4a8b] group-hover:underline inline-flex items-center gap-0.5">
                            {item.actionLabel}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              dismissNotification(item.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200/70 text-slate-400 hover:text-red-500 transition-all cursor-pointer"
                            title="Dismiss"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
            <span>Live lab alerts & updates</span>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-[11px] font-medium text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
