import React, { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Download,
  Printer,
  ExternalLink,
  Loader2,
  FileText,
  AlertCircle,
  Pill,
} from "lucide-react";
import { PatientPrescription } from "@/api/patientPortal.api";
import {
  generatePrescriptionPdf,
  downloadPrescriptionPdf,
  PrescriptionData,
} from "@/utils/prescriptionPdf";
import { getUser } from "@/utils/token";

export function mapPatientPrescriptionToPdfData(
  prescription: PatientPrescription
): PrescriptionData {
  const user = getUser();
  const patientBio = prescription.patient_history?.patient_bio_data;

  // Patient Name
  const patientName =
    [
      patientBio?.patient_first_name,
      patientBio?.patient_middle_name,
      patientBio?.patient_last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    user?.patient_name ||
    user?.name ||
    "Patient";

  const patientId =
    prescription.patient_history?.patient_id ||
    patientBio?.patient_id ||
    user?.patient_id ||
    user?.patient_uhid ||
    "PATIENT";

  // Vitals
  const phx = prescription.patient_history;
  const vitals =
    phx &&
    (phx.systolic_bp ||
      phx.pulse ||
      phx.temperature ||
      phx.weight ||
      phx.height ||
      phx.oxygen_saturation)
      ? {
          bp:
            phx.systolic_bp && phx.diastolic_bp
              ? `${phx.systolic_bp}/${phx.diastolic_bp} mmHg`
              : undefined,
          pulse: phx.pulse ? `${phx.pulse} bpm` : undefined,
          temperature: phx.temperature ? `${phx.temperature} °F` : undefined,
          weight: phx.weight ? `${phx.weight} kg` : undefined,
          height: phx.height ? `${phx.height} cm` : undefined,
          spo2: phx.oxygen_saturation ? `${phx.oxygen_saturation} %` : undefined,
        }
      : undefined;

  // Allergies
  const allergies = phx?.allergy_history
    ? [{ allergen: phx.allergy_history }]
    : undefined;

  // Medications
  const items = (prescription.prescription_items || []).map((item) => {
    let freq = item.frequency;
    if (!freq && (item.morning || item.afternoon || item.night)) {
      freq = `${item.morning ? "1" : "0"}-${item.afternoon ? "1" : "0"}-${
        item.night ? "1" : "0"
      }`;
    }
    const timing = item.food_relation || item.before_after_food;
    let instr = item.instruction || item.instructions || "";
    if (timing && !instr.toLowerCase().includes(timing.toLowerCase())) {
      instr = instr ? `${instr} (${timing})` : timing;
    }
    if (item.duration && !instr.toLowerCase().includes(item.duration.toLowerCase())) {
      instr = instr ? `${instr} • ${item.duration}` : item.duration;
    }

    return {
      medicine_name:
        item.drug_name ||
        item.medicine_master?.medicine_name ||
        "Prescribed Medicine",
      medicine_master: item.medicine_master,
      dosage:
        item.dosage ||
        item.dose ||
        item.medicine_master?.strength ||
        "1 Unit",
      unit: item.unit || "",
      frequency: freq || "As advised",
      instruction: instr || "Follow doctor's instructions",
      drug_role: item.drug_role || "PRIMARY",
      route: item.route || item.medicine_master?.dosage_form || "Oral",
    };
  });

  return {
    prescription_id: prescription.prescription_id,
    prescription_date: prescription.prescription_date,
    advice: prescription.advice || prescription.notes || undefined,
    visit_type: prescription.visit_type || phx?.visit_type || "Outpatient (OPD)",
    chief_complaint: prescription.chief_complaint || undefined,
    clinical_notes: prescription.clinical_notes || phx?.clinical_notes || undefined,
    followup_date: prescription.followup_date
      ? new Date(prescription.followup_date).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : undefined,
    prescription_status: prescription.prescription_status || "ACTIVE",
    branch_name:
      prescription.branch?.branch_name || user?.branch_name || "Main Branch",
    department_name:
      prescription.department_master?.department_name || "General Medicine",
    patient_vitals: vitals,
    patient_allergies: allergies,
    patient_history: {
      patient_first_name: patientName,
      patient_last_name: "",
      patient_id: patientId,
      patient_display_id: phx?.mrn_no || patientId,
      patient_gender:
        patientBio?.patient_gender || user?.patient_gender || undefined,
      patient_dob: patientBio?.patient_dob || undefined,
      age: patientBio?.patient_age || undefined,
      patient_mobile:
        patientBio?.patient_primary_mobile || user?.patient_mobile || undefined,
      visit_date: phx?.visit_date || prescription.prescription_date,
    },
    employees: {
      first_name: prescription.employees?.first_name || "Treating",
      last_name: prescription.employees?.last_name || "Doctor",
      specialization:
        prescription.employees?.specialization ||
        prescription.department_master?.department_name ||
        "General Physician",
    },
    diagnosis: prescription.diagnosis
      ? {
          diagnosis_name: prescription.diagnosis.diagnosis_name || undefined,
          icd10_code: prescription.diagnosis.icd10_code || undefined,
        }
      : undefined,
    prescription_items: items,
  };
}

interface PrescriptionPdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  prescription: PatientPrescription | null;
}

