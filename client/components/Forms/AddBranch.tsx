import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2, Check, Loader2, Plus, ShieldCheck, UserCheck, UserPlus } from "lucide-react";
import {
  branchApi,
  Branch,
  BranchAdminMode,
  CreateBranchPayload,
  NewBranchAdminPayload,
  AssignableUser,
  CurrentBranchAdmin,
} from "@/api/branch.api";
import { departmentApi, Department } from "@/api/department.api";
import { employeeApi } from "@/api/employee.api";
import { useToast } from "@/hooks/use-toast";
import { FormDropdown } from "@/components/ui/form-dropdown";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { getUser } from "@/utils/token";
import { validateRequiredFields } from "@/lib/validation";

import { AvatarUpload } from "@/components/ui/avatar-upload";
import { PhoneInput } from "@/components/ui/phone-input";
import { State as CSState, City } from "country-state-city";
import type { IState } from "country-state-city";

export const medicalServiceTypes = [
  "Single Specialty",
  "Multi Specialty",
  "Super Specialty",
  "General Hospital",
  "Cancer Care Center",
  "Primary Care Clinic",
  "Day Care Center",
];

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
}

interface AdminFormData {
  adminMode: BranchAdminMode;
  adminUserId: string;
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
  adminGender: string;
  adminDateOfBirth: string;
  adminExperience: string;
  adminState: string;
  adminDistrict: string;
  adminArea: string;
  adminPincode: string;
  adminCurrentAddress: string;
  adminPermanentAddress: string;
  adminPermanentState: string;
  adminPermanentDistrict: string;
  adminPermanentArea: string;
  adminPermanentPincode: string;
  adminEmergencyContactName: string;
  adminEmergencyContactRelation: string;
  adminEmergencyContactNumber: string;
  adminJoiningDate: string;
  adminDepartmentId: string;
  adminUsername: string;
  password: string;
  confirmPassword: string;
}

const emptyBranchData: BranchFormData = {
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
};

const emptyAdminData: AdminFormData = {
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
  adminGender: "",
  adminDateOfBirth: "",
  adminExperience: "",
  adminState: "",
  adminDistrict: "",
  adminArea: "",
  adminPincode: "",
  adminCurrentAddress: "",
  adminPermanentAddress: "",
  adminPermanentState: "",
  adminPermanentDistrict: "",
  adminPermanentArea: "",
  adminPermanentPincode: "",
  adminEmergencyContactName: "",
  adminEmergencyContactRelation: "",
  adminEmergencyContactNumber: "",
  adminJoiningDate: "",
  adminDepartmentId: "",
  adminUsername: "",
  password: "",
  confirmPassword: "",
};

const isAdminFieldKey = (name: string) =>
  name.startsWith("admin") || name === "password" || name === "confirmPassword";

const branchRequired: { key: keyof BranchFormData; label: string }[] = [
  { key: "branchCode", label: "Branch Code" },
  { key: "branchName", label: "Branch Name" },
  { key: "branchType", label: "Branch Type" },
  { key: "area", label: "Area" },
  { key: "state", label: "State" },
  { key: "district", label: "District" },
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
  { key: "websiteAddress", label: "Website Address" },
];

const adminRequired: Record<BranchAdminMode, { key: keyof AdminFormData; label: string }[]> = {
  EXISTING: [{ key: "adminUserId", label: "Branch Admin" }],
  NEW: [
    { key: "adminFirstName", label: "Admin First Name" },
    { key: "adminLastName", label: "Admin Last Name" },
    { key: "adminGender", label: "Admin Gender" },
    { key: "adminDateOfBirth", label: "Admin Date of Birth" },
    { key: "adminExperience", label: "Admin Experience" },
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
    { key: "adminPermanentState", label: "Admin Permanent State" },
    { key: "adminPermanentDistrict", label: "Admin Permanent District" },
    { key: "adminPermanentArea", label: "Admin Permanent Area" },
    { key: "adminPermanentPincode", label: "Admin Permanent Pincode" },
    { key: "adminEmergencyContactName", label: "Admin Emergency Contact Name" },
    { key: "adminEmergencyContactRelation", label: "Admin Emergency Contact Relation" },
    { key: "adminEmergencyContactNumber", label: "Admin Emergency Contact Number" },
    { key: "adminUsername", label: "Admin Username" },
    { key: "password", label: "Password" },
  ],
};

const OTHER_DEPARTMENT_VALUE = "__OTHER__";

// Only these roles are authorized to call GET /branch/assignable-admins on the
// backend — fetching for anyone else always 403s, so we gate the call (and
// hide the "Reassign existing user" option) on the client to match.
const TOP_LEVEL_ADMIN_ROLES = ["ADMIN", "Admin", "HEAD_ADMIN", "SUPER_ADMIN"];

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

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

