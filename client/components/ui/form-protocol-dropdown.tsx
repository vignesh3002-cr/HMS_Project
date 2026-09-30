import * as React from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";

export interface FormDropdownOption {
  label: string;
  value: string;
  // Optional visual affordances for options that need to stand out — e.g. a
  // branch admin already assigned elsewhere gets a light-blue highlight and
  // a badge naming their current branch.
  highlight?: boolean;
  badge?: string;
}

export interface FormDropdownProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "size"
  > {
  options: (FormDropdownOption | string)[];
  value?: string;
  onValueChange?: (value: string) => void;
  /* When set, a search with no exact match offers "+ Add '<typed>'". */
  onCreateOption?: (typed: string) => void;
  emptyMessage?: string;
  leftIcon?: React.ReactNode;
  loading?: boolean;
}

/**
 * FormDropdown — styled to match CreateProtocol.tsx design tokens:
 * - bg: #f8fafc (soft grey canvas)
 * - border: #dde4ec
 * - radius: rounded-[11px]
 * - text: #17212e
 * - placeholder: #a7b2bf
 * - focus border: #12335c
 * - focus bg: white
 * - focus ring: 3px #12335c/15
 * - disabled bg: #f1f3f5
 * - disabled text: #9aa5b1
 * - disabled cursor: not-allowed
 */
function normalizeOptions(
  options: (FormDropdownOption | string)[],
): FormDropdownOption[] {
  return options.map((option) =>
    typeof option === "string" ? { label: option, value: option } : option,
  );
}

