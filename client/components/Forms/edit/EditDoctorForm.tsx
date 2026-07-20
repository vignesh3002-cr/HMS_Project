import { useEffect, useState, useRef, ChangeEvent, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, Stethoscope, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormDropdown } from "@/components/ui/form-dropdown";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { branchApi, Branch } from "@/api/branch.api";
import { departmentApi, Department } from "@/api/department.api";
import { DayOfWeek, WorkingHourPayload, employeeApi } from "@/api/employee.api";
import ProfilePreview from "@/components/ui/Patient-preview";

// Doctor-only field presets — same values as the Doctor role in Addemployee.tsx.
const DOCTOR_DESIGNATIONS = [
  "Consultant",
  "Senior Consultant",
  "Resident Doctor",
  "Junior Doctor",
  "Chief Medical Officer",
  "Visiting Doctor",
];
const DOCTOR_SPECIALIZATIONS = [
  "Cardiology",
  "Neurology",
  "Orthopedics",
  "Pediatrics",
  "General Medicine",
  "Dermatology",
  "ENT",
  "Gynecology",
  "Psychiatry",
  "Radiology",
  "Anesthesiology",
  "Surgery",
];
const DOCTOR_QUALIFICATIONS = ["MBBS", "MD", "MS", "DM", "MCh", "BDS", "MDS"];

// Sentinel departmentId value meaning "not in the list — user is typing a new one".
const OTHER_DEPARTMENT_VALUE = "__OTHER__";

// ---------------------------------------------------------------------------
// Doctor schedule — same shape as the Doctor role in Addemployee.tsx. Only
// Doctor (and other medical roles there) get multi-branch + schedule; this
// page is Doctor-only, so both always apply here.
// ---------------------------------------------------------------------------
const DAYS_OF_WEEK: { value: DayOfWeek; label: string }[] = [
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
      options.push({ label: `${hour12}:${String(m).padStart(2, "0")} ${period}`, value });
    }
  }
  return options;
})();

interface ScheduleEntry {
  id: string;
  day_of_week: DayOfWeek | "";
  start_time: string;
  end_time: string;
  branch_id: string;
}

function deriveShiftName(startTime: string): string {
  const hour = Number(startTime.split(":")[0]);
  return hour < 12 ? "Morning" : "Evening";
}

// Field names mirror the `employees` table columns so every input here has a
// real column to be saved into (username/password are excluded — they live on
// `user_table` and aren't editable from here).
interface EditDoctorFormData {
  firstName: string;
  middleName: string;
  lastName: string;
  bloodGroup: string;
  nationality: string;
  maritalStatus: string;
  mobileNo: string;
  email: string;
  aadhaarNo: string;
  panNo: string;
  passportNo: string;
  currentAddress: string;
  permanentAddress: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactNumber: string;
  departmentId: string;
  designation: string;
  specialization: string;
  qualification: string;
  docLicenseNo: string;
  joiningDate: string;
  branchIds: string[];
  status: "Active" | "Inactive" | "";
}

const emptyFormData: EditDoctorFormData = {
  firstName: "",
  middleName: "",
  lastName: "",
  bloodGroup: "",
  nationality: "",
  maritalStatus: "",
  mobileNo: "",
  email: "",
  aadhaarNo: "",
  panNo: "",
  passportNo: "",
  currentAddress: "",
  permanentAddress: "",
  emergencyContactName: "",
  emergencyContactRelation: "",
  emergencyContactNumber: "",
  departmentId: "",
  designation: "",
  specialization: "",
  qualification: "",
  docLicenseNo: "",
  joiningDate: "",
  branchIds: [],
  status: "",
};

const inputClass =
  "w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed";
const labelClass = "block text-sm font-semibold text-gray-800 mb-1.5";
const sectionClass = "border border-gray-100 rounded-xl p-6 bg-gray-50/40";
const sectionTitleClass = "text-xs font-bold text-[#00488D] uppercase tracking-wide mb-5";
const requiredStar = <span className="text-red-600 ml-0.5">*</span>;
const optionalTag = <span className="text-gray-400 text-xs font-normal">(optional)</span>;

