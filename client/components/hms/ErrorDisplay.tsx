import { useEffect } from "react";
import { ArrowLeft, AlertCircle, Lock, Server, WifiOff, RefreshCw } from "lucide-react";
import type { ErrorDisplayProps } from "@/types/patient";

const errorConfigs = {
  "not-found": {
    icon: AlertCircle,
    title: "Patient Not Found",
    description: "The patient you're looking for doesn't exist or has been removed.",
    color: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
  },
  forbidden: {
    icon: Lock,
    title: "Access Denied",
    description: "You don't have permission to view this patient's details.",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  server: {
    icon: Server,
    title: "Server Error",
    description: "Something went wrong on our end. Please try again later.",
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
  network: {
    icon: WifiOff,
    title: "Connection Issue",
    description: "Unable to connect to the server. Please check your internet connection.",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
};

export function ErrorDisplay({ error, onRetry, onBack }: ErrorDisplayProps) {
  const config = errorConfigs[error.type] || errorConfigs.server;

  useEffect(() => {
    if (error.type === "forbidden") {
      document.title = "Access Denied | HMS";
    } else if (error.type === "not-found") {
      document.title = "Patient Not Found | HMS";
    }
  }, [error.type]);

  return (
    <div className="min-h-screen bg-[#f7f9fc] flex items-center justify-center p-4">
      <div
        className={`w-full max-w-md text-center p-8 rounded-2xl border ${config.bg} ${config.border}`}
        role="alert"
        aria-live="polite"
      >
        <config.icon
          className={`w-14 h-14 mx-auto mb-4 ${config.color}`}
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <h2 className={`text-xl font-bold mb-2 ${config.color}`}>{config.title}</h2>
        <p className="text-[#5f6672] mb-6">{error.message || config.description}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {error.retryable && (
            <button
              onClick={onRetry}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#004a91] text-white rounded-lg font-medium text-sm hover:bg-[#003a6b] transition-colors focus:outline-none focus:ring-2 focus:ring-[#004a91] focus:ring-offset-2"
              aria-label="Retry loading patient details"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          )}
          <button
            onClick={onBack}
            className="flex items-center justify-center gap-2 px-5 py-2.5 border border-[#d1d5db] text-[#343943] rounded-lg font-medium text-sm hover:bg-[#f3f4f6] transition-colors focus:outline-none focus:ring-2 focus:ring-[#004a91] focus:ring-offset-2"
            aria-label="Go back to patient list"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          {error.type === "forbidden" && (
            <button
              className="flex items-center justify-center gap-2 px-5 py-2.5 text-[#004a91] rounded-lg font-medium text-sm underline hover:text-[#003a6b] transition-colors focus:outline-none focus:ring-2 focus:ring-[#004a91] focus:ring-offset-2"
              aria-label="Contact support for access issues"
            >
              Contact Support
            </button>
          )}
        </div>
      </div>
    </div>
  );
}