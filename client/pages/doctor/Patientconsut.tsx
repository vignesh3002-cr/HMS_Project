import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../../api/axios";
import {
  patientApi,
  type PatientRecord,
} from "../../api/patient.api";

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
  const [symptoms, setSymptoms] = useState<string[]>([]);

  const [symptomInput, setSymptomInput] = useState("");

  const [comorbidities, setComorbidities] = useState<string[]>([]);

  const [consultationNotes, setConsultationNotes] = useState("");

  const [medications, setMedications] = useState<Medication[]>([]);

  const [selectedInvestigations, setSelectedInvestigations] = useState<
    string[]
  >([]);

  const [showLabReview, setShowLabReview] = useState(false);
  const [activeStep, setActiveStep] = useState("CONSULTATION");

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

  const visitDate = formatDateDMY(consultationState?.appointmentDate);

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

      if (data.symptoms) {
        setSymptoms(data.symptoms);
      }

      if (data.comorbidities) {
        setComorbidities(data.comorbidities);
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
    showToast("Opening patient profile");
  };

  /* ============================================================
     REMOVE SYMPTOM
  ============================================================ */

  const removeSymptom = (symptom: string) => {
    setSymptoms((prev) => prev.filter((item) => item !== symptom));
    showToast(`${symptom} removed`);
  };

  /* ============================================================
     ADD SYMPTOM
  ============================================================ */

  const addSymptom = () => {
    const value = symptomInput.trim();
    if (!value) return;
    setSymptoms((prev) =>
      prev.includes(value) ? prev : [...prev, value]
    );
    setSymptomInput("");
    showToast(`${value} added`);
  };

  /* ============================================================
     REMOVE COMORBIDITY
  ============================================================ */

  const removeComorbidity = (item: string) => {
    setComorbidities((prev) => prev.filter((value) => value !== item));
    showToast(`${item} removed`);
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
      symptoms,
      comorbidities,
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

  return (
    <div className="min-h-screen w-full bg-slate-50 font-[Inter,sans-serif] text-slate-700 antialiased">

      {/* ========================================================
          APP
      ======================================================== */}

      <div className="mx-auto h-[1480px] w-full overflow-hidden bg-slate-50">

        <div className="relative flex h-[1431px] w-full border border-slate-200 bg-slate-50">

          {/* ====================================================
              SIDEBAR
          ==================================================== */}

          <aside className="relative z-10 h-[1479px] w-[280px] shrink-0 border-r border-slate-200 bg-white">

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

          <main className="relative h-[1479px] flex-1 overflow-hidden bg-slate-50">

            {/* ==================================================
                HEADER
            ================================================== */}

            <header className="absolute left-0 top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-6">

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

            <div className="absolute left-0 top-16 z-20 h-[88px] w-full overflow-hidden bg-white">

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

            <section className="absolute left-0 top-[152px] h-[1327px] w-full overflow-hidden bg-slate-50 px-[22px] pt-7">

              <div className="flex w-full flex-col gap-6">

                {showLabReview ? (
                  <LabReview embedded />
                ) : activeStep === "DIAGNOSIS" ? (
                  <Diagnosis embedded patientId={patientDisplayId} />
                ) : activeStep === "TREATMENT PLAN" ? (
                  <TreatmentPlan embedded />
                ) : activeStep === "CHEMOTHERAPY ORDER" ? (
                  <ChemotherapyOrder
                    embedded
                    patientId={patientDisplayId}
                  />
                ) : activeStep === "DISCHARGE MEDICATION" ? (
                  <DischargeMedication embedded />
                ) : activeStep === "FOLLOW UP" ? (
                  <FollowUp embedded />
                ) : activeStep === "SUMMARY" ? (
                  <Summary embedded />
                ) : (
                  <>
                    {/* =================================================
                    CONSULTATION SUMMARY
                ================================================= */}

                <section className="flex h-[500px] w-full flex-col gap-6 rounded-xl border border-slate-200 bg-white p-[25px]">

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

                        <div className="relative min-w-0 flex-1">

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

                      {/* PERFORMANCE */}

                      <div className="flex flex-col gap-1">

                        <div className="text-xs font-bold leading-4 text-slate-700">
                          Clinical Details
                        </div>

                        <div className="text-[10px] font-bold uppercase leading-[15px] tracking-[0.5px] text-slate-400">
                          PERFORMANCE STATUS (ECOG)
                        </div>

                        <div className="relative h-[38px]">

                          <select className="h-[38px] w-full appearance-none rounded-md border border-slate-200 bg-white px-[13px] pr-10 text-sm leading-5 text-slate-700 outline-none">

                            <option value="">
                              Select ECOG Status
                            </option>

                            <option>
                              1 - Restricted in physically strenuous activity
                            </option>

                            <option>
                              0 - Fully active
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

                      {/* SYMPTOMS */}

                      <div className="flex flex-col gap-1">

                        <div className="text-[10px] font-bold uppercase leading-[15px] tracking-[0.5px] text-slate-400">
                          SYMPTOMS
                        </div>

                        <div className="flex h-[60px] w-full items-start gap-1.5 rounded-md border border-slate-200 bg-white p-1.5">

                          {symptoms.map((symptom) => (

                            <div
                              key={symptom}
                              className="flex h-[26px] items-center gap-1 rounded border border-blue-100 bg-blue-50 px-[9px] py-[3px] text-xs leading-4 text-blue-700"
                            >

                              <span>
                                {symptom}
                              </span>

                              <button
                                onClick={() =>
                                  removeSymptom(symptom)
                                }
                                className="border-0 bg-transparent p-0 text-xs leading-4 text-blue-700"
                              >
                                ×
                              </button>

                            </div>

                          ))}

                          <input
                            type="text"
                            value={symptomInput}
                            onChange={(e) =>
                              setSymptomInput(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addSymptom();
                              }
                            }}
                            placeholder="Type a symptom and press Enter"
                            className="min-w-[200px] flex-1 border-0 bg-transparent text-sm leading-5 text-slate-700 outline-none placeholder:text-slate-400"
                          />

                        </div>

                      </div>

                      {/* ALLERGIES */}

                      <div className="flex flex-col gap-1">

                        <div className="text-[10px] font-bold uppercase leading-[15px] tracking-[0.5px] text-slate-400">
                          ALLERGIES
                        </div>

                        <div className="relative h-[38px]">

                          <select className="h-[38px] w-full appearance-none rounded-md border border-slate-200 bg-slate-50 px-[13px] pr-10 text-sm leading-5 text-slate-400 outline-none">

                            <option value="">
                              Select Allergy
                            </option>

                            <option>
                              None
                            </option>

                            <option>
                              Penicillin
                            </option>

                            <option>
                              Aspirin
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

                      {/* COMORBIDITIES */}

                      <div className="flex flex-col gap-1">

                        <div className="text-[10px] font-bold uppercase leading-[15px] tracking-[0.5px] text-slate-400">
                          COMORBIDITIES
                        </div>

                        <div className="flex min-h-[38px] w-full items-start gap-2 rounded-md border border-slate-200 p-[7px]">

                          {comorbidities.map((item) => (

                            <div
                              key={item}
                              className="flex h-[26px] items-center gap-1 rounded border border-blue-100 bg-blue-50 px-[9px] py-[3px] text-xs leading-4 text-blue-700"
                            >

                              {item}

                              <button
                                onClick={() =>
                                  removeComorbidity(item)
                                }
                                className="bg-transparent p-0 text-blue-700"
                              >
                                ×
                              </button>

                            </div>

                          ))}

                          <button
                            onClick={() =>
                              showToast("Comorbidity selector opened")
                            }
                            className="ml-auto h-4 w-4"
                          >

                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#94a3b8"
                              strokeWidth="1.8"
                              className="h-4 w-4"
                            >
                              <path d="m6 9 6 6 6-6" />
                            </svg>

                          </button>

                        </div>

                      </div>

                    </div>

                  </div>

                </section>

                {/* =================================================
                    INVESTIGATIONS
                ================================================= */}

                <section className="flex h-[297px] w-full flex-col gap-4 rounded-xl border border-slate-200 bg-white p-[25px]">

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

                <section className="h-[300px] w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-[25px] shadow-sm">

                  <div className="w-full pb-4">

                    <h2 className="text-xl font-bold leading-7 text-slate-800">
                      Prescription
                    </h2>

                  </div>

                  <div className="w-full">

                    {/* HEADER */}

                    <div className="grid h-[35px] w-full grid-cols-[2.1fr_1fr_1.5fr_1.15fr_4.2fr] justify-between border-b border-slate-100 bg-slate-50">

                      <div className="px-3 py-[9px] text-[10.4px] font-bold uppercase tracking-[0.52px] text-slate-400">
                        MEDICATION
                      </div>

                      <div className="px-3 py-[9px] text-[10.4px] font-bold uppercase tracking-[0.52px] text-slate-400">
                        DOSE
                      </div>

                      <div className="px-3 py-[9px] text-[10.4px] font-bold uppercase tracking-[0.52px] text-slate-400">
                        FREQUENCY
                      </div>

                      <div className="px-3 py-[9px] text-[10.4px] font-bold uppercase tracking-[0.52px] text-slate-400">
                        DURATION
                      </div>

                      <div className="pl-6 pr-3 py-[9px] text-[10.4px] font-bold uppercase tracking-[0.52px] text-slate-400">
                        INSTRUCTIONS
                      </div>

                    </div>

                    {/* MEDICATION ROWS */}

                    {medications.map((medication, index) => (

                      <div
                        key={index}
                        className="grid h-[59px] w-full grid-cols-[2.1fr_1fr_1.5fr_1.15fr_4.2fr] justify-between border-b border-slate-100 py-[10.5px]"
                      >

                        {/* MEDICATION */}

                        <div className="relative h-[30px] w-full overflow-hidden rounded-md border border-slate-200 bg-white">

                          <select
                            value={medication.medication}
                            onChange={(e) =>
                              updateMedication(
                                index,
                                "medication",
                                e.target.value
                              )
                            }
                            className="h-[30px] w-full appearance-none border-0 bg-transparent px-3 py-1 text-sm text-slate-600 outline-none"
                          >

                            <option value="">
                              Select medication
                            </option>

                          </select>

                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#94a3b8"
                            strokeWidth="1.8"
                            className="pointer-events-none absolute right-1.5 top-1.5 h-[17.5px] w-[17.5px]"
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>

                        </div>

                        {/* DOSE */}

                        <div className="relative h-[30px] rounded-md border border-slate-200 bg-white">

                          <select
                            value={medication.dose}
                            onChange={(e) =>
                              updateMedication(
                                index,
                                "dose",
                                e.target.value
                              )
                            }
                            className="h-[30px] w-full appearance-none bg-transparent px-3 py-1 pr-6 text-sm outline-none"
                          >

                            <option value=""></option>
                            <option value="1">1</option>
                            <option value="2">2</option>

                          </select>

                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#94a3b8"
                            strokeWidth="1.8"
                            className="pointer-events-none absolute right-1 top-1.5 h-[17px] w-[17px]"
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>

                        </div>

                        {/* FREQUENCY */}

                        <div className="relative h-[30px] rounded-md border border-slate-200 bg-white">

                          <select
                            value={medication.frequency}
                            onChange={(e) =>
                              updateMedication(
                                index,
                                "frequency",
                                e.target.value
                              )
                            }
                            className="h-[30px] w-full appearance-none bg-transparent px-3 py-1 pr-6 text-sm outline-none"
                          >

                            <option value=""></option>
                            <option value="OD">OD</option>
                            <option value="BD">BD</option>
                            <option value="TDS">TDS</option>

                          </select>

                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#94a3b8"
                            strokeWidth="1.8"
                            className="pointer-events-none absolute right-1 top-1.5 h-[17px] w-[17px]"
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>

                        </div>

                        {/* DURATION */}

                        <div className="relative h-[30px] rounded-md border border-slate-200 bg-white">

                          <select
                            value={medication.duration}
                            onChange={(e) =>
                              updateMedication(
                                index,
                                "duration",
                                e.target.value
                              )
                            }
                            className="h-[30px] w-full appearance-none bg-transparent px-3 py-1 pr-6 text-sm outline-none"
                          >

                            <option value=""></option>
                            <option value="5 Days">
                              5 Days
                            </option>

                            <option value="7 Days">
                              7 Days
                            </option>

                          </select>

                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#94a3b8"
                            strokeWidth="1.8"
                            className="pointer-events-none absolute right-1 top-1.5 h-[17px] w-[17px]"
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>

                        </div>

                        {/* INSTRUCTIONS */}

                        <input
                          value={medication.instructions}
                          onChange={(e) =>
                            updateMedication(
                              index,
                              "instructions",
                              e.target.value
                            )
                          }
                          className="h-[30px] w-full rounded-md border border-slate-200 bg-white px-[13px] py-[7px] text-sm leading-5 text-slate-600 outline-none"
                        />

                      </div>

                    ))}

                  </div>

                  {/* ADD MEDICATION */}

                  <button
                    onClick={addMedication}
                    className="flex h-9 items-center gap-1.5 border-0 bg-transparent pt-4 text-sm font-bold leading-5 text-blue-600"
                  >

                    <span className="text-lg leading-[18px]">
                      +
                    </span>

                    <span>
                      Add Medication
                    </span>

                  </button>

                </section>

                {/* =================================================
                    ACTION BUTTONS
                ================================================= */}

                <div className="flex h-[60px] w-full items-start justify-between pb-6">

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
                      className="flex h-9 w-[88px] items-center justify-center rounded-lg border border-slate-300 bg-white px-[25px] py-[9px] text-sm font-bold leading-5 text-slate-600"
                    >
                      Cancel
                    </button>

                    {/* DRAFT */}

                    <button
                      onClick={saveDraft}
                      className="flex h-9 w-[128px] items-center justify-center rounded-lg border border-blue-200 bg-white px-[25px] py-[9px] text-sm font-bold leading-5 text-blue-600"
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

    API.get<{ success: boolean; data: string[] }>(
      "/oncology/reference/tnm-stages"
    )
      .then((response) => {
        if (cancelled) return;
        setTnmStages(response.data.data);
      })
      .catch((error) => {
        console.error("Failed to load TNM stages:", error);
        if (!cancelled) {
          setDiagnosisError(
            error?.response?.data?.message || "Failed to load TNM stages."
          );
        }
      });

    API.get<{ success: boolean; data: string[] }>(
      "/oncology/reference/grades"
    )
      .then((response) => {
        if (cancelled) return;
        setGrades(response.data.data);
      })
      .catch((error) => {
        console.error("Failed to load grades:", error);
        if (!cancelled) {
          setDiagnosisError(
            error?.response?.data?.message || "Failed to load grades."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    API.get<{
      success: boolean;
      data: { categories: { diagnosis_catogory_id: string }[] };
    }>("/diagnosis/categories")
      .then((categoriesResponse) => {
        const categories = categoriesResponse.data.data.categories;
        return Promise.all(
          categories.map((category) =>
            API.get<{
              success: boolean;
              data: {
                diagnoses: { diagnosis_id: string; icd_code: string }[];
              };
            }>(`/diagnosis/categories/${category.diagnosis_catogory_id}/diagnoses`)
          )
        );
      })
      .then((responses) => {
        if (cancelled) return;
        diagnosisCatalogRef.current = responses.flatMap(
          (response) => response.data.data.diagnoses
        );
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
    const catalog = diagnosisCatalogRef.current;
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
      await API.post("/oncology/staging-details", {
        patient_id: resolvedPatientId,
        diagnosis_id: diagnosisId,
        cancer_type_id: cancerType.cancer_type_id,
        cancer_subtype_id: subtype.subtype_id,
        clinical_stage: formData.cancerStage,
        t_stage: tStage,
        n_stage: nStage,
        m_stage: mStage,
      });

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
  dosage: number | null;
  dosage_unit: string | null;
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

    API.get<{ success: boolean; data: ChemotherapyPlan[] }>(
      "/chemotherapy/plans",
      { params: { patient_id: resolvedPatientId } }
    )
      .then((response) => {
        if (cancelled) return;
        const plans = response.data.data;
        const plan = plans[0];
        if (!plan) return;

        setProtocolName(
          plan.protocol_name || plan.regimen_name || ""
        );
        setStartDate(formatDateDMY(plan.treatment_start_date));

        const cycles = plan.chemotherapy_cycle ?? [];
        const latestCycle = cycles[cycles.length - 1];
        setCycleDay(
          latestCycle
            ? `Cycle ${latestCycle.cycle_number} / Day ${
                latestCycle.cycle_day ?? "—"
              }`
            : ""
        );

        setDrugs(
          (plan.chemotherapy_plan_items ?? []).map((item, index) => ({
            id: index,
            name:
              item.medicine_master?.medicine_name ||
              item.medicine_master?.generic_name ||
              "",
            form:
              item.formulation ||
              item.medicine_master?.dosage_form ||
              "",
            dose: item.dosage != null ? String(item.dosage) : "",
            unit:
              item.dosage_unit ||
              item.medicine_master?.unit ||
              "",
            volume:
              item.dilution_volume != null
                ? `${item.dilution_volume}`
                : "",
          }))
        );
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
                onChange={(e) =>
                  setCycleDay(e.target.value)
                }
                className="block w-full rounded-md border border-gray-300 py-3 pl-4 pr-10 text-base text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />

              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <RefreshIcon />
              </div>
            </div>
          </div>

          {/* Start Date */}
          <div className="relative space-y-2">
            <label
              htmlFor="start-date"
              className="block text-sm font-semibold uppercase tracking-wide text-gray-500"
            >
              Start Date
            </label>

            <div className="relative mt-1 rounded-md shadow-sm">
              <input
                id="start-date"
                type="text"
                value={startDate}
                onChange={(e) =>
                  setStartDate(e.target.value)
                }
                className="block w-full rounded-md border border-gray-300 py-3 pl-4 pr-10 text-base text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />

              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <CalendarIcon />
              </div>
            </div>
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

const FollowUp: React.FC<{ embedded?: boolean }> = ({
  embedded = false,
}) => {
  const [activeStep, setActiveStep] = useState<FollowUpStep>(1);
  const [nextVisitDate, setNextVisitDate] = useState("");
  const [nextCycle, setNextCycle] = useState("");
  const [plan, setPlan] = useState("");
  const [notes, setNotes] = useState("");

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

              <div className="relative">
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

const TreatmentPlan: React.FC<{ embedded?: boolean }> = ({
  embedded = false,
}) => {
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

  const [activeStep, setActiveStep] = useState(2);

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

  const handleNext = () => {
    const treatmentPlan = {
      treatmentIntent,
      treatmentTypes,
      lineOfTherapy,
      plannedStartDate,
      protocol,
      remarks,
    };

    console.log("Treatment Plan:", treatmentPlan);

    alert("Treatment plan saved successfully.");

    setActiveStep(3);
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

            <div className="relative">

              <input
                id="plannedStartDate"
                type="text"
                value={plannedStartDate}
                onChange={(event) =>
                  setPlannedStartDate(event.target.value)
                }
                className="block w-full rounded-lg border border-slate-300 bg-white p-3 pr-12 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />

              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                <CalendarIcon />
              </div>

            </div>
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
              onChange={(event) =>
                setProtocol(event.target.value)
              }
              className="block w-full appearance-none rounded-lg border border-slate-300 bg-white p-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
            </select>

            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
              <ChevronDownIcon />
            </div>

          </div>
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

      <div className="flex justify-end rounded-b-xl border-t border-slate-200 bg-slate-50 p-6">

        <button
          type="button"
          onClick={handleNext}
          className="flex items-center rounded-lg bg-[#1d4ed8] px-6 py-2.5 font-semibold text-white transition-colors hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <DoubleArrowIcon />
          Next
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

const Summary: React.FC<{ embedded?: boolean }> = ({
  embedded = false,
}) => {
  const chemotherapyOrders = [];

  const premedications = [];

  const dischargeMedications = [];

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
            <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="mb-2 font-medium text-slate-900">
                  Cancer Type
                </p>
                <p className="text-sm text-slate-500">
                  {""}
                </p>
              </div>

              <div>
                <p className="mb-2 font-medium text-slate-900">
                  Stage
                </p>

                <p className="flex items-center gap-2 text-sm text-slate-500">
                  {""}
                  <span className="text-slate-400">◷</span>
                </p>
              </div>

              <div>
                <p className="mb-2 font-medium text-slate-900">
                  Context
                </p>

                <p className="text-sm text-slate-500">{""}</p>
              </div>

              <div />

              <div>
                <p className="mb-2 font-medium text-slate-900">
                  Protocol
                </p>

                <p className="flex items-center gap-2 text-sm text-slate-500">
                  {""}
                  <span className="text-slate-400">◷</span>
                </p>
              </div>

              <div>
                <p className="mb-2 font-medium text-slate-900">
                  Duration
                </p>

                <p className="text-sm text-slate-500">
                  {""}
                </p>
              </div>

              <div>
                <p className="mb-2 font-medium text-slate-900">
                  Current
                </p>

                <p className="text-sm text-slate-500">
                  {""}
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

              <p className="text-slate-600">{""}</p>
            </div>

            <div className="sm:pl-8">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-900">
                Next Cycle
              </p>

              <p className="flex items-center gap-2 text-slate-600">
                {""}
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