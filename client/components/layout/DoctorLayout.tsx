import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import DoctorSidebar from "./DoctorSidebar";

interface DoctorLayoutProps {
  children?: React.ReactNode;
  doctorName?: string;
}

const DoctorLayout: React.FC<DoctorLayoutProps> = ({
  children,
  doctorName,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveItem = () => {
    if (location.pathname === "/dashboard" || location.pathname === "/doctor-dashboard") {
      return "Dashboard";
    }

    if (location.pathname.startsWith("/doctor/appointments")) {
      return "Appointment";
    }

    if (location.pathname.startsWith("/doctor/leave")) {
      return "Leave";
    }

    if (location.pathname.startsWith("/doctor/reviews")) {
      return "Review";
    }

    if (location.pathname.startsWith("/doctor/schedule")) {
      return "My schedule";
    }

    return "Dashboard";
  };

  const handleNavigation = (item: string) => {
    switch (item) {
      case "Dashboard":
        navigate("/dashboard");
        break;

      case "Appointment":
        navigate("/doctor/appointments");
        break;

      case "Leave":
        navigate("/doctor/leave");
        break;

      case "Review":
        navigate("/doctor/reviews");
        break;

      case "My schedule":
        navigate("/doctor/schedule");
        break;

      default:
        break;
    }
  };

  return (
    <div className="min-h-screen h-screen flex bg-[#f8fafc] overflow-hidden">
      {/* Doctor Sidebar */}
      <DoctorSidebar
        activeItem={getActiveItem()}
        onNavigate={handleNavigation}
        doctorName={doctorName}
      />

      {/* Doctor Content */}
      <main className="flex-1 min-w-0 h-screen overflow-y-auto overflow-x-hidden bg-[#f8fafc]">
        {children ?? <Outlet />}
      </main>
    </div>
  );
};

export default DoctorLayout;