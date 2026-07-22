import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, UserRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormDropdown } from "@/components/ui/form-dropdown";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { branchApi, Branch } from "@/api/branch.api";
import { patientApi } from "@/api/patient.api";

// Field names mirror the `patient_bio_data` table columns so every input
// here has a real column to be saved into once the patients API exists.
interface FormData {
  branch_id: string;
  patient_first_name: string;
  patient_middle_name: string;
  patient_last_name: string;
  patient_gender: string;
  patient_dob: string;
  patient_blood_group: string;
  patient_primary_mobile: string;
  patient_alternate_mobile: string;
  patient_email: string;
  patient_marital_status: string;
  patient_nationality: string;
  patient_current_address: string;
  patient_permanent_address: string;
  patient_username: string;
  patient_password: string;
  patient_emergency_mobile: string;
  patient_emergency_name: string;
  patient_emergency_relation: string;
  patient_photo_url: string | null;
}

const emptyFormData: FormData = {
  branch_id: "",
  patient_first_name: "",
  patient_middle_name: "",
  patient_last_name: "",
  patient_gender: "",
  patient_dob: "",
  patient_blood_group: "",
  patient_primary_mobile: "",
  patient_alternate_mobile: "",
  patient_email: "",
  patient_marital_status: "",
  patient_nationality: "",
  patient_current_address: "",
  patient_permanent_address: "",
  patient_username: "",
  patient_password: "",
  patient_emergency_mobile: "",
  patient_emergency_name: "",
  patient_emergency_relation: "",
  patient_photo_url: null,
};

// Shared styling — matches AddBranch.tsx / Addemployee.tsx conventions.
const inputClass =
  "w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed";
const labelClass = "block text-sm font-semibold text-gray-800 mb-1.5";
const sectionClass = "border border-gray-100 rounded-xl p-6 bg-gray-50/40";
const sectionTitleClass =
  "text-xs font-bold text-[#00488D] uppercase tracking-wide mb-5";
const requiredStar = <span className="text-red-600 ml-0.5">*</span>;

