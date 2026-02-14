"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      console.error("Dashboard error:", error);
    }
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-xl font-semibold text-[var(--color-text)]">
        Bir hata oluştu
      </h1>
      <p className="ui-text-muted max-w-md text-center text-sm">
        Beklenmeyen bir sorun yaşandı. Lütfen sayfayı yenileyin veya ana sayfaya
        dönün.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm transition hover:bg-[var(--color-surface2)]"
        >
          Tekrar dene
        </button>
        <Link
          href="/dashboard"
          className="rounded-lg bg-[var(--brand-yellow)] px-4 py-2 text-sm font-medium text-[#121212] transition hover:opacity-90"
        >
          Ana sayfa
        </Link>
      </div>
    </div>
  );
}
