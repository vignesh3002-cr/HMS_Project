import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  Download,
  FilePlus2,
  Loader2,
  Pencil,
  Plus,
  Printer,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  pharmacyApi,
  PharmacyMasterItem,
  PharmacySlipItem,
  PharmacySlipRecord,
  SlipPreview,
} from "@/api/pharmacy.api";
import { chemotherapyApi, type MedicineOption } from "@/api/chemotherapy.api";
import { SingleSelectDropdown } from "@/components/ui/single-select-dropdown";
import { useToast } from "@/hooks/use-toast";
import { downloadExportPdf } from "@/lib/exportPdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface PharmacySlipProps {
  planId: string;
}

const DRUG_ROLE_LABELS: Record<string, string> = {
  PRIMARY: "Primary",
  PREMEDICATION: "Premedication",
  POSTMEDICATION: "Postmedication",
  SUPPORTIVE: "Supportive",
  ADVICE: "Advice",
  DISCHARGE: "Discharge",
};

const DOSE_UNITS = [
  "mg",
  "g",
  "mcg",
  "mL",
  "L",
  "mg/m²",
  "mg/kg",
  "AUC",
  "units",
  "IU",
  "tablets",
  "capsules",
  "puffs",
  "drops",
];

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-[#FFF7E6] text-[#8A6100] border-[#F2D999]",
  ISSUED: "bg-[#E7F6EC] text-[#1B6B3A] border-[#A9DCBB]",
  CANCELLED: "bg-[#FDECEC] text-[#A32020] border-[#F3B9B9]",
};

const display = (value: string | number | null | undefined, fallback = "—") => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text === "" ? fallback : text;
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Decimal columns arrive as strings like "500.0000"; normalise to "500".
const strengthFromMaster = (row: PharmacyMasterItem) =>
  row.strength_value != null && String(row.strength_value).trim() !== ""
    ? String(Number(row.strength_value))
    : "";

// A line as the table renders it.
interface SlipLine {
  pharmacy_slip_item_id: string;
  medicine_id?: string | null;
  medicineName: string;
  patientDose: string;
  brandName: string;
  strengthValue: string;
  strengthUnit: string;
  drugRole: string;
  quantity: string;
  pharmacy_item_id?: string | null;
}

function toLine(item: PharmacySlipItem): SlipLine {
  return {
    pharmacy_slip_item_id: item.pharmacy_slip_item_id,
    medicine_id: item.medicine_id ?? null,
    medicineName: display(item.drug_name),
    patientDose: display(item.patient_dose),
    brandName: item.brand_name || "",
    strengthValue: item.dose ?? "",
    strengthUnit: item.dose_unit ?? "mg",
    drugRole: item.drug_role ?? "PRIMARY",
    quantity: item.quantity === null || item.quantity === undefined ? "" : String(item.quantity),
    pharmacy_item_id: item.pharmacy_item_id ?? null,
  };
}

// A preview line has no persisted item yet, so it gets a placeholder id.
function fromResolved(line: SlipPreview["lines"][number], index: number): SlipLine {
  return {
    pharmacy_slip_item_id: `pending-${index}`,
    medicine_id: line.medicine_id ?? null,
    medicineName: display(line.drug_name),
    patientDose: display(line.patient_dose),
    brandName: line.brand_name || "",
    strengthValue: line.dose ?? "",
    strengthUnit: line.dose_unit ?? "mg",
    drugRole: line.drug_role ?? "PRIMARY",
    quantity: line.quantity === null || line.quantity === undefined ? "" : String(line.quantity),
    pharmacy_item_id: null,
  };
}

