import React from "react";
import { Timer, CheckCircle2, Clock, Ban } from "lucide-react";
import { SampleStabilityInfo } from "@/utils/sampleStability";

interface SampleTimerBadgeProps {
  info?: SampleStabilityInfo | null;
  size?: "sm" | "md" | "lg";
  showProgressBar?: boolean;
  showExactTimes?: boolean;
}

export function SampleTimerBadge({
  info,
  size = "md",
  showProgressBar = true,
  showExactTimes = false,
}: SampleTimerBadgeProps) {
  if (!info || !info.isCollected) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        <span>Awaiting Draw</span>
      </div>
    );
  }

  if (info.isCompleted) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        <span>Completed in Time</span>
      </div>
    );
  }

  const {
    digitalCountdown,
    percentRemaining,
    formattedCollectionTime,
    formattedDeadlineTime,
    isExpired,
    expiredBeforeLabel,
  } = info;

  const expiredText = expiredBeforeLabel || digitalCountdown;

  // SMALL BADGE (for tables)
  if (size === "sm") {
    if (isExpired) {
      return (
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300 shadow-2xs"
          title={`Expired: ${formattedDeadlineTime} | Drawn: ${formattedCollectionTime}`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
          <Ban className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span className="font-semibold text-rose-800 tracking-tight">{expiredText}</span>
        </div>
      );
    }

    // Before expiry: Green color timer actively reducing (29, 28, 27...)
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs"
        title={`Live Countdown: ${digitalCountdown} | Drawn: ${formattedCollectionTime} | Expires: ${formattedDeadlineTime}`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
        <Timer className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span className="font-mono font-black tabular-nums text-emerald-800 tracking-tight text-[12.5px]">
          {digitalCountdown}
        </span>
        <span className="text-[10px] font-semibold text-emerald-700/80">
          left
        </span>
      </div>
    );
  }

  // LARGE BADGE (for Enter Test Results screen and header cards)
  if (size === "lg") {
    if (isExpired) {
      return (
        <div className="p-4 rounded-xl border border-rose-300 bg-rose-50 flex flex-col gap-2.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-200/80 text-rose-800">
                <Ban className="w-6 h-6 text-rose-700" />
              </div>
              <div>
                <p className="text-[11px] uppercase font-bold tracking-wider text-rose-600">
                  Specimen Stability Window ({info.stabilityHours}h)
                </p>
                <p className="text-xl font-black text-rose-800 tracking-tight mt-0.5">
                  {expiredText}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-600 text-white shadow-xs">
                EXPIRED
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-rose-700/90 pt-1 border-t border-rose-200">
            <span>Drawn: <strong className="font-mono">{formattedCollectionTime}</strong></span>
            <span>Expired at: <strong className="font-mono">{formattedDeadlineTime}</strong></span>
          </div>
        </div>
      );
    }

    // Before expiry: Green color timer actively reducing (29, 28, 27...)
    return (
      <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50 flex flex-col gap-2.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-200/80 text-emerald-800">
              <Timer className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <p className="text-[11px] uppercase font-bold tracking-wider text-emerald-700">
                Specimen Stability Countdown ({info.stabilityHours}h)
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black font-mono tabular-nums text-emerald-900 tracking-tight">
                  {digitalCountdown}
                </p>
                <span className="text-xs font-bold text-emerald-700">
                  remaining
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              LIVE
            </span>
          </div>
        </div>

        {showProgressBar && (
          <div className="w-full bg-emerald-200/60 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
              style={{ width: `${percentRemaining}%` }}
            />
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-emerald-700/90 pt-0.5">
          <span>Drawn at: <strong className="font-mono">{formattedCollectionTime}</strong></span>
          <span>Expires at: <strong className="font-mono">{formattedDeadlineTime}</strong></span>
        </div>
      </div>
    );
  }

  // MEDIUM BADGE (Default)
  if (isExpired) {
    return (
      <div
        className="inline-flex flex-col gap-1 px-3.5 py-2 rounded-xl border border-rose-300 bg-rose-50 text-xs shadow-2xs"
        title={`Collected: ${formattedCollectionTime} | Expiry Deadline: ${formattedDeadlineTime}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-bold">
            <Ban className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-bold text-rose-800 text-sm tracking-tight">
              {expiredText}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-600 text-white tracking-wider">
            EXPIRED
          </span>
        </div>

        {showExactTimes && (
          <div className="text-[10.5px] text-rose-700/80 flex items-center justify-between pt-0.5 border-t border-rose-200/60 mt-0.5">
            <span>Drawn: {formattedCollectionTime}</span>
            <span>Expired: {formattedDeadlineTime}</span>
          </div>
        )}
      </div>
    );
  }

  // Before expiry: Green color timer actively reducing (29, 28, 27...)
  return (
    <div
      className="inline-flex flex-col gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 text-xs shadow-2xs"
      title={`Collected: ${formattedCollectionTime} | Expiry Deadline: ${formattedDeadlineTime}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
          <Timer className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-mono text-base font-black tabular-nums text-emerald-800 tracking-tight">
            {digitalCountdown}
          </span>
          <span className="text-[11px] font-semibold text-emerald-700/80">left</span>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-600 text-white tracking-wider">
          LIVE
        </span>
      </div>

      {showProgressBar && (
        <div className="w-full bg-emerald-100/80 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
            style={{ width: `${percentRemaining}%` }}
          />
        </div>
      )}

      {showExactTimes && (
        <div className="text-[10.5px] text-emerald-700/80 flex items-center justify-between pt-0.5">
          <span>Drawn: <strong className="font-mono">{formattedCollectionTime}</strong></span>
          <span>Expires: <strong className="font-mono">{formattedDeadlineTime}</strong></span>
        </div>
      )}
    </div>
  );
}
