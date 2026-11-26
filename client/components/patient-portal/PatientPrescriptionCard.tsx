import React, { useState, useEffect } from "react";
import { PatientPrescription } from "@/api/patientPortal.api";
import {
  PatientDocumentItem,
  syncPrescriptionToPatientDocument,
  downloadDocument,
} from "@/utils/patientDocuments";
import { getUser } from "@/utils/token";
import WordImagesViewModal from "@/components/hms/WordImagesViewModal";
import {
  downloadPrescriptionPdf,
  generatePrescriptionPdf,
} from "@/utils/prescriptionPdf";
import { mapPatientPrescriptionToPdfData } from "./PrescriptionPdfPreviewModal";

interface PatientPrescriptionCardProps {
  prescription: PatientPrescription;
  compact?: boolean;
}

export const PatientPrescriptionCard: React.FC<PatientPrescriptionCardProps> = ({
  prescription,
  compact = false,
}) => {
  const [docItem, setDocItem] = useState<PatientDocumentItem | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const user = getUser();
  const patientId =
    prescription.patient_history?.patient_id ||
    prescription.patient_history?.patient_bio_data?.patient_id ||
    user?.patient_id ||
    user?.patient_uhid ||
    user?.uhid ||
    "";

  // Auto-sync prescription as a stored document file in patient_document
  useEffect(() => {
    let cancelled = false;
    if (patientId && prescription.prescription_id) {
      syncPrescriptionToPatientDocument(patientId, prescription)
        .then((saved) => {
          if (!cancelled && saved) setDocItem(saved);
        })
        .catch((err) => console.warn("Failed to sync prescription doc:", err));
    }
    return () => {
      cancelled = true;
    };
  }, [patientId, prescription]);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const doctorName = prescription.employees
    ? `Dr. ${prescription.employees.first_name || ""} ${
        prescription.employees.last_name || ""
      }`.trim()
    : "Physician";

  const departmentName =
    prescription.department_master?.department_name || "General Medicine";

  const items = prescription.prescription_items || [];
  const fileName = `Prescription_${prescription.prescription_id}.pdf`;

  const handleDownload = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (docItem) {
      downloadDocument(docItem);
      return;
    }
    try {
      setDownloading(true);
      const pdfData = mapPatientPrescriptionToPdfData(prescription);
      await downloadPrescriptionPdf(pdfData);
    } catch (err) {
      console.error("Prescription download failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  const handleView = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (docItem) {
      setShowViewer(true);
      return;
    }
    // If not synced yet, generate blob dynamically
    try {
      const pdfData = mapPatientPrescriptionToPdfData(prescription);
      const { blob } = await generatePrescriptionPdf(pdfData);
      const tempDoc: PatientDocumentItem = {
        id: `temp_${prescription.prescription_id}`,
        patientId,
        name: fileName,
        title: `Prescription_${prescription.prescription_id}`,
        originalName: fileName,
        size: blob.size,
        type: "application/pdf",
        url: URL.createObjectURL(blob),
        uploadDate: formatDate(prescription.prescription_date),
        info: `PDF • ${Math.round(blob.size / 1024)} KB • ${formatDate(
          prescription.prescription_date
        )}`,
        icon: "fa-file-pdf",
        color: "text-red-500",
        hover: "hover:border-red-300",
        blob,
      };
      setDocItem(tempDoc);
      setShowViewer(true);
    } catch (err) {
      console.error("Failed to prepare prescription preview:", err);
    }
  };

  return (
    <>
      <div className="group relative rounded-xl border border-blue-100 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-blue-300 flex flex-col justify-between">
        <div>
          {/* Header row with File Icon & Badges */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-red-500 text-lg flex-shrink-0">
                <i className="fa-solid fa-file-pdf" />
              </span>
              <span className="rounded-full bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 text-[10px] font-bold">
                PDF
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                Prescription
              </span>
            </div>
            <span className="text-[11px] font-medium text-slate-400">
              {formatDate(prescription.prescription_date)}
            </span>
          </div>

          {/* Document / File Name */}
          <h4
            className="mb-1 text-sm font-bold text-slate-900 truncate"
            title={fileName}
          >
            {fileName}
          </h4>

          {/* File details info line */}
          <p className="mb-3 text-[11px] text-slate-500">
            {docItem?.info ||
              `PDF • ${items.length} medicine(s) • ${formatDate(
                prescription.prescription_date
              )}`}
          </p>

          {/* Doctor & Department details */}
          <div className="mb-4 text-xs bg-slate-50 rounded-lg p-2.5 border border-slate-100 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 truncate">
                {doctorName}
              </span>
              <span className="text-[10px] text-slate-500">{departmentName}</span>
            </div>
            {prescription.diagnosis?.diagnosis_name && (
              <div className="text-[11px] text-indigo-700 truncate">
                Diagnosis: {prescription.diagnosis.diagnosis_name}
              </div>
            )}
            {items.length > 0 && (
              <div className="text-[11px] text-slate-500 truncate pt-0.5 border-t border-slate-200/60">
                <span className="font-medium text-slate-700">Meds: </span>
                {items
                  .slice(0, 3)
                  .map(
                    (it) =>
                      it.drug_name || it.medicine_master?.medicine_name
                  )
                  .filter(Boolean)
                  .join(", ")}
                {items.length > 3 ? ` +${items.length - 3} more` : ""}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons matching Doctor Notes & Documents */}
        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleView}
            className="flex flex-1 items-center justify-center gap-1.5 rounded bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 cursor-pointer"
          >
            <i className="fa-regular fa-eye text-xs" />
            View
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="flex flex-1 items-center justify-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-50 cursor-pointer disabled:opacity-50"
          >
            <i className="fa-solid fa-download text-xs" />
            Download
          </button>
        </div>
      </div>

      {showViewer && docItem && (
        <WordImagesViewModal
          documents={[docItem]}
          label={fileName}
          onClose={() => setShowViewer(false)}
          onDownload={() => handleDownload()}
        />
      )}
    </>
  );
};
