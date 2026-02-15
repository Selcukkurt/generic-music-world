"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/LocaleProvider";
import { useToast } from "@/components/ui/ToastProvider";
import LanguageSwitch from "@/components/ui/LanguageSwitch";
import { useShellUI } from "@/context/ShellUIContext";

type GlobalHeaderProps = {
  showMenuButton?: boolean;
  menuLabel?: string;
  showModuleMenuButton?: boolean;
};

const SEARCH_TARGETS: { label: string; path: string; terms: string[] }[] = [
  { label: "Dashboard", path: "/dashboard", terms: ["dashboard"] },
  { label: "Profile", path: "/profile", terms: ["profile"] },
  { label: "Module 01", path: "/m01", terms: ["module 01", "module 1", "m01"] },
  { label: "Module 02", path: "/m02", terms: ["module 02", "module 2", "m02"] },
  { label: "Module 03", path: "/m03", terms: ["module 03", "module 3", "m03"] },
  { label: "Module 04", path: "/m04", terms: ["module 04", "module 4", "m04"] },
  { label: "Module 05", path: "/m05", terms: ["module 05", "module 5", "m05"] },
  { label: "Module 06", path: "/m06", terms: ["module 06", "module 6", "m06"] },
  { label: "Module 07", path: "/m07", terms: ["module 07", "module 7", "m07"] },
  { label: "Module 08", path: "/m08", terms: ["module 08", "module 8", "m08"] },
  { label: "Module 09", path: "/m09", terms: ["module 09", "module 9", "m09"] },
  { label: "Module 10", path: "/m10", terms: ["module 10", "m10"] },
];

function matchSearchTarget(target: (typeof SEARCH_TARGETS)[0], query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return (
    target.label.toLowerCase().includes(q) ||
    target.terms.some(
      (term) =>
        term.toLowerCase().includes(q) || term.toLowerCase().replace(/\s/g, "").includes(q.replace(/\s/g, ""))
    )
  );
}

const IconSearch = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const IconModuleMenu = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

