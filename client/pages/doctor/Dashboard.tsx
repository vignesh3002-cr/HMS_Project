import React, { useEffect, useRef, useState } from "react";
import { getActiveBranchId } from "../../api/axios";
import {
  doctorDashboardApi,
  type DashboardAppointment,
  type DashboardDoctorResponse,
  type DashboardSchedule,
} from "../../api/doctorDashboard.api";
import { activeBranches } from "../../lib/utils";

type AppointmentStatus = "Check Out" | "Check In" | "Cancelled";

interface Appointment {
  patient: string;
  image: string;
  dateTime: string;
  phone: string;
  status: AppointmentStatus;
}

interface AvailabilityItem {
  day: string;
  time?: string;
  leave?: boolean;
}

const chartData = [
  { day: "Mon", completed: 153.59, rescheduled: 51.19 },
  { day: "Tue", completed: 122.88, rescheduled: 81.91 },
  { day: "Wed", completed: 184.31, rescheduled: 30.72 },
  { day: "Thu", completed: 112.63, rescheduled: 92.16 },
  { day: "Fri", completed: 174.06, rescheduled: 40.95 },
  { day: "Sat", completed: 81.91, rescheduled: 20.47 },
];

const periods = ["Last 7 Days", "Last 30 Days", "This Month", "This Year"];

