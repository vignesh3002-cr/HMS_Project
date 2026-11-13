import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  X,
  CheckCircle2,
  CalendarClock,
  Bed,
  LogOut,
  CalendarCheck,
  UserPlus,
  Clock,
  Building,
  AlertTriangle,
} from "lucide-react";

// Input Components
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/ui/phone-input";
import VoiceToText from "@/components/ui/voicetotext";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import TimepickerWheel from "@/components/ui/timepicker-wheel";
import { ComboInput } from "@/pages/doctor/patient-details/ComboInput";
import DateInputField from "@/pages/doctor/consultation/DateInputField";

// Dropdown Components
import { FormDropdown } from "@/components/ui/form-dropdown";
import { Dropdown } from "@/components/ui/dropdown";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SingleSelectDropdown } from "@/components/ui/single-select-dropdown";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { FormProtocolDropdown } from "@/components/ui/form-protocol-dropdown";
import { FormProtocolMultiSelect } from "@/components/ui/form-protocol-multiselect";
import { UserProfileDropdown } from "@/components/ui/User_profile_dropdown";
import { BranchSelector } from "@/components/hms/BranchSelector";

// Radix Dialog / Alert Dialog primitives for flow views
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// Popup/Modal Components (All canonical sources)
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { AddWardDialog } from "@/components/hms/AddWardDialog";
import { AddBedDialog } from "@/components/hms/AddBedDialog";
import { PatientConflictWarningDialog } from "@/components/hms/PatientConflictWarningDialog";
import { AdmitBedDialog } from "@/components/hms/AdmitBedDialog";
import { AssignDoctorDialog } from "@/components/hms/AssignDoctorDialog";
import { AllocateCareTeamDialog } from "@/components/hms/AllocateCareTeamDialog";
import { WardShiftAllocationDialog } from "@/components/hms/WardShiftAllocationDialog";
import { BranchShiftConfigDialog } from "@/components/hms/BranchShiftConfigDialog";
import AffectedAppointmentsDialog from "@/components/hms/AffectedAppointmentsDialog";
import { SandwichQueueModal, type QueuePatientItem } from "@/components/hms/SandwichQueueModal";
import ScheduleSlotModal, { type ScheduleSlotModalHandle } from "@/components/hms/ScheduleSlotModal";
import VitalsSignsPopover from "@/components/hms/VitalsSignsPopover";
import { DoseCalculationModal } from "@/components/chemo/DoseCalculationModal";
import { PharmacySlipModal } from "@/pages/doctor/consultation/PharmacySlipModal";
import AdverseEventModal from "@/pages/doctor/patient-details/AdverseEventModal";
import OrderViewModal from "@/pages/doctor/patient-details/OrderViewModal";
import ProtocolViewModal from "@/pages/doctor/patient-details/ProtocolViewModal";
import { ModalShell } from "@/pages/doctor/patient-details/ModalShell";
import type { AdmissionRecord } from "@/api/ipd.api";

interface ComponentCardProps {
  name: string;
  path: string;
  modules: ("Admin" | "Doctor" | "Lab")[];
  children: React.ReactNode;
  // Optional popup props
  popup?: boolean;
  popupTitle?: string;
  onOpen?: () => void;
}

