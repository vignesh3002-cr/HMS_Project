import { Loader2 } from "lucide-react";

interface RefreshButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  className?: string;
  title?: string;
}

export function RefreshButton({ 
  onClick, 
  isLoading = false,
  className = "",
  title = "Refresh data"
}: RefreshButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`flex items-center gap-1.5 h-[34px] px-3 py-1.5 border border-[#E5E7EB] bg-white rounded-[8px] text-[#374151] text-xs font-medium hover:bg-[#F2F4F6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      title={title}
    >
      <Loader2 size={14} className={isLoading ? "animate-spin" : ""} />
      <span>Refresh</span>
    </button>
  );
}