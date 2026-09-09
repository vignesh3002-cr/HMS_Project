import { useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Calendar,
  VenusAndMars,
  Droplet,
  IdCard,
  User,
  MapPin,
  Building2,
  Phone,
  Mail,
  ArrowLeft,
  ChevronDown,
  CalendarPlus,
  MessageSquare,
  FileText,
  Download,
  Edit,
} from "lucide-react";
import { PatientDetailSkeleton } from "@/components/hms/PatientDetailSkeleton";
import { ErrorDisplay } from "@/components/hms/ErrorDisplay";
import { RelatedActionsDropdown } from "@/components/hms/RelatedActionsDropdown";
import { Section, InfoCell } from "./viewpatient.sections";
import { usePatient } from "@/hooks/usePatient";
import { getPatientFullName, val, calculateAge, safeFormatDate, formatMobile } from "@/utils/patient";
import type { PatientDetail } from "@/types/patient";

export default function PatientDetailView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { patient, loading, error, refetch } = usePatient(id);

  // ===== ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP =====
  const handleBack = useCallback(() => navigate(-1), [navigate]);
  const handleEdit = useCallback(() => navigate(`/patients/edit/${id}`), [navigate, id]);

  // useMemo hooks - safe to call with null/undefined patient (utils handle it)
  const patientName = useMemo(() => getPatientFullName(patient), [patient]);
  const patientDOB = useMemo(() => safeFormatDate(patient?.patient_dob), [patient?.patient_dob]);
  const patientAge = useMemo(
    () => (patient?.patient_age != null ? String(patient.patient_age) : calculateAge(patient?.patient_dob)),
    [patient?.patient_age, patient?.patient_dob]
  );
  const patientMobile = useMemo(
    () => formatMobile(patient?.patient_primary_mobile || "—"),
    [patient?.patient_primary_mobile]
  );
  const patientAltMobile = useMemo(
    () => formatMobile(patient?.patient_alternate_mobile || "—"),
    [patient?.patient_alternate_mobile]
  );
  const patientEmergencyMobile = useMemo(
    () => formatMobile(patient?.emergency_mobile || "—"),
    [patient?.emergency_mobile]
  );
  const registeredOn = useMemo(
    () => safeFormatDate(patient?.user_table?.created_at),
    [patient?.user_table?.created_at]
  );

  // Derived values (not hooks - no conditional call issues)
  const isActive = patient?.patient_active === "Active";
  const patientPhoto = patient?.patient_photo_url || "";

  // ===== NOW EARLY RETURNS - ALL HOOKS HAVE ALREADY RUN =====
  if (loading) {
    return <PatientDetailSkeleton />;
  }

  if (error) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={refetch}
        onBack={handleBack}
      />
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-[#f7f9fc] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-[#5f6672] mb-4">Patient not found.</p>
          <button
            onClick={handleBack}
            className="text-[#004a91] underline focus:outline-none focus:ring-2 focus:ring-[#004a91] focus:ring-offset-2 rounded px-2 py-1"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ===== RENDER WITH PATIENT DATA =====
  return (
    <div className="min-h-screen bg-[#f7f9fc] text-[#172033] font-[Inter,Arial,sans-serif]">
      <main className="w-full p-4 max-w-[1200px] mx-auto">
        {/* BACK BUTTON + HEADER */}
        <div className="flex items-start gap-2 mb-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 border-0 bg-transparent text-[#343943] text-sm cursor-pointer"
            aria-label="Go back to patient list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-[#182235] truncate">{patientName}</h1>
            <p className="text-[#707784] text-[13px] mt-1">View full patient profile</p>
          </div>
          <RelatedActionsDropdown patientId={patient.patient_id} patientName={patientName} onEdit={handleEdit} />
        </div>

        <Section title="Contact Information">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-32 h-32 rounded-lg overflow-hidden shrink-0 bg-gray-200 flex items-center justify-center">
              {patientPhoto ? (
                <img
                  src={patientPhoto}
                  alt={`Photo of ${patientName}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-1/2 h-1/2 text-gray-400" strokeWidth={1.5} aria-hidden="true" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="inline-flex items-center gap-[5px] bg-[#edf5ff] text-[#2266c8] border border-[#d5e6ff] px-[9px] py-1 rounded-full text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2675df]" aria-hidden="true" />
                  {val(patient.patient_type)}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`} aria-hidden="true" />
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <strong className="text-[#5f6672] block mb-1">Email</strong>
                  <span className="text-[#172033]">{val(patient.patient_email)}</span>
                </div>
                <div>
                  <strong className="text-[#5f6672] block mb-1">Primary Mobile</strong>
                  <span className="text-[#172033]">{patientMobile}</span>
                </div>
                <div>
                  <strong className="text-[#5f6672] block mb-1">Patient ID</strong>
                  <span className="text-[#172033] font-mono">{val(patient.patient_id)}</span>
                </div>
                <div>
                  <strong className="text-[#5f6672] block mb-1">Branch</strong>
                  <span className="text-[#172033]">{val(patient.branch?.branch_name)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <InfoCell icon={Calendar} title="Date of Birth" value={patientDOB} />
            <InfoCell icon={Calendar} title="Age" value={`${patientAge} yrs`} />
            <InfoCell icon={VenusAndMars} title="Gender" value={val(patient.patient_gender)} />
            <InfoCell icon={Droplet} title="Blood Group" value={val(patient.patient_blood_group)} />
            <InfoCell icon={IdCard} title="Marital Status" value={val(patient.patient_marital_status)} />
          </div>
        </Section>

        <Section title="Personal Information">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoCell icon={IdCard} title="Patient ID" value={val(patient.patient_id)} />
            <InfoCell icon={User} title="Nationality" value={val(patient.patient_nationality)} />
            <InfoCell icon={IdCard} title="Marital Status" value={val(patient.patient_marital_status)} />
            <InfoCell icon={User} title="Patient Type" value={val(patient.patient_type)} />
            <InfoCell icon={VenusAndMars} title="Gender" value={val(patient.patient_gender)} />
            <InfoCell icon={Droplet} title="Blood Group" value={val(patient.patient_blood_group)} />
            <InfoCell icon={Calendar} title="Date of Birth" value={patientDOB} />
            <InfoCell icon={Calendar} title="Age" value={`${patientAge} yrs`} />
          </div>
        </Section>

        <Section title="Address and Location">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoCell icon={MapPin} title="Address" value={val(patient.current_address)} span={2} />
            <InfoCell icon={MapPin} title="Area" value={val(patient.patient_area)} />
            <InfoCell icon={MapPin} title="Pincode" value={val(patient.patient_pincode)} />
            <InfoCell icon={MapPin} title="District" value={val(patient.patient_district)} />
            <InfoCell icon={MapPin} title="State" value={val(patient.patient_state)} />
            <InfoCell icon={Building2} title="Branch" value={val(patient.branch?.branch_name)} />
          </div>
        </Section>

        <Section title="Emergency Contact">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoCell icon={User} title="Contact Name" value={val(patient.emergency_name)} />
            <InfoCell icon={Phone} title="Relation" value={val(patient.emergency_relation)} />
            <InfoCell icon={Phone} title="Contact Number" value={patientEmergencyMobile} />
          </div>
        </Section>

        <Section title="Account">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoCell icon={User} title="Username" value={val(patient.user_table?.username)} />
            <InfoCell icon={Mail} title="Email" value={val(patient.patient_email)} />
            <InfoCell icon={Phone} title="Primary Mobile" value={patientMobile} />
            <InfoCell icon={Phone} title="Alternate Mobile" value={patientAltMobile} />
            <InfoCell icon={Building2} title="Registered Branch" value={val(patient.branch?.branch_name)} />
            <InfoCell icon={Calendar} title="Registered On" value={registeredOn} />
          </div>
        </Section>
      </main>
    </div>
  );
}