"use client";

import SectionCard from "./SectionCard";

export interface TimelineItem {
  icon: React.ReactNode;
  title: string;
  description?: string;
  time?: string;
}

type TimelineListCardProps = {
  title: string;
  items: TimelineItem[];
  className?: string;
};

export default function TimelineListCard({ title, items, className = "" }: TimelineListCardProps) {
  return (
    <SectionCard title={title} className={className}>
      <div className="space-y-0">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-4 border-b border-[var(--color-border)] py-4 last:border-0 last:pb-0 first:pt-0"
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface2)] ui-text-muted">
              {item.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-[var(--color-text)]">{item.title}</p>
                {item.time ? (
                  <span className="shrink-0 text-xs ui-text-muted">{item.time}</span>
                ) : null}
              </div>
              {item.description ? (
                <p className="mt-0.5 text-xs leading-relaxed ui-text-muted">{item.description}</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
