import { useState } from "react";
import {
  ABSENCE_TYPES,
  CHECKLIST_ITEMS,
  ENTITLEMENTS,
  LOGGED_ABSENCES,
} from "../data/leaveData";
import type {
  AbsenceTypeOption,
  ChecklistItem,
  EntitlementItem,
  LoggedAbsence,
} from "../types";

interface Crumb {
  label: string;
  active?: boolean;
}

function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="flex items-center gap-2 text-sm">
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-2">
          <span
            className={
              item.active
                ? "font-semibold text-gray-900"
                : "text-gray-400"
            }
          >
            {item.label}
          </span>
          {i < items.length - 1 && (
            <span className="text-gray-300">›</span>
          )}
        </span>
      ))}
    </nav>
  );
}

const ABSENCE_ICONS: Record<
  AbsenceTypeOption["id"],
  JSX.Element
> = {
  emergency: (
    <svg
      className="w-6 h-6"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 2l1.6 5.2L19 9l-5.4 1.8L12 16l-1.6-5.2L5 9l5.4-1.8L12 2z" />
    </svg>
  ),

  vacation: (
    <svg
      className="w-6 h-6"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M2 16l20-8-8 8 3 6-4-3-3 4-1-5-5-2z" />
    </svg>
  ),

  sick: (
    <svg
      className="w-6 h-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M20 12A8 8 0 114 12a8 8 0 0116 0z" />
      <path d="M15 9.5c.5 1-1 1.5-1 1.5s1.5.5 1 1.5" />
      <circle
        cx="9"
        cy="9"
        r="0.6"
        fill="currentColor"
      />
    </svg>
  ),
};

interface AbsenceTypeSelectorProps {
  options: AbsenceTypeOption[];
  selected: AbsenceTypeOption["id"] | null;
  onSelect: (id: AbsenceTypeOption["id"]) => void;
}

function AbsenceTypeSelector({
  options,
  selected,
  onSelect,
}: AbsenceTypeSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onSelect(opt.id)}
          className={`flex flex-col items-center justify-center gap-2 py-6 rounded-xl border transition-colors ${
            selected === opt.id
              ? "border-blue-600 bg-blue-50 text-blue-700"
              : "border-gray-200 text-gray-700 hover:border-gray-300"
          }`}
        >
          <span
            className={
              selected === opt.id
                ? "text-blue-700"
                : "text-blue-600"
            }
          >
            {ABSENCE_ICONS[opt.id]}
          </span>

          <span className="text-sm font-medium">
            {opt.label}
          </span>
        </button>
      ))}
    </div>
  );
}

