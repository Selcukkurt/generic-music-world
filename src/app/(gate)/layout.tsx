"use client";

import Image from "next/image";
import Link from "next/link";

import { supabaseBrowser } from "@/lib/supabase/client";
import { invalidateMeApiTokenCache } from "@/lib/me/meApiSession";
import { useAccessGate } from "@/hooks/useAccessGate";
import { useI18n } from "@/i18n/LocaleProvider";

export default function GateLayout({ children }: { children: React.ReactNode }) {
  const { isChecking } = useAccessGate();
  const { t } = useI18n();

  const signOut = async () => {
    await supabaseBrowser.auth.signOut();
    invalidateMeApiTokenCache();
    window.location.href = "/login";
  };

  if (isChecking) {
    return (
      <div className="ui-page flex min-h-[100dvh] items-center justify-center">
        <Image
          src="/brand-loader.gif"
          alt={t("common_loading")}
          width={64}
          height={64}
          className="h-16 w-16"
        />
      </div>
    );
  }

  return (
    <div className="ui-page flex min-h-[100dvh] flex-col">
      <header className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-4 sm:px-6">
        <Link href="/" className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
          Generic Music World
        </Link>
        <button
          type="button"
          onClick={() => void signOut()}
          className="rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
        >
          Çıkış
        </button>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
