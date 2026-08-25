import { useEffect, useState } from "react";
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  MapPin,
  Clock,
  GraduationCap,
  Globe2,
  Lock,
  User,
  Bell,
  Settings,
  Image,
  Wallet,
  Link,
  FileText,
} from "lucide-react";
import { branchApi, type BranchDetail } from "@/api/branch.api";
import { employeeApi, EmployeeDetailResponse } from "@/api/employee.api";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import Security from "@/components/Forms/view/Security";
import NotificationSettings from "@/components/Forms/view/NotificationSettings";
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

const settingMenus = [
  {
    icon: <Settings size={18} />,
    title: "Account",
    description:
      "Manage your profile information, personal details and account settings.",
    active: true,
  },
  {
    icon: <Bell size={18} />,
    title: "Notification",
    description:
      "Customize how you receive notifications and reminders.",
  },
  {
    icon: <Lock size={18} />,
    title: "Security",
    description:
      "Manage password, login security and authentication.",
  },
  {
    icon: <Image size={18} />,
    title: "Appearance",
    description:
      "Personalize colors, themes and application appearance.",
  },
  {
    icon: <Wallet size={18} />,
    title: "Billing",
    description:
      "Manage billing information and invoices.",
  },
  {
    icon: <Link size={18} />,
    title: "Integrations",
    description:
      "Connect third-party applications and services.",
  },
  {
    icon: <FileText size={18} />,
    title: "Resources",
    description:
      "Helpful guides and documentation.",
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

const Profile = () => {
  // ============================================================
  // "ours" — branch-admin profile display (Profile header, credentials,
  // administrative scope, security card, activity log). Unchanged from
  // before the merge.
  // ============================================================

  // The admin shown here follows the currently selected branch (same
  // pattern as Doctor.tsx/Staff.tsx/Patients.tsx/Appointments.tsx via
  // useBranchFilter), not just the signed-in user's own login-time branch_id
  // -- Admin/Head Admin accounts default to "All Branches" with no single
  // branch_id, which previously left this page blank. GET /branch/:branchId
  // returns that branch's current_admin; fields with no real value are left
  // blank rather than falling back to placeholder text.
  const { selectedBranchId, isAllBranches } = useBranchFilter();
  const [branch, setBranch] = useState<BranchDetail | null>(null);
  const navigate = useNavigate();

  const isAdmin = ["SUPER_ADMIN", "HEAD_ADMIN", "BRANCH_ADMIN"].includes(
    String(getUser()?.role_type ?? "").toUpperCase()
  );

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
        console.error("[Profile] Failed to load branch:", err);
      });
  }, [selectedBranchId, isAllBranches]);

  const admin = branch?.current_admin ?? null;

  const displayName = admin?.full_name || "";
  const displayDesignation = admin?.designation || "";
  const displayBranch = formatBranchName(branch);
  const displayActiveSince = formatYear(admin?.assigned_date);
  const displayEmail = admin?.email || "";
  const displayMobile = admin?.mobile_no || "";
  const displayEmployeeId = admin?.employee_id || "";
  const displayPhoto = admin?.employee_photo_URL || "";

  // ============================================================
  // "theirs" — self-editable Account Settings form (left-nav + inline
  // editable form via employeeApi.getMe()/update()). Unchanged from before
  // the merge.
  // ============================================================

  const [profile, setProfile] = useState<EmployeeDetailResponse | null>(null);
  const [form, setForm] = useState<ProfileFormState>(emptyForm);
  const [photoUrl, setPhotoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState("Account");

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await employeeApi.getMe();
        const data = res.data.data;
        if (!isMounted) return;

        setProfile(data);
        setPhotoUrl(
          data.employee.employee_photo_URL || data.employee.photo || ""
        );
        window.dispatchEvent(
          new CustomEvent("profile-photo-updated", {
            detail: data.employee.employee_photo_URL || data.employee.photo || "",
          })
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
        if (isMounted) {
          setError(
            err?.response?.data?.message || "Failed to load profile details."
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);

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
      addAccountActivity(
        "Profile photo updated",
        "Your profile photo was changed successfully."
      );
      window.dispatchEvent(
        new CustomEvent("profile-photo-updated", { detail: dataUrl })
      );
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

  return (
    <>
      {/* ================================================================ */}
      {/* ================================================================ */}
      {/* "theirs" — self-editable Account Settings form                   */}
      {/* ================================================================ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Body */}
        <div className="flex-1 overflow-auto p-8">
          <div className="bg-white rounded-xl border shadow-sm h-full flex">
            {/* Left Navigation */}
            <div className="w-1/3 border-r">
              {settingMenus.map((item) => (
                <button
                  key={item.title}
                  onClick={() => {
                    if (
                      item.title === "Account" ||
                      item.title === "Security" ||
                      item.title === "Notification"
                    ) {
                      setActiveMenu(item.title);
                    }
                  }}
                  className={`w-full text-left p-6 border-b transition
                    ${activeMenu === item.title ? "bg-slate-50" : "hover:bg-gray-50"}`}
                >
                  <div className="flex gap-4">
                    <div
                      className={`mt-1 ${
                        activeMenu === item.title ? "text-blue-500" : "text-gray-400"
                      }`}
                    >
                      {item.icon}
                    </div>

                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-xs text-gray-500 mt-1 leading-5">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Right Panel Starts Here */}
            <div className="flex-1 p-8 overflow-auto">
              {activeMenu === "Security" ? (
                <Security embedded />
              ) : activeMenu === "Notification" ? (
                <NotificationSettings />
              ) : (
                <>
                  <h2 className="hms-heading mb-8">Account</h2>

                  {loading ? (
                    <p className="text-sm text-gray-500">Loading profile...</p>
                  ) : (
                    <form className="space-y-10">
                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                      {error}
                    </p>
                  )}

                  <section>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Profile Information
                        </h3>
                        <p className="hms-subheading">
                          Your profile details are read-only. Only the profile
                          photo can be changed.
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
                        <label className="mb-2 block text-sm font-medium">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={form.first_name}
                          disabled
                          className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 outline-none disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={form.last_name}
                          disabled
                          className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 outline-none disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={form.email}
                          disabled
                          onChange={(e) => handleChange("email", e.target.value)}
                          className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 outline-none disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          Phone Number
                        </label>
                        <input
                          type="text"
                          value={form.mobile_no}
                          disabled
                          className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 outline-none disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          Branch
                        </label>
                        <input
                          type="text"
                          value={branchName}
                          disabled
                          className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          Role
                        </label>
                        <input
                          type="text"
                          value={roleLabel}
                          disabled
                          className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 outline-none"
                        />
                      </div>
                    </div>
                  </section>

                  <hr />

                  {/* Personal Information */}
                  <section>
                    <h3 className="mb-6 text-lg font-semibold">
                      Personal Information
                    </h3>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          State
                        </label>
                        <input
                          value={form.employee_state}
                          disabled
                          className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          District
                        </label>
                        <input
                          value={form.employee_district}
                          disabled
                          className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          Postal Code
                        </label>
                        <input
                          value={form.employee_pincode}
                          disabled
                          className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          Address
                        </label>
                        <input
                          value={form.current_address}
                          disabled
                          className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </section>

                </form>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;
