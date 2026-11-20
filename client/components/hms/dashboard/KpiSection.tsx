import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  Activity,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { format, isToday, isTomorrow, isYesterday, addDays, subDays } from "date-fns"
import { usePermission } from "@/context/PermissionContext"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import CalendarPicker from "@/components/hms/Calender"
import { getKpiPreferences, saveKpiPreferences, getKpiUsage, saveKpiUsage } from "@/api/userPreferences.api"
import { KpiCard } from "./KpiCard"
import type { KpiItem, KpiSectionProps } from "./kpi.types"

export function KpiSection({
  items,
  title = "Key Performance Indicators",
  subtitle = "Real-time operational & clinical metrics across departments",
  className = "",

  defaultSelectedKpis,
  selectedKpis: selectedKpisProp,
  onKpiSelectChange,

  showDatePicker = true,
  selectedDate: selectedDateProp,
  onDateChange,

  showShower = true,

  showHeader = true,

  layout = "scroll",

  isUpdating = false,

  enableUsageTracking = true,
  usageSortEnabled: usageSortEnabledProp,
  onToggleUsageSort,

  enablePreferences = true,
}: KpiSectionProps) {
  const { can } = usePermission()

  // ---- KPI selection ----
  const allKpiIds = items.map((i) => i.id)
  const [selectedKpisState, setSelectedKpisState] = useState<string[]>(
    defaultSelectedKpis ?? allKpiIds
  )
  const selectedKpis = selectedKpisProp ?? selectedKpisState
  const setSelectedKpis = useCallback((ids: string[]) => {
    if (selectedKpisProp === undefined) {
      setSelectedKpisState(ids)
    }
    onKpiSelectChange?.(ids)
  }, [selectedKpisProp, onKpiSelectChange])

  const [isKpiShowerOpen, setIsKpiShowerOpen] = useState(false)

  // ---- Date picker ----
  const [selectedDateState, setSelectedDateState] = useState(() => new Date())
  const selectedDate = selectedDateProp ?? selectedDateState
  const setSelectedDate = useCallback(
    (date: Date) => {
      if (selectedDateProp === undefined) {
        setSelectedDateState(date)
      }
      onDateChange?.(date)
    },
    [selectedDateProp, onDateChange]
  )
  const [isKpiCalendarOpen, setIsKpiCalendarOpen] = useState(false)

  // ---- Usage tracking ----
  const [kpiUsageSnapshot, setKpiUsageSnapshot] = useState<Record<string, number>>({})
  const kpiUsageRef = useRef<Record<string, number>>({})
  const [kpiUsageHydrated, setKpiUsageHydrated] = useState(false)
  const skipNextUsageSaveRef = useRef(false)
  const kpiUsageSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [usageSortEnabledState, setUsageSortEnabledState] = useState(() => {
    return localStorage.getItem("hms_kpi_usage_sort") !== "off"
  })
  const usageSortEnabled = usageSortEnabledProp ?? usageSortEnabledState
  const toggleUsageSort = useCallback(() => {
    const next = !usageSortEnabled
    if (usageSortEnabledProp === undefined) {
      setUsageSortEnabledState(next)
      localStorage.setItem("hms_kpi_usage_sort", next ? "on" : "off")
    }
    onToggleUsageSort?.()
  }, [usageSortEnabled, usageSortEnabledProp, onToggleUsageSort])

  // ---- Preferences hydration ----
  const [kpiHydrated, setKpiHydrated] = useState(false)
  const skipNextKpiSaveRef = useRef(false)

  useEffect(() => {
    if (!enablePreferences) {
      setKpiHydrated(true)
      return
    }
    getKpiPreferences()
      .then((saved) => {
        skipNextKpiSaveRef.current = true
        if (saved.length > 0 && selectedKpisProp === undefined) {
          setSelectedKpisState(saved)
        }
        setKpiHydrated(true)
      })
      .catch(() => {
        skipNextKpiSaveRef.current = true
        setKpiHydrated(true)
      })
  }, [enablePreferences, selectedKpisProp])

  // Auto-save preferences on user-initiated selection changes.
  useEffect(() => {
    if (!enablePreferences || !kpiHydrated) return
    if (skipNextKpiSaveRef.current) {
      skipNextKpiSaveRef.current = false
      return
    }
    if (selectedKpisProp !== undefined) return // controlled: parent owns persistence
    const timer = setTimeout(() => {
      saveKpiPreferences(selectedKpis).catch(() => {})
    }, 500)
    return () => clearTimeout(timer)
  }, [enablePreferences, kpiHydrated, selectedKpis, selectedKpisProp])

  // Usage hydration.
  useEffect(() => {
    if (!enableUsageTracking) {
      setKpiUsageHydrated(true)
      return
    }
    getKpiUsage()
      .then((usage) => {
        skipNextUsageSaveRef.current = true
        kpiUsageRef.current = { ...usage }
        setKpiUsageSnapshot(usage)
        setKpiUsageHydrated(true)
      })
      .catch(() => {
        skipNextUsageSaveRef.current = true
        setKpiUsageHydrated(true)
      })
  }, [enableUsageTracking])

  const flushKpiUsageSave = useCallback(() => {
    const usage = { ...kpiUsageRef.current }
    if (Object.keys(usage).length > 0) {
      saveKpiUsage(usage).catch(() => {})
    }
  }, [])

  const trackKpiUsage = useCallback(
    (kpiId: string) => {
      if (!enableUsageTracking || !kpiUsageHydrated) return
      kpiUsageRef.current = {
        ...kpiUsageRef.current,
        [kpiId]: (kpiUsageRef.current[kpiId] ?? 0) + 1,
      }
      if (kpiUsageSaveTimerRef.current) clearTimeout(kpiUsageSaveTimerRef.current)
      kpiUsageSaveTimerRef.current = setTimeout(() => {
        flushKpiUsageSave()
        kpiUsageSaveTimerRef.current = null
      }, 2000)
    },
    [enableUsageTracking, kpiUsageHydrated, flushKpiUsageSave]
  )

  useEffect(() => {
    return () => {
      if (kpiUsageSaveTimerRef.current) {
        clearTimeout(kpiUsageSaveTimerRef.current)
        kpiUsageSaveTimerRef.current = null
        const usage = { ...kpiUsageRef.current }
        if (Object.keys(usage).length > 0) {
          saveKpiUsage(usage).catch(() => {})
        }
      }
    }
  }, [enableUsageTracking])

  // ---- Scroll ----
  const trackRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollButtons = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(maxScroll > 0 && el.scrollLeft < maxScroll - 4)
  }, [])

  const handleKpiScroll = useCallback(
    (direction: "left" | "right") => {
      const el = trackRef.current
      if (!el) return
      const scrollAmount = 320
      el.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
    },
    []
  )

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    updateScrollButtons()
    const handleScroll = () => updateScrollButtons()
    el.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("resize", updateScrollButtons)
    const ro = new ResizeObserver(() => updateScrollButtons())
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", updateScrollButtons)
      ro.disconnect()
    }
  }, [updateScrollButtons])

  // ---- Derived ----
  const visibleStats = useMemo(() => {
    return items.filter((stat) => !stat.permission || can(stat.permission))
  }, [items, can])

  const displayedStats = useMemo(() => {
    const filtered = visibleStats
      .filter((stat) => selectedKpis.includes(stat.id))
      .map((stat, defaultIndex) => ({ stat, defaultIndex }))
    if (usageSortEnabled) {
      filtered.sort((a, b) => {
        const usageA = kpiUsageSnapshot[a.stat.id] ?? 0
        const usageB = kpiUsageSnapshot[b.stat.id] ?? 0
        if (usageA !== usageB) return usageB - usageA
        return a.defaultIndex - b.defaultIndex
      })
    }
    return filtered.map((entry) => entry.stat)
  }, [visibleStats, selectedKpis, kpiUsageSnapshot, usageSortEnabled])

  useEffect(() => {
    const timer = setTimeout(updateScrollButtons, 150)
    return () => clearTimeout(timer)
  }, [displayedStats.length, updateScrollButtons])

  const isGrid = layout === "grid"

  // ---- Render ----
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* KPI Header -- title/subtitle hidden on pages that carry their own heading */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2 px-1">
          {showHeader && (
          <div>
            <h2 className="text-base font-bold text-[#1c1e21] tracking-tight">{title}</h2>
            <p className="text-xs text-[#70747c]">{subtitle}</p>
          </div>
          )}
          <div className="flex items-center gap-2">
            {isUpdating && (
              <span className="inline-flex items-center gap-1.5 text-xs text-[#00488D] font-medium bg-blue-50 px-2.5 py-1 rounded-full animate-fade-in">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00488D]" />
                <span>Updating KPIs...</span>
              </span>
            )}
            {showDatePicker && (
              <div className="flex items-center bg-white border border-[#E5E7EB] rounded-lg shadow-sm">
                <button
                  onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                  className="flex items-center justify-center w-[28px] h-[28px] rounded-l-lg transition-colors hover:bg-[#F2F4F6] text-slate-600"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <Popover open={isKpiCalendarOpen} onOpenChange={setIsKpiCalendarOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className="flex items-center justify-center h-[28px] px-2.5 text-xs font-semibold text-slate-700 hover:bg-[#F2F4F6] transition-colors border-x border-[#E5E7EB]"
                    >
                      <Activity className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                      {isToday(selectedDate)
                        ? "Today"
                        : isYesterday(selectedDate)
                          ? "Yesterday"
                          : isTomorrow(selectedDate)
                            ? "Tomorrow"
                            : format(selectedDate, "dd/MM/yyyy")}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 border-[#E5E7EB] shadow-lg">
                    <CalendarPicker
                      selected={selectedDate}
                      hideThemePicker
                      onSelect={(date) => {
                        if (date instanceof Date) {
                          setSelectedDate(date)
                          setIsKpiCalendarOpen(false)
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <button
                  onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                  className="flex items-center justify-center w-[28px] h-[28px] rounded-r-lg transition-colors hover:bg-[#F2F4F6] text-slate-600"
                  title="Next Day"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {showShower && (
              <Popover open={isKpiShowerOpen} onOpenChange={setIsKpiShowerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center h-[28px] px-2.5 bg-white border border-[#E5E7EB] rounded-lg shadow-sm hover:bg-[#F2F4F6] transition-colors gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none"
                    title="KPI Shower - Click to select and view KPIs"
                  >
                    <Activity className="w-3.5 h-3.5 text-slate-500" />
                    {selectedKpis.length === 0 ? (
                      <span className="text-slate-500 font-normal">Select KPIs</span>
                    ) : selectedKpis.length === 1 ? (
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor:
                              visibleStats.find((s) => s.id === selectedKpis[0])?.valueColor || "#00488D",
                          }}
                        />
                        <span className="truncate max-w-[130px] sm:max-w-[160px]">
                          {visibleStats.find((s) => s.id === selectedKpis[0])?.label || "1 Selected"}
                        </span>
                      </div>
                    ) : selectedKpis.length === visibleStats.length ? (
                      <span className="text-slate-700 font-semibold">
                        All KPIs ({visibleStats.length})
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <div className="flex -space-x-1">
                          {visibleStats
                            .filter((s) => selectedKpis.includes(s.id))
                            .slice(0, 3)
                            .map((s) => (
                              <span
                                key={s.id}
                                className="w-2 h-2 rounded-full border border-white"
                                style={{ backgroundColor: s.valueColor }}
                              />
                            ))}
                        </div>
                        <span>{selectedKpis.length} KPIs Selected</span>
                      </div>
                    )}
                    <ChevronDown
                      className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
                        isKpiShowerOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  sideOffset={6}
                  className="w-72 p-0 shadow-xl rounded-xl z-50 bg-white border border-gray-100 text-[#1c1e21]"
                >
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800">KPI Shower</span>
                      <span className="text-[11px] font-medium text-slate-500">
                        ({selectedKpis.length}/{visibleStats.length})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedKpis(visibleStats.map((s) => s.id))}
                        className="text-[11px] text-[#00488D] hover:underline font-semibold cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedKpis([])}
                        className="text-[11px] text-slate-500 hover:text-slate-700 hover:underline font-medium cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {enableUsageTracking && (
                    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-slate-50/60">
                      <div className="flex flex-col gap-[1px] min-w-0">
                        <span className="text-[11px] font-semibold text-slate-700 leading-tight">
                          Sort by most used
                        </span>
                        <span className="text-[10px] text-slate-400 leading-tight truncate">
                          {usageSortEnabled
                            ? "Frequently clicked KPIs appear first"
                            : "KPIs stay in default order"}
                        </span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={usageSortEnabled}
                        onClick={toggleUsageSort}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00488D] focus-visible:ring-offset-2 ${
                          usageSortEnabled ? "bg-[#00488D]" : "bg-slate-300"
                        }`}
                        title={usageSortEnabled ? "Disable usage-based sorting" : "Enable usage-based sorting"}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                            usageSortEnabled ? "translate-x-[19px]" : "translate-x-[3px]"
                          }`}
                        />
                      </button>
                    </div>
                  )}

                  <div className="max-h-64 overflow-y-auto p-1 space-y-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {visibleStats.map((stat) => {
                      const isChecked = selectedKpis.includes(stat.id)
                      return (
                        <div
                          key={stat.id}
                          onClick={() => {
                            setSelectedKpis(
                              selectedKpis.includes(stat.id)
                                ? selectedKpis.filter((id) => id !== stat.id)
                                : [...selectedKpis, stat.id]
                            )
                          }}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-xs select-none ${
                            isChecked ? "bg-slate-50 font-medium" : "hover:bg-slate-50 text-slate-600"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-[#00488D] focus:ring-0 cursor-pointer"
                            />
                            <div
                              style={{ background: stat.iconBg }}
                              className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                            >
                              {stat.icon}
                            </div>
                            <span className="truncate text-xs text-slate-800">{stat.label}</span>
                          </div>
                          <span
                            className="text-[11px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-2"
                            style={{ color: stat.valueColor, background: stat.bg }}
                          >
                            {stat.value}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        {/* KPI Track Container - scrollable row (Dashboard) or responsive grid (OrderMaster / ProtocolMaster) */}
        {isGrid ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {displayedStats.map((card) => (
              <KpiCard
                key={card.id}
                {...card}
                trackKpiUsage={trackKpiUsage}
                className="h-full rounded-[12px] p-[14px_16px] flex flex-col gap-[10px] cursor-pointer transition-all duration-200 select-none hover:-translate-y-[2px] hover:shadow-[0_6px_20px_rgba(0,0,0,0.10)]"
              />
            ))}
          </div>
        ) : (
        <div className="relative">
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => handleKpiScroll("left")}
              aria-label="Scroll left"
              className="absolute -left-3 top-[calc(50%-16px)] w-8 h-8 rounded-full bg-white border border-[#e6e7eb] shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex items-center justify-center cursor-pointer z-10 transition-all duration-150 hover:bg-[#fafafa] hover:scale-105 text-[#1c1e21]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          <div
            className={`absolute left-0 top-0 bottom-2 w-12 pointer-events-none z-[2] transition-opacity duration-200 bg-gradient-to-r from-[#F7F9FB] to-transparent ${
              canScrollLeft ? "opacity-100" : "opacity-0"
            }`}
          />

          <div
            ref={trackRef}
            className="flex gap-[14px] overflow-x-auto scroll-smooth py-[6px] px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {displayedStats.length === 0 ? (
              <div className="flex items-center justify-center w-full py-8 text-xs text-slate-500 font-medium">
                No KPIs selected. Select KPIs from the dropdown above to display them.
              </div>
            ) : (
              displayedStats.map((card) => (
                <KpiCard
                  key={card.id}
                  {...card}
                  trackKpiUsage={trackKpiUsage}
                />
              ))
            )}
          </div>

          <div
            className={`absolute right-0 top-0 bottom-2 w-12 pointer-events-none z-[2] transition-opacity duration-200 bg-gradient-to-l from-[#F7F9FB] to-transparent ${
              canScrollRight ? "opacity-100" : "opacity-0"
            }`}
          />

          {canScrollRight && (
            <button
              type="button"
              onClick={() => handleKpiScroll("right")}
              aria-label="Scroll right"
              className="absolute -right-3 top-[calc(50%-16px)] w-8 h-8 rounded-full bg-white border border-[#e6e7eb] shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex items-center justify-center cursor-pointer z-10 transition-all duration-150 hover:bg-[#fafafa] hover:scale-105 text-[#1c1e21]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
        )}
      </div>
    </div>
  )
}
