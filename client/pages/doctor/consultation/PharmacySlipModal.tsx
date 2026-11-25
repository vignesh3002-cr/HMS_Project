import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getActiveTimezone } from "@/utils/timezone";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Loader2,
  Lock,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { SingleSelectDropdown } from "@/components/ui/single-select-dropdown";
import { pharmacyApi, type PharmacyMasterItem, type PharmacySlipRecord } from "@/api/pharmacy.api";
import {
  applySavedSlip,
  buildBrandOptions,
  buildDraftRowsFromSaved,
  cloneDraftRow,
  computeRemovedRowKeys,
  createDraftRow,
  effectiveBaseQuantity,
  effectiveExtraQuantity,
  formatNumber,
  parseDoseText,
  pickDefaultStrength,
  savedSlipHasRowKeys,
  slipFrequencyDuration,
  slipRoleLabel,
  suggestionFor,
  strengthsOfBrand,
  toDisplayRows,
  toSlipOrderItems,
  type QuantityExtra,
  type SlipDisplayRow,
  type SlipDraftRow,
  type SlipSourceRow,
} from "./pharmacySlip";

/* ============================================================
   PHARMACY SLIP POPUP (Discharge Medication step)

   One row per medicine of the current cycle day's Chemotherapy Order
   plus the discharge medicines. The doctor picks a brand (from
   pharmacy_master, matched on the ordered medicine's generic_id +
   dosage_form), then a strength from that brand. The quantity is
   allocated so selected + top-up cover the patient's dose; a brand
   with no smaller strength folds the shortfall into the first row.
============================================================ */

export interface PharmacySlipModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  cycleNumber: number;
  cycleDay: number;
  /* Printed in the sheet header so the page is dispensable on its own. */
  patientId?: string | null;
  encounterNo?: string | null;
  appointmentId?: string | null;
  /* Order + discharge medicines, already flattened and role-ordered. */
  sourceRows: SlipSourceRow[];
  /* True while the order itself is still loading in the parent. */
  loading?: boolean;
  error?: string;
}

const ROLE_BADGE: Record<string, string> = {
  PRIMARY: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  PREMEDICATION: "bg-sky-50 text-sky-700 ring-sky-200",
  SUPPORTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  POSTMEDICATION: "bg-amber-50 text-amber-700 ring-amber-200",
  DISCHARGE: "bg-violet-50 text-violet-700 ring-violet-200",
};

