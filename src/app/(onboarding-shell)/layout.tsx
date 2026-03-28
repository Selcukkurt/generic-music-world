"use client";

import Image from "next/image";

import GlobalHeader from "@/components/shell/GlobalHeader";
import ContentArea from "@/components/shell/ContentArea";
import { ShellUIProvider } from "@/context/ShellUIContext";
import { useAccessGate } from "@/hooks/useAccessGate";
import { useI18n } from "@/i18n/LocaleProvider";

/** Onboarding routes: same top header as the main app, no sidebar or module chrome. */
export default function OnboardingShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isChecking } = useAccessGate();
  const { t } = useI18n();

  if (isChecking) {
    return (
      <div className="ui-page flex min-h-[100dvh] items-center justify-center">
        <Image
          src="/brand-loader.gif"
          alt={t("common_loading")}
          width={64}
          height={64}
          priority
          unoptimized
          className="h-16 w-16"
        />
      </div>
    );
  }

  return (
    <ShellUIProvider>
      <div className="ui-page flex min-h-screen min-h-[100dvh] flex-col overflow-x-visible">
        <GlobalHeader
          showMenuButton={false}
          showModuleMenuButton={false}
          showAppSearch={false}
          showNotifications={false}
        />
        <ContentArea className="min-h-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </ContentArea>
      </div>
    </ShellUIProvider>
  );
}
