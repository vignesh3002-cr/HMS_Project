import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { employeeApi, EmployeeRecord } from "@/api/employee.api";
import { patientApi, PatientRecord } from "@/api/patient.api";

const DISMISSED_NOTIFICATIONS_KEY = "hms_dismissed_notifications";

function loadDismissedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_NOTIFICATIONS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissedIds(ids: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_NOTIFICATIONS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) -- dismissals
    // just won't survive a refresh in that case, no need to surface an error.
  }
}

type NotificationRole = "doctor" | "staff" | "admin" | "patient";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
  createdAt: number;
  role: NotificationRole;
  unread?: boolean;
};

const ROLE_TITLES: Record<NotificationRole, string> = {
  doctor: "New Doctor Added",
  staff: "New Staff Added",
  admin: "New Admin Added",
  patient: "New Patient Registered",
};

function roleTypeToNotificationRole(roleType?: string | null): NotificationRole {
  const normalized = (roleType || "").toUpperCase();
  if (normalized === "DOCTOR") return "doctor";
  if (normalized === "BRANCH_ADMIN" || normalized === "ADMIN") return "admin";
  return "staff";
}

function formatEmployeeName(e: EmployeeRecord) {
  return [e.first_name, e.middle_name, e.last_name].filter(Boolean).join(" ");
}

function formatPatientName(p: PatientRecord) {
  return [p.patient_first_name, p.patient_middle_name, p.patient_last_name]
    .filter(Boolean)
    .join(" ");
}

function timeAgo(timestamp: number) {
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const Icon = ({ role }: { role: NotificationRole }) => {
  if (role === "doctor") {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#dde1ff] text-[#003ec7]">
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.8">
          <path d="M9 3v4a3 3 0 0 0 6 0V3" />
          <path d="M6 5v4a6 6 0 0 0 12 0V5" />
          <path d="M12 15v4" />
          <circle cx="12" cy="21" r="1.5" />
        </svg>
      </div>
    );
  }

  if (role === "admin") {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#ffdad6] text-[#93000a]">
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.8">
          <path d="M12 3 5 6v5c0 4.5 2.9 8.2 7 10 4.1-1.8 7-5.5 7-10V6l-7-3Z" />
          <path d="m9.5 12 1.7 1.7 3.6-3.8" />
        </svg>
      </div>
    );
  }

  if (role === "patient") {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#eaedff] text-[#434656]">
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.8">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c1-4 4-6 7-6s6 2 7 6" />
        </svg>
      </div>
    );
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#dae2fd] text-[#003ec7]">
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.8">
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4M16 3v4M4 9h16M8 13h3M8 16h5" />
      </svg>
    </div>
  );
};

