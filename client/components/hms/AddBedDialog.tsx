import { useEffect, useState, type FormEvent } from "react";
import { Bed, Loader2 } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Dropdown } from "@/components/ui/dropdown";
import {
  ipdApi,
  type CreateBedPayload,
  type WardRecord,
  type BedRecord,
} from "@/api/ipd.api";
import { Branch } from "@/api/branch.api";

interface AddBedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Branch[];
  defaultWardId?: string;
  defaultBranchId?: string;
  onCreated?: (bed: BedRecord) => void;
  // When set, the dialog edits this bed instead of creating a new one.
  // Occupied beds must never reach here -- the caller (BedMaster) is
  // responsible for not offering Edit on a bed a patient is currently in;
  // the backend also hard-rejects it as a second line of defense.
  bed?: BedRecord | null;
}

const INITIAL_DATA: CreateBedPayload = {
  ward_id: "",
  branch_id: "",
  bed_number: "",
  bed_type: "STANDARD",
  tariff: 1000,
  status: "AVAILABLE",
};

export function AddBedDialog({
  open,
  onOpenChange,
  branches,
  defaultWardId,
  defaultBranchId,
  onCreated,
  bed,
}: AddBedDialogProps) {
  const { toast } = useToast();
  const isEdit = Boolean(bed);
  const [data, setData] = useState<CreateBedPayload>(INITIAL_DATA);
  const [activeStatus, setActiveStatus] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [wards, setWards] = useState<WardRecord[]>([]);
  const [loadingWards, setLoadingWards] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (bed) {
      setData({
        ward_id: bed.ward_id,
        branch_id: bed.branch_id,
        bed_number: bed.bed_number,
        bed_type: bed.bed_type || "STANDARD",
        tariff: bed.tariff != null ? Number(bed.tariff) : 1000,
        status: bed.status,
      });
      setActiveStatus(bed.active_status ?? 1);
    } else {
      setData({
        ...INITIAL_DATA,
        ward_id: defaultWardId ?? "",
        branch_id: defaultBranchId || "",
      });
      setActiveStatus(1);
    }
    setSubmitting(false);
    // Re-seed only when the dialog opens -- defaultBranchId/defaultWardId/bed
    // are read at that moment and must never reset the form mid-edit. The
    // case where no branch was handed in (create mode) is handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bed]);

  // Bed Master hands in its own header branch filter, which is "" while "All
  // Branches" is selected -- and this dialog is the only place a ward can be
  // chosen, so with an empty branch the Assign To Ward select stayed disabled
  // forever ("not clickable"). Fall back to the first branch so it is always
  // usable; the Branch select in the form lets the user change it. Not
  // relevant in edit mode -- the bed's own branch is seeded above already.
  useEffect(() => {
    if (!open || isEdit || data.branch_id) return;
    const fallback = defaultBranchId || branches[0]?.branch_id;
    if (fallback) {
      setData((prev) =>
        prev.branch_id ? prev : { ...prev, branch_id: fallback },
      );
    }
  }, [open, isEdit, data.branch_id, defaultBranchId, branches]);

  useEffect(() => {
    if (!data.branch_id) {
      setWards([]);
      return;
    }
    setLoadingWards(true);
    ipdApi
      .getWards(data.branch_id)
      .then((res) => {
        setWards(res.data?.data || []);
      })
      .catch(() => setWards([]))
      .finally(() => setLoadingWards(false));
  }, [data.branch_id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!data.ward_id) {
      toast({
        title: "Validation Error",
        description: "Target ward is required",
        variant: "destructive",
      });
      return;
    }
    if (!data.bed_number.trim()) {
      toast({
        title: "Validation Error",
        description: "Bed number is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      if (isEdit && bed) {
        const res = await ipdApi.updateBed(bed.bed_id, {
          bed_number: data.bed_number.trim(),
          bed_type: data.bed_type,
          tariff: data.tariff,
          ward_id: data.ward_id,
          active_status: activeStatus,
        });
        if (res.data?.success) {
          toast({ title: "Success", description: "Bed updated successfully" });
          onCreated?.(res.data.data);
          onOpenChange(false);
        }
      } else {
        const res = await ipdApi.createBed(data);
        if (res.data?.success) {
          toast({ title: "Success", description: "Bed created successfully" });
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
          `Failed to ${isEdit ? "update" : "create"} bed.`,
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
              <Bed className="w-5 h-5" />
            </div>
            <h3 className="hms-heading text-gray-900">{isEdit ? "Edit Bed" : "Add New Bed"}</h3>
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
                    // Wards belong to a branch -- a different branch means a
                    // different ward list, so clear the picked ward.
                    setData((prev) => ({
                      ...prev,
                      branch_id: val,
                      ward_id: "",
                    }))
                  }
                  placeholder="Select Branch"
                  disabled={submitting}
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-[12.5px] font-semibold text-gray-700 mb-1.5">
                  Assign To Ward <span className="text-red-600 ml-0.5">*</span>
                </label>
                <Dropdown
                  className="w-full"
                  options={[
                    { label: "None", value: "" },
                    ...wards.map((w) => ({
                      label: `${w.ward_name}${w.ward_type ? ` (${w.ward_type})` : ""}`,
                      value: w.ward_id,
                    })),
                  ]}
                  value={data.ward_id}
                  onChange={(val) => {
                    const chosenWard = wards.find((w) => w.ward_id === val);
                    setData((prev) => ({
                      ...prev,
                      ward_id: val,
                      branch_id: chosenWard?.branch_id || prev.branch_id,
                      tariff: chosenWard?.tariff
                        ? Number(chosenWard.tariff)
                        : prev.tariff,
                    }));
                  }}
                  placeholder={
                    !data.branch_id
                      ? "Select branch first"
                      : loadingWards
                        ? "Loading wards..."
                        : "Select Ward"
                  }
                  disabled={!data.branch_id || submitting || loadingWards}
                />
                {data.branch_id && !loadingWards && wards.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    No wards in this branch yet — create one from Bed Master →
                    Add Ward.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-[12.5px] font-semibold text-gray-700 mb-1.5">
                  Bed Number / Code{" "}
                  <span className="text-red-600 ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. B-101, ICU-04, DC-03"
                  className="w-full rounded-md border border-stone-300 hover:border-stone-400 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
                  value={data.bed_number}
                  onChange={(e) =>
                    setData((prev) => ({ ...prev, bed_number: e.target.value }))
                  }
                  disabled={submitting}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[12.5px] font-semibold text-gray-700 mb-1.5">
                  Bed Type
                </label>
                <Dropdown
                  className="w-full"
                  options={[
                    { value: "STANDARD", label: "Standard Bed" },
                    { value: "ICU", label: "ICU Bed" },
                    { value: "OXYGEN", label: "Oxygen Supported" },
                    { value: "VENTILATOR", label: "Ventilator Bed" },
                    { value: "DELUXE", label: "Deluxe Electric Bed" },
                    { value: "RECLINER", label: "Daycare Recliner" },
                  ]}
                  value={data.bed_type || "STANDARD"}
                  onChange={(val) =>
                    setData((prev) => ({ ...prev, bed_type: val }))
                  }
                  placeholder="Select Bed Type"
                  disabled={submitting}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[12.5px] font-semibold text-gray-700 mb-1.5">
                  Daily Tariff Rate (₹)
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
                    Available / Maintenance is changed from the bed's row action
                    menu, not here.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="block text-[12.5px] font-semibold text-gray-700 mb-1.5">
                    Initial Status
                  </label>
                  <Dropdown
                    className="w-full"
                    options={[
                      { value: "AVAILABLE", label: "Available" },
                      { value: "MAINTENANCE", label: "Maintenance" },
                    ]}
                    value={data.status || "AVAILABLE"}
                    onChange={(val) =>
                      setData((prev) => ({ ...prev, status: val }))
                    }
                    placeholder="Select Status"
                    disabled={submitting}
                  />
                </div>
              )}
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
                {isEdit ? "Save Changes" : "Save Bed"}
              </button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
