import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface DoctorBranchDisplayProps {
  branches: {
    branch_id: string;
    branch_name: string | null;
    branch_area?: string | null;
    has_schedule?: boolean;
  }[];
  showScheduleIndicator?: boolean;
}

export function DoctorBranchDisplay({ branches, showScheduleIndicator = false }: DoctorBranchDisplayProps) {
  const list = branches ?? [];

  if (list.length === 0) {
    return <span className="hms-content-text text-[#94A3B8]">—</span>;
  }

  const formatBranch = (b: typeof list[0]) => {
    const name = b.branch_name ?? "\u2014";
    return b.branch_area ? `${name} (${b.branch_area})` : name;
  };

  const primary = list[0];
  const others = list.slice(1);
  const primaryName = formatBranch(primary);

  if (others.length === 0) {
    return (
      <span className="flex items-center gap-1 hms-content-text text-[#191C1E]">
        {primaryName}
        {showScheduleIndicator && primary.has_schedule !== undefined && (
          <span className={primary.has_schedule ? "text-[#16A34A]" : "text-[#F97316]"} aria-hidden="true">●</span>
        )}
      </span>
    );
  }

  const otherNames = others.map(formatBranch);
  const tooltipText = `Also assigned to: ${otherNames.join(", ")}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex items-center gap-1 hms-content-text text-[#191C1E] font-medium cursor-help">
          {primaryName} + {others.length} more
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" align="center">
        <p className="hms-content-text text-[#374151]">{tooltipText}</p>
      </TooltipContent>
    </Tooltip>
  );
}