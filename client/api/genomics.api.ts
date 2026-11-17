import API from "./axios";
import { getToken, getUser } from "../utils/token";

export type GenomicSampleType = "LIQUID_BIOPSY" | "TISSUE" | "GERMLINE";
export type GenomicScope = "SOMATIC" | "GERMLINE";
export type GenomicStatus = "PRESENT" | "ABSENT" | "VUS";

export const SAMPLE_TYPE_OPTIONS: { value: GenomicSampleType; label: string }[] = [
  { value: "LIQUID_BIOPSY", label: "Liquid biopsy" },
  { value: "TISSUE", label: "Tissue" },
  { value: "GERMLINE", label: "Germline" },
];

export const STATUS_OPTIONS: { value: GenomicStatus; label: string; hint: string }[] = [
  {
    value: "PRESENT",
    label: "Present",
    hint: "Pathogenic or likely pathogenic alteration detected",
  },
  {
    value: "ABSENT",
    label: "Absent",
    hint: "Gene tested, no alteration found",
  },
  {
    value: "VUS",
    label: "VUS",
    hint: "Variant of uncertain significance",
  },
];

export const sampleTypeLabel = (value: string | null | undefined) =>
  SAMPLE_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value ?? "";

export const statusLabel = (value: string | null | undefined) =>
  STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value ?? "";

export interface GenomicResultRecord {
  result_id: string;
  test_id: string;
  gene_symbol: string;
  is_other_gene: boolean;
  status: GenomicStatus;
  transcript_details: string | null;
}

export interface GenomicTestRecord {
  test_id: string;
  patient_id: string;
  encounter_no: string | null;
  staging_detail_id: string | null;
  branch_id: string | null;
  sample_type: GenomicSampleType;
  cancer_site: string;
  report_date: string;
  collection_date: string | null;
  lab_name: string | null;
  panel_name: string | null;
  report_document_id: string | null;
  remarks: string | null;
  is_deleted: boolean;
  delete_reason: string | null;
  created_by: string;
  created_at: string;
  updated_by: string | null;
  updated_at: string | null;
  genomic_result: GenomicResultRecord[];
}

export interface GenomicResultInput {
  geneSymbol: string;
  isOtherGene: boolean;
  status: GenomicStatus;
  transcriptDetails: string | null;
}

export interface GenomicTestInput {
  sampleType: GenomicSampleType;
  cancerSite: string;
  reportDate: string;
  collectionDate?: string | null;
  labName?: string | null;
  panelName?: string | null;
  reportDocumentId?: string | null;
  remarks?: string | null;
  results: GenomicResultInput[];
  encounterNo?: string | null;
  stagingDetailId?: string | null;
}

export interface GeneMasterRecord {
  gene_master_id: string;
  cancer_site: string;
  scope: GenomicScope;
  gene_symbol: string;
  sort_order: number;
  active: boolean;
  source: string | null;
  spec_site: string | null;
}

export interface KeyAlteration {
  gene_symbol: string;
  status: GenomicStatus;
  sample_type: GenomicSampleType;
  report_date: string;
  test_id: string;
  cancer_site: string;
}

export interface GenomicFieldError {
  field: string;
  message: string;
}

export const MAX_REPORT_FILE_BYTES = 10 * 1024 * 1024;

const unwrap = <T>(response: { data: { success: boolean; data: T } }): T => response.data.data;

