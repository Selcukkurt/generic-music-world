"use client";

import Link from "next/link";

/**
 * Reusable "Erişim Kısıtlı" (Access Denied) component.
 * All labels in Turkish.
 */
export default function AccessDenied() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center sm:p-12">
      <h2 className="text-lg font-semibold text-[var(--color-text)]">
        Erişim Kısıtlı
      </h2>
      <p className="ui-text-muted max-w-sm text-sm">
        Bu alana erişim yetkiniz bulunmuyor.
      </p>
      <Link
        href="/dashboard"
        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-medium transition hover:bg-[var(--color-surface2)] hover:text-[var(--color-text)]"
      >
        Dashboard&apos;a dön
      </Link>
    </div>
  );
}
