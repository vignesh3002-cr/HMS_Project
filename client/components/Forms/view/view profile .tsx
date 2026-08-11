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
import { getUser } from "@/utils/token";
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
      {/* "ours" — branch-admin profile display                            */}
      {/* ================================================================ */}
      <div className="flex w-full font-[Manrope,sans-serif] bg-[#F7F9FB] min-h-screen">
        <div className="flex flex-col flex-1 min-w-0">
          <main className="flex flex-col gap-6 p-6 md:p-8">

            {/* ================= Profile Header ================= */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-1/3 h-full bg-[#F2F4F6] opacity-60 rounded-l-full transform translate-x-1/4 -translate-y-1/4 pointer-events-none" />

              <div className="relative z-10 flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-[#D6E3FF] flex items-center justify-center border border-[#E5E7EB]">
                      {displayPhoto ? (
                        <img
                          src={displayPhoto}
                          alt={displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-10 h-10 text-[#00488D]" strokeWidth={1.5} />
                      )}
                    </div>
                    </div>

                  <div>
                    <h1 className="hms-heading">{displayName}</h1>
                    <p className="hms-content-text text-[#00488D] mt-1">
                      {displayDesignation}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#E6F0FF] text-[#00488D]">
                        <ShieldCheck className="w-3 h-3" /> Credentialed
                      </span>
                      {displayBranch && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#F2F4F6] text-[#475569]">
                          <MapPin className="w-3 h-3" /> {displayBranch}
                        </span>
                      )}
                      {displayActiveSince && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#F2F4F6] text-[#475569]">
                          <Clock className="w-3 h-3" /> Active Since {displayActiveSince}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="z-10 flex w-full flex-col items-stretch gap-2 md:w-auto md:flex-row">
                  <button className="px-4 py-2 rounded-lg border border-[#00488D] text-[#00488D] text-xs font-semibold hover:bg-[#E6F0FF] transition-colors">
                    Export CV
                  </button>
                </div>
              </div>

              {/* Contact Details */}
              <div className="relative z-10 mt-6 grid gap-6 border-t border-[#E5E7EB] pt-5 md:grid-cols-3">
                <div>
                  <p className="hms-id-text">Direct Email</p>
                  <p className="hms-content-text text-[#191C1E] mt-1">{displayEmail}</p>
                </div>
                <div>
                  <p className="hms-id-text">Office Extension</p>
                  <p className="hms-content-text text-[#191C1E] mt-1">{displayMobile}</p>
                </div>
                <div>
                  <p className="hms-id-text">Employee ID</p>
                  <p className="hms-content-text text-[#191C1E] mt-1">{displayEmployeeId}</p>
                </div>
              </div>
            </div>

            {/* ================= Main Grid ================= */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

              {/* Left Column */}
              <div className="lg:col-span-8">
                <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                      <GraduationCap className="h-5 w-5 text-slate-400" />
                      Professional Credentials
                    </h2>
                  </div>

                  <div className="space-y-3">
                    {/* Card */}
                    <div className="rounded-lg border-l-4 border-[#00488D] bg-[#F7F9FB] p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="hms-name-text">American Board of Medical Quality (ABMQ)</h3>
                          <p className="hms-content-text text-[#6B7280] mt-0.5">
                            Certified Medical Quality Professional
                          </p>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 whitespace-nowrap">
                          ACTIVE
                        </span>
                      </div>
                      <p className="hms-id-text mt-2 normal-case">
                        Issued: Nov 2018 • Expires: Nov 2028
                      </p>
                    </div>

                    {/* Card */}
                    <div className="rounded-lg border-l-4 border-[#00488D] bg-[#F7F9FB] p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="hms-name-text">
                            Doctor of Philosophy (PhD) in Health Administration
                          </h3>
                          <p className="hms-content-text text-[#6B7280] mt-0.5">
                            Johns Hopkins University
                          </p>
                        </div>
                        <span className="hms-content-text text-[#6B7280] whitespace-nowrap">
                          2009 – 2012
                        </span>
                      </div>
                    </div>

                    {/* Card */}
                    <div className="rounded-lg border-l-4 border-[#00488D] bg-[#F7F9FB] p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="hms-name-text">
                            Master of Healthcare Administration (MHA)
                          </h3>
                          <p className="hms-content-text text-[#6B7280] mt-0.5">
                            Cornell University
                          </p>
                        </div>
                        <span className="hms-content-text text-[#6B7280] whitespace-nowrap">
                          2006 – 2008
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="mt-6 border-t border-[#E5E7EB] pt-5">
                    <h3 className="hms-id-text text-[#00488D] mb-2">Professional Bio</h3>
                    <p className="hms-content-text text-[#475569] leading-6">
                      With over 12 years of clinical administrative experience,
                      Dr. Vance oversees the strategic operations of the Mercy
                      General Central Branch. Her focus lies in integrating
                      data-driven clinical workflows with patient-centric care
                      models. Prior to her tenure at Mercy General, she served as
                      the Director of Quality Assurance at St. Jude Medical
                      Complex, where she successfully reduced administrative
                      turnaround times by 22%.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6 lg:col-span-4">

                {/* ================= Administrative Scope ================= */}
                <div className="relative overflow-hidden rounded-xl bg-[#00488D] p-6 text-white shadow-sm">
                  <div className="absolute -right-6 -bottom-6 text-[110px] opacity-10 pointer-events-none">
                    🏥
                  </div>

                  <h2 className="mb-5 flex items-center gap-2 text-base font-semibold">
                    <Globe2 className="w-4 h-4" /> Administrative Scope
                  </h2>

                  <div className="space-y-2.5">
                    {[
                      { department: "Emergency Department", role: "Level 1 Trauma", icon: "🚑" },
                      { department: "Pathology Lab", role: "CLIA Certified", icon: "🧪" },
                      { department: "Diagnostic Imaging", role: "PACS Admin", icon: "🩻" },
                      { department: "Inpatient Pharmacy", role: "340B Oversight", icon: "💊" },
                    ].map((item) => (
                      <div
                        key={item.department}
                        className="flex items-center justify-between rounded-lg bg-white/10 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{item.icon}</span>
                          <span className="text-xs font-medium">{item.department}</span>
                        </div>
                        <span className="text-[10px] font-semibold opacity-90">{item.role}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-4">
                    <p className="text-[10px] uppercase tracking-wider opacity-80">
                      Annual Budget Responsibility
                    </p>
                    <h3 className="mt-1.5 text-2xl font-bold">
                      $14.2M
                      <span className="ml-2 text-xs font-normal opacity-70">USD</span>
                    </h3>
                  </div>
                </div>

                {/* ================= Security Card ================= */}
                <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                      <Lock className="h-5 w-5 text-slate-400" /> Security &amp; Access
                    </h2>
                    <button
                      onClick={() => navigate("/security")}
                      className="px-3 py-1.5 rounded-lg border border-[#00488D] text-[#00488D] text-xs font-semibold hover:bg-[#E6F0FF] transition-colors"
                    >
                      Manage Username &amp; Password
                    </button>
                  </div>

                  {/* 2FA */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="hms-name-text">Two-Factor Authentication</h4>
                      <p className="hms-content-text text-[#6B7280] mt-0.5">
                        FIDO2 / WebAuthn Enabled
                      </p>
                    </div>
                    <button className="relative h-6 w-11 rounded-full bg-green-500 transition-colors">
                      <span className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow" />
                    </button>
                  </div>

                  <hr className="my-5 border-[#E5E7EB]" />

                  {/* Login */}
                  <div>
                    <h4 className="hms-name-text">Last Sign-in</h4>
                    <p className="hms-content-text text-[#6B7280] mt-1">
                      Oct 24, 08:14 AM (IP: 192.1.22.4)
                    </p>
                  </div>

                  <hr className="my-5 border-[#E5E7EB]" />

                  {/* Permissions */}
                  <div>
                    <p className="hms-id-text mb-2">Effective Permissions</p>
                    <div className="flex flex-wrap gap-2">
                      {["WRITE_PATIENT_REC", "AUDIT_LOG_VIEW", "DEPT_BUDGET_APPROVE"].map(
                        (permission) => (
                          <span
                            key={permission}
                            className="px-2.5 py-1 rounded-md bg-[#F2F4F6] text-[10px] font-semibold text-[#475569]"
                          >
                            {permission}
                          </span>
                        ),
                      )}
                    </div>
                  </div>

                  <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-red-500 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors">
                    🔑 Reset Access Keys
                  </button>
                </div>
              </div>
            </div>

            {/* ================= Activity Log ================= */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col">
              <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
                <h2 className="text-[#191C1E] text-sm font-bold">Administrative Activity Log</h2>
                <button className="text-xs font-semibold text-[#00488D] hover:underline">
                  View Full Audit Trail →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-[#F2F4F6]">
                    <tr>
                      <th className="px-5 py-3 text-left hms-table-header">Timestamp</th>
                      <th className="px-5 py-3 text-left hms-table-header">Action Type</th>
                      <th className="px-5 py-3 text-left hms-table-header">Department</th>
                      <th className="px-5 py-3 text-left hms-table-header">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {[
                      {
                        time: "Oct 24, 02:45 PM",
                        action: "Staffing Reallocation",
                        department: "Emergency Dept (Trauma B)",
                        status: "Success",
                      },
                      {
                        time: "Oct 24, 11:12 AM",
                        action: "Budget Approval",
                        department: "Radiology Equipment Lease",
                        status: "Success",
                      },
                      {
                        time: "Oct 23, 04:30 PM",
                        action: "Compliance Audit Update",
                        department: "Pharmacy Controlled Subs",
                        status: "Pending",
                      },
                    ].map((row, index) => (
                      <tr
                        key={index}
                        className="border-t border-[#E5E7EB] hover:bg-[#F7F9FB] transition-colors"
                      >
                        <td className="px-5 py-4 hms-content-text text-[#6B7280]">{row.time}</td>
                        <td className="px-5 py-4 hms-name-text">{row.action}</td>
                        <td className="px-5 py-4 hms-content-text text-[#191C1E]">
                          {row.department}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                              row.status === "Success"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </main>
        </div>
      </div>

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
                  className={`w-full text-left p-6 border-b transition
                    ${item.active ? "bg-slate-50" : "hover:bg-gray-50"}`}
                >
                  <div className="flex gap-4">
                    <div
                      className={`mt-1 ${
                        item.active ? "text-blue-500" : "text-gray-400"
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
                          Your profile details are read-only.
                          {isAdmin ? " Only the profile photo can be changed." : ""}
                        </p>
                      </div>
                    </div>

                    {/* Profile Image */}
                    <div className="mb-8 flex items-center gap-6">
                      {isAdmin ? (
                        <AvatarUpload
                          value={photoUrl}
                          onChange={handlePhotoChange}
                          label="Profile photo"
                          hint="Only admins can change their own photo"
                          size={96}
                        />
                      ) : (
                        <img
                          src={photoUrl || "https://i.pravatar.cc/150?img=12"}
                          alt="Profile"
                          className="h-24 w-24 rounded-full border object-cover"
                        />
                      )}

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
                          onChange={(e) =>
                            handleChange("first_name", e.target.value)
                          }
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
                          onChange={(e) =>
                            handleChange("last_name", e.target.value)
                          }
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
                          onChange={(e) =>
                            handleChange("mobile_no", e.target.value)
                          }
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
                          onChange={(e) =>
                            handleChange("employee_state", e.target.value)
                          }
                          className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          District
                        </label>
                        <input
                          value={form.employee_district}
                          onChange={(e) =>
                            handleChange("employee_district", e.target.value)
                          }
                          className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          Postal Code
                        </label>
                        <input
                          value={form.employee_pincode}
                          onChange={(e) =>
                            handleChange("employee_pincode", e.target.value)
                          }
                          className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          Address
                        </label>
                        <input
                          value={form.current_address}
                          onChange={(e) =>
                            handleChange("current_address", e.target.value)
                          }
                          className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </section>

                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;
