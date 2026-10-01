import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getUser, remove } from "@/utils/token";
import LabNav from "./labnav";
import { LabNotificationBell } from "@/components/hms/LabNotificationBell";
import { UserProfileDropdown } from "@/components/ui/User_profile_dropdown";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { useLabNotifications } from "@/context/LabNotificationContext";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Search,
  Flame,
  TestTube,
  FlaskConical,
  FileCheck,
  ClipboardList,
  ExternalLink,
  Clock,
  ArrowRight,
} from "lucide-react";
import { LabNotificationItem } from "@/api/labNotification.api";

function timeAgo(dateString: string): string {
  const timestamp = new Date(dateString).getTime();
  if (isNaN(timestamp)) return "Recently";
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export default function LabNotifications() {
  const navigate = useNavigate();
  const currentUser = useMemo(() => getUser(), []);
  const displayName = currentUser?.username || "Lab Technician";
  const displayRole =
    currentUser?.role_type === "LAB_TECHNICIAN" ? "Lab Technician" : currentUser?.role_type || "Lab Technician";
  const avatarUrl = typeof window !== "undefined" ? localStorage.getItem("user_photo") || undefined : undefined;

  const [logoutOpen, setLogoutOpen] = useState(false);
  const handleLogout = () => {
    setLogoutOpen(false);
    remove();
    localStorage.removeItem("user_info");
    localStorage.removeItem("user_photo");
    navigate("/", { replace: true });
  };

  const {
    notifications,
    unreadCount,
    statCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAll,
    refetch,
  } = useLabNotifications();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "STAT" | "ORDER" | "SAMPLE" | "TESTING" | "REPORT">("ALL");

  const statAlertsCount = useMemo(
    () => notifications.filter((n) => n.priority === "STAT" || n.priority === "URGENT").length,
    [notifications]
  );
  const sampleAlertsCount = useMemo(
    () => notifications.filter((n) => n.category === "SAMPLE").length,
    [notifications]
  );
  const reportAlertsCount = useMemo(
    () => notifications.filter((n) => n.category === "REPORT").length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (activeTab === "STAT" && item.priority !== "STAT" && item.priority !== "URGENT") return false;
      if (activeTab === "ORDER" && item.category !== "ORDER") return false;
      if (activeTab === "SAMPLE" && item.category !== "SAMPLE") return false;
      if (activeTab === "TESTING" && item.category !== "TESTING") return false;
      if (activeTab === "REPORT" && item.category !== "REPORT") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          item.title.toLowerCase().includes(q) ||
          item.message.toLowerCase().includes(q) ||
          (item.patientName || "").toLowerCase().includes(q) ||
          (item.doctorName || "").toLowerCase().includes(q) ||
          (item.orderId || "").toLowerCase().includes(q) ||
          (item.barcode || "").toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [notifications, activeTab, searchQuery]);

  const handleAction = (item: LabNotificationItem) => {
    markAsRead(item.id);
    if (item.actionUrl) {
      navigate(item.actionUrl);
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans antialiased overflow-hidden">
      {/* Global Lab Nav Sidebar */}
      <LabNav activeTab={"Notifications" as any} />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pl-64">
        {/* Sticky Header */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0b4a8b]">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Laboratory Notifications</h1>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-[#0b4a8b] text-white">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">Real-time alerts for incoming doctor orders, specimens, analyzers, and reports</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Dedicated Lab Notification Bell */}
            <LabNotificationBell size="md" />

            {/* Profile Dropdown */}
            <UserProfileDropdown
              userName={displayName}
              userSubtext={displayRole}
              userAvatar={avatarUrl}
              onLogout={() => setLogoutOpen(true)}
              profilePath="/lab/profile"
              notificationsPath="/lab/notifications"
            />
          </div>
        </header>

        {/* Main Body */}
        <main className="flex-1 p-8 space-y-7 max-w-[1500px] w-full mx-auto">
          {/* Top KPI Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Alerts */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Alerts</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl font-extrabold text-slate-900">{notifications.length}</h3>
                  <span className="text-xs text-slate-500 font-medium">({unreadCount} unread)</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Laboratory alerts</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0b4a8b] flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5" />
              </div>
            </div>

            {/* STAT & Urgent */}
            <div className="bg-white rounded-2xl p-5 border border-rose-200 shadow-xs flex items-center justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
              <div className="relative">
                <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">STAT / Urgent Alerts</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl font-extrabold text-rose-950">{statAlertsCount}</h3>
                  {statCount > 0 && (
                    <span className="text-xs font-bold text-rose-700 animate-pulse">
                      ● {statCount} require attention
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-rose-600/80 mt-0.5">High-priority doctor requests</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 relative">
                <Flame className="w-5 h-5" />
              </div>
            </div>

            {/* Samples Verification */}
            <div className="bg-white rounded-2xl p-5 border border-amber-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Samples Verification</span>
                <h3 className="text-2xl font-extrabold text-amber-950 mt-1">{sampleAlertsCount}</h3>
                <p className="text-[11px] text-amber-600/80 mt-0.5">Tubes awaiting accession</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <TestTube className="w-5 h-5" />
              </div>
            </div>

            {/* Reports Ready */}
            <div className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Reports Ready</span>
                <h3 className="text-2xl font-extrabold text-emerald-950 mt-1">{reportAlertsCount}</h3>
                <p className="text-[11px] text-emerald-600/80 mt-0.5">Ready for review or dispatch</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <FileCheck className="w-5 h-5" />
              </div>
            </div>
          </section>

          {/* Notifications Card Container */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Filter and Action Bar */}
            <div className="p-5 border-b border-slate-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl overflow-x-auto">
                  {(
                    [
                      ["ALL", `All Alerts (${notifications.length})`],
                      ["STAT", `STAT / Urgent (${statAlertsCount})`],
                      ["ORDER", "Doctor Orders"],
                      ["SAMPLE", "Sample Tubes"],
                      ["TESTING", "In Testing"],
                      ["REPORT", "Reports"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveTab(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        activeTab === key
                          ? key === "STAT"
                            ? "bg-rose-600 text-white"
                            : "bg-[#0b4a8b] text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Batch Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-[#0b4a8b] hover:bg-blue-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark All as Read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAll}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search lab notifications by patient, doctor, order ID, test name, or barcode..."
                  className="w-full pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0b4a8b] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Notifications Feed */}
            <div className="divide-y divide-slate-100">
              {isLoading ? (
                <div className="py-16 text-center text-slate-400">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs font-medium">Checking laboratory event stream…</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="py-20 text-center text-slate-400">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <Bell className="w-7 h-7 opacity-40" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700">No laboratory alerts found</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    There are currently no active notifications for this filter. All tests and orders are up to date.
                  </p>
                </div>
              ) : (
                filteredNotifications.map((item) => {
                  const isStat = item.priority === "STAT";
                  const isUrgent = item.priority === "URGENT";

                  return (
                    <div
                      key={item.id}
                      className={`p-5 hover:bg-slate-50/70 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        !item.read ? (isStat ? "bg-rose-50/25" : "bg-blue-50/20") : ""
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                            isStat
                              ? "bg-rose-100 text-rose-700 border-rose-200"
                              : isUrgent
                              ? "bg-amber-100 text-amber-800 border-amber-200"
                              : item.category === "SAMPLE"
                              ? "bg-blue-100 text-blue-700 border-blue-200"
                              : item.category === "REPORT"
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {isStat ? (
                            <Flame className="w-5 h-5 animate-pulse" />
                          ) : item.category === "SAMPLE" ? (
                            <TestTube className="w-5 h-5" />
                          ) : item.category === "TESTING" ? (
                            <FlaskConical className="w-5 h-5" />
                          ) : item.category === "REPORT" ? (
                            <FileCheck className="w-5 h-5" />
                          ) : (
                            <ClipboardList className="w-5 h-5" />
                          )}
                        </div>

                        {/* Text */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3
                              className={`text-sm font-bold ${
                                !item.read ? "text-slate-900" : "text-slate-700"
                              }`}
                            >
                              {item.title}
                            </h3>
                            {isStat ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200">
                                STAT URGENT
                              </span>
                            ) : isUrgent ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                URGENT
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                                {item.category}
                              </span>
                            )}
                            {!item.read && (
                              <span className="w-2 h-2 rounded-full bg-blue-600" title="Unread" />
                            )}
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                            {item.message}
                          </p>

                          <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                            <span className="flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3" />
                              {timeAgo(item.createdAt)}
                            </span>
                            {item.orderId && <span>• Order: <strong className="font-mono text-slate-600">{item.orderId}</strong></span>}
                            {item.patientName && <span>• Patient: <strong className="text-slate-700">{item.patientName}</strong></span>}
                            {item.doctorName && <span>• By: <strong className="text-slate-700">{item.doctorName}</strong></span>}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                        {!item.read && (
                          <button
                            type="button"
                            onClick={() => markAsRead(item.id)}
                            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-[#0b4a8b] hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                            title="Mark as Read"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => dismissNotification(item.id)}
                          className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
                          title="Dismiss Notification"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAction(item)}
                          className="px-3.5 py-2 rounded-xl bg-[#0b4a8b] hover:bg-blue-800 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>{item.actionLabel}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing <strong>{filteredNotifications.length}</strong> of <strong>{notifications.length}</strong> alerts
              </span>
              <button
                type="button"
                onClick={refetch}
                className="text-[11px] font-semibold text-[#0b4a8b] hover:underline cursor-pointer"
              >
                Refresh event stream
              </button>
            </div>
          </section>
        </main>
      </div>

      <ConfirmationDialog
        isOpen={logoutOpen}
        title="Confirm Logout"
        message="Are you sure you want to log out?"
        confirmText="Log Out"
        cancelText="Cancel"
        onConfirm={handleLogout}
        onCancel={() => setLogoutOpen(false)}
        variant="danger"
      />
    </div>
  );
}
