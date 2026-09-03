import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * Shared avatar with three states:
 *  1. loading  -> Loader2 spinner in a soft circle (photo still being fetched)
 *  2. src ok   -> the profile photo (with onError fallback to initials)
 *  3. fallback -> deterministic initials circle (never a random external image)
 */
export function UserAvatar({
  src,
  name = "",
  loading = false,
  className = "w-8 h-8 rounded-xl",
  spinnerClass = "w-4 h-4",
  initialClass = "text-xs",
}: {
  src?: string;
  name?: string;
  loading?: boolean;
  className?: string;
  spinnerClass?: string;
  initialClass?: string;
}) {
  const [failed, setFailed] = useState(false);

  // Reset the error flag whenever a new photo arrives (e.g. the photo was
  // changed on the Account page and the src prop updates).
  useEffect(() => {
    setFailed(false);
  }, [src]);

  const initial = (name || "H").trim().charAt(0).toUpperCase() || "H";

  if (loading) {
    return (
      <div
        className={`${className} bg-[#E6EEF7] flex items-center justify-center`}
        role="status"
        aria-label="Loading profile photo"
      >
        <Loader2 className={`${spinnerClass} animate-spin text-[#00488D]`} />
      </div>
    );
  }

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name || "Profile"}
        className={`${className} object-cover`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={`${className} bg-[#00488D] text-white flex items-center justify-center font-bold select-none`}
      aria-label={name || "User"}
    >
      <span className={initialClass}>{initial}</span>
    </div>
  );
}