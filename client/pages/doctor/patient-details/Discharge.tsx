import { useEffect, useState } from "react";
import API from "../../../api/axios";
import { patientApi, type PatientRecord } from "../../../api/patient.api";
import { useBranchFilter } from "../../../context/BranchFilterContext";
import { BellNotificationButton } from "@/components/hms/BellNotificationButton";
import {
  SummaryPlan,
  SectionHeader,
  StagingDetailRecord,
  PatientAllergyRecord,
  ChemoPlanPreview,
  loadLatestPlanPreview,
  loadLatestChemoPlan,
  useDischargeMedicines,
  useLatestPatientVitals,
  InlineBranchPicker,
} from "./shared";
import { HistoryDashboard } from "./History";
import { PatientNotesDocuments } from "./NotesDocuments";

/* ============================================================
   PATIENT DISCHARGE DASHBOARD COMPONENT
   (combined from client/pages/doctor/discharage  details.tsx —
    renamed PatientDischargeDashboard → DischargeDetailsPortal
    so it can live in this file, original file left untouched)
============================================================ */

export function DischargeDetailsPortal({
  onBack,
  patientId,
}: {
  onBack?: () => void;
  patientId?: string;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [showNotesDocs, setShowNotesDocs] = useState(false);
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [planPreview, setPlanPreview] = useState<ChemoPlanPreview | null>(null);
  const [stagingDetail, setStagingDetail] =
    useState<StagingDetailRecord | null>(null);
  const [planPreviewLoading, setPlanPreviewLoading] = useState(false);
  const [planPreviewError, setPlanPreviewError] = useState("");
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [dischargePlan, setDischargePlan] = useState<SummaryPlan | null>(null);


  /* Latest vitals (encounter + chemo merged, one shared fetch set)
     - also supplies the drug-reaction count for this portal.
     Re-runs when the branch selection changes so scoped fallbacks and
     the chemo chain pick up the new x-branch-id header. */
  const { selectedBranchId } = useBranchFilter();
  const {
    latestEncounter,
    latestChemoVitals,
    adverseEventCount: reactionCount,
    vitals: mergedVitals,
    vitalEntries,
    lastCheckedLabel,
    scopeHint,
  } = useLatestPatientVitals(patientId, selectedBranchId);
  const [dischargeAllergies, setDischargeAllergies] = useState<
    PatientAllergyRecord[]
  >([]);

  // Recent details for THIS selected patient via
  // /chemotherapy/plans/preview?staging_detail_id=<latest staging detail>.
  // Also loads the live patient record (api/patient.api) and the saved
  // chemotherapy plan; vitals + adverse events come from the hook above.
  useEffect(() => {
    if (!patientId) {
      setPlanPreview(null);
      setStagingDetail(null);
      setPatient(null);
      setDischargePlan(null);
      setPlanPreviewLoading(false);
      setPlanPreviewError(
        "No patient selected. Open this page from a patient consultation to load recent details."
      );
      return;
    }
    let cancelled = false;
    setPlanPreviewLoading(true);
    setPlanPreviewError("");

    /* Live patient identity via GET /patients/:id (api/patient.api). */
    patientApi
      .getById(patientId)
      .then((response) => {
        if (!cancelled) setPatient(response.data?.data ?? null);
      })
      .catch(() => {
        /* Header falls back to staging/patient bio when unavailable. */
      });

    /* Saved plan (intent, cycle stats, treatment status). */
    loadLatestChemoPlan(patientId)
      .then((loaded) => {
        if (!cancelled) setDischargePlan(loaded);
      })
      .catch(() => {
        /* Plan-dependent panels fall back to their empty states. */
      });

    loadLatestPlanPreview(patientId)
      .then(({ preview, staging, error }) => {
        if (cancelled) return;
        setPlanPreview(preview);
        setStagingDetail(staging);
        setPlanPreviewError(error);
      })
      .finally(() => {
        if (!cancelled) setPlanPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [patientId, selectedBranchId]);

  useEffect(() => {
    if (!patientId) {
      setDischargeAllergies([]);
      return;
    }
    let cancelled = false;
    API.get<{ success: boolean; data: PatientAllergyRecord[] }>(
      `/clinical-details/patients/${patientId}/allergies`
    )
      .then((response) => {
        if (!cancelled) setDischargeAllergies(response.data?.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setDischargeAllergies([]);
      });
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const dischargeAllergyNames = dischargeAllergies
    .map((item) => item.allergy_master?.substance_name)
    .filter(Boolean)
    .join(", ");

  const orderSummaryDiagnosis = planPreview
    ? [planPreview.cancer_type, planPreview.cancer_subtype]
        .filter(Boolean)
        .join(" — ")
    : "";

  /* Every non-empty saved field, ready to render. */
  const fmtDate = (value?: string | null) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return `${String(d.getDate()).padStart(2, "0")}-${String(
      d.getMonth() + 1
    ).padStart(2, "0")}-${d.getFullYear()}`;
  };

  const buildEntries = (pairs: [string, unknown][]): [string, string][] =>
    pairs
      .map(([label, value]) => {
        let v: unknown = value;
        if (v === null || v === undefined || v === "") return null;
        if (typeof v === "object") v = JSON.stringify(v);
        return [label, String(v)] as [string, string];
      })
      .filter((p): p is [string, string] => p !== null);

  const sd = stagingDetail;
  const ihc = sd?.ihc_results ?? null;
  const mol = sd?.molecular_results ?? null;
  const der = sd?.derived_fields ?? null;

  const diagnosisEntries = buildEntries([
    ["Cancer Type", sd?.cancer_types?.cancer_type],
    ["Subtype", sd?.cancer_subtypes?.subtype_name],
    ["Clinical Stage", sd?.clinical_stage],
    ["Staging System", sd?.staging_system],
    ["T Stage", sd?.t_stage],
    ["N Stage", sd?.n_stage],
    ["M Stage", sd?.m_stage],
    ["Laterality", sd?.laterality],
    ["Performance Status", sd?.performance_status],
    ["Metastasis Sites", sd?.metastasis_sites],
    ["ICD-10", sd?.icd10_code],
    ["ICD-O-3 Topography", sd?.icd_o3_topo],
    ["ICD-O-3 Morphology", sd?.icd_o3_morpho],
    ["Visit Date", sd?.visit_date ? fmtDate(sd.visit_date) : ""],
    ["Diagnosis Date", sd?.diagnosis_date ? fmtDate(sd.diagnosis_date) : ""],
    ["Biopsy Date", sd?.biopsy_date ? fmtDate(sd.biopsy_date) : ""],
    [
      "Consulting Oncologist",
      sd?.consulting_oncologist ||
        (sd?.employees
          ? [sd.employees.first_name, sd.employees.last_name]
              .filter(Boolean)
              .join(" ")
          : ""),
    ],
    ["Patient", sd?.patient_bio_data
      ? [
          sd.patient_bio_data.patient_first_name,
          sd.patient_bio_data.patient_last_name,
        ]
          .filter(Boolean)
          .join(" ") +
        (sd.patient_bio_data.patient_gender ||
        sd.patient_bio_data.patient_age
          ? ` — ${
              sd.patient_bio_data.patient_age ?? ""
            } ${sd.patient_bio_data.patient_gender ?? ""}`.trim()
          : "")
      : ""],
    ["Diagnosis ID", sd?.diagnosis_id],
    ["Staging Detail ID", sd?.staging_detail_id],
    ["Saved On", sd?.created_at ? fmtDate(sd.created_at) : ""],
  ]);

  const derivedEntries = der
    ? buildEntries([
        ["AJCC Stage (auto)", der.ajcc_stage],
        ["Breast Molecular Subtype", der.breast_mol_subtype],
        ["TNBC Subtype", der.tnbc_subtype],
        ["ELN Risk", der.eln_risk],
        ["Deauville Score", der.lymphoma_deauville],
        ["PD-L1 Score Type", der.pdl1_score_type],
        ["Suggested Therapy", der.suggested_therapy],
        ["Recommended Tests", der.recommended_tests],
        ["ICD-10 (auto)", der.icd10_auto],
        ["ICD-O-3 (auto)", der.icd_o3_auto],
        [
          "Germline Referral",
          der.germline_referral_flag == null
            ? ""
            : der.germline_referral_flag
            ? "Required"
            : "Not required",
        ],
        [
          "Lynch Syndrome",
          der.lynch_syndrome_flag == null
            ? ""
            : der.lynch_syndrome_flag
            ? "Positive"
            : "Negative",
        ],
        [
          "HER2 Positive",
          sd && sd.her2_positive != null
            ? sd.her2_positive
              ? "Yes"
              : "No"
            : "",
        ],
      ])
    : [];

  const ihcEntries = ihc
    ? buildEntries([
        ["ER Status", ihc.er_status],
        ["ER %", ihc.er_percent],
        ["PR Status", ihc.pr_status],
        ["PR %", ihc.pr_percent],
        ["HER2 IHC", ihc.her2_ihc],
        ["HER2 FISH", ihc.her2_fish],
        ["HER2 FISH Ratio", ihc.her2_fish_ratio],
        ["HER2 Avg Copy", ihc.her2_avg_copy],
        ["Ki-67 %", ihc.ki67_percent],
        ["PD-L1 TPS", ihc.pdl1_tps],
        ["PD-L1 CPS", ihc.pdl1_cps],
        ["PD-L1 Clone", ihc.pdl1_clone],
        ["MMR MLH1", ihc.mmr_mlh1],
        ["MMR MSH2", ihc.mmr_msh2],
        ["MMR MSH6", ihc.mmr_msh6],
        ["MMR PMS2", ihc.mmr_pms2],
        ["MMR Overall", ihc.mmr_overall],
        ["p53 IHC", ihc.p53_ihc],
        ["AR Status", ihc.ar_status],
        ["MLH1 Methylation", ihc.mlh1_methylation],
      ])
    : [];

  const molecularEntries = mol
    ? buildEntries([
        ["EGFR Status", mol.egfr_status],
        ["EGFR Mutation Type", mol.egfr_mutation_type],
        ["ALK Status", mol.alk_status],
        ["ALK Test Method", mol.alk_test_method],
        ["ROS1 Status", mol.ros1_status],
        ["KRAS G12C", mol.kras_g12c],
        ["KRAS Mutation", mol.kras_mutation],
        ["BRAF V600E", mol.braf_v600e],
        ["BRCA1 Germline", mol.brca1_germline],
        ["BRCA2 Germline", mol.brca2_germline],
        ["BRCA Somatic", mol.brca_somatic],
        ["HRD Status", mol.hrd_status],
        ["HRD Score", mol.hrd_score],
        ["HRD Assay", mol.hrd_assay],
        ["MSI Status", mol.msi_status],
        ["MSI Test Method", mol.msi_test_method],
        ["TMB", mol.tmb],
        ["TMB Assay", mol.tmb_assay],
        ["NGS Panel", mol.ngs_panel],
        ["FLT3-ITD", mol.flt3_itd],
        ["FLT3-ITD Allelic Ratio", mol.flt3_itd_allelic_ratio],
        ["FLT3 TKD", mol.flt3_tkd],
        ["NPM1 Mutation", mol.npm1_mutation],
        ["IDH1 Mutation", mol.idh1_mutation],
        ["IDH2 Mutation", mol.idh2_mutation],
        ["BCR-ABL1", mol.bcr_abl1],
        ["BCR-ABL1 Transcript", mol.bcr_abl1_transcript],
      ])
    : [];

  const renderEntryGrid = (entries: [string, string][]) => (
    <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
      {entries.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/60 p-4">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="break-words text-sm font-semibold text-slate-800">{value}</p>
        </div>
      ))}
    </div>
  );

  const tabs = [
    "Order Summary",
    "Medications",
    "Discharge",
    "History",
    "Notes & Documents",
  ];

  /* =========================================================
     REAL DATA DERIVATIONS (patient record, saved plan, latest
     recorded vitals, staging details)
  ========================================================= */

  const dischargeName = patient
    ? [
        patient.patient_first_name,
        patient.patient_middle_name,
        patient.patient_last_name,
      ]
        .filter(Boolean)
        .join(" ") || patient.patient_id
    : sd?.patient_bio_data
    ? [
        sd.patient_bio_data.patient_first_name,
        sd.patient_bio_data.patient_last_name,
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  const dischargeAgeSex = patient
    ? `${patient.patient_age ?? "—"}Y / ${patient.patient_gender ?? ""}`
    : sd?.patient_bio_data
    ? `${sd.patient_bio_data.patient_age ?? "—"}Y / ${
        sd.patient_bio_data.patient_gender ?? ""
      }`
    : "";

  const dischargePhoto = patient?.patient_photo_url || "";

  const dischargeDiagnosis =
    [
      orderSummaryDiagnosis,
      stagingDetail?.clinical_stage || planPreview?.clinical_stage,
    ]
      .filter(Boolean)
      .join(" • ") || "";

  /* Vital display values come from useLatestPatientVitals above
     (encounter first, chemo-cycle fallback per field; BSA falls back
     to a Mosteller derivation from height & weight). */
  const headerVitals = (label: string) =>
    vitalEntries.find(([key]) => key === label)?.[1] || "—";

  const intentTherapy =
    dischargePlan?.regimen_name ||
    planPreview?.matching_protocols?.[0]?.regimen_name ||
    planPreview?.suggested_therapy ||
    "";
  const intentLabel = dischargePlan?.treatment_intent || "";

  /* Take-home medications: REAL rows fetched from
     GET /chemotherapy/regimen-protocols/:protocolId/discharge-medicines -
     the protocol is the saved plan's source protocol, falling back to
     the first matching protocol of the diagnosis preview. */
  const dischargeProtocolId =
    dischargePlan?.source_protocol_id ||
    planPreview?.matching_protocols?.[0]?.protocol_id ||
    "";
  const {
    rows: dischargeMedicineRows,
    loading: dischargeMedsLoading,
    error: dischargeMedsError,
  } = useDischargeMedicines(dischargeProtocolId);

  const medications = dischargeMedicineRows.map((item) => ({
    id:
      item.discharge_instruction_id ??
      `${item.protocol_id}-${item.drug_sequence ?? ""}`,
    medication: item.medicine_master?.medicine_name ?? "—",
    composition:
      item.composition || item.medicine_master?.generic_name || "—",
    dose:
      item.patient_dose != null && item.patient_dose !== ""
        ? `${item.patient_dose} ${
            item.patient_dose_unit ?? item.medicine_master?.unit ?? ""
          }`.trim()
        : "—",
    frequency: item.frequency || "—",
    duration: item.duration || "—",
  }));

  /* Final vital signs - freshest recorded values (encounter first,
     chemo-cycle fallback per field). */
  const vitals = [
    {
      label: "BP",
      value:
        mergedVitals.bpSystolic != null && mergedVitals.bpDiastolic != null
          ? `${mergedVitals.bpSystolic}/${mergedVitals.bpDiastolic}`
          : "—",
      status:
        latestEncounter?.systolic_bp != null ||
        latestEncounter?.diastolic_bp != null
          ? "Recorded"
          : latestChemoVitals?.vital_stage || "Not recorded",
    },
    {
      label: "Pulse",
      value: mergedVitals.pulse != null ? `${mergedVitals.pulse} bpm` : "—",
      status: "Recorded",
    },
    {
      label: "Temp",
      value: mergedVitals.temp != null ? `${mergedVitals.temp} °C` : "—",
      status: "Recorded",
    },
    {
      label: "SpO2",
      value: mergedVitals.spo2 != null ? `${mergedVitals.spo2}%` : "—",
      status: latestChemoVitals?.oxygen_support ? "On Support" : "Room Air",
    },
    {
      label: "Pain Score",
      value: mergedVitals.painScore != null ? `${mergedVitals.painScore}/10` : "—",
      status: latestEncounter?.pain_score != null ? "Recorded" : "Not recorded",
    },
  ];

  /* Cycle stats computed from the saved plan + its cycles. */
  const allDischargeCycles = dischargePlan?.chemotherapy_cycle ?? [];
  const administeredCount = allDischargeCycles.filter((cycle) =>
    ((cycle.cycle_status ?? "")).toUpperCase() === "COMPLETED"
  ).length;
  const treatmentDurationLabel = (() => {
    const start = dischargePlan?.treatment_start_date
      ? new Date(dischargePlan.treatment_start_date)
      : null;
    const endCandidates = allDischargeCycles
      .map((cycle) => cycle.actual_date ?? cycle.planned_date)
      .filter(Boolean)
      .sort();
    const end = endCandidates.length
      ? new Date(endCandidates[endCandidates.length - 1])
      : dischargePlan?.expected_end_date
      ? new Date(dischargePlan.expected_end_date)
      : null;
    if (
      !start ||
      !end ||
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      return "";
    }
    const days = Math.max(
      0,
      Math.round((end.getTime() - start.getTime()) / 86400000)
    );
    return `${days} day${days === 1 ? "" : "s"}`;
  })();
  const checklist: string[] = [];

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
      <div className="font-[Inter,sans-serif] text-[#1e293b] antialiased flex h-screen overflow-hidden bg-[#f8fafc]">

{/* BEGIN: Main Content */}
<main className="flex-1 flex flex-col h-full overflow-hidden bg-[#f8fafc] relative">
{/* BEGIN: Top Header */}
<header className="h-[72px] bg-[#f8fafc] border-b border-[#e2e8f0] flex items-center justify-between px-8 shrink-0 z-10">
<div className="flex items-center gap-4">
{onBack && (
<button type="button" aria-label="Go back" onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-slate-100">
<svg viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
<path d="M19 12H5" />
<path d="m12 19-7-7 7-7" />
</svg>
</button>
)}

</div>
<div className="flex items-center space-x-6">
<BellNotificationButton size="md" />
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
{dischargePhoto ? (
<img alt={dischargeName} className="w-20 h-20 rounded-full border-4 border-white shadow-sm object-cover" src={dischargePhoto}/>
) : (
<div className="w-20 h-20 rounded-full border-4 border-white shadow-sm bg-slate-100 flex items-center justify-center text-slate-500">
<i className="fa-solid fa-user text-2xl"></i>
</div>
)}
<div className="ml-6">
<div className="flex items-center space-x-3 mb-1">
<h2 className="text-xl font-bold text-[#1e293b]">{dischargeName || "—"}</h2>
<span className="bg-slate-100 text-[#64748b] px-3 py-1 rounded-full text-xs font-semibold">{patientId || sd?.patient_id || ""}</span>
</div>
<div className="text-sm text-[#64748b] flex items-center space-x-3">
<span>{dischargeAgeSex || "—"}</span>
<span className="w-1 h-1 rounded-full bg-slate-300"></span>
<span className="text-[#1d4ed8] font-semibold">{dischargeDiagnosis || "No diagnosis saved yet"}</span>
</div>
</div>
</div>
<div className="flex items-center">
<div className="flex space-x-8 px-8 border-r border-[#e2e8f0]">
<div className="space-y-4">
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">HEIGHT</div>
<div className="font-bold text-sm">{headerVitals("HEIGHT")}</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">BP</div>
<div className="font-bold text-sm">{headerVitals("BP")}</div>
</div>
</div>
<div className="space-y-4">
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">WEIGHT</div>
<div className="font-bold text-sm">{headerVitals("WEIGHT")}</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">PULSE</div>
<div className="font-bold text-sm">{headerVitals("PULSE")}</div>
</div>
</div>
<div className="space-y-4">
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">BSA</div>
<div className="font-bold text-sm">{headerVitals("BSA")}</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">TEMP</div>
<div className="font-bold text-sm">{headerVitals("TEMP")}</div>
</div>
</div>
<div className="space-y-4">
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">BMI</div>
<div className="font-bold text-sm">{headerVitals("BMI")}</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">SPO2</div>
<div className="font-bold text-sm">{headerVitals("SPO2")}</div>
</div>
</div>
</div>
<div className="pl-8">
<div className="bg-blue-50/50 border border-blue-100 rounded-[12px] p-4 w-[220px]">
<div className="text-[10px] font-bold text-[#1d4ed8] uppercase tracking-wider mb-1.5">INTENT: {intentLabel || "NOT RECORDED"}</div>
<div className="text-[15px] font-bold text-[#1d4ed8] mb-2.5">{intentTherapy || "—"}</div>
<div className="flex items-center text-xs text-[#64748b] font-medium">
<span className={`w-2 h-2 rounded-full mr-2 ${((dischargePlan?.treatment_status ?? "")).toUpperCase() === "COMPLETED" ? "bg-[#10b981]" : "bg-[#f59e0b]"}`}></span> {((dischargePlan?.treatment_status ?? "").toUpperCase() === "COMPLETED" ? "Protocol Completed" : dischargePlan ? "Active Protocol" : "No Plan Saved")}
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
<span className="text-[#ef4444] font-semibold">Allergy:</span> <span className="ml-1 text-[#1e293b]">{dischargeAllergyNames || "—"}</span>
</div>
<div className="flex items-center">
<i className="fa-solid fa-clock-rotate-left text-[#f59e0b] mr-2"></i>
<span className="text-[#f59e0b] font-semibold">Previous Cycle:</span> <span className="ml-1 text-[#1e293b]">{dischargePlan?.completed_cycles ? `Cycle ${dischargePlan.completed_cycles} completed` : "—"}</span>
</div>
</div>
</div>
{/* END: Alerts Banner */}
{/* BEGIN: Tabs */}
<div className="border-b border-[#e2e8f0] mb-6">
<nav className="flex space-x-8">
{tabs.map((tab) => {
const isActive = showNotesDocs ? tab === "Notes & Documents" : showHistory ? tab === "History" : showOrderSummary ? tab === "Order Summary" : tab === "Discharge";
return (
<button key={tab} type="button" onClick={() => { if (tab === "History") { setShowHistory(true); setShowNotesDocs(false); setShowOrderSummary(false); return; } if (tab === "Notes & Documents") { setShowNotesDocs(true); setShowHistory(false); setShowOrderSummary(false); return; } if (tab === "Order Summary") { setShowHistory(false); setShowNotesDocs(false); setShowOrderSummary(true); return; } setShowHistory(false); setShowNotesDocs(false); setShowOrderSummary(false); if (tab !== "Discharge") { onBack?.(); } }} className={`px-1 py-3 border-b-2 text-sm font-medium transition-colors ${isActive ? "border-[#1d4ed8] text-[#1d4ed8] font-semibold" : "border-transparent text-[#64748b] hover:text-[#1e293b] hover:border-slate-300"}`}>
{tab}
</button>
);
})}
</nav>
</div>
{/* END: Tabs */}
{/* BEGIN: Branch scope hint */}
{scopeHint && (
<div className="mb-6 flex items-center rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
<i className="fa-solid fa-triangle-exclamation mr-2"></i> Multiple branches assigned — select your branch to load plan, discharge &amp; appointment details:
<InlineBranchPicker />
</div>
)}
{/* END: Branch scope hint */}


          
          {/* =====================================================
              MAIN GRID
          ====================================================== */}
          {showHistory ? (
            <HistoryDashboard embedded patientId={patientId} initialPlan={dischargePlan} />
          ) : showNotesDocs ? (
            <PatientNotesDocuments embedded patientId={patientId} />
          ) : showOrderSummary ? (
          /* =================================================
              ORDER SUMMARY - ALL recent details of the selected
              patient fetched from the backend
          ================================================== */
          <div className="space-y-6">
            {planPreviewLoading && (
              <div className="flex items-center rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Loading recent details…
              </div>
            )}
            {!planPreviewLoading && planPreviewError && (
              <div className="flex items-center rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                <i className="fa-solid fa-triangle-exclamation mr-2"></i> {planPreviewError}
              </div>
            )}
            {!planPreviewLoading && (planPreview || stagingDetail) && (
              <>
                <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <SectionHeader icon="fa-solid fa-file-medical" title={`Diagnosis & Staging — ${orderSummaryDiagnosis || "—"}`} badge={stagingDetail?.clinical_stage || planPreview?.clinical_stage || "—"} />
                  {diagnosisEntries.length > 0 ? renderEntryGrid(diagnosisEntries) : (
                    <p className="px-6 py-6 text-sm text-slate-400">No diagnosis fields saved yet.</p>
                  )}
                </section>

                {derivedEntries.length > 0 && (
                  <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <SectionHeader icon="fa-solid fa-wand-magic-sparkles" title="Auto-Derived Classification" badge="Derived Fields" badgeClass="bg-purple-100 text-purple-700" />
                    {renderEntryGrid(derivedEntries)}
                  </section>
                )}

                {ihc && ihcEntries.length > 0 && (
                  <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <SectionHeader icon="fa-solid fa-microscope" title={`IHC Results${ihc.ihc_id ? ` — ${ihc.ihc_id}` : ""}`} badge={`${ihcEntries.length} Values`} badgeClass="bg-cyan-100 text-cyan-700" />
                    {renderEntryGrid(ihcEntries)}
                  </section>
                )}

                {mol && molecularEntries.length > 0 && (
                  <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <SectionHeader icon="fa-solid fa-dna" title={`Molecular Results${mol.mol_id ? ` — ${mol.mol_id}` : ""}`} badge={`${molecularEntries.length} Values`} badgeClass="bg-emerald-100 text-emerald-700" />
                    {renderEntryGrid(molecularEntries)}
                  </section>
                )}
              </>
            )}
          </div>
          ) : (
          <div className="grid gap-6 xl:grid-cols-3">
            {/* ===================================================
                LEFT COLUMN
            ==================================================== */}
            <div className="space-y-6 xl:col-span-2">
              {/* =================================================
                  DISCHARGE STATUS SUMMARY
              ================================================== */}
              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {/* Section Header */}
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Discharge Status Summary
                  </h3>

                  {((dischargePlan?.treatment_status ?? "").toUpperCase() === "COMPLETED") ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                      <i className="fa-regular fa-circle-check mr-1.5" />
                      Protocol Completed
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
                      <i className="fa-regular fa-clock mr-1.5" />
                      {dischargePlan ? "Treatment In Progress" : "Not Recorded"}
                    </span>
                  )}
                </div>

                {/* Section Body */}
                <div className="flex flex-col gap-6 p-6 lg:flex-row">
                  {/* Details */}
                  <div className="flex-1 space-y-5">
                    {/* Treatment Outcome */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-sm text-gray-500">
                        Treatment
                        <br />
                        Outcome
                      </div>

                      <div className={`col-span-2 text-lg font-semibold ${((dischargePlan?.treatment_status ?? "").toUpperCase() === "COMPLETED") ? "text-green-700" : "text-gray-500"}`}>
                        {dischargePlan?.treatment_status || "Not recorded"}
                      </div>
                    </div>

                    {/* Discharge Date */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center text-sm text-gray-500">
                        Discharge Date
                      </div>

                      <div className="col-span-2 flex items-center font-semibold text-gray-500">
                        Not recorded
                      </div>
                    </div>

                    {/* Discharge Time */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center text-sm text-gray-500">
                        Discharge Time
                      </div>

                      <div className="col-span-2 flex items-center font-semibold text-gray-500">
                        Not recorded
                      </div>
                    </div>

                    {/* Physician */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center text-sm text-gray-500">
                        Admitting Physician
                      </div>

                      <div className="col-span-2 flex items-center font-semibold text-gray-900">
                        {sd?.consulting_oncologist ||
                          (sd?.employees
                            ? [
                                sd.employees.first_name,
                                sd.employees.last_name,
                              ]
                                .filter(Boolean)
                                .join(" ")
                            : "") ||
                          (dischargePlan?.employees
                            ? [
                                dischargePlan.employees.first_name,
                                dischargePlan.employees.last_name,
                              ]
                                .filter(Boolean)
                                .join(" ")
                            : "") ||
                          "—"}
                      </div>
                    </div>
                  </div>

                  {/* Treatment Cycle Stats */}
                  <div className="w-full rounded-lg border border-dashed border-gray-300 bg-white p-5 lg:w-80">
                    <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Treatment Cycle Stats
                    </h4>

                    <div className="grid gap-y-4 sm:grid-cols-2">
                      {/* Planned */}
                      <div>
                        <p className="mb-1 text-xs text-gray-500">
                          Cycles Planned
                        </p>
                        <p className="text-xl font-medium text-gray-900">
                          {dischargePlan?.planned_cycles ?? 0}
                        </p>
                      </div>

                      {/* Administered */}
                      <div>
                        <p className="mb-1 text-xs text-gray-500">
                          Cycles Administered
                        </p>
                        <p className="text-xl font-medium text-blue-800">
                          {administeredCount}
                        </p>
                      </div>

                      {/* Duration */}
                      <div>
                        <p className="mb-1 text-xs text-gray-500">
                          Total Duration
                        </p>
                        <p className="text-base text-gray-900">{treatmentDurationLabel || "—"}</p>
                      </div>

                      {/* Reactions */}
                      <div>
                        <p className="mb-1 text-xs text-gray-500">
                          Adverse Reactions
                        </p>
                        <p className={`text-base font-medium ${reactionCount > 0 ? "text-red-600" : "text-green-700"}`}>
                          {reactionCount > 0 ? reactionCount : "None"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* =================================================
                  TAKE HOME MEDICATIONS
              ================================================== */}
              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Take-Home Medications{" "}
                    {!dischargeMedsLoading && medications.length > 0 && (
                      <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 align-middle text-xs font-bold text-blue-700">
                        {medications.length}
                      </span>
                    )}
                  </h3>

                  <button
                    type="button"
                    className="flex items-center text-sm font-medium text-blue-800 transition hover:underline"
                    onClick={() => window.print()}
                  >
                    <i className="fa-solid fa-print mr-2" />
                    Print Rx
                  </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Medication
                        </th>

                        <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Composition
                        </th>

                        <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Dose
                        </th>

                        <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Frequency
                        </th>

                        <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Duration
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200 bg-white">
                      {dischargeMedsLoading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-6 text-center text-xs text-slate-400">
                            <i className="fa-solid fa-circle-notch fa-spin mr-2" /> Loading discharge medicines…
                          </td>
                        </tr>
                      ) : dischargeMedsError ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-6 text-center text-xs text-red-500">
                            <i className="fa-solid fa-triangle-exclamation mr-2" /> {dischargeMedsError}
                          </td>
                        </tr>
                      ) : medications.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-6 text-center text-xs text-slate-400">
                            {dischargeProtocolId
                              ? "No discharge medicines recorded on this patient's regimen protocol yet."
                              : "No regimen protocol linked to this patient's plan yet."}
                          </td>
                        </tr>
                      ) : (
                        medications.map((medication) => (
                        <tr key={medication.id}>
                          <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
                            {medication.medication}
                          </td>

                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            {medication.composition}
                          </td>

                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {medication.dose}
                          </td>

                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {medication.frequency}
                          </td>

                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {medication.duration}
                          </td>
                        </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            {/* ===================================================
                RIGHT COLUMN
            ==================================================== */}
            <div className="space-y-6">
              {/* =================================================
                  FINAL VITAL SIGNS
              ================================================== */}
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-end justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Final Vital Signs
                  </h3>

                  <span className="text-xs text-gray-500">
                    {lastCheckedLabel || "No vitals recorded"}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {vitals.map((vital) => (
                    <div
                      key={vital.label}
                      className="rounded-lg bg-slate-50 p-4"
                    >
                      <p className="mb-1 text-xs text-gray-500">
                        {vital.label}
                      </p>

                      <p className="text-xl font-bold text-gray-900">
                        {vital.value}
                      </p>

                      <p className="mt-1 text-xs font-medium uppercase text-green-700">
                        {vital.status}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* =================================================
                  CHECKLIST
              ================================================== */}
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Checklist
                  </h3>

                  <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                    {checklist.length}/{checklist.length} Done
                  </span>
                </div>

                <ul className="space-y-4">
                  {checklist.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-400">
                      No discharge checklist recorded for this patient yet.
                    </li>
                  ) : (
                    checklist.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <i className="fa-solid fa-circle-check mr-3 mt-0.5 text-lg text-green-500" />

                        <span className="text-sm text-gray-700">{item}</span>
                      </li>
                    ))
                  )}
                </ul>
              </section>
            </div>
          </div>
          )}
</div>
</div>
 </main>
{/* END: Main Content */}

      </div>

    </>
  );
}
