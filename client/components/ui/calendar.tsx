import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

type CalendarMode = "single" | "range" | "multiple";

interface CalendarProps {
  className?: string;
  classNames?: Record<string, string>;
  showOutsideDays?: boolean;
  mode?: CalendarMode;
  selected?: Date | { from: Date; to: Date } | Date[] | undefined;
  onSelect?: (date: Date | { from: Date; to: Date } | Date[] | undefined) => void;
  [key: string]: any;
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  mode = "single",
  selected,
  onSelect,
  ...props
}: CalendarProps) {
  // Create DayPicker props with type assertion to bypass complex conditional types
  // The external API remains clean with proper TypeScript support
  const dayPickerProps = {
    mode,
    selected,
    onSelect,
    showOutsideDays,
    className: cn("p-3", className),
    classNames: {
      months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
      month: "space-y-4",
      caption: "flex justify-center pt-1 relative items-center",
      caption_label: "text-sm font-medium",
      nav: "space-x-1 flex items-center",
      nav_button:
        "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border border-[#E5E7EB] rounded-md",
      nav_button_previous: "absolute left-1",
      nav_button_next: "absolute right-1",
      table: "w-full border-collapse space-y-1",
      head_row: "flex",
      head_cell:
        "rounded-md w-9 font-normal text-[0.8rem] text-[#6B7280]",
      row: "flex w-full mt-2",
      cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
      day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-[#F2F4F6] rounded-md",
      day_selected:
        "bg-[#00488D] text-white hover:bg-[#00488D] hover:text-white focus:bg-[#00488D] focus:text-white rounded-md",
      day_range_start:
        "bg-[#00488D] text-white hover:bg-[#00488D] hover:text-white focus:bg-[#00488D] focus:text-white rounded-l-md",
      day_range_end:
        "bg-[#00488D] text-white hover:bg-[#00488D] hover:text-white focus:bg-[#00488D] focus:text-white rounded-r-md",
      day_range_middle:
        "bg-[#D6E3FF] text-[#00488D] hover:bg-[#D6E3FF] rounded-none",
      day_today: "bg-[#D6E3FF] text-[#00488D] rounded-md",
      day_outside:
        "text-[#9CA3AF] opacity-50",
      day_disabled: "text-[#D1D5DB] opacity-50",
      day_hidden: "invisible",
      ...classNames,
    },
    components: {
      Chevron: (chevronProps: { orientation: "left" | "right" | "up" | "down"; className?: string }) => {
        if (chevronProps.orientation === "left") {
          return <ChevronLeft className="h-4 w-4" />;
        }
        return <ChevronRight className="h-4 w-4" />;
      },
    },
    ...props,
  } as any; // Bypass DayPicker's complex conditional types

  return <DayPicker {...dayPickerProps} />;
}
Calendar.displayName = "Calendar";

export { Calendar };