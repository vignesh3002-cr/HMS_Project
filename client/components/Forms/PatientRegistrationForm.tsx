import { useState, ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, UserRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormDropdown } from "@/components/ui/form-dropdown";
import { AvatarUpload } from "@/components/ui/avatar-upload";

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
  patient_type: string;
  patient_current_address_1: string;
  patient_current_address_2: string;
  patient_current_city: string;
  patient_current_state: string;
  patient_current_postal_code: string;
  patient_current_country: string;
  patient_permanent_address_1: string;
  patient_permanent_address_2: string;
  patient_permanent_city: string;
  patient_permanent_state: string;
  patient_permanent_postal_code: string;
  patient_permanent_country: string;
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
  patient_type: "",
  patient_current_address_1: "",
  patient_current_address_2: "",
  patient_current_city: "",
  patient_current_state: "",
  patient_current_postal_code: "",
  patient_current_country: "",
  patient_permanent_address_1: "",
  patient_permanent_address_2: "",
  patient_permanent_city: "",
  patient_permanent_state: "",
  patient_permanent_postal_code: "",
  patient_permanent_country: "",
  patient_emergency_mobile: "",
  patient_emergency_name: "",
  patient_emergency_relation: "",
  patient_photo_url: null,
};

// A handful of major Indian cities/districts for the district dropdown.
const INDIAN_DISTRICTS = [
  "Chennai",
  "Coimbatore",
  "Madurai",
  "Mumbai",
  "Delhi",
  "Bangalore",
  "Hyderabad",
  "Kolkata",
  "Pune",
  "Ahmedabad",
  "Jaipur",
  "Lucknow",
  "Chandigarh",
  "Nagpur",
  "Indore",
  "Bhopal",
  "Patna",
  "Surat",
  "Kanpur",
  "Visakhapatnam",
];

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
  const [copyAddressChecked, setCopyAddressChecked] = useState(false);

  const setField = (key: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    key: keyof FormData,
  ) => {
    setField(key, e.target.value);
  };

  const handleCopyAddress = (e: ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setCopyAddressChecked(checked);

    if (checked) {
      setFormData((prev) => ({
        ...prev,
        patient_permanent_address_1: prev.patient_current_address_1,
        patient_permanent_address_2: prev.patient_current_address_2,
        patient_permanent_city: prev.patient_current_city,
        patient_permanent_state: prev.patient_current_state,
        patient_permanent_postal_code: prev.patient_current_postal_code,
        patient_permanent_country: prev.patient_current_country,
      }));
    }
  };

  const handleAddressChange = (
    e: ChangeEvent<HTMLInputElement>,
    key: keyof FormData,
  ) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, [key]: value }));

    if (copyAddressChecked) {
      const permanentKey = key.replace(
        "current_",
        "permanent_",
      ) as keyof FormData;
      setFormData((prev) => ({ ...prev, [permanentKey]: value }));
    }
  };

  const handleAddressDropdownChange = (
    key: keyof FormData,
    value: string,
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));

    if (copyAddressChecked && key.includes("current_")) {
      const permanentKey = key.replace(
        "current_",
        "permanent_",
      ) as keyof FormData;
      setFormData((prev) => ({ ...prev, [permanentKey]: value }));
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("POST /api/patients", formData);
    toast({
      title: "Patient saved (demo)",
      description: "Check the browser console for the payload.",
    });
  };

  const handleReset = () => {
    setFormData(emptyFormData);
    setCopyAddressChecked(false);
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
                      options={[
                        { label: "Main Hospital — BR-001", value: "BR-001" },
                        { label: "North Clinic — BR-002", value: "BR-002" },
                        { label: "East Clinic — BR-003", value: "BR-003" },
                      ]}
                      value={formData.branch_id}
                      onValueChange={(val) => setField("branch_id", val)}
                      placeholder="Select branch"
                      className={inputClass}
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
                <div>
                  <label className={labelClass}>
                    Patient type {requiredStar}
                  </label>
                  <FormDropdown
                    options={[
                      "Outpatient (OPD)",
                      "Inpatient (IPD)",
                      "Emergency",
                      "Corporate",
                      "Insurance",
                    ]}
                    value={formData.patient_type}
                    onValueChange={(val) => setField("patient_type", val)}
                    placeholder="Select type"
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

                <p className="lg:col-span-3 text-xs font-bold text-gray-400 uppercase tracking-wide mt-2">
                  Current address
                </p>

                <div>
                  <label className={labelClass}>
                    Address 1 {requiredStar}
                  </label>
                  <input
                    type="text"
                    placeholder="Street address"
                    className={inputClass}
                    value={formData.patient_current_address_1}
                    onChange={(e) =>
                      handleAddressChange(e, "patient_current_address_1")
                    }
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Address 2 {requiredStar} </label>
                  <input
                    type="text"
                    placeholder="Apartment, suite, etc."
                    className={inputClass}
                    value={formData.patient_current_address_2}
                    onChange={(e) =>
                      handleAddressChange(e, "patient_current_address_2")
                    }
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    District {requiredStar}
                  </label>
                  <FormDropdown
                    options={INDIAN_DISTRICTS}
                    value={formData.patient_current_city}
                    onValueChange={(val) =>
                      handleAddressDropdownChange("patient_current_city", val)
                    }
                    placeholder="e.g. Chennai"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    State / Province {requiredStar}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tamil Nadu"
                    className={inputClass}
                    value={formData.patient_current_state}
                    onChange={(e) =>
                      handleAddressChange(e, "patient_current_state")
                    }
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Postal code {requiredStar}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 600001"
                    className={inputClass}
                    value={formData.patient_current_postal_code}
                    onChange={(e) =>
                      handleAddressChange(e, "patient_current_postal_code")
                    }
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Country {requiredStar}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. India"
                    className={inputClass}
                    value={formData.patient_current_country}
                    onChange={(e) =>
                      handleAddressChange(e, "patient_current_country")
                    }
                    required
                  />
                </div>

                <label className="lg:col-span-3 flex items-center gap-2.5 px-4 py-2.5 border border-gray-200 rounded-xl bg-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="accent-blue-600"
                    checked={copyAddressChecked}
                    onChange={handleCopyAddress}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Permanent address same as current
                  </span>
                </label>

                <p className="lg:col-span-3 text-xs font-bold text-gray-400 uppercase tracking-wide mt-2">
                  Permanent address
                </p>

                <div>
                  <label className={labelClass}>
                    Address 1 {requiredStar}
                  </label>
                  <input
                    type="text"
                    placeholder="Street address"
                    className={inputClass}
                    value={formData.patient_permanent_address_1}
                    onChange={(e) =>
                      handleInputChange(e, "patient_permanent_address_1")
                    }
                    disabled={copyAddressChecked}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Address 2 {requiredStar} </label>
                  <input
                    type="text"
                    placeholder="Apartment, suite, etc."
                    className={inputClass}
                    value={formData.patient_permanent_address_2}
                    onChange={(e) =>
                      handleInputChange(e, "patient_permanent_address_2")
                    }
                    required
                    disabled={copyAddressChecked}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    District {requiredStar}
                  </label>
                  <FormDropdown
                    options={INDIAN_DISTRICTS}
                    value={formData.patient_permanent_city}
                    onValueChange={(val) =>
                      setField("patient_permanent_city", val)
                    }
                    placeholder="e.g. Chennai"
                    className={inputClass}
                    disabled={copyAddressChecked}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    State / Province {requiredStar}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tamil Nadu"
                    className={inputClass}
                    value={formData.patient_permanent_state}
                    onChange={(e) =>
                      handleInputChange(e, "patient_permanent_state")
                    }
                    disabled={copyAddressChecked}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Postal code {requiredStar}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 600001"
                    className={inputClass}
                    value={formData.patient_permanent_postal_code}
                    onChange={(e) =>
                      handleInputChange(e, "patient_permanent_postal_code")
                    }
                    disabled={copyAddressChecked}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Country {requiredStar}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. India"
                    className={inputClass}
                    value={formData.patient_permanent_country}
                    onChange={(e) =>
                      handleInputChange(e, "patient_permanent_country")
                    }
                    disabled={copyAddressChecked}
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
                className="w-full sm:w-auto px-8 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
              >
                Clear form
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 shadow-[0_4px_14px_0_rgba(37,99,235,0.2)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.3)]"
              >
                <Plus className="w-4 h-4" />
                Save patient
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
