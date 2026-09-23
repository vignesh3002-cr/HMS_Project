import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getUser, remove } from "@/utils/token";
import { toast } from "@/hooks/use-toast";
import LabNav from "./labnav";

export interface DiagnosticParameter {
  parameter: string;
  result: string;
  unit: string;
  referenceRange: string;
  status: "NORMAL" | "ABNORMAL" | "CRITICAL";
}

export interface TransferItem {
  id: string;
  dispatchId: string;
  reportId: string;
  sampleId: string;
  patientId: string;
  patientPid?: string;
  patientName: string;
  patientAgeGender?: string;
  patientAvatar?: string;
  patientEmail: string;
  doctorName: string;
  doctorEmail: string;
  testProfile: string;
  recipient: string;
  channel: "EMR / Doctor" | "Patient SMS / WhatsApp" | "Email PDF" | "ICU / Ward";
  dispatchedAt: string;
  status: "DELIVERED" | "SENT" | "QUEUED" | "FAILED";
  ackDetails?: string;
  collectedOn?: string;
  reportedOn?: string;
  clinicalRemarks?: string;
  clinicalCorrelation?: string;
  parameters?: DiagnosticParameter[];
}

const DEFAULT_CBC_PARAMETERS: DiagnosticParameter[] = [
  {
    parameter: "WBC (White Blood Cells)",
    result: "6.80",
    unit: "10^3/µL",
    referenceRange: "4.0 - 10.0",
    status: "NORMAL",
  },
  {
    parameter: "RBC (Red Blood Cells)",
    result: "4.82",
    unit: "10^6/µL",
    referenceRange: "4.2 - 5.8",
    status: "NORMAL",
  },
  {
    parameter: "HGB (Hemoglobin)",
    result: "14.2",
    unit: "g/dL",
    referenceRange: "13.0 - 17.0",
    status: "NORMAL",
  },
  {
    parameter: "HCT (Hematocrit)",
    result: "43.1",
    unit: "%",
    referenceRange: "40 - 50",
    status: "NORMAL",
  },
  {
    parameter: "MCV (Mean Corpuscular Vol)",
    result: "87.6",
    unit: "fL",
    referenceRange: "80 - 100",
    status: "NORMAL",
  },
  {
    parameter: "MCH (Mean Corpuscular Hb)",
    result: "29.1",
    unit: "pg",
    referenceRange: "27 - 34",
    status: "NORMAL",
  },
  {
    parameter: "MCHC (MCH Concentration)",
    result: "33.0",
    unit: "g/dL",
    referenceRange: "32 - 36",
    status: "NORMAL",
  },
  {
    parameter: "PLT (Platelet Count)",
    result: "235",
    unit: "10^3/µL",
    referenceRange: "150 - 450",
    status: "NORMAL",
  },
];

