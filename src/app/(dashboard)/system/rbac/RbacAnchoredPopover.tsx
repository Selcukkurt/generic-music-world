"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

const GAP = 8;
const VIEWPORT_PAD = 12;

type Align = "start" | "end";

function measureAndPlace(opts: {
  anchor: DOMRect;
  contentW: number;
  contentH: number;
  align: Align;
  minWidth?: number;
  maxWidth?: number;
}): CSSProperties {
  const vw = typeof window !== "undefined" ? window.innerWidth : 800;
  const vh = typeof window !== "undefined" ? window.innerHeight : 600;

  let width = opts.contentW;
  if (opts.minWidth) width = Math.max(width, opts.minWidth);
  if (opts.maxWidth) width = Math.min(width, opts.maxWidth);
  width = Math.min(Math.max(width, 200), vw - VIEWPORT_PAD * 2);

  const maxH = Math.max(120, vh - VIEWPORT_PAD * 2);
  const h = Math.min(opts.contentH, maxH);

  let left =
    opts.align === "end"
      ? opts.anchor.right - width
      : opts.anchor.left;

  if (left + width > vw - VIEWPORT_PAD) left = vw - VIEWPORT_PAD - width;
  if (left < VIEWPORT_PAD) left = VIEWPORT_PAD;

  const spaceBelow = vh - opts.anchor.bottom - GAP - VIEWPORT_PAD;
  const spaceAbove = opts.anchor.top - GAP - VIEWPORT_PAD;

  let top = opts.anchor.bottom + GAP;
  if (spaceBelow < Math.min(h, 160) && spaceAbove > spaceBelow) {
    top = opts.anchor.top - GAP - h;
  }
  if (top + h > vh - VIEWPORT_PAD) top = vh - VIEWPORT_PAD - h;
  if (top < VIEWPORT_PAD) top = VIEWPORT_PAD;

  const availableBelow = vh - top - VIEWPORT_PAD;
  const availableAbove = top - VIEWPORT_PAD;
  const scrollMax = Math.min(maxH, Math.max(availableBelow, availableAbove, 200));

  return {
    position: "fixed",
    top,
    left,
    width,
    maxHeight: scrollMax,
    zIndex: "var(--z-popover)",
  };
}

export type RbacAnchoredPopoverProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Element the popover aligns to (trigger). Outside-click excludes this node. */
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  align?: Align;
  minWidth?: number;
  maxWidth?: number;
  /** Dialog for panels; menu for action lists (no aria-modal). */
  panelRole?: "dialog" | "menu";
  /** id for aria-labelledby if you pass a title with that id */
  id?: string;
  "aria-label"?: string;
  className?: string;
};

/**
 * Portal + fixed positioning so parent overflow never clips. Closes on outside mousedown and Escape.
 */
export default function RbacAnchoredPopover({
  isOpen,
  onClose,
  anchorRef,
  children,
  align = "start",
  minWidth = 260,
  maxWidth = 360,
  panelRole = "dialog",
  id,
  "aria-label": ariaLabel,
  className = "",
}: RbacAnchoredPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({});

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel || !isOpen) return;

    const ar = anchor.getBoundingClientRect();
    const w = panel.offsetWidth || minWidth;
    const h = panel.scrollHeight || panel.offsetHeight || 280;

    setStyle(
      measureAndPlace({
        anchor: ar,
        contentW: w,
        contentH: h,
        align,
        minWidth,
        maxWidth,
      })
    );
  }, [anchorRef, isOpen, align, minWidth, maxWidth]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const ro =
      typeof ResizeObserver !== "undefined" && panelRef.current
        ? new ResizeObserver(() => updatePosition())
        : null;
    if (ro && panelRef.current) ro.observe(panelRef.current);

    const onWin = () => updatePosition();
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true);

    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [isOpen, onClose, anchorRef]);

  useEffect(() => {
    if (!isOpen || !panelRef.current) return;
    const root = panelRef.current;
    const focusable = root.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.focus({ preventScroll: true });
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  const a11yLabel = ariaLabel ?? (panelRole === "menu" ? "İşlemler" : undefined);

  return createPortal(
    <div
      ref={panelRef}
      id={id}
      role={panelRole}
      aria-label={a11yLabel}
      aria-modal={panelRole === "dialog" ? true : undefined}
      className={`flex min-h-0 flex-col overflow-hidden overscroll-contain rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-medium)] outline-none ${className}`}
      style={style}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
}
