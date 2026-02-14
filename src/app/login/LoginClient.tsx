"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { supabaseBrowser } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/LocaleProvider";
import LanguageSwitch from "@/components/ui/LanguageSwitch";

import LoginForm from "./LoginForm";
import RotatingPitch from "./RotatingPitch";

export default function LoginClient() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const { t } = useI18n();
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
    <main className="ui-page relative">
      <div className="absolute right-6 top-6">
        <LanguageSwitch />
      </div>
      <div className="mx-auto grid min-h-[100dvh] w-full max-w-5xl grid-cols-1 gap-12 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="flex flex-col justify-center gap-6 text-left lg:pr-8">
          <Image
            src="/generic-music-logo-v2.png"
            alt={t("login_logo_alt")}
            width={520}
            height={160}
            className="mb-4 w-[170px] opacity-95 sm:w-[200px] lg:w-[220px]"
            style={{ height: "auto" }}
            priority
          />
          <div className="max-w-xl">
            <RotatingPitch />
          </div>

          <div className="flex flex-wrap gap-3">
            <span className="ui-pill px-4 py-2 text-sm">
              {t("login_pill_modules")}
            </span>
            <span className="ui-pill px-4 py-2 text-sm">
              {t("login_pill_departments")}
            </span>
            <span className="ui-pill px-4 py-2 text-sm">
              {t("login_pill_access")}
            </span>
          </div>

          <p className="ui-text-muted text-xs">
            © {currentYear} {t("login_brand_name")}. {t("login_footer_rights")}
          </p>
        </section>

        <section className="flex w-full flex-col items-center justify-center lg:items-end">
          <div className="ui-card-plain w-full max-w-[460px] px-6 pb-6 pt-5">
            <h2 className="text-2xl font-semibold text-left">
              {t("login_heading")}
            </h2>
            <p className="ui-text-secondary mt-2 text-left text-sm">
              {t("login_subheading")}
            </p>
            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}
