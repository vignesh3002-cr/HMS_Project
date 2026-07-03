import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilterCheckbox } from "./FilterCheckbox";
import type { FilterField as FilterFieldType } from "./types";

interface FilterFieldProps {
  field: FilterFieldType;
  value: any;
  onChange: (name: string, value: any) => void;
}

const inputClass =
  "w-full h-11 rounded-lg border border-[#e2e6f3] bg-[#f3f5fa] px-4 text-[15px] placeholder:text-[#6b7280] focus:border-[#322cc9] focus:ring-1 focus:ring-[#322cc9] outline-none";

export function FilterField({ field, value, onChange }: FilterFieldProps) {
  const { id, label, type, placeholder, options } = field;

  switch (type) {
    case "text":
    case "tel":
    case "number": {
      return (
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-bold text-[#454754]">{label}</label>
          <input
            name={id}
            type={type === "tel" ? "tel" : type}
            value={value ?? ""}
            onChange={(e) => onChange(id, e.target.value)}
            placeholder={placeholder}
            className={inputClass}
          />
        </div>
      );
    }

    case "select": {
      return (
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-bold text-[#454754]">{label}</label>
          <Select value={value ?? ""} onValueChange={(v) => onChange(id, v)}>
            <SelectTrigger className="h-11 rounded-lg border-[#e2e6f3] bg-[#f3f5fa] px-4 text-[15px] placeholder:text-[#6b7280] focus:border-[#322cc9] focus:ring-1 focus:ring-[#322cc9]">
              <SelectValue placeholder={placeholder ?? `Select ${label}`} />
            </SelectTrigger>
            <SelectContent>
              {options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-[15px]">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    case "checkbox": {
      return (
        <FilterCheckbox
          id={id}
          label={label}
          checked={!!value}
          onChange={(checked) => onChange(id, checked)}
        />
      );
    }

    default:
      return null;
  }
}
