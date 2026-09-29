import { createContext, useContext, useMemo, useRef, useState, useEffect, useId, type ReactNode } from "react";

/**
 * Composable 2D line chart built on plain SVG, styled to the HMS design
 * system (Manrope, #004785 brand blue, #E5E7EB borders). No chart library
 * needed.
 *
 *   <LineChart data={rows} x="date" height={280}>
 *     <Grid />
 *     <XAxis />
 *     <YAxis />
 *     <Line y="visits" name="Visits" />
 *     <Line y="signups" name="Signups" color="#F59E0B" dashed />
 *     <Tooltip />
 *     <Legend />
 *   </LineChart>
 *
 * x values can be Date objects, numbers, or category strings. Dates are
 * placed on a true time scale, so uneven gaps show as uneven spacing.
 * Pass theme={{ ... }} to LineChart to override any colors in DEFAULT_THEME.
 */

export const DEFAULT_THEME = {
  background: "#FFFFFF",
  grid: "#E5E7EB",
  axis: "#374151",
  label: "#6B7280",
  text: "#191C1E",
  crosshair: "#00488D",
  tooltipBg: "#191C1E",
  tooltipText: "#F7F9FB",
  palette: ["#004785", "#00A87E", "#F59E0B", "#DC2626"],
};

type ChartTheme = typeof DEFAULT_THEME;

interface ChartContextValue {
  data: any[];
  x: string;
  width: number;
  height: number;
  innerW: number;
  innerH: number;
  margin: { top: number; right: number; bottom: number; left: number };
  theme: ChartTheme;
  xScale: (d: any, i: number) => number;
  yScale: (v: number) => number;
  yTicks: number[];
  lines: { y: string; name?: string; color: string }[];
  colorFor: (key: string) => string | undefined;
  hoverIndex: number | null;
  hidden: Set<string>;
  toggle: (key: string) => void;
}

const ChartContext = createContext<ChartContextValue | null>(null);
const useChart = () => {
  const ctx = useContext(ChartContext);
  if (!ctx) throw new Error("Chart components must be used inside <LineChart>.");
  return ctx;
};

// ---------- formatting ----------
const isDate = (v: any): v is Date => v instanceof Date;
export const formatNumber = (v: any) =>
  typeof v === "number" ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : v;
export const formatShortDate = (v: any) =>
  isDate(v) ? v.toLocaleDateString(undefined, { day: "numeric", month: "short" }) : formatNumber(v);
export const formatLongDate = (v: any) =>
  isDate(v)
    ? v.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    : formatNumber(v);

// ---------- helpers ----------
function niceTicks(min: number, max: number, count = 5) {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const raw = (max - min) / Math.max(count, 1);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const ticks: number[] = [];
  for (let v = Math.floor(min / step) * step; v <= Math.ceil(max / step) * step + step / 2; v += step)
    ticks.push(+v.toFixed(10));
  return ticks;
}

function collectLines(children: any, out: any[] = []) {
  (Array.isArray(children) ? children : [children]).flat().forEach((c) => {
    if (!c || typeof c !== "object") return;
    if (c.type === Line && c.props.y) out.push(c.props);
    if (c.props?.children) collectLines(c.props.children, out);
  });
  return out;
}

