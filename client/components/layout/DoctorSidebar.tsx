import React, { useState } from "react";
import {
  LayoutDashboard,
  Users,
  CalendarX,
  FileText,
  CalendarCheck,
  LogOut,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { remove } from "../../utils/token";
import { Logo } from "@/components/hms/Logo";


interface DoctorSidebarProps {
  activeItem?: string;
  onNavigate?: (item: string) => void;
  doctorName?: string;
}

const DoctorSidebar: React.FC<DoctorSidebarProps> = ({
  activeItem = "Dashboard",
  onNavigate,
}) => {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleLogout = () => {
    setConfirmOpen(true);
  };

  const menuItems = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Appointment",
      icon: Users,
    },
    {
      name: "Leave",
      icon: CalendarX,
    },
    {
      name: "Review",
      icon: FileText,
    },
    {
      name: "My schedule",
      icon: CalendarCheck,
    },
  ];

  const handleNavigation = (item: string) => {
    if (onNavigate) {
      onNavigate(item);
    }
  };

  return (
    <aside className="w-[230px] h-screen bg-[#f6f7f9] flex flex-col border-r border-gray-200 flex-shrink-0">
      
      {/* ================= HEADER ================= */}
      <div className="px-5 pt-6 pb-6">
        <Link to="/doctor" className="block focus:outline-none">
          <Logo className="w-full max-w-[175px] h-auto" iconPosition="left" />
        </Link>
      </div>

      <ConfirmationDialog
        open={confirmOpen}
        title="Logout"
        description="Are you sure you want to logout?"
        type="warning"
        onConfirm={() => {
          remove();
          localStorage.removeItem("user_info");
          navigate("/");
        }}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* ================= NAVIGATION ================= */}
      <nav className="flex-1 flex flex-col gap-1.5 px-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.name;

          return (
            <button
              key={item.name}
              type="button"
              onClick={() => handleNavigation(item.name)}
              className={`
                relative
                w-full
                flex
                items-center
                gap-3
                px-3
                py-2.5
                rounded-md
                text-left
                transition-all
                duration-150
                ${
                  isActive
                    ? "bg-[#dce6f8] text-[#0f3d91]"
                    : item.name === "Logout"
                      ? "text-red-600 hover:bg-red-100"
                      : "text-gray-600 hover:bg-gray-200/70 hover:text-gray-800"
                }
              `}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#0f3d91]" />
              )}

              <Icon
                className={`
                  w-[19px]
                  h-[19px]
                  flex-shrink-0
                  ${
                    isActive
                      ? "text-[#0f3d91]"
                      : "text-gray-500"
                  }
                `}
                strokeWidth={2}
              />

              <span className="font-semibold text-[14px]">
                {item.name}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ================= PROFILE ================= */}
      <div className="px-4 pb-5 pt-3">
        {/* Profile moved to top-right header */}
      </div>
    </aside>
  );
};

export default DoctorSidebar;