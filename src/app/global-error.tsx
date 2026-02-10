"use client";

import { ErrorState } from "@/components/ui/ErrorState";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="ui-page flex min-h-[100dvh] items-center justify-center px-6">
        <div className="w-full max-w-md">
          <ErrorState
            title="Kritik bir hata oluştu"
            message="Uygulama genelinde beklenmeyen bir hata oluştu."
            helper={error.message}
            actionLabel="Yeniden dene"
            onAction={reset}
          />
        </div>
      </body>
    </html>
  );
}
