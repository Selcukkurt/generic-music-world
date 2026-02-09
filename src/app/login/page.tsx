"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase/client";

import LoginForm from "./LoginForm";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabaseBrowser.auth.getUser();

      if (data.user) {
        router.replace("/dashboard");
      }
    };

    checkSession();
  }, [router]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#081426] via-[#0b1b35] to-[#0a1020] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-6 py-16 lg:flex-row lg:items-center lg:justify-between">
        <section className="flex flex-1 flex-col gap-6">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200">
            Generic Music World
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Hoş Geldiniz
            </h1>
            <p className="max-w-lg text-base text-slate-300 sm:text-lg">
              Operasyonlarınızı tek bir panelde yönetin. Modüller, departmanlar
              ve canlı erişim her zaman elinizin altında.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <span className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-slate-100">
              11 Operasyonel Modül
            </span>
            <span className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-slate-100">
              8+ Departman
            </span>
            <span className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-slate-100">
              24/7 Erişim
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Sorularınız mı var? Destek ekibimiz her zaman yanınızda.
          </p>
        </section>

        <section className="flex w-full flex-1 items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_24px_80px_rgba(7,16,35,0.6)] backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Giriş Yap</h2>
              <span className="rounded-full bg-amber-900/40 px-3 py-1 text-xs font-semibold text-amber-200">
                Yeni
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-300">
              Hesabınıza erişmek için bilgilerinizi girin.
            </p>
            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}
