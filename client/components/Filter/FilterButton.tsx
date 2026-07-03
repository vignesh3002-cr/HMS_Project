interface FilterButtonProps {
  onApply: () => void;
}

export function FilterButton({ onApply }: FilterButtonProps) {
  return (
    <button
      type="button"
      onClick={onApply}
      className="w-full h-9 rounded-lg bg-[#3B31D8] text-[12px] font-semibold text-white shadow shadow-[#3B31D8]/20 transition hover:bg-[#2E26B3]"
    >
      Apply Filters
    </button>
  );
}
