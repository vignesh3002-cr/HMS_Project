import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, UserRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormDropdown } from "@/components/ui/form-dropdown";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { branchApi, Branch } from "@/api/branch.api";
import { patientApi } from "@/api/patient.api";
import ProfilePreview from "@/components/ui/Patient-preview";

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
  patient_emergency_mobile: "",
  patient_emergency_name: "",
  patient_emergency_relation: "",
  patient_photo_url: null,
};

const inputClass =
  "w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed";
const labelClass = "block text-sm font-semibold text-gray-800 mb-1.5";
const sectionClass = "border border-gray-100 rounded-xl p-6 bg-gray-50/40";
const sectionTitleClass = "text-xs font-bold text-[#00488D] uppercase tracking-wide mb-5";
const requiredStar = <span className="text-red-600 ml-0.5">*</span>;

export default function EditPatientForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const [formData, setFormData] = useState<FormData>(emptyFormData);
  const [sameAsCurrent, setSameAsCurrent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);

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

  const toDateInputValue = (val: string | null | undefined): string => {
    if (!val) return "";
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toISOString().split("T")[0];
  };

  const fetchPatient = async () => {
    if (!id) return;
    try {
      const response = await patientApi.getById(id);
      const patient = response.data.data;
      if (patient) {
        setFormData({
          branch_id: patient.branch_id || "",
          patient_first_name: patient.patient_first_name || "",
          patient_middle_name: patient.patient_middle_name || "",
          patient_last_name: patient.patient_last_name || "",
          patient_gender: patient.patient_gender || "",
          patient_dob: toDateInputValue(patient.patient_dob),
          patient_blood_group: patient.patient_blood_group || "",
          patient_primary_mobile: patient.patient_primary_mobile || "",
          patient_alternate_mobile: patient.patient_alternate_mobile || "",
          patient_email: patient.patient_email || "",
          patient_marital_status: patient.patient_marital_status || "",
          patient_nationality: patient.patient_nationality || "",
          patient_current_address: (patient as any).patient_current_address || "",
          patient_permanent_address: (patient as any).patient_permanent_address || "",
          patient_emergency_mobile: (patient as any).patient_emergency_mobile || "",
          patient_emergency_name: (patient as any).patient_emergency_name || "",
          patient_emergency_relation: (patient as any).patient_emergency_relation || "",
          patient_photo_url: patient.patient_photo_url || null,
        });
        if ((patient as any).patient_current_address && !(patient as any).patient_permanent_address) {
          setSameAsCurrent(true);
        }
      }
    } catch (error: any) {
      toast({
        title: "Failed to load patient",
        description: error.response?.data?.message ?? error.message ?? "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await branchApi.getAll();
      if (response.data?.data) setBranches(response.data.data);
      else if (Array.isArray(response.data)) setBranches(response.data as unknown as Branch[]);
    } catch (error) {
      console.error("Failed to fetch branches", error);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchPatient();
  }, [id]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!id) return;

    setSubmitting(true);

    try {
      const response = await patientApi.update(id, {
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
      });

      if (!response.data.success) {
        throw new Error(response.data.message);
      }

      toast({
        title: "Patient updated",
        description: `${formData.patient_first_name} ${formData.patient_last_name} was updated successfully.`,
      });

      navigate(-1);
    } catch (error: any) {
      toast({
        title: "Failed to update patient",
        description: error.response?.data?.message ?? error.message ?? "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData(emptyFormData);
    setSameAsCurrent(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9FB] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#00488D]" />
      </div>
    );
  }

  const firstName = formData.patient_first_name;
  const lastName = formData.patient_last_name;
  const bloodGroup = formData.patient_blood_group;
  const gender = formData.patient_gender;
  const dob = formData.patient_dob;
  const primaryMobile = formData.patient_primary_mobile;
  const email = formData.patient_email;
  const currentCity = formData.patient_current_address?.split(",").pop()?.trim() || "";
  const emergencyName = formData.patient_emergency_name;
  const emergencyMobile = formData.patient_emergency_mobile;

  return (
    <div className="min-h-screen bg-[#F7F9FB] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <div className="w-full bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
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
                <h4 className="hms-heading text-gray-900 tracking-tight">Edit Patient</h4>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className={sectionClass}>
                  <h3 className={sectionTitleClass}>Personal details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
                    <div className="lg:col-span-3 flex flex-col sm:flex-row items-center sm:items-start gap-14 pb-2">
                      <AvatarUpload
                        value={formData.patient_photo_url}
                        onChange={(url) => setField("patient_photo_url", url ?? "")}
                        label="Patient photo"
                        hint="Click or drag an image to upload"
                      />
                      <div aria-hidden="true" className="hidden sm:block w-px self-stretch bg-gray-200" />
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
                        onChange={(e) => handleInputChange(e, "patient_first_name")}
                        required
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Middle name</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={formData.patient_middle_name}
                        onChange={(e) => handleInputChange(e, "patient_middle_name")}
                        disabled={submitting}
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
                        onChange={(e) => handleInputChange(e, "patient_last_name")}
                        required
                        disabled={submitting}
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
                        disabled={submitting}
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
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        Blood group {requiredStar}
                      </label>
                      <FormDropdown
                        options={[
                          "A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−",
                        ]}
                        value={formData.patient_blood_group}
                        onValueChange={(val) => setField("patient_blood_group", val)}
                        placeholder="Select"
                        className={inputClass}
                        disabled={submitting}
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
                        onChange={(e) => handleInputChange(e, "patient_nationality")}
                        required
                        disabled={submitting}
                      />
                    </div>
                  </div>
                </div>

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
                        onChange={(e) => handleInputChange(e, "patient_primary_mobile")}
                        required
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Alternate mobile</label>
                      <input
                        type="tel"
                        className={inputClass}
                        value={formData.patient_alternate_mobile}
                        onChange={(e) => handleInputChange(e, "patient_alternate_mobile")}
                        disabled={submitting}
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
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>
                        Emergency mobile {requiredStar}
                      </label>
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        className={inputClass}
                        value={formData.patient_emergency_mobile}
                        onChange={(e) => handleInputChange(e, "patient_emergency_mobile")}
                        required
                        disabled={submitting}
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
                        onChange={(e) => handleInputChange(e, "patient_emergency_name")}
                        required
                        disabled={submitting}
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
                        onChange={(e) => handleInputChange(e, "patient_emergency_relation")}
                        required
                        disabled={submitting}
                      />
                    </div>

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
                        onChange={(e) => handleInputChange(e, "patient_current_address")}
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div className="lg:col-span-3 flex items-center gap-2 -mt-2">
                      <input
                        type="checkbox"
                        id="sameAsCurrent"
                        checked={sameAsCurrent}
                        onChange={handleSameAsCurrentToggle}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        disabled={submitting}
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
                        className={sameAsCurrent ? inputClass.replace("bg-white", "bg-gray-50").replace("text-gray-900", "text-gray-500") : inputClass}
                        value={formData.patient_permanent_address}
                        onChange={(e) => handleInputChange(e, "patient_permanent_address")}
                        required
                        disabled={submitting || sameAsCurrent}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-4 pt-6 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={submitting}
                    className="w-full sm:w-auto px-8 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto px-8 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 shadow-[0_4px_14px_0_rgba(37,99,235,0.2)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.3)] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Update Patient
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="sticky top-6 h-[calc(100vh-2rem)]">
              <ProfilePreview
                name={[firstName, lastName].filter(Boolean).join(" ")}
                emptyNameFallback="New patient"
                chips={[bloodGroup]}
                photoDataUrl={formData.patient_photo_url || undefined}
                details={[
                  { label: "Gender", value: gender },
                  { label: "DOB", value: dob },
                  { label: "Mobile", value: primaryMobile },
                  { label: "Email", value: email },
                  { label: "City", value: currentCity },
                  {
                    label: "Emergency",
                    value: emergencyName
                      ? `${emergencyName}${emergencyMobile ? " (" + emergencyMobile + ")" : ""}`
                      : undefined,
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}