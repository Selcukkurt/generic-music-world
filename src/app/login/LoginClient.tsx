"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { supabaseBrowser } from "@/lib/supabase/client";

import LoginForm from "./LoginForm";
import RotatingPitch from "./RotatingPitch";

export default function LoginClient() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
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
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto grid min-h-screen w-full max-w-5xl grid-cols-1 gap-12 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="flex flex-col justify-center gap-6 lg:pr-8">
          <Image
            src="/generic-music-logo-v2.png"
            alt="Generic Music Studio logo"
            width={520}
            height={160}
            className="mb-6 w-[170px] opacity-95 sm:w-[200px] lg:w-[220px]"
            style={{ height: "auto" }}
            priority
          />
          <div className="max-w-xl">
            <RotatingPitch />
          </div>

          <div className="flex flex-wrap gap-3">
            <span className="rounded-md border border-white/10 bg-white/10 px-4 py-2 text-sm text-slate-100">
              11 Operasyonel Modül
            </span>
            <span className="rounded-md border border-white/10 bg-white/10 px-4 py-2 text-sm text-slate-100">
              8+ Departman
            </span>
            <span className="rounded-md border border-white/10 bg-white/10 px-4 py-2 text-sm text-slate-100">
              24/7 Erişim
            </span>
          </div>

          <p className="text-xs text-slate-400">
            © {currentYear} Generic Music Studio. All rights reserved.
          </p>
        </section>

        <section className="flex w-full flex-col items-center justify-center lg:items-end">
          <div className="w-full max-w-[460px] rounded-xl border border-slate-800 bg-slate-900/60 px-6 pb-6 pt-5">
            <h2 className="text-2xl font-semibold text-left">
              Ekosisteme Bağlan
            </h2>
            <p className="mt-2 text-left text-sm text-slate-400">
              Ekosistemi büyüten her veri seninle başlar.
            </p>
            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}
