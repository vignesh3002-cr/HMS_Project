interface FilterButtonProps {
  onApply: () => void;
}

export function FilterButton({ onApply }: FilterButtonProps) {
  return (
    <button
      type="button"
      onClick={onApply}
      className="w-full h-9 rounded-lg bg-clinical-blue text-[12px] font-semibold text-white shadow-sm shadow-clinical-blue/20 transition-all duration-150 hover:bg-clinical-blue-mid active:scale-[0.98]"
    >
      Apply Filters
    </button>
  );
}
