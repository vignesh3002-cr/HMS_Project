import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { MultiSelectOption } from "@/components/ui/multi-select-dropdown";

export interface SingleSelectDropdownProps {
  options: (MultiSelectOption | string)[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /* When set, a search with no exact match offers "<createLabel> '<typed>'". */
  onCreateOption?: (typed: string) => void;
  createLabel?: string;
  /* Shown for a value that isn't one of the options (e.g. a typed one). */
  valueLabel?: string;
}

function normalizeOptions(
  options: (MultiSelectOption | string)[],
): MultiSelectOption[] {
  return options.map((option) =>
    typeof option === "string" ? { label: option, value: option } : option,
  );
}

// Single-value sibling of MultiSelectDropdown: same popover, search box and
// "+ Add" row, but picking an option replaces the value and closes the list.
export function SingleSelectDropdown({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  disabled,
  className,
  onCreateOption,
  createLabel = "+ Add",
  valueLabel,
}: SingleSelectDropdownProps) {
  const normalized = React.useMemo(() => normalizeOptions(options), [options]);
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return normalized;
    return normalized.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        (option.hint?.toLowerCase().includes(query) ?? false),
    );
  }, [normalized, search]);

  const typed = search.trim();
  const canCreate =
    Boolean(onCreateOption) &&
    typed.length > 0 &&
    !normalized.some((option) => option.label.toLowerCase() === typed.toLowerCase());

  const selectedLabel = value
    ? normalized.find((option) => option.value === value)?.label ?? valueLabel ?? value
    : "";

  const close = () => {
    setOpen(false);
    setSearch("");
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
            "flex h-10 w-full items-center justify-between gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-left text-sm text-gray-900 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed",
            className,
          )}
        >
          <span className={cn("min-w-0 flex-1 truncate", !value && "text-gray-400")}>
            {selectedLabel || placeholder}
          </span>
          {value && !disabled && (
            /* Not a <button>: it sits inside the trigger's <button>. */
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear selection"
              onClick={(e) => {
                e.stopPropagation();
                onValueChange("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onValueChange("");
                }
              }}
              className="shrink-0 cursor-pointer px-1 leading-none text-gray-400 hover:text-gray-700"
            >
              ×
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200",
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
          onKeyDown={(e) => {
            if (e.key === "Enter" && canCreate) {
              e.preventDefault();
              onCreateOption?.(typed);
              close();
            }
          }}
          placeholder="Type to search..."
          className="mb-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="space-y-0.5">
          {filtered.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onValueChange(opt.value);
                  close();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-gray-900 transition-colors hover:bg-gray-50",
                  isSelected && "bg-blue-50 font-medium text-blue-700 hover:bg-blue-50",
                )}
              >
                <Check
                  className={cn("h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")}
                />
                <span className="min-w-0 flex-1">{opt.label}</span>
                {opt.hint && (
                  <span className="shrink-0 text-xs text-gray-400">{opt.hint}</span>
                )}
              </button>
            );
          })}
          {filtered.length === 0 && !canCreate && (
            <p className="px-3 py-2 text-sm text-gray-400">No options</p>
          )}
          {canCreate && (
            <button
              type="button"
              onClick={() => {
                onCreateOption?.(typed);
                close();
              }}
              className="flex w-full items-center gap-1 rounded-lg border-t border-gray-100 px-3 py-2 text-left text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50"
            >
              <span className="shrink-0">{createLabel}</span>
              <span className="truncate">"{typed}"</span>
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
