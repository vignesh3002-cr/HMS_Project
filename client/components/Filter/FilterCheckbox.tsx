interface FilterCheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function FilterCheckbox({ id, label, checked, onChange }: FilterCheckboxProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2">
      <div className="relative flex items-center justify-center">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <div className="h-2 w-2 rounded border border-[#CBD5E1] bg-white transition peer-checked:border-[#322CC9] peer-checked:bg-[#322CC9]" />
        <svg
          className="pointer-events-none absolute h-3 w-3 text-white opacity-0 transition peer-checked:opacity-100"
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
      <span className="text-[12px] text-[#334155]">{label}</span>
    </label>
  );
}
