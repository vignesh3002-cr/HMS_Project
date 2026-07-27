import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Loader2, Plus, UserCheck, UserPlus } from "lucide-react";
import {
  branchApi,
  Branch,
  BranchAdminMode,
  CreateBranchPayload,
  NewBranchAdminPayload,
  AssignableUser,
} from "@/api/branch.api";
import { departmentApi, Department } from "@/api/department.api";
import { useToast } from "@/hooks/use-toast";
import { FormDropdown } from "@/components/ui/form-dropdown";
import { CountryStateCitySelect } from "@/components/ui/CountryStateCitySelect";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { State as CSState, City } from "country-state-city";
import type { IState } from "country-state-city";

interface BranchFormData {
  branchCode: string;
  branchName: string;
  branchType: string;
  area: string;
  state: string;
  district: string;
  country: string;
  countryId: string;
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

  adminMode: BranchAdminMode;
  adminUserId: string;

  // "Create New Admin" — mirrors Addemployee.tsx's full field set.
  adminPhotoUrl: string | null;
  adminFirstName: string;
  adminMiddleName: string;
  adminLastName: string;
  adminEmail: string;
  adminMobile: string;
  adminBloodGroup: string;
  adminNationality: string;
  adminMaritalStatus: string;
  adminAadhaarNo: string;
  adminPanNo: string;
  adminPassportNo: string;
  adminState: string;
  adminDistrict: string;
  adminArea: string;
  adminPincode: string;
  adminCurrentAddress: string;
  adminPermanentAddress: string;
  adminEmergencyContactName: string;
  adminEmergencyContactRelation: string;
  adminEmergencyContactNumber: string;
  adminJoiningDate: string;
  adminDepartmentId: string;
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
  countryId: "",
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

  adminMode: "NEW",
  adminUserId: "",

  adminPhotoUrl: null,
  adminFirstName: "",
  adminMiddleName: "",
  adminLastName: "",
  adminEmail: "",
  adminMobile: "",
  adminBloodGroup: "",
  adminNationality: "",
  adminMaritalStatus: "",
  adminAadhaarNo: "",
  adminPanNo: "",
  adminPassportNo: "",
  adminState: "",
  adminDistrict: "",
  adminArea: "",
  adminPincode: "",
  adminCurrentAddress: "",
  adminPermanentAddress: "",
  adminEmergencyContactName: "",
  adminEmergencyContactRelation: "",
  adminEmergencyContactNumber: "",
  adminJoiningDate: "",
  adminDepartmentId: "",
  adminUsername: "",
  password: "",
  confirmPassword: "",
};

const branchRequired: { key: keyof BranchFormData; label: string }[] = [
  { key: "branchCode", label: "Branch Code" },
  { key: "branchName", label: "Branch Name" },
  { key: "branchType", label: "Branch Type" },
  { key: "area", label: "Area" },
  { key: "state", label: "State" },
  { key: "district", label: "District" },
  { key: "country", label: "Country" },
  { key: "licenseNumber", label: "License Number" },
  { key: "emergencyNumber", label: "Emergency Number" },
  { key: "dateOfEstablish", label: "Date of Establish" },
  { key: "email", label: "Email" },
  { key: "address", label: "Address" },
  { key: "medicalServices", label: "Medical Services" },
  { key: "totalBeds", label: "Total Beds" },
  { key: "totalEmployees", label: "Total Employees" },
  { key: "gstNo", label: "GST No" },
  { key: "panNo", label: "PAN No" },
  { key: "pincode", label: "Pincode" },
  { key: "faxNo", label: "Fax Number" },
  { key: "websiteAddress", label: "Website Address" },
];

