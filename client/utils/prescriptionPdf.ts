import { jsPDF } from "jspdf";

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
  visit_type?: string;
  chief_complaint?: string;
  clinical_notes?: string;
  followup_date?: string;
  prescription_status?: string;
  branch_name?: string;
  department_name?: string;
  patient_vitals?: {
    bp?: string;
    pulse?: string;
    temperature?: string;
    weight?: string;
    height?: string;
    spo2?: string;
  };
  patient_allergies?: Array<{
    allergen?: string;
    reaction?: string;
    severity?: string;
    notes?: string;
  }>;
  patient_symptoms?: Array<{
    symptom?: string;
    onset?: string;
    severity?: string;
    notes?: string;
  }>;
  patient_history?: {
    patient_first_name?: string;
    patient_last_name?: string;
    patient_display_id?: string;
    patient_id?: string;
    patient_mobile?: string;
    visit_date?: string;
    patient_dob?: string;
    date_of_birth?: string;
    age?: number;
    patient_gender?: string;
    gender?: string;
  };
  employees?: {
    first_name?: string;
    last_name?: string;
    specialization?: string;
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
  const margin = 50;
  let y = 50;

  const patientName = [prescription.patient_history?.patient_first_name, prescription.patient_history?.patient_last_name].filter(Boolean).join(" ") || "—";
  const patientId = prescription.patient_history?.patient_display_id || prescription.patient_history?.patient_id || "—";
  const doctorName = [prescription.employees?.first_name, prescription.employees?.last_name].filter(Boolean).join(" ") || "—";
  const doctorSpec = prescription.employees?.specialization || prescription.department_name || "—";
  const diagnosis = prescription.diagnosis?.diagnosis_name || "—";
  const dob = prescription.patient_history?.patient_dob || prescription.patient_history?.date_of_birth;
  const patientAge = dob ? (() => {
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : null;
  })() : null;
  const patientGender = prescription.patient_history?.patient_gender || prescription.patient_history?.gender || "—";
  
  const prescriptionDate = prescription.prescription_date ? new Date(prescription.prescription_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : formatDate(prescription.patient_history?.visit_date);

  // Outer border
  doc.setLineWidth(1);
  doc.rect(margin - 10, 40, 545, 800);

  // Header
  doc.setFontSize(16);
  doc.setTextColor(20,30,40);
  doc.setFont(undefined, 'bold');
  doc.text("PRESCRIPTION", margin, y);
  y += 8;
  doc.setLineWidth(1.2);
  doc.setDrawColor(0,71,133);
  doc.line(margin, y, margin+525, y);
  y += 18;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(30,30,30);
  doc.setFont(undefined, 'bold');
  doc.text("Patient Name:", margin, y);
  doc.setFont(undefined, 'normal');
  doc.text(patientName, margin+80, y);
  y += 16;
  doc.setFont(undefined, 'bold');
  doc.text("Patient ID:", margin, y);
  doc.setFont(undefined, 'normal');
  doc.text(patientId, margin+80, y);
  y += 16;
  doc.setFont(undefined, 'bold');
  doc.text("Age/Gender:", margin, y);
  doc.setFont(undefined, 'normal');
  doc.text(`${patientAge !== null ? patientAge : '—'} / ${patientGender}`, margin+80, y);
  y += 16;
  doc.setFont(undefined, 'bold');
  doc.text("Date:", margin, y);
  doc.setFont(undefined, 'normal');
  doc.text(prescriptionDate, margin+80, y);
  y += 18;

  doc.setFont(undefined, 'bold');
  doc.text("Doctor: ", margin, y);
  doc.setFont(undefined, 'normal');
  doc.text(`Dr. ${doctorName}`, margin+50, y);
  y += 16;
  doc.setFont(undefined, 'bold');
  doc.text("Department: ", margin, y);
  doc.setFont(undefined, 'normal');
  doc.text(doctorSpec, margin+75, y);
  y += 18;

  // Vitals
  if (prescription.patient_vitals) {
    const v = prescription.patient_vitals;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0,71,133);
    doc.text("Vitals", margin, y);
    y += 10;
    doc.setTextColor(30,30,30);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.text(`BP: ${v.bp || '—'}`, margin+20, y);
    doc.text(`Pulse: ${v.pulse || '—'}`, margin+150, y);
    doc.text(`Temp: ${v.temperature || '—'}`, margin+260, y);
    doc.text(`SpO2: ${v.spo2 || '—'}`, margin+360, y);
    y += 16;
    doc.text(`Weight: ${v.weight || '—'}`, margin+20, y);
    doc.text(`Height: ${v.height || '—'}`, margin+150, y);
    y += 16;
  }

  // Allergies
  if (prescription.patient_allergies && prescription.patient_allergies.length > 0) {
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0,71,133);
    doc.text("Allergies", margin, y);
    y += 10;
    doc.setTextColor(30,30,30);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    prescription.patient_allergies.slice(0,5).forEach((a:any) => {
      const name = a.allergy_master?.substance_name || a.allergen || '—';
      const reaction = a.reaction || '';
      doc.text(`• ${name}${reaction ? ' - ' + reaction : ''}`, margin+20, y);
      y += 13;
    });
    y += 4;
  }

  // Symptoms
  if (prescription.patient_symptoms && prescription.patient_symptoms.length > 0) {
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0,71,133);
    doc.text("Symptoms", margin, y);
    y += 10;
    doc.setTextColor(30,30,30);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    prescription.patient_symptoms.slice(0,5).forEach((s:any) => {
      const name = s.symptom_master?.symptom_name || s.symptom || '—';
      const severity = s.severity || s.status || '';
      const notes = s.notes || s.clinical_notes || '';
      const line = severity ? `${name} (${severity})` : name;
      doc.text(`• ${line}`, margin+20, y);
      y += 13;
      if (notes) {
        const nLines = doc.splitTextToSize(notes, 470);
        nLines.forEach(nl => { doc.text(`  ${nl}`, margin+30, y); y += 12; });
      }
    });
    y += 4;
  }

  y += 6;
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0,71,133);
  doc.text("Diagnosis", margin, y);
  y += 12;
  doc.setTextColor(30,30,30);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.text(diagnosis, margin+20, y);
  y += 22;

  // Medications grouped by drug_role
  const items = prescription.prescription_items || [];
  const roleOrder = ['PRIMARY', 'PREMEDICATION', 'SUPPORTIVE'];
  const grouped: Record<string, any[]> = {};
  roleOrder.forEach(r => grouped[r] = []);
  grouped['OTHER'] = [];
  items.forEach(it => {
    const role = (it.drug_role || '').toString().toUpperCase().trim() || 'OTHER';
    if (roleOrder.includes(role)) grouped[role].push(it);
    else grouped['OTHER'].push(it);
  });

  const medLineHeight = 13;
  const colWidths = {
    medicine: 150,
    dosage: 80,
    frequency: 90,
    instruction: 180
  };
  const colX = {
    medicine: margin,
    dosage: margin + 160,
    frequency: margin + 250,
    instruction: margin + 350
  };
  const maxContentWidth = margin + 525;

  const printWrappedCell = (text: string, x: number, startY: number, maxWidth: number) => {
    const lines = doc.splitTextToSize(text || '—', maxWidth);
    lines.forEach((line: string, i: number) => {
      doc.text(line, x, startY + i * medLineHeight);
    });
    return lines.length;
  };

  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0,71,133);
  doc.text("MEDICATIONS", margin, y);
  y += 18;

  doc.setFontSize(9);
  doc.setTextColor(30,30,30);
  const allRoles = [...roleOrder, 'OTHER'].filter(r => grouped[r].length > 0);

  allRoles.forEach((role, roleIdx) => {
    if (roleIdx > 0) y += 16;

    // Role banner with breathing room
    const bannerHeight = 20;
    doc.setFillColor(230, 242, 255);
    doc.rect(margin, y, 525, bannerHeight, 'F');
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0,71,133);
    doc.setFontSize(10);
    doc.text(`${role} MEDICATIONS`, margin + 6, y + 13);
    y += bannerHeight + 8;

    // Table header with light background
    const headerHeight = 18;
    doc.setFillColor(245, 247, 250);
    doc.rect(margin, y, 525, headerHeight, 'F');
    doc.setTextColor(40,40,40);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.text("Medicine", colX.medicine, y + 12);
    doc.text("Dosage", colX.dosage, y + 12);
    doc.text("Frequency", colX.frequency, y + 12);
    doc.text("Instruction", colX.instruction, y + 12);
    y += headerHeight + 4;
    doc.setDrawColor(210,210,210);
    doc.setLineWidth(0.5);
    doc.line(margin, y, maxContentWidth, y);
    y += 6;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30,30,30);

    grouped[role].forEach(it => {
      const med = it.medicine_name || it.medicine_master?.medicine_name || '—';
      const dosage = `${it.dosage || ''} ${it.unit || ''}`.trim() || '—';
      const freq = it.frequency || '—';
      const instr = it.instruction || '—';

      const medLines = printWrappedCell(med, colX.medicine, y, colWidths.medicine);
      const dosLines = printWrappedCell(dosage, colX.dosage, y, colWidths.dosage);
      const freqLines = printWrappedCell(freq, colX.frequency, y, colWidths.frequency);
      const instrLines = printWrappedCell(instr, colX.instruction, y, colWidths.instruction);

      const rowHeight = Math.max(medLines, dosLines, freqLines, instrLines) * medLineHeight + 8;
      // row separator below content
      doc.setDrawColor(235,235,235);
      doc.line(margin, y + rowHeight - 6, maxContentWidth, y + rowHeight - 6);
      y += rowHeight;

      // simple page overflow guard
      if (y > 790) {
        doc.addPage();
        doc.setLineWidth(1);
        doc.rect(margin - 10, 40, 545, 800);
        y = 60;
      }
    });

    y += 8;
    doc.setDrawColor(180,180,180);
    doc.setLineWidth(0.8);
    doc.line(margin, y, maxContentWidth, y);
    y += 14;
  });

  doc.setTextColor(30,30,30);
  y += 6;

  // Instructions
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0,71,133);
  doc.text("Instructions", margin, y);
  y += 12;
  doc.setTextColor(30,30,30);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  const advice = prescription.advice || '';
  if (advice) {
    const lines = doc.splitTextToSize(advice, 470);
    doc.text(`• ${lines[0]}`, margin+10, y);
    y += 14;
    for (let i=1;i<lines.length;i++){
      doc.text(`• ${lines[i]}`, margin+10, y);
      y += 14;
    }
  } else {
    doc.text("• Take medicines after food.", margin+10, y); y += 14;
    doc.text("• Drink plenty of water.", margin+10, y); y += 14;
    doc.text("• Take adequate rest.", margin+10, y); y += 14;
  }

  // Investigations
  y += 6;
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0,71,133);
  doc.text("Investigations", margin, y);
  y += 12;
  doc.setTextColor(30,30,30);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  const investigations = prescription.clinical_notes || 'Complete Blood Count (CBC)';
  const invLines = doc.splitTextToSize(investigations, 470);
  invLines.forEach((line:string) => {
    doc.text(`• ${line}`, margin+10, y);
    y += 14;
  });
  y += 6;

  // Follow-up
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0,71,133);
  doc.text("Follow-up", margin, y);
  y += 12;
  doc.setTextColor(30,30,30);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  const followup = prescription.followup_date ? `After ${prescription.followup_date}` : "After 7 days";
  doc.text(followup, margin+10, y);
  y += 30;

  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text("Doctor Signature", margin, y);
  y += 16;
  doc.setDrawColor(0,0,0);
  doc.line(margin, y, margin+200, y);
  y += 6;
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.text(doctorName, margin, y);

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
