import { useState, type ReactNode } from "react";
import {
  APPOINTMENTS,
  AVAILABILITY,
  FEEDBACK,
  TREND_DATA,
} from "../data/mockData";
import type {
  Appointment,
  AvailabilitySlot,
  FeedbackEntry,
  TrendPoint,
} from "../types";

/* ---------- TopBar ---------- */

interface TopBarProps {
  doctorName: string;
  doctorId: string;
  rating: number;
  reviewCount: number;
  date: string;
}

function TopBar({
  doctorName,
  doctorId,
  rating,
  reviewCount,
  date,
}: TopBarProps) {
  return (
    <div className="flex items-start justify-between px-8 py-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome back, {doctorName}
        </h2>

        <div className="flex items-center gap-3 mt-2">
          <span className="text-sm text-gray-500">{date}</span>

          <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
            {doctorId}
          </span>

          <span className="flex items-center gap-1 text-sm text-gray-700">
            <span className="text-amber-400">★</span>
            {rating.toFixed(1)}
            <span className="text-gray-400">
              ({reviewCount} reviews)
            </span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          aria-label="Notifications"
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 01-3.4 0" />
          </svg>
        </button>

        <span className="h-6 w-px bg-gray-200" />

        <span className="flex items-center gap-2 text-sm text-gray-600">
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <rect x="3" y="4" width="18" height="17" rx="2" />
            <path d="M3 9h18M8 2v4M16 2v4" />
          </svg>
          {date}
        </span>
      </div>
    </div>
  );
}

/* ---------- StatCard ---------- */

interface StatCardProps {
  label: string;
  value: string;
  iconBg: string;
  icon: "calendar" | "patients" | "cancelled";
  footer: ReactNode;
}

function StatIcon({ icon }: { icon: StatCardProps["icon"] }) {
  const common = "w-4 h-4";

  switch (icon) {
    case "calendar":
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M3 9h18M8 2v4M16 2v4" />
        </svg>
      );

    case "patients":
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="9" cy="8" r="3" />
          <path d="M2 20c0-3.3 2.7-6 7-6s7 2.7 7 6" />
          <circle cx="17" cy="8" r="2.5" />
          <path d="M15 20c0-2.4 1-4.3 3-5.2" />
        </svg>
      );

    case "cancelled":
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M9 9l6 6M15 9l-6 6" />
        </svg>
      );
  }
}

function StatCard({
  label,
  value,
  iconBg,
  icon,
  footer,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex-1 min-w-[190px]">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold tracking-wide text-gray-400">
          {label}
        </p>

        <span
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}
        >
          <StatIcon icon={icon} />
        </span>
      </div>

      <p className="text-3xl font-bold text-gray-900 mt-2">
        {value}
      </p>

      <div className="mt-3">{footer}</div>
    </div>
  );
}

/* ---------- AppointmentsTable ---------- */

const STATUS_STYLES: Record<Appointment["status"], string> = {
  "Check Out": "bg-emerald-50 text-emerald-600",
  "Check In": "bg-amber-50 text-amber-600",
  Cancelled: "bg-red-50 text-red-500",
};

interface AppointmentsTableProps {
  appointments: Appointment[];
  visibleCount?: number;
  showAll: boolean;
  onToggleShowAll: () => void;
}

