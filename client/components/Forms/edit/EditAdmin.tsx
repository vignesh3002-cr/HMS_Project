import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Check, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormDropdown } from "@/components/ui/form-dropdown";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { State as CSState, City } from "country-state-city";
import type { IState } from "country-state-city";
import { employeeApi } from "@/api/employee.api";
import { branchApi, Branch } from "@/api/branch.api";
import { departmentApi, Department } from "@/api/department.api";

const NONE_BRANCH_VALUE = "";
const OTHER_DEPARTMENT_VALUE = "__OTHER__";

interface AdminFormData {
  photoUrl: string | null;
  firstName: string;
  middleName: string;
  lastName: string;
  bloodGroup: string;
  nationality: string;
  maritalStatus: string;
  aadhaarNo: string;
  panNo: string;
  passportNo: string;
  email: string;
  mobileNo: string;
  joiningDate: string;
  designation: string;
  departmentId: string;
  state: string;
  district: string;
  area: string;
  pincode: string;
  currentAddress: string;
  permanentAddress: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactNumber: string;
  username: string;
  newPassword: string;
  confirmNewPassword: string;
  isActive: boolean;
  branchId: string;
}

const emptyFormData: AdminFormData = {
  photoUrl: null,
  firstName: "",
  middleName: "",
  lastName: "",
  bloodGroup: "",
  nationality: "",
  maritalStatus: "",
  aadhaarNo: "",
  panNo: "",
  passportNo: "",
  email: "",
  mobileNo: "",
  joiningDate: "",
  designation: "",
  departmentId: "",
  state: "",
  district: "",
  area: "",
  pincode: "",
  currentAddress: "",
  permanentAddress: "",
  emergencyContactName: "",
  emergencyContactRelation: "",
  emergencyContactNumber: "",
  username: "",
  newPassword: "",
  confirmNewPassword: "",
  isActive: true,
  branchId: NONE_BRANCH_VALUE,
};

// ─── Shared style tokens — matches AddBranch.tsx / Addemployee.tsx conventions ─

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

