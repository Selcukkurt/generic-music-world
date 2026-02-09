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
    setIsLoading(true);
    setErrorMessage(null);

    const { error } = await supabaseBrowser.auth.signInWithPassword({
      email,
      password,
    });

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
      setIsLoading(false);
      return;
    }

    router.replace("/dashboard");
  };

  return (
    <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
      <label className="block text-xs uppercase tracking-[0.2em] text-slate-300">
        Email
        <input
          type="email"
          name="email"
          placeholder="you@example.com"
          className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 shadow-[0_10px_30px_rgba(7,16,35,0.35)] focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>

      <label className="block text-xs uppercase tracking-[0.2em] text-slate-300">
        Şifre
        <input
          type="password"
          name="password"
          placeholder="••••••••"
          className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 shadow-[0_10px_30px_rgba(7,16,35,0.35)] focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
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
        <div className="rounded-xl border border-amber-200/20 bg-amber-50/10 px-4 py-3 text-sm text-amber-100">
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
        className="w-full rounded-xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_16px_40px_rgba(245,158,11,0.35)] transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
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
