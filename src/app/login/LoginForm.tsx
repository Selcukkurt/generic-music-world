"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
      setErrorMessage(error.message);
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
        <p className="rounded-lg border border-rose-800/70 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
          {errorMessage}
        </p>
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
            Giriş yapılıyor...
          </span>
        ) : (
          "Giriş Yap"
        )}
      </button>

    </form>
  );
}
