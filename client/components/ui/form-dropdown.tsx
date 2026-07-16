import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FormDropdownOption {
  label: string;
  value: string;
}

export interface FormDropdownProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "size"
  > {
  options: (FormDropdownOption | string)[];
  value?: string;
  onValueChange?: (value: string) => void;
  emptyMessage?: string;
}

function normalizeOptions(
  options: (FormDropdownOption | string)[],
): FormDropdownOption[] {
  return options.map((option) =>
    typeof option === "string" ? { label: option, value: option } : option,
  );
}

const FormDropdown = React.forwardRef<HTMLInputElement, FormDropdownProps>(
  (
    {
      options,
      value,
      onValueChange,
      placeholder = "Search...",
      emptyMessage = "No results found.",
      disabled,
      onFocus,
      onBlur,
      ...inputProps
    },
    ref,
  ) => {
    const listId = React.useId();
    const normalized = React.useMemo(() => normalizeOptions(options), [options]);
    const selectedOption = React.useMemo(
      () => normalized.find((option) => option.value === value),
      [normalized, value],
    );

    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState(selectedOption?.label ?? "");
    const containerRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
      setSearch(selectedOption?.label ?? "");
    }, [selectedOption]);

    React.useEffect(() => {
      if (!open) return;

      function handleClickOutside(event: MouseEvent) {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
        ) {
          setOpen(false);
          setSearch(selectedOption?.label ?? "");
        }
      }

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open, selectedOption]);

    const filtered = React.useMemo(() => {
      const query = search.trim().toLowerCase();
      if (!query) return normalized;
      return normalized.filter((option) =>
        option.label.toLowerCase().includes(query),
      );
    }, [normalized, search]);

    function handleSelect(option: FormDropdownOption) {
      onValueChange?.(option.value);
      setSearch(option.label);
      setOpen(false);
    }

    function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
      if (event.key === "Escape") {
        setOpen(false);
        setSearch(selectedOption?.label ?? "");
      } else if (event.key === "Enter" && filtered.length === 1) {
        handleSelect(filtered[0]);
      }
    }

    function handleMergeRefs(node: HTMLInputElement | null) {
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
      (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
    }

    return (
      <div ref={containerRef} className={cn("relative w-full")}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            {...inputProps}
            ref={handleMergeRefs}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            autoComplete="off"
            disabled={disabled}
            placeholder={placeholder}
            value={search}
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 pl-9 pr-9"
            onFocus={(event) => {
              setOpen(true);
              onFocus?.(event);
            }}
            onChange={(event) => {
              setSearch(event.target.value);
              if (!open) setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            onBlur={onBlur}
          />
          <button
            type="button"
            disabled={disabled}
            tabIndex={-1}
            onClick={() => {
              inputRef.current?.focus();
              setOpen((prev) => !prev);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                open && "rotate-180",
              )}
            />
          </button>
        </div>

        <div
          className={cn(
            "absolute left-0 right-0 mt-1 max-h-64 slim-scrollbar w-full overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 text-gray-900 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] z-50 origin-top transition-all duration-200 ease-out",
            open && !disabled
              ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
              : "opacity-0 scale-95 -translate-y-2 pointer-events-none",
          )}
        >
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-center text-sm text-gray-400">
              {emptyMessage}
            </p>
          ) : (
            <ul id={listId} role="listbox">
              {filtered.map((option) => {
                const isSelected = option.value === value;
                return (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      handleSelect(option);
                    }}
                    className={cn(
                      "flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm transition-colors relative group",
                      isSelected
                        ? "bg-blue-50 font-medium text-blue-700"
                        : "text-gray-900 hover:bg-gray-50",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute left-0 top-0 bottom-0 w-1 bg-blue-600 transition-transform duration-200 origin-center",
                        isSelected ? "scale-y-100" : "scale-y-0 group-hover:scale-y-100",
                      )}
                    />
                    <span className="pl-2">{option.label}</span>
                    <Check
                      className={cn(
                        "h-4 w-4 text-blue-600 transition-opacity",
                        isSelected ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  },
);
FormDropdown.displayName = "FormDropdown";

export { FormDropdown };
