import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, UserRound, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormDropdown } from "@/components/ui/form-dropdown";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { PhoneInput } from "@/components/ui/phone-input";
import { branchApi, Branch } from "@/api/branch.api";
import { patientApi } from "@/api/patient.api";


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

const inputCls =
  "w-full h-10 px-4 bg-white border border-gray-200 rounded-xl text-[13.5px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-[3px] focus:ring-blue-500/15 focus:border-blue-500 transition-all duration-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed";

const labelCls = "block text-[12.5px] font-semibold text-gray-700 mb-1.5";

const Req = () => <span className="text-red-600 ml-0.5">*</span>;
const Opt = () => (
  <span className="text-gray-400 text-[11px] font-normal ml-1">(optional)</span>
);

function Section({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-7">
      <h2 className="text-[14px] font-bold text-gray-900 pb-2 mb-1 border-b-2 border-blue-50">
        {title}
      </h2>
      <p className="text-[12px] text-gray-400 mb-4">{sub}</p>
      {children}
    </section>
  );
}

export default function EditPatientForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const [formData, setFormData] = useState<FormData>(emptyFormData);
  const [sameAsCurrent, setSameAsCurrent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [originalFormData, setOriginalFormData] = useState<FormData | null>(null);

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
        const loadedFormData: FormData = {
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
        };
        setFormData(loadedFormData);
        setOriginalFormData(loadedFormData);
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

    setShowSubmitConfirm(true);
  };

  const handleConfirmSubmit = async () => {
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
      setShowSubmitConfirm(false);
    }
  };

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const handleConfirmReset = () => {
    setShowResetConfirm(false);
    // Reload restores the patient's original values without wiping the
    // read-only fields the API doesn't echo back.
    window.location.reload();
  };

  const isDirty =
    !!originalFormData && JSON.stringify(formData) !== JSON.stringify(originalFormData);

  const handleBack = () => {
    if (isDirty) {
      setShowLeaveConfirm(true);
      return;
    }
    navigate("/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 flex items-center justify-center">
        <div className="w-full max-w-5xl bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100">
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-8 py-5 border-b border-gray-100">
          <button
            type="button"
            onClick={handleBack}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-50 transition-colors text-gray-500"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <UserRound className="w-5 h-5" />
          </div>
          <h4 className="hms-heading text-gray-900 tracking-tight">Edit Patient</h4>
        </div>

        {/* ── Body ── */}
        <form onSubmit={handleSubmit} className="px-8 pt-7 pb-8">
          {/* Photo + Branch */}
          <div className="flex items-start gap-10 pb-6 border-b border-gray-100 mb-7">
            <AvatarUpload
              value={formData.patient_photo_url}
              onChange={(url) => setField("patient_photo_url", url ?? "")}
              label="Patient photo"
              hint="Click or drag an image to upload (Max 1MB)"
              size={80}
            />
            <div className="w-px self-stretch bg-gray-200" aria-hidden />
            <div className="w-64">
              <label className="block text-[12.5px] font-semibold text-gray-700 mb-1.5">Branch <span className="text-red-600 ml-0.5">*</span></label>
              <FormDropdown
                options={branches.map((b) => ({
                  label: `${b.branch_id}${b.branch_name ? ` - ${b.branch_name}` : ""}`,
                  value: b.branch_id,
                }))}
                value={formData.branch_id}
                onValueChange={(val) => setField("branch_id", val)}
                placeholder={branches.length ? "Select branch" : "No branches available"}
                className="w-full h-10 px-4 bg-white border border-gray-200 rounded-xl text-[13.5px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-[3px] focus:ring-blue-500/15 focus:border-blue-500 transition-all duration-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                disabled={submitting || branches.length === 0}
              />
            </div>
          </div>

          {/* ── Personal details ── */}
          <Section title="Personal details" sub="Identifying details for this patient.">
            <div className="grid grid-cols-3 gap-x-5 gap-y-[18px]">
              <div>
                <label className={labelCls}>First name <Req /></label>
                <input
                  type="text"
                  placeholder="e.g. Aisha"
                  className={inputCls}
                  value={formData.patient_first_name}
                  onChange={(e) => handleInputChange(e, "patient_first_name")}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Middle name <Opt /></label>
                <input
                  type="text"
                  className={inputCls}
                  value={formData.patient_middle_name}
                  onChange={(e) => handleInputChange(e, "patient_middle_name")}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Last name <Req /></label>
                <input
                  type="text"
                  placeholder="e.g. Rahman"
                  className={inputCls}
                  value={formData.patient_last_name}
                  onChange={(e) => handleInputChange(e, "patient_last_name")}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={labelCls}>Gender <Req /></label>
                <FormDropdown
                  options={["Female", "Male", "Other"]}
                  value={formData.patient_gender}
                  onValueChange={(val) => setField("patient_gender", val)}
                  placeholder="Select"
                  className={inputCls}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Date of birth <Req /></label>
                <input
                  type="date"
                  max={new Date().toISOString().split("T")[0]}
                  className={inputCls + " text-gray-500"}
                  value={formData.patient_dob}
                  onChange={(e) => handleInputChange(e, "patient_dob")}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Blood group <Req /></label>
                <FormDropdown
                  options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]}
                  value={formData.patient_blood_group}
                  onValueChange={(val) => setField("patient_blood_group", val)}
                  placeholder="Select"
                  className={inputCls}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={labelCls}>Nationality <Req /></label>
                <input
                  type="text"
                  placeholder="e.g. Indian"
                  className={inputCls}
                  value={formData.patient_nationality}
                  onChange={(e) => handleInputChange(e, "patient_nationality")}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Marital status <Opt /></label>
                <FormDropdown
                  options={["Single", "Married", "Divorced"]}
                  value={formData.patient_marital_status}
                  onValueChange={(val) => setField("patient_marital_status", val)}
                  placeholder="Select"
                  className={inputCls}
                  disabled={submitting}
                />
              </div>
            </div>
          </Section>

          {/* ── Contact & Address ── */}
          <Section title="Contact & Address" sub="Contact details, address and location information.">
            <div className="grid grid-cols-3 gap-x-5 gap-y-[18px]">
              <div>
                <label className={labelCls}>Primary mobile <Req /></label>
                <PhoneInput
                  value={formData.patient_primary_mobile}
                  onChange={(value) => handleInputChange({ target: { name: "patient_primary_mobile", value } } as any, "patient_primary_mobile")}
                  placeholder="+91 98765 43210"
                  required
                  disabled={submitting}
                  defaultCountry="in"
                />
              </div>
              <div>
                <label className={labelCls}>Alternate mobile <Opt /></label>
                <PhoneInput
                  value={formData.patient_alternate_mobile}
                  onChange={(value) => handleInputChange({ target: { name: "patient_alternate_mobile", value } } as any, "patient_alternate_mobile")}
                  placeholder="+91 98765 43210"
                  optional
                  disabled={submitting}
                  defaultCountry="in"
                />
              </div>
              <div>
                <label className={labelCls}>Email <Opt /></label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  className={inputCls}
                  value={formData.patient_email}
                  onChange={(e) => handleInputChange(e, "patient_email")}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={labelCls}>Emergency mobile <Req /></label>
                <PhoneInput
                  value={formData.patient_emergency_mobile}
                  onChange={(value) => handleInputChange({ target: { name: "patient_emergency_mobile", value } } as any, "patient_emergency_mobile")}
                  placeholder="+91 98765 43210"
                  required
                  disabled={submitting}
                  defaultCountry="in"
                />
              </div>
              <div>
                <label className={labelCls}>Emergency contact name <Req /></label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  className={inputCls}
                  value={formData.patient_emergency_name}
                  onChange={(e) => handleInputChange(e, "patient_emergency_name")}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Relation <Req /></label>
                <input
                  type="text"
                  placeholder="e.g. Spouse, Parent, Sibling"
                  className={inputCls}
                  value={formData.patient_emergency_relation}
                  onChange={(e) => handleInputChange(e, "patient_emergency_relation")}
                  disabled={submitting}
                />
              </div>

              <div className="col-span-3">
                <label className={labelCls}>Current address <Req /></label>
                <input
                  type="text"
                  placeholder="Enter current address"
                  maxLength={255}
                  className={inputCls}
                  value={formData.patient_current_address}
                  onChange={(e) => handleInputChange(e, "patient_current_address")}
                  disabled={submitting}
                />
              </div>

              <div className="col-span-3 flex items-center gap-2">
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
                  className="text-[13px] text-gray-700 cursor-pointer select-none"
                >
                  Same as current address
                </label>
              </div>

              <div className="col-span-3">
                <label className={labelCls}>Permanent address <Req /></label>
                <input
                  type="text"
                  placeholder="Enter permanent address"
                  maxLength={255}
                  className={inputCls}
                  value={formData.patient_permanent_address}
                  onChange={(e) => handleInputChange(e, "patient_permanent_address")}
                  disabled={submitting || sameAsCurrent}
                />
              </div>
            </div>
          </Section>

          {/* ── Actions ── */}
          <div className="flex justify-end gap-3.5 pt-5 mt-1.5 border-t border-gray-100">
            <button
              type="button"
              onClick={handleReset}
              disabled={submitting}
              className="h-[42px] px-6 text-[13.5px] font-semibold text-gray-700 border border-gray-300 rounded-xl bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-[42px] px-6 text-[13.5px] font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <ConfirmationDialog
        open={showSubmitConfirm}
        onConfirm={handleConfirmSubmit}
        onCancel={() => setShowSubmitConfirm(false)}
        type="warning"
        title="Save changes?"
        description="Are you sure you want to save the changes to this patient?"
        confirmText="Save changes"
        cancelText="Cancel"
        loading={submitting}
      />

      <ConfirmationDialog
        open={showResetConfirm}
        type="info"
        title="Reset Form?"
        description="All fields will be reset to their original values."
        confirmText="Reset"
        cancelText="Cancel"
        onConfirm={handleConfirmReset}
        onCancel={() => setShowResetConfirm(false)}
      />

      <ConfirmationDialog
        open={showLeaveConfirm}
        type="info"
        title="Leave this page?"
        description="You have unsaved changes. If you leave now, your changes will be lost."
        confirmText="Leave"
        cancelText="Stay"
        onConfirm={() => {
          setShowLeaveConfirm(false);
          navigate("/dashboard");
        }}
        onCancel={() => setShowLeaveConfirm(false)}
      />
    </div>
  );
}