"use client";

/**
 * Base section card for Personnel 360 content.
 * Consistent styling, spacing, and hierarchy across all tabs.
 */

type SectionCardProps = {
  title: string;
  children: React.ReactNode;
  className?: string;
};

export default function SectionCard({ title, children, className = "" }: SectionCardProps) {
  return (
    <section
      className={`ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-6 backdrop-blur-sm ${className}`}
    >
      <h3 className="mb-5 text-xs font-semibold uppercase tracking-wider ui-text-muted">
        {title}
      </h3>
      {children}
    </section>
  );
}