const INPUT_CLASS =
  "w-full rounded-md border border-[#D8DEE6] bg-white px-2.5 py-1.5 text-[11px] text-[#191C1E] outline-none transition-colors placeholder:text-[#9AA4B2] focus:border-[#00488D] focus:ring-2 focus:ring-[#00488D]/15 disabled:cursor-not-allowed disabled:bg-[#F4F6F9] disabled:text-[#6B7280]";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function PharmacySlipModal({
  open,
  onOpenChange,
  planId,
  cycleNumber,
  cycleDay,
  patientId,
  encounterNo,
  appointmentId,
  sourceRows,
  loading = false,
  error,
}: PharmacySlipModalProps) {
  const [rows, setRows] = useState<SlipDraftRow[]>([]);
  const [savedSlip, setSavedSlip] = useState<PharmacySlipRecord | null>(null);
  const [loadingRows, setLoadingRows] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [dirty, setDirty] = useState(false);
  /* Row keys that were on the slip when it opened (or were added since), so a
     removed ordered row stays removed when the slip is saved again. */
  const [knownRowKeys, setKnownRowKeys] = useState<string[]>([]);
  const [masterItems, setMasterItems] = useState<PharmacyMasterItem[]>([]);
  /* A chemotherapy row whose REMOVE is waiting for confirmation. */
  const [pendingRemoval, setPendingRemoval] = useState<SlipDraftRow | null>(null);

  const readOnly = savedSlip?.slip_status === "ISSUED";

  /* The parent rebuilds `sourceRows` on every discharge-table change. Reload
     only when the rows really changed, so an unrelated re-render cannot wipe
     the brands and quantities the doctor already picked. */
  const sourceSignature = useMemo(
    () =>
      sourceRows
        .map((row) =>
          [
            row.key,
            row.medicineId,
            row.drugForm,
            row.patientDose,
            row.frequency,
            row.duration,
            row.durationUnit ?? "",
            row.instructions,
          ].join("|")
        )
        .join("~"),
    [sourceRows]
  );

  const sourceRowsRef = useRef(sourceRows);
  sourceRowsRef.current = sourceRows;

  /* ------------------------------------------------------------
     Load brands + the slip that may already exist for this day.
     ------------------------------------------------------------ */
  useEffect(() => {
    if (!open || loading) return;

    let cancelled = false;
    setLoadingRows(true);
    setLoadError("");
    setSaveError("");
    setSaveMessage("");
    setDirty(false);

    const rowsForLoad = sourceRowsRef.current;

    const medicineIds = Array.from(
      new Set(rowsForLoad.map((row) => row.medicineId).filter(Boolean))
    );

    const genericIds = Array.from(
      new Set(rowsForLoad.map((row) => row.genericId).filter(Boolean))
    );

    const masterRequest =
      medicineIds.length || genericIds.length
        ? pharmacyApi.masterItems(medicineIds, genericIds)
        : Promise.resolve({ data: { data: [] as PharmacyMasterItem[] } });

    Promise.all([
      masterRequest,
      planId
        ? pharmacyApi.getByOrder(planId, cycleNumber, cycleDay)
        : Promise.resolve({ data: { data: null as PharmacySlipRecord | null } }),
    ])
      .then(async ([masterResponse, slipResponse]) => {
        if (cancelled) return;

        const saved = slipResponse.data.data ?? null;
        const savedItems = saved?.pharmacy_slip_item ?? [];
        let master: PharmacyMasterItem[] = masterResponse.data.data ?? [];

        /* Saved lines can belong to a medicine the current order no longer
           lists (removed after the slip was saved). Fetch its master rows so
           its brand / strengths still resolve instead of showing an empty
           dropdown. */
        const missingMedicineIds = Array.from(
          new Set(
            savedItems
              .map((item) => item.medicine_id)
              .filter((id): id is string => Boolean(id))
              .filter((id) => !master.some((row) => row.medicine_id === id))
          )
        );

        if (missingMedicineIds.length > 0) {
          const extra = await pharmacyApi.masterItems(missingMedicineIds, []);
          if (cancelled) return;
          master = [...master, ...(extra.data.data ?? [])];
        }

        const sourceKeys = rowsForLoad.map((row) => row.key);
        const savedKeys = savedItems
          .map((item) => item.source_row_key)
          .filter((key): key is string => Boolean(key));
        const removedKeys = Array.isArray(saved?.removed_row_keys)
          ? saved.removed_row_keys
          : [];

        let nextRows: SlipDraftRow[];

        if (savedItems.length > 0 && savedSlipHasRowKeys(savedItems)) {
          /* Rows the doctor added / removed in the popup are rebuilt exactly
             from the saved lines and the slip's removed-row list. */
          nextRows = buildDraftRowsFromSaved({
            sourceRows: rowsForLoad,
            savedItems,
            removedKeys,
            masterItems: master,
          });
        } else {
          nextRows = rowsForLoad.map((row) =>
            createDraftRow(row, buildBrandOptions(row, master))
          );

          if (savedItems.length > 0) {
            nextRows = applySavedSlip(nextRows, savedItems);
          }
        }

        setMasterItems(master);
        setRows(nextRows);
        setKnownRowKeys(
          Array.from(new Set([...sourceKeys, ...savedKeys, ...removedKeys]))
        );
        setSavedSlip(saved);
      })
      .catch((requestError: any) => {
        if (cancelled) return;
        console.error("Failed to load the pharmacy slip:", requestError);
        setLoadError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            "Failed to load the pharmacy slip."
        );
        // Still show the order rows so the doctor can work.
        setMasterItems([]);
        setRows(rowsForLoad.map((row) => createDraftRow(row, [])));
        setKnownRowKeys(rowsForLoad.map((row) => row.key));
      })
      .finally(() => {
        if (!cancelled) setLoadingRows(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, loading, planId, cycleNumber, cycleDay, sourceSignature]);

  /* Closing discards the draft: the next open re-reads the order and the
     saved slip, so a stale brand never flashes before the reload. */
  useEffect(() => {
    if (open) return;

    setRows([]);
    setSavedSlip(null);
    setLoadError("");
    setSaveError("");
    setSaveMessage("");
    setDirty(false);
    setMasterItems([]);
    setKnownRowKeys([]);
    setPendingRemoval(null);
  }, [open]);

  const updateRow = useCallback(
    (key: string, patch: (row: SlipDraftRow) => Partial<SlipDraftRow>) => {
      setRows((current) =>
        current.map((row) => (row.key === key ? { ...row, ...patch(row) } : row))
      );
      setDirty(true);
      setSaveMessage("");
    },
    []
  );

  const changeBrand = (key: string, brandLabel: string) => {
    updateRow(key, (row) => {
      const strengths =
        row.brandOptions.find((brand) => brand.label === brandLabel)?.strengths ?? [];
      const best = pickDefaultStrength(
        row.patientDoseValue,
        row.patientDoseUnit,
        strengths
      );

      return {
        brand: brandLabel,
        strengthLabel: best?.label ?? "",
        selectedDose: best ? formatNumber(best.value) : "",
        selectedUnit: best?.unit ?? "",
        pharmacyItemId: best?.pharmacyItemId ?? "",
        quantityOverride: "",
        extraQuantityOverride: "",
        extraSuppressed: false,
      };
    });
  };

  const changeStrength = (key: string, label: string) => {
    updateRow(key, (row) => {
      const strength = strengthsOfBrand(row).find((entry) => entry.label === label);
      return {
        strengthLabel: label,
        selectedDose: strength ? formatNumber(strength.value) : "",
        selectedUnit: strength?.unit ?? "",
        pharmacyItemId: strength?.pharmacyItemId ?? "",
        quantityOverride: "",
        extraQuantityOverride: "",
        extraSuppressed: false,
      };
    });
  };

  /* Typed drugs (and brands without strength data) take a free dose text. */
  const changeManualDose = (key: string, value: string) => {
    const parsed = parseDoseText(value);
    updateRow(key, () => ({
      strengthLabel: "",
      selectedDose: parsed.value === null ? "" : formatNumber(parsed.value),
      selectedUnit: parsed.unit,
      pharmacyItemId: "",
      quantityOverride: "",
      extraQuantityOverride: "",
      extraSuppressed: false,
    }));
  };

  /* ------------------------------------------------------------
     ADD / REMOVE ROWS

     ADD copies the row directly below it: same drug, form, patient dose,
     brand, F/D and type; the dosage (from the copied brand's strengths) and
     the quantity stay editable. REMOVE drops the row from this slip only -
     the chemotherapy order and the Discharge Medication table are untouched.
     ------------------------------------------------------------ */

  const addedRowSeq = useRef(0);

  const nextRowKey = () => {
    addedRowSeq.current += 1;
    return `ADD:${Date.now().toString(36)}:${addedRowSeq.current}`;
  };

  const insertAfter = (row: SlipDraftRow, added: SlipDraftRow) => {
    setRows((current) => {
      const index = current.findIndex((entry) => entry.key === row.key);
      const next = [...current];
      next.splice(index === -1 ? next.length : index + 1, 0, added);
      return next;
    });
    setKnownRowKeys((current) =>
      current.includes(added.sourceRowKey)
        ? current
        : [...current, added.sourceRowKey]
    );
    setDirty(true);
    setSaveMessage("");
  };

  const addRow = (row: SlipDraftRow) => {
    if (readOnly || saving) return;
    insertAfter(row, cloneDraftRow(row, nextRowKey()));
  };

  /* ADD on the automatic top-up line makes the top-up strength its own row
     with the same quantity, so the pharmacist can adjust it independently. */
  const addTopUpRow = (row: SlipDraftRow, extra: QuantityExtra) => {
    if (readOnly || saving) return;

    const clone = cloneDraftRow(row, nextRowKey());
    const quantity = effectiveExtraQuantity(row, suggestionFor(row));

    insertAfter(row, {
      ...clone,
      strengthLabel: extra.strength.label,
      selectedDose: formatNumber(extra.strength.value),
      selectedUnit: extra.strength.unit,
      pharmacyItemId: extra.strength.pharmacyItemId,
      quantityOverride: quantity === null ? "" : String(quantity),
      extraQuantityOverride: "",
      extraSuppressed: true,
    });
  };

  const removeRow = (row: SlipDraftRow) => {
    if (readOnly || saving) return;
    setRows((current) => current.filter((entry) => entry.key !== row.key));
    setDirty(true);
    setSaveMessage("");
  };

  /* A chemotherapy row is confirmed first: a slip that quietly loses a
     primary drug is clinically significant. */
  const requestRemove = (row: SlipDraftRow) => {
    if (readOnly || saving) return;
    if (row.role === "PRIMARY") {
      setPendingRemoval(row);
      return;
    }
    removeRow(row);
  };

  /* Removes a row's automatic top-up line; Reset suggestions brings it back. */
  const suppressExtra = (row: SlipDraftRow) => {
    if (readOnly || saving) return;
    updateRow(row.key, () => ({
      extraSuppressed: true,
      extraQuantityOverride: "",
    }));
  };

  /* Re-adds ordered rows the doctor removed and puts the slip back in the
     order's sequence, keeping the choices already made and the added copies. */
  const restoreRows = () => {
    if (readOnly || saving) return;

    const currentByKey = new Map(rows.map((row) => [row.sourceRowKey, row]));
    const clonesByOrigin = new Map<string, SlipDraftRow[]>();

    for (const row of rows) {
      if (!row.isAdded) continue;
      const list = clonesByOrigin.get(row.originKey) ?? [];
      list.push(row);
      clonesByOrigin.set(row.originKey, list);
    }

    const next: SlipDraftRow[] = [];
    const seen = new Set<string>();

    for (const source of sourceRowsRef.current) {
      next.push(
        currentByKey.get(source.key) ??
          createDraftRow(source, buildBrandOptions(source, masterItems))
      );
      seen.add(source.key);
      next.push(...(clonesByOrigin.get(source.key) ?? []));
    }

    /* Rows whose ordered source is no longer on the order stay put. */
    for (const row of rows) {
      if (row.isAdded) {
        if (!seen.has(row.originKey)) next.push(row);
      } else if (!seen.has(row.sourceRowKey)) {
        next.push(row);
      }
    }

    setRows(next);
    setKnownRowKeys(sourceRowsRef.current.map((row) => row.key));
    setDirty(true);
    setSaveMessage("");
    setSaveError("");
  };

  const removedRowKeys = useMemo(
    () => computeRemovedRowKeys(knownRowKeys, rows),
    [knownRowKeys, rows]
  );

  const blockers = useMemo(
    () =>
      rows
        .map((row) => {
          if (!row.medicineId) return "";
          const plan = suggestionFor(row);
          const quantity = effectiveBaseQuantity(row, plan);
          if (row.brandOptions.length > 0 && !row.brand)
            return `Select a brand for ${row.drugName}.`;
          if (!row.selectedDose) return `Select a dosage for ${row.drugName}.`;
          if (quantity === null)
            return `The quantity for ${row.drugName} has to be entered manually.`;
          return "";
        })
        .filter(Boolean),
    [rows]
  );

  const warnings = useMemo(
    () =>
      rows
        .flatMap((row) => {
          const rowWarnings: string[] = [];

          if (row.medicineId && row.brandOptions.length === 0) {
            rowWarnings.push(
              `No pharmacy brand found for ${row.drugName} (${row.drugForm || "no form"}). Enter its dosage manually.`
            );
          }

          const quantityWarning = suggestionFor(row).warning;
          if (quantityWarning) rowWarnings.push(quantityWarning);

          /* A discharge row with neither direction would print an empty F/D
             cell, which looks like a slip error rather than a missing value. */
          if (
            row.role === "DISCHARGE" &&
            !row.frequency.trim() &&
            !row.duration.trim()
          ) {
            rowWarnings.push(
              `No frequency / duration for ${row.drugName}. Add them in Discharge Medication so the pharmacist has directions.`
            );
          }

          return rowWarnings;
        })
        .filter(Boolean)
        .filter((warning, index, all) => all.indexOf(warning) === index),
    [rows]
  );

  const displayRows = useMemo(
    () =>
      rows.map((row) => {
        const plan = suggestionFor(row);
        const showExtra = Boolean(
          plan.extra &&
            !row.extraSuppressed &&
            effectiveExtraQuantity(row, plan) !== null
        );
        return { row, plan, showExtra };
      }),
    [rows]
  );

  /* Counts for the summary strip: how many medicines, how many slip lines,
     and how many rows still need a brand / dose / quantity from the doctor. */
  const summary = useMemo(() => {
    let missingBrand = 0;
    let missingDose = 0;
    let missingQuantity = 0;

    for (const row of rows) {
      if (row.medicineId && row.brandOptions.length === 0) missingBrand += 1;
      if (!row.selectedDose) missingDose += 1;
      if (effectiveBaseQuantity(row, suggestionFor(row)) === null) missingQuantity += 1;
    }

    return {
      medicines: rows.length,
      lines: displayRows.filter((entry) => entry.showExtra).length + rows.length,
      missingBrand,
      missingDose,
      missingQuantity,
    };
  }, [rows, displayRows]);

  /* Continuous "No." across the base lines and the top-up lines. */
  const rowNumbers = useMemo(() => {
    const numbers = new Map<string, { base: number; extra?: number }>();
    let no = 0;

    for (const { row, showExtra } of displayRows) {
      const base = ++no;
      const extra = showExtra ? ++no : undefined;
      numbers.set(row.key, { base, extra });
    }

    return numbers;
  }, [displayRows]);

  const handleSave = async () => {
    if (saving || readOnly) return;

    if (blockers.length > 0) {
      setSaveError(blockers[0]);
      return;
    }

    if (!planId) {
      setSaveError("The patient's chemotherapy plan could not be resolved.");
      return;
    }

    try {
      setSaving(true);
      setSaveError("");
      setSaveMessage("");

      const response = await pharmacyApi.saveFromOrder({
        plan_id: planId,
        cycle_number: cycleNumber,
        cycle_day: cycleDay,
        encounter_no: encounterNo ?? null,
        appointment_id: appointmentId ?? null,
        removed_row_keys: removedRowKeys,
        items: toSlipOrderItems(rows),
      });

      setSavedSlip(response.data.data);
      setDirty(false);
      setSaveMessage("Pharmacy slip saved.");
    } catch (requestError: any) {
      console.error("Failed to save the pharmacy slip:", requestError);
      setSaveError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Failed to save the pharmacy slip."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setRows((current) => current.map((row) => ({
      ...row,
      quantityOverride: "",
      extraQuantityOverride: "",
      extraSuppressed: false,
    })));
    setDirty(true);
    setSaveMessage("");
    setSaveError("");
  };

  const handlePrint = () => {
    const printable: SlipDisplayRow[] = toDisplayRows(rows);

    const printWindow = window.open("", "_blank", "width=1100,height=800");
    if (!printWindow) return;

    const bodyRows = printable
      .map(
        (row) => `
          <tr>
            <td>${row.no}</td>
            <td>${escapeHtml(row.drugName)}${
              row.instructions
                ? `<br /><span class="drug-note">${escapeHtml(row.instructions)}</span>`
                : ""
            }</td>
            <td>${escapeHtml(row.drugForm)}</td>
            <td>${escapeHtml(row.patientDose)}</td>
            <td>${escapeHtml(row.brand)}</td>
            <td>${escapeHtml(row.dose)}</td>
            <td>${escapeHtml(row.quantity)}</td>
            <td>${escapeHtml(row.frequencyDuration)}</td>
            <td>${escapeHtml(row.type)}</td>
          </tr>`
      )
      .join("");

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Pharmacy Slip - Cycle ${cycleNumber} / Day ${cycleDay}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; margin: 24px; color: #191C1E; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    p { margin: 0 0 16px; font-size: 11px; color: #4B5563; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { text-align: left; text-transform: uppercase; letter-spacing: .04em; background: #F2F4F6; }
    th, td { border: 1px solid #D8DEE6; padding: 6px 8px; }
    tr:nth-child(even) td { background: #FAFBFC; }
    .drug-note { display: block; margin-top: 2px; font-size: 9px; color: #6B7280; }
    .foot { margin-top: 20px; font-size: 9px; color: #6B7280; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <h1>Pharmacy Slip</h1>
  <p>${
    [
      patientId ? `Patient ID: ${escapeHtml(String(patientId))}` : "",
      encounterNo ? `Encounter: ${escapeHtml(String(encounterNo))}` : "",
      `Cycle ${cycleNumber} / Day ${cycleDay}`,
    ]
      .filter(Boolean)
      .join(" &middot; ")
  }${dirty ? " &middot; draft (not saved)" : ""}</p>
  <table>
    <thead>
      <tr>
        <th>No.</th><th>Drug Name</th><th>Drug Form</th><th>Patient Dosage</th>
        <th>Brand Name</th><th>Dosage</th><th>Quantity</th><th>F/D</th><th>Type</th>
      </tr>
    </thead>
    <tbody>${bodyRows || '<tr><td colspan="9">No medicines on this cycle day.</td></tr>'}</tbody>
  </table>
  <div class="foot"><span>Cycle ${cycleNumber} / Day ${cycleDay}</span><span>${new Date().toLocaleString(undefined, { timeZone: getActiveTimezone() })}</span></div>
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`);
    printWindow.document.close();
  };

  const renderRowActions = (row: SlipDraftRow, extra?: QuantityExtra) => (
    <div className="flex flex-wrap items-center gap-1">
      <button
        type="button"
        onClick={() => (extra ? addTopUpRow(row, extra) : addRow(row))}
        disabled={readOnly || saving}
        aria-label={`Add a row for ${row.drugName || "this medicine"}`}
        title={
          extra
            ? "Add this top-up as its own row"
            : "Add a copy of this row below it"
        }
        className="inline-flex items-center gap-0.5 rounded-md border border-[#D8DEE6] bg-white px-1.5 py-1 text-[9px] font-bold uppercase tracking-wide text-[#00488D] transition-colors hover:border-[#00488D] hover:bg-[#F2F6FC] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="h-3 w-3" /> Add
      </button>
      <button
        type="button"
        onClick={() => (extra ? suppressExtra(row) : requestRemove(row))}
        disabled={readOnly || saving}
        aria-label={`Remove ${row.drugName || "this row"}${extra ? " top-up" : ""}`}
        title={extra ? "Remove this top-up line" : "Remove this row from the slip"}
        className="inline-flex items-center gap-0.5 rounded-md border border-[#F1C4C4] bg-white px-1.5 py-1 text-[9px] font-bold uppercase tracking-wide text-[#B42318] transition-colors hover:border-[#B42318] hover:bg-[#FDF3F3] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Trash2 className="h-3 w-3" /> Remove
      </button>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="w-[96vw] max-w-[1180px] gap-0 overflow-hidden p-0 font-[Manrope,sans-serif]">
        {/* Header */}
        <DialogHeader className="space-y-0 border-b border-[#E5E7EB] bg-white px-6 py-4">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div>
              <DialogTitle className="text-base font-bold tracking-tight text-[#191C1E]">
                Pharmacy Slip
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-[11px] text-[#6B7280]">
                Cycle {cycleNumber} / Day {cycleDay} &middot; brand, dosage and quantity
                for this cycle day's medicines
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              {readOnly && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200">
                  <Lock className="h-3 w-3" /> Issued &middot; read-only
                </span>
              )}
              {!readOnly && dirty && (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
                  Unsaved
                </span>
              )}
              {!readOnly && !dirty && savedSlip && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  <Check className="h-3 w-3" /> Saved
                </span>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="max-h-[68vh] overflow-y-auto bg-[#FBFCFD] px-6 py-4">
          {(error || loadError) && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error || loadError}</span>
            </div>
          )}

          {readOnly && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                This slip has been issued, so its lines can no longer be changed. Cancel
                it from the Orders page to create a replacement.
              </span>
            </div>
          )}

          {warnings.length > 0 && !loading && !loadingRows && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div className="space-y-0.5">
                {warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            </div>
          )}

          {rows.length > 0 && !loadingRows && (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] text-[#4B5563]">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-2.5 py-1 font-semibold">
                <span className="text-[#004785]">{summary.medicines}</span>
                {summary.medicines === 1 ? "medicine" : "medicines"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-2.5 py-1 font-semibold">
                <span className="text-[#004785]">{summary.lines}</span>
                {summary.lines === 1 ? "slip line" : "slip lines"}
              </span>
              {summary.missingBrand > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
                  <AlertTriangle className="h-3 w-3" />
                  {summary.missingBrand} without a brand
                </span>
              )}
              {(summary.missingDose > 0 || summary.missingQuantity > 0) && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
                  <AlertTriangle className="h-3 w-3" />
                  {summary.missingDose + summary.missingQuantity} needing dosage / quantity
                </span>
              )}
              <span className="ml-auto hidden text-[10px] text-[#9AA4B2] sm:inline">
                Quantity counts units of the selected dosage
              </span>
            </div>
          )}

          {(loading || loadingRows) && rows.length === 0 ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#D8DEE6] bg-white py-16 text-[11px] text-[#6B7280]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading this cycle day's medicines...
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#D8DEE6] bg-white px-6 py-14 text-center">
              <p className="text-sm font-semibold text-[#191C1E]">
                No medicines for Cycle {cycleNumber} / Day {cycleDay}
              </p>
              <p className="mx-auto mt-1 max-w-md text-[11px] leading-relaxed text-[#6B7280]">
                Save the Chemotherapy Order for this cycle day first, then open the
                pharmacy slip again. Discharge medicines you add below appear here too.
              </p>
              {!readOnly && sourceRows.length > 0 && knownRowKeys.length > 0 && (
                <button
                  type="button"
                  onClick={restoreRows}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-[#D8DEE6] bg-white px-3 py-2 text-[11px] font-semibold text-[#00488D] transition-colors hover:border-[#00488D] hover:bg-[#F2F6FC]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore all rows
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
              <table className="w-full min-w-[1160px] border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur">
                  <tr className="border-b border-[#E5E7EB]">
                    {[
                      { label: "No.", className: "w-12" },
                      { label: "Drug Name", className: "w-[15%]" },
                      { label: "Drug Form", className: "w-[8%]" },
                      { label: "Patient Dosage", className: "w-[9%]" },
                      { label: "Brand Name", className: "w-[14%]" },
                      { label: "Dosage", className: "w-[10%]" },
                      { label: "Quantity", className: "w-[8%]" },
                      { label: "F/D", className: "w-[7%]" },
                      { label: "Type", className: "w-[8%]" },
                      { label: "Action", className: "w-[13%]" },
                    ].map((column) => (
                      <th
                        key={column.label}
                        className={`${column.className} px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-[#4B5563]`}
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="text-[11px] text-[#374151]">
                  {displayRows.map(({ row, plan, showExtra }) => {
                    const baseQuantity = effectiveBaseQuantity(row, plan);
                    const extraQuantity = effectiveExtraQuantity(row, plan);
                    const baseValue =
                      row.quantityOverride !== ""
                        ? row.quantityOverride
                        : baseQuantity === null
                          ? ""
                          : String(baseQuantity);

                    const numbers = rowNumbers.get(row.key);

                    const strengthOptions = strengthsOfBrand(row);
                    /* A restored slip can name a strength the master no longer
                       lists: show it as free text instead of an empty select. */
                    const showStrengthSelect =
                      strengthOptions.length > 0 &&
                      (strengthOptions.some((entry) => entry.label === row.strengthLabel) ||
                        !row.selectedDose);

                    return (
                      <Fragment key={row.key}>
                        <tr className="border-b border-[#F0F2F5] transition-colors hover:bg-[#F8FAFC]">
                          <td className="px-3 py-2.5 align-top text-[11px] font-semibold text-[#6B7280]">
                            {numbers?.base ?? ""}
                          </td>

                          <td className="px-3 py-2.5 align-top">
                            <p className="font-semibold text-[#191C1E]">
                              {row.drugName || "—"}
                            </p>
                            {row.isAdded && (
                              <span className="mt-1 inline-flex rounded-full bg-[#EEF4FF] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[#00488D] ring-1 ring-[#C7D8F5]">
                                Added
                              </span>
                            )}
                            {row.route && (
                              <p className="mt-0.5 text-[10px] text-[#9AA4B2]">
                                {row.route}
                              </p>
                            )}
                            {row.instructions && (
                              <p className="mt-0.5 text-[9px] leading-tight text-[#6B7280]">
                                {row.instructions}
                              </p>
                            )}
                          </td>

                          <td className="px-3 py-2.5 align-top">
                            <span className="inline-flex rounded-md bg-[#F2F4F6] px-2 py-0.5 text-[10px] font-semibold text-[#4B5563]">
                              {row.drugForm || "—"}
                            </span>
                          </td>

                          <td className="px-3 py-2.5 align-top font-medium text-[#191C1E]">
                            {row.patientDose || "—"}
                          </td>

                          <td className="px-3 py-2.5 align-top">
                            <SingleSelectDropdown
                              options={row.brandOptions.map((brand) => brand.label)}
                              value={row.brand}
                              onValueChange={(value) => changeBrand(row.key, value)}
                              placeholder={
                                row.medicineId ? "Select brand" : "Not in master"
                              }
                              disabled={
                                readOnly ||
                                row.isAdded ||
                                !row.medicineId ||
                                row.brandOptions.length === 0
                              }
                              className="h-8 min-w-[130px] rounded-md px-2 text-[11px]"
                            />
                          </td>

                          <td className="px-3 py-2.5 align-top">
                            {showStrengthSelect ? (
                              <div className="relative">
                                <select
                                  value={row.strengthLabel}
                                  onChange={(event) =>
                                    changeStrength(row.key, event.target.value)
                                  }
                                  disabled={readOnly || !row.brand}
                                  aria-label={`Dosage for ${row.drugName}`}
                                  className={`${INPUT_CLASS} cursor-pointer appearance-none pr-7`}
                                >
                                  <option value="">Select</option>
                                  {strengthOptions.map((strength) => (
                                    <option key={strength.label} value={strength.label}>
                                      {strength.label}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6B7280]" />
                              </div>
                            ) : (
                              <input
                                type="text"
                                value={`${row.selectedDose}${
                                  row.selectedDose && row.selectedUnit
                                    ? ` ${row.selectedUnit}`
                                    : row.selectedUnit
                                }`.trim()}
                                onChange={(event) =>
                                  changeManualDose(row.key, event.target.value)
                                }
                                disabled={readOnly}
                                placeholder="e.g. 120 mg"
                                className={INPUT_CLASS}
                              />
                            )}
                          </td>

                          <td className="px-3 py-2.5 align-top">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={0}
                                value={baseValue}
                                onChange={(event) =>
                                  updateRow(row.key, () => ({
                                    quantityOverride: event.target.value,
                                  }))
                                }
                                disabled={readOnly}
                                placeholder={
                                  baseQuantity === null ? "Enter" : String(baseQuantity)
                                }
                                className={`${INPUT_CLASS} w-[70px] text-center`}
                              />
                              {baseValue !== "" &&
                                String(baseQuantity ?? "") !== baseValue && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateRow(row.key, () => ({
                                        quantityOverride: "",
                                      }))
                                    }
                                    title={`Use the suggested quantity (${baseQuantity ?? "—"})`}
                                    className="rounded-md border border-[#E5E7EB] p-1 text-[#6B7280] transition-colors hover:border-[#00488D] hover:text-[#00488D]"
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                  </button>
                                )}
                            </div>
                            {baseValue !== "" &&
                              String(baseQuantity ?? "") !== baseValue && (
                                <p className="mt-1 text-[9px] text-[#9AA4B2]">
                                  Suggested {baseQuantity ?? "—"}
                                </p>
                              )}
                            {plan.warning && (
                              <p className="mt-1 flex items-start gap-1 text-[9px] leading-tight text-amber-700">
                                <AlertTriangle className="mt-[1px] h-2.5 w-2.5 shrink-0" />
                                {plan.warning}
                              </p>
                            )}
                          </td>

                          <td className="px-3 py-2.5 align-top text-[11px] font-medium text-[#374151]">
                            {row.role === "DISCHARGE" ? (
                              slipFrequencyDuration(
                                row.role,
                                row.frequency,
                                row.duration,
                                row.durationUnit
                              ) || "—"
                            ) : (
                              <span className="text-[#9AA4B2]">—</span>
                            )}
                          </td>

                          <td className="px-3 py-2.5 align-top">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ring-1 ${
                                ROLE_BADGE[row.role] ??
                                "bg-slate-100 text-slate-600 ring-slate-200"
                              }`}
                            >
                              {slipRoleLabel(row.role)}
                            </span>
                          </td>

                          <td className="px-3 py-2.5 align-top">
                            {renderRowActions(row)}
                          </td>
                        </tr>

                        {showExtra && plan.extra && extraQuantity !== null && (
                          <tr className="border-b border-[#F0F2F5] bg-[#FBFCFE] transition-colors hover:bg-[#F8FAFC]">
                            <td className="px-3 py-2.5 align-top text-[11px] font-semibold text-[#6B7280]">
                              {numbers?.extra ?? ""}
                            </td>
                            <td className="px-3 py-2.5 align-top">
                              <p className="font-semibold text-[#191C1E]">
                                {row.drugName || "—"}
                              </p>
                              <p className="mt-0.5 text-[10px] text-[#9AA4B2]">
                                Top-up to reach {row.patientDose || "the patient dose"}
                              </p>
                            </td>
                            <td className="px-3 py-2.5 align-top">
                              <span className="inline-flex rounded-md bg-[#F2F4F6] px-2 py-0.5 text-[10px] font-semibold text-[#4B5563]">
                                {row.drugForm || "—"}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 align-top font-medium text-[#191C1E]">
                              {row.patientDose || "—"}
                            </td>
                            <td className="px-3 py-2.5 align-top">
                              <span className="text-[11px] font-medium text-[#374151]">
                                {row.brand || "—"}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 align-top font-medium text-[#191C1E]">
                              {formatNumber(plan.extra.strength.value)}
                              {plan.extra.strength.unit
                                ? ` ${plan.extra.strength.unit}`
                                : ""}
                            </td>
                            <td className="px-3 py-2.5 align-top">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  value={
                                    row.extraQuantityOverride !== ""
                                      ? row.extraQuantityOverride
                                      : String(extraQuantity)
                                  }
                                  onChange={(event) =>
                                    updateRow(row.key, () => ({
                                      extraQuantityOverride: event.target.value,
                                    }))
                                  }
                                  disabled={readOnly}
                                  className={`${INPUT_CLASS} w-[70px] text-center`}
                                />
                                {row.extraQuantityOverride !== "" &&
                                  Number(row.extraQuantityOverride) !==
                                    plan.extra.quantity && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateRow(row.key, () => ({
                                          extraQuantityOverride: "",
                                        }))
                                      }
                                      title={`Use the suggested quantity (${plan.extra?.quantity})`}
                                      className="rounded-md border border-[#E5E7EB] p-1 text-[#6B7280] transition-colors hover:border-[#00488D] hover:text-[#00488D]"
                                    >
                                      <RotateCcw className="h-3 w-3" />
                                    </button>
                                  )}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 align-top text-[11px] font-medium text-[#374151]">
                              {slipFrequencyDuration(
                                row.role,
                                row.frequency,
                                row.duration,
                                row.durationUnit
                              ) || "—"}
                            </td>
                            <td className="px-3 py-2.5 align-top">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ring-1 ${
                                  ROLE_BADGE[row.role] ??
                                  "bg-slate-100 text-slate-600 ring-slate-200"
                                }`}
                              >
                                {slipRoleLabel(row.role)} · top-up
                              </span>
                            </td>

                            <td className="px-3 py-2.5 align-top">
                              {renderRowActions(row, plan.extra)}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {rows.length > 0 && (
            <p className="mt-3 text-[10px] leading-relaxed text-[#6B7280]">
              Quantity counts units of the selected dosage. A second line appears when
              the selected strength is below the patient's dose and a smaller strength
              exists to make it up. F/D is filled for discharge medicines only.
            </p>
          )}

          {(saveError || saveMessage) && (
            <div
              className={`mt-3 rounded-lg px-3 py-2 text-[11px] ${
                saveError
                  ? "border border-red-200 bg-red-50 text-red-700"
                  : "border border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {saveError || saveMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E7EB] bg-white px-6 py-3.5">
          <p className="text-[10px] text-[#6B7280]">
            {readOnly
              ? "Issued slips are read-only."
              : "Saved against this cycle day so the pharmacist sees your choices."}
          </p>

          <div className="flex items-center gap-2">
            {!readOnly && (removedRowKeys.length > 0 || rows.some((row) => row.isAdded)) && (
              <button
                type="button"
                onClick={restoreRows}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#D8DEE6] bg-white px-3 py-2 text-[11px] font-semibold text-[#00488D] transition-colors hover:border-[#00488D] hover:bg-[#F2F6FC] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restore rows
              </button>
            )}

            <button
              type="button"
              onClick={handleReset}
              disabled={readOnly || saving || rows.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#D8DEE6] bg-white px-3 py-2 text-[11px] font-semibold text-[#374151] transition-colors hover:border-[#00488D] hover:text-[#00488D] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset suggestions
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={rows.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#D8DEE6] bg-white px-3 py-2 text-[11px] font-semibold text-[#374151] transition-colors hover:border-[#00488D] hover:text-[#00488D] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={readOnly || saving || rows.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#004785] px-4 py-2 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-[#003A6B] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {saving ? "Saving" : "Save slip"}
            </button>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              aria-label="Close pharmacy slip"
              className="rounded-md p-2 text-[#6B7280] transition-colors hover:bg-[#F2F4F6] hover:text-[#191C1E] disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

      <ConfirmationDialog
        open={pendingRemoval !== null}
        type="danger"
        title="Remove chemotherapy row?"
        description={
          pendingRemoval
            ? `${pendingRemoval.drugName || "This chemotherapy medicine"} will be removed from this pharmacy slip. The chemotherapy order itself is not changed.`
            : ""
        }
        confirmText="Remove row"
        cancelText="Keep row"
        onConfirm={() => {
          if (pendingRemoval) removeRow(pendingRemoval);
          setPendingRemoval(null);
        }}
        onCancel={() => setPendingRemoval(null)}
      />
    </>
  );
}

export default PharmacySlipModal;