export default function EditDoctorForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const [formData, setFormData] = useState<EditDoctorFormData>(emptyFormData);
  const [sameAsCurrent, setSameAsCurrent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [customDepartment, setCustomDepartment] = useState("");

  // Schedule / time slots — same model as Addemployee.tsx's Doctor role. There's
  // no read endpoint for existing doctor_schedule rows yet, so this starts empty;
  // any slots added here are for new/updated hours going forward.
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [consultationMinutes, setConsultationMinutes] = useState("20");
  const nextSlotId = useRef(0);

  const addScheduleEntry = () => {
    const slotId = `slot-${nextSlotId.current++}`;
    setSchedule((prev) => [
      ...prev,
      { id: slotId, day_of_week: "", start_time: "09:00", end_time: "17:00", branch_id: "" },
    ]);
  };

  const removeScheduleEntry = (slotId: string) => {
    setSchedule((prev) => prev.filter((entry) => entry.id !== slotId));
  };

  const updateScheduleEntry = (slotId: string, field: keyof ScheduleEntry, value: string) => {
    setSchedule((prev) =>
      prev.map((entry) => (entry.id === slotId ? { ...entry, [field]: value } : entry)),
    );
  };

  const emergencyOptional = formData.maritalStatus === "Divorced";

  const setField = (key: Exclude<keyof EditDoctorFormData, "status">, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    key: Exclude<keyof EditDoctorFormData, "status">,
  ) => {
    const value = e.target.value;
    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "currentAddress" && sameAsCurrent) {
        next.permanentAddress = value;
      }
      return next;
    });
  };

  const handleSameAsCurrentToggle = (e: ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSameAsCurrent(checked);
    if (checked) {
      setFormData((prev) => ({ ...prev, permanentAddress: prev.currentAddress }));
    }
  };

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
    departmentApi
      .getAll()
      .then((res) => {
        if (res.data?.data) setDepartments(res.data.data);
        else if (Array.isArray(res.data)) setDepartments(res.data as unknown as Department[]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    employeeApi
      .getAll({ limit: 1000 })
      .then((res) => {
        const employees = res.data?.data?.employees || [];
        const found = employees.find(
          (e) => e.employee_id === id && e.user_table?.role_type === "DOCTOR",
        );

        if (!found) {
          toast({
            title: "Doctor not found",
            description: "Couldn't find this doctor's record.",
            variant: "destructive",
          });
          return;
        }

        setFormData({
          firstName: found.first_name || "",
          middleName: found.middle_name || "",
          lastName: found.last_name || "",
          bloodGroup: found.blood_group || "",
          nationality: found.nationality || "",
          maritalStatus: found.marital_status || "",
          mobileNo: found.mobile_no || "",
          email: found.email || "",
          aadhaarNo: found.aadhaar_no || "",
          panNo: found.pan_no || "",
          passportNo: found.passport_no || "",
          currentAddress: found.current_address || "",
          permanentAddress: found.parmanant_address || "",
          emergencyContactName: found.emergency_contact_name || "",
          emergencyContactRelation: found.emergency_contact_relationship || "",
          emergencyContactNumber: found.emergency_contact_number || "",
          departmentId: found.department_id || "",
          designation: found.designation || "",
          specialization: found.specialization || "",
          qualification: found.qualification || "",
          docLicenseNo: found.doc_license_no || "",
          joiningDate: found.joining_date ? String(found.joining_date).slice(0, 10) : "",
          branchIds: found.branch_id ? [found.branch_id] : [],
          status: found.emp_status === false ? "Inactive" : "Active",
        });
        if (found.current_address && found.current_address === found.parmanant_address) {
          setSameAsCurrent(true);
        }
      })
      .catch(() => {
        toast({
          title: "Failed to load doctor",
          description: "Couldn't reach the employees API.",
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id) return;

    const requiredFields: { key: Exclude<keyof EditDoctorFormData, "branchIds">; label: string }[] = [
      { key: "firstName", label: "First Name" },
      { key: "lastName", label: "Last Name" },
      { key: "bloodGroup", label: "Blood Group" },
      { key: "nationality", label: "Nationality" },
      { key: "maritalStatus", label: "Marital Status" },
      { key: "mobileNo", label: "Mobile Number" },
      { key: "email", label: "Email" },
      { key: "aadhaarNo", label: "Aadhaar No" },
      { key: "panNo", label: "PAN No" },
      { key: "departmentId", label: "Department" },
      { key: "designation", label: "Designation" },
      { key: "specialization", label: "Specialization" },
      { key: "qualification", label: "Qualification" },
      { key: "docLicenseNo", label: "License No" },
      { key: "joiningDate", label: "Joining Date" },
      { key: "status", label: "Status" },
      { key: "currentAddress", label: "Current Address" },
      { key: "permanentAddress", label: "Permanent Address" },
      ...(emergencyOptional
        ? []
        : [
            { key: "emergencyContactName" as const, label: "Emergency Contact Name" },
            { key: "emergencyContactRelation" as const, label: "Emergency Contact Relation" },
            { key: "emergencyContactNumber" as const, label: "Emergency Contact Number" },
          ]),
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

    if (formData.branchIds.length === 0) {
      toast({
        title: "Missing required field",
        description: 'Please select at least one "Branch".',
        variant: "destructive",
      });
      return;
    }

    if (formData.departmentId === OTHER_DEPARTMENT_VALUE && !customDepartment.trim()) {
      toast({
        title: "Missing required field",
        description: 'Please type a department name for "Others".',
        variant: "destructive",
      });
      return;
    }

    const incompleteSlot = schedule.find((entry) => !entry.day_of_week);
    if (incompleteSlot) {
      toast({
        title: "Incomplete schedule",
        description: "Please select a day for every schedule time slot.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      let departmentId = formData.departmentId;
      if (departmentId === OTHER_DEPARTMENT_VALUE) {
        const deptResponse = await departmentApi.create({ department_name: customDepartment.trim() });
        const created = deptResponse.data.data;
        departmentId = created.department_id;
        setDepartments((prev) => [...prev, created]);
      }

      const workingHours: WorkingHourPayload[] = schedule.map((entry) => ({
        branch_id: formData.branchIds.includes(entry.branch_id)
          ? entry.branch_id
          : formData.branchIds[0],
        day_of_week: entry.day_of_week as DayOfWeek,
        shift_name: deriveShiftName(entry.start_time),
        start_time: entry.start_time,
        end_time: entry.end_time,
      }));

      const response = await employeeApi.update(id, {
        first_name: formData.firstName,
        middle_name: formData.middleName || undefined,
        last_name: formData.lastName,
        email: formData.email,
        mobile_no: formData.mobileNo,
        blood_group: formData.bloodGroup,
        nationality: formData.nationality,
        marital_status: formData.maritalStatus,
        aadhaar_no: formData.aadhaarNo,
        pan_no: formData.panNo,
        passport_no: formData.passportNo || undefined,
        current_address: formData.currentAddress,
        permanent_address: formData.permanentAddress,
        emergency_contact_name: formData.emergencyContactName || undefined,
        emergency_contact_relationship: formData.emergencyContactRelation || undefined,
        emergency_contact_number: formData.emergencyContactNumber || undefined,
        department_id: departmentId,
        designation: formData.designation,
        specialization: formData.specialization || undefined,
        qualification: formData.qualification || undefined,
        doc_license_no: formData.docLicenseNo || undefined,
        joining_date: formData.joiningDate,
        emp_status: formData.status === "Active",
        branch_ids: formData.branchIds,
        consultation_minutes: Number(consultationMinutes) || 20,
        working_hours: workingHours,
      });

      if (!response.data.success) {
        throw new Error(response.data.message);
      }

      toast({
        title: "Doctor updated",
        description: `${formData.firstName} ${formData.lastName} was updated successfully.`,
      });

      navigate(-1);
    } catch (error: any) {
      toast({
        title: "Failed to update doctor",
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
    setCustomDepartment("");
    setSchedule([]);
    setConsultationMinutes("20");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9FB] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#00488D]" />
      </div>
    );
  }

  const departmentName =
    departments.find((d) => d.department_id === formData.departmentId)?.department_name || "";
  const branchLabels = branches
    .filter((b) => formData.branchIds.includes(b.branch_id))
    .map((b) => `${b.branch_id}${b.branch_name ? ` - ${b.branch_name}` : ""}`)
    .join(", ");

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
                  <Stethoscope className="w-5 h-5 text-blue-600" />
                </div>
                <h4 className="hms-heading text-gray-900 tracking-tight">Edit Doctor</h4>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className={sectionClass}>
                  <h3 className={sectionTitleClass}>Personal details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                    <div>
                      <label className={labelClass}>First name {requiredStar}</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={formData.firstName}
                        onChange={(e) => handleChange(e, "firstName")}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Middle name</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={formData.middleName}
                        onChange={(e) => handleChange(e, "middleName")}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Last name {requiredStar}</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={formData.lastName}
                        onChange={(e) => handleChange(e, "lastName")}
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Blood group {requiredStar}</label>
                      <FormDropdown
                        options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]}
                        value={formData.bloodGroup}
                        onValueChange={(val) => setField("bloodGroup", val)}
                        placeholder="Select"
                        className={inputClass}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Nationality {requiredStar}</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={formData.nationality}
                        onChange={(e) => handleChange(e, "nationality")}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Marital status {requiredStar}</label>
                      <FormDropdown
                        options={["Single", "Married", "Divorced"]}
                        value={formData.maritalStatus}
                        onValueChange={(val) => setField("maritalStatus", val)}
                        placeholder="Select"
                        className={inputClass}
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Status {requiredStar}</label>
                      <FormDropdown
                        options={["Active", "Inactive"]}
                        value={formData.status}
                        onValueChange={(val) =>
                          setFormData((prev) => ({ ...prev, status: val as "Active" | "Inactive" }))
                        }
                        placeholder="Select"
                        className={inputClass}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Aadhaar No {requiredStar}</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={formData.aadhaarNo}
                        onChange={(e) => handleChange(e, "aadhaarNo")}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>PAN No {requiredStar}</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={formData.panNo}
                        onChange={(e) => handleChange(e, "panNo")}
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Passport No</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={formData.passportNo}
                        onChange={(e) => handleChange(e, "passportNo")}
                        disabled={submitting}
                      />
                    </div>
                  </div>
                </div>

                <div className={sectionClass}>
                  <h3 className={sectionTitleClass}>Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                    <div>
                      <label className={labelClass}>Mobile number {requiredStar}</label>
                      <input
                        type="tel"
                        className={inputClass}
                        value={formData.mobileNo}
                        onChange={(e) => handleChange(e, "mobileNo")}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Email {requiredStar}</label>
                      <input
                        type="email"
                        className={inputClass}
                        value={formData.email}
                        onChange={(e) => handleChange(e, "email")}
                        disabled={submitting}
                      />
                    </div>
                    <div />

                    <div>
                      <label className={labelClass}>
                        Emergency contact name {emergencyOptional ? optionalTag : requiredStar}
                      </label>
                      <input
                        type="text"
                        className={inputClass}
                        value={formData.emergencyContactName}
                        onChange={(e) => handleChange(e, "emergencyContactName")}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        Emergency contact relation {emergencyOptional ? optionalTag : requiredStar}
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Spouse, Parent"
                        className={inputClass}
                        value={formData.emergencyContactRelation}
                        onChange={(e) => handleChange(e, "emergencyContactRelation")}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        Emergency contact number {emergencyOptional ? optionalTag : requiredStar}
                      </label>
                      <input
                        type="tel"
                        className={inputClass}
                        value={formData.emergencyContactNumber}
                        onChange={(e) => handleChange(e, "emergencyContactNumber")}
                        disabled={submitting}
                      />
                    </div>

                    <div className="lg:col-span-3">
                      <label className={labelClass}>Current address {requiredStar}</label>
                      <input
                        type="text"
                        maxLength={255}
                        className={inputClass}
                        value={formData.currentAddress}
                        onChange={(e) => handleChange(e, "currentAddress")}
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
                      <label className={labelClass}>Permanent address {requiredStar}</label>
                      <input
                        type="text"
                        maxLength={255}
                        className={
                          sameAsCurrent
                            ? inputClass.replace("bg-white", "bg-gray-50").replace("text-gray-900", "text-gray-500")
                            : inputClass
                        }
                        value={formData.permanentAddress}
                        onChange={(e) => handleChange(e, "permanentAddress")}
                        disabled={submitting || sameAsCurrent}
                      />
                    </div>
                  </div>
                </div>

                <div className={sectionClass}>
                  <h3 className={sectionTitleClass}>Professional details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                    <div>
                      <label className={labelClass}>Department {requiredStar}</label>
                      <FormDropdown
                        options={[
                          ...departments.map((d) => ({
                            label: d.department_name,
                            value: d.department_id,
                          })),
                          { label: "Others", value: OTHER_DEPARTMENT_VALUE },
                        ]}
                        value={formData.departmentId}
                        onValueChange={(val) => {
                          setField("departmentId", val);
                          if (val !== OTHER_DEPARTMENT_VALUE) setCustomDepartment("");
                        }}
                        placeholder={departments.length ? "Select department" : "Loading departments..."}
                        className={inputClass}
                        disabled={submitting}
                      />
                      {formData.departmentId === OTHER_DEPARTMENT_VALUE && (
                        <input
                          type="text"
                          placeholder="Type your department name"
                          maxLength={100}
                          className={inputClass + " mt-2"}
                          value={customDepartment}
                          onChange={(e) => setCustomDepartment(e.target.value)}
                          disabled={submitting}
                        />
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>Designation {requiredStar}</label>
                      <FormDropdown
                        options={DOCTOR_DESIGNATIONS}
                        value={formData.designation}
                        onValueChange={(val) => setField("designation", val)}
                        placeholder="Select designation"
                        className={inputClass}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Specialization {requiredStar}</label>
                      <FormDropdown
                        options={DOCTOR_SPECIALIZATIONS}
                        value={formData.specialization}
                        onValueChange={(val) => setField("specialization", val)}
                        placeholder="Select specialization"
                        className={inputClass}
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Qualification {requiredStar}</label>
                      <FormDropdown
                        options={DOCTOR_QUALIFICATIONS}
                        value={formData.qualification}
                        onValueChange={(val) => setField("qualification", val)}
                        placeholder="Select qualification"
                        className={inputClass}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Doctor License No {requiredStar}</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={formData.docLicenseNo}
                        onChange={(e) => handleChange(e, "docLicenseNo")}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Joining date {requiredStar}</label>
                      <input
                        type="date"
                        className={inputClass + " text-gray-500"}
                        value={formData.joiningDate}
                        onChange={(e) => handleChange(e, "joiningDate")}
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Branch(es) {requiredStar}</label>
                      <MultiSelectDropdown
                        options={branches.map((b) => ({
                          label: `${b.branch_id}${b.branch_name ? ` - ${b.branch_name}` : ""}`,
                          value: b.branch_id,
                        }))}
                        value={formData.branchIds}
                        onValueChange={(vals) =>
                          setFormData((prev) => ({ ...prev, branchIds: vals }))
                        }
                        placeholder={branches.length ? "Select branch(es)" : "No branches available"}
                        className={inputClass}
                        disabled={submitting || branches.length === 0}
                      />
                    </div>

                    {/* Schedule / time slots — same model as Addemployee.tsx's Doctor role. */}
                    <div className="lg:col-span-3">
                      <label className={labelClass}>Schedule / Time Slots</label>

                      <div className="mb-4 max-w-xs">
                        <label className={labelClass}>Consultation Minutes {requiredStar}</label>
                        <input
                          type="number"
                          min={1}
                          className={inputClass}
                          value={consultationMinutes}
                          onChange={(e) => setConsultationMinutes(e.target.value)}
                          disabled={submitting}
                        />
                      </div>

                      {schedule.length === 0 && (
                        <p className="text-sm text-gray-400 mb-3">No time slots added yet.</p>
                      )}

                      <div className="space-y-3">
                        {schedule.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 p-3"
                          >
                            <div className="w-40">
                              <label className="block text-xs font-semibold text-gray-600 mb-1">
                                Day
                              </label>
                              <FormDropdown
                                className={inputClass}
                                options={DAYS_OF_WEEK}
                                value={entry.day_of_week}
                                onValueChange={(val) =>
                                  updateScheduleEntry(entry.id, "day_of_week", val)
                                }
                                placeholder="Select Day"
                                disabled={submitting}
                              />
                            </div>
                            <div className="w-36">
                              <label className="block text-xs font-semibold text-gray-600 mb-1">
                                Start Time
                              </label>
                              <FormDropdown
                                className={inputClass}
                                options={TIME_OPTIONS}
                                value={entry.start_time}
                                onValueChange={(val) =>
                                  updateScheduleEntry(entry.id, "start_time", val)
                                }
                                placeholder="Start Time"
                                disabled={submitting}
                              />
                            </div>
                            <div className="w-36">
                              <label className="block text-xs font-semibold text-gray-600 mb-1">
                                End Time
                              </label>
                              <FormDropdown
                                className={inputClass}
                                options={TIME_OPTIONS}
                                value={entry.end_time}
                                onValueChange={(val) =>
                                  updateScheduleEntry(entry.id, "end_time", val)
                                }
                                placeholder="End Time"
                                disabled={submitting}
                              />
                            </div>
                            <div className="w-56">
                              <label className="block text-xs font-semibold text-gray-600 mb-1">
                                Branch
                              </label>
                              <FormDropdown
                                className={inputClass}
                                options={branches
                                  .filter((b) => formData.branchIds.includes(b.branch_id))
                                  .map((b) => ({
                                    label: `${b.branch_id}${b.branch_name ? ` - ${b.branch_name}` : ""}`,
                                    value: b.branch_id,
                                  }))}
                                value={entry.branch_id}
                                onValueChange={(val) =>
                                  updateScheduleEntry(entry.id, "branch_id", val)
                                }
                                placeholder="Select Branch"
                                disabled={submitting || branches.length === 0}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeScheduleEntry(entry.id)}
                              disabled={submitting}
                              className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50"
                              aria-label="Remove time slot"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={addScheduleEntry}
                        disabled={submitting}
                        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" /> Add Time Slot
                      </button>
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
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    Update Doctor
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="sticky top-6 h-[calc(100vh-2rem)]">
              <ProfilePreview
                name={[formData.firstName, formData.lastName].filter(Boolean).join(" ")}
                emptyNameFallback="Doctor profile"
                chips={[formData.designation, formData.specialization]}
                details={[
                  { label: "Department", value: departmentName },
                  { label: "Blood group", value: formData.bloodGroup },
                  { label: "License No", value: formData.docLicenseNo },
                  { label: "Mobile", value: formData.mobileNo },
                  { label: "Email", value: formData.email },
                  { label: "Branch(es)", value: branchLabels },
                  { label: "Status", value: formData.status },
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
