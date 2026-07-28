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
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return normalized;
    return normalized.filter((option) => option.label.toLowerCase().includes(query));
  }, [normalized, search]);

  const toggleOption = (optionValue: string) => {
    const next = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onValueChange(next);
  };

  return (
    <Popover
      open={disabled ? false : open}
      onOpenChange={
        disabled
          ? undefined
          : (next) => {
              setOpen(next);
              if (!next) setSearch("");
            }
      }
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex min-h-[46px] w-full flex-wrap items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed",
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
                  {/* A real <button> here would nest inside the trigger's own
                      <button>, which is invalid HTML (React warns and some
                      browsers mis-handle the click). A span with button
                      semantics avoids the nesting while staying clickable
                      and keyboard-accessible. */}
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove ${opt?.label ?? v}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOption(v);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleOption(v);
                      }
                    }}
                    className="inline-flex items-center justify-center leading-none hover:text-blue-900 cursor-pointer"
                  >
                    ×
                  </span>
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
        <input
          type="text"
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Type to search..."
          className="mb-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="space-y-0.5">
          {filtered.map((opt) => {
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
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-sm text-gray-400">No options</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
