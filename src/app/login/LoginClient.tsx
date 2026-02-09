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
  const noiseDataUrl =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='0.4'/></svg>";

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
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#081426] via-[#0b1b35] to-[#0a1020] text-slate-100">
      <div className="pointer-events-none absolute -top-24 left-10 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl motion-safe:animate-pulse" />
      <div className="pointer-events-none absolute bottom-10 right-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl motion-safe:animate-pulse" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: `url("${noiseDataUrl}")` }}
      />

      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 gap-12 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="flex flex-col justify-center gap-6 lg:pr-10">
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
            © {currentYear} Generic Music Studio. All rights reserved.
          </p>
        </section>

        <section className="flex w-full flex-col items-center justify-center lg:items-end">
          <div className="w-full max-w-[460px] rounded-3xl border border-white/15 bg-white/10 px-6 pb-6 pt-5 shadow-[0_30px_90px_rgba(7,16,35,0.6)] backdrop-blur-xl">
            <h2 className="text-2xl font-semibold text-left">
              Ekosisteme Bağlan
            </h2>
            <p className="mt-2 text-left text-sm text-slate-300">
              Ekosistemi büyüten her veri seninle başlar.
            </p>
            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}
