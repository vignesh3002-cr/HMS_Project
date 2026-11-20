import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { SingleSelectDropdown } from "@/components/ui/single-select-dropdown";
import DateInputField from "./DateInputField";
import {
  SAMPLE_TYPE_OPTIONS,
  STATUS_OPTIONS,
  genomicReportFileUrl,
  genomicsApi,
  uploadGenomicReportFile,
  type GenomicFieldError,
  type GenomicSampleType,
  type GenomicStatus,
  type GenomicTestInput,
  type GenomicTestRecord,
} from "../../../api/genomics.api";
import {
  dmyFromIso,
  isoFromDmy,
  newDraftRow,
  todayDmy,
  validateGenomicDraft,
  type GenomicDraft,
  type GenomicDraftRow,
} from "./genomicsForm";

const INPUT_CLASS =
  "h-10 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#191C1E] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#004785] focus:ring-2 focus:ring-[#D6E3FF] disabled:bg-[#F7F9FB] disabled:text-[#9CA3AF]";

const TEXTAREA_CLASS =
  "w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#191C1E] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#004785] focus:ring-2 focus:ring-[#D6E3FF]";

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.04em] text-[#424752]">
      {children}
      {required && <span className="ml-0.5 text-[#D92D20]">*</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 flex items-start gap-1 text-[11px] leading-4 text-[#D92D20]">
      <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  disabled,
  ariaLabel,
}: {
  value: T | "";
  options: { value: T; label: string; hint?: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex w-full rounded-lg border border-[#E5E7EB] bg-[#F7F9FB] p-1"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            title={option.hint}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`flex-1 rounded-md px-2.5 py-1.5 text-[12px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
              active
                ? "bg-white text-[#004785] shadow-sm ring-1 ring-[#D6E3FF]"
                : "text-[#424752] hover:bg-white/70"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export interface NgsReportModalProps {
  open: boolean;
  onClose: () => void;
  patientId: string;
  encounterNo?: string | null;
  stagingDetailId?: string | null;
  defaultCancerSite?: string;
  editing?: GenomicTestRecord | null;
  onSaved: (test: GenomicTestRecord) => void;
}

export function NgsReportModal({
  open,
  onClose,
  patientId,
  encounterNo,
  stagingDetailId,
  defaultCancerSite,
  editing,
  onSaved,
}: NgsReportModalProps) {
  const [sampleType, setSampleType] = useState<GenomicSampleType>("TISSUE");
  const [cancerSite, setCancerSite] = useState("");
  const [reportDate, setReportDate] = useState(todayDmy());
  const [collectionDate, setCollectionDate] = useState("");
  const [labName, setLabName] = useState("");
  const [panelName, setPanelName] = useState("");
  const [remarks, setRemarks] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [removeExistingFile, setRemoveExistingFile] = useState(false);
  const [rows, setRows] = useState<GenomicDraftRow[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [sites, setSites] = useState<string[]>([]);
  const [labs, setLabs] = useState<string[]>([]);
  const [geneOptions, setGeneOptions] = useState<string[]>([]);
  const [genesLoading, setGenesLoading] = useState(false);
  const [pendingChange, setPendingChange] = useState<
    { kind: "sampleType"; value: GenomicSampleType } | { kind: "cancerSite"; value: string } | null
  >(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [initialSignature, setInitialSignature] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const draft: GenomicDraft = useMemo(
    () => ({
      sampleType,
      cancerSite,
      reportDate,
      collectionDate,
      labName,
      panelName,
      remarks,
    }),
    [sampleType, cancerSite, reportDate, collectionDate, labName, panelName, remarks],
  );

  const signature = useMemo(
    () =>
      JSON.stringify({
        draft,
        rows,
        file: file ? `${file.name}:${file.size}` : "",
        removeExistingFile,
      }),
    [draft, rows, file, removeExistingFile],
  );

  const dirty = open && signature !== initialSignature;

  /* ------------------------------------------------------------------ */
  /* Load lookups and prefill                                           */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    genomicsApi
      .cancerSites()
      .then((data) => {
        if (!cancelled) setSites(data);
      })
      .catch(() => {
        if (!cancelled) setSites([]);
      });

    genomicsApi
      .labs(patientId)
      .then((data) => {
        if (!cancelled) setLabs(data);
      })
      .catch(() => {
        if (!cancelled) setLabs([]);
      });

    return () => {
      cancelled = true;
    };
  }, [open, patientId]);

  useEffect(() => {
    if (!open) return;

    if (editing) {
      setSampleType(editing.sample_type);
      setCancerSite(editing.cancer_site);
      setReportDate(dmyFromIso(editing.report_date));
      setCollectionDate(dmyFromIso(editing.collection_date));
      setLabName(editing.lab_name ?? "");
      setPanelName(editing.panel_name ?? "");
      setRemarks(editing.remarks ?? "");
      setFile(null);
      setRemoveExistingFile(false);
      setRows(
        editing.genomic_result.map((result) => ({
          uid: `row-${result.result_id}`,
          geneSymbol: result.gene_symbol,
          isOtherGene: result.is_other_gene,
          status: result.status,
          transcriptDetails: result.transcript_details ?? "",
        })),
      );
    } else {
      setSampleType("TISSUE");
      setCancerSite(defaultCancerSite ?? "");
      setReportDate(todayDmy());
      setCollectionDate("");
      setLabName("");
      setPanelName("");
      setRemarks("");
      setFile(null);
      setRemoveExistingFile(false);
      setRows([newDraftRow()]);
    }

    setErrors({});
    setSaveError("");
    setPendingChange(null);
    setConfirmClose(false);
  }, [open, editing?.test_id, defaultCancerSite]);

  const signatureRef = useRef("");
  signatureRef.current = signature;

  // Capture the "clean" snapshot once the prefill render has settled.
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setInitialSignature(signatureRef.current), 50);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.test_id, defaultCancerSite]);

  /* Gene list follows cancer site + sample type. */
  useEffect(() => {
    if (!open || !cancerSite || !sampleType) {
      setGeneOptions([]);
      return;
    }
    let cancelled = false;
    setGenesLoading(true);
    genomicsApi
      .genes(cancerSite, sampleType)
      .then((data) => {
        if (!cancelled) setGeneOptions(data.genes);
      })
      .catch(() => {
        if (!cancelled) setGeneOptions([]);
      })
      .finally(() => {
        if (!cancelled) setGenesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, cancerSite, sampleType]);

  /* ------------------------------------------------------------------ */
  /* Handlers                                                           */
  /* ------------------------------------------------------------------ */

  const applySampleType = (value: GenomicSampleType) => {
    setSampleType(value);
    setErrors({});
  };

  const applyCancerSite = (value: string) => {
    setCancerSite(value);
    setErrors({});
  };

  const requestSampleType = (value: GenomicSampleType) => {
    if (value === sampleType) return;
    if (rows.some((row) => row.geneSymbol || row.isOtherGene || row.status)) {
      setPendingChange({ kind: "sampleType", value });
      return;
    }
    applySampleType(value);
  };

  const requestCancerSite = (value: string) => {
    if (value === cancerSite) return;
    if (rows.some((row) => row.geneSymbol || row.isOtherGene || row.status)) {
      setPendingChange({ kind: "cancerSite", value });
      return;
    }
    applyCancerSite(value);
  };

  const confirmPendingChange = () => {
    if (!pendingChange) return;
    if (pendingChange.kind === "sampleType") applySampleType(pendingChange.value);
    else applyCancerSite(pendingChange.value);
    setRows([newDraftRow()]);
    setPendingChange(null);
  };

  const updateRow = (uid: string, changes: Partial<GenomicDraftRow>) => {
    setRows((current) =>
      current.map((row) => (row.uid === uid ? { ...row, ...changes } : row)),
    );
  };

  const addRow = () => {
    setRows((current) => [...current, newDraftRow()]);
    setErrors((current) => {
      const next = { ...current };
      delete next.rows;
      return next;
    });
  };

  const removeRow = (uid: string) => {
    setRows((current) => current.filter((row) => row.uid !== uid));
    setErrors((current) => {
      const next: Record<string, string> = {};
      for (const [key, value] of Object.entries(current)) {
        if (!key.startsWith(`row.${uid}.`)) next[key] = value;
      }
      return next;
    });
  };

  const requestClose = () => {
    if (saving) return;
    if (dirty) {
      setConfirmClose(true);
      return;
    }
    onClose();
  };

  const existingDocumentId =
    !removeExistingFile && editing?.report_document_id ? editing.report_document_id : null;

  const handleFilePicked = (picked: File | null) => {
    if (!picked) return;
    if (picked.size > 10 * 1024 * 1024) {
      setSaveError("The report file must be 10 MB or smaller.");
      return;
    }
    setFile(picked);
    setSaveError("");
  };

  const handleSave = async () => {
    const validation = validateGenomicDraft(draft, rows, geneOptions);
    setErrors(validation.errors);
    setSaveError("");

    if (Object.keys(validation.errors).length > 0) {
      setSaveError("Please fix the highlighted fields before saving.");
      return;
    }

    setSaving(true);
    try {
      let documentId = existingDocumentId;

      if (file) {
        documentId = await uploadGenomicReportFile(patientId, file, encounterNo);
      }

      const payload: GenomicTestInput = {
        sampleType,
        cancerSite: cancerSite.trim(),
        reportDate: isoFromDmy(reportDate) as string,
        collectionDate: collectionDate.trim() ? isoFromDmy(collectionDate) : null,
        labName: labName.trim() || null,
        panelName: panelName.trim() || null,
        reportDocumentId: documentId,
        remarks: remarks.trim() || null,
        encounterNo: encounterNo ?? null,
        stagingDetailId: stagingDetailId ?? null,
        results: rows.map((row) => ({
          geneSymbol: row.geneSymbol.trim().toUpperCase(),
          isOtherGene: row.isOtherGene,
          status: row.status as GenomicStatus,
          transcriptDetails: row.transcriptDetails.trim() ? row.transcriptDetails : null,
        })),
      };

      const saved = editing
        ? await genomicsApi.updateTest(editing.test_id, payload)
        : await genomicsApi.createTest(patientId, payload);

      onSaved(saved);
      onClose();
    } catch (error: any) {
      const response = error?.response?.data;
      const fieldErrors: GenomicFieldError[] = Array.isArray(response?.errors)
        ? response.errors
        : [];

      if (fieldErrors.length > 0) {
        const mapped: Record<string, string> = {};
        for (const item of fieldErrors) {
          const match = /^results\[(\d+)\]\.(\w+)$/.exec(item.field);
          if (match) {
            const row = rows[Number(match[1])];
            if (row) {
              const field =
                match[2] === "geneSymbol"
                  ? "gene"
                  : match[2] === "transcriptDetails"
                    ? "transcript"
                    : match[2];
              mapped[`row.${row.uid}.${field}`] = item.message;
            } else {
              mapped.rows = item.message;
            }
          } else {
            mapped[item.field] = item.message;
          }
        }
        setErrors(mapped);
        setSaveError("Please fix the highlighted fields before saving.");
      } else {
        setSaveError(
          response?.message || error?.message || "Could not save the genomic report.",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const geneOptionsForRow = (row: GenomicDraftRow) => {
    const used = new Set(
      rows
        .filter((other) => other.uid !== row.uid && !other.isOtherGene)
        .map((other) => other.geneSymbol.toUpperCase())
        .filter(Boolean),
    );
    return [
      ...geneOptions
        .filter((gene) => gene === row.geneSymbol || !used.has(gene))
        .map((gene) => ({ label: gene, value: gene })),
      { label: "Other (type gene symbol)", value: "__OTHER__" },
    ];
  };

  const cancerSiteOptions = useMemo(() => {
    const all = new Set(sites);
    if (cancerSite) all.add(cancerSite);
    return [...all].sort((a, b) => a.localeCompare(b));
  }, [sites, cancerSite]);

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => { if (!next) requestClose(); }}>
        <DialogContent className="max-h-[92vh] w-[95vw] max-w-5xl gap-0 overflow-hidden border-[#E5E7EB] bg-white p-0 font-manrope shadow-2xl sm:rounded-2xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-[#E5E7EB] bg-white px-6 py-4 pr-12">
            <div>
              <h2 className="text-lg font-extrabold tracking-[-0.3px] text-[#191C1E]">
                {editing ? "Edit NGS report" : "Add NGS report"}
              </h2>
              <p className="mt-0.5 text-[12px] text-[#6B7280]">
                One report per test. Add every gene the laboratory reported.
              </p>
            </div>
            <span className="mt-0.5 inline-flex items-center rounded-full bg-[#EEF4FF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[#004785]">
              Genomic data
            </span>
          </div>

          {/* Body */}
          <div className="max-h-[calc(92vh-150px)] overflow-y-auto px-6 py-5">
            {saveError && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#FDA29B] bg-[#FFFBFA] px-3 py-2.5 text-[12px] text-[#B42318]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {/* Report details */}
            <section className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel required>Sample type</FieldLabel>
                  <Segmented
                    ariaLabel="Sample type"
                    value={sampleType}
                    options={SAMPLE_TYPE_OPTIONS}
                    onChange={requestSampleType}
                  />
                  <FieldError message={errors.sampleType} />
                </div>

                <div>
                  <FieldLabel required>Cancer site</FieldLabel>
                  <SingleSelectDropdown
                    options={cancerSiteOptions}
                    value={cancerSite}
                    onValueChange={requestCancerSite}
                    placeholder="Select cancer site"
                    className="h-10 rounded-lg border-[#E5E7EB] text-sm"
                  />
                  <FieldError message={errors.cancerSite} />
                </div>

                <div>
                  <FieldLabel required>Report date</FieldLabel>
                  <DateInputField
                    id="ngs-report-date"
                    value={reportDate}
                    onChange={setReportDate}
                    error={errors.reportDate}
                    allowPast
                    disableFuture
                    ariaLabel="Pick the report date"
                  />
                </div>

                <div>
                  <FieldLabel>Sample collection date</FieldLabel>
                  <DateInputField
                    id="ngs-collection-date"
                    value={collectionDate}
                    onChange={setCollectionDate}
                    error={errors.collectionDate}
                    allowPast
                    disableFuture
                    ariaLabel="Pick the sample collection date"
                  />
                </div>

                <div>
                  <FieldLabel>Laboratory</FieldLabel>
                  <input
                    list="ngs-lab-names"
                    className={INPUT_CLASS}
                    value={labName}
                    onChange={(event) => setLabName(event.target.value)}
                    placeholder="e.g. MedGenome"
                    maxLength={200}
                  />
                  <datalist id="ngs-lab-names">
                    {labs.map((lab) => (
                      <option key={lab} value={lab} />
                    ))}
                  </datalist>
                  <FieldError message={errors.labName} />
                </div>

                <div>
                  <FieldLabel>Panel / test name</FieldLabel>
                  <input
                    className={INPUT_CLASS}
                    value={panelName}
                    onChange={(event) => setPanelName(event.target.value)}
                    placeholder="e.g. 52-gene solid tumour panel"
                    maxLength={200}
                  />
                  <FieldError message={errors.panelName} />
                </div>

                <div className="md:col-span-2">
                  <FieldLabel>Report file</FieldLabel>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(event) => handleFilePicked(event.target.files?.[0] ?? null)}
                  />

                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-[#D0D5DD] bg-[#F9FAFB] px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#004785] shadow-sm transition-colors hover:bg-[#F2F4F6]"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {file || existingDocumentId ? "Replace file" : "Choose file"}
                    </button>

                    {file ? (
                      <span className="inline-flex min-w-0 items-center gap-1.5 text-[12px] text-[#424752]">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-[#004785]" />
                        <span className="truncate">{file.name}</span>
                        <span className="shrink-0 text-[#9CA3AF]">
                          ({(file.size / 1024 / 1024).toFixed(1)} MB)
                        </span>
                      </span>
                    ) : existingDocumentId ? (
                      <span className="inline-flex items-center gap-2 text-[12px] text-[#424752]">
                        <FileText className="h-3.5 w-3.5 text-[#004785]" />
                        Current report
                        <a
                          href={genomicReportFileUrl(existingDocumentId)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-[#004785] hover:underline"
                        >
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      </span>
                    ) : (
                      <span className="text-[12px] text-[#9CA3AF]">
                        PDF, image or document · up to 10 MB
                      </span>
                    )}

                    {(file || existingDocumentId) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFile(null);
                          if (existingDocumentId) setRemoveExistingFile(true);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-[#B42318] hover:underline"
                      >
                        <Trash2 className="h-3 w-3" /> Remove
                      </button>
                    )}
                  </div>
                  <FieldError message={errors.reportDocumentId} />
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between">
                    <FieldLabel>Remarks</FieldLabel>
                    <span className="mb-1.5 text-[10px] text-[#9CA3AF]">
                      {remarks.length}/1000
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    className={TEXTAREA_CLASS}
                    value={remarks}
                    onChange={(event) => setRemarks(event.target.value.slice(0, 1000))}
                    placeholder="Optional notes about the sample, panel or quality"
                  />
                  <FieldError message={errors.remarks} />
                </div>
              </div>
            </section>

            {/* Gene results */}
            <section className="mt-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-[13px] font-extrabold text-[#191C1E]">Gene results</h3>
                  <p className="text-[11px] text-[#6B7280]">
                    {cancerSite
                      ? `Genes mapped to ${cancerSite} · ${
                          sampleType === "GERMLINE" ? "germline" : "somatic"
                        } list`
                      : "Choose a sample type and cancer site to load the gene list"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addRow}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#004785] bg-white px-3 py-1.5 text-[12px] font-bold text-[#004785] transition-colors hover:bg-[#F2F4F6] active:scale-[0.98]"
                >
                  <Plus className="h-3.5 w-3.5" /> Add gene
                </button>
              </div>

              <FieldError message={errors.rows} />

              {genesLoading && (
                <div className="mb-2 flex items-center gap-2 text-[11px] text-[#6B7280]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading gene list…
                </div>
              )}

              <div className="space-y-3">
                {rows.map((row, index) => {
                  const rowErrors = {
                    gene: errors[`row.${row.uid}.gene`],
                    status: errors[`row.${row.uid}.status`],
                    transcript: errors[`row.${row.uid}.transcript`],
                  };
                  const geneValue = row.isOtherGene
                    ? "__OTHER__"
                    : row.geneSymbol || "";

                  return (
                    <div
                      key={row.uid}
                      className="rounded-xl border border-[#E5E7EB] bg-[#FCFCFD] p-3 shadow-sm"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#6B7280]">
                          Gene {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeRow(row.uid)}
                          disabled={rows.length === 1}
                          title={
                            rows.length === 1
                              ? "A report needs at least one gene"
                              : "Remove this gene"
                          }
                          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-[#B42318] transition-colors hover:bg-[#FEF3F2] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 className="h-3 w-3" /> Remove
                        </button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-12">
                        <div className="md:col-span-5">
                          <SingleSelectDropdown
                            options={geneOptionsForRow(row)}
                            value={geneValue}
                            onValueChange={(value) => {
                              if (value === "__OTHER__") {
                                updateRow(row.uid, {
                                  isOtherGene: true,
                                  geneSymbol: "",
                                });
                              } else {
                                updateRow(row.uid, {
                                  isOtherGene: false,
                                  geneSymbol: value,
                                });
                              }
                            }}
                            placeholder={
                              cancerSite ? "Select gene" : "Choose site first"
                            }
                            disabled={!cancerSite || !sampleType}
                            className="h-9 rounded-lg border-[#E5E7EB] text-[13px]"
                          />
                          <FieldError message={rowErrors.gene} />

                          {row.isOtherGene && (
                            <input
                              className={`${INPUT_CLASS} mt-2 h-9 text-[13px]`}
                              value={row.geneSymbol}
                              onChange={(event) =>
                                updateRow(row.uid, {
                                  geneSymbol: event.target.value.toUpperCase(),
                                })
                              }
                              placeholder="Other gene symbol, e.g. ERBB2"
                              maxLength={50}
                            />
                          )}
                        </div>

                        <div className="md:col-span-7">
                          <Segmented
                            ariaLabel={`Status for gene ${index + 1}`}
                            value={row.status}
                            options={STATUS_OPTIONS}
                            onChange={(value) =>
                              updateRow(row.uid, { status: value })
                            }
                          />
                          <FieldError message={rowErrors.status} />
                        </div>

                        <div className="md:col-span-12">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-[#6B7280]">
                              Transcript / variant details
                              {(row.status === "PRESENT" || row.status === "VUS") && (
                                <span className="ml-0.5 text-[#D92D20]">*</span>
                              )}
                            </span>
                            <span className="text-[10px] text-[#9CA3AF]">
                              {row.transcriptDetails.length}/500
                            </span>
                          </div>
                          <textarea
                            rows={2}
                            className={`${TEXTAREA_CLASS} mt-1 text-[13px]`}
                            value={row.transcriptDetails}
                            onChange={(event) =>
                              updateRow(row.uid, {
                                transcriptDetails: event.target.value.slice(0, 500),
                              })
                            }
                            placeholder="e.g. NM_005228.5:c.2573T>G p.(Leu858Arg), VAF 23%"
                          />
                          <FieldError message={rowErrors.transcript} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E7EB] bg-[#FCFCFD] px-6 py-3.5">
            <p className="text-[11px] text-[#6B7280]">
              {stagingDetailId
                ? "Linked to this visit's diagnosis."
                : "Saved to this visit; it will link to the diagnosis once that is saved."}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={requestClose}
                disabled={saving}
                className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-[12px] font-semibold text-[#424752] transition-colors hover:bg-[#F2F4F6] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="inline-flex min-w-[130px] items-center justify-center gap-2 rounded-lg bg-[#004785] px-4 py-2 text-[12px] font-bold text-white shadow-sm transition-all hover:bg-[#003A6B] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {saving ? "Saving…" : editing ? "Update report" : "Save report"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={Boolean(pendingChange)}
        type="warning"
        title="Clear the gene rows?"
        description="Changing the sample type or cancer site clears the gene rows you have added. Continue?"
        confirmText="Clear and continue"
        cancelText="Keep rows"
        onConfirm={confirmPendingChange}
        onCancel={() => setPendingChange(null)}
      />

      <ConfirmationDialog
        open={confirmClose}
        type="warning"
        title="Discard this report?"
        description="The report details and gene rows you entered have not been saved."
        confirmText="Discard"
        cancelText="Keep editing"
        onConfirm={() => {
          setConfirmClose(false);
          onClose();
        }}
        onCancel={() => setConfirmClose(false)}
      />
    </>
  );
}

export default NgsReportModal;
