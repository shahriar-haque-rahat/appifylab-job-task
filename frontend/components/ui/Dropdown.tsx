"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface DropdownProps {
  trigger: (o: { open: boolean; toggle: () => void }) => ReactNode;
  children: (o: { close: () => void }) => ReactNode;
  panelClassName?: string;
  wrapperClassName?: string;
  /**
   * When true (default) the panel stays mounted and gets a `show` class while
   * open — matches the template dropdowns whose CSS animates via `.show`.
   * When false the panel is only mounted while open (used by Tailwind panels
   * such as the visibility selector, which have no `.show` display rule).
   */
  renderWhenClosed?: boolean;
}

/**
 * Generic click-to-toggle dropdown. Closes on outside-click / Escape. The
 * wrapper is positioned `relative` (Tailwind) so the absolutely-positioned panel
 * anchors to it. Reused for the post menu, profile menu, and the visibility
 * selector.
 */
export function Dropdown({
  trigger,
  children,
  panelClassName,
  wrapperClassName,
  renderWhenClosed = true,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${wrapperClassName ?? ""}`}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {renderWhenClosed ? (
        <div className={`${panelClassName ?? ""}${open ? " show" : ""}`}>
          {children({ close: () => setOpen(false) })}
        </div>
      ) : open ? (
        <div className={panelClassName ?? ""}>
          {children({ close: () => setOpen(false) })}
        </div>
      ) : null}
    </div>
  );
}