export default function EditAdmin() {
  const navigate = useNavigate();
  const { id: employeeId } = useParams<{ id: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<AdminFormData>(emptyFormData);
  const [customDepartment, setCustomDepartment] = useState("");
  const [sameAsCurrent, setSameAsCurrent] = useState(false);

  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [originalBranchId, setOriginalBranchId] = useState<string>(NONE_BRANCH_VALUE);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [indianStates, setIndianStates] = useState<IState[]>([]);
  const [districtOptions, setDistrictOptions] = useState<string[]>([]);

  // Confirmation modal for reassigning a branch that already has an admin
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignTargetBranchName, setReassignTargetBranchName] = useState("");
  const [reassignOccupantName, setReassignOccupantName] = useState("");

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!employeeId) return;

    employeeApi
      .getById(employeeId)
      .then((res) => {
        const payload = res.data?.data;
        const employee = payload?.employee;
        const user = payload?.user;

        if (!employee) {
          toast({
            title: "Admin not found",
            description: "Could not find this branch admin.",
            variant: "destructive",
          });
          return;
        }

        if (user?.role_type !== "BRANCH_ADMIN") {
          toast({
            title: "Not a Branch Admin",
            description: "This edit form only supports Branch Admin accounts.",
            variant: "destructive",
          });
          return;
        }

        setAdminUserId(employee.user_id ?? null);

        setFormData((prev) => ({
          ...prev,
          photoUrl: employee.employee_photo_URL || null,
          firstName: employee.first_name || "",
          middleName: employee.middle_name || "",
          lastName: employee.last_name || "",
          bloodGroup: employee.blood_group || "",
          nationality: employee.nationality || "",
          maritalStatus: employee.marital_status || "",
          aadhaarNo: employee.aadhaar_no || "",
          panNo: employee.pan_no || "",
          passportNo: employee.passport_no || "",
          email: employee.email || "",
          mobileNo: employee.mobile_no || "",
          joiningDate: employee.joining_date ? String(employee.joining_date).slice(0, 10) : "",
          designation: employee.designation || "Branch Admin",
          departmentId: employee.department_id || "",
          state: employee.employee_state || "",
          district: employee.employee_district || "",
          area: employee.employee_area || "",
          pincode: employee.employee_pincode != null ? String(employee.employee_pincode) : "",
          currentAddress: employee.current_address || "",
          permanentAddress: employee.parmanent_address || employee.parmanant_address || "",
          emergencyContactName: employee.emergency_contact_name || "",
          emergencyContactRelation: employee.emergency_contact_relationship || "",
          emergencyContactNumber: employee.emergency_contact_number || "",
          username: user?.username || "",
          isActive: employee.emp_status === true || user?.user_status === 1,
        }));

        // Which branch is this admin currently active on, if any. Read
        // straight off this same getById response's `branches` list (every
        // user_branch_mapping row for this user, each tagged with its
        // status) rather than calling the separate, privileged
        // getAssignableAdmins endpoint — that one is gated to top-level
        // admin roles and its failures were being silently swallowed here,
        // which is exactly why this defaulted to "None" even when a branch
        // really was assigned.
        const activeBranch = (payload?.branches as { branch_id: string; status: number }[] | undefined)
          ?.find((b) => b.status === 1);
        const currentBranchId = activeBranch?.branch_id ?? NONE_BRANCH_VALUE;
        setOriginalBranchId(currentBranchId);
        setFormData((p) => ({ ...p, branchId: currentBranchId }));
      })
      .catch(() => {
        toast({
          title: "Failed to load admin",
          description: "Could not fetch this branch admin's details.",
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
  }, [employeeId, toast]);

  useEffect(() => {
    branchApi
      .getAll()
      .then((res) => {
        if (res.data?.data) setBranches(res.data.data);
      })
      .catch(() => {});

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
    if (formData.state) {
      const s = indianStates.find((s) => s.name === formData.state);
      if (s)
        setDistrictOptions(
          City.getCitiesOfState("IN", s.isoCode)
            .map((c) => c.name)
            .sort(),
        );
    } else {
      setDistrictOptions([]);
    }
  }, [formData.state, indianStates]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "currentAddress" && sameAsCurrent) next.permanentAddress = value;
      return next;
    });
  };

  const handleSameAsCurrent = (e: ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSameAsCurrent(checked);
    if (checked) setFormData((p) => ({ ...p, permanentAddress: p.currentAddress }));
  };

  const branchOptions = [
    { label: "None", value: NONE_BRANCH_VALUE },
    ...branches.map((b) => ({
      label: `${b.branch_id}${b.branch_name ? ` - ${b.branch_name}` : ""}`,
      value: b.branch_id,
    })),
  ];

  const branchNameById = (branchId: string) =>
    branches.find((b) => b.branch_id === branchId)?.branch_name || branchId;

  // ── Submit ─────────────────────────────────────────────────────────────────

  const requiredFields: { key: keyof AdminFormData; label: string }[] = [
    { key: "firstName", label: "First Name" },
    { key: "lastName", label: "Last Name" },
    { key: "bloodGroup", label: "Blood Group" },
    { key: "nationality", label: "Nationality" },
    { key: "maritalStatus", label: "Marital Status" },
    { key: "aadhaarNo", label: "Aadhaar No" },
    { key: "panNo", label: "PAN No" },
    { key: "email", label: "Email" },
    { key: "mobileNo", label: "Mobile" },
    { key: "joiningDate", label: "Joining Date" },
    { key: "departmentId", label: "Department" },
    { key: "state", label: "State" },
    { key: "district", label: "District" },
    { key: "area", label: "Area" },
    { key: "pincode", label: "Pincode" },
    { key: "currentAddress", label: "Current Address" },
    { key: "permanentAddress", label: "Permanent Address" },
    { key: "emergencyContactName", label: "Emergency Contact Name" },
    { key: "emergencyContactRelation", label: "Emergency Contact Relation" },
    { key: "emergencyContactNumber", label: "Emergency Contact Number" },
    { key: "username", label: "Username" },
  ];

  const buildEmployeePayload = async () => {
    let departmentId = formData.departmentId;
    if (departmentId === OTHER_DEPARTMENT_VALUE) {
      if (!customDepartment.trim()) {
        throw new Error('Please type a department name for "Others".');
      }
      const created = await departmentApi.create({ department_name: customDepartment.trim() });
      departmentId = created.data.data.department_id;
      setDepartments((p) => [...p, created.data.data]);
    }

    return {
      username: formData.username,
      password: formData.newPassword || undefined,
      first_name: formData.firstName,
      middle_name: formData.middleName || undefined,
      last_name: formData.lastName,
      email: formData.email,
      mobile_no: formData.mobileNo,
      blood_group: formData.bloodGroup || undefined,
      nationality: formData.nationality || undefined,
      marital_status: formData.maritalStatus || undefined,
      aadhaar_no: formData.aadhaarNo || undefined,
      pan_no: formData.panNo || undefined,
      passport_no: formData.passportNo || undefined,
      permanent_address: formData.permanentAddress || undefined,
      current_address: formData.currentAddress || undefined,
      employee_photo_URL: formData.photoUrl || undefined,
      employee_state: formData.state || undefined,
      employee_district: formData.district || undefined,
      employee_area: formData.area || undefined,
      employee_pincode: formData.pincode ? Number(formData.pincode) : undefined,
      emergency_contact_name: formData.emergencyContactName || undefined,
      emergency_contact_relationship: formData.emergencyContactRelation || undefined,
      emergency_contact_number: formData.emergencyContactNumber || undefined,
      department_id: departmentId || undefined,
      designation: formData.designation || undefined,
      joining_date: formData.joiningDate || undefined,
      emp_status: formData.isActive,
    };
  };

  const saveAll = async (branchAction?: "assign" | "unassign") => {
    if (!employeeId || !adminUserId) return;

    setSubmitting(true);
    try {
      if (branchAction === "assign") {
        await branchApi.assignAdmin(formData.branchId, adminUserId);
      } else if (branchAction === "unassign") {
        await branchApi.unassignAdmin(adminUserId);
      }

      const payload = await buildEmployeePayload();
      const response = await employeeApi.update(employeeId, payload);

      if (!response.data.success) {
        throw new Error(response.data.message);
      }

      setOriginalBranchId(formData.branchId);

      toast({
        title: "Admin updated",
        description:
          branchAction === "assign"
            ? `${formData.firstName} is now assigned to ${branchNameById(formData.branchId)}.`
            : branchAction === "unassign"
            ? `${formData.firstName} has been unassigned from their branch.`
            : `${formData.firstName} ${formData.lastName}'s details were updated.`,
      });

      navigate(-1);
    } catch (error: any) {
      toast({
        title: "Failed to update admin",
        description: error.response?.data?.message ?? error.message ?? "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (formData.newPassword && formData.newPassword !== formData.confirmNewPassword) {
      toast({
        title: "Password mismatch",
        description: "New password and confirm password must match.",
        variant: "destructive",
      });
      return;
    }

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
      formData.departmentId === OTHER_DEPARTMENT_VALUE &&
      !customDepartment.trim()
    ) {
      toast({
        title: "Missing required field",
        description: 'Please type a department name for "Others".',
        variant: "destructive",
      });
      return;
    }

    const branchChanged = formData.branchId !== originalBranchId;

    if (!branchChanged) {
      await saveAll();
      return;
    }

    if (!formData.branchId) {
      // Explicitly setting to "None" — unassign, no confirmation needed.
      await saveAll("unassign");
      return;
    }

    // Assigning to a branch — check whether it's already occupied by someone else.
    setSubmitting(true);
    try {
      const branchRes = await branchApi.getById(formData.branchId);
      const occupant = branchRes.data?.data?.current_admin;

      if (occupant && occupant.user_id !== adminUserId) {
        setReassignOccupantName(occupant.full_name || occupant.username || "the current admin");
        setReassignTargetBranchName(branchNameById(formData.branchId));
        setSubmitting(false);
        setShowReassignModal(true);
        return;
      }

      setSubmitting(false);
      await saveAll("assign");
    } catch (error: any) {
      setSubmitting(false);
      toast({
        title: "Failed to check branch",
        description: error.response?.data?.message ?? error.message ?? "Something went wrong.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmReassign = async () => {
    setShowReassignModal(false);
    await saveAll("assign");
  };

  const handleCancelReassign = () => {
    setShowReassignModal(false);
    setFormData((p) => ({ ...p, branchId: originalBranchId }));
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
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-50 transition-colors text-gray-500"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h4 className="hms-heading text-gray-900 tracking-tight">Edit Branch Admin</h4>
        </div>

        {/* ── Body ── */}
        <form onSubmit={handleSubmit} className="px-8 pt-7 pb-8">
          {/* Photo + Status */}
          <div className="flex items-start gap-10 pb-6 border-b border-gray-100 mb-7">
            <AvatarUpload
              value={formData.photoUrl}
              onChange={(url) => setFormData((p) => ({ ...p, photoUrl: url }))}
              label="Admin photo"
              hint="Click or drag an image to upload (Max 1MB)"
              size={80}
            />
            <div className="w-px self-stretch bg-gray-200" aria-hidden />
            <div className="w-64">
              <label className={labelCls}>Status <Req /></label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, isActive: true }))}
                  disabled={submitting}
                  className={`h-10 rounded-xl border-2 text-[13px] font-semibold transition-colors ${
                    formData.isActive
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, isActive: false }))}
                  disabled={submitting}
                  className={`h-10 rounded-xl border-2 text-[13px] font-semibold transition-colors ${
                    !formData.isActive
                      ? "border-red-400 bg-red-50 text-red-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  Inactive
                </button>
              </div>
            </div>
          </div>

          {/* ── Personal details ── */}
          <Section title="Personal details" sub="Identifying details for this branch admin.">
            <div className="grid grid-cols-3 gap-x-5 gap-y-[18px]">
              <div>
                <label className={labelCls}>First name <Req /></label>
                <input
                  name="firstName"
                  placeholder="Enter first name"
                  maxLength={50}
                  className={inputCls}
                  value={formData.firstName}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Middle name <Opt />
                </label>
                <input
                  name="middleName"
                  placeholder="Enter middle name"
                  maxLength={50}
                  className={inputCls}
                  value={formData.middleName}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Last name <Req /></label>
                <input
                  name="lastName"
                  placeholder="Enter last name"
                  maxLength={50}
                  className={inputCls}
                  value={formData.lastName}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={labelCls}>Blood group <Req /></label>
                <FormDropdown
                  className={inputCls}
                  options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]}
                  value={formData.bloodGroup}
                  onValueChange={(v) => setFormData((p) => ({ ...p, bloodGroup: v }))}
                  placeholder="Select blood group"
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Nationality <Req /></label>
                <input
                  name="nationality"
                  placeholder="Enter nationality"
                  maxLength={50}
                  className={inputCls}
                  value={formData.nationality}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Marital status <Req /></label>
                <FormDropdown
                  className={inputCls}
                  options={["Single", "Married", "Divorced"]}
                  value={formData.maritalStatus}
                  onValueChange={(v) => setFormData((p) => ({ ...p, maritalStatus: v }))}
                  placeholder="Select marital status"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={labelCls}>Aadhaar no <Req /></label>
                <input
                  name="aadhaarNo"
                  placeholder="Enter aadhaar number"
                  maxLength={20}
                  className={inputCls}
                  value={formData.aadhaarNo}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>PAN no <Req /></label>
                <input
                  name="panNo"
                  placeholder="Enter PAN number"
                  maxLength={20}
                  className={inputCls}
                  value={formData.panNo}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Passport no <Opt />
                </label>
                <input
                  name="passportNo"
                  placeholder="Enter passport number"
                  maxLength={20}
                  className={inputCls}
                  value={formData.passportNo}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={labelCls}>Email <Req /></label>
                <input
                  type="email"
                  name="email"
                  placeholder="Enter email"
                  maxLength={50}
                  className={inputCls}
                  value={formData.email}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Mobile <Req /></label>
                <input
                  name="mobileNo"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Enter mobile number"
                  maxLength={15}
                  className={inputCls}
                  value={formData.mobileNo}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Joining date <Req /></label>
                <input
                  type="date"
                  name="joiningDate"
                  className={inputCls + " text-gray-500"}
                  value={formData.joiningDate}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>

              <div className="col-span-2">
                <label className={labelCls}>Department <Req /></label>
                <FormDropdown
                  className={inputCls}
                  options={[
                    ...departments.map((d) => ({ label: d.department_name, value: d.department_id })),
                    { label: "Others", value: OTHER_DEPARTMENT_VALUE },
                  ]}
                  value={formData.departmentId}
                  onValueChange={(v) => {
                    setFormData((p) => ({ ...p, departmentId: v }));
                    if (v !== OTHER_DEPARTMENT_VALUE) setCustomDepartment("");
                  }}
                  placeholder={departments.length ? "Select department" : "Loading…"}
                  disabled={submitting}
                />
                {formData.departmentId === OTHER_DEPARTMENT_VALUE && (
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
              <div>
                <label className={labelCls}>
                  Designation <Opt />
                </label>
                <input
                  name="designation"
                  placeholder="e.g. Branch Admin"
                  maxLength={100}
                  className={inputCls}
                  value={formData.designation}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
            </div>
          </Section>

          {/* ── Address and location ── */}
          <Section title="Address and location" sub="State, district and residential details.">
            <div className="grid grid-cols-3 gap-x-5 gap-y-[18px]">
              <div>
                <label className={labelCls}>State <Req /></label>
                <FormDropdown
                  className={inputCls}
                  options={indianStates.map((s) => s.name)}
                  value={formData.state}
                  onValueChange={(v) => setFormData((p) => ({ ...p, state: v, district: "" }))}
                  placeholder="Select state"
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>District <Req /></label>
                <FormDropdown
                  className={inputCls}
                  options={districtOptions}
                  value={formData.district}
                  onValueChange={(v) => setFormData((p) => ({ ...p, district: v }))}
                  placeholder={formData.state ? "Select district" : "Select state first"}
                  disabled={submitting || !formData.state}
                />
              </div>
              <div>
                <label className={labelCls}>Area <Req /></label>
                <input
                  name="area"
                  placeholder="Enter area"
                  maxLength={50}
                  className={inputCls}
                  value={formData.area}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={labelCls}>Pincode <Req /></label>
                <input
                  name="pincode"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Enter pincode"
                  maxLength={10}
                  className={inputCls}
                  value={formData.pincode}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>

              <div className="col-span-3">
                <label className={labelCls}>Current address <Req /></label>
                <input
                  name="currentAddress"
                  placeholder="Enter current address"
                  maxLength={255}
                  className={inputCls}
                  value={formData.currentAddress}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>

              <div className="col-span-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sameAsCurrent"
                  checked={sameAsCurrent}
                  onChange={handleSameAsCurrent}
                  disabled={submitting}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="sameAsCurrent" className="text-[13px] text-gray-700 cursor-pointer select-none">
                  Same as current address
                </label>
              </div>

              <div className="col-span-3">
                <label className={labelCls}>Permanent address <Req /></label>
                <input
                  name="permanentAddress"
                  placeholder="Enter permanent address"
                  maxLength={255}
                  className={inputCls}
                  value={formData.permanentAddress}
                  onChange={handleChange}
                  disabled={submitting || sameAsCurrent}
                />
              </div>
            </div>
          </Section>

          {/* ── Emergency contact ── */}
          <Section title="Emergency contact" sub="Who to reach in an emergency.">
            <div className="grid grid-cols-3 gap-x-5 gap-y-[18px]">
              <div>
                <label className={labelCls}>Contact name <Req /></label>
                <input
                  name="emergencyContactName"
                  placeholder="Enter contact name"
                  maxLength={100}
                  className={inputCls}
                  value={formData.emergencyContactName}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Relation <Req /></label>
                <input
                  name="emergencyContactRelation"
                  placeholder="e.g. spouse, parent"
                  maxLength={50}
                  className={inputCls}
                  value={formData.emergencyContactRelation}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Contact number <Req /></label>
                <input
                  name="emergencyContactNumber"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Enter contact number"
                  maxLength={15}
                  className={inputCls}
                  value={formData.emergencyContactNumber}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
            </div>
          </Section>

          {/* ── Account credentials ── */}
          <Section title="Account credentials" sub="Leave the password fields blank to keep the current password.">
            <div className="grid grid-cols-3 gap-x-5 gap-y-[18px]">
              <div>
                <label className={labelCls}>Username <Req /></label>
                <input
                  name="username"
                  placeholder="Enter username"
                  maxLength={50}
                  className={inputCls}
                  value={formData.username}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>
                  New password <Opt />
                </label>
                <input
                  type="password"
                  name="newPassword"
                  placeholder="Leave blank to keep unchanged"
                  className={inputCls}
                  value={formData.newPassword}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Confirm new password <Opt />
                </label>
                <input
                  type="password"
                  name="confirmNewPassword"
                  placeholder="Re-enter new password"
                  className={inputCls}
                  value={formData.confirmNewPassword}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
            </div>
          </Section>

          {/* ── Assigned branch ── */}
          <Section
            title="Assigned branch"
            sub="A branch admin belongs to exactly one branch — assigning them to an occupied branch will replace its current admin."
          >
            <div className="grid grid-cols-3 gap-x-5 gap-y-[18px]">
              <div className="col-span-2">
                <label className={labelCls}>Branch</label>
                <FormDropdown
                  className={inputCls}
                  options={branchOptions}
                  value={formData.branchId}
                  onValueChange={(v) => setFormData((p) => ({ ...p, branchId: v }))}
                  placeholder="Select branch"
                  disabled={submitting}
                />
              </div>
            </div>
          </Section>

          {/* ── Actions ── */}
          <div className="flex justify-end gap-3.5 pt-5 mt-1.5 border-t border-gray-100">
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={submitting}
              className="h-[42px] px-6 text-[13.5px] font-semibold text-gray-700 border border-gray-300 rounded-xl bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
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

      <AlertDialog open={showReassignModal} onOpenChange={setShowReassignModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace this branch's admin?</AlertDialogTitle>
            <AlertDialogDescription>
              {reassignTargetBranchName} is currently assigned to {reassignOccupantName}. Assigning{" "}
              {formData.firstName || "this admin"} will remove {reassignOccupantName} from this branch.
              Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelReassign}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReassign}>Yes, replace</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
