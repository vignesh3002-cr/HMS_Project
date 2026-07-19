import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
} from "lucide-react";

interface Schedule {
  patients: number;
  progress: number;
  color: "blue" | "green" | "red" | "gray";
  off?: boolean;
}

interface Doctor {
  name: string;
  department: string;
  schedule: Schedule[];
}

const doctors: Doctor[] = [
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Michael Brown",
    department: "RADIATION",
    schedule: [
      { patients: 16, progress: 100, color: "red" },
      { patients: 0, progress: 0, color: "gray", off: true },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 12, progress: 85, color: "blue" },
      { patients: 9, progress: 65, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Elena Rodriguez",
    department: "PEDIATRIC",
    schedule: [
      { patients: 6, progress: 40, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 12, progress: 85, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 13, progress: 90, color: "blue" },
      { patients: 4, progress: 30, color: "gray" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
];

const colorStyles = {
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-700",
    text: "text-blue-700",
    fill: "bg-blue-700",
  },
  green: {
    bg: "bg-green-50",
    border: "border-green-700",
    text: "text-green-700",
    fill: "bg-green-700",
  },
  red: {
    bg: "bg-red-50",
    border: "border-red-700",
    text: "text-red-700",
    fill: "bg-red-700",
  },
  gray: {
    bg: "bg-gray-100",
    border: "border-gray-500",
    text: "text-gray-600",
    fill: "bg-gray-500",
  },
};

const AppointmentSchedule = () => {
  return (
    <div className="mx-auto max-w-7xl bg-white p-6">

      {/* Header */}

      <h1 className="text-3xl font-bold text-gray-900">
        Appointment Schedule
      </h1>

      {/* Toolbar */}

      <div className="mt-8 flex flex-wrap items-end gap-4">

        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
            View
          </p>

          <button className="flex h-10 w-40 items-center justify-between rounded-lg border border-gray-200 px-4 shadow-sm">
            Week View
            <ChevronDown size={16} />
          </button>
        </div>

        <div className="flex overflow-hidden rounded-lg border border-gray-200 shadow-sm">

          <button className="flex h-10 w-10 items-center justify-center">
            <ChevronLeft size={18} />
          </button>

          <button className="border-x px-5 text-sm font-medium">
            Today
          </button>

          <button className="flex h-10 w-10 items-center justify-center">
            <ChevronRight size={18} />
          </button>

        </div>

        <div className="flex-1"></div>

        <button className="flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white">
          <Plus size={16} />
          New Appointment
        </button>

      </div>

      {/* Table */}

      <div className="mt-8 overflow-auto rounded-xl border border-gray-300">

        <table className="min-w-full border-collapse">

          <thead>

            <tr className="bg-gray-100">

              <th className="border px-4 py-4 text-left text-xs font-bold uppercase">
                Specialist
              </th>

              {[
                "Mon 20",
                "Tue 21",
                "Wed 22",
                "Thu 23",
                "Fri 24",
                "Sat 25",
                "Sun 26",
              ].map((day) => (
                <th
                  key={day}
                  className="border px-4 py-4 text-center text-xs font-bold uppercase"
                >
                  {day}
                </th>
              ))}

            </tr>

          </thead>

          <tbody>

            {doctors.map((doctor) => (
              <tr key={doctor.name}>
                <td className="border px-4 py-4 align-top">

                  <h3 className="font-semibold text-gray-900">
                    {doctor.name}
                  </h3>

                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    {doctor.department}
                  </p>

                </td>

                {doctor.schedule.map((item, index) => {
                  if (item.off) {
                    return (
                      <td
                        key={index}
                        className="border bg-gray-50 text-center text-xs font-bold text-gray-500"
                      >
                        OFF
                      </td>
                    );
                  }

                  const style = colorStyles[item.color];

                  return (
                    <td key={index} className="border p-2">
                      <div
                        className={`${style.bg} border-l-4 ${style.border} rounded px-3 py-2`}
                      >
                        <p className={`text-xs font-bold ${style.text}`}>
                          {item.patients} Patients
                        </p>

                        <div className="mt-2 h-1 rounded-full bg-gray-300">
                          <div
                            className={`${style.fill} h-1 rounded-full`}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
};

export default AppointmentSchedule;