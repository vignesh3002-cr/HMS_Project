import React from "react";
import {
  LayoutDashboard,
  Users,
  CalendarX,
  FileText,
  CalendarCheck,
} from "lucide-react";

interface DoctorSidebarProps {
  activeItem?: string;
  onNavigate?: (item: string) => void;
}

const DoctorSidebar: React.FC<DoctorSidebarProps> = ({
  activeItem = "Dashboard",
  onNavigate,
}) => {
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
      <div className="px-6 pt-7 pb-8">
        <h1 className="text-[20px] font-bold text-[#0f3d91] leading-tight tracking-tight">
          HMS Portal
        </h1>

        <p className="text-[11px] font-semibold text-gray-500 tracking-[1px] mt-1 uppercase">
          Doctor Dashboard
        </p>
      </div>

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
        
        {/* Divider */}
        <div className="border-t border-gray-200 mb-4" />

        <div className="flex items-center gap-3 px-1">
          
          {/* Profile Image */}
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBJ9i_cigQWWeyKsB64g5ceQatvOSkGHDQnEyA1_0zMrtWlfbwspYRUpV4spkSMmEDzu3MKqi8Qy11D_v-CTmQLt0VJn3GVfMbaymXJv3z_RalZA0Oz5hMPh1-pTavp9HjpTEcvwZ1nxzo7cdsZXoYfS-7R7fSrnopXkwvTsDb3L06Gi7TXgW6K_hfkWcirroLjoO1DKK0tSWE37GeK5_VgsLvVqt3ia1IPaDMxAIdYegI0CbvOOwtc3BWSjjPNf4lpcw"
            alt="Doctor"
            className="w-[42px] h-[42px] rounded-[12px] object-cover border border-gray-200 flex-shrink-0"
          />

          {/* Profile Info */}
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-[13px] text-gray-900 leading-tight truncate">
              Dr. Sarah Jenkins
            </span>

            <span className="text-[11px] text-gray-500 font-medium mt-1 truncate">
              Senior Cardiologist
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default DoctorSidebar;