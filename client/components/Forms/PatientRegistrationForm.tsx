import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, Loader2, Plus, UserRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormDropdown } from "@/components/ui/form-dropdown";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { PhoneInput } from "@/components/ui/phone-input";
import { State as CSState, City } from "country-state-city";
import type { IState } from "country-state-city";
import { branchApi, Branch } from "@/api/branch.api";
import { patientApi } from "@/api/patient.api";
import { validateRequiredFields, type RequiredField } from "@/lib/validation";

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
  patient_type: string;
  patient_type_other: string;
  patient_primary_mobile: string;
  patient_alternate_mobile: string;
  patient_email: string;
  patient_marital_status: string;
  patient_nationality: string;
  patient_state: string;
  patient_district: string;
  patient_area: string;
  patient_pincode: string;
  patient_current_address: string;
  patient_permanent_address: string;
  patient_permanent_area: string;
  patient_permanent_state: string;
  patient_permanent_district: string;
  patient_permanent_pincode: string;
  patient_username: string;
  patient_password: string;
  patient_emergency_mobile: string;
  patient_emergency_name: string;
  patient_emergency_relation: string;
  patient_photo_url: string | null;
  // Insurance
  insurance_patient: string;
  insurance_provider: string;
  insurance_plan: string;
  policy_number: string;
  policy_holder_name: string;
  policy_holder_relation: string;
  validity_date: string;
  // // Diagnosis
  // diagnosed: string;
  // department: string;
  // primary_doctor: string;
  // diagnosis_notes: string;
}

const PATIENT_TYPE_OPTIONS = [
  "Outpatient (OPD)",
  "Inpatient (IPD)",
  "Emergency",
  "Day-care",
  "Corporate",
  "Insurance",
  "Referral",
];
const OTHER_PATIENT_TYPE_VALUE = "Others";

const emptyFormData: FormData = {
  branch_id: "",
  patient_first_name: "",
  patient_middle_name: "",
  patient_last_name: "",
  patient_gender: "",
  patient_dob: "",
  patient_blood_group: "",
  patient_type: "",
  patient_type_other: "",
  patient_primary_mobile: "",
  patient_alternate_mobile: "",
  patient_email: "",
  patient_marital_status: "",
  patient_nationality: "",
  patient_state: "",
  patient_district: "",
  patient_area: "",
  patient_pincode: "",
  patient_current_address: "",
  patient_permanent_address: "",
  patient_permanent_area: "",
  patient_permanent_state: "",
  patient_permanent_district: "",
  patient_permanent_pincode: "",
  patient_username: "",
  patient_password: "",
  patient_emergency_mobile: "",
  patient_emergency_name: "",
  patient_emergency_relation: "",
  patient_photo_url: null,
  insurance_patient: "no",
  insurance_provider: "",
  insurance_plan: "",
  policy_number: "",
  policy_holder_name: "",
  policy_holder_relation: "",
  validity_date: "",
  // diagnosed: "no",
  // department: "",
  // primary_doctor: "",
  // diagnosis_notes: "",
};

// ─── Shared style tokens — matches Addemployee.tsx conventions ───────────────

const inputCls =
  "w-full h-10 px-4 bg-white border border-gray-200 rounded-xl text-[13.5px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-[3px] focus:ring-blue-500/15 focus:border-blue-500 transition-all duration-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed";

const labelCls = "block text-[12.5px] font-semibold text-gray-700 mb-1.5";

const Req = () => <span className="text-red-600 ml-0.5">*</span>;
const Opt = () => (
  <span className="text-gray-400 text-[11px] font-normal ml-1">(optional)</span>
);

// ─── Section wrapper ──────────────────────────────────────────────────────────

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

