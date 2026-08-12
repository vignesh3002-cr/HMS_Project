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
  activeItem = "My schedule",
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
    <aside className="w-[280px] h-screen bg-[#f3f4f6] flex flex-col border-r border-gray-200">
      {/* Header */}
      <div className="px-8 pt-10 pb-12">
        <h1 className="text-[22px] font-bold text-[#0f3d91] leading-tight tracking-tight">
          HMS Portal
        </h1>

        <p className="text-[13px] font-medium text-gray-600 tracking-wider mt-1.5 uppercase">
          Doctor Dashboard
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-2 px-4">
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
                gap-4
                px-4
                py-3
                text-left
                transition-colors
                ${
                  isActive
                    ? "bg-[#d8e2f5] text-gray-700"
                    : "rounded-md text-gray-600 hover:bg-gray-200"
                }
              `}
            >
              {/* Active left border */}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#0f3d91]" />
              )}

              <Icon
                className={`
                  w-[22px]
                  h-[22px]
                  ${
                    isActive
                      ? "text-gray-600 ml-1"
                      : "text-gray-500 group-hover:text-gray-700"
                  }
                `}
                strokeWidth={2}
              />

              <span className="font-semibold text-[15px]">
                {item.name}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Profile */}
      <div className="mt-auto px-6 pb-8 pt-4">
        {/* Divider */}
        <div className="border-t border-gray-300 mb-6" />

        <div className="flex items-center gap-4">
          {/* Profile Image */}
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBJ9i_cigQWWeyKsB64g5ceQatvOSkGHDQnEyA1_0zMrtWlfbwspYRUpV4spkSMmEDzu3MKqi8Qy11D_v-CTmQLt0VJn3GVfMbaymXJv3z_RalZA0Oz5hMPh1-pTavp9HjpTEcvwZ1nxzo7cdsZXoYfS-7R7fSrnopXkwvTsDb3L06Gi7TXgW6K_hfkWcirroLjoO1DKK0tSWE37GeK5_VgsLvVqt3ia1IPaDMxAIdYegI0CbvOOwtc3BWSjjPNf4lpcw"
            alt="Dr. Sarah Jenkins"
            className="w-[50px] h-[50px] rounded-[16px] object-cover border border-gray-200"
          />

          {/* Profile Info */}
          <div className="flex flex-col">
            <span className="font-bold text-[15px] text-gray-900 leading-tight">
              Dr. Sarah Jenkins
            </span>

            <span className="text-[13px] text-gray-500 font-medium mt-0.5">
              Senior Cardiologist
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default DoctorSidebar;