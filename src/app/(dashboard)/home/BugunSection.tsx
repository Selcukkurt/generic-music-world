"use client";

export default function BugunSection() {
  return (
    <section className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-5 backdrop-blur-sm">
      <h2 className="mb-4 text-base font-semibold text-[var(--color-text)]">
        Bugün
      </h2>
      <div className="space-y-2 text-sm ui-text-muted">
        <p>5 bekleyen işlem</p>
        <p>2 toplantı · 1 deadline</p>
        <p className="pt-2 text-xs">Son güncelleme: bugün 09:15</p>
      </div>
    </section>
  );
}