const adminRequired: Record<BranchAdminMode, { key: keyof BranchFormData; label: string }[]> = {
  EXISTING: [{ key: "adminUserId", label: "Branch Admin" }],
  NEW: [
    { key: "adminFirstName", label: "Admin First Name" },
    { key: "adminMiddleName", label: "Admin Middle Name" },
    { key: "adminLastName", label: "Admin Last Name" },
    { key: "adminBloodGroup", label: "Admin Blood Group" },
    { key: "adminNationality", label: "Admin Nationality" },
    { key: "adminMaritalStatus", label: "Admin Marital Status" },
    { key: "adminAadhaarNo", label: "Admin Aadhaar No" },
    { key: "adminPanNo", label: "Admin PAN No" },
    { key: "adminEmail", label: "Admin Email" },
    { key: "adminMobile", label: "Admin Mobile" },
    { key: "adminJoiningDate", label: "Admin Joining Date" },
    { key: "adminDepartmentId", label: "Admin Department" },
    { key: "adminState", label: "Admin State" },
    { key: "adminDistrict", label: "Admin District" },
    { key: "adminArea", label: "Admin Area" },
    { key: "adminPincode", label: "Admin Pincode" },
    { key: "adminCurrentAddress", label: "Admin Current Address" },
    { key: "adminPermanentAddress", label: "Admin Permanent Address" },
    { key: "adminEmergencyContactName", label: "Admin Emergency Contact Name" },
    { key: "adminEmergencyContactRelation", label: "Admin Emergency Contact Relation" },
    { key: "adminEmergencyContactNumber", label: "Admin Emergency Contact Number" },
    { key: "adminUsername", label: "Admin Username" },
    { key: "password", label: "Password" },
  ],
};

const OTHER_DEPARTMENT_VALUE = "__OTHER__";

// ─── Shared style tokens — matches Addemployee.tsx conventions ───────────────

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

