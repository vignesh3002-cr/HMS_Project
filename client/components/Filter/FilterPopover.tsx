import { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FilterPanel } from "./FilterPanel";
import type { FilterField } from "./types";
import { Funnel } from "lucide-react";

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
          <Funnel className="w-4 h-4" />            
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
