import React, { useState, useEffect } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "@/components/hms/Logo";
import { UserProfileDropdown } from "@/components/ui/User_profile_dropdown";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { remove, getUser } from "@/utils/token";
import { patientPortalApi } from "@/api/patientPortal.api";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarCheck,
  FileText,
  Pill,
  HeartPulse,
  PhoneCall,
  Menu,
  X,
  HelpCircle,
  Activity,
} from "lucide-react";

interface PatientPortalLayoutProps {
  children?: React.ReactNode;
}

export const PatientPortalLayout: React.FC<PatientPortalLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const user = getUser();
  const patientId = user?.patient_id || user?.patient_uhid || user?.username || "Patient";
  const patientName = user?.patient_name || user?.name || user?.username || "Patient";
  const bloodGroup = user?.patient_blood_group;

  const [hasChemoPlan, setHasChemoPlan] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    patientPortalApi
      .getChemotherapyPlans()
      .then((plans) => {
        if (isMounted) {
          setHasChemoPlan(Array.isArray(plans) && plans.length > 0);
        }
      })
      .catch((err) => {
        console.error("Failed to check chemotherapy plan access:", err);
        if (isMounted) {
          setHasChemoPlan(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [patientId]);

  const navItems = [
    {
      label: "Dashboard",
      to: "/patient/dashboard",
      icon: <LayoutDashboard size={16} />,
    },
    {
      label: "Appointments",
      to: "/patient/appointments",
      icon: <CalendarCheck size={16} />,
    },
    {
      label: "Chemotherapy",
      to: "/patient/chemotherapy",
      icon: <Activity size={16} />,
    },
    {
      label: "Lab Reports",
      to: "/patient/reports",
      icon: <FileText size={16} />,
    },
    {
      label: "Prescriptions",
      to: "/patient/prescriptions",
      icon: <Pill size={16} />,
    },
    {
      label: "Health History",
      to: "/patient/history",
      icon: <HeartPulse size={16} />,
    },
  ];

  const handleLogout = () => {
    setLogoutOpen(false);
    remove();
    try {
      localStorage.removeItem("user_info");
      localStorage.removeItem("user_photo");
      localStorage.removeItem("permissions");
      localStorage.removeItem("userPermissions");
      sessionStorage.removeItem("permissions");
      sessionStorage.removeItem("userPermissions");
    } catch {}
    navigate("/", { replace: true });
  };

  return (
    <div className="flex h-screen font-[Manrope,sans-serif] bg-[#F7F9FB] overflow-hidden text-slate-800">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-2xs z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ================= LEFT SIDEBAR (Admin & Doctor Style) ================= */}
      <aside
        className={cn(
          "fixed lg:static z-50 lg:z-auto flex flex-col w-56 h-full bg-[#F2F4F6] px-4 py-6 transition-transform duration-200 border-r border-slate-200 shrink-0 print:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Logo and close button for mobile */}
        <div className="pb-6 flex items-center justify-between">
          <Link
            to="/patient/dashboard"
            onClick={() => setSidebarOpen(false)}
            className="block focus:outline-none"
          >
            <Logo className="w-full max-w-[175px] h-auto" iconPosition="left" />
          </Link>
          <button
            type="button"
            className="lg:hidden p-1.5 rounded-md hover:bg-slate-200 text-slate-500"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1 flex-1">
          {navItems
            .filter((item) => {
              if (item.to === "/patient/chemotherapy") {
                return hasChemoPlan;
              }
              return true;
            })
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-[4px] text-xs font-semibold tracking-[0.6px] capitalize transition-colors",
                    isActive
                      ? "bg-[#00488D] text-white shadow-sm"
                      : "text-[#475569] hover:bg-[#E6E8EA] hover:text-slate-900",
                  )
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
        </nav>

        {/* Bottom Support Callout */}
        <div className="border-t border-[rgba(194,198,212,0.2)] pt-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-[4px] text-xs font-semibold text-slate-600 bg-white/60 border border-slate-200/50">
            <HelpCircle size={15} className="text-[#00488D] shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-700">Patient Support</div>
              <div className="text-[10px] text-slate-500 truncate">Help & Queries</div>
            </div>
          </div>
        </div>

        {/* Patient Profile Snapshot */}
        <div className="pt-3">
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/80 border border-slate-200/80 shadow-2xs">
            <UserAvatar
              name={patientName}
              className="w-8 h-8 rounded-xl bg-blue-100 text-[#00488D] shrink-0"
              initialClass="text-xs font-bold"
            />
            <div className="min-w-0 flex-1">
              <div className="text-[#191C1E] font-bold text-[12px] truncate">
                {patientName}
              </div>
              <div className="text-[#64748B] text-[11px] font-medium truncate">
                UHID: <span className="font-semibold text-[#00488D]">{patientId}</span>
              </div>
            </div>
            {bloodGroup && (
              <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-bold text-[10px] shrink-0 border border-red-100">
                {bloodGroup}
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* ================= RIGHT MAIN AREA (Header + Content) ================= */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden print:overflow-visible">
        {/* Top Navbar */}
        <header className="flex h-16 items-center justify-between bg-white/90 backdrop-blur-sm border-b border-slate-200 px-6 lg:px-8 shadow-xs sticky top-0 z-30 print:hidden">
          {/* Left: Hamburger & Portal Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="lg:hidden p-2 rounded-md hover:bg-slate-100 text-[#334155] cursor-pointer"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle navigation menu"
            >
              <Menu size={20} />
            </button>

            <div className="flex items-center gap-2 sm:gap-3">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#00488D] border border-blue-200/60">
                Patient Portal
              </span>
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-medium border border-red-100">
                <PhoneCall className="h-3.5 w-3.5 text-red-600 animate-pulse" />
                <span>24/7 Helpline: 1800-425-0011</span>
              </div>
            </div>
          </div>

          {/* Right: User Profile Dropdown */}
          <div className="flex items-center gap-4">
            <UserProfileDropdown
              userName={patientName}
              userSubtext={`UHID: ${patientId}`}
              onLogout={() => setLogoutOpen(true)}
              hideNotifications={true}
              profilePath="/patient/history"
            />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 print:p-0 print:overflow-visible print:max-w-none">
          <div className="max-w-7xl mx-auto print:max-w-none print:w-full">
            {children ?? <Outlet />}
          </div>
        </main>
      </div>

      {/* Logout Confirmation Dialog */}
      <ConfirmationDialog
        open={logoutOpen}
        type="danger"
        title="Sign Out"
        description="Are you sure you want to end your patient portal session?"
        confirmText="Sign Out"
        cancelText="Cancel"
        onConfirm={handleLogout}
        onCancel={() => setLogoutOpen(false)}
      />
    </div>
  );
};
