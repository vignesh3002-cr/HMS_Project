import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  ExternalLink,
  FileText,
  FlaskConical,
  Loader2,
  Pencil,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import {
  SAMPLE_TYPE_OPTIONS,
  genomicReportFileUrl,
  genomicsApi,
  sampleTypeLabel,
  type GenomicSampleType,
  type GenomicTestRecord,
  type KeyAlteration,
} from "../../../api/genomics.api";
import { dmyFromIso } from "./genomicsForm";

const STATUS_STYLES: Record<string, string> = {
  PRESENT: "border-[#FDA29B] bg-[#FEF3F2] text-[#B42318]",
  VUS: "border-[#FEDF89] bg-[#FFFAEB] text-[#B54708]",
  ABSENT: "border-[#E5E7EB] bg-[#F9FAFB] text-[#475467]",
};

const STATUS_WORDS: Record<string, string> = {
  PRESENT: "Present",
  VUS: "VUS",
  ABSENT: "Absent",
};

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] ${
        STATUS_STYLES[status] ?? STATUS_STYLES.ABSENT
      }`}
    >
      {STATUS_WORDS[status] ?? status}
    </span>
  );
}

export interface NgsReportsPanelProps {
  patientId: string;
  refreshKey?: number;
  onAdd: () => void;
  onEdit: (test: GenomicTestRecord) => void;
  onChanged: () => void;
  onManageGenes: () => void;
}

export function NgsReportsPanel({
  patientId,
  refreshKey = 0,
  onAdd,
  onEdit,
  onChanged,
  onManageGenes,
}: NgsReportsPanelProps) {
  const [tests, setTests] = useState<GenomicTestRecord[]>([]);
  const [alterations, setAlterations] = useState<KeyAlteration[]>([]);
  const [filter, setFilter] = useState<"ALL" | GenomicSampleType>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<GenomicTestRecord | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      genomicsApi.listTests(patientId),
      genomicsApi.keyAlterations(patientId).catch(() => [] as KeyAlteration[]),
    ])
      .then(([testRows, alterationRows]) => {
        if (cancelled) return;
        setTests(testRows);
        setAlterations(alterationRows);
      })
      .catch((requestError: any) => {
        if (cancelled) return;
        setError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            "Could not load NGS reports.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [patientId, refreshKey]);

  const visible = useMemo(
    () => (filter === "ALL" ? tests : tests.filter((test) => test.sample_type === filter)),
    [tests, filter],
  );

  const uniqueAlterations = useMemo(() => {
    const seen = new Set<string>();
    return alterations.filter((item) => {
      const key = `${item.gene_symbol}|${item.sample_type}|${item.report_date}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [alterations]);

  const openDelete = (test: GenomicTestRecord) => {
    setDeleteTarget(test);
    setDeleteReason("");
    setDeleteError("");
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (!deleteReason.trim()) {
      setDeleteError("A reason is required.");
      return;
    }
    setDeleting(true);
    setDeleteError("");
    try {
      await genomicsApi.deleteTest(deleteTarget.test_id, deleteReason.trim());
      setDeleteTarget(null);
      onChanged();
    } catch (requestError: any) {
      setDeleteError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Could not delete this report.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <h3 className="flex items-center gap-2 text-[11px] font-bold text-gray-800">
            <FlaskConical className="h-4 w-4 text-[#004785]" />
            NGS / genomic reports
          </h3>
          <p className="mt-1 text-[10px] text-gray-500">
            Every report is stored against this visit and the diagnosis staging detail.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onManageGenes}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#424752] transition-colors hover:bg-[#F2F4F6]"
          >
            <Settings2 className="h-3.5 w-3.5" /> Manage genes
          </button>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#004785] px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition-all hover:bg-[#003A6B] active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" /> Add NGS report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-[11px] text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading reports…
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : tests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-[#F9FAFB] px-4 py-6 text-center">
          <p className="text-[11px] font-semibold text-gray-700">No NGS reports yet</p>
          <p className="mt-1 text-[10px] text-gray-500">
            Record a tissue, liquid biopsy or germline report for this patient.
          </p>
          <button
            type="button"
            onClick={onAdd}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#004785] bg-white px-3 py-1.5 text-[11px] font-bold text-[#004785] transition-colors hover:bg-[#F2F4F6]"
          >
            <Plus className="h-3.5 w-3.5" /> + Add NGS report
          </button>
        </div>
      ) : (
        <>
          {/* Key alterations */}
          {uniqueAlterations.length > 0 && (
            <div className="mb-4 rounded-xl border border-[#FECDCA] bg-[#FFFBFA] px-3 py-2.5">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#B42318]">
                Key alterations (Present)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {uniqueAlterations.map((item, index) => (
                  <span
                    key={`${item.test_id}-${item.gene_symbol}-${index}`}
                    className="inline-flex items-center gap-1 rounded-full border border-[#FDA29B] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#B42318]"
                  >
                    {item.gene_symbol}
                    <span className="font-normal text-[#6B7280]">
                      — {sampleTypeLabel(item.sample_type)}, {dmyFromIso(item.report_date)}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Filter chips */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {[{ value: "ALL" as const, label: "All" }, ...SAMPLE_TYPE_OPTIONS].map((option) => {
              const active = filter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={`rounded-full border px-3 py-1 text-[10px] font-bold transition-colors ${
                    active
                      ? "border-[#004785] bg-[#004785] text-white"
                      : "border-[#E5E7EB] bg-white text-[#424752] hover:bg-[#F2F4F6]"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {/* Report cards */}
          <div className="space-y-3">
            {visible.map((test) => (
              <article
                key={test.test_id}
                className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <header className="flex flex-wrap items-start justify-between gap-2 border-b border-[#F2F4F6] px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-[#EEF4FF] px-2.5 py-0.5 text-[10px] font-bold text-[#004785]">
                        {sampleTypeLabel(test.sample_type)}
                      </span>
                      <h4 className="text-[12px] font-bold text-[#191C1E]">
                        {test.cancer_site}
                      </h4>
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#6B7280]">
                        <CalendarDays className="h-3 w-3" />
                        {dmyFromIso(test.report_date)}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-[#6B7280]">
                      {[test.lab_name, test.panel_name].filter(Boolean).join(" · ") ||
                        "No laboratory recorded"}
                      {test.collection_date
                        ? ` · Collected ${dmyFromIso(test.collection_date)}`
                        : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(test)}
                      title="Edit report"
                      className="rounded-md p-1.5 text-[#424752] transition-colors hover:bg-[#F2F4F6] hover:text-[#004785]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openDelete(test)}
                      title="Delete report"
                      className="rounded-md p-1.5 text-[#424752] transition-colors hover:bg-[#FEF3F2] hover:text-[#B42318]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </header>

                <div className="overflow-x-auto px-4 py-3">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[#F2F4F6]">
                        <th className="pb-1.5 pr-3 text-[9px] font-bold uppercase tracking-[0.06em] text-[#6B7280]">
                          Gene
                        </th>
                        <th className="pb-1.5 pr-3 text-[9px] font-bold uppercase tracking-[0.06em] text-[#6B7280]">
                          Status
                        </th>
                        <th className="pb-1.5 text-[9px] font-bold uppercase tracking-[0.06em] text-[#6B7280]">
                          Transcript / variant details
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F9FAFB]">
                      {test.genomic_result.map((result) => (
                        <tr key={result.result_id}>
                          <td className="py-1.5 pr-3 text-[11px] font-bold text-[#191C1E]">
                            {result.gene_symbol}
                            {result.is_other_gene && (
                              <span className="ml-1 text-[9px] font-normal text-[#9CA3AF]">
                                (other)
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 pr-3">
                            <StatusPill status={result.status} />
                          </td>
                          <td className="py-1.5 text-[10px] text-[#475467]">
                            {result.transcript_details || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {(test.report_document_id || test.remarks) && (
                  <footer className="flex flex-wrap items-center gap-3 border-t border-[#F2F4F6] px-4 py-2.5">
                    {test.report_document_id && (
                      <a
                        href={genomicReportFileUrl(test.report_document_id)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#004785] hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5" /> Open report file
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {test.remarks && (
                      <p className="min-w-0 flex-1 truncate text-[10px] text-[#6B7280]">
                        {test.remarks}
                      </p>
                    )}
                  </footer>
                )}
              </article>
            ))}

            {visible.length === 0 && (
              <p className="rounded-lg border border-dashed border-gray-200 px-4 py-4 text-center text-[11px] text-gray-500">
                No {sampleTypeLabel(filter).toLowerCase()} reports for this patient.
              </p>
            )}
          </div>
        </>
      )}

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        type="danger"
        title="Delete this NGS report?"
        description="The report is soft-deleted and kept in the audit trail. Enter a reason to continue."
        confirmText="Delete report"
        cancelText="Cancel"
        loading={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      >
        <div className="w-full text-left">
          <textarea
            rows={3}
            value={deleteReason}
            onChange={(event) => setDeleteReason(event.target.value.slice(0, 500))}
            placeholder="Reason for deleting this report"
            className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm text-[#191C1E] outline-none focus:border-[#004785] focus:ring-2 focus:ring-[#D6E3FF]"
          />
          {deleteError && (
            <p className="mt-1 text-[11px] text-[#B42318]">{deleteError}</p>
          )}
        </div>
      </ConfirmationDialog>
    </div>
  );
}

export default NgsReportsPanel;
