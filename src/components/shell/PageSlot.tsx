"use client";

import PageHeader from "./PageHeader";

type PageSlotProps = {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
};

/** Main content slot: page header (title/subtitle) + content area. */
export default function PageSlot({
  title,
  subtitle,
  children,
}: PageSlotProps) {
  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title={title ?? "Page Title"}
        subtitle={subtitle ?? "Page subtitle placeholder."}
      />
      <section className="ui-section min-h-[200px]">
        {children ?? (
          <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-8 backdrop-blur-sm">
            <p className="ui-text-muted text-center text-sm">
              Content placeholder
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
