import { useCallback, useRef, useEffect, useState } from "react"
import { ChevronDown } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { KpiItem } from "./kpi.types"

/**
 * Animated numeric value (moved out of Dashboard.tsx so every page shares it).
 */
function CountUp({ target, duration = 900 }: { target: number; duration?: number }) {
  const safeTarget = typeof target === "number" && !isNaN(target) ? Math.round(target) : 0
  const [count, setCount] = useState(0)
  const countRef = useRef(0)
  countRef.current = count

  const prevTargetRef = useRef<number | null>(null)
  const rafIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (safeTarget === 0 && countRef.current === 0) {
      prevTargetRef.current = 0
      return
    }
    if (prevTargetRef.current === safeTarget && countRef.current === safeTarget) {
      return
    }

    const startVal = countRef.current
    const endVal = safeTarget
    prevTargetRef.current = safeTarget

    if (startVal === endVal) {
      return
    }

    let startTime: number | null = null

    const animate = (now: number) => {
      if (startTime === null) startTime = now
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const nextValue = Math.round(startVal + (endVal - startVal) * eased)
      setCount(nextValue)
      if (progress < 1) {
        rafIdRef.current = requestAnimationFrame(animate)
      } else {
        setCount(endVal)
        rafIdRef.current = null
      }
    }

    rafIdRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [safeTarget, duration])

  return <>{count.toLocaleString()}</>
}

function parseStatValue(value: string | number | undefined | null): number {
  if (value == null) return 0
  if (typeof value === "number") return isNaN(value) ? 0 : value
  const num = Number(String(value).replace(/,/g, "").trim())
  return isNaN(num) ? 0 : num
}

interface KpiCardProps extends KpiItem {
  trackKpiUsage?: (id: string) => void
}

export function KpiCard({ trackKpiUsage, ...item }: KpiCardProps) {
  const {
    id,
    label,
    subLabel,
    value,
    tag,
    isActive = false,
    isDropdown = false,
    onClick,
    onTagClick,
    tagContent,
    bg = "#ffffff",
    valueColor = "#00488D",
    iconBg = "rgba(255, 255, 255, 0.40)",
    icon,
    loading = false,
    className = "flex-[0_0_206px] min-w-[206px] rounded-[12px] p-[14px_16px] flex flex-col gap-[10px] cursor-pointer transition-all duration-200 select-none hover:-translate-y-[2px] hover:shadow-[0_6px_20px_rgba(0,0,0,0.10)]",
  } = item

  const handleCardClick = useCallback(() => {
    trackKpiUsage?.(id)
    onClick?.()
  }, [id, trackKpiUsage, onClick])

  const handleCardKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        handleCardClick()
      }
    },
    [handleCardClick]
  )

  const handleTagClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onTagClick?.()
    },
    [onTagClick]
  )

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.stopPropagation()
        e.preventDefault()
        onTagClick?.()
      }
    },
    [onTagClick]
  )

  // Internal open state for the isDropdown tag popover (e.g. appointments
  // status filter on Dashboard). tagContent supplies the popover body.
  const [dropdownOpen, setDropdownOpen] = useState(false)

  return (
    <div
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleCardKeyDown}
      style={{
        background: bg,
        border: isActive ? `2.5px solid ${valueColor}` : "2.5px solid transparent",
        boxShadow: isActive
          ? `0 0 0 1px ${valueColor}20, 0 6px 18px ${valueColor}28`
          : "0 2px 10px rgba(0,0,0,0.06)",
      }}
      className={className}
    >
      <div className="flex items-center justify-between">
        <div
          style={{ background: iconBg }}
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
        >
          {icon}
        </div>
        {tag && (
          <div className="flex items-center gap-1">
            {tagContent ? (
              tagContent
            ) : isDropdown ? (
              <Popover open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={handleTagKeyDown}
                    style={{ color: valueColor }}
                    className="text-[11px] font-bold px-[8px] py-[2px] rounded-full tracking-[-0.2px] bg-white/70 shadow-sm inline-flex items-center gap-1 cursor-pointer transition-all duration-150 hover:bg-white hover:scale-105 active:scale-95 select-none"
                    title="Click to toggle filter"
                  >
                    {tag}
                    <ChevronDown className="w-3 h-3 transition-transform duration-200" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  sideOffset={6}
                  className="w-60 p-2 shadow-xl rounded-xl z-50 bg-white border border-gray-100 text-[#1c1e21]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {tagContent}
                </PopoverContent>
              </Popover>
            ) : onTagClick ? (
              <button
                type="button"
                onClick={handleTagClick}
                onKeyDown={handleTagKeyDown}
                style={{ color: valueColor }}
                className="text-[11px] font-bold px-[8px] py-[2px] rounded-full tracking-[-0.2px] bg-white/70 shadow-sm inline-flex items-center cursor-pointer transition-all duration-150 hover:bg-white hover:scale-105 active:scale-95 select-none"
                title="Click to toggle filter (Active / All)"
              >
                {tag}
              </button>
            ) : (
              <span
                style={{ color: valueColor }}
                className="text-[11px] font-bold px-[7px] py-[2px] rounded-full tracking-[-0.2px] bg-white/60 shadow-sm"
              >
                {tag}
              </span>
            )}
          </div>
        )}
      </div>

      <div
        style={{ color: valueColor }}
        className="text-[26px] font-extrabold leading-[1.05] tracking-[-0.6px]"
      >
        {loading ? (
          <div
            style={{ backgroundColor: valueColor, opacity: 0.15 }}
            className="w-14 h-7 rounded-md animate-pulse"
          />
        ) : (
          <CountUp
            target={typeof value === "number" ? value : parseStatValue(String(value))}
          />
        )}
      </div>

      <div className="flex flex-col gap-[2px] min-w-0">
        <span style={{ color: valueColor }} className="text-[12.5px] font-bold tracking-tight truncate">
          {label}
        </span>
        <span style={{ color: valueColor, opacity: 0.75 }} className="text-[11px] font-medium truncate">
          {subLabel}
        </span>
      </div>
    </div>
  )
}
