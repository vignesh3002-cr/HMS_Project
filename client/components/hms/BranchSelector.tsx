import { useState, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
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
import { ChevronDown, Building2, Globe, Loader2, RefreshCw, SquarePen, Trash2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { branchApi } from "@/api/branch.api";
import { useToast } from "@/hooks/use-toast";
import { ALL_BRANCHES_VALUE, useBranchFilter } from "@/context/BranchFilterContext";

export function BranchSelector() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();
  const {
    branches,
    loading,
    error,
    selectedBranchId,
    selectedBranch,
    isAllBranches,
    isBranchAdmin,
    isStaffAdmin,
    isHeadAdmin,
    selectBranch,
    refreshBranches,
    removeBranch,
  } = useBranchFilter();

  const handleSelect = (branchId: string) => {
    selectBranch(branchId);
    setOpen(false);
  };

  const handleEdit = (branchId: string, e: MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    navigate(`/branches/edit/${branchId}`);
  };

  const handleDelete = (branch: { id: string; name: string }, e: MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm(branch);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    const { id, name } = deleteConfirm;
    setDeletingId(id);
    try {
      const response = await branchApi.remove(id);
      if (!response.data.success) {
        throw new Error(response.data.message);
      }
      removeBranch(id);
      toast({
        title: "Branch deleted",
        description: `${name} was removed.`,
      });
    } catch (err: any) {
      toast({
        title: "Failed to delete branch",
        description:
          err.response?.data?.message ?? err.message ?? "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
      setDeleteConfirm(null);
    }
  };

  // ── BRANCH_ADMIN: read-only display ──────────────────────────────────────
  if (isBranchAdmin || isStaffAdmin) {
    return (
      <div className="flex items-center gap-1.5 text-[#334155] font-semibold text-sm opacity-80 cursor-default select-none">
        <Lock size={14} className="text-[#64748B]" />
        <Building2 size={16} className="text-[#64748B]" />
        <span>{selectedBranch?.name || "Branch"}</span>
        <span className="text-xs font-normal text-[#64748B]">
          ({selectedBranch?.area || "N/A"})
        </span>
      </div>
    );
  }

  // ── Loading state ────────────────────────────────────────────────────────
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

  // ── Error state with retry ───────────────────────────────────────────────
  if (error && branches.length === 0) {
    return (
      <button
        onClick={() => refreshBranches()}
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

  // ── HEAD_ADMIN / other roles: full dropdown ──────────────────────────────
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 text-[#334155] font-semibold text-sm hover:text-[#00488D] transition-colors">
          {isAllBranches ? (
            <Globe size={16} className="text-[#64748B]" />
          ) : (
            <Building2 size={16} className="text-[#64748B]" />
          )}
          {isAllBranches ? "All Branches" : (selectedBranch?.name || "Select Branch")}
          <span className="text-xs font-normal text-[#64748B]">
            ({isAllBranches ? "every branch" : (selectedBranch?.area || "N/A")})
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
                onClick={() => refreshBranches()}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                title="Refresh branches"
              >
                <RefreshCw size={14} className="text-[#64748B] hover:text-[#00488D]" />
              </button>
            )}
          </div>
          <CommandList className="slim-scrollbar">
            <CommandEmpty>
              <div className="py-6 text-center">
                <Building2 className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No branch found</p>
                <button
                  onClick={() => refreshBranches()}
                  className="text-xs text-[#00488D] hover:underline mt-1"
                >
                  Refresh
                </button>
              </div>
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="All Branches"
                onSelect={() => handleSelect(ALL_BRANCHES_VALUE)}
                className="flex items-center gap-3 py-2.5 px-3 cursor-pointer hover:bg-gray-50"
              >
                <span
                  className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    isAllBranches
                      ? "bg-[#00488D] ring-2 ring-[#00488D]/20"
                      : "bg-[#CBD5E1]"
                  )}
                />
                <div className="flex flex-col flex-1">
                  <span className="text-sm font-medium text-[#1E293B] flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#64748B]" />
                    All Branches
                  </span>
                  <span className="text-xs text-[#64748B]">
                    Show data from every branch
                  </span>
                </div>
              </CommandItem>
            </CommandGroup>
            <CommandGroup>
              {branches.map((branch) => (
                <CommandItem
                  key={branch.id}
                  value={`${branch.name} ${branch.id}`}
                  onSelect={() => handleSelect(branch.id)}
                  className="flex items-center gap-3 py-2.5 px-3 cursor-pointer hover:bg-gray-50"
                >
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      !isAllBranches && selectedBranchId === branch.id
                        ? "bg-[#00488D] ring-2 ring-[#00488D]/20"
                        : "bg-[#CBD5E1]"
                    )}
                  />
                  <div className="flex flex-col flex-1">
                    <span className="text-sm font-medium text-[#1E293B]">
                      {branch.name}
                    </span>
                    <span className="text-xs text-[#64748B]">
                      {branch.hospital_name} · ID: {branch.id}
                    </span>
                  </div>
                  <div className="ml-auto flex items-center gap-0.5">
                    <button
                      onClick={(e) => handleEdit(branch.id, e)}
                      title="Edit branch"
                      aria-label={`Edit ${branch.name}`}
                      className="p-1.5 rounded-md text-[#64748B] hover:bg-blue-50 hover:text-[#003EA8] transition-colors"
                    >
                      <SquarePen className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(branch, e)}
                      disabled={deletingId === branch.id}
                      title="Delete branch"
                      aria-label={`Delete ${branch.name}`}
                      className="p-1.5 rounded-md text-[#64748B] hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                    >
                      {deletingId === branch.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
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
      <ConfirmationDialog
        open={!!deleteConfirm}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm(null)}
        type="danger"
        title={`Delete "${deleteConfirm?.name}"?`}
        description="This action cannot be undone. The branch will be permanently removed."
        confirmText="Delete"
        cancelText="Cancel"
        loading={deletingId === deleteConfirm?.id}
      />
    </>
  );
}
