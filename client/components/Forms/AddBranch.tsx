import { useState, ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Loader2, Plus } from "lucide-react";
import { branchApi } from "@/api/branch.api";
import { useToast } from "@/hooks/use-toast";
import { FormDropdown } from "@/components/ui/form-dropdown";

// Strongly typed interface for the form state.
// Field names mirror the `branch` table columns (see hms-backend/prisma/schema.prisma)
// so every input here has a real column to be saved into.
interface BranchFormData {
  branchCode: string;
  branchName: string;
  branchType: string;
  area: string;
  state: string;
  district: string;
  country: string;
  pincode: string;
  licenseNumber: string;
  emergencyNumber: string;
  email: string;
  address: string;
  dateOfEstablish: string;
  totalBeds: string;
  totalEmployees: string;
  faxNo: string;
  gstNo: string;
  panNo: string;
  websiteAddress: string;
  medicalServices: string;
  adminUsername: string;
  password: string;
  confirmPassword: string;
}

const emptyFormData: BranchFormData = {
  branchCode: "",
  branchName: "",
  branchType: "",
  area: "",
  state: "",
  district: "",
  country: "",
  pincode: "",
  licenseNumber: "",
  emergencyNumber: "",
  email: "",
  address: "",
  dateOfEstablish: "",
  totalBeds: "",
  totalEmployees: "",
  faxNo: "",
  gstNo: "",
  panNo: "",
  websiteAddress: "",
  medicalServices: "",
  adminUsername: "",
  password: "",
  confirmPassword: "",
};

