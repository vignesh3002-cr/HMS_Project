const { jsPDF } = require("jspdf");
require("jspdf-autotable");
const fs = require("fs");

const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
const margin = 40;
let y = 40;

const addSection = (title, content) => {
  const textToPrint = content ? content.trim() : "Not recorded";
  if (y > 750) { doc.addPage(); y = 40; }
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

doc.setFontSize(18);
doc.text("Clinical Note", margin, y);
y += 24;

doc.setFontSize(10);
doc.text(`Patient: John Doe (PID-101)`, margin, y);
doc.text(`Date: 01-09-2026`, margin + 300, y);
y += 14;
doc.text(`Doctor: Dr. Smith`, margin, y);
y += 24;

addSection("Chief complaint / reason for visit", "Fever and cough for 3 days");
addSection("Symptoms and medical history", "No known allergies. History of asthma.");
addSection("Doctor's examination findings", "Patient looks fatigued. Throat is red.");
addSection("Diagnosis", "Viral Fever");
addSection("Treatment plan", "Rest, hydration, and antipyretics");
addSection("Prescription details", "1. Paracetamol 500mg - 1-0-1\n2. Cough Syrup - 10ml TDS");
addSection("Follow-up instructions", "Review after 3 days if fever persists");
addSection("Progress notes", "Patient is stable.");

doc.setFontSize(12);
doc.setTextColor(0, 71, 133);
doc.setFont(undefined, "bold");
doc.text("Vital observations or clinical observations", margin, y);
y += 14;

doc.autoTable({
  startY: y,
  body: [
    ["Temperature", "99.5 \xB0F", "Blood Sugar", "110"],
    ["Pulse", "85 bpm", "Resp. Rate", "18 /min"],
    ["Blood Pressure", "120/80 mmHg", "SpO2", "98 %"]
  ],
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

fs.writeFileSync("C:/Users/HP/Desktop/Sample_Clinical_Note.pdf", Buffer.from(doc.output('arraybuffer')));