export default function PatientRegistrationForm() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState<FormData>(emptyFormData);
  const [sameAsCurrent, setSameAsCurrent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  // Re-typed password — must match before submit is allowed. Username has
  // no confirm field; it's a single required field (matches Addemployee.tsx).
  const [confirmPassword, setConfirmPassword] = useState("");

  // Fetch the real branch list on mount for the Branch dropdown.
  useEffect(() => {
    branchApi
      .getAll()
      .then((res) => {
        if (res.data?.data) setBranches(res.data.data);
        else if (Array.isArray(res.data)) setBranches(res.data as unknown as Branch[]);
      })
      .catch(() => {});
  }, []);

  const setField = (key: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    key: keyof FormData,
  ) => {
    const value = e.target.value;

    setFormData((prev) => {
      const next = { ...prev, [key]: value };

      // Keep Permanent Address mirrored to Current Address while the
      // "Same as Current Address" checkbox is ticked.
      if (key === "patient_current_address" && sameAsCurrent) {
        next.patient_permanent_address = value;
      }

      return next;
    });
  };

  const handleSameAsCurrentToggle = (e: ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSameAsCurrent(checked);
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        patient_permanent_address: prev.patient_current_address,
      }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!confirmPassword.trim()) {
      toast({
        title: "Missing required field",
        description: "Please confirm your Password.",
        variant: "destructive",
      });
      return;
    }

    if (formData.patient_password !== confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Password and Confirm Password do not match.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Address and emergency-contact fields aren't sent — patient_bio_data
      // has no columns for those yet. created_by is required by the backend
      // validation even though the controller actually derives it from the
      // logged-in user's auth token.
      const response = await patientApi.create({
        username: formData.patient_username,
        password: formData.patient_password,
        branch_id: formData.branch_id,
        first_name: formData.patient_first_name,
        middle_name: formData.patient_middle_name || undefined,
        last_name: formData.patient_last_name || undefined,
        gender: formData.patient_gender || undefined,
        dob: formData.patient_dob || undefined,
        blood_group: formData.patient_blood_group || undefined,
        mobile: formData.patient_primary_mobile,
        alternate_mobile: formData.patient_alternate_mobile || undefined,
        email: formData.patient_email || undefined,
        marital_status: formData.patient_marital_status || undefined,
        nationality: formData.patient_nationality || undefined,
        photo: formData.patient_photo_url || undefined,
        created_by: "SYSTEM",
      });

      if (!response.data.success) {
        throw new Error(response.data.message);
      }

      toast({
        title: "Patient added",
        description: `${formData.patient_first_name} ${formData.patient_last_name} was added successfully.`,
      });

      navigate(-1);
    } catch (error: any) {
      toast({
        title: "Failed to add patient",
        description:
          error.response?.data?.message ?? error.message ?? "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData(emptyFormData);
    setSameAsCurrent(false);
    setConfirmPassword("");
  };

  return (
    <div className="min-h-screen bg-[#F7F9FB] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Main Card */}
        <div className="w-full bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl hover:bg-gray-50 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div className="p-2.5 bg-blue-50 rounded-xl flex items-center justify-center">
              <UserRound className="w-5 h-5 text-blue-600" />
            </div>
            <h4 className="hms-heading text-gray-900 tracking-tight">
              Patient Registration
            </h4>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* PERSONAL DETAILS */}
            <div className={sectionClass}>
              <h3 className={sectionTitleClass}>Personal details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
                {/* Photo (left) + Branch (right) */}
                <div className="lg:col-span-3 flex flex-col sm:flex-row items-center sm:items-start gap-14 pb-2">
                  <AvatarUpload
                    value={formData.patient_photo_url}
                    onChange={(url) => setField("patient_photo_url", url ?? "")}
                    label="Patient photo"
                    hint="Click or drag an image to upload"
                  />
                  <div
                    aria-hidden="true"
                    className="hidden sm:block w-px self-stretch bg-gray-200"
                  />
                  <div className="w-full sm:w-72">
                    <label className={labelClass}>
                      Branch {requiredStar}
                    </label>
                    <FormDropdown
                      options={branches.map((b) => ({
                        label: `${b.branch_id}${b.branch_name ? ` - ${b.branch_name}` : ""}`,
                        value: b.branch_id,
                      }))}
                      value={formData.branch_id}
                      onValueChange={(val) => setField("branch_id", val)}
                      placeholder={branches.length ? "Select branch" : "No branches available"}
                      className={inputClass}
                      disabled={submitting || branches.length === 0}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    First name {requiredStar}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Aisha"
                    className={inputClass}
                    value={formData.patient_first_name}
                    onChange={(e) =>
                      handleInputChange(e, "patient_first_name")
                    }
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Middle name</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={formData.patient_middle_name}
                    onChange={(e) =>
                      handleInputChange(e, "patient_middle_name")
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Last name {requiredStar}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rahman"
                    className={inputClass}
                    value={formData.patient_last_name}
                    onChange={(e) =>
                      handleInputChange(e, "patient_last_name")
                    }
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>Gender {requiredStar}</label>
                  <FormDropdown
                    options={["Female", "Male", "Other"]}
                    value={formData.patient_gender}
                    onValueChange={(val) => setField("patient_gender", val)}
                    placeholder="Select"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Date of birth {requiredStar}
                  </label>
                  <input
                    type="date"
                    className={inputClass + " text-gray-500"}
                    value={formData.patient_dob}
                    onChange={(e) => handleInputChange(e, "patient_dob")}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Blood group {requiredStar}
                  </label>
                  <FormDropdown
                    options={[
                      "A+",
                      "A−",
                      "B+",
                      "B−",
                      "AB+",
                      "AB−",
                      "O+",
                      "O−",
                    ]}
                    value={formData.patient_blood_group}
                    onValueChange={(val) =>
                      setField("patient_blood_group", val)
                    }
                    placeholder="Select"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Nationality {requiredStar}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Indian"
                    className={inputClass}
                    value={formData.patient_nationality}
                    onChange={(e) =>
                      handleInputChange(e, "patient_nationality")
                    }
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Marital status</label>
                  <FormDropdown
                    options={["Single", "Married", "Divorced", "Widowed"]}
                    value={formData.patient_marital_status}
                    onValueChange={(val) =>
                      setField("patient_marital_status", val)
                    }
                    placeholder="Select"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* CONTACT & ADDRESS */}
            <div className={sectionClass}>
              <h3 className={sectionTitleClass}>Contact & address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                <div>
                  <label className={labelClass}>
                    Primary mobile {requiredStar}
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    className={inputClass}
                    value={formData.patient_primary_mobile}
                    onChange={(e) =>
                      handleInputChange(e, "patient_primary_mobile")
                    }
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Alternate mobile</label>
                  <input
                    type="tel"
                    className={inputClass}
                    value={formData.patient_alternate_mobile}
                    onChange={(e) =>
                      handleInputChange(e, "patient_alternate_mobile")
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    className={inputClass}
                    value={formData.patient_email}
                    onChange={(e) => handleInputChange(e, "patient_email")}
                  />
                </div>

                {/* Emergency contact — kept under the contact lines rather
                    than a separate section. */}
                <div>
                  <label className={labelClass}>
                    Emergency mobile {requiredStar}
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    className={inputClass}
                    value={formData.patient_emergency_mobile}
                    onChange={(e) =>
                      handleInputChange(e, "patient_emergency_mobile")
                    }
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Emergency contact name {requiredStar}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    className={inputClass}
                    value={formData.patient_emergency_name}
                    onChange={(e) =>
                      handleInputChange(e, "patient_emergency_name")
                    }
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Relation {requiredStar}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Spouse, Parent, Sibling"
                    className={inputClass}
                    value={formData.patient_emergency_relation}
                    onChange={(e) =>
                      handleInputChange(e, "patient_emergency_relation")
                    }
                    required
                  />
                </div>

                {/* Address — same simple single-field pattern as Addemployee.tsx */}
                <div className="lg:col-span-3">
                  <label className={labelClass}>
                    Current Address {requiredStar}
                  </label>
                  <input
                    type="text"
                    placeholder="Enter current address"
                    maxLength={255}
                    className={inputClass}
                    value={formData.patient_current_address}
                    onChange={(e) =>
                      handleInputChange(e, "patient_current_address")
                    }
                    required
                  />
                </div>

                <div className="lg:col-span-3 flex items-center gap-2 -mt-2">
                  <input
                    type="checkbox"
                    id="sameAsCurrent"
                    checked={sameAsCurrent}
                    onChange={handleSameAsCurrentToggle}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label
                    htmlFor="sameAsCurrent"
                    className="text-sm font-medium text-gray-700 cursor-pointer select-none"
                  >
                    Same as Current Address
                  </label>
                </div>

                <div className="lg:col-span-3">
                  <label className={labelClass}>
                    Permanent Address {requiredStar}
                  </label>
                  <input
                    type="text"
                    placeholder="Enter permanent address"
                    maxLength={255}
                    className={inputClass}
                    value={formData.patient_permanent_address}
                    onChange={(e) =>
                      handleInputChange(e, "patient_permanent_address")
                    }
                    disabled={sameAsCurrent}
                    required
                  />
                </div>
              </div>
            </div>

            {/* LOGIN CREDENTIALS */}
            <div className={sectionClass}>
              <h3 className={sectionTitleClass}>Login credentials</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                <div>
                  <label className={labelClass}>Username {requiredStar}</label>
                  <input
                    type="text"
                    placeholder="Enter username"
                    maxLength={50}
                    className={inputClass}
                    value={formData.patient_username}
                    onChange={(e) =>
                      handleInputChange(e, "patient_username")
                    }
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Password {requiredStar}</label>
                  <input
                    type="password"
                    placeholder="Enter password"
                    className={inputClass}
                    value={formData.patient_password}
                    onChange={(e) =>
                      handleInputChange(e, "patient_password")
                    }
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Confirm Password {requiredStar}
                  </label>
                  <input
                    type="password"
                    placeholder="Re-enter password"
                    className={inputClass}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-4 pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={handleReset}
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Clear form
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 shadow-[0_4px_14px_0_rgba(37,99,235,0.2)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.3)] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {submitting ? "Saving..." : "Save patient"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
