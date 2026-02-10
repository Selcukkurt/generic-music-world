import Link from "next/link";

import { ErrorState } from "@/components/ui/ErrorState";

export default function NotFound() {
  return (
    <div className="ui-page flex min-h-[100dvh] items-center justify-center px-6">
      <div className="w-full max-w-md space-y-4">
        <ErrorState
          title="Sayfa bulunamadı"
          message="Aradığınız sayfa mevcut değil veya taşınmış olabilir."
        />
        <Link
          href="/login"
          className="ui-button-primary block px-4 py-2 text-center text-sm font-semibold"
        >
          Girişe dön
        </Link>
      </div>
    </div>
  );
}
