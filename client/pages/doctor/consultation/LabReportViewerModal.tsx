import { useEffect, useRef, useState } from "react";
import {
  Download,
  ExternalLink,
  FileWarning,
  Loader2,
  Printer,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  labReportApi,
  parseReportComment,
  type LabOrderItemReportRecord,
} from "@/api/labReport.api";
import type { LabOrderItemRecord } from "@/api/labOrder.api";
import {
  buildLabReportPdf,
  printPdfUrl,
  reportFileToPdfUrl,
} from "@/utils/labReportPdf";

/* ============================================================
   LAB REPORT VIEWER

   Opens from Lab Review > View Report. The stored PDF
   (lab_report.report_file, a data URI) is decoded to a Blob URL and
   shown in an iframe with Print/Download. When the stored file is
   missing or truncated, a PDF is generated from the report's saved
   parameters instead.
============================================================ */

export interface LabReportViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: LabOrderItemRecord | null;
}

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isRevocable = (url: string) => url.startsWith("blob:");

const safeFileName = (value: string) =>
  value.replace(/[^\w.-]+/g, "_").replace(/^_+|_+$/g, "") || "lab-report";

export default function LabReportViewerModal({
  open,
  onOpenChange,
  item,
}: LabReportViewerModalProps) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [pdfNotice, setPdfNotice] = useState("");
  const [data, setData] = useState<LabOrderItemReportRecord | null>(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const urlRef = useRef("");

  const replacePdfUrl = (next: string) => {
    if (urlRef.current && urlRef.current !== next && isRevocable(urlRef.current)) {
      URL.revokeObjectURL(urlRef.current);
    }
    urlRef.current = next;
    setPdfUrl(next);
  };

  useEffect(() => {
    if (!open || !item) {
      if (urlRef.current && isRevocable(urlRef.current)) {
        URL.revokeObjectURL(urlRef.current);
      }
      urlRef.current = "";
      setPdfUrl("");
      setData(null);
      setError("");
      setPdfNotice("");
      setLoading(false);
      setGenerating(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    setPdfNotice("");
    setData(null);
    replacePdfUrl("");

    const load = async () => {
      try {
        const response = await labReportApi.getByOrderItem(item.lab_order_item_id);
        if (cancelled) return;
        const payload = response.data.data;
        setData(payload);

        if (!payload.report) {
          setError("No report has been generated for this test yet.");
          return;
        }

        const stored = reportFileToPdfUrl(payload.report.report_file);
        if (stored.url) {
          replacePdfUrl(stored.url);
          return;
        }

        setPdfNotice(stored.error ?? "No PDF file is attached to this report.");
        setLoading(false);
        setGenerating(true);

        const comment = parseReportComment(payload.report.report_comment);
        const ageGender = [
          payload.patient?.gender,
          payload.patient?.age != null ? `${payload.patient.age} Yrs` : "",
        ]
          .filter(Boolean)
          .join(" | ");
        const approver = payload.report.employees
          ? `Dr. ${payload.report.employees.first_name ?? ""} ${
              payload.report.employees.last_name ?? ""
            }`.trim()
          : "";

        const doc = await buildLabReportPdf({
          reportNumber: payload.report.report_number,
          orderId: payload.order?.lab_order_id,
          generatedAt:
            payload.report.generated_datetime ?? payload.report.created_at,
          testName: payload.item?.lab_test_master?.test_name,
          patientName: payload.patient?.name,
          patientAgeGender: ageGender,
          patientMrn: payload.patient?.mrn_no ?? payload.patient?.patient_id,
          doctor: payload.order?.doctor,
          department: payload.order?.department,
          parameters: payload.parameters ?? [],
          notes: comment.meta?.text ?? comment.text,
          clinicalCorrelation: comment.meta?.clinicalCorrelation,
          approvedBy: approver,
        });

        if (cancelled) return;
        replacePdfUrl(URL.createObjectURL(doc.output("blob")));
      } catch (loadError: any) {
        if (cancelled) return;
        setError(
          loadError?.response?.data?.message ||
            loadError?.message ||
            "Failed to load this report."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
          setGenerating(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.lab_order_item_id]);

  useEffect(
    () => () => {
      if (urlRef.current && isRevocable(urlRef.current)) {
        URL.revokeObjectURL(urlRef.current);
      }
      urlRef.current = "";
    },
    []
  );

  const testName =
    data?.item?.lab_test_master?.test_name ??
    item?.lab_test_master?.test_name ??
    "Lab Report";
  const reportNumber = data?.report?.report_number ?? "";
  const downloadName = safeFileName(
    `${reportNumber || testName}-${item?.lab_order_item_id ?? ""}`
  );

  const handlePrint = () => {
    if (!pdfUrl) return;
    printPdfUrl(pdfUrl);
  };

  const handleOpenInNewTab = () => {
    if (!pdfUrl) return;
    window.open(pdfUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[1100px] gap-0 overflow-hidden p-0 font-[Manrope,sans-serif]">
        <DialogHeader className="space-y-0 border-b border-[#E5E7EB] bg-white px-6 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div className="min-w-0">
              <DialogTitle className="truncate text-base font-bold tracking-tight text-[#191C1E]">
                {testName}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-[11px] text-[#6B7280]">
                {reportNumber ? `Report ${reportNumber}` : "Laboratory report"}
                {data?.order?.lab_order_id
                  ? ` · Order ${data.order.lab_order_id}`
                  : ""}
                {data?.report?.generated_datetime
                  ? ` · ${formatDateTime(data.report.generated_datetime)}`
                  : ""}
              </DialogDescription>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                disabled={!pdfUrl || loading || generating}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#00488D] px-3 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-[#003A6B] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                <Printer className="h-3.5 w-3.5" />
                Print
              </button>

              <a
                href={pdfUrl || undefined}
                download={`${downloadName}.pdf`}
                aria-disabled={!pdfUrl}
                onClick={(event) => {
                  if (!pdfUrl) event.preventDefault();
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-semibold transition-colors ${
                  pdfUrl
                    ? "border-[#00488D] text-[#00488D] hover:bg-[#F0F5FF]"
                    : "pointer-events-none border-slate-200 text-slate-400"
                }`}
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </a>

              <button
                type="button"
                onClick={handleOpenInNewTab}
                disabled={!pdfUrl}
                title="Open the PDF in a new tab"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#D8DEE6] text-[#4B5563] transition-colors hover:bg-[#F2F4F6] disabled:cursor-not-allowed disabled:text-slate-300"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {data && (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-[#6B7280]">
              {data.patient?.name && <span>Patient: {data.patient.name}</span>}
              {data.patient?.patient_id && (
                <span>Patient ID: {data.patient.patient_id}</span>
              )}
              {data.order?.doctor && <span>{data.order.doctor}</span>}
              {data.report?.report_status && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  {data.report.report_status}
                </span>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="max-h-[76vh] overflow-y-auto bg-[#FBFCFD] p-4">
          {pdfNotice && !error && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {pdfNotice} A PDF was generated from the report&apos;s saved
                parameters so it can still be viewed and printed.
              </span>
            </div>
          )}

          {error && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
              {error}
            </div>
          )}

          {(loading || generating) && (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-[11px] text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin text-[#00488D]" />
              <span>
                {loading
                  ? "Loading the report…"
                  : "Generating a PDF from the saved report data…"}
              </span>
            </div>
          )}

          {!loading && !generating && pdfUrl && (
            <iframe
              key={pdfUrl}
              src={pdfUrl}
              title={`${testName} report PDF`}
              className="h-[66vh] min-h-[420px] w-full rounded-lg border border-[#E5E7EB] bg-white"
            />
          )}

          {!loading && !generating && !pdfUrl && !error && (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 text-[11px] text-slate-500">
              <FileWarning className="h-6 w-6 text-slate-400" />
              <span>No preview is available for this report.</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
