import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface PrescriptionItem {
  medicine_name?: string;
  medicine_master?: {
    medicine_name?: string;
    generic_name?: string;
  };
  dosage?: string | number;
  dose?: string | number;
  unit?: string;
  instruction?: string;
  remarks?: string;
  cycle_day?: number | string;
  route?: string;
  frequency?: string;
  administration_route?: string;
  drug_role?: string;
}

export interface PrescriptionData {
  prescription_id?: string;
  prescription_date?: string;
  advice?: string;
  patient_history?: {
    patient_first_name?: string;
    patient_last_name?: string;
    patient_display_id?: string;
    patient_id?: string;
  };
  employees?: {
    first_name?: string;
    last_name?: string;
  };
  diagnosis?: {
    diagnosis_name?: string;
    icd10_code?: string;
  };
  prescription_items?: PrescriptionItem[];
}

const formatDate = (value?: string) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`;
};

export function generatePrescriptionPdf(prescription: PrescriptionData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const margin = 40;
  let y = 40;

  const patientName = [prescription.patient_history?.patient_first_name, prescription.patient_history?.patient_last_name].filter(Boolean).join(" ") || "—";
  const patientId = prescription.patient_history?.patient_display_id || prescription.patient_history?.patient_id || "—";
  const doctorName = [prescription.employees?.first_name, prescription.employees?.last_name].filter(Boolean).join(" ") || "—";
  const diagnosis = prescription.diagnosis?.diagnosis_name || prescription.diagnosis?.icd10_code || "—";

  doc.setFontSize(18);
  doc.setTextColor(20,30,40);
  doc.text("Prescription", margin, y);
  y += 24;

  doc.setFontSize(10);
  doc.setTextColor(60,60,60);
  const appointmentDate = prescription.appointment_date || prescription.patient_history?.visit_date || prescription.prescription_date;
  const currentTreatment = (prescription as any).current_treatment || (prescription as any).treatment_plan || prescription.diagnosis?.diagnosis_name || "Current Treatment";

  doc.text(`Treatment: ${currentTreatment}`, margin, y);
  doc.text(`Date: ${formatDate(prescription.prescription_date)}`, margin + 250, y);
  y += 14;
  doc.text(`Patient: ${patientName}  (${patientId})`, margin, y);
  doc.text(`Appt Date: ${formatDate(appointmentDate)}`, margin + 250, y);
  y += 14;
  doc.text(`Diagnosis: ${diagnosis}`, margin, y);
  doc.text(`Doctor: ${doctorName}`, margin + 250, y);
  y += 20;

  if (prescription.advice) {
    doc.setFontSize(11);
    doc.setTextColor(30,30,30);
    doc.text("Advice:", margin, y);
    y += 14;
    doc.setFontSize(10);
    const splitAdvice = doc.splitTextToSize(prescription.advice, 520);
    doc.text(splitAdvice, margin, y);
    y += splitAdvice.length * 12 + 12;
  }

  const items = prescription.prescription_items || [];

  const roleLabel = (role?: string) => {
    if (!role) return "Unspecified";
    const r = role.toUpperCase();
    switch (r) {
      case "PRIMARY": return "Primary Medicine";
      case "PREMEDICATION":
      case "PREMED": return "Premedication";
      case "SUPPORTIVE": return "Supportive Medicine";
      case "POSTMEDICATION":
      case "POSTMED": return "Post Medication";
      case "DISCHARGE": return "Discharge Medication";
      default: return role;
    }
  };

  const roleOrder = (role?: string) => {
    const r = (role || "").toUpperCase();
    const order: Record<string, number> = {
      "PRIMARY": 1,
      "PREMEDICATION": 2,
      "PREMED": 2,
      "SUPPORTIVE": 3,
      "POSTMEDICATION": 4,
      "POSTMED": 4,
      "DISCHARGE": 5,
    };
    return order[r] ?? 99;
  };

  const sortedItems = [...items].sort((a, b) => {
    const oa = roleOrder(a.drug_role);
    const ob = roleOrder(b.drug_role);
    if (oa !== ob) return oa - ob;
    const ra = (a.drug_role || "").toUpperCase();
    const rb = (b.drug_role || "").toUpperCase();
    return ra.localeCompare(rb);
  });

  let currentY = y;
  if (sortedItems.length > 0) {
    // Render grouped sections by drug role for clarity
    const groups: Record<string, typeof sortedItems> = {};
    for (const it of sortedItems) {
      const roleKey = (it.drug_role || "UNSPECIFIED").toUpperCase();
      if (!groups[roleKey]) groups[roleKey] = [];
      groups[roleKey].push(it);
    }

    const roleKeys = Object.keys(groups).sort((a, b) => roleOrder(a) - roleOrder(b));
    for (const role of roleKeys) {
      const groupItems = groups[role];
      // Section header
      doc.setFontSize(12);
      doc.setTextColor(0, 71, 133);
      doc.setFont(undefined, "bold");
      doc.text(`${roleLabel(role)}`, margin, currentY);
      currentY += 16;

      const groupBody = groupItems.map((it, idx) => {
        const medicine = it.medicine_name || it.medicine_master?.medicine_name || "—";
        const generic = it.medicine_master?.generic_name || "";
        const dose = it.dosage ?? it.dose ?? "—";
        const unit = it.unit || "";
        const route = it.route || it.administration_route || "";
        const freq = it.frequency || "";
        const instruction = it.instruction || it.remarks || "";
        const cycleDay = it.cycle_day ? String(it.cycle_day) : "";
        return [
          String(idx + 1),
          `${medicine}${generic ? `\n${generic}` : ""}`,
          `${dose} ${unit}`.trim(),
          route,
          freq,
          instruction,
          cycleDay
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: [["#","Medicine","Dosage","Route","Frequency","Instruction","Cycle Day"]],
        body: groupBody,
        styles: { fontSize: 9, cellPadding: 5, textColor: [30,41,59] as [number,number,number], lineColor:[226,232,240] as [number,number,number], lineWidth:0.5 },
        headStyles: { fillColor:[0,71,133] as [number,number,number], textColor:[255,255,255] as [number,number,number], fontStyle:"bold" as const },
        alternateRowStyles:{ fillColor:[247,249,251] },
        margin:{ left: margin, right: margin },
        columnStyles:{
          0:{ cellWidth:25 },
          6:{ cellWidth:50 }
        }
      });
      currentY = (doc as any).lastAutoTable?.finalY ?? currentY;
      currentY += 16;
    }
  } else {
    // Fallback empty table
    autoTable(doc, {
      startY: y,
      head: [["#","Drug Role","Medicine","Dosage","Route","Frequency","Instruction","Cycle Day"]],
      body: [],
      styles: { fontSize: 9, cellPadding: 5, textColor: [30,41,59] as [number,number,number], lineColor:[226,232,240] as [number,number,number], lineWidth:0.5 },
      headStyles: { fillColor:[0,71,133] as [number,number,number], textColor:[255,255,255] as [number,number,number], fontStyle:"bold" as const },
      margin:{ left: margin, right: margin }
    });
    currentY = (doc as any).lastAutoTable?.finalY ?? y;
  }

  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  return { url, blob };
}

export function downloadPrescriptionPdf(prescription: PrescriptionData) {
  const { blob } = generatePrescriptionPdf(prescription);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Prescription_${prescription.prescription_id || "patient"}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