function ReturnToWorkChecklist({
  items: initialItems,
}: {
  items: ChecklistItem[];
}) {
  const [items, setItems] = useState(initialItems);

  const toggle = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, checked: !item.checked }
          : item
      )
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <svg
          className="w-5 h-5 text-blue-700"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M8 12l2.5 2.5L16 9" />
        </svg>

        <h3 className="font-semibold text-gray-900">
          Return to Work Checklist
        </h3>
      </div>

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id}>
            <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggle(item.id)}
                className="w-4 h-4 rounded border-gray-300 text-blue-700 focus:ring-blue-500"
              />

              {item.label}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AnnualEntitlement({
  items,
}: {
  items: EntitlementItem[];
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <p className="text-xs font-semibold tracking-wide text-gray-400 mb-4">
        ANNUAL ENTITLEMENT
      </p>

      <div className="space-y-5">
        {items.map((item) => {
          const pct = Math.min(
            100,
            (item.used / item.total) * 100
          );

          return (
            <div key={item.label}>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="font-medium text-gray-800">
                  {item.label}
                </span>

                <span className="text-blue-700 font-semibold">
                  {item.used} / {item.total} Days
                </span>
              </div>

              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-800 rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const TYPE_ICON: Record<LoggedAbsence["type"], string> = {
  Vacation: "✈️",
  "Sick Leave": "🤒",
  Emergency: "✳️",
};

function LoggedAbsencesTable({
  absences,
}: {
  absences: LoggedAbsence[];
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 text-lg">
          Logged Absences
        </h3>

        <button className="text-sm font-semibold text-blue-700 hover:underline">
          Download Archive
        </button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-400 bg-gray-50">
            <th className="font-medium py-2.5 px-3 rounded-l-lg">
              Absence Type
            </th>

            <th className="font-medium py-2.5 px-3">
              Duration
            </th>

            <th className="font-medium py-2.5 px-3">
              Date Logged
            </th>

            <th className="font-medium py-2.5 px-3 text-right rounded-r-lg">
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          {absences.map((absence) => (
            <tr
              key={absence.id}
              className="border-b border-gray-50 last:border-0"
            >
              <td className="py-3 px-3 flex items-center gap-2 text-gray-800">
                <span>{TYPE_ICON[absence.type]}</span>
                {absence.type}
              </td>

              <td className="py-3 px-3 text-gray-600">
                {absence.duration}
              </td>

              <td className="py-3 px-3 text-gray-500">
                {absence.dateLogged}
              </td>

              <td className="py-3 px-3 text-right">
                <button
                  aria-label={`View ${absence.type} absence`}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-4 h-4 inline"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LeavePage() {
  const [selectedType, setSelectedType] =
    useState<AbsenceTypeOption["id"] | null>(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [handoverNotes, setHandoverNotes] = useState("");

  const handleConfirm = () => {
    console.log({
      selectedType,
      startDate,
      endDate,
      handoverNotes,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Breadcrumb
          items={[
            { label: "Dashboard" },
            {
              label: "Absence Management",
              active: true,
            },
          ]}
        />

        <div className="flex items-center gap-4">
          <button
            aria-label="Notifications"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.7 21a2 2 0 01-3.4 0" />
            </svg>
          </button>

          <span className="h-6 w-px bg-gray-200" />

          <span className="flex items-center gap-2 text-sm text-gray-600">
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <rect
                x="3"
                y="4"
                width="18"
                height="17"
                rx="2"
              />
              <path d="M3 9h18M8 2v4M16 2v4" />
            </svg>

            May 30, 2026
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Absence Management
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Self-service log for planned or emergency absences.
                Ensure clinical handovers are scheduled.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold tracking-wide text-gray-400 mb-3">
                SELECT ABSENCE TYPE
              </p>

              <AbsenceTypeSelector
                options={ABSENCE_TYPES}
                selected={selectedType}
                onSelect={setSelectedType}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold tracking-wide text-gray-400 mb-2 block">
                  START DATE
                </label>

                <input
                  type="date"
                  value={startDate}
                  onChange={(e) =>
                    setStartDate(e.target.value)
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold tracking-wide text-gray-400 mb-2 block">
                  END DATE
                </label>

                <input
                  type="date"
                  value={endDate}
                  onChange={(e) =>
                    setEndDate(e.target.value)
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold tracking-wide text-gray-400 mb-2 block">
                CLINICAL HANDOVER DETAILS
              </label>

              <textarea
                value={handoverNotes}
                onChange={(e) =>
                  setHandoverNotes(e.target.value)
                }
                placeholder="Enter patient handover status or covering physician name..."
                rows={4}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-100 resize-none"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-900 text-white text-sm font-semibold hover:bg-blue-800"
              >
                Confirm Absence

                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M8 12l2.5 2.5L16 9" />
                </svg>
              </button>
            </div>
          </div>

          <LoggedAbsencesTable
            absences={LOGGED_ABSENCES}
          />
        </div>

        <div className="space-y-6">
          <ReturnToWorkChecklist
            items={CHECKLIST_ITEMS}
          />

          <AnnualEntitlement
            items={ENTITLEMENTS}
          />
        </div>
      </div>
    </div>
  );
}