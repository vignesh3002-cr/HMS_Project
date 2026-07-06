import { useState } from "react";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilterCheckbox } from "./FilterCheckbox";
import type { FilterField as FilterFieldType } from "./types";

interface FilterFieldProps {
  field: FilterFieldType;
  value: any;
  onChange: (name: string, value: any) => void;
}

const inputClass =
  "w-full h-8 rounded-lg border border-[#E2E8F0] bg-[#F0F3FF] px-3 text-[12px] text-[#334155] placeholder:text-[#64748B] outline-none transition focus:border-[#322CC9] focus:ring-2 focus:ring-[#322CC9]/20";

function formatDateValue(value: string | undefined) {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return format(parsed, "MM, dd, yyyy");
}

export function FilterField({ field, value, onChange }: FilterFieldProps) {
  const { id, label, type, placeholder, options, rows } = field;
  const [openDatePicker, setOpenDatePicker] = useState(false);

  switch (type) {
    case "text":
    case "email":
    case "tel":
    case "search":
    case "number": {
      return (
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-semibold text-[#334155]">{label}</label>
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

    case "textarea": {
      return (
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-semibold text-[#334155]">{label}</label>
          <textarea
            name={id}
            rows={rows ?? 4}
            value={value ?? ""}
            onChange={(e) => onChange(id, e.target.value)}
            placeholder={placeholder}
            className={`${inputClass} min-h-[96px] resize-y py-3`}
          />
        </div>
      );
    }

    case "date": {
      const selectedDate = value ? new Date(String(value)) : undefined;

      return (
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-semibold text-[#334155]">{label}</label>
          <Popover open={openDatePicker} onOpenChange={setOpenDatePicker}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`${inputClass} flex items-center justify-between text-left`}
              >
                <span className={value ? "text-[#334155]" : "text-[#64748B]"}>
                  {value ? formatDateValue(String(value)) : placeholder ?? `Select ${label}`}
                </span>
                <CalendarDays className="h-4 w-4 text-[#64748B]" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  onChange(id, date ? format(date, "yyyy-MM-dd") : "");
                  setOpenDatePicker(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      );
    }

    case "select": {
      return (
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-semibold text-[#334155]">{label}</label>
          <Select value={value ?? ""} onValueChange={(v) => onChange(id, v)}>
            <SelectTrigger className="h-8 rounded-lg border-[#E2E8F0] bg-[#F0F3FF] px-3 text-[12px] text-[#334155] focus:border-[#322CC9] focus:ring-2 focus:ring-[#322CC9]/20">
              <SelectValue placeholder={placeholder ?? `Select ${label}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="" className="text-[12px] text-[#64748B]">
                All
              </SelectItem>
              {options?.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)} className="text-[13px]">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    case "multiselect": {
      const selectedValues: string[] = Array.isArray(value) ? value : [];

      const toggleOption = (optionValue: string) => {
        const current = [...selectedValues];
        const idx = current.indexOf(optionValue);
        if (idx >= 0) {
          current.splice(idx, 1);
        } else {
          current.push(optionValue);
        }
        onChange(id, current);
      };

      return (
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-semibold text-[#334155]">{label}</label>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#F0F3FF] px-3 py-1.5 text-[13px] text-[#334155] outline-none transition focus:border-[#322CC9] focus:ring-2 focus:ring-[#322CC9]/20"
              >
                {selectedValues.length === 0 ? (
                  <span className="text-[#64748B]">{placeholder ?? `All`}</span>
                ) : (
                  selectedValues.map((v) => {
                    const opt = options?.find((o) => String(o.value) === v);
                    return (
                      <span
                        key={v}
                        className="inline-flex items-center gap-1 rounded-md bg-[#322CC9]/10 px-2 py-0.5 text-[11px] font-medium text-[#322CC9]"
                      >
                        {opt?.label ?? v}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleOption(v);
                          }}
                          className="inline-flex items-center justify-center leading-none hover:text-[#322CC9]/60"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-full min-w-[180px] p-2" align="start">
              <div className="space-y-0.5">
                {options?.map((opt) => {
                  const isSelected = selectedValues.includes(String(opt.value));
                  return (
                    <label
                      key={opt.value}
                      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-[13px] text-[#334155] transition hover:bg-[#F0F3FF]"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOption(String(opt.value))}
                        className="h-4 w-4 rounded border-[#CBD5E1] text-[#322CC9] focus:ring-[#322CC9]/20"
                      />
                      {opt.label}
                    </label>
                  );
                })}
                {(!options || options.length === 0) && (
                  <p className="px-2 py-2 text-[13px] text-[#64748B]">No options</p>
                )}
              </div>
            </PopoverContent>
          </Popover>
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

    case "hidden":
      return null;

    default:
      return null;
  }
}
