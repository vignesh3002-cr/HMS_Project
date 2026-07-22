import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Building2, Plus, UserRound, Users, X } from "lucide-react";

const HIDDEN_ON = ["/branches/add", "/staff/add", "/patients/add"];

const menuItems = [
  { key: "patient", label: "Add Patient", icon: UserRound },
  { key: "staff", label: "Add Staff", icon: Users },
  { key: "branch", label: "Add Branch", icon: Building2 },
] as const;

export function QuickAddFab() {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(true);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const [maxDropdownHeight, setMaxDropdownHeight] = useState(500);
  useEffect(() => {
    if (!open) return;
    const measure = () => {
      if (!buttonRef.current || !dropdownRef.current) return;
      const btnRect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = dropdownRef.current.scrollHeight;
      const spaceAbove = btnRect.top;
      const spaceBelow = window.innerHeight - btnRect.bottom;
      if (spaceAbove >= dropdownHeight) {
        setOpenUpward(true);
      } else if (spaceBelow >= dropdownHeight) {
        setOpenUpward(false);
      } else {
        setOpenUpward(spaceAbove >= spaceBelow);
      }
      setMaxDropdownHeight(Math.max(spaceAbove - 12, spaceBelow - 12, 120));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  if (HIDDEN_ON.includes(location.pathname)) {
    return null;
  }

  const handleSelect = (key: (typeof menuItems)[number]["key"]) => {
    setOpen(false);

    if (key === "branch") {
      navigate("/branches/add");
      return;
    }
    if (key === "staff") {
      navigate("/staff/add");
      return;
    }
    if (key === "patient") {
      navigate("/patients/add");
      return;
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={`fixed bottom-6 right-6 z-50 flex items-end gap-3 ${openUpward ? "flex-col" : "flex-col-reverse"}`}
    >
      {open && (
        <div
          ref={dropdownRef}
          className="w-52 bg-white border border-[#E5E7EB] rounded-xl shadow-lg overflow-y-auto animate-in fade-in duration-150"
          style={{ maxHeight: maxDropdownHeight }}
        >
          {menuItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-[#191C1E] hover:bg-[#F2F4F6] transition-colors"
            >
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#D6E3FF] text-[#00488D]">
                <Icon className="w-4 h-4" />
              </span>
              {label}
            </button>
          ))}
        </div>
      )}

      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        className="w-12 h-12 bg-[#00488D] rounded-2xl flex items-center justify-center shadow-lg hover:bg-[#003a6b] transition-all duration-200"
        aria-label={open ? "Close quick add menu" : "Open quick add menu"}
        aria-expanded={open}
      >
        {open ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <Plus className="w-5 h-5 text-white" />
        )}
      </button>
    </div>
  );
}
