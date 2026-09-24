import { useEffect, useState, type FormEvent } from "react";
import { Building, Loader2 } from "lucide-react";
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
import { ipdApi, type CreateWardPayload, type WardRecord } from "@/api/ipd.api";
import type { BranchFilterBranch } from "@/context/BranchFilterContext";

interface AddWardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: BranchFilterBranch[];
  defaultBranchId?: string;
  onCreated?: (ward: WardRecord) => void;
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
}: AddWardDialogProps) {
  const { toast } = useToast();
  const [data, setData] = useState<CreateWardPayload>(INITIAL_DATA);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      setData({ ...INITIAL_DATA, branch_id: defaultBranchId ?? "" });
      setSubmitting(false);
    }
  }, [open, defaultBranchId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!data.ward_name.trim()) {
      toast({ title: "Validation Error", description: "Ward name is required", variant: "destructive" });
      return;
    }
    if (!data.branch_id) {
      toast({ title: "Validation Error", description: "Branch is required", variant: "destructive" });
      return;
    }

    try {
      setSubmitting(true);
      const res = await ipdApi.createWard(data);
      if (res.data?.success) {
        toast({ title: "Success", description: "Ward created successfully" });
        onCreated?.(res.data.data);
        onOpenChange(false);
      }
    } catch (err: any) {
      toast({
        title: "Creation Failed",
        description: err?.response?.data?.message || err?.message || "Failed to create ward.",
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
            <Building className="h-5 w-5 text-blue-600" />
            Add New Inpatient Ward
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Branch */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold text-slate-700">Hospital Branch *</Label>
              <Select
                value={data.branch_id}
                onValueChange={(val) => setData((prev) => ({ ...prev, branch_id: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ward Name */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold text-slate-700">Ward Name *</Label>
              <Input
                placeholder="e.g. Intensive Care Unit, Maternity Ward A"
                value={data.ward_name}
                onChange={(e) => setData((prev) => ({ ...prev, ward_name: e.target.value }))}
                required
              />
            </div>

            {/* Ward Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Ward Type</Label>
              <Select
                value={data.ward_type || "GENERAL"}
                onValueChange={(val) => setData((prev) => ({ ...prev, ward_type: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">General Ward</SelectItem>
                  <SelectItem value="ICU">Intensive Care Unit (ICU)</SelectItem>
                  <SelectItem value="DAYCARE">Daycare / Chemo</SelectItem>
                  <SelectItem value="PRIVATE">Private Room</SelectItem>
                  <SelectItem value="SEMI_PRIVATE">Semi-Private Room</SelectItem>
                  <SelectItem value="EMERGENCY">Emergency / Triage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Floor */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Floor</Label>
              <Input
                placeholder="e.g. Ground Floor, 2nd Floor"
                value={data.floor || ""}
                onChange={(e) => setData((prev) => ({ ...prev, floor: e.target.value }))}
              />
            </div>

            {/* Total Beds */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Initial Bed Capacity</Label>
              <Input
                type="number"
                min={0}
                value={data.total_beds ?? 4}
                onChange={(e) => setData((prev) => ({ ...prev, total_beds: Number(e.target.value) }))}
              />
            </div>

            {/* Tariff */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Default Daily Rate (₹)</Label>
              <Input
                type="number"
                min={0}
                step={50}
                value={data.tariff ?? 1000}
                onChange={(e) => setData((prev) => ({ ...prev, tariff: Number(e.target.value) }))}
              />
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
              Save Ward
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}