export const genomicsApi = {
  cancerSites: () =>
    API.get<{ success: boolean; data: string[] }>("/genomics/cancer-sites").then(unwrap),

  genes: (site: string, sampleType: GenomicSampleType) =>
    API.get<{
      success: boolean;
      data: { site: string; scope: GenomicScope; genes: string[]; allowOther: boolean };
    }>("/genomics/genes", { params: { site, sampleType } }).then(unwrap),

  labs: (patientId: string) =>
    API.get<{ success: boolean; data: string[] }>("/genomics/labs", {
      params: { patientId },
    }).then(unwrap),

  keyAlterations: (patientId: string) =>
    API.get<{ success: boolean; data: KeyAlteration[] }>("/genomics/key-alterations", {
      params: { patientId },
    }).then(unwrap),

  listTests: (patientId: string) =>
    API.get<{ success: boolean; data: GenomicTestRecord[] }>(
      `/genomics/patients/${encodeURIComponent(patientId)}/tests`,
    ).then(unwrap),

  getTest: (testId: string) =>
    API.get<{ success: boolean; data: GenomicTestRecord }>(
      `/genomics/tests/${encodeURIComponent(testId)}`,
    ).then(unwrap),

  createTest: (patientId: string, payload: GenomicTestInput) =>
    API.post<{ success: boolean; data: GenomicTestRecord }>(
      `/genomics/patients/${encodeURIComponent(patientId)}/tests`,
      payload,
    ).then(unwrap),

  updateTest: (testId: string, payload: GenomicTestInput) =>
    API.put<{ success: boolean; data: GenomicTestRecord }>(
      `/genomics/tests/${encodeURIComponent(testId)}`,
      payload,
    ).then(unwrap),

  deleteTest: (testId: string, reason: string) =>
    API.delete<{ success: boolean; data: { test_id: string; deleted: boolean } }>(
      `/genomics/tests/${encodeURIComponent(testId)}`,
      { data: { reason } },
    ).then(unwrap),

  geneMaster: (filters?: { site?: string; scope?: string }) =>
    API.get<{ success: boolean; data: GeneMasterRecord[] }>("/genomics/gene-master", {
      params: filters,
    }).then(unwrap),

  createGene: (payload: {
    cancerSite: string;
    scope: GenomicScope;
    geneSymbol: string;
    sortOrder?: number;
  }) =>
    API.post<{ success: boolean; data: GeneMasterRecord }>("/genomics/gene-master", payload).then(
      unwrap,
    ),

  updateGene: (
    geneMasterId: string,
    payload: {
      geneSymbol?: string;
      cancerSite?: string;
      scope?: GenomicScope;
      sortOrder?: number;
      active?: boolean;
    },
  ) =>
    API.put<{ success: boolean; data: GeneMasterRecord }>(
      `/genomics/gene-master/${encodeURIComponent(geneMasterId)}`,
      payload,
    ).then(unwrap),

  deleteGene: (geneMasterId: string) =>
    API.delete<{ success: boolean; data: { gene_master_id: string; deleted: boolean } }>(
      `/genomics/gene-master/${encodeURIComponent(geneMasterId)}`,
    ).then(unwrap),
};

/** Reads a file as bare base64 (no data: prefix) for the document upload API. */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? result.slice(result.indexOf(",") + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads the NGS report file to the existing patient_document store as
 * document_type = LAB_REPORT and returns its document_id. Unlike the shared
 * document-library helper this does not fall back to a local-only record:
 * the report must have a real server id to link to.
 */
export async function uploadGenomicReportFile(
  patientId: string,
  file: File,
  encounterNo?: string | null,
): Promise<string> {
  if (file.size > MAX_REPORT_FILE_BYTES) {
    throw new Error("The report file must be 10 MB or smaller.");
  }

  const base64 = await fileToBase64(file);
  // Same attribution the document library uses, so the LAB_REPORT row shows
  // who uploaded it instead of the backend's "Doctor" fallback.
  const currentUser = getUser();
  const uploadedBy =
    currentUser?.name || currentUser?.username || currentUser?.role || "Doctor";

  const response = await API.post<{
    success: boolean;
    data: { document_id: string; id?: string };
    message?: string;
  }>("/patient-documents/upload", {
    patient_id: patientId,
    file_name: file.name,
    original_name: file.name,
    file_type: file.type || "application/octet-stream",
    file_size: file.size,
    file_data: base64,
    category: "Clinical",
    uploaded_by: uploadedBy,
    encounter_no: encounterNo ?? undefined,
    document_type: "LAB_REPORT",
  });

  const documentId = response.data?.data?.document_id || response.data?.data?.id;
  if (!documentId) {
    throw new Error(response.data?.message || "The report file could not be saved.");
  }
  return documentId;
}

/** Stream URL for a stored document (browser opens it inline). */
export function genomicReportFileUrl(documentId: string): string {
  const base =
    (import.meta as any).env?.VITE_BACKEND_URL ||
    (import.meta as any).env?.VITE_BACKEND_URL_PROD ||
    "/api";
  const token = getToken();
  const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${base}/patient-documents/${encodeURIComponent(documentId)}/view${tokenQuery}`;
}
