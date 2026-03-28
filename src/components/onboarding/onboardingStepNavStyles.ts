/**
 * Shared layout tokens for onboarding step navigation (top tab strip + aside progress).
 * Long Turkish labels: line-clamp + overflow-wrap; stable min-heights keep rows aligned.
 */
export const ONBOARDING_STEP_NAV = {
  /** Horizontal strip: equal flex columns on sm+, scroll on narrow viewports */
  topListItem: "min-w-[8.25rem] shrink-0 sm:min-w-0 sm:flex-1 sm:basis-0",
  /** Fixed vertical band so chips align; content uses line-clamp inside */
  topButton:
    "flex min-h-[4.25rem] max-h-[4.5rem] w-full items-stretch rounded-xl border px-2.5 py-2 text-left sm:min-h-[4.5rem] sm:max-h-[4.75rem] sm:px-3 sm:py-2.5",
  topInner: "flex min-h-0 w-full min-w-0 items-start gap-2",
  topIcon: "shrink-0 text-base leading-none [padding-top:2px]",

  asideButton:
    "flex min-h-[4.5rem] w-full items-stretch gap-2.5 rounded-xl border px-3 py-2 text-left sm:min-h-[4.75rem] sm:gap-3 sm:py-2.5",
  asideInner: "flex min-h-0 w-full min-w-0 items-start gap-3",
  asideIcon: "shrink-0 text-base leading-none sm:text-lg [padding-top:1px]",

  status:
    "block text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]/90 line-clamp-1 [overflow-wrap:anywhere]",
  title:
    "mt-0.5 block text-sm font-medium leading-snug text-[var(--color-text-secondary)] line-clamp-2 [overflow-wrap:anywhere]",
  hint: "mt-1 block text-xs font-normal leading-snug text-[var(--color-text-muted)] line-clamp-2 [overflow-wrap:anywhere]",
} as const;
