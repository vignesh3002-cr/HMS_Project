import { useState, useEffect, useRef, ChangeEvent, FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, UserRound, Loader2, Plus, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormDropdown } from "@/components/ui/form-dropdown";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import TimepickerWheel from "@/components/ui/timepicker-wheel";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { State as CSState, City } from "country-state-city";
import type { IState } from "country-state-city";
import { employeeApi, CreateEmployeePayload, UpdateEmployeePayload, WorkingHourDto } from "@/api/employee.api";
import { branchApi, Branch, AssignableUser } from "@/api/branch.api";
import { departmentApi, Department } from "@/api/department.api";

// ─── Types ────────────────────────────────────────────────────────────────────

type BackendRoleType =
  | "DOCTOR"
  | "NURSE"
  | "LAB_TECHNICIAN"
  | "PHARMACIST"
  | "BRANCH_ADMIN"
  | "STAFF";

function toDisplayRole(roleType: BackendRoleType): string {
  if (roleType === "LAB_TECHNICIAN") return "Lab Technician";
  if (roleType === "BRANCH_ADMIN") return "Branch Admin";
  if (roleType === "STAFF") return "Staff";
  return roleType
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function toBackendRole(displayRole: string): BackendRoleType {
  if (displayRole === "Lab Technician") return "LAB_TECHNICIAN";
  if (displayRole === "Branch Admin") return "BRANCH_ADMIN";
  if (displayRole === "Staff") return "STAFF";
  return displayRole.toUpperCase().replace(/ /g, "_") as BackendRoleType;
}

const VALID_BACKEND_ROLES: BackendRoleType[] = [
  "DOCTOR",
  "NURSE",
  "LAB_TECHNICIAN",
  "PHARMACIST",
  "BRANCH_ADMIN",
  "STAFF",
];

const OTHER_DEPARTMENT_VALUE = "__OTHER__";
const ALL_DEPARTMENTS_VALUE = "__ALL__";

const DAYS_OF_WEEK: { value: WorkingHourDto["day_of_week"]; label: string }[] = [
  { value: "MONDAY", label: "Monday" },
  { value: "TUESDAY", label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY", label: "Thursday" },
  { value: "FRIDAY", label: "Friday" },
  { value: "SATURDAY", label: "Saturday" },
  { value: "SUNDAY", label: "Sunday" },
];

const TIME_OPTIONS: { label: string; value: string }[] = (() => {
  const options: { label: string; value: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const period = h < 12 ? "AM" : "PM";
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      options.push({
        label: `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`,
        value,
      });
    }
  }
  return options;
})();

interface ScheduleEntry {
  id: string;
  day_of_week: WorkingHourDto["day_of_week"] | "";
  start_time: string;
  end_time: string;
  branch_id: string;
}

function deriveShiftName(startTime: string): string {
  const hour = Number(startTime.split(":")[0]);
  return hour < 12 ? "Morning" : "Evening";
}

// doctor_schedule.start_time/end_time come back as UTC-anchored time values —
// read with UTC getters (same convention as formatScheduleTime/toTimeInputValue
// in Scheduled.tsx / Edit Appointment.tsx) so the displayed hour doesn't shift
// with the browser's local timezone. A naive string .slice(0, 5) here would
// grab "1970-" off the front of the ISO string instead of the actual time.
function toTimeInputValue(time: string | null | undefined): string {
  if (!time) return "";
  const d = new Date(time);
  if (isNaN(d.getTime())) return "";
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

const NONE_BRANCH_VALUE = "";

// Staff designations that read as "administrative" work rather than manual/
// support work — used only to pick a title for the generic Staff role.
const STAFF_ADMIN_DESIGNATIONS = ["Office Assistant"];

function getEditTitle(roleType: BackendRoleType, designation: string): string {
  switch (roleType) {
    case "DOCTOR":
      return "Edit Doctor";
    case "NURSE":
      return "Edit Nurse";
    case "PHARMACIST":
      return "Edit Pharmacist";
    case "LAB_TECHNICIAN":
      return "Edit Laboratory Technician";
    case "BRANCH_ADMIN":
      return "Edit Branch Admin";
    case "STAFF":
      if (!designation || designation === "Other") return "Edit Staff";
      return STAFF_ADMIN_DESIGNATIONS.includes(designation)
        ? "Edit Staff Admin"
        : "Edit Supporting Staff";
    default:
      return "Edit Employee";
  }
}

interface RoleConfig {
  designations: string[];
  qualifications: string[];
  licenseLabel: string;
  licensePlaceholder: string;
  isMedical: boolean;
  showSchedule: boolean;
}

const ROLE_CONFIG: Record<string, RoleConfig> = {
  Doctor: {
    designations: [
      "Consultant",
      "Senior Consultant",
      "Resident Doctor",
      "Junior Doctor",
      "Chief Medical Officer",
      "Visiting Doctor",
    ],
    qualifications: ["MBBS", "MD", "MS", "DM", "MCh", "BDS", "MDS"],
    licenseLabel: "Doctor license no",
    licensePlaceholder: "Enter doctor license number",
    isMedical: true,
    showSchedule: true,
  },
  Nurse: {
    designations: [
      "Staff Nurse",
      "Head Nurse",
      "Nursing Supervisor",
      "Nursing Superintendent",
      "ICU Nurse",
      "OT Nurse",
    ],
    qualifications: ["ANM", "GNM", "B.Sc Nursing", "Post Basic B.Sc Nursing", "M.Sc Nursing"],
    licenseLabel: "Nurse registration no",
    licensePlaceholder: "Enter nursing council registration number",
    isMedical: true,
    showSchedule: false,
  },
  Pharmacist: {
    designations: [
      "Chief Pharmacist",
      "Senior Pharmacist",
      "Pharmacist",
      "Assistant Pharmacist",
    ],
    qualifications: ["D.Pharm", "B.Pharm", "M.Pharm", "Pharm.D"],
    licenseLabel: "Pharmacist license no",
    licensePlaceholder: "Enter pharmacist license number",
    isMedical: true,
    showSchedule: false,
  },
  "Lab Technician": {
    designations: [
      "Lab Technician",
      "Senior Lab Technician",
      "Lab Supervisor",
      "Lab Manager",
    ],
    qualifications: ["B.Sc MLT", "M.Sc MLT", "DMLT", "PhD"],
    licenseLabel: "Lab license no",
    licensePlaceholder: "Enter lab license number",
    isMedical: true,
    showSchedule: false,
  },
  "Branch Admin": {
    designations: ["Branch Admin"],
    qualifications: [],
    licenseLabel: "License no",
    licensePlaceholder: "",
    isMedical: false,
    showSchedule: false,
  },
  Staff: {
    designations: [
      "Housekeeping",
      "Security",
      "Ward Assistant",
      "Office Assistant",
      "Attender",
      "Driver",
      "Maintenance Staff",
      "Other",
    ],
    qualifications: [],
    licenseLabel: "License no",
    licensePlaceholder: "",
    isMedical: false,
    showSchedule: false,
  },
};

interface EmployeeFormData {
  username: string;
  password: string;
  roleType: BackendRoleType;
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  nationality: string;
  maritalStatus: string;
  mobileNo: string;
  permanentAddress: string;
  currentAddress: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactNumber: string;
  aadhaarNo: string;
  panNo: string;
  passportNo: string;
  currentState: string;
  currentDistrict: string;
  currentArea: string;
  currentPincode: string;
  permanentState: string;
  permanentDistrict: string;
  permanentArea: string;
  permanentPincode: string;
  experience: string;
  departmentId: string;
  designation: string;
  specialization: string;
  qualification: string;
  docLicenseNo: string;
  joiningDate: string;
  branchIds: string[];
  email: string;
  photoUrl: string | null;
}

const emptyFormData: EmployeeFormData = {
  username: "",
  password: "",
  roleType: "DOCTOR",
  firstName: "",
  middleName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
  bloodGroup: "",
  nationality: "",
  maritalStatus: "",
  mobileNo: "",
  permanentAddress: "",
  currentAddress: "",
  emergencyContactName: "",
  emergencyContactRelation: "",
  emergencyContactNumber: "",
  aadhaarNo: "",
  panNo: "",
  passportNo: "",
  currentState: "",
  currentDistrict: "",
  currentArea: "",
  currentPincode: "",
  permanentState: "",
  permanentDistrict: "",
  permanentArea: "",
  permanentPincode: "",
  experience: "",
  departmentId: "",
  designation: "",
  specialization: "",
  qualification: "",
  docLicenseNo: "",
  joiningDate: "",
  branchIds: [],
  email: "",
  photoUrl: null,
};

// ─── Shared style tokens ──────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddEmployee() {
  const navigate = useNavigate();
  const { id: employeeId } = useParams<{ id: string }>();
  const isEditMode = Boolean(employeeId);
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [assignableAdmins, setAssignableAdmins] = useState<AssignableUser[]>([]);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [customDepartment, setCustomDepartment] = useState("");
  const [formData, setFormData] = useState<EmployeeFormData>(emptyFormData);
  const [roleOptions, setRoleOptions] = useState<string[]>(() =>
    VALID_BACKEND_ROLES.map(toDisplayRole),
  );
  const [indianStates, setIndianStates] = useState<IState[]>([]);
  const [currentDistrictOptions, setCurrentDistrictOptions] = useState<string[]>([]);
  const [permanentDistrictOptions, setPermanentDistrictOptions] = useState<string[]>([]);
  const [sameAsCurrent, setSameAsCurrent] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [consultationMinutes, setConsultationMinutes] = useState("20");
  const nextSlotId = useRef(0);
  // Snapshot of the schedule as loaded from the backend in edit mode — lets us
  // skip sending `working_hours` on submit when it's untouched. The backend's
  // update path deletes-and-recreates every doctor_schedule row whenever
  // working_hours is present, which 500s with a foreign key violation for any
  // slot that already has appointment_history booked against it, so we must
  // avoid triggering that path unless the schedule actually changed.
  const initialScheduleRef = useRef<ScheduleEntry[] | null>(null);

  // ── Edit-mode-only state ──────────────────────────────────────────────────
  const [isActive, setIsActive] = useState(true);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [originalBranchId, setOriginalBranchId] = useState<string>(NONE_BRANCH_VALUE);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignTargetBranchName, setReassignTargetBranchName] = useState("");
  const [reassignOccupantName, setReassignOccupantName] = useState("");
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<"save" | "unassign">("save");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [originalFormData, setOriginalFormData] = useState<EmployeeFormData | null>(null);
  const [originalIsActive, setOriginalIsActive] = useState(true);

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  useEffect(() => {
    employeeApi
      .getAll()
      .then((res) => {
        const employees = res.data?.data?.employees || [];
        const apiRoles = [
          ...new Set(
            employees
              .map((e) => e.user_table?.role_type)
              .filter(
                (r): r is BackendRoleType =>
                  !!r && VALID_BACKEND_ROLES.includes(r as BackendRoleType),
              ),
          ),
        ];
        const allRoles = [
          ...new Set([...VALID_BACKEND_ROLES, ...apiRoles].map(toDisplayRole)),
        ];
        setRoleOptions(allRoles);
        const roleParam = searchParams.get("role");
        if (roleParam) {
          const display = toDisplayRole(roleParam as BackendRoleType);
          if (allRoles.includes(display))
            setFormData((p) => ({ ...p, roleType: roleParam as BackendRoleType }));
        }

        setOriginalFormData({
          ...emptyFormData,
          roleType:
            roleParam && allRoles.includes(toDisplayRole(roleParam as BackendRoleType))
              ? (roleParam as BackendRoleType)
              : emptyFormData.roleType,
        });
      })
      .catch(() => {});
  }, [searchParams]);

  useEffect(() => {
    setIndianStates(CSState.getStatesOfCountry("IN"));
  }, []);

  useEffect(() => {
    if (formData.currentState) {
      const s = indianStates.find((s) => s.name === formData.currentState);
      if (s)
        setCurrentDistrictOptions(
          City.getCitiesOfState("IN", s.isoCode)
            .map((c) => c.name)
            .sort(),
        );
    } else {
      setCurrentDistrictOptions([]);
    }
  }, [formData.currentState, indianStates]);

  useEffect(() => {
    if (formData.permanentState) {
      const s = indianStates.find((s) => s.name === formData.permanentState);
      if (s)
        setPermanentDistrictOptions(
          City.getCitiesOfState("IN", s.isoCode)
            .map((c) => c.name)
            .sort(),
        );
    } else {
      setPermanentDistrictOptions([]);
    }
  }, [formData.permanentState, indianStates]);

  useEffect(() => {
    branchApi
      .getAll()
      .then((res) => {
        if (res.data?.data) setBranches(res.data.data);
        else if (Array.isArray(res.data)) setBranches(res.data as unknown as Branch[]);
      })
      .catch(() => {});

    branchApi
      .getAssignableAdmins()
      .then((res) => {
        if (res.data?.success && res.data?.data) setAssignableAdmins(res.data.data);
      })
      .catch(() => {});

    departmentApi
      .getAll()
      .then((res) => {
        if (res.data?.data) setDepartments(res.data.data);
        else if (Array.isArray(res.data))
          setDepartments(res.data as unknown as Department[]);
      })
      .catch(() => {});
  }, []);

  // Edit mode — fetch the employee's full record (role determines which
  // fields actually apply) and prefill everything: personal/contact/address
  // fields for every role, plus schedule/consultation minutes for Doctors.
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
            title: "Employee not found",
            description: "Could not find this employee.",
            variant: "destructive",
          });
          return;
        }

        const roleType = (
          VALID_BACKEND_ROLES.includes(user?.role_type as BackendRoleType)
            ? user!.role_type
            : "DOCTOR"
        ) as BackendRoleType;

        setAdminUserId(employee.user_id ?? user?.user_id ?? null);

        // `branches` includes every mapping this user has ever had — only the
        // active ones (status 1) reflect where they're really assigned today.
        const activeBranchIds =
          (payload?.branches as { branch_id: string; status: number }[] | undefined)
            ?.filter((b) => b.status === 1)
            .map((b) => b.branch_id) ?? [];
        const branchIds = activeBranchIds.length
          ? activeBranchIds
          : employee.branch_id
          ? [employee.branch_id]
          : [];

        const loadedFormData: EmployeeFormData = {
          username: user?.username || "",
          password: "",
          roleType,
          firstName: employee.first_name || "",
          middleName: employee.middle_name || "",
          lastName: employee.last_name || "",
          dateOfBirth: employee.emp_DOB ? String(employee.emp_DOB).slice(0, 10) : "",
          gender: employee.emp_gender || "",
          bloodGroup: employee.blood_group || "",
          nationality: employee.nationality || "",
          maritalStatus: employee.marital_status || "",
          mobileNo: employee.mobile_no || "",
          permanentAddress: employee.parmanent_address || "",
          currentAddress: employee.current_address || "",
          emergencyContactName: employee.emergency_contact_name || "",
          emergencyContactRelation: employee.emergency_contact_relationship || "",
          emergencyContactNumber: employee.emergency_contact_number || "",
          aadhaarNo: employee.aadhaar_no || "",
          panNo: employee.pan_no || "",
          passportNo: employee.passport_no || "",
          currentState: employee.employee_state || "",
          currentDistrict: employee.employee_district || "",
          currentArea: employee.employee_area || "",
          currentPincode: employee.employee_pincode != null ? String(employee.employee_pincode) : "",
          permanentState: employee.permanent_employee_state || "",
          permanentDistrict: employee.permanent_employee_district || "",
          permanentArea: employee.permanent_employee_area || "",
          permanentPincode:
            employee.permanent_employee_pincode != null
              ? String(employee.permanent_employee_pincode)
              : "",
          experience: employee.employee_no_experence != null ? String(employee.employee_no_experence) : "",
          departmentId: employee.department_id || "",
          designation: employee.designation || "",
          specialization: employee.specialization || "",
          qualification: employee.qualification || "",
          docLicenseNo: employee.license_no || "",
          joiningDate: employee.joining_date ? String(employee.joining_date).slice(0, 10) : "",
          branchIds,
          email: employee.email || "",
          photoUrl: employee.employee_photo_URL || employee.photo || null,
        };

        setFormData(loadedFormData);

        setIsActive(employee.emp_status === true || user?.user_status === 0);
        setOriginalIsActive(employee.emp_status === true || user?.user_status === 0);

        // The "Same as current address" state isn't stored as a flag — infer
        // it from the saved values: the checkbox was checked when the saved
        // permanent fields mirror the current ones (permanent pincode is
        // never persisted by the backend, so compare the fields that are).
        const permanentMatchesCurrent =
          !!loadedFormData.currentAddress &&
          (loadedFormData.permanentAddress || "") === (loadedFormData.currentAddress || "") &&
          loadedFormData.permanentState === loadedFormData.currentState &&
          loadedFormData.permanentDistrict === loadedFormData.currentDistrict &&
          loadedFormData.permanentArea === loadedFormData.currentArea;

        setSameAsCurrent(permanentMatchesCurrent);

        // When the checkbox was saved checked, mirror the current structured
        // fields too, otherwise state/district/area/pincode would stay blank
        // (and disabled) while the address line showed correctly.
        const syncedFormData = permanentMatchesCurrent
          ? {
              ...loadedFormData,
              permanentArea: loadedFormData.currentArea,
              permanentState: loadedFormData.currentState,
              permanentDistrict: loadedFormData.currentDistrict,
              permanentPincode: loadedFormData.currentPincode,
            }
          : loadedFormData;

        setFormData(syncedFormData);
        setOriginalFormData(syncedFormData);

        if (roleType === "BRANCH_ADMIN") {
          setOriginalBranchId(branchIds[0] ?? NONE_BRANCH_VALUE);
        }

        if (roleType === "DOCTOR") {
          const dbSchedules: any[] = payload?.doctorSchedules || [];
          if (dbSchedules.length > 0) {
            const loadedSchedule = dbSchedules.map((s: any) => ({
              id: `db-${s.schedule_id}`,
              day_of_week: s.day_of_week || "",
              start_time: toTimeInputValue(s.start_time) || "09:00",
              end_time: toTimeInputValue(s.end_time) || "17:00",
              branch_id: s.branch_id || "",
            }));
            setSchedule(loadedSchedule);
            initialScheduleRef.current = loadedSchedule;
          } else {
            initialScheduleRef.current = [];
          }
          const profile: any = payload?.doctorProfile;
          if (profile?.consultation_minutes) {
            setConsultationMinutes(String(profile.consultation_minutes));
          }
        }
      })
      .catch(() => {
        toast({
          title: "Failed to load employee",
          description: "Couldn't reach the employees API.",
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
  }, [employeeId, toast]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const displayRole = toDisplayRole(formData.roleType);
  const roleConfig = ROLE_CONFIG[displayRole] ?? null;
  const isMedical = roleConfig?.isMedical ?? false;
  const showSchedule = roleConfig?.showSchedule ?? false;
  const emergencyOptional = formData.maritalStatus === "Divorced";
  const todayStr = new Date().toISOString().slice(0, 10);

  const roleHintText = showSchedule
    ? `${displayRole} selected — specialization, qualification, license number and the schedule builder are shown below.`
    : isMedical
    ? `${displayRole} selected — specialization, qualification and license number are shown below.`
    : `${displayRole} selected — designation only, no medical fields required.`;

  const branchOptions = branches.map((b) => {
    const admin = assignableAdmins.find((a) =>
      a.current_branches.includes(b.branch_id),
    );
    const adminLabel = admin
      ? ` - ${admin.full_name} (${admin.employee_id})`
      : b.admin_name
      ? ` - ${b.admin_name}${b.admin_employee_id ? ` (${b.admin_employee_id})` : ""}`
      : "";
    return {
      label: `${b.branch_id}${b.branch_name ? ` - ${b.branch_name}` : ""}${adminLabel}`,
      value: b.branch_id,
    };
  });

  // A Branch Admin can be fully unassigned while editing (mirrors the old
  // EditAdmin.tsx) — not offered on create, where an admin always needs a home.
  const singleBranchOptions =
    isEditMode && formData.roleType === "BRANCH_ADMIN"
      ? [{ label: "None", value: NONE_BRANCH_VALUE }, ...branchOptions]
      : branchOptions;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((p) => {
      const next = { ...p, [name]: value };
      if (sameAsCurrent && name.startsWith("current")) {
        const permKey = "permanent" + name.slice(7) as keyof EmployeeFormData;
        if (permKey in next) (next as any)[permKey] = value;
      }
      return next;
    });
  };

  const handleRoleChange = (val: string) => {
    const newRole = toBackendRole(val) as BackendRoleType;
    setFormData((p) => ({
      ...p,
      roleType: newRole,
      designation: newRole === "BRANCH_ADMIN" ? "Branch Admin" : "",
      specialization: "",
      departmentId: "",
      qualification: "",
      docLicenseNo: "",
      branchIds: newRole === "DOCTOR" ? p.branchIds : p.branchIds.slice(0, 1),
    }));
    if (newRole !== "DOCTOR") {
      setSchedule([]);
      setConsultationMinutes("20");
    }
  };

  const handleSameAsCurrent = (e: ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSameAsCurrent(checked);
    if (checked)
      setFormData((p) => ({
        ...p,
        permanentAddress: p.currentAddress,
        permanentArea: p.currentArea,
        permanentState: p.currentState,
        permanentDistrict: p.currentDistrict,
        permanentPincode: p.currentPincode,
      }));
  };

  const addSlot = () => {
    const id = `slot-${nextSlotId.current++}`;
    setSchedule((p) => [
      ...p,
      { id, day_of_week: "", start_time: "09:00", end_time: "17:00", branch_id: "" },
    ]);
  };

  const removeSlot = (id: string) =>
    setSchedule((p) => p.filter((s) => s.id !== id));

  const updateSlot = (id: string, field: keyof ScheduleEntry, value: string) =>
    setSchedule((p) =>
      p.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    );

  // ── Submit ─────────────────────────────────────────────────────────────────

  // Does the actual create/update call. `branchAction` is only meaningful for
  // a Branch Admin edit whose branch selection changed — assign/unassign runs
  // first so the employee record and the branch mapping never disagree.
  const saveEmployee = async (branchAction?: "assign" | "unassign") => {
    setSubmitting(true);
    try {
      let departmentId = formData.departmentId;

      if (departmentId === ALL_DEPARTMENTS_VALUE) {
        departmentId = departments[0]?.department_id || "";
      } else if (departmentId === OTHER_DEPARTMENT_VALUE) {
        const r = await departmentApi.create({
          department_name: customDepartment.trim(),
        });
        const created = r.data.data;
        departmentId = created.department_id;
        setDepartments((p) => [...p, created]);
      }

      if (!departmentId) {
        toast({
          title: "Missing department",
          description:
            "No department selected. Please create or select a department.",
          variant: "destructive",
        });
        return;
      }

      const workingHours: WorkingHourDto[] = schedule.map((s) => ({
        branch_id: formData.branchIds.includes(s.branch_id)
          ? s.branch_id
          : formData.branchIds[0],
        day_of_week: s.day_of_week as WorkingHourDto["day_of_week"],
        shift_name: deriveShiftName(s.start_time),
        start_time: s.start_time,
        end_time: s.end_time,
      }));

      const scheduleSignature = (entries: ScheduleEntry[]) =>
        entries
          .map((s) => `${s.day_of_week}|${s.start_time}|${s.end_time}|${s.branch_id}`)
          .sort()
          .join(";");
      const scheduleUnchanged =
        isEditMode &&
        initialScheduleRef.current !== null &&
        scheduleSignature(schedule) === scheduleSignature(initialScheduleRef.current);

      const sharedFields = {
        employee_photo_URL: formData.photoUrl || undefined,
        first_name: formData.firstName,
        middle_name: formData.middleName || undefined,
        last_name: formData.lastName,
        dob: formData.dateOfBirth || undefined,
        gender: formData.gender || undefined,
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
        emergency_contact_name: formData.emergencyContactName || undefined,
        emergency_contact_relationship: formData.emergencyContactRelation || undefined,
        emergency_contact_number: formData.emergencyContactNumber || undefined,
        employee_state: formData.currentState || undefined,
        employee_district: formData.currentDistrict || undefined,
        employee_area: formData.currentArea || undefined,
        employee_pincode: formData.currentPincode ? Number(formData.currentPincode) : undefined,
        employee_no_experence: formData.experience
          ? Number(formData.experience)
          : undefined,
        department_id: departmentId,
        designation: formData.designation,
        specialization:
          isMedical
            ? formData.departmentId === OTHER_DEPARTMENT_VALUE
              ? customDepartment.trim() || undefined
              : departments.find((d) => d.department_id === departmentId)?.department_name || undefined
            : undefined,
        qualification: formData.qualification || undefined,
        license_no: formData.docLicenseNo || undefined,
        joining_date: formData.joiningDate,
        consultation_minutes: Number(consultationMinutes) || 20,
        working_hours:
          formData.roleType === "DOCTOR" && !scheduleUnchanged ? workingHours : undefined,
      };

      if (isEditMode && employeeId) {
        if (branchAction === "assign" && adminUserId) {
          await branchApi.assignAdmin(formData.branchIds[0] ?? "", adminUserId);
        } else if (branchAction === "unassign" && adminUserId) {
          await branchApi.unassignAdmin(adminUserId);
        }

        const isSupportingStaff = formData.roleType === "STAFF";

        // Doctors can't have their branch changed through this endpoint — the
        // backend rejects any branch_ids diff for a DOCTOR (branch transfers
        // need to preserve appointment history via a dedicated transfer flow
        // that doesn't exist yet), so omit it entirely rather than sending a
        // value that's guaranteed to 400.
        const response = await employeeApi.update(employeeId, {
          ...sharedFields,
          permanent_employee_state: formData.permanentState || undefined,
          permanent_employee_district: formData.permanentDistrict || undefined,
          permanent_employee_area: formData.permanentArea || undefined,
          permanent_employee_pincode: formData.permanentPincode ? Number(formData.permanentPincode) : undefined,
          ...(isSupportingStaff ? {} : { username: formData.username }),
          password: formData.password.trim() ? formData.password : undefined,
          ...(formData.roleType === "DOCTOR" ? {} : { branch_ids: formData.branchIds }),
          emp_status: isActive,
        } as UpdateEmployeePayload);

        if (!response.data.success) throw new Error(response.data.message);

        setOriginalBranchId(formData.branchIds[0] ?? NONE_BRANCH_VALUE);

        toast({
          title: "Employee updated",
          description: `${formData.firstName} ${formData.lastName} was updated successfully.`,
        });
      } else {
        const isSupportingStaff = formData.roleType === "STAFF";
        const response = await employeeApi.create({
          ...sharedFields,
          username: isSupportingStaff ? `staff_${Date.now()}` : formData.username,
          password: isSupportingStaff ? `Staff@${Date.now()}` : formData.password,
          role_type: formData.roleType,
          permanent_employee_state: formData.permanentState || undefined,
          permanent_employee_district: formData.permanentDistrict || undefined,
          permanent_employee_area: formData.permanentArea || undefined,
          permanent_employee_pincode: formData.permanentPincode ? Number(formData.permanentPincode) : undefined,
          emp_status: true,
          branch_ids: formData.branchIds,
        } as CreateEmployeePayload);

        if (!response.data.success) throw new Error(response.data.message);

        toast({
          title: "Employee added",
          description: `${formData.firstName} ${formData.lastName} was added successfully.`,
        });
      }

      navigate(-1);
    } catch (err: any) {
      toast({
        title: isEditMode ? "Failed to update employee" : "Failed to add employee",
        description:
          err.response?.data?.message ?? err.message ?? "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const isSupportingStaff = formData.roleType === "STAFF";

    const required: { key: keyof EmployeeFormData; label: string }[] = [
      { key: "roleType", label: "Role" },
      { key: "firstName", label: "First Name" },
      { key: "lastName", label: "Last Name" },
      { key: "email", label: "Email" },
      { key: "mobileNo", label: "Mobile Number" },
      { key: "designation", label: "Designation" },
      { key: "joiningDate", label: "Joining Date" },
      ...(isSupportingStaff ? [] : [{ key: "username" as const, label: "Username" }]),
      ...(isEditMode
        ? []
        : [
            { key: "dateOfBirth" as const, label: "Date of Birth" },
            { key: "gender" as const, label: "Gender" },
            ...(isSupportingStaff ? [] : [{ key: "password" as const, label: "Password" }]),
          ]),
    ];

    const missing = required.find((f) => {
      const v = formData[f.key];
      return Array.isArray(v) ? v.length === 0 : !String(v).trim();
    });
    if (missing) {
      toast({
        title: "Missing required field",
        description: `Please fill in "${missing.label}".`,
        variant: "destructive",
      });
      return;
    }

    // A Branch Admin can be edited down to "no branch" (unassigned) — every
    // other case, including creating a Branch Admin, still needs a branch.
    const branchRequired = !(isEditMode && formData.roleType === "BRANCH_ADMIN");
    if (branchRequired && formData.branchIds.length === 0) {
      toast({
        title: "Missing required field",
        description: 'Please select at least one "Branch".',
        variant: "destructive",
      });
      return;
    }

    const changingPassword = !isSupportingStaff && (!isEditMode || formData.password.trim().length > 0);
    if (changingPassword) {
      if (!confirmPassword.trim()) {
        toast({
          title: "Missing required field",
          description: "Please confirm your password.",
          variant: "destructive",
        });
        return;
      }

      if (formData.password !== confirmPassword) {
        toast({
          title: "Password mismatch",
          description: "Password and confirm password do not match.",
          variant: "destructive",
        });
        return;
      }
    }

    if (formData.roleType === "DOCTOR") {
      const bad = schedule.find((s) => !s.day_of_week);
      if (bad) {
        toast({
          title: "Incomplete schedule",
          description: "Please select a day for every schedule time slot.",
          variant: "destructive",
        });
        return;
      }
    }

    if (
      formData.departmentId === OTHER_DEPARTMENT_VALUE &&
      !customDepartment.trim()
    ) {
      toast({
        title: "Missing required field",
        description: `Please type a ${isMedical ? "specialization" : "department"} name for "Others".`,
        variant: "destructive",
      });
      return;
    }

    if (isEditMode && formData.roleType === "BRANCH_ADMIN") {
      const targetBranchId = formData.branchIds[0] ?? NONE_BRANCH_VALUE;
      const branchChanged = targetBranchId !== originalBranchId;

      if (branchChanged) {
        if (!targetBranchId) {
          setPendingAction("unassign");
          setShowSubmitConfirm(true);
          return;
        }

        setSubmitting(true);
        try {
          const branchRes = await branchApi.getById(targetBranchId);
          const occupant = branchRes.data?.data?.current_admin;
          if (occupant && occupant.user_id !== adminUserId) {
            setReassignOccupantName(occupant.full_name || occupant.username || "the current admin");
            setReassignTargetBranchName(
              branches.find((b) => b.branch_id === targetBranchId)?.branch_name || targetBranchId,
            );
            setShowReassignModal(true);
            return;
          }
        } catch (error: any) {
          toast({
            title: "Failed to check branch",
            description: error.response?.data?.message ?? error.message ?? "Something went wrong.",
            variant: "destructive",
          });
          return;
        } finally {
          setSubmitting(false);
        }

        setPendingAction("save");
        setShowSubmitConfirm(true);
        return;
      }
    }

    setPendingAction("save");
    setShowSubmitConfirm(true);
  };

  const handleConfirmSubmit = () => {
    setShowSubmitConfirm(false);
    saveEmployee(pendingAction === "unassign" ? "unassign" : undefined);
  };

  const handleConfirmReassign = async () => {
    setShowReassignModal(false);
    await saveEmployee("assign");
  };

  const handleCancelReassign = () => {
    setShowReassignModal(false);
    setFormData((p) => ({ ...p, branchIds: originalBranchId ? [originalBranchId] : [] }));
  };

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const handleConfirmReset = () => {
    setShowResetConfirm(false);

    if (isEditMode) {
      // Blowing formData back to empty would also wipe the locked Role and
      // any prefilled data with no way back short of reloading.
      window.location.reload();
      return;
    }
    setFormData(emptyFormData);
    setSameAsCurrent(false);
    setSchedule([]);
    setConsultationMinutes("20");
    setConfirmPassword("");
    setCustomDepartment("");
  };

  const isDirty =
    (!!originalFormData && JSON.stringify(formData) !== JSON.stringify(originalFormData)) ||
    isActive !== originalIsActive;

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
          <h4 className="hms-heading text-gray-900 tracking-tight">
            {isEditMode ? getEditTitle(formData.roleType, formData.designation) : "Add Employee"}
          </h4>
        </div>

        {/* ── Body ── */}
        <form onSubmit={handleSubmit} className="px-8 pt-7 pb-8">

          {/* Photo + Role */}
          <div className="flex items-start gap-10 pb-6 border-b border-gray-100 mb-7">
            <AvatarUpload
              value={formData.photoUrl}
              onChange={(url) => setFormData((p) => ({ ...p, photoUrl: url }))}
              label="Employee photo"
              hint="Click or drag an image to upload (Max 1MB)"
              size={96}
            />
            <div className="w-px self-stretch bg-gray-200" aria-hidden />

            {!isEditMode && (
              <div className="w-[36rem] max-w-full">
                <label className={labelCls}>
                  Role <Req />
                </label>
                <FormDropdown
                  name="role"
                  className={inputCls}
                  options={roleOptions}
                  value={displayRole}
                  onValueChange={handleRoleChange}
                  placeholder={roleOptions.length ? "Select role" : "Loading roles…"}
                  disabled={submitting || roleOptions.length === 0}
                />
              </div>
            )}

            {isEditMode && (
                <div className="w-64">
                  <label className={labelCls}>Status <Req /></label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsActive(true)}
                      disabled={submitting}
                      className={`h-10 rounded-xl border-2 text-[13px] font-semibold transition-colors ${
                        isActive
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsActive(false)}
                      disabled={submitting}
                      className={`h-10 rounded-xl border-2 text-[13px] font-semibold transition-colors ${
                        !isActive
                          ? "border-red-400 bg-red-50 text-red-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      Inactive
                    </button>
                  </div>
                </div>
            )}
          </div>

          {/* Role hint banner */}
          <div className="text-[11.5px] text-blue-600 bg-blue-50 rounded-lg px-3.5 py-2.5 mb-6">
            {roleHintText}
          </div>

          {/* ── General information ── */}
          <Section
            title="General information"
            sub="Personal details used to identify the employee."
          >
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
                <label className={labelCls}>Middle name</label>
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
                <label className={labelCls}>Gender <Req /></label>
                <FormDropdown
                  name="gender"
                  className={inputCls}
                  options={["Male", "Female", "Other"]}
                  value={formData.gender}
                  onValueChange={(v) => setFormData((p) => ({ ...p, gender: v }))}
                  placeholder="Select gender"
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Date of birth <Req /></label>
                <input
                  type="date"
                  name="dateOfBirth"
                  max={todayStr}
                  className={inputCls + " text-gray-500"}
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={labelCls}>Age</label>
                <input
                  name="age"
                  placeholder="Auto-calculated"
                  className={inputCls + " bg-gray-50 text-gray-500"}
                  value={
                    formData.dateOfBirth
                      ? Math.floor(
                          (Date.now() - new Date(formData.dateOfBirth).getTime()) /
                            31557600000,
                        ).toString()
                      : ""
                  }
                  disabled
                />
              </div>

              <div>
                <label className={labelCls}>Blood group <Req /></label>
                <FormDropdown
                  name="bloodGroup"
                  className={inputCls}
                  options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]}
                  value={formData.bloodGroup}
                  onValueChange={(v) => setFormData((p) => ({ ...p, bloodGroup: v }))}
                  placeholder="Select blood group"
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Experience (years) <Req /></label>
                <input
                  name="experience"
                  placeholder="Enter experience"
                  maxLength={10}
                  className={inputCls}
                  value={formData.experience}
                  onChange={handleChange}
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
                  name="maritalStatus"
                  className={inputCls}
                  options={["Single", "Married", "Divorced"]}
                  value={formData.maritalStatus}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, maritalStatus: v }))
                  }
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
                <label className={labelCls}>Joining date <Req /></label>
                <input
                  type="date"
                  name="joiningDate"
                  max={todayStr}
                  className={inputCls + " text-gray-500"}
                  value={formData.joiningDate}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
            </div>
          </Section>

          {/* ── Current Address ── */}
          <Section
            title="Current Address"
            sub="Employee's current residential location."
          >
            <div className="grid grid-cols-3 gap-x-5 gap-y-[18px]">
              <div>
                <label className={labelCls}>Address <Req /></label>
                <input
                  name="currentAddress"
                  placeholder="Enter building no and street name"
                  maxLength={255}
                  className={inputCls}
                  value={formData.currentAddress}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Area <Req /></label>
                <input
                  name="currentArea"
                  placeholder="Enter area"
                  maxLength={50}
                  className={inputCls}
                  value={formData.currentArea}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>State <Req /></label>
                <FormDropdown
                  className={inputCls}
                  options={indianStates.map((s) => s.name)}
                  value={formData.currentState}
                  onValueChange={(v) =>
                    setFormData((p) => ({
                      ...p,
                      currentState: v,
                      currentDistrict: "",
                      ...(sameAsCurrent ? { permanentState: v, permanentDistrict: "" } : {}),
                    }))
                  }
                  placeholder="Select state"
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>District <Req /></label>
                <FormDropdown
                  className={inputCls}
                  options={currentDistrictOptions}
                  value={formData.currentDistrict}
                  onValueChange={(v) =>
                    setFormData((p) => ({
                      ...p,
                      currentDistrict: v,
                      ...(sameAsCurrent ? { permanentDistrict: v } : {}),
                    }))
                  }
                  placeholder={formData.currentState ? "Select district" : "Select state first"}
                  disabled={submitting || !formData.currentState}
                />
              </div>
              <div>
                <label className={labelCls}>Pincode <Req /></label>
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  name="currentPincode"
                  placeholder="Enter pincode"
                  maxLength={10}
                  className={inputCls}
                  value={formData.currentPincode}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
            </div>
          </Section>

          {/* ── Permanent Address ── */}
          <Section
            title="Permanent Address"
            sub="Permanent residential address of the employee."
          >
            <div className="grid grid-cols-3 gap-x-5 gap-y-[18px]">
              <div>
                <label className={labelCls}>Address <Req /></label>
                <input
                  name="permanentAddress"
                  placeholder="Enter building no and street name"
                  maxLength={255}
                  className={inputCls}
                  value={formData.permanentAddress}
                  onChange={handleChange}
                  disabled={submitting || sameAsCurrent}
                />
              </div>
              <div>
                <label className={labelCls}>Area <Req /></label>
                <input
                  name="permanentArea"
                  placeholder="Enter area"
                  maxLength={50}
                  className={inputCls}
                  value={formData.permanentArea}
                  onChange={handleChange}
                  disabled={submitting || sameAsCurrent}
                />
              </div>
              <div>
                <label className={labelCls}>State <Req /></label>
                <FormDropdown
                  className={inputCls}
                  options={indianStates.map((s) => s.name)}
                  value={formData.permanentState}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, permanentState: v, permanentDistrict: "" }))
                  }
                  placeholder="Select state"
                  disabled={submitting || sameAsCurrent}
                />
              </div>
              <div>
                <label className={labelCls}>District <Req /></label>
                <FormDropdown
                  className={inputCls}
                  options={permanentDistrictOptions}
                  value={formData.permanentDistrict}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, permanentDistrict: v }))
                  }
                  placeholder={formData.permanentState ? "Select district" : "Select state first"}
                  disabled={submitting || sameAsCurrent || !formData.permanentState}
                />
              </div>
              <div>
                <label className={labelCls}>Pincode <Req /></label>
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  name="permanentPincode"
                  placeholder="Enter pincode"
                  maxLength={10}
                  className={inputCls}
                  value={formData.permanentPincode}
                  onChange={handleChange}
                  disabled={submitting || sameAsCurrent}
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
                <label
                  htmlFor="sameAsCurrent"
                  className="text-[13px] text-gray-700 cursor-pointer select-none"
                >
                  Same as current address
                </label>
              </div>
            </div>
          </Section>

          {/* ── Contact information ── */}
          <Section
            title="Contact information"
            sub="How to reach the employee and in an emergency."
          >
            <div className="grid grid-cols-3 gap-x-5 gap-y-[18px]">
              <div>
                <label className={labelCls}>Mobile number <Req /></label>
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
                <label className={labelCls}>
                  Emergency contact name{" "}
                  {emergencyOptional ? <Opt /> : <Req />}
                </label>
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
                <label className={labelCls}>
                  Emergency contact relation{" "}
                  {emergencyOptional ? <Opt /> : <Req />}
                </label>
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
                <label className={labelCls}>
                  Emergency contact number{" "}
                  {emergencyOptional ? <Opt /> : <Req />}
                </label>
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

          {/* ── Role and designation ── */}
          <Section
            title="Role and designation"
            sub={
              isMedical
                ? `Specialization, qualification and license apply to the ${displayRole} role.`
                : displayRole === "Branch Admin" || displayRole === "Staff"
                ? `Department selection is available for the ${displayRole} role.`
                : `${displayRole} role does not require specialization, qualification or a license number.`
            }
          >
            <div className="grid grid-cols-3 gap-x-5 gap-y-[18px]">
              <div>
                <label className={labelCls}>
                  {displayRole} designation <Req />
                </label>
                <FormDropdown
                  name="designation"
                  className={roleConfig ? inputCls : inputCls}
                  options={roleConfig?.designations ?? []}
                  value={formData.designation}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, designation: v }))
                  }
                  placeholder={roleConfig ? "Select designation" : "Select a role first"}
                  disabled={submitting || !roleConfig}
                />
              </div>

              <AnimatePresence>
                {(isMedical || displayRole === "Branch Admin" || formData.roleType === "STAFF") && (
                  <motion.div
                    key="specialization"
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <label className={labelCls}>
                      {displayRole} {isMedical ? "specialization" : "department"} <Req />
                    </label>
                    <FormDropdown
                      name="departmentId"
                      className={inputCls}
                      options={[
                        ...(displayRole === "Branch Admin" || formData.roleType === "STAFF"
                          ? [{ label: "All Departments", value: ALL_DEPARTMENTS_VALUE }]
                          : []),
                        ...departments.map((d) => ({ label: d.department_name, value: d.department_id })),
                        { label: "Others", value: OTHER_DEPARTMENT_VALUE },
                      ]}
                      value={formData.departmentId}
                      onValueChange={(v) => {
                        setFormData((p) => ({
                          ...p,
                          departmentId: v,
                          specialization:
                            isMedical && v !== OTHER_DEPARTMENT_VALUE
                              ? departments.find((d) => d.department_id === v)?.department_name || ""
                              : "",
                        }));
                        if (v !== OTHER_DEPARTMENT_VALUE) setCustomDepartment("");
                      }}
                      placeholder={departments.length ? `Select ${isMedical ? "specialization" : "department"}` : "Loading…"}
                      disabled={submitting || departments.length === 0}
                    />
                    {formData.departmentId === OTHER_DEPARTMENT_VALUE && (
                      <input
                        type="text"
                        placeholder={`Type your ${isMedical ? "specialization" : "department"}`}
                        maxLength={100}
                        className={inputCls + " mt-2"}
                        value={customDepartment}
                        onChange={(e) => setCustomDepartment(e.target.value)}
                        disabled={submitting}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {isMedical && (
                  <motion.div
                    key="qualification"
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <label className={labelCls}>
                      {displayRole} qualification <Req />
                    </label>
                    <MultiSelectDropdown
                      className={inputCls}
                      options={roleConfig?.qualifications ?? []}
                      value={formData.qualification ? formData.qualification.split(",").filter(Boolean) : []}
                      onValueChange={(vals) =>
                        setFormData((p) => ({ ...p, qualification: vals.join(",") }))
                      }
                      placeholder="Select qualification(s)"
                      disabled={submitting || !roleConfig}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {isMedical && (
                  <motion.div
                    key="license"
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <label className={labelCls}>
                      {roleConfig?.licenseLabel ?? "License no"} <Req />
                    </label>
                    <input
                      name="docLicenseNo"
                      placeholder={roleConfig?.licensePlaceholder ?? ""}
                      maxLength={50}
                      className={inputCls}
                      value={formData.docLicenseNo}
                      onChange={handleChange}
                      disabled={submitting || !roleConfig}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Branch — multi for Doctor, single otherwise */}
              <div className="col-span-2">
                <label className={labelCls}>Branch <Req /></label>
                {formData.roleType === "DOCTOR" ? (
                  <>
                    <MultiSelectDropdown
                      options={branchOptions}
                      value={formData.branchIds}
                      onValueChange={(vals) =>
                        setFormData((p) => ({ ...p, branchIds: vals }))
                      }
                      placeholder={
                        branches.length ? "Select branch(es)" : "No branches available"
                      }
                      disabled={submitting || branches.length === 0 || isEditMode}
                    />
                    {isEditMode && (
                      <p className="text-[11px] text-gray-400 mt-1">
                        A doctor's branch can't be changed from here — it requires a
                        dedicated transfer flow to preserve appointment history, which
                        isn't available yet.
                      </p>
                    )}
                  </>
                ) : (
                  <FormDropdown
                    name="branchId"
                    className={inputCls}
                    options={singleBranchOptions}
                    value={formData.branchIds[0] ?? ""}
                    onValueChange={(v) =>
                      setFormData((p) => ({ ...p, branchIds: v ? [v] : [] }))
                    }
                    placeholder={
                      branches.length ? "Select branch" : "No branches available"
                    }
                    disabled={submitting || branches.length === 0}
                  />
                )}
              </div>
            </div>
          </Section>

          {/* ── Schedule (Doctor only) ── */}
          <AnimatePresence>
            {showSchedule && (
              <motion.div
                key="schedule"
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <Section
                  title="Schedule and time slots"
                  sub="Weekly working hours — shown only for the Doctor role."
                >
                  {/* Consultation minutes */}
                  <div className="mb-5 max-w-[200px]">
                    <label className={labelCls}>
                      Consultation minutes <Req />
                    </label>
                    <input
                      type="number"
                      min={1}
                      className={inputCls}
                      value={consultationMinutes}
                      onChange={(e) => setConsultationMinutes(e.target.value)}
                      disabled={submitting}
                    />
                  </div>

                  {schedule.length === 0 && (
                    <p className="text-[13px] text-gray-400 mb-3">
                      No time slots added yet.
                    </p>
                  )}

                  {/* ── Style 3 slot rows ── */}
                  <div className="space-y-2.5 mb-3">
                    {schedule.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex flex-wrap items-end gap-3 bg-white border border-gray-200 border-l-[4px] border-l-blue-600 rounded-r-[10px] px-4 py-3.5"
                      >
                        {/* Day */}
                        <div className="flex flex-col">
                          <label className="text-[10.5px] font-bold text-blue-600 uppercase tracking-[0.04em] mb-1.5">
                            Day
                          </label>
                          <FormDropdown
                            name={`day-${entry.id}`}
                            className={inputCls + " !h-9 !w-[150px]"}
                            options={DAYS_OF_WEEK}
                            value={entry.day_of_week}
                            onValueChange={(v) => updateSlot(entry.id, "day_of_week", v)}
                            placeholder="Select day"
                            disabled={submitting}
                          />
                        </div>

                        {/* Start time */}
                        <div className="flex flex-col">
                          <label className="text-[10.5px] font-bold text-blue-600 uppercase tracking-[0.04em] mb-1.5">
                            Start time
                          </label>
                          <TimepickerWheel
                            value={entry.start_time}
                            onChange={(v) => updateSlot(entry.id, "start_time", v)}
                            placeholder="Start time"
                            disabled={submitting}
                          />
                        </div>

                        {/* End time */}
                        <div className="flex flex-col">
                          <label className="text-[10.5px] font-bold text-blue-600 uppercase tracking-[0.04em] mb-1.5">
                            End time
                          </label>
                          <TimepickerWheel
                            value={entry.end_time}
                            onChange={(v) => updateSlot(entry.id, "end_time", v)}
                            placeholder="End time"
                            disabled={submitting}
                          />
                        </div>

                        {/* Branch */}
                        <div className="flex flex-col">
                          <label className="text-[10.5px] font-bold text-blue-600 uppercase tracking-[0.04em] mb-1.5">
                            Branch
                          </label>
                          <FormDropdown
                            name={`branch-${entry.id}`}
                            className={inputCls + " !h-9 !w-[200px]"}
                            options={branches
                              .filter((b) => formData.branchIds.includes(b.branch_id))
                              .map((b) => ({
                                label: `${b.branch_id}${b.branch_name ? ` - ${b.branch_name}` : ""}`,
                                value: b.branch_id,
                              }))}
                            value={entry.branch_id}
                            onValueChange={(v) => updateSlot(entry.id, "branch_id", v)}
                            placeholder="Select branch"
                            disabled={submitting || branches.length === 0}
                          />
                        </div>

                        {/* Remove — Style 3 danger tint */}
                        <button
                          type="button"
                          onClick={() => removeSlot(entry.id)}
                          disabled={submitting}
                          className="w-8 h-8 flex items-center justify-center rounded-[6px] border border-red-300 bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                          aria-label="Remove time slot"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addSlot}
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-blue-600 border border-blue-200 rounded-[10px] bg-white hover:bg-blue-50 transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    Add time slot
                  </button>
                </Section>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Account credentials ── */}
          {formData.roleType !== "STAFF" && (
          <Section
            title="Account credentials"
            sub={isEditMode ? "Leave the password fields blank to keep the current password." : "Login details for portal access."}
          >
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
                  {isEditMode ? "New password" : "Password"} {isEditMode ? <Opt /> : <Req />}
                </label>
                <input
                  type="password"
                  name="password"
                  placeholder={isEditMode ? "Leave blank to keep unchanged" : "Enter password"}
                  maxLength={50}
                  className={inputCls}
                  value={formData.password}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>
                  {isEditMode ? "Confirm new password" : "Confirm password"} {isEditMode ? <Opt /> : <Req />}
                </label>
                <input
                  type="password"
                  placeholder={isEditMode ? "Re-enter new password" : "Confirm password"}
                  maxLength={50}
                  className={inputCls}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={submitting}
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
                  {isEditMode ? "Saving…" : "Adding…"}
                </>
              ) : isEditMode ? (
                <>
                  <Check className="w-4 h-4" />
                  Save changes
                </>
              ) : (
                "Add employee"
              )}
            </button>
          </div>
        </form>
      </div>

      <ConfirmationDialog
        open={showReassignModal}
        onConfirm={handleConfirmReassign}
        onCancel={handleCancelReassign}
        type="warning"
        title="Replace this branch's admin?"
        description={
          <>
            {reassignTargetBranchName} is currently assigned to {reassignOccupantName}. Assigning{" "}
            {formData.firstName || "this admin"} will remove {reassignOccupantName} from this branch.
            Do you want to continue?
          </>
        }
        confirmText="Yes, replace"
        cancelText="Cancel"
      />

      <ConfirmationDialog
        open={showSubmitConfirm}
        onConfirm={handleConfirmSubmit}
        onCancel={() => setShowSubmitConfirm(false)}
        type={isEditMode ? "warning" : "question"}
        title={
          pendingAction === "unassign"
            ? "Unassign from branch?"
            : isEditMode
              ? "Save changes?"
              : "Add employee?"
        }
        description={
          pendingAction === "unassign"
            ? `${formData.firstName || "This admin"} will be unassigned from all branches. Are you sure?`
            : isEditMode
              ? `Are you sure you want to save the changes to ${formData.firstName} ${formData.lastName}?`
              : "Are you sure you want to add this new employee?"
        }
        confirmText={
          pendingAction === "unassign" ? "Unassign" : isEditMode ? "Save changes" : "Add employee"
        }
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