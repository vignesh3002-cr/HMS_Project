import { getUser } from "@/utils/token";

import DoctorLayout from "@/components/layout/DoctorLayout";
import { AppLayout } from "@/components/layout/AppLayout";

import DoctorDashboard from "./doctor/Dashboard";
import Dashboard from "./Dashboard";
import LabDashboard from "./doctor/lab/labdashboard";

export default function DashboardRedirect() {
  const user = getUser();
  const roleType = String(user?.role_type ?? "").trim().toUpperCase();

  if (roleType === "DOCTOR") {
    return (
      <DoctorLayout>
        <DoctorDashboard />
      </DoctorLayout>
    );
  }

  if (roleType === "LAB_TECHNICIAN") {
    return <LabDashboard />;
  }

  return (
    <AppLayout>
      <Dashboard />
    </AppLayout>
  );
}