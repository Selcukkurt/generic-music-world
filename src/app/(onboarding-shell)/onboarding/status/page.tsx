"use client";

/** Shallow status route for awaiting_activation (allowed alongside activation-pending). */
export default function OnboardingStatusPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <p className="text-sm text-[var(--color-text-muted)]">Durum</p>
    </div>
  );
}
