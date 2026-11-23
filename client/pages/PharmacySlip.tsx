import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PharmacySlipModal } from "@/pages/doctor/consultation/PharmacySlipModal";
import {
  buildSlipSourceRows,
  type SlipSourceRow,
} from "@/pages/doctor/consultation/pharmacySlip";
import { chemotherapyApi } from "@/api/chemotherapy.api";

const CYCLE_DAY_REGEX = /Cycle\s*(\d+)\s*\/\s*Day\s*(\d+)/i;

export default function PharmacySlipPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const cycleParam = searchParams.get("cycle");
  const dayParam = searchParams.get("day");
  const patientId = searchParams.get("patientId") || null;

  const cycle = cycleParam ? Number(cycleParam) : null;
  const day = dayParam ? Number(dayParam) : null;

  const [slipOpen, setSlipOpen] = useState(false);
  const [slipLoading, setSlipLoading] = useState(false);
  const [slipError, setSlipError] = useState("");
  const [sourceRows, setSourceRows] = useState<SlipSourceRow[]>([]);
  const [resolvedCycle, setResolvedCycle] = useState<number>(1);
  const [resolvedDay, setResolvedDay] = useState<number>(1);

  const resolveCycleDayFromPlan = async (
    pid: string
  ): Promise<{ cycle: number; day: number }> => {
    if ((cycle ?? 0) > 0 && (day ?? 0) > 0) {
      return { cycle: cycle ?? 1, day: day ?? 1 };
    }
    try {
      const response = await chemotherapyApi.getPlan(pid);
      const plan = response.data.data;
      const currentOrder = plan?.current_order ?? null;
      if (currentOrder?.cycle_number && currentOrder?.cycle_day) {
        return {
          cycle: Number(currentOrder.cycle_number) || 1,
          day: Number(currentOrder.cycle_day) || 1,
        };
      }
    } catch {
    }
    return { cycle: 1, day: 1 };
  };

  const loadOrder = async (pid: string) => {
    if (!pid) return;

    let resolvedCycle = cycle ?? 1;
    let resolvedDay = day ?? 1;

    if ((cycle ?? 0) <= 0 || (day ?? 0) <= 0) {
      const fallback = await resolveCycleDayFromPlan(pid);
      resolvedCycle = fallback.cycle;
      resolvedDay = fallback.day;
    }

    setResolvedCycle(resolvedCycle);
    setResolvedDay(resolvedDay);
    setSlipError("");
    setSlipLoading(true);

    try {
      const response = await chemotherapyApi.getPlanOrder(
        pid,
        resolvedCycle,
        resolvedDay
      );
      const order = response.data.data ?? null;

      if (!order) {
        setSlipError(
          `No saved Chemotherapy Order for Cycle ${resolvedCycle} / Day ${resolvedDay}. Save that step first, then open the pharmacy slip again.`
        );
        setSourceRows([]);
        setSlipOpen(false);
        return;
      }

      setSourceRows(
        buildSlipSourceRows({ order, dischargeRows: [] })
      );
      setSlipOpen(true);
    } catch (error: any) {
      console.error("Failed to load the pharmacy slip order:", error);
      setSlipError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load the chemotherapy order."
      );
    } finally {
      setSlipLoading(false);
    }
  };

  useEffect(() => {
    if (!planId) return;
    void loadOrder(planId);
  }, [planId]);

  const handleBack = () => {
    navigate("/orders");
  };

  return (
    <div className="flex w-full font-[Manrope,sans-serif] bg-[#F7F9FB] min-h-screen">
      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex flex-col gap-6">
          <div className="flex items-center gap-3 print:hidden">
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 px-3 py-1.5 border border-[#E5E7EB] rounded-md text-xs font-semibold text-[#374151] hover:border-[#00488D] transition-colors bg-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Orders
            </button>
          </div>

          {!planId ? (
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col items-center justify-center gap-2 py-16 text-[#6B7280] text-sm">
              No order ID was provided.
            </div>
          ) : (
            <>
              {(slipError || slipLoading) && (
                <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm px-6 py-8">
                  {slipLoading && (
                    <div className="flex items-center justify-center gap-2 py-16 text-[11px] text-[#6B7280]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading this cycle day's medicines...
                    </div>
                  )}
                  {!slipLoading && slipError && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700 mb-4">
                      <span>{slipError}</span>
                    </div>
                  )}
                </div>
              )}

              {slipOpen && !slipLoading && (
                <PharmacySlipModal
                  open={slipOpen}
                  onOpenChange={(next) => {
                    setSlipOpen(next);
                    if (!next) setSlipError("");
                  }}
                  planId={planId}
                  cycleNumber={resolvedCycle}
                  cycleDay={resolvedDay}
                  patientId={patientId}
                  encounterNo={null}
                  appointmentId={null}
                  sourceRows={sourceRows}
                  loading={slipLoading}
                  error={slipError}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
