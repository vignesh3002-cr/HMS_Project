interface FilterCheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function FilterCheckbox({ id, label, checked, onChange }: FilterCheckboxProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 shadow-sm transition-all duration-150 hover:border-clinical-blue-mid">
      <div className="relative flex h-4 w-4 flex-shrink-0 items-center justify-center">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <div className="h-4 w-4 rounded border border-[#CBD5E1] bg-white transition-colors duration-150 peer-checked:border-clinical-blue peer-checked:bg-clinical-blue" />
        <svg
          className="pointer-events-none absolute h-3 w-3 text-white opacity-0 transition-opacity duration-150 peer-checked:opacity-100"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <span className="text-[12px] text-clinical-body">{label}</span>
    </label>
  );
}
