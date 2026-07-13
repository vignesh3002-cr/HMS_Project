import { User, CreditCard, Bell, Settings, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserProfileDropdownProps {
  userName: string;
  userSubtext: string;
  userAvatar?: string;
  onLogout: () => void;
}

export function UserProfileDropdown({
  userName,
  userSubtext,
  userAvatar = "https://i.pravatar.cc/40",
  onLogout,
}: UserProfileDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 cursor-pointer outline-none">
          <span className="text-[#00488D] font-semibold text-xs">{userName}</span>
          <div className="relative">
            <img
              src={userAvatar}
              alt="Profile"
              className="w-7 h-7 rounded-xl object-cover"
            />
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[300px] rounded-xl border border-[#E5E7EB] bg-white p-0 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.16)] overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 bg-[#F8F9FF] border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={userAvatar}
                alt="Admin"
                className="w-12 h-12 rounded-full object-cover shadow-sm border border-[#E5E7EB]"
              />
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#39B8FD] border-2 border-white rounded-full z-10" title="Active" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-sm text-[#0B1C30] truncate">{userName}</h2>
              <p className="text-sm text-[#464555] truncate">{userSubtext}</p>
            </div>
          </div>
        </div>

        {/* Account */}
        <div className="py-2 border-b border-[#E5E7EB]">
          <h3 className="px-4 py-1 text-xs font-semibold text-[#777587] uppercase tracking-wider">Account</h3>
          <div className="px-2 mt-1 space-y-0.5">
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#464555] hover:bg-[#D3E4FE] hover:text-[#3525CD] transition-colors group"
            >
              <User size={18} className="group-hover:text-[#3525CD] transition-colors" />
              <span className="text-sm">Your Profile</span>
            </a>
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#464555] hover:bg-[#D3E4FE] hover:text-[#3525CD] transition-colors group"
            >
              <CreditCard size={18} className="group-hover:text-[#3525CD] transition-colors" />
              <span className="text-sm">Billing & Plans</span>
            </a>
          </div>
        </div>

        {/* Preferences */}
        <div className="py-2 border-b border-[#E5E7EB]">
          <h3 className="px-4 py-1 text-xs font-semibold text-[#777587] uppercase tracking-wider">Preferences</h3>
          <div className="px-2 mt-1 space-y-0.5">
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#464555] hover:bg-[#D3E4FE] hover:text-[#3525CD] transition-colors group"
            >
              <Bell size={18} className="group-hover:text-[#3525CD] transition-colors" />
              <span className="text-sm flex-1">Notifications</span>
              <div className="w-2 h-2 rounded-full bg-[#4F46E5] mr-1" />
            </a>
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#464555] hover:bg-[#D3E4FE] hover:text-[#3525CD] transition-colors group"
            >
              <Settings size={18} className="group-hover:text-[#3525CD] transition-colors" />
              <span className="text-sm">App Settings</span>
            </a>
          </div>
        </div>

        {/* Footer - Sign out */}
        <div className="p-2 bg-[#F8F9FF]">
          <button
            onClick={onLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[#464555] hover:bg-[#FFDAD6] hover:text-[#93000A] transition-colors group"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Sign out</span>
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