export default function AddBranch() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  // State initialized with the interface type
  const [formData, setFormData] = useState<BranchFormData>(emptyFormData);

  // Generic handle change with correct TypeScript typing
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Password and Confirm Password must match.",
        variant: "destructive",
      });
      return;
    }

    const requiredFields: { key: keyof BranchFormData; label: string }[] = [
      { key: "branchCode", label: "Branch Code" },
      { key: "branchName", label: "Branch Name" },
      { key: "branchType", label: "Branch Type" },
      { key: "state", label: "State" },
      { key: "district", label: "District" },
      { key: "licenseNumber", label: "License Number" },
      { key: "emergencyNumber", label: "Emergency Number" },
      { key: "dateOfEstablish", label: "Date of Establish" },
      { key: "email", label: "Email" },
      { key: "address", label: "Address" },
      { key: "adminUsername", label: "Admin Username" },
      { key: "password", label: "Password" },
      { key: "medicalServices", label: "Medical Services" },
    ];

    const missing = requiredFields.find((f) => !formData[f.key].trim());
    if (missing) {
      toast({
        title: "Missing required field",
        description: `Please fill in "${missing.label}".`,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await branchApi.create({
        branch_code: formData.branchCode,
        branch_name: formData.branchName,
        branch_type: formData.branchType,
        email: formData.email,
        emergency_number: formData.emergencyNumber,
        address: formData.address,
        district: formData.district,
        state_name: formData.state,
        country: formData.country,
        area: formData.area,
        pincode: formData.pincode ? Number(formData.pincode) : undefined,
        license_number: formData.licenseNumber,
        total_beds: formData.totalBeds ? Number(formData.totalBeds) : undefined,
        total_no_emp: formData.totalEmployees || undefined,
        fax_no: formData.faxNo || undefined,
        gst_no: formData.gstNo || undefined,
        pan_no: formData.panNo || undefined,
        website_address: formData.websiteAddress || undefined,
        date_of_establish: formData.dateOfEstablish || undefined,
        medical_services: formData.medicalServices,
        username: formData.adminUsername,
        password: formData.password,
      });

      if (!response.data.success) {
        throw new Error(response.data.message);
      }

      toast({
        title: "Branch created",
        description: `${formData.branchName} was added successfully.`,
      });

      navigate(-1);
    } catch (error: any) {
      toast({
        title: "Failed to create branch",
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
  };

  // Shared input class for consistent styling
  const inputClass =
    "w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200";
  const labelClass = "block text-sm font-semibold text-gray-800 mb-1.5";
  const requiredStar = <span className="text-red-600 ml-0.5">*</span>;

  return (
    <div className="min-h-screen bg-[#FFFFF] p-6 flex items-start justify-center font-sans">
      {/* Main Card */}
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
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
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <h4 className="hms-heading text-gray-900 tracking-tight">
            Add Branch
          </h4>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
            {/* Row 1 - Branch Code, Branch Name, Branch Type */}
            <div>
              <label className={labelClass}>Branch Code {requiredStar}</label>
              <input
                type="text"
                name="branchCode"
                placeholder="Enter Branch Code"
                className={inputClass}
                value={formData.branchCode}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>Branch Name {requiredStar}</label>
              <input
                type="text"
                name="branchName"
                placeholder="Enter Branch Name"
                className={inputClass}
                value={formData.branchName}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>Branch Type {requiredStar}</label>
              <FormDropdown
                name="branchType"
                className={inputClass}
                options={["Main", "Child"]}
                value={formData.branchType}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, branchType: val }))
                }
                placeholder="Select Branch Type"
                disabled={submitting}
              />
            </div>

            {/* Row 2 - Area, State, District */}
            <div>
              <label className={labelClass}>Area</label>
              <input
                type="text"
                name="area"
                placeholder="Enter Area"
                className={inputClass}
                value={formData.area}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>State {requiredStar}</label>
              <FormDropdown
                name="state"
                className={inputClass}
                options={["Tamil Nadu", "Karnataka"]}
                value={formData.state}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, state: val }))
                }
                placeholder="Select State"
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>District {requiredStar}</label>
              <FormDropdown
                name="district"
                className={inputClass}
                options={["Chennai", "Coimbatore", "Madurai", "Bangalore", "Mysore"]}
                value={formData.district}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, district: val }))
                }
                placeholder="Select District"
                disabled={submitting}
              />
            </div>

            {/* Row 3 - Country, License Number, Emergency Number */}
            <div>
              <label className={labelClass}>Country</label>
              <input
                type="text"
                name="country"
                placeholder="Enter Country"
                className={inputClass}
                value={formData.country}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            <div>
              <label className={labelClass}>License Number {requiredStar}</label>
              <input
                type="text"
                name="licenseNumber"
                placeholder="Enter License Number"
                className={inputClass}
                value={formData.licenseNumber}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>Emergency Number {requiredStar}</label>
              <input
                type="text"
                name="emergencyNumber"
                placeholder="Enter Emergency Number"
                className={inputClass}
                value={formData.emergencyNumber}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            {/* Row 4 - Pincode, Date of Establish, Email */}
            <div>
              <label className={labelClass}>Pincode</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                name="pincode"
                placeholder="Enter Pincode"
                className={inputClass}
                value={formData.pincode}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            <div>
              <label className={labelClass}>Date of Establish {requiredStar}</label>
              <input
                type="date"
                name="dateOfEstablish"
                className={inputClass + " text-gray-500"}
                value={formData.dateOfEstablish}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>Email {requiredStar}</label>
              <input
                type="email"
                name="email"
                placeholder="Enter Email"
                className={inputClass}
                value={formData.email}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            {/* Row 5 - Total Beds, Total Employees, Fax Number */}
            <div>
              <label className={labelClass}>Total Beds</label>
              <input
                type="number"
                name="totalBeds"
                placeholder="Enter Total Beds"
                className={inputClass}
                value={formData.totalBeds}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            <div>
              <label className={labelClass}>Total Employees</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                name="totalEmployees"
                placeholder="Enter Total Employees"
                className={inputClass}
                value={formData.totalEmployees}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>Fax Number</label>
              <input
                type="text"
                name="faxNo"
                placeholder="Enter Fax Number"
                className={inputClass}
                value={formData.faxNo}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            {/* Row 6 - GST No, PAN No, Website Address */}
            <div>
              <label className={labelClass}>GST No</label>
              <input
                type="text"
                name="gstNo"
                placeholder="Enter GST Number"
                className={inputClass}
                value={formData.gstNo}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            <div>
              <label className={labelClass}>PAN No</label>
              <input
                type="text"
                name="panNo"
                placeholder="Enter PAN Number"
                className={inputClass}
                value={formData.panNo}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div className="lg:col-span-3">
              <label className={labelClass}>Website Address</label>
              <input
                type="text"
                name="websiteAddress"
                placeholder="Enter Website Address"
                className={inputClass}
                value={formData.websiteAddress}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            {/* Row 7 - Address (full width) */}
            <div className="lg:col-span-3">
              <label className={labelClass}>Address {requiredStar}</label>
              <input
                type="text"
                name="address"
                placeholder="Enter Address"
                className={inputClass}
                value={formData.address}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            {/* Row 8 - Admin Username, Password, Confirm Password */}
            <div>
              <label className={labelClass}>Admin Username {requiredStar}</label>
              <input
                type="text"
                name="adminUsername"
                placeholder="Enter Admin Username"
                className={inputClass}
                value={formData.adminUsername}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>Password {requiredStar}</label>
              <input
                type="password"
                name="password"
                placeholder="Enter Password"
                className={inputClass}
                value={formData.password}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>Confirm Password {requiredStar}</label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                className={inputClass}
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            {/* Row 9 - Medical Services (full width) */}
            <div className="lg:col-span-3">
              <label className={labelClass}>Medical Services {requiredStar}</label>
              <textarea
                name="medicalServices"
                rows={2}
                placeholder="Enter Medical Services"
                className={`${inputClass} resize-none`}
                value={formData.medicalServices}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
          </div>

          {/* Actions Footer */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-4 mt-10 pt-6 border-t border-gray-100">
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
                <Plus className="w-4 h-4" />
              )}
              {submitting ? "Adding Branch..." : "Add Branch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}