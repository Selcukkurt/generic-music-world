"use client";

import { ErrorState } from "@/components/ui/ErrorState";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="ui-page flex min-h-[100dvh] items-center justify-center px-6">
      <div className="w-full max-w-md">
        <ErrorState
          title="Bir hata oluştu"
          message="Dashboard yüklenirken beklenmeyen bir sorun yaşandı."
          helper={error.message}
          actionLabel="Tekrar dene"
          onAction={reset}
        />
      </div>
    </div>
  );
}
