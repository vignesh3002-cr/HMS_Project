import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LabNav from "./labnav";
import Profile from "@/components/Forms/view/view profile ";
import { UserProfileDropdown } from "@/components/ui/User_profile_dropdown";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { getUser, remove } from "@/utils/token";
import { employeeApi } from "@/api/employee.api";
import { BranchFilterProvider } from "@/context/BranchFilterContext";

export default function LabProfile() {
  const navigate = useNavigate();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const currentUser = getUser();
  const displayName = currentUser?.username || "Admin";
  const displayRole =
    currentUser?.role_type === "LAB_TECHNICIAN"
      ? "Lab Technician"
      : currentUser?.role_type || "Admin User";

  const [avatarUrl, setAvatarUrl] = useState<string>(
    () => localStorage.getItem("user_photo") || ""
  );
  const [avatarLoading, setAvatarLoading] = useState<boolean>(
    () => !localStorage.getItem("user_photo")
  );

  useEffect(() => {
    let mounted = true;
    const updatePhoto = (e: any) => {
      if (e?.detail) setAvatarUrl(e.detail);
    };
    window.addEventListener("profile-photo-updated", updatePhoto);

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

    return () => {
      mounted = false;
      window.removeEventListener("profile-photo-updated", updatePhoto);
    };
  }, []);

  const handleLogout = () => {
    setLogoutOpen(false);
    remove();
    localStorage.removeItem("user_info");
    localStorage.removeItem("user_photo");
    navigate("/");
  };

  return (
    <BranchFilterProvider>
      <div className="min-h-screen flex bg-[#f8fafd] text-[#1e293b] antialiased selection:bg-blue-100 font-sans">
        {/* Global Lab Navigation Sidebar */}
        <LabNav activeTab="Profile" />

        {/* Main Content Area */}
        <div className="flex-1 ml-64 min-h-screen flex flex-col min-w-0 bg-[#f8fafc]">
          {/* Top Header */}
          <header
            className="w-full h-20 border-b border-gray-200 bg-white flex-shrink-0 px-6 lg:px-8 flex items-center justify-between"
            data-purpose="page-header"
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/lab/dashboard")}
                className="p-1.5 -ml-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Back to Dashboard"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  My Profile
                </h1>
                <p className="text-xs text-slate-500">View and manage your account details</p>
              </div>
            </div>

            <div className="flex items-center space-x-3" data-purpose="user-badge">
              <UserProfileDropdown
                userName={displayName}
                userSubtext={displayRole}
                userAvatar={avatarUrl}
                avatarLoading={avatarLoading}
                onLogout={() => setLogoutOpen(true)}
                profilePath="/lab/profile"
                notificationsPath="/doctor/notifications"
              />
            </div>
          </header>

          {/* Profile View Content */}
          <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
            <Profile />
          </main>
        </div>

        {/* Logout Dialog */}
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
}

