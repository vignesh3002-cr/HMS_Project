import { useState, useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { remove } from "../../utils/token";
import { getUser } from "@/utils/token";
import { cn } from "@/lib/utils";
import { BranchSelector } from "@/components/hms/BranchSelector";
import { BranchFilterProvider } from "@/context/BranchFilterContext";
import { QuickAddFab } from "@/components/hms/QuickAddFab";
import { usePermission } from "@/context/PermissionContext";
import { UserProfileDropdown } from "@/components/ui/User_profile_dropdown";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Notifications from "@/components/Forms/view/Notification";
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
  Shield,
  Key,
  ClipboardList,
} from "lucide-react";

const navIcon: Record<string, React.ReactNode> = {
  Dashboard: <LayoutDashboard size={16} />,
  Staff: <Users size={16} />,
  Doctor: <Stethoscope size={16} />,
  Patients: <UserRound size={16} />,
  Appointment: <Calendar size={16} />,
  "Reschedule Queue": <ClipboardList size={16} />,
  Billing: <Receipt size={16} />,
  Protocol: <FileText size={16} />,
  Admin: <Settings size={16} />,
  Permissions: <Shield size={16} />,
  Roles: <Key size={16} />,
};

const bottomNavIcon: Record<string, React.ReactNode> = {
  Settings: <Settings size={16} />,
  Support: <HelpCircle size={16} />,
};

