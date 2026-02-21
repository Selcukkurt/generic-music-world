"use client";

import { useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  getGmDnaAcceptance,
  saveGmDnaAcceptance,
  GM_DNA_VERSION,
  formatAcceptedAt,
  type GmDnaAcceptance,
} from "@/lib/gm-dna/acceptance";
import Checkbox from "@/components/ui/Checkbox";

export default function GMDnaAcceptanceCard() {
  const { user, isLoading: userLoading } = useCurrentUser();
  const [acceptance, setAcceptance] = useState<GmDnaAcceptance | null | undefined>(undefined);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAcceptance = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await getGmDnaAcceptance(user.id);
      setAcceptance(data);
      setError(null);
    } catch {
      setError("Onay durumu yüklenemedi.");
      setAcceptance(null);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) loadAcceptance();
    else if (!userLoading && !user) setAcceptance(null);
  }, [user?.id, userLoading, user, loadAcceptance]);

  const handleSubmit = async () => {
    if (!user?.id || !checked || saving) return;
    setSaving(true);
    setError(null);
    try {
      const data = await saveGmDnaAcceptance(user.id);
      setAcceptance(data);
    } catch {
      setError("Onay kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  };

  const isAccepted = acceptance?.gm_dna_accepted_version != null;
  const acceptedAt = acceptance?.gm_dna_accepted_at;

  if (userLoading) {
    return (
      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-5 shadow-sm backdrop-blur-sm sm:p-6">
        <h2 className="mb-3 text-lg font-medium">GM DNA Onayı</h2>
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- animated GIF loader */}
          <img src="/brand-loader.gif" alt="" className="h-5 w-5" />
          <span className="text-[15px] text-[var(--color-text)]/70">Yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-5 shadow-sm backdrop-blur-sm sm:p-6">
      <h2 className="mb-3 text-lg font-medium">GM DNA Onayı</h2>
      <p className="mb-4 text-[15px] leading-[1.65] text-[var(--color-text)]/85">
        Generic Music DNA v{GM_DNA_VERSION} dokümanını okudum, anladım ve burada
        tanımlanan ilkelere uygun çalışmayı kabul ediyorum.
      </p>

      {isAccepted ? (
        <div className="space-y-1">
          <p className="text-[15px] font-medium text-[var(--color-success)]">
            Onaylandı ✅
          </p>
          {acceptedAt && (
            <p className="text-[15px] text-[var(--color-text)]/85">
              {formatAcceptedAt(acceptedAt)}
            </p>
          )}
        </div>
      ) : (
        <>
          <label className="mb-4 flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            <span className="text-[15px] text-[var(--color-text)]/85">
              Okudum ve anladım
            </span>
          </label>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!checked || saving}
            className="rounded-lg bg-[var(--brand-yellow)] px-4 py-2 text-sm font-medium text-[#121212] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Kaydediliyor..." : "Onayla"}
          </button>
        </>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
