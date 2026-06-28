import { useMemo, useState } from "react";
import { CalendarPlus, Clock3, Stethoscope, UserRound } from "lucide-react";

import { DataPanel } from "@/components/hms/DataPanel";
import { PageHeader } from "@/components/hms/PageHeader";
import { StatusBadge } from "@/components/hms/StatusBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const appointmentFilters = ["All", "Confirmed", "Waiting", "Completed"] as const;
type AppointmentFilter = (typeof appointmentFilters)[number];

const statusTone = {
  Confirmed: "green",
  Waiting: "amber",
  Completed: "blue",
} as const;

const appointments = [
  {
    time: "09:00",
    patient: "Nisha Patel",
    doctor: "Dr. Iyer",
    department: "Cardiology",
    status: "Confirmed",
  },
  {
    time: "09:30",
    patient: "Dev Malhotra",
    doctor: "Dr. Rao",
    department: "Orthopedics",
    status: "Waiting",
  },
  {
    time: "10:15",
    patient: "Anika Bose",
    doctor: "Dr. Fernandez",
    department: "Pediatrics",
    status: "Confirmed",
  },
  {
    time: "11:00",
    patient: "Vikram Sethi",
    doctor: "Dr. Kapoor",
    department: "Neurology",
    status: "Completed",
  },
  {
    time: "12:20",
    patient: "Leena Shah",
    doctor: "Dr. Mehta",
    department: "General Medicine",
    status: "Waiting",
  },
] as const;

export default function Appointments() {
  const [filter, setFilter] = useState<AppointmentFilter>("All");

  const visibleAppointments = useMemo(() => {
    if (filter === "All") {
      return appointments;
    }

    return appointments.filter((appointment) => appointment.status === filter);
  }, [filter]);

  return (
    <>
      <PageHeader
        eyebrow="Schedule"
        title="Appointments"
        description="Coordinate outpatient visits and keep waiting-room flow clear for care teams."
        actions={
          <Button className="bg-clinical-blue hover:bg-clinical-blue-mid">
            <CalendarPlus className="h-4 w-4" />
            New appointment
          </Button>
        }
      />

      <DataPanel
        title="Today's Schedule"
        description={`${visibleAppointments.length} appointments in view`}
        action={
          <div className="flex flex-wrap gap-2">
            {appointmentFilters.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm font-bold transition",
                  filter === item
                    ? "border-clinical-blue bg-clinical-blue text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                )}
              >
                {item}
              </button>
            ))}
          </div>
        }
      >
        <div className="space-y-3">
          {visibleAppointments.map((appointment) => (
            <div
              key={`${appointment.time}-${appointment.patient}`}
              className="grid gap-4 rounded-lg border border-slate-200 p-4 md:grid-cols-[120px_1fr_auto]"
            >
              <div className="flex items-center gap-2 font-extrabold text-slate-950">
                <Clock3 className="h-4 w-4 text-clinical-blue" />
                {appointment.time}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 rounded-md bg-blue-50 p-2 text-blue-700">
                    <UserRound className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-bold text-slate-950">
                      {appointment.patient}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">Patient</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="mt-0.5 rounded-md bg-emerald-50 p-2 text-emerald-700">
                    <Stethoscope className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-bold text-slate-950">
                      {appointment.doctor}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {appointment.department}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center md:justify-end">
                <StatusBadge tone={statusTone[appointment.status]}>
                  {appointment.status}
                </StatusBadge>
              </div>
            </div>
          ))}
        </div>
      </DataPanel>
    </>
  );
}
