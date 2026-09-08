const { jsPDF } = require("jspdf");
const fs = require("fs");
// jsPDF autotable requires some mocking in raw node sometimes, but we can just do basic jsPDF

const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
doc.text("Clinical Note", 40, 40);
doc.text("This is a test PDF generated from the backend script.", 40, 60);

const pdfBytes = doc.output(); // ArrayBuffer or string depending on version
fs.writeFileSync("C:/Users/HP/Desktop/Sample.pdf", Buffer.from(doc.output('arraybuffer')));
