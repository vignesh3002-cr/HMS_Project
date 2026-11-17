import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Loader2,
  Plus,
  Power,
  Search,
  Trash2,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { SingleSelectDropdown } from "@/components/ui/single-select-dropdown";
import {
  genomicsApi,
  type GeneMasterRecord,
  type GenomicScope,
} from "../../../api/genomics.api";

const INPUT_CLASS =
  "h-9 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-[13px] text-[#191C1E] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#004785] focus:ring-2 focus:ring-[#D6E3FF]";

export interface GeneMasterAdminModalProps {
  open: boolean;
  onClose: () => void;
}

export function GeneMasterAdminModal({ open, onClose }: GeneMasterAdminModalProps) {
  const [sites, setSites] = useState<string[]>([]);
  const [site, setSite] = useState("Breast");
  const [scope, setScope] = useState<GenomicScope>("SOMATIC");
  const [rows, setRows] = useState<GeneMasterRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newGene, setNewGene] = useState("");
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GeneMasterRecord | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    genomicsApi
      .cancerSites()
      .then((data) => {
        if (cancelled) return;
        setSites(data);
        if (data.length && !data.includes(site)) setSite(data[0]);
      })
      .catch(() => {
        if (!cancelled) setSites([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadRows = () => {
    if (!site) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    genomicsApi
      .geneMaster({ site, scope })
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((requestError: any) => {
        if (!cancelled)
          setError(
            requestError?.response?.data?.message ||
              requestError?.message ||
              "Could not load the gene list.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  };

  useEffect(() => {
    if (!open) return;
    return loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, site, scope]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => row.gene_symbol.toLowerCase().includes(query));
  }, [rows, search]);

  const handleAdd = async () => {
    const symbol = newGene.trim().toUpperCase();
    if (!symbol) {
      setError("Type a gene symbol first.");
      return;
    }
    setAdding(true);
    setError("");
    try {
      await genomicsApi.createGene({
        cancerSite: site,
        scope,
        geneSymbol: symbol,
      });
      setNewGene("");
      loadRows();
    } catch (requestError: any) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Could not add this gene.",
      );
    } finally {
      setAdding(false);
    }
  };

  const toggleActive = async (row: GeneMasterRecord) => {
    setBusyId(row.gene_master_id);
    setError("");
    try {
      await genomicsApi.updateGene(row.gene_master_id, { active: !row.active });
      loadRows();
    } catch (requestError: any) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Could not update this gene.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const move = async (row: GeneMasterRecord, direction: -1 | 1) => {
    const index = rows.findIndex((item) => item.gene_master_id === row.gene_master_id);
    const neighbour = rows[index + direction];
    if (!neighbour) return;

    setBusyId(row.gene_master_id);
    setError("");
    try {
      await Promise.all([
        genomicsApi.updateGene(row.gene_master_id, { sortOrder: neighbour.sort_order }),
        genomicsApi.updateGene(neighbour.gene_master_id, { sortOrder: row.sort_order }),
      ]);
      loadRows();
    } catch (requestError: any) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Could not reorder the gene list.",
      );
    } finally {
      setBusyId(null);
    }
  };

  /* Genes the admin added by mistake can be removed outright while no saved
     report uses them; otherwise the server asks for deactivation instead. */
  const removeGene = async (row: GeneMasterRecord) => {
    setBusyId(row.gene_master_id);
    setError("");
    try {
      await genomicsApi.deleteGene(row.gene_master_id);
      setDeleteTarget(null);
      loadRows();
    } catch (requestError: any) {
      setDeleteTarget(null);
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Could not delete this gene.",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-3xl gap-0 overflow-hidden border-[#E5E7EB] bg-white p-0 font-manrope shadow-2xl sm:rounded-2xl">
        <div className="border-b border-[#E5E7EB] px-6 py-4 pr-12">
          <h2 className="text-lg font-extrabold tracking-[-0.3px] text-[#191C1E]">
            Manage gene lists
          </h2>
          <p className="mt-0.5 text-[12px] text-[#6B7280]">
            Add, reorder or deactivate genes. Changes appear in the NGS report
            dropdown immediately, with no release.
          </p>
        </div>

        <div className="max-h-[calc(90vh-160px)] overflow-y-auto px-6 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.04em] text-[#424752]">
                Cancer site
              </p>
              <SingleSelectDropdown
                options={sites}
                value={site}
                onValueChange={setSite}
                placeholder="Select cancer site"
                className="h-9 rounded-lg border-[#E5E7EB] text-[13px]"
              />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.04em] text-[#424752]">
                Scope
              </p>
              <div className="inline-flex w-full rounded-lg border border-[#E5E7EB] bg-[#F7F9FB] p-1">
                {(["SOMATIC", "GERMLINE"] as GenomicScope[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setScope(value)}
                    className={`flex-1 rounded-md px-3 py-1.5 text-[12px] font-semibold transition-all ${
                      scope === value
                        ? "bg-white text-[#004785] shadow-sm ring-1 ring-[#D6E3FF]"
                        : "text-[#424752] hover:bg-white/70"
                    }`}
                  >
                    {value === "SOMATIC" ? "Somatic (tissue / liquid)" : "Germline"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-[#E5E7EB] bg-[#FCFCFD] p-3">
            <div className="min-w-[180px] flex-1">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.04em] text-[#6B7280]">
                Add gene to {site} · {scope}
              </p>
              <input
                className={INPUT_CLASS}
                value={newGene}
                onChange={(event) => setNewGene(event.target.value.toUpperCase())}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleAdd();
                  }
                }}
                placeholder="e.g. ERBB2"
                maxLength={50}
              />
            </div>
            <button
              type="button"
              onClick={() => void handleAdd()}
              disabled={adding}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#004785] px-3 text-[12px] font-bold text-white transition-all hover:bg-[#003A6B] active:scale-[0.98] disabled:opacity-60"
            >
              {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Add
            </button>
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="relative min-w-[180px] flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                className={`${INPUT_CLASS} pl-8`}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search genes"
              />
            </div>
            <span className="text-[10px] text-[#6B7280]">
              {rows.filter((row) => row.active).length} active · {rows.length} total
            </span>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-[11px] text-[#6B7280]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading gene list…
            </div>
          ) : (
            <div className="mt-3 overflow-hidden rounded-xl border border-[#E5E7EB]">
              <table className="w-full text-left">
                <thead className="bg-[#F9FAFB]">
                  <tr>
                    <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.06em] text-[#6B7280]">
                      Order
                    </th>
                    <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.06em] text-[#6B7280]">
                      Gene
                    </th>
                    <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.06em] text-[#6B7280]">
                      Status
                    </th>
                    <th className="px-3 py-2 text-right text-[9px] font-bold uppercase tracking-[0.06em] text-[#6B7280]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F4F6]">
                  {visible.map((row) => (
                    <tr key={row.gene_master_id} className={row.active ? "" : "opacity-55"}>
                      <td className="px-3 py-1.5 text-[11px] text-[#6B7280]">
                        {row.sort_order}
                      </td>
                      <td className="px-3 py-1.5 text-[12px] font-bold text-[#191C1E]">
                        {row.gene_symbol}
                      </td>
                      <td className="px-3 py-1.5">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${
                            row.active
                              ? "border-[#ABEFC6] bg-[#ECFDF3] text-[#067647]"
                              : "border-[#E5E7EB] bg-[#F9FAFB] text-[#667085]"
                          }`}
                        >
                          {row.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            type="button"
                            disabled={busyId === row.gene_master_id}
                            onClick={() => void move(row, -1)}
                            title="Move up"
                            className="rounded-md p-1 text-[#6B7280] hover:bg-[#F2F4F6] hover:text-[#004785] disabled:opacity-40"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={busyId === row.gene_master_id}
                            onClick={() => void move(row, 1)}
                            title="Move down"
                            className="rounded-md p-1 text-[#6B7280] hover:bg-[#F2F4F6] hover:text-[#004785] disabled:opacity-40"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={busyId === row.gene_master_id}
                            onClick={() => void toggleActive(row)}
                            title={row.active ? "Deactivate" : "Activate"}
                            className={`rounded-md p-1 disabled:opacity-40 ${
                              row.active
                                ? "text-[#B42318] hover:bg-[#FEF3F2]"
                                : "text-[#067647] hover:bg-[#ECFDF3]"
                            }`}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={busyId === row.gene_master_id}
                            onClick={() => setDeleteTarget(row)}
                            title="Delete gene (only when no report uses it)"
                            className="rounded-md p-1 text-[#6B7280] hover:bg-[#FEF3F2] hover:text-[#B42318] disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {visible.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-[11px] text-[#6B7280]">
                        No genes for this site and scope yet. Add one above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[#E5E7EB] bg-[#FCFCFD] px-6 py-3">
          <p className="text-[10px] text-[#6B7280]">
            Deactivated genes stay in saved reports; they just stop appearing in the dropdown.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-[12px] font-semibold text-[#424752] transition-colors hover:bg-[#F2F4F6]"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>

    <ConfirmationDialog
      open={Boolean(deleteTarget)}
      type="danger"
      title="Delete this gene?"
      description={
        deleteTarget
          ? `${deleteTarget.gene_symbol} will be removed from ${deleteTarget.cancer_site} (${deleteTarget.scope}). Genes already used in a saved report cannot be deleted - deactivate them instead.`
          : ""
      }
      confirmText="Delete gene"
      cancelText="Cancel"
      loading={Boolean(deleteTarget && busyId === deleteTarget.gene_master_id)}
      onConfirm={() => {
        if (deleteTarget) void removeGene(deleteTarget);
      }}
      onCancel={() => setDeleteTarget(null)}
    />
    </>
  );
}

export default GeneMasterAdminModal;