export default function Notifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dismissedIdsRef = useRef<Set<string>>(loadDismissedIds());

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [employeesRes, patientsRes] = await Promise.allSettled([
        employeeApi.getAll({ limit: 20 }),
        patientApi.getAll({ limit: 20 }),
      ]);

      const items: NotificationItem[] = [];

      if (employeesRes.status === "fulfilled") {
        const employees = employeesRes.value.data?.data?.employees || [];
        employees.forEach((e) => {
          const role = roleTypeToNotificationRole(e.user_table?.role_type);
          const createdAtStr = e.user_table?.created_at;
          const createdAt = createdAtStr ? new Date(createdAtStr).getTime() : Date.now();
          items.push({
            id: `employee-${e.employee_id}`,
            title: ROLE_TITLES[role],
            message: `${formatEmployeeName(e)} was added as ${
              role === "doctor" ? "a doctor" : role === "admin" ? "an admin" : "staff"
            }.`,
            time: createdAtStr ? timeAgo(createdAt) : "",
            createdAt,
            role,
          });
        });
      }

      if (patientsRes.status === "fulfilled") {
        const patients = patientsRes.value.data?.data?.patients || [];
        patients.forEach((p) => {
          const createdAtStr = p.user_table?.created_at;
          const createdAt = createdAtStr ? new Date(createdAtStr).getTime() : Date.now();
          items.push({
            id: `patient-${p.patient_id}`,
            title: ROLE_TITLES.patient,
            message: `${formatPatientName(p)} was registered as a patient.`,
            time: createdAtStr ? timeAgo(createdAt) : "",
            createdAt,
            role: "patient",
          });
        });
      }

      items.sort((a, b) => b.createdAt - a.createdAt);
      setNotifications(items.filter((item) => !dismissedIdsRef.current.has(item.id)));

      if (employeesRes.status === "rejected" && patientsRes.status === "rejected") {
        setError("Couldn't load notifications from the server.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllAsRead = () => {
    setReadIds(new Set(notifications.map((n) => n.id)));
  };

  const removeNotification = (id: string) => {
    dismissedIdsRef.current.add(id);
    saveDismissedIds(dismissedIdsRef.current);

    setNotifications((items) => items.filter((item) => item.id !== id));
    setReadIds((ids) => {
      const next = new Set(ids);
      next.delete(id);
      return next;
    });
  };

  const clearAll = () => {
    notifications.forEach((item) => dismissedIdsRef.current.add(item.id));
    saveDismissedIds(dismissedIdsRef.current);

    setNotifications([]);
    setReadIds(new Set());
  };

  const { todayItems, yesterdayItems, earlierItems } = useMemo(() => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    const today: NotificationItem[] = [];
    const yest: NotificationItem[] = [];
    const earlier: NotificationItem[] = [];

    notifications.forEach((item) => {
      const d = new Date(item.createdAt);
      if (isSameDay(d, now)) today.push(item);
      else if (isSameDay(d, yesterday)) yest.push(item);
      else earlier.push(item);
    });

    return { todayItems: today, yesterdayItems: yest, earlierItems: earlier };
  }, [notifications]);

  const renderNotification = (item: NotificationItem) => {
    const unread = !readIds.has(item.id);
    return (
      <article
        key={item.id}
        className={[
          "relative flex items-start gap-4 overflow-hidden rounded-xl bg-white p-4",
          "shadow-[0_2px_8px_rgba(0,62,199,0.06)]",
          unread ? "" : "opacity-80",
        ].join(" ")}
      >
        {unread && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#003ec7]" />}

        <Icon role={item.role} />

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-start justify-between gap-3">
            <h3 className="truncate text-xs font-semibold tracking-[0.02em] text-[#131b2e]">
              {item.title}
            </h3>

            <div className="flex shrink-0 items-center gap-2">
              <span
                className={[
                  "text-[11px] font-medium leading-[14px]",
                  unread ? "text-[#003ec7]" : "text-[#434656]",
                ].join(" ")}
              >
                {item.time}
              </span>

              {unread && (
                <span
                  aria-label="Unread indicator"
                  className="h-2 w-2 rounded-full bg-[#003ec7]"
                />
              )}

              <button
                type="button"
                onClick={() => removeNotification(item.id)}
                aria-label="Delete notification"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[#8a8fa3] transition-colors hover:bg-[#eef1f9] hover:text-[#434656] focus:outline-none focus:ring-2 focus:ring-[#003ec7]"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          <p className="text-[13px] font-normal leading-[18px] text-[#434656]">
            {item.message}
          </p>
        </div>
      </article>
    );
  };

  const hasAny = todayItems.length > 0 || yesterdayItems.length > 0 || earlierItems.length > 0;

  return (
    <div className="flex w-full flex-col font-['Inter',sans-serif] text-[#131b2e] antialiased">
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
        <h1 className="font-['Hanken_Grotesk',sans-serif] text-sm font-semibold leading-6 text-[#131b2e]">
          Notifications
        </h1>

        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={markAllAsRead}
            className="text-xs font-semibold tracking-[0.02em] text-[#003ec7] transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-[#003ec7]"
          >
            Mark all as read
          </button>

          <button
            type="button"
            onClick={clearAll}
            disabled={notifications.length === 0}
            className="text-xs font-semibold tracking-[0.02em] text-[#93000a] transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-[#93000a] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear all
          </button>
        </div>
      </header>

      <main className="flex max-h-[420px] w-full flex-col gap-6 overflow-y-auto bg-[#f8fafc] p-4">
        {isLoading && (
          <p className="text-center text-xs text-[#434656]">Loading notifications...</p>
        )}

        {!isLoading && error && (
          <p className="text-center text-xs text-[#93000a]">{error}</p>
        )}

        {!isLoading && !error && !hasAny && (
          <p className="text-center text-xs text-[#434656]">No notifications yet.</p>
        )}

        {!isLoading && todayItems.length > 0 && (
          <section>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#434656]">
              Today
            </h2>
            <div className="flex flex-col gap-1">{todayItems.map(renderNotification)}</div>
          </section>
        )}

        {!isLoading && yesterdayItems.length > 0 && (
          <>
            {todayItems.length > 0 && (
              <div className="ml-16 h-px w-[calc(100%-4rem)] rounded-full bg-[#c3c5d9]" />
            )}
            <section>
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#434656]">
                Yesterday
              </h2>
              <div className="flex flex-col gap-1">{yesterdayItems.map(renderNotification)}</div>
            </section>
          </>
        )}

        {!isLoading && earlierItems.length > 0 && (
          <>
            {(todayItems.length > 0 || yesterdayItems.length > 0) && (
              <div className="ml-16 h-px w-[calc(100%-4rem)] rounded-full bg-[#c3c5d9]" />
            )}
            <section>
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#434656]">
                Earlier
              </h2>
              <div className="flex flex-col gap-1">{earlierItems.map(renderNotification)}</div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