export default function AddBranch() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<BranchFormData>({
    ...emptyFormData,
    adminMode: "NEW",
  });
  const [assignableAdmins, setAssignableAdmins] = useState<AssignableUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [customDepartment, setCustomDepartment] = useState("");
  const [indianStates, setIndianStates] = useState<IState[]>([]);
  const [districtOptions, setDistrictOptions] = useState<string[]>([]);
  const [sameAsCurrent, setSameAsCurrent] = useState(false);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAdminModeChange = (mode: BranchAdminMode) => {
    setFormData((prev) => ({ ...prev, adminMode: mode }));
  };

  const handleSameAsCurrent = (e: ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSameAsCurrent(checked);
    if (checked) {
      setFormData((p) => ({ ...p, adminPermanentAddress: p.adminCurrentAddress }));
    }
  };

  const fetchAssignableAdmins = async (search?: string) => {
    setLoadingAdmins(true);
    try {
      const response = await branchApi.getAssignableAdmins(search);
      if (response.data.success && response.data.data) {
        setAssignableAdmins(response.data.data);
      }
    } catch (error: any) {
      console.error("Failed to fetch assignable admins:", error);
      toast({
        title: "Failed to load branch admins",
        description:
          error.response?.data?.message ??
          error.message ??
          "Could not fetch the list of branch admins.",
        variant: "destructive",
      });
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    if (formData.adminMode === "EXISTING") {
      fetchAssignableAdmins();
    }
  }, [formData.adminMode]);

  // Branch list — used to label which branch an assignable admin currently belongs to.
  useEffect(() => {
    branchApi
      .getAll()
      .then((res) => {
        if (res.data?.data) setAllBranches(res.data.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    departmentApi
      .getAll()
      .then((res) => {
        if (res.data?.data) setDepartments(res.data.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setIndianStates(CSState.getStatesOfCountry("IN"));
  }, []);

  useEffect(() => {
    if (formData.adminState) {
      const s = indianStates.find((s) => s.name === formData.adminState);
      if (s)
        setDistrictOptions(
          City.getCitiesOfState("IN", s.isoCode)
            .map((c) => c.name)
            .sort(),
        );
    } else {
      setDistrictOptions([]);
    }
  }, [formData.adminState, indianStates]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword && formData.adminMode === "NEW") {
      toast({
        title: "Password mismatch",
        description: "Password and Confirm Password must match.",
        variant: "destructive",
      });
      return;
    }

    const requiredFields = [...branchRequired, ...adminRequired[formData.adminMode]];
    const missing = requiredFields.find((f) => !String(formData[f.key] ?? "").trim());
    if (missing) {
      toast({
        title: "Missing required field",
        description: `Please fill in "${missing.label}".`,
        variant: "destructive",
      });
      return;
    }

    if (
      formData.adminMode === "NEW" &&
      formData.adminDepartmentId === OTHER_DEPARTMENT_VALUE &&
      !customDepartment.trim()
    ) {
      toast({
        title: "Missing required field",
        description: 'Please type a department name for "Others".',
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const payload: CreateBranchPayload = {
        branch_code: formData.branchCode,
        branch_name: formData.branchName,
        branch_type: formData.branchType,
        email: formData.email,
        emergency_number: formData.emergencyNumber,
        address: formData.address,
        district: formData.district,
        state_name: formData.state,
        country: formData.country,
        country_id: formData.countryId,
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

        admin_mode: formData.adminMode,
      };

      if (formData.adminMode === "EXISTING") {
        payload.admin_user_id = formData.adminUserId;
      } else if (formData.adminMode === "NEW") {
        let departmentId = formData.adminDepartmentId;
        if (departmentId === OTHER_DEPARTMENT_VALUE) {
          const created = await departmentApi.create({
            department_name: customDepartment.trim(),
          });
          departmentId = created.data.data.department_id;
          setDepartments((p) => [...p, created.data.data]);
        }

        const adminPayload: NewBranchAdminPayload = {
          first_name: formData.adminFirstName,
          middle_name: formData.adminMiddleName || undefined,
          last_name: formData.adminLastName || undefined,
          email: formData.adminEmail,
          mobile_no: formData.adminMobile,
          username: formData.adminUsername,
          password: formData.password,
          department_id: departmentId || undefined,
          blood_group: formData.adminBloodGroup || undefined,
          nationality: formData.adminNationality || undefined,
          marital_status: formData.adminMaritalStatus || undefined,
          aadhaar_no: formData.adminAadhaarNo || undefined,
          pan_no: formData.adminPanNo || undefined,
          passport_no: formData.adminPassportNo || undefined,
          permanent_address: formData.adminPermanentAddress || undefined,
          current_address: formData.adminCurrentAddress || undefined,
          employee_photo_URL: formData.adminPhotoUrl || undefined,
          employee_state: formData.adminState || undefined,
          employee_district: formData.adminDistrict || undefined,
          employee_area: formData.adminArea || undefined,
          employee_pincode: formData.adminPincode ? Number(formData.adminPincode) : undefined,
          emergency_contact_name: formData.adminEmergencyContactName || undefined,
          emergency_contact_relationship: formData.adminEmergencyContactRelation || undefined,
          emergency_contact_number: formData.adminEmergencyContactNumber || undefined,
          joining_date: formData.adminJoiningDate || undefined,
        };
        payload.admin = adminPayload;
      }

      const response = await branchApi.create(payload);

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
    setCustomDepartment("");
    setSameAsCurrent(false);
  };

  const adminModeOptions = [
    { value: "EXISTING", label: "Existing User", icon: UserCheck },
    { value: "NEW", label: "Create New Admin", icon: UserPlus },
  ];

  const branchNameById = new Map(allBranches.map((b) => [b.branch_id, b.branch_name || b.branch_id]));

  const adminDropdownOptions = assignableAdmins.map((admin) => {
    const names = admin.current_branch_names?.filter(Boolean) as string[] | undefined;
    const assignedLabel = admin.current_branches.length
      ? (names && names.length ? names : admin.current_branches.map((id) => branchNameById.get(id) || id)).join(", ")
      : "";
    return {
      value: admin.user_id,
      label: `${admin.full_name}${admin.email ? ` - ${admin.email}` : ""}`,
      highlight: admin.current_branches.length > 0,
      badge: assignedLabel ? `Assigned: ${assignedLabel}` : undefined,
    };
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100">
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-8 py-5 border-b border-gray-100">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-50 transition-colors text-gray-500"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Building2 className="w-5 h-5" />
          </div>
          <h4 className="hms-heading text-gray-900 tracking-tight">Add Branch</h4>
        </div>

        {/* ── Body ── */}
        <form onSubmit={handleSubmit} className="px-8 pt-7 pb-8">
          {/* ── Branch information ── */}
          <Section
            title="Branch information"
            sub="Core identity and licensing details for the branch."
          >
            <div className="grid grid-cols-3 gap-x-5 gap-y-[18px]">
              <div>
                <label className={labelCls}>Branch Code <Req /></label>
                <input
                  type="text"
                  name="branchCode"
                  placeholder="Enter Branch Code"
                  className={inputCls}
                  value={formData.branchCode}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Branch Name <Req /></label>
                <input
                  type="text"
                  name="branchName"
                  placeholder="Enter Branch Name"
                  className={inputCls}
                  value={formData.branchName}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Branch Type <Req /></label>
                <FormDropdown
                  name="branchType"
                  className={inputCls}
                  options={["Main", "Child"]}
                  value={formData.branchType}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, branchType: val }))}
                  placeholder="Select Branch Type"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={labelCls}>License Number <Req /></label>
                <input
                  type="text"
                  name="licenseNumber"
                  placeholder="Enter License Number"
                  className={inputCls}
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Emergency Number <Req /></label>
                <input
                  type="text"
                  name="emergencyNumber"
                  placeholder="Enter Emergency Number"
                  className={inputCls}
                  value={formData.emergencyNumber}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Date of Establish <Req /></label>
                <input
                  type="date"
                  name="dateOfEstablish"
                  className={inputCls + " text-gray-500"}
                  value={formData.dateOfEstablish}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={labelCls}>Email <Req /></label>
                <input
                  type="email"
                  name="email"
                  placeholder="Enter Email"
                  className={inputCls}
                  value={formData.email}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Fax Number <Req />
                </label>
                <input
                  type="text"
                  name="faxNo"
                  placeholder="Enter Fax Number"
                  className={inputCls}
                  value={formData.faxNo}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div className="col-span-3">
                <label className={labelCls}>
                  Website Address <Req />
                </label>
                <input
                  type="text"
                  name="websiteAddress"
                  placeholder="Enter Website Address"
                  className={inputCls}
                  value={formData.websiteAddress}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
            </div>
          </Section>

          {/* ── Location ── */}
          <Section
            title="Location"
            sub="Country, state, district and residential details."
          >
            <div className="grid grid-cols-3 gap-x-5 gap-y-[18px]">
              <div className="col-span-3">
                <CountryStateCitySelect
                  country={formData.country}
                  state={formData.state}
                  district={formData.district}
                  onCountryChange={(country) => setFormData((prev) => ({ ...prev, country }))}
                  onCountryCodeChange={(isoCode) => setFormData((prev) => ({ ...prev, countryId: isoCode }))}
                  onStateChange={(state) => setFormData((prev) => ({ ...prev, state }))}
                  onDistrictChange={(district) => setFormData((prev) => ({ ...prev, district }))}
                  disabled={submitting}
                  required
                />
              </div>

              <div>
                <label className={labelCls}>Area <Req /></label>
                <input
                  type="text"
                  name="area"
                  placeholder="Enter Area"
                  className={inputCls}
                  value={formData.area}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Pincode <Req />
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  name="pincode"
                  placeholder="Enter Pincode"
                  className={inputCls}
                  value={formData.pincode}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>

              <div className="col-span-3">
                <label className={labelCls}>Address <Req /></label>
                <input
                  type="text"
                  name="address"
                  placeholder="Enter Address"
                  className={inputCls}
                  value={formData.address}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
            </div>
          </Section>

          {/* ── Operational details ── */}
          <Section
            title="Operational details"
            sub="Capacity, registrations and the services offered."
          >
            <div className="grid grid-cols-3 gap-x-5 gap-y-[18px]">
              <div>
                <label className={labelCls}>Total Beds <Req /></label>
                <input
                  type="number"
                  name="totalBeds"
                  placeholder="Enter Total Beds"
                  className={inputCls}
                  value={formData.totalBeds}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Total Employees <Req /></label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  name="totalEmployees"
                  placeholder="Enter Total Employees"
                  className={inputCls}
                  value={formData.totalEmployees}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>GST No <Req /></label>
                <input
                  type="text"
                  name="gstNo"
                  placeholder="Enter GST Number"
                  className={inputCls}
                  value={formData.gstNo}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={labelCls}>PAN No <Req /></label>
                <input
                  type="text"
                  name="panNo"
                  placeholder="Enter PAN Number"
                  className={inputCls}
                  value={formData.panNo}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Medical Services <Req /></label>
                <textarea
                  name="medicalServices"
                  rows={1}
                  placeholder="Enter Medical Services"
                  className={inputCls + " !h-10 pt-2 resize-none"}
                  value={formData.medicalServices}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
            </div>
          </Section>

          {/* ── Branch admin ── */}
          <Section
            title="Branch admin"
            sub="Assign an existing branch admin or create a new one for this branch."
          >
            <div className="grid grid-cols-3 gap-3 mb-5">
              {adminModeOptions.map(({ value, label, icon: Icon }) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => handleAdminModeChange(value as BranchAdminMode)}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 text-center ${
                    formData.adminMode === value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300 text-gray-700"
                  }`}
                  disabled={submitting}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[13px] font-semibold">{label}</span>
                </button>
              ))}
            </div>

            {formData.adminMode === "EXISTING" && (
              <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h5 className="text-[13px] font-semibold text-gray-800 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  Assign Existing Admin
                </h5>
                <div>
                  <label className={labelCls}>Branch Admin <Req /></label>
                  <FormDropdown
                    name="adminUserId"
                    className={inputCls}
                    options={adminDropdownOptions}
                    value={formData.adminUserId}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, adminUserId: val }))}
                    placeholder="Search and select admin user..."
                    disabled={submitting}
                    emptyMessage={loadingAdmins ? "Loading..." : "No admins available."}
                  />
                  <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-500">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-blue-500/10 border border-blue-200" />
                      Already assigned to a branch
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-white border border-gray-300" />
                      Available
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1.5">
                    All branch admins are listed, including ones assigned elsewhere — selecting one
                    reassigns them to this branch.
                  </p>
                </div>
              </div>
            )}

            {formData.adminMode === "NEW" && (
              <div className="space-y-5 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h5 className="text-[13px] font-semibold text-gray-800 flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-blue-600" />
                    Create New Admin
                  </h5>
                  <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
                    Role: Branch Admin
                  </span>
                </div>

                <div className="flex items-start gap-8 pb-5 border-b border-blue-200/70">
                  <AvatarUpload
                    value={formData.adminPhotoUrl}
                    onChange={(url) => setFormData((p) => ({ ...p, adminPhotoUrl: url }))}
                    label="Admin photo"
                    hint="Click or drag an image to upload (Max 1MB)"
                    size={64}
                  />
                </div>

                {/* Personal */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-[18px]">
                  <div>
                    <label className={labelCls}>First Name <Req /></label>
                    <input
                      type="text"
                      name="adminFirstName"
                      placeholder="Enter First Name"
                      className={inputCls}
                      value={formData.adminFirstName}
                      onChange={handleChange}
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>
                      Middle Name <Req />
                    </label>
                    <input
                      type="text"
                      name="adminMiddleName"
                      placeholder="Enter Middle Name"
                      className={inputCls}
                      value={formData.adminMiddleName}
                      onChange={handleChange}
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Last Name <Req /></label>
                    <input
                      type="text"
                      name="adminLastName"
                      placeholder="Enter Last Name"
                      className={inputCls}
                      value={formData.adminLastName}
                      onChange={handleChange}
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>
                      Blood Group <Req />
                    </label>
                    <FormDropdown
                      className={inputCls}
                      options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]}
                      value={formData.adminBloodGroup}
                      onValueChange={(v) => setFormData((p) => ({ ...p, adminBloodGroup: v }))}
                      placeholder="Select blood group"
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>
                      Nationality <Req />
                    </label>
                    <input
                      type="text"
                      name="adminNationality"
                      placeholder="Enter nationality"
                      className={inputCls}
                      value={formData.adminNationality}
                      onChange={handleChange}
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>
                      Marital Status <Req />
                    </label>
                    <FormDropdown
                      className={inputCls}
                      options={["Single", "Married", "Divorced"]}
                      value={formData.adminMaritalStatus}
                      onValueChange={(v) => setFormData((p) => ({ ...p, adminMaritalStatus: v }))}
                      placeholder="Select marital status"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>
                      Aadhaar No <Req />
                    </label>
                    <input
                      type="text"
                      name="adminAadhaarNo"
                      placeholder="Enter aadhaar number"
                      maxLength={20}
                      className={inputCls}
                      value={formData.adminAadhaarNo}
                      onChange={handleChange}
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>
                      PAN No <Req />
                    </label>
                    <input
                      type="text"
                      name="adminPanNo"
                      placeholder="Enter PAN number"
                      maxLength={20}
                      className={inputCls}
                      value={formData.adminPanNo}
                      onChange={handleChange}
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>
                      Passport No <Opt />
                    </label>
                    <input
                      type="text"
                      name="adminPassportNo"
                      placeholder="Enter passport number"
                      maxLength={20}
                      className={inputCls}
                      value={formData.adminPassportNo}
                      onChange={handleChange}
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Email <Req /></label>
                    <input
                      type="email"
                      name="adminEmail"
                      placeholder="Enter Email"
                      className={inputCls}
                      value={formData.adminEmail}
                      onChange={handleChange}
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Mobile <Req /></label>
                    <input
                      type="text"
                      name="adminMobile"
                      placeholder="Enter Mobile Number"
                      className={inputCls}
                      value={formData.adminMobile}
                      onChange={handleChange}
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Joining Date <Req /></label>
                    <input
                      type="date"
                      name="adminJoiningDate"
                      className={inputCls + " text-gray-500"}
                      value={formData.adminJoiningDate}
                      onChange={handleChange}
                      disabled={submitting}
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className={labelCls}>
                      Department <Req />
                    </label>
                    <FormDropdown
                      className={inputCls}
                      options={[
                        ...departments.map((d) => ({ label: d.department_name, value: d.department_id })),
                        { label: "Others", value: OTHER_DEPARTMENT_VALUE },
                      ]}
                      value={formData.adminDepartmentId}
                      onValueChange={(v) => {
                        setFormData((p) => ({ ...p, adminDepartmentId: v }));
                        if (v !== OTHER_DEPARTMENT_VALUE) setCustomDepartment("");
                      }}
                      placeholder={departments.length ? "Select department" : "Loading…"}
                      disabled={submitting}
                    />
                    {formData.adminDepartmentId === OTHER_DEPARTMENT_VALUE && (
                      <input
                        type="text"
                        placeholder="Type your department"
                        maxLength={100}
                        className={inputCls + " mt-2"}
                        value={customDepartment}
                        onChange={(e) => setCustomDepartment(e.target.value)}
                        disabled={submitting}
                      />
                    )}
                  </div>
                </div>

                {/* Address & location */}
                <div className="pt-1 border-t border-blue-200/70">
                  <h6 className="text-[11.5px] font-bold text-gray-500 uppercase tracking-wide my-3">
                    Address and location
                  </h6>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-[18px]">
                    <div>
                      <label className={labelCls}>
                        State <Req />
                      </label>
                      <FormDropdown
                        className={inputCls}
                        options={indianStates.map((s) => s.name)}
                        value={formData.adminState}
                        onValueChange={(v) =>
                          setFormData((p) => ({ ...p, adminState: v, adminDistrict: "" }))
                        }
                        placeholder="Select state"
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>
                        District <Req />
                      </label>
                      <FormDropdown
                        className={inputCls}
                        options={districtOptions}
                        value={formData.adminDistrict}
                        onValueChange={(v) => setFormData((p) => ({ ...p, adminDistrict: v }))}
                        placeholder={formData.adminState ? "Select district" : "Select state first"}
                        disabled={submitting || !formData.adminState}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>
                        Area <Req />
                      </label>
                      <input
                        type="text"
                        name="adminArea"
                        placeholder="Enter area"
                        maxLength={50}
                        className={inputCls}
                        value={formData.adminArea}
                        onChange={handleChange}
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className={labelCls}>
                        Pincode <Req />
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        name="adminPincode"
                        placeholder="Enter pincode"
                        maxLength={10}
                        className={inputCls}
                        value={formData.adminPincode}
                        onChange={handleChange}
                        disabled={submitting}
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className={labelCls}>
                        Current Address <Req />
                      </label>
                      <input
                        type="text"
                        name="adminCurrentAddress"
                        placeholder="Enter current address"
                        maxLength={255}
                        className={inputCls}
                        value={formData.adminCurrentAddress}
                        onChange={handleChange}
                        disabled={submitting}
                      />
                    </div>

                    <div className="md:col-span-3 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="adminSameAsCurrent"
                        checked={sameAsCurrent}
                        onChange={handleSameAsCurrent}
                        disabled={submitting}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label
                        htmlFor="adminSameAsCurrent"
                        className="text-[13px] text-gray-700 cursor-pointer select-none"
                      >
                        Same as current address
                      </label>
                    </div>

                    <div className="md:col-span-3">
                      <label className={labelCls}>
                        Permanent Address <Req />
                      </label>
                      <input
                        type="text"
                        name="adminPermanentAddress"
                        placeholder="Enter permanent address"
                        maxLength={255}
                        className={inputCls}
                        value={formData.adminPermanentAddress}
                        onChange={handleChange}
                        disabled={submitting || sameAsCurrent}
                      />
                    </div>
                  </div>
                </div>

                {/* Emergency contact */}
                <div className="pt-1 border-t border-blue-200/70">
                  <h6 className="text-[11.5px] font-bold text-gray-500 uppercase tracking-wide my-3">
                    Emergency contact
                  </h6>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-[18px]">
                    <div>
                      <label className={labelCls}>
                        Contact Name <Req />
                      </label>
                      <input
                        type="text"
                        name="adminEmergencyContactName"
                        placeholder="Enter contact name"
                        maxLength={100}
                        className={inputCls}
                        value={formData.adminEmergencyContactName}
                        onChange={handleChange}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>
                        Relation <Req />
                      </label>
                      <input
                        type="text"
                        name="adminEmergencyContactRelation"
                        placeholder="e.g. spouse, parent"
                        maxLength={50}
                        className={inputCls}
                        value={formData.adminEmergencyContactRelation}
                        onChange={handleChange}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>
                        Contact Number <Req />
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        name="adminEmergencyContactNumber"
                        placeholder="Enter contact number"
                        maxLength={15}
                        className={inputCls}
                        value={formData.adminEmergencyContactNumber}
                        onChange={handleChange}
                        disabled={submitting}
                      />
                    </div>
                  </div>
                </div>

                {/* Account credentials */}
                <div className="pt-1 border-t border-green-200/70">
                  <h6 className="text-[11.5px] font-bold text-gray-500 uppercase tracking-wide my-3">
                    Account credentials
                  </h6>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-[18px]">
                    <div>
                      <label className={labelCls}>Username <Req /></label>
                      <input
                        type="text"
                        name="adminUsername"
                        placeholder="Enter Username"
                        className={inputCls}
                        value={formData.adminUsername}
                        onChange={handleChange}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Password <Req /></label>
                      <input
                        type="password"
                        name="password"
                        placeholder="Enter Password"
                        className={inputCls}
                        value={formData.password}
                        onChange={handleChange}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Confirm Password <Req /></label>
                      <input
                        type="password"
                        name="confirmPassword"
                        placeholder="Confirm Password"
                        className={inputCls}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        disabled={submitting}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                  Adding Branch…
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Branch
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
