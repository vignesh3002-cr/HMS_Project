import { useEffect, useState } from "react";
import {
  Lock,
  Bell,
  Settings,
  Image,
  Wallet,
  Link,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { branchApi, type BranchDetail } from "@/api/branch.api";
import { employeeApi, EmployeeDetailResponse } from "@/api/employee.api";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import Security from "@/components/Forms/view/Security";
import NotificationSettings from "@/components/Forms/view/NotificationSettings";
import IntegrationSettings from "@/components/Forms/view/IntegrationSettings";
import AppearanceSettings from "@/components/Forms/view/AppearanceSettings";
import BillingSettings from "@/components/Forms/view/BillingSettings";
import { getUser } from "@/utils/token";
import { addAccountActivity } from "@/utils/accountActivity";
import { useBranchFilter } from "@/context/BranchFilterContext";

function formatBranchName(branch: BranchDetail | null): string {
  if (!branch?.branch_name) return "";
  return branch.branch_area ? `${branch.branch_name} (${branch.branch_area})` : branch.branch_name;
}

function formatYear(date: string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return isNaN(d.getTime()) ? "" : String(d.getFullYear());
}

const SETTING_MENUS = [
  {
    key: "account",
    icon: <Settings size={18} />,
    title: "Account",
    description: "Manage your profile information, personal details and account settings.",
  },
  {
    key: "notification",
    icon: <Bell size={18} />,
    title: "Notification",
    description: "Customize how you receive notifications and reminders.",
  },
  {
    key: "security",
    icon: <Lock size={18} />,
    title: "Security",
    description: "Manage password, login security and authentication.",
  },
  {
    key: "appearance",
    icon: <Image size={18} />,
    title: "Appearance",
    description: "Personalize application theme and display.",
  },
  {
    key: "integrations",
    icon: <Link size={18} />,
    title: "Integrations",
    description: "Connect third-party applications and services.",
  },
  {
    key: "billing",
    icon: <Wallet size={18} />,
    title: "Billing",
    description: "Manage billing information and subscription.",
  },
];

const ROLE_LABELS: Record<string, string> = {
  BRANCH_ADMIN: "Branch Administrator",
  ADMIN: "Administrator",
  HEAD_ADMIN: "Head Administrator",
  SUPER_ADMIN: "Super Administrator",
  DOCTOR: "Doctor",
  NURSE: "Nurse",
  LAB_TECHNICIAN: "Lab Technician",
  PHARMACIST: "Pharmacist",
  STAFF: "Staff",
};

interface ProfileFormState {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  mobile_no: string;
  current_address: string;
  employee_state: string;
  employee_district: string;
  employee_pincode: string;
}

const emptyForm: ProfileFormState = {
  first_name: "",
  last_name: "",
  username: "",
  email: "",
  mobile_no: "",
  current_address: "",
  employee_state: "",
  employee_district: "",
  employee_pincode: "",
};

const SettingsPage = () => {
  // ============================================================
  // URL-synced tab state — `?tab=account` keeps the active tab
  // across refreshes and makes every tab deep-linkable.
  // ============================================================
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = (searchParams.get("tab") ?? "account").toLowerCase().trim();
  const normalizedTab = rawTab === "notifications" ? "notification" : rawTab;
  const validKeys = SETTING_MENUS.map((m) => m.key);
  const activeTab = validKeys.includes(normalizedTab) ? normalizedTab : "account";

  const setActiveTab = (key: string) => {
    setSearchParams({ tab: key }, { replace: true });
  };

  // ============================================================
  // Branch-admin profile display
  // ============================================================
  const { selectedBranchId, isAllBranches } = useBranchFilter();
  const [branch, setBranch] = useState<BranchDetail | null>(null);

  useEffect(() => {
    const branchId = !isAllBranches ? selectedBranchId : getUser()?.branch_id;
    if (!branchId) {
      setBranch(null);
      return;
    }
    branchApi
      .getById(branchId)
      .then((res) => {
        if (res.data?.data) setBranch(res.data.data);
      })
      .catch((err) => {
        console.error("[SettingsPage] Failed to load branch:", err);
      });
  }, [selectedBranchId, isAllBranches]);

  // ============================================================
  // Self-editable Account form
  // ============================================================
  const [profile, setProfile] = useState<EmployeeDetailResponse | null>(null);
  const [form, setForm] = useState<ProfileFormState>(emptyForm);
  const [photoUrl, setPhotoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchProfile = async () => {
    let isMounted = true;
    try {
      setLoading(true);
      setError(null);
      const res = await employeeApi.getMe();
      const data = res.data.data;
      if (!isMounted) return;

      setProfile(data);
      setPhotoUrl(data.employee.employee_photo_URL || "");
      window.dispatchEvent(
        new CustomEvent("profile-photo-updated", {
          detail: data.employee.employee_photo_URL || "",
        }),
      );
      setForm({
        first_name: data.employee.first_name || "",
        last_name: data.employee.last_name || "",
        username: (data as any).username || "",
        email: data.employee.email || "",
        mobile_no: data.employee.mobile_no || "",
        current_address: data.employee.current_address || "",
        employee_state: data.employee.employee_state || "",
        employee_district: data.employee.employee_district || "",
        employee_pincode: data.employee.employee_pincode
          ? String(data.employee.employee_pincode)
          : "",
      });
    } catch (err: any) {
      if (!isMounted) return;
      const msg = err?.response?.data?.message || "";
      const isTransient =
        !err?.response || err?.response?.status >= 500 || err?.code === "ECONNABORTED";
      if (isTransient && retryCount < 2) {
        const delay = (retryCount + 1) * 3000;
        setTimeout(() => {
          if (isMounted) setRetryCount((c) => c + 1);
        }, delay);
        return;
      }
      setError(msg || "Failed to load profile details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [retryCount]);

  const handleChange = (field: keyof ProfileFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoChange = async (dataUrl: string | null) => {
    if (!dataUrl || !profile) return;
    try {
      setSaving(true);
      setError(null);
      await employeeApi.updatePhoto(profile.employee.employee_id, dataUrl);
      setPhotoUrl(dataUrl);
      addAccountActivity("Profile photo updated", "Your profile photo was changed successfully.");
      window.dispatchEvent(new CustomEvent("profile-photo-updated", { detail: dataUrl }));
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to update photo.");
    } finally {
      setSaving(false);
    }
  };

  const roleType = profile?.user?.role_type || "";
  const roleLabel = ROLE_LABELS[roleType] || roleType || "";
  const branchName = profile?.employee?.branch?.branch_name || "";
  const fullName = [form.first_name, form.last_name].filter(Boolean).join(" ");

  // ============================================================
  // Render
  // ============================================================
  return (
    <div className="flex h-full min-h-0 flex-col gap-6 lg:flex-row">
      {/* ── Left Navigation ─────────────────────────────────── */}
      <nav
        aria-label="Settings sections"
        className="flex max-h-64 w-full shrink-0 flex-col gap-1 overflow-y-auto overscroll-contain rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:h-full lg:max-h-none lg:w-72"
      >
        {SETTING_MENUS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setActiveTab(item.key)}
            aria-current={activeTab === item.key ? "page" : undefined}
            className={`w-full rounded-lg p-4 text-left transition ${
              activeTab === item.key
                ? "bg-slate-50 ring-1 ring-blue-200 dark:bg-slate-800/80 dark:ring-blue-900"
                : "hover:bg-gray-50 dark:hover:bg-slate-800/40"
            }`}
          >
            <div className="flex gap-4">
              <div
                className={`mt-1 ${
                  activeTab === item.key ? "text-blue-500 dark:text-blue-400" : "text-gray-400 dark:text-slate-500"
                }`}
              >
                {item.icon}
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-900 dark:text-slate-100">{item.title}</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-5">{item.description}</p>
              </div>
            </div>
          </button>
        ))}
      </nav>

      {/* ── Right Panel ──────────────────────────────────────── */}
      <section className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">

        {/* Security */}
        {activeTab === "security" && <Security embedded />}

        {/* Notification */}
        {activeTab === "notification" && <NotificationSettings />}

        {/* Integrations */}
        {activeTab === "integrations" && <IntegrationSettings />}

        {/* Appearance */}
        {activeTab === "appearance" && <AppearanceSettings />}

        {/* Billing */}
        {activeTab === "billing" && <BillingSettings />}

        {/* Account (default) */}
        {activeTab === "account" && (
          <>
            <h2 className="hms-heading mb-8">Account</h2>

            {loading ? (
              <p className="text-sm text-gray-500">Loading profile...</p>
            ) : (
              <form className="space-y-10">
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 flex items-center justify-between">
                    <span>{error}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setRetryCount(0);
                      }}
                      className="ml-3 text-xs font-semibold text-blue-600 hover:underline shrink-0"
                    >
                      Retry
                    </button>
                  </p>
                )}

                {/* Profile Information */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Profile Information
                      </h3>
                      <p className="hms-subheading">
                        Your profile details are read-only. Only the profile photo can be
                        changed.
                      </p>
                    </div>
                  </div>

                  {/* Profile Image */}
                  <div className="mb-8 flex items-center gap-6">
                    <AvatarUpload
                      value={photoUrl}
                      onChange={handlePhotoChange}
                      label="Profile photo"
                      hint="Click to change your profile photo"
                      size={96}
                    />
                    <div>
                      <h4 className="hms-name-text">{fullName}</h4>
                      <p className="hms-content-text text-gray-500">
                        {roleLabel}
                        {branchName ? ` · ${branchName}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Grid */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">First Name</label>
                      <input
                        type="text"
                        value={form.first_name}
                        disabled
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 dark:text-slate-200 px-4 py-3 outline-none disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">Last Name</label>
                      <input
                        type="text"
                        value={form.last_name}
                        disabled
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 dark:text-slate-200 px-4 py-3 outline-none disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">Email Address</label>
                      <input
                        type="email"
                        value={form.email}
                        disabled
                        onChange={(e) => handleChange("email", e.target.value)}
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 dark:text-slate-200 px-4 py-3 outline-none disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">Phone Number</label>
                      <input
                        type="text"
                        value={form.mobile_no}
                        disabled
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 dark:text-slate-200 px-4 py-3 outline-none disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">Branch</label>
                      <input
                        type="text"
                        value={branchName}
                        disabled
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 dark:text-slate-200 px-4 py-3 outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">Role</label>
                      <input
                        type="text"
                        value={roleLabel}
                        disabled
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 dark:text-slate-200 px-4 py-3 outline-none"
                      />
                    </div>
                  </div>
                </section>

                <hr className="border-gray-200 dark:border-slate-800" />

                {/* Personal Information */}
                <section>
                  <h3 className="mb-6 text-lg font-semibold text-gray-900 dark:text-slate-100">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">State</label>
                      <input
                        value={form.employee_state}
                        disabled
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 dark:text-slate-200 px-4 py-3 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">District</label>
                      <input
                        value={form.employee_district}
                        disabled
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 dark:text-slate-200 px-4 py-3 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">Postal Code</label>
                      <input
                        value={form.employee_pincode}
                        disabled
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 dark:text-slate-200 px-4 py-3 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">Address</label>
                      <input
                        value={form.current_address}
                        disabled
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 dark:text-slate-200 px-4 py-3 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </section>
              </form>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default SettingsPage;
