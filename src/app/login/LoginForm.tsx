"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase/client";

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
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      <label className="block text-xs uppercase tracking-[0.25em] text-slate-300">
        Email
        <input
          type="email"
          name="email"
          placeholder="you@example.com"
          className="mt-3 w-full border-b border-white/20 bg-transparent px-1 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>

      <label className="block text-xs uppercase tracking-[0.25em] text-slate-300">
        Şifre
        <input
          type="password"
          name="password"
          placeholder="••••••••"
          className="mt-3 w-full border-b border-white/20 bg-transparent px-1 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-white/20 bg-white/10 text-amber-400 focus:ring-2 focus:ring-amber-500/30"
          />
          Beni hatırla
        </label>
        <button
          type="button"
          className="text-sm text-amber-200 hover:text-amber-100"
        >
          Şifremi unuttum
        </button>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-amber-200/20 bg-amber-50/5 px-4 py-3 text-sm text-amber-100">
          <p className="font-semibold text-amber-100">
            {errorMessage.title}
          </p>
          <p className="mt-1 text-amber-100/90">{errorMessage.body}</p>
          {errorMessage.helper ? (
            <p className="mt-1 text-amber-100/70">{errorMessage.helper}</p>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        className="w-full rounded-full border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-300/20 disabled:cursor-not-allowed disabled:opacity-60"
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
