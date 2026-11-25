import React from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth";
import type { PatientDocumentItem } from "../../utils/patientDocuments";
import { downloadDocument } from "../../utils/patientDocuments";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/* Shared A4 page style matching Microsoft Word layout */
export const PAGE_BOX_STYLE: React.CSSProperties = {
  width: 794,
  minHeight: 900,
  boxShadow: "0 4px 16px rgba(0,0,0,0.18),0 0 0 1px rgba(0,0,0,0.06)",
  padding: "64px 88px",
  display: "flex",
  flexDirection: "column",
};

export function isImageFile(doc: PatientDocumentItem): boolean {
  if ((doc.type || "").toLowerCase().startsWith("image/")) return true;
  const ext = (doc.name || "").split(".").pop()?.toLowerCase() ?? "";
  return ["jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff"].includes(ext);
}

export function isPdfFile(doc: PatientDocumentItem): boolean {
  if ((doc.type || "").toLowerCase().includes("pdf")) return true;
  return (doc.name || "").toLowerCase().endsWith(".pdf");
}

export function isDocxFile(doc: PatientDocumentItem): boolean {
  const type = (doc.type || "").toLowerCase();
  if (type.includes("wordprocessingml") || type.includes("msword")) return true;
  const ext = (doc.name || "").split(".").pop()?.toLowerCase() ?? "";
  return ["doc", "docx"].includes(ext);
}

