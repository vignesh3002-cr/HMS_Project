import { FilterField } from "./FilterField";
import { FilterButton } from "./FilterButton";
import type { FilterPanelProps } from "./types";

export function FilterPanel({
  title,
  fields,
  values,
  onChange,
  onApply,
  onClear,
}: FilterPanelProps) {
  return (
    <div className="w-[280px] max-w-[calc(100vw-2rem)] rounded-[16px] border border-[#EEF2F7] bg-white p-5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.12)]">
      <div className="mb-4 flex items-center justify-between border-b border-[#EEF2F7] pb-3">
        <h2 className="text-[14px] font-bold text-[#0F172A]">{title}</h2>
        <button
          type="button"
          onClick={onClear}
          className="text-[10px] font-semibold uppercase tracking-[0.08em] text-clinical-blue transition-colors hover:text-clinical-blue-mid hover:underline"
        >
          Clear All
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onApply();
        }}
        className="space-y-4"
      >
        {fields.map((field) => (
          <FilterField
            key={field.id}
            field={field}
            value={values[field.id]}
            onChange={onChange}
          />
        ))}

        <div className="border-t border-[#EEF2F7] pt-4">
          <FilterButton onApply={onApply} />
        </div>
      </form>
    </div>
  );
}