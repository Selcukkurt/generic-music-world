"use client";

import { useState, useCallback } from "react";
import PageHeader from "@/components/shell/PageHeader";
import { SettingsProvider, useSettings } from "@/lib/settings/SettingsContext";
import { validateSettings } from "@/lib/settings/validation";
import { useToast } from "@/components/ui/ToastProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import GenelTab from "./GenelTab";
import ParametrelerTab from "./ParametrelerTab";
import ModullerTab from "./ModullerTab";
import MailTab from "./MailTab";
import GuvenlikTab from "./GuvenlikTab";

const TABS = [
  { id: "genel", label: "Genel", Component: GenelTab },
  { id: "parametreler", label: "Parametreler", Component: ParametrelerTab },
  { id: "moduller", label: "Modüller", Component: ModullerTab },
  { id: "mail", label: "Mail", Component: MailTab },
  { id: "guvenlik", label: "Güvenlik", Component: GuvenlikTab },
] as const;

function SettingsContent() {
  const { settings, isLoading, isDirty, save, reset, resetToDefaults } =
    useSettings();
  const toast = useToast();
  const { user } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("genel");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleSave = useCallback(() => {
    const { valid, errors } = validateSettings(settings);
    setValidationErrors(errors);
    if (!valid) {
      toast.error("Doğrulama hatası", Object.values(errors)[0] ?? "Lütfen alanları kontrol edin.");
      return;
    }
    save(user?.id ?? "system", user?.role ?? "system_owner");
    toast.success("Ayarlar kaydedildi.");
  }, [settings, save, user, toast]);

  const handleReset = useCallback(() => {
    reset();
    setValidationErrors({});
    toast.info("Değişiklikler geri alındı.");
  }, [reset, toast]);

  const handleResetToDefaults = useCallback(() => {
    resetToDefaults();
    setValidationErrors({});
    toast.success("Varsayılan ayarlara dönüldü.");
  }, [resetToDefaults, toast]);

  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.Component ?? GenelTab;

  if (isLoading) {
    return (
      <div className="flex w-full flex-col gap-6">
        <PageHeader
          title="Sistem Ayarları"
          subtitle="Genel sistem konfigürasyonu."
        />
        <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 backdrop-blur-sm">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 rounded bg-[var(--color-surface2)]" />
            <div className="h-4 w-full rounded bg-[var(--color-surface2)]" />
            <div className="h-4 w-3/4 rounded bg-[var(--color-surface2)]" />
            <div className="h-4 w-1/2 rounded bg-[var(--color-surface2)]" />
            <div className="mt-6 flex gap-3">
              <div className="h-10 w-24 rounded bg-[var(--color-surface2)]" />
              <div className="h-10 w-32 rounded bg-[var(--color-surface2)]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Sistem Ayarları"
        subtitle="Genel sistem konfigürasyonu."
      />
      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm">
        <div className="flex flex-col border-b border-[var(--color-border)] sm:flex-row sm:items-center sm:justify-between">
          <nav
            className="flex gap-1 overflow-x-auto px-4 pt-4 sm:px-6"
            aria-label="Ayarlar sekmeleri"
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap rounded-t-lg px-4 py-3 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "border-b-2 border-[var(--brand-yellow)] text-[var(--color-text)]"
                    : "ui-text-muted hover:bg-[var(--color-surface2)]/50 hover:text-[var(--color-text)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-4 sm:p-6">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/30 p-5">
            {Object.keys(validationErrors).length > 0 && (
              <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
                {Object.entries(validationErrors).map(([key, msg]) => (
                  <p key={key}>{msg}</p>
                ))}
              </div>
            )}
            <ActiveComponent />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty}
              className="ui-button-primary rounded-lg px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              Kaydet
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={!isDirty}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2.5 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Geri Al
            </button>
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2.5 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
            >
              Varsayılanlara Dön
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SystemSettingsPage() {
  return (
    <SettingsProvider>
      <SettingsContent />
    </SettingsProvider>
  );
}
