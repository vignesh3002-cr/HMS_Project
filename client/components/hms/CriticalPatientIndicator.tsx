import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

export interface CriticalInfo {
  isCritical: boolean;
  reasons: string[];
}

interface CriticalCornerProps {
  reasons: string[];
}

/**
 * Small red triangle pinned to the top-left edge of the patient row/card.
 */
export function CriticalCorner({ reasons }: CriticalCornerProps) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;
    const wrapper = el.closest("[data-critical-wrapper]");
    if (!wrapper) return;
    const td = wrapper.closest("td");
    if (td) {
      const style = window.getComputedStyle(td);
      setPos({
        left: -(parseFloat(style.paddingLeft) || 20),
        top: -(parseFloat(style.paddingTop) || 16),
      });
    }
  }, []);

  if (!reasons.length) return null;

  return (
    <span
      ref={spanRef}
      className="absolute z-10 pointer-events-none"
      style={{ left: pos.left, top: pos.top }}
    >
      <svg
        width="20"
        height="20"
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
 * Small red dot placed beside the patient ID / name.
 * Shows a tooltip on hover listing the critical reasons.
 */
export function CriticalDot({ reasons, className = "" }: CriticalDotProps) {
  const mouse = useMouse();
  if (!reasons.length) return null;
  return (
    <span
      className={`relative inline-flex items-center ${className}`}
    >
      <span className="inline-block h-2 w-2 rounded-full bg-red-500 ml-1.5 shrink-0 align-middle" />
      <span
        className="pointer-events-none fixed z-[9999] w-max max-w-[260px] rounded-lg bg-white px-3 py-2.5 text-[11px] font-semibold leading-snug text-red-700 shadow-lg"
        style={{
          left: mouse.x + 16,
          top: mouse.y - 10,
          display: mouse.active ? "block" : "none",
        }}
      >
        <span className="mb-1 block text-[12px] font-bold text-red-600">
          <svg className="inline-block w-3.5 h-3.5 mr-1 -mt-0.5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          CRITICAL FACTORS:
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

    if (reasons.length > 0) {
      const avatar = el.querySelector<HTMLElement>(
        ":scope > div[class*='rounded-xl'], :scope > div[class*='rounded-full']"
      );
      if (avatar) {
        avatar.style.boxShadow = "0 0 0 2.5px #DC2626";
        avatar.style.borderRadius = "9999px";
      }
    }

    const onEnter = () => setMouse((m) => ({ ...m, active: true }));
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
