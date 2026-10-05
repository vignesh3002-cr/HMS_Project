import { Navigate } from "react-router-dom";
import Notification from "@/components/Forms/view/Notification";
import { getUser } from "@/utils/token";

export default function DoctorNotifications() {
  const user = getUser();
  if (user?.role_type === "LAB_TECHNICIAN") {
    return <Navigate to="/lab/dashboard" replace />;
  }
  return <Notification />;
}
