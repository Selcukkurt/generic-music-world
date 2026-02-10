"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase/client";
import { ErrorState } from "@/components/ui/ErrorState";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<{
    title: string;
    body: string;
    helper?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log("Supabase envs", {
      hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    });
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log("[login] submit:start");
    setIsLoading(true);
    setErrorMessage(null);
    let didTimeout = false;
    const timeoutId = window.setTimeout(() => {
      didTimeout = true;
      setIsLoading(false);
      setErrorMessage({
        title: "Giriş işlemi beklenenden uzun sürdü",
        body: "Lütfen tekrar deneyin.",
      });
    }, 10000);

    try {
      const { data, error } = await supabaseBrowser.auth.signInWithPassword({
        email,
        password,
      });

      console.log("[login] auth:response", { error, user: data?.user?.id });

      if (didTimeout) {
        return;
      }

      if (error) {
        const code = error.code ?? "";
        const lowerMessage = error.message.toLowerCase();

        if (
          code === "invalid_credentials" ||
          lowerMessage.includes("invalid login credentials")
        ) {
          setErrorMessage({
            title: "Giriş bilgileri doğrulanamadı",
            body: "Lütfen e-posta adresinizi ve şifrenizi kontrol edip tekrar deneyin.",
            helper:
              "Şifrenizi hatırlamıyorsanız 'Şifremi unuttum' bağlantısını kullanabilirsiniz.",
          });
        } else if (code === "too_many_requests" || code === "rate_limit") {
          setErrorMessage({
            title: "Çok fazla deneme yapıldı",
            body: "Güvenlik için kısa bir süre beklemenizi rica ediyoruz.",
            helper: "Birkaç dakika sonra tekrar deneyebilirsiniz.",
          });
        } else if (
          lowerMessage.includes("network") ||
          lowerMessage.includes("fetch")
        ) {
          setErrorMessage({
            title: "Bağlantı sorunu yaşandı",
            body: "Şu anda sunucuya ulaşılamıyor. Lütfen internet bağlantınızı kontrol edin.",
            helper: "Sorun devam ederse birkaç dakika sonra tekrar deneyin.",
          });
        } else {
          setErrorMessage({
            title: "Bir şeyler ters gitti",
            body: "Giriş işlemi şu anda tamamlanamadı. Lütfen tekrar deneyin.",
          });
        }
        return;
      }

      console.log("[login] redirect:/dashboard");
      router.replace("/dashboard");
    } catch (error) {
      console.log("[login] auth:error", error);
      if (!didTimeout) {
        setErrorMessage({
          title: "Bir şeyler ters gitti",
          body: "Giriş işlemi şu anda tamamlanamadı. Lütfen tekrar deneyin.",
        });
      }
    } finally {
      window.clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  return (
    <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
      <label className="block text-xs uppercase tracking-[0.2em] ui-text-muted">
        Email
        <input
          type="email"
          name="email"
          placeholder="you@example.com"
          className="ui-input mt-2 text-sm"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>

      <label className="block text-xs uppercase tracking-[0.2em] ui-text-muted">
        Şifre
        <input
          type="password"
          name="password"
          placeholder="••••••••"
          className="ui-input mt-2 text-sm"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm ui-text-secondary">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-slate-200 focus:ring-2 focus:ring-amber-500/30"
          />
          Beni hatırla
        </label>
        <button
          type="button"
          className="text-sm ui-text-secondary hover:text-slate-100"
        >
          Şifremi unuttum
        </button>
      </div>

      {errorMessage ? (
        <ErrorState
          title={errorMessage.title}
          message={errorMessage.body}
          helper={errorMessage.helper}
        />
      ) : null}

      <button
        type="submit"
        className="ui-button-primary px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="relative h-5 w-5">
              <img
                src="/brand-loader.gif"
                alt="Loading"
                className="h-5 w-5"
              />
            </span>
            Güvenli giriş yapılıyor...
          </span>
        ) : (
          "Giriş Yap"
        )}
      </button>

    </form>
  );
}
