import { useState, useRef, useEffect } from "react";
import { ChevronDown, CalendarPlus, MessageSquare, FileText, Download, Edit } from "lucide-react";
import type { RelatedActionsDropdownProps } from "@/types/patient";

interface LucideIconProps {
  className?: string;
  strokeWidth?: string | number;
  [key: string]: unknown;
}

interface ActionItem {
  label: string;
  icon: React.ComponentType<LucideIconProps>;
  onClick: () => void;
  disabled?: boolean;
}

export function RelatedActionsDropdown({ patientId, patientName, onEdit }: RelatedActionsDropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
          setOpen(false);
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const actions: ActionItem[] = [
    {
      label: "Edit",
      icon: Edit,
      onClick: onEdit,
    },
    {
      label: "Schedule Appointment",
      icon: CalendarPlus,
      onClick: () => {
        window.location.href = `/appointments/book?patientId=${patientId}`;
      },
    },
    {
      label: "Send Message",
      icon: MessageSquare,
      onClick: () => {
        window.location.href = `/chat?patientId=${patientId}&patientName=${encodeURIComponent(patientName)}`;
      },
    },
    {
      label: "View Medical History",
      icon: FileText,
      onClick: () => {
        window.location.href = `/patients/view/${patientId}`;
      },
    },
    {
      label: "Download Records",
      icon: Download,
      onClick: () => {
        window.open(`/api/patients/${patientId}/export`, "_blank");
      },
      disabled: true,
    },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 border border-[#d1d5db] text-[#343943] rounded-lg font-medium text-sm hover:bg-[#f3f4f6] transition-colors focus:outline-none focus:ring-2 focus:ring-[#004a91] focus:ring-offset-2"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Related actions"
      >
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
        <span className="hidden sm:inline">Actions</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-56 bg-white border border-[#edf0f4] rounded-lg shadow-lg py-1 z-50"
          role="menu"
          aria-label="Related actions"
        >
          {actions.map((action, index) => (
            <button
              key={action.label}
              onClick={() => {
                action.onClick();
                setOpen(false);
              }}
              disabled={action.disabled}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-[#343943] hover:bg-[#f7f9fc] transition-colors ${
                action.disabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
              role="menuitem"
              aria-disabled={action.disabled}
            >
              <action.icon className="w-4 h-4 text-[#6d7480]" strokeWidth={2} />
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}