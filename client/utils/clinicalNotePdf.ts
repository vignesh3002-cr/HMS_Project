import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export function generateClinicalNotePdf(data: any) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const margin = 40;
  let y = 40;

  // Helpers
  const addSection = (title: string, content?: string | null) => {
    const textToPrint = content ? content.trim() : "Not recorded";
    // Check page boundary
    if (y > 750) {
      doc.addPage();
      y = 40;
    }
    doc.setFontSize(12);
    doc.setTextColor(0, 71, 133);
    doc.setFont(undefined, "bold");
    doc.text(title, margin, y);
    y += 14;

    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.setFont(undefined, "normal");
    const splitText = doc.splitTextToSize(textToPrint, 520);
    doc.text(splitText, margin, y);
    y += splitText.length * 12 + 16;
  };

  const formatDate = (value?: string) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  };

  // Header Data
  const ph = data.patient_history || data.raw?.patient_history || {};
  const pb = ph.patient_bio_data || {};
  
  const patientName = [pb.patient_first_name || ph.patient_first_name, pb.patient_last_name || ph.patient_last_name].filter(Boolean).join(" ") || "—";
  const patientId = pb.patient_display_id || ph.patient_display_id || pb.patient_id || ph.patient_id || "—";
  
  const emp = data.employees || data.raw?.employees || {};
  const doctorName = [emp.first_name, emp.last_name].filter(Boolean).join(" ") || "—";
  
  const visitDate = ph.visit_date || data.appointment_date || data.prescription_date || data.date;

  // Header Block
  doc.setFontSize(18);
  doc.setTextColor(20, 30, 40);
  doc.setFont(undefined, "bold");
  doc.text("Clinical Note", margin, y);
  y += 24;

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.setFont(undefined, "normal");
  
  doc.text(`Patient: ${patientName} (${patientId})`, margin, y);
  doc.text(`Date: ${formatDate(visitDate)}`, margin + 300, y);
  y += 14;
  doc.text(`Doctor: ${doctorName}`, margin, y);
  y += 24;

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, 595 - margin, y);
  y += 20;

  // Content Sections IN EXACT ORDER REQUESTED

  // 1. Chief complaint / reason for visit
  const chiefComplaint = data.raw?.chief_complaint || data.chief_complaint || ph.visit_type || ph.reason_for_visit;
  addSection("Chief complaint / reason for visit", chiefComplaint);

  // 2. Symptoms and medical history
  const symptoms = ph.history_of_present_illness || data.raw?.appointment_history?.symptoms || ph.allergy_history;
  addSection("Symptoms and medical history", symptoms);

  // 3. Doctor's examination findings
  const clinicalNotes = data.raw?.clinical_notes || ph.clinical_notes || data.notes;
  addSection("Doctor's examination findings", clinicalNotes);

  // 4. Diagnosis
  const diag = data.diagnosis || data.raw?.diagnosis || {};
  const diagnosisText = diag.diagnosis_name || diag.icd10_code;
  addSection("Diagnosis", diagnosisText);

  // 5. Treatment plan
  const treatmentPlan = ph.treatment_plan || data.current_treatment;
  addSection("Treatment plan", treatmentPlan);

  // 6. Prescription details
  const items = data.prescription_items || [];
  if (items.length > 0) {
    if (y > 700) { doc.addPage(); y = 40; }
    doc.setFontSize(12);
    doc.setTextColor(0, 71, 133);
    doc.setFont(undefined, "bold");
    doc.text("Prescription details", margin, y);
    y += 14;

    const tableBody = items.map((it: any, idx: number) => {
      const medicine = it.medicine_name || it.medicine_master?.medicine_name || "Unknown";
      const dose = it.dosage ?? it.dose ?? "";
      const unit = it.unit || "";
      const route = it.route || it.administration_route || "";
      const freq = it.frequency || "";
      const instruction = it.instruction || it.remarks || "";
      return [
        String(idx + 1),
        medicine,
        `${dose} ${unit}`.trim(),
        route,
        freq,
        instruction
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [["#", "Medicine", "Dosage", "Route", "Frequency", "Instruction"]],
      body: tableBody,
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [0, 71, 133], textColor: 255 },
      alternateRowStyles: { fillColor: [247, 249, 251] },
      margin: { left: margin, right: margin }
    });

    y = (doc as any).lastAutoTable?.finalY + 20;
  } else {
    addSection("Prescription details", "No medications prescribed.");
  }

  // 7. Follow-up instructions
  const followUp = data.advice || data.raw?.advice || ph.follow_up_advice;
  addSection("Follow-up instructions", followUp);

  // 8. Progress notes
  const progressNotes = data.raw?.progress_notes || ph.progress_notes;
  addSection("Progress notes", progressNotes);

  // 9. Vital observations or clinical observations
  const hasVitals = ph.temperature || ph.blood_sugar || ph.pulse || ph.systolic_bp;
  if (hasVitals) {
    if (y > 700) { doc.addPage(); y = 40; }
    doc.setFontSize(12);
    doc.setTextColor(0, 71, 133);
    doc.setFont(undefined, "bold");
    doc.text("Vital observations or clinical observations", margin, y);
    y += 14;

    const vitalsBody = [
      ["Temperature", ph.temperature ? `${ph.temperature} \xB0F` : "—", "Blood Sugar", ph.blood_sugar || "—"],
      ["Pulse", ph.pulse ? `${ph.pulse} bpm` : "—", "Resp. Rate", ph.respiratory_rate ? `${ph.respiratory_rate} /min` : "—"],
      ["Blood Pressure", (ph.systolic_bp && ph.diastolic_bp) ? `${ph.systolic_bp}/${ph.diastolic_bp} mmHg` : "—", "SpO2", ph.oxygen_saturation ? `${ph.oxygen_saturation} %` : "—"]
    ];

    autoTable(doc, {
      startY: y,
      body: vitalsBody,
      theme: "plain",
      styles: { fontSize: 10, cellPadding: 4, textColor: [30, 30, 30] },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 100 },
        1: { cellWidth: 140 },
        2: { fontStyle: "bold", cellWidth: 100 },
        3: { cellWidth: 140 }
      },
      margin: { left: margin, right: margin }
    });
    
    y = (doc as any).lastAutoTable?.finalY + 20;
  } else {
    addSection("Vital observations or clinical observations", "No vitals recorded.");
  }

  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  return { url, blob };
}

export function downloadClinicalNotePdf(data: any) {
  const { blob } = generateClinicalNotePdf(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const visitDate = data.appointment_date || data.prescription_date || data.date || "visit";
  a.download = `Clinical_Note_${visitDate}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
