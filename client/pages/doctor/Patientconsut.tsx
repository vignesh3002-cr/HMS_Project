import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import API, { getActiveBranchId } from "../../api/axios";
import { employeeApi } from "../../api/employee.api";
import { getUser } from "../../utils/token";
import {
  patientApi,
  type PatientRecord,
} from "../../api/patient.api";
import {
  encounterApi,
  type EncounterRecord,
} from "../../api/encounter.api";
import { Calendar } from "../../components/ui/calendar";
import { ClinicalDetailsSection } from "../../components/hms/ClinicalDetailsSection";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";

const formatPickedDate = (date: Date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${date.getFullYear()}`;
};

const parsePickedDate = (value: string) => {
  const match = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return undefined;
  return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
};

const parseDateValue = (value?: string | null): Date | null => {
  if (!value) return null;
  const trimmed = value.trim();
  const dmy = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmy) {
    return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  }
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

type ToastMessage = string;

interface Medication {
  medication: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface ConsultationState {
  patientId?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  consultedBy?: string;
}

const StepCheckLogo = ({ active = false }: { active?: boolean }) => (
  <svg
    className="h-6 w-6"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11.9984 21.5984C17.2968 21.5984 21.5984 17.2968 21.5984 11.9984C21.5984 6.70005 17.2968 2.39844 11.9984 2.39844C6.70005 2.39844 2.39844 6.70005 2.39844 11.9984C2.39844 17.2968 6.70005 21.5984 11.9984 21.5984ZM16.4468 10.4468C16.9016 9.97598 16.8951 9.22754 16.4322 8.76466C15.9693 8.30177 15.2209 8.29527 14.75 8.75004L10.7984 12.7016L9.24684 11.15C8.77598 10.6953 8.02754 10.7018 7.56466 11.1647C7.10177 11.6275 7.09527 12.376 7.55004 12.8468L9.95004 15.2468C10.4186 15.7153 11.1782 15.7153 11.6468 15.2468L16.4468 10.4468Z"
      className={active ? "fill-green-500" : "fill-slate-400"}
    />
  </svg>
);

const Consultation: React.FC = () => {
  /* ============================================================
     STATE
  ============================================================ */

  const [toast, setToast] = useState<ToastMessage>("");

  const [consultationNotes, setConsultationNotes] = useState("");

  const [medications, setMedications] = useState<Medication[]>([]);

  const [selectedInvestigations, setSelectedInvestigations] = useState<
    string[]
  >([]);

  const [showLabReview, setShowLabReview] = useState(false);
  const [activeStep, setActiveStep] = useState("CONSULTATION");
  const [showProfilePortal, setShowProfilePortal] = useState(false);

  /* ============================================================
     PATIENT DATA (from dashboard appointment click)
  ============================================================ */

  const location = useLocation();
  const navigate = useNavigate();
  const consultationState = location.state as ConsultationState | null;

  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [patientError, setPatientError] = useState("");

  const [encounter, setEncounter] = useState<EncounterRecord | null>(null);
  const [encounterError, setEncounterError] = useState("");

  const formatDateDMY = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${day}-${month}-${date.getFullYear()}`;
  };

  const formatTimeAMPM = (value?: string | null) => {
    if (!value) return "";
    const timeMatch = value.match(
      /(?:T|\s)?(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?/
    );
    if (timeMatch) {
      let hour = Number(timeMatch[1]);
      const minute = timeMatch[2];
      const suffix = hour >= 12 ? "PM" : "AM";
      hour = hour % 12 || 12;
      return `${String(hour).padStart(2, "0")}:${minute} ${suffix}`;
    }
    return value;
  };

  useEffect(() => {
    const patientId = consultationState?.patientId;
    if (!patientId) return;
    let cancelled = false;
    setPatientError("");
    patientApi
      .getById(patientId)
      .then((response) => {
        if (cancelled) return;
        setPatient(response.data.data);
      })
      .catch((error) => {
        console.error("Failed to load patient:", error);
        if (!cancelled) {
          const message =
            error?.response?.data?.message ||
            error?.message ||
            "Failed to load patient data.";
          setPatientError(message);
          showToast(message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [consultationState?.patientId]);

  /* ============================================================
     LOAD ACTIVE ENCOUNTER
     Resolve the current open encounter for the consulted patient so
     the Clinical Details section can read/save encounter-specific
     (ECOG, symptoms) and patient-level (allergies, comorbidities)
     data. Only encounters belonging to the opened patient are used.
  ============================================================ */

  useEffect(() => {
    const patientId = consultationState?.patientId;
    if (!patientId) return;
    let cancelled = false;
    setEncounterError("");
    // GET /encounters is branch-scoped (branchScope middleware 403s
    // "Please select a branch first." when no branch is sent and the
    // user maps to more than one branch).
    const branchId = getActiveBranchId() ?? getUser()?.branch_id ?? undefined;
    encounterApi
      .getAll({ branchId, patientId, status: "OPEN", page: 1, limit: 5 })
      .then((response) => {
        if (cancelled) return;
        const encounters = response.data.data?.encounters ?? [];
        const current =
          encounters.find((item) => item.patient_id === patientId) ??
          encounters[0] ??
          null;
        setEncounter(current);
        if (!current) {
          setEncounterError(
            "No active encounter found for this patient. Clinical details cannot be loaded.",
          );
        }
      })
      .catch((error) => {
        console.error("Failed to load encounter:", error);
        if (!cancelled) {
          const message =
            error?.response?.data?.message ||
            error?.message ||
            "Failed to load encounter data.";
          setEncounterError(message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [consultationState?.patientId]);

  const patientName = patient
    ? [
        patient.patient_first_name,
        patient.patient_middle_name,
        patient.patient_last_name,
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  const patientPhoto = patient?.patient_photo_url || "";

  const patientAgeSex = patient
    ? `${patient.patient_age ?? "—"} Y / ${patient.patient_gender ?? ""}`
    : "";

  const patientDisplayId = patient?.patient_id || "";

  const patientPhone = patient?.patient_primary_mobile || "";

  const patientEmail = patient?.patient_email || "";

  const registeredOn = patient
    ? formatDateDMY(patient.user_table?.created_at)
    : "";

  const [visitDate, setVisitDate] = useState(
    formatDateDMY(consultationState?.appointmentDate)
  );

  const visitTime = formatTimeAMPM(consultationState?.appointmentTime);

  const consultedBy = consultationState?.consultedBy || "";

  /* ============================================================
     TOAST
  ============================================================ */

  const showToast = (message: string) => {
    setToast(message);

    window.setTimeout(() => {
      setToast("");
    }, 2200);
  };

  /* ============================================================
     LOAD DRAFT
  ============================================================ */

  useEffect(() => {
    const saved = localStorage.getItem("hms_consultation_draft");

    if (!saved) return;

    try {
      const data = JSON.parse(saved);

      if (data.consultationNotes) {
        setConsultationNotes(data.consultationNotes);
      }

      if (data.medications) {
        setMedications(data.medications);
      }
    } catch (error) {
      console.error("Draft loading failed", error);
    }
  }, []);

  /* ============================================================
     BACK
  ============================================================ */

  const goBack = () => {
    navigate("/doctor-dashboard");
  };

  /* ============================================================
     PROFILE
  ============================================================ */

  const viewProfile = () => {
    setShowProfilePortal(true);
  };

  /* ============================================================
     ADD MEDICATION
  ============================================================ */

  const addMedication = () => {
    setMedications((prev) => [
      ...prev,
      {
        medication: "",
        dose: "",
        frequency: "",
        duration: "",
        instructions: "",
      },
    ]);

    showToast("Medication row added");
  };

  /* ============================================================
     UPDATE MEDICATION
  ============================================================ */

  const updateMedication = (
    index: number,
    field: keyof Medication,
    value: string
  ) => {
    setMedications((prev) =>
      prev.map((medication, medicationIndex) =>
        medicationIndex === index
          ? {
              ...medication,
              [field]: value,
            }
          : medication
      )
    );
  };

  /* ============================================================
     INVESTIGATION
  ============================================================ */

  const toggleInvestigation = (name: string) => {
    setSelectedInvestigations((prev) =>
      prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name]
    );
  };

  /* ============================================================
     PRINT
  ============================================================ */

  const printSummary = () => {
    window.print();
  };

  /* ============================================================
     SAVE DRAFT
  ============================================================ */

  const saveDraft = () => {
    const data = {
      patient: patientName,
      patientId: patientDisplayId,
      consultationNotes,
      medications,
      investigations: selectedInvestigations,
    };

    localStorage.setItem(
      "hms_consultation_draft",
      JSON.stringify(data)
    );

    showToast("Consultation saved as draft");
  };

  /* ============================================================
     CANCEL
  ============================================================ */

  const cancelConsultation = () => {
    const result = window.confirm(
      "Are you sure you want to cancel this consultation?"
    );

    if (result) {
      showToast("Consultation cancelled");
    }
  };

  /* ============================================================
     NEXT
  ============================================================ */

  const proceedNext = () => {
    showToast("Proceeding to Lab Report Review");
  };

  /* ============================================================
     STEP
  ============================================================ */

  const selectStep = (name: string) => {
    setActiveStep(name);

    if (name === "LAB REPORT REVIEW") {
      setShowLabReview(true);
      return;
    }

    setShowLabReview(false);
    showToast(name);
  };

  /* ============================================================
     INVESTIGATIONS
  ============================================================ */

  const investigations = [
    "CBC",
    "CT Scan Chest",
    "Bone Scan",
    "USG",
    "CT Scan Abdomen",
    "ECHO",
    "RFT",
    "PET CT Scan",
    "ECG",
    "Serum Electrolytes",
    "MRI",
    "Pulmonary Function Test",
    "Chest X-Ray",
    "Other",
  ];

  /* ============================================================
     STEPS
  ============================================================ */

  const steps = [
    {
      name: "CONSULTATION",
      active: activeStep === "CONSULTATION",
      icon: <StepCheckLogo />,
    },
    {
      name: "LAB REPORT REVIEW",
      active: activeStep === "LAB REPORT REVIEW",
      icon:<StepCheckLogo />,
    },
    {
      name: "DIAGNOSIS",
      active: activeStep === "DIAGNOSIS",
      icon: <StepCheckLogo />,
        
    },
    {
      name: "TREATMENT PLAN",
      active: activeStep === "TREATMENT PLAN",
      icon: <StepCheckLogo />,
       
    },
    {
      name: "CHEMOTHERAPY ORDER",
      active: activeStep === "CHEMOTHERAPY ORDER",
       icon: <StepCheckLogo />,
    },
   
    {
      name: "DISCHARGE MEDICATION",
      active: activeStep === "DISCHARGE MEDICATION",
      icon: <StepCheckLogo />,
    },
    {
      name: "FOLLOW UP",
      active: activeStep === "FOLLOW UP",
      icon: <StepCheckLogo />,
    },
    {
      name: "SUMMARY",
      active: activeStep === "SUMMARY",
       icon: <StepCheckLogo />,
       
    },
  ];

  /* ============================================================
     JSX
  ============================================================ */

  if (showProfilePortal) {
    return <HMSPatientPortal />;
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 font-[Inter,sans-serif] text-slate-700 antialiased">

      {/* ========================================================
          APP
      ======================================================== */}

      <div className="mx-auto w-full bg-slate-50">

        <div className="relative flex w-full border border-slate-200 bg-slate-50">

          {/* ====================================================
              SIDEBAR
          ==================================================== */}

          <aside className="relative z-10 w-[280px] shrink-0 border-r border-slate-200 bg-white">

            {/* PATIENT HEADER */}

            <div className="flex h-[248px] w-full flex-col items-center border-b border-slate-50 px-6 pt-6">

              <div className="h-24 w-24 overflow-hidden rounded-full border border-slate-200 bg-slate-100">

                <img
                  src={patientPhoto}
                  alt={patientName}
                  className="h-full w-full object-cover"
                />

              </div>

              <div className="w-full pt-4 text-center text-xl font-bold leading-7 text-slate-800">
                {patientName}
              </div>

              <div className="w-full pb-2 text-center text-sm leading-5 text-slate-500">
                {patientAgeSex}
              </div>

              <div className="h-6 rounded bg-slate-100 px-3 py-1 text-xs font-semibold leading-4 text-slate-600">
                {patientDisplayId}
              </div>

              <div className="w-full pt-4 text-center text-sm font-bold leading-5 tracking-[-0.35px] text-blue-700">
                {""}
              </div>

            </div>

            {/* PATIENT DETAILS */}

            <div className="flex w-full flex-col gap-4 p-6">

              {/* PHONE */}

              <div className="flex w-full items-start gap-3">

                <div className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center text-slate-400">

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    className="h-4 w-4"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>

                </div>

                <div className="flex flex-col">

                  <div className="text-[10px] font-bold leading-[15px] tracking-[0.5px] text-slate-400">
                    PHONE
                  </div>

                  <div className="whitespace-nowrap text-sm font-medium leading-5 text-slate-700">
                    {patientPhone}
                  </div>

                </div>

              </div>

              {/* EMAIL */}

              <div className="flex w-full items-start gap-3">

                <div className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center text-slate-400">

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    className="h-4 w-4"
                  >
                    <rect
                      x="3"
                      y="5"
                      width="18"
                      height="14"
                      rx="2"
                    />

                    <path d="m3 7 9 6 9-6" />
                  </svg>

                </div>

                <div className="flex flex-col">

                  <div className="text-[10px] font-bold leading-[15px] tracking-[0.5px] text-slate-400">
                    EMAIL
                  </div>

                  <div className="whitespace-nowrap text-sm font-medium leading-5 text-slate-700">
                    {patientEmail}
                  </div>

                </div>

              </div>

              {/* MEASUREMENTS */}

              <div className="grid w-full grid-cols-2 gap-x-4 gap-y-4 pt-2">

                <div className="flex flex-col">
                  <div className="text-[10px] font-bold uppercase leading-[15px] tracking-[0.5px] text-slate-400">
                    HEIGHT
                  </div>
                  <div className="text-sm font-bold leading-5 text-slate-800">
                    {""}
                  </div>
                </div>

                <div className="flex flex-col">
                  <div className="text-[10px] font-bold uppercase leading-[15px] tracking-[0.5px] text-slate-400">
                    WEIGHT
                  </div>
                  <div className="text-sm font-bold leading-5 text-slate-800">
                    {""}
                  </div>
                </div>

                <div className="flex flex-col">
                  <div className="text-[10px] font-bold uppercase leading-[15px] tracking-[0.5px] text-slate-400">
                    BSA
                  </div>
                  <div className="text-sm font-bold leading-5 text-slate-800">
                    {""}
                  </div>
                </div>

                <div className="flex flex-col">
                  <div className="text-[10px] font-bold uppercase leading-[15px] tracking-[0.5px] text-slate-400">
                    BMI
                  </div>
                  <div className="text-sm font-bold leading-5 text-slate-800">
                    {""}
                  </div>
                </div>

              </div>

              {/* PROFILE */}

              <button
                onClick={viewProfile}
                className="h-9 w-full rounded-md border border-blue-600 bg-white text-sm font-semibold leading-5 text-blue-600 transition hover:bg-blue-50"
              >
                View Full Profile
              </button>

            </div>

            {/* FOOTER */}

            <div className="absolute bottom-0 left-0 right-0 flex h-[50px] items-center justify-center border-t border-slate-100 text-xs leading-4 text-slate-400">
              Registered on {registeredOn}
            </div>

          </aside>

          {/* ====================================================
              MAIN
          ==================================================== */}

          <main className="relative flex min-w-0 flex-1 flex-col bg-slate-50">

            {/* ==================================================
                HEADER
            ================================================== */}

            <header className="z-30 flex h-16 w-full shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">

              <div className="flex items-center gap-4">

                <button
                  onClick={goBack}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-transparent p-2 transition hover:bg-slate-50"
                >

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#334155"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M19 12H5" />
                    <path d="m12 19-7-7 7-7" />
                  </svg>

                </button>

                <div className="text-lg font-bold leading-7 text-slate-800">
                  Patients
                </div>

              </div>

              <div className="flex items-center gap-6">

                {/* NOTIFICATION */}

                <div className="relative h-6 w-6">

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6"
                  >
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>

                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />

                </div>

                {/* USER */}

                <div className="flex items-center gap-3">

                  <div className="text-sm font-bold leading-5 text-slate-700">
                    HMS
                  </div>

                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-950 text-xs font-bold leading-4 text-white">
                    DR
                  </div>

                </div>

              </div>

            </header>

            {/* ==================================================
                STEPS
            ================================================== */}

            <div className="z-20 h-[88px] w-full shrink-0 overflow-hidden bg-white">

              <div className="hide-scrollbar ml-0 flex h-[88.5px] w-full overflow-x-auto">

                {steps.map((step, index) => (

                  <button
                    key={step.name}
                    onClick={() => selectStep(step.name)}
                    className="relative h-[88.5px] w-[298.66px] shrink-0 bg-white"
                  >

                    {/* ICON */}

                    <div className="absolute left-1/2 top-0 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-white">

                      {typeof step.icon === "string" ? (
                        <img
                          src={step.icon}
                          alt=""
                          className="h-6 w-6"
                        />
                      ) : (
                        <StepCheckLogo active={step.active} />
                      )}

                    </div>

                    {/* LABEL */}

                    <div className="absolute left-1/2 top-[47px] -translate-x-1/2 whitespace-nowrap text-[11px] font-bold uppercase leading-[16.5px] tracking-[1.1px] text-gray-800">

                      {step.name}

                    </div>

                    {/* BAR */}

                    <div
                      className={`absolute left-0 right-0 top-[80.5px] h-2 rounded-full ${
                        step.active
                          ? "bg-green-500"
                          : "bg-white"
                      }`}
                    />

                  </button>

                ))}

              </div>

            </div>

            {/* ==================================================
                CONTENT
            ================================================== */}

            <section className="w-full bg-slate-50 px-[22px] py-7">

              <div className="flex w-full flex-col gap-5">

                {showLabReview ? (
                  <LabReview embedded />
                ) : activeStep === "DIAGNOSIS" ? (
                  <Diagnosis embedded patientId={patientDisplayId} />
                ) : activeStep === "TREATMENT PLAN" ? (
                  <TreatmentPlan
                    embedded
                    patientId={patientDisplayId}
                    onNext={() => selectStep("CHEMOTHERAPY ORDER")}
                  />
                ) : activeStep === "CHEMOTHERAPY ORDER" ? (
                  <ChemotherapyOrder
                    embedded
                    patientId={patientDisplayId}
                  />
                ) : activeStep === "DISCHARGE MEDICATION" ? (
                  <DischargeMedication embedded />
                ) : activeStep === "FOLLOW UP" ? (
                  <FollowUp embedded patientId={patientDisplayId} />
) : activeStep === "SUMMARY" ? (
                  <Summary embedded patientId={patientDisplayId} />
                ) : (
                  <>
                    {/* =================================================
                    CONSULTATION SUMMARY
                ================================================= */}

                <section className="flex w-full flex-col gap-5 rounded-xl border border-slate-200 bg-white p-5">

                  <div className="text-lg font-bold leading-7 text-slate-800">
                    Consultation Summary
                  </div>

                  {/* SUMMARY GRID */}

                  <div className="grid w-full grid-cols-4 gap-x-4">

                    {/* DATE */}

                    <div className="flex min-w-0 flex-col gap-1">

                      <label className="text-xs font-bold leading-4 text-slate-500">
                        Visit Date &amp; Time
                      </label>

                      <div className="flex w-full gap-2">

                        <Popover>
                          <PopoverTrigger asChild>
                            <div className="relative min-w-0 flex-1 cursor-pointer">

                              <input
                                className="h-[38px] w-full rounded-md border border-slate-200 bg-white px-[13px] pl-[33px] text-[9px] leading-5 text-slate-700 outline-none"
                                value={visitDate}
                                readOnly
                              />

                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#94a3b8"
                                strokeWidth="1.7"
                                className="pointer-events-none absolute left-2 top-2.5 h-4 w-4"
                              >
                                <rect
                                  x="3"
                                  y="4"
                                  width="18"
                                  height="17"
                                  rx="2"
                                />
                                <path d="M16 2v4" />
                                <path d="M8 2v4" />
                                <path d="M3 10h18" />
                              </svg>

                            </div>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={parsePickedDate(visitDate)}
                              onSelect={(date) => {
                                if (date instanceof Date) {
                                  setVisitDate(formatPickedDate(date));
                                }
                              }}
                            />
                          </PopoverContent>
                        </Popover>

                        <div className="relative min-w-0 flex-1">

                          <input
                            className="h-[38px] w-full rounded-md border border-slate-200 bg-white px-[13px] pl-[33px] text-[11px] leading-5 text-slate-700 outline-none"
                            value={visitTime}
                            readOnly
                          />

                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#94a3b8"
                            strokeWidth="1.7"
                            className="pointer-events-none absolute left-2 top-2.5 h-4 w-4"
                          >
                            <circle
                              cx="12"
                              cy="12"
                              r="9"
                            />
                            <path d="M12 7v5l3 2" />
                          </svg>

                        </div>

                      </div>

                    </div>

                    {/* FIRST VISIT */}

                    <div className="flex min-w-0 flex-col gap-1">

                      <label className="text-xs font-bold leading-4 text-slate-500">
                        First Visit for this Treatment
                      </label>

                      <input
                        className="h-[38px] w-full rounded-md border border-slate-200 bg-white px-[13px] text-sm leading-5 text-slate-700 outline-none"
                        value={registeredOn}
                        readOnly
                      />

                    </div>

                    {/* CONSULTED BY */}

                    <div className="flex min-w-0 flex-col gap-1">

                      <label className="text-xs font-bold leading-4 text-slate-500">
                        Consulted By
                      </label>

                      <div className="relative h-[38px]">

                        <select
                          defaultValue={consultedBy}
                          className="h-[38px] w-full appearance-none rounded-md border border-slate-200 bg-white px-[13px] pr-10 text-sm leading-5 text-slate-700 outline-none"
                        >

                          {consultedBy && (
                            <option value={consultedBy}>
                              {consultedBy}
                            </option>
                          )}

                        </select>

                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#94a3b8"
                          strokeWidth="1.8"
                          className="pointer-events-none absolute right-3 top-2.5 h-4 w-4"
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>

                      </div>

                    </div>

                    {/* VISIT TYPE */}

                    <div className="flex min-w-0 flex-col gap-1">

                      <label className="text-xs font-bold leading-4 text-slate-500">
                        Visit Type
                      </label>

                      <div className="relative h-[38px]">

                        <select className="h-[38px] w-full appearance-none rounded-md border border-slate-200 bg-white px-[13px] pr-10 text-sm leading-5 text-slate-700 outline-none">

                          <option value="">
                            Select Visit Type
                          </option>

                          <option>
                            Follow Up
                          </option>

                          <option>
                            New Consultation
                          </option>

                        </select>

                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#94a3b8"
                          strokeWidth="1.8"
                          className="pointer-events-none absolute right-3 top-2.5 h-4 w-4"
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>

                      </div>

                    </div>

                  </div>

                  {/* LOWER */}

                  <div className="grid w-full grid-cols-2 gap-x-6 pt-2">

                    {/* NOTES */}

                    <div className="flex flex-col gap-2">

                      <label className="text-xs font-bold leading-4 text-slate-500">
                        Consultation Notes
                      </label>

                      <textarea
                        value={consultationNotes}
                        onChange={(e) =>
                          setConsultationNotes(e.target.value)
                        }
                        className="h-40 w-full resize-none rounded-md border border-slate-200 bg-white p-[13px] text-sm leading-[22.75px] text-slate-600 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
                      />

                    </div>

                    {/* CLINICAL */}

                    <div className="flex flex-col gap-4">

                      {/* PERFORMANCE STATUS / SYMPTOMS / ALLERGIES /
                          COMORBIDITIES — backed by the Clinical Details
                          API (see components/hms/ClinicalDetailsSection.tsx) */}

                      {encounterError && (
                        <div className="flex w-full flex-col gap-2 rounded-md border border-red-200 bg-red-50 p-3">
                          <div className="text-xs font-medium leading-4 text-red-700">
                            {encounterError}
                          </div>
                        </div>
                      )}

                      {encounter ? (
                        <ClinicalDetailsSection
                          patientId={consultationState?.patientId}
                          encounterNo={encounter.encounter_no}
                        />
                      ) : (
                        !encounterError && (
                          <div className="flex items-center gap-2 text-xs leading-4 text-slate-500">
                            Loading clinical details...
                          </div>
                        )
                      )}

                    </div>

                  </div>

                </section>

                {/* =================================================
                    INVESTIGATIONS
                ================================================= */}

                <section className="flex w-full flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5">

                  <div className="text-lg font-bold leading-7 text-slate-800">
                    Investigations / Scans
                  </div>

                  <div className="grid w-full grid-cols-3 grid-rows-5 gap-y-3">

                    {investigations.map((investigation) => (

                      <label
                        key={investigation}
                        className="flex h-5 cursor-pointer items-center gap-2 whitespace-nowrap text-sm leading-5 text-slate-700"
                      >

                        <input
                          type="checkbox"
                          checked={selectedInvestigations.includes(
                            investigation
                          )}
                          onChange={() =>
                            toggleInvestigation(investigation)
                          }
                          className="h-4 w-4 shrink-0 cursor-pointer appearance-none rounded border border-slate-300 bg-white checked:border-blue-600 checked:bg-blue-600"
                        />

                        <span>
                          {investigation}
                        </span>

                      </label>

                    ))}

                  </div>

                  <div className="flex w-full flex-col gap-2 pt-2">

                    <label className="text-xs font-bold leading-4 text-slate-500">
                      Additional Instructions (if any)
                    </label>

                    <input
                      type="text"
                      placeholder="Enter any special instructions for the selected investigations"
                      className="h-[38px] w-full rounded-md border border-slate-200 bg-slate-50 px-[9px] text-sm text-gray-500 outline-none"
                    />

                  </div>

                </section>

                {/* =================================================
                    PRESCRIPTION
                ================================================= */}

                

                {/* =================================================
                    ACTION BUTTONS
                ================================================= */}

                <div className="flex w-full items-center justify-between">

                  {/* PRINT */}

                  <div className="h-9 w-[213px]">

                    <button
                      onClick={printSummary}
                      className="flex h-9 w-[213px] items-center justify-center gap-2 rounded-lg border-0 bg-blue-700 px-[25px] py-[9px] text-sm font-bold leading-5 text-white"
                    >

                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-6 w-6"
                      >
                        <path d="M6 9V2h12v7" />

                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />

                        <rect
                          x="6"
                          y="14"
                          width="12"
                          height="8"
                        />
                      </svg>

                      <span>
                        Print Summary
                      </span>

                    </button>

                  </div>

                  {/* RIGHT ACTIONS */}

                  <div className="flex items-start gap-2.5">

                    {/* CANCEL */}

                    <button
                      onClick={cancelConsultation}
                      className="flex h-9 w-fit items-center justify-center rounded-lg border border-slate-300 bg-white px-[25px] py-[9px] text-sm font-bold leading-5 text-slate-600"
                    >
                      Cancel
                    </button>

                    {/* DRAFT */}

                    <button
                      onClick={saveDraft}
                      className="flex h-9 w-fit items-center justify-center rounded-lg border border-blue-200 bg-white px-[25px] py-[9px] text-sm font-bold leading-5 text-blue-600 "
                    >
                      Save as Draft
                    </button>

                    {/* NEXT */}

                    <button
                      onClick={proceedNext}
                      className="flex h-9 w-[213px] items-center justify-center gap-2 rounded-lg border-0 bg-blue-700 px-[25px] py-[9px] text-sm font-bold leading-5 text-white"
                    >

                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <path d="m9 18 6-6-6-6" />
                      </svg>

                      <span>
                        Proceed to Next
                      </span>

                    </button>

                  </div>

                </div>

                  </>
                )}

              </div>

            </section>

          </main>

        </div>

      </div>

      {/* ========================================================
          TOAST
      ======================================================== */}

      <div
        className={`fixed bottom-6 right-6 z-[9999] min-w-[220px] rounded-lg bg-slate-800 px-4 py-3 text-sm text-white shadow-lg transition-all duration-200 ${
          toast
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-5 opacity-0"
        }`}
      >
        {toast}
      </div>

      {/* ========================================================
          PRINT STYLES
      ======================================================== */}

      <style>{`
        @media print {
          body {
            background: white !important;
          }

          button {
            cursor: default !important;
          }

          .fixed {
            display: none !important;
          }
        }
      `}</style>

    </div>
  );
};

export default Consultation;

/* ============================================================
   LAB REVIEW COMPONENT
   (combined from client/pages/doctor/labreview.tsx —
    renamed App → LabReview, duplicate React/useState import
    removed so it can live in this file)
============================================================ */

interface Investigation {
  name: string;
  orderedDate: string;
  status: "Completed";
}

const investigations: Investigation[] = [];

const CheckIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 20 20"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
    />
  </svg>
);

const BackIcon = () => (
  <svg
    className="h-6 w-6"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M10 19l-7-7m0 0l7-7m-7 7h18"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const NotificationIcon = () => (
  <svg
    className="h-6 w-6"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ArrowRightIcon = () => (
  <svg
    className="h-5 w-5"
    fill="currentColor"
    viewBox="0 0 20 20"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
    />
  </svg>
);

const LabReview: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const [observations, setObservations] = useState("");
  const [notifications, setNotifications] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCancel = () => {
    setObservations("");
    setSaved(false);
  };

  const handleSaveDraft = () => {
    setSaved(true);
  };

  const handleProceed = () => {
    alert("Proceeding to Treatment Plan");
  };

  const handleViewReport = (name: string) => {
    alert(`Viewing report: ${name}`);
  };

  const content = (
    <div className="space-y-6">
      {/* Laboratory Investigations */}
      <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-8 py-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Laboratory Investigations
          </h2>

          <span className="text-sm font-medium text-gray-500">
            {investigations.length} Reports Found
          </span>
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-white">
                <th className="w-2/5 px-8 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                  Investigation Name
                </th>

                <th className="w-1/5 px-8 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                  Ordered Date
                </th>

                <th className="w-1/5 px-8 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                  Status
                </th>

                <th className="w-1/5 px-8 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="bg-white text-gray-700">
              {investigations.map((investigation) => (
                <tr
                  key={investigation.name}
                  className="border-b border-[#F3F4F6] transition-colors last:border-b-0 hover:bg-gray-50"
                >
                  <td className="px-8 py-5 text-[15px] font-semibold">
                    {investigation.name}
                  </td>

                  <td className="px-8 py-5 text-gray-600">
                    {investigation.orderedDate}
                  </td>

                  <td className="px-8 py-5">
                    <span className="inline-flex items-center rounded-full bg-[#DCFCE7] px-3 py-1 text-sm font-semibold text-[#166534]">
                      {investigation.status}
                    </span>
                  </td>

                  <td className="px-8 py-5 text-right">
                    <button
                      type="button"
                      onClick={() => handleViewReport(investigation.name)}
                      className="inline-flex items-center justify-center rounded-lg bg-[#F0F5FF] px-4 py-2 text-sm font-semibold text-[#2563EB] transition-colors hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                    >
                      View Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Clinical Remarks */}
      <section className="rounded-xl border border-gray-100 bg-white p-8 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">
          Clinical Remarks
        </h2>

        <div className="space-y-3">
          <label
            htmlFor="observations"
            className="block text-[13px] font-bold uppercase tracking-widest text-[#9CA3AF]"
          >
            Observations & Notes
          </label>

          <textarea
            id="observations"
            name="observations"
            value={observations}
            onChange={(event) => setObservations(event.target.value)}
            placeholder="Enter clinical observations based on the laboratory reports..."
            rows={6}
            className="block w-full resize-y rounded-xl border-[#E5E7EB] bg-[#F8FAFC] p-4 text-[15px] text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        {saved && (
          <p className="mt-3 text-sm font-medium text-green-600">
            Draft saved successfully.
          </p>
        )}
      </section>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FB] text-[#1F2937]">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Go back"
            onClick={() => window.history.back()}
            className="text-gray-600 transition-colors hover:text-gray-900 focus:outline-none"
          >
            <BackIcon />
          </button>

          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            Patients
          </h1>
        </div>

        <div className="flex items-center gap-6">
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => setNotifications((prev) => !prev)}
            className="relative text-gray-500 transition-colors hover:text-gray-700 focus:outline-none"
          >
            <NotificationIcon />

            <span className="absolute right-0 top-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />

            {notifications && (
              <div className="absolute right-0 top-8 w-52 rounded-lg border border-gray-200 bg-white p-3 text-left text-sm text-gray-600 shadow-lg">
                No new notifications
              </div>
            )}
          </button>

          <div className="flex items-center gap-3">
            <span className="font-semibold text-gray-700">HMS</span>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1E3A8A] font-bold text-white shadow-sm">
              DR
            </div>
          </div>
        </div>
      </header>

      {/* Workflow Stepper */}
      <section className="relative bg-[#F8F9FB] pb-0 pt-8">
        <div className="mx-auto max-w-5xl px-6">
          <div className="relative flex items-end justify-between">
            {/* Consultation */}
            <div className="relative z-10 flex flex-1 flex-col items-center pb-6">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-400 text-white">
                <CheckIcon />
              </div>

              <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
                Consultation
              </span>

              <div className="absolute bottom-0 left-0 right-[-50%] h-1 rounded bg-white" />
            </div>

            {/* Lab Report Review */}
            <div className="relative z-10 flex flex-1 flex-col items-center pb-6">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white ring-4 ring-green-100">
                <CheckIcon />
              </div>

              <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
                Lab Report Review
              </span>

              <div className="absolute bottom-0 left-0 right-0 mx-auto h-1 w-[95%] rounded bg-green-500" />
            </div>

            {/* Diagnosis */}
            <div className="relative z-10 flex flex-1 flex-col items-center pb-6">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-400 text-white">
                <CheckIcon />
              </div>

              <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
                Diagnosis
              </span>

              <div className="absolute bottom-0 left-[-50%] right-0 h-1 rounded bg-white" />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-grow px-6 py-8">
        <div className="mx-auto max-w-5xl space-y-6">
          {content}
        </div>
      </main>

      {/* Footer */}
      <footer className="sticky bottom-0 z-20 border-t border-gray-200 bg-white px-6 py-6">
        <div className="mx-auto flex max-w-5xl justify-center gap-4">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-xl border border-gray-300 px-8 py-3 text-[15px] font-bold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            className="rounded-xl border border-blue-600 px-8 py-3 text-[15px] font-bold text-blue-600 transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Save as Draft
          </button>

          <button
            type="button"
            onClick={handleProceed}
            className="flex items-center gap-2 rounded-xl bg-[#2563EB] px-8 py-3 text-[15px] font-bold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Proceed to Treatment Plan
            <ArrowRightIcon />
          </button>
        </div>
      </footer>
    </div>
  );
};

/* ============================================================
   DIAGNOSIS COMPONENT
   (combined from client/pages/doctor/diagonisis.tsx —
    renamed App → Diagnosis, duplicate React import removed,
    CheckIcon / BackIcon / NotificationIcon reused from above)
============================================================ */

type FormData = {
  type: string;
  subType: string;
  histomorphology: string;
  cancerStage: string;
  grade: string;
  tnmStage: string;
  icdCode: string;
  notes: string;
};

type CancerTypeItem = {
  cancer_type_id: string;
  cancer_type: string;
  icd10: string | null;
  staging_system: string | null;
};

type CancerSubtypeItem = {
  subtype_id: string;
  subtype_name: string;
  icd10_subtype: string | null;
};

type StagingReferenceItem = {
  stage_ref_id: string;
  cancer_type_id: string;
  subtype_label: string | null;
  staging_system: string | null;
  stage_label: string | null;
  tnm_criteria: string | null;
  risk_system: string | null;
  risk_category: string | null;
  risk_criteria: string | null;
  os_5yr_approx: string | null;
  guideline_source: string | null;
};

const ChevronDownIcon = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 20 20"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
      clipRule="evenodd"
    />
  </svg>
);

const DoubleArrowIcon = () => (
  <svg
    className="h-4 w-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M5 12h12"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13 6l6 6-6 6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Diagnosis: React.FC<{ embedded?: boolean; patientId?: string }> = ({
  embedded = false,
  patientId,
}) => {
  const location = useLocation();
  const statePatientId =
    (location.state as ConsultationState | null)?.patientId ?? "";
  const resolvedPatientId = patientId || statePatientId;

  const [formData, setFormData] = useState<FormData>({
    type: "",
    subType: "",
    histomorphology: "",
    cancerStage: "",
    grade: "",
    tnmStage: "",
    icdCode: "",
    notes: "",
  });

  const diagnosisDraftKey = `hms_diagnosis_form_${resolvedPatientId}`;

  useEffect(() => {
    if (!resolvedPatientId) return;
    const saved = localStorage.getItem(diagnosisDraftKey);

    if (!saved) return;

    try {
      const data = JSON.parse(saved) as Partial<FormData>;
      setFormData((previous) => ({ ...previous, ...data }));
    } catch (error) {
      console.error("Failed to restore diagnosis draft:", error);
    }
  }, [diagnosisDraftKey, resolvedPatientId]);

  useEffect(() => {
    if (!resolvedPatientId) return;
    localStorage.setItem(diagnosisDraftKey, JSON.stringify(formData));
  }, [formData, diagnosisDraftKey, resolvedPatientId]);

  const [cancerTypes, setCancerTypes] = useState<CancerTypeItem[]>([]);
  const [subtypes, setSubtypes] = useState<CancerSubtypeItem[]>([]);
  const [stageLabels, setStageLabels] = useState<string[]>([]);
  const [tnmStages, setTnmStages] = useState<string[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [diagnosisLoading, setDiagnosisLoading] = useState(false);
  const [diagnosisError, setDiagnosisError] = useState("");
  const [savingDiagnosis, setSavingDiagnosis] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const diagnosisRequestRef = useRef(0);
  const stagingRequestRef = useRef(0);
  const diagnosisCatalogRef = useRef<
    { diagnosis_id: string; icd_code: string }[]
  >([]);

  const loadDiagnosisCatalog = async () => {
    const categoriesResponse = await API.get<{
      success: boolean;
      data: { categories: { diagnosis_catogory_id: string }[] };
    }>("/diagnosis/categories");
    const categories = (
      categoriesResponse.data.data?.categories ?? []
    ).filter((category) => Boolean(category.diagnosis_catogory_id));
    const responses = await Promise.all(
      categories.map((category) =>
        API.get<{
          success: boolean;
          data: {
            diagnoses: { diagnosis_id: string; icd_code: string }[];
          };
        }>(`/diagnosis/categories/${category.diagnosis_catogory_id}/diagnoses`)
      )
    );
    return responses.flatMap(
      (response) => response.data.data?.diagnoses ?? []
    );
  };

  const loadSubtypesForCancerType = (cancerTypeId: string) => {
    if (!cancerTypeId) return;
    const requestId = ++diagnosisRequestRef.current;
    setDiagnosisLoading(true);
    setDiagnosisError("");

    API.get<{ success: boolean; data: CancerSubtypeItem[] }>(
      `/oncology/reference/cancer-types/${cancerTypeId}/subtypes`
    )
      .then((response) => {
        if (requestId !== diagnosisRequestRef.current) return;
        const items = response.data.data;
        setSubtypes(items);
        const first = items[0];
        if (first) {
          setFormData((previous) => ({
            ...previous,
            icdCode: first.icd10_subtype ?? "",
          }));
        }
      })
      .catch((error) => {
        console.error("Failed to load cancer subtypes:", error);
        if (requestId === diagnosisRequestRef.current) {
          setDiagnosisError(
            error?.response?.data?.message || "Failed to load cancer subtypes."
          );
        }
      })
      .finally(() => {
        if (requestId === diagnosisRequestRef.current) {
          setDiagnosisLoading(false);
        }
      });
  };

  const loadStagesForCancerType = (cancerTypeId: string) => {
    if (!cancerTypeId) return;
    const requestId = ++stagingRequestRef.current;
    setDiagnosisLoading(true);
    setDiagnosisError("");
    setTnmStages([]);
    setGrades([]);

    API.get<{ success: boolean; data: StagingReferenceItem[] }>(
      "/oncology/reference/staging",
      { params: { cancer_type_id: cancerTypeId } }
    )
      .then((response) => {
        if (requestId !== stagingRequestRef.current) return;
        const items = response.data.data;
        setStageLabels(
          items
            .map((item) => item.stage_label)
            .filter((label): label is string => Boolean(label))
        );
        const tnmOptions: string[] = [];
        const gradeOptions: string[] = [];
        for (const item of items) {
          const criteria = (item.tnm_criteria ?? "")
            .replace(/\([^)]*\)/g, " ")
            .replace(/\s+/g, " ")
            .replace(/\s*[-–]\s*$/g, "")
            .trim();
          if (criteria && /(\b[TNM]\d|\bAny\s+[TNM])/i.test(criteria)) {
            if (!tnmOptions.includes(criteria)) tnmOptions.push(criteria);
          }
          const gradeSource = [
            item.stage_label,
            item.staging_system,
            item.subtype_label,
            item.tnm_criteria,
            item.risk_criteria,
          ]
            .filter((value): value is string => Boolean(value))
            .join(" ");
          for (const match of gradeSource.matchAll(
            /grade\s+group\s*[\d\-–]+|grade\s+[\d\-–]+/gi
          )) {
            const grade = match[0]
              .replace(/\s+/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase());
            if (!gradeOptions.includes(grade)) gradeOptions.push(grade);
          }
        }
        setTnmStages(tnmOptions.sort());
        setGrades(gradeOptions.sort());
        setFormData((previous) => ({
          ...previous,
          cancerStage: "",
        }));
      })
      .catch((error) => {
        console.error("Failed to load cancer stages:", error);
        if (requestId === stagingRequestRef.current) {
          setDiagnosisError(
            error?.response?.data?.message || "Failed to load cancer stages."
          );
        }
      })
      .finally(() => {
        if (requestId === stagingRequestRef.current) {
          setDiagnosisLoading(false);
        }
      });
  };

  useEffect(() => {
    let cancelled = false;

    API.get<{ success: boolean; data: CancerTypeItem[] }>(
      "/oncology/reference/cancer-types"
    )
      .then((response) => {
        if (cancelled) return;
        const fetched = response.data.data;
        setCancerTypes(fetched);

        const initial = fetched[0];

        if (initial) {
          setFormData((previous) => ({
            ...previous,
            type: initial.cancer_type,
            icdCode: initial.icd10 ?? "",
          }));
          loadSubtypesForCancerType(initial.cancer_type_id);
          loadStagesForCancerType(initial.cancer_type_id);
        }
      })
      .catch((error) => {
        console.error("Failed to load cancer types:", error);
        if (!cancelled) {
          setDiagnosisError(
            error?.response?.data?.message || "Failed to load cancer types."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadDiagnosisCatalog()
      .then((diagnoses) => {
        if (cancelled) return;
        diagnosisCatalogRef.current = diagnoses;
      })
      .catch((error) => {
        console.error("Failed to load diagnosis catalog:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleTypeChange = (value: string) => {
    setFormData((previous) => ({
      ...previous,
      type: value,
      subType: "",
      icdCode: "",
    }));

    const cancerType = cancerTypes.find(
      (item) => item.cancer_type === value
    );

    if (cancerType) {
      loadSubtypesForCancerType(cancerType.cancer_type_id);
      loadStagesForCancerType(cancerType.cancer_type_id);
    }
  };

  const handleNext = async () => {
    if (!resolvedPatientId) {
      setDiagnosisError(
        "Patient is not selected. Open this page from a patient consultation to continue."
      );
      return;
    }

    if (!formData.type || !formData.subType) {
      setDiagnosisError(
        "Please select a cancer type and sub type before continuing."
      );
      return;
    }

    if (!formData.cancerStage) {
      setDiagnosisError("Please select a cancer stage before continuing.");
      return;
    }

    const cancerType = cancerTypes.find(
      (item) => item.cancer_type === formData.type
    );
    const subtype = subtypes.find(
      (item) => item.subtype_name === formData.subType
    );

    if (!cancerType || !subtype) {
      setDiagnosisError(
        "Selected cancer type or sub type is invalid. Please re-select."
      );
      return;
    }

    let tStage: string | null = null;
    let nStage: string | null = null;
    let mStage: string | null = null;

    if (/^T/i.test(formData.tnmStage)) {
      const [t, n, m] = formData.tnmStage.trim().split(/\s+/);
      tStage = t ?? null;
      nStage = n ?? null;
      mStage = m ?? null;
    } else if (formData.tnmStage) {
      const m = formData.tnmStage.trim().split(/\s+/).pop() ?? null;
      mStage = m && /^M/i.test(m) ? m : null;
    }

    const normalizedIcd = formData.icdCode.trim().toUpperCase();
    let catalog = diagnosisCatalogRef.current;

    if (catalog.length === 0) {
      try {
        catalog = await loadDiagnosisCatalog();
        diagnosisCatalogRef.current = catalog;
      } catch (error) {
        console.error("Failed to load diagnosis catalog:", error);
      }
    }

    const matched = catalog.find(
      (entry) => (entry.icd_code ?? "").toUpperCase() === normalizedIcd
    );
    const diagnosisId = matched?.diagnosis_id ?? catalog[0]?.diagnosis_id ?? "";

    if (!diagnosisId) {
      setDiagnosisError(
        "Could not resolve a diagnosis entry for this patient. Please try again."
      );
      return;
    }

    setSavingDiagnosis(true);
    setDiagnosisError("");

    try {
      const response = await API.post<{
        success: boolean;
        data: {
          staging_detail_id: string;
          data?: { diagnosis_id?: string };
        };
      }>("/oncology/staging-details", {
        patient_id: resolvedPatientId,
        diagnosis_id: diagnosisId,
        cancer_type_id: cancerType.cancer_type_id,
        cancer_subtype_id: subtype.subtype_id,
        clinical_stage: formData.cancerStage,
        t_stage: tStage,
        n_stage: nStage,
        m_stage: mStage,
      });

      const created = response.data?.data;
      localStorage.setItem(
        "hms_diagnosis_selection",
        JSON.stringify({
          cancer_type_id: cancerType.cancer_type_id,
          subtype_id: subtype.subtype_id,
          staging_detail_id: created?.staging_detail_id ?? "",
          diagnosis_id: created?.data?.diagnosis_id ?? diagnosisId,
        })
      );

      alert("Diagnosis saved. Proceeding to the next step.");
    } catch (error: any) {
      console.error("Failed to save staging details:", error);
      setDiagnosisError(
        error?.response?.data?.message ||
          "Failed to save staging details. Please try again."
      );
    } finally {
      setSavingDiagnosis(false);
    }
  };

  const handleBack = () => {
    window.history.back();
  };

  const content = (
    <section className="flex w-full flex-1 flex-col">
      <h2 className="mb-8 text-2xl font-bold text-[#334155]">
        Diagnosis
      </h2>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleNext();
        }}
        className="space-y-8"
      >
        {/* Two Column Fields */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
          {/* Cancer Type */}
          <div>
            <label
              htmlFor="type"
              className="mb-2 block text-sm font-semibold text-gray-600"
            >
              Cancer Type
            </label>

            <div className="relative">
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={(event) =>
                  handleTypeChange(event.target.value)
                }
                className="block w-full appearance-none rounded-md border-gray-300 bg-white py-3 pl-4 pr-10 text-sm text-gray-800 focus:border-[#1d4ed8] focus:outline-none focus:ring-[#1d4ed8]"
              >
                {cancerTypes.length > 0 &&
                  cancerTypes.map((cancerType) => (
                    <option
                      key={cancerType.cancer_type_id}
                      value={cancerType.cancer_type}
                    >
                      {cancerType.cancer_type}
                    </option>
                  ))}
              </select>

              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <ChevronDownIcon />
              </div>
            </div>
          </div>

          {/* Sub Type */}
          <div>
            <label
              htmlFor="subType"
              className="mb-2 block text-sm font-semibold text-gray-600"
            >
              Sub Type
            </label>

            <div className="relative">
              <select
                id="subType"
                name="subType"
                value={formData.subType}
                onChange={handleChange}
                className="block w-full appearance-none rounded-md border-gray-300 bg-white py-3 pl-4 pr-10 text-sm text-gray-800 focus:border-[#1d4ed8] focus:outline-none focus:ring-[#1d4ed8]"
              >
                <option value="">
                  {diagnosisLoading ? "Loading…" : "Select Sub Type"}
                </option>

                {subtypes.map((subtype) => (
                  <option
                    key={subtype.subtype_id}
                    value={subtype.subtype_name}
                  >
                    {subtype.subtype_name}
                  </option>
                ))}
              </select>

              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <ChevronDownIcon />
              </div>
            </div>
          </div>

          {/* Histomorphology */}
          <div>
            <label
              htmlFor="histomorphology"
              className="mb-2 block text-sm font-semibold text-gray-600"
            >
              Histomorphology
            </label>

            <div className="relative">
              <select
                id="histomorphology"
                name="histomorphology"
                value={formData.histomorphology}
                onChange={handleChange}
                className="block w-full appearance-none rounded-md border-gray-300 bg-white py-3 pl-4 pr-10 text-sm text-gray-800 focus:border-[#1d4ed8] focus:outline-none focus:ring-[#1d4ed8]"
              >
              </select>

              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <ChevronDownIcon />
              </div>
            </div>
          </div>

          {/* Cancer Stage */}
          <div>
            <label
              htmlFor="cancerStage"
              className="mb-2 block text-sm font-semibold text-gray-600"
            >
              Cancer Stage
            </label>

            <div className="relative">
              <select
                id="cancerStage"
                name="cancerStage"
                value={formData.cancerStage}
                onChange={handleChange}
className="block w-full appearance-none rounded-md border-gray-300 bg-white py-3 pl-4 pr-10 text-sm text-gray-800 focus:border-[#1d4ed8] focus:outline-none focus:ring-[#1d4ed8]"
              >
                <option value="">
                  {diagnosisLoading
                    ? "Loading…"
                    : "Select Cancer Stage"}
                </option>

                {stageLabels.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>

              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <ChevronDownIcon />
              </div>
            </div>
          </div>

          {/* Grade */}
          <div>
            <label
              htmlFor="grade"
              className="mb-2 block text-sm font-semibold text-gray-600"
            >
              Grade
            </label>

            <div className="relative">
              <select
                id="grade"
                name="grade"
                value={formData.grade}
                onChange={handleChange}
                className="block w-full appearance-none rounded-md border-gray-300 bg-white py-3 pl-4 pr-10 text-sm text-gray-800 focus:border-[#1d4ed8] focus:outline-none focus:ring-[#1d4ed8]"
              >
                <option value="">
                  {diagnosisLoading
                    ? "Loading…"
                    : "Select Grade"}
                </option>

                {grades.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>

              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <ChevronDownIcon />
              </div>
            </div>
          </div>

          {/* TNM Stage */}
          <div>
            <label
              htmlFor="tnmStage"
              className="mb-2 block text-sm font-semibold text-gray-600"
            >
              TNM Stage
            </label>

            <div className="relative">
              <select
                id="tnmStage"
                name="tnmStage"
                value={formData.tnmStage}
                onChange={handleChange}
                className="block w-full appearance-none rounded-md border-gray-300 bg-white py-3 pl-4 pr-10 text-sm text-gray-800 focus:border-[#1d4ed8] focus:outline-none focus:ring-[#1d4ed8]"
              >
                <option value="">
                  {diagnosisLoading
                    ? "Loading…"
                    : "Select TNM Stage"}
                </option>

                {tnmStages.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>

              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <ChevronDownIcon />
                
              </div>
            </div>
          </div>

          {/* ICD Code */}
          <div>
            <label
              htmlFor="icdCode"
              className="mb-2 block text-sm font-semibold text-gray-600"
            >
              ICD Code
            </label>

            <input
              id="icdCode"
              name="icdCode"
              type="text"
              value={formData.icdCode}
              onChange={handleChange}
              placeholder={
                diagnosisLoading
                  ? "Loading diagnosis…"
                  : "Enter ICD code"
              }
              className="block w-full rounded-md border-gray-300 px-4 py-3 text-sm text-gray-800 shadow-sm focus:border-[#1d4ed8] focus:ring-[#1d4ed8]"
            />
          </div>
        </div>

        {/* Diagnosis API Error */}
        {diagnosisError && (
          <div className="text-sm font-medium text-red-600">
            {diagnosisError}
          </div>
        )}

        {/* Notes */}
        <div className="pt-2">
          <label
            htmlFor="notes"
            className="mb-2 block text-sm font-semibold text-gray-600"
          >
            Notes
          </label>

          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="block w-full resize-none rounded-md border border-gray-300 px-4 py-3 text-sm text-gray-800 shadow-sm focus:border-[#1d4ed8] focus:ring-[#1d4ed8]"
          />
        </div>

        {/* Footer Action */}
        <div className="mt-12 flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-[#1d4ed8] px-6 py-3 text-base font-medium text-white shadow-sm transition-colors hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <DoubleArrowIcon />
            <span className="ml-2">Next</span>
          </button>
        </div>
      </form>
    </section>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans text-[#334155] sm:p-6 lg:p-8">
      {/* Main App Container */}
      <div className="mx-auto flex min-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_0_rgba(0,0,0,0.06)]">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4 sm:px-8">
          {/* Back Button + Title */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleBack}
              aria-label="Go back"
              className="text-gray-500 transition-colors hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <BackIcon />
            </button>

            <h1 className="text-xl font-bold text-gray-800">
              Patients
            </h1>
          </div>

          {/* Notification + User */}
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setNotificationOpen((previous) => !previous)
                }
                aria-label="Notifications"
                className="relative text-gray-500 transition-colors hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <NotificationIcon />

                <span className="absolute right-0 top-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              </button>

              {notificationOpen && (
                <div className="absolute right-0 top-9 z-30 w-56 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600 shadow-lg">
                  No new notifications
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden text-sm font-semibold text-gray-700 sm:block">
                HMS
              </span>

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1e3a8a] text-sm font-bold text-white">
                DR
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex flex-1 flex-col px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
          {/* Stepper */}
          <div className="mx-auto mb-12 w-full max-w-4xl sm:mb-16">
            <div className="relative flex justify-between">
              {/* Consultation */}
              <div className="flex w-1/3 flex-col items-center text-center">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-500">
                  <CheckIcon className="h-4 w-4 text-white" />
                </div>

                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-800 sm:text-xs sm:tracking-widest">
                  Consultation
                </span>
              </div>

              {/* Lab Report Review */}
              <div className="flex w-1/3 flex-col items-center text-center">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-500">
                  <CheckIcon className="h-4 w-4 text-white" />
                </div>

                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-800 sm:text-xs sm:tracking-widest">
                  Lab Report Review
                </span>
              </div>

              {/* Diagnosis */}
              <div className="relative flex w-1/3 flex-col items-center text-center">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#22c55e]">
                  <CheckIcon className="h-4 w-4 text-white" />
                </div>

                <span className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-800 sm:text-xs sm:tracking-widest">
                  Diagnosis
                </span>

                {/* Active Indicator */}
                <div className="absolute bottom-0 h-1.5 w-full translate-y-2 rounded-full bg-[#22c55e]" />
              </div>
            </div>
          </div>

          {content}
        </main>
      </div>
    </div>
  );
};

/* ============================================================
   DISCHARGE MEDICATION COMPONENT
   (combined from client/pages/doctor/discharge.tsx —
    renamed PatientDischargeMedication → DischargeMedication,
    Medication type renamed to DischargeMedicationItem to avoid
    clashing with the Medication interface above, duplicate
    React import and icon definitions removed,
    CheckIcon / DoubleArrowIcon reused from above,
    embedded prop added so it can live in this file)
============================================================ */

type DischargeMedicationItem = {
  id: number;
  drugName: string;
  dosage: string;
  frequency: string;
  instruction: string;
  duration: string;
};

const ArrowLeftIcon = () => (
  <svg
    className="h-6 w-6"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path
      d="M19 12H5M12 19l-7-7 7-7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const BellIcon = () => (
  <svg
    className="h-6 w-6"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path
      d="M18 8a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PhoneIcon = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path
      d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.12.9.33 1.78.62 2.63a2 2 0 01-.45 2.11L8 9.73a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0122 16.92z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const MailIcon = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <rect
      x="3"
      y="5"
      width="18"
      height="14"
      rx="2"
    />
    <path
      d="M3 7l9 6 9-6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DischargeMedication: React.FC<{ embedded?: boolean }> = ({
  embedded = false,
}) => {
  const [medications, setMedications] = useState<DischargeMedicationItem[]>(
    []
  );

  const [activeStep, setActiveStep] = useState(1);

  const handleAddDrug = () => {
    const newMedication: DischargeMedicationItem = {
      id: Date.now(),
      drugName: "",
      dosage: "",
      frequency: "",
      instruction: "",
      duration: "",
    };

    setMedications((current) => [...current, newMedication]);
  };

  const handleNext = () => {
    if (activeStep < 3) {
      setActiveStep((current) => current + 1);
    }
  };

  const handleBack = () => {
    window.history.back();
  };

  const handleViewProfile = () => {
    console.log("View Full Profile");
  };

if (embedded) {

  return (
    <div className="w-full">
      {/* MEDICATION CARD */}
      <div className="mb-8 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="w-1/4 px-8 py-5 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                  Drug Name
                </th>

                <th className="w-1/6 px-8 py-5 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                  Dosage
                </th>

                <th className="w-1/6 px-8 py-5 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                  Frequency
                </th>

                <th className="w-1/4 px-8 py-5 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                  Instruction
                </th>

                <th className="w-1/6 px-8 py-5 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                  Duration
                </th>
              </tr>
            </thead>

            <tbody className="text-sm text-gray-500">
              {medications.map((medication) => (
                <tr
                  key={medication.id}
                  className="border-b border-gray-100 transition-colors hover:bg-gray-50 last:border-gray-200"
                >
                  <td className="px-8 py-6 text-gray-800">
                    {medication.drugName}
                  </td>

                  <td className="px-8 py-6">
                    {medication.dosage}
                  </td>

                  <td className="px-8 py-6">
                    {medication.frequency}
                  </td>

                  <td className="px-8 py-6">
                    {medication.instruction}
                  </td>

                  <td className="px-8 py-6">
                    {medication.duration}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Drug */}
        <div className="flex justify-end p-6">
          <button
            type="button"
            onClick={handleAddDrug}
            className="rounded border border-blue-600 px-6 py-2 text-sm font-semibold text-blue-600 transition-colors duration-200 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Add Drug
          </button>
        </div>
      </div>

      {/* FOOTER ACTION */}
      <div className="mb-8 flex w-full justify-end">
        <button
          type="button"
          onClick={handleNext}
          className="flex items-center gap-2 rounded-md bg-[#1d4ed8] px-8 py-3 font-bold text-white shadow-sm transition-colors hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <DoubleArrowIcon />
          Next
        </button>
      </div>
    </div>
  );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-800 antialiased">
      {/* SIDEBAR */}
      <aside className="relative z-20 flex min-h-screen w-80 shrink-0 flex-col border-r border-gray-200 bg-white">
        {/* Profile Summary */}
        <div className="flex flex-col items-center border-b border-gray-200 p-8">
          <div className="relative mb-6 h-32 w-32 overflow-hidden rounded-full ring-4 ring-[#eab308] shadow-sm">
            <img
              src=""
              alt=""
              className="h-full w-full object-cover"
            />
          </div>

          <h2 className="mb-2 text-[22px] font-bold text-gray-900">
            {""}
          </h2>

          <p className="mb-4 text-[15px] text-gray-500">
            {""}
          </p>

          <span className="mb-6 rounded-full bg-gray-100 px-4 py-1.5 text-xs font-semibold text-gray-600">
            {""}
          </span>

          <p className="text-center text-sm font-bold tracking-wide text-blue-700">
            {""}
          </p>
        </div>

        {/* Contact */}
        <div className="space-y-6 border-b border-gray-200 p-8">
          <div className="flex items-start gap-4">
            <PhoneIcon />

            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Phone
              </p>

              <p className="text-[15px] font-medium text-gray-700">
                {""}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <MailIcon />

            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Email
              </p>

              <p className="text-[15px] font-medium text-gray-700">
                {""}
              </p>
            </div>
          </div>
        </div>

        {/* Vitals */}
        <div className="flex-grow space-y-8 p-8">
          <div className="grid grid-cols-2 gap-x-4 gap-y-6">
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Height
              </p>

              <p className="text-[15px] font-bold text-gray-900">
                {""}
              </p>
            </div>

            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Weight
              </p>

              <p className="text-[15px] font-bold text-gray-900">
                {""}
              </p>
            </div>

            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                BSA
              </p>

              <p className="text-[15px] font-bold text-gray-900">
                {""}
              </p>
            </div>

            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                BMI
              </p>

              <p className="text-[15px] font-bold text-gray-900">
                {""}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleViewProfile}
            className="mt-8 w-full rounded-md border border-blue-600 px-4 py-2.5 font-semibold text-blue-600 transition-colors duration-200 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            View Full Profile
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="relative z-10 flex min-w-0 flex-1 flex-col bg-gray-50">
        {/* TOP HEADER */}
        <header className="relative z-20 flex h-20 shrink-0 items-center justify-between bg-white px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleBack}
              aria-label="Back"
              className="-ml-2 rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100"
            >
              <ArrowLeftIcon />
            </button>

            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Patients
            </h1>
          </div>

          <div className="flex items-center gap-6">
            {/* Notification */}
            <button
              type="button"
              aria-label="Notifications"
              className="relative rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100"
            >
              <BellIcon />

              <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-red-500" />
            </button>

            {/* User */}
            <div className="flex items-center gap-4 border-l border-gray-200 pl-6">
              <span className="text-sm font-bold tracking-wide text-gray-700">
                HMS
              </span>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-900 text-sm font-bold text-white">
                DR
              </div>
            </div>
          </div>
        </header>

        {/* Background under stepper */}
        <div className="absolute left-0 right-0 top-20 z-0 h-40 border-b border-gray-200 bg-white" />

        {/* CONTENT */}
        <div className="relative z-10 flex-1 overflow-y-auto p-8 pt-0">
          <div className="mx-auto max-w-[1200px]">
            {/* MEDICATION CARD */}
            <div className="mx-auto mb-8 max-w-[1200px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="w-1/4 px-8 py-5 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                        Drug Name
                      </th>

                      <th className="w-1/6 px-8 py-5 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                        Dosage
                      </th>

                      <th className="w-1/6 px-8 py-5 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                        Frequency
                      </th>

                      <th className="w-1/4 px-8 py-5 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                        Instruction
                      </th>

                      <th className="w-1/6 px-8 py-5 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                        Duration
                      </th>
                    </tr>
                  </thead>

                  <tbody className="text-sm text-gray-500">
                    {medications.map((medication) => (
                      <tr
                        key={medication.id}
                        className="border-b border-gray-100 transition-colors hover:bg-gray-50 last:border-gray-200"
                      >
                        <td className="px-8 py-6 text-gray-800">
                          {medication.drugName}
                        </td>

                        <td className="px-8 py-6">
                          {medication.dosage}
                        </td>

                        <td className="px-8 py-6">
                          {medication.frequency}
                        </td>

                        <td className="px-8 py-6">
                          {medication.instruction}
                        </td>

                        <td className="px-8 py-6">
                          {medication.duration}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Drug */}
              <div className="flex justify-end p-6">
                <button
                  type="button"
                  onClick={handleAddDrug}
                  className="rounded border border-blue-600 px-6 py-2 text-sm font-semibold text-blue-600 transition-colors duration-200 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Add Drug
                </button>
              </div>
            </div>

            {/* FOOTER ACTION */}
            <div className="mx-auto mb-8 flex max-w-[1200px] justify-end">
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 rounded-md bg-[#1d4ed8] px-8 py-3 font-bold text-white shadow-sm transition-colors hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <DoubleArrowIcon />
                Next
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

/* ============================================================
   CHEMOTHERAPY ORDER COMPONENT
   (combined from client/pages/doctor/chemo.tsx —
    renamed App-style component ChemotherapyOrder to the same
    embedded pattern as LabReview / Diagnosis / DischargeMedication,
    icons moved inside the component to avoid colliding with the
    module-level CheckIcon / BackIcon, original chemo.tsx file
    left untouched)
============================================================ */

type Drug = {
  id: number;
  name: string;
  form: string;
  dose: string;
  unit: string;
  volume: string;
};

type ChemotherapyPlanItem = {
  chemotherapy_plan_item_id: string;
  drug_role: string | null;
  protocol_dose: number | null;
  protocol_dose_unit: string | null;
  formulation: string | null;
  dilution_volume: number | null;
  medicine_master: {
    medicine_name: string;
    generic_name: string | null;
    dosage_form: string | null;
    unit: string | null;
  } | null;
};

type ChemotherapyPlan = {
  chemotherapy_plan_id: string;
  protocol_name: string | null;
  regimen_name: string | null;
  regimen_code: string | null;
  treatment_start_date: string | null;
  planned_cycles: number | null;
  completed_cycles: number | null;
  treatment_status: string | null;
  chemotherapy_cycle: {
    cycle_number: number;
    cycle_day: number | null;
  }[] | null;
  chemotherapy_plan_items: ChemotherapyPlanItem[] | null;
  chemotherapy_regimen_protocol: {
    protocol_id: string;
    regimen_code: string | null;
    regimen_name: string | null;
  } | null;
};

type RegimenProtocolDetail = {
  protocol_id: string;
  regimen_code: string | null;
  regimen_name: string;
  treatment_intent: string | null;
  standard_cycles: number | null;
  cycle_interval_days: number | null;
  chemotherapy_regimen_protocol_items: {
    protocol_item_id: string;
    medicine_id: string;
    drug_role: string | null;
    drug_sequence: number;
    drug_type: string | null;
    dosage: number | null;
    dosage_unit: string | null;
    administration_route: string | null;
    infusion_type: string | null;
    infusion_duration_minutes: number | null;
    administration_day: number | null;
    cycle_day: number | null;
    frequency: string | null;
    timing_relative_to_primary: string | null;
    remarks: string | null;
    medicine_master: {
      medicine_name: string;
      generic_name: string | null;
      dosage_form: string | null;
      unit: string | null;
    } | null;
  }[];
};

const ChemotherapyOrder: React.FC<{
  embedded?: boolean;
  patientId?: string;
}> = ({ embedded = false, patientId }) => {
  const location = useLocation();
  const statePatientId = (
    (location.state as ConsultationState | null)?.patientId ?? ""
  );
  const resolvedPatientId = patientId || statePatientId;

  const [cycleDay, setCycleDay] = useState("");
  const [startDate, setStartDate] = useState("");
  const [activeTab, setActiveTab] = useState("Chemotherapy Orders");
  const [protocolName, setProtocolName] = useState("");
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState("");

  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [premedicationDrugs, setPremedicationDrugs] = useState<Drug[]>(
    []
  );

  const userTouched = useRef({
    cycleDay: false,
    startDate: false,
    drugs: false,
    premedication: false,
  });

  const protocolRef = useRef<RegimenProtocolDetail | null>(null);
  const latestCycleRef = useRef<
    NonNullable<ChemotherapyPlan["chemotherapy_cycle"]>[number] | null
  >(null);

  const applyNextCycle = (
    protocol: RegimenProtocolDetail | null,
    latestCycle: {
      cycle_number: number;
      cycle_day: number | null;
    } | null,
    baseDateValue?: string | null
  ) => {
    if (!protocol || !resolvedPatientId) return;

    const interval =
      protocol.cycle_interval_days && protocol.cycle_interval_days > 0
        ? protocol.cycle_interval_days
        : 21;
    const maxCycles =
      protocol.standard_cycles && protocol.standard_cycles > 0
        ? protocol.standard_cycles
        : Number.POSITIVE_INFINITY;
    const latestCycleNumber = latestCycle?.cycle_number ?? 0;

    const baseDate = parseDateValue(baseDateValue) ?? new Date();
    const baseStart = new Date(baseDate);
    baseStart.setHours(0, 0, 0, 0);

    let formCycleNumber =
      latestCycleNumber > 0 ? latestCycleNumber + 1 : 1;
    if (formCycleNumber > maxCycles) {
      formCycleNumber = maxCycles;
    }

    const formDate = new Date(baseStart);
    formDate.setDate(
      formDate.getDate() + (formCycleNumber - 1) * interval
    );

    let nextCycleNumber = formCycleNumber + 1;
    if (nextCycleNumber > maxCycles) {
      nextCycleNumber = maxCycles;
    }

    const nextDate = new Date(baseStart);
    nextDate.setDate(
      nextDate.getDate() + (nextCycleNumber - 1) * interval
    );

    const formatDate = (date: Date) => {
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      return `${day}-${month}-${date.getFullYear()}`;
    };

    const formCycleStr = `Cycle ${formCycleNumber} / Day 1`;
    const nextCycleStr = `Cycle ${nextCycleNumber} / Day 1`;

    setCycleDay(formCycleStr);
    setStartDate(formatDate(formDate));
    localStorage.setItem(
      `hms_next_cycle_${resolvedPatientId}`,
      nextCycleStr
    );
    localStorage.setItem(
      `hms_next_cycle_date_${resolvedPatientId}`,
      formatDate(nextDate)
    );
  };

  const orderDraftKey = `hms_chemo_order_${resolvedPatientId}`;

  useEffect(() => {
    if (!resolvedPatientId) return;
    const saved = localStorage.getItem(orderDraftKey);

    if (!saved) return;

    try {
      const data = JSON.parse(saved) as {
        cycleDay?: string;
        startDate?: string;
        drugs?: Drug[];
        premedicationDrugs?: Drug[];
      };

      if (data.cycleDay) {
        setCycleDay(data.cycleDay);
        userTouched.current.cycleDay = true;
      }

      if (data.startDate) {
        setStartDate(data.startDate);
        userTouched.current.startDate = true;
      }

      if (Array.isArray(data.drugs) && data.drugs.length > 0) {
        setDrugs(data.drugs);
        userTouched.current.drugs = true;
      }

      if (
        Array.isArray(data.premedicationDrugs) &&
        data.premedicationDrugs.length > 0
      ) {
        setPremedicationDrugs(data.premedicationDrugs);
        userTouched.current.premedication = true;
      }
    } catch (error) {
      console.error("Failed to restore chemotherapy order draft:", error);
    }
  }, [orderDraftKey, resolvedPatientId]);

  useEffect(() => {
    if (!resolvedPatientId) return;
    localStorage.setItem(
      orderDraftKey,
      JSON.stringify({
        cycleDay: userTouched.current.cycleDay ? cycleDay : "",
        startDate: userTouched.current.startDate ? startDate : "",
        drugs: userTouched.current.drugs ? drugs : [],
        premedicationDrugs: userTouched.current.premedication
          ? premedicationDrugs
          : [],
      })
    );
  }, [
    cycleDay,
    startDate,
    drugs,
    premedicationDrugs,
    orderDraftKey,
    resolvedPatientId,
  ]);

  const tabs = [
    "Chemotherapy Orders",
    "Premedication",
    "Hydration",
    "Admin Instructions",
  ];

  const handleSave = () => {
    console.log("Saved chemotherapy order:", {
      cycleDay,
      startDate,
      drugs,
    });
  };

  const formatDateDMY = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${day}-${month}-${date.getFullYear()}`;
  };

  useEffect(() => {
    if (!resolvedPatientId) return;
    let cancelled = false;
    setPlanLoading(true);
    setPlanError("");

    const savedStartDate = localStorage.getItem(
      `hms_planned_start_date_${resolvedPatientId}`
    );
    if (!userTouched.current.startDate) {
      const isoMatch = savedStartDate
        ?.trim()
        .match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        setStartDate(`${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`);
      } else if (savedStartDate) {
        setStartDate(savedStartDate.trim());
      }
    }
    if (!userTouched.current.cycleDay) {
      setCycleDay("Cycle 1 / Day 1");
    }

    const savedProtocolId = localStorage.getItem(
      `hms_selected_protocol_id_${resolvedPatientId}`
    );

    const loadRegimenProtocol = async (protocolId: string) => {
      try {
        const protocolResponse = await API.get<{
          success: boolean;
          data: RegimenProtocolDetail;
        }>(`/chemotherapy/regimen-protocols/${protocolId}`);
        if (cancelled) return;
        const protocol = protocolResponse.data.data;
        setProtocolName(
          protocol.regimen_code
            ? `${protocol.regimen_code} - ${protocol.regimen_name}`
            : protocol.regimen_name
        );
        const items =
          protocol.chemotherapy_regimen_protocol_items ?? [];
        const toDrug = (item: RegimenProtocolDetail["chemotherapy_regimen_protocol_items"][number], index: number): Drug => ({
          id: index,
          name:
            item.medicine_master?.medicine_name ||
            item.medicine_master?.generic_name ||
            "",
          form:
            item.medicine_master?.dosage_form ||
            item.administration_route ||
            "",
          dose: item.dosage != null ? String(item.dosage) : "",
          unit:
            item.dosage_unit ||
            item.medicine_master?.unit ||
            "",
          volume: "",
        });

        setDrugs(
          items
            .filter((item) => item.drug_role === "PRIMARY")
            .map(toDrug)
        );
        setPremedicationDrugs(
          items
            .filter((item) => item.drug_role === "PREMEDICATION")
            .map(toDrug)
        );
        protocolRef.current = protocol;
        applyNextCycle(protocol, latestCycleRef.current, savedStartDate);
      } catch (error) {
        console.error("Failed to load regimen protocol:", error);
        if (!cancelled) {
          setPlanError(
            error?.response?.data?.message ||
              "Failed to load the regimen protocol."
          );
        }
      }
    };

    if (savedProtocolId) {
      void loadRegimenProtocol(savedProtocolId);
    }

    API.get<{ success: boolean; data: ChemotherapyPlan[] }>(
      "/chemotherapy/plans",
      {
        params: {
          patient_id: resolvedPatientId,
          branchId:
            getActiveBranchId() ?? getUser()?.branch_id ?? undefined,
        },
      }
    )
      .then((response) => {
        if (cancelled) return;
        const plans = response.data.data;
        const plan = plans[0];
        if (!plan) return;

        if (!userTouched.current.startDate) {
          setStartDate(formatDateDMY(plan.treatment_start_date));
        }

        const cycles = plan.chemotherapy_cycle ?? [];
        const latestCycle = cycles[cycles.length - 1] ?? null;
        latestCycleRef.current = latestCycle;
        if (!userTouched.current.cycleDay) {
          setCycleDay(
            latestCycle
              ? `Cycle ${latestCycle.cycle_number} / Day ${
                  latestCycle.cycle_day ?? "—"
                }`
              : "Cycle 1 / Day 1"
          );
        }
        applyNextCycle(
          protocolRef.current,
          latestCycle,
          plan.treatment_start_date
        );

        if (!savedProtocolId) {
          setProtocolName(
            plan.protocol_name || plan.regimen_name || ""
          );
          const planItems = plan.chemotherapy_plan_items ?? [];
          const toPlanDrug = (
            item: ChemotherapyPlanItem,
            index: number
          ): Drug => ({
            id: index,
            name:
              item.medicine_master?.medicine_name ||
              item.medicine_master?.generic_name ||
              "",
            form:
              item.formulation ||
              item.medicine_master?.dosage_form ||
              "",
            dose: item.protocol_dose != null ? String(item.protocol_dose) : "",
            unit:
              item.protocol_dose_unit ||
              item.medicine_master?.unit ||
              "",
            volume:
              item.dilution_volume != null
                ? `${item.dilution_volume}`
                : "",
          });

          setDrugs(
            planItems
              .filter((item) => item.drug_role === "PRIMARY")
              .map(toPlanDrug)
          );
          setPremedicationDrugs(
            planItems
              .filter((item) => item.drug_role === "PREMEDICATION")
              .map(toPlanDrug)
          );

          const protocolId =
            plan.chemotherapy_regimen_protocol?.protocol_id;
          if (protocolId) {
            void loadRegimenProtocol(protocolId);
          }
        }
      })
      .catch((error) => {
        console.error("Failed to load chemotherapy plans:", error);
        if (!cancelled) {
          setPlanError(
            error?.response?.data?.message ||
              "Failed to load chemotherapy orders."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setPlanLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [resolvedPatientId]);

  const handleAddDrug = () => {
    userTouched.current.drugs = true;

    const newDrug: Drug = {
      id: Date.now(),
      name: "",
      form: "",
      dose: "",
      unit: "",
      volume: "",
    };

    setDrugs((current) => [...current, newDrug]);
  };

  const handleDelete = (id: number) => {
    userTouched.current.drugs = true;

    setDrugs((current) =>
      current.filter((drug) => drug.id !== id)
    );
  };

  const handleEdit = (id: number) => {
    const drug = drugs.find((item) => item.id === id);

    if (drug) {
      console.log("Edit drug:", drug);
    }
  };

  const handleDeletePremedication = (id: number) => {
    userTouched.current.premedication = true;

    setPremedicationDrugs((current) =>
      current.filter((drug) => drug.id !== id)
    );
  };

  const handleEditPremedication = (id: number) => {
    const drug = premedicationDrugs.find(
      (item) => item.id === id
    );

    if (drug) {
      console.log("Edit premedication drug:", drug);
    }
  };

  /* Icons (scoped inside the component) */

  const BackIcon = () => (
    <svg
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path
        d="M10 19l-7-7m0 0l7-7m-7 7h18"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const BellIcon = () => (
    <svg
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const CheckIcon = () => (
    <svg
      className="h-5 w-5"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );

  const RefreshIcon = () => (
    <svg
      className="h-5 w-5 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );

  const CalendarIcon = () => (
    <svg
      className="h-5 w-5 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );

  const SaveIcon = () => (
    <svg
      className="-ml-1 mr-2 h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path
        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const EditIcon = () => (
    <svg
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const DeleteIcon = () => (
    <svg
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const content = (
    <div className="w-full max-w-6xl space-y-8">
      {/* ================= ORDER CONTAINER ================= */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* ================= FORM HEADER ================= */}
        <div className="grid grid-cols-1 gap-8 p-8 pb-6 md:grid-cols-3">
          {/* Protocol */}
          <div className="space-y-2">
            <label
              htmlFor="protocol"
              className="block text-sm font-semibold uppercase tracking-wide text-gray-500"
            >
              Protocol
            </label>

            <input
              id="protocol"
              type="text"
              value={protocolName}
              readOnly
              className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-3 text-base text-gray-900 shadow-sm outline-none"
            />
          </div>

          {/* Cycle / Day */}
          <div className="relative space-y-2">
            <label
              htmlFor="cycle-day"
              className="block text-sm font-semibold uppercase tracking-wide text-gray-500"
            >
              Cycle / Day
            </label>

            <div className="relative mt-1 rounded-md shadow-sm">
              <input
                id="cycle-day"
                type="text"
                value={cycleDay}
                onChange={(e) => {
                  userTouched.current.cycleDay = true;
                  setCycleDay(e.target.value);
                }}
                className="block w-full rounded-md border border-gray-300 py-3 pl-4 pr-10 text-base text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />

              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <RefreshIcon />
              </div>
            </div>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <label
              htmlFor="start-date"
              className="block text-sm font-semibold uppercase tracking-wide text-gray-500"
            >
              Start Date
            </label>

            <Popover>
              <PopoverTrigger asChild>
                <div className="relative mt-1 cursor-pointer rounded-md shadow-sm">
                  <input
                    id="start-date"
                    type="text"
                    value={startDate}
                    onChange={(e) => {
                      userTouched.current.startDate = true;
                      setStartDate(e.target.value);
                    }}
                    className="block w-full rounded-md border border-gray-300 py-3 pl-4 pr-10 text-base text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />

                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <CalendarIcon />
                  </div>
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={parsePickedDate(startDate)}
                  onSelect={(date) => {
                    if (date instanceof Date) {
                      userTouched.current.startDate = true;
                      setStartDate(formatPickedDate(date));
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* ================= TABS ================= */}
        <div className="border-b border-gray-200 px-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <nav
              aria-label="Tabs"
              className="-mb-px flex gap-6 overflow-x-auto"
            >
              {tabs.map((tab) => {
                const isActive = activeTab === tab;

                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`whitespace-nowrap border-b-2 px-1 py-4 text-base font-medium transition-colors ${
                      isActive
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </nav>

            {/* Save */}
            <div className="pb-3">
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <SaveIcon />
                Save
              </button>
            </div>
          </div>
        </div>

        {/* ================= ORDER TABLE ================= */}
        {activeTab === "Chemotherapy Orders" ? (
          <div className="p-8">
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-4 pl-6 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Drug Name
                    </th>

                    <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Form
                    </th>

                    <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Dose
                    </th>

                    <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Unit
                    </th>

                    <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Volume
                    </th>

                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 bg-white">
                  {planLoading && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-8 text-center text-sm text-gray-500"
                      >
                        Loading chemotherapy orders…
                      </td>
                    </tr>
                  )}

                  {!planLoading && !planError && drugs.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-8 text-center text-sm text-gray-500"
                      >
                        No chemotherapy orders found for this patient.
                      </td>
                    </tr>
                  )}

                  {planError && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-8 text-center text-sm text-red-500"
                      >
                        {planError}
                      </td>
                    </tr>
                  )}

                  {drugs.map((drug) => (
                    <tr
                      key={drug.id}
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap py-5 pl-6 pr-3 text-base font-medium text-gray-900">
                        {drug.name}
                      </td>

                      <td className="whitespace-nowrap px-3 py-5 text-base text-gray-500">
                        {drug.form}
                      </td>

                      <td className="whitespace-nowrap px-3 py-5 text-base text-gray-900">
                        {drug.dose}
                      </td>

                      <td className="whitespace-nowrap px-3 py-5 text-base text-blue-500">
                        {drug.unit}
                      </td>

                      <td className="whitespace-nowrap px-3 py-5 text-base text-gray-500">
                        {drug.volume}
                      </td>

                      <td className="whitespace-nowrap px-6 py-5 text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-3 text-gray-500">
                          <button
                            type="button"
                            aria-label={`Edit ${drug.name}`}
                            onClick={() =>
                              handleEdit(drug.id)
                            }
                            className="transition-colors hover:text-gray-900 focus:outline-none"
                          >
                            <EditIcon />
                          </button>

                          <button
                            type="button"
                            aria-label={`Delete ${drug.name}`}
                            onClick={() =>
                              handleDelete(drug.id)
                            }
                            className="transition-colors hover:text-red-600 focus:outline-none"
                          >
                            <DeleteIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Drug */}
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleAddDrug}
                className="inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-6 py-2.5 text-sm font-semibold text-blue-600 shadow-sm transition-colors hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Add Drug
              </button>
            </div>
          </div>
        ) : activeTab === "Premedication" ? (
          <div className="p-8">
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-4 pl-6 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Drug Name
                    </th>

                    <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Form
                    </th>

                    <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Dose
                    </th>

                    <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Unit
                    </th>

                    <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Volume
                    </th>

                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 bg-white">
                  {planLoading && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-8 text-center text-sm text-gray-500"
                      >
                        Loading premedication…
                      </td>
                    </tr>
                  )}

                  {!planLoading &&
                    !planError &&
                    premedicationDrugs.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-8 text-center text-sm text-gray-500"
                        >
                          No premedication drugs found for this protocol.
                        </td>
                      </tr>
                    )}

                  {planError && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-8 text-center text-sm text-red-500"
                      >
                        {planError}
                      </td>
                    </tr>
                  )}

                  {premedicationDrugs.map((drug) => (
                    <tr
                      key={drug.id}
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap py-5 pl-6 pr-3 text-base font-medium text-gray-900">
                        {drug.name}
                      </td>

                      <td className="whitespace-nowrap px-3 py-5 text-base text-gray-500">
                        {drug.form}
                      </td>

                      <td className="whitespace-nowrap px-3 py-5 text-base text-gray-900">
                        {drug.dose}
                      </td>

                      <td className="whitespace-nowrap px-3 py-5 text-base text-blue-500">
                        {drug.unit}
                      </td>

                      <td className="whitespace-nowrap px-3 py-5 text-base text-gray-500">
                        {drug.volume}
                      </td>

                      <td className="whitespace-nowrap px-6 py-5 text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-3 text-gray-500">
                          <button
                            type="button"
                            aria-label={`Edit ${drug.name}`}
                            onClick={() =>
                              handleEditPremedication(drug.id)
                            }
                            className="transition-colors hover:text-gray-900 focus:outline-none"
                          >
                            <EditIcon />
                          </button>

                          <button
                            type="button"
                            aria-label={`Delete ${drug.name}`}
                            onClick={() =>
                              handleDeletePremedication(drug.id)
                            }
                            className="transition-colors hover:text-red-600 focus:outline-none"
                          >
                            <DeleteIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Other Tabs */
          <div className="flex min-h-[300px] items-center justify-center p-8">
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-700">
                {activeTab}
              </p>

              <p className="mt-2 text-sm text-gray-500">
                No items available.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="min-h-screen bg-[#fafbfc] font-sans text-gray-800 antialiased">
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Go back"
            className="rounded-full p-1 text-gray-600 transition-colors hover:text-gray-900 focus:outline-none"
            onClick={() => window.history.back()}
          >
            <BackIcon />
          </button>

          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Patients
          </h1>
        </div>

        <div className="flex items-center gap-6">
          {/* Notification */}
          <button
            type="button"
            aria-label="Notifications"
            className="relative text-gray-500 transition-colors hover:text-gray-700 focus:outline-none"
          >
            <BellIcon />

            <span className="absolute right-0 top-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
          </button>

          {/* User */}
          <div className="flex items-center gap-3">
            <span className="text-base font-medium text-gray-700">
              HMS
            </span>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-900 text-sm font-semibold text-white shadow-sm">
              DR
            </div>
          </div>
        </div>
      </header>

      {/* ================= MAIN ================= */}
      <main className="flex min-h-[calc(100vh-73px)] flex-grow justify-center p-8">
        <div className="w-full max-w-6xl space-y-8">
          {/* ================= STEPPER ================= */}
          <nav
            aria-label="Progress"
            className="relative"
          >
            <ol className="relative z-0 flex w-full items-center">
              {/* Step 1 */}
              <li className="relative flex-1 text-center">
                <div className="flex flex-col items-center">
                  <span className="relative z-10 mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-gray-400 text-white shadow-sm">
                    <CheckIcon />
                  </span>

                  <span className="text-xs font-bold uppercase tracking-wider text-gray-900">
                    Diagnosis
                  </span>
                </div>

                <div className="absolute left-1/2 top-4 -z-10 h-0.5 w-full bg-gray-200" />
              </li>

              {/* Step 2 */}
              <li className="relative flex-1 text-center">
                <div className="flex flex-col items-center">
                  <span className="relative z-10 mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-gray-400 text-white shadow-sm">
                    <CheckIcon />
                  </span>

                  <span className="text-xs font-bold uppercase tracking-wider text-gray-900">
                    Treatment Plan
                  </span>
                </div>

                <div className="absolute right-1/2 top-4 -z-10 h-0.5 w-full bg-gray-200" />
                <div className="absolute left-1/2 top-4 -z-10 h-0.5 w-full bg-gray-200" />
              </li>

              {/* Step 3 */}
              <li className="relative flex-1 text-center">
                <div className="flex flex-col items-center">
                  <span className="relative z-10 mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white shadow-md ring-4 ring-white">
                    <CheckIcon />
                  </span>

                  <span className="text-xs font-bold uppercase tracking-wider text-gray-900">
                    Chemotherapy Order
                  </span>

                  <div className="mx-auto mt-3 h-1.5 w-full max-w-[200px] rounded-t-md bg-green-500" />
                </div>

                <div className="absolute right-1/2 top-4 -z-10 h-0.5 w-full bg-gray-200" />
                <div className="absolute left-1/2 top-4 -z-10 h-0.5 w-full bg-gray-200" />
              </li>

              {/* Step 4 */}
              <li className="relative flex-1 text-center">
                <div className="flex flex-col items-center opacity-50">
                  <span className="relative z-10 mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-gray-400 text-white shadow-sm" />

                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Discharge Plan
                  </span>
                </div>

                <div className="absolute right-1/2 top-4 -z-10 h-0.5 w-full bg-gray-200" />
              </li>
            </ol>
          </nav>

          {content}
        </div>
      </main>
    </div>
  );
};

/* ============================================================
   FOLLOW UP COMPONENT
   (combined from client/pages/doctor/Follow.tsx —
    renamed FollowUpScreen → FollowUp, duplicate React import
    removed, icons scoped inside the component to avoid
    colliding with the module-level icons above, embedded prop
    added so it can live in this file, original Follow.tsx file
    left untouched)
============================================================ */

type FollowUpStep = 1 | 2 | 3;

const FollowUp: React.FC<{ embedded?: boolean; patientId?: string }> = ({
  embedded = false,
  patientId,
}) => {
  const location = useLocation();
  const statePatientId = (
    (location.state as ConsultationState | null)?.patientId ?? ""
  );
  const resolvedPatientId = patientId || statePatientId;
  const [activeStep, setActiveStep] = useState<FollowUpStep>(1);
  const [nextVisitDate, setNextVisitDate] = useState("");
  const [nextCycle, setNextCycle] = useState("");
  const [cycleOptions, setCycleOptions] = useState<string[]>([]);
  const [plan, setPlan] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!resolvedPatientId) return;

    const storedCycle = localStorage.getItem(
      `hms_next_cycle_${resolvedPatientId}`
    );
    const storedDate = localStorage.getItem(
      `hms_next_cycle_date_${resolvedPatientId}`
    );

    if (storedDate) {
      setNextVisitDate(storedDate);
    }

    let normalizedCycle = storedCycle ?? "";
    if (storedCycle) {
      const cycleMatch = storedCycle.match(/^Cycle\s+(\d+)/i);
      normalizedCycle = cycleMatch ? `Cycle ${cycleMatch[1]}` : storedCycle;
      setNextCycle(normalizedCycle);
    }

    const savedProtocolId = localStorage.getItem(
      `hms_selected_protocol_id_${resolvedPatientId}`
    );
    if (!savedProtocolId) return;

    API.get<{ success: boolean; data: RegimenProtocolDetail }>(
      `/chemotherapy/regimen-protocols/${savedProtocolId}`
    )
      .then((response) => {
        const protocol = response.data.data;
        const total =
          protocol.standard_cycles && protocol.standard_cycles > 0
            ? protocol.standard_cycles
            : 6;
        const options = Array.from(
          { length: total },
          (_, index) => `Cycle ${index + 1}`
        );
        if (normalizedCycle && !options.includes(normalizedCycle)) {
          options.unshift(normalizedCycle);
        }
        setCycleOptions(options);
      })
      .catch((error) => {
        console.error("Failed to load follow-up protocol:", error);
      });
  }, [resolvedPatientId]);

  const handleBack = () => {
    window.history.back();
  };

  const handleSubmit = () => {
    const followUpData = {
      nextVisitDate,
      nextCycle,
      plan,
      notes,
    };

    console.log("Follow Up Submitted:", followUpData);

    alert("Follow-up submitted successfully.");
  };

  const handleViewProfile = () => {
    console.log("View Full Profile clicked");
  };

  /* Icons (scoped inside the component to avoid colliding
     with the module-level icons defined above) */

  const ArrowLeftIcon = () => (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="M19 12H5M12 19l-7-7 7-7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const BellIcon = () => (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="M18 8a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const PhoneIcon = () => (
    <svg
      className="mt-1 h-4 w-4 shrink-0 text-gray-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.12.9.33 1.78.62 2.63a2 2 0 01-.45 2.11L8 9.73a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0122 16.92z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const EmailIcon = () => (
    <svg
      className="mt-1 h-4 w-4 shrink-0 text-gray-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
      />
      <path
        d="M3 7l9 6 9-6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const CalendarIcon = () => (
    <svg
      className="h-5 w-5 text-gray-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="17"
        rx="2"
      />
      <path
        d="M16 2v4M8 2v4M3 10h18"
        strokeLinecap="round"
      />
    </svg>
  );

  const ChevronDownIcon = () => (
    <svg
      className="h-4 w-4 text-gray-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="M6 9l6 6 6-6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const CheckIcon = () => (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
    >
      <path
        d="M5 12l4 4L19 6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const DoubleArrowIcon = () => (
    <svg
      className="mr-2 h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path
        d="M6 7l5 5-5 5M13 7l5 5-5 5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  /* =========================================================
     CONTENT (FOLLOW UP FORM + ACTION)
  ========================================================= */

  const content = (
    <>
      {/* FOLLOW UP FORM */}
      <div className="mb-6 flex-grow rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
          className="space-y-8"
        >
          {/* Row 1 */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Next Visit Date */}
            <div>
              <label
                htmlFor="nextVisitDate"
                className="mb-2 block text-sm font-semibold text-gray-800"
              >
                Next Visit Date
              </label>

              <Popover>
                <PopoverTrigger asChild>
                  <div className="relative cursor-pointer">
                    <input
                      id="nextVisitDate"
                      type="text"
                      value={nextVisitDate}
                      onChange={(event) =>
                        setNextVisitDate(event.target.value)
                      }
                      className="block w-full rounded-lg border border-gray-300 bg-white py-3 pl-4 pr-10 text-base text-gray-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />

                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                      <CalendarIcon />
                    </div>
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={parsePickedDate(nextVisitDate)}
                    onSelect={(date) => {
                      if (date instanceof Date) {
                        setNextVisitDate(formatPickedDate(date));
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Next Cycle */}
            <div>
              <label
                htmlFor="nextCycle"
                className="mb-2 block text-sm font-semibold text-gray-800"
              >
                Next Cycle
              </label>

              <div className="relative">
                <select
                  id="nextCycle"
                  value={nextCycle}
                  onChange={(event) =>
                    setNextCycle(event.target.value)
                  }
                  className="block w-full cursor-pointer appearance-none rounded-lg border border-gray-300 bg-white py-3 pl-4 pr-10 text-base text-gray-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  {cycleOptions.length === 0 ? (
                    <option value="">Select Next Cycle</option>
                  ) : (
                    cycleOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))
                  )}
                </select>

                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                  <ChevronDownIcon />
                </div>
              </div>
            </div>
          </div>

          {/* Plan */}
          <div className="w-full md:w-1/2 md:pr-4">
            <label
              htmlFor="plan"
              className="mb-2 block text-sm font-semibold text-gray-800"
            >
              Plan
            </label>

            <div className="relative">
              <select
                id="plan"
                value={plan}
                onChange={(event) =>
                  setPlan(event.target.value)
                }
                className="block w-full cursor-pointer appearance-none rounded-lg border border-gray-300 bg-white py-3 pl-4 pr-10 text-base text-gray-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option>Continue Treatment</option>
                <option>Complete Treatment</option>
                <option>Hold Treatment</option>
                <option>Refer for Review</option>
              </select>

              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                <ChevronDownIcon />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="notes"
              className="mb-2 block text-sm font-semibold text-gray-800"
            >
              Notes
            </label>

            <textarea
              id="notes"
              rows={4}
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              className="block w-full resize-none rounded-lg border border-gray-300 bg-white p-4 text-base text-gray-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </form>
      </div>

      {/* FORM ACTION */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          className="inline-flex items-center justify-center rounded-lg border border-transparent bg-[#2557D6] px-8 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <DoubleArrowIcon />
          Submit
        </button>
      </div>
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-gray-800 antialiased">

      {/* =========================================================
          LEFT SIDEBAR - PATIENT PROFILE
      ========================================================= */}

      <aside className="flex h-full w-[300px] shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-white">

        {/* Profile Header */}
        <div className="flex flex-col items-center border-b border-gray-100 p-6">

          <img
            src=""
            alt="Patient Photo"
            className="mb-4 h-[110px] w-[110px] rounded-full object-cover shadow-sm"
          />

          <h2 className="mb-1 text-xl font-bold text-gray-900">
            {""}
          </h2>

          <p className="mb-3 text-sm text-gray-500">
            {""}
          </p>

          <span className="mb-4 rounded-md bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
            {""}
          </span>

          <h3 className="text-center text-sm font-bold uppercase tracking-wide text-blue-600">
            {""}
          </h3>
        </div>

        {/* Contact Info */}
        <div className="space-y-5 border-b border-gray-100 p-6">

          <div className="flex items-start">
            <PhoneIcon />

            <div className="ml-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Phone
              </p>

              <p className="text-sm font-medium text-gray-800">
                {""}
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <EmailIcon />

            <div className="ml-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Email
              </p>

              <p className="text-sm font-medium text-gray-800">
                {""}
              </p>
            </div>
          </div>

        </div>

        {/* Vitals */}
        <div className="grid grid-cols-2 gap-y-6 border-b border-gray-100 p-6">

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Height
            </p>
            <p className="text-sm font-bold text-gray-900">
              {""}
            </p>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Weight
            </p>
            <p className="text-sm font-bold text-gray-900">
              {""}
            </p>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
              BSA
            </p>
            <p className="text-sm font-bold text-gray-900">
              {""}
            </p>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
              BMI
            </p>
            <p className="text-sm font-bold text-gray-900">
              {""}
            </p>
          </div>

        </div>

        {/* Profile Button */}
        <div className="mt-auto p-6">
          <button
            type="button"
            onClick={handleViewProfile}
            className="w-full rounded-lg border border-blue-500 px-4 py-2.5 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            View Full Profile
          </button>
        </div>
      </aside>

      {/* =========================================================
          MAIN CONTENT
      ========================================================= */}

      <main className="flex min-w-0 flex-1 flex-col">

        {/* =======================================================
            TOP HEADER
        ======================================================== */}

        <header className="z-10 flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">

          {/* Left */}
          <div className="flex items-center">

            <button
              type="button"
              onClick={handleBack}
              className="mr-4 text-gray-500 transition-colors hover:text-gray-700 focus:outline-none"
              aria-label="Go back"
            >
              <ArrowLeftIcon />
            </button>

            <h1 className="text-xl font-bold text-gray-900">
              Patients
            </h1>

          </div>

          {/* Right */}
          <div className="flex items-center space-x-6">

            {/* Notification */}
            <button
              type="button"
              className="relative text-gray-400 transition-colors hover:text-gray-600"
              aria-label="Notifications"
            >
              <BellIcon />

              <span className="absolute right-0 top-0 h-2 w-2 rounded-full border border-white bg-red-500" />
            </button>

            {/* User */}
            <div className="flex items-center space-x-3">

              <span className="text-sm font-bold text-gray-800">
                HMS
              </span>

              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-800 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-900"
              >
                DR
              </button>

            </div>
          </div>
        </header>

        {/* =======================================================
            SCROLLABLE CONTENT
        ======================================================== */}

        <div className="flex-1 overflow-y-auto bg-slate-50 p-6">

          <div className="mx-auto flex h-full max-w-5xl flex-col">

            {/* ===================================================
                PROGRESS STEPPER
            ==================================================== */}

            <div className="mb-8 px-4">

              <div className="relative flex items-center justify-between">

                {/* Step 1 */}
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="group relative z-10 flex flex-1 cursor-pointer flex-col items-center text-center"
                >
                  <div
                    className={`z-10 mb-3 flex h-8 w-8 items-center justify-center rounded-full text-white shadow-sm ${
                      activeStep >= 1
                        ? "bg-green-500"
                        : "bg-gray-400"
                    }`}
                  >
                    <CheckIcon />
                  </div>

                  <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
                    Discharge Medication
                  </span>
                </button>

                {/* Connecting Line 1 */}
                <div
                  className={`pointer-events-none absolute left-[16%] right-[50%] top-4 z-0 h-[3px] rounded-full ${
                    activeStep >= 2
                      ? "bg-green-500"
                      : "bg-gray-200"
                  }`}
                />

                {/* Step 2 */}
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="group relative z-10 flex flex-1 cursor-pointer flex-col items-center text-center"
                >
                  <div
                    className={`z-10 mb-3 flex h-8 w-8 items-center justify-center rounded-full text-white shadow-sm ${
                      activeStep === 2
                        ? "bg-green-500 ring-4 ring-green-100"
                        : activeStep > 2
                        ? "bg-green-500"
                        : "bg-gray-400"
                    }`}
                  >
                    <CheckIcon />
                  </div>

                  <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
                    Follow Up
                  </span>
                </button>

                {/* Connecting Line 2 */}
                <div
                  className={`pointer-events-none absolute left-[50%] right-[16%] top-4 z-0 h-[3px] rounded-full ${
                    activeStep >= 3
                      ? "bg-green-500"
                      : "bg-gray-200"
                  }`}
                />

                {/* Step 3 */}
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className="group relative z-10 flex flex-1 cursor-pointer flex-col items-center text-center"
                >
                  <div
                    className={`z-10 mb-3 flex h-8 w-8 items-center justify-center rounded-full text-white shadow-sm ${
                      activeStep >= 3
                        ? "bg-green-500"
                        : "bg-gray-400"
                    }`}
                  >
                    <CheckIcon />
                  </div>

                  <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
                    Summary
                  </span>
                </button>

              </div>
            </div>

            {content}

          </div>
        </div>
      </main>
    </div>
  );
};

/* ============================================================
   TREATMENT PLAN COMPONENT
   (combined from client/pages/doctor/Treatement.tsx —
    TreatmentPlan given the same embedded pattern as
    LabReview / Diagnosis / ChemotherapyOrder,
    icons kept scoped inside the component to avoid colliding
    with the module-level icons defined above,
    original Treatement.tsx file left untouched)
============================================================ */

type TreatmentType =
  | "Chemotherapy"
  | "Surgery"
  | "Radiation"
  | "Targeted Therapy";

interface RegimenProtocol {
  protocol_id: string;
  regimen_code: string;
  regimen_name: string;
  protocol_version?: string | null;
  cancer_type_id: string;
  subtype_id?: string | null;
  treatment_intent?: string | null;
  standard_cycles?: number | null;
  cycle_interval_days?: number | null;
  guideline_source?: string | null;
  notes?: string | null;
}

const TreatmentPlan: React.FC<{
  embedded?: boolean;
  patientId?: string;
  onNext?: () => void;
}> = ({ embedded = false, patientId, onNext }) => {
  const location = useLocation();
  const statePatientId = (
    (location.state as ConsultationState | null)?.patientId ?? ""
  );
  const resolvedPatientId = patientId || statePatientId;

  const [treatmentIntent, setTreatmentIntent] =
    useState("");

  const [treatmentTypes, setTreatmentTypes] = useState<
    TreatmentType[]
  >([]);

  const [lineOfTherapy, setLineOfTherapy] =
    useState("");

  const [plannedStartDate, setPlannedStartDate] =
    useState("");

  const [protocol, setProtocol] =
    useState("");

  const [remarks, setRemarks] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [protocols, setProtocols] = useState<RegimenProtocol[]>([]);
  const [protocolsLoading, setProtocolsLoading] = useState(false);
  const [protocolsError, setProtocolsError] = useState("");

  const [activeStep, setActiveStep] = useState(2);

  const planDraftKey = `hms_treatment_plan_${resolvedPatientId}`;

  useEffect(() => {
    if (!resolvedPatientId) return;
    const saved = localStorage.getItem(planDraftKey);

    if (!saved) return;

    try {
      const data = JSON.parse(saved) as {
        treatmentIntent?: string;
        treatmentTypes?: TreatmentType[];
        lineOfTherapy?: string;
        plannedStartDate?: string;
        protocol?: string;
        remarks?: string;
      };

      if (data.treatmentIntent) setTreatmentIntent(data.treatmentIntent);
      if (Array.isArray(data.treatmentTypes)) {
        setTreatmentTypes(data.treatmentTypes);
      }
      if (data.lineOfTherapy) setLineOfTherapy(data.lineOfTherapy);
      if (data.plannedStartDate) {
        setPlannedStartDate(data.plannedStartDate);
      }
      if (data.protocol) setProtocol(data.protocol);
      if (data.remarks) setRemarks(data.remarks);
    } catch (error) {
      console.error("Failed to restore treatment plan draft:", error);
    }
  }, [planDraftKey, resolvedPatientId]);

  useEffect(() => {
    if (!resolvedPatientId) return;
    localStorage.setItem(
      planDraftKey,
      JSON.stringify({
        treatmentIntent,
        treatmentTypes,
        lineOfTherapy,
        plannedStartDate,
        protocol,
        remarks,
      })
    );
  }, [
    treatmentIntent,
    treatmentTypes,
    lineOfTherapy,
    plannedStartDate,
    protocol,
    remarks,
    planDraftKey,
    resolvedPatientId,
  ]);

  const treatmentOptions: TreatmentType[] = [
    "Chemotherapy",
    "Surgery",
    "Radiation",
    "Targeted Therapy",
  ];

  const toggleTreatmentType = (
    type: TreatmentType
  ) => {
    setTreatmentTypes((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type]
    );
  };

  useEffect(() => {
    let cancelled = false;

    const loadRegimenProtocols = async () => {
      let cancerTypeId = "";
      let subtypeId = "";

      const saved = localStorage.getItem(
        "hms_diagnosis_selection"
      );

      if (saved) {
        try {
          const selection = JSON.parse(saved);
          cancerTypeId = selection?.cancer_type_id ?? "";
          subtypeId = selection?.subtype_id ?? "";
        } catch (error) {
          console.error(
            "Failed to parse diagnosis selection:",
            error
          );
        }
      }

      if (!cancerTypeId || !subtypeId) {
        setProtocolsError(
          "Cancer type and sub type not found. Complete the Diagnosis step first."
        );
        return;
      }

      setProtocolsLoading(true);
      setProtocolsError("");

      try {
        const response = await API.get<{
          success: boolean;
          data: RegimenProtocol[];
        }>("/chemotherapy/regimen-protocols", {
          params: {
            cancer_type_id: cancerTypeId,
            subtype_id: subtypeId,
          },
        });

        if (cancelled) return;

        const fetched = response.data?.data ?? [];
        setProtocols(fetched);

        if (fetched.length === 0) {
          setProtocolsError(
            "No protocols found for the selected cancer type and sub type."
          );
        }
      } catch (error: any) {
        console.error(
          "Failed to load regimen protocols:",
          error
        );
        if (!cancelled) {
          setProtocolsError(
            error?.response?.data?.message ||
              "Failed to load protocols. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setProtocolsLoading(false);
        }
      }
    };

    loadRegimenProtocols();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleNext = async () => {
    if (!resolvedPatientId) {
      setSaveError(
        "Patient is not selected. Open this page from a patient consultation to continue."
      );
      return;
    }

    if (!treatmentIntent) {
      setSaveError(
        "Please select a treatment intent before continuing."
      );
      return;
    }

    if (!plannedStartDate) {
      setSaveError(
        "Please set a planned start date before continuing."
      );
      return;
    }

    if (!protocol) {
      setSaveError("Please select a protocol before continuing.");
      return;
    }

    const dateMatch = plannedStartDate
      .trim()
      .match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    const treatmentStartDate = dateMatch
      ? `${dateMatch[3]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[1].padStart(2, "0")}`
      : plannedStartDate.trim();

    if (!/^\d{4}-\d{2}-\d{2}/.test(treatmentStartDate)) {
      setSaveError(
        "Planned start date is not a valid date (use DD-MM-YYYY or YYYY-MM-DD)."
      );
      return;
    }

    const saved = localStorage.getItem("hms_diagnosis_selection");
    let stagingDetailId = "";
    let diagnosisId = "";

    if (saved) {
      try {
        const selection = JSON.parse(saved);
        stagingDetailId = selection?.staging_detail_id ?? "";
        diagnosisId = selection?.diagnosis_id ?? "";
      } catch (error) {
        console.error("Failed to parse diagnosis selection:", error);
      }
    }

    if (!stagingDetailId || !diagnosisId) {
      try {
        const stagingResponse = await API.get<{
          success: boolean;
          data: {
            staging_detail_id: string;
            diagnosis_id: string | null;
          }[];
        }>("/oncology/staging-details", {
          params: { patient_id: resolvedPatientId, limit: 1 },
        });
        const latest = stagingResponse.data?.data?.[0];
        stagingDetailId = latest?.staging_detail_id ?? "";
        diagnosisId = latest?.diagnosis_id ?? "";
      } catch (error) {
        console.error("Failed to load staging details:", error);
      }
    }

    if (!stagingDetailId || !diagnosisId) {
      setSaveError(
        "Diagnosis has not been saved yet. Complete the Diagnosis step first."
      );
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      let employeeId = getUser()?.employee_id ?? null;

      if (!employeeId) {
        const me = await API.get<{
          success: boolean;
          user?: { employee_id?: string | null };
        }>("/auth/me");
        employeeId = me.data?.user?.employee_id ?? null;
      }

      if (!employeeId) {
        throw new Error(
          "Could not resolve the logged-in doctor. Please log in again."
        );
      }

      const employeeResponse = await employeeApi.getOne(employeeId);
      const departmentId =
        employeeResponse.data?.data?.employee?.department_id ?? "";

      if (!departmentId) {
        throw new Error(
          "Could not resolve the doctor's department. Please try again."
        );
      }

      const branchId =
        getActiveBranchId() ||
        employeeResponse.data?.data?.employee?.branch_id ||
        "";

      await API.post("/chemotherapy/plans", {
        patient_id: resolvedPatientId,
        staging_detail_id: stagingDetailId,
        diagnosis_id: diagnosisId,
        employee_id: employeeId,
        department_id: departmentId,
        branch_id: branchId,
        protocol_id: protocol,
        treatment_intent: treatmentIntent,
        treatment_start_date: treatmentStartDate,
        remarks: remarks || null,
        confirm_suggested_therapy: true,
      });

      alert("Treatment plan saved successfully.");

      setActiveStep(3);
      onNext?.();
    } catch (error: any) {
      console.error("Failed to save treatment plan:", error);
      setSaveError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to save the treatment plan. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    window.history.back();
  };

  const handleViewProfile = () => {
    console.log("View Full Profile clicked");
  };

  /* =========================================================
     ICONS (scoped inside the component to avoid colliding
     with the module-level icons defined above)
  ========================================================= */

  const ArrowLeftIcon = () => (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="M19 12H5M12 19l-7-7 7-7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const BellIcon = () => (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 21h4"
        strokeLinecap="round"
      />
    </svg>
  );

  const PhoneIcon = () => (
    <svg
      className="mr-2 h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="M22 16.92v3a2 2 0 0 1-2.18 2
        19.79 19.79 0 0 1-8.63-3.07
        19.5 19.5 0 0 1-6-6
        A19.79 19.79 0 0 1 2.12 4.18
        2 2 0 0 1 4.11 2h3
        a2 2 0 0 1 2 1.72
        c.12.9.33 1.78.62 2.63
        a2 2 0 0 1-.45 2.11L8 9.73
        a16 16 0 0 0 6 6l1.27-1.27
        a2 2 0 0 1 2.11-.45
        c.85.29 1.73.5 2.63.62
        A2 2 0 0 1 22 16.92z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const EnvelopeIcon = () => (
    <svg
      className="mr-2 h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
      />
      <path
        d="m3 7 9 6 9-6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const CalendarIcon = () => (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="17"
        rx="2"
      />
      <path
        d="M16 2v4M8 2v4M3 10h18"
        strokeLinecap="round"
      />
    </svg>
  );

  const ChevronDownIcon = () => (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="m6 9 6 6 6-6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const CheckIcon = () => (
    <svg
      className="h-3 w-3"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
    >
      <path
        d="m5 12 4 4L19 6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const DoubleArrowIcon = () => (
    <svg
      className="mr-2 h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path
        d="m6 7 5 5-5 5M13 7l5 5-5 5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  /* =========================================================
     CONTENT (TREATMENT PLAN FORM + ACTION)
  ========================================================= */

  const content = (
    <div className="mb-8 rounded-xl border border-slate-200 bg-white shadow-sm">

      <div className="space-y-8 p-8">

        {/* ============================================
            TREATMENT INTENT
        ============================================= */}

        <div>

          <label
            htmlFor="treatmentIntent"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Treatment Intent
          </label>

          <div className="relative w-full max-w-md">

            <select
              id="treatmentIntent"
              value={treatmentIntent}
              onChange={(event) =>
                setTreatmentIntent(event.target.value)
              }
              className="block w-full appearance-none rounded-lg border border-slate-300 bg-white p-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="Curative">
                Curative
              </option>

              <option value="Palliative">
                Palliative
              </option>
            </select>

            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
              <ChevronDownIcon />
            </div>

          </div>
        </div>

        {/* ============================================
            TREATMENT TYPE
        ============================================= */}

        <div>

          <label className="mb-3 block text-sm font-semibold text-slate-700">
            Treatment Type
          </label>

          <div className="flex flex-wrap gap-6">

            {treatmentOptions.map((type) => {
              const checked =
                treatmentTypes.includes(type);

              return (
                <label
                  key={type}
                  className="flex cursor-pointer items-center"
                >

                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      toggleTreatmentType(type)
                    }
                    className="h-5 w-5 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />

                  <span className="ml-2 text-slate-700">
                    {type}
                  </span>

                </label>
              );
            })}

          </div>
        </div>

        {/* ============================================
            LINE + START DATE
        ============================================= */}

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">

          {/* Line of Therapy */}
          <div>

            <label
              htmlFor="lineOfTherapy"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Line of Therapy
            </label>

            <div className="relative">

              <select
                id="lineOfTherapy"
                value={lineOfTherapy}
                onChange={(event) =>
                  setLineOfTherapy(event.target.value)
                }
                className="block w-full appearance-none rounded-lg border border-slate-300 bg-white p-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="First Line">
                  First Line
                </option>

                <option value="Second Line">
                  Second Line
                </option>
              </select>

              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                <ChevronDownIcon />
              </div>

            </div>
          </div>

          {/* Planned Start Date */}
          <div>

            <label
              htmlFor="plannedStartDate"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Planned Start Date
            </label>

            <Popover>
              <PopoverTrigger asChild>
                <div className="relative cursor-pointer">

                  <input
                    id="plannedStartDate"
                    type="text"
                    value={plannedStartDate}
                    onChange={(event) => {
                      const value = event.target.value;
                      setPlannedStartDate(value);
                      if (resolvedPatientId) {
                        localStorage.setItem(
                          `hms_planned_start_date_${resolvedPatientId}`,
                          value
                        );
                      }
                    }}
                    className="block w-full rounded-lg border border-slate-300 bg-white p-3 pr-12 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />

                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                    <CalendarIcon />
                  </div>

                </div>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={parsePickedDate(plannedStartDate)}
                  onSelect={(date) => {
                    if (date instanceof Date) {
                      const value = formatPickedDate(date);
                      setPlannedStartDate(value);
                      if (resolvedPatientId) {
                        localStorage.setItem(
                          `hms_planned_start_date_${resolvedPatientId}`,
                          value
                        );
                      }
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* ============================================
            PROTOCOL
        ============================================= */}

        <div>

          <div className="mb-2 flex items-center justify-between">

            <label
              htmlFor="protocol"
              className="block text-sm font-semibold text-slate-700"
            >
              Protocol
            </label>

            <button
              type="button"
              onClick={() =>
                console.log("View Protocol clicked")
              }
              className="text-sm font-semibold text-blue-700 hover:underline"
            >
              View Protocol
            </button>

          </div>

          <div className="relative">

            <select
              id="protocol"
              value={protocol}
              onChange={(event) => {
                const value = event.target.value;
                setProtocol(value);
                if (value) {
                  localStorage.setItem(
                    `hms_selected_protocol_id_${resolvedPatientId}`,
                    value
                  );
                } else {
                  localStorage.removeItem(
                    `hms_selected_protocol_id_${resolvedPatientId}`
                  );
                }
              }}
              className="block w-full appearance-none rounded-lg border border-slate-300 bg-white p-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">
                {protocolsLoading
                  ? "Loading protocols…"
                  : "Select Protocol"}
              </option>

              {protocols.map((item) => (
                <option
                  key={item.protocol_id}
                  value={item.protocol_id}
                >
                  {item.regimen_code} - {item.regimen_name}
                </option>
              ))}
            </select>

            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
              <ChevronDownIcon />
            </div>

          </div>

          {protocolsError && (
            <div className="mt-2 text-sm font-medium text-red-600">
              {protocolsError}
            </div>
          )}
        </div>

        {/* ============================================
            REMARKS
        ============================================= */}

        <div>

          <label
            htmlFor="remarks"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Remarks
          </label>

          <textarea
            id="remarks"
            rows={3}
            value={remarks}
            onChange={(event) =>
              setRemarks(event.target.value)
            }
            className="block w-full resize-none rounded-lg border border-slate-300 bg-white p-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />

        </div>

      </div>

      {/* ================================================
          FORM FOOTER
      ================================================= */}

      <div className="flex flex-col items-end gap-3 rounded-b-xl border-t border-slate-200 bg-slate-50 p-6">

        {saveError && (
          <div className="text-sm font-medium text-red-600">
            {saveError}
          </div>
        )}

        <button
          type="button"
          onClick={handleNext}
          disabled={saving}
          className="flex items-center rounded-lg bg-[#1d4ed8] px-6 py-2.5 font-semibold text-white transition-colors hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <DoubleArrowIcon />
          {saving ? "Saving…" : "Next"}
        </button>

      </div>
    </div>
  );

  if (embedded) {
    return (
      <div className="w-full">
        {content}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white text-slate-800 antialiased">

      {/* =======================================================
          LEFT SIDEBAR
      ======================================================== */}

      <aside className="flex w-[320px] shrink-0 flex-col border-r border-slate-200 bg-white">

        {/* Patient Profile */}
        <div className="flex flex-col items-center border-b border-slate-200 p-8">

          <img
            src=""
            alt="Patient Photo"
            className="mb-4 h-32 w-32 rounded-full border border-slate-100 object-cover object-[50%_10%] shadow-sm"
          />

          <h2 className="mb-1 text-xl font-bold text-slate-900">
            {""}
          </h2>

          <p className="mb-3 text-sm text-slate-500">
            {""}
          </p>

          <div className="mb-4 rounded-md bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
            {""}
          </div>

          <p className="text-center text-sm font-bold tracking-wide text-blue-700">
            {""}
          </p>
        </div>

        {/* Patient Information */}
        <div className="flex-1 space-y-6 overflow-y-auto p-8">

          {/* Phone */}
          <div>
            <div className="mb-1 flex items-center text-xs font-semibold uppercase tracking-wider text-slate-400">
              <PhoneIcon />
              PHONE
            </div>

            <p className="text-slate-900">
              {""}
            </p>
          </div>

          {/* Email */}
          <div>
            <div className="mb-1 flex items-center text-xs font-semibold uppercase tracking-wider text-slate-400">
              <EnvelopeIcon />
              EMAIL
            </div>

            <p className="text-slate-900">
              {""}
            </p>
          </div>

          {/* Vitals */}
          <div className="grid grid-cols-2 gap-y-6 pt-2">

            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                HEIGHT
              </div>
              <p className="font-semibold text-slate-900">
                {""}
              </p>
            </div>

            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                WEIGHT
              </div>
              <p className="font-semibold text-slate-900">
                {""}
              </p>
            </div>

            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                BSA
              </div>
              <p className="font-semibold text-slate-900">
                {""}
              </p>
            </div>

            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                BMI
              </div>
              <p className="font-semibold text-slate-900">
                {""}
              </p>
            </div>

          </div>
        </div>

        {/* Profile Button */}
        <div className="p-6">

          <button
            type="button"
            onClick={handleViewProfile}
            className="w-full rounded-lg border-2 border-blue-600 py-2.5 font-semibold text-blue-600 transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            View Full Profile
          </button>

        </div>
      </aside>

      {/* =======================================================
          MAIN CONTENT
      ======================================================== */}

      <main className="flex min-w-0 flex-1 flex-col bg-[#fafafa]">

        {/* =====================================================
            TOP NAVIGATION
        ====================================================== */}

        <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-8">

          {/* Left */}
          <div className="flex items-center">

            <button
              type="button"
              onClick={handleBack}
              className="mr-4 text-slate-500 transition-colors hover:text-slate-700 focus:outline-none"
              aria-label="Go back"
            >
              <ArrowLeftIcon />
            </button>

            <h1 className="text-2xl font-bold text-slate-900">
              Patients
            </h1>

          </div>

          {/* Right */}
          <div className="flex items-center space-x-6">

            <button
              type="button"
              className="relative text-slate-400 transition-colors hover:text-slate-600"
              aria-label="Notifications"
            >
              <BellIcon />

              <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
            </button>

            <div className="flex items-center space-x-3 border-l border-slate-200 pl-6">

              <span className="font-bold text-slate-800">
                HMS
              </span>

              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-800 text-xs font-bold text-white">
                DR
              </div>

            </div>
          </div>
        </header>

        {/* =====================================================
            SCROLLABLE MAIN AREA
        ====================================================== */}

        <div className="flex-1 overflow-y-auto">

          <div className="mx-auto max-w-[1200px] p-8">

            {/* =================================================
                STEPPER
            ================================================== */}

            <div className="mb-8 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">

              <div className="relative mx-auto flex max-w-4xl items-start justify-between">

                {/* Connecting Line */}
                <div className="absolute left-[16.66%] right-[16.66%] top-3 hidden h-0.5 bg-slate-200 md:block" />

                {/* Step 1 */}
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="relative z-10 flex w-1/3 flex-col items-center"
                >

                  <div
                    className={`mb-3 flex h-6 w-6 items-center justify-center rounded-full text-white ${
                      activeStep >= 1
                        ? "bg-green-500"
                        : "bg-slate-400"
                    }`}
                  >
                    <CheckIcon />
                  </div>

                  <span className="text-xs font-bold tracking-wider text-slate-900">
                    DIAGNOSIS
                  </span>

                </button>

                {/* Step 2 */}
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="relative z-10 flex w-1/3 flex-col items-center"
                >

                  <div
                    className={`mb-3 flex h-6 w-6 items-center justify-center rounded-full text-white shadow-md ring-4 ring-white ${
                      activeStep >= 2
                        ? "bg-green-500"
                        : "bg-slate-400"
                    }`}
                  >
                    <CheckIcon />
                  </div>

                  <span className="mb-2 text-xs font-bold tracking-wider text-slate-900">
                    TREATMENT PLAN
                  </span>

                  {activeStep === 2 && (
                    <div className="h-1.5 w-48 max-w-full rounded-full bg-green-500" />
                  )}

                </button>

                {/* Step 3 */}
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className="relative z-10 flex w-1/3 flex-col items-center"
                >

                  <div
                    className={`mb-3 flex h-6 w-6 items-center justify-center rounded-full text-white ${
                      activeStep >= 3
                        ? "bg-green-500"
                        : "bg-slate-400"
                    }`}
                  >
                    <CheckIcon />
                  </div>

                  <span className="text-center text-xs font-bold tracking-wider text-slate-900">
                    CHEMOTHERAPY ORDER
                  </span>

                </button>

              </div>
            </div>

            {/* =================================================
                FORM AREA
            ================================================== */}

            {content}

          </div>
        </div>
      </main>
    </div>
  );
};

/* ============================================================
   SUMMARY COMPONENT
   (combined from client/pages/doctor/summary.tsx —
    renamed PatientSummary → Summary, Step helper moved inside
    the component to avoid colliding with other names in this
    file, embedded prop added so it can live in this file,
    original summary.tsx file left untouched)
============================================================ */

type SummaryPlanItem = {
  chemotherapy_plan_item_id: string;
  drug_role: string | null;
  protocol_dose: number | null;
  protocol_dose_unit: string | null;
  formulation: string | null;
  dilution_volume: string | null;
  administration_route: string | null;
  frequency: string | null;
  remarks: string | null;
  medicine_master: {
    medicine_name: string;
    generic_name: string | null;
    dosage_form: string | null;
    unit: string | null;
  } | null;
};

type SummaryPlan = {
  chemotherapy_plan_id: string;
  patient_id: string;
  cancer_type: string | null;
  cancer_subtype: string | null;
  cancer_stage: string | null;
  protocol_name: string | null;
  regimen_name: string | null;
  regimen_code: string | null;
  treatment_intent: string | null;
  treatment_goal: string | null;
  treatment_status: string | null;
  planned_cycles: number;
  completed_cycles: number | null;
  cycle_interval_days: number | null;
  treatment_start_date: string | null;
  expected_end_date: string | null;
  chemotherapy_cycle: {
    cycle_number: number;
    cycle_day: number | null;
  }[] | null;
  chemotherapy_plan_items: SummaryPlanItem[] | null;
  oncology_staging_detail: {
    clinical_stage: string | null;
    cancer_types: { cancer_type: string } | null;
    cancer_subtypes: { subtype_name: string } | null;
    derived_fields: { ajcc_stage: string | null } | null;
  } | null;
};

type ChemoOrderRow = {
  drug: string;
  form: string;
  dose: string;
  unit: string;
  volume: string;
};

type PremedRow = {
  drug: string;
  dose: string;
  route: string;
  time: string;
};

type DischargeRow = {
  drug: string;
  dose: string;
  frequency: string;
  instruction: string;
  duration: string;
};

const Summary: React.FC<{ embedded?: boolean; patientId?: string }> = ({
  embedded = false,
  patientId,
}) => {
  const location = useLocation();
  const statePatientId = (
    (location.state as ConsultationState | null)?.patientId ?? ""
  );
  const resolvedPatientId = patientId || statePatientId;

  const [nextVisitDate] = useState(() =>
    resolvedPatientId
      ? (localStorage.getItem(
          `hms_next_cycle_date_${resolvedPatientId}`
        ) ?? "")
      : ""
  );
  const [nextCycle] = useState(() =>
    resolvedPatientId
      ? (localStorage.getItem(
          `hms_next_cycle_${resolvedPatientId}`
        ) ?? "")
      : ""
  );

  const [plan, setPlan] = useState<SummaryPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState("");

  useEffect(() => {
    if (!resolvedPatientId) return;
    let cancelled = false;
    setPlanLoading(true);
    setPlanError("");
    const branchId =
      getActiveBranchId() ?? getUser()?.branch_id ?? undefined;
    API.get<{ success: boolean; data: SummaryPlan[] }>(
      "/chemotherapy/plans",
      {
        params: { patient_id: resolvedPatientId, branchId, page: 1, limit: 1 },
      }
    )
      .then((response) => {
        if (cancelled) return;
        const planId = response.data.data?.[0]?.chemotherapy_plan_id;
        if (!planId) return;
        return API.get<{ success: boolean; data: SummaryPlan }>(
          `/chemotherapy/plans/${planId}`
        ).then((detail) => {
          if (!cancelled) setPlan(detail.data.data);
        });
      })
      .catch((error) => {
        console.error("Failed to load chemotherapy plan:", error);
        if (!cancelled) {
          setPlanError(
            error?.response?.data?.message ||
              "Failed to load the chemotherapy plan."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setPlanLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedPatientId]);

  const planItems = plan?.chemotherapy_plan_items ?? [];

  const chemotherapyOrders: ChemoOrderRow[] = planItems
    .filter((item) => item.drug_role === "PRIMARY")
    .map((item) => ({
      drug:
        item.medicine_master?.medicine_name ||
        item.medicine_master?.generic_name ||
        "",
      form:
        item.formulation || item.medicine_master?.dosage_form || "",
      dose: item.protocol_dose != null ? String(item.protocol_dose) : "",
      unit:
        item.protocol_dose_unit || item.medicine_master?.unit || "",
      volume:
        item.dilution_volume != null ? String(item.dilution_volume) : "",
    }));

  const premedications: PremedRow[] = planItems
    .filter((item) => item.drug_role === "PREMEDICATION")
    .map((item) => ({
      drug:
        item.medicine_master?.medicine_name ||
        item.medicine_master?.generic_name ||
        "",
      dose: item.protocol_dose != null ? String(item.protocol_dose) : "",
      route: item.administration_route || "",
      time: item.frequency || "",
    }));

  const dischargeMedications: DischargeRow[] = planItems
    .filter(
      (item) =>
        item.drug_role === "SUPPORTIVE" ||
        item.drug_role === "POSTMEDICATION"
    )
    .map((item) => ({
      drug:
        item.medicine_master?.medicine_name ||
        item.medicine_master?.generic_name ||
        "",
      dose: item.protocol_dose != null ? String(item.protocol_dose) : "",
      frequency: item.frequency || "",
      instruction: item.remarks || "",
      duration: item.administration_route
        ? `via ${item.administration_route}`
        : "",
    }));

  const cancerType =
    plan?.oncology_staging_detail?.cancer_types?.cancer_type ||
    plan?.cancer_type ||
    "";

  const stage =
    plan?.cancer_stage ||
    plan?.oncology_staging_detail?.clinical_stage ||
    plan?.oncology_staging_detail?.derived_fields?.ajcc_stage ||
    "";

  const context = plan?.treatment_intent || plan?.treatment_goal || "";

  const protocol =
    plan?.protocol_name ||
    (plan?.regimen_code
      ? `${plan.regimen_code} - ${plan.regimen_name}`
      : plan?.regimen_name) ||
    "";

  const duration = plan?.planned_cycles
    ? `${plan.planned_cycles} cycle${plan.planned_cycles > 1 ? "s" : ""}${
        plan.cycle_interval_days
          ? ` (every ${plan.cycle_interval_days} days)`
          : ""
      }`
    : "";

  const current = (() => {
    const cycles = plan?.chemotherapy_cycle ?? [];
    const latest = cycles[cycles.length - 1];
    const cycleLabel = latest
      ? `Cycle ${latest.cycle_number} / Day ${latest.cycle_day ?? "—"}`
      : "";
    const status = plan?.treatment_status
      ? ` (${plan.treatment_status})`
      : "";
    return `${cycleLabel}${status}`;
  })();

  const handleDownloadSummary = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
    });

    doc.setFontSize(16);
    doc.setTextColor(20, 30, 40);
    doc.text("Chemotherapy Summary", 40, 44);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    const infoLine = [
      `Patient: ${resolvedPatientId}`,
      cancerType && `Cancer Type: ${cancerType}`,
      stage && `Stage: ${stage}`,
      context && `Context: ${context}`,
      protocol && `Protocol: ${protocol}`,
      duration && `Duration: ${duration}`,
      current && `Current: ${current}`,
    ]
      .filter(Boolean)
      .join("   |   ");
    doc.text(infoLine, 40, 60);

    const tableStyles = {
      fontSize: 8,
      cellPadding: 5,
      textColor: [30, 41, 59] as [number, number, number],
      lineColor: [226, 232, 240] as [number, number, number],
      lineWidth: 0.5,
    };
    const headStyles = {
      fillColor: [0, 71, 133] as [number, number, number],
      textColor: [255, 255, 255] as [number, number, number],
      fontSize: 8.5,
      fontStyle: "bold" as const,
    };

    let y = 72;

    const renderTable = (
      title: string,
      head: string[],
      body: string[][]
    ) => {
      if (y > 420) {
        doc.addPage();
        y = 40;
      }
      doc.setFontSize(11);
      doc.setTextColor(49, 46, 129);
      doc.text(title, 40, y);
      y += 8;
      autoTable(doc, {
        startY: y,
        head: [head],
        body,
        styles: tableStyles,
        headStyles,
        alternateRowStyles: { fillColor: [247, 249, 251] },
        margin: { left: 40, right: 40 },
      });
      y = (doc as any).lastAutoTable?.finalY ?? y;
      y += 24;
    };

    renderTable(
      "Chemotherapy Orders",
      ["Drug Name", "Form", "Dose", "Unit", "Volume"],
      chemotherapyOrders.map((row) => [
        row.drug,
        row.form,
        row.dose,
        row.unit,
        row.volume,
      ])
    );
    renderTable(
      "Premedication",
      ["Drug Name", "Dose", "Route", "Time"],
      premedications.map((row) => [row.drug, row.dose, row.route, row.time])
    );
    renderTable(
      "Discharge Medication",
      ["Drug Name", "Dose", "Frequency", "Instruction", "Duration"],
      dischargeMedications.map((row) => [
        row.drug,
        row.dose,
        row.frequency,
        row.instruction,
        row.duration,
      ])
    );

    y += 8;
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`Next Visit Date: ${nextVisitDate || "—"}`, 40, y);
    doc.text(`Next Cycle: ${nextCycle || "—"}`, 300, y);

    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chemotherapy-summary-${resolvedPatientId || "patient"}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const Step = ({
    label,
    active = false,
  }: {
    label: string;
    active?: boolean;
  }) => (
    <div className="relative z-10 flex w-48 flex-col items-center gap-3">
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs text-white ${
          active ? "bg-green-500" : "bg-slate-400"
        }`}
      >
        ✓
      </div>

      <span
        className={`text-center text-xs font-bold uppercase tracking-wider ${
          active ? "text-slate-800" : "text-slate-600"
        }`}
      >
        {label}
      </span>

      {active && (
        <div className="absolute -bottom-6 h-1 w-full rounded-t-sm bg-green-500" />
      )}
    </div>
  );

  /* =========================================================
     CONTENT (SUMMARY CARD + ACTION BUTTONS)
  ========================================================= */

  const content = (
    <>
      {/* ===================================================
          SUMMARY CARD
      ==================================================== */}
      <div className="mb-6 flex flex-1 flex-col rounded-b-xl border border-slate-200 bg-white shadow-sm">
        {/* Summary Heading */}
        <div className="flex justify-center border-b border-slate-100 p-4">
          <h2 className="text-xl font-semibold text-blue-700">
            Summary
          </h2>
        </div>

        <div className="flex flex-1 flex-col gap-10 p-8">
          {/* =================================================
              PATIENT INFORMATION
          ================================================== */}
          <section>
            {planLoading && (
              <div className="mb-4 text-sm text-slate-500">
                Loading chemotherapy plan...
              </div>
            )}
            {planError && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {planError}
              </div>
            )}
            {!planLoading && !planError && !plan && (
              <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                No chemotherapy plan found for this patient yet.
              </div>
            )}
            <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="mb-2 font-medium text-slate-900">
                  Cancer Type
                </p>
                <p className="text-sm text-slate-500">
                  {cancerType}
                </p>
              </div>

              <div>
                <p className="mb-2 font-medium text-slate-900">
                  Stage
                </p>

                <p className="flex items-center gap-2 text-sm text-slate-500">
                  {stage}
                  <span className="text-slate-400">◷</span>
                </p>
              </div>

              <div>
                <p className="mb-2 font-medium text-slate-900">
                  Context
                </p>

                <p className="text-sm text-slate-500">{context}</p>
              </div>

              <div />

              <div>
                <p className="mb-2 font-medium text-slate-900">
                  Protocol
                </p>

                <p className="flex items-center gap-2 text-sm text-slate-500">
                  {protocol}
                  <span className="text-slate-400">◷</span>
                </p>
              </div>

              <div>
                <p className="mb-2 font-medium text-slate-900">
                  Duration
                </p>

                <p className="text-sm text-slate-500">
                  {duration}
                </p>
              </div>

              <div>
                <p className="mb-2 font-medium text-slate-900">
                  Current
                </p>

                <p className="text-sm text-slate-500">
                  {current}
                </p>
              </div>
            </div>
          </section>

          {/* =================================================
              CHEMOTHERAPY ORDERS
          ================================================== */}
          <section>
            <h3 className="mb-4 text-lg font-medium text-indigo-900">
              Chemotherapy Orders
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead>
                  <tr>
                    <th className="w-1/4 pb-3 font-medium text-slate-900">
                      Drug Name
                    </th>

                    <th className="w-1/5 pb-3 font-medium text-slate-900">
                      Form
                    </th>

                    <th className="w-1/5 pb-3 font-medium text-slate-900">
                      Dose
                    </th>

                    <th className="w-1/5 pb-3 font-medium text-slate-900">
                      Unit
                    </th>

                    <th className="pb-3 font-medium text-slate-900">
                      Volume
                    </th>
                  </tr>
                </thead>

                <tbody className="text-slate-500">
                  {chemotherapyOrders.map((item) => (
                    <tr key={item.drug}>
                      <td className="py-3">{item.drug}</td>
                      <td className="py-3">{item.form}</td>
                      <td className="py-3">{item.dose}</td>
                      <td className="py-3 text-xs uppercase">
                        {item.unit}
                      </td>
                      <td className="py-3 text-xs uppercase">
                        {item.volume}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* =================================================
              PREMEDICATION
          ================================================== */}
          <section>
            <h3 className="mb-4 text-lg font-medium text-indigo-900">
              Premedication
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead>
                  <tr>
                    <th className="w-1/4 pb-3 font-medium text-slate-900">
                      Drug Name
                    </th>

                    <th className="w-1/5 pb-3 font-medium text-slate-900">
                      Dose
                    </th>

                    <th className="w-1/5 pb-3 font-medium text-slate-900">
                      Route
                    </th>

                    <th className="pb-3 font-medium text-slate-900">
                      Time
                    </th>
                  </tr>
                </thead>

                <tbody className="text-slate-800">
                  {premedications.map((item) => (
                    <tr key={item.drug}>
                      <td className="py-3">{item.drug}</td>
                      <td className="py-3">{item.dose}</td>
                      <td className="py-3">{item.route}</td>
                      <td className="py-3">{item.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* =================================================
              DISCHARGE MEDICATION
          ================================================== */}
          <section>
            <h3 className="mb-4 text-lg font-medium text-indigo-900">
              Discharge Medication
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr>
                    <th className="w-1/5 pb-3 font-medium text-slate-900">
                      Drug Name
                    </th>

                    <th className="w-1/6 pb-3 font-medium text-slate-900">
                      Dose
                    </th>

                    <th className="w-1/6 pb-3 font-medium text-slate-900">
                      Frequency
                    </th>

                    <th className="w-1/4 pb-3 font-medium text-slate-900">
                      Instruction
                    </th>

                    <th className="pb-3 font-medium text-slate-900">
                      Duration
                    </th>
                  </tr>
                </thead>

                <tbody className="text-slate-800">
                  {dischargeMedications.map((item) => (
                    <tr key={item.drug}>
                      <td className="py-3">{item.drug}</td>
                      <td className="py-3">{item.dose}</td>
                      <td className="py-3">{item.frequency}</td>
                      <td className="py-3">{item.instruction}</td>
                      <td className="py-3">{item.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* =================================================
              FOOTER DATES
          ================================================== */}
          <section className="grid grid-cols-1 gap-6 border-t border-slate-100 pt-6 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-900">
                Next Visit Date
              </p>

              <p className="text-slate-600">{nextVisitDate}</p>
            </div>

            <div className="sm:pl-8">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-900">
                Next Cycle
              </p>

              <p className="flex items-center gap-2 text-slate-600">
                {nextCycle}
                <span className="text-slate-400">◷</span>
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* ===================================================
          ACTION BUTTONS
      ==================================================== */}
      <div className="mb-8 flex flex-wrap justify-end gap-4">
        <button
          type="button"
          className="rounded-md bg-[#5624D0] px-8 py-3 font-medium text-white shadow-sm transition-colors hover:bg-[#4a1fb5]"
        >
          Submit
        </button>

        <button
          type="button"
          onClick={handleDownloadSummary}
          className="rounded-md bg-[#5624D0] px-8 py-3 font-medium text-white shadow-sm transition-colors hover:bg-[#4a1fb5]"
        >
          Print / Download Summary
        </button>
      </div>
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      {/* =========================================================
          LEFT SIDEBAR
      ========================================================== */}
      <aside className="z-10 flex h-full w-[320px] shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white">
        {/* Patient Profile */}
        <div className="flex flex-col items-center border-b border-slate-100 p-8">
          <img
            src=""
            alt="Patient Avatar"
            className="mb-4 h-24 w-24 rounded-full border-2 border-white object-cover shadow-sm"
          />

          <h2 className="mb-1 text-xl font-bold text-slate-900">
            {""}
          </h2>

          <p className="mb-4 text-sm text-slate-500">{""}</p>

          <span className="mb-6 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {""}
          </span>

          <p className="text-center text-sm font-semibold tracking-wide text-blue-600">
            {""}
          </p>
        </div>

        {/* Contact Information */}
        <div className="flex flex-col gap-6 border-b border-slate-100 p-6">
          {/* Phone */}
          <div className="flex items-center gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400">
              <span className="text-sm">☎</span>
            </div>

            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">
                Phone
              </p>

              <p className="text-sm font-medium text-slate-800">
                {""}
              </p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400">
              <span className="text-sm">✉</span>
            </div>

            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">
                Email
              </p>

              <p className="text-sm font-medium text-slate-700">
                {""}
              </p>
            </div>
          </div>
        </div>

        {/* Vitals */}
        <div className="mb-6 grid grid-cols-2 gap-x-4 gap-y-6 p-6">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">
              Height
            </p>
            <p className="font-semibold text-slate-800">{""}</p>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">
              Weight
            </p>
            <p className="font-semibold text-slate-800">{""}</p>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">
              BSA
            </p>
            <p className="font-semibold text-slate-800">{""}</p>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">
              BMI
            </p>
            <p className="font-semibold text-slate-800">{""}</p>
          </div>
        </div>

        {/* Profile Button */}
        <div className="px-6 pb-6">
          <button
            type="button"
            className="w-full rounded-md border border-blue-600 px-4 py-2.5 font-medium text-blue-600 transition-colors hover:bg-blue-50"
          >
            View Full Profile
          </button>
        </div>
      </aside>

      {/* =========================================================
          MAIN CONTENT
      ========================================================== */}
      <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-slate-50">
        {/* =======================================================
            TOP NAVIGATION
        ======================================================== */}
        <header className="z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="text-slate-500 transition-colors hover:text-slate-700"
              aria-label="Back"
            >
              <span className="text-lg">←</span>
            </button>

            <h1 className="text-xl font-semibold text-slate-800">
              Patients
            </h1>
          </div>

          <div className="flex items-center gap-6">
            {/* Notification */}
            <button
              type="button"
              className="relative text-slate-500 transition-colors hover:text-slate-700"
              aria-label="Notifications"
            >
              <span className="text-xl">♧</span>

              <span className="absolute right-0 top-0 h-2 w-2 rounded-full border border-white bg-red-500" />
            </button>

            {/* User */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-600">
                HMS
              </span>

              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1E3A8A] text-xs font-semibold text-white">
                DR
              </div>
            </div>
          </div>
        </header>

        {/* =======================================================
            SCROLLABLE CONTENT
        ======================================================== */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto flex w-full max-w-[1000px] flex-col">
            {/* ===================================================
                PROGRESS STEPPER
            ==================================================== */}
            <div className="relative mb-px flex justify-between rounded-t-xl border border-slate-200 bg-white p-6">
              {/* Background connector */}
              <div className="absolute left-24 right-24 top-9 h-[2px] bg-slate-100" />

              {/* Green progress */}
              <div className="absolute left-24 top-9 h-[2px] w-1/2 bg-green-500" />

              <Step label="Discharge Medication" />

              <Step label="Follow Up" />

              <Step label="Summary" active />
            </div>

            {content}
          </div>
        </div>
      </main>
    </div>
  );
};

/* ============================================================
   MEDICATION PORTAL COMPONENT
   (combined from client/pages/doctor/Medication.tsx —
    renamed HMSPatientPortal → MedicationPortal so it can live
    in this file, original Medication.tsx file left untouched)
============================================================ */

type Tab = "Order Summary" | "Medications" | "Discharge" | "History" | "Notes & Documents";

const tabs: Tab[] = [
  "Order Summary",
  "Medications",
  "Discharge",
  "History",
  "Notes & Documents",
];

const premedications = [
  { no: 1, medication: "Decadron", sub: "(Dexamethasone)", dose: "12 mg", route: ["IV", "Push"], timing: ["T-30", "mins"] },
  { no: 2, medication: "Avil (Pheniramine)", sub: "", dose: "22.75", dose2: "mg", route: ["IV", "Push"], timing: ["T-15", "mins"] },
  { no: 3, medication: "Palzen (Palonosetron)", sub: "", dose: "0.25", dose2: "mg", route: ["IV", "Push"], timing: ["T-10", "mins"] },
];

const chemoDrugs = [
  { no: 1, drug: "Taxol (Paclitaxel)", calc: "80 mg/m²", actual: "137.6 mg", route: "IV Infusion", diluent: "NS 250ml", status: "GIVEN" },
  { no: 2, drug: "Herceptin (Trastuzumab)", calc: "2 mg", actual: "128 mg", route: "IV Infusion", diluent: "NS 100ml", status: "PENDING" },
  { no: 3, drug: "Carboplatin", calc: "AUC 6", actual: "450 mg", route: "IV Infusion", diluent: "D5W 500ml", status: "PENDING" },
];

const dischargeMeds = [
  { no: 1, medication: "Capecitabine", dose: "12 mg", frequency: "2-0-2", instruction: "Twice Daily", duration: "5 Days" },
  { no: 2, medication: "Paracetamol", dose: "22.75 mg", frequency: "2-0-2", instruction: "Once Daily", duration: "5 Days" },
];

function StatusBadge({ children, warning = false }: { children: React.ReactNode; warning?: boolean }) {
  return (
    <span className={`inline-flex rounded-md px-2.5 py-1 text-[10px] font-bold uppercase ${
      warning ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
    }`}>
      {children}
    </span>
  );
}

function SectionHeader({ icon, title, badge, badgeClass = "bg-blue-100 text-[#0052cc]" }: {
  icon: string; title: string; badge: string; badgeClass?: string;
}) {
  return (
    <div className="flex items-center border-b border-slate-100 bg-slate-50/50 px-6 py-4">
      <i className={`${icon} mr-3 text-sm text-slate-400`} />
      <h3 className="mr-3 text-lg font-bold text-slate-800">{title}</h3>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeClass}`}>{badge}</span>
    </div>
  );
}

const MedicationPortal: React.FC<{ onBackToProfile?: () => void }> = ({
  onBackToProfile,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>("Medications");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <button
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
        />
      )}

     

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-slate-500 lg:hidden">
              <i className="fa-solid fa-bars" />
            </button>
            <div className="flex items-center text-sm font-semibold text-slate-700">
              <i className="fa-solid fa-code-branch mr-2 text-slate-400" />
              Main Branch
              <i className="fa-solid fa-chevron-down ml-2 text-[10px] text-slate-400" />
            </div>
          </div>
          <div className="flex items-center gap-5">
            <button className="relative text-slate-500 hover:text-[#0052cc]">
              <i className="fa-regular fa-bell text-xl" />
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
            </button>
            <div className="flex items-center gap-2 border-l border-slate-200 pl-5">
              <span className="font-bold text-[#0052cc]">HMS</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-white">
                <i className="fa-solid fa-user text-xs" />
              </div>
            </div>
          </div>
        </header>

            <div className="flex-1 overflow-y-auto relative">
            <div className="p-8 max-w-[1400px] mx-auto pb-32">
            {/* BEGIN: Patient Header Card */}
            <div className="bg-white rounded-[16px] border border-[#e2e8f0] p-6 shadow-sm mb-6 flex justify-between items-center">
            <div className="flex items-center">
            <img alt="Vijaya Nallusamy" className="w-20 h-20 rounded-full border-4 border-white shadow-sm object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVmv5vhpN6g6IwvwVBONWYZS06j9iELGi3guKAqt6M68HTL3HxSslWkIMAEQjWeTlKNOdnc-Pipmecvq47y_J4JkJpXBa7ODMic8izxEnar0D-CTbCOUggEhRCTr29jfsIrqPw9jJJRvmghxFC8vXF6U5zjzrn_8ajoH2ovseUywhLI0FurjCqa2DjfMMM3yvISAkY7jN2EjygmPh_WvJa_vc06-pRUGw2Xu4pFrWdOcPdAl4HggI"/>
            <div className="ml-6">
            <div className="flex items-center space-x-3 mb-1">
            <h2 className="text-xl font-bold text-[#1e293b]">Vijaya Nallusamy</h2>
            <span className="bg-slate-100 text-[#64748b] px-3 py-1 rounded-full text-xs font-semibold">ONC-2026-10025</span>
            </div>
            <div className="text-sm text-[#64748b] flex items-center space-x-3">
            <span>51Y / Female</span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span className="text-[#1d4ed8] font-semibold">Ductal Carcinoma Stage II</span>
            </div>
            </div>
            </div>
            <div className="flex items-center">
            <div className="flex space-x-8 px-8 border-r border-[#e2e8f0]">
            <div className="space-y-4">
            <div>
            <div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">HEIGHT</div>
            <div className="font-bold text-sm">154 cm</div>
            </div>
            <div>
            <div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">BP</div>
            <div className="font-bold text-sm">118/74</div>
            </div>
            </div>
            <div className="space-y-4">
            <div>
            <div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">WEIGHT</div>
            <div className="font-bold text-sm">52 kg</div>
            </div>
            <div>
            <div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">PULSE</div>
            <div className="font-bold text-sm">78 bpm</div>
            </div>
            </div>
            <div className="space-y-4">
            <div>
            <div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">BSA</div>
            <div className="font-bold text-sm">1.49 m²</div>
            </div>
            <div>
            <div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">TEMP</div>
            <div className="font-bold text-sm">36.8 °C</div>
            </div>
            </div>
            <div className="space-y-4">
            <div>
            <div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">BMI</div>
            <div className="font-bold text-sm">21.93</div>
            </div>
            <div>
            <div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">SPO2</div>
            <div className="font-bold text-sm">99%</div>
            </div>
            </div>
            </div>
            <div className="pl-8">
            <div className="bg-blue-50/50 border border-blue-100 rounded-[12px] p-4 w-[220px]">
            <div className="text-[10px] font-bold text-[#1d4ed8] uppercase tracking-wider mb-1.5">INTENT: NEOADJUVANT</div>
            <div className="text-[15px] font-bold text-[#1d4ed8] mb-2.5">TAXOL - WEEKLY</div>
            <div className="flex items-center text-xs text-[#64748b] font-medium">
            <span className="w-2 h-2 rounded-full bg-[#10b981] mr-2"></span> Active Protocol
                    </div>
            </div>
            </div>
            </div>
            </div>
            {/* END: Patient Header Card */}

            {/* BEGIN: Alerts Banner */}
            <div className="flex items-center justify-between text-sm mb-8 border-b border-[#e2e8f0] pb-4">
            <div className="flex items-center space-x-8">
            <div className="flex items-center">
            <i className="fa-solid fa-triangle-exclamation text-[#ef4444] mr-2"></i>
            <span className="text-[#ef4444] font-semibold">Allergy:</span> <span className="ml-1 text-[#1e293b]">Penicillin</span>
            </div>
            <div className="flex items-center">
            <i className="fa-solid fa-clock-rotate-left text-[#f59e0b] mr-2"></i>
            <span className="text-[#f59e0b] font-semibold">Previous Cycle:</span> <span className="ml-1 text-[#1e293b]">Grade 2 Neutropenia</span>
            </div>
            <div className="flex items-center text-[#1d4ed8] font-medium">
            <i className="fa-solid fa-link mr-2"></i>
            <span>Central Line Available</span>
            </div>
            </div>
            <a className="text-[#1d4ed8] font-semibold hover:underline" href="#">View Full Alerts (2)</a>
            </div>
            {/* END: Alerts Banner */}

            {/* Tabs */}
            <div className="overflow-x-auto border-b border-slate-200">
              <nav className="flex min-w-max space-x-8">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      if (tab === "Order Summary") {
                        onBackToProfile?.();
                        return;
                      }
                      setActiveTab(tab);
                    }}
                    className={`border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? "border-[#0052cc] text-[#0052cc]"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </nav>
            </div>

            {activeTab === "Medications" ? (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    ["TOTAL MEDS", "8", "fa-solid fa-pills", "bg-blue-50 text-[#0052cc]"],
                    ["PREMEDS", "3", "fa-solid fa-syringe", "bg-purple-50 text-purple-600"],
                    ["CHEMO", "3", "fa-solid fa-hourglass-half", "bg-red-50 text-red-500"],
                    ["SUPPORTIVE", "2", "fa-solid fa-heart-pulse", "bg-emerald-50 text-emerald-500"],
                  ].map(([label, value, icon, cls]) => (
                    <div key={label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                        <p className="text-2xl font-bold text-slate-800">{value}</p>
                      </div>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${cls}`}>
                        <i className={icon} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-col gap-6 lg:flex-row">
                  <div className="min-w-0 flex-1 space-y-6">
                    {/* Premeds */}
                    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      <SectionHeader icon="fa-solid fa-chevron-down" title="Premedications" badge="3 Prescribed" />
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px] text-left text-sm">
                          <thead className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
                            <tr>
                              <th className="w-12 px-6 py-4 text-center font-semibold">#</th>
                              <th className="px-6 py-4 font-semibold">MEDICATION</th>
                              <th className="px-6 py-4 font-semibold">DOSE</th>
                              <th className="px-6 py-4 font-semibold">ROUTE</th>
                              <th className="px-6 py-4 font-semibold">TIMING</th>
                              <th className="px-6 py-4 text-center font-semibold">STATUS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {premedications.map((m) => (
                              <tr key={m.no} className="transition-colors hover:bg-slate-50">
                                <td className="px-6 py-4 text-center text-slate-400">{m.no}</td>
                                <td className="px-6 py-4">
                                  <p className="font-bold text-slate-800">{m.medication}</p>
                                  {m.sub && <p className="text-xs text-slate-500">{m.sub}</p>}
                                </td>
                                <td className="px-6 py-4 text-slate-700">{m.dose}{m.dose2 && <><br />{m.dose2}</>}</td>
                                <td className="px-6 py-4 text-slate-700">{m.route.map((x) => <React.Fragment key={x}>{x}<br /></React.Fragment>)}</td>
                                <td className="px-6 py-4 text-slate-700">{m.timing.map((x) => <React.Fragment key={x}>{x}<br /></React.Fragment>)}</td>
                                <td className="px-6 py-4 text-center"><StatusBadge>GIVEN</StatusBadge></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>

                    {/* Chemo */}
                    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      <SectionHeader icon="fa-solid fa-chevron-down" title="Chemotherapy Drugs" badge="Active Cycle" badgeClass="border border-red-100 bg-red-50 text-red-600" />
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[850px] text-left text-sm">
                          <thead className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
                            <tr>
                              <th className="w-12 px-6 py-4 text-center">#</th>
                              <th className="px-6 py-4">DRUG NAME</th>
                              <th className="px-6 py-4">CALC.<br />DOSE</th>
                              <th className="px-6 py-4">ACTUAL<br />DOSE</th>
                              <th className="px-6 py-4">ROUTE</th>
                              <th className="px-6 py-4">DILUENT</th>
                              <th className="px-6 py-4 text-center">STATUS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {chemoDrugs.map((m) => (
                              <tr key={m.no} className="transition-colors hover:bg-slate-50">
                                <td className="px-6 py-4 text-center text-slate-400">{m.no}</td>
                                <td className="px-6 py-4"><a href="#" className="font-bold text-[#0052cc] hover:underline">{m.drug}</a></td>
                                <td className="px-6 py-4 text-xs text-slate-500">{m.calc}</td>
                                <td className="px-6 py-4 font-bold text-slate-800">{m.actual}</td>
                                <td className="px-6 py-4 text-slate-700">{m.route}</td>
                                <td className="px-6 py-4 text-xs text-slate-500">{m.diluent}</td>
                                <td className="px-6 py-4 text-center"><StatusBadge warning={m.status === "PENDING"}>{m.status}</StatusBadge></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>

                    {/* Discharge */}
                    <section className="mb-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      <SectionHeader icon="fa-solid fa-chevron-down" title="Discharge Medication" badge="3 Prescribed" />
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[750px] text-left text-sm">
                          <thead className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
                            <tr>
                              <th className="w-12 px-6 py-4 text-center">#</th>
                              <th className="px-6 py-4">MEDICATION</th>
                              <th className="px-6 py-4">DOSE</th>
                              <th className="px-6 py-4">FREQUENCY</th>
                              <th className="px-6 py-4">INSTRUCTION</th>
                              <th className="px-6 py-4">DURATION</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {dischargeMeds.map((m) => (
                              <tr key={m.no} className="transition-colors hover:bg-slate-50">
                                <td className="px-6 py-4 text-center text-slate-400">{m.no}</td>
                                <td className="px-6 py-4 font-bold text-slate-800">{m.medication}</td>
                                <td className="px-6 py-4 text-slate-700">{m.dose}</td>
                                <td className="px-6 py-4 text-slate-700">{m.frequency}</td>
                                <td className="px-6 py-4 font-medium text-slate-800">{m.instruction}</td>
                                <td className="px-6 py-4 font-bold text-slate-800">{m.duration}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  </div>

                  {/* Right sidebar */}
                  <aside className="w-full shrink-0 space-y-6 lg:w-80">
                    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h3 className="mb-6 text-base font-bold text-slate-800">Next Appointment</h3>
                      <div className="mb-6 flex items-start">
                        <div className="mr-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0052cc]">
                          <i className="fa-regular fa-calendar text-xl" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-slate-800">06 Jun 2026</p>
                          <p className="mb-1 text-sm text-slate-500">09:30 AM</p>
                          <p className="text-sm font-medium text-[#0052cc]">Day 2 Treatment</p>
                        </div>
                      </div>
                      <button className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
                        Reschedule
                      </button>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="mb-6 flex items-center">
                        <i className="fa-regular fa-clock mr-2 text-[#0052cc]" />
                        <h3 className="text-base font-bold text-slate-800">Medication Timeline</h3>
                      </div>
                      <div className="relative space-y-8 pl-4 before:absolute before:inset-y-0 before:left-5 before:w-px before:bg-slate-200">
                        <div className="relative">
                          <span className="absolute -left-6 top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-white" />
                          <p className="mb-0.5 text-sm font-bold text-slate-800">09:00 AM</p>
                          <p className="text-sm text-slate-600">Decadron Administered</p>
                          <p className="mt-0.5 text-xs text-slate-400">Nurse: Elena R.</p>
                        </div>
                        <div className="relative">
                          <span className="absolute -left-6 top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-white" />
                          <p className="mb-0.5 text-sm font-bold text-slate-800">09:15 AM</p>
                          <p className="text-sm text-slate-600">Avil Administered</p>
                        </div>
                        <div className="relative">
                          <span className="absolute -left-6 top-1.5 h-3 w-3 rounded-full bg-[#0052cc] ring-4 ring-blue-50" />
                          <p className="mb-0.5 text-sm font-bold text-slate-800">10:00 AM</p>
                          <p className="text-sm font-bold text-[#0052cc]">Taxol Infusion Started</p>
                          <p className="mt-0.5 text-xs text-slate-400">Remaining: 42 mins</p>
                        </div>
                      </div>
                    </section>
                  </aside>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <i className="fa-solid fa-file-medical mb-4 text-3xl text-[#0052cc]" />
                <h3 className="text-lg font-bold text-slate-800">{activeTab}</h3>
                <p className="mt-2 text-sm text-slate-500">This section is ready for your HMS data.</p>
              </div>
            )}
            </div>
            </div>
      </main>
    </div>
  );
};

/* ============================================================
   PATIENT PROFILE PORTAL COMPONENT
   (combined from client/pages/doctor/profile patient .tsx —
    renamed MedicalPortalReplica → HMSPatientPortal to match the
    original file's component name, original file left untouched)
============================================================ */

function HMSPatientPortal() {
  const [activeTab, setActiveTab] = useState("Order Summary");
  const [selectedDay, setSelectedDay] = useState("Day 1");
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [showMedicationPortal, setShowMedicationPortal] = useState(false);

  const tabs = ["Order Summary", "Medications", "Discharge", "History", "Notes & Documents"];
  const days = [
    { label: "Day 1", date: "05 Jun 2026" },
    { label: "Day 2", date: "06 Jun 2026" },
    { label: "Day 3", date: "07 Jun 2026" },
  ];

  const handlePrint = () => window.print();

  if (showMedicationPortal) {
    return (
      <MedicationPortal onBackToProfile={() => setShowMedicationPortal(false)} />
    );
  }

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
      <div className="font-[Inter,sans-serif] text-[#1e293b] antialiased flex h-screen overflow-hidden bg-[#f8fafc]">


{/* BEGIN: Main Content */}
<main className="flex-1 flex flex-col h-full overflow-hidden bg-[#f8fafc] relative">
{/* BEGIN: Top Header */}
<header className="h-[72px] bg-[#f8fafc] border-b border-[#e2e8f0] flex items-center justify-between px-8 shrink-0 z-10">
<div className="relative">
<button type="button" onClick={() => setShowBranchMenu(v => !v)} className="flex items-center text-sm font-medium text-[#1e293b] cursor-pointer hover:text-[#1d4ed8] transition-colors">
<i className="fa-solid fa-code-branch mr-2 text-[#64748b]"></i> Main Branch <i className="fa-solid fa-chevron-down ml-2 text-[10px] text-[#64748b]"></i>
</button>
<div className={`absolute top-9 left-0 z-30 bg-white border border-[#e2e8f0] rounded-lg shadow-lg p-2 w-44 ${showBranchMenu ? "block" : "hidden"}`}>
<button type="button" className="w-full text-left px-3 py-2 text-sm rounded hover:bg-slate-50">Main Branch</button>
<button type="button" className="w-full text-left px-3 py-2 text-sm rounded hover:bg-slate-50">Branch 02</button>
</div>
</div>
<div className="flex items-center space-x-6">
<button className="text-[#64748b] hover:text-[#1e293b] relative">
<i className="fa-regular fa-bell text-[20px]"></i>
<span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-2.5 w-2.5">
<span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ef4444] border-2 border-[#f8fafc]"></span>
</span>
</button>
<div className="flex items-center space-x-3 cursor-pointer pl-6 border-l border-[#e2e8f0]">
<span className="text-sm font-bold text-[#1d4ed8]">HMS</span>
<div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white">
<i className="fa-solid fa-user text-sm"></i>
</div>
</div>
</div>
</header>
{/* END: Top Header */}
<div className="flex-1 overflow-y-auto relative">
<div className="p-8 max-w-[1400px] mx-auto pb-32">
{/* BEGIN: Patient Header Card */}
<div className="bg-white rounded-[16px] border border-[#e2e8f0] p-6 shadow-sm mb-6 flex justify-between items-center">
<div className="flex items-center">
<img alt="Vijaya Nallusamy" className="w-20 h-20 rounded-full border-4 border-white shadow-sm object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVmv5vhpN6g6IwvwVBONWYZS06j9iELGi3guKAqt6M68HTL3HxSslWkIMAEQjWeTlKNOdnc-Pipmecvq47y_J4JkJpXBa7ODMic8izxEnar0D-CTbCOUggEhRCTr29jfsIrqPw9jJJRvmghxFC8vXF6U5zjzrn_8ajoH2ovseUywhLI0FurjCqa2DjfMMM3yvISAkY7jN2EjygmPh_WvJa_vc06-pRUGw2Xu4pFrWdOcPdAl4HggI"/>
<div className="ml-6">
<div className="flex items-center space-x-3 mb-1">
<h2 className="text-xl font-bold text-[#1e293b]">Vijaya Nallusamy</h2>
<span className="bg-slate-100 text-[#64748b] px-3 py-1 rounded-full text-xs font-semibold">ONC-2026-10025</span>
</div>
<div className="text-sm text-[#64748b] flex items-center space-x-3">
<span>51Y / Female</span>
<span className="w-1 h-1 rounded-full bg-slate-300"></span>
<span className="text-[#1d4ed8] font-semibold">Ductal Carcinoma Stage II</span>
</div>
</div>
</div>
<div className="flex items-center">
<div className="flex space-x-8 px-8 border-r border-[#e2e8f0]">
<div className="space-y-4">
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">HEIGHT</div>
<div className="font-bold text-sm">154 cm</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">BP</div>
<div className="font-bold text-sm">118/74</div>
</div>
</div>
<div className="space-y-4">
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">WEIGHT</div>
<div className="font-bold text-sm">52 kg</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">PULSE</div>
<div className="font-bold text-sm">78 bpm</div>
</div>
</div>
<div className="space-y-4">
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">BSA</div>
<div className="font-bold text-sm">1.49 m²</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">TEMP</div>
<div className="font-bold text-sm">36.8 °C</div>
</div>
</div>
<div className="space-y-4">
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">BMI</div>
<div className="font-bold text-sm">21.93</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">SPO2</div>
<div className="font-bold text-sm">99%</div>
</div>
</div>
</div>
<div className="pl-8">
<div className="bg-blue-50/50 border border-blue-100 rounded-[12px] p-4 w-[220px]">
<div className="text-[10px] font-bold text-[#1d4ed8] uppercase tracking-wider mb-1.5">INTENT: NEOADJUVANT</div>
<div className="text-[15px] font-bold text-[#1d4ed8] mb-2.5">TAXOL - WEEKLY</div>
<div className="flex items-center text-xs text-[#64748b] font-medium">
<span className="w-2 h-2 rounded-full bg-[#10b981] mr-2"></span> Active Protocol
                    </div>
</div>
</div>
</div>
</div>
{/* END: Patient Header Card */}
{/* BEGIN: Alerts Banner */}
<div className="flex items-center justify-between text-sm mb-8 border-b border-[#e2e8f0] pb-4">
<div className="flex items-center space-x-8">
<div className="flex items-center">
<i className="fa-solid fa-triangle-exclamation text-[#ef4444] mr-2"></i>
<span className="text-[#ef4444] font-semibold">Allergy:</span> <span className="ml-1 text-[#1e293b]">Penicillin</span>
</div>
<div className="flex items-center">
<i className="fa-solid fa-clock-rotate-left text-[#f59e0b] mr-2"></i>
<span className="text-[#f59e0b] font-semibold">Previous Cycle:</span> <span className="ml-1 text-[#1e293b]">Grade 2 Neutropenia</span>
</div>
<div className="flex items-center text-[#1d4ed8] font-medium">
<i className="fa-solid fa-link mr-2"></i>
<span>Central Line Available</span>
</div>
</div>
<a className="text-[#1d4ed8] font-semibold hover:underline" href="#">View Full Alerts (2)</a>
</div>
{/* END: Alerts Banner */}
{/* BEGIN: Tabs */}
<div className="border-b border-[#e2e8f0] mb-6">
<nav className="flex space-x-8">
{tabs.map((tab) => (
<button key={tab} type="button" onClick={() => {
          if (tab === "Medications") {
            setShowMedicationPortal(true);
          } else {
            setActiveTab(tab);
          }
        }} className={`px-1 py-3 border-b-2 text-sm font-medium transition-colors ${activeTab === tab ? "border-[#1d4ed8] text-[#1d4ed8] font-semibold" : "border-transparent text-[#64748b] hover:text-[#1e293b] hover:border-slate-300"}`}>
{tab}
</button>
))}
</nav>
</div>
{/* END: Tabs */}
<div className="flex space-x-6 mb-8">
{/* Left Side (Timeline & Day Selector) */}
<div className="flex-1 space-y-6">
{/* BEGIN: Treatment Timeline */}
<div className="bg-white rounded-[16px] shadow-sm border border-[#e2e8f0] p-6 h-[200px]">
<div className="flex items-center mb-8">
<h3 className="text-lg font-bold text-[#1e293b]">Cycle 6</h3>
<div className="ml-3 text-sm text-[#64748b] flex items-center cursor-pointer hover:text-[#1e293b]">
                  (14 May - 21 May 2026) <i className="fa-solid fa-chevron-down text-[10px] ml-2"></i>
</div>
</div>
<div className="relative px-8 mt-4">
<div className="absolute top-[18px] left-[60px] right-[60px] h-[2px] bg-slate-200"></div>
<div className="flex justify-between relative z-10">
<div className="flex flex-col items-center">
<div className="w-10 h-10 rounded-full bg-[#1d4ed8] text-white flex items-center justify-center font-bold ring-[6px] ring-white">1</div>
<div className="mt-3 text-center">
<div className="text-sm font-semibold text-[#1e293b]">Day 1</div>
<div className="text-[11px] text-[#64748b] mt-1">05 Jun 2026</div>
</div>
</div>
<div className="flex flex-col items-center">
<div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold ring-[6px] ring-white">2</div>
<div className="mt-3 text-center">
<div className="text-sm font-medium text-[#64748b]">Day 2</div>
<div className="text-[11px] text-slate-400 mt-1">06 Jun 2026</div>
</div>
</div>
<div className="flex flex-col items-center">
<div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold ring-[6px] ring-white">3</div>
<div className="mt-3 text-center">
<div className="text-sm font-medium text-[#64748b]">Day 3</div>
<div className="text-[11px] text-slate-400 mt-1">07 Jun 2026</div>
</div>
</div>
<div className="flex flex-col items-center">
<div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold ring-[6px] ring-white"><i className="fa-regular fa-map"></i></div>
<div className="mt-3 text-center">
<div className="text-sm font-medium text-[#64748b]">Follow-up</div>
<div className="text-[11px] text-slate-400 mt-1">21 Jun 2026</div>
</div>
</div>
</div>
</div>
</div>
{/* END: Treatment Timeline */}
{/* BEGIN: Day Selector */}
<div className="flex items-center">
<span className="text-sm font-semibold text-[#1e293b] mr-4">Select Day</span>
<div className="flex bg-white rounded-[12px] border border-[#e2e8f0] shadow-sm p-1">
{days.map((day) => (
<button key={day.label} type="button" onClick={() => setSelectedDay(day.label)} className={`px-6 py-2 rounded-[8px] shadow-sm text-center min-w-[100px] transition-colors ${selectedDay === day.label ? "bg-[#1d4ed8] text-white" : "text-[#1e293b] hover:bg-slate-50"}`}>
<div className="text-sm font-semibold">{day.label}</div>
<div className={`text-[10px] font-normal mt-0.5 ${selectedDay === day.label ? "opacity-90" : "text-[#64748b]"}`}>{day.date}</div>
</button>
))}
<button className="px-6 py-2 text-[#1d4ed8] hover:bg-blue-50 transition-colors rounded-[8px] text-sm font-semibold flex items-center justify-center">
<i className="fa-solid fa-plus mr-1.5"></i> Add Day
                  </button>
</div>
</div>
{/* END: Day Selector */}
</div>
{/* Right Side (Cards) */}
<div className="flex space-x-6">
{/* BEGIN: Next Appointment */}
<div className="bg-white rounded-[16px] shadow-sm border border-[#e2e8f0] p-6 w-[220px] h-[200px] flex flex-col justify-between">
<div>
<h4 className="text-sm font-bold text-[#1e293b] mb-5">Next Appointment</h4>
<div className="flex items-start">
<div className="w-10 h-10 rounded-[10px] bg-blue-50 flex items-center justify-center text-[#1d4ed8] shrink-0 mr-3">
<i className="fa-regular fa-calendar text-lg"></i>
</div>
<div>
<div className="text-sm font-bold text-[#1e293b]">06 Jun 2026</div>
<div className="text-xs text-[#64748b] mt-1">09:30 AM</div>
<div className="text-xs text-[#64748b] mt-1">Day 2 Treatment</div>
</div>
</div>
</div>
<button className="w-full py-2 border border-[#e2e8f0] rounded-[8px] text-sm font-semibold text-[#1e293b] hover:bg-slate-50 transition-colors">Reschedule</button>
</div>
{/* END: Next Appointment */}
{/* BEGIN: Treatment Progress */}
<div className="bg-white rounded-[16px] shadow-sm border border-[#e2e8f0] p-6 w-[220px] h-[200px] flex flex-col justify-between">
<h4 className="text-sm font-bold text-[#1e293b] mb-2">Treatment Progress</h4>
<div className="flex items-center justify-between">
<div className="relative w-16 h-16 rounded-full bg-[conic-gradient(#1d4ed8_0%_33%,#e2e8f0_33%_100%)] flex items-center justify-center">
<div className="absolute inset-[6px] rounded-full bg-white"></div>
<span className="relative z-10 text-sm font-bold text-[#1e293b]">33%</span>
</div>
<div className="text-right">
<div className="text-[10px] text-[#64748b] uppercase tracking-wide font-semibold mb-1">Completed</div>
<div className="text-sm font-bold text-[#1e293b] mb-3">1 / 3 <span className="text-xs font-medium text-[#64748b] normal-case tracking-normal">Days</span></div>
<div className="text-[10px] text-[#64748b] uppercase tracking-wide font-semibold mb-1">Remaining</div>
<div className="text-sm font-bold text-[#1e293b]">2 Days</div>
</div>
</div>
<div className="pt-4 flex justify-between items-center text-xs">
<span className="text-[#64748b] font-medium">Next Visit</span>
<span className="font-bold text-[#1e293b]">06 Jun 2026</span>
</div>
</div>
{/* END: Treatment Progress */}
</div>
</div>
{/* BEGIN: Bottom Grid */}
<div className="grid grid-cols-12 gap-6">
{/* Left Column */}
<div className="col-span-3 space-y-6">
<div className="bg-white rounded-[16px] shadow-sm border border-[#e2e8f0] p-5">
<h4 className="text-sm font-bold text-[#1e293b] mb-4">Cycle &amp; Schedule</h4>
<div className="grid grid-cols-3 gap-4 mb-5">
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase mb-1">CYCLE</div>
<div className="font-bold text-sm">6</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase mb-1">DAY</div>
<div className="font-bold text-sm">1</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase mb-1">TOTAL DAYS</div>
<div className="font-bold text-sm">3</div>
</div>
</div>
<div className="grid grid-cols-3 gap-4">
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase mb-1">START DATE</div>
<div className="font-bold text-sm">14 May<br/>2026</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase mb-1">END DATE</div>
<div className="font-bold text-sm">21 May<br/>2026</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase mb-1">NEXT DAY</div>
<div className="font-bold text-sm">06 Jun<br/>2026</div>
</div>
</div>
</div>
<div className="bg-white rounded-[16px] shadow-sm border border-[#e2e8f0] p-5">
<h4 className="text-sm font-bold text-[#1e293b] mb-4">Clinical Info</h4>
<div className="grid grid-cols-2 gap-4 mb-5">
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase mb-1">TYPE</div>
<div className="font-bold text-sm">Ductal<br/>Carcinoma</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase mb-1">STAGE</div>
<div className="font-bold text-sm">Stage II</div>
</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase mb-1">GRADE</div>
<div className="font-bold text-sm">G3</div>
</div>
</div>
</div>
{/* Middle Column */}
<div className="col-span-4 space-y-6">
<div className="bg-white rounded-[16px] shadow-sm border border-[#e2e8f0] p-5">
<div className="flex items-center mb-4">
<h4 className="text-sm font-bold text-[#1e293b] mr-3">Lab Validation</h4>
<span className="px-2 py-0.5 bg-green-50 text-[#10b981] text-[10px] font-bold uppercase rounded border border-green-100">Approved</span>
</div>
<table className="w-full text-left text-sm mb-4">
<thead>
<tr className="text-[10px] text-[#64748b] uppercase border-b border-slate-100">
<th className="pb-2 font-semibold">PARAMETER</th>
<th className="pb-2 font-semibold">RESULT</th>
<th className="pb-2 font-semibold">RANGE</th>
<th className="pb-2 font-semibold">STATUS</th>
</tr>
</thead>
<tbody>
<tr className="border-b border-slate-50">
<td className="py-3 text-[#64748b]">Hb</td>
<td className="py-3 font-semibold">12.6 g/dL</td>
<td className="py-3 text-[#64748b]">11 - 15</td>
<td className="py-3 font-semibold text-[#10b981] flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-[#10b981] mr-2"></div>Normal</td>
</tr>
<tr className="border-b border-slate-50">
<td className="py-3 text-[#64748b]">WBC</td>
<td className="py-3 font-semibold">6,200 /μL</td>
<td className="py-3 text-[#64748b]">4,000 - 11,000</td>
<td className="py-3 font-semibold text-[#10b981] flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-[#10b981] mr-2"></div>Normal</td>
</tr>
<tr className="border-b border-slate-50">
<td className="py-3 text-[#64748b]">Platelets</td>
<td className="py-3 font-semibold">2.45 L</td>
<td className="py-3 text-[#64748b]">1.50 - 4.00</td>
<td className="py-3 font-semibold text-[#f59e0b] flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] mr-2"></div>Borderline</td>
</tr>
<tr>
<td className="py-3 text-[#64748b]">Creatinine</td>
<td className="py-3 font-semibold">0.8 mg/dL</td>
<td className="py-3 text-[#64748b]">0.6 - 1.2</td>
<td className="py-3 font-semibold text-[#10b981] flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-[#10b981] mr-2"></div>Normal</td>
</tr>
</tbody>
</table>
<div className="border-t border-slate-100 pt-3 flex justify-between items-center text-sm">
<span className="text-[#64748b]">Chemo Clearance :</span>
<span className="font-bold text-[#10b981] uppercase">Approved</span>
</div>
</div>
<div className="bg-blue-50/50 rounded-[16px] shadow-sm border border-blue-100 p-5 relative overflow-hidden">
<div className="flex items-center justify-between mb-5">
<div className="flex items-center text-[#1d4ed8]">
<i className="fa-solid fa-flask text-lg mr-2"></i>
<h4 className="text-sm font-bold uppercase">PROTOCOL: TAXOL - WEEKLY</h4>
</div>
<a className="text-xs text-[#1d4ed8] font-medium hover:underline flex items-center" href="#">View Protocol <i className="fa-solid fa-chevron-right text-[10px] ml-1"></i></a>
</div>
<div className="grid grid-cols-4 gap-4">
<div>
<div className="text-[10px] text-[#1d4ed8] font-semibold uppercase mb-1">DOSE</div>
<div className="font-bold text-sm text-[#1e293b]">80 mg/m²</div>
</div>
<div>
<div className="text-[10px] text-[#1d4ed8] font-semibold uppercase mb-1">PATIENT DOSE</div>
<div className="font-bold text-sm text-[#1e293b]">120 mg</div>
</div>
<div>
<div className="text-[10px] text-[#1d4ed8] font-semibold uppercase mb-1">ROUTE</div>
<div className="font-bold text-sm text-[#1e293b]">IV</div>
</div>
<div>
<div className="text-[10px] text-[#1d4ed8] font-semibold uppercase mb-1">DILUENT</div>
<div className="font-bold text-sm text-[#1e293b]">Dextrose</div>
</div>
<div>
<div className="text-[10px] text-[#1d4ed8] font-semibold uppercase mb-1">VOLUME</div>
<div className="font-bold text-sm text-[#1e293b]">100 ml</div>
</div>
<div>
<div className="text-[10px] text-[#1d4ed8] font-semibold uppercase mb-1">INF. TIME</div>
<div className="font-bold text-sm text-[#1e293b]">60 mins</div>
</div>
<div className="col-span-2 flex items-end justify-end space-x-2">
<span className="px-2 py-1 bg-blue-100 text-[#1d4ed8] text-[10px] font-bold rounded">WEEKLY</span>
<span className="px-2 py-1 bg-white border border-slate-200 text-[#64748b] text-[10px] font-bold rounded">IV BOLUS</span>
</div>
</div>
</div>
</div>
{/* Right Column */}
<div className="col-span-5 space-y-6">
<div className="bg-white rounded-[16px] shadow-sm border border-[#e2e8f0] overflow-hidden">
<div className="px-5 py-4 border-b border-[#e2e8f0] flex items-center text-purple-600">
<i className="fa-solid fa-pills mr-2"></i>
<h4 className="text-sm font-bold">Premedications</h4>
</div>
<div className="p-5">
<table className="w-full text-left text-sm">
<thead>
<tr className="text-[10px] text-[#64748b] uppercase border-b border-slate-100">
<th className="pb-2 font-semibold w-8">#</th>
<th className="pb-2 font-semibold">DRUG</th>
<th className="pb-2 font-semibold">DOSE</th>
<th className="pb-2 font-semibold">ROUTE</th>
<th className="pb-2 font-semibold">TIMING</th>
<th className="pb-2 font-semibold text-right">STATUS</th>
</tr>
</thead>
<tbody>
<tr className="border-b border-slate-50">
<td className="py-3 text-[#64748b]">1</td>
<td className="py-3 font-semibold text-[#1e293b]">Inj. Decadron</td>
<td className="py-3 text-[#64748b]">8 mg</td>
<td className="py-3 text-[#64748b]">IV Bolus</td>
<td className="py-3 text-[#64748b]">30m before</td>
<td className="py-3 font-semibold text-[#10b981] text-right"><i className="fa-solid fa-check mr-1"></i> Given</td>
</tr>
<tr className="border-b border-slate-50">
<td className="py-3 text-[#64748b]">2</td>
<td className="py-3 font-semibold text-[#1e293b]">Inj. Avil</td>
<td className="py-3 text-[#64748b]">2 cc</td>
<td className="py-3 text-[#64748b]">IV Bolus</td>
<td className="py-3 text-[#64748b]">30m before</td>
<td className="py-3 font-semibold text-[#10b981] text-right"><i className="fa-solid fa-check mr-1"></i> Given</td>
</tr>
<tr>
<td className="py-3 text-[#64748b]">3</td>
<td className="py-3 font-semibold text-[#1e293b]">Inj. Palzen</td>
<td className="py-3 text-[#64748b]">0.25 mg</td>
<td className="py-3 text-[#64748b]">IV Bolus</td>
<td className="py-3 text-[#64748b]">30m before</td>
<td className="py-3 font-semibold text-[#10b981] text-right"><i className="fa-solid fa-check mr-1"></i> Given</td>
</tr>
</tbody>
</table>
</div>
</div>
<div className="bg-white rounded-[16px] shadow-sm border border-[#e2e8f0] overflow-hidden">
<div className="px-5 py-4 border-b border-[#e2e8f0] flex items-center text-[#1d4ed8]">
<i className="fa-solid fa-prescription-bottle-medical mr-2"></i>
<h4 className="text-sm font-bold">Chemo Orders</h4>
</div>
<div className="p-5">
<table className="w-full text-left text-sm">
<thead>
<tr className="text-[10px] text-[#64748b] uppercase border-b border-slate-100">
<th className="pb-2 font-semibold w-8">#</th>
<th className="pb-2 font-semibold">DRUG</th>
<th className="pb-2 font-semibold">DOSE</th>
<th className="pb-2 font-semibold">ROUTE</th>
<th className="pb-2 font-semibold">DILUENT</th>
<th className="pb-2 font-semibold text-right">STATUS</th>
</tr>
</thead>
<tbody>
<tr className="border-b border-slate-50">
<td className="py-3 text-[#64748b]">1</td>
<td className="py-3 font-semibold text-[#1e293b]">Inj. Taxol</td>
<td className="py-3 text-[#64748b]">120 mg</td>
<td className="py-3 text-[#64748b]">IV</td>
<td className="py-3 text-[#64748b]">NS 100ml</td>
<td className="py-3 font-semibold text-[#10b981] text-right"><i className="fa-solid fa-check mr-1"></i> Given</td>
</tr>
<tr className="border-b border-slate-50">
<td className="py-3 text-[#64748b]">2</td>
<td className="py-3 font-semibold text-[#1e293b]">Inj. Herceptin</td>
<td className="py-3 text-[#64748b]">150 mg</td>
<td className="py-3 text-[#64748b]">IV</td>
<td className="py-3 text-[#64748b]">NS 250ml</td>
<td className="py-3 font-semibold text-[#f59e0b] text-right"><i className="fa-solid fa-clock mr-1"></i> Pending</td>
</tr>
<tr>
<td className="py-3 text-[#64748b]">3</td>
<td className="py-3 font-semibold text-[#1e293b]">Inj. Carboplatin</td>
<td className="py-3 text-[#64748b]">AUC 5</td>
<td className="py-3 text-[#64748b]">IV</td>
<td className="py-3 text-[#64748b]">Dextrose</td>
<td className="py-3 font-semibold text-[#64748b] text-right"><i className="fa-solid fa-ban mr-1"></i> Not Started</td>
</tr>
</tbody>
</table>
</div>
</div>
<div className="bg-white rounded-[16px] shadow-sm border border-[#e2e8f0] overflow-hidden">
<div className="px-5 py-4 border-b border-[#e2e8f0] flex items-center text-orange-500">
<i className="fa-solid fa-capsules mr-2"></i>
<h4 className="text-sm font-bold">Discharge Medication</h4>
</div>
<div className="p-5">
<table className="w-full text-left text-sm">
<thead>
<tr className="text-[10px] text-[#64748b] uppercase border-b border-slate-100">
<th className="pb-2 font-semibold w-8">#</th>
<th className="pb-2 font-semibold">DRUG</th>
<th className="pb-2 font-semibold">DOSE</th>
<th className="pb-2 font-semibold">FREQUENCY</th>
<th className="pb-2 font-semibold">DILUENT</th>
<th className="pb-2 font-semibold text-right">STATUS</th>
</tr>
</thead>
<tbody>
<tr className="border-b border-slate-50">
<td className="py-3 text-[#64748b]">1</td>
<td className="py-3 font-semibold text-[#1e293b]">Capecitabine</td>
<td className="py-3 text-[#64748b]">500 mg</td>
<td className="py-3 text-[#64748b]">2-0-2</td>
<td className="py-3 text-[#64748b]">After Food</td>
<td className="py-3 text-[#64748b] text-right">14 Days</td>
</tr>
<tr className="border-b border-slate-50">
<td className="py-3 text-[#64748b]">2</td>
<td className="py-3 font-semibold text-[#1e293b]">Domstal</td>
<td className="py-3 text-[#64748b]">10 mg</td>
<td className="py-3 text-[#64748b]">1-1-1</td>
<td className="py-3 text-[#64748b]">NS 250ml</td>
<td className="py-3 text-[#64748b] text-right">10 Days</td>
</tr>
<tr className="border-b border-slate-50">
<td className="py-3 text-[#64748b]">3</td>
<td className="py-3 font-semibold text-[#1e293b]">Loperamide</td>
<td className="py-3 text-[#64748b]">2 mg</td>
<td className="py-3 text-[#64748b]">0-0-1</td>
<td className="py-3 text-[#64748b]">Dextrose</td>
<td className="py-3 text-[#64748b] text-right">5 Days</td>
</tr>
<tr>
<td className="py-3 text-[#64748b]">4</td>
<td className="py-3 font-semibold text-[#1e293b]">Pantoprazole</td>
<td className="py-3 text-[#64748b]">40 mg</td>
<td className="py-3 text-[#64748b]">2-2-0</td>
<td className="py-3 text-[#64748b]">Dextrose</td>
<td className="py-3 text-[#64748b] text-right">8 Days</td>
</tr>
</tbody>
</table>
</div>
</div>
</div>
</div>
{/* END: Bottom Grid */}
{/* BEGIN: Instructions Card */}
<div className="mt-6 bg-white rounded-[16px] shadow-sm border border-[#e2e8f0] p-6 flex justify-between items-start">
<div>
<div className="flex items-center text-[#1d4ed8] mb-4">
<i className="fa-regular fa-file-lines mr-2"></i>
<h4 className="text-sm font-bold">Instructions</h4>
</div>
<p className="text-sm text-[#64748b] mb-3">Premedication tablets to take a day before:</p>
<ul className="space-y-2 text-sm text-[#1e293b] font-medium list-disc list-inside">
<li>Tab. Avil 25 mg (Night - After Food)</li>
<li>Tab. Dexamethasone 4 mg (Night - After Food)</li>
<li>Tab. Pantodac 40 mg (Night - Before Food)</li>
</ul>
<a className="inline-block mt-4 text-sm font-semibold text-[#1d4ed8] underline" href="#">Investigation for Next Cycle: TC, Sugar, CBC, LFT, Creatinine.</a>
</div>
<div className="bg-slate-50 border border-slate-200 rounded-[12px] p-5 flex flex-col items-center justify-center w-[160px] h-full">
<div className="text-[10px] text-[#1d4ed8] font-bold uppercase tracking-wider mb-2">NEXT CYCLE</div>
<div className="flex items-center text-sm font-bold text-[#1d4ed8]">
<i className="fa-regular fa-calendar mr-2"></i> 21 May 2026
              </div>
</div>
</div>
{/* END: Instructions Card */}
</div>
</div>
{/* BEGIN: Footer */}
<footer className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#e2e8f0] px-8 py-4 flex items-center justify-between z-20">
<div>
<div className="text-xs text-[#64748b]">Created by <span className="font-medium text-[#1e293b]">Dr. Naveen</span> on 05 Jun 2026, 09:30 AM</div>
<div className="text-xs text-[#64748b] mt-1">Last updated by <span className="font-medium text-[#1e293b]">Admin</span> on 05 Jun 2026, 04:35 PM</div>
</div>
<div className="flex items-center space-x-4">
<button type="button" onClick={handlePrint} className="px-4 py-2 border border-[#e2e8f0] rounded-[8px] text-sm font-semibold text-[#1e293b] hover:bg-slate-50 transition-colors flex items-center">
<i className="fa-solid fa-print mr-2"></i> Print
          </button>
<button className="px-4 py-2 border border-[#e2e8f0] rounded-[8px] text-sm font-semibold text-[#1e293b] hover:bg-slate-50 transition-colors flex items-center">
<i className="fa-solid fa-share-nodes mr-2"></i> Share
          </button>
<button className="px-4 py-2 border border-[#e2e8f0] rounded-[8px] text-sm font-semibold text-[#1e293b] hover:bg-slate-50 transition-colors flex items-center">
<i className="fa-regular fa-copy mr-2"></i> Duplicate Cycle
          </button>
<button className="px-6 py-2 bg-[#1d4ed8] text-white rounded-[8px] text-sm font-semibold hover:bg-blue-700 transition-colors">
            Update Order
          </button>
</div>
</footer>
{/* END: Footer */}
</main>
{/* END: Main Content */}

      </div>
    </>
  );
}
