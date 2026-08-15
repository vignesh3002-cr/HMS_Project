import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface PdfColumn<T> {
  header: string;
  cell: (row: T) => string | number;
}

export interface PdfExportOptions<T> {
  title: string;
  subtitle?: string;
  columns: PdfColumn<T>[];
  rows: T[];
  filename: string;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadExportPdf<T>({
  title,
  subtitle,
  columns,
  rows,
  filename,
}: PdfExportOptions<T>) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  doc.setFontSize(16);
  doc.setTextColor(20, 30, 40);
  doc.text(title, 40, 44);

  if (subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, 40, 60);
  }

  autoTable(doc, {
    startY: subtitle ? 72 : 56,
    head: [columns.map((c) => c.header)],
    body: rows.map((row) => columns.map((c) => String(c.cell(row) ?? ""))),
    styles: { fontSize: 8, cellPadding: 5, textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.5 },
    headStyles: { fillColor: [0, 71, 133], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [247, 249, 251] },
    margin: { left: 40, right: 40 },
  });

  triggerDownload(doc.output("blob"), filename);
}
