import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

/* A signed consent form is uploaded to the patient document store
   (document_type = CONSENT_FORM). These helpers keep the file validation and
   PDF rasterization in one place so the Summary print flow can embed an
   uploaded PDF/image in place of the generated consent pages. */

export const CONSENT_FORM_MAX_BYTES = 10 * 1024 * 1024;

export const CONSENT_FORM_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg";

/* Safety cap: a consent form is normally 1-3 pages. Anything beyond this is
   almost certainly the wrong file and would make the printout huge. */
const CONSENT_FORM_MAX_PDF_PAGES = 10;

const CONSENT_FORM_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
];

/** True for the file types the backend can store and jsPDF can render. */
export function isSupportedConsentFormFile(file: File): boolean {
  if (file.type) return CONSENT_FORM_MIME_TYPES.includes(file.type);
  return /\.(pdf|png|jpe?g)$/i.test(file.name);
}

/** Detect a PDF from the stored mime type, falling back to the file name. */
export function isPdfConsentForm(
  fileName: string,
  fileType?: string | null
): boolean {
  return /pdf/i.test(fileType || "") || /\.pdf$/i.test(fileName || "");
}

/** Read a blob (document download response) as a data URL. */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Could not read the consent form"));
    reader.readAsDataURL(blob);
  });
}

/** Decode the base64 payload of a data URL into bytes for pdf.js. */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

/**
 * Render each page of an uploaded PDF consent form to a JPEG data URL so
 * jsPDF can place it as a full-page image. jsPDF cannot import another PDF's
 * pages directly, so this is the bridge for scanned/signed PDF forms.
 */
export async function renderPdfPagesToDataUrls(
  dataUrl: string
): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const pdf = await pdfjs.getDocument({ data: dataUrlToBytes(dataUrl) }).promise;
  const pageCount = Math.min(pdf.numPages, CONSENT_FORM_MAX_PDF_PAGES);
  const images: string[] = [];

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) continue;
    await page.render({ canvasContext: context, canvas, viewport }).promise;
    images.push(canvas.toDataURL("image/jpeg", 0.92));
    page.cleanup();
    canvas.width = 0;
    canvas.height = 0;
  }

  return images;
}

/** Natural pixel size of an image data URL (used to preserve aspect ratio). */
export function imageSizeOf(
  dataUrl: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () =>
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Could not read the consent form image"));
    image.src = dataUrl;
  });
}
