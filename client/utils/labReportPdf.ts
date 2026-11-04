/* ============================================================
   LAB REPORT PDF HELPERS

   lab_report.report_file stores a PDF as a data URI
   ("data:application/pdf;filename=generated.pdf;base64,...") or, on
   older rows, raw base64. These helpers turn that text into a Blob URL
   the browser can display/print, and build a PDF from the saved report
   data when the file is missing, truncated or unreadable.
============================================================ */

export interface LabReportPdfParameter {
  name?: string | null;
  value?: string | number | null;
  unit?: string | null;
  referenceRange?: string | null;
  status?: string | null;
  comment?: string | null;
}

export interface LabReportPdfInput {
  reportNumber?: string | null;
  orderId?: string | null;
  generatedAt?: string | Date | null;
  testName?: string | null;
  patientName?: string | null;
  patientAgeGender?: string | null;
  patientMrn?: string | null;
  doctor?: string | null;
  department?: string | null;
  parameters: LabReportPdfParameter[];
  notes?: string | null;
  clinicalCorrelation?: string | null;
  approvedBy?: string | null;
}

export type SplitReportFile =
  | { kind: "url"; url: string }
  | { kind: "base64"; base64: string }
  | { kind: "error"; error: string };

/* Splits report_file into a URL or the base64 payload. Handles the
   "filename=" parameter some saved rows carry before ";base64". */
export const splitReportFile = (value?: string | null): SplitReportFile => {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return { kind: "error", error: "No PDF file is attached to this report." };
  }

  if (/^(https?:|blob:)/i.test(trimmed)) {
    return { kind: "url", url: trimmed };
  }

  if (trimmed.startsWith("data:")) {
    const marker = trimmed.indexOf(";base64,");
    if (marker === -1) {
      return { kind: "error", error: "The saved report file is not a base64 PDF." };
    }
    const header = trimmed.slice(5, marker).toLowerCase();
    if (header && !header.includes("pdf")) {
      return { kind: "error", error: "The saved report file is not a PDF." };
    }
    return { kind: "base64", base64: trimmed.slice(marker + 8) };
  }

  if (!/^[A-Za-z0-9+/=\r\n]+$/.test(trimmed)) {
    return { kind: "error", error: "The saved report file is not a base64 PDF." };
  }

  return { kind: "base64", base64: trimmed };
};

