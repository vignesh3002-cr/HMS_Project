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
import { ChevronDown, Building2, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveUser, getUser } from "@/utils/token";
import { branchApi } from "@/api/branch.api";
import { useToast } from "@/hooks/use-toast";

interface Branch {
  id: string;
  name: string;
  code: string;
  hospital_name: string;
}

export function BranchSelector() {
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selected, setSelected] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [hospitalData, setHospitalData] = useState({
    hospital_id: "",
    hospital_name: "",
    branch_id: "",
    branch: "",
  });

  // Fetch branches from API
  const fetchBranches = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await branchApi.getAll();
      
      // Handle different response structures
      let branchList = [];
      if (response.data?.data) {
        branchList = response.data.data;
      } else if (Array.isArray(response.data)) {
        branchList = response.data;
      } else {
        branchList = response.data?.branches || [];
      }

      // Map API response to match our Branch interface
      const mappedBranches = branchList.map((item: any) => ({
        id: item.id || item.branch_id,
        name: item.name || item.branch_name || "Unnamed Branch",
        code: item.code || item.branch_code || item.id?.slice(0, 8) || "N/A",
        hospital_name: item.hospital_name || item.hospital?.name || "SVG Hospital",
      }));

      setBranches(mappedBranches);
      
      // Auto-select branch based on user preference or first available
      const user = getUser();
      let branchToSelect = null;

      if (user?.branch_id) {
        branchToSelect = mappedBranches.find((b) => b.id === user.branch_id);
      }

      if (!branchToSelect && mappedBranches.length > 0) {
        branchToSelect = mappedBranches[0];
      }

      if (branchToSelect) {
        setSelected(branchToSelect);
        setHospitalData({
          hospital_id: user?.hospital_id ?? "",
          hospital_name: branchToSelect.hospital_name,
          branch_id: branchToSelect.id,
          branch: branchToSelect.name,
        });

        // Update user with branch info if not already set
        if (user && !user.branch_id) {
          saveUser({
            ...user,
            hospital_name: branchToSelect.hospital_name,
            branch_id: branchToSelect.id,
            branch: branchToSelect.name,
          });
        }
      }

    } catch (err: any) {
      console.error("Failed to fetch branches:", err);
      setError(err.message || "Failed to load branches");
      
      // Fallback to dummy data if API fails
      const fallbackBranches = getDummyBranches();
      setBranches(fallbackBranches);
      
      // Auto-select first fallback branch
      if (fallbackBranches.length > 0) {
        const fallbackBranch = fallbackBranches[0];
        setSelected(fallbackBranch);
        const user = getUser();
        setHospitalData({
          hospital_id: user?.hospital_id ?? "",
          hospital_name: fallbackBranch.hospital_name,
          branch_id: fallbackBranch.id,
          branch: fallbackBranch.name,
        });
      }

      toast({
        title: "Warning",
        description: "Using fallback data. Please check your connection.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fallback dummy data
  const getDummyBranches = (): Branch[] => [
    { id: "BRA001", name: "Medavakkam Branch", code: "MN-401", hospital_name: "SVG Hospital" },
    { id: "BRA002", name: "Vadapalani Branch", code: "VD-204", hospital_name: "SVG Hospital" },
    { id: "BRA003", name: "Tambaram Branch", code: "TB-112", hospital_name: "SVG Hospital" },
  ];

  useEffect(() => {
    fetchBranches();
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

  // Loading state with dropdown disabled
  if (loading) {
    return (
      <button 
        className="flex items-center gap-1.5 text-[#334155] font-semibold text-sm opacity-70 cursor-wait"
        disabled
      >
        <Loader2 size={16} className="animate-spin text-[#00488D]" />
        <span className="text-[#64748B]">Loading branches...</span>
        <ChevronDown size={14} className="text-[#64748B]" />
      </button>
    );
  }

  // Error state with retry option - maintains dropdown look
  if (error && branches.length === 0) {
    return (
      <button 
        onClick={() => fetchBranches()}
        className="flex items-center gap-1.5 text-[#EF4444] font-semibold text-sm hover:text-[#00488D] transition-colors group"
      >
        <Building2 size={16} className="text-[#EF4444]" />
        <span>Error loading branches</span>
        <RefreshCw size={14} className="ml-1 group-hover:rotate-180 transition-transform duration-500" />
        <span className="text-xs text-[#64748B]">(Click to retry)</span>
        <ChevronDown size={14} className="text-[#64748B]" />
      </button>
    );
  }

  // Main dropdown render
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 text-[#334155] font-semibold text-sm hover:text-[#00488D] transition-colors">
          <Building2 size={16} className="text-[#64748B]" />
          {hospitalData.hospital_name || "Select Hospital"}
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
          <div className="flex items-center border-b px-3">
            <CommandInput 
              placeholder="Search branch..." 
              className="border-0 focus:ring-0 h-10"
            />
            {branches.length > 0 && (
              <button
                onClick={() => fetchBranches()}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                title="Refresh branches"
              >
                <RefreshCw size={14} className="text-[#64748B] hover:text-[#00488D]" />
              </button>
            )}
          </div>
          <CommandList>
            <CommandEmpty>
              <div className="py-6 text-center">
                <Building2 className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No branch found</p>
                <button
                  onClick={() => fetchBranches()}
                  className="text-xs text-[#00488D] hover:underline mt-1"
                >
                  Refresh
                </button>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {branches.map((branch) => (
                <CommandItem
                  key={branch.id}
                  value={`${branch.name} ${branch.code}`}
                  onSelect={() => handleSelect(branch)}
                  className="flex items-center gap-3 py-2.5 px-3 cursor-pointer hover:bg-gray-50"
                >
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      selected?.id === branch.id
                        ? "bg-[#00488D] ring-2 ring-[#00488D]/20"
                        : "bg-[#CBD5E1]"
                    )}
                  />
                  <div className="flex flex-col flex-1">
                    <span className="text-sm font-medium text-[#1E293B]">
                      {branch.name}
                    </span>
                    <span className="text-xs text-[#64748B]">
                      {branch.hospital_name} · ID: {branch.code}
                    </span>
                  </div>
                  {selected?.id === branch.id && (
                    <span className="ml-auto text-[10px] font-semibold text-[#00488D] tracking-wide bg-[#00488D]/10 px-2 py-1 rounded-full">
                      CURRENT
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            {branches.length > 0 && (
              <div className="border-t px-2 py-2">
                <div className="text-xs text-[#64748B] text-center">
                  {branches.length} branch{branches.length > 1 ? 'es' : ''} available
                </div>
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}