import { useState, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandGroup,
} from "@/components/ui/command";
import { ChevronDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveUser, getUser } from "@/utils/token";

interface Branch {
  id: string;
  name: string;
  code: string;
  hospital_name: string;
}

const dummyBranches: Branch[] = [
  { id: "BRA001", name: "Medavakkam Branch", code: "MN-401", hospital_name: "SVG Hospital" },
  { id: "BRA002", name: "Vadapalani Branch", code: "VD-204", hospital_name: "SVG Hospital" },
  { id: "BRA003", name: "Tambaram Branch", code: "TB-112", hospital_name: "SVG Hospital" },
];

export function BranchSelector() {
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selected, setSelected] = useState<Branch | null>(null);
  const [hospitalData, setHospitalData] = useState({
    hospital_id: "",
    hospital_name: "",
    branch_id: "",
    branch: "",
  });

  useEffect(() => {
    const user = getUser();
    const list = [...dummyBranches];

    if (user?.branch_id) {
      const idx = list.findIndex((b) => b.id === user.branch_id);
      if (idx >= 0) {
        list[idx] = {
          ...list[idx],
          name: user.branch ?? list[idx].name,
          hospital_name: user.hospital_name ?? list[idx].hospital_name,
        };
      } else {
        list.unshift({
          id: user.branch_id,
          name: user.branch ?? "Unknown Branch",
          code: user.branch_id,
          hospital_name: user.hospital_name ?? "Unknown Hospital",
        });
      }
    }

    setBranches(list);

    if (user) {
      setHospitalData({
        hospital_id: user.hospital_id ?? "",
        hospital_name: user.hospital_name ?? "",
        branch_id: user.branch_id ?? "",
        branch: user.branch ?? "",
      });
      const current = list.find((b) => b.id === user.branch_id);
      if (current) setSelected(current);
    }
  }, []);

  const handleSelect = (branch: Branch) => {
    setSelected(branch);
    setHospitalData((prev) => ({
      ...prev,
      hospital_name: branch.hospital_name,
      branch_id: branch.id,
      branch: branch.name,
    }));
    const currentUser = getUser();
    if (currentUser) {
      saveUser({
        ...currentUser,
        hospital_name: branch.hospital_name,
        branch_id: branch.id,
        branch: branch.name,
      });
      window.dispatchEvent(new Event("user-updated"));
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 text-[#334155] font-semibold text-sm hover:text-[#00488D] transition-colors">
          <Building2 size={16} className="text-[#64748B]" />
          {hospitalData.hospital_name || "Loading..."}
          <span className="text-xs font-normal text-[#64748B]">
            ({selected?.name || "Select Branch"})
          </span>
          <ChevronDown
            size={14}
            className={cn(
              "text-[#64748B] transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start" sideOffset={8}>
        <Command>
          <CommandInput placeholder="Search branch..." />
          <CommandList>
            <CommandEmpty>No branch found.</CommandEmpty>
            <CommandGroup>
              {branches.map((branch) => (
                <CommandItem
                  key={branch.id}
                  value={`${branch.name} ${branch.code}`}
                  onSelect={() => handleSelect(branch)}
                  className="flex items-center gap-3 py-2.5 px-3 cursor-pointer"
                >
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      selected?.id === branch.id
                        ? "bg-[#00488D]"
                        : "bg-[#CBD5E1]"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-[#1E293B]">
                      {branch.name}
                    </span>
                    <span className="text-xs text-[#64748B]">
                      (ID: {branch.code})
                    </span>
                  </div>
                  {selected?.id === branch.id && (
                    <span className="ml-auto text-[10px] font-semibold text-[#00488D] tracking-wide">
                      CURRENT
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
