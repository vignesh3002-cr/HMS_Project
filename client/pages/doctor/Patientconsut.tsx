import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
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
  const [symptoms, setSymptoms] = useState<string[]>([
    "Headache",
    "Fatigue",
  ]);

  const [comorbidities, setComorbidities] = useState<string[]>([
    "Hypertension",
  ]);

  const [consultationNotes, setConsultationNotes] = useState(
    `Patient came for follow up.
Complains of mild headache
and fatigue. No nausea or
vomiting. Appetite normal.`
  );

  const [medications, setMedications] = useState<Medication[]>([
    {
      medication: "Pemetrexed",
      dose: "",
      frequency: "",
      duration: "",
      instructions: "After Food",
    },
    {
      medication: "Folic Acid",
      dose: "",
      frequency: "",
      duration: "",
      instructions: "Before Food",
    },
  ]);

  const [selectedInvestigations, setSelectedInvestigations] = useState<
    string[]
  >(["CBC"]);

  const [showLabReview, setShowLabReview] = useState(false);
  const [activeStep, setActiveStep] = useState("CONSULTATION");

  /* ============================================================
     PATIENT DATA (from dashboard appointment click)
  ============================================================ */

  const location = useLocation();
  const consultationState = location.state as ConsultationState | null;

  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [patientError, setPatientError] = useState("");

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
        .join(" ") || "Unknown Patient"
    : "Vijaya Nallusamy";

  const patientPhoto =
    patient?.patient_photo_url ||
    "https://www.figma.com/api/mcp/asset/7a4da335-abae-4dd7-af87-b102c3079771.png";

  const patientAgeSex = patient
    ? `${patient.patient_age ?? "—"} Y / ${patient.patient_gender ?? ""}`
    : "51 Y / Female";

  const patientDisplayId = patient?.patient_id || "ONC-2026-10025";

  const patientPhone = patient?.patient_primary_mobile || "+91 98765 43210";

  const patientEmail = patient?.patient_email || "vijaya.n@example.com";

  const registeredOn = patient
    ? formatDateDMY(patient.user_table?.created_at) || "01-06-2026"
    : "01-06-2026";

  const visitDate =
    formatDateDMY(consultationState?.appointmentDate) || "02-06-2026";

  const visitTime =
    formatTimeAMPM(consultationState?.appointmentTime) || "10:30 AM";

  const consultedBy = consultationState?.consultedBy || "Dr. Rajesh Kumar";

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
    showToast("Back to Patients");
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

      <div className="mx-auto h-[1480px] w-[1280px] overflow-hidden bg-slate-50">

        <div className="relative flex h-[1431px] w-[1280px] border border-slate-200 bg-slate-50">

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
                DUCTAL CARCINOMA STAGE II
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
                    154 cm
                  </div>
                </div>

                <div className="flex flex-col">
                  <div className="text-[10px] font-bold uppercase leading-[15px] tracking-[0.5px] text-slate-400">
                    WEIGHT
                  </div>
                  <div className="text-sm font-bold leading-5 text-slate-800">
                    52 kg
                  </div>
                </div>

                <div className="flex flex-col">
                  <div className="text-[10px] font-bold uppercase leading-[15px] tracking-[0.5px] text-slate-400">
                    BSA
                  </div>
                  <div className="text-sm font-bold leading-5 text-slate-800">
                    1.49 m²
                  </div>
                </div>

                <div className="flex flex-col">
                  <div className="text-[10px] font-bold uppercase leading-[15px] tracking-[0.5px] text-slate-400">
                    BMI
                  </div>
                  <div className="text-sm font-bold leading-5 text-slate-800">
                    21.93
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

          <main className="relative h-[1479px] w-[1000px] overflow-hidden bg-slate-50">

            {/* ==================================================
                HEADER
            ================================================== */}

            <header className="absolute left-0 top-0 z-30 flex h-16 w-[1000px] items-center justify-between border-b border-slate-200 bg-white px-6">

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

            <div className="absolute left-0 top-16 z-20 h-[88px] w-[1000px] overflow-hidden bg-white">

              <div className="hide-scrollbar ml-0 flex h-[88.5px] w-[896px] overflow-x-auto">

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

            <section className="absolute left-0 top-[152px] h-[1327px] w-[1000px] overflow-hidden bg-slate-50 px-[22px] pt-7">

              <div className="flex w-[942px] flex-col gap-6">

                {showLabReview ? (
                  <LabReview embedded />
                ) : activeStep === "DIAGNOSIS" ? (
                  <Diagnosis embedded />
                ) : (
                  <>
                    {/* =================================================
                    CONSULTATION SUMMARY
                ================================================= */}

                <section className="flex h-[500px] w-[942px] flex-col gap-6 rounded-xl border border-slate-200 bg-white p-[25px]">

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
                        value="01-06-2026"
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

                          {consultedBy !== "Dr. Rajesh Kumar" &&
                            consultedBy !== "Dr. Priya Sharma" && (
                              <option>
                                {consultedBy}
                              </option>
                            )}

                          <option>
                            Dr. Rajesh Kumar
                          </option>

                          <option>
                            Dr. Priya Sharma
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

                    {/* VISIT TYPE */}

                    <div className="flex min-w-0 flex-col gap-1">

                      <label className="text-xs font-bold leading-4 text-slate-500">
                        Visit Type
                      </label>

                      <div className="relative h-[38px]">

                        <select className="h-[38px] w-full appearance-none rounded-md border border-slate-200 bg-white px-[13px] pr-10 text-sm leading-5 text-slate-700 outline-none">

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

                        </div>

                      </div>

                      {/* ALLERGIES */}

                      <div className="flex flex-col gap-1">

                        <div className="text-[10px] font-bold uppercase leading-[15px] tracking-[0.5px] text-slate-400">
                          ALLERGIES
                        </div>

                        <div className="relative h-[38px]">

                          <select className="h-[38px] w-full appearance-none rounded-md border border-slate-200 bg-slate-50 px-[13px] pr-10 text-sm leading-5 text-slate-400 outline-none">

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

                <section className="flex h-[297px] w-[942px] flex-col gap-4 rounded-xl border border-slate-200 bg-white p-[25px]">

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

                <section className="h-[300px] w-[942px] overflow-hidden rounded-xl border border-slate-200 bg-white p-[25px] shadow-sm">

                  <div className="w-full pb-4">

                    <h2 className="text-xl font-bold leading-7 text-slate-800">
                      Prescription
                    </h2>

                  </div>

                  <div className="w-full">

                    {/* HEADER */}

                    <div className="grid h-[35px] w-full grid-cols-[169.63px_81.2px_120px_92px_336.39px] justify-between border-b border-slate-100 bg-slate-50">

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
                        className="grid h-[59px] w-full grid-cols-[169.63px_81.2px_120px_92px_336.39px] justify-between border-b border-slate-100 py-[10.5px]"
                      >

                        {/* MEDICATION */}

                        <div className="relative h-[30px] w-[153.63px] overflow-hidden rounded-md border border-slate-200 bg-white">

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

                            <option value="Pemetrexed">
                              Pemetrexed
                            </option>

                            <option value="Folic Acid">
                              Folic Acid
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
                          className="h-[30px] w-[320.39px] rounded-md border border-slate-200 bg-white px-[13px] py-[7px] text-sm leading-5 text-slate-600 outline-none"
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

                <div className="flex h-[60px] w-[942px] items-start justify-between pb-6">

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

const investigations: Investigation[] = [
  {
    name: "Complete Blood Count (CBC)",
    orderedDate: "01-06-2026",
    status: "Completed",
  },
  {
    name: "Liver Function Test (LFT)",
    orderedDate: "01-06-2026",
    status: "Completed",
  },
  {
    name: "CT Scan Abdomen & Pelvis",
    orderedDate: "02-06-2026",
    status: "Completed",
  },
  {
    name: "Chest X-Ray",
    orderedDate: "02-06-2026",
    status: "Completed",
  },
];

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
  histomorphology: string;
  cancerStage: string;
  grade: string;
  tnmStage: string;
  icdCode: string;
  notes: string;
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

const Diagnosis: React.FC<{ embedded?: boolean }> = ({
  embedded = false,
}) => {
  const [formData, setFormData] = useState<FormData>({
    type: "Colon Cancer",
    histomorphology: "Adenocarcinoma",
    cancerStage: "Stage II",
    grade: "Moderately Differentiated",
    tnmStage: "T3N0M0",
    icdCode: "C18.7 Malignant neoplasm of sigmoid colon",
    notes: "Patient and family informed.",
  });

  const [notificationOpen, setNotificationOpen] = useState(false);

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

  const handleNext = () => {
    console.log("Diagnosis Data:", formData);
    alert("Diagnosis saved. Proceeding to the next step.");
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
          {/* Type */}
          <div>
            <label
              htmlFor="type"
              className="mb-2 block text-sm font-semibold text-gray-600"
            >
              Type
            </label>

            <div className="relative">
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="block w-full appearance-none rounded-md border-gray-300 bg-white py-3 pl-4 pr-10 text-sm text-gray-800 focus:border-[#1d4ed8] focus:outline-none focus:ring-[#1d4ed8]"
              >
                <option>Colon Cancer</option>
                <option>Other</option>
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
                <option>Adenocarcinoma</option>
                <option>Other</option>
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
                <option>Stage II</option>
                <option>Stage III</option>
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
                <option>Moderately Differentiated</option>
                <option>Poorly Differentiated</option>
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
                <option>T3N0M0</option>
                <option>Other</option>
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
              className="block w-full rounded-md border-gray-300 px-4 py-3 text-sm text-gray-800 shadow-sm focus:border-[#1d4ed8] focus:ring-[#1d4ed8]"
            />
          </div>
        </div>

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