const INITIAL_TRANSFERS: TransferItem[] = [
  {
    id: "tx-1",
    dispatchId: "DSP-9041",
    reportId: "RPT-2024-0530-001",
    sampleId: "SMP-2024-0520-001",
    patientId: "P000123",
    patientPid: "PAT-2024-00045",
    patientName: "Rahul Sharma",
    patientAgeGender: "34 Years / Male",
    patientAvatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAjfujnVpyETzEdWcHQ6RNKwBvT-8TXthHKeuFQhPG1BihEgPOa1-DfFPSDNuorXmwAdeXA_MjunB4aO_8akEBbf5XwU2SQiNtWg03OCgS0mIunVfmk3Q8kl50YQ_VaxxPmXExjJQNbpQteiwpY_JzQ17KqzDIaPuu4BkrudGKpBLBCWJzUfb5ZKV6fVKrcrrprRjfCWBckriPXZ39nQctTHZi_crHP08XTwJc-BF50",
    patientEmail: "Rahul Sharma @gmail.com",
    doctorName: "Dr. Sarah Johnson",
    doctorEmail: "johnson@hospital.com",
    testProfile: "Complete Blood Count (CBC)",
    recipient: "Dr. Sarah Johnson (Internal Medicine)",
    channel: "EMR / Doctor",
    dispatchedAt: "11:35 AM",
    collectedOn: "20 May 2024, 10:30 AM",
    reportedOn: "20 May 2024, 11:35 AM",
    status: "DELIVERED",
    ackDetails: "Auto-synced to Doctor EHR consultation note",
    clinicalRemarks:
      "All parameters are within normal limits. The blood counts show no signs of anemia, infection, or clotting disorders at this time.",
    clinicalCorrelation:
      "Correlate clinically with patient's physical symptoms and history.",
    parameters: DEFAULT_CBC_PARAMETERS,
  },
  {
    id: "tx-2",
    dispatchId: "DSP-9042",
    reportId: "RPT-2024-0530-001",
    sampleId: "SMP-2024-0520-001",
    patientId: "P000123",
    patientPid: "PAT-2024-00045",
    patientName: "Rahul Sharma",
    patientAgeGender: "34 Years / Male",
    patientAvatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAjfujnVpyETzEdWcHQ6RNKwBvT-8TXthHKeuFQhPG1BihEgPOa1-DfFPSDNuorXmwAdeXA_MjunB4aO_8akEBbf5XwU2SQiNtWg03OCgS0mIunVfmk3Q8kl50YQ_VaxxPmXExjJQNbpQteiwpY_JzQ17KqzDIaPuu4BkrudGKpBLBCWJzUfb5ZKV6fVKrcrrprRjfCWBckriPXZ39nQctTHZi_crHP08XTwJc-BF50",
    patientEmail: "Rahul Sharma @gmail.com",
    doctorName: "Dr. Sarah Johnson",
    doctorEmail: "johnson@hospital.com",
    testProfile: "Complete Blood Count (CBC)",
    recipient: "+91 98765 43210 (Patient)",
    channel: "Patient SMS / WhatsApp",
    dispatchedAt: "11:36 AM",
    collectedOn: "20 May 2024, 10:30 AM",
    reportedOn: "20 May 2024, 11:35 AM",
    status: "DELIVERED",
    ackDetails: "WhatsApp diagnostic link delivered with passcode",
    clinicalRemarks:
      "All parameters are within normal limits. The blood counts show no signs of anemia, infection, or clotting disorders at this time.",
    clinicalCorrelation:
      "Correlate clinically with patient's physical symptoms and history.",
    parameters: DEFAULT_CBC_PARAMETERS,
  },
  {
    id: "tx-3",
    dispatchId: "DSP-9043",
    reportId: "RPT-2024-0530-002",
    sampleId: "SMP-2024-0520-002",
    patientId: "P000124",
    patientPid: "PAT-2024-00046",
    patientName: "Priya",
    patientAgeGender: "28 Years / Female",
    patientAvatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=256&h=256",
    patientEmail: "priya.clinical@gmail.com",
    doctorName: "Dr. Sarah Johnson",
    doctorEmail: "patel.nephro@hospital.com",
    testProfile: "Kidney Function Test (KFT)",
    recipient: "Dr. Patel (Nephrology)",
    channel: "EMR / Doctor",
    dispatchedAt: "12:20 PM",
    collectedOn: "20 May 2024, 11:15 AM",
    reportedOn: "20 May 2024, 12:20 PM",
    status: "DELIVERED",
    ackDetails: "Received and acknowledged in physician portal",
    clinicalRemarks:
      "Renal biomarkers within reference intervals. Serum creatinine indicates normal glomerular filtration.",
    clinicalCorrelation:
      "Patient hydration adequate. No physiological indicators of renal insufficiency.",
    parameters: [
      {
        parameter: "Serum Creatinine",
        result: "0.85",
        unit: "mg/dL",
        referenceRange: "0.6 - 1.2",
        status: "NORMAL",
      },
      {
        parameter: "Blood Urea Nitrogen (BUN)",
        result: "16.0",
        unit: "mg/dL",
        referenceRange: "7 - 20",
        status: "NORMAL",
      },
      {
        parameter: "Uric Acid",
        result: "4.8",
        unit: "mg/dL",
        referenceRange: "3.5 - 7.2",
        status: "NORMAL",
      },
      {
        parameter: "eGFR",
        result: "98",
        unit: "mL/min/1.73m²",
        referenceRange: "> 90",
        status: "NORMAL",
      },
    ],
  },
  {
    id: "tx-4",
    dispatchId: "DSP-9044",
    reportId: "RPT-2024-0530-003",
    sampleId: "SMP-2024-0520-004",
    patientId: "P000125",
    patientPid: "PAT-2024-00047",
    patientName: "Praveen Singh",
    patientAgeGender: "45 Years / Male",
    patientAvatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256&h=256",
    patientEmail: "praveen.singh@gmail.com",
    doctorName: "Dr. Sarah Johnson",
    doctorEmail: "rao.cardio@hospital.com",
    testProfile: "Lipid Profile & Glucose Fasting",
    recipient: "Emergency & Cardiology Station",
    channel: "ICU / Ward",
    dispatchedAt: "12:00 PM",
    collectedOn: "20 May 2024, 10:45 AM",
    reportedOn: "20 May 2024, 12:00 PM",
    status: "DELIVERED",
    ackDetails: "STAT alert sent directly to duty physician workstation",
    clinicalRemarks:
      "Marked elevation in Serum Triglycerides (480 mg/dL). High atherogenic risk index flagged.",
    clinicalCorrelation:
      "Urgent clinical correlation with cardiovascular risk evaluation and dietary regimen.",
    parameters: [
      {
        parameter: "Total Cholesterol",
        result: "245",
        unit: "mg/dL",
        referenceRange: "< 200",
        status: "ABNORMAL",
      },
      {
        parameter: "Triglycerides",
        result: "480",
        unit: "mg/dL",
        referenceRange: "< 150",
        status: "CRITICAL",
      },
      {
        parameter: "HDL Cholesterol",
        result: "32",
        unit: "mg/dL",
        referenceRange: "> 40",
        status: "ABNORMAL",
      },
      {
        parameter: "LDL Cholesterol",
        result: "165",
        unit: "mg/dL",
        referenceRange: "< 100",
        status: "ABNORMAL",
      },
    ],
  },
  {
    id: "tx-5",
    dispatchId: "DSP-9045",
    reportId: "RPT-2024-0530-004",
    sampleId: "SMP-2024-0520-005",
    patientId: "P000126",
    patientPid: "PAT-2024-00048",
    patientName: "Naziya",
    patientAgeGender: "31 Years / Female",
    patientAvatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=256&h=256",
    patientEmail: "naziya.k@email.com",
    doctorName: "Dr. Sarah Johnson",
    doctorEmail: "sharma.endo@hospital.com",
    testProfile: "Thyroid Profile (T3, T4, TSH)",
    recipient: "naziya.k@email.com (Patient)",
    channel: "Email PDF",
    dispatchedAt: "11:15 AM",
    collectedOn: "20 May 2024, 09:30 AM",
    reportedOn: "20 May 2024, 11:15 AM",
    status: "QUEUED",
    ackDetails: "Awaiting final pathologist signature before release",
    clinicalRemarks:
      "Thyroid parameters indicate euthyroid endocrine balance.",
    clinicalCorrelation:
      "Values concordant with baseline thyroid function.",
    parameters: [
      {
        parameter: "Total T3",
        result: "1.2",
        unit: "ng/mL",
        referenceRange: "0.8 - 2.0",
        status: "NORMAL",
      },
      {
        parameter: "Total T4",
        result: "8.5",
        unit: "µg/dL",
        referenceRange: "5.1 - 14.1",
        status: "NORMAL",
      },
      {
        parameter: "TSH (Thyroid Stimulating)",
        result: "2.85",
        unit: "µIU/mL",
        referenceRange: "0.4 - 4.2",
        status: "NORMAL",
      },
    ],
  },
  {
    id: "tx-6",
    dispatchId: "DSP-9046",
    reportId: "RPT-2024-0530-005",
    sampleId: "SMP-2024-0520-006",
    patientId: "P000127",
    patientPid: "PAT-2024-00049",
    patientName: "Meena Kumari",
    patientAgeGender: "52 Years / Female",
    patientAvatar:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=256&h=256",
    patientEmail: "meena.kumari@gmail.com",
    doctorName: "Dr. Sarah Johnson",
    doctorEmail: "verma.icu@hospital.com",
    testProfile: "Electrolytes & Arterial Blood Gas",
    recipient: "ICU Ward 3 Bed 12",
    channel: "ICU / Ward",
    dispatchedAt: "09:50 AM",
    collectedOn: "20 May 2024, 09:00 AM",
    reportedOn: "20 May 2024, 09:50 AM",
    status: "FAILED",
    ackDetails: "Network socket timeout to Ward HL7 listener. Retry scheduled.",
    clinicalRemarks:
      "Electrolyte distribution within physiologic parameters.",
    clinicalCorrelation: "Stable acid-base and electrolyte status.",
    parameters: [
      {
        parameter: "Sodium (Na+)",
        result: "139",
        unit: "mmol/L",
        referenceRange: "135 - 145",
        status: "NORMAL",
      },
      {
        parameter: "Potassium (K+)",
        result: "4.2",
        unit: "mmol/L",
        referenceRange: "3.5 - 5.1",
        status: "NORMAL",
      },
      {
        parameter: "Chloride (Cl-)",
        result: "101",
        unit: "mmol/L",
        referenceRange: "98 - 107",
        status: "NORMAL",
      },
    ],
  },
];

