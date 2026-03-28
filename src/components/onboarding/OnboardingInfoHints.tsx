import type { HTMLAttributes } from "react";

const HINTS: { icon: string; text: string }[] = [
  { icon: "⏳", text: "Tahmini süre: 1–2 iş günü" },
  { icon: "📩", text: "Hazır olduğunda size bilgilendirme e-postası göndereceğiz" },
  { icon: "🔄", text: "Bu sayfa otomatik olarak güncellenecek" },
  { icon: "💡", text: "Bu sayfayı açık tutabilirsiniz" },
];

type OnboardingInfoHintsProps = HTMLAttributes<HTMLDivElement> & {
  /** `aria-live` region for loading context */
  livePolitely?: boolean;
};

/**
 * Compact, secondary copy for onboarding bootstrap or activation-wait states.
 * Pure presentation — no data fetching. See OnboardingFlow for when it is shown.
 */
export default function OnboardingInfoHints({
  className = "",
  livePolitely = false,
  ...rest
}: OnboardingInfoHintsProps) {
  return (
    <div
      role={livePolitely ? "status" : undefined}
      aria-live={livePolitely ? "polite" : undefined}
      className={`rounded-xl border border-[var(--color-border)]/70 bg-[var(--color-bg)]/35 px-4 py-3 text-left shadow-[var(--shadow-soft)] ${className}`.trim()}
      {...rest}
    >
      <ul className="space-y-2.5">
        {HINTS.map((row) => (
          <li key={row.text} className="flex gap-2.5 text-xs leading-snug text-[var(--color-text-muted)]">
            <span className="shrink-0 text-sm leading-none opacity-90" aria-hidden>
              {row.icon}
            </span>
            <span>{row.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
