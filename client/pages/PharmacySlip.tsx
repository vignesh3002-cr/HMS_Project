import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PharmacySlip as PharmacySlipCard } from "@/components/hms/PharmacySlip";

export default function PharmacySlipPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();

  return (
    <div className="flex w-full font-[Manrope,sans-serif] bg-[#F7F9FB] min-h-screen">
      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex flex-col gap-6">
          <div className="flex items-center gap-3 print:hidden">
            <button
              type="button"
              onClick={() => navigate("/orders")}
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
            <PharmacySlipCard planId={planId} />
          )}
        </main>
      </div>
    </div>
  );
}
