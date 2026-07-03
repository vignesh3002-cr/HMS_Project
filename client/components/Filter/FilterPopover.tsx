import { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FilterPanel } from "./FilterPanel";
import type { FilterField } from "./types";

interface FilterPopoverProps {
  fields: FilterField[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  onApply: () => void;
  onClear: () => void;
  title?: string;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function FilterPopover({
  fields,
  values,
  onChange,
  onApply,
  onClear,
  title = "Advanced Filters",
  trigger,
  open,
  onOpenChange,
}: FilterPopoverProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <button className="flex items-center gap-2 h-[27px] px-4 rounded-md border border-[#E5E7EB] text-[#374151] text-sm font-medium transition-colors duration-150 hover:bg-[#F2F4F6] hover:border-[#00488D]">
            <svg width="12" height="11" viewBox="0 0 12 11" fill="none">
              <path d="M11.293.519531C11.2292.364583 11.1266.239258 10.9854.143555C10.8441.0478516 10.6823 0 10.5 0H.875C.638021 0 .432943.0865885.259766.259766C.0865885.432943 0 .638021 0 .875C0 .984375.0205078 1.09147.0615234 1.19629C.102539 1.30111.159505 1.38997.232422 1.46289L3.9375 5.42773V9.625C3.9375 9.87109 4.02181 10.0785 4.19043 10.2471C4.35905 10.4157 4.56641 10.5 4.8125 10.5H7.4375C7.66016 10.5 7.84766 10.4219 7.99609 10.2656C8.14453 10.1094 8.21875 9.92578 8.21875 9.71094V5.42773L11.9238 1.46289C11.9967 1.38997 12.0537 1.30339 12.0947 1.20312C12.1357 1.10286 12.1562.99349 12.1562.875C12.1562.811198 12.1494.749674 12.1357.69043C12.122.631185 12.1015.574219 12.0742.519531Z" fill="#374151"/>
            </svg>
            Filters
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[280px] rounded-[16px] border border-[#E5E7EB] bg-white p-0 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.16)]" align="end">
        <FilterPanel
          title={title}
          fields={fields}
          values={values}
          onChange={onChange}
          onApply={onApply}
          onClear={onClear}
        />
      </PopoverContent>
    </Popover>
  );
}