function AppointmentsTable({
  appointments,
  visibleCount = 4,
  showAll,
  onToggleShowAll,
}: AppointmentsTableProps) {
  const visibleAppointments = showAll
    ? appointments
    : appointments.slice(0, visibleCount);

  const hasMore = appointments.length > visibleCount;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">
          Today's Appointments
        </h3>

        {hasMore && (
          <button
            onClick={onToggleShowAll}
            className="text-sm font-medium text-blue-700 hover:underline text-right inline-block min-w-[68px]"
          >
            {showAll ? "View Less" : "View All"}
          </button>
        )}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-400">
            <th className="font-medium pb-3">Patient</th>
            <th className="font-medium pb-3">Date & Time</th>
            <th className="font-medium pb-3">Phone</th>
            <th className="font-medium pb-3">Status</th>
          </tr>
        </thead>

        <tbody>
          {visibleAppointments.map((appt) => (
            <tr key={appt.id} className="border-t border-gray-50">
              <td className="py-3">
                <div className="flex items-center gap-3">
                  <img
                    src={appt.avatarUrl}
                    alt={appt.patientName}
                    className="w-8 h-8 rounded-full object-cover"
                  />

                  <span className="font-medium text-gray-800">
                    {appt.patientName}
                  </span>
                </div>
              </td>

              <td className="py-3 text-gray-500">
                {appt.dateTime}
              </td>

              <td className="py-3 text-gray-500">
                {appt.phone}
              </td>

              <td className="py-3">
                <span
                  className={`text-xs font-medium px-3 py-1 rounded-full ${STATUS_STYLES[appt.status]}`}
                >
                  {appt.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- AppointmentTrendsChart ---------- */

const CHART_HEIGHT = 220;
const BAR_WIDTH = 28;
const BAR_GAP = 8;
const GROUP_GAP = 46;
const RADIUS = 6;

function roundedTopBarPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, height, width / 2);

  return `
    M${x},${y + height}
    L${x},${y + r}
    Q${x},${y} ${x + r},${y}
    L${x + width - r},${y}
    Q${x + width},${y} ${x + width},${y + r}
    L${x + width},${y + height}
    Z
  `;
}

function AppointmentTrendsChart({
  data,
}: {
  data: TrendPoint[];
}) {
  const max = Math.max(
    ...data.map((d) => Math.max(d.completed, d.rescheduled))
  );

  const scale = (v: number) => (v / max) * CHART_HEIGHT;

  const chartWidth =
    data.length * (BAR_WIDTH * 2 + BAR_GAP + GROUP_GAP);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            Appointment Trends
          </h3>

          <p className="text-sm text-gray-400 mt-0.5">
            Weekly performance analysis
          </p>
        </div>

        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2 text-sm text-gray-600">
            <span className="w-3 h-3 rounded-full bg-blue-900" />
            Completed
          </span>

          <span className="flex items-center gap-2 text-sm text-gray-600">
            <span className="w-3 h-3 rounded-full bg-gray-300" />
            Rescheduled
          </span>

          <div className="relative">
            <select className="appearance-none text-sm bg-gray-50 border border-gray-100 rounded-lg pl-3 pr-8 py-2 text-gray-700 font-medium outline-none cursor-pointer">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>

            <svg
              className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT + 30}`}
        className="w-full"
        role="img"
        aria-label="Bar chart of completed vs rescheduled appointments per day"
      >
        {data.map((d, i) => {
          const groupX =
            i * (BAR_WIDTH * 2 + BAR_GAP + GROUP_GAP);

          const completedH = scale(d.completed);
          const rescheduledH = scale(d.rescheduled);

          return (
            <g key={d.label}>
              <path
                d={roundedTopBarPath(
                  groupX,
                  CHART_HEIGHT - completedH,
                  BAR_WIDTH,
                  completedH,
                  RADIUS
                )}
                fill="#1E3A8A"
              />

              <path
                d={roundedTopBarPath(
                  groupX + BAR_WIDTH + BAR_GAP,
                  CHART_HEIGHT - rescheduledH,
                  BAR_WIDTH,
                  rescheduledH,
                  RADIUS
                )}
                fill="#D1D5DB"
              />

              <text
                x={groupX + BAR_WIDTH + BAR_GAP / 2}
                y={CHART_HEIGHT + 24}
                textAnchor="middle"
                fontSize="14"
                fontWeight={600}
                fill="#111827"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ---------- AvailabilityPanel ---------- */

function AvailabilityPanel({
  location,
  slots,
}: {
  location: string;
  slots: AvailabilitySlot[];
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h3 className="font-semibold text-gray-900 shrink-0">
          Availability
        </h3>

        <div className="relative w-full max-w-[220px]">
          <select className="w-full appearance-none text-xs border border-gray-200 rounded-md pl-2.5 pr-7 py-2 text-gray-600 outline-none focus:ring-2 focus:ring-blue-100 whitespace-nowrap overflow-hidden text-ellipsis">
            <option>{location}</option>
          </select>

          <svg
            className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      <ul className="space-y-3">
        {slots.map((slot) => (
          <li
            key={slot.day}
            className="flex items-center justify-between text-sm"
          >
            <span className="font-medium text-gray-700 w-10">
              {slot.day}
            </span>

            {slot.time ? (
              <span className="flex items-center gap-1.5 text-gray-500">
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 3" />
                </svg>

                {slot.time}
              </span>
            ) : (
              <span className="text-red-400 font-medium">
                Leave
              </span>
            )}
          </li>
        ))}
      </ul>

      <button className="w-full mt-5 bg-blue-50 text-blue-700 text-sm font-semibold rounded-lg py-2.5 hover:bg-blue-100 transition-colors">
        Edit Availability
      </button>
    </div>
  );
}

/* ---------- PatientFeedback ---------- */

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400 text-xs tracking-tight">
      {"★".repeat(Math.round(rating))}
      <span className="text-gray-200">
        {"★".repeat(5 - Math.round(rating))}
      </span>
    </span>
  );
}

function PatientFeedback({
  entries,
}: {
  entries: FeedbackEntry[];
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h3 className="font-semibold text-gray-900 mb-4">
        Patient Feedback
      </h3>

      <div className="space-y-4">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="pb-4 border-b border-gray-50 last:border-0 last:pb-0"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-gray-800">
                {entry.name}
              </span>

              <Stars rating={entry.rating} />
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              &ldquo;{entry.comment}&rdquo;
            </p>
          </div>
        ))}
      </div>

      <button className="text-sm font-medium text-blue-700 hover:underline mt-2">
        Read All Reviews
      </button>
    </div>
  );
}

/* ---------- Dashboard page ---------- */

export default function Dashboard() {
  const [showAllAppointments, setShowAllAppointments] =
    useState(false);

  return (
    <div className="space-y-6 space-x-8">
      <TopBar
        doctorName="Dr. Jenkins"
        doctorId="DOC-99283"
        rating={4.9}
        reviewCount={128}
        date="May 30, 2026"
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <StatCard
              label="TOTAL APPOINTMENTS"
              value="42"
              icon="calendar"
              iconBg="bg-blue-50 text-blue-600"
              footer={
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full w-4/5 bg-blue-700 rounded-full" />
                  </div>

                  <span className="text-xs font-semibold text-emerald-500">
                    +12%
                  </span>
                </div>
              }
            />

            <StatCard
              label="TOTAL PATIENTS"
              value="1,284"
              icon="patients"
              iconBg="bg-emerald-50 text-emerald-600"
              footer={
                <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                  ↗ 84 new this month
                </span>
              }
            />

            <StatCard
              label="CANCELLED"
              value="35"
              icon="cancelled"
              iconBg="bg-red-50 text-red-500"
              footer={
                <span className="text-xs text-gray-400">
                  12 slots remaining today
                </span>
              }
            />
          </div>

          <AppointmentsTable
            appointments={APPOINTMENTS}
            visibleCount={4}
            showAll={showAllAppointments}
            onToggleShowAll={() =>
              setShowAllAppointments((prev) => !prev)
            }
          />

          <AppointmentTrendsChart data={TREND_DATA} />
        </div>

        <div className="space-y-6">
          <AvailabilityPanel
            location="Central Hospital (Tambaram)"
            slots={AVAILABILITY}
          />

          <PatientFeedback entries={FEEDBACK} />
        </div>
      </div>
    </div>
  );
}