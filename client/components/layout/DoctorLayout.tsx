import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import DoctorSidebar from "./DoctorSidebar";
import { UserProfileDropdown } from "@/components/ui/User_profile_dropdown";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { remove, getUser } from "../../utils/token";
import { employeeApi } from "../../api/employee.api";
import { BranchFilterProvider } from "@/context/BranchFilterContext";

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
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userSubtext, setUserSubtext] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string>(() => localStorage.getItem("user_photo") || "");
  const [avatarLoading, setAvatarLoading] = useState<boolean>(() => !localStorage.getItem("user_photo"));

  useEffect(() => {
    const user = getUser();
    if (user) {
      setUserName(user.username || "");
      setUserSubtext(user.role || user.user_id || "");
    }
    let mounted = true;
    const fetchAvatar = () => {
      employeeApi
        .getMe()
        .then((res) => {
          if (!mounted) return;
          const url = res.data?.data?.employee?.employee_photo_URL || "";
          setAvatarUrl(url);
          if (url) localStorage.setItem("user_photo", url);
          else localStorage.removeItem("user_photo");
          setAvatarLoading(false);
        })
        .catch(() => {
          if (mounted) setAvatarLoading(false);
        });
    };
    fetchAvatar();
    return () => { mounted = false; };
  }, []);

  const handleLogout = () => {
    setLogoutOpen(false);
    remove();
    localStorage.removeItem("user_info");
    localStorage.removeItem("user_photo");
    navigate("/");
  };

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
    <BranchFilterProvider>
      <div className="min-h-screen h-screen flex bg-[#f8fafc] overflow-hidden">
        {/* Doctor Sidebar */}
        <DoctorSidebar
          activeItem={getActiveItem()}
          onNavigate={handleNavigation}
          doctorName={doctorName}
        />

        {/* Doctor Content */}
        <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden bg-[#f8fafc]">
          <header className="flex h-16 items-center justify-between bg-white/90 backdrop-blur-sm border-b border-slate-200 px-6">
            <div />
            <UserProfileDropdown
              userName={userName || "Doctor"}
              userSubtext={userSubtext || "Doctor"}
              userAvatar={avatarUrl || undefined}
              avatarLoading={avatarLoading}
              onLogout={() => setLogoutOpen(true)}
              profilePath="/doctor/profile"
              notificationsPath="/doctor/notifications"
            />
          </header>
          <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
            {children ?? <Outlet />}
          </main>
        </div>

        <ConfirmationDialog
          open={logoutOpen}
          type="danger"
          title="Log Out?"
          description="Are you sure you want to log out? Any unsaved changes may be lost."
          confirmText="Log Out"
          cancelText="Stay"
          onConfirm={handleLogout}
          onCancel={() => setLogoutOpen(false)}
        />
      </div>
    </BranchFilterProvider>
  );
};

export default DoctorLayout;