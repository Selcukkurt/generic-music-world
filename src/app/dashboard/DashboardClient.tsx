"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase/client";

import LogoutButton from "./LogoutButton";

const modules = Array.from({ length: 6 }, (_, index) => index + 1);

export default function DashboardClient() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabaseBrowser.auth.getUser();

      if (!data.user) {
        router.replace("/login");
        return;
      }

      setUserEmail(data.user.email ?? null);
    };

    checkSession();
  }, [router]);

  return (
    <main className="ui-page px-6 py-12">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="ui-text-secondary mt-2 text-sm">Modules</p>
          </div>
          <LogoutButton />
        </div>

        {userEmail ? (
          <p className="ui-text-secondary mt-4 text-sm">
            Signed in as <span className="text-slate-200">{userEmail}</span>
          </p>
        ) : null}

        <section className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
          {modules.map((module) => (
            <div
              key={module}
              className="ui-card-plain flex h-28 items-center justify-center border-dashed text-sm ui-text-muted"
            >
              Module Card
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
