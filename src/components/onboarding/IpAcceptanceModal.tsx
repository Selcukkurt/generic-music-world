"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  IP_DOCUMENT_TITLE,
  IP_SECTIONS,
  IP_SUMMARY_BULLETS,
} from "@/content/compliance/ip-fikri-mulkiyet-content";
import { NETWORK_ERR } from "@/components/onboarding/NdaAcceptanceModal";

const SCROLL_EPSILON = 32;
const FITS_SLACK_PX = 4;
const MAX_READING_WIDTH = "760px";

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

export type IpAcceptanceModalProps = {
  readOnly?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  onClose: () => void;
  onAccept: () => Promise<void>;
  onAfterAcceptSuccess: () => void;
  submitting: boolean;
  alreadyAccepted: boolean;
  acceptedAt?: string | null;
};

export default function IpAcceptanceModal({
  readOnly = false,
  showBack = false,
  onBack,
  onClose,
  onAccept,
  onAfterAcceptSuccess,
  submitting,
  alreadyAccepted,
  acceptedAt = null,
}: IpAcceptanceModalProps) {
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
  }, [alreadyAccepted, readOnly]);

  const computeAtBottom = useCallback((el: HTMLDivElement) => {
    const { scrollHeight, clientHeight } = el;
    const scrollTop = Math.floor(el.scrollTop);
    const fitsWithoutScrolling = scrollHeight <= clientHeight + FITS_SLACK_PX;
    return (
      fitsWithoutScrolling ||
      scrollTop + clientHeight >= scrollHeight - SCROLL_EPSILON
    );
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
        console.log("[IpAcceptanceModal scroll]", {
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
    console.log("[IpAcceptanceModal gates]", {
      alreadyAccepted,
      readOnly,
      hasReachedEnd,
      checked: ack,
      ackCheckboxDisabled,
      agreementSubmitting: submitting,
      saveSuccess,
    });
  }, [
    showAcceptForm,
    alreadyAccepted,
    readOnly,
    hasReachedEnd,
    ack,
    ackCheckboxDisabled,
    submitting,
    saveSuccess,
  ]);

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted || typeof document === "undefined") return null;

  const acceptedLabel = formatAcceptedAt(acceptedAt);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-stretch justify-center sm:items-center sm:px-4 sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ip-modal-title"
      aria-describedby="ip-modal-desc"
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
                id="ip-modal-title"
                className="text-base font-semibold tracking-tight text-[var(--color-text)] sm:text-lg"
              >
                {IP_DOCUMENT_TITLE}
              </h2>
              <p
                id="ip-modal-desc"
                className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)] sm:text-sm"
              >
                {alreadyAccepted && !readOnly
                  ? "Bu sözleşme sistemde kayıtlıdır."
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
            <div className="rounded-lg bg-[var(--color-bg)]/50 px-4 py-3">
              <p className="text-xs font-medium text-[var(--color-text)]">Bu sözleşme:</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                {IP_SUMMARY_BULLETS.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>

            <div className="border-t border-[var(--color-border)]/40 pt-2">
              <div className="space-y-10 text-sm leading-[1.7] text-[var(--color-text-secondary)]">
                {IP_SECTIONS.map((sec) => (
                  <section key={sec.id}>
                    <h3 className="font-semibold text-[var(--color-text)]">{sec.title}</h3>
                    <div className="mt-3 space-y-3">
                      {sec.paragraphs.map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                  </section>
                ))}
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
                  Fikri mülkiyet sözleşmesi onaylandı.
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
                <label
                  htmlFor="onboarding-ip-ack-modal"
                  className={`pointer-events-auto flex cursor-pointer select-none items-start gap-2.5 text-left text-sm text-[var(--color-text)] sm:items-center ${ackCheckboxDisabled ? "cursor-not-allowed" : ""}`}
                >
                  <input
                    type="checkbox"
                    id="onboarding-ip-ack-modal"
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
                  data-onboarding-ip-save
                  disabled={!canSave}
                  onClick={() => void handleSave()}
                  className="rounded-xl bg-[var(--brand-yellow)] px-5 py-2.5 text-sm font-semibold text-[#121212] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45 sm:min-w-[7.5rem]"
                >
                  {submitting ? "…" : "Onayı Kaydet"}
                </button>
              </div>
            ) : null}
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}
