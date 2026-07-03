import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  UserRound,
  Calendar,
  Receipt,
  FileText,
  Settings,
  HelpCircle,
  Menu,
  Bell,
  ChevronDown,
} from "lucide-react";

const navIcon: Record<string, React.ReactNode> = {
  Dashboard: <LayoutDashboard size={16} />,
  Staff: <Users size={16} />,
  Doctor: <Stethoscope size={16} />,
  Patients: <UserRound size={16} />,
  Appointment: <Calendar size={16} />,
  Billing: <Receipt size={16} />,
  Protocol: <FileText size={16} />,
};

const bottomNavIcon: Record<string, React.ReactNode> = {
  Settings: <Settings size={16} />,
  Support: <HelpCircle size={16} />,
};

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { label: "Dashboard", to: "/dashboard" },
    { label: "Staff", to: "/staff" },
    { label: "Doctor", to: "/doctor" },
    { label: "Patients", to: "/patients" },
    { label: "Appointment", to: "/appointments" },
    { label: "Billing", to: "/billing" },
    { label: "Protocol", to: "/protocol", hasArrow: true },
  ];

  const bottomNavItems = [
    { label: "Settings", to: "/settings" },
    { label: "Support", to: "/support" },
  ];

  return (
    <div className="flex h-screen overflow-hidden font-[Manrope,sans-serif] bg-[#F7F9FB]">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={cn(
          "fixed lg:static z-30 lg:z-auto flex flex-col w-56 h-full bg-[#F2F4F6] px-4 py-6 transition-transform duration-200",
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* LOGO */}
        <div className="px-3 pb-8">
          <div className="text-[#00488D] font-extrabold text-base tracking-[-0.8px] uppercase">
            HMS
          </div>
          <div className="text-[#64748B] font-semibold text-[9px] tracking-[0.9px] capitalize">
            admin portal
          </div>
        </div>

        {/* NAV */}
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 px-3 py-2 rounded-[4px] text-xs font-semibold tracking-[0.6px] capitalize",
                  isActive
                    ? "bg-[#00488D] text-white shadow-sm"
                    : "text-[#475569] hover:bg-[#E6E8EA]"
                )
              }
            >
              {navIcon[item.label]}
              {item.label}
              {item.hasArrow && (
                <ChevronDown size={12} className="ml-auto" />
              )}
            </NavLink>
          ))}
        </nav>

        {/* BOTTOM NAV */}
        <div className="border-t border-[rgba(194,198,212,0.10)] pt-4 flex flex-col gap-1">
          {bottomNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex items-center gap-2 px-3 py-2 rounded-[4px] text-[#475569] hover:bg-[#E6E8EA] text-xs font-semibold"
            >
              {bottomNavIcon[item.label]}
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* USER */}
        <div className="pt-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[#F2F4F6]">
            <img
              src="https://i.pravatar.cc/40"
              alt="Admin"
              className="w-8 h-8 rounded-xl object-cover"
            />
            <div>
              <div className="text-[#191C1E] font-semibold text-[10px]">
                Admin
              </div>
              <div className="text-[#64748B] text-[8px]">
                Admin user
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* HEADER */}
        <header className="flex items-center justify-between h-14 px-6 bg-[#F2F4F6] border-b border-[rgba(194,198,212,0.05)] shadow-[0_0_4px_0_#000]">

          {/* LEFT */}
          <div className="flex items-center gap-3">
            {/* MOBILE BUTTON */}
            <button
              className="lg:hidden p-1 text-[#334155]"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu size={20} />
            </button>

            {/* BRANCH */}
            <div className="flex items-center gap-2">
              <span className="text-[#334155] font-semibold text-sm">
                Main Branch
              </span>
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-4">

            {/* NOTIFICATION */}
            <div className="relative">
              <Bell size={18} className="text-[#334155]" />
              <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-600 rounded-full"></span>
            </div>

            <div className="w-px h-6 bg-[rgba(194,198,212,0.30)]" />

            {/* PROFILE */}
            <div className="flex items-center gap-2">
              <span className="text-[#00488D] font-semibold text-xs">HMS</span>
              <img
                src="https://i.pravatar.cc/40"
                alt="Profile"
                className="w-7 h-7 rounded-xl object-cover"
              />
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
