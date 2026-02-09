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

      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
        <Image
          src="/generic-music-logo.png"
          alt="Generic Music Studio logo"
          width={120}
          height={40}
          className="mb-10 opacity-90"
        />
        <div className="w-full">
          <h2 className="text-2xl font-light tracking-wide">Giriş Yap</h2>
          <LoginForm />
        </div>
        <p className="mt-10 text-xs text-slate-400">
          © {currentYear} Generic Music Studio. All rights reserved.
        </p>
      </div>
    </main>
  );
}
