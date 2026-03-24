"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { establishSessionFromUrlHashIfPresent } from "@/lib/supabase/hashSession";

/**
 * OAuth / email link callback (PKCE `?code=` or implicit hash `#access_token=…`).
 * Invite emails often put tokens in the hash; we parse it and `setSession` because
 * `getSession()` can run before Supabase finishes async URL detection.
 *
 * Add to Supabase Dashboard → Auth → URL Configuration → Redirect URLs:
 *   https://your-domain.com/auth/callback
 *   http://localhost:3005/auth/callback
 */
function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const next = "/auth/set-password";

    const run = async () => {
      const code = searchParams.get("code");

      if (code) {
        const { error: exchangeErr } = await supabaseBrowser.auth.exchangeCodeForSession(code);
        if (exchangeErr) {
          console.error("[auth/callback] exchangeCodeForSession:", exchangeErr.message);
          setError("Oturum oluşturulamadı. Bağlantı süresi dolmuş olabilir.");
          return;
        }
        router.replace(next);
        return;
      }

      const fromHash = await establishSessionFromUrlHashIfPresent(supabaseBrowser);
      if (fromHash.error) {
        console.error("[auth/callback] hash session:", fromHash.error);
        setError(fromHash.error);
        return;
      }
      if (fromHash.established) {
        router.replace(next);
        return;
      }

      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (session?.user) {
        router.replace(next);
        return;
      }

      // Brief second read: Supabase may still be applying tokens from the URL asynchronously.
      await new Promise((r) => setTimeout(r, 150));
      const { data: { session: s2 } } = await supabaseBrowser.auth.getSession();
      if (s2?.user) {
        router.replace(next);
        return;
      }

      setError("Geçersiz veya eksik davet bağlantısı.");
    };

    void run();
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center px-4 text-center">
        <p className="text-sm text-[var(--color-text-secondary)]">{error}</p>
        <button
          type="button"
          onClick={() => router.replace("/login")}
          className="mt-4 text-sm text-[var(--color-primary)] underline"
        >
          Giriş sayfasına dön
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4">
      <p className="text-sm ui-text-muted">Yönlendiriliyor…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center px-4">
          <p className="text-sm ui-text-muted">Yükleniyor…</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