export default function GlobalHeader({
  showMenuButton = false,
  menuLabel,
  showModuleMenuButton = false,
}: GlobalHeaderProps) {
  const router = useRouter();
  const { t } = useI18n();
  const toast = useToast();
  const { openSidebar, openModulePanel, searchOpen, openSearch, closeSearch, toggleSearch } =
    useShellUI();
  const [searchQuery, setSearchQuery] = useState("");
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const searchResults = searchQuery
    ? SEARCH_TARGETS.filter((t) => matchSearchTarget(t, searchQuery))
    : SEARCH_TARGETS;

  const navigateTo = (path: string) => {
    router.push(path);
    closeSearch();
    setSearchQuery("");
  };
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeSearch();
        setSearchQuery("");
        setIsProfileOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggleSearch();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeSearch, toggleSearch]);

  useEffect(() => {
    if (searchOpen) {
      setSearchQuery("");
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);


  useEffect(() => {
    if (!isProfileOpen) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (profileRef.current && target && !profileRef.current.contains(target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isProfileOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (searchWrapRef.current && target && !searchWrapRef.current.contains(target)) {
        closeSearch();
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [searchOpen, closeSearch]);

  const handleLogout = async () => {
    setIsProfileOpen(false);
    await supabaseBrowser.auth.signOut();
    toast.success(t("logout_toast"));
    router.replace("/login");
  };

  return (
    <header className="ui-glass sticky top-0 z-[var(--z-header)] shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-sm">
      <div className="relative">
      <div className="flex h-[var(--header-height)] w-full items-center gap-2 px-4 sm:gap-4 sm:px-6">
        {/* Left: Logo + optional menu button */}
        <div className="flex shrink-0 items-center gap-3">
          {showMenuButton ? (
            <button
              type="button"
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2 text-xs ui-text-secondary transition hover:bg-[var(--color-surface2)] lg:hidden"
              onClick={openSidebar}
              aria-label={menuLabel ?? t("header_menu")}
            >
              {menuLabel ?? t("header_menu")}
            </button>
          ) : null}
            <Link
            href="/dashboard"
            className="flex items-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-yellow)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
          >
            <Image
              src="/generic-music-logo-v2.png"
              alt={t("header_logo_alt")}
              width={48}
              height={48}
              className="h-8 w-auto sm:h-10 lg:h-12"
              priority
            />
          </Link>
        </div>

        {/* Spacer */}
        <div className="flex flex-1" />

        {/* Right: Module menu (mobile) + Search + Language + Notifications + Avatar */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {showModuleMenuButton ? (
            <button
              type="button"
              onClick={openModulePanel}
              className="flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] transition hover:border-[var(--color-text-muted)] hover:bg-[var(--color-surface2)] lg:hidden"
              aria-label={t("header_module_menu")}
            >
              <IconModuleMenu className="h-4 w-4 ui-text-secondary" />
            </button>
          ) : null}
          <div ref={searchWrapRef} className="relative">
            <div
              className={`flex items-center overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-sm transition-[width] duration-200 ease-out ${
                searchOpen
                  ? "min-w-[180px] flex-1 sm:min-w-0 sm:flex-none sm:w-[320px] md:w-[360px] lg:w-[400px]"
                  : "w-10 shrink-0"
              }`}
            >
              {!searchOpen ? (
                <button
                  type="button"
                  onClick={openSearch}
                  className="flex h-9 w-9 min-h-[36px] min-w-[36px] shrink-0 items-center justify-center rounded-lg transition hover:bg-[var(--color-surface2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-yellow)] focus-visible:ring-inset"
                  aria-label={t("header_search_placeholder")}
                  title={`${t("header_search_placeholder")} (⌘K)`}
                >
                  <IconSearch className="h-4 w-4 ui-text-secondary" />
                </button>
              ) : (
                <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
                  <IconSearch className="h-4 w-4 shrink-0 ui-text-muted" />
                  <input
                    ref={searchInputRef}
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("header_search_placeholder_short")}
                    className="min-w-0 flex-1 rounded bg-transparent py-2 text-sm outline-none placeholder:ui-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-yellow)] focus-visible:ring-inset"
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        closeSearch();
                        setSearchQuery("");
                        return;
                      }
                      if (e.key === "Enter" && searchResults.length > 0) {
                        e.preventDefault();
                        navigateTo(searchResults[0].path);
                      }
                    }}
                    aria-label={t("header_search_placeholder")}
                  />
                </div>
              )}
            </div>
            {searchOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-full min-w-[200px] max-w-[400px] overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/95 py-2 shadow-lg backdrop-blur-md sm:min-w-[320px]">
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ui-text-muted">
                  {t("search_section_results")}
                </p>
                {searchResults.length > 0 ? (
                  <ul className="space-y-0.5">
                    {searchResults.map((item) => (
                      <li key={item.path}>
                        <button
                          type="button"
                          onClick={() => navigateTo(item.path)}
                          className="flex w-full items-center px-3 py-2 text-left text-sm transition ui-text-secondary hover:bg-[var(--color-surface2)] hover:text-[var(--color-text)] focus:outline-none focus-visible:bg-[var(--color-surface2)]"
                        >
                          {item.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="ui-text-muted px-3 py-2 text-sm">{t("search_empty_results")}</p>
                )}
              </div>
            )}
          </div>
          <LanguageSwitch />
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] transition hover:border-[var(--color-text-muted)]"
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
          <div className="relative flex items-center gap-3" ref={profileRef}>
            <div className="hidden text-right md:block">
              <p className="text-sm font-semibold leading-tight">
                {t("header_user_name")}
              </p>
              <p className="text-xs ui-text-muted leading-tight">
                {t("header_user_role")}
              </p>
            </div>
            <button
              type="button"
              className="flex h-10 w-10 min-h-[40px] min-w-[40px] shrink-0 overflow-hidden rounded-full border-2 border-[var(--color-border)] transition hover:border-[var(--color-text-muted)] hover:bg-[var(--color-surface2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-yellow)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
              aria-label={t("header_profile")}
              aria-haspopup="menu"
              aria-expanded={isProfileOpen}
              onClick={() => setIsProfileOpen((prev) => !prev)}
            >
              <Image
                src="/avatar-placeholder.svg"
                alt=""
                width={40}
                height={40}
                className="h-full w-full object-cover"
              />
            </button>
            {isProfileOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-[0_18px_50px_rgba(7,16,35,0.5)]"
              >
                <Link
                  href="/profile"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex w-full items-center rounded-lg px-3 py-2.5 text-sm ui-text-secondary transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                >
                  {t("profile_menu_profile")}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-1 flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm ui-text-secondary transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                >
                  {t("profile_menu_logout")}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      </div>
    </header>
  );
}
