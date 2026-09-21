import React, { createContext, useContext, useState, useRef, useEffect } from "react";

export interface CriticalInfo {
  isCritical: boolean;
  reasons: string[];
}

interface CriticalCornerProps {
  reasons: string[];
}

/**
 * Small red triangle pinned to the top-left corner of the CriticalWrapper.
 * CriticalWrapper already sets position:relative, so this just uses
 * position:absolute top-0 left-0.
 */
export function CriticalCorner({ reasons }: CriticalCornerProps) {
  if (!reasons.length) return null;

  return (
    <span className="absolute top-0 left-0 z-10 pointer-events-none">
      <svg
        width="16"
        height="16"
        viewBox="0 0 20 20"
        className="block"
        aria-label="Critical patient"
      >
        <polygon points="0,0 20,0 0,20" fill="#DC2626" />
      </svg>
    </span>
  );
}

interface CriticalDotProps {
  reasons: string[];
  className?: string;
}

/**
 * Small red dot beside patient ID/Name.
 * Shows a tooltip on hover listing the critical reasons.
 */
export function CriticalDot({ reasons, className = "" }: CriticalDotProps) {
  const mouse = useMouse();
  if (!reasons.length) return null;
  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <span className="inline-block h-2 w-2 rounded-full bg-red-500 ml-1.5 shrink-0 align-middle" />
      <span
        className="pointer-events-none fixed z-[9999] w-max max-w-[260px] rounded-lg bg-white px-3 py-2.5 text-[11px] font-semibold leading-snug text-red-700 shadow-lg border border-red-100"
        style={{
          left: mouse.x + 16,
          top: mouse.y - 10,
          display: mouse.active ? "block" : "none",
        }}
      >
        <span className="mb-1 block text-[12px] font-bold text-red-600 flex items-center gap-1">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="inline-block shrink-0">
            <path d="M10 2L1 18h18L10 2z" fill="#DC2626"/>
            <path d="M10 8v4M10 14h.01" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          CRITICAL REASONS:
        </span>
        {reasons.map((reason, i) => (
          <span key={i} className="block">&#x2022; {reason}</span>
        ))}
      </span>
    </span>
  );
}

interface MouseContextValue {
  x: number;
  y: number;
  active: boolean;
}

const MouseContext = React.createContext<MouseContextValue>({ x: 0, y: 0, active: false });

function useMouse() {
  return useContext(MouseContext);
}

/**
 * Wrapper that makes a patient row/card position:relative
 * so the CriticalCorner can be absolutely positioned inside it.
 * Attaches mouse tracking to the parent row (tr or card div) so
 * hovering anywhere on the row shows the critical factors tooltip.
 */
export function CriticalWrapper({
  children,
  className = "",
  reasons = [],
}: {
  children: React.ReactNode;
  className?: string;
  reasons?: string[];
}) {
  const [mouse, setMouse] = useState<MouseContextValue>({ x: 0, y: 0, active: false });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const reasonsKey = reasons.join(",");

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const row = el.closest("tr") || el;
    row.style.position = "relative";

    const onEnter = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY, active: true });
    const onLeave = () => setMouse((m) => ({ ...m, active: false }));
    const onMove = (e: MouseEvent) => {
      setMouse({ x: e.clientX, y: e.clientY, active: true });
    };
    row.addEventListener("mouseenter", onEnter);
    row.addEventListener("mouseleave", onLeave);
    row.addEventListener("mousemove", onMove);
    return () => {
      row.removeEventListener("mouseenter", onEnter);
      row.removeEventListener("mouseleave", onLeave);
      row.removeEventListener("mousemove", onMove);
    };
  }, [reasonsKey]);

  return (
    <MouseContext.Provider value={mouse}>
      <div
        ref={wrapperRef}
        data-critical-wrapper
        className={`relative group ${className}`}
      >
        {children}
      </div>
    </MouseContext.Provider>
  );
}