export const base64ToBytes = (base64: string): Uint8Array => {
  const binary = atob(base64.replace(/\s+/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

/* A real PDF starts with %PDF and ends with %%EOF. This catches the
   truncated rows stored in lab_report.report_file. */
export const isProbablyValidPdf = (bytes: Uint8Array): boolean => {
  if (bytes.length < 100) return false;
  const head = String.fromCharCode(...bytes.slice(0, 5));
  if (!head.startsWith("%PDF")) return false;
  const tail = new TextDecoder("latin1").decode(bytes.slice(-4096));
  return tail.includes("%%EOF");
};

/* The display URL for a stored report_file. The caller revokes it. */
export const reportFileToPdfUrl = (
  value?: string | null
): { url?: string; error?: string } => {
  const split = splitReportFile(value);
  if (split.kind === "error") return { error: split.error };
  if (split.kind === "url") return { url: split.url };

  try {
    const bytes = base64ToBytes(split.base64);
    if (!isProbablyValidPdf(bytes)) {
      return { error: "The saved PDF file appears incomplete or invalid." };
    }
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    ) as ArrayBuffer;
    return { url: URL.createObjectURL(new Blob([buffer], { type: "application/pdf" })) };
  } catch {
    return { error: "The saved PDF file could not be read." };
  }
};

const formatDate = (value?: string | Date | null) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
};

const clean = (value?: string | number | null) =>
  value === null || value === undefined ? "" : String(value);

/* Builds a printable PDF from the saved report metadata/parameters. Used
   for reports whose report_file is null or corrupt (older rows). */
export const buildLabReportPdf = async (input: LabReportPdfInput) => {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = ((autoTableModule as any).default ?? autoTableModule) as any;

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = 48;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(29, 78, 216);
  doc.text("Laboratory Report", margin, y);
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const metaLeft = [
    input.reportNumber ? `Report No: ${input.reportNumber}` : "",
    input.orderId ? `Order No: ${input.orderId}` : "",
  ]
    .filter(Boolean)
    .join("   |   ");
  if (metaLeft) doc.text(metaLeft, margin, y);
  if (input.generatedAt) {
    doc.text(`Generated: ${formatDate(input.generatedAt)}`, pageWidth - margin, y, {
      align: "right",
    });
  }
  y += 14;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  autoTable(doc, {
    startY: y,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 2.5, textColor: [30, 41, 59] },
    body: [
      [
        "Patient",
        clean(input.patientName) || "-",
        "Age / Gender",
        clean(input.patientAgeGender) || "-",
      ],
      [
        "Patient ID / MRN",
        clean(input.patientMrn) || "-",
        "Doctor",
        clean(input.doctor) || "-",
      ],
      [
        "Department",
        clean(input.department) || "-",
        "Test",
        clean(input.testName) || "-",
      ],
    ],
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 90 },
      1: { cellWidth: 170 },
      2: { fontStyle: "bold", cellWidth: 90 },
      3: { cellWidth: 170 },
    },
    margin: { left: margin, right: margin },
  });
  y = ((doc as any).lastAutoTable?.finalY ?? y) + 14;

  const parameters = input.parameters.filter(
    (parameter) => clean(parameter.name) || clean(parameter.value)
  );

  autoTable(doc, {
    startY: y,
    head: [["Parameter", "Result", "Unit", "Reference Range", "Status"]],
    body:
      parameters.length > 0
        ? parameters.map((parameter) => [
            clean(parameter.name),
            clean(parameter.value),
            clean(parameter.unit),
            clean(parameter.referenceRange),
            clean(parameter.status),
          ])
        : [["No parameters recorded", "", "", "", ""]],
    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [51, 65, 85],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [250, 251, 252] },
    columnStyles: {
      0: { cellWidth: 170 },
      1: { cellWidth: 65 },
      2: { cellWidth: 55 },
      3: { cellWidth: 120 },
    },
    margin: { left: margin, right: margin },
  });
  y = ((doc as any).lastAutoTable?.finalY ?? y) + 16;

  const writeBlock = (title: string, body?: string | null) => {
    const text = (body ?? "").trim();
    if (!text) return;
    if (y > pageHeight - 100) {
      doc.addPage();
      y = 50;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(29, 78, 216);
    doc.text(title, margin, y);
    y += 13;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(text, pageWidth - margin * 2) as string[];
    doc.text(lines, margin, y);
    y += lines.length * 11 + 10;
  };

  writeBlock("Notes / Remarks", input.notes);
  writeBlock("Clinical Correlation", input.clinicalCorrelation);

  if (y > pageHeight - 80) {
    doc.addPage();
    y = 50;
  }
  doc.setDrawColor(148, 163, 184);
  doc.line(pageWidth - margin - 180, y + 24, pageWidth - margin, y + 24);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    input.approvedBy ? `Approved by: ${input.approvedBy}` : "Laboratory",
    pageWidth - margin,
    y + 36,
    { align: "right" }
  );

  return doc;
};

/* The data-URI form stored in lab_report.report_file. */
export const buildLabReportPdfDataUri = async (input: LabReportPdfInput) => {
  const doc = await buildLabReportPdf(input);
  return doc.output("datauristring");
};

/* Prints a PDF Blob URL from a hidden iframe, falling back to a new tab
   when the browser will not print an embedded PDF. */
export const printPdfUrl = (url: string) => {
  if (!url) return;

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";

  let printed = false;
  const attempt = () => {
    if (printed) return;
    printed = true;
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    setTimeout(() => frame.isConnected && frame.remove(), 60_000);
  };

  frame.onload = () => setTimeout(attempt, 300);
  frame.src = url;
  document.body.appendChild(frame);
  /* Browsers whose PDF viewer never fires load still get a chance. */
  setTimeout(attempt, 1_500);
};
