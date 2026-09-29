import { useEffect, useState, type FormEvent } from "react";
import { Building, Loader2 } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Dropdown } from "@/components/ui/dropdown";
import { ipdApi, type CreateWardPayload, type WardRecord } from "@/api/ipd.api";
import { Branch } from "@/api/branch.api";

interface AddWardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Branch[];
  defaultBranchId?: string;
  onCreated?: (ward: WardRecord) => void;
  // When set, the dialog edits this ward instead of creating a new one --
  // Branch and the live bed count become read-only (branch reassignment
  // would orphan the ward's beds; total_beds is a running count kept in
  // sync by create/edit-bed, not a user-settable field).
  ward?: WardRecord | null;
}

const INITIAL_DATA: CreateWardPayload = {
  branch_id: "",
  ward_name: "",
  ward_type: "GENERAL",
  floor: "1st Floor",
  total_beds: 4,
  tariff: 1000,
};

export function AddWardDialog({
  open,
  onOpenChange,
  branches,
  defaultBranchId,
  onCreated,
  ward,
}: AddWardDialogProps) {
  const { toast } = useToast();
  const isEdit = Boolean(ward);
  const [data, setData] = useState<CreateWardPayload>(INITIAL_DATA);
  const [activeStatus, setActiveStatus] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (ward) {
      setData({
        branch_id: ward.branch_id,
        ward_name: ward.ward_name,
        ward_type: ward.ward_type || "GENERAL",
        floor: ward.floor || "",
        total_beds: ward.total_beds ?? 0,
        tariff: ward.tariff != null ? Number(ward.tariff) : 1000,
      });
      setActiveStatus(ward.active_status ?? 1);
    } else {
      setData({ ...INITIAL_DATA, branch_id: defaultBranchId || "" });
      setActiveStatus(1);
    }
    setSubmitting(false);
    // Re-seed only when the dialog opens -- defaultBranchId/ward are read at
    // that moment and must never reset the form mid-edit. The case where no
    // branch was handed in (create mode) is handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ward]);

  // Bed Master / the appointment form hand in their own branch selection,
  // which is "" while "All Branches" is picked. Fall back to the first branch
  // so Ward Name (disabled until a branch exists) and the save path are usable
  // straight away; the Branch select lets the user change it. Not relevant in
  // edit mode -- the ward's own branch is fixed and already seeded above.
  useEffect(() => {
    if (!open || isEdit || data.branch_id) return;
    const fallback = defaultBranchId || branches[0]?.branch_id;
    if (fallback) {
      setData((prev) =>
        prev.branch_id ? prev : { ...prev, branch_id: fallback },
      );
    }
  }, [open, isEdit, data.branch_id, defaultBranchId, branches]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!data.ward_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Ward name is required",
        variant: "destructive",
      });
      return;
    }
    if (!data.branch_id) {
      toast({
        title: "Validation Error",
        description: "Branch is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      if (isEdit && ward) {
        const res = await ipdApi.updateWard(ward.ward_id, {
          ward_name: data.ward_name.trim(),
          ward_type: data.ward_type,
          floor: data.floor,
          tariff: data.tariff,
          active_status: activeStatus,
        });
        if (res.data?.success) {
          toast({ title: "Success", description: "Ward updated successfully" });
          onCreated?.(res.data.data);
          onOpenChange(false);
        }
      } else {
        const res = await ipdApi.createWard(data);
        if (res.data?.success) {
          toast({ title: "Success", description: "Ward created successfully" });
          onCreated?.(res.data.data);
          onOpenChange(false);
        }
      }
    } catch (err: any) {
      toast({
        title: isEdit ? "Update Failed" : "Creation Failed",
        description:
          err?.response?.data?.message ||
          err?.message ||
          `Failed to ${isEdit ? "update" : "create"} ward.`,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-xl",
          )}
        >
          <div className="flex items-center gap-3 px-1 pb-4 border-b border-gray-100">
            <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Building className="w-5 h-5" />
            </div>
            <h3 className="hms-heading text-gray-900">{isEdit ? "Edit Ward" : "Add New Ward"}</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-[18px]">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-[12.5px] font-semibold text-gray-700 mb-1.5">
                  Hospital Branch <span className="text-red-600 ml-0.5">*</span>
                </label>
                <Dropdown
                  className="w-full"
                  options={[
                    { label: "None", value: "" },
                    ...branches.map((b) => ({
                      label: b.branch_name || b.branch_id,
                      value: b.branch_id,
                    })),
                  ]}
                  value={data.branch_id}
                  onChange={(val) =>
                    setData((prev) => ({ ...prev, branch_id: val }))
                  }
                  placeholder="Select Branch"
                  disabled={submitting || isEdit}
                />
                {isEdit && (
                  <p className="text-[11px] text-gray-400">
                    Branch can't be changed after a ward is created.
                  </p>
                )}
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-[12.5px] font-semibold text-gray-700 mb-1.5">
                  Ward Name <span className="text-red-600 ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Intensive Care Unit, Maternity Ward A"
                  className="w-full rounded-md border border-stone-300 hover:border-stone-400 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
                  value={data.ward_name}
                  onChange={(e) =>
                    setData((prev) => ({ ...prev, ward_name: e.target.value }))
                  }
                  disabled={submitting || !data.branch_id}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[12.5px] font-semibold text-gray-700 mb-1.5">
                  Ward Type
                </label>
                <Dropdown
                  className="w-full"
                  options={[
                    { value: "GENERAL", label: "General Ward" },
                    { value: "ICU", label: "Intensive Care Unit (ICU)" },
                    { value: "DAYCARE", label: "Daycare / Chemo" },
                    { value: "PRIVATE", label: "Private Room" },
                    { value: "SEMI_PRIVATE", label: "Semi-Private Room" },
                    { value: "EMERGENCY", label: "Emergency / Triage" },
                  ]}
                  value={data.ward_type || "GENERAL"}
                  onChange={(val) =>
                    setData((prev) => ({ ...prev, ward_type: val }))
                  }
                  placeholder="Select Ward Type"
                  disabled={submitting}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[12.5px] font-semibold text-gray-700 mb-1.5">
                  Floor
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ground Floor, 2nd Floor"
                  className="w-full rounded-md border border-stone-300 hover:border-stone-400 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
                  value={data.floor || ""}
                  onChange={(e) =>
                    setData((prev) => ({ ...prev, floor: e.target.value }))
                  }
                  disabled={submitting}
                />
              </div>

              {isEdit ? (
                <div className="space-y-1.5">
                  <label className="block text-[12.5px] font-semibold text-gray-700 mb-1.5">
                    Status
                  </label>
                  <Dropdown
                    className="w-full"
                    options={[
                      { value: "1", label: "Active" },
                      { value: "0", label: "Inactive" },
                    ]}
                    value={String(activeStatus)}
                    onChange={(val) => setActiveStatus(Number(val))}
                    disabled={submitting}
                  />
                  <p className="text-[11px] text-gray-400">
                    {data.total_beds ?? 0} bed{(data.total_beds ?? 0) === 1 ? "" : "s"} currently
                    assigned to this ward.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="block text-[12.5px] font-semibold text-gray-700 mb-1.5">
                    Initial Bed Capacity
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded-md border border-stone-300 hover:border-stone-400 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
                    value={data.total_beds ?? 4}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        total_beds: Number(e.target.value),
                      }))
                    }
                    disabled={submitting}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[12.5px] font-semibold text-gray-700 mb-1.5">
                  Default Daily Rate (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  step={50}
                  className="w-full rounded-md border border-stone-300 hover:border-stone-400 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
                  value={data.tariff ?? 1000}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      tariff: Number(e.target.value),
                    }))
                  }
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-4 mt-6 pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 shadow-[0_4px_14px_0_rgba(37,99,235,0.2)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.3)] group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                ) : null}
                {isEdit ? "Save Changes" : "Save Ward"}
              </button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
