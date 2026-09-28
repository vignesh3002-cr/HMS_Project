import { useEffect, useState, type FormEvent } from "react";
import { Bed, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ipdApi, type CreateBedPayload, type WardRecord, type BedRecord } from "@/api/ipd.api";
import type { BranchFilterBranch } from "@/context/BranchFilterContext";

interface AddBedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wards: WardRecord[];
  branches: BranchFilterBranch[];
  defaultWardId?: string;
  defaultBranchId?: string;
  onCreated?: (bed: BedRecord) => void;
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
  wards,
  branches,
  defaultWardId,
  defaultBranchId,
  onCreated,
}: AddBedDialogProps) {
  const { toast } = useToast();
  const [data, setData] = useState<CreateBedPayload>(INITIAL_DATA);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      setData({
        ...INITIAL_DATA,
        ward_id: defaultWardId ?? "",
        branch_id: defaultBranchId ?? "",
      });
      setSubmitting(false);
    }
  }, [open, defaultWardId, defaultBranchId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!data.ward_id) {
      toast({ title: "Validation Error", description: "Target ward is required", variant: "destructive" });
      return;
    }
    if (!data.bed_number.trim()) {
      toast({ title: "Validation Error", description: "Bed number is required", variant: "destructive" });
      return;
    }

    try {
      setSubmitting(true);
      const res = await ipdApi.createBed(data);
      if (res.data?.success) {
        toast({ title: "Success", description: "Bed created successfully" });
        onCreated?.(res.data.data);
        onOpenChange(false);
      }
    } catch (err: any) {
      toast({
        title: "Creation Failed",
        description: err?.response?.data?.message || err?.message || "Failed to create bed.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Bed className="h-5 w-5 text-blue-600" />
            Add New Bed
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Target Ward */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold text-slate-700">Assign To Ward *</Label>
              <Select
                value={data.ward_id}
                onValueChange={(val) => {
                  const chosenWard = wards.find((w) => w.ward_id === val);
                  setData((prev) => ({
                    ...prev,
                    ward_id: val,
                    branch_id: chosenWard?.branch_id || prev.branch_id,
                    tariff: chosenWard?.tariff ? Number(chosenWard.tariff) : prev.tariff,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Ward" />
                </SelectTrigger>
                <SelectContent>
                  {wards.map((w) => (
                    <SelectItem key={w.ward_id} value={w.ward_id}>
                      {w.ward_name} ({w.ward_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bed Number */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Bed Number / Code *</Label>
              <Input
                placeholder="e.g. B-101, ICU-04, DC-03"
                value={data.bed_number}
                onChange={(e) => setData((prev) => ({ ...prev, bed_number: e.target.value }))}
                required
              />
            </div>

            {/* Bed Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Bed Type</Label>
              <Select
                value={data.bed_type || "STANDARD"}
                onValueChange={(val) => setData((prev) => ({ ...prev, bed_type: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STANDARD">Standard Bed</SelectItem>
                  <SelectItem value="ICU">ICU Bed</SelectItem>
                  <SelectItem value="OXYGEN">Oxygen Supported</SelectItem>
                  <SelectItem value="VENTILATOR">Ventilator Bed</SelectItem>
                  <SelectItem value="DELUXE">Deluxe Electric Bed</SelectItem>
                  <SelectItem value="RECLINER">Daycare Recliner</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tariff */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Daily Tariff Rate (₹)</Label>
              <Input
                type="number"
                min={0}
                step={50}
                value={data.tariff ?? 1000}
                onChange={(e) => setData((prev) => ({ ...prev, tariff: Number(e.target.value) }))}
              />
            </div>

            {/* Initial Status */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Initial Status</Label>
              <Select
                value={data.status || "AVAILABLE"}
                onValueChange={(val) => setData((prev) => ({ ...prev, status: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVAILABLE">Available</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Save Bed
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}