/* Image page — one image in A4 Word frame */
export const WordImagePage: React.FC<{ doc: PatientDocumentItem; pageNum: number }> = ({ doc, pageNum }) => {
  const [src, setSrc] = React.useState<string | null>(doc.url ?? null);

  React.useEffect(() => {
    if (!doc.blob) return;
    const u = URL.createObjectURL(doc.blob);
    setSrc(u);
    return () => URL.revokeObjectURL(u);
  }, [doc.blob]);

  const ext = (doc.name || "").split(".").pop()?.toUpperCase() ?? "";
  return (
    <div className="mx-auto bg-white" style={PAGE_BOX_STYLE}>
      <div style={{ borderLeft: "4px solid #2B579A", paddingLeft: 14, marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#2B579A", marginBottom: 3, lineHeight: 1.3 }}>{doc.name}</h2>
        <p style={{ fontSize: 11, color: "#94A3B8", margin: 0 }}>{ext}&nbsp;·&nbsp;{doc.info ?? ""}&nbsp;·&nbsp;Page {pageNum}</p>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {src
          ? <img src={src} alt={doc.name} style={{ maxWidth: "100%", maxHeight: 580, objectFit: "contain" }} />
          : <span style={{ color: "#94A3B8", fontSize: 13 }}><i className="fa-solid fa-spinner fa-spin mr-1" />Loading…</span>}
      </div>
    </div>
  );
};

/* PDF pages — renders each PDF page as a canvas image in its own A4 Word frame */
export const WordPdfContent: React.FC<{ doc: PatientDocumentItem }> = ({ doc }) => {
  const [pages, setPages] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let blobUrl: string | null = null;
    const renderPdf = async (src: string) => {
      try {
        const pdfDoc = await pdfjsLib.getDocument({ url: src }).promise;
        const imgs: string[] = [];
        for (let p = 1; p <= pdfDoc.numPages; p++) {
          const page = await pdfDoc.getPage(p);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext("2d")!, canvas, viewport }).promise;
          imgs.push(canvas.toDataURL("image/jpeg", 0.9));
        }
        setPages(imgs);
      } catch (err) {
        console.error("PDF render error:", err);
        setError("Could not render this PDF.");
      } finally {
        setLoading(false);
      }
    };
    if (doc.blob) {
      blobUrl = URL.createObjectURL(doc.blob);
      renderPdf(blobUrl);
    } else if (doc.url) {
      renderPdf(doc.url);
    } else {
      setError("No source available.");
      setLoading(false);
    }
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [doc]);

  if (loading) {
    return (
      <div className="mx-auto bg-white" style={{ ...PAGE_BOX_STYLE, alignItems: "center", justifyContent: "center" }}>
        <i className="fa-solid fa-spinner fa-spin text-2xl text-blue-500" />
        <p style={{ color: "#94A3B8", marginTop: 12, fontSize: 13 }}>Rendering document pages…</p>
      </div>
    );
  }
  if (error || pages.length === 0) {
    return (
      <div className="mx-auto bg-white" style={{ ...PAGE_BOX_STYLE, alignItems: "center", justifyContent: "center" }}>
        <i className="fa-solid fa-file-pdf" style={{ fontSize: 48, color: "#EF4444" }} />
        <p style={{ color: "#64748B", marginTop: 12, fontSize: 14, fontWeight: 600 }}>{doc.name}</p>
        <p style={{ color: "#94A3B8", fontSize: 12 }}>{error ?? "No pages to display."}</p>
        {doc.url && (
          <button
            type="button"
            onClick={() => downloadDocument(doc)}
            className="mt-4 rounded-md bg-[#2B579A] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
          >
            Download File
          </button>
        )}
      </div>
    );
  }
  return (
    <>
      {pages.map((imgSrc, i) => (
        <div key={i} className="mx-auto bg-white" style={PAGE_BOX_STYLE}>
          <div style={{ borderLeft: "4px solid #2B579A", paddingLeft: 14, marginBottom: 28 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#2B579A", marginBottom: 3, lineHeight: 1.3 }}>{doc.name}</h2>
            <p style={{ fontSize: 11, color: "#94A3B8", margin: 0 }}>PDF&nbsp;·&nbsp;Page {i + 1} of {pages.length}</p>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
            <img src={imgSrc} alt={`${doc.name} – page ${i + 1}`} style={{ maxWidth: "100%", objectFit: "contain" }} />
          </div>
        </div>
      ))}
    </>
  );
};

/* DOCX page — converts .doc/.docx to HTML with mammoth, shown in A4 Word frame */
export const WordDocxContent: React.FC<{ doc: PatientDocumentItem; pageNum: number }> = ({ doc, pageNum }) => {
  const [html, setHtml] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const convert = async (buf: ArrayBuffer) => {
      try {
        const result = await mammoth.convertToHtml({ arrayBuffer: buf });
        setHtml(result.value);
      } catch (err) {
        console.error("DOCX render error:", err);
        setError("Could not render this document.");
      } finally {
        setLoading(false);
      }
    };
    if (doc.blob) {
      doc.blob.arrayBuffer().then(convert);
    } else if (doc.url) {
      fetch(doc.url)
        .then((r) => r.arrayBuffer())
        .then(convert)
        .catch(() => {
          setError("Could not load document.");
          setLoading(false);
        });
    } else {
      setError("No source available.");
      setLoading(false);
    }
  }, [doc]);

  const ext = (doc.name || "").split(".").pop()?.toUpperCase() ?? "";
  return (
    <div className="mx-auto bg-white" style={PAGE_BOX_STYLE}>
      <div style={{ borderLeft: "4px solid #2B579A", paddingLeft: 14, marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#2B579A", marginBottom: 3, lineHeight: 1.3 }}>{doc.name}</h2>
        <p style={{ fontSize: 11, color: "#94A3B8", margin: 0 }}>{ext}&nbsp;·&nbsp;{doc.info ?? ""}&nbsp;·&nbsp;Page {pageNum}</p>
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#94A3B8", padding: 24 }}>
            <i className="fa-solid fa-spinner fa-spin" />
            <span style={{ fontSize: 13 }}>Loading document…</span>
          </div>
        )}
        {!loading && error && (
          <div style={{ textAlign: "center", color: "#94A3B8", padding: 40 }}>
            <i className="fa-solid fa-file-word" style={{ fontSize: 48, color: "#CBD5E1", display: "block", marginBottom: 12 }} />
            <p style={{ fontSize: 13, margin: 0 }}>{error}</p>
          </div>
        )}
        {!loading && html && (
          <div
            style={{ fontFamily: "Calibri,'Times New Roman',serif", fontSize: 13, lineHeight: 1.7, color: "#1E293B" }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
        {!loading && !error && !html && (
          <div style={{ textAlign: "center", color: "#94A3B8", padding: 40 }}>
            <i className="fa-solid fa-file-word" style={{ fontSize: 48, color: "#CBD5E1", display: "block", marginBottom: 12 }} />
            <p style={{ fontSize: 13, margin: 0 }}>Document is empty.</p>
          </div>
        )}
      </div>
    </div>
  );
};

/* Full-screen Word view — matching Doctor module Notes & Documents exactly */
export const WordImagesViewModal: React.FC<{
  documents: PatientDocumentItem[];
  label?: string;
  onClose: () => void;
  onDownload?: (doc: PatientDocumentItem) => void;
}> = ({ documents, label, onClose, onDownload }) => {
  const docs = documents;
  if (docs.length === 0) return null;
  const title = label || (docs.length === 1 ? docs[0].name : `Documents (${docs.length} files)`);

  const handleDownloadSingle = (doc: PatientDocumentItem) => {
    if (onDownload) {
      onDownload(doc);
    } else {
      downloadDocument(doc);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={{ fontFamily: "Calibri,'Segoe UI',Arial,sans-serif" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Word title bar */}
        <div className="flex flex-shrink-0 items-center justify-between gap-3 px-4 py-2.5" style={{ background: "#2B579A" }}>
          <div className="flex min-w-0 items-center gap-2">
            <i className="fa-solid fa-file-pdf flex-shrink-0 text-xs text-white" />
            <span className="truncate text-xs font-bold text-white">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            {docs.length === 1 && (
              <button
                type="button"
                onClick={() => handleDownloadSingle(docs[0])}
                className="inline-flex items-center gap-1.5 rounded bg-white/15 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/25"
                title="Download original document"
              >
                <i className="fa-solid fa-download text-[10px]" />
                <span>Download</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              title="Close"
              className="rounded px-2 py-1 text-white/70 hover:bg-white/20 hover:text-white"
            >
              <i className="fa-solid fa-xmark text-sm" />
            </button>
          </div>
        </div>

        {/* Ribbon */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-[#f3f3f3] px-4 py-1.5 text-xs text-slate-500">
          <span className="select-none font-medium">
            {docs.length} page{docs.length !== 1 ? "s" : ""} · 1 file per page
          </span>
          {docs.length > 0 && (
            <span className="select-none text-[11px] text-slate-400">
              {docs[0].info}
            </span>
          )}
        </div>

        {/* Scrollable pages */}
        <div className="flex-1 overflow-y-auto" style={{ background: "#e8e9ea", padding: "24px 16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {docs.map((doc, i) => {
              if (isPdfFile(doc)) return <WordPdfContent key={doc.id} doc={doc} />;
              if (isDocxFile(doc)) return <WordDocxContent key={doc.id} doc={doc} pageNum={i + 1} />;
              return <WordImagePage key={doc.id} doc={doc} pageNum={i + 1} />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordImagesViewModal;
