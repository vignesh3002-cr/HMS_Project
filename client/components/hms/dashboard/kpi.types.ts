import type { ReactNode } from "react"

/**
 * Single KPI tile configuration. Each page builds its own array of items
 * (with page-specific onClick / onTagClick callbacks) and hands them to
 * KpiSection, which owns the layout, selection, shower, date picker,
 * scrolling and usage tracking.
 */
export interface KpiItem {
  id: string
  label: string
  subLabel?: string
  /** Optional permission gate; item is hidden when the user lacks it. */
  permission?: string
  value: number | string
  tag?: string
  isActive?: boolean
  isDropdown?: boolean
  onClick?: () => void
  onTagClick?: () => void
  /** Fully custom tag content (escape hatch for complex popovers, e.g. the
   *  appointments status filter on Dashboard). */
  tagContent?: ReactNode
  bg?: string
  valueColor?: string
  iconBg?: string
  icon: ReactNode
  loading?: boolean
  /** Optional className override for the card container (e.g. grid layout). */
  className?: string
}

export interface KpiSectionProps {
  items: KpiItem[]
  title?: string
  subtitle?: string
  className?: string

  /** "scroll" = fixed-width horizontal scrollable row (Dashboard). "grid" = responsive full-width grid (OrderMaster/ProtocolMaster). */
  layout?: "scroll" | "grid"

  /** Default selection (defaults to every item id). */
  defaultSelectedKpis?: string[]
  /** Controlled selection (optional). When provided the component is controlled. */
  selectedKpis?: string[]
  onKpiSelectChange?: (ids: string[]) => void

  // ---- Date picker ----
  showDatePicker?: boolean
  selectedDate?: Date
  onDateChange?: (date: Date) => void

  // ---- KPI Shower ----
  showShower?: boolean

  /** Hide the "Key Performance Indicators" heading block (title + subtitle +
   *  date controls) while keeping the KPI tiles. Used on ProtocolMaster /
   *  OrderMaster where the page already has its own heading. */
  showHeader?: boolean

  // ---- Updates ----
  isUpdating?: boolean

  // ---- Usage tracking / sorting ----
  enableUsageTracking?: boolean
  usageSortEnabled?: boolean
  onToggleUsageSort?: () => void

  // ---- Backend preferences ----
  enablePreferences?: boolean
}