export default function ReportTransfer() {
  const navigate = useNavigate();
  const currentUser = getUser();
  const displayName = currentUser?.username || "Labtech";
  const displayRole =
    currentUser?.role_type === "LAB_TECHNICIAN"
      ? "Lab Technician"
      : currentUser?.role_type || "Lab Technician";

  const handleLogout = () => {
    remove();
    navigate("/", { replace: true });
  };

  const [activeNav, setActiveNav] = useState("Report Transfer");
  const [transfers, setTransfers] = useState<TransferItem[]>(INITIAL_TRANSFERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "DELIVERED" | "SENT" | "QUEUED" | "FAILED"
  >("ALL");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  // Workflow View Mode: "table" | "forward" | "preview"
  const [viewMode, setViewMode] = useState<"table" | "forward" | "preview">(
    "table",
  );
  const [returnView, setReturnView] = useState<"table" | "forward">("forward");
  const [selectedTransfer, setSelectedTransfer] = useState<TransferItem>(
    INITIAL_TRANSFERS[0],
  );

  // Forward Screen Recipient Controls
  const [sendToPatient, setSendToPatient] = useState(true);
  const [sendToDoctor, setSendToDoctor] = useState(true);
  const [additionalEmailInput, setAdditionalEmailInput] = useState("");
  const [additionalRecipients, setAdditionalRecipients] = useState<string[]>([]);

  const handleOpenForward = (transfer: TransferItem) => {
    setSelectedTransfer(transfer);
    setSendToPatient(true);
    setSendToDoctor(true);
    setAdditionalEmailInput("");
    setAdditionalRecipients([]);
    setViewMode("forward");
  };

  const handleOpenPreview = (
    transfer?: TransferItem,
    from: "table" | "forward" = "forward",
  ) => {
    if (transfer) {
      setSelectedTransfer(transfer);
    }
    setReturnView(from);
    setViewMode("preview");
  };

  const handleAddAdditionalRecipient = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = additionalEmailInput.trim();
    if (!trimmed) return;
    if (additionalRecipients.includes(trimmed)) {
      toast({
        title: "Recipient Exists",
        description: "This email is already in the recipient list.",
      });
      return;
    }
    setAdditionalRecipients((prev) => [...prev, trimmed]);
    setAdditionalEmailInput("");
    toast({
      title: "Recipient Added",
      description: `Added ${trimmed} to report dispatch list.`,
    });
  };

  const handleRemoveAdditionalRecipient = (email: string) => {
    setAdditionalRecipients((prev) => prev.filter((e) => e !== email));
  };

  const handleSendReport = () => {
    if (!sendToPatient && !sendToDoctor && additionalRecipients.length === 0) {
      toast({
        title: "No Recipients Selected",
        description:
          "Please select at least one recipient portal or add an email address.",
        variant: "destructive",
      });
      return;
    }

    const nowTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    setTransfers((prev) =>
      prev.map((t) =>
        t.id === selectedTransfer.id
          ? {
              ...t,
              status: "DELIVERED",
              dispatchedAt: nowTime,
              ackDetails: "Delivered via automated portal forwarder",
            }
          : t,
      ),
    );

    const recipientList: string[] = [];
    if (sendToPatient) recipientList.push("Patient Portal");
    if (sendToDoctor) recipientList.push("Doctor Portal");
    if (additionalRecipients.length > 0) {
      recipientList.push(`${additionalRecipients.length} external email(s)`);
    }

    toast({
      title: "Report Forwarded Successfully",
      description: `Report ${selectedTransfer.reportId} sent to: ${recipientList.join(", ")}.`,
    });

    setViewMode("table");
  };

  const handleResend = (id: string) => {
    setTransfers((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: "DELIVERED",
              dispatchedAt: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              ackDetails: "Successfully re-transmitted and acknowledged.",
            }
          : t,
      ),
    );
    toast({
      title: "Dispatch Successful",
      description: "Report transmitted to recipient EMR/channel.",
    });
  };

  const handleBatchSync = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setTransfers((prev) =>
      prev.map((t) =>
        t.status === "QUEUED" || t.status === "FAILED"
          ? { ...t, status: "DELIVERED", dispatchedAt: "Just now" }
          : t,
      ),
    );
    toast({
      title: "Batch EMR Sync Completed",
      description:
        "All queued and pending laboratory reports have been pushed to EMR.",
    });
  };

  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        t.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.reportId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.dispatchId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.channel.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || t.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [transfers, searchQuery, statusFilter]);

  const deliveredCount = useMemo(
    () => transfers.filter((t) => t.status === "DELIVERED").length,
    [transfers],
  );
  const sentCount = useMemo(
    () => transfers.filter((t) => t.status === "SENT").length,
    [transfers],
  );
  const queuedCount = useMemo(
    () => transfers.filter((t) => t.status === "QUEUED").length,
    [transfers],
  );
  const failedCount = useMemo(
    () => transfers.filter((t) => t.status === "FAILED").length,
    [transfers],
  );

  const activeParameters: DiagnosticParameter[] =
    selectedTransfer.parameters && selectedTransfer.parameters.length > 0
      ? selectedTransfer.parameters
      : DEFAULT_CBC_PARAMETERS;

  return (
    <div className="min-h-screen flex bg-white text-gray-900 antialiased selection:bg-blue-100 font-sans">
      <style>{`
        @media print {
          aside { display: none !important; }
          .ml-64 { margin-left: 0 !important; }
          .print-hide { display: none !important; }
        }
      `}</style>

      {/* Global Lab Navigation Sidebar */}
      <LabNav
        activeTab="Report Transfer"
        onTabChange={() => setViewMode("table")}
      />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col min-w-0 bg-white">
        {viewMode === "preview" ? (
          /* ========================================================================= */
          /* BEGIN: Clinical Precision Diagnostics - Preview Report View               */
          /* ========================================================================= */
          <main
            className="flex-1 bg-white overflow-y-auto px-6 sm:px-12 py-10 flex flex-col justify-between"
            data-purpose="report-preview-document"
          >
            <div className="max-w-[1020px] w-full mx-auto">
              {/* Top Navigation Back Button */}
              <div className="mb-6 print-hide">
                <button
                  type="button"
                  onClick={() => setViewMode(returnView)}
                  className="inline-flex items-center text-[13.5px] font-semibold text-[#0284c7] hover:text-[#0369a1] transition-colors cursor-pointer"
                >
                  <svg
                    className="w-4 h-4 mr-1 stroke-[2.5]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M15.75 19.5L8.25 12l7.5-7.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {returnView === "forward" ? "Back to Forwarding" : "Back to Dispatches"}
                </button>
              </div>

              {/* BEGIN: ReportHeader */}
              <header className="text-center pt-2">
                <h2 className="text-2xl lg:text-[26px] font-black tracking-wider text-black uppercase">
                  CLINICAL PRECISION DIAGNOSTICS
                </h2>
                <p className="text-[11px] font-semibold tracking-widest text-gray-800 uppercase mt-1">
                  EXCELLENCE IN MEDICAL TESTING &amp; RESEARCH
                </p>
                <p className="text-[11px] text-gray-600 mt-1 font-normal">
                  123 Medical Plaza, Health District, NY 10001 | Ph: +1 (555) 012-3456 | Web: www.clinicalprecision.com
                </p>
                {/* Horizontal Thick Bar Separator */}
                <div className="w-full h-[2.5px] bg-black mt-3 mb-6" />
              </header>
              {/* END: ReportHeader */}

              {/* BEGIN: PatientAndSampleMetadata */}
              <section
                aria-label="Patient and Specimen Metadata"
                className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2 px-1 mb-8"
              >
                {/* Patient Info with circular avatar */}
                <div className="flex items-center gap-5 w-full sm:w-1/2">
                  <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 border-2 border-slate-100 shadow-sm">
                    <img
                      alt={`Patient ${selectedTransfer.patientName}`}
                      className="w-full h-full object-cover"
                      src={
                        selectedTransfer.patientAvatar ||
                        "https://lh3.googleusercontent.com/aida-public/AB6AXuAjfujnVpyETzEdWcHQ6RNKwBvT-8TXthHKeuFQhPG1BihEgPOa1-DfFPSDNuorXmwAdeXA_MjunB4aO_8akEBbf5XwU2SQiNtWg03OCgS0mIunVfmk3Q8kl50YQ_VaxxPmXExjJQNbpQteiwpY_JzQ17KqzDIaPuu4BkrudGKpBLBCWJzUfb5ZKV6fVKrcrrprRjfCWBckriPXZ39nQctTHZi_crHP08XTwJc-BF50"
                      }
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256&h=256";
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-[130px_1fr] text-[13px] gap-y-1.5 font-medium">
                    <span className="font-bold text-black uppercase tracking-tight">
                      PATIENT NAME:
                    </span>
                    <span className="text-gray-900 font-semibold">
                      {selectedTransfer.patientName}
                    </span>
                    <span className="font-bold text-black uppercase tracking-tight">
                      PATIENT ID:
                    </span>
                    <span className="text-gray-900 font-mono">
                      {selectedTransfer.patientPid || selectedTransfer.patientId}
                    </span>
                    <span className="font-bold text-black uppercase tracking-tight">
                      AGE / GENDER:
                    </span>
                    <span className="text-gray-900">
                      {selectedTransfer.patientAgeGender || "34 Years / Male"}
                    </span>
                  </div>
                </div>

                {/* Sample Details */}
                <div className="w-full sm:w-1/2 flex justify-start sm:justify-end">
                  <div className="grid grid-cols-[130px_1fr] text-[13px] gap-y-1.5 font-medium">
                    <span className="font-bold text-black uppercase tracking-tight">
                      SAMPLE ID:
                    </span>
                    <span className="text-gray-900 font-mono font-semibold">
                      {selectedTransfer.sampleId}
                    </span>
                    <span className="font-bold text-black uppercase tracking-tight">
                      TEST NAME:
                    </span>
                    <span className="text-gray-900 font-semibold">
                      {selectedTransfer.testProfile}
                    </span>
                    <span className="font-bold text-black uppercase tracking-tight">
                      COLLECTED ON:
                    </span>
                    <span className="text-gray-900">
                      {selectedTransfer.collectedOn || "20 May 2024, 10:30 AM"}
                    </span>
                    <span className="font-bold text-black uppercase tracking-tight">
                      REPORTED ON:
                    </span>
                    <span className="text-gray-900">
                      {selectedTransfer.reportedOn || "20 May 2024, 11:35 AM"}
                    </span>
                  </div>
                </div>
              </section>
              {/* END: PatientAndSampleMetadata */}

              {/* BEGIN: LaboratoryTestResultsTable */}
              <section
                aria-label="Diagnostic Results Table"
                className="overflow-x-auto mb-8"
              >
                <table className="w-full text-left border border-black text-[13px] border-collapse">
                  <thead>
                    <tr className="bg-gray-100 font-bold text-black uppercase text-[11px] tracking-wider border border-black">
                      <th
                        className="py-2.5 px-4 font-bold border border-black"
                        scope="col"
                      >
                        PARAMETER
                      </th>
                      <th
                        className="py-2.5 px-4 text-center font-bold border border-black"
                        scope="col"
                      >
                        RESULT
                      </th>
                      <th
                        className="py-2.5 px-4 text-center font-bold border border-black"
                        scope="col"
                      >
                        UNIT
                      </th>
                      <th
                        className="py-2.5 px-4 text-center font-bold border border-black"
                        scope="col"
                      >
                        REFERENCE RANGE
                      </th>
                      <th
                        className="py-2.5 px-4 text-center font-bold border border-black"
                        scope="col"
                      >
                        STATUS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-900 font-medium">
                    {activeParameters.map((p, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50/50 border border-black"
                      >
                        <td className="py-2 px-4 font-semibold text-gray-900 border border-black">
                          {p.parameter}
                        </td>
                        <td className="py-2 px-4 text-center font-medium font-mono border border-black">
                          {p.result}
                        </td>
                        <td className="py-2 px-4 text-center border border-black">
                          {p.unit}
                        </td>
                        <td className="py-2 px-4 text-center border border-black">
                          {p.referenceRange}
                        </td>
                        <td className="py-2 px-4 text-center font-bold text-black tracking-wide border border-black">
                          {p.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
              {/* END: LaboratoryTestResultsTable */}

              {/* BEGIN: ClinicalNotesAndSignatureSection */}
              <section
                aria-label="Clinical Remarks and Validation"
                className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-8"
              >
                {/* Remarks & Correlation text */}
                <div className="space-y-4 max-w-xl text-[12.5px] leading-relaxed">
                  <div>
                    <h3 className="font-bold text-black uppercase tracking-tight">
                      CLINICAL REMARKS
                    </h3>
                    <p className="text-gray-700 mt-0.5">
                      {selectedTransfer.clinicalRemarks ||
                        "All parameters are within normal limits. The blood counts show no signs of anemia, infection, or clotting disorders at this time."}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-black uppercase tracking-tight">
                      CLINICAL CORRELATION
                    </h3>
                    <p className="text-gray-700 mt-0.5">
                      {selectedTransfer.clinicalCorrelation ||
                        "Correlate clinically with patient's physical symptoms and history."}
                    </p>
                  </div>
                </div>

                {/* Digital Signature Card */}
                <div className="border border-black w-64 text-center bg-white shadow-none shrink-0 self-end lg:self-auto">
                  {/* Card Header */}
                  <div className="border-b border-black py-1.5 bg-gray-50/50">
                    <span className="text-[10px] font-bold tracking-wider text-black uppercase">
                      DIGITAL SIGNATURE
                    </span>
                  </div>
                  {/* Signature Body */}
                  <div className="py-4 px-3 flex flex-col items-center justify-center">
                    <div className="text-2xl font-normal text-gray-900 tracking-wide mb-1 font-serif italic">
                      Sarah Johnson
                    </div>
                    <div className="w-3/4 h-[0.75px] bg-gray-300 mb-2" />
                    <p className="font-bold text-black text-[10px] tracking-tight uppercase">
                      DR. SARAH JOHNSON
                    </p>
                    <p className="text-[9px] font-bold text-gray-800 uppercase mt-0.5">
                      SENIOR PATHOLOGIST (MD, DNB)
                    </p>
                    <p className="text-[9px] font-medium text-gray-700 tracking-tight uppercase mt-0.5">
                      REG NO: MC-209455
                    </p>
                  </div>
                </div>
              </section>
              {/* END: ClinicalNotesAndSignatureSection */}

              {/* BEGIN: Disclaimer */}
              <footer className="pt-2 border-t border-black mb-10">
                <p className="text-[10.5px] leading-tight text-gray-800">
                  <span className="font-bold text-black uppercase">
                    DISCLAIMER
                  </span>
                  <br />
                  This report is for diagnostic purposes and should be interpreted by a registered medical practitioner. Laboratory results are subject to clinical variation.
                </p>
              </footer>
              {/* END: Disclaimer */}

              {/* BEGIN: ActionButtons */}
              <div className="flex items-center justify-between pt-2 pb-6 border-t border-transparent print-hide">
                {/* Back Button */}
                <button
                  onClick={() => setViewMode(returnView)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#9ca3af] hover:bg-[#8e95a1] text-gray-900 font-semibold text-sm rounded shadow-sm transition cursor-pointer"
                  type="button"
                >
                  <svg
                    className="w-4 h-4 text-gray-900"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Back</span>
                </button>
                {/* Print Report Button */}
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-sm rounded shadow-sm transition cursor-pointer"
                  type="button"
                >
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Print Report</span>
                </button>
              </div>
              {/* END: ActionButtons */}
            </div>
          </main>
        ) : viewMode === "forward" ? (
          /* ========================================================================= */
          /* BEGIN: Forward Test Reports View                                         */
          /* ========================================================================= */
          <main
            className="flex-1 bg-white p-10 overflow-y-auto"
            data-purpose="main-workspace"
          >
            <div className="max-w-[1240px] mx-auto">
              {/* Back to Dispatches Navigation */}
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className="inline-flex items-center text-[13.5px] font-semibold text-[#1d4ed8] hover:text-blue-800 transition-colors cursor-pointer"
                >
                  <svg
                    className="w-4 h-4 mr-1 stroke-[2.5]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M15.75 19.5L8.25 12l7.5-7.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Back to Dispatches
                </button>
              </div>

              {/* Page Title */}
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-8">
                Forward Test Reports
              </h1>

              {/* Content Dual-Card Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* BEGIN: ReportInformationCard */}
                <section
                  className="bg-white border border-gray-200/90 rounded-xl p-7 shadow-sm"
                  data-purpose="report-info-section"
                >
                  <h2 className="text-base font-semibold text-[#1d4ed8] mb-6">
                    Report Information
                  </h2>
                  <div className="space-y-6">
                    {/* Field: Report ID */}
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1.5">
                        Report ID
                      </p>
                      <p className="text-[15px] font-semibold text-gray-900 font-mono">
                        {selectedTransfer.reportId}
                      </p>
                    </div>
                    {/* Field: Sample ID */}
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1.5">
                        Sample ID
                      </p>
                      <p className="text-[15px] font-semibold text-gray-900 font-mono">
                        {selectedTransfer.sampleId}
                      </p>
                    </div>
                    {/* Field: Patient Name */}
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1.5">
                        Patient Name
                      </p>
                      <p className="text-[15px] font-semibold text-gray-900">
                        {selectedTransfer.patientName}{" "}
                        <span className="text-xs text-gray-400 font-mono">
                          ({selectedTransfer.patientId})
                        </span>
                      </p>
                    </div>
                    {/* Field: Test / Profile */}
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1.5">
                        Test / Profile
                      </p>
                      <p className="text-[15px] font-semibold text-gray-900">
                        {selectedTransfer.testProfile}
                      </p>
                    </div>
                    {/* Preview Action Button */}
                    <div className="pt-3">
                      <button
                        onClick={() => handleOpenPreview(selectedTransfer, "forward")}
                        className="w-full bg-[#94a3b8] hover:bg-[#8292a7] transition-colors text-white font-semibold py-2.5 px-4 rounded-lg text-sm shadow-sm cursor-pointer"
                        type="button"
                      >
                        Preview Report
                      </button>
                    </div>
                  </div>
                </section>
                {/* END: ReportInformationCard */}

                {/* BEGIN: SendToCard */}
                <section
                  className="bg-white border border-gray-200/90 rounded-xl p-7 shadow-sm"
                  data-purpose="send-recipients-section"
                >
                  <h2 className="text-base font-semibold text-[#1d4ed8] mb-6">
                    Send To
                  </h2>
                  <div className="space-y-4">
                    {/* Recipient 1: Patient Portal */}
                    <div className="bg-[#f8fafc] border border-gray-100 rounded-lg p-4 flex items-start justify-between">
                      <div className="flex items-start gap-3.5">
                        <input
                          aria-label="Send to Patient Portal"
                          checked={sendToPatient}
                          onChange={(e) => setSendToPatient(e.target.checked)}
                          className="mt-1 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                          type="checkbox"
                        />
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">
                            Patient Portal
                          </h3>
                          <p className="text-xs text-gray-500 mt-1 font-mono">
                            {selectedTransfer.patientEmail}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide bg-[#e6f8ee] text-[#16a34a]">
                        SENT
                      </span>
                    </div>

                    {/* Recipient 2: Doctor Portal */}
                    <div className="bg-[#f8fafc] border border-gray-100 rounded-lg p-4 flex items-start justify-between">
                      <div className="flex items-start gap-3.5">
                        <input
                          aria-label="Send to Doctor Portal"
                          checked={sendToDoctor}
                          onChange={(e) => setSendToDoctor(e.target.checked)}
                          className="mt-1 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                          type="checkbox"
                        />
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">
                            Doctor Portal
                          </h3>
                          <p className="text-xs text-gray-600 mt-1 font-normal">
                            {selectedTransfer.doctorName}
                          </p>
                          <p className="text-xs text-gray-500 font-mono">
                            {selectedTransfer.doctorEmail}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide bg-[#e6f8ee] text-[#16a34a]">
                        SENT
                      </span>
                    </div>

                    {/* Additional Optional Recipients Input Group */}
                    <div className="pt-3">
                      <label
                        className="block text-xs font-medium text-gray-900 mb-2"
                        htmlFor="additional-email"
                      >
                        Additional Recipients (Optional)
                      </label>
                      <form
                        onSubmit={handleAddAdditionalRecipient}
                        className="flex items-center gap-2"
                      >
                        <input
                          value={additionalEmailInput}
                          onChange={(e) => setAdditionalEmailInput(e.target.value)}
                          className="block w-full rounded-lg border-gray-300 text-xs py-2.5 px-3.5 text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                          id="additional-email"
                          placeholder="Enter email address"
                          type="email"
                        />
                        <button
                          type="submit"
                          className="shrink-0 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold py-2.5 px-4 rounded-lg shadow-sm transition-colors cursor-pointer"
                        >
                          + Add
                        </button>
                      </form>

                      {/* Display added additional email chips */}
                      {additionalRecipients.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {additionalRecipients.map((email) => (
                            <span
                              key={email}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                            >
                              <span>{email}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveAdditionalRecipient(email)
                                }
                                className="text-blue-500 hover:text-blue-800 cursor-pointer"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
                {/* END: SendToCard */}
              </div>

              {/* Action Button Area (Send Report) */}
              <div
                className="mt-8 flex justify-end items-center gap-3"
                data-purpose="submit-container"
              >
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendReport}
                  className="inline-flex items-center justify-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-medium text-sm px-6 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <span>Send Report</span>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </main>
        ) : (
          /* ========================================================================= */
          /* BEGIN: Table & Dispatch Log View                                         */
          /* ========================================================================= */
          <>
            {/* TopNavbar */}
            <header
              className="h-20 bg-white border-b border-slate-100 px-10 flex items-center justify-end sticky top-0 z-10"
              data-purpose="dashboard-header"
            >
              <div className="flex items-center gap-6">
                {/* Notification Bell with Counter */}
                <div className="relative cursor-pointer hover:opacity-80 transition-opacity">
                  <svg
                    className="w-6 h-6 text-slate-600 stroke-[1.8]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="absolute -top-1.5 -right-1.5 bg-[#e05252] text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                    1
                  </span>
                </div>

                {/* Role Label & Profile Avatar & Logout */}
                <div className="flex items-center gap-3 pl-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#0b57d0] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-semibold text-slate-800 leading-tight">
                        {displayName}
                      </span>
                      <span className="text-[10px] text-slate-500 leading-tight">
                        {displayRole}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </header>

            {/* DashboardBody */}
            <main className="flex-1 p-8 lg:p-10 space-y-8 max-w-[1600px] w-full mx-auto">
              {/* StatCardsRow */}
              <section
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5"
                data-purpose="kpi-metric-cards"
              >
                {/* Card 1: Test Completed */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] flex items-center gap-5">
                  <div className="w-14 h-14 rounded-full bg-[#def7ec] flex items-center justify-center shrink-0">
                    <svg
                      className="w-6 h-6 text-[#059669] stroke-[2.5]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M5 13l4 4L19 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[13px] font-semibold text-[#059669]">
                      Test Completed
                    </span>
                    <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-0.5">
                      128
                    </h3>
                    <p className="text-[12px] text-slate-400 font-normal mt-0.5">
                      Tests completed successfully
                    </p>
                  </div>
                </div>

                {/* Card 2: Test Result Pending */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] flex items-center gap-5">
                  <div className="w-14 h-14 rounded-full bg-[#e0edff] flex items-center justify-center shrink-0">
                    <svg
                      className="w-6 h-6 text-[#2563eb] stroke-[2.2]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[13px] font-semibold text-[#2563eb]">
                      Test Result Pending
                    </span>
                    <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-0.5">
                      56
                    </h3>
                    <p className="text-[12px] text-slate-400 font-normal mt-0.5">
                      Results pending verification
                    </p>
                  </div>
                </div>

                {/* Card 3: Test Overdue */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] flex items-center gap-5">
                  <div className="w-14 h-14 rounded-full bg-[#fef3c7] flex items-center justify-center shrink-0">
                    <svg
                      className="w-6 h-6 text-[#d97706] stroke-[2.2]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[13px] font-semibold text-[#d97706]">
                      Test Overdue
                    </span>
                    <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-0.5">
                      18
                    </h3>
                    <p className="text-[12px] text-slate-400 font-normal mt-0.5">
                      Tests past the expected time
                    </p>
                  </div>
                </div>

                {/* Card 4: Repeat Test Required */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] flex items-center gap-5">
                  <div className="w-14 h-14 rounded-full bg-[#fee2e2] flex items-center justify-center shrink-0">
                    <svg
                      className="w-6 h-6 text-[#dc2626] stroke-[2.2]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[13px] font-semibold text-[#dc2626]">
                      Repeat Test Required
                    </span>
                    <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-0.5">
                      11
                    </h3>
                    <p className="text-[12px] text-slate-400 font-normal mt-0.5">
                      Tests need to be repeated
                    </p>
                  </div>
                </div>
              </section>

              {/* TableContainerCard */}
              <section
                className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden"
                data-purpose="tests-details-card"
              >
                {/* BEGIN: HeaderSection */}
                <header
                  className="px-8 pt-7 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  data-purpose="table-header"
                >
                  <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                    Report Dispatch &amp; Transfer Log
                  </h1>
                  {/* BEGIN: SearchAndFilters */}
                  <div
                    className="flex flex-wrap items-center gap-3"
                    data-purpose="search-and-filter-group"
                  >
                    {/* Search Input Container */}
                    <div
                      className="relative flex-1 md:w-80"
                      data-purpose="search-input-wrapper"
                    >
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <svg
                          className="w-4 h-4 text-slate-600"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white text-sm text-slate-800 placeholder-slate-400 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors"
                        placeholder="Search Patient, Dispatch ID, Recipient..."
                        type="text"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Filter Button */}
                    <div className="relative shrink-0">
                      <button
                        onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border rounded-lg text-sm font-medium transition-colors ${
                          statusFilter !== "ALL"
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-slate-300 text-slate-700"
                        }`}
                        data-purpose="filter-trigger"
                        type="button"
                      >
                        <svg
                          className="w-4 h-4 text-slate-600"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M3 6h18M6 12h12M9 18h6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span>
                          {statusFilter === "ALL" ? "Filter" : statusFilter}
                        </span>
                      </button>

                      {isFilterDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1.5 text-[13px]">
                          <button
                            type="button"
                            onClick={() => {
                              setStatusFilter("ALL");
                              setIsFilterDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between cursor-pointer ${
                              statusFilter === "ALL"
                                ? "font-semibold text-blue-600 bg-blue-50/50"
                                : "text-slate-700"
                            }`}
                          >
                            <span>All ({transfers.length})</span>
                            {statusFilter === "ALL" && <span>✓</span>}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStatusFilter("DELIVERED");
                              setIsFilterDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between cursor-pointer ${
                              statusFilter === "DELIVERED"
                                ? "font-semibold text-[#15803d] bg-green-50/50"
                                : "text-slate-700"
                            }`}
                          >
                            <span>Delivered ({deliveredCount})</span>
                            {statusFilter === "DELIVERED" && <span>✓</span>}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStatusFilter("SENT");
                              setIsFilterDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between cursor-pointer ${
                              statusFilter === "SENT"
                                ? "font-semibold text-blue-600 bg-blue-50/50"
                                : "text-slate-700"
                            }`}
                          >
                            <span>Sent ({sentCount})</span>
                            {statusFilter === "SENT" && <span>✓</span>}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStatusFilter("QUEUED");
                              setIsFilterDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between cursor-pointer ${
                              statusFilter === "QUEUED"
                                ? "font-semibold text-[#715e17] bg-[#faecc5]/30"
                                : "text-slate-700"
                            }`}
                          >
                            <span>Queued ({queuedCount})</span>
                            {statusFilter === "QUEUED" && <span>✓</span>}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStatusFilter("FAILED");
                              setIsFilterDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between cursor-pointer ${
                              statusFilter === "FAILED"
                                ? "font-semibold text-[#991b1b] bg-red-50/50"
                                : "text-slate-700"
                            }`}
                          >
                            <span>Failed ({failedCount})</span>
                            {statusFilter === "FAILED" && <span>✓</span>}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Batch Sync to EMR Button */}
                    <button
                      type="button"
                      onClick={() => handleBatchSync()}
                      className="px-4 py-2.5 bg-[#00875A] hover:bg-[#00744E] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer shrink-0 inline-flex items-center gap-2"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      <span>Batch Sync to EMR</span>
                    </button>
                  </div>
                </header>
                {/* END: HeaderSection */}

                {/* BEGIN: TableContent */}
                <div
                  className="overflow-x-auto w-full"
                  data-purpose="table-scroll-container"
                >
                  <table
                    className="w-full border-collapse text-left"
                    id="transfers-log-table"
                  >
                    <thead>
                      <tr className="bg-[#f8fafc] border-y border-slate-200/90 text-[13px] font-bold text-slate-600 tracking-wider">
                        <th className="py-5 px-8 font-bold" scope="col">
                          DISPATCH &amp; REPORT
                        </th>
                        <th className="py-5 px-6 font-bold" scope="col">
                          PATIENT NAME
                        </th>
                        <th className="py-5 px-6 font-bold" scope="col">
                          RECIPIENT &amp; STATION
                        </th>
                        <th className="py-5 px-6 font-bold" scope="col">
                          CHANNEL
                        </th>
                        <th
                          className="py-5 px-6 font-bold text-center"
                          scope="col"
                        >
                          TIME
                        </th>
                        <th
                          className="py-5 px-8 font-bold text-center"
                          scope="col"
                        >
                          STATUS
                        </th>
                        <th
                          className="py-5 px-6 font-bold text-center"
                          scope="col"
                        >
                          ACTION
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[14px] text-slate-600">
                      {filteredTransfers.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-12 text-center text-slate-400 text-sm"
                          >
                            No dispatch logs found matching your criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredTransfers.map((t) => (
                          <tr
                            key={t.id}
                            onClick={() => handleOpenForward(t)}
                            className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                          >
                            <td className="py-5 px-8">
                              <span className="font-semibold text-slate-900 font-mono block">
                                {t.dispatchId}
                              </span>
                              <span className="font-mono text-blue-600 text-xs font-semibold">
                                {t.reportId}
                              </span>
                            </td>
                            <td className="py-5 px-6">
                              <span className="font-semibold text-slate-900 block">
                                {t.patientName}
                              </span>
                              <span className="text-xs text-slate-400 font-mono">
                                {t.patientId}
                              </span>
                            </td>
                            <td className="py-5 px-6">
                              <span className="font-medium text-slate-800 block text-xs">
                                {t.recipient}
                              </span>
                              {t.ackDetails && (
                                <span className="text-xs text-slate-400 block truncate max-w-xs">
                                  {t.ackDetails}
                                </span>
                              )}
                            </td>
                            <td className="py-5 px-6">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                {t.channel}
                              </span>
                            </td>
                            <td className="py-5 px-6 text-center text-slate-600 font-mono text-xs">
                              {t.dispatchedAt}
                            </td>
                            <td className="py-5 px-8 text-center">
                              {t.status === "DELIVERED" ? (
                                <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-wider bg-[#bbf7d0] text-[#15803d]">
                                  DELIVERED
                                </span>
                              ) : t.status === "SENT" ? (
                                <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-wider bg-[#dbeafe] text-[#1e40af]">
                                  SENT
                                </span>
                              ) : t.status === "FAILED" ? (
                                <span
                                  className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-wider bg-[#fee2e2] text-[#991b1b]"
                                  title={t.ackDetails}
                                >
                                  FAILED
                                </span>
                              ) : (
                                <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-wider bg-[#faecc5] text-[#715e17]">
                                  QUEUED
                                </span>
                              )}
                            </td>
                            <td className="py-5 px-6 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenForward(t);
                                  }}
                                  className="px-3 py-1.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                                >
                                  Forward
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenPreview(t, "table");
                                  }}
                                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors cursor-pointer"
                                  title="View Diagnostic Report"
                                >
                                  Preview
                                </button>
                                {t.status === "FAILED" && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleResend(t.id);
                                    }}
                                    className="px-3 py-1.5 bg-[#00875A] hover:bg-[#00744E] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                                  >
                                    Retry
                                  </button>
                                )}
                                {t.status === "QUEUED" && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleResend(t.id);
                                    }}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                                  >
                                    Dispatch
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </main>
          </>
        )}
      </div>
    </div>
  );
}
