import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  label: string;
  value: string;
}

export interface MultiSelectDropdownProps {
  options: (MultiSelectOption | string)[];
  value: string[];
  onValueChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function normalizeOptions(
  options: (MultiSelectOption | string)[],
): MultiSelectOption[] {
  return options.map((option) =>
    typeof option === "string" ? { label: option, value: option } : option,
  );
}

// Same interaction model as the "multiselect" field in client/components/Filter/FilterField.tsx
// (popover + checkbox list + removable chips), restyled to match this form's own look.
export function MultiSelectDropdown({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  disabled,
  className,
}: MultiSelectDropdownProps) {
  const normalized = React.useMemo(() => normalizeOptions(options), [options]);
  const [open, setOpen] = React.useState(false);

  const toggleOption = (optionValue: string) => {
    const next = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onValueChange(next);
  };

  return (
    <Popover open={disabled ? false : open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex min-h-[60px] w-[900px] flex-wrap items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed",
            className,
          )}
        >
          {value.length === 0 ? (
            <span className="text-gray-400">{placeholder}</span>
          ) : (
            value.map((v) => {
              const opt = normalized.find((o) => o.value === v);
              return (
                <span
                  key={v}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                >
                  {opt?.label ?? v}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOption(v);
                    }}
                    className="inline-flex items-center justify-center leading-none hover:text-blue-900"
                  >
                    ×
                  </button>
                </span>
              );
            })
          )}
          <ChevronDown
            className={cn(
              "ml-auto h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] max-h-64 slim-scrollbar overflow-y-auto rounded-xl border-gray-200 p-1.5 shadow-lg"
        align="start"
      >
        <div className="space-y-0.5">
          {normalized.map((opt) => {
            const isSelected = value.includes(opt.value);
            return (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-900 transition-colors hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleOption(opt.value)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                {opt.label}
              </label>
            );
          })}
          {normalized.length === 0 && (
            <p className="px-3 py-2 text-sm text-gray-400">No options</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
