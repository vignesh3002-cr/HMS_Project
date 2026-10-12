import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { SummaryPlan } from "./types";
import {
  chemotherapyApi,
  type ChemoAdministrationDay,
  type ChemoAdministrationItem,
  type ChemoAdministrationSheet,
  type ChemoAdministrationStatus,
} from "@/api/chemotherapy.api";
import { useCanAny } from "@/context/PermissionContext";
import { useToast } from "@/hooks/use-toast";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type BadgeStatus = ChemoAdministrationItem["status"];
type ReasonStatus = Extract<ChemoAdministrationStatus, "SKIPPED" | "CANCELLED">;

interface AdministrationTabProps {
  patientId: string | null;
  plan?: SummaryPlan | null;
  /* A cycle day was completed: the plan (cycles, course status) changed. */
  onPlanChanged?: () => void;
}

const STATUS_CONFIG: Record<BadgeStatus, { label: string; icon: string; className: string; dot: string }> = {
  GIVEN:        { label: "GIVEN",        icon: "fa-circle-check",         className: "bg-green-50 text-green-700 border border-green-200", dot: "bg-green-500" },
  PENDING:      { label: "PENDING",      icon: "fa-clock",                className: "bg-amber-50 text-amber-600 border border-amber-200", dot: "bg-amber-400" },
  SKIPPED:      { label: "SKIPPED",      icon: "fa-forward",              className: "bg-slate-100 text-slate-600 border border-slate-300", dot: "bg-slate-400" },
  CANCELLED:    { label: "CANCELLED",    icon: "fa-circle-xmark",         className: "bg-red-50 text-red-500 border border-red-200",       dot: "bg-red-500" },
  NOT_RECORDED: { label: "NOT RECORDED", icon: "fa-minus",                className: "bg-white text-slate-400 border border-dashed border-slate-300", dot: "bg-slate-300" },
};

const ACTIONS: { status: ChemoAdministrationStatus; label: string; hint: string }[] = [
  { status: "GIVEN",     label: "Given",     hint: "Administered to the patient" },
  { status: "PENDING",   label: "Pending",   hint: "Not yet decided" },
  { status: "SKIPPED",   label: "Skipped",   hint: "Not given today - reason required" },
  { status: "CANCELLED", label: "Cancelled", hint: "Will not be given - reason required" },
];

const TREATMENT_STATUS: Record<NonNullable<ChemoAdministrationDay["treatment_status"]>, { label: string; className: string }> = {
  AWAITING_ORDER: { label: "Awaiting Order", className: "bg-amber-100 text-amber-700" },
  NOT_STARTED:    { label: "Not Started",    className: "bg-slate-100 text-slate-600" },
  IN_PROGRESS:    { label: "In Progress",    className: "bg-blue-100 text-blue-700" },
  COMPLETED:      { label: "Completed",      className: "bg-green-100 text-green-700" },
};

const TRACKED_SECTIONS: { role: string; title: string; icon: string; collapsible: boolean; emptyText: string }[] = [
  { role: "PREMEDICATION", title: "Pre-Medications",        icon: "fa-prescription-bottle-medical", collapsible: true,  emptyText: "" },
  { role: "PRIMARY",       title: "Chemotherapy Drugs",     icon: "fa-table-list",                  collapsible: false, emptyText: "No chemotherapy drugs were ordered for this day." },
  { role: "SUPPORTIVE",    title: "Supportive Medications", icon: "fa-plus-circle",                 collapsible: true,  emptyText: "No supportive medications were ordered for this day." },
];

const SKIP_CANCEL_REASONS = [
  "Patient not willing",
  "Adverse reaction",
  "Drug unavailable",
  "Physician order",
  "Lab values",
  "Others",
];

/* ---------- formatting ---------- */

/* 09-Oct-2026. Date-only values (YYYY-MM-DD) are calendar dates; full
   timestamps are shown in IST, the hospital's timezone. */
function fmtDate(value?: string | null): string {
  if (!value) return "—";
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(isDateOnly ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return "—";
  return date
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: isDateOnly ? "UTC" : "Asia/Kolkata",
    })
    .replace(/ /g, "-");
}

function fmtTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

function doseText(value: number | null, unit: string | null): string {
  if (value === null || value === undefined) return "";
  return `${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })} ${unit ?? ""}`.trim();
}

