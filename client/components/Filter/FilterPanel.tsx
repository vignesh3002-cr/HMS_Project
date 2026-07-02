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
    <div className="w-[367px] rounded-2xl bg-white shadow-xl p-6 pb-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-[17px] font-bold text-[#1A1B26]">{title}</h2>
        <button
          type="button"
          onClick={onClear}
          className="text-[15px] font-medium text-[#322CC9] hover:underline"
        >
          Clear All
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onApply();
        }}
        className="space-y-6"
      >
        {fields.map((field) => (
          <FilterField
            key={field.id}
            field={field}
            value={values[field.id]}
            onChange={onChange}
          />
        ))}

        <FilterButton onApply={onApply} />
      </form>
    </div>
  );
}
