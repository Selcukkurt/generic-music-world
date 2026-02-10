"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase/client";
import GlobalSidebar from "@/components/shell/GlobalSidebar";
import ModuleMenu from "@/components/shell/ModuleMenu";
import ContentArea from "@/components/shell/ContentArea";
import { getModuleForPath } from "@/config/modules";
import { useI18n } from "@/i18n/LocaleProvider";
import LanguageSwitch from "@/components/ui/LanguageSwitch";
import { useToast } from "@/components/ui/ToastProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const activeModule = getModuleForPath(pathname);
  const { t } = useI18n();
  const toast = useToast();

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

  useEffect(() => {
    if (!isProfileOpen) {
      return undefined;
    }

    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (profileRef.current && target && !profileRef.current.contains(target)) {
        setIsProfileOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isProfileOpen]);

  const handleLogout = async () => {
    setIsProfileOpen(false);
    await supabaseBrowser.auth.signOut();
    toast.success(t("logout_toast"));
    router.replace("/login");
  };

  if (isChecking) {
    return (
      <div className="ui-page flex min-h-[100dvh] items-center justify-center">
        <img
          src="/brand-loader.gif"
          alt={t("common_loading")}
          className="h-16 w-16"
        />
      </div>
    );
  }

  return (
    <div className="ui-page flex h-[100dvh] flex-col overflow-hidden">
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            {activeModule ? (
              <button
                type="button"
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2 text-xs ui-text-secondary lg:hidden"
                onClick={() => setIsSidebarOpen(true)}
              >
                {t("header_menu")}
              </button>
            ) : null}
            <Link href="/dashboard" className="flex items-center gap-3">
              <Image
                src="/generic-music-logo-v2.png"
                alt={t("header_logo_alt")}
                width={32}
                height={32}
                className="h-8 w-auto"
              />
            </Link>
          </div>
          <div className="flex flex-1 justify-center">
            <div className="w-full max-w-xl">
              <input
                type="search"
                placeholder={t("header_search_placeholder")}
                className="ui-input rounded-full bg-[var(--color-bg)] px-5 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitch />
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]"
              aria-label={t("header_notifications")}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <path
                  d="M12 3a5 5 0 0 0-5 5v2.7c0 .7-.2 1.4-.6 2l-1.4 2.2h14l-1.4-2.2c-.4-.6-.6-1.3-.6-2V8a5 5 0 0 0-5-5Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9.8 19.4a2.3 2.3 0 0 0 4.4 0"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]"
                aria-label={t("header_profile")}
                aria-haspopup="menu"
                aria-expanded={isProfileOpen}
                onClick={() => setIsProfileOpen((prev) => !prev)}
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <path
                    d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M5 20a7 7 0 0 1 14 0"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {isProfileOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-11 w-44 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-[0_18px_50px_rgba(7,16,35,0.5)]"
                >
                  <button
                    type="button"
                    disabled
                    className="flex w-full cursor-not-allowed items-center justify-between rounded-lg px-3 py-2 text-sm text-[var(--color-text-muted)] opacity-70"
                  >
                    {t("profile_menu_profile")}
                    <span className="text-[10px] uppercase tracking-[0.2em]">
                      {t("profile_menu_soon")}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm ui-text-secondary transition hover:bg-slate-900 hover:text-white"
                  >
                    {t("profile_menu_logout")}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1">
        {activeModule ? (
          <GlobalSidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />
        ) : null}
        <div
          className={`flex min-h-0 flex-1 flex-col px-6 py-6 ${
            activeModule ? "gap-6" : ""
          }`}
        >
          {activeModule ? <ModuleMenu /> : null}
          <ContentArea className="ui-fade-slide">{children}</ContentArea>
        </div>
      </div>
    </div>
  );
}