export default function PatientRegistrationForm({
  editMode = false,
  patientId,
}: {
  editMode?: boolean;
  patientId?: string;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState<FormData>(emptyFormData);
  const [sameAsCurrent, setSameAsCurrent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(editMode);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [insuranceFiles, setInsuranceFiles] = useState<File[]>([]);
  const [indianStates, setIndianStates] = useState<IState[]>([]);
  const [districtOptions, setDistrictOptions] = useState<string[]>([]);
  const [permanentDistrictOptions, setPermanentDistrictOptions] = useState<string[]>([]);
  // Re-typed password — must match before submit is allowed. Username has
  // no confirm field; it's a single required field (matches Addemployee.tsx).
  // Not used in edit mode — the edit view has no login fields.
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [originalFormData, setOriginalFormData] = useState<FormData | null>(null);

  const toDateInputValue = (val: string | null | undefined): string => {
    if (!val) return "";
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toISOString().split("T")[0];
  };

  const addInsuranceFiles = (files: FileList | File[]) => {
    const arr = Array.from(files).filter(
      (f) => f.type.startsWith("image/") || f.type === "application/pdf"
    );
    setInsuranceFiles((prev) => {
      const combined = [...prev, ...arr];
      return combined.slice(0, 5);
    });
  };

  const removeInsuranceFile = (index: number) => {
    setInsuranceFiles((prev) => prev.filter((_, i) => i !== index));
  };

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

  useEffect(() => {
    setIndianStates(CSState.getStatesOfCountry("IN"));
  }, []);

  // Edit mode: load the existing patient into the form so it can be updated
  // through the same structure as registration.
  useEffect(() => {
    if (!editMode || !patientId) return;
    patientApi
      .getById(patientId)
      .then((res) => {
        const patient = res.data.data;
        if (patient) {
          const isKnownType =
            patient.patient_type &&
            (PATIENT_TYPE_OPTIONS.includes(patient.patient_type) ||
              patient.patient_type === OTHER_PATIENT_TYPE_VALUE);
          const loadedFormData: FormData = {
            branch_id: patient.branch_id || "",
            patient_first_name: patient.patient_first_name || "",
            patient_middle_name: patient.patient_middle_name || "",
            patient_last_name: patient.patient_last_name || "",
            patient_gender: patient.patient_gender || "",
            patient_dob: toDateInputValue(patient.patient_dob),
            patient_blood_group: patient.patient_blood_group || "",
            patient_type: isKnownType || !patient.patient_type ? (patient.patient_type || "") : OTHER_PATIENT_TYPE_VALUE,
            patient_type_other: isKnownType || !patient.patient_type ? "" : (patient.patient_type || ""),
            patient_primary_mobile: patient.patient_primary_mobile || "",
            patient_alternate_mobile: patient.patient_alternate_mobile || "",
            patient_email: patient.patient_email || "",
            patient_marital_status: patient.patient_marital_status || "",
            patient_nationality: patient.patient_nationality || "",
            patient_state: patient.patient_state || "",
            patient_district: patient.patient_district || "",
            patient_area: patient.patient_area || "",
            patient_pincode: patient.patient_pincode ? String(patient.patient_pincode) : "",
            patient_current_address: (patient as any).current_address || "",
            patient_permanent_address: (patient as any).permanent_address || "",
            patient_permanent_area: "",
            patient_permanent_state: "",
            patient_permanent_district: "",
            patient_permanent_pincode: "",
            patient_username: "",
            patient_password: "",
            patient_emergency_mobile: (patient as any).emergency_mobile || "",
            patient_emergency_name: (patient as any).emergency_name || "",
            patient_emergency_relation: (patient as any).emergency_relation || "",
            patient_photo_url: patient.patient_photo_url || null,
            insurance_patient: "no",
            insurance_provider: "",
            insurance_plan: "",
            policy_number: "",
            policy_holder_name: "",
            policy_holder_relation: "",
            validity_date: "",
          };
          setFormData(loadedFormData);
          setOriginalFormData(loadedFormData);
          if ((patient as any).current_address && !(patient as any).permanent_address) {
            setSameAsCurrent(true);
          }
        }
      })
      .catch((error: any) => {
        toast({
          title: "Failed to load patient",
          description: error.response?.data?.message ?? error.message ?? "Something went wrong.",
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
  }, [editMode, patientId, toast]);

  useEffect(() => {
    if (formData.patient_state) {
      const s = indianStates.find((s) => s.name === formData.patient_state);
      if (s)
        setDistrictOptions(
          City.getCitiesOfState("IN", s.isoCode)
            .map((c) => c.name)
            .sort(),
        );
    } else {
      setDistrictOptions([]);
    }
  }, [formData.patient_state, indianStates]);

  useEffect(() => {
    if (formData.patient_permanent_state) {
      const s = indianStates.find((s) => s.name === formData.patient_permanent_state);
      if (s)
        setPermanentDistrictOptions(
          City.getCitiesOfState("IN", s.isoCode)
            .map((c) => c.name)
            .sort(),
        );
    } else {
      setPermanentDistrictOptions([]);
    }
  }, [formData.patient_permanent_state, indianStates]);

  const setField = (key: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // Fields that live-mirror into their Permanent Address counterpart while
  // "Same as Current Address" is ticked — matches Addemployee.tsx, where only
  // plain text/number inputs mirror continuously; State/District (FormDropdown)
  // are copied once, at the moment the checkbox is ticked, not on every change.
  const CURRENT_TO_PERMANENT_KEY: Partial<Record<keyof FormData, keyof FormData>> = {
    patient_current_address: "patient_permanent_address",
    patient_area: "patient_permanent_area",
    patient_pincode: "patient_permanent_pincode",
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    key: keyof FormData,
  ) => {
    const value = e.target.value;

    setFormData((prev) => {
      const next = { ...prev, [key]: value };

      if (sameAsCurrent) {
        const permKey = CURRENT_TO_PERMANENT_KEY[key];
        if (permKey) (next as any)[permKey] = value;
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
        patient_permanent_area: prev.patient_area,
        patient_permanent_state: prev.patient_state,
        patient_permanent_district: prev.patient_district,
        patient_permanent_pincode: prev.patient_pincode,
      }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const required: RequiredField<keyof FormData>[] = [
      { key: "patient_first_name", label: "First name" },
      { key: "patient_last_name", label: "Last name" },
      { key: "patient_gender", label: "Gender" },
      { key: "patient_dob", label: "Date of birth" },
      { key: "patient_blood_group", label: "Blood group" },
      { key: "patient_nationality", label: "Nationality" },
      { key: "patient_marital_status", label: "Marital status" },
      { key: "patient_type", label: "Patient type" },
      { key: "patient_current_address", label: "Current address" },
      { key: "patient_area", label: "Area" },
      { key: "patient_state", label: "State" },
      { key: "patient_district", label: "District" },
      { key: "patient_pincode", label: "Pincode" },
      { key: "patient_permanent_address", label: "Permanent address" },
      { key: "patient_permanent_area", label: "Permanent area" },
      { key: "patient_permanent_state", label: "Permanent state" },
      { key: "patient_permanent_district", label: "Permanent district" },
      { key: "patient_permanent_pincode", label: "Permanent pincode" },
      { key: "patient_primary_mobile", label: "Primary mobile" },
      { key: "patient_emergency_name", label: "Emergency contact name" },
      { key: "patient_emergency_relation", label: "Emergency contact relation" },
      { key: "patient_emergency_mobile", label: "Emergency mobile" },
      { key: "branch_id", label: "Branch" },
    ];
    if (!validateRequiredFields(required, formData, toast)) return;

    if (
      formData.patient_type === OTHER_PATIENT_TYPE_VALUE &&
      !formData.patient_type_other.trim()
    ) {
      toast({
        title: "Missing required field",
        description: 'Please specify the patient type for "Others".',
        variant: "destructive",
      });
      return;
    }

    if (!editMode && !confirmPassword.trim()) {
      toast({
        title: "Missing required field",
        description: "Please confirm your Password.",
        variant: "destructive",
      });
      return;
    }

    if (!editMode && formData.patient_password !== confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Password and Confirm Password do not match.",
        variant: "destructive",
      });
      return;
    }

    if (formData.insurance_patient === "yes") {
      const insuranceRequired: { key: keyof typeof formData; label: string }[] = [
        { key: "insurance_provider", label: "Insurance provider" },
        { key: "insurance_plan", label: "Insurance plan" },
        { key: "policy_number", label: "Policy number" },
        { key: "policy_holder_name", label: "Policy holder name" },
        { key: "policy_holder_relation", label: "Relation" },
        { key: "validity_date", label: "Validity date" },
      ];
      if (!validateRequiredFields(insuranceRequired, formData, toast)) return;
      if (insuranceFiles.length === 0) {
        toast({ title: "Missing required field", description: "Please upload at least one insurance document.", variant: "destructive" });
        return;
      }
    }

    // if (formData.diagnosed === "yes") {
    //   if (!formData.department.trim() || !formData.primary_doctor.trim()) {
    //     toast({ title: "Missing required field", description: "Department and Primary doctor are required when Diagnosed is Yes.", variant: "destructive" });
    //     return;
    //   }
    // }

    setShowSubmitConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);

    try {
      if (editMode && patientId) {
        const response = await patientApi.update(patientId, {
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
          current_address: formData.patient_current_address || undefined,
          emergency_name: formData.patient_emergency_name || undefined,
          emergency_relation: formData.patient_emergency_relation || undefined,
          emergency_mobile: formData.patient_emergency_mobile || undefined,
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
        return;
      }

      // Address and emergency-contact fields map onto the patient_bio_data
      // columns Patient_address / Patient_Emergency_contact_name /
      // Emergency_contact_relation / Patient_emergency_mobile in the backend
      // service. created_by is required by the backend validation even though
      // the controller actually derives it from the logged-in user's auth token.
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
        patient_type:
          formData.patient_type === OTHER_PATIENT_TYPE_VALUE
            ? formData.patient_type_other.trim() || undefined
            : formData.patient_type || undefined,
        patient_state: formData.patient_state || undefined,
        patient_district: formData.patient_district || undefined,
        patient_area: formData.patient_area || undefined,
        patient_pincode: formData.patient_pincode ? Number(formData.patient_pincode) : undefined,
        current_address: formData.patient_current_address || undefined,
        emergency_name: formData.patient_emergency_name || undefined,
        emergency_relation: formData.patient_emergency_relation || undefined,
        emergency_mobile: formData.patient_emergency_mobile || undefined,
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
      setShowSubmitConfirm(false);
    }
  };

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const handleConfirmReset = () => {
    setShowResetConfirm(false);
    setFormData(editMode && originalFormData ? originalFormData : emptyFormData);
    setSameAsCurrent(false);
    setConfirmPassword("");
    setInsuranceFiles([]);
  };

  const isDirty = editMode
    ? !!originalFormData &&
      (JSON.stringify(formData) !== JSON.stringify(originalFormData) || insuranceFiles.length > 0)
    : JSON.stringify(formData) !== JSON.stringify(emptyFormData) || insuranceFiles.length > 0;

  const handleBack = () => {
    if (isDirty) {
      setShowLeaveConfirm(true);
      return;
    }
    navigate("/dashboard");
  };

  if (loading && editMode) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 flex items-center justify-center">
        <div className="w-full max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex items-center justify-center">
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
          <h4 className="hms-heading text-gray-900 tracking-tight">
            {editMode ? "Edit Patient" : "Patient Registration"}
          </h4>
        </div>

        {/* ── Body ── */}
        <form onSubmit={handleSubmit} className="px-8 pt-7 pb-8">

          {/* Photo */}
          <div className="flex items-start gap-10 pb-6 border-b border-gray-100 mb-7">
            <AvatarUpload
              value={formData.patient_photo_url}
              onChange={(url) => setField("patient_photo_url", url ?? "")}
              label="Patient photo"
              hint="Click or drag an image to upload"
              size={96}
            />
          </div>

          {/* ── Personal details ── */}
          <Section
            title="Personal details"
            sub="Personal details used to identify the patient."
          >
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
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Middle name</label>
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
                  required
                />
              </div>

              <div>
                <label className={labelCls}>Gender <Req /></label>
                <FormDropdown
                  className={inputCls}
                  options={["Female", "Male", "Other"]}
                  value={formData.patient_gender}
                  onValueChange={(val) => setField("patient_gender", val)}
                  placeholder="Select"
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
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Blood group <Req /></label>
                <FormDropdown
                  className={inputCls}
                  options={["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"]}
                  value={formData.patient_blood_group}
                  onValueChange={(val) => setField("patient_blood_group", val)}
                  placeholder="Select"
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
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Marital status <Req /></label>
                <FormDropdown
                  className={inputCls}
                  options={["Single", "Married", "Divorced"]}
                  value={formData.patient_marital_status}
                  onValueChange={(val) => setField("patient_marital_status", val)}
                  placeholder="Select"
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Patient type <Req /></label>
                <FormDropdown
                  className={inputCls}
                  options={[...PATIENT_TYPE_OPTIONS, OTHER_PATIENT_TYPE_VALUE]}
                  value={formData.patient_type}
                  onValueChange={(val) =>
                    setFormData((p) => ({
                      ...p,
                      patient_type: val,
                      patient_type_other:
                        val === OTHER_PATIENT_TYPE_VALUE ? p.patient_type_other : "",
                    }))
                  }
                  placeholder="Select patient type"
                  disabled={submitting}
                />
              </div>

              <AnimatePresence>
                {formData.patient_type === OTHER_PATIENT_TYPE_VALUE && (
                  <motion.div
                    key="patientTypeOther"
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <label className={labelCls}>
                      Specify patient type <Req />
                    </label>
                    <input
                      type="text"
                      placeholder="Enter patient type"
                      maxLength={50}
                      className={inputCls}
                      value={formData.patient_type_other}
                      onChange={(e) => setField("patient_type_other", e.target.value)}
                      disabled={submitting}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Section>

          {/* ── Address and location ── */}
          <Section
            title="Address and location"
            sub="State, district and residential details."
          >
            <div className="grid grid-cols-3 gap-x-5 gap-y-[18px]">

              <div className="col-span-1">
                <label className={labelCls}>Current address <Req /></label>
                <input
                  type="text"
                  placeholder="Enter building no and street name"
                  maxLength={255}
                  className={inputCls}
                  value={formData.patient_current_address}
                  onChange={(e) => handleInputChange(e, "patient_current_address")}
                  disabled={submitting}
                  required
                />
              </div>

              <div>
                <label className={labelCls}>Area <Req /></label>
                <input
                  name="patient_area"
                  placeholder="Enter area"
                  maxLength={50}
                  className={inputCls}
                  value={formData.patient_area}
                  onChange={(e) => handleInputChange(e, "patient_area")}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={labelCls}>State <Req /></label>
                <FormDropdown
                  className={inputCls}
                  options={indianStates.map((s) => s.name)}
                  value={formData.patient_state}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, patient_state: v, patient_district: "" }))
                  }
                  placeholder="Select state"
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>District <Req /></label>
                <FormDropdown
                  className={inputCls}
                  options={districtOptions}
                  value={formData.patient_district}
                  onValueChange={(v) => setField("patient_district", v)}
                  placeholder={formData.patient_state ? "Select district" : "Select state first"}
                  disabled={submitting || !formData.patient_state}
                />
              </div>

              <div>
                <label className={labelCls}>Pincode <Req /></label>
                <input
                  name="patient_pincode"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Enter pincode"
                  maxLength={10}
                  className={inputCls}
                  value={formData.patient_pincode}
                  onChange={(e) => handleInputChange(e, "patient_pincode")}
                  disabled={submitting}
                />
              </div>


              {/* ── Permanent Address section — commented out (kept for future use) ──
              <div className="col-span-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sameAsCurrent"
                  checked={sameAsCurrent}
                  onChange={handleSameAsCurrentToggle}
                  disabled={submitting}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="sameAsCurrent"
                  className="text-[13px] text-gray-700 cursor-pointer select-none"
                >
                  Same as Current Address
                </label>
              </div>

              <div className="col-span-1">
                <label className={labelCls}>Permanent address <Req /></label>
                <input
                  type="text"
                  placeholder="Enter building no and street name"
                  maxLength={255}
                  className={inputCls}
                  value={formData.patient_permanent_address}
                  onChange={(e) => handleInputChange(e, "patient_permanent_address")}
                  disabled={submitting || sameAsCurrent}
                  required
                />
              </div>

              <div>
                <label className={labelCls}>Permanent area <Req /></label>
                <input
                  type="text"
                  placeholder="Enter area"
                  maxLength={50}
                  className={inputCls}
                  value={formData.patient_permanent_area}
                  onChange={(e) => handleInputChange(e, "patient_permanent_area")}
                  disabled={submitting || sameAsCurrent}
                />
              </div>

              <div>
                <label className={labelCls}>Permanent state <Req /></label>
                <FormDropdown
                  className={inputCls}
                  options={indianStates.map((s) => s.name)}
                  value={formData.patient_permanent_state}
                  onValueChange={(v) =>
                    setFormData((p) => ({
                      ...p,
                      patient_permanent_state: v,
                      patient_permanent_district: "",
                    }))
                  }
                  placeholder="Select state"
                  disabled={submitting || sameAsCurrent}
                />
              </div>
              <div>
                <label className={labelCls}>Permanent district <Req /></label>
                <FormDropdown
                  className={inputCls}
                  options={permanentDistrictOptions}
                  value={formData.patient_permanent_district}
                  onValueChange={(v) => setField("patient_permanent_district", v)}
                  placeholder={
                    formData.patient_permanent_state ? "Select district" : "Select state first"
                  }
                  disabled={submitting || sameAsCurrent || !formData.patient_permanent_state}
                />
              </div>

              <div>
                <label className={labelCls}>Permanent pincode <Req /></label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Enter pincode"
                  maxLength={10}
                  className={inputCls}
                  value={formData.patient_permanent_pincode}
                  onChange={(e) => handleInputChange(e, "patient_permanent_pincode")}
                  disabled={submitting || sameAsCurrent}
                />
              </div>
              ────────────────────────────────────────────────────────────── */}
            </div>
          </Section>

          {/* ── Contact information ── */}
          <Section
            title="Contact information"
            sub="How to reach the patient and in an emergency."
          >
            <div className="grid grid-cols-3 gap-x-5 gap-y-[18px]">
              <div>
                <label className={labelCls}>Primary mobile <Req /></label>
                <PhoneInput
                  value={formData.patient_primary_mobile}
                  onChange={(value) => handleInputChange({ target: { name: "patient_primary_mobile", value } } as any, "patient_primary_mobile")}
                  placeholder="+91 98765 43210"
                  disabled={submitting}
                  defaultCountry="in"
                />
              </div>
              <div>
                <label className={labelCls}>
                  Alternate mobile <Opt />
                </label>
                <PhoneInput
                  value={formData.patient_alternate_mobile}
                  onChange={(value) => handleInputChange({ target: { name: "patient_alternate_mobile", value } } as any, "patient_alternate_mobile")}
                  placeholder="+91 98765 43210"
                  disabled={submitting}
                  defaultCountry="in"
                />
              </div>
              <div>
                <label className={labelCls}>
                  Email <Opt />
                </label>
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
                <label className={labelCls}>Emergency contact name <Req /></label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  className={inputCls}
                  value={formData.patient_emergency_name}
                  onChange={(e) => handleInputChange(e, "patient_emergency_name")}
                  disabled={submitting}
                  required
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
                  required
                />
              </div>
                            <div>
                <label className={labelCls}>Emergency mobile <Req /></label>
                <PhoneInput
                  value={formData.patient_emergency_mobile}
                  onChange={(value) => handleInputChange({ target: { name: "patient_emergency_mobile", value } } as any, "patient_emergency_mobile")}
                  placeholder="+91 98765 43210"
                  disabled={submitting}
                  defaultCountry="in"
                />
              </div>
            </div>
          </Section>

          {/* ── Branch selection ── */}
          <Section
            title="Branch selection"
            sub="Which branch this patient is registering at."
          >
            <div className="grid grid-cols-3 gap-x-5 gap-y-[18px]">
              <div>
                <label className={labelCls}>
                  Branch <Req />
                </label>
                <FormDropdown
                  className={inputCls}
                  options={branches.map((b) => ({
                    label: `${b.branch_id}${b.branch_name ? ` - ${b.branch_name}` : ""}`,
                    value: b.branch_id,
                  }))}
                  value={formData.branch_id}
                  onValueChange={(val) => setField("branch_id", val)}
                  placeholder={branches.length ? "Select branch" : "No branches available"}
                  disabled={submitting || branches.length === 0}
                />
              </div>
            </div>
          </Section>

          {/* ── Insurance details ── */}
          <Section
            title="Insurance details"
            sub="Add insurance information if the patient is covered."
          >
            <div className="grid grid-cols-3 gap-x-5 gap-y-[18px]">
              <div className="col-span-3">
                <label className={labelCls}>Insurance patient <Req /></label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-[13.5px] text-gray-900 cursor-pointer">
                    <input
                      type="radio"
                      name="insurance_patient"
                      value="no"
                      checked={formData.insurance_patient === "no"}
                      onChange={(e) => setField("insurance_patient", e.target.value)}
                      disabled={submitting}
                      className="w-4 h-4 accent-blue-600"
                    />{" "}
                    No
                  </label>
                  <label className="flex items-center gap-2 text-[13.5px] text-gray-900 cursor-pointer">
                    <input
                      type="radio"
                      name="insurance_patient"
                      value="yes"
                      checked={formData.insurance_patient === "yes"}
                      onChange={(e) => setField("insurance_patient", e.target.value)}
                      disabled={submitting}
                      className="w-4 h-4 accent-blue-600"
                    />{" "}
                    Yes
                  </label>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {formData.insurance_patient === "yes" && (
                <motion.div
                  key="insurance"
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="grid grid-cols-3 gap-x-5 gap-y-[18px] mt-2">
                    <div>
                      <label className={labelCls}>Insurance provider <Req /></label>
                      <input
                        type="text"
                        placeholder="Enter provider name"
                        className={inputCls}
                        value={formData.insurance_provider}
                        onChange={(e) => setField("insurance_provider", e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Insurance plan <Req /></label>
                      <input
                        type="text"
                        placeholder="Enter plan name"
                        className={inputCls}
                        value={formData.insurance_plan}
                        onChange={(e) => setField("insurance_plan", e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Policy number <Req /></label>
                      <input
                        type="text"
                        placeholder="Enter policy number"
                        className={inputCls}
                        value={formData.policy_number}
                        onChange={(e) => setField("policy_number", e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Policy holder name <Req /></label>
                      <input
                        type="text"
                        placeholder="Enter holder name"
                        className={inputCls}
                        value={formData.policy_holder_name}
                        onChange={(e) => setField("policy_holder_name", e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Relation <Req /></label>
                      <FormDropdown
                        className={inputCls}
                        options={["Self", "Spouse", "Parent", "Child", "Sibling", "Other"]}
                        value={formData.policy_holder_relation}
                        onValueChange={(val) => setField("policy_holder_relation", val)}
                        placeholder="Select relation"
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Validity date <Req /></label>
                      <input
                        type="date"
                        max={new Date().toISOString().split("T")[0]}
                        className={inputCls + " text-gray-500"}
                        value={formData.validity_date}
                        onChange={(e) => setField("validity_date", e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                    <div className="col-span-3">
                      <label className={labelCls}>
                        Insurance documents {insuranceFiles.length === 0 && <Req />}
                      </label>
                      <div
                        className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center bg-gradient-to-b from-white to-gray-50/60 hover:border-blue-500 hover:bg-blue-50/30 transition-all duration-200 cursor-pointer relative"
                        tabIndex={0}
                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("!border-blue-500", "!bg-blue-50/30"); }}
                        onDragLeave={(e) => { e.currentTarget.classList.remove("!border-blue-500", "!bg-blue-50/30"); }}
                        onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("!border-blue-500", "!bg-blue-50/30"); addInsuranceFiles(e.dataTransfer.files); }}
                        onClick={(e) => {
                          if (!(e.target as HTMLElement).closest(".file-remove-btn")) {
                            document.getElementById("insurance-file-input")?.click();
                          }
                        }}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); document.getElementById("insurance-file-input")?.click(); } }}
                      >
                        <input
                          id="insurance-file-input"
                          type="file"
                          accept="image/*,application/pdf"
                          multiple
                          className="hidden"
                          onChange={(e) => { if (e.target.files) addInsuranceFiles(e.target.files); }}
                        />
                        {insuranceFiles.length === 0 ? (
                          <div className="flex flex-col items-center gap-2">
                            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                            <span className="text-[13px] text-gray-500">Drop insurance documents here</span>
                            <span className="text-[11px] text-gray-400">Images, PDF • Max 5 files</span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-3">
                            {insuranceFiles.map((file, i) => (
                              <div key={i} className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm animate-[slideUp_0.2s_ease]">
                                {file.type.startsWith("image/") ? (
                                  <img
                                    src={URL.createObjectURL(file)}
                                    alt=""
                                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                                  </div>
                                )}
                                <div className="text-left min-w-0 max-w-[180px]">
                                  <p className="text-xs font-medium truncate">{file.name}</p>
                                  <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                                <button
                                  type="button"
                                  className="file-remove-btn p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                                  onClick={() => removeInsuranceFile(i)}
                                  aria-label={`Remove ${file.name}`}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => document.getElementById("insurance-file-input")?.click()}
                              className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:text-blue-600 hover:border-blue-400 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                              Add more
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Section>

          {/* DIAGNOSIS DETAILS — hidden until DB columns exist
          <Section title="Diagnosis details" sub="...">
            ...
          </Section>
          */}

          {/* ── Account credentials ── */}
          {/* Not shown in edit mode — username/password are set at registration
              and are not editable here (matches Addemployee.tsx's split between
              the add-only login fields and the shared editable fields). */}
          {!editMode && (
          <Section
            title="Account credentials"
            sub="Login details for portal access."
          >
            <div className="grid grid-cols-3 gap-x-5 gap-y-[18px]">
              <div>
                <label className={labelCls}>Username <Req /></label>
                <input
                  type="text"
                  placeholder="Enter username"
                  maxLength={50}
                  className={inputCls}
                  value={formData.patient_username}
                  onChange={(e) => handleInputChange(e, "patient_username")}
                  disabled={submitting}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Password <Req /></label>
                <input
                  type="password"
                  placeholder="Enter password"
                  className={inputCls}
                  value={formData.patient_password}
                  onChange={(e) => handleInputChange(e, "patient_password")}
                  disabled={submitting}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Confirm password <Req /></label>
                <input
                  type="password"
                  placeholder="Re-enter password"
                  className={inputCls}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>
            </div>
          </Section>
          )}

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
                  {editMode ? "Saving…" : "Adding…"}
                </>
              ) : editMode ? (
                <>
                  <Check className="w-4 h-4" />
                  Save changes
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Save patient
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
        type={editMode ? "warning" : "question"}
        title={editMode ? "Save changes?" : "Add patient?"}
        description={
          editMode
            ? "Are you sure you want to save the changes to this patient?"
            : "Are you sure you want to register this new patient?"
        }
        confirmText={editMode ? "Save changes" : "Save patient"}
        cancelText="Cancel"
        loading={submitting}
      />

      <ConfirmationDialog
        open={showResetConfirm}
        type="info"
        title="Reset Form?"
        description={
          editMode
            ? "All fields will be reset to their original values."
            : "All entered values will be cleared."
        }
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
