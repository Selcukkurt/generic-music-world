"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  NDA_COMPANY,
  NDA_DOCUMENT_TITLE,
  NDA_PDF_SIGNFOOT,
  NDA_SECTIONS,
  NDA_SUMMARY_BULLETS,
} from "@/content/compliance/nda-gizlilik-content";

/** Pixels: subpixel / rounding slack for “scrolled to bottom”. */
const SCROLL_EPSILON = 32;
/** Treat as “no overflow” when within this many px (avoids stuck state on subpixel layouts). */
const FITS_SLACK_PX = 4;
const MAX_READING_WIDTH = "760px";
export const NETWORK_ERR = "__network__";

export type NdaAcceptanceModalProps = {
  readOnly?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  onClose: () => void;
  /** Persist acceptance; throw on failure (use NETWORK_ERR for transport errors). */
  onAccept: () => Promise<void>;
  /** After success message is shown; advance wizard / close. */
  onAfterAcceptSuccess: () => void;
  submitting: boolean;
  alreadyAccepted: boolean;
  acceptedAt?: string | null;
  allowRevoke?: boolean;
  onRevoke?: () => Promise<void>;
  revokeSubmitting?: boolean;
};

function formatAcceptedAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function NdaAcceptanceModal({
  readOnly = false,
  showBack = false,
  onBack,
  onClose,
  onAccept,
  onAfterAcceptSuccess,
  submitting,
  alreadyAccepted,
  acceptedAt = null,
  allowRevoke = false,
  onRevoke,
  revokeSubmitting = false,
}: NdaAcceptanceModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollInnerRef = useRef<HTMLDivElement>(null);
  const scrollEndSentinelRef = useRef<HTMLDivElement>(null);
  const scrollDebugLastKey = useRef<string>("");
  const [mounted, setMounted] = useState(false);
  const [scrollPct, setScrollPct] = useState(0);
  const [atBottom, setAtBottom] = useState(alreadyAccepted || readOnly);
  const [ack, setAck] = useState(false);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  useEffect(() => {
    if (alreadyAccepted || readOnly) {
      setAtBottom(true);
      setAck(true);
    } else {
      setAck(false);
      setAtBottom(false);
    }
    setFlowError(null);
    setSaveSuccess(false);
    setRevokeError(null);
  }, [alreadyAccepted, readOnly]);

  const computeAtBottom = useCallback((el: HTMLDivElement) => {
    const { scrollHeight, clientHeight } = el;
    const scrollTop = Math.floor(el.scrollTop);
    const sum = scrollTop + clientHeight;
    const fitsWithoutScrolling = scrollHeight <= clientHeight + FITS_SLACK_PX;
    return fitsWithoutScrolling || sum >= scrollHeight - SCROLL_EPSILON;
  }, []);

  const updateScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const fitsWithoutScrolling = scrollHeight <= clientHeight + FITS_SLACK_PX;
    const maxScroll = Math.max(1, scrollHeight - clientHeight);
    if (fitsWithoutScrolling) {
      setScrollPct(100);
    } else {
      setScrollPct(Math.min(100, Math.round((scrollTop / maxScroll) * 100)));
    }
    const atEnd = computeAtBottom(el);
    setAtBottom(atEnd);
    if (
      process.env.NODE_ENV === "development" &&
      !alreadyAccepted &&
      !readOnly
    ) {
      const key = `${scrollTop}|${clientHeight}|${scrollHeight}|${atEnd}`;
      if (key !== scrollDebugLastKey.current) {
        scrollDebugLastKey.current = key;
        console.log("[NdaAcceptanceModal scroll]", {
          scrollTop,
          clientHeight,
          scrollHeight,
          sum: scrollTop + clientHeight,
          atEnd,
        });
      }
    }
  }, [computeAtBottom, alreadyAccepted, readOnly]);

  useEffect(() => {
    if (alreadyAccepted || readOnly) return;
    updateScroll();
  }, [alreadyAccepted, readOnly, updateScroll]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScroll();
    el.addEventListener("scroll", updateScroll, { passive: true });
    const onScrollEnd = () => updateScroll();
    el.addEventListener("scrollend" as keyof HTMLElementEventMap, onScrollEnd as EventListener, {
      passive: true,
    } as AddEventListenerOptions);
    const ro = new ResizeObserver(updateScroll);
    ro.observe(el);
    const inner = scrollInnerRef.current;
    if (inner) ro.observe(inner);
    return () => {
      el.removeEventListener("scroll", updateScroll);
      el.removeEventListener("scrollend" as keyof HTMLElementEventMap, onScrollEnd as EventListener);
      ro.disconnect();
    };
  }, [updateScroll]);

  /** Bottom detection when scroll metrics are unreliable (some mobile / flex layouts). */
  useEffect(() => {
    if (!mounted || alreadyAccepted || readOnly) return;
    const root = scrollRef.current;
    const sentinel = scrollEndSentinelRef.current;
    if (!root || !sentinel) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (hit) {
          setAtBottom(true);
          updateScroll();
          return;
        }
        const el = scrollRef.current;
        if (el) setAtBottom(computeAtBottom(el));
      },
      {
        root,
        threshold: 0,
        // Treat “near bottom” as bottom so iOS / subpixel / momentum scroll still unlocks.
        rootMargin: "0px 0px 80px 0px",
      }
    );
    obs.observe(sentinel);
    updateScroll();
    return () => obs.disconnect();
  }, [mounted, alreadyAccepted, readOnly, computeAtBottom, updateScroll]);

  const showAcceptForm = !readOnly && !alreadyAccepted;
  const hasReachedEnd = alreadyAccepted || readOnly || atBottom;
  const ackCheckboxDisabled =
    showAcceptForm && (!hasReachedEnd || submitting || saveSuccess);
  const canSave =
    showAcceptForm && ack && hasReachedEnd && !submitting && !saveSuccess;
  const footerHintBefore = showAcceptForm && !atBottom;

  useLayoutEffect(() => {
    if (alreadyAccepted || readOnly) return;
    updateScroll();
    const t = window.requestAnimationFrame(() => {
      updateScroll();
      window.requestAnimationFrame(updateScroll);
    });
    return () => window.cancelAnimationFrame(t);
  }, [alreadyAccepted, readOnly, updateScroll]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !showAcceptForm) return;
    const el = scrollRef.current;
    console.info("[NdaAcceptanceModal gates]", {
      alreadyAccepted,
      readOnly,
      atBottom,
      hasReachedEnd,
      checked: ack,
      checkboxDisabled: ackCheckboxDisabled,
      agreementSubmitting: submitting,
      saveSuccess,
      scrollMetrics: el
        ? {
            scrollTop: el.scrollTop,
            clientHeight: el.clientHeight,
            scrollHeight: el.scrollHeight,
            distanceFromBottom: el.scrollHeight - el.scrollTop - el.clientHeight,
          }
        : null,
    });
  }, [
    showAcceptForm,
    alreadyAccepted,
    readOnly,
    atBottom,
    hasReachedEnd,
    ack,
    ackCheckboxDisabled,
    submitting,
    saveSuccess,
  ]);
  const showRevokeCta =
    !readOnly && alreadyAccepted && allowRevoke && onRevoke && !saveSuccess;

  const mapAcceptError = useCallback((e: unknown) => {
    if (e instanceof Error && e.message === NETWORK_ERR) {
      return "Onay kaydedilemedi. Lütfen tekrar deneyin.";
    }
    if (e instanceof Error && e.message && e.message.length < 180) {
      return e.message;
    }
    return "Onay kaydedilemedi. Lütfen tekrar deneyin.";
  }, []);

  const handleSave = async () => {
    setFlowError(null);
    try {
      await onAccept();
      setSaveSuccess(true);
      window.setTimeout(() => {
        setSaveSuccess(false);
        onAfterAcceptSuccess();
      }, 1400);
    } catch (e) {
      setFlowError(mapAcceptError(e));
    }
  };

  const handleRevoke = async () => {
    if (!onRevoke) return;
    setRevokeError(null);
    try {
      await onRevoke();
      setRevokeConfirmOpen(false);
    } catch (e) {
      const msg =
        e instanceof Error && e.message && e.message !== NETWORK_ERR
          ? e.message
          : "Onay geri alınamadı. Lütfen tekrar deneyin.";
      setRevokeError(msg);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (revokeConfirmOpen) setRevokeConfirmOpen(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, revokeConfirmOpen]);

  if (!mounted || typeof document === "undefined") return null;

  const acceptedLabel = formatAcceptedAt(acceptedAt);

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[200] flex items-stretch justify-center sm:items-center sm:px-4 sm:py-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nda-modal-title"
        aria-describedby="nda-modal-desc"
      >
        <button
          type="button"
          className="absolute inset-0 z-0 bg-black/50 backdrop-blur-[1px]"
          aria-label="Kapat"
          onClick={onClose}
        />

        <div
          className="pointer-events-auto relative z-[1] flex h-[100dvh] min-h-0 max-h-[100dvh] w-full min-w-0 flex-col overflow-hidden bg-[var(--color-surface)] shadow-[var(--shadow-soft)] sm:h-[min(92dvh,880px)] sm:max-h-[min(92dvh,880px)] sm:rounded-xl sm:border sm:border-[var(--color-border)]/80"
          style={{ maxWidth: `min(100%, ${MAX_READING_WIDTH})` }}
        >
          <div className="h-0.5 w-full shrink-0 overflow-hidden bg-[var(--color-border)]/50">
            <div
              className="h-full bg-[var(--brand-yellow)]/90 transition-[width] duration-150 ease-out"
              style={{ width: `${scrollPct}%` }}
            />
          </div>

          <header className="shrink-0 border-b border-[var(--color-border)]/60 px-4 py-4 sm:px-6">
            <div className="flex items-start gap-3">
              <div className="flex shrink-0 items-center gap-1">
                {showBack && onBack ? (
                  <button
                    type="button"
                    onClick={onBack}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-hover)]"
                  >
                    Geri
                  </button>
                ) : null}
              </div>
              <div className="min-w-0 flex-1 text-center">
                <h2
                  id="nda-modal-title"
                  className="text-base font-semibold tracking-tight text-[var(--color-text)] sm:text-lg"
                >
                  {NDA_DOCUMENT_TITLE}
                </h2>
                <p
                  id="nda-modal-desc"
                  className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)] sm:text-sm"
                >
                  {alreadyAccepted && !readOnly
                    ? "Bu belge sistemde kayıtlıdır. Metni inceleyebilir veya onayı geri alabilirsiniz."
                    : readOnly
                      ? "Salt okunur inceleme."
                      : "Metni sonuna kadar inceleyin; ardından kutuyu işaretleyip onayı kaydedin."}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-lg p-2 text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                aria-label="Kapat"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </header>

          <div
            ref={scrollRef}
            onScroll={updateScroll}
            className="min-h-0 min-w-0 flex-1 basis-0 touch-pan-y overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6"
          >
            <div
              ref={scrollInnerRef}
              className="mx-auto space-y-8"
              style={{ maxWidth: MAX_READING_WIDTH }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-[var(--color-bg)]/50 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                    Şirket bilgileri
                  </p>
                  <dl className="mt-2 space-y-1.5 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                    <div>
                      <dt className="text-[var(--color-text-muted)]">Şirket adı</dt>
                      <dd className="text-[var(--color-text)]">{NDA_COMPANY.legalName}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--color-text-muted)]">Adres</dt>
                      <dd>{NDA_COMPANY.address}</dd>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        <span className="text-[var(--color-text-muted)]">Vergi no: </span>
                        {NDA_COMPANY.taxNumber}
                      </span>
                      <span>
                        <span className="text-[var(--color-text-muted)]">Vergi dairesi: </span>
                        {NDA_COMPANY.taxOffice}
                      </span>
                    </div>
                  </dl>
                </div>
                <div className="rounded-lg bg-[var(--color-bg)]/50 px-4 py-3">
                  <p className="text-xs font-medium text-[var(--color-text)]">Bu sözleşme:</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                    {NDA_SUMMARY_BULLETS.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="border-t border-[var(--color-border)]/40 pt-2">
                <div className="space-y-10 text-sm leading-[1.7] text-[var(--color-text-secondary)]">
                  {NDA_SECTIONS.map((sec) => (
                    <section key={sec.id}>
                      <h3 className="font-semibold text-[var(--color-text)]">{sec.title}</h3>
                      <div className="mt-3 space-y-3">
                        {sec.paragraphs.map((p, i) => (
                          <p key={i}>{p}</p>
                        ))}
                      </div>
                    </section>
                  ))}
                  <p className="text-sm leading-[1.7] text-[var(--color-text-secondary)]">{NDA_PDF_SIGNFOOT}</p>
                </div>
              </div>
              <div
                ref={scrollEndSentinelRef}
                className="min-h-[4px] w-full shrink-0"
                aria-hidden
              />
            </div>
          </div>

          <footer className="relative z-20 shrink-0 border-t border-[var(--color-border)]/60 bg-[var(--color-surface)] px-4 py-4 sm:px-6">
            <div
              className="relative z-20 mx-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
              style={{ maxWidth: MAX_READING_WIDTH }}
            >
              <div className="min-w-0 flex-1 space-y-2 text-left">
                {saveSuccess ? (
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    Gizlilik sözleşmesi onaylandı.
                  </p>
                ) : null}
                {flowError ? (
                  <p className="text-sm text-amber-700 dark:text-amber-400" role="alert">
                    {flowError}
                  </p>
                ) : null}

                {readOnly && !alreadyAccepted ? (
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Bu adım salt okunur. Kayıtlı onay değişmez.
                  </p>
                ) : null}

                {alreadyAccepted ? (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[var(--color-text)]">
                      <span aria-hidden>✅</span> Onaylandı
                    </p>
                    {acceptedLabel ? (
                      <p className="text-xs text-[var(--color-text-muted)]">Onay tarihi: {acceptedLabel}</p>
                    ) : null}
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {readOnly
                        ? "Kayıtlı onay salt okunur olarak gösterilir."
                        : "Bu onay sistemde kayıtlıdır."}
                    </p>
                  </div>
                ) : null}

                {showAcceptForm ? (
                  <p
                    className={`text-xs leading-snug sm:text-sm ${footerHintBefore ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-muted)]"}`}
                  >
                    {footerHintBefore
                      ? "Devam etmek için metnin sonuna kadar inin"
                      : "Okudum onayı verebilirsiniz"}
                  </p>
                ) : null}
              </div>

              {showAcceptForm ? (
                <div className="relative z-30 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  {/*
                    Native checkbox (no opacity-0 overlay). If “devam etmek için…” shows but this stays disabled,
                    scroll metrics in console.info [NdaAcceptanceModal gates] → distanceFromBottom should hit ~0 after scroll.
                  */}
                  <label
                    htmlFor="nda-modal-ack"
                    className={`pointer-events-auto flex cursor-pointer select-none items-start gap-2.5 text-left text-sm text-[var(--color-text)] sm:items-center ${ackCheckboxDisabled ? "cursor-not-allowed" : ""}`}
                  >
                    <input
                      type="checkbox"
                      id="nda-modal-ack"
                      checked={ack}
                      disabled={ackCheckboxDisabled}
                      onChange={(e) => setAck(e.target.checked)}
                      aria-label="Metni okudum ve kabul ediyorum"
                      className="pointer-events-auto mt-0.5 h-5 w-5 min-h-5 min-w-5 shrink-0 cursor-pointer accent-[var(--brand-yellow)] disabled:cursor-not-allowed disabled:opacity-50 sm:mt-0 sm:h-4 sm:w-4 sm:min-h-4 sm:min-w-4"
                    />
                    <span className={ackCheckboxDisabled ? "text-[var(--color-text-muted)]" : ""}>
                      Metni okudum ve kabul ediyorum
                    </span>
                  </label>
                  <button
                    type="button"
                    disabled={!canSave}
                    onClick={() => void handleSave()}
                    className="rounded-xl bg-[var(--brand-yellow)] px-5 py-2.5 text-sm font-semibold text-[#121212] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45 sm:min-w-[7.5rem]"
                  >
                    {submitting ? "…" : "Onayı Kaydet"}
                  </button>
                </div>
              ) : null}

              {showRevokeCta ? (
                <div className="flex flex-col items-stretch gap-2 sm:items-end">
                  <button
                    type="button"
                    onClick={() => {
                      setRevokeConfirmOpen(true);
                      setRevokeError(null);
                    }}
                    disabled={revokeSubmitting}
                    className="rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
                  >
                    Onayı Geri Al
                  </button>
                </div>
              ) : null}
            </div>
          </footer>
        </div>
      </div>

      {revokeConfirmOpen ? (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            aria-label="Vazgeç"
            onClick={() => setRevokeConfirmOpen(false)}
          />
          <div
            className="relative z-[1] w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-lg sm:p-6"
            role="alertdialog"
            aria-labelledby="nda-revoke-title"
            aria-describedby="nda-revoke-desc"
          >
            <h3 id="nda-revoke-title" className="text-base font-semibold text-[var(--color-text)]">
              Onayı geri al
            </h3>
            <p id="nda-revoke-desc" className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              Gizlilik sözleşmesi onayını geri almak istediğinize emin misiniz? Bu işlem ilgili onboarding
              adımını tekrar açık duruma getirir.
            </p>
            {revokeError ? (
              <p className="mt-3 text-sm text-amber-700 dark:text-amber-400" role="alert">
                {revokeError}
              </p>
            ) : null}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                onClick={() => setRevokeConfirmOpen(false)}
                className="rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-surface-hover)]"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={revokeSubmitting}
                onClick={() => void handleRevoke()}
                className="rounded-xl border border-amber-500/50 bg-amber-500/15 px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] transition hover:bg-amber-500/25 disabled:opacity-50"
              >
                {revokeSubmitting ? "…" : "Onayı Geri Al"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>,
    document.body
  );
}