const FormProtocolDropdown = React.forwardRef<HTMLInputElement, FormDropdownProps>(
  (
    {
      options,
      value,
      onValueChange,
      onCreateOption,
      placeholder = "Select...",
      emptyMessage = "No results found.",
      disabled,
      onFocus,
      onBlur,
      leftIcon,
      loading = false,
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
    const [search, setSearch] = React.useState(
      selectedOption?.label ?? value ?? "",
    );
    const [coords, setCoords] = React.useState<{
      top: number;
      left: number;
      width: number;
    } | null>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const listRef = React.useRef<HTMLDivElement>(null);
    const chipRef = React.useRef<HTMLButtonElement>(null);

    React.useEffect(() => {
      setSearch(selectedOption?.label ?? value ?? "");
    }, [selectedOption, value]);

    React.useEffect(() => {
      if (!open) return;

      function handleClickOutside(event: MouseEvent) {
        const target = event.target as Node;
        if (
          containerRef.current &&
          !containerRef.current.contains(target) &&
          listRef.current &&
          !listRef.current.contains(target)
        ) {
          setOpen(false);
          setSearch(selectedOption?.label ?? value ?? "");
        }
      }

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open, selectedOption, value]);

    const filtered = React.useMemo(() => {
      const query = search.trim().toLowerCase();
      const isUnmodifiedSelection =
        selectedOption && search === selectedOption.label;
      if (!query || isUnmodifiedSelection) return normalized;
      return normalized.filter((option) =>
        option.label.toLowerCase().includes(query),
      );
    }, [normalized, search, selectedOption]);

    function handleSelect(option: FormDropdownOption) {
      onValueChange?.(option.value);
      setSearch(option.label);
      setOpen(false);
    }

    /* A typed value with no exact label match is offered as "+ Add". */
    const typed = search.trim();
    const canCreate =
      !disabled &&
      !loading &&
      Boolean(onCreateOption) &&
      typed.length > 0 &&
      typed.toLowerCase() !== (value ?? "").trim().toLowerCase() &&
      !normalized.some(
        (option) => option.label.toLowerCase() === typed.toLowerCase(),
      );

    function handleCreate() {
      if (!canCreate) return;
      onCreateOption?.(typed);
      setSearch(typed);
      setOpen(false);
    }

    function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
      if (event.key === "Escape") {
        setOpen(false);
        setSearch(selectedOption?.label ?? value ?? "");
      } else if (event.key === "Enter" && filtered.length === 1) {
        handleSelect(filtered[0]);
      } else if (event.key === "Enter" && canCreate && filtered.length === 0) {
        handleCreate();
      }
    }

    const updatePosition = React.useCallback(() => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        setOpen(false);
        return;
      }
      /* The "+ Add" chip sits directly under the input (mt-1); start the
         list below it so the two never overlap. */
      const chipOffset = chipRef.current ? chipRef.current.offsetHeight + 4 : 0;
      const fitsBelow = rect.bottom + chipOffset + 260 <= window.innerHeight;
      const top = fitsBelow
        ? rect.bottom + chipOffset
        : Math.max(8, rect.top - 264);
      const baseWidth = rect.width;
      const targetWidth = Math.min(window.innerWidth - 24, Math.round(baseWidth * 1.3));
      setCoords({ top, left: rect.left, width: targetWidth });
    }, []);

    React.useEffect(() => {
      if (!open) return;
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }, [open, updatePosition, canCreate]);

    function openDropdown() {
      if (loading || disabled) return;
      updatePosition();
      setOpen(true);
    }

    function handleMergeRefs(node: HTMLInputElement | null) {
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
      (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
    }

    return (
      <div ref={containerRef} className="relative w-full">
        <div className="relative">
          {leftIcon ? (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          ) : null}
          <input
            {...inputProps}
            ref={handleMergeRefs}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            autoComplete="off"
            disabled={disabled || loading}
            placeholder={placeholder}
            value={search}
            className="w-full h-9 pl-3 pr-8 bg-[#f8fafc] border border-[#dde4ec] rounded-[11px] text-[13.5px] text-[#17212e] placeholder:text-[#a7b2bf] outline-none transition-all duration-150 hover:border-[#c7d2dd] hover:bg-[#f5f8fb] focus:border-[#12335c] focus:bg-white focus:ring-3 focus:ring-[#12335c]/15 disabled:bg-[#f1f3f5] disabled:text-[#9aa5b1] disabled:cursor-not-allowed"
            onFocus={(event) => {
              openDropdown();
              onFocus?.(event);
            }}
            onClick={openDropdown}
            onChange={(event) => {
              setSearch(event.target.value);
              if (!open) openDropdown();
            }}
            onKeyDown={handleKeyDown}
            onBlur={onBlur}
          />
          {loading ? (
            <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
          ) : (
            <button
              type="button"
              disabled={disabled}
              tabIndex={-1}
              onClick={() => (open ? setOpen(false) : openDropdown())}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  open && "rotate-180",
                )}
              />
            </button>
          )}
        </div>

        {/* "+ Add" chip - sits directly under the input box and appears only
            when the typed text matches no option. The option list below is
            offset so it always opens underneath this chip. */}
        {canCreate ? (
          <button
            ref={chipRef}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleCreate}
            className="mt-1 flex w-full items-center gap-1.5 overflow-hidden rounded-[11px] border border-[#dde4ec] bg-white px-3 py-1.5 text-left text-[12.5px] font-semibold leading-4 text-[#12335c] shadow-sm transition-colors hover:bg-[#f4f6f9] focus:outline-none focus:ring-2 focus:ring-[#12335c]/20"
          >
            <span className="shrink-0">+ Add</span>
            <span className="truncate">"{typed}"</span>
          </button>
        ) : null}

        {/* Creatable fields (FORM / MEDICATION / BRAND) never show the
            empty-list message - with no match the list simply stays closed
            and the "+ Add" chip under the input carries the affordance. */}
        {open &&
        !disabled &&
        !loading &&
        coords &&
        !(onCreateOption && filtered.length === 0)
          ? createPortal(
              <div
                ref={listRef}
                style={{
                  position: "fixed",
                  top: coords.top,
                  left: coords.left,
                  width: coords.width,
                }}
                className="z-[9999] mt-1 max-h-64 slim-scrollbar overflow-y-auto rounded-[11px] border border-[#dde4ec] bg-white py-1 text-[#17212e] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] origin-top"
              >
                {filtered.length === 0 ? (
                  <p className="px-4 py-3 text-center text-sm text-[#8a97a6]">
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
                            "flex cursor-pointer items-center justify-between px-3 py-2 rounded-[11px] text-[13.5px] transition-colors relative group",
                            isSelected
                              ? "bg-[#f8fafc] font-medium text-[#12335c]"
                              : option.highlight
                              ? "bg-[#dde4ec]/10 text-[#17212c] hover:bg-[#dde4ec]/15"
                              : "text-[#17212e] hover:bg-[#f4f6f9]",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute left-0 top-0 bottom-0 w-1 bg-[#12335c] transition-transform duration-200 origin-center",
                              isSelected ? "scale-y-100" : "scale-y-0 group-hover:scale-y-100",
                            )}
                          />
                          <span className="pl-2 flex flex-col">
                            <span>{option.label}</span>
                            {option.badge && (
                              <span className="text-[11px] font-medium text-[#12335c]">
                                {option.badge}
                              </span>
                            )}
                          </span>
<Check
              className={cn(
                "h-4 w-4 text-[#12335c] transition-opacity",
                isSelected ? "opacity-100" : "opacity-0",
              )}
            />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>,
              document.body,
            )
          : null}
      </div>
    );
  },
);

FormProtocolDropdown.displayName = "FormProtocolDropdown";

export { FormProtocolDropdown };