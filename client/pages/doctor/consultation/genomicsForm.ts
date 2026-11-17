import type { GenomicSampleType, GenomicStatus } from "../../../api/genomics.api";
import { formatPickedDate } from "./helpers";

export interface GenomicDraftRow {
  uid: string;
  geneSymbol: string;
  isOtherGene: boolean;
  status: GenomicStatus | "";
  transcriptDetails: string;
}

export interface GenomicDraft {
  sampleType: GenomicSampleType;
  cancerSite: string;
  reportDate: string;
  collectionDate: string;
  labName: string;
  panelName: string;
  remarks: string;
}

export const newDraftRow = (): GenomicDraftRow => ({
  uid: `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  geneSymbol: "",
  isOtherGene: false,
  status: "",
  transcriptDetails: "",
});

/** DD-MM-YYYY -> YYYY-MM-DD, or null when the text is not a real date. */
export function isoFromDmy(value: string): string | null {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** YYYY-MM-DD (API) -> DD-MM-YYYY (date field). */
export function dmyFromIso(value: string | null | undefined): string {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
}

export function todayDmy(): string {
  return formatPickedDate(new Date());
}

/*
 * The EMR diagnosis cancer types and the genomics master's site names are
 * not identical (see Cancer_Type_Master in the genomics workbook). Pre-fill
 * the report from the diagnosis whenever the mapping is unambiguous; the
 * clinician can always change it.
 */
const DIAGNOSIS_SITE_MAP: Record<string, string> = {
  breast: "Breast",
  lung: "Lung",
  colorectal: "Colorectal",
  "gastric / gej": "Gastric",
  gastric: "Gastric",
  esophageal: "Oesophageal",
  oesophageal: "Oesophageal",
  pancreatic: "Pancreatic",
  liver: "Liver",
  "hepatocellular (hcc)": "Liver",
  ovarian: "Ovarian",
  "ovarian (epithelial)": "Ovarian",
  endometrial: "Endometrial",
  cervical: "Cervical",
  prostate: "Prostate",
  bladder: "Bladder",
  "bladder / urothelial": "Bladder",
  kidney: "Kidney",
  "renal (rcc)": "Kidney",
  "head & neck": "Head & Neck",
  "head & neck scc": "Head & Neck",
  thyroid: "Thyroid",
  melanoma: "Skin (Melanoma)",
  cns: "CNS",
  myeloma: "Myeloma",
  "multiple myeloma / plasma cell": "Myeloma",
};

export function diagnosisCancerSite(
  cancerType?: string | null,
  subtype?: string | null,
): string {
  const type = (cancerType ?? "").trim();
  const sub = (subtype ?? "").toLowerCase();
  if (!type) return "";

  const lower = type.toLowerCase();
  if (DIAGNOSIS_SITE_MAP[lower]) return DIAGNOSIS_SITE_MAP[lower];

  if (lower.includes("leuk") || lower.includes("leukaem")) {
    if (sub.includes("all") || sub.includes("lymphoblastic")) return "Leukaemia - ALL";
    if (sub.includes("cll") || sub.includes("lymphocytic")) return "Leukaemia - CLL";
    if (sub.includes("cml") || sub.includes("mpn") || sub.includes("mds")) return "Leukaemia - CML";
    if (sub.includes("aml") || sub.includes("myeloid")) return "Leukaemia - AML";
    return "";
  }

  if (lower.includes("lymphoma")) {
    if (sub.includes("hodgkin")) return "Lymphoma - Hodgkin";
    if (sub.includes("dlbcl") || sub.includes("high-grade") || sub.includes("b-cell"))
      return "Lymphoma - DLBCL";
    if (sub.includes("follicular") || sub.includes("marginal"))
      return "Lymphoma - Follicular";
    return "";
  }

  return "";
}

export interface DraftValidationResult {
  errors: Record<string, string>;
  firstInvalidRow?: string;
}

/**
 * Client-side mirror of the server rules. Field keys are the modal's own
 * ("cancerSite", "row.<uid>.gene", ...) so each message can be shown inline.
 */
export function validateGenomicDraft(
  draft: GenomicDraft,
  rows: GenomicDraftRow[],
  allowedGenes: string[],
): DraftValidationResult {
  const errors: Record<string, string> = {};

  if (!draft.sampleType) errors.sampleType = "Select a sample type";

  if (!draft.cancerSite.trim()) {
    errors.cancerSite = "Select the cancer site";
  }

  const reportIso = isoFromDmy(draft.reportDate);
  if (!draft.reportDate.trim()) {
    errors.reportDate = "Report date is required";
  } else if (!reportIso) {
    errors.reportDate = "Enter a valid date (DD-MM-YYYY)";
  } else if (reportIso > isoFromDmy(todayDmy())!) {
    errors.reportDate = "Report date cannot be in the future";
  }

  if (draft.collectionDate.trim()) {
    const collectionIso = isoFromDmy(draft.collectionDate);
    if (!collectionIso) {
      errors.collectionDate = "Enter a valid date (DD-MM-YYYY)";
    } else if (reportIso && collectionIso > reportIso) {
      errors.collectionDate = "Collection date must be on or before the report date";
    }
  }

  if (draft.remarks.length > 1000) {
    errors.remarks = "Remarks must be 1000 characters or fewer";
  }

  if (rows.length === 0) {
    errors.rows = "Add at least one gene result";
  }

  const allowed = new Set(allowedGenes);
  const seen = new Map<string, string>();
  let firstInvalidRow: string | undefined;

  rows.forEach((row, index) => {
    const key = (field: string) => `row.${row.uid}.${field}`;
    const symbol = row.geneSymbol.trim().toUpperCase();

    if (!symbol) {
      errors[key("gene")] = row.isOtherGene ? "Type the gene symbol" : "Select a gene";
      firstInvalidRow = firstInvalidRow ?? row.uid;
    } else if (!row.isOtherGene && allowed.size > 0 && !allowed.has(symbol)) {
      errors[key("gene")] = `${symbol} is not in this cancer site's gene list`;
      firstInvalidRow = firstInvalidRow ?? row.uid;
    }

    if (symbol) {
      const duplicate = seen.get(symbol);
      if (duplicate) {
        errors[key("gene")] = `${symbol} is already in this report`;
        firstInvalidRow = firstInvalidRow ?? row.uid;
      } else {
        seen.set(symbol, row.uid);
      }
    }

    if (!row.status) {
      errors[key("status")] = "Choose a status";
      firstInvalidRow = firstInvalidRow ?? row.uid;
    }

    if (
      (row.status === "PRESENT" || row.status === "VUS") &&
      !row.transcriptDetails.trim()
    ) {
      errors[key("transcript")] = "Required when status is Present or VUS";
      firstInvalidRow = firstInvalidRow ?? row.uid;
    }

    if (row.transcriptDetails.length > 500) {
      errors[key("transcript")] = "Must be 500 characters or fewer";
      firstInvalidRow = firstInvalidRow ?? row.uid;
    }

    if (!firstInvalidRow && Object.keys(errors).some((k) => k.startsWith(`row.${row.uid}.`))) {
      firstInvalidRow = row.uid;
    }
  });

  return { errors, firstInvalidRow };
}
