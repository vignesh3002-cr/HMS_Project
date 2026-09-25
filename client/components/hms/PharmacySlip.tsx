import { useEffect, useMemo, useState } from "react";
import { Loader2, Printer, Download, Trash2 } from "lucide-react";
import { chemotherapyApi } from "@/api/chemotherapy.api";
import { useToast } from "@/hooks/use-toast";
import { downloadExportPdf } from "@/lib/exportPdf";

export interface PharmacySlipProps {
  planId: string;
}

interface SlipRow {
  id: string;
  medicineName: string;
  brandName: string;
  dose: string;
  type: string;
  qty: string;
}

const DRUG_ROLE_LABELS: Record<string, string> = {
  PRIMARY: "Primary",
  PREMEDICATION: "Premedication",
  POSTMEDICATION: "Postmedication",
  SUPPORTIVE: "Supportive",
};

function formatDose(
  dose: string | number | null | undefined,
  doseUnit: string | null | undefined,
  fallbackDose: string | number | null | undefined,
): string {
  if (dose !== null && dose !== undefined && String(dose).trim() !== "") {
    return `${dose}${doseUnit ? ` ${doseUnit}` : ""}`;
  }
  if (fallbackDose !== null && fallbackDose !== undefined && String(fallbackDose).trim() !== "") {
    return `${fallbackDose}${doseUnit ? ` ${doseUnit}` : ""}`;
  }
  return "—";
}

export function PharmacySlip({ planId }: PharmacySlipProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SlipRow[]>([]);
  const [patientName, setPatientName] = useState("");
  const [patientId, setPatientId] = useState("");
  const [protocolName, setProtocolName] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const planRes = await chemotherapyApi.getPlan(planId);
        if (cancelled) return;
        const plan = planRes.data?.data;
        if (!plan) return;

        const patient = plan.patient_bio_data;
        setPatientName(
          [patient?.patient_first_name, patient?.patient_last_name].filter(Boolean).join(" ") || "—",
        );
        setPatientId(plan.patient_id ?? "—");
        setProtocolName(plan.regimen_name ?? plan.protocol_name ?? "—");

        // The order's own medicine list -- always present, regardless of
        // whether the order was derived from a saved regimen protocol.
        const planItemRows: SlipRow[] = (plan.chemotherapy_plan_items ?? []).map((item) => ({
          id: `plan-item-${item.chemotherapy_plan_item_id}`,
          medicineName: item.medicine_master?.medicine_name ?? "—",
          brandName: item.medicine_master?.brand_name ?? "—",
          dose: formatDose(item.calculated_dose, item.protocol_dose_unit, item.protocol_dose),
          type: DRUG_ROLE_LABELS[item.drug_role ?? ""] ?? item.drug_type ?? item.drug_role ?? "—",
          qty: "",
        }));

        // Take-home discharge medicines only exist at the protocol level, so
        // they're only available when this order was built from a saved
        // regimen protocol (source_protocol_id set).
        const protocolId = plan.chemotherapy_regimen_protocol?.protocol_id;
        let dischargeRows: SlipRow[] = [];
        if (protocolId) {
          const protocolRes = await chemotherapyApi.getRegimenProtocol(protocolId);
          if (cancelled) return;
          const protocol = protocolRes.data?.data;
          dischargeRows = (protocol?.protocol_discharge_instructions ?? []).map((d) => ({
            id: `discharge-${d.discharge_instruction_id}`,
            medicineName: d.medicine_master?.medicine_name ?? "—",
            brandName: d.drug_brand_name ?? "—",
            dose: formatDose(d.patient_dose, d.patient_dose_unit, null),
            type: "Discharge",
            qty: "",
          }));
        }

        setRows([...planItemRows, ...dischargeRows]);
      } catch (e: any) {
        if (!cancelled) {
          toast({
            title: "Failed to load pharmacy slip",
            description: e?.response?.data?.message ?? e?.message ?? "Please try again.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (planId) void load();
    else setLoading(false);

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  const handleQtyChange = (id: string, value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, qty: value } : r)));
  };

  const handleDelete = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const printedOn = useMemo(() => new Date().toLocaleString(), []);

  const handlePrint = () => window.print();

  const handleDownload = () => {
    downloadExportPdf({
      title: "Pharmacy Slip",
      subtitle: `${patientName} (${patientId}) - ${protocolName}`,
      filename: `pharmacy-slip-${planId}.pdf`,
      columns: [
        { header: "Medicine Name", cell: (r: SlipRow) => r.medicineName },
        { header: "Brand Name", cell: (r: SlipRow) => r.brandName },
        { header: "Dose", cell: (r: SlipRow) => r.dose },
        { header: "Qty", cell: (r: SlipRow) => r.qty || "—" },
        { header: "Type", cell: (r: SlipRow) => r.type },
      ],
      rows,
    });
  };

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col">
      {/* ==================== SLIP HEADER ==================== */}
      <div className="px-6 py-5 border-b border-[#E5E7EB] flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#191C1E]">Pharmacy Slip</h2>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-xs text-[#374151]">
            <div><span className="font-semibold text-[#6B7280]">Patient:</span> {patientName || "—"}</div>
            <div><span className="font-semibold text-[#6B7280]">Patient ID:</span> {patientId || "—"}</div>
            <div><span className="font-semibold text-[#6B7280]">Protocol:</span> {protocolName || "—"}</div>
            <div><span className="font-semibold text-[#6B7280]">Order ID:</span> {planId}</div>
            <div><span className="font-semibold text-[#6B7280]">Printed:</span> {printedOn}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-1.5 border border-[#E5E7EB] rounded-md text-xs font-semibold text-[#374151] hover:border-[#00488D] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#004785] rounded-md text-white text-xs font-semibold shadow-sm hover:bg-[#003a6b] transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
        </div>
      </div>

      {/* ==================== SLIP TABLE ==================== */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#6B7280] text-sm">
          <Loader2 size={24} className="animate-spin text-[#00488D]" />
          Loading pharmacy slip...
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 py-16 text-[#6B7280] text-sm">
          No medicines found for this order's protocol.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F7F9FB]">
                <th className="px-6 py-3 text-xs font-semibold text-[#6B7280]">Medicine Name</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#6B7280]">Brand Name</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#6B7280]">Dose</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#6B7280] w-28">Qty</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#6B7280]">Type</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#6B7280] w-16 print:hidden">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-[#E5E7EB] last:border-b-0">
                  <td className="px-6 py-3 text-sm font-semibold text-[#191C1E]">{row.medicineName}</td>
                  <td className="px-6 py-3 text-sm text-[#374151]">{row.brandName}</td>
                  <td className="px-6 py-3 text-sm text-[#374151]">{row.dose}</td>
                  <td className="px-6 py-3 text-sm text-[#374151]">
                    <input
                      type="text"
                      value={row.qty}
                      onChange={(e) => handleQtyChange(row.id, e.target.value)}
                      placeholder="—"
                      className="w-20 px-2 py-1 bg-[#F2F4F6] text-xs text-[#191C1E] outline-none rounded-md border border-transparent focus:border-[#00488D] focus:bg-white print:bg-transparent print:border-none"
                    />
                  </td>
                  <td className="px-6 py-3 text-sm text-[#374151]">{row.type}</td>
                  <td className="px-6 py-3 print:hidden">
                    <button
                      type="button"
                      onClick={() => handleDelete(row.id)}
                      className="flex items-center justify-center p-1.5 border border-[#E5E7EB] rounded-md text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
                      aria-label={`Remove ${row.medicineName}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PharmacySlip;
