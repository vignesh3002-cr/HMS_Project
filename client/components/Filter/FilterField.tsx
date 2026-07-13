import { useState } from "react";
import { format } from "date-fns";
import { CalendarDays, ChevronDown } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandGroup,
} from "@/components/ui/command";
import { FilterCheckbox } from "./FilterCheckbox";
import type { FilterField as FilterFieldType } from "./types";

interface FilterFieldProps {
  field: FilterFieldType;
  value: any;
  onChange: (name: string, value: any) => void;
}

const inputClass =
  "w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13px] text-clinical-body placeholder:text-clinical-label shadow-sm outline-none transition-all duration-150 hover:border-clinical-blue-mid focus:border-clinical-blue focus:ring-2 focus:ring-clinical-blue/15";

const labelClass = "text-[12px] font-semibold text-clinical-body";

function formatDateValue(value: string | undefined) {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return format(parsed, "MM, dd, yyyy");
}

export function FilterField({ field, value, onChange }: FilterFieldProps) {
  const { id, label, type, placeholder, options, rows } = field;
  const [openDatePicker, setOpenDatePicker] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);

  switch (type) {
    case "text":
    case "email":
    case "tel":
    case "search":
    case "number": {
      return (
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>{label}</label>
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
          <label className={labelClass}>{label}</label>
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
          <label className={labelClass}>{label}</label>
          <Popover open={openDatePicker} onOpenChange={setOpenDatePicker}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`${inputClass} group flex items-center justify-between text-left`}
              >
                <span className={value ? "text-clinical-body" : "text-clinical-label"}>
                  {value ? formatDateValue(String(value)) : placeholder ?? `Select ${label}`}
                </span>
                <CalendarDays className="h-4 w-4 text-clinical-label transition-colors group-hover:text-clinical-blue" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto rounded-lg border-[#E2E8F0] p-2 shadow-lg" align="start">
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
          <label className={labelClass}>{label}</label>
          <Select value={value ?? ""} onValueChange={(v) => onChange(id, v)}>
            <SelectTrigger className="h-9 rounded-lg border-[#E2E8F0] bg-white px-3 text-[13px] text-clinical-body shadow-sm transition-all duration-150 hover:border-clinical-blue-mid focus:border-clinical-blue focus:ring-2 focus:ring-clinical-blue/15">
              <SelectValue placeholder={placeholder ?? `Select ${label}`} />
            </SelectTrigger>
            <SelectContent className="rounded-lg border-[#E2E8F0] shadow-lg">
              <SelectItem value="" className="text-[13px] text-clinical-label">
                All
              </SelectItem>
              {options?.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)} className="text-[13px] text-clinical-body">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    case "combobox": {
      const selectedOption = options?.find((opt) => String(opt.value) === String(value ?? ""));

      return (
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>{label}</label>
          <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`${inputClass} flex items-center justify-between text-left`}
              >
                <span className={selectedOption ? "text-clinical-body" : "text-clinical-label"}>
                  {selectedOption ? selectedOption.label : placeholder ?? `Search ${label}`}
                </span>
                <ChevronDown className="h-4 w-4 flex-shrink-0 text-clinical-label" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] rounded-lg border-[#E2E8F0] p-0 shadow-lg" align="start">
              <Command>
                <CommandInput
                  placeholder={`Search ${label.toLowerCase()}...`}
                  className="h-9 text-[13px]"
                />
                <CommandList>
                  <CommandEmpty className="py-4 text-center text-[13px] text-clinical-label">
                    No results found.
                  </CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="All"
                      onSelect={() => {
                        onChange(id, "");
                        setOpenCombobox(false);
                      }}
                      className="text-[13px] text-clinical-body"
                    >
                      All
                    </CommandItem>
                    {options?.map((opt) => (
                      <CommandItem
                        key={opt.value}
                        value={opt.label}
                        onSelect={() => {
                          onChange(id, String(opt.value));
                          setOpenCombobox(false);
                        }}
                        className="text-[13px] text-clinical-body"
                      >
                        {opt.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
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
          <label className={labelClass}>{label}</label>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-[13px] text-clinical-body shadow-sm outline-none transition-all duration-150 hover:border-clinical-blue-mid focus:border-clinical-blue focus:ring-2 focus:ring-clinical-blue/15"
              >
                {selectedValues.length === 0 ? (
                  <span className="text-clinical-label">{placeholder ?? `All`}</span>
                ) : (
                  selectedValues.map((v) => {
                    const opt = options?.find((o) => String(o.value) === v);
                    return (
                      <span
                        key={v}
                        className="inline-flex items-center gap-1 rounded-full bg-clinical-blue-light px-2.5 py-0.5 text-[11px] font-medium text-clinical-blue"
                      >
                        {opt?.label ?? v}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleOption(v);
                          }}
                          className="inline-flex items-center justify-center leading-none hover:text-clinical-blue-mid"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })
                )}
                <ChevronDown className="ml-auto h-4 w-4 flex-shrink-0 text-clinical-label" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-full min-w-[200px] rounded-lg border-[#E2E8F0] p-1.5 shadow-lg" align="start">
              <div className="space-y-0.5">
                {options?.map((opt) => {
                  const isSelected = selectedValues.includes(String(opt.value));
                  return (
                    <label
                      key={opt.value}
                      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-[13px] text-clinical-body transition-colors duration-150 hover:bg-clinical-input-bg"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOption(String(opt.value))}
                        className="h-4 w-4 rounded border-[#CBD5E1] accent-clinical-blue focus:ring-clinical-blue/20"
                      />
                      {opt.label}
                    </label>
                  );
                })}
                {(!options || options.length === 0) && (
                  <p className="px-2 py-2 text-[13px] text-clinical-label">No options</p>
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