function ComponentCard({ name, path, modules, children, popup = false, popupTitle = "Popup Demo", onOpen }: ComponentCardProps) {
  const badgeColor = (m: string) => {
    if (m === "Admin") return "bg-blue-100 text-blue-800 border-blue-200";
    if (m === "Doctor") return "bg-emerald-100 text-emerald-800 border-emerald-200";
    return "bg-purple-100 text-purple-800 border-purple-200";
  };

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-1 border-b border-slate-100 pb-2">
        <div className="min-w-0">
          <span className="text-xs font-bold text-slate-800">{name}</span>
          <span className="ml-2 block text-[10px] font-mono text-slate-400 truncate">{path}</span>
        </div>
        <div className="flex items-center gap-1">
          {modules.map((m) => (
            <span key={m} className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold ${badgeColor(m)}`}>
              {m}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-1">
        {popup ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={onOpen}
              className="w-full text-left rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {popupTitle}
            </button>
            <div className="mt-2 text-xs text-slate-500">
              {children as React.ReactNode}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {children}
            <span className="text-xs text-slate-500">(Click to interact)</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ComponentShowcase() {
  const navigate = useNavigate();

  // Input states
  const [standardText, setStandardText] = useState("");
  const [textareaVal, setTextareaVal] = useState("");
  const [phoneVal, setPhoneVal] = useState("");
  const [otpVal, setOtpVal] = useState("");
  const [voiceVal, setVoiceVal] = useState("");
  const [dateVal, setDateVal] = useState("26-10-2026");
  const [wheelTime, setWheelTime] = useState("09:30 AM");
  const [comboVal, setComboVal] = useState("");
  const [searchVal, setSearchVal] = useState("");

  // Dropdown states
  const [formDropdownVal, setFormDropdownVal] = useState("");
  const [modalDropdownVal, setModalDropdownVal] = useState("");
  const [radixSelectVal, setRadixSelectVal] = useState("");
  const [singleSelectVal, setSingleSelectVal] = useState("");
  const [multiSelectVal, setMultiSelectVal] = useState<string[]>(["City Central Branch"]);
  const [protocolDropdownVal, setProtocolDropdownVal] = useState("");
  const [protocolMultiVal, setProtocolMultiVal] = useState<string[]>([]);
  const [nativeSelectVal, setNativeSelectVal] = useState("ROUTINE");

  // Core confirmations
  const [confirmDangerOpen, setConfirmDangerOpen] = useState(false);
  const [confirmQuestionOpen, setConfirmQuestionOpen] = useState(false);
  const [confirmWarningOpen, setConfirmWarningOpen] = useState(false);
  const [confirmInfoOpen, setConfirmInfoOpen] = useState(false);

  // Success-Flow Popups
  const [appointmentBookedSuccessOpen, setAppointmentBookedSuccessOpen] = useState(false);
  const [admissionCreatedSuccessOpen, setAdmissionCreatedSuccessOpen] = useState(false);
  const [slotAssignedSuccessOpen, setSlotAssignedSuccessOpen] = useState(false);
  const [transferDetailsOpen, setTransferDetailsOpen] = useState(false);
  const [leaveSuccessOpen, setLeaveSuccessOpen] = useState(false);

  // Admin & IPD Bed Management states
  const [wardOpen, setWardOpen] = useState(false);
  const [bedOpen, setBedOpen] = useState(false);
  const [admitBedOpen, setAdmitBedOpen] = useState(false);
  const [transferBedOpen, setTransferBedOpen] = useState(false);
  const [dischargePatientOpen, setDischargePatientOpen] = useState(false);
  const [releaseBedOpen, setReleaseBedOpen] = useState(false);
  const [assignDoctorOpen, setAssignDoctorOpen] = useState(false);
  const [careTeamOpen, setCareTeamOpen] = useState(false);
  const [wardShiftOpen, setWardShiftOpen] = useState(false);
  const [branchShiftOpen, setBranchShiftOpen] = useState(false);
  const [dutyRosterStaffOpen, setDutyRosterStaffOpen] = useState(false);

  // OPD & Scheduling states
  const [patientConflictOpen, setPatientConflictOpen] = useState(false);
  const [sandwichQueueOpen, setSandwichQueueOpen] = useState(false);
  const [affectedAppointmentsOpen, setAffectedAppointmentsOpen] = useState(false);
  const [vitalsPopoverOpen, setVitalsPopoverOpen] = useState(false);

  // Clinical & Oncology states
  const [doseCalcOpen, setDoseCalcOpen] = useState(false);
  const [pharmacySlipOpen, setPharmacySlipOpen] = useState(false);
  const [adverseEventOpen, setAdverseEventOpen] = useState(false);
  const [orderViewOpen, setOrderViewOpen] = useState(false);
  const [protocolViewOpen, setProtocolViewOpen] = useState(false);
  const [modalShellOpen, setModalShellOpen] = useState(false);

  // Ref for ScheduleSlotModal
  const scheduleSlotRef = useRef<ScheduleSlotModalHandle>(null);

  // Realistic sample data for live popups
  const sampleAdmissionRecord: AdmissionRecord = {
    id: "adm-101",
    admission_id: "adm-101",
    ip_number: "IPD-2026-0042",
    patient_id: "pat-883",
    appointment_id: "apt-123",
    encounter_no: "ENC-9941",
    branch_id: "br-01",
    department_id: "dep-onco",
    employee_id: "emp-501",
    admission_type: "EMERGENCY",
    provisional_diagnosis: "Acute Febrile Illness / Neutropenia",
    ward_id: "w-01",
    bed_id: "b-04",
    is_daycare: false,
    payment_mode: "INSURANCE",
    insurance_provider: "Star Health",
    insurance_policy_no: "POL-8492019",
    admission_date: new Date().toISOString(),
    expected_stay_days: 4,
    discharge_date: null,
    discharge_type: null,
    discharge_summary: null,
    advance_amount: 5000,
    status: "ADMITTED",
    created_by: "usr-admin",
    created_at: new Date().toISOString(),
    updated_by: "usr-admin",
    updated_at: new Date().toISOString(),
    department_master: { department_id: "dep-onco", department_name: "Medical Oncology" } as any,
    employees: { employee_id: "emp-501", first_name: "Alexander", last_name: "Pierce" } as any,
    ward_master: { ward_id: "w-01", ward_name: "General Ward A" } as any,
    bed_master: { bed_id: "b-04", bed_number: "G-04" } as any,
    patient_bio_data: {
      patient_id: "pat-883",
      patient_first_name: "Rahul",
      patient_middle_name: "Kumar",
      patient_last_name: "Verma",
      patient_gender: "Male",
      patient_contact_number: "+91 98765 43210",
      patient_DOB: "1988-06-15",
      patient_primary_mobile: "+91 98765 43210",
      patient_uhid_number: "UHID-88390",
    },
    branch: {
      branch_id: "br-01",
      branch_name: "City Central Hospital",
      branch_area: "Main Campus",
    },
  };

  const sampleQueueItems: QueuePatientItem[] = [
    {
      id: "q-1",
      patientName: "Sunita Sharma",
      tokenNumber: "A-12",
      startTime: "10:00 AM",
      endTime: "10:15 AM",
      durationMinutes: 15,
      status: "IN_CONSULTATION",
    },
    {
      id: "q-2",
      patientName: "Vikram Malhotra",
      tokenNumber: "A-13",
      startTime: "10:15 AM",
      endTime: "10:30 AM",
      durationMinutes: 15,
      status: "WAITING",
    },
    {
      id: "q-3",
      patientName: "Ananya Iyer",
      tokenNumber: "A-14",
      startTime: "10:30 AM",
      endTime: "10:45 AM",
      durationMinutes: 15,
      status: "WAITING",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 shadow-2xs hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Component Showcase & Comparison</h1>
              <p className="text-xs text-slate-500">
                Interactive preview of every distinct input box, dropdown box, and popup component across Admin, Doctor, and Lab modules.
              </p>
            </div>
          </div>
          <span className="rounded bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
            Temporary Testing Page
          </span>
        </div>

        {/* ================= SECTION 1: DROPDOWN BOXES ================= */}
        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-700">
            Dropdown Components (Distinct Types)
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <ComponentCard name="UserProfileDropdown" path="components/ui/User_profile_dropdown.tsx" modules={["Admin", "Doctor", "Lab"]}>
              <UserProfileDropdown userName="Dr. Alexander" userSubtext="Admin / Oncologist" onLogout={() => {}} />
              <span className="text-xs text-slate-500">(Click avatar to open menu)</span>
            </ComponentCard>

            <ComponentCard name="BranchSelector" path="components/hms/BranchSelector.tsx" modules={["Admin", "Doctor"]}>
              <BranchSelector />
            </ComponentCard>

            <ComponentCard name="Select (Radix UI)" path="components/ui/select.tsx" modules={["Admin", "Doctor"]}>
              <Select value={radixSelectVal} onValueChange={setRadixSelectVal}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose Department..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cardio">Cardiology</SelectItem>
                  <SelectItem value="onco">Medical Oncology</SelectItem>
                  <SelectItem value="general">General Medicine</SelectItem>
                </SelectContent>
              </Select>
            </ComponentCard>

            <ComponentCard name="DropdownMenu (Action Menu)" path="components/ui/dropdown-menu.tsx" modules={["Admin", "Doctor"]}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    Open Action Menu ▾
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>View Record</DropdownMenuItem>
                  <DropdownMenuItem>Edit Details</DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600">Cancel / Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </ComponentCard>

            <ComponentCard name="FormDropdown (Searchable Input)" path="components/ui/form-dropdown.tsx" modules={["Admin"]}>
              <FormDropdown
                placeholder="Select or search role..."
                value={formDropdownVal}
                onValueChange={setFormDropdownVal}
                options={["SUPER_ADMIN", "DOCTOR", "NURSE", "PHARMACIST", "RECEPTIONIST"]}
              />
            </ComponentCard>

            <ComponentCard name="Dropdown (Modal Safe Inline)" path="components/ui/dropdown.tsx" modules={["Admin"]}>
              <Dropdown
                placeholder="Select Ward Type..."
                value={modalDropdownVal}
                onChange={setModalDropdownVal}
                options={[
                  { value: "icu", label: "ICU Ward" },
                  { value: "general", label: "General Ward" },
                  { value: "private", label: "Private Deluxe" },
                ]}
              />
            </ComponentCard>

            <ComponentCard name="SingleSelectDropdown (Search + Create)" path="components/ui/single-select-dropdown.tsx" modules={["Admin", "Doctor"]}>
              <SingleSelectDropdown
                value={singleSelectVal}
                onValueChange={setSingleSelectVal}
                placeholder="Search or add medication..."
                options={["Paracetamol 500mg", "Amoxicillin 250mg", "Cisplatin 50mg"]}
                onCreateOption={(typed) => setSingleSelectVal(typed)}
                createLabel="Add new drug"
              />
            </ComponentCard>

            <ComponentCard name="MultiSelectDropdown (Tags & Chips)" path="components/ui/multi-select-dropdown.tsx" modules={["Admin", "Doctor"]}>
              <MultiSelectDropdown
                value={multiSelectVal}
                onValueChange={setMultiSelectVal}
                placeholder="Select branches..."
                options={["City Central Branch", "Westside Clinic", "East Suburb Hospital"]}
              />
            </ComponentCard>

            <ComponentCard name="FormProtocolDropdown" path="components/ui/form-protocol-dropdown.tsx" modules={["Admin"]}>
              <FormProtocolDropdown
                placeholder="Select protocol regimen..."
                value={protocolDropdownVal}
                onValueChange={setProtocolDropdownVal}
                options={["FOLFOX-6", "AC-T Regimen", "CHOP Protocol"]}
              />
            </ComponentCard>

            <ComponentCard name="FormProtocolMultiSelect" path="components/ui/form-protocol-multiselect.tsx" modules={["Admin"]}>
              <FormProtocolMultiSelect
                placeholder="Select test days..."
                values={protocolMultiVal}
                onValuesChange={setProtocolMultiVal}
                options={[
                  { label: "Cycle Day 1", value: "D1" },
                  { label: "Cycle Day 8", value: "D8" },
                  { label: "Cycle Day 15", value: "D15" },
                ]}
              />
            </ComponentCard>

            <ComponentCard name="Native HTML <select>" path="Standard HTML" modules={["Admin", "Doctor", "Lab"]}>
              <select
                value={nativeSelectVal}
                onChange={(e) => setNativeSelectVal(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
              >
                <option value="ROUTINE">Routine Priority</option>
                <option value="URGENT">Urgent Priority</option>
                <option value="STAT">STAT Priority</option>
              </select>
            </ComponentCard>
          </div>
        </div>

        {/* ================= SECTION 2: INPUT BOXES ================= */}
        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-700">
            Input Components (Distinct Types)
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <ComponentCard name="Input (Base Shadcn)" path="components/ui/input.tsx" modules={["Admin", "Doctor", "Lab"]}>
              <Input
                type="text"
                placeholder="Enter standard text..."
                value={standardText}
                onChange={(e) => setStandardText(e.target.value)}
              />
            </ComponentCard>

            <ComponentCard name="Table Pill Search Input" path="PendingBookings.tsx / LabOrders.tsx" modules={["Admin", "Lab"]}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search table records..."
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  className="w-full rounded-full border border-slate-200 bg-slate-100 py-1.5 pl-8 pr-8 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                />
                {searchVal && (
                  <button onClick={() => setSearchVal("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </ComponentCard>

            <ComponentCard name="PhoneInput (Country Flag & Dial Code)" path="components/ui/phone-input.tsx" modules={["Admin"]}>
              <PhoneInput
                value={phoneVal}
                onChange={setPhoneVal}
                defaultCountry="in"
                placeholder="Mobile number..."
              />
            </ComponentCard>

            <ComponentCard name="DateInputField (Masked + Calendar)" path="pages/doctor/consultation/DateInputField.tsx" modules={["Doctor"]}>
              <DateInputField id="showcase-date" value={dateVal} onChange={setDateVal} allowPast />
            </ComponentCard>

            <ComponentCard name="ComboInput (Editable Suggestion)" path="pages/doctor/patient-details/ComboInput.tsx" modules={["Doctor"]}>
              <ComboInput
                value={comboVal}
                onChange={setComboVal}
                placeholder="Type or pick symptom..."
                options={["Fever", "Nausea", "Headache", "Fatigue", "Others"]}
              />
            </ComponentCard>

            <ComponentCard name="VoiceToText (Speech-to-Text Input)" path="components/ui/voicetotext.tsx" modules={["Doctor"]}>
              <VoiceToText value={voiceVal} onChange={setVoiceVal} placeholder="Click mic to speak notes..." />
            </ComponentCard>

            <ComponentCard name="TimepickerWheel" path="components/ui/timepicker-wheel.tsx" modules={["Admin"]}>
              <TimepickerWheel value={wheelTime} onChange={setWheelTime} />
            </ComponentCard>

            <ComponentCard name="InputOTP (Segmented Digits)" path="components/ui/input-otp.tsx" modules={["Admin"]}>
              <InputOTP maxLength={6} value={otpVal} onChange={setOtpVal}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </ComponentCard>

            <ComponentCard name="Textarea (Multi-line)" path="components/ui/textarea.tsx" modules={["Admin", "Doctor", "Lab"]}>
              <Textarea
                rows={2}
                placeholder="Enter remarks or clinical notes..."
                value={textareaVal}
                onChange={(e) => setTextareaVal(e.target.value)}
              />
            </ComponentCard>
          </div>
        </div>

        {/* ================= SECTION 3: POPUP/MODAL COMPONENTS ================= */}
        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-700">
            Popup & Modal Components (Exhaustive Interactive Catalog)
          </h2>
          <p className="mb-4 text-xs text-slate-500">
            Click any button below to trigger the exact source component with realistic mock data. Edit CSS directly in the component file and view hot-reloaded changes immediately.
          </p>

          <div className="space-y-8">
            {/* SUB-GROUP 1: CORE CONFIRMATION DIALOGS */}
            <div>
              <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-rose-700">
                1. Core Confirmation Dialogs (`@/components/ui/ConfirmationDialog`)
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Danger Confirmation */}
                <ComponentCard
                  name="ConfirmationDialog (Danger)"
                  path="components/ui/ConfirmationDialog.tsx"
                  modules={["Admin", "Doctor"]}
                  popup
                  popupTitle="Delete Record (Danger)"
                  onOpen={() => setConfirmDangerOpen(true)}
                >
                  <ConfirmationDialog
                    open={confirmDangerOpen}
                    title="Delete Record"
                    description="Are you sure you want to delete this patient record? This action cannot be undone."
                    type="danger"
                    confirmText="Delete"
                    cancelText="Keep"
                    onConfirm={() => setConfirmDangerOpen(false)}
                    onCancel={() => setConfirmDangerOpen(false)}
                  />
                </ComponentCard>

                {/* Question / Submit Confirmation */}
                <ComponentCard
                  name="ConfirmationDialog (Question)"
                  path="components/ui/ConfirmationDialog.tsx"
                  modules={["Admin"]}
                  popup
                  popupTitle="Confirm Submit (Question)"
                  onOpen={() => setConfirmQuestionOpen(true)}
                >
                  <ConfirmationDialog
                    open={confirmQuestionOpen}
                    title="Add New Branch?"
                    description="Are you sure you want to create this new branch with the entered operational details?"
                    type="question"
                    confirmText="Add Branch"
                    cancelText="Cancel"
                    onConfirm={() => setConfirmQuestionOpen(false)}
                    onCancel={() => setConfirmQuestionOpen(false)}
                  />
                </ComponentCard>

                {/* Warning / Discard Confirmation */}
                <ComponentCard
                  name="ConfirmationDialog (Warning)"
                  path="components/ui/ConfirmationDialog.tsx"
                  modules={["Admin", "Doctor"]}
                  popup
                  popupTitle="Discard Changes (Warning)"
                  onOpen={() => setConfirmWarningOpen(true)}
                >
                  <ConfirmationDialog
                    open={confirmWarningOpen}
                    title="Leave without saving?"
                    description="You have unsaved changes in this form. If you leave now, all your inputs will be lost."
                    type="warning"
                    confirmText="Leave Page"
                    cancelText="Stay Here"
                    onConfirm={() => setConfirmWarningOpen(false)}
                    onCancel={() => setConfirmWarningOpen(false)}
                  />
                </ComponentCard>

                {/* Info / Reset Confirmation */}
                <ComponentCard
                  name="ConfirmationDialog (Info)"
                  path="components/ui/ConfirmationDialog.tsx"
                  modules={["Admin", "Doctor"]}
                  popup
                  popupTitle="Reset Form (Info)"
                  onOpen={() => setConfirmInfoOpen(true)}
                >
                  <ConfirmationDialog
                    open={confirmInfoOpen}
                    title="Reset Form Fields?"
                    description="All entered values in this consultation form will be cleared back to their defaults."
                    type="info"
                    confirmText="Reset"
                    cancelText="Cancel"
                    onConfirm={() => setConfirmInfoOpen(false)}
                    onCancel={() => setConfirmInfoOpen(false)}
                  />
                </ComponentCard>
              </div>
            </div>

            {/* SUB-GROUP 2: SUCCESS-FLOW & POST-ACTION MODALS */}
            <div>
              <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
                2. Success-Flow & Post-Action Popups
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Appointment Booked (OPD Success) */}
                <ComponentCard
                  name="Appointment Booked (OPD Success)"
                  path="components/Forms/AddAppointment.tsx"
                  modules={["Admin"]}
                  popup
                  popupTitle="Open Appointment Booked Success"
                  onOpen={() => setAppointmentBookedSuccessOpen(true)}
                >
                  <ConfirmationDialog
                    open={appointmentBookedSuccessOpen}
                    onConfirm={() => setAppointmentBookedSuccessOpen(false)}
                    onCancel={() => setAppointmentBookedSuccessOpen(false)}
                    hideCancelButton
                    type="success"
                    title="Appointment Booked"
                    confirmText="Done"
                    description={
                      <div className="w-full min-w-[300px] sm:min-w-[340px] rounded-xl bg-gray-50 border border-gray-100 p-4 text-left text-sm">
                        <div className="flex items-center justify-between gap-6 py-1">
                          <span className="shrink-0 text-gray-500">Patient</span>
                          <span className="text-right font-semibold text-gray-900">Rahul Verma</span>
                        </div>
                        <div className="flex items-center justify-between gap-6 py-1">
                          <span className="shrink-0 text-gray-500">Patient ID</span>
                          <span className="text-right font-semibold text-gray-900">PAT-88390</span>
                        </div>
                        <div className="flex items-center justify-between gap-6 py-1">
                          <span className="shrink-0 text-gray-500">Appointment ID</span>
                          <span className="text-right font-semibold text-gray-900">APT-2026-0921</span>
                        </div>
                        <div className="flex items-center justify-between gap-6 py-1">
                          <span className="shrink-0 text-gray-500">Token ID</span>
                          <span className="text-right font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
                            #14
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-6 py-1">
                          <span className="shrink-0 text-gray-500">Duration</span>
                          <span className="text-right font-semibold text-gray-900">15 minutes</span>
                        </div>
                        <div className="flex items-center justify-between gap-6 py-1">
                          <span className="shrink-0 text-gray-500">Visit Type</span>
                          <span className="text-right font-semibold text-gray-900">Follow-up Consultation</span>
                        </div>
                        <div className="flex items-center justify-between gap-6 py-1">
                          <span className="shrink-0 text-gray-500">Date</span>
                          <span className="text-right font-semibold text-gray-900">Thu, Nov 12, 2026</span>
                        </div>
                        <div className="flex items-center justify-between gap-6 py-1">
                          <span className="shrink-0 text-gray-500">Arrival Window</span>
                          <span className="text-right font-semibold text-gray-900">10:00 AM - 11:00 AM</span>
                        </div>
                        <div className="flex items-center justify-between gap-6 py-1">
                          <span className="shrink-0 text-gray-500">Estimated Consultation</span>
                          <span className="text-right font-bold text-blue-700">10:15 AM - 10:30 AM</span>
                        </div>
                        <div className="flex items-center justify-between gap-6 py-1">
                          <span className="shrink-0 text-gray-500">Doctor</span>
                          <span className="text-right font-semibold text-gray-900">Dr. Alexander Pierce</span>
                        </div>
                      </div>
                    }
                  />
                </ComponentCard>

                {/* Admission Request Created (IPD Success) */}
                <ComponentCard
                  name="Admission Request Created (IPD Success)"
                  path="components/Forms/AddAppointment.tsx"
                  modules={["Admin", "Doctor"]}
                  popup
                  popupTitle="Open Admission Created Success"
                  onOpen={() => setAdmissionCreatedSuccessOpen(true)}
                >
                  <ConfirmationDialog
                    open={admissionCreatedSuccessOpen}
                    onConfirm={() => setAdmissionCreatedSuccessOpen(false)}
                    onCancel={() => setAdmissionCreatedSuccessOpen(false)}
                    hideCancelButton
                    type="success"
                    title="Patient Admitted"
                    confirmText="Done"
                    description={
                      <div className="w-full min-w-[300px] sm:min-w-[340px] rounded-xl bg-gray-50 border border-gray-100 p-4 text-left text-sm">
                        <div className="flex items-center justify-between gap-6 py-1">
                          <span className="shrink-0 text-gray-500">Patient</span>
                          <span className="text-right font-semibold text-gray-900">Rahul Verma</span>
                        </div>
                        <div className="flex items-center justify-between gap-6 py-1">
                          <span className="shrink-0 text-gray-500">Patient ID</span>
                          <span className="text-right font-semibold text-gray-900">PAT-88390</span>
                        </div>
                        <div className="flex items-center justify-between gap-6 py-1">
                          <span className="shrink-0 text-gray-500">IP Number</span>
                          <span className="text-right font-semibold text-blue-700">IPD-2026-0042</span>
                        </div>
                        <div className="flex items-center justify-between gap-6 py-1">
                          <span className="shrink-0 text-gray-500">Status</span>
                          <span className="text-right font-semibold text-emerald-700">ADMITTED</span>
                        </div>
                        <div className="flex items-center justify-between gap-6 py-1">
                          <span className="shrink-0 text-gray-500">Admitted At</span>
                          <span className="text-right font-semibold text-gray-900">Thu, Nov 12, 2026, 11:15 AM</span>
                        </div>
                        <div className="flex items-center justify-between gap-6 py-1">
                          <span className="shrink-0 text-gray-500">Ward & Bed</span>
                          <span className="text-right font-semibold text-gray-900">General Ward A · Bed G-04</span>
                        </div>
                      </div>
                    }
                  />
                </ComponentCard>

                {/* Slot Assigned Successfully (Reassignment Complete) */}
                <ComponentCard
                  name="Slot Assigned (Reassignment Complete)"
                  path="pages/RescheduleQueue.tsx"
                  modules={["Admin"]}
                  popup
                  popupTitle="Open Slot Assigned Complete"
                  onOpen={() => setSlotAssignedSuccessOpen(true)}
                >
                  <Dialog open={slotAssignedSuccessOpen} onOpenChange={setSlotAssignedSuccessOpen}>
                    <DialogContent className="sm:max-w-xl w-[95vw] p-0 overflow-hidden rounded-2xl shadow-2xl border border-gray-100 bg-white font-[Manrope,sans-serif]">
                      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50/60 to-white flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#E8F0FE] text-[#00488D] flex items-center justify-center shrink-0">
                            <CalendarClock className="w-5 h-5" />
                          </div>
                          <div>
                            <DialogTitle className="text-base font-bold text-[#191C1E]">
                              Slot Assigned Successfully
                            </DialogTitle>
                            <DialogDescription className="text-xs text-[#64748B] mt-0.5">
                              The appointment has been reassigned to the new doctor's schedule.
                            </DialogDescription>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 space-y-4 text-center">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-base font-bold text-[#191C1E]">Reassignment Complete</h3>
                          <p className="text-xs text-[#64748B]">
                            The patient has been assigned a confirmed time slot with Dr. Sneha Kapoor.
                          </p>
                        </div>
                        <div className="max-w-md mx-auto grid grid-cols-2 gap-3 p-4 bg-gray-50 border border-gray-200/80 rounded-xl text-left text-xs">
                          <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Patient</span>
                            <span className="font-semibold text-gray-900">Rahul Verma</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Assigned Doctor</span>
                            <span className="font-semibold text-gray-900">Dr. Sneha Kapoor</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Branch</span>
                            <span className="font-semibold text-gray-900">City Central Hospital</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Date & Time</span>
                            <span className="font-semibold text-emerald-700">14-Nov-2026 at 11:30 AM</span>
                          </div>
                        </div>

                        <div className="pt-2 flex justify-center">
                          <Button
                            onClick={() => setSlotAssignedSuccessOpen(false)}
                            className="bg-[#00488D] text-white px-6 rounded-lg text-xs"
                          >
                            Close
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </ComponentCard>

                {/* Transfer Details Dialog */}
                <ComponentCard
                  name="Transfer Details Dialog"
                  path="pages/TransferDoctor.tsx"
                  modules={["Admin"]}
                  popup
                  popupTitle="Open Transfer Details Dialog"
                  onOpen={() => setTransferDetailsOpen(true)}
                >
                  <AffectedAppointmentsDialog
                    open={transferDetailsOpen}
                    onOpenChange={setTransferDetailsOpen}
                    employeeId="emp-501"
                    oldBranchId="br-01"
                    title="Transfer Details"
                    branches={[
                      { branch_id: "br-01", branch_name: "City Central Hospital" },
                      { branch_id: "br-02", branch_name: "Westside Clinic" },
                    ]}
                    doctors={[
                      {
                        employee_id: "emp-502",
                        first_name: "Sneha",
                        last_name: "Kapoor",
                        department_id: "dep-onco",
                        emp_status: true,
                      },
                    ]}
                    transfers={[
                      {
                        transfer_id: "tr-001",
                        message: "Transferring Dr. Alexander to Westside Clinic (Effective 15-Nov-2026)",
                        old_branch_id: "br-01",
                      },
                    ]}
                    appointments={[
                      {
                        appointment_id: "apt-101",
                        appointment_date: new Date().toISOString(),
                        appointment_time: "10:00 AM",
                        patient_name: "Suresh Gupta",
                        patient_contact: "+91 91234 56789",
                        branch_name: "City Central Hospital",
                        doctor_name: "Dr. Alexander",
                      } as any,
                    ]}
                    onCompleted={() => setTransferDetailsOpen(false)}
                  />
                </ComponentCard>

                {/* Leave Applied Successfully */}
                <ComponentCard
                  name="Leave Applied Successfully"
                  path="pages/Scheduled.tsx"
                  modules={["Doctor", "Admin"]}
                  popup
                  popupTitle="Open Leave Success Alert"
                  onOpen={() => setLeaveSuccessOpen(true)}
                >
                  <AlertDialog open={leaveSuccessOpen} onOpenChange={setLeaveSuccessOpen}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-[#2E7D5B]">
                          <CheckCircle2 className="size-5" />
                          Leave applied successfully
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Leave date: 15-Nov-2026 to 18-Nov-2026 · Leave ID: LV-4091 · 3 patient(s) sent to the reschedule queue.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setLeaveSuccessOpen(false)}>
                          OK
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </ComponentCard>
              </div>
            </div>

            {/* SUB-GROUP 3: ADMIN & IPD BED MANAGEMENT DIALOGS */}
            <div>
              <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-blue-700">
                3. Admin, IPD & Bed Management Dialogs
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Add Ward Dialog */}
                <ComponentCard
                  name="AddWardDialog"
                  path="components/hms/AddWardDialog.tsx"
                  modules={["Admin"]}
                  popup
                  popupTitle="Open Add Ward Dialog"
                  onOpen={() => setWardOpen(true)}
                >
                  <AddWardDialog
                    open={wardOpen}
                    onOpenChange={setWardOpen}
                    branches={[
                      { branch_id: "br-01", branch_name: "City Central Hospital" } as any,
                      { branch_id: "br-02", branch_name: "Westside Clinic" } as any,
                    ]}
                    defaultBranchId="br-01"
                  />
                </ComponentCard>

                {/* Add Bed Dialog */}
                <ComponentCard
                  name="AddBedDialog"
                  path="components/hms/AddBedDialog.tsx"
                  modules={["Admin"]}
                  popup
                  popupTitle="Open Add Bed Dialog"
                  onOpen={() => setBedOpen(true)}
                >
                  <AddBedDialog
                    open={bedOpen}
                    onOpenChange={setBedOpen}
                    branches={[
                      { branch_id: "br-01", branch_name: "City Central Hospital" } as any,
                      { branch_id: "br-02", branch_name: "Westside Clinic" } as any,
                    ]}
                    defaultBranchId="br-01"
                    defaultWardId="w-01"
                  />
                </ComponentCard>

                {/* Admit Bed Dialog */}
                <ComponentCard
                  name="AdmitBedDialog"
                  path="components/hms/AdmitBedDialog.tsx"
                  modules={["Doctor"]}
                  popup
                  popupTitle="Open Admit Bed Dialog"
                  onOpen={() => setAdmitBedOpen(true)}
                >
                  <AdmitBedDialog
                    open={admitBedOpen}
                    onOpenChange={setAdmitBedOpen}
                    admission={sampleAdmissionRecord}
                    mode="admit"
                    onDone={() => setAdmitBedOpen(false)}
                  />
                </ComponentCard>

                {/* Transfer Bed Dialog */}
                <ComponentCard
                  name="Transfer Bed Dialog"
                  path="pages/InpatientAdmissions.tsx"
                  modules={["Admin", "Doctor"]}
                  popup
                  popupTitle="Open Transfer Bed Dialog"
                  onOpen={() => setTransferBedOpen(true)}
                >
                  <Dialog open={transferBedOpen} onOpenChange={setTransferBedOpen}>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
                          <Bed className="h-5 w-5 text-blue-600" />
                          Transfer Patient Bed
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                          Transfer IPD-2026-0042 (Rahul Verma) to another ward or bed.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-3.5 py-2">
                        <div>
                          <Label className="text-xs">Current Bed</Label>
                          <p className="text-xs font-semibold text-slate-800">General Ward A · Bed G-04</p>
                        </div>

                        <div>
                          <Label className="text-xs">Target Ward</Label>
                          <Select defaultValue="icu">
                            <SelectTrigger className="w-full mt-1">
                              <SelectValue placeholder="Select target ward" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="icu">ICU Ward 2</SelectItem>
                              <SelectItem value="deluxe">Private Deluxe Ward</SelectItem>
                              <SelectItem value="gen-b">General Ward B</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs">Target Bed</Label>
                          <Select defaultValue="bed-1">
                            <SelectTrigger className="w-full mt-1">
                              <SelectValue placeholder="Select available bed" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bed-1">Bed ICU-01 (Available)</SelectItem>
                              <SelectItem value="bed-2">Bed ICU-02 (Available)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs">Transfer Reason</Label>
                          <Textarea rows={2} placeholder="e.g. Critical monitoring needed after infusion..." className="mt-1 text-xs" />
                        </div>
                      </div>

                      <DialogFooter className="pt-2">
                        <Button variant="outline" size="sm" onClick={() => setTransferBedOpen(false)}>Cancel</Button>
                        <Button size="sm" onClick={() => setTransferBedOpen(false)} className="bg-blue-600 text-white">Transfer Patient</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </ComponentCard>

                {/* Discharge Patient Dialog */}
                <ComponentCard
                  name="Discharge Patient Dialog"
                  path="pages/InpatientAdmissions.tsx"
                  modules={["Admin", "Doctor"]}
                  popup
                  popupTitle="Open Discharge Dialog"
                  onOpen={() => setDischargePatientOpen(true)}
                >
                  <Dialog open={dischargePatientOpen} onOpenChange={setDischargePatientOpen}>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
                          <LogOut className="h-5 w-5 text-emerald-600" />
                          Discharge Patient
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                          Finalize inpatient stay for IPD-2026-0042 (Rahul Verma).
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-3 py-2 text-xs">
                        <div>
                          <Label className="text-xs">Discharge Type</Label>
                          <Select defaultValue="routine">
                            <SelectTrigger className="w-full mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="routine">Routine Discharge</SelectItem>
                              <SelectItem value="transfer">Transferred to another facility</SelectItem>
                              <SelectItem value="ama">Against Medical Advice (LAMA)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs">Patient Status at Discharge</Label>
                          <Select defaultValue="STABLE">
                            <SelectTrigger className="w-full mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="STABLE">Stable</SelectItem>
                              <SelectItem value="IMPROVED">Improved</SelectItem>
                              <SelectItem value="UNCHANGED">Unchanged</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs">Take-Home Advice & Summary</Label>
                          <Textarea rows={2} placeholder="Complete 5 days of antibiotic course; return if fever spikes." className="mt-1 text-xs" />
                        </div>
                      </div>

                      <DialogFooter className="pt-2">
                        <Button variant="outline" size="sm" onClick={() => setDischargePatientOpen(false)}>Cancel</Button>
                        <Button size="sm" onClick={() => setDischargePatientOpen(false)} className="bg-emerald-600 text-white">Confirm Discharge</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </ComponentCard>

                {/* Release Bed / Mark No-Show Dialog */}
                <ComponentCard
                  name="Release Bed / Cancel Request"
                  path="pages/InpatientAdmissions.tsx"
                  modules={["Admin"]}
                  popup
                  popupTitle="Open Release Bed Dialog"
                  onOpen={() => setReleaseBedOpen(true)}
                >
                  <ConfirmationDialog
                    open={releaseBedOpen}
                    title="Release Reserved Bed"
                    description="The bed held for IPD-2026-0042 will become available to other patients. The request itself stays planned."
                    type="LockOpen"
                    confirmText="Release Bed"
                    cancelText="Back"
                    onConfirm={() => setReleaseBedOpen(false)}
                    onCancel={() => setReleaseBedOpen(false)}
                  >
                    <div className="w-full text-left mt-2">
                      <Label className="text-xs">Reason (Optional)</Label>
                      <Textarea placeholder="e.g. Patient arriving tomorrow instead..." rows={2} className="mt-1 text-xs" />
                    </div>
                  </ConfirmationDialog>
                </ComponentCard>

                {/* Assign Doctor Dialog */}
                <ComponentCard
                  name="AssignDoctorDialog"
                  path="components/hms/AssignDoctorDialog.tsx"
                  modules={["Admin"]}
                  popup
                  popupTitle="Open Assign Doctor Dialog"
                  onOpen={() => setAssignDoctorOpen(true)}
                >
                  <AssignDoctorDialog
                    open={assignDoctorOpen}
                    onOpenChange={setAssignDoctorOpen}
                    admission={sampleAdmissionRecord}
                    onDone={() => setAssignDoctorOpen(false)}
                  />
                </ComponentCard>

                {/* Allocate Care Team */}
                <ComponentCard
                  name="AllocateCareTeamDialog"
                  path="components/hms/AllocateCareTeamDialog.tsx"
                  modules={["Admin"]}
                  popup
                  popupTitle="Open Allocate Care Team Dialog"
                  onOpen={() => setCareTeamOpen(true)}
                >
                  <AllocateCareTeamDialog
                    open={careTeamOpen}
                    onOpenChange={setCareTeamOpen}
                    admission={sampleAdmissionRecord}
                    onDone={() => setCareTeamOpen(false)}
                  />
                </ComponentCard>

                {/* Ward Shift Allocation */}
                <ComponentCard
                  name="WardShiftAllocationDialog"
                  path="components/hms/WardShiftAllocationDialog.tsx"
                  modules={["Admin"]}
                  popup
                  popupTitle="Open Ward Shift Allocation Dialog"
                  onOpen={() => setWardShiftOpen(true)}
                >
                  <WardShiftAllocationDialog
                    open={wardShiftOpen}
                    onOpenChange={setWardShiftOpen}
                    branchId="br-01"
                    onDone={() => setWardShiftOpen(false)}
                  />
                </ComponentCard>

                {/* Branch Shift Config */}
                <ComponentCard
                  name="BranchShiftConfigDialog"
                  path="components/hms/BranchShiftConfigDialog.tsx"
                  modules={["Admin"]}
                  popup
                  popupTitle="Open Branch Shift Config Dialog"
                  onOpen={() => setBranchShiftOpen(true)}
                >
                  <BranchShiftConfigDialog
                    open={branchShiftOpen}
                    onOpenChange={setBranchShiftOpen}
                    branchId="br-01"
                    onShiftsUpdated={() => setBranchShiftOpen(false)}
                  />
                </ComponentCard>

                {/* Duty Roster Add Staff Dialog */}
                <ComponentCard
                  name="Duty Roster Add Staff Dialog"
                  path="components/hms/DutyRosterGrid.tsx"
                  modules={["Admin"]}
                  popup
                  popupTitle="Open Duty Roster Staff Dialog"
                  onOpen={() => setDutyRosterStaffOpen(true)}
                >
                  <Dialog open={dutyRosterStaffOpen} onOpenChange={setDutyRosterStaffOpen}>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                          <UserPlus className="h-5 w-5 text-blue-600" />
                          Assign Staff to Shift
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                          Morning Shift (08:00 AM - 04:00 PM) · Monday
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-3.5 py-2 text-xs">
                        <div>
                          <Label className="text-xs">Staff Role</Label>
                          <Select defaultValue="nurse">
                            <SelectTrigger className="w-full mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="nurse">Nurse</SelectItem>
                              <SelectItem value="doctor">Duty Doctor</SelectItem>
                              <SelectItem value="pharmacist">Duty Pharmacist</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs">Select Employee</Label>
                          <Select defaultValue="emp-1">
                            <SelectTrigger className="w-full mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="emp-1">Priya Nair (Staff Nurse - Ward A)</SelectItem>
                              <SelectItem value="emp-2">Sunil Deshmukh (Senior Nurse)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <DialogFooter className="pt-2">
                        <Button variant="outline" size="sm" onClick={() => setDutyRosterStaffOpen(false)}>Cancel</Button>
                        <Button size="sm" onClick={() => setDutyRosterStaffOpen(false)} className="bg-blue-600 text-white">Save Assignment</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </ComponentCard>
              </div>
            </div>

            {/* SUB-GROUP 4: OPD, SCHEDULING & QUEUE MODALS */}
            <div>
              <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-teal-700">
                4. OPD, Scheduling & Patient Queue Dialogs
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Patient Conflict Warning */}
                <ComponentCard
                  name="PatientConflictWarningDialog"
                  path="components/hms/PatientConflictWarningDialog.tsx"
                  modules={["Doctor"]}
                  popup
                  popupTitle="Open Patient Conflict Warning"
                  onOpen={() => setPatientConflictOpen(true)}
                >
                  <PatientConflictWarningDialog
                    open={patientConflictOpen}
                    severity="warning"
                    conflicts={[
                      { type: "OVERLAP", message: "Patient has another appointment at 10:30 AM with Dr. Alexander." },
                      { type: "DUPLICATE", message: "Same day OPD consultation already registered in Cardiology." },
                    ]}
                    existingAppointments={[
                      {
                        appointmentId: "apt-882",
                        time: "10:30 AM",
                        branchName: "City Central Hospital",
                        department: "Cardiology",
                        doctorName: "Dr. Alexander",
                        status: "SCHEDULED",
                      },
                    ]}
                    totalAppointments={2}
                    onCancel={() => setPatientConflictOpen(false)}
                    onProceed={() => setPatientConflictOpen(false)}
                  />
                </ComponentCard>

                {/* Sandwich Queue Modal */}
                <ComponentCard
                  name="SandwichQueueModal"
                  path="components/hms/SandwichQueueModal.tsx"
                  modules={["Doctor"]}
                  popup
                  popupTitle="Open Sandwich Queue Modal"
                  onOpen={() => setSandwichQueueOpen(true)}
                >
                  <SandwichQueueModal
                    open={sandwichQueueOpen}
                    onOpenChange={setSandwichQueueOpen}
                    targetAppointment={{
                      id: "apt-urgent-99",
                      patientName: "Kavita Reddy",
                      tokenNumber: "EMERG-01",
                      durationMinutes: 15,
                      status: "WAITING",
                      doctorName: "Dr. Alexander",
                    }}
                    activeAppointments={sampleQueueItems}
                    onSuccess={() => setSandwichQueueOpen(false)}
                  />
                </ComponentCard>

                {/* Schedule Slot Modal */}
                <ComponentCard
                  name="ScheduleSlotModal"
                  path="components/hms/ScheduleSlotModal.tsx"
                  modules={["Doctor"]}
                  popup
                  popupTitle="Open Schedule Slot Modal (Add Slot)"
                  onOpen={() => scheduleSlotRef.current?.openAddSlot("Monday", 1, 2, "weekly")}
                >
                  <ScheduleSlotModal
                    ref={scheduleSlotRef}
                    branches={[
                      { branch_id: "br-01", branch_name: "City Central Hospital" },
                      { branch_id: "br-02", branch_name: "Westside Clinic" },
                    ]}
                    onAddSlot={async () => true}
                    onUpdateSlot={async () => true}
                    onCancelSlot={() => {}}
                  />
                </ComponentCard>

                {/* Vital Signs Popover Modal */}
                <ComponentCard
                  name="VitalsSignsPopover (Vitals Entry)"
                  path="components/hms/VitalsSignsPopover.tsx"
                  modules={["Doctor", "Admin"]}
                  popup
                  popupTitle="Open Vitals Entry Modal"
                  onOpen={() => setVitalsPopoverOpen(true)}
                >
                  <VitalsSignsPopover
                    open={vitalsPopoverOpen}
                    onOpenChange={setVitalsPopoverOpen}
                    encounterNo="ENC-9941"
                    patientId="pat-883"
                    encounterType="Outpatient (OPD)"
                    dutyNurseName="Priya Nair"
                    onSaved={() => setVitalsPopoverOpen(false)}
                  />
                </ComponentCard>
              </div>
            </div>

            {/* SUB-GROUP 5: CLINICAL, ONCOLOGY & CHEMOTHERAPY MODALS */}
            <div>
              <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-purple-700">
                5. Clinical, Oncology & Chemotherapy Modals
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Dose Calculation Modal */}
                <ComponentCard
                  name="DoseCalculationModal"
                  path="components/chemo/DoseCalculationModal.tsx"
                  modules={["Doctor"]}
                  popup
                  popupTitle="Open Dose Calculation Modal"
                  onOpen={() => setDoseCalcOpen(true)}
                >
                  <DoseCalculationModal
                    open={doseCalcOpen}
                    onOpenChange={setDoseCalcOpen}
                    initialDrugName="Cisplatin"
                    initialDose="75 mg/m2"
                    initialDoseCalc="BSA"
                    onApplyDose={() => setDoseCalcOpen(false)}
                  />
                </ComponentCard>

                {/* Pharmacy Slip Modal */}
                <ComponentCard
                  name="PharmacySlipModal"
                  path="pages/doctor/consultation/PharmacySlipModal.tsx"
                  modules={["Doctor"]}
                  popup
                  popupTitle="Open Pharmacy Slip Modal"
                  onOpen={() => setPharmacySlipOpen(true)}
                >
                  <PharmacySlipModal
                    open={pharmacySlipOpen}
                    onOpenChange={setPharmacySlipOpen}
                    planId="plan-01"
                    cycleNumber={1}
                    cycleDay={1}
                    encounterNo="ENC-9941"
                    sourceRows={[
                      {
                        key: "row-1",
                        role: "PRIMARY",
                        medicine_name: "Cisplatin 50mg Injection",
                        generic_id: "gen-cisplatin",
                        generic_name: "Cisplatin",
                        dosage_form: "INJECTION",
                        ordered_dose: "100 mg",
                        dose_unit: "mg",
                        route: "IV Infusion",
                        duration_days: 1,
                      } as any,
                      {
                        key: "row-2",
                        role: "PREMEDICATION",
                        medicine_name: "Ondansetron 8mg Tablet",
                        generic_id: "gen-ondan",
                        generic_name: "Ondansetron",
                        dosage_form: "TABLET",
                        ordered_dose: "8 mg",
                        dose_unit: "mg",
                        route: "Oral",
                        duration_days: 3,
                      } as any,
                    ]}
                  />
                </ComponentCard>

                {/* Adverse Event Modal */}
                <ComponentCard
                  name="AdverseEventModal"
                  path="pages/doctor/patient-details/AdverseEventModal.tsx"
                  modules={["Doctor"]}
                  popup
                  popupTitle="Open Adverse Event Modal"
                  onOpen={() => setAdverseEventOpen(true)}
                >
                  {adverseEventOpen && (
                    <AdverseEventModal
                      dayLabel="Cycle 1 · Day 1 · 12-Nov-2026"
                      onSaved={() => setAdverseEventOpen(false)}
                      onClose={() => setAdverseEventOpen(false)}
                    />
                  )}
                </ComponentCard>

                {/* Order View Modal */}
                <ComponentCard
                  name="OrderViewModal"
                  path="pages/doctor/patient-details/OrderViewModal.tsx"
                  modules={["Doctor"]}
                  popup
                  popupTitle="Open Order View Modal"
                  onOpen={() => setOrderViewOpen(true)}
                >
                  {orderViewOpen && (
                    <OrderViewModal
                      planId="mock-plan-1"
                      cycleNumber={1}
                      cycleDay={1}
                      treatmentDate="2026-11-12"
                      onClose={() => setOrderViewOpen(false)}
                    />
                  )}
                </ComponentCard>

                {/* Protocol View Modal */}
                <ComponentCard
                  name="ProtocolViewModal"
                  path="pages/doctor/patient-details/ProtocolViewModal.tsx"
                  modules={["Doctor"]}
                  popup
                  popupTitle="Open Protocol View Modal"
                  onOpen={() => setProtocolViewOpen(true)}
                >
                  {protocolViewOpen && (
                    <ProtocolViewModal
                      protocolId="mock-protocol-1"
                      cycleIntervalDays={21}
                      onClose={() => setProtocolViewOpen(false)}
                    />
                  )}
                </ComponentCard>

                {/* ModalShell Base Frame */}
                <ComponentCard
                  name="ModalShell (Generic Doctor Frame)"
                  path="pages/doctor/patient-details/ModalShell.tsx"
                  modules={["Doctor"]}
                  popup
                  popupTitle="Open ModalShell Frame Demo"
                  onOpen={() => setModalShellOpen(true)}
                >
                  {modalShellOpen && (
                    <ModalShell
                      icon="fa-stethoscope"
                      title="Clinical Protocol Details"
                      subtitle="Previewing the hand-rolled reusable ModalShell frame and styles"
                      tone="blue"
                      onClose={() => setModalShellOpen(false)}
                      footer={
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setModalShellOpen(false)}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Close
                          </button>
                        </div>
                      }
                    >
                      <div className="p-4 space-y-3">
                        <p className="text-sm text-slate-600">
                          This is the shared <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">ModalShell</code> frame used across patient details for complex modals like Adverse Events and Order Views.
                        </p>
                        <div className="rounded border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                          Supports custom tones, icons, portaled content, and sticky action footers.
                        </div>
                      </div>
                    </ModalShell>
                  )}
                </ComponentCard>
              </div>
            </div>
          </div>
        </div>

        {/* ================= SECTION 4: NAVIGATION & REFERENCES ================= */}
        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-700">
            Navigation & References
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
              <h3 className="font-bold text-slate-800 mb-2">Navigate to Component Showcase</h3>
              <p className="text-sm text-slate-600">
                From Dashboard: Click the "🎨 Component Showcase" button in the admin overview header
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Route: /component-showcase
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
              <h3 className="font-bold text-slate-800 mb-2">All Project Popups</h3>
              <p className="text-sm text-slate-600">
                This page now showcases popup/modal components used throughout the HMS project, including:
              </p>
              <ul className="list-disc pl-5 text-slate-600 space-y-1">
                <li>ConfirmationDialog - Warning/confirmation modals</li>
                <li>AddWardDialog - Add new ward modals</li>
                <li>AddBedDialog - Add new bed modals</li>
                <li>PatientConflictWarningDialog - Patient conflict warnings</li>
                <li>AdmitBedDialog - Bed admission dialogs</li>
                <li>AssignDoctorDialog - Doctor assignment</li>
                <li>AllocateCareTeamDialog - Care team allocation</li>
                <li>WardShiftAllocationDialog - Ward shift scheduling</li>
                <li>BranchShiftConfigDialog - Branch shift configuration</li>
              </ul>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
              <h3 className="font-bold text-slate-800 mb-2">Usage Examples</h3>
              <p className="text-sm text-slate-600">
                Each popup component can be triggered from various places in the application:
              </p>
              <ul className="list-disc pl-5 text-slate-600 space-y-1">
                <li>Dashboard: Warning confirmations for critical actions</li>
                <li>Doctor pages: Patient conflict warnings before operations</li>
                <li>Admin panels: Ward/bed management modals</li>
                <li>Shift management: Shift allocation and configuration dialogs</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}