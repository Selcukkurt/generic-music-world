"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy URL: main flow lives at `/onboarding`. */
export default function OnboardingWelcomePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/onboarding");
  }, [router]);
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <p className="text-sm text-[var(--color-text-muted)]">Yönlendiriliyor…</p>
    </div>
  );
}
