"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { supabaseBrowser } from "@/lib/supabase/client";
import { establishSessionFromUrlHashIfPresent } from "@/lib/supabase/hashSession";
import { getCurrentUser, getPostLoginRedirectPath } from "@/lib/auth/getCurrentUser";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/ToastProvider";

/**
 * Set Password page – shown after user clicks invite link in email.
 * Supabase redirects here with tokens in URL hash; we establish session and let user set password.
 *
 * Add this URL to Supabase Dashboard → Auth → URL Configuration → Redirect URLs:
 *   https://your-domain.com/auth/set-password
 *   http://localhost:3005/auth/set-password (dev)
 */
export default function SetPasswordPage() {
  const router = useRouter();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  /** Session / invite link failure (shown before the form). */
  const [initError, setInitError] = useState<{ title: string; body: string } | null>(null);
  /** Validation or updateUser failure on the form. */
  const [error, setError] = useState<{ title: string; body: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasUser, setHasUser] = useState(false);

  useEffect(() => {
    const init = async () => {
      const fromHash = await establishSessionFromUrlHashIfPresent(supabaseBrowser);
      if (fromHash.error) {
        setInitError({
          title: "Bağlantı kullanılamıyor",
          body: fromHash.error,
        });
        setLoading(false);
        return;
      }

      const { data } = await supabaseBrowser.auth.getSession();
      if (data.session?.user) {
        setHasUser(true);
      } else {
        await new Promise((r) => setTimeout(r, 150));
        const { data: data2 } = await supabaseBrowser.auth.getSession();
        if (data2.session?.user) {
          setHasUser(true);
        } else {
          setInitError({
            title: "Geçersiz veya süresi dolmuş bağlantı",
            body: "Davet bağlantısı geçersiz veya süresi dolmuş olabilir. Yöneticinizden yeni bir davet isteyin.",
          });
        }
      }
      setLoading(false);
    };

    init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError({
        title: "Şifre çok kısa",
        body: "Şifre en az 6 karakter olmalıdır.",
      });
      return;
    }

    if (password !== confirmPassword) {
      setError({
        title: "Şifreler eşleşmiyor",
        body: "Şifre ve tekrar alanları aynı olmalıdır.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabaseBrowser.auth.updateUser({ password });

      if (updateError) {
        setError({
          title: "Şifre ayarlanamadı",
          body: updateError.message,
        });
        setSubmitting(false);
        return;
      }

      toast.success("Şifre ayarlandı", "Artık giriş yapabilirsiniz.");
      const currentUser = await getCurrentUser();
      const path = currentUser ? getPostLoginRedirectPath(currentUser) : "/dashboard";
      router.replace(path);
    } catch (err) {
      setError({
        title: "Hata",
        body: err instanceof Error ? err.message : "Şifre ayarlanırken bir hata oluştu.",
      });
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="ui-page flex min-h-[100dvh] flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/brand-loader.gif"
            alt="Yükleniyor"
            width={40}
            height={40}
            className="h-10 w-10"
          />
          <p className="text-sm ui-text-muted">Oturum doğrulanıyor...</p>
        </div>
      </main>
    );
  }

  if (!hasUser) {
    return (
      <main className="ui-page flex min-h-[100dvh] flex-col items-center justify-center p-4">
        <div className="ui-card-plain w-full max-w-md p-6">
          <h1 className="text-xl font-semibold text-[var(--color-text)]">Davet Bağlantısı</h1>
          {initError ? (
            <div className="mt-4">
              <ErrorState title={initError.title} message={initError.body} />
            </div>
          ) : null}
          <Link
            href="/login"
            className="mt-6 inline-block text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            Giriş sayfasına dön
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="ui-page flex min-h-[100dvh] flex-col items-center justify-center p-4">
      <div className="ui-card-plain w-full max-w-md p-6">
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Şifre Belirle</h1>
        <p className="mt-1 text-sm ui-text-muted">
          Hesabınızı tamamlamak için bir şifre belirleyin. En az 6 karakter kullanın.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
              Şifre *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="ui-input w-full text-sm"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
              Şifre (tekrar) *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="ui-input w-full text-sm"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          {error ? (
            <div className="mt-2">
              <ErrorState title={error.title} message={error.body} />
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="ui-button-primary w-full py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            {submitting ? "Kaydediliyor..." : "Şifreyi Kaydet"}
          </button>
        </form>
      </div>
    </main>
  );
}