export const PrescriptionPdfPreviewModal: React.FC<
  PrescriptionPdfPreviewModalProps
> = ({ isOpen, onClose, prescription }) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    let currentUrl: string | null = null;
    let isCancelled = false;

    if (isOpen && prescription) {
      setLoading(true);
      setError(null);

      const generate = async () => {
        try {
          const pdfData = mapPatientPrescriptionToPdfData(prescription);
          const { url } = await generatePrescriptionPdf(pdfData);
          if (!isCancelled) {
            currentUrl = url;
            setPdfUrl(url);
          } else {
            URL.revokeObjectURL(url);
          }
        } catch (err: any) {
          if (!isCancelled) {
            console.error("Prescription PDF generation error:", err);
            setError(err?.message || "Failed to generate prescription PDF");
          }
        } finally {
          if (!isCancelled) {
            setLoading(false);
          }
        }
      };

      generate();
    } else {
      setPdfUrl(null);
    }

    return () => {
      isCancelled = true;
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [isOpen, prescription]);

  if (!isOpen || !prescription) return null;

  const doctorName = prescription.employees
    ? `Dr. ${prescription.employees.first_name || ""} ${
        prescription.employees.last_name || ""
      }`.trim()
    : "Physician";

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const pdfData = mapPatientPrescriptionToPdfData(prescription);
      await downloadPrescriptionPdf(pdfData);
    } catch (err) {
      console.error("Failed to download PDF:", err);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    } else if (pdfUrl) {
      const win = window.open(pdfUrl, "_blank");
      win?.focus();
      win?.print();
    }
  };

  const handleOpenNewTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, "_blank");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl shadow-2xl border border-slate-200 bg-white font-[Manrope,sans-serif]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
              <Pill className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span>Prescription #{prescription.prescription_id}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Accredited PDF
                </span>
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Prescribed by <span className="font-semibold text-slate-700">{doctorName}</span> •{" "}
                {prescription.department_master?.department_name || "General Medicine"}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={!pdfUrl || loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
              title="Print Prescription"
            >
              <Printer className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              type="button"
              onClick={handleOpenNewTab}
              disabled={!pdfUrl || loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
              title="Open PDF in new window"
            >
              <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">New Tab</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading || loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#00488D] text-white text-xs font-semibold hover:bg-blue-800 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* Body Viewer */}
        <div className="flex-1 min-h-[60vh] max-h-[75vh] bg-slate-100 flex items-center justify-center relative overflow-hidden">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 p-8">
              <Loader2 className="h-8 w-8 animate-spin text-[#00488D]" />
              <p className="text-xs font-semibold text-slate-600">
                Generating official prescription PDF...
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                Failed to render PDF preview
              </h4>
              <p className="text-xs text-slate-500 mt-1">{error}</p>
            </div>
          )}

          {pdfUrl && !loading && (
            <iframe
              ref={iframeRef}
              src={`${pdfUrl}#toolbar=1&navpanes=0`}
              className="w-full h-full min-h-[65vh] border-0"
              title={`Prescription-${prescription.prescription_id}`}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