export function AppLayout({ children }: { children?: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Form routes that shouldn't highlight parent nav items
  const isFormPage =
    location.pathname.includes("/add") || location.pathname.includes("/edit/");

  // AddEmployee.tsx is shared between Doctor and Staff (add + edit), keyed
  // off /doctor/edit/:id vs /staff/edit/:id for edit, and the ?role= query
  // param for add -- so the Doctor nav item should stay highlighted there
  // too, unlike the Staff add/edit case which isFormPage otherwise hides.
  const isDoctorFormContext =
    /^\/doctor(\/|$)/i.test(location.pathname) ||
    (/^\/staff\/add$/i.test(location.pathname) &&
      new URLSearchParams(location.search).get("role")?.toLowerCase() === "doctor");

  // patientProfile.tsx (/patients/view/:id) and EditPatientForm.tsx
  // (/patients/edit/:id) are Patients sub-pages -- keep the nav item
  // highlighted there instead of isFormPage hiding it on the edit route.
  const isPatientsFormContext = /^\/patients(\/|$)/i.test(location.pathname);

  // Day view.tsx (/appointments/day-view) and Week view.tsx
  // (/appointments/week-view) are Appointment sub-views -- keep the nav item
  // highlighted there, but not on the other /appointments/... form routes
  // (add/edit/view/book), which stay off exactly as before.
  const isAppointmentViewContext = /^\/appointments\/(day-view|week-view)$/i.test(
    location.pathname,
  );

  // Admin nav item is a label that toggles a Permissions/Roles dropdown
  // instead of linking to the old AdminDashboard hub page.
  const isAdminSectionActive = /^\/admin(\/|$)/i.test(location.pathname);
  const [adminMenuOpen, setAdminMenuOpen] = useState(isAdminSectionActive);

  useEffect(() => {
    if (isAdminSectionActive) setAdminMenuOpen(true);
  }, [isAdminSectionActive]);

  const [logoutOpen, setLogoutOpen] = useState(false);

  const logout = () => {
    remove();
    localStorage.removeItem("user_info");
    navigate("/");
  };

  const handleLogout = () => {
    setLogoutOpen(false);
    logout();
  };

  const [userData, setUserData] = useState({
    username: "",
    user_id: "",
    role: "",
    hospital_id: "",
    hospital_name: "",
    branch_id: "",
    branch_area: "",
    branch: "",
  });

  const { can, loading: permissionsLoading } = usePermission();
  const hasPermission = (perm?: string) => !perm || permissionsLoading || can(perm);

  // Both Permissions and Roles pages are guarded by permission.manage on the
  // backend (permission.routes.ts + role.routes.ts), so one check covers both.
  const adminChildren = can("permission.manage")
    ? [
        { label: "Permissions", to: "/admin/permissions" },
        { label: "Roles", to: "/admin/roles" },
      ]
    : [];

  const navItems = [
    { label: "Dashboard", to: "/dashboard" },
    { label: "Staff", to: "/staff", permission: "employee.read" },
    // Doctor's own sub-pages (view profile, day view) live under /doctor/...
    // and should keep this item highlighted, unlike the other sections.
    { label: "Doctor", to: "/doctor", matchPrefix: true, permission: "doctor.read" },
    // Patients' view/edit sub-pages (patientProfile.tsx, EditPatientForm.tsx)
    // live under /patients/... and should keep this item highlighted too.
    { label: "Patients", to: "/patients", matchPrefix: true, permission: "patient.read" },
    { label: "Appointment", to: "/appointments", permission: "appointment.read" },
    {
      label: "Reschedule Queue",
      to: "/appointments/reschedule-queue",
      permission: "doctor.transfer",
    },
    { label: "Billing", to: "/billing" },
    { label: "Protocol", to: "/protocol", hasArrow: true },
    ...(adminChildren.length > 0
      ? [
          {
            label: "Admin",
            permission: "permission.manage",
            children: adminChildren,
          },
        ]
      : []),
  ].filter((item) => hasPermission(item.permission));

  const bottomNavItems = [
    { label: "Settings", to: "/settings" },
    { label: "Support", to: "/support" },
  ];

  useEffect(() => {
    const syncUserData = () => {
      const user = getUser();
      if (user) {
        setUserData({
          username: user.username ?? "",
          user_id: user.user_id ?? "",
          role: user.role ?? "",
          hospital_id: user.hospital_id ?? "",
          hospital_name: user.hospital_name ?? "",
          branch_id: user.branch_id ?? "",
          branch_area: user.branch_area ?? "",
          branch: user.branch ?? "",
        });
      }
    };

    syncUserData();
    window.addEventListener("user-updated", syncUserData);
    return () => window.removeEventListener("user-updated", syncUserData);
  }, []);

  return (
    <BranchFilterProvider>
      <div className="flex h-screen font-[Manrope,sans-serif] bg-[#F7F9FB]">
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
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
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
            {navItems.map((item) =>
              item.children ? (
                <div key={item.label}>
                  <button
                    type="button"
                    onClick={() => setAdminMenuOpen((open) => !open)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-[4px] text-xs font-semibold tracking-[0.6px] capitalize",
                      isAdminSectionActive
                        ? "bg-[#00488D] text-white shadow-sm"
                        : "text-[#475569] hover:bg-[#E6E8EA]",
                    )}
                  >
                    {navIcon[item.label]}
                    {item.label}
                    <ChevronDown
                      size={12}
                      className={cn(
                        "ml-auto transition-transform duration-150",
                        adminMenuOpen && "rotate-180",
                      )}
                    />
                  </button>
                  {adminMenuOpen && (
                    <div className="ml-6 mt-1 flex flex-col gap-1">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-2 px-3 py-2 rounded-[4px] text-xs font-semibold tracking-[0.6px] capitalize",
                              isActive
                                ? "bg-[#00488D] text-white shadow-sm"
                                : "text-[#475569] hover:bg-[#E6E8EA]",
                            )
                          }
                        >
                          {navIcon[child.label]}
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={!item.matchPrefix}
                  className={({ isActive }) => {
                    const active =
                      item.label === "Doctor"
                        ? isDoctorFormContext
                        : item.label === "Patients"
                          ? isPatientsFormContext
                          : item.label === "Appointment"
                            ? isActive || isAppointmentViewContext
                            : isActive && !isFormPage;
                    return cn(
                      "flex items-center gap-2 px-3 py-2 rounded-[4px] text-xs font-semibold tracking-[0.6px] capitalize",
                      active
                        ? "bg-[#00488D] text-white shadow-sm"
                        : "text-[#475569] hover:bg-[#E6E8EA]",
                    );
                  }}
                >
                  {navIcon[item.label]}
                  {item.label}
                  {item.hasArrow && <ChevronDown size={12} className="ml-auto" />}
                </NavLink>
              ),
            )}
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
                <div className="text-[#191C1E] font-bold text-[12px]">
                  {userData.username || "HMS Admin"}
                </div>
                <div className="text-[#64748B] text-[11px]">
                  {userData.user_id || "User"}
                </div>
                <div className="text-[#64748B] text-[10px]">
                  Branch: {userData.branch || userData.branch_id || "N/A"}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* HEADER */}
          <header className="flex h-16 items-center justify-between bg-white/90 backdrop-blur-sm border-b border-slate-200 px-8 shadow-sm sticky top-0 z-30">
            {/* LEFT */}
            <div className="flex items-center gap-3">
              {/* MOBILE BUTTON */}
              <button
                className="lg:hidden p-2 rounded-md hover:bg-slate-100 text-[#334155]"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu size={20} />
              </button>

              <BranchSelector />
            </div>

            {/* RIGHT */}
            <div className="flex items-center gap-4">
              {/* NOTIFICATION */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="relative p-2 rounded-full hover:bg-slate-100 transition-colors">
                    <Bell size={18} className="text-[#334155]" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full"></span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[380px] overflow-hidden rounded-[16px] border border-[#E5E7EB] bg-white p-0 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.16)]" align="end">
                  <Notifications />
                </PopoverContent>
              </Popover>

              <div className="w-px h-6 bg-[rgba(194,198,212,0.30)]" />

              {/* PROFILE DROPDOWN */}
              <UserProfileDropdown
                userName={userData.username || "HMS"}
                userSubtext={userData.user_id || "Admin user"}
                onLogout={() => setLogoutOpen(true)}
              />
            </div>
          </header>

          {/* CONTENT */}
          <main className="flex-1 overflow-y-auto p-6">
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

        <QuickAddFab />
      </div>
    </BranchFilterProvider>
  );
}