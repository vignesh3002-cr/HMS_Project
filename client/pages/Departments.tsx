import { Activity, BedDouble, Building2, UsersRound } from "lucide-react";

import { DataPanel } from "@/components/hms/DataPanel";
import { PageHeader } from "@/components/hms/PageHeader";
import { StatusBadge } from "@/components/hms/StatusBadge";

const departments = [
  {
    name: "Emergency",
    lead: "Dr. Kavita Iyer",
    patients: 38,
    beds: "38/44",
    utilization: 86,
    status: "High load",
    tone: "amber",
  },
  {
    name: "Cardiology",
    lead: "Dr. Rohan Mehta",
    patients: 42,
    beds: "42/58",
    utilization: 72,
    status: "Stable",
    tone: "green",
  },
  {
    name: "Pediatrics",
    lead: "Dr. Maria Fernandez",
    patients: 31,
    beds: "31/46",
    utilization: 67,
    status: "Stable",
    tone: "green",
  },
  {
    name: "Surgery",
    lead: "Dr. Ananya Rao",
    patients: 56,
    beds: "56/62",
    utilization: 90,
    status: "Full review",
    tone: "rose",
  },
  {
    name: "Maternity",
    lead: "Dr. Priya Kapoor",
    patients: 52,
    beds: "52/68",
    utilization: 76,
    status: "Stable",
    tone: "blue",
  },
  {
    name: "Diagnostics",
    lead: "Dr. Arjun Sen",
    patients: 94,
    beds: "N/A",
    utilization: 63,
    status: "Normal",
    tone: "slate",
  },
] as const;

export default function Departments() {
  return (
    <>
      <PageHeader
        eyebrow="Clinical units"
        title="Departments"
        description="Review department load, leadership, and current capacity across the hospital."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {departments.map((department) => (
          <article
            key={department.name}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="rounded-md bg-blue-50 p-2 text-blue-700">
                  <Building2 className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-950">
                    {department.name}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {department.lead}
                  </p>
                </div>
              </div>
              <StatusBadge tone={department.tone}>{department.status}</StatusBadge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <UsersRound className="mb-3 h-4 w-4 text-clinical-blue" />
                <p className="text-2xl font-extrabold text-slate-950">
                  {department.patients}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Patients
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <BedDouble className="mb-3 h-4 w-4 text-clinical-blue" />
                <p className="text-2xl font-extrabold text-slate-950">
                  {department.beds}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-500">Beds</p>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-bold text-slate-700">
                  <Activity className="h-4 w-4 text-clinical-blue" />
                  Utilization
                </span>
                <span className="font-extrabold text-slate-950">
                  {department.utilization}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-clinical-blue"
                  style={{ width: `${department.utilization}%` }}
                />
              </div>
            </div>
          </article>
        ))}
      </section>

      <DataPanel
        title="Department Notes"
        description="Administrative reminders for daily capacity planning."
      >
        <div className="grid gap-3 md:grid-cols-3">
          {[
            "Surgery needs two step-down beds before 16:00.",
            "Diagnostics has reduced MRI availability in the afternoon.",
            "Emergency overflow review is due after morning rounds.",
          ].map((note) => (
            <div
              key={note}
              className="rounded-lg bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-700"
            >
              {note}
            </div>
          ))}
        </div>
      </DataPanel>
    </>
  );
}
