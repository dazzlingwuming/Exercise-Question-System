import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialog({ open, title, children, onClose, busy = false, className = "max-w-lg" }: { open: boolean; title: string; children: ReactNode; onClose: () => void; busy?: boolean; className?: string }) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => (panel.current?.querySelector<HTMLElement>(FOCUSABLE) ?? panel.current)?.focus());
    return () => { cancelAnimationFrame(frame); document.body.style.overflow = oldOverflow; previous?.focus(); };
  }, [open]);
  if (!open) return null;
  return createPortal(<div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/45 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) close.current(); }}>
    <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={busy} tabIndex={-1} className={`panel max-h-[90dvh] w-full overflow-auto bg-panel p-5 shadow-xl sm:p-6 ${className}`} onKeyDown={(event) => {
      if (event.key === "Escape") { event.stopPropagation(); if (!busy) close.current(); }
      if (event.key === "Tab") {
        const nodes = [...(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].filter((node) => !node.hidden && node.getAttribute("aria-hidden") !== "true");
        const first = nodes[0]; const last = nodes[nodes.length - 1];
        if (!first) { event.preventDefault(); panel.current?.focus(); }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }}><h2 id={titleId} className="mb-3 text-lg font-semibold">{title}</h2>{children}</div>
  </div>, document.body);
}
