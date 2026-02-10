"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase/client";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Events", href: "/events" },
  { label: "Ticket Platforms", href: "/contracts" },
  { label: "Analytics", href: "/analytics" },
  { label: "Settings", href: "/settings" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      const { data } = await supabaseBrowser.auth.getUser();

      if (!data.user) {
        router.replace("/login");
        return;
      }

      const hasAccess = true;
      if (!hasAccess) {
        router.replace("/forbidden");
        return;
      }

      setIsChecking(false);
    };

    checkAccess();
  }, [router]);

  if (isChecking) {
    return (
      <div className="ui-page flex min-h-[100dvh] items-center justify-center">
        <img src="/brand-loader.gif" alt="Loading" className="h-16 w-16" />
      </div>
    );
  }

  return (
    <div className="ui-page min-h-[100dvh]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Image
              src="/generic-music-logo-v2.png"
              alt="Generic Music World"
              width={32}
              height={32}
              className="h-8 w-auto"
            />
            <span className="text-sm font-semibold">Generic Music World</span>
          </div>
          <button
            type="button"
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs ui-text-secondary"
          >
            User Menu
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-6 lg:flex-row">
        <aside className="w-full lg:w-64">
          <nav className="ui-card-plain space-y-1 p-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-md px-3 py-2 text-sm transition ${
                    isActive
                      ? "bg-slate-800 text-white"
                      : "ui-text-secondary hover:bg-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