function infusionText(item: ChemoAdministrationItem): string {
  if (item.infusion_rate) return item.infusion_rate;
  const minutes = item.infusion_duration_minutes;
  if (minutes) {
    if (minutes >= 60 && minutes % 60 === 0) {
      const hours = minutes / 60;
      return `${hours} hr${hours > 1 ? "s" : ""}`;
    }
    return `${minutes} min`;
  }
  return item.infusion_type || "—";
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function errorMessage(error: any, fallback: string): string {
  return error?.response?.data?.message || error?.message || fallback;
}

/* ---------- small pieces ---------- */

function StatusBadge({ status }: { status: BadgeStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.className}`}>
      <i className={`fa-solid ${cfg.icon} text-[9px]`} />
      {cfg.label}
    </span>
  );
}

function ReasonDropdown({ value, onChange, hasError }: { value: string; onChange: (v: string) => void; hasError: boolean }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      const wrapper = inputRef.current?.closest(".relative");
      if (!menuRef.current?.contains(e.target as Node) && !wrapper?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const updatePos = () => {
      if (inputRef.current && menuRef.current) {
        const r = inputRef.current.getBoundingClientRect();
        menuRef.current.style.top = `${r.bottom + 2}px`;
        menuRef.current.style.left = `${r.left}px`;
        menuRef.current.style.width = `${r.width}px`;
      }
    };
    window.addEventListener("scroll", updatePos, true);
    return () => window.removeEventListener("scroll", updatePos, true);
  }, [open]);

  const borderCls = hasError ? "border-red-300" : "border-slate-200";

  function openDropdown() {
    if (inputRef.current) setRect(inputRef.current.getBoundingClientRect());
    setOpen(true);
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        maxLength={500}
        onChange={e => { onChange(e.target.value); if (e.target.value) openDropdown(); }}
        onKeyDown={e => {
          if (e.key === "Enter" && value) { e.preventDefault(); setOpen(false); }
          /* Escape closes this list first, not the dialog around it. */
          if (e.key === "Escape" && open) { e.stopPropagation(); setOpen(false); }
        }}
        onFocus={openDropdown}
        placeholder="Select or type a reason..."
        className={`w-full rounded-lg border ${borderCls} bg-white py-2 pl-3 pr-8 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-200`}
      />
      <button
        type="button"
        onMouseDown={e => { e.preventDefault(); open ? setOpen(false) : openDropdown(); inputRef.current?.focus(); }}
        className="absolute inset-y-0 right-0 flex items-center px-2 text-slate-400 hover:text-slate-600"
        tabIndex={-1}
      >
        <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && rect && createPortal(
        <div
          ref={menuRef}
          style={{ position: "fixed", top: rect.bottom + 2, left: rect.left, width: rect.width, zIndex: 9999 }}
          className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          {value && !SKIP_CANCEL_REASONS.includes(value) && (
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); onChange(value); setOpen(false); }}
              className="flex w-full items-center px-3 py-2 text-left text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              <i className="fa-solid fa-plus mr-2 text-[10px]" />
              "{value}"
            </button>
          )}
          {SKIP_CANCEL_REASONS.map(r => (
            <button
              key={r}
              type="button"
              onMouseDown={e => {
                e.preventDefault();
                onChange(r === "Others" ? "" : r);
                setOpen(false);
                if (r === "Others") inputRef.current?.focus();
              }}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 ${value === r ? "font-semibold text-blue-600" : "text-slate-700"}`}
            >
              {r}
              {value === r && <i className="fa-solid fa-check text-[10px] text-blue-500" />}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

/* Reason popup for Skipped / Cancelled - a reason is mandatory. Hand-rolled
   (not a Radix dialog) so the portaled reason list doesn't count as an
   outside click and close it. */
function ReasonModal({
  item,
  status,
  saving,
  onConfirm,
  onClose,
}: {
  item: ChemoAdministrationItem;
  status: ReasonStatus;
  saving: boolean;
  onConfirm: (reason: string, remarks: string) => void;
  onClose: () => void;
}) {
  const sameStatus = item.status === status;
  const [reason, setReason] = useState(sameStatus ? item.status_reason ?? "" : "");
  const [remarks, setRemarks] = useState(sameStatus ? item.remarks ?? "" : "");
  const [touched, setTouched] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const isSkip = status === "SKIPPED";
  const missingReason = !reason.trim();
  const dose = doseText(item.calculated_dose, item.calculated_dose_unit) || doseText(item.protocol_dose, item.protocol_dose_unit);

  useEffect(() => {
    panelRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, []);

  const submit = () => {
    setTouched(true);
    if (missingReason || saving) return;
    onConfirm(reason.trim(), remarks.trim());
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === e.currentTarget && !saving) onClose(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-reason-title"
        onKeyDown={e => { if (e.key === "Escape" && !saving) { e.stopPropagation(); onClose(); } }}
        className="w-full max-w-lg animate-[p360-pop_0.25s_ease-out] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${isSkip ? "bg-slate-100 text-slate-600" : "bg-red-50 text-red-500"}`}>
              <i className={`fa-solid ${isSkip ? "fa-forward" : "fa-ban"}`} />
            </div>
            <div>
              <h3 id="admin-reason-title" className="text-base font-bold text-slate-900">
                {isSkip ? "Skip medication" : "Cancel medication"}
              </h3>
              <p className="text-xs text-slate-500">
                {isSkip
                  ? "The medicine is not given on this treatment day."
                  : "The medicine will not be given for this treatment day."}{" "}
                A reason is required.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
            aria-label="Close"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-blue-700">{item.drug_name}</p>
              <p className="truncate text-[11px] text-slate-500">
                {[item.brand_name, item.administration_route, infusionText(item) !== "—" ? infusionText(item) : null]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </p>
            </div>
            {dose && <span className="flex-shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">{dose}</span>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Reason <span className="text-red-500">*</span>
            </label>
            <ReasonDropdown value={reason} onChange={setReason} hasError={touched && missingReason} />
            {touched && missingReason && (
              <p className="mt-1 text-[11px] font-medium text-red-500">
                Reason is required to {isSkip ? "skip" : "cancel"} a medication
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Remarks <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              rows={3}
              maxLength={500}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Add clinical notes, e.g. what the patient reported..."
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-200"
            />
            <p className="text-right text-[10px] text-slate-400">{remarks.length}/500</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving || (touched && missingReason)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${isSkip ? "bg-slate-700 hover:bg-slate-800" : "bg-red-600 hover:bg-red-700"}`}
          >
            {saving && <i className="fa-solid fa-spinner fa-spin text-xs" />}
            {isSkip ? "Skip Medication" : "Cancel Medication"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* Reminder that scrolls left -> right while medicines are still Pending on
   (or after) the treatment date. Pauses on hover; static for reduced motion. */
function PendingMarquee({ sheet }: { sheet: ChemoAdministrationSheet }) {
  const alert = sheet.pending_alert;
  const day = sheet.day;
  if (!alert || !day) return null;

  const overdue = alert.level === "OVERDUE";
  const label = `Cycle ${day.cycle_number} / Day ${day.cycle_day}`;
  const message = overdue
    ? `Overdue: ${label} treatment date was ${fmtDate(alert.treatment_date)} and ${plural(alert.pending, "medicine")} ${alert.pending === 1 ? "is" : "are"} still Pending — update each to Given, Skipped or Cancelled to complete the cycle day.`
    : `Today is the treatment day for ${label}: ${plural(alert.pending, "medicine")} ${alert.pending === 1 ? "is" : "are"} still Pending — remember to mark each one as Given, Skipped or Cancelled before the end of the treatment.`;

  const tone = overdue
    ? { box: "border-red-200 bg-red-50 text-red-700", pill: "bg-red-600", fade: "from-red-50" }
    : { box: "border-amber-200 bg-amber-50 text-amber-800", pill: "bg-amber-500", fade: "from-amber-50" };

  return (
    <div role="alert" className={`group relative flex h-10 items-center overflow-hidden rounded-xl border shadow-sm ${tone.box}`}>
      <span className={`relative z-10 ml-2 flex flex-shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white ${tone.pill}`}>
        <i className={`fa-solid ${overdue ? "fa-triangle-exclamation" : "fa-bell"} ${overdue ? "" : "fa-shake"}`} />
        {overdue ? "Overdue" : "Reminder"}
      </span>
      <div className="relative h-full flex-1 overflow-hidden">
        <span className="absolute top-0 flex h-full items-center whitespace-nowrap text-sm font-medium animate-admin-marquee group-hover:[animation-play-state:paused] motion-reduce:hidden">
          <i className="fa-solid fa-syringe mr-2 text-xs opacity-70" />
          {message}
        </span>
        <span className="hidden h-full items-center truncate px-3 text-sm font-medium motion-reduce:flex" title={message}>
          {message}
        </span>
        <div className={`pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r ${tone.fade} to-transparent`} />
        <div className={`pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l ${tone.fade} to-transparent`} />
      </div>
    </div>
  );
}

function RowActions({
  item,
  actionable,
  lockedReason,
  saving,
  onAction,
}: {
  item: ChemoAdministrationItem;
  actionable: boolean;
  lockedReason: string;
  saving: boolean;
  onAction: (item: ChemoAdministrationItem, status: ChemoAdministrationStatus) => void;
}) {
  if (saving) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center text-blue-500" aria-label="Saving">
        <i className="fa-solid fa-spinner fa-spin text-sm" />
      </span>
    );
  }

  if (!actionable) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center text-slate-300" title={lockedReason}>
        <i className="fa-solid fa-lock text-xs" />
      </span>
    );
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Update status of ${item.drug_name}`}
          className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 data-[state=open]:bg-slate-100 data-[state=open]:text-slate-700"
        >
          <i className="fa-solid fa-ellipsis-vertical text-sm" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Update status
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ACTIONS.map(action => {
          const current = item.status === action.status;
          return (
            <DropdownMenuItem
              key={action.status}
              onSelect={() => onAction(item, action.status)}
              className={`flex cursor-pointer items-start gap-2 py-2 ${current ? "bg-slate-50" : ""}`}
            >
              <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${STATUS_CONFIG[action.status].dot}`} />
              <span className="flex-1">
                <span className={`block text-xs ${current ? "font-bold" : "font-semibold"} text-slate-800`}>{action.label}</span>
                <span className="block text-[10px] text-slate-400">{action.hint}</span>
              </span>
              {current && <i className="fa-solid fa-check mt-0.5 text-[10px] text-slate-500" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MedicationRows({
  items,
  actionable,
  lockedReason,
  savingIds,
  onAction,
}: {
  items: ChemoAdministrationItem[];
  actionable: boolean;
  lockedReason: string;
  savingIds: Set<string>;
  onAction: (item: ChemoAdministrationItem, status: ChemoAdministrationStatus) => void;
}) {
  return (
    <>
      {items.map((item, index) => {
        const planned = doseText(item.protocol_dose, item.protocol_dose_unit);
        const calculated = doseText(item.calculated_dose, item.calculated_dose_unit);
        const dilution = [item.dilution_solution, item.dilution_volume].filter(Boolean).join(" ");
        const saving = !!item.administration_id && savingIds.has(item.administration_id);
        const resolvedWithReason = item.status === "SKIPPED" || item.status === "CANCELLED";
        return (
          <tr
            key={item.administration_id ?? item.chemotherapy_plan_item_id}
            className={`border-b border-slate-50 transition-colors hover:bg-slate-50/50 ${item.status === "PENDING" && actionable ? "bg-amber-50/20" : ""}`}
          >
            <td className="px-3 py-3 align-top text-sm text-slate-600">{index + 1}</td>
            <td className="px-3 py-3 align-top">
              <p className="text-sm font-semibold text-blue-700">{item.drug_name}</p>
              {item.brand_name && <p className="text-[11px] text-slate-400">({item.brand_name})</p>}
              {item.timing_relative_to_primary && (
                <p className="mt-0.5 text-[10px] text-slate-400">
                  <i className="fa-regular fa-clock mr-1" />
                  {item.timing_relative_to_primary}
                </p>
              )}
            </td>
            <td className="px-3 py-3 align-top">
              <p className="text-sm font-medium text-slate-800">{planned || calculated || "—"}</p>
              {planned && calculated && planned !== calculated && (
                <p className="text-[11px] text-slate-500">({calculated})</p>
              )}
            </td>
            <td className="px-3 py-3 align-top text-sm text-slate-700">{item.administration_route || "—"}</td>
            <td className="px-3 py-3 align-top text-sm text-slate-700">{dilution || "—"}</td>
            <td className="px-3 py-3 align-top text-sm text-slate-700">{infusionText(item)}</td>
            <td className="px-3 py-3 align-top text-sm text-slate-700">
              {item.status === "GIVEN" ? (
                <>
                  <p>{item.administered_by_name || "—"}</p>
                  {item.given_at && <p className="text-[10px] text-slate-400">{fmtTime(item.given_at)}</p>}
                </>
              ) : (
                "—"
              )}
            </td>
            <td className="max-w-[200px] px-3 py-3 align-top">
              <StatusBadge status={item.status} />
              {resolvedWithReason && item.status_reason && (
                <p className="mt-1 truncate text-[10px] text-slate-500" title={[item.status_reason, item.remarks].filter(Boolean).join(" — ")}>
                  <span className="font-semibold">Reason:</span> {item.status_reason}
                </p>
              )}
              {resolvedWithReason && item.remarks && (
                <p className="truncate text-[10px] italic text-slate-400" title={item.remarks}>{item.remarks}</p>
              )}
            </td>
            <td className="px-3 py-3 align-top">
              <RowActions
                item={item}
                actionable={actionable && !!item.administration_id}
                lockedReason={lockedReason}
                saving={saving}
                onAction={onAction}
              />
            </td>
          </tr>
        );
      })}
    </>
  );
}

function MedicationTableHead() {
  return (
    <thead>
      <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <th className="px-3 py-3">#</th>
        <th className="px-3 py-3">Medication</th>
        <th className="px-3 py-3">Dose</th>
        <th className="px-3 py-3">Route</th>
        <th className="px-3 py-3">Dilution / Volume</th>
        <th className="px-3 py-3">Infusion Rate</th>
        <th className="px-3 py-3">Nurse</th>
        <th className="px-3 py-3">Status</th>
        <th className="px-3 py-3">Action</th>
      </tr>
    </thead>
  );
}

function PendingCount({ items }: { items: ChemoAdministrationItem[] }) {
  const pending = items.filter(item => item.status === "PENDING").length;
  if (pending === 0) return null;
  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
      {pending} pending
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex animate-pulse gap-5">
      <div className="min-w-0 flex-1 space-y-4">
        <div className="h-40 rounded-xl bg-slate-100" />
        <div className="h-64 rounded-xl bg-slate-100" />
        <div className="h-24 rounded-xl bg-slate-100" />
      </div>
      <div className="w-64 flex-shrink-0 space-y-4">
        <div className="h-48 rounded-xl bg-slate-100" />
        <div className="h-56 rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}

function EmptyState({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
        <i className={`fa-solid ${icon} text-blue-500`} />
      </div>
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-slate-500">{text}</p>
    </div>
  );
}

/* ---------- the tab ---------- */

export default function AdministrationTab({ patientId, plan, onPlanChanged }: AdministrationTabProps) {
  const planId = plan?.chemotherapy_plan_id ?? null;
  const { toast } = useToast();
  const canRecord = useCanAny(["chemo.administration.record", "chemo.cycle.manage"]);

  const [sheet, setSheet] = useState<ChemoAdministrationSheet | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedDay, setSelectedDay] = useState<{ cycle_number: number; cycle_day: number } | null>(null);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [reasonTarget, setReasonTarget] = useState<{ item: ChemoAdministrationItem; status: ReasonStatus } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ PREMEDICATION: true, SUPPORTIVE: true, POST: true });
  const [showAllCycles, setShowAllCycles] = useState(false);
  const [localInstructions, setLocalInstructions] = useState<{
    medicineName: string; route: string; infusion: string; dose: string;
    frequency: string; timing: string; remarks: string; administrationDetail: string;
  }[]>([]);

  /* Only the newest request's sheet is applied; if an older one finishes
     last, the sheet is reloaded once everything has settled. */
  const requestSeq = useRef(0);
  const inFlight = useRef(0);
  const staleResponse = useRef(false);

  const loadSheet = useCallback(
    async (day: { cycle_number: number; cycle_day: number } | null, quiet = false) => {
      if (!planId) return;
      const seq = ++requestSeq.current;
      if (!quiet) setLoading(true);
      setLoadError("");
      try {
        const response = await chemotherapyApi.getAdministrationSheet(planId, day);
        if (seq === requestSeq.current) setSheet(response.data.data);
      } catch (error: any) {
        if (seq === requestSeq.current) {
          setLoadError(errorMessage(error, "Failed to load the administration sheet."));
        }
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    },
    [planId]
  );

  useEffect(() => {
    setSheet(null);
    setSelectedDay(null);
    if (planId) void loadSheet(null);
  }, [planId, loadSheet]);

  useEffect(() => {
    if (!patientId) { setLocalInstructions([]); return; }
    try {
      const stored = localStorage.getItem(`hms_admin_instructions_${patientId}`);
      const parsed = stored ? JSON.parse(stored) : [];
      setLocalInstructions(Array.isArray(parsed) ? parsed : []);
    } catch { setLocalInstructions([]); }
  }, [patientId]);

  const viewDay = (cycleNumber: number, cycleDay: number) => {
    const day = { cycle_number: cycleNumber, cycle_day: cycleDay };
    setSelectedDay(day);
    void loadSheet(day);
  };

  const applyUpdate = async (
    item: ChemoAdministrationItem,
    status: ChemoAdministrationStatus,
    reason?: string,
    remarks?: string
  ): Promise<boolean> => {
    const administrationId = item.administration_id;
    if (!administrationId) return false;
    const seq = ++requestSeq.current;
    inFlight.current += 1;
    setSavingIds(prev => new Set(prev).add(administrationId));
    try {
      const response = await chemotherapyApi.updateAdministrationStatus(administrationId, {
        status,
        reason: reason ?? null,
        remarks: remarks ?? null,
      });
      if (seq === requestSeq.current) {
        setSheet(response.data.data);
      } else {
        staleResponse.current = true;
      }
      return true;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: `Could not update ${item.drug_name}`,
        description: errorMessage(error, "Please try again."),
      });
      return false;
    } finally {
      inFlight.current -= 1;
      setSavingIds(prev => {
        const next = new Set(prev);
        next.delete(administrationId);
        return next;
      });
      if (inFlight.current === 0 && staleResponse.current) {
        staleResponse.current = false;
        void loadSheet(selectedDay, true);
      }
    }
  };

  const onAction = (item: ChemoAdministrationItem, status: ChemoAdministrationStatus) => {
    if (status === "SKIPPED" || status === "CANCELLED") {
      setReasonTarget({ item, status });
      return;
    }
    if (item.status === status) return;
    void applyUpdate(item, status);
  };

  const confirmReason = async (reason: string, remarks: string) => {
    if (!reasonTarget) return;
    const { item, status } = reasonTarget;
    const ok = await applyUpdate(item, status, reason, remarks);
    if (ok) {
      setReasonTarget(null);
      toast({
        title: `${item.drug_name} marked ${status === "SKIPPED" ? "Skipped" : "Cancelled"}`,
        description: `Reason: ${reason}`,
      });
    }
  };

  const completeDay = async () => {
    const day = sheet?.day;
    if (!planId || !day) return;
    setCompleting(true);
    try {
      const response = await chemotherapyApi.completeAdministrationDay(planId, day.cycle_number, day.cycle_day);
      const result = response.data.data;
      ++requestSeq.current;
      setSheet(result.sheet);
      setSelectedDay(null);
      setConfirmOpen(false);
      toast({
        title: result.plan_completed
          ? "Chemotherapy course completed"
          : result.cycle_completed
            ? `Cycle ${day.cycle_number} completed`
            : `Cycle ${day.cycle_number} · Day ${day.cycle_day} completed`,
        description: result.plan_completed
          ? "Every planned cycle has been administered."
          : result.cycle_completed
            ? `Cycle ${day.cycle_number} moved to Previous Cycles.`
            : "The day's administration is recorded and locked.",
      });
      onPlanChanged?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Could not complete the cycle day",
        description: errorMessage(error, "Please try again."),
      });
      void loadSheet(selectedDay, true);
    } finally {
      setCompleting(false);
    }
  };

  /* ---------- states without a sheet ---------- */

  if (!planId) {
    return (
      <EmptyState
        icon="fa-syringe"
        title="No chemotherapy plan"
        text="This patient has no chemotherapy plan yet. Administration tracking starts once a plan is created and a cycle day is ordered from the consultation."
      />
    );
  }

  if (!sheet) {
    if (loadError) {
      return (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <span><i className="fa-solid fa-circle-exclamation mr-2" />{loadError}</span>
          <button
            type="button"
            onClick={() => void loadSheet(selectedDay)}
            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
          >
            Retry
          </button>
        </div>
      );
    }
    return <LoadingSkeleton />;
  }

  /* ---------- derived ---------- */

  const day = sheet.day;
  const items = day?.items ?? [];
  const summary = day?.summary ?? { total: 0, pending: 0, given: 0, skipped: 0, cancelled: 0 };
  const protocol = sheet.plan.protocol_name || sheet.plan.regimen_name || "—";
  const actionable = !!day?.can_update && canRecord;
  const lockedReason = !day
    ? ""
    : day.order_status === "COMPLETED"
      ? "This cycle day is completed - its administration record is locked."
      : day.order_status === "ORDERED"
        ? "Available once the doctor submits the consultation."
        : !canRecord
          ? "You don't have permission to record administration."
          : "This cycle day can no longer be updated.";
  const currentCycle = sheet.current_cycle;
  const courseCompleted = String(sheet.plan.treatment_status ?? "").toUpperCase() === "COMPLETED";
  const dayOrders = new Map(sheet.cycle_days.map(order => [order.cycle_day, order]));
  const visibleCycles = showAllCycles ? sheet.previous_cycles : sheet.previous_cycles.slice(0, 3);
  const treatmentStatus = day?.treatment_status ? TREATMENT_STATUS[day.treatment_status] : null;

  const matchesFilter = (item: ChemoAdministrationItem) => !pendingOnly || item.status === "PENDING";
  const itemsFor = (role: string) => items.filter(item => item.drug_role === role && matchesFilter(item));
  const allFor = (role: string) => items.filter(item => item.drug_role === role);
  const chemoItems = itemsFor("PRIMARY").filter(item =>
    !searchTerm ||
    item.drug_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.brand_name ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const instructionItems = items.filter(item =>
    item.administration_detail || item.timing_relative_to_primary || item.frequency || item.item_remarks
  );

  const completeHint = !day
    ? ""
    : day.order_status === "COMPLETED"
      ? `Completed${day.completed_at ? ` on ${fmtDate(day.completed_at)}` : ""}`
      : day.order_status === "ORDERED"
        ? "Awaiting consultation submission"
        : summary.pending > 0
          ? `${plural(summary.pending, "medicine")} still pending`
          : "All medicines resolved — ready to complete";

  const toggleSection = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-4">
      <PendingMarquee sheet={sheet} />

      {loadError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          <span><i className="fa-solid fa-circle-exclamation mr-2" />{loadError}</span>
          <button type="button" onClick={() => void loadSheet(selectedDay)} className="text-xs font-semibold underline">Retry</button>
        </div>
      )}

      <div className="flex gap-5">
        {/* ─── MAIN CONTENT ─── */}
        <div className={`min-w-0 flex-1 space-y-4 transition-opacity ${loading ? "opacity-60" : ""}`}>

          {!day ? (
            <EmptyState
              icon="fa-calendar-plus"
              title={courseCompleted ? "Chemotherapy course completed" : "No cycle day ordered yet"}
              text={courseCompleted
                ? "Every planned cycle of this course is completed."
                : "Medicines appear here once the doctor saves the cycle day's Chemotherapy Order and submits the consultation."}
            />
          ) : (
            <>
              {/* ── Chemotherapy Administration header ── */}
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50">
                      <i className="fa-solid fa-syringe text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Chemotherapy Administration</h2>
                      <p className="text-sm text-slate-500">
                        Cycle {day.cycle_number}&nbsp;&nbsp;|&nbsp;&nbsp;{fmtDate(day.treatment_date)} (Day {day.cycle_day})
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">Protocol: {protocol}</p>
                    </div>
                  </div>
                  {/* Day timeline: the cycle's medication days */}
                  <div className="flex items-start pt-1">
                    {sheet.medication_days.map((dayNumber, index) => {
                      const order = dayOrders.get(dayNumber);
                      const isActive = dayNumber === day.cycle_day;
                      const isDone = order?.order_status === "COMPLETED";
                      const isGiving = order?.order_status === "IN_ADMINISTRATION";
                      const clickable = !!order && !isActive;
                      return (
                        <React.Fragment key={dayNumber}>
                          <button
                            type="button"
                            disabled={!clickable}
                            onClick={() => order && viewDay(order.cycle_number, order.cycle_day)}
                            title={order ? `Cycle ${order.cycle_number} / Day ${dayNumber} - ${isDone ? "completed" : isGiving ? "in administration" : "ordered"}` : `Day ${dayNumber} - not ordered yet`}
                            className={`group flex flex-col items-center gap-1.5 ${clickable ? "cursor-pointer" : "cursor-default"}`}
                          >
                            <div className={`flex items-center justify-center rounded-full border-2 transition-transform ${
                              isActive
                                ? "h-4 w-4 border-blue-600 bg-blue-600 ring-4 ring-blue-100"
                                : isDone
                                  ? "h-3.5 w-3.5 border-blue-600 bg-blue-600"
                                  : isGiving
                                    ? "h-3.5 w-3.5 border-amber-500 bg-amber-400"
                                    : "h-3 w-3 border-blue-200 bg-white"
                            } ${clickable ? "group-hover:scale-125" : ""}`}>
                              {isDone && !isActive && <i className="fa-solid fa-check text-[7px] text-white" />}
                            </div>
                            {isActive ? (
                              <div className="flex flex-col items-center text-center leading-tight">
                                <span className="text-[10px] font-semibold text-blue-600">Cycle {day.cycle_number}</span>
                                <span className="text-[10px] font-semibold text-blue-600">Day {dayNumber}</span>
                              </div>
                            ) : (
                              <span className={`text-[10px] font-medium ${isDone ? "text-blue-600" : isGiving ? "text-amber-600" : "text-slate-400"} ${clickable ? "group-hover:underline" : ""}`}>
                                Day {dayNumber}
                              </span>
                            )}
                          </button>
                          {index < sheet.medication_days.length - 1 && (
                            <div className={`mt-[6px] h-0.5 w-10 flex-shrink-0 ${isDone ? "bg-blue-400" : "bg-blue-100"}`} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* Day state + completion */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
                  <div className="flex items-center gap-2 text-xs">
                    {treatmentStatus && (
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${treatmentStatus.className}`}>
                        {treatmentStatus.label}
                      </span>
                    )}
                    <span className={summary.pending > 0 && day.order_status === "IN_ADMINISTRATION" ? "font-medium text-amber-700" : "text-slate-500"}>
                      {completeHint}
                    </span>
                    {selectedDay && (
                      <button
                        type="button"
                        onClick={() => { setSelectedDay(null); void loadSheet(null); }}
                        className="ml-1 font-semibold text-blue-600 hover:text-blue-800"
                      >
                        <i className="fa-solid fa-rotate-left mr-1 text-[10px]" />
                        Back to current day
                      </button>
                    )}
                  </div>
                  {day.order_status === "IN_ADMINISTRATION" && canRecord && (
                    <button
                      type="button"
                      disabled={!day.can_complete || completing}
                      onClick={() => setConfirmOpen(true)}
                      title={day.can_complete ? "" : "Mark every medicine as Given, Skipped or Cancelled first"}
                      className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-green-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                    >
                      <i className="fa-solid fa-circle-check text-xs" />
                      Complete Cycle {day.cycle_number} · Day {day.cycle_day}
                    </button>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-5 divide-x divide-slate-100 border-t border-slate-100">
                  {[
                    { icon: "fa-pills",                label: "Total Drugs", value: summary.total,     color: "text-slate-700" },
                    { icon: "fa-circle-check",         label: "Given",       value: summary.given,     color: "text-green-600" },
                    { icon: "fa-clock",                label: "Pending",     value: summary.pending,   color: "text-amber-500" },
                    { icon: "fa-triangle-exclamation", label: "Skipped",     value: summary.skipped,   color: "text-slate-500" },
                    { icon: "fa-circle-xmark",         label: "Cancelled",   value: summary.cancelled, color: "text-red-500"   },
                  ].map(stat => (
                    <div key={stat.label} className="p-4 text-center">
                      <div className={`mb-1 flex items-center justify-center gap-1.5 ${stat.color}`}>
                        <i className={`fa-solid ${stat.icon} text-xs`} />
                        <span className="text-xs font-medium">{stat.label}</span>
                      </div>
                      <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {day.order_status === "ORDERED" && (
                <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  <i className="fa-solid fa-circle-info mt-0.5" />
                  <p>
                    Cycle {day.cycle_number} / Day {day.cycle_day} has been ordered but its consultation is not submitted yet.
                    The medicines below become available for administration (starting as <b>Pending</b>) once the doctor submits it.
                  </p>
                </div>
              )}
              {day.order_status === "COMPLETED" && items.some(item => item.status === "NOT_RECORDED") && (
                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <i className="fa-solid fa-clock-rotate-left mt-0.5" />
                  <p>
                    This cycle day was completed{day.completed_at ? ` on ${fmtDate(day.completed_at)}` : ""} before administration
                    tracking was available, so no per-medicine status was recorded.
                  </p>
                </div>
              )}

              {TRACKED_SECTIONS.map(section => {
                const sectionAll = allFor(section.role);
                const sectionItems = section.role === "PRIMARY" ? chemoItems : itemsFor(section.role);

                /* Pre-medications only appear when ordered. */
                if (section.role === "PREMEDICATION" && sectionAll.length === 0) return null;

                if (!section.collapsible) {
                  return (
                    <div key={section.role} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
                        <div className="flex items-center gap-2">
                          <i className={`fa-solid ${section.icon} text-sm text-blue-500`} />
                          <h3 className="text-sm font-bold text-slate-800">{section.title}</h3>
                          <PendingCount items={sectionAll} />
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setPendingOnly(value => !value)}
                            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${pendingOnly ? "bg-amber-100 text-amber-700" : "text-blue-600 hover:text-blue-800"}`}
                          >
                            <i className={`fa-solid ${pendingOnly ? "fa-filter-circle-xmark" : "fa-filter"} text-[10px]`} />
                            {pendingOnly ? "Pending only" : "Show All Drugs"}
                          </button>
                          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                            <i className="fa-solid fa-magnifying-glass text-[10px] text-slate-400" />
                            <input
                              type="text"
                              placeholder="Search drug name..."
                              value={searchTerm}
                              onChange={e => setSearchTerm(e.target.value)}
                              className="w-36 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <MedicationTableHead />
                          <tbody>
                            <MedicationRows
                              items={sectionItems}
                              actionable={actionable}
                              lockedReason={lockedReason}
                              savingIds={savingIds}
                              onAction={onAction}
                            />
                          </tbody>
                        </table>
                        {sectionItems.length === 0 && (
                          <p className="px-5 py-6 text-center text-sm text-slate-400">
                            {sectionAll.length === 0 ? section.emptyText : "No drugs match the current filter."}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                }

                const open = openSections[section.role] !== false;
                return (
                  <div key={section.role} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <button
                      type="button"
                      onClick={() => toggleSection(section.role)}
                      className="flex w-full items-center justify-between px-5 py-3"
                    >
                      <div className="flex items-center gap-2">
                        <i className={`fa-solid ${section.icon} text-sm text-blue-500`} />
                        <h3 className="text-sm font-bold text-slate-800">{section.title}</h3>
                        <span className="text-[11px] font-medium text-slate-400">({sectionAll.length})</span>
                        <PendingCount items={sectionAll} />
                      </div>
                      <i className={`fa-solid fa-chevron-${open ? "up" : "down"} text-xs text-slate-400`} />
                    </button>
                    {open && (
                      <div className="overflow-x-auto border-t border-slate-100">
                        {sectionItems.length > 0 ? (
                          <table className="w-full text-left">
                            <MedicationTableHead />
                            <tbody>
                              <MedicationRows
                                items={sectionItems}
                                actionable={actionable}
                                lockedReason={lockedReason}
                                savingIds={savingIds}
                                onAction={onAction}
                              />
                            </tbody>
                          </table>
                        ) : (
                          <p className="px-5 py-5 text-center text-sm text-slate-400">
                            {sectionAll.length === 0 ? section.emptyText : "No drugs match the current filter."}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* ── Post Medications (post-treatment, read-only) ── */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => toggleSection("POST")}
              className="flex w-full items-center justify-between px-5 py-3"
            >
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-capsules text-sm text-blue-500" />
                <h3 className="text-sm font-bold text-slate-800">Post Medications</h3>
                <span className="text-[11px] font-medium text-slate-400">({sheet.post_medications.length})</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Take-home · reference</span>
              </div>
              <i className={`fa-solid fa-chevron-${openSections.POST !== false ? "up" : "down"} text-xs text-slate-400`} />
            </button>
            {openSections.POST !== false && (
              <div className="overflow-x-auto border-t border-slate-100">
                {sheet.post_medications.length > 0 ? (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-5 py-2.5">#</th>
                        <th className="px-3 py-2.5">Medication</th>
                        <th className="px-3 py-2.5">Dose</th>
                        <th className="px-3 py-2.5">Route</th>
                        <th className="px-3 py-2.5">Frequency</th>
                        <th className="px-3 py-2.5">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sheet.post_medications.map((med, index) => (
                        <tr key={med.chemotherapy_plan_item_id} className="border-t border-slate-50">
                          <td className="px-5 py-3 text-sm text-slate-600">{index + 1}</td>
                          <td className="px-3 py-3">
                            <p className="text-sm font-semibold text-slate-800">{med.drug_name}</p>
                            {med.brand_name && <p className="text-[11px] text-slate-400">({med.brand_name})</p>}
                          </td>
                          <td className="px-3 py-3 text-sm text-slate-700">{doseText(med.protocol_dose, med.protocol_dose_unit) || "—"}</td>
                          <td className="px-3 py-3 text-sm text-slate-700">{med.administration_route || "—"}</td>
                          <td className="px-3 py-3 text-sm text-slate-700">{med.frequency || "—"}</td>
                          <td className="px-3 py-3 text-sm text-slate-700">{med.duration || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="px-5 py-5 text-center text-sm text-slate-400">No post-treatment medicines on this plan.</p>
                )}
              </div>
            )}
          </div>

          {/* ── Instructions ── */}
          <div className="mt-2 flex items-start justify-between rounded-[16px] border border-[#e2e8f0] bg-white p-6 shadow-sm">
            <div className="flex-1">
              <div className="mb-4 flex items-center text-[#1d4ed8]">
                <i className="fa-regular fa-file-lines mr-2" />
                <h4 className="text-sm font-bold">Instructions</h4>
              </div>
              <p className="mb-3 text-sm text-[#64748b]">Administration instructions for this cycle day:</p>
              {instructionItems.length > 0 ? (
                <ul className="space-y-3 text-sm text-[#1e293b]">
                  {instructionItems.map(item => (
                    <li key={item.chemotherapy_plan_item_id} className="rounded-[12px] border border-slate-100 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-bold text-[#1e293b]">{item.drug_name}</span>
                        {(doseText(item.calculated_dose, item.calculated_dose_unit) || doseText(item.protocol_dose, item.protocol_dose_unit)) && (
                          <span className="whitespace-nowrap text-xs text-[#64748b]">
                            {doseText(item.calculated_dose, item.calculated_dose_unit) || doseText(item.protocol_dose, item.protocol_dose_unit)}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#64748b]">
                        {item.administration_route && <span>Route: {item.administration_route}</span>}
                        {infusionText(item) !== "—" && <span>Infusion: {infusionText(item)}</span>}
                        {item.frequency && <span>Frequency: {item.frequency}</span>}
                        {item.timing_relative_to_primary && <span>Timing: {item.timing_relative_to_primary}</span>}
                      </div>
                      {item.administration_detail && (
                        <p className="mt-1.5 text-xs text-[#475569]">{item.administration_detail}</p>
                      )}
                      {item.item_remarks && (
                        <p className="mt-1.5 text-xs italic text-[#64748b]">{item.item_remarks}</p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : localInstructions.length > 0 ? (
                <ul className="space-y-3 text-sm text-[#1e293b]">
                  {localInstructions.map((instr, idx) => (
                    <li key={idx} className="rounded-[12px] border border-slate-100 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-bold text-[#1e293b]">{instr.medicineName || `Item ${idx + 1}`}</span>
                        {instr.dose && <span className="whitespace-nowrap text-xs text-[#64748b]">{instr.dose}</span>}
                      </div>
                      {(instr.route || instr.infusion || instr.frequency || instr.timing) && (
                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#64748b]">
                          {instr.route     && <span>Route: {instr.route}</span>}
                          {instr.infusion  && <span>Infusion: {instr.infusion}</span>}
                          {instr.frequency && <span>Frequency: {instr.frequency}</span>}
                          {instr.timing    && <span>Timing: {instr.timing}</span>}
                        </div>
                      )}
                      {instr.administrationDetail && (
                        <p className="mt-1.5 text-xs text-[#475569]">{instr.administrationDetail}</p>
                      )}
                      {instr.remarks && (
                        <p className="mt-1.5 text-xs italic text-[#64748b]">{instr.remarks}</p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="list-inside list-disc space-y-2 text-sm font-medium text-[#1e293b]">
                  <li>No instructions recorded.</li>
                </ul>
              )}
              {(day?.chemo_instructions || day?.additional_notes) && (
                <div className="mt-4 space-y-2 rounded-[12px] bg-slate-50 p-3 text-xs text-[#475569]">
                  {day?.chemo_instructions && (
                    <p><span className="font-semibold text-[#1e293b]">Post chemo instructions: </span>{day.chemo_instructions}</p>
                  )}
                  {day?.additional_notes && (
                    <p><span className="font-semibold text-[#1e293b]">Additional notes: </span>{day.additional_notes}</p>
                  )}
                </div>
              )}
            </div>
            <div className="ml-6 flex w-[160px] flex-shrink-0 flex-col items-center justify-center rounded-[12px] border border-slate-200 bg-slate-50 p-5">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#1d4ed8]">
                {currentCycle?.next_cycle_number ? `NEXT · CYCLE ${currentCycle.next_cycle_number}` : "NEXT CYCLE"}
              </div>
              <div className="flex items-center text-sm font-bold text-[#1d4ed8]">
                <i className="fa-regular fa-calendar mr-2" />
                {fmtDate(currentCycle?.next_cycle_date)}
              </div>
            </div>
          </div>

        </div>

        {/* ─── RIGHT SIDEBAR ─── */}
        <div className="w-64 flex-shrink-0 space-y-4">

          {/* Quick Actions */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
              <i className="fa-solid fa-bolt text-xs text-yellow-500" />
              <h4 className="text-sm font-bold text-slate-800">Quick Actions</h4>
            </div>
            <div className="space-y-2 p-3">
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <i className="fa-solid fa-plus text-xs" />
                Add Administration
              </button>
              {[
                { icon: "fa-file-medical",     label: "View Protocol" },
                { icon: "fa-clipboard-list",   label: "View Orders" },
                { icon: "fa-print",            label: "Print MAR" },
                { icon: "fa-download",         label: "Download Report" },
              ].map(action => (
                <button
                  key={action.label}
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <i className={`fa-solid ${action.icon} text-xs text-slate-400`} />
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* Current Cycle */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
              <i className="fa-solid fa-rotate text-xs text-blue-500" />
              <h4 className="text-sm font-bold text-slate-800">Current Cycle</h4>
            </div>
            <div className="space-y-4 p-4">
              {courseCompleted || !currentCycle ? (
                <div className="rounded-lg bg-green-50 px-3 py-2.5 text-sm font-semibold text-green-700">
                  <i className="fa-solid fa-flag-checkered mr-2" />
                  {courseCompleted ? "Course completed" : "No open cycle"}
                  <p className="mt-0.5 text-xs font-normal text-green-600">
                    {sheet.plan.completed_cycles} / {sheet.plan.planned_cycles} cycles completed
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-bold text-slate-900">
                      Cycle {currentCycle.cycle_number} - Day {currentCycle.current_day}
                    </p>
                    <span className="text-[11px] text-slate-400">of {sheet.plan.planned_cycles}</span>
                  </div>
                  {!currentCycle.started && (
                    <p className="-mt-2 text-[11px] font-medium text-blue-600">Upcoming cycle</p>
                  )}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Days completed</span>
                      <span className="text-xs font-semibold text-blue-600">
                        {currentCycle.completed_days} / {currentCycle.total_days} Days
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${currentCycle.total_days > 0 ? Math.min(100, (currentCycle.completed_days / currentCycle.total_days) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="mb-0.5 text-xs text-slate-500">
                      {currentCycle.started ? "Next Cycle Date" : `Cycle ${currentCycle.cycle_number} Due`}
                    </p>
                    <p className="text-sm font-semibold text-slate-800">{fmtDate(currentCycle.next_cycle_date)}</p>
                  </div>
                </>
              )}
              <div>
                <p className="mb-0.5 text-xs text-slate-500">Regimen</p>
                <p className="text-sm font-semibold text-slate-800">{protocol}</p>
              </div>
            </div>
          </div>

          {/* Administration Details */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
              <i className="fa-solid fa-clipboard-list text-xs text-blue-500" />
              <h4 className="text-sm font-bold text-slate-800">Administration Details</h4>
            </div>
            <div className="space-y-3 p-4">
              {[
                { icon: "fa-user-nurse",   label: "Administered By", value: day?.administered_by.length ? day.administered_by.join(", ") : "—" },
                { icon: "fa-user-doctor",  label: "Verified By",     value: sheet.plan.doctor_name || "—" },
                { icon: "fa-file-medical", label: "Treatment Plan",  value: day ? `${protocol} - Cycle ${day.cycle_number}` : protocol },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-2.5">
                  <i className={`fa-solid ${item.icon} mt-0.5 text-xs text-slate-400`} />
                  <div>
                    <p className="text-[11px] text-slate-500">{item.label}</p>
                    <p className="text-xs font-semibold text-slate-800">{item.value}</p>
                  </div>
                </div>
              ))}
              <div className="flex items-start gap-2.5">
                <i className="fa-solid fa-shield-halved mt-0.5 text-xs text-slate-400" />
                <div>
                  <p className="text-[11px] text-slate-500">Verification Status</p>
                  <p className={`text-xs font-semibold ${day?.physician_approved ? "text-green-700" : "text-amber-600"}`}>
                    {day?.physician_approved ? "Physician approved" : "Awaiting physician approval"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <i className="fa-solid fa-spinner mt-0.5 text-xs text-slate-400" />
                <div>
                  <p className="text-[11px] text-slate-500">Treatment Status</p>
                  {treatmentStatus ? (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${treatmentStatus.className}`}>
                      {treatmentStatus.label}
                    </span>
                  ) : (
                    <p className="text-xs font-semibold text-slate-800">—</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Previous Cycles */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-clock-rotate-left text-xs text-blue-500" />
                <h4 className="text-sm font-bold text-slate-800">Previous Cycles</h4>
              </div>
              {sheet.previous_cycles.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllCycles(value => !value)}
                  className="text-[11px] font-medium text-blue-600 hover:text-blue-800"
                >
                  {showAllCycles ? "Show Less" : "View All"}
                </button>
              )}
            </div>
            {visibleCycles.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {visibleCycles.map(row => {
                  const completed = String(row.cycle_status ?? "").toUpperCase() === "COMPLETED";
                  return (
                    <div key={row.chemotherapy_cycle_id} className="flex items-start justify-between gap-2 px-4 py-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-800">Cycle {row.cycle_number}</p>
                        <p className="text-[11px] text-slate-500">{fmtDate(row.completion_date)}</p>
                        <p className="mt-0.5 text-[11px] leading-tight text-slate-400">{row.protocol_name || protocol}</p>
                      </div>
                      <span className={`mt-0.5 flex-shrink-0 text-[11px] font-semibold ${completed ? "text-green-600" : "text-red-500"}`}>
                        {completed ? "Completed" : "Cancelled"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="px-4 py-4 text-xs text-slate-400">No completed cycles yet.</p>
            )}
          </div>

        </div>
      </div>

      {reasonTarget && (
        <ReasonModal
          item={reasonTarget.item}
          status={reasonTarget.status}
          saving={!!reasonTarget.item.administration_id && savingIds.has(reasonTarget.item.administration_id)}
          onConfirm={(reason, remarks) => void confirmReason(reason, remarks)}
          onClose={() => setReasonTarget(null)}
        />
      )}

      {day && (
        <ConfirmationDialog
          open={confirmOpen}
          type="success"
          title={`Complete Cycle ${day.cycle_number} · Day ${day.cycle_day}?`}
          description={
            <div className="space-y-2 text-sm">
              <p>
                All {plural(summary.total, "medicine")} are resolved — <b>{summary.given}</b> given,{" "}
                <b>{summary.skipped}</b> skipped, <b>{summary.cancelled}</b> cancelled. The day's administration
                record will be locked.
              </p>
              {day.closes_course ? (
                <p className="font-semibold text-green-700">
                  This is the last treatment day of the last cycle — the chemotherapy course will be marked Completed.
                </p>
              ) : day.closes_cycle ? (
                <p className="font-semibold text-green-700">
                  This completes Cycle {day.cycle_number} — it moves to Previous Cycles.
                </p>
              ) : null}
            </div>
          }
          confirmText="Complete Day"
          cancelText="Not yet"
          loading={completing}
          onConfirm={() => void completeDay()}
          onCancel={() => { if (!completing) setConfirmOpen(false); }}
        />
      )}
    </div>
  );
}