function useWidth(ref: React.RefObject<HTMLDivElement>) {
  const [w, setW] = useState(600);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

// ---------- container ----------
interface LineChartProps {
  data?: any[];
  x: string;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  yDomain?: [number, number];
  theme?: Partial<ChartTheme>;
  children?: ReactNode;
}

export function LineChart({
  data = [],
  x,
  height = 280,
  margin = { top: 16, right: 20, bottom: 32, left: 48 },
  yDomain,
  theme: themeOverride,
  children,
}: LineChartProps) {
  const theme = { ...DEFAULT_THEME, ...themeOverride };
  const wrapRef = useRef<HTMLDivElement>(null);
  const width = useWidth(wrapRef);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());

  // Give each line a palette color unless it sets its own
  const lines = collectLines(children).map((l, i) => ({
    ...l,
    color: l.color || theme.palette[i % theme.palette.length],
  }));
  const colorFor = (key: string) => lines.find((l) => l.y === key)?.color;

  const innerW = Math.max(width - margin.left - margin.right, 0);
  const innerH = Math.max(height - margin.top - margin.bottom, 0);
  const first = data[0]?.[x];
  const continuousX = typeof first === "number" || isDate(first);

  const xScale = useMemo(() => {
    if (continuousX) {
      const vals = data.map((d) => +d[x]);
      const min = Math.min(...vals),
        span = Math.max(...vals) - min || 1;
      return (d: any) => ((+d[x] - min) / span) * innerW;
    }
    const n = Math.max(data.length - 1, 1);
    return (d: any, i: number) => (i / n) * innerW;
  }, [data, x, innerW, continuousX]);

  const lineKeys = lines.map((l) => l.y).join("|");
  const { yScale, yTicks } = useMemo(() => {
    let lo: number, hi: number;
    if (yDomain) [lo, hi] = yDomain;
    else {
      const vals = data.flatMap((d) =>
        lines.filter((l) => !hidden.has(l.y) && typeof d[l.y] === "number").map((l) => d[l.y]),
      );
      lo = vals.length ? Math.min(...vals) : 0;
      hi = vals.length ? Math.max(...vals) : 1;
    }
    const ticks = niceTicks(lo, hi, Math.max(Math.floor(innerH / 55), 2));
    const tMin = yDomain ? lo : ticks[0];
    const tMax = yDomain ? hi : ticks[ticks.length - 1];
    const span = tMax - tMin || 1;
    return {
      yScale: (v: number) => innerH - ((v - tMin) / span) * innerH,
      yTicks: ticks.filter((t) => t >= tMin && t <= tMax),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, lineKeys, hidden, innerH, yDomain]);

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!data.length) return;
    const px = e.clientX - e.currentTarget.getBoundingClientRect().left - margin.left;
    let best = 0,
      bestDist = Infinity;
    data.forEach((d, i) => {
      const dist = Math.abs(xScale(d, i) - px);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setHoverIndex(best);
  };

  const toggle = (key: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const ctx: ChartContextValue = {
    data,
    x,
    width,
    height,
    innerW,
    innerH,
    margin,
    theme,
    xScale,
    yScale,
    yTicks,
    lines,
    colorFor,
    hoverIndex,
    hidden,
    toggle,
  };

  const kids = (Array.isArray(children) ? children : [children]).flat();
  const svgKids = kids.filter((c: any) => c && !c.type?.isHtml);
  const htmlKids = kids.filter((c: any) => c && c.type?.isHtml);

  return (
    <ChartContext.Provider value={ctx}>
      <div
        ref={wrapRef}
        className="relative w-full select-none"
        style={{ background: theme.background, fontFamily: "'Manrope', 'Segoe UI', system-ui, sans-serif" }}
      >
        <svg
          width={Math.max(width, 0)}
          height={height}
          role="img"
          aria-label="Line chart"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIndex(null)}
          className="block overflow-visible"
        >
          <g transform={`translate(${margin.left},${margin.top})`}>
            {svgKids}
            {hoverIndex !== null && data[hoverIndex] && (
              <line
                x1={xScale(data[hoverIndex], hoverIndex)}
                x2={xScale(data[hoverIndex], hoverIndex)}
                y1={0}
                y2={innerH}
                stroke={theme.crosshair}
                strokeWidth={1}
                strokeDasharray="3 3"
                pointerEvents="none"
              />
            )}
          </g>
        </svg>
        {htmlKids}
      </div>
    </ChartContext.Provider>
  );
}

// ---------- pieces ----------
export function Grid({ vertical = false }: { vertical?: boolean }) {
  const { yTicks, yScale, innerW, innerH, theme, data, xScale } = useChart();
  const every = Math.ceil(data.length / Math.max(Math.floor(innerW / 80), 2));
  return (
    <g aria-hidden="true">
      {yTicks.map((t) => (
        <line
          key={`h${t}`}
          x1={0}
          x2={innerW}
          y1={yScale(t)}
          y2={yScale(t)}
          stroke={theme.grid}
          strokeDasharray="1 4"
          strokeLinecap="round"
          strokeWidth={1.5}
        />
      ))}
      {vertical &&
        data.map((d, i) =>
          i % every === 0 ? (
            <line key={`v${i}`} x1={xScale(d, i)} x2={xScale(d, i)} y1={0} y2={innerH} stroke={theme.grid} />
          ) : null,
        )}
    </g>
  );
}

export function XAxis({ format = formatShortDate, maxTicks }: { format?: (v: any) => string; maxTicks?: number }) {
  const { data, x, xScale, innerW, innerH, theme } = useChart();
  const every = Math.ceil(data.length / (maxTicks ?? Math.max(Math.floor(innerW / 80), 2)));
  return (
    <g transform={`translate(0,${innerH})`} aria-hidden="true">
      <line x1={0} x2={innerW} stroke={theme.grid} strokeWidth={1.5} />
      {data.map((d, i) =>
        i % every === 0 ? (
          <g key={i} transform={`translate(${xScale(d, i)},0)`}>
            <line y2={6} stroke={theme.grid} strokeWidth={1.5} />
            <text y={20} textAnchor="middle" fill={theme.label} fontSize={11} fontWeight={600}>
              {format(d[x])}
            </text>
          </g>
        ) : null,
      )}
    </g>
  );
}

export function YAxis({ format = formatNumber }: { format?: (v: any) => string }) {
  const { yTicks, yScale, theme } = useChart();
  return (
    <g aria-hidden="true">
      {yTicks.map((t) => (
        <text
          key={t}
          x={-12}
          y={yScale(t)}
          dy="0.32em"
          textAnchor="end"
          fill={theme.label}
          fontSize={11}
          fontWeight={600}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {format(t)}
        </text>
      ))}
    </g>
  );
}

interface LineProps {
  y: string;
  name?: string;
  color?: string;
  strokeWidth?: number;
  dashed?: boolean;
  dots?: boolean;
  area?: boolean;
  curve?: "linear" | "smooth";
  endLabel?: boolean;
}

export function Line({
  y,
  color,
  strokeWidth = 2.5,
  dashed = false,
  dots = false,
  area = false,
  curve = "linear",
  endLabel = true,
}: LineProps) {
  const { data, xScale, yScale, innerH, hoverIndex, hidden, colorFor, theme } = useChart();
  const gid = useId().replace(/:/g, "");
  if (hidden.has(y)) return null;
  const stroke = color || colorFor(y) || theme.palette[0];

  const pts = data
    .map((d, i) => (typeof d[y] === "number" ? [xScale(d, i), yScale(d[y]), i] : null))
    .filter(Boolean) as [number, number, number][];
  if (!pts.length) return null;

  let path: string;
  if (curve === "smooth" && pts.length > 2) {
    path = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i],
        p1 = pts[i],
        p2 = pts[i + 1],
        p3 = pts[i + 2] || p2;
      path += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${
        p2[0] - (p3[0] - p1[0]) / 6
      },${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
    }
  } else {
    path = pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
  }

  const hovered = pts.find((p) => p[2] === hoverIndex);
  const last = pts[pts.length - 1];

  return (
    <g>
      {area && (
        <>
          <defs>
            <linearGradient id={`g${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={`${path} L${pts[pts.length - 1][0]},${innerH} L${pts[0][0]},${innerH} Z`} fill={`url(#g${gid})`} />
        </>
      )}
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dashed ? "2 6" : undefined}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {endLabel && (
        <text x={last[0] + 8} y={last[1]} dy="0.32em" fill={stroke} fontSize={11.5} fontWeight={700}>
          {formatNumber(data[last[2]][y])}
        </text>
      )}
      {dots &&
        pts.map((p) => (
          <circle key={p[2]} cx={p[0]} cy={p[1]} r={2.5} fill={theme.background} stroke={stroke} strokeWidth={1.5} />
        ))}
      {hovered && <circle cx={hovered[0]} cy={hovered[1]} r={4} fill={theme.background} stroke={stroke} strokeWidth={2.5} />}
    </g>
  );
}

export function Tooltip({
  formatX = formatLongDate,
  formatY = formatNumber,
}: {
  formatX?: (v: any) => string;
  formatY?: (v: any) => string;
}) {
  const { data, x, xScale, yScale, margin, innerW, hoverIndex, lines, hidden, theme } = useChart();
  if (hoverIndex === null || !data[hoverIndex]) return null;
  const d = data[hoverIndex];
  const visible = lines.filter((l) => !hidden.has(l.y) && typeof d[l.y] === "number");
  if (!visible.length) return null;
  const px = xScale(d, hoverIndex);
  const top = margin.top + 8 + Math.min(...visible.map((l) => yScale(d[l.y])));
  const flip = px > innerW * 0.62;

  return (
    <div
      className="pointer-events-none absolute z-10 min-w-[9rem] rounded-lg px-3 py-2.5 text-xs shadow-lg"
      style={{
        left: margin.left + 16 + px,
        top,
        transform: `translate(${flip ? "calc(-100% - 16px)" : "16px"}, -50%)`,
        background: theme.tooltipBg,
        color: theme.tooltipText,
      }}
    >
      <div className="mb-1.5 font-bold">{formatX(d[x])}</div>
      {visible.map((l) => (
        <div key={l.y} className="flex items-center justify-between gap-5 py-0.5">
          <span className="flex items-center gap-2 opacity-80">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: l.color }} />
            {l.name || l.y}
          </span>
          <span className="font-bold" style={{ fontVariantNumeric: "tabular-nums" }}>
            {formatY(d[l.y])}
          </span>
        </div>
      ))}
    </div>
  );
}
Tooltip.isHtml = true;

export function Legend() {
  const { lines, hidden, toggle, theme } = useChart();
  return (
    <div className="flex flex-wrap gap-4 pt-3">
      {lines.map((l) => {
        const off = hidden.has(l.y);
        return (
          <button
            key={l.y}
            type="button"
            onClick={() => toggle(l.y)}
            aria-pressed={!off}
            className="flex items-center gap-1.5 text-xs font-bold transition-opacity focus:outline-none focus-visible:underline"
            style={{
              color: theme.text,
              opacity: off ? 0.35 : 1,
              textDecoration: off ? "line-through" : "none",
            }}
          >
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
            {l.name || l.y}
          </button>
        );
      })}
    </div>
  );
}
Legend.isHtml = true;
