"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      console.error("Shell error:", error);
    }
  }, [error]);

  return (
    <div className="ui-page flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-xl font-semibold text-[var(--color-text)]">
        Bir hata oluştu
      </h1>
      <p className="ui-text-muted max-w-md text-center text-sm">
        Beklenmeyen bir sorun yaşandı. Lütfen sayfayı yenileyin veya bir süre
        sonra tekrar deneyin.
      </p>
      <button
        type="button"
        onClick={reset}
        className="ui-button-primary max-w-[200px] rounded-lg px-6 py-2.5 text-sm"
      >
        Tekrar dene
      </button>
    </div>
  );
}