export function PharmacySlip({ planId }: PharmacySlipProps) {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<SlipPreview | null>(null);
  const [slip, setSlip] = useState<PharmacySlipRecord | null>(null);
  const [lines, setLines] = useState<SlipLine[]>([]);
  const [masterItems, setMasterItems] = useState<PharmacyMasterItem[]>([]);
  const [medicineOptions, setMedicineOptions] = useState<MedicineOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const status = slip?.slip_status ?? "DRAFT";
  const isPersisted = Boolean(slip);
  const editable = isPersisted && status === "DRAFT";
  const canPrint = isPersisted && status !== "CANCELLED";

  const masterItemsByMedId = useMemo(() => {
    const map = new Map<string, PharmacyMasterItem[]>();
    for (const item of masterItems) {
      if (!item.medicine_id) continue;
      const list = map.get(item.medicine_id) ?? [];
      list.push(item);
      map.set(item.medicine_id, list);
    }
    return map;
  }, [masterItems]);

  const load = useCallback(async () => {
    if (!planId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [res, masterRes, medRes] = await Promise.all([
        pharmacyApi.previewFromPlan(planId),
        pharmacyApi.getMasterItems().catch(() => ({ data: { data: [] } })),
        chemotherapyApi.listMedicines().catch(() => ({ data: { data: [] } })),
      ]);

      const data = res.data?.data;
      setMasterItems(masterRes.data?.data ?? []);
      setMedicineOptions(medRes.data?.data ?? []);

      if (!data) {
        setPreview(null);
        setSlip(null);
        setLines([]);
        return;
      }

      setPreview(data);

      const existing = data.existing_slip;
      setSlip(existing ?? null);
      setLines(existing?.pharmacy_slip_item?.map(toLine) ?? data.lines.map(fromResolved));
      setEditing(false);
    } catch (e: any) {
      toast({
        title: "Failed to load pharmacy slip",
        description: e?.response?.data?.message ?? e?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [planId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const patientName = useMemo(() => {
    const patient = slip?.patient_bio_data ?? null;
    return [patient?.patient_first_name, patient?.patient_last_name].filter(Boolean).join(" ") || "—";
  }, [slip]);

  const patientId = slip?.patient_id ?? preview?.patient_id ?? "—";
  const protocolName =
    slip?.regimen_name ?? slip?.protocol_name ?? preview?.regimen_name ?? preview?.protocol_name ?? "—";
  const cycleLabel = slip?.cycle_number ? `Cycle ${slip.cycle_number}, Day ${slip.cycle_day ?? "—"}` : null;
  const printedOn = formatDateTime(slip?.printed_at) ?? "Not printed yet";

  const updateLine = (id: string, patch: Partial<SlipLine>) => {
    setLines((prev) => prev.map((line) => (line.pharmacy_slip_item_id === id ? { ...line, ...patch } : line)));
  };

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((line) => line.pharmacy_slip_item_id !== id));
  };

  // The master row behind a line: matched by pharmacy_item_id when we have one,
  // otherwise by the selected brand (manufacturer) for the line's medicine.
  const findMasterRow = (line: SlipLine): PharmacyMasterItem | undefined => {
    const items = line.medicine_id ? masterItemsByMedId.get(line.medicine_id) ?? [] : [];
    if (line.pharmacy_item_id) {
      const byId = items.find((p) => p.pharmacy_item_id === line.pharmacy_item_id);
      if (byId) return byId;
    }
    return items.find((p) => p.manufacturer_name === line.brandName);
  };

  const onBrandChange = (id: string, brand: string) => {
    const line = lines.find((l) => l.pharmacy_slip_item_id === id);
    if (!line) return;
    const matching = line.medicine_id
      ? masterItemsByMedId.get(line.medicine_id)?.find((p) => p.manufacturer_name === brand)
      : undefined;

    // Dose and unit always follow the chosen brand. A custom brand has no master row,
    // so it keeps whatever dose/unit the line already had and clears the master link.
    updateLine(id, {
      brandName: brand,
      pharmacy_item_id: matching?.pharmacy_item_id ?? null,
      ...(matching
        ? {
            strengthValue: strengthFromMaster(matching),
            strengthUnit: matching.strength_unit || line.strengthUnit || "mg",
          }
        : {}),
    });
  };

  const handleAddMedicine = () => {
    const newId = `new-${Date.now()}`;
    setLines((prev) => [
      ...prev,
      {
        pharmacy_slip_item_id: newId,
        medicine_id: null,
        medicineName: "",
        patientDose: "—",
        brandName: "",
        strengthValue: "",
        strengthUnit: "mg",
        drugRole: "PRIMARY",
        quantity: "1",
      },
    ]);
  };

  const handleCreate = async () => {
    setSaving(true);

    try {
      const res = await pharmacyApi.createFromPlan({ plan_id: planId });
      toast({ title: res.data?.message ?? "Pharmacy slip created" });
      await load();
    } catch (e: any) {
      toast({
        title: "Could not create the pharmacy slip",
        description: e?.response?.data?.message ?? e?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!slip) return;

    setSaving(true);

    try {
      const itemsToSave: any[] = [];

      for (const line of lines) {
        let medId = line.medicine_id;
        // If newly added medicine and user entered a custom name not in medicine_master
        if (!medId && line.medicineName.trim()) {
          const found = medicineOptions.find(
            (m) => m.medicine_name.toLowerCase() === line.medicineName.trim().toLowerCase()
          );
          if (found) {
            medId = found.medicine_id;
          } else {
            try {
              const createRes = await pharmacyApi.createMedicine({
                medicine_name: line.medicineName.trim(),
              });
              medId = createRes.data?.data?.medicine_id ?? null;
              if (createRes.data?.data) {
                setMedicineOptions((prev) => [...prev, createRes.data.data]);
              }
            } catch (err) {
              console.error("Could not create medicine in medicine master:", err);
            }
          }
        }

        itemsToSave.push({
          pharmacy_slip_item_id:
            line.pharmacy_slip_item_id.startsWith("new-") || line.pharmacy_slip_item_id.startsWith("pending-")
              ? undefined
              : line.pharmacy_slip_item_id,
          medicine_id: medId ?? undefined,
          drug_name: line.medicineName.trim(),
          brand_name: line.brandName.trim() || null,
          dose: line.strengthValue.trim() || null,
          dose_unit: line.strengthUnit.trim() || null,
          quantity: line.quantity.trim() === "" ? null : Number(line.quantity),
          drug_role: line.drugRole,
          pharmacy_item_id: line.pharmacy_item_id ?? undefined,
        });
      }

      const res = await pharmacyApi.updateItems(slip.pharmacy_slip_id, {
        items: itemsToSave,
      });

      toast({ title: res.data?.message ?? "Pharmacy slip updated" });
      await load();
    } catch (e: any) {
      toast({
        title: "Could not save the pharmacy slip",
        description: e?.response?.data?.message ?? e?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!slip || cancelReason.trim() === "") return;

    setSaving(true);

    try {
      const res = await pharmacyApi.cancel(slip.pharmacy_slip_id, { reason: cancelReason.trim() });
      toast({ title: res.data?.message ?? "Pharmacy slip cancelled" });
      setCancelOpen(false);
      setCancelReason("");
      await load();
    } catch (e: any) {
      toast({
        title: "Could not cancel the pharmacy slip",
        description: e?.response?.data?.message ?? e?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async () => {
    if (!slip) return;

    setSaving(true);

    try {
      await pharmacyApi.markPrinted(slip.pharmacy_slip_id);
      await load();
    } catch (e: any) {
      toast({
        title: "Could not record the print",
        description: e?.response?.data?.message ?? e?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }

    printSlip();
  };

  const printSlip = () => {
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      window.alert("Please allow pop-ups to print this pharmacy slip.");
      return;
    }

    const headerRows = [
      ["Patient", patientName],
      ["Patient ID", patientId],
      ["Protocol", protocolName],
      ["Cycle", cycleLabel ?? "—"],
      ["Slip No", slip?.pharmacy_slip_id ?? "—"],
      ["Status", status],
    ]
      .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(String(value))}</td></tr>`)
      .join("");

    const bodyRows = lines
      .map(
        (line) => `<tr>
          <td>${escapeHtml(line.medicineName)}</td>
          <td>${escapeHtml(line.patientDose)}</td>
          <td>${escapeHtml(line.brandName || "—")}</td>
          <td>${escapeHtml(
            line.strengthValue ? `${line.strengthValue}${line.strengthUnit ? ` ${line.strengthUnit}` : ""}` : "—"
          )}</td>
          <td class="qty">${escapeHtml(line.quantity || "—")}</td>
          <td>${escapeHtml(DRUG_ROLE_LABELS[line.drugRole] ?? line.drugRole)}</td>
        </tr>`
      )
      .join("");

    printWindow.document.write(`<!DOCTYPE html><html><head><title>Pharmacy Slip ${
      slip?.pharmacy_slip_id ?? ""
    }</title><style>
      body { font-family: Inter, Arial, sans-serif; color: #1e293b; padding: 32px; font-size: 12px; }
      h1 { font-size: 18px; margin: 0 0 4px; }
      .meta { font-size: 11px; color: #64748b; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      .meta-table th, .meta-table td { text-align: left; padding: 3px 12px 3px 0; border: none; font-size: 11px; }
      .meta-table th { color: #64748b; font-weight: 600; width: 110px; }
      .lines-table th { text-align: left; background: #f1f5f9; padding: 8px; font-size: 11px; border: 1px solid #cbd5e1; }
      .lines-table td { padding: 8px; border: 1px solid #cbd5e1; }
      .lines-table .qty { text-align: right; }
      .foot { font-size: 10px; color: #64748b; margin-top: 16px; }
    </style></head><body>
      <h1>Pharmacy Slip</h1>
      <div class="meta">${escapeHtml(protocolName)} - ${escapeHtml(patientName)} (${escapeHtml(
        patientId
      )})</div>
      <table class="meta-table">${headerRows}</table>
      <table class="lines-table">
        <thead><tr><th>Medicine Name</th><th>Patient_dose</th><th>Brand</th><th>Dose</th><th style="text-align:right">Qty</th><th>Type</th></tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
      <div class="foot">Printed ${escapeHtml(formatDateTime(slip?.printed_at) ?? new Date().toLocaleString())}</div>
    </body></html>`);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleDownload = () => {
    downloadExportPdf({
      title: "Pharmacy Slip",
      subtitle: `${patientName} (${patientId}) - ${protocolName}`,
      filename: `pharmacy-slip-${slip?.pharmacy_slip_id ?? planId}.pdf`,
      columns: [
        { header: "Medicine Name", cell: (line: SlipLine) => line.medicineName },
        { header: "Patient_dose", cell: (line: SlipLine) => line.patientDose },
        { header: "Brand", cell: (line: SlipLine) => line.brandName || "—" },
        {
          header: "Dose",
          cell: (line: SlipLine) =>
            line.strengthValue ? `${line.strengthValue}${line.strengthUnit ? ` ${line.strengthUnit}` : ""}` : "—",
        },
        { header: "Qty", cell: (line: SlipLine) => line.quantity || "—" },
        { header: "Type", cell: (line: SlipLine) => DRUG_ROLE_LABELS[line.drugRole] ?? line.drugRole },
      ],
      rows: lines,
    });
  };

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col">
      {/* ==================== SLIP HEADER ==================== */}
      <div className="px-6 py-5 border-b border-[#E5E7EB] flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-[#191C1E]">Pharmacy Slip</h2>
            {isPersisted && (
              <span
                className={`px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-wide ${
                  STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT
                }`}
              >
                {status}
              </span>
            )}
          </div>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-xs text-[#374151]">
            <div>
              <span className="font-semibold text-[#6B7280]">Patient:</span> {patientName}
            </div>
            <div>
              <span className="font-semibold text-[#6B7280]">Patient ID:</span> {patientId}
            </div>
            <div>
              <span className="font-semibold text-[#6B7280]">Protocol:</span> {protocolName}
            </div>
            <div>
              <span className="font-semibold text-[#6B7280]">Cycle Day:</span>{" "}
              {cycleLabel ?? "—"}
            </div>
            <div>
              <span className="font-semibold text-[#6B7280]">Slip No:</span>{" "}
              {slip?.pharmacy_slip_id ?? "Not created"}
            </div>
            <div>
              <span className="font-semibold text-[#6B7280]">Printed:</span> {printedOn}
            </div>
          </div>
          {slip?.cancellation_reason && (
            <div className="mt-2 text-xs text-[#A32020]">
              <span className="font-semibold">Cancelled:</span> {slip.cancellation_reason}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap print:hidden">
          {!isPersisted && (
            <Button
              type="button"
              size="sm"
              onClick={handleCreate}
              disabled={saving || lines.length === 0}
              className="bg-[#004785] hover:bg-[#003a6b]"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FilePlus2 className="w-3.5 h-3.5" />}
              Create Slip
            </Button>
          )}

          {editable && !editing && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setEditing(true)}
              disabled={saving || lines.length === 0}
              className="text-[#374151] border-[#E5E7EB] hover:border-[#00488D]"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Slip
            </Button>
          )}

          {editing && (
            <>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="bg-[#004785] hover:bg-[#003a6b]"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  void load();
                }}
                disabled={saving}
                className="text-[#374151] border-[#E5E7EB] hover:border-[#00488D]"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </Button>
            </>
          )}

          {isPersisted && status !== "CANCELLED" && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setCancelOpen(true)}
              disabled={saving}
              className="text-red-600 border-[#E5E7EB] hover:bg-red-50 hover:border-red-200"
            >
              <Ban className="w-3.5 h-3.5" />
              Cancel Slip
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleDownload}
            disabled={lines.length === 0}
            className="text-[#374151] border-[#E5E7EB] hover:border-[#00488D]"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handlePrint}
            disabled={!canPrint || saving}
            title={canPrint ? "Print and finalise this slip" : "Create the slip before printing"}
            className="bg-[#004785] hover:bg-[#003a6b]"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
            Print
          </Button>
        </div>
      </div>

      {/* ==================== SLIP TABLE ==================== */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#6B7280] text-sm">
          <Loader2 size={24} className="animate-spin text-[#00488D]" />
          Loading pharmacy slip...
        </div>
      ) : lines.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 py-16 text-[#6B7280] text-sm">
          No medicines found for this order&apos;s protocol.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F7F9FB]">
                <th className="px-6 py-3 text-xs font-semibold text-[#6B7280]">Medicine Name</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#6B7280]">Patient_dose</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#6B7280]">Brand</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#6B7280]">Dose</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#6B7280] w-28">Qty</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#6B7280]">Type</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#6B7280] w-16 print:hidden">Action</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                if (!editing) {
                  return (
                    <tr key={line.pharmacy_slip_item_id} className="border-b border-[#E5E7EB] last:border-b-0">
                      <td className="px-6 py-3">
                        <div className="text-sm font-semibold text-[#191C1E]">{line.medicineName}</div>
                      </td>
                      <td className="px-6 py-3 text-sm text-[#374151]">
                        {line.patientDose || "—"}
                      </td>
                      <td className="px-6 py-3 text-sm text-[#374151]">
                        {line.brandName || "—"}
                      </td>
                      <td className="px-6 py-3 text-sm text-[#374151]">
                        {line.strengthValue
                          ? `${line.strengthValue}${line.strengthUnit ? ` ${line.strengthUnit}` : ""}`
                          : "—"}
                      </td>
                      <td className="px-6 py-3 text-sm text-[#374151]">
                        {line.quantity || "—"}
                      </td>
                      <td className="px-6 py-3 text-sm text-[#374151]">
                        {DRUG_ROLE_LABELS[line.drugRole] ?? line.drugRole}
                      </td>
                      <td className="px-6 py-3 print:hidden">
                        {editable ? (
                          <button
                            type="button"
                            onClick={() => removeLine(line.pharmacy_slip_item_id)}
                            className="flex items-center justify-center p-1.5 border border-[#E5E7EB] rounded-md text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
                            aria-label={`Remove ${line.medicineName}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                }

                // Edit mode row
                const isNew =
                  line.pharmacy_slip_item_id.startsWith("new-") ||
                  line.pharmacy_slip_item_id.startsWith("pending-");
                const availablePharmItems = line.medicine_id
                  ? masterItemsByMedId.get(line.medicine_id) ?? []
                  : [];
                const mfrs = Array.from(
                  new Set(availablePharmItems.map((p) => p.manufacturer_name).filter(Boolean))
                ) as string[];

                return (
                  <tr
                    key={line.pharmacy_slip_item_id}
                    className="border-b border-[#E5E7EB] last:border-b-0 bg-[#FAFAFA]/60"
                  >
                    {/* Medicine Name */}
                    <td className="px-6 py-3 min-w-[220px]">
                      {isNew ? (
                        <SingleSelectDropdown
                          options={medicineOptions.map((m) => ({
                            label: m.medicine_name,
                            value: m.medicine_id,
                            hint: m.dosage_form || undefined,
                          }))}
                          value={line.medicine_id ?? ""}
                          valueLabel={line.medicineName}
                          onValueChange={(medId) => {
                            const med = medicineOptions.find((m) => m.medicine_id === medId);
                            if (!med) return;
                            const items = masterItemsByMedId.get(medId) ?? [];
                            // Default to the first brand; its dose and unit fill in from the master row.
                            const firstPharm = items[0];
                            updateLine(line.pharmacy_slip_item_id, {
                              medicine_id: med.medicine_id,
                              medicineName: med.medicine_name,
                              brandName: firstPharm?.manufacturer_name || "",
                              strengthValue: firstPharm ? strengthFromMaster(firstPharm) : "",
                              strengthUnit: firstPharm?.strength_unit || "mg",
                              pharmacy_item_id: firstPharm?.pharmacy_item_id || null,
                            });
                          }}
                          onCreateOption={(typed) => {
                            updateLine(line.pharmacy_slip_item_id, {
                              medicine_id: null,
                              medicineName: typed.trim(),
                              pharmacy_item_id: null,
                            });
                          }}
                          placeholder="Select medicine or type new..."
                          createLabel="+ Add to master"
                          className="h-8 text-xs min-w-[200px]"
                        />
                      ) : (
                        <div className="text-sm font-semibold text-[#191C1E]">{line.medicineName}</div>
                      )}
                    </td>

                    {/* Patient_dose */}
                    <td className="px-6 py-3 text-sm text-[#374151]">
                      {line.patientDose || "—"}
                    </td>

                    {/* Brand */}
                    <td className="px-6 py-3 min-w-[170px]">
                      <SingleSelectDropdown
                        options={mfrs.map((m) => ({ label: m, value: m }))}
                        value={line.brandName}
                        valueLabel={line.brandName}
                        onValueChange={(selectedBrand) => {
                          onBrandChange(line.pharmacy_slip_item_id, selectedBrand);
                        }}
                        onCreateOption={(typedBrand) => {
                          updateLine(line.pharmacy_slip_item_id, {
                            brandName: typedBrand.trim(),
                            pharmacy_item_id: null,
                          });
                        }}
                        placeholder="Select brand..."
                        createLabel="Use custom"
                        className="h-8 text-xs min-w-[150px]"
                      />
                    </td>

                    {/* Dose + unit: fetched from the selected brand's master row; typed only when it has none */}
                    <td className="px-6 py-3">
                      {(() => {
                        const master = findMasterRow(line);
                        const doseFromMaster = master?.strength_value != null;
                        const unitFromMaster = Boolean(master?.strength_unit);
                        const readOnlyBox =
                          "h-8 flex items-center rounded-md border border-[#E5E7EB] bg-[#F2F4F6] px-2 text-xs text-[#374151]";
                        return (
                          <div className="flex items-center gap-1.5 min-w-[180px]">
                            {doseFromMaster ? (
                              <div className={`${readOnlyBox} w-20`} title="From brand strength">
                                {line.strengthValue || "—"}
                              </div>
                            ) : (
                              <Input
                                type="text"
                                value={line.strengthValue}
                                onChange={(e) =>
                                  updateLine(line.pharmacy_slip_item_id, { strengthValue: e.target.value })
                                }
                                placeholder="Dose"
                                className="h-8 w-20 text-xs"
                              />
                            )}
                            {unitFromMaster ? (
                              <div className={`${readOnlyBox}`} title="From brand strength unit">
                                {line.strengthUnit}
                              </div>
                            ) : (
                              <select
                                value={line.strengthUnit}
                                onChange={(e) =>
                                  updateLine(line.pharmacy_slip_item_id, { strengthUnit: e.target.value })
                                }
                                className="h-8 rounded-md border border-[#E5E7EB] bg-white px-2 text-xs text-[#374151] focus:border-[#00488D] outline-none"
                              >
                                {DOSE_UNITS.map((unit) => (
                                  <option key={unit} value={unit}>
                                    {unit}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        );
                      })()}
                    </td>

                    {/* Qty */}
                    <td className="px-6 py-3">
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(line.pharmacy_slip_item_id, { quantity: e.target.value })
                        }
                        placeholder="—"
                        className="h-8 w-20 text-xs"
                      />
                    </td>

                    {/* Type */}
                    <td className="px-6 py-3 min-w-[130px]">
                      <select
                        value={line.drugRole}
                        onChange={(e) =>
                          updateLine(line.pharmacy_slip_item_id, { drugRole: e.target.value })
                        }
                        className="h-8 rounded-md border border-[#E5E7EB] bg-white px-2 text-xs text-[#374151] focus:border-[#00488D] outline-none"
                      >
                        {Object.entries(DRUG_ROLE_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Delete Action */}
                    <td className="px-6 py-3 print:hidden">
                      <button
                        type="button"
                        onClick={() => removeLine(line.pharmacy_slip_item_id)}
                        className="flex items-center justify-center p-1.5 border border-[#E5E7EB] rounded-md text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
                        aria-label={`Remove ${line.medicineName}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {editing && (
            <div className="p-4 border-t border-[#E5E7EB] bg-[#F7F9FB] flex items-center justify-start print:hidden">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddMedicine}
                className="inline-flex items-center gap-1.5 border-dashed border-[#004785] text-[#004785] hover:bg-blue-50 text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Medicine
              </Button>
            </div>
          )}
        </div>
      )}

      {!editing && isPersisted && status === "ISSUED" && (
        <div className="px-6 py-3 border-t border-[#E5E7EB] bg-[#F7F9FB] text-xs text-[#6B7280]">
          This slip was printed on {formatDateTime(slip?.printed_at) ?? "—"} and can no longer be edited. Cancel it to
          print a replacement.
        </div>
      )}

      {/* ==================== CANCEL DIALOG ==================== */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel pharmacy slip</DialogTitle>
            <DialogDescription>
              Cancelling frees this cycle day for a replacement slip. The reason is recorded in the audit
              trail.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="e.g. Prepared against the wrong cycle day"
            autoFocus
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCancelOpen(false)} disabled={saving}>
              Keep Slip
            </Button>
            <Button
              type="button"
              onClick={handleCancel}
              disabled={saving || cancelReason.trim() === ""}
              className="bg-red-600 hover:bg-red-700"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
              Cancel Slip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PharmacySlip;
