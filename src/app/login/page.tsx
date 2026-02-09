"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { supabaseBrowser } from "@/lib/supabase/client";

import LoginForm from "./LoginForm";
import RotatingPitch from "./RotatingPitch";

export default function LoginPage() {
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

      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-6 py-16 lg:flex-row lg:items-center lg:justify-between">
        <section className="flex flex-1 flex-col gap-7">
          <RotatingPitch />

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

        <section className="flex w-full flex-1 flex-col items-center justify-center">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/10 p-7 shadow-[0_30px_90px_rgba(7,16,35,0.65)] backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div className="flex w-full flex-col items-center text-center">
                <Image
                  src="/generic-music-logo.png"
                  alt="Generic Music Studio logo"
                  width={88}
                  height={88}
                  className="mb-6 mt-2 opacity-95"
                />
                <h2 className="text-2xl font-semibold">Giriş Yap</h2>
              </div>
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
