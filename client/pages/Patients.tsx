import { useMemo, useState } from "react";
import { FileText, Search, UserPlus } from "lucide-react";

import { DataPanel } from "@/components/hms/DataPanel";
import { PageHeader } from "@/components/hms/PageHeader";
import { StatusBadge } from "@/components/hms/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const statusTone = {
  Admitted: "green",
  Observation: "amber",
  Critical: "rose",
  Discharge: "blue",
} as const;

const patients = [
  {
    id: "PT-1008",
    name: "Aarav Sharma",
    age: 58,
    department: "Emergency",
    doctor: "Dr. Iyer",
    status: "Critical",
    room: "ER-04",
  },
  {
    id: "PT-1014",
    name: "Meera Nair",
    age: 42,
    department: "Surgery",
    doctor: "Dr. Rao",
    status: "Observation",
    room: "S-212",
  },
  {
    id: "PT-1022",
    name: "Kabir Singh",
    age: 36,
    department: "Cardiology",
    doctor: "Dr. Mehta",
    status: "Discharge",
    room: "C-108",
  },
  {
    id: "PT-1031",
    name: "Sara Thomas",
    age: 29,
    department: "Maternity",
    doctor: "Dr. Kapoor",
    status: "Admitted",
    room: "M-316",
  },
  {
    id: "PT-1040",
    name: "Rohan Das",
    age: 12,
    department: "Pediatrics",
    doctor: "Dr. Fernandez",
    status: "Admitted",
    room: "P-024",
  },
] as const;

export default function Patients() {
  const [search, setSearch] = useState("");

  const filteredPatients = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return patients;
    }

    return patients.filter((patient) =>
      [patient.id, patient.name, patient.department, patient.doctor, patient.room]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [search]);

  return (
    <>
      <PageHeader
        eyebrow="Patient directory"
        title="Patients"
        description="Search admissions, view care ownership, and keep discharge movement visible."
        actions={
          <Button className="bg-clinical-blue hover:bg-clinical-blue-mid">
            <UserPlus className="h-4 w-4" />
            Add patient
          </Button>
        }
      />

      <DataPanel
        title="Patient List"
        description={`${filteredPatients.length} patients shown`}
        action={
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search patients"
              className="pl-9"
            />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
                <th className="pb-3 font-bold">Patient</th>
                <th className="pb-3 font-bold">Department</th>
                <th className="pb-3 font-bold">Doctor</th>
                <th className="pb-3 font-bold">Room</th>
                <th className="pb-3 font-bold">Status</th>
                <th className="pb-3 text-right font-bold">Chart</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((patient) => (
                <tr
                  key={patient.id}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="py-4">
                    <p className="font-bold text-slate-950">{patient.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {patient.id} - {patient.age} yrs
                    </p>
                  </td>
                  <td className="py-4 font-semibold text-slate-700">
                    {patient.department}
                  </td>
                  <td className="py-4 text-slate-600">{patient.doctor}</td>
                  <td className="py-4 text-slate-600">{patient.room}</td>
                  <td className="py-4">
                    <StatusBadge tone={statusTone[patient.status]}>
                      {patient.status}
                    </StatusBadge>
                  </td>
                  <td className="py-4 text-right">
                    <Button variant="ghost" size="sm" className="text-clinical-blue">
                      <FileText className="h-4 w-4" />
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataPanel>
    </>
  );
}
