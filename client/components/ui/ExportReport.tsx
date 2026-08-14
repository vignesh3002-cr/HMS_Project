import { useState, useEffect, useRef } from "react";
import { Download, FileText, FileSpreadsheet, ChevronDown } from "lucide-react";

export interface ExportOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ExportReportProps {
  options?: ExportOption[];
  buttonClassName?: string;
  dropdownClassName?: string;
  onExport?: (format: string) => void;
}

export default function ExportReport({
  options = [
    { id: "pdf", label: "Export as PDF", icon: FileText },
    { id: "csv", label: "Export as CSV", icon: FileSpreadsheet },
  ],
  buttonClassName = "flex items-center gap-2 px-4 py-2 border border-[#E5E7EB] bg-white rounded-lg text-[#424752] text-xs font-semibold shadow-sm hover:bg-[#F2F4F6] transition-colors",
  dropdownClassName = "absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-[#E5E7EB] py-1 z-10 animate-slideDown",
  onExport,
}: ExportReportProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExport = (format: string) => {
    onExport?.(format);
    setExportOpen(false);
  };

  return (
    <div className="relative" ref={exportRef}>
      <button
        onClick={() => setExportOpen(!exportOpen)}
        className={buttonClassName}
      >
        <Download className="w-4 h-4" />
        Export report
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${exportOpen ? "rotate-180" : ""}`} />
      </button>

      {exportOpen && (
        <div className={dropdownClassName}>
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => handleExport(option.id)}
              className="flex items-center gap-2 w-full px-4 py-2 text-[#424752] text-xs font-medium hover:bg-[#F2F4F6] transition-colors"
            >
              <option.icon className="w-4 h-4" />
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}