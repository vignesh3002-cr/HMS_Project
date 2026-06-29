import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";

import { DataPanel } from "@/components/hms/DataPanel";
import { PageHeader } from "@/components/hms/PageHeader";
import { StatusBadge } from "@/components/hms/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const statusTone = {
  Active: "green",
  Leave: "amber",
  Resigned: "slate",
  Suspended: "rose",
} as const;

const staffMembers = [
  { id: "STF-1001", name: "Dr. John Smith", role: "Cardiologist", department: "Cardiology", branch: "Central Hospital (Tambaram)", status: "Active" },
  { id: "STF-1002", name: "Marcus Kincaid", role: "Oncologist", department: "Cancer", branch: "Central Hospital (Tambaram)", status: "Leave" },
  { id: "STF-1003", name: "Dr. Robert Lee", role: "Pediatrician", department: "Pediatrics", branch: "Central Hospital (Saidapet)", status: "Active" },
  { id: "STF-1004", name: "Dr. Arun Kumar", role: "Orthologist", department: "Orthology", branch: "Central Hospital (Egmore)", status: "Active" },
  { id: "STF-1005", name: "Dr. Priya Sharma", role: "Neurologist", department: "Neurology", branch: "Central Hospital (Tambaram)", status: "Active" },
  { id: "STF-1006", name: "Anita Verma", role: "Head Nurse", department: "Emergency", branch: "Central Hospital (Tambaram)", status: "Active" },
  { id: "STF-1007", name: "Ravi Patel", role: "Radiologist", department: "Radiology", branch: "Central Hospital (Saidapet)", status: "Leave" },
  { id: "STF-1008", name: "Dr. Sarah Joseph", role: "General Surgeon", department: "Surgery", branch: "Central Hospital (Egmore)", status: "Active" },
  { id: "STF-1009", name: "Michael Dsouza", role: "Lab Technician", department: "Pathology", branch: "Central Hospital (Tambaram)", status: "Resigned" },
  { id: "STF-1010", name: "Dr. Meera Nair", role: "Gynecologist", department: "Maternity", branch: "Central Hospital (Tambaram)", status: "Active" },
  { id: "STF-1011", name: "Karthik Rajan", role: "Pharmacist", department: "Pharmacy", branch: "Central Hospital (Saidapet)", status: "Active" },
  { id: "STF-1012", name: "Dr. Sunil Gupta", role: "Pulmonologist", department: "Pulmonology", branch: "Central Hospital (Egmore)", status: "Leave" },
];

export default function Staff() {
  const [search, setSearch] = useState("");

  const filteredStaff = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return staffMembers;
    return staffMembers.filter((member) =>
      [member.id, member.name, member.role, member.department, member.branch]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [search]);

  return (
    <>
      <PageHeader
        eyebrow="Hospital staff"
        title="Staff"
        description="Manage all staff members, view roles, and track availability across branches."
        actions={
          <Button className="bg-clinical-blue hover:bg-clinical-blue-mid">
            <Plus className="h-4 w-4" />
            Add Staff
          </Button>
        }
      />

      <DataPanel
        title="Staff Directory"
        description={`${filteredStaff.length} staff members`}
        action={
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search staff"
              className="pl-9"
            />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
                <th className="pb-3 font-bold">Employee</th>
                <th className="pb-3 font-bold">Role</th>
                <th className="pb-3 font-bold">Department</th>
                <th className="pb-3 font-bold">Branch</th>
                <th className="pb-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="py-4">
                    <p className="font-bold text-slate-950">{member.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{member.id}</p>
                  </td>
                  <td className="py-4 font-semibold text-slate-700">
                    {member.role}
                  </td>
                  <td className="py-4 text-slate-600">{member.department}</td>
                  <td className="py-4 text-slate-600">{member.branch}</td>
                  <td className="py-4">
                    <StatusBadge tone={statusTone[member.status]}>
                      {member.status}
                    </StatusBadge>
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
