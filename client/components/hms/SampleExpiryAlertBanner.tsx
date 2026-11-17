import React from "react";
import { AlertTriangle, Clock, Zap, ArrowRight, Ban } from "lucide-react";

interface SampleExpiryAlertBannerProps {
  expiringCount: number;
  expiredCount: number;
  onFilterUrgent?: () => void;
  onFilterExpired?: () => void;
  sampleDetails?: string;
}

export function SampleExpiryAlertBanner({
  expiringCount,
  expiredCount,
  onFilterUrgent,
  onFilterExpired,
  sampleDetails,
}: SampleExpiryAlertBannerProps) {
  if (expiringCount === 0 && expiredCount === 0) return null;

  return (
    <div className="space-y-2 mb-4" data-purpose="lab-timer-alert-banner">
      {/* Expired Warning Banner */}
      {expiredCount > 0 && (
        <div className="flex items-center justify-between p-3.5 bg-rose-50 border-l-4 border-l-rose-600 border border-rose-200 rounded-xl text-rose-900 shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-600 text-white shrink-0">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold flex items-center gap-2">
                <span>SPECIMEN EXPIRED ALERT ({expiredCount} {expiredCount === 1 ? "Sample" : "Samples"})</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-600 text-white tracking-wider">
                  ACTION REQUIRED
                </span>
              </p>
              <p className="text-xs text-rose-800/90 mt-0.5">
                Pre-analytical stability duration has exceeded. Analytical results may be compromised. Supervisor review or patient sample recollection is required.
                {sampleDetails && <span className="font-semibold ml-1">({sampleDetails})</span>}
              </p>
            </div>
          </div>
          {onFilterExpired && (
            <button
              type="button"
              onClick={onFilterExpired}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition shrink-0 cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
            >
              <span>View Expired</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Critical Short Time Warning Banner */}
      {expiringCount > 0 && (
        <div className="flex items-center justify-between p-3.5 bg-amber-50 border-l-4 border-l-amber-500 border border-amber-200 rounded-xl text-amber-950 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500 text-white shrink-0 animate-bounce">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold flex items-center gap-2">
                <span>SHORT TIME ALERT ({expiringCount} {expiringCount === 1 ? "Sample" : "Samples"} Expiring Soon)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-500 text-white tracking-wider">
                  EXPEDITE TESTING
                </span>
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                Specimen has under 30 minutes of biological stability remaining. Prioritize processing on the analyzer bench now.
              </p>
            </div>
          </div>
          {onFilterUrgent && (
            <button
              type="button"
              onClick={onFilterUrgent}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition shrink-0 cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
            >
              <span>View Urgent Tests</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
