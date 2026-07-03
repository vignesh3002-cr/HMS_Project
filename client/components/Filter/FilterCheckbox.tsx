interface FilterCheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function FilterCheckbox({ id, label, checked, onChange }: FilterCheckboxProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className="relative flex items-center justify-center">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <div className="w-5 h-5 rounded border border-gray-300 bg-white peer-checked:bg-[#322cc9] peer-checked:border-[#322cc9]" />
        <svg
          className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none"
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
      <span className="text-[15px] text-[#1a1b26]">{label}</span>
    </label>
  );
}
