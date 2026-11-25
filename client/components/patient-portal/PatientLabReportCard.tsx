import React, { useState } from "react";
import { PatientLabOrder, LabOrderItem } from "@/api/patientPortal.api";
import {
  Download,
  CheckCircle2,
  Clock4,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Eye,
  AlertCircle,
  Loader2,
  Barcode,
} from "lucide-react";
import {
  reportFileToPdfUrl,
  downloadLabReportPdf,
  buildLabReportPdf,
} from "@/utils/labReportPdf";
import { labReportApi, parseReportComment } from "@/api/labReport.api";
import { getUser } from "@/utils/token";
import LabReportViewerModal from "@/pages/doctor/consultation/LabReportViewerModal";

interface PatientLabReportCardProps {
  order: PatientLabOrder;
  compact?: boolean;
}

export const PatientLabReportCard: React.FC<PatientLabReportCardProps> = ({
  order,
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [downloadingItemId, setDownloadingItemId] = useState<string | null>(null);

  const user = getUser();
  const patientName = user?.patient_name || user?.name || "Patient";
  const patientId = user?.patient_id || user?.patient_uhid || "UHID";

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const doctorName = order.employees
    ? `Dr. ${order.employees.first_name || ""} ${order.employees.last_name || ""}`.trim()
    : "Physician";

  const items = order.lab_order_item || [];
  const orderReports = order.lab_report || [];

  // Helper to test if a specific test has its own generated/completed report
  const isTestReady = (item: LabOrderItem): boolean => {
    if (!item.lab_report) return false;
    if (Boolean(item.lab_report.report_file)) return true;
    const repStatus = (item.lab_report.report_status || "").toUpperCase();
    if (["REPORT GENERATED", "VERIFIED", "COMPLETED", "DELIVERED", "GENERATED"].includes(repStatus)) {
      return true;
    }
    return false;
  };

  // Helper to determine status badge display for each test
  const getTestStatusBadge = (item: LabOrderItem) => {
    const norm = (item.item_status || "").toUpperCase().trim();
    const ready = isTestReady(item);

    // ONLY display "Report Ready" if this specific test actually has its certified report ready
    if (ready) {
      return {
        label: "Report Ready",
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: <CheckCircle2 className="h-3 w-3" />,
      };
    }

    // When report is not ready, bench completion means under review / pending pathologist sign-off
    if (
      norm === "VERIFIED" ||
      norm === "COMPLETED" ||
      norm === "REPORT GENERATED" ||
      norm === "DELIVERED"
    ) {
      return {
        label: "Under Review",
        bg: "bg-amber-50 text-amber-700 border-amber-200",
        icon: <Clock4 className="h-3 w-3" />,
      };
    }
    if (norm === "COLLECTED" || norm === "SAMPLE COLLECTED") {
      return {
        label: "Sample Collected",
        bg: "bg-amber-50 text-amber-700 border-amber-200",
        icon: <Clock4 className="h-3 w-3" />,
      };
    }
    if (norm === "BARCODE GENERATED" || norm === "LABELED") {
      return {
        label: "Sample Labeled",
        bg: "bg-indigo-50 text-indigo-700 border-indigo-200",
        icon: <Barcode className="h-3 w-3" />,
      };
    }
    if (norm === "PROCESSING" || norm === "IN PROGRESS" || norm === "TESTING") {
      return {
        label: "Under Testing",
        bg: "bg-purple-50 text-purple-700 border-purple-200",
        icon: <Clock4 className="h-3 w-3" />,
      };
    }
    if (norm === "REJECTED") {
      return {
        label: "Sample Rejected",
        bg: "bg-rose-50 text-rose-700 border-rose-200",
        icon: <AlertCircle className="h-3 w-3" />,
      };
    }

    return {
      label: item.item_status && item.item_status !== "Ordered" ? item.item_status : "Sample Ordered",
      bg: "bg-slate-100 text-slate-700 border-slate-200",
      icon: <Clock4 className="h-3 w-3" />,
    };
  };

  const handleView = (item: LabOrderItem) => {
    if (!isTestReady(item)) return;
    setSelectedItem(item);
    setViewerOpen(true);
  };

  const handleDownload = async (item: LabOrderItem) => {
    if (!isTestReady(item) || !item.lab_report) return;

    const itemId = item.lab_order_item_id || "";
    try {
      setDownloadingItemId(itemId);
      const targetReport = item.lab_report;
      const targetTest = item.lab_test_master?.test_name || item.test_name || "Diagnostic Test";

      // 1. If stored PDF base64 exists on this item's specific report, download directly
      if (targetReport.report_file) {
        const { url } = reportFileToPdfUrl(targetReport.report_file);
        if (url) {
          const a = document.createElement("a");
          a.href = url;
          a.download = `LabReport_${targetTest.replace(/[^\w.-]+/g, "_")}_${order.order_id}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          return;
        }
      }

      // 2. Fetch specific item report details if available
      if (item.lab_order_item_id) {
        try {
          const res = await labReportApi.getByOrderItem(item.lab_order_item_id);
          const data = res.data.data;
          if (data.report?.report_file) {
            const { url } = reportFileToPdfUrl(data.report.report_file);
            if (url) {
              const a = document.createElement("a");
              a.href = url;
              a.download = `LabReport_${targetTest.replace(/[^\w.-]+/g, "_")}_${order.order_id}.pdf`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              return;
            }
          }
          if (data.parameters && data.parameters.length > 0) {
            const comment = parseReportComment(data.report?.report_comment);
            const doc = await buildLabReportPdf({
              reportNumber: data.report?.report_number || targetReport?.report_number,
              orderId: data.order?.lab_order_id || order.order_id,
              generatedAt: data.report?.generated_datetime || new Date().toISOString(),
              testName: targetTest,
              patientName: data.patient?.name || patientName,
              patientAgeGender: [
                data.patient?.gender,
                data.patient?.age != null ? `${data.patient.age} Yrs` : "",
              ]
                .filter(Boolean)
                .join(" | "),
              patientMrn: data.patient?.mrn_no || data.patient?.patient_id || patientId,
              doctor: data.order?.doctor || doctorName,
              department:
                data.order?.department ||
                order.department_master?.department_name ||
                "Diagnostic Laboratory",
              parameters: data.parameters,
              notes: comment.meta?.text ?? comment.text,
              approvedBy:
                (data.report as any)?.employees
                  ? `Dr. ${(data.report as any).employees.first_name} ${(data.report as any).employees.last_name || ""}`.trim()
                  : data.report?.approved_by || "Verified by Pathologist",
            });
            doc.save(`LabReport_${targetTest.replace(/[^\w.-]+/g, "_")}_${order.order_id}.pdf`);
            return;
          }
        } catch (fetchErr) {
          console.warn("Could not fetch per-item report details:", fetchErr);
        }
      }

      // 3. Fallback direct PDF generation for this specific test
      let params: any[] = [];
      if (targetReport.report_data) {
        if (Array.isArray(targetReport.report_data)) {
          params = targetReport.report_data;
        } else if (Array.isArray(targetReport.report_data?.parameters)) {
          params = targetReport.report_data.parameters;
        }
      }

      downloadLabReportPdf({
        reportId: targetReport.lab_report_id || order.order_id,
        orderId: order.order_id,
        testName: targetTest,
        patientName: patientName,
        patientAgeGender: user?.patient_gender ? `${user.patient_gender}` : undefined,
        patientMrn: patientId,
        doctor: doctorName,
        department: order.department_master?.department_name || "Diagnostic Laboratory",
        parameters:
          params.length > 0
            ? params
            : [{ parameter: targetTest, result: "Completed / Normal", status: "VERIFIED" }],
        notes: (targetReport as any)?.clinical_notes || (targetReport as any)?.technician_notes,
        approvedBy:
          (targetReport as any)?.approved_by ||
          (targetReport as any)?.verified_by ||
          "Verified by Pathologist",
        generatedAt:
          (targetReport as any)?.generated_datetime ||
          (targetReport as any)?.generated_date ||
          new Date().toISOString(),
      } as any);
    } catch (err) {
      console.error("PDF download error:", err);
    } finally {
      setDownloadingItemId(null);
    }
  };

  /* ============================================================
     COMPACT VIEW (DASHBOARD)
  ============================================================ */
  if (compact) {
    return (
      <div className="bg-white rounded-xl p-4 border border-slate-200/90 hover:border-blue-300 transition-all shadow-xs flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0">
                <FlaskConical className="h-4 w-4" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-800 line-clamp-1">
                  Order #{order.order_id}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {order.department_master?.department_name || "Diagnostic Laboratory"} •{" "}
                  {formatDate(order.order_date || order.created_at)}
                </p>
              </div>
            </div>

            <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
              {items.length} Test{items.length > 1 ? "s" : ""}
            </span>
          </div>

          {/* Test items list with per-test status & view/download buttons */}
          <div className="space-y-2 divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden p-2 bg-slate-50/50">
            {items.slice(0, 3).map((item, idx) => {
              const testTitle =
                item.lab_test_master?.test_name || item.test_name || `Test #${idx + 1}`;
              const badge = getTestStatusBadge(item);
              const testReady = isTestReady(item);
              const isDownloading = downloadingItemId === item.lab_order_item_id;

              return (
                <div
                  key={item.lab_order_item_id || item.order_item_id || idx}
                  className="pt-2 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-slate-800 truncate block">
                      {testTitle}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold border mt-0.5 ${badge.bg}`}
                    >
                      {badge.icon}
                      {badge.label}
                    </span>
                  </div>

                  {/* ONLY show View/Download if THIS specific test is completed */}
                  {testReady && (
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleView(item)}
                        className="px-2 py-1 text-[11px] font-semibold rounded border border-[#00488D] bg-white text-[#00488D] hover:bg-blue-50 transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="h-3 w-3" />
                        <span>View</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(item)}
                        disabled={isDownloading}
                        className="px-2 py-1 text-[11px] font-semibold rounded bg-[#00488D] text-white hover:bg-blue-800 transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-60"
                      >
                        {isDownloading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                        <span>Download</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {items.length > 3 && (
              <div className="pt-2 text-[11px] text-[#00488D] font-medium text-center">
                +{items.length - 3} more test(s) in this order
              </div>
            )}
          </div>
        </div>

        {/* Modal for PDF Preview */}
        {viewerOpen && (
          <LabReportViewerModal
            open={viewerOpen}
            onOpenChange={setViewerOpen}
            item={selectedItem}
          />
        )}
      </div>
    );
  }

  /* ============================================================
     FULL VIEW (LAB REPORTS PAGE)
  ============================================================ */
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 hover:border-blue-300/80 transition-all shadow-xs">
      {/* Order Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <FlaskConical className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800">
                Order #{order.order_id}
              </h3>
              {order.department_master?.department_name && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {order.department_master.department_name}
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Prescribed by: <span className="text-slate-700 font-semibold">{doctorName}</span> • Date:{" "}
              {formatDate(order.order_date || order.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full">
            {items.length} Test{items.length > 1 ? "s" : ""} in Order
          </span>
        </div>
      </div>

      {/* Tests in this order with status, view, and download buttons */}
      <div className="mt-4 space-y-2">
        <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase flex items-center justify-between">
          <span>Diagnostic Tests & Status ({items.length})</span>
          <span className="text-[10px] font-normal normal-case text-slate-400">
            View & Download available for completed tests
          </span>
        </div>

        <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
          {items.map((item, idx) => {
            const testTitle =
              item.lab_test_master?.test_name || item.test_name || `Test #${idx + 1}`;
            const testCode = item.lab_test_master?.test_code || item.test_code;
            const sampleType = item.lab_test_master?.sample_type || item.sample_type;
            const barcode = item.sample_collection?.barcode || item.barcode;
            const collectionStatus = item.sample_collection?.collection_status;
            const badge = getTestStatusBadge(item);
            const testReady = isTestReady(item);
            const isDownloading = downloadingItemId === item.lab_order_item_id;

            return (
              <div
                key={item.lab_order_item_id || item.order_item_id || idx}
                className="p-3.5 bg-slate-50/40 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                {/* Test details */}
                <div className="space-y-1 min-w-0">
                  <div className="font-bold text-slate-800 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{testTitle}</span>
                    {testCode && (
                      <span className="text-[10px] font-mono font-medium text-slate-500 bg-white border border-slate-200 px-1.5 py-0.2 rounded">
                        {testCode}
                      </span>
                    )}
                    {sampleType && (
                      <span className="text-[10px] font-medium text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.2 rounded-full">
                        Sample: {sampleType}
                      </span>
                    )}
                  </div>

                  {barcode && (
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <Barcode className="h-3 w-3 text-slate-400" />
                      <span>
                        Barcode: <span className="font-mono text-slate-600 font-semibold">{barcode}</span>
                      </span>
                      {collectionStatus && (
                        <span>
                          • Collection:{" "}
                          <span className="font-medium text-slate-600">{collectionStatus}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Test Status Badge + ONLY View & Download for completed test */}
                <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start md:self-center">
                  {/* Test Status Badge (ALWAYS shown for every test) */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.bg}`}
                  >
                    {badge.icon}
                    <span>{badge.label}</span>
                  </span>

                  {/* ONLY attach View and Download buttons if THIS specific test is completed */}
                  {testReady && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleView(item)}
                        title="View accredited test report"
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-[#00488D] bg-white text-[#00488D] hover:bg-blue-50/80 transition-all shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownload(item)}
                        disabled={isDownloading}
                        title="Download accredited PDF report"
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#00488D] text-white hover:bg-blue-800 transition-all shadow-2xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                      >
                        {isDownloading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        <span>Download</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expand/Collapse Sign-off details for available reports */}
      {orderReports.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-semibold text-slate-600 hover:text-[#00488D] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                <span>Hide Clinical Notes & Sign-off</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                <span>View Clinical Notes & Sign-off</span>
              </>
            )}
          </button>

          {expanded && (
            <div className="mt-3 p-3.5 bg-blue-50/40 rounded-lg border border-blue-100 text-xs text-slate-700 space-y-2">
              {orderReports[0]?.clinical_notes && (
                <div>
                  <span className="font-semibold text-slate-800">Clinical Remarks: </span>
                  {orderReports[0].clinical_notes}
                </div>
              )}
              {orderReports[0]?.approved_by && (
                <div className="text-[11px] text-slate-500 pt-1 border-t border-blue-100/60">
                  Approved & Digitally Verified by:{" "}
                  <span className="font-bold text-slate-700">{orderReports[0].approved_by}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* High-fidelity PDF Preview Modal */}
      {viewerOpen && (
        <LabReportViewerModal
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          item={selectedItem}
        />
      )}
    </div>
  );
};
