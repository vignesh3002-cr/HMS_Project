/**
 * Patient Documents Utility & IndexedDB Storage Engine
 * Manages clinical documents uploaded per patient (PDFs, images, lab reports, etc.)
 * Provides persistent offline/local storage via IndexedDB with automatic fallback.
 */

export interface PatientDocumentItem {
  id: string;
  patientId: string;
  name: string;
  size: number;
  type: string;
  url: string; // Active blob object URL
  uploadDate: string; // Formatted date string, e.g. "16 Sep 2026, 03:30 PM"
  info: string; // Display summary, e.g. "PDF • 1.2 MB • 16 Sep 2026"
  icon: string; // FontAwesome icon class
  color: string; // Tailwind text color class
  hover: string; // Tailwind border hover class
  blob?: Blob;
}

interface StoredDocumentRecord {
  id: string;
  patientId: string;
  name: string;
  size: number;
  type: string;
  uploadDate: string;
  blob: Blob;
}

const DB_NAME = "HMS_PatientDocumentsDB";
const STORE_NAME = "documents";
const DB_VERSION = 1;

/**
 * Format raw byte size into human readable string (B, KB, MB)
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Resolve icon class and styling based on file extension and MIME type
 */
export function getDocumentIconAndColors(
  fileName: string,
  mimeType: string = ""
): {
  icon: string;
  color: string;
  hover: string;
} {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const lowerMime = mimeType.toLowerCase();

  if (ext === "pdf" || lowerMime.includes("pdf")) {
    return {
      icon: "fa-file-pdf",
      color: "text-red-500",
      hover: "hover:border-red-300",
    };
  }

  if (
    ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext) ||
    lowerMime.startsWith("image/")
  ) {
    return {
      icon: "fa-file-image",
      color: "text-emerald-500",
      hover: "hover:border-emerald-300",
    };
  }

  if (
    ["doc", "docx"].includes(ext) ||
    lowerMime.includes("word") ||
    lowerMime.includes("document")
  ) {
    return {
      icon: "fa-file-word",
      color: "text-blue-600",
      hover: "hover:border-blue-300",
    };
  }

  if (
    ["xls", "xlsx", "csv"].includes(ext) ||
    lowerMime.includes("sheet") ||
    lowerMime.includes("csv")
  ) {
    return {
      icon: "fa-file-excel",
      color: "text-green-600",
      hover: "hover:border-green-300",
    };
  }

  if (["txt", "rtf", "log"].includes(ext) || lowerMime.startsWith("text/")) {
    return {
      icon: "fa-file-lines",
      color: "text-slate-600",
      hover: "hover:border-slate-300",
    };
  }

  return {
    icon: "fa-file-lines",
    color: "text-indigo-500",
    hover: "hover:border-indigo-300",
  };
}

/**
 * Open IndexedDB database connection
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not supported in this environment"));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("patientId", "patientId", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB"));
  });
}

/**
 * Load all documents stored for a specific patient
 */
export async function loadPatientDocuments(
  patientId: string
): Promise<PatientDocumentItem[]> {
  if (!patientId) return [];

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index("patientId");
      const request = index.getAll(patientId);

      request.onsuccess = () => {
        const records: StoredDocumentRecord[] = request.result || [];
        // Map stored records into PatientDocumentItems with live Object URLs
        const items: PatientDocumentItem[] = records.map((rec) => {
          const { icon, color, hover } = getDocumentIconAndColors(rec.name, rec.type);
          const ext = rec.name.split(".").pop()?.toUpperCase() || "FILE";
          const formattedSize = formatFileSize(rec.size);
          const dateOnly = rec.uploadDate.split(",")[0] || rec.uploadDate;
          const url = URL.createObjectURL(rec.blob);

          return {
            id: rec.id,
            patientId: rec.patientId,
            name: rec.name,
            size: rec.size,
            type: rec.type,
            url,
            uploadDate: rec.uploadDate,
            info: `${ext} • ${formattedSize} • ${dateOnly}`,
            icon,
            color,
            hover,
            blob: rec.blob,
          };
        });

        // Sort latest first
        items.sort((a, b) => b.id.localeCompare(a.id));
        resolve(items);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("IndexedDB loadPatientDocuments fallback:", err);
    return [];
  }
}

/**
 * Save an uploaded file for a patient into IndexedDB
 */
export async function savePatientDocument(
  patientId: string,
  file: File
): Promise<PatientDocumentItem> {
  const id = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date();
  const uploadDate = now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }) + ", " + now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const storedRecord: StoredDocumentRecord = {
    id,
    patientId,
    name: file.name,
    size: file.size,
    type: file.type || "application/octet-stream",
    uploadDate,
    blob: file,
  };

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(storedRecord);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("Could not write document to IndexedDB:", err);
  }

  const { icon, color, hover } = getDocumentIconAndColors(file.name, file.type);
  const ext = file.name.split(".").pop()?.toUpperCase() || "FILE";
  const formattedSize = formatFileSize(file.size);
  const dateOnly = uploadDate.split(",")[0] || uploadDate;
  const url = URL.createObjectURL(file);

  return {
    id,
    patientId,
    name: file.name,
    size: file.size,
    type: file.type || "application/octet-stream",
    url,
    uploadDate,
    info: `${ext} • ${formattedSize} • ${dateOnly}`,
    icon,
    color,
    hover,
    blob: file,
  };
}

/**
 * Delete a document from IndexedDB by its ID
 */
export async function deletePatientDocument(id: string): Promise<void> {
  if (!id) return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("Could not delete document from IndexedDB:", err);
  }
}

/**
 * Trigger immediate browser download of a document
 */
export function downloadDocument(doc: PatientDocumentItem): void {
  if (!doc.url) return;
  const a = document.createElement("a");
  a.href = doc.url;
  a.download = doc.name || "document";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Download all documents sequentially
 */
export function downloadAllDocuments(docs: PatientDocumentItem[]): void {
  if (!docs || docs.length === 0) return;
  docs.forEach((doc, idx) => {
    setTimeout(() => {
      downloadDocument(doc);
    }, idx * 300);
  });
}