export default function AddBranch() {
  const navigate = useNavigate();
  const { id: branchId } = useParams<{ id: string }>();
  const isEditMode = Boolean(branchId);
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
  const [branchData, setBranchData] = useState<BranchFormData>(emptyBranchData);
  const [adminData, setAdminData] = useState<AdminFormData>(emptyAdminData);
  const [currentAdmin, setCurrentAdmin] = useState<CurrentBranchAdmin | null>(null);
  const [assignableAdmins, setAssignableAdmins] = useState<AssignableUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [customDepartment, setCustomDepartment] = useState("");
  const [indianStates, setIndianStates] = useState<IState[]>([]);
  const [districtOptions, setDistrictOptions] = useState<string[]>([]);
  const [permanentDistrictOptions, setPermanentDistrictOptions] = useState<string[]>([]);
  const [sameAsCurrent, setSameAsCurrent] = useState(false);
  const [branchDistrictOptions, setBranchDistrictOptions] = useState<string[]>([]);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [originalBranchData, setOriginalBranchData] = useState<BranchFormData | null>(null);
  const [originalAdminData, setOriginalAdminData] = useState<AdminFormData | null>(null);

  const currentUserRole = getUser()?.role_type || getUser()?.role || "";
  const canReassignAdmin = TOP_LEVEL_ADMIN_ROLES.some(
    (r) => r.toLowerCase() === String(currentUserRole).toLowerCase(),
  );

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (isAdminFieldKey(name)) {
      setAdminData((prev) => ({ ...prev, [name]: value }));
    } else {
      setBranchData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAdminModeChange = (mode: BranchAdminMode) => {
    setAdminData((prev) => ({ ...prev, adminMode: mode }));
  };

  // Non-top-level-admin users can't reassign admins (backend 403s), so force
  // them onto "Create New Admin" instead of leaving them stuck on a blank,
  // unfetchable "Reassign User" panel (e.g. the EXISTING default in edit mode).
  useEffect(() => {
    if (!canReassignAdmin && adminData.adminMode === "EXISTING") {
      setAdminData((prev) => ({ ...prev, adminMode: "NEW" }));
    }
  }, [canReassignAdmin, adminData.adminMode]);

  const handleSameAsCurrent = (e: ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSameAsCurrent(checked);
    if (checked) {
      setAdminData((p) => ({
        ...p,
        adminPermanentAddress: p.adminCurrentAddress,
        adminPermanentState: p.adminState,
        adminPermanentDistrict: p.adminDistrict,
        adminPermanentArea: p.adminArea,
        adminPermanentPincode: p.adminPincode,
      }));
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
    if (adminData.adminMode === "EXISTING" && canReassignAdmin) {
      fetchAssignableAdmins();
    }
  }, [adminData.adminMode, canReassignAdmin]);

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
    if (adminData.adminState) {
      const s = indianStates.find((s) => s.name === adminData.adminState);
      if (s)
        setDistrictOptions(
          City.getCitiesOfState("IN", s.isoCode)
            .map((c) => c.name)
            .sort(),
        );
    } else {
      setDistrictOptions([]);
    }
  }, [adminData.adminState, indianStates]);

  useEffect(() => {
    if (adminData.adminPermanentState) {
      const s = indianStates.find((s) => s.name === adminData.adminPermanentState);
      if (s)
        setPermanentDistrictOptions(
          City.getCitiesOfState("IN", s.isoCode)
            .map((c) => c.name)
            .sort(),
        );
    } else {
      setPermanentDistrictOptions([]);
    }
  }, [adminData.adminPermanentState, indianStates]);

  useEffect(() => {
    if (branchData.state) {
      const s = indianStates.find((s) => s.name === branchData.state);
      if (s)
        setBranchDistrictOptions(
          City.getCitiesOfState("IN", s.isoCode)
            .map((c) => c.name)
            .sort(),
        );
    } else {
      setBranchDistrictOptions([]);
    }
  }, [branchData.state, indianStates]);

  useEffect(() => {
    setBranchData((prev) => ({
      ...prev,
      country: "India",
      countryId: "IN",
    }));
    setOriginalBranchData({ ...emptyBranchData, country: "India", countryId: "IN" });
    setOriginalAdminData(emptyAdminData);
  }, []);

  // Edit mode — fetch the branch's full details (all columns + currently
  // assigned admin) via GET /branch/:branchId and prefill both branchData and
  // the read-only "Currently Assigned Admin" card. Admin mode defaults to
  // "EXISTING" pre-selected on the current admin, so saving branch-only edits
  // doesn't force filling out a brand-new admin's full profile.
  useEffect(() => {
    if (!branchId) return;

    branchApi
      .getById(branchId)
      .then((res) => {
        const branch = res.data?.data;

        if (branch) {
          setBranchData((prev) => ({
            ...prev,
            branchCode: branch.branch_code || "",
            branchName: branch.branch_name || "",
            branchType: branch.branch_type || "",
            area: branch.branch_area || "",
            state: branch.state_name || "",
            district: branch.district || "",
            country: branch.country || "India",
            countryId: "IN",
            pincode: branch.branch_pincode != null ? String(branch.branch_pincode) : "",
            licenseNumber: branch.branch_license_no || "",
            emergencyNumber: branch.emergency_no || "",
            email: branch.branch_email || "",
            address: branch.address || "",
            dateOfEstablish: branch.date_of_establish
              ? String(branch.date_of_establish).slice(0, 10)
              : "",
            totalBeds: branch.total_beds != null ? String(branch.total_beds) : "",
            totalEmployees: branch.total_no_emp || "",
            faxNo: branch.fax_no || "",
            gstNo: branch.gst_no || "",
            panNo: branch.pan_no || "",
            websiteAddress: branch.website_address || "",
            medicalServices: branch.medical_services || "",
          }));

          const admin = branch.current_admin ?? null;
          setCurrentAdmin(admin);
          setAdminData((prev) => ({
            ...prev,
            adminMode: "EXISTING",
            adminUserId: admin?.user_id ?? "",
          }));

          setOriginalBranchData({
            branchCode: branch.branch_code || "",
            branchName: branch.branch_name || "",
            branchType: branch.branch_type || "",
            area: branch.branch_area || "",
            state: branch.state_name || "",
            district: branch.district || "",
            country: branch.country || "India",
            countryId: "IN",
            pincode: branch.branch_pincode != null ? String(branch.branch_pincode) : "",
            licenseNumber: branch.branch_license_no || "",
            emergencyNumber: branch.emergency_no || "",
            email: branch.branch_email || "",
            address: branch.address || "",
            dateOfEstablish: branch.date_of_establish
              ? String(branch.date_of_establish).slice(0, 10)
              : "",
            totalBeds: branch.total_beds != null ? String(branch.total_beds) : "",
            totalEmployees: branch.total_no_emp || "",
            faxNo: branch.fax_no || "",
            gstNo: branch.gst_no || "",
            panNo: branch.pan_no || "",
            websiteAddress: branch.website_address || "",
            medicalServices: branch.medical_services || "",
          });
          setOriginalAdminData({
            ...emptyAdminData,
            adminMode: "EXISTING",
            adminUserId: admin?.user_id ?? "",
          });
        } else {
          toast({
            title: "Branch not found",
            description: "Could not find this branch.",
            variant: "destructive",
          });
        }
      })
      .catch(() => {
        toast({
          title: "Failed to load branch",
          description: "Could not fetch branch details.",
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
  }, [branchId, toast]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (adminData.password !== adminData.confirmPassword && adminData.adminMode === "NEW") {
      toast({
        title: "Password mismatch",
        description: "Password and Confirm Password must match.",
        variant: "destructive",
      });
      return;
    }

    if (!validateRequiredFields(branchRequired, branchData, toast)) return;
    if (!validateRequiredFields(adminRequired[adminData.adminMode], adminData, toast)) return;

    if (
      adminData.adminMode === "NEW" &&
      adminData.adminDepartmentId === OTHER_DEPARTMENT_VALUE &&
      !customDepartment.trim()
    ) {
      toast({
        title: "Missing required field",
        description: 'Please type a department name for "Others".',
        variant: "destructive",
      });
      return;
    }

    setShowSubmitConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);

    try {
      if (isEditMode && branchId) {
        const branchPayload: Partial<CreateBranchPayload> = {
          branch_code: branchData.branchCode,
          branch_name: branchData.branchName,
          branch_type: branchData.branchType,
          email: branchData.email,
          emergency_number: branchData.emergencyNumber,
          address: branchData.address,
          district: branchData.district,
          state_name: branchData.state,
          country: branchData.country,
          area: branchData.area,
          pincode: branchData.pincode ? Number(branchData.pincode) : undefined,
          license_number: branchData.licenseNumber,
          total_beds: branchData.totalBeds ? Number(branchData.totalBeds) : undefined,
          total_no_emp: branchData.totalEmployees || undefined,
          fax_no: branchData.faxNo || null,
          gst_no: branchData.gstNo || null,
          pan_no: branchData.panNo || null,
          website_address: branchData.websiteAddress || null,
          date_of_establish: branchData.dateOfEstablish || undefined,
          medical_services: branchData.medicalServices,
        };

        const response = await branchApi.update(branchId, branchPayload);
        if (!response.data.success) {
          throw new Error(response.data.message);
        }

        if (adminData.adminMode === "EXISTING") {
          // Only call out to reassign if the selection actually changed —
          // resubmitting with the same admin already assigned is a no-op.
          if (adminData.adminUserId && adminData.adminUserId !== currentAdmin?.user_id) {
            const assignRes = await branchApi.assignAdmin(branchId, adminData.adminUserId);
            if (!assignRes.data.success) {
              throw new Error(assignRes.data.message);
            }
          }
        } else {
          let departmentId = adminData.adminDepartmentId;
          if (departmentId === OTHER_DEPARTMENT_VALUE) {
            const created = await departmentApi.create({
              department_name: customDepartment.trim(),
            });
            departmentId = created.data.data.department_id;
            setDepartments((p) => [...p, created.data.data]);
          }

          // Free up whoever currently administers this branch before handing
          // it to a brand-new admin — a branch has exactly one active admin.
          if (currentAdmin) {
            await branchApi.unassignAdmin(currentAdmin.user_id);
          }

          const empRes = await employeeApi.create({
            username: adminData.adminUsername,
            password: adminData.password,
            role_type: "BRANCH_ADMIN",
            first_name: adminData.adminFirstName,
            middle_name: adminData.adminMiddleName || undefined,
            last_name: adminData.adminLastName || "",
            email: adminData.adminEmail,
            mobile_no: adminData.adminMobile,
            dob: adminData.adminDateOfBirth || undefined,
            gender: adminData.adminGender || undefined,
            blood_group: adminData.adminBloodGroup || undefined,
            nationality: adminData.adminNationality || undefined,
            marital_status: adminData.adminMaritalStatus || undefined,
            aadhaar_no: adminData.adminAadhaarNo || undefined,
            pan_no: adminData.adminPanNo || undefined,
            passport_no: adminData.adminPassportNo || undefined,
            permanent_address: adminData.adminPermanentAddress || undefined,
            current_address: adminData.adminCurrentAddress || undefined,
            employee_photo_URL: adminData.adminPhotoUrl || undefined,
            employee_state: adminData.adminState || undefined,
            employee_district: adminData.adminDistrict || undefined,
            employee_area: adminData.adminArea || undefined,
            employee_pincode: adminData.adminPincode ? Number(adminData.adminPincode) : undefined,
            permanent_employee_state: adminData.adminPermanentState || undefined,
            permanent_employee_district: adminData.adminPermanentDistrict || undefined,
            permanent_employee_area: adminData.adminPermanentArea || undefined,
            permanent_employee_pincode: adminData.adminPermanentPincode
              ? Number(adminData.adminPermanentPincode)
              : undefined,
            employee_no_experence: adminData.adminExperience
              ? Number(adminData.adminExperience)
              : undefined,
            emergency_contact_name: adminData.adminEmergencyContactName || undefined,
            emergency_contact_relationship: adminData.adminEmergencyContactRelation || undefined,
            emergency_contact_number: adminData.adminEmergencyContactNumber || undefined,
            department_id: departmentId,
            designation: "Branch Admin",
            joining_date: adminData.adminJoiningDate,
            emp_status: true,
            branch_ids: [branchId],
          });
          if (!empRes.data.success) {
            throw new Error(empRes.data.message);
          }
        }

        toast({
          title: "Branch updated",
          description: `${branchData.branchName} was updated successfully.`,
        });
      } else {
        const payload: CreateBranchPayload = {
          branch_code: branchData.branchCode,
          branch_name: branchData.branchName,
          branch_type: branchData.branchType,
          email: branchData.email,
          emergency_number: branchData.emergencyNumber,
          address: branchData.address,
          district: branchData.district,
          state_name: branchData.state,
          country: branchData.country,
          country_id: branchData.countryId,
          area: branchData.area,
          pincode: branchData.pincode ? Number(branchData.pincode) : undefined,
          license_number: branchData.licenseNumber,
          total_beds: branchData.totalBeds ? Number(branchData.totalBeds) : undefined,
          total_no_emp: branchData.totalEmployees || undefined,
          fax_no: branchData.faxNo || null,
          gst_no: branchData.gstNo || null,
          pan_no: branchData.panNo || null,
          website_address: branchData.websiteAddress || null,
          date_of_establish: branchData.dateOfEstablish || undefined,
          medical_services: branchData.medicalServices,

          admin_mode: adminData.adminMode,
        };

        if (adminData.adminMode === "EXISTING") {
          payload.admin_user_id = adminData.adminUserId;
        } else if (adminData.adminMode === "NEW") {
          let departmentId = adminData.adminDepartmentId;
          if (departmentId === OTHER_DEPARTMENT_VALUE) {
            const created = await departmentApi.create({
              department_name: customDepartment.trim(),
            });
            departmentId = created.data.data.department_id;
            setDepartments((p) => [...p, created.data.data]);
          }

          const adminPayload: NewBranchAdminPayload = {
            first_name: adminData.adminFirstName,
            middle_name: adminData.adminMiddleName || undefined,
            last_name: adminData.adminLastName || undefined,
            email: adminData.adminEmail,
            mobile_no: adminData.adminMobile,
            username: adminData.adminUsername,
            password: adminData.password,
            department_id: departmentId || undefined,
            blood_group: adminData.adminBloodGroup || undefined,
            nationality: adminData.adminNationality || undefined,
            marital_status: adminData.adminMaritalStatus || undefined,
            aadhaar_no: adminData.adminAadhaarNo || undefined,
            pan_no: adminData.adminPanNo || undefined,
            passport_no: adminData.adminPassportNo || undefined,
            permanent_address: adminData.adminPermanentAddress || undefined,
            current_address: adminData.adminCurrentAddress || undefined,
            employee_photo_URL: adminData.adminPhotoUrl || undefined,
            employee_state: adminData.adminState || undefined,
            employee_district: adminData.adminDistrict || undefined,
            employee_area: adminData.adminArea || undefined,
            employee_pincode: adminData.adminPincode ? Number(adminData.adminPincode) : undefined,
            permanent_employee_state: adminData.adminPermanentState || undefined,
            permanent_employee_district: adminData.adminPermanentDistrict || undefined,
            permanent_employee_area: adminData.adminPermanentArea || undefined,
            permanent_employee_pincode: adminData.adminPermanentPincode
              ? Number(adminData.adminPermanentPincode)
              : undefined,
            employee_no_experence: adminData.adminExperience
              ? Number(adminData.adminExperience)
              : undefined,
            dob: adminData.adminDateOfBirth || undefined,
            gender: adminData.adminGender || undefined,
            emergency_contact_name: adminData.adminEmergencyContactName || undefined,
            emergency_contact_relationship: adminData.adminEmergencyContactRelation || undefined,
            emergency_contact_number: adminData.adminEmergencyContactNumber || undefined,
            joining_date: adminData.adminJoiningDate || undefined,
          };
          payload.admin = adminPayload;
        }

        const response = await branchApi.create(payload);

        if (!response.data.success) {
          throw new Error(response.data.message);
        }

        toast({
          title: "Branch created",
          description: `${branchData.branchName} was added successfully.`,
        });
      }

      navigate(-1);
    } catch (error: any) {
      toast({
        title: isEditMode ? "Failed to update branch" : "Failed to create branch",
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

    if (isEditMode) {
      // Blowing away branchData here would also clear the read-only Branch
      // Code — reloading is the only sane way to get back to loaded values.
      window.location.reload();
      return;
    }
    setBranchData(emptyBranchData);
    setAdminData(emptyAdminData);
    setCustomDepartment("");
    setSameAsCurrent(false);
  };

  const isDirty =
    (!!originalBranchData && JSON.stringify(branchData) !== JSON.stringify(originalBranchData)) ||
    (!!originalAdminData && JSON.stringify(adminData) !== JSON.stringify(originalAdminData));

  const handleBack = () => {
    if (isDirty) {
      setShowLeaveConfirm(true);
      return;
    }
    navigate("/dashboard");
  };

  const adminModeOptions = canReassignAdmin
    ? [
        { value: "EXISTING", label: "Reassign User", icon: UserCheck },
        { value: "NEW", label: "Create New Admin", icon: UserPlus },
      ]
    : [{ value: "NEW", label: "Create New Admin", icon: UserPlus }];

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
            <Building2 className="w-5 h-5" />
          </div>
          <h4 className="hms-heading text-gray-900 tracking-tight">
            {isEditMode ? "Edit Branch" : "Add Branch"}
          </h4>
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
                  value={branchData.branchCode}
                  onChange={handleChange}
                  disabled={isEditMode || submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Branch Name <Req /></label>
                <input
                  type="text"
                  name="branchName"
                  placeholder="Enter Branch Name"
                  className={inputCls}
                  value={branchData.branchName}
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
                  value={branchData.branchType}
                  onValueChange={(val) => setBranchData((prev) => ({ ...prev, branchType: val }))}
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
                  value={branchData.licenseNumber}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Emergency Number <Req /></label>
                <PhoneInput
                  name="emergencyNumber"
                  value={branchData.emergencyNumber}
                  onChange={(value) => handleChange({ target: { name: "emergencyNumber", value } } as any)}
                  placeholder="Enter Emergency Number"
                  disabled={submitting}
                  defaultCountry="in"
                />
              </div>
              <div>
                <label className={labelCls}>Date of Establish <Req /></label>
                <input
                  type="date"
                  name="dateOfEstablish"
                  max={new Date().toISOString().split("T")[0]}
                  className={inputCls + " text-gray-500"}
                  value={branchData.dateOfEstablish}
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
                  value={branchData.email}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Fax Number
                </label>
                <input
                  type="text"
                  name="faxNo"
                  placeholder="Enter Fax Number"
                  className={inputCls}
                  value={branchData.faxNo}
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
                  value={branchData.websiteAddress}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
            </div>
          </Section>

          {/* ── Location ── */}
          <Section
            title="Location"
            sub="Address, state, district and pincode details."
          >
            <div className="grid grid-cols-3 gap-x-5 gap-y-[18px]">
              <div>
                <label className={labelCls}>Address <Req /></label>
                <input
                  type="text"
                  name="address"
                  placeholder="Enter building no and street name"
                  className={inputCls}
                  value={branchData.address}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
                            <div>
                <label className={labelCls}>Area <Req /></label>
                <input
                  type="text"
                  name="area"
                  placeholder="Enter Area"
                  className={inputCls}
                  value={branchData.area}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>State <Req /></label>
                <FormDropdown
                  className={inputCls}
                  options={indianStates.map((s) => s.name)}
                  value={branchData.state}
                  onValueChange={(v) =>
                    setBranchData((p) => ({ ...p, state: v, district: "" }))
                  }
                  placeholder="Select state"
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>District <Req /></label>
                <FormDropdown
                  className={inputCls}
                  options={branchDistrictOptions}
                  value={branchData.district}
                  onValueChange={(v) => setBranchData((p) => ({ ...p, district: v }))}
                  placeholder={branchData.state ? "Select district" : "Select state first"}
                  disabled={submitting || !branchData.state}
                />
              </div>
              <div>
                <label className={labelCls}>Pincode <Req /></label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  name="pincode"
                  placeholder="Enter Pincode"
                  className={inputCls}
                  value={branchData.pincode}
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
                  value={branchData.totalBeds}
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
                  value={branchData.totalEmployees}
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
                  value={branchData.gstNo}
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
                  value={branchData.panNo}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div className="col-span-1">
                <label className={labelCls}>Medical Services <Req /></label>
                <FormDropdown
                  className={inputCls}
                  options={medicalServiceTypes}
                  value={branchData.medicalServices}
                  onValueChange={(v) => setBranchData((p) => ({ ...p, medicalServices: v }))}
                  placeholder="Select Medical Services"
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
            {isEditMode && (
              <div className="mb-5">
                <h5 className={labelCls}>Currently Assigned Admin</h5>
                {currentAdmin ? (
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden">
                      {currentAdmin.employee_photo_URL ? (
                        <img
                          src={currentAdmin.employee_photo_URL}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        getInitials(currentAdmin.full_name || currentAdmin.username || "?")
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-3">
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                        <span className="text-[13px] font-semibold text-gray-800">
                          Current Admin
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-[18px]">
                        <div>
                          <label className={labelCls}>Name</label>
                          <input className={inputCls} value={currentAdmin.full_name || "—"} disabled />
                        </div>
                        <div>
                          <label className={labelCls}>Employee ID</label>
                          <input className={inputCls} value={currentAdmin.employee_id ?? "—"} disabled />
                        </div>
                        <div>
                          <label className={labelCls}>Username</label>
                          <input className={inputCls} value={currentAdmin.username ?? "—"} disabled />
                        </div>
                        <div>
                          <label className={labelCls}>Email</label>
                          <input className={inputCls} value={currentAdmin.email ?? "—"} disabled />
                        </div>
                        <div>
                          <label className={labelCls}>Mobile</label>
                          <input className={inputCls} value={currentAdmin.mobile_no ?? "—"} disabled />
                        </div>
                        <div>
                          <label className={labelCls}>Assigned Since</label>
                          <input
                            className={inputCls}
                            value={
                              currentAdmin.assigned_date
                                ? new Date(currentAdmin.assigned_date).toLocaleDateString()
                                : "—"
                            }
                            disabled
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[13px] text-gray-500 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    No branch admin is currently assigned to this branch.
                  </p>
                )}
                <div className="border-t border-gray-200 mt-5" />
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 mb-5">
              {adminModeOptions.map(({ value, label, icon: Icon }) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => handleAdminModeChange(value as BranchAdminMode)}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 text-center ${
                    adminData.adminMode === value
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

            {adminData.adminMode === "EXISTING" && (
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
                    value={adminData.adminUserId}
                    onValueChange={(val) => setAdminData((prev) => ({ ...prev, adminUserId: val }))}
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

            {adminData.adminMode === "NEW" && (
              <div className="space-y-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h5 className="text-[13px] font-semibold text-gray-800 flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-blue-600" />
                    Create New Admin
                  </h5>
                  <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
                    Role: Branch Admin
                  </span>
                </div>

                <div className="flex items-start gap-8 pb-5 border-b border-gray-200">
                  <AvatarUpload
                    value={adminData.adminPhotoUrl}
                    onChange={(url) => setAdminData((p) => ({ ...p, adminPhotoUrl: url }))}
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
                      value={adminData.adminFirstName}
                      onChange={handleChange}
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>
                      Middle Name <Opt />
                    </label>
                    <input
                      type="text"
                      name="adminMiddleName"
                      placeholder="Enter Middle Name"
                      className={inputCls}
                      value={adminData.adminMiddleName}
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
                      value={adminData.adminLastName}
                      onChange={handleChange}
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>
                      Gender <Req />
                    </label>
                    <FormDropdown
                      className={inputCls}
                      options={["Male", "Female", "Other"]}
                      value={adminData.adminGender}
                      onValueChange={(v) => setAdminData((p) => ({ ...p, adminGender: v }))}
                      placeholder="Select gender"
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>
                      Date of Birth <Req />
                    </label>
                    <input
                      type="date"
                      name="adminDateOfBirth"
                      max={new Date().toISOString().split("T")[0]}
                      className={inputCls + " text-gray-500"}
                      value={adminData.adminDateOfBirth}
                      onChange={handleChange}
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Age</label>
                    <input
                      type="text"
                      placeholder="Auto-calculated"
                      className={inputCls + " bg-gray-50 text-gray-500"}
                      value={
                        adminData.adminDateOfBirth
                          ? Math.floor(
                              (Date.now() - new Date(adminData.adminDateOfBirth).getTime()) /
                                31557600000,
                            ).toString()
                          : ""
                      }
                      disabled
                    />
                  </div>

                  <div>
                    <label className={labelCls}>
                      Blood Group <Req />
                    </label>
                    <FormDropdown
                      className={inputCls}
                      options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]}
                      value={adminData.adminBloodGroup}
                      onValueChange={(v) => setAdminData((p) => ({ ...p, adminBloodGroup: v }))}
                      placeholder="Select blood group"
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>
                      Experience (years) <Req />
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      name="adminExperience"
                      placeholder="Enter experience"
                      maxLength={10}
                      className={inputCls}
                      value={adminData.adminExperience}
                      onChange={handleChange}
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
                      value={adminData.adminNationality}
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
                      value={adminData.adminMaritalStatus}
                      onValueChange={(v) => setAdminData((p) => ({ ...p, adminMaritalStatus: v }))}
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
                      value={adminData.adminAadhaarNo}
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
                      value={adminData.adminPanNo}
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
                      value={adminData.adminPassportNo}
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
                      value={adminData.adminEmail}
                      onChange={handleChange}
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Mobile <Req /></label>
                    <PhoneInput
                      name="adminMobile"
                      value={adminData.adminMobile}
                      onChange={(value) => handleChange({ target: { name: "adminMobile", value } } as any)}
                      placeholder="Enter Mobile Number"
                      disabled={submitting}
                      defaultCountry="in"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Joining Date <Req /></label>
                    <input
                      type="date"
                      name="adminJoiningDate"
                      max={new Date().toISOString().split("T")[0]}
                      className={inputCls + " text-gray-500"}
                      value={adminData.adminJoiningDate}
                      onChange={handleChange}
                      disabled={submitting}
                    />
                  </div>

                  <div className="md:col-span-1">
                    <label className={labelCls}>
                      Department <Req />
                    </label>
                    <FormDropdown
                      className={inputCls}
                      options={[
                        ...departments.map((d) => ({ label: d.department_name, value: d.department_id })),
                        { label: "Others", value: OTHER_DEPARTMENT_VALUE },
                      ]}
                      value={adminData.adminDepartmentId}
                      onValueChange={(v) => {
                        setAdminData((p) => ({ ...p, adminDepartmentId: v }));
                        if (v !== OTHER_DEPARTMENT_VALUE) setCustomDepartment("");
                      }}
                      placeholder={departments.length ? "Select department" : "Loading…"}
                      disabled={submitting}
                    />
                    {adminData.adminDepartmentId === OTHER_DEPARTMENT_VALUE && (
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
                <div className="pt-1 border-t border-gray-200">
                  <h6 className="text-[11.5px] font-bold text-gray-500 uppercase tracking-wide my-3">
                    Address and location
                  </h6>

                  {/* Current address */}
                  <Section
                    title="Current Address"
                    sub="Employee's current residential location."
                  >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-[18px]">
                    <div className="md:col-span-1">
                      <label className={labelCls}>
                        Address <Req />
                      </label>
                      <input
                        type="text"
                        name="adminCurrentAddress"
                        placeholder="Enter current address"
                        maxLength={255}
                        className={inputCls}
                        value={adminData.adminCurrentAddress}
                        onChange={handleChange}
                        disabled={submitting}
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
                        value={adminData.adminArea}
                        onChange={handleChange}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>
                        State <Req />
                      </label>
                      <FormDropdown
                        className={inputCls}
                        options={indianStates.map((s) => s.name)}
                        value={adminData.adminState}
                        onValueChange={(v) =>
                          setAdminData((p) => ({ ...p, adminState: v, adminDistrict: "" }))
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
                        value={adminData.adminDistrict}
                        onValueChange={(v) => setAdminData((p) => ({ ...p, adminDistrict: v }))}
                        placeholder={adminData.adminState ? "Select district" : "Select state first"}
                        disabled={submitting || !adminData.adminState}
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
                        value={adminData.adminPincode}
                        onChange={handleChange}
                        disabled={submitting}
                      />
                    </div>
                  </div>
                  </Section>
                  {/* Permanent address */}
                  <Section
                    title="Permanent Address"
                    sub="Permanent residential address of the employee."
                  >
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <div className="flex items-center gap-2 mb-3">
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-[18px]">
                      <div className="md:col-span-1">
                        <label className={labelCls}>
                          Address <Req />
                        </label>
                        <input
                          type="text"
                          name="adminPermanentAddress"
                          placeholder="Enter Building no and street name"
                          maxLength={255}
                          className={inputCls}
                          value={adminData.adminPermanentAddress}
                          onChange={handleChange}
                          disabled={submitting || sameAsCurrent}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>
                          Area <Req />
                        </label>
                        <input
                          type="text"
                          name="adminPermanentArea"
                          placeholder="Enter area"
                          maxLength={50}
                          className={inputCls}
                          value={adminData.adminPermanentArea}
                          onChange={handleChange}
                          disabled={submitting || sameAsCurrent}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>
                          State <Req />
                        </label>
                        <FormDropdown
                          className={inputCls}
                          options={indianStates.map((s) => s.name)}
                          value={adminData.adminPermanentState}
                          onValueChange={(v) =>
                            setAdminData((p) => ({
                              ...p,
                              adminPermanentState: v,
                              adminPermanentDistrict: "",
                            }))
                          }
                          placeholder="Select state"
                          disabled={submitting || sameAsCurrent}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>
                          District <Req />
                        </label>
                        <FormDropdown
                          className={inputCls}
                          options={permanentDistrictOptions}
                          value={adminData.adminPermanentDistrict}
                          onValueChange={(v) =>
                            setAdminData((p) => ({ ...p, adminPermanentDistrict: v }))
                          }
                          placeholder={
                            adminData.adminPermanentState ? "Select district" : "Select state first"
                          }
                          disabled={
                            submitting || sameAsCurrent || !adminData.adminPermanentState
                          }
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
                          name="adminPermanentPincode"
                          placeholder="Enter pincode"
                          maxLength={10}
                          className={inputCls}
                          value={adminData.adminPermanentPincode}
                          onChange={handleChange}
                          disabled={submitting || sameAsCurrent}
                        />
                      </div>
                    </div>
                  </div>
                  </Section>
                </div>

                {/* Emergency contact */}
                <div className="pt-1 border-t border-gray-200">
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
                        value={adminData.adminEmergencyContactName}
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
                        value={adminData.adminEmergencyContactRelation}
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
                        value={adminData.adminEmergencyContactNumber}
                        onChange={handleChange}
                        disabled={submitting}
                      />
                    </div>
                  </div>
                </div>

                {/* Account credentials */}
                <div className="pt-1 border-t border-gray-200">
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
                        value={adminData.adminUsername}
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
                        value={adminData.password}
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
                        value={adminData.confirmPassword}
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
                  {isEditMode ? "Updating Branch…" : "Adding Branch…"}
                </>
              ) : isEditMode ? (
                <>
                  <Check className="w-4 h-4" />
                  Update Branch
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
      

      <ConfirmationDialog
        open={showSubmitConfirm}
        onConfirm={handleConfirmSubmit}
        onCancel={() => setShowSubmitConfirm(false)}
        type={isEditMode ? "warning" : "question"}
        title={isEditMode ? "Update Branch?" : "Add Branch?"}
        description={
          isEditMode
            ? `Are you sure you want to save the changes to branch "${branchData.branchName || branchData.branchCode}"?`
            : "Are you sure you want to create this new branch?"
        }
        confirmText={isEditMode ? "Update" : "Add Branch"}
        cancelText="Cancel"
        loading={submitting}
      />

      <ConfirmationDialog
        open={showResetConfirm}
        type="info"
        title="Reset Form?"
        description={
          isEditMode
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