const fallbackHospital = "Central Hospital (Egmore)";

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name:
    | "bell"
    | "calendar"
    | "chevron"
    | "clock"
    | "users"
    | "appointments"
    | "cancel"
    | "trend";
  className?: string;
}) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "bell") {
    return (
      <svg {...common}>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    );
  }

  if (name === "clock") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15 14" />
      </svg>
    );
  }

  if (name === "users") {
    return (
      <svg {...common}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }

  if (name === "appointments") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    );
  }

  if (name === "cancel") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <line x1="9" y1="9" x2="15" y2="15" />
        <line x1="15" y1="9" x2="9" y2="15" />
      </svg>
    );
  }

  if (name === "trend") {
    return (
      <svg {...common}>
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function statusClasses(status: AppointmentStatus) {
  if (status === "Check Out") {
    return "border border-green-200 bg-green-100 text-green-700";
  }

  if (status === "Check In") {
    return "border border-amber-200 bg-amber-100 text-amber-700";
  }

  return "border border-red-200 bg-red-100 text-red-700";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value: string) {
  if (!value) return "";

  // Backend schedule/appointment times can arrive as:
  // 11:00, 11:00:00, or 1970-01-01T11:00:00.000Z.
  // For schedule values we must not let the browser convert the
  // UTC placeholder date into the user's local timezone.
  const timeMatch = value.match(/(?:T|\s)?(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?/);

  if (timeMatch) {
    let hour = Number(timeMatch[1]);
    const minute = timeMatch[2];
    const suffix = hour >= 12 ? "PM" : "AM";

    hour = hour % 12 || 12;
    return `${String(hour).padStart(2, "0")}:${minute} ${suffix}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatScheduleRange(start?: string | null, end?: string | null) {
  if (!start || !end) return "";

  return `${formatTime(start)} - ${formatTime(end)}`;
}

function mapAppointmentStatus(status: string): AppointmentStatus {
  switch (status) {
    case "CANCELLED":
      return "Cancelled";
    case "COMPLETED":
      return "Check Out";
    case "CHECKED_IN":
    case "IN_CONSULTATION":
      return "Check In";
    default:
      return "Check In";
  }
}

export default function DoctorDashboard() {
  const [periodOpen, setPeriodOpen] = useState(false);
  const [hospitalOpen, setHospitalOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [period, setPeriod] = useState("Last 7 Days");
  const [hospital, setHospital] = useState(fallbackHospital);
  const [doctor, setDoctor] = useState<DashboardDoctorResponse["data"] | null>(null);
  const [dashboardAppointments, setDashboardAppointments] = useState<Appointment[]>([]);
  const [dashboardSchedules, setDashboardSchedules] = useState<DashboardSchedule[]>([]);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [cancelledAppointments, setCancelledAppointments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  const periodRef = useRef<HTMLDivElement>(null);
  const hospitalRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async (showLoader = false) => {
      try {
        if (showLoader) setLoading(true);
        setDashboardError("");

        const authResponse = await doctorDashboardApi.getCurrentUser();
        const employeeId = authResponse.data.user?.employee_id;

        if (!employeeId) {
          throw new Error("No employee ID is linked to the logged-in user.");
        }

        const today = new Date().toISOString().slice(0, 10);
        const employeeResponse = await doctorDashboardApi.getDoctor(employeeId);
        const employeeData = employeeResponse.data.data;

        if (cancelled) return;

        setDoctor(employeeData);
        setDashboardSchedules(employeeData.doctorSchedules ?? []);

        const firstActiveBranch = employeeData.branches?.find(
          (branch) => branch.status === undefined || branch.status === 1
        );

        // Prefer the branch selected by the existing HMS branch selector.
        // If none is selected, fall back to the doctor's active branch.
        const selectedBranchId = getActiveBranchId();
        const branchId = selectedBranchId || firstActiveBranch?.branch_id;

        if (firstActiveBranch?.branch_name) {
          setHospital(firstActiveBranch.branch_name);
        }

        const [appointmentsResponse, cancelledResponse] = await Promise.all([
          doctorDashboardApi.getAppointments({
            employeeId,
            branchId,
            date: today,
            page: 1,
            limit: 100,
          }),
          doctorDashboardApi.getAppointments({
            employeeId,
            branchId,
            date: today,
            status: "CANCELLED",
            page: 1,
            limit: 1,
          }),
        ]);

        if (cancelled) return;

        setTotalAppointments(appointmentsResponse.data.data.total);
        setCancelledAppointments(cancelledResponse.data.data.total);

        const mappedAppointments = appointmentsResponse.data.data.appointments.map(
          (item: DashboardAppointment): Appointment => ({
            patient: [
              item.patient_bio_data?.patient_first_name,
              item.patient_bio_data?.patient_middle_name,
              item.patient_bio_data?.patient_last_name,
            ]
              .filter(Boolean)
              .join(" ") || "Unknown Patient",
            image:
              "https://www.figma.com/api/mcp/asset/0174143d-d6a1-4d40-96d6-22a8b499a788.png",
            dateTime: `${formatDate(item.appointment_date)} - ${formatTime(
              item.appointment_time
            )}`,
            phone: item.patient_bio_data?.patient_primary_mobile || "-",
            status: mapAppointmentStatus(item.status),
          })
        );

        setDashboardAppointments(mappedAppointments);
      } catch (error: any) {
        console.error("Failed to load doctor dashboard:", error);
        if (!cancelled) {
          setDashboardError(
            error?.response?.data?.message ||
              error?.message ||
              "Failed to load dashboard data."
          );
        }
      } finally {
        if (!cancelled && showLoader) setLoading(false);
      }
    };

    // Initial load.
    void loadDashboard(true);

    // Keep today's appointments/counts synchronized with the backend.
    // The existing appointment API is REST-based, so polling is used instead
    // of pretending the endpoint is WebSocket real-time.
    const intervalId = window.setInterval(() => {
      void loadDashboard(false);
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;

      if (!periodRef.current?.contains(target)) setPeriodOpen(false);
      if (!hospitalRef.current?.contains(target)) setHospitalOpen(false);
      if (!notificationRef.current?.contains(target)) {
        setNotificationOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPeriodOpen(false);
        setHospitalOpen(false);
        setNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const displayHospital = hospital || fallbackHospital;

  const todayDate = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const doctorName = doctor?.employee
    ? `Dr. ${doctor.employee.first_name} ${doctor.employee.last_name}`
    : "Dr. Jenkins";

  const doctorId = doctor?.employee?.employee_id || "-";


  const availability = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
  ].map((day) => {
    const schedule = dashboardSchedules.find(
      (item) => item.day_of_week?.toUpperCase() === day && item.is_active !== false
    );

    return {
      day: day.slice(0, 3).charAt(0) + day.slice(1, 3).toLowerCase(),
      time: schedule
        ? formatScheduleRange(schedule.start_time, schedule.end_time)
        : undefined,
      leave: !schedule,
    };
  });

  return (
    <main className="min-h-screen w-full bg-white font-['Inter',sans-serif] text-[#181c1e]">
      <div className="mx-auto w-full max-w-[1120px] px-8 py-8 max-[1100px]:max-w-full max-[1100px]:px-6 max-[700px]:px-4 max-[700px]:py-5">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between max-[700px]:items-start">
          <div className="flex flex-col gap-2">
            <h1 className="font-['Manrope',sans-serif] text-[28px] font-bold leading-[34px] tracking-[-0.56px] text-[#191c1e] max-[700px]:text-2xl max-[700px]:leading-8">
              Welcome back, {doctorName}
            </h1>

            <div className="flex items-center gap-6 max-[700px]:flex-wrap max-[700px]:gap-2.5">
              <div className="flex items-center gap-1">
                <span className="font-['Manrope',sans-serif] text-xs font-bold uppercase leading-4 tracking-[0.6px] text-[#434654]">
                  {todayDate}
                </span>
                <span className="rounded bg-[#dae2ff] px-2 py-0.5 font-['Manrope',sans-serif] text-sm font-bold leading-5 tracking-[-0.14px] text-[#003d9b]">
                  {doctorId}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[17px] leading-none text-yellow-500">
                  ★
                </span>
                <span className="text-xs font-bold text-[#191c1e]">4.9</span>
                <span className="text-[11px] font-medium text-[#434654]">
                  (128 reviews)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 max-[700px]:hidden">
            <div className="relative" ref={notificationRef}>
              <button
                type="button"
                aria-label="Notifications"
                onClick={() => setNotificationOpen((value) => !value)}
                className="flex h-12 w-12 items-center justify-center rounded-xl text-[#434654] transition hover:bg-slate-100"
              >
                <Icon name="bell" />
              </button>

              {notificationOpen && (
                <div className="absolute right-0 top-14 z-50 w-[300px] rounded-[10px] border border-slate-200 bg-white p-[18px] shadow-[0_10px_30px_rgba(0,0,0,0.15)]">
                  <h3 className="mb-3 text-base font-semibold">
                    Notifications
                  </h3>

                  <div className="border-b border-slate-100 py-2.5 text-[13px] text-slate-600">
                    You have 3 upcoming appointments today.
                  </div>

                  <div className="border-b border-slate-100 py-2.5 text-[13px] text-slate-600">
                    Susan Babin checked in.
                  </div>

                  <div className="py-2.5 text-[13px] text-slate-600">
                    Your weekly appointment report is ready.
                  </div>
                </div>
              )}
            </div>

            <div className="h-8 w-px bg-[#c3c6d6]" />

            <div className="flex items-center gap-2 pl-2">
              <span className="font-['Manrope',sans-serif] text-xs font-bold tracking-[0.6px] text-[#434654]">
                March 24, 2026
              </span>
              <Icon name="calendar" className="h-5 w-5 text-[#434654]" />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-[minmax(0,1fr)_336px] items-start gap-6 max-[900px]:grid-cols-1">
          {/* Left column */}
          <section className="min-w-0">
            {/* Metrics */}
            <div className="mb-[34px] grid h-[142px] grid-cols-3 gap-6 max-[700px]:h-auto max-[700px]:grid-cols-1">
              <article className="flex min-w-0 flex-col justify-between rounded-xl border border-[#c3c6d6] bg-white p-[21px] shadow-[0_4px_6px_rgba(0,0,0,0.05)] max-[700px]:min-h-[142px]">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex flex-col gap-1">
                    <div className="text-xs font-medium uppercase leading-4 tracking-[0.6px] text-[#434654]">
                      Total
                      <br />
                      Appointments
                    </div>

                    <div className="text-2xl font-semibold leading-8 tracking-[-0.24px]">
                      {loading ? "—" : totalAppointments}
                    </div>
                  </div>

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#003d9b]/10 text-[#003d9b]">
                    <Icon name="appointments" />
                  </div>
                </div>

                <div className="pt-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-[5px] flex-1 items-end gap-0.5 overflow-hidden rounded-full">
                      <span className="h-1 flex-1 rounded-[1px] bg-[#003d9b]" />
                      <span className="h-[5px] flex-1 rounded-[1px] bg-[#003d9b]" />
                      <span className="h-[6px] flex-1 rounded-[1px] bg-[#003d9b]" />
                      <span className="h-[7px] flex-1 rounded-[1px] bg-[#003d9b]" />
                      <span className="h-[6px] flex-1 rounded-[1px] bg-[#003d9b]" />
                    </div>

                    <span className="whitespace-nowrap text-xs font-bold text-[#003d9b]">
                      +12%
                    </span>
                  </div>
                </div>
              </article>

              <article className="flex min-w-0 flex-col justify-between rounded-xl border border-[#c3c6d6] bg-white p-[21px] shadow-[0_4px_6px_rgba(0,0,0,0.05)] max-[700px]:min-h-[142px]">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex flex-col gap-1">
                    <div className="text-xs font-medium uppercase leading-4 tracking-[0.6px] text-[#434654]">
                      Total Patients
                    </div>

                    <div className="text-2xl font-semibold leading-8 tracking-[-0.24px]">
                      1,284
                    </div>
                  </div>

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
                    <Icon name="users" />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 text-base leading-6 text-green-600">
                  <Icon name="trend" className="h-3.5 w-3.5" />
                  <span>84 new this month</span>
                </div>
              </article>

              <article className="flex min-w-0 flex-col justify-between rounded-xl border border-[#c3c6d6] bg-white p-[21px] shadow-[0_4px_6px_rgba(0,0,0,0.05)] max-[700px]:min-h-[142px]">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex flex-col gap-1">
                    <div className="text-xs font-medium uppercase leading-4 tracking-[0.6px] text-[#434654]">
                      Cancelled
                    </div>

                    <div className="text-2xl font-semibold leading-8 tracking-[-0.24px]">
                      {loading ? "—" : cancelledAppointments}
                    </div>
                  </div>

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-600/10 text-red-700">
                    <Icon name="cancel" />
                  </div>
                </div>

                <div className="pt-4 text-xs font-medium leading-4 text-[#434654]">
                  12 slots remaining today
                </div>
              </article>
            </div>

            {/* Appointments */}
            <section className="mb-[29px] h-[293px] overflow-hidden rounded-lg border border-[#c3c6d6] bg-white max-[700px]:overflow-x-auto">
              <div className="flex h-[54px] items-center justify-between border-b border-[#c3c6d6] px-4">
                <h2 className="font-['Manrope',sans-serif] text-lg font-bold leading-6 text-[#191c1e]">
                  Today's Appointments
                </h2>

                <button
                  type="button"
                  onClick={() => alert("Opening all appointments...")}
                  className="font-['Manrope',sans-serif] text-xs font-bold uppercase tracking-[0.6px] text-[#003d9b]"
                >
                  View All
                </button>
              </div>

              {dashboardError && (
                <div className="px-4 py-2 text-xs text-red-600">
                  {dashboardError}
                </div>
              )}

              <table className="w-full table-fixed border-collapse max-[700px]:min-w-[650px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="w-[31%] border-b border-slate-200 px-5 py-3 text-left font-['Manrope',sans-serif] text-xs font-bold leading-4 text-slate-500">
                      Patient
                    </th>

                    <th className="w-[30%] border-b border-slate-200 px-5 py-3 text-center font-['Manrope',sans-serif] text-xs font-bold leading-4 text-slate-500">
                      Date &amp; Time
                    </th>

                    <th className="w-[22%] border-b border-slate-200 px-5 py-3 text-center font-['Manrope',sans-serif] text-xs font-bold leading-4 text-slate-500">
                      Phone
                    </th>

                    <th className="w-[17%] border-b border-slate-200 px-5 py-3 text-center font-['Manrope',sans-serif] text-xs font-bold leading-4 text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {dashboardAppointments.map((appointment) => (
                    <tr
                      key={`${appointment.patient}-${appointment.dateTime}`}
                    >
                      <td className="h-[50px] overflow-hidden border-b border-slate-100 px-5 py-2 text-xs text-slate-600">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-100">
                            <img
                              src={appointment.image}
                              alt={appointment.patient}
                              className="h-full w-full object-cover"
                            />
                          </div>

                          <span className="overflow-hidden text-ellipsis whitespace-nowrap font-['Manrope',sans-serif] text-xs font-bold text-slate-800">
                            {appointment.patient}
                          </span>
                        </div>
                      </td>

                      <td className="h-[50px] overflow-hidden text-ellipsis whitespace-nowrap border-b border-slate-100 px-5 py-2 text-center font-['Manrope',sans-serif] text-xs text-slate-600">
                        {appointment.dateTime.split(" - ").map((part, index) => (
                          <React.Fragment key={`${appointment.patient}-${index}`}>
                            {index > 0 && <br />}
                            {part}
                          </React.Fragment>
                        ))}
                      </td>

                      <td className="h-[50px] overflow-hidden text-ellipsis whitespace-nowrap border-b border-slate-100 px-5 py-2 text-center font-['Manrope',sans-serif] text-xs text-slate-600">
                        {appointment.phone}
                      </td>

                      <td className="h-[50px] border-b border-slate-100 px-5 py-2 text-center">
                        <span
                          className={`inline-flex items-center justify-center rounded px-2 py-0.5 font-['Manrope',sans-serif] text-[10px] font-medium leading-5 ${statusClasses(
                            appointment.status
                          )}`}
                        >
                          {appointment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* Trends */}
            <section className="h-[370px] rounded-xl border border-[#c3c6d6] bg-white p-[25px] shadow-[0_4px_6px_rgba(0,0,0,0.05)]">
              <div className="mb-6 flex items-center justify-between max-[700px]:flex-col max-[700px]:items-start max-[700px]:gap-4">
                <div>
                  <h2 className="text-lg font-semibold leading-6 text-[#181c1e]">
                    Appointment Trends
                  </h2>

                  <p className="text-xs font-medium leading-4 text-[#434654]">
                    Weekly performance analysis
                  </p>
                </div>

                <div className="flex items-center gap-4 max-[700px]:w-full max-[700px]:justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#003d9b]" />

                    <span className="text-xs font-medium leading-4 text-[#181c1e]">
                      Completed
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#c3c6d6]" />

                    <span className="text-xs font-medium leading-4 text-[#181c1e]">
                      Rescheduled
                    </span>
                  </div>

                  <div className="relative" ref={periodRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setPeriodOpen((value) => !value);
                        setHospitalOpen(false);
                      }}
                      className="flex h-7 min-w-[116px] items-center justify-between gap-[15px] rounded-md bg-[#ebeef1] px-3 text-xs font-medium text-[#181c1e]"
                    >
                      <span>{period}</span>

                      <Icon
                        name="chevron"
                        className="h-4 w-4 text-slate-500"
                      />
                    </button>

                    {periodOpen && (
                      <div className="absolute right-0 top-[34px] z-30 w-[140px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-[0_5px_15px_rgba(0,0,0,0.12)]">
                        {periods.map((item) => (
                          <button
                            type="button"
                            key={item}
                            onClick={() => {
                              setPeriod(item);
                              setPeriodOpen(false);
                            }}
                            className="block w-full px-3 py-2.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex h-[256px] items-end justify-center gap-6 px-4 max-[700px]:gap-2 max-[700px]:px-0">
                {chartData.map((item) => (
                  <div
                    key={item.day}
                    className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                  >
                    <div className="flex h-[208px] w-full items-end justify-center gap-1.5 pb-1">
                      <div
                        className="w-4 rounded-t-[2px] bg-[#003d9b]"
                        style={{ height: `${item.completed}px` }}
                      />

                      <div
                        className="w-4 rounded-t-[2px] bg-[#c3c6d6]"
                        style={{ height: `${item.rescheduled}px` }}
                      />
                    </div>

                    <span className="text-xs font-medium leading-4 text-[#434654]">
                      {item.day}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </section>

          {/* Right column */}
          <aside className="min-w-0 max-[900px]:grid max-[900px]:grid-cols-2 max-[900px]:gap-6 max-[700px]:grid-cols-1">
            {/* Availability */}
            <section className="mb-6 overflow-hidden rounded border border-slate-200 bg-white shadow-[0_1px_1.5px_rgba(0,0,0,0.1),0_1px_1px_rgba(0,0,0,0.06)] max-[900px]:mb-0">
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-5">
                <h2 className="text-lg font-bold leading-7 text-slate-900">
                  Availability
                </h2>

                <div className="relative" ref={hospitalRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setHospitalOpen((value) => !value);
                      setPeriodOpen(false);
                    }}
                    className="relative min-h-[50px] min-w-[153px] rounded border border-slate-200 bg-white px-[13px] py-[5px] pr-[33px] text-left text-sm leading-5 text-slate-800"
                  >
                    {displayHospital}

                    <Icon
                      name="chevron"
                      className="absolute right-2 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-500"
                    />
                  </button>

                  {hospitalOpen && (
                    <div className="absolute right-0 top-[55px] z-30 w-[180px] overflow-hidden rounded border border-slate-200 bg-white shadow-[0_5px_15px_rgba(0,0,0,0.12)]">
                      {(activeBranches(doctor?.branches).length
                        ? activeBranches(doctor?.branches).map((branch) => branch.branch_name)
                        : [fallbackHospital]).map((item) => (
                        <button
                          type="button"
                          key={item}
                          onClick={() => {
                            setHospital(item);
                            setHospitalOpen(false);
                          }}
                          className="block w-full px-3 py-2.5 text-left text-[13px] text-slate-700 hover:bg-slate-50"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5">
                {availability.map((item) => (
                  <div
                    key={item.day}
                    className="flex min-h-12 items-center justify-between gap-3 border-b border-slate-50 last:border-0"
                  >
                    <span className="w-12 shrink-0 text-base font-semibold leading-6 text-slate-700">
                      {item.day}
                    </span>

                    {item.leave ? (
                      <span className="flex-1 text-right text-sm font-medium leading-5 text-red-500">
                        Leave
                      </span>
                    ) : (
                      <span className="flex flex-1 items-center justify-end gap-2 whitespace-nowrap text-sm leading-5 text-slate-500">
                        {item.time}
                        <Icon name="clock" className="h-4 w-4 shrink-0" />
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-5">
                <button
                  type="button"
                  onClick={() => alert("Opening availability editor...")}
                  className="h-9 w-full rounded bg-slate-100 text-sm font-bold leading-5 text-[#0047ab] transition hover:bg-slate-200"
                >
                  Edit Availability
                </button>
              </div>
            </section>

            {/* Feedback */}
            <section className="h-[370px] rounded-xl border border-[#c3c6d6] bg-white p-[25px] shadow-[0_4px_6px_rgba(0,0,0,0.05)]">
              <h2 className="mb-4 text-lg font-semibold leading-6 text-[#181c1e]">
                Patient Feedback
              </h2>

              <div className="flex flex-col gap-4">
                <article className="flex flex-col gap-2 rounded-lg bg-[#f1f4f7] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold leading-[18px] tracking-[0.13px] text-[#181c1e]">
                      Sarah J.
                    </span>

                    <div className="flex gap-px text-xs text-yellow-500">
                      ★★★★★
                    </div>
                  </div>

                  <p className="text-xs italic leading-[18px] text-[#434654]">
                    "Dr. Smith was incredibly thorough and took the time to
                    explain my results clearly."
                  </p>
                </article>

                <article className="flex flex-col gap-2 rounded-lg bg-[#f1f4f7] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold leading-[18px] tracking-[0.13px] text-[#181c1e]">
                      Michael R.
                    </span>

                    <div className="flex gap-px text-xs text-yellow-500">
                      ★★★★☆
                    </div>
                  </div>

                  <p className="text-xs italic leading-[18px] text-[#434654]">
                    "Quick consultation, very professional staff. Highly
                    recommend for cardio checkups."
                  </p>
                </article>

                <div className="border-t border-[#c3c6d6] pb-2 pt-[9px] text-center">
                  <button
                    type="button"
                    onClick={() => alert("Opening all patient reviews...")}
                    className="text-xs font-medium leading-4 text-[#003d9b]"
                  >
                    Read All Reviews
                  </button>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}