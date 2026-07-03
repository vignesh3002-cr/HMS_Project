interface FilterButtonProps {
  onApply: () => void;
}

export function FilterButton({ onApply }: FilterButtonProps) {
  return (
    <button
      type="button"
      onClick={onApply}
      className="w-full h-12 rounded-xl bg-[#312ccb] text-white text-[15px] font-semibold shadow-sm hover:bg-[#2722b3] transition"
    >
      Apply Filters
    </button>
  );
}
