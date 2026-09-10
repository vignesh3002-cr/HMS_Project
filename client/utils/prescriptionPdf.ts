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

export async function generatePrescriptionPdf(prescription: PrescriptionData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const margin = 40;
  let y = 50;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  const logoDataUrl = await (async () => {
    try {
      const resp = await fetch('/combined-logo.svg');
      const svgText = await resp.text();
      const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      return await new Promise<string>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 900;
          canvas.height = 220;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve('');
          ctx.clearRect(0,0,canvas.width,canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/png');
          URL.revokeObjectURL(url);
          resolve(dataUrl);
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(''); };
        img.src = url;
      });
    } catch { return ''; }
  })();

  const addWatermark = (doc: any, w: number, h: number) => {
    if (!logoDataUrl) return;
    const gState = new (doc as any).GState({ opacity: 0.06 });
    doc.setGState(gState);
    const wmW = 400;
    const wmH = 110;
    const x = (w - wmW) / 2;
    const yPos = h / 2 - wmH / 2;
    doc.addImage(logoDataUrl, 'PNG', x, yPos, wmW, wmH);
    doc.setGState(new (doc as any).GState({ opacity: 1 }));
  };
  addWatermark(doc, pageWidth, pageHeight);

  const checkPage = (requiredSpace = 80) => { if (y + requiredSpace > pageHeight - margin) { doc.addPage(); y = margin; addWatermark(doc, pageWidth, pageHeight); } };

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

  const patientName = [prescription.patient_history?.patient_first_name, prescription.patient_history?.patient_last_name].filter(Boolean).join(" ") || "—";
  const patientId = prescription.patient_history?.patient_display_id || prescription.patient_history?.patient_id || "—";
  const doctorName = [prescription.employees?.first_name, prescription.employees?.last_name].filter(Boolean).join(" ") || "—";
  const doctorSpec = prescription.employees?.specialization || prescription.department_name || "—";
  const diagnosis = prescription.diagnosis?.diagnosis_name || "—";
  const dob = prescription.patient_history?.patient_dob || prescription.patient_history?.date_of_birth;
  const patientAgeFromData = prescription.patient_history?.age ?? prescription.patient_history?.patient_age;
  const patientAge = typeof patientAgeFromData === 'number' && patientAgeFromData > 0
    ? patientAgeFromData
    : dob ? (() => {
        const birth = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age >= 0 ? age : null;
      })()
    : null;
  const patientGender = prescription.patient_history?.patient_gender || prescription.patient_history?.gender || "—";
  
  const prescriptionDate = prescription.prescription_date ? new Date(prescription.prescription_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : formatDate(prescription.patient_history?.visit_date);

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

  // Vitals box top right
  if (prescription.patient_vitals) {
    const v = prescription.patient_vitals;
    const boxW = 200;
    const boxH = 110;
    const boxX = pageWidth - margin - boxW;
    const boxY = 70;
    doc.setDrawColor(0,71,133);
    doc.setLineWidth(1);
    doc.roundedRect(boxX, boxY, boxW, boxH, 4, 4, 'S');
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0,71,133);
    doc.text('Vitals', boxX + 8, boxY + 16);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(30,30,30);
    const vitalsY = boxY + 32;
    const col1X = boxX + 8;
    const col2X = boxX + 110;
    doc.text(`BP: ${v.bp || '—'}`, col1X, vitalsY);
    doc.text(`Pulse: ${v.pulse || '—'}`, col2X, vitalsY);
    doc.text(`Temp: ${v.temperature || '—'}`, col1X, vitalsY + 14);
    doc.text(`SpO2: ${v.spo2 || '—'}`, col2X, vitalsY + 14);
    doc.text(`Weight: ${v.weight || '—'}`, col1X, vitalsY + 28);
    doc.text(`Height: ${v.height || '—'}`, col2X, vitalsY + 28);
  }

  const branchName = prescription.branch_name || '—';
  const departmentName = prescription.department_name || doctorSpec || '—';

  doc.setFontSize(10);
  doc.setTextColor(30,30,30);
  // Patient Details
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0,71,133);
  doc.text("Patient Details", margin, y);
  y += 14;
  doc.setTextColor(30,30,30);
  doc.setFont(undefined, 'bold');
  doc.text("Patient Name:", margin, y);
  doc.setFont(undefined, 'normal');
  doc.text(patientName, margin+80, y);
  y += 14;
  doc.setFont(undefined, 'bold');
  doc.text("Patient ID:", margin, y);
  doc.setFont(undefined, 'normal');
  doc.text(patientId, margin+80, y);
  y += 14;
  doc.setFont(undefined, 'bold');
  doc.text("Age/Gender:", margin, y);
  doc.setFont(undefined, 'normal');
  doc.text(`${patientAge !== null ? patientAge : '—'} / ${patientGender}`, margin+80, y);
  y += 14;
  doc.setFont(undefined, 'bold');
  doc.text("Date:", margin, y);
  doc.setFont(undefined, 'normal');
  doc.text(prescriptionDate, margin+80, y);
  y += 14;

  // Doctor Details
  checkPage(80);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0,71,133);
  doc.text("Doctor Details", margin, y);
  y += 14;
  doc.setTextColor(30,30,30);
  doc.setFont(undefined, 'bold');
  doc.text("Doctor:", margin, y);
  doc.setFont(undefined, 'normal');
  doc.text(`Dr. ${doctorName}`, margin+50, y);
  y += 14;
  doc.setFont(undefined, 'bold');
  doc.text("Specialization:", margin, y);
  doc.setFont(undefined, 'normal');
  doc.text(doctorSpec, margin+85, y);
  y += 14;

  // Branch Details
  checkPage(80);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0,71,133);
  doc.text("Branch Details", margin, y);
  y += 14;
  doc.setTextColor(30,30,30);
  doc.setFont(undefined, 'bold');
  doc.text("Branch:", margin, y);
  doc.setFont(undefined, 'normal');
  doc.text(branchName, margin+50, y);
  y += 14;
  doc.setFont(undefined, 'bold');
  doc.text("Department:", margin, y);
  doc.setFont(undefined, 'normal');
  doc.text(departmentName, margin+70, y);
  y += 18;

  // Vitals moved to top right box - no duplicate rendering here

  // Allergies
  if (prescription.patient_allergies && prescription.patient_allergies.length > 0) {
    checkPage(60);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0,71,133);
    doc.text("Allergies", margin, y);
    y += 10;
    doc.setTextColor(30,30,30);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    prescription.patient_allergies.slice(0,5).forEach((a:any) => {
      checkPage(30);
      const name = a.allergy_master?.substance_name || a.allergen || '—';
      const reaction = a.reaction || '';
      doc.text(`• ${name}${reaction ? ' - ' + reaction : ''}`, margin+20, y);
      y += 13;
    });
    y += 4;
  }

  // Symptoms
  if (prescription.patient_symptoms && prescription.patient_symptoms.length > 0) {
    checkPage(80);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0,71,133);
    doc.text("Symptoms", margin, y);
    y += 10;
    doc.setTextColor(30,30,30);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    prescription.patient_symptoms.slice(0,5).forEach((s:any) => {
      checkPage(40);
      const name = s.symptom_master?.symptom_name
        || s.symptomMaster?.symptom_name
        || s.symptom_name
        || s.symptom
        || '—';
      const severity = s.severity || s.status || '';
      const notes = s.notes || s.clinical_notes || s.remarks || '';
      const line = severity ? `${name} (${severity})` : name;
      doc.text(`• ${line}`, margin+20, y);
      y += 13;
      if (notes) {
        const nLines = doc.splitTextToSize(notes, 470);
        nLines.forEach(nl => { checkPage(20); doc.text(`  ${nl}`, margin+30, y); y += 12; });
      }
    });
    y += 4;
  }

  checkPage(60);
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

  checkPage(60);
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(49, 46, 129);
  doc.text("MEDICATIONS", margin, y);
  y += 16;

  doc.setFontSize(9);
  doc.setTextColor(30,30,30);
  const allRoles = [...roleOrder, 'OTHER'].filter(r => grouped[r].length > 0);

  allRoles.forEach((role, roleIdx) => {
    if (roleIdx > 0) y += 28;
    checkPage(110);
    if (role !== 'OTHER') {
      doc.setFontSize(11);
      doc.setTextColor(49, 46, 129);
      doc.setFont(undefined, 'bold');
      doc.text(`${role} MEDICATIONS`, margin, y);
      y += 22;
    }

    const body = grouped[role]
      .filter(it => (it.medicine_name || it.medicine_master?.medicine_name))
      .map(it => [
        it.medicine_name || it.medicine_master?.medicine_name || '',
        `${it.dosage || ''} ${it.unit || ''}`.trim() || '',
        it.frequency || '',
        it.instruction || '',
      ]);

    autoTable(doc, {
      startY: y,
      head: [['Medicine', 'Dosage', 'Frequency', 'Instruction']],
      body,
      styles: tableStyles,
      headStyles,
      alternateRowStyles: { fillColor: [247, 249, 251] },
      margin: { left: margin, right: margin },
    });

    y = (doc as any).lastAutoTable.finalY ?? y;
    y += 32;
  });

  doc.setTextColor(30,30,30);
  y += 6;

  checkPage(60);
  // Discharge Medication inside instructions area
  const dischargeItemsFromPrescription = (prescription.prescription_items || []).filter(it => {
    const role = (it.drug_role || '').toString().toUpperCase();
    return role === 'DISCHARGE' || role.includes('DISCHARGE');
  });
  const dischargeItemsFromField = prescription.discharge_medications || prescription.dischargeMedications || [];
  const dischargeItems = [...dischargeItemsFromPrescription, ...dischargeItemsFromField];
  const parsePipeLine = (line: string) => {
    const parts = line.split('|').map(p => p.trim());
    if (parts.length < 2) return null;
    const medicine = parts[0] || '';
    const dosage = parts[1] || '';
    const frequency = parts[2] || '';
    const instruction = parts[3] || '';
    const duration = parts[4] || '';
    return {
      medicine_name: medicine,
      dosage,
      unit: '',
      frequency,
      instruction: duration ? `${instruction}${instruction ? ' - ' : ''}${duration} days` : instruction,
    };
  };
  const parsePipeDischarge = (raw: string) => {
    if (!raw || typeof raw !== 'string') return [] as any[];
    const rows = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    return rows.map(line => parsePipeLine(line)).filter(Boolean) as any[];
  };
  const normalizeDischargeItem = (it: any) => {
    if (!it) return null;
    // If item is a plain string, parse it
    if (typeof it === 'string') {
      return parsePipeLine(it);
    }
    // If instruction contains pipe separator and medicine name is missing, parse instruction
    const instr = (it.instruction || it.remarks || '').toString();
    if ((!it.medicine_name && !it.medicine_master?.medicine_name && !it.medicineName) && instr.includes('|')) {
      const parsed = parsePipeLine(instr);
      if (parsed) return parsed;
    }
    // Normalize structured item
    const medicine = it.medicine_name || it.medicine_master?.medicine_name || it.medicineName || '';
    if (!medicine) return null;
    return {
      medicine_name: medicine,
      dosage: it.dosage || it.dose || '',
      unit: it.unit || '',
      frequency: it.frequency || '',
      instruction: it.instruction || it.remarks || '',
    };
  };
  const dischargeItemsNormalized = dischargeItems.map(normalizeDischargeItem).filter(Boolean) as any[];
  let dischargeRowsForPdf = dischargeItemsNormalized;
  if (dischargeRowsForPdf.length === 0) {
    const rawDischarge = (prescription as any).discharge_medication_text || (prescription as any).discharge_medication_raw || (prescription as any).dischargeMedication || '';
    const parsed = parsePipeDischarge(rawDischarge);
    if (parsed.length > 0) dischargeRowsForPdf = parsed;
  }
  if (dischargeRowsForPdf.length > 0) {
    checkPage(110);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(49, 46, 129);
    doc.text('DISCHARGE MEDICATIONS', margin, y);
    y += 22;
    const body = dischargeRowsForPdf.map(it => [
      it.medicine_name || it.medicine_master?.medicine_name || it.medicineName || '',
      `${it.dosage || it.dose || ''} ${it.unit || ''}`.trim() || '',
      it.frequency || '',
      it.instruction || it.remarks || '',
    ]);
    autoTable(doc, {
      startY: y,
      head: [['MEDICINE NAME', 'DOSAGE', 'FREQUENCY', 'INSTRUCTION']],
      body,
      styles: tableStyles,
      headStyles,
      alternateRowStyles: { fillColor: [247, 249, 251] },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY ?? y;
    y += 16;
  }

  checkPage(60);
  // Instructions
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(49, 46, 129);
  doc.text("Instructions", margin, y);
  y += 8;
  const advice = prescription.advice || '';
  let instructionRows: string[];
  if (advice) {
    const lines = doc.splitTextToSize(advice, 470).filter(l => l && l.trim().length > 0);
    instructionRows = lines;
  } else {
    instructionRows = [
      'Take medicines after food.',
      'Drink plenty of water.',
      'Take adequate rest.'
    ].filter(l => l && l.trim().length > 0);
  }
  autoTable(doc, {
    startY: y,
    head: [['Instructions']],
    body: instructionRows.map(r => [r]),
    styles: tableStyles,
    headStyles,
    alternateRowStyles: { fillColor: [247, 249, 251] },
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY ?? y;
  y += 16;

  checkPage(80);
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

  checkPage(60);
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
  y += 24;

  checkPage(80);
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(49, 46, 129);
  doc.text("Doctor Signature", margin, y);
  y += 12;
  doc.setTextColor(0,0,0);
  doc.setDrawColor(0,0,0);
  doc.line(margin, y, margin+220, y);
  y += 10;
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(30,30,30);
  doc.text(`Dr. ${doctorName}`, margin, y);

  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  return { url, blob };
}

export async function downloadPrescriptionPdf(prescription: PrescriptionData) {
  const { blob } = await generatePrescriptionPdf(prescription);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Prescription_${prescription.prescription_id || "patient"}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
