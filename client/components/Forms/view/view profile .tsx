import React, { useEffect, useState } from "react";
import {
  Bell,
  Settings,
  Lock,
  Image,
  Wallet,
  Link,
  FileText,
} from "lucide-react";
import { employeeApi, EmployeeDetailResponse } from "@/api/employee.api";

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

const ViewProfileSettings = () => {
  const [profile, setProfile] = useState<EmployeeDetailResponse | null>(null);
  const [form, setForm] = useState<ProfileFormState>(emptyForm);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      setSaving(true);
      setError(null);
      await employeeApi.update(profile.employee.employee_id, {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        mobile_no: form.mobile_no,
        current_address: form.current_address,
        employee_state: form.employee_state,
        employee_district: form.employee_district,
        employee_pincode: form.employee_pincode
          ? Number(form.employee_pincode)
          : undefined,
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const roleType = profile?.user?.role_type || "";
  const roleLabel = ROLE_LABELS[roleType] || roleType || "";
  const branchName = profile?.employee?.branch?.branch_name || "";
  const photoUrl =
    profile?.employee?.employee_photo_URL ||
    profile?.employee?.photo ||
    "https://i.pravatar.cc/150?img=12";
  const fullName = [form.first_name, form.last_name].filter(Boolean).join(" ");

  return (
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
              <form className="space-y-10" onSubmit={handleSubmit}>
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
                        Update your account information.
                      </p>
                    </div>
                  </div>

                  {/* Profile Image */}
                  <div className="mb-8 flex items-center gap-6">
                    <img
                      src={photoUrl}
                      alt="Profile"
                      className="h-24 w-24 rounded-full border object-cover"
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
                        onChange={(e) =>
                          handleChange("first_name", e.target.value)
                        }
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
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
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
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
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
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
                        className="w-full rounded-lg border border-gray-300 px-4 py-3"
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
                        className="w-full rounded-lg border border-gray-300 px-4 py-3"
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
                        className="w-full rounded-lg border border-gray-300 px-4 py-3"
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
                        className="w-full rounded-lg border border-gray-300 px-4 py-3"
                      />
                    </div>
                  </div>
                </section>

                {/* ================= Form Actions ================= */}
                <div className="flex justify-end gap-4 pt-8 border-t">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewProfileSettings;
