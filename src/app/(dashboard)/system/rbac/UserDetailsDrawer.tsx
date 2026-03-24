"use client";

import Link from "next/link";
import { Fragment } from "react";
import { ROLE_BADGES, ROLE_LABELS, ROLE_LEVEL } from "@/lib/rbac/roleConfig";
import type { AppUserWithRoles } from "@/lib/rbac-v1/types";
import type { EventAccessEntry } from "@/lib/rbac-v1/api";

const SAHA_ROLE_LEVEL = 5;

type DisplayUser = AppUserWithRoles & { linked_personnel: string };

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function lifecycleLabel(user: AppUserWithRoles): string {
  const ls = user.lifecycle_status;
  if (ls === "archived") return "Arşivlendi";
  if (ls === "passive") return "Pasif";
  return user.is_active ? "Aktif" : "Pasif";
}

function lifecycleTone(user: AppUserWithRoles): "emerald" | "amber" | "slate" {
  if (user.lifecycle_status === "archived") return "slate";
  if (!user.is_active || user.lifecycle_status === "passive") return "amber";
  return "emerald";
}

export default function UserDetailsDrawer({
  displayUser,
  selectedUser,
  assignableLevels,
  selectedRoleLevel,
  setSelectedRoleLevel,
  canLogin,
  setCanLogin,
  rolesDirty,
  savingRoles,
  onSaveRoles,
  eventAccess,
  eventAccessLoading,
  eventsDirty,
  savingEvents,
  onSaveEventAccess,
  onAddEventAccess,
  onRemoveEventAccess,
  newEventId,
  setNewEventId,
  events,
  canWriteRoles,
  canDisable,
  lifecycleBusy,
  onLifecyclePassive,
  onLifecycleRestore,
  onLifecycleActivate,
  onClose,
}: {
  displayUser: DisplayUser;
  selectedUser: AppUserWithRoles;
  /** Levels that resolve to a DB role id (omit levels with no roles row). */
  assignableLevels: number[];
  selectedRoleLevel: number;
  setSelectedRoleLevel: (n: number) => void;
  canLogin: boolean;
  setCanLogin: (v: boolean) => void;
  rolesDirty: boolean;
  savingRoles: boolean;
  onSaveRoles: () => void;
  eventAccess: EventAccessEntry[];
  eventAccessLoading: boolean;
  eventsDirty: boolean;
  savingEvents: boolean;
  onSaveEventAccess: () => void;
  onAddEventAccess: () => void;
  onRemoveEventAccess: (eventId: string) => void;
  newEventId: string;
  setNewEventId: (id: string) => void;
  events: Array<{ id: string; name: string; date: string; venue?: string }>;
  canWriteRoles: boolean;
  canDisable: boolean;
  lifecycleBusy: boolean;
  onLifecyclePassive: () => void;
  onLifecycleRestore: () => void;
  onLifecycleActivate: () => void;
  onClose: () => void;
}) {
  const roleSelectValue = assignableLevels.includes(selectedRoleLevel)
    ? selectedRoleLevel
    : (assignableLevels[0] ?? selectedRoleLevel);
  const isSaha = selectedRoleLevel === SAHA_ROLE_LEVEL;
  const isObserverRole = selectedRoleLevel === ROLE_LEVEL.OBSERVER;
  const lifecycle = selectedUser.lifecycle_status ?? (selectedUser.is_active ? "active" : "passive");
  const isArchived = lifecycle === "archived";
  const showPassive = canDisable && !isArchived && selectedUser.is_active;
  const showRestore = canDisable && isArchived;
  const showActivate = canDisable && !isArchived && !selectedUser.is_active;

  const badgeTone = {
    emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    amber: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    slate: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  };

  const statusTone = lifecycleTone(selectedUser);

  return (
    <Fragment>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        style={{ zIndex: 99999 }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed right-0 top-0 flex h-screen min-h-0 w-full max-w-lg flex-col overflow-hidden border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
        style={{ zIndex: 100000 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-drawer-title"
      >
        {/* Header */}
        <div className="shrink-0 border-b border-[var(--color-border)] bg-[var(--color-bg)]/40 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                    selectedUser.can_login === false
                      ? "border-red-500/35 bg-red-500/10 text-red-400"
                      : "border-emerald-500/35 bg-emerald-500/10 text-emerald-400"
                  }`}
                >
                  {selectedUser.can_login === false ? "Giriş Yok" : "Giriş Var"}
                </span>
                <span
                  className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${badgeTone[statusTone]}`}
                >
                  {lifecycleLabel(selectedUser)}
                </span>
              </div>
              <h2 id="user-drawer-title" className="break-all text-lg font-semibold leading-snug text-[var(--color-text)]">
                {displayUser.email ?? "—"}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="ui-text-muted">Bağlı personel:</span>
                {displayUser.linked_personnel || selectedUser.linked_personnel_name ? (
                  <>
                    <span className="font-medium text-[var(--color-text)]">
                      {displayUser.linked_personnel || selectedUser.linked_personnel_name}
                    </span>
                    {selectedUser.linked_personnel_id ? (
                      <Link
                        href={`/m04/personel/kart?id=${encodeURIComponent(selectedUser.linked_personnel_id)}`}
                        className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface2)]/60 px-2 py-0.5 text-xs font-medium text-amber-400 transition hover:bg-[var(--color-surface-hover)]"
                        title="Personel kartını aç"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Profil
                      </Link>
                    ) : null}
                  </>
                ) : (
                  <span className="text-sm ui-text-muted">—</span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 ui-text-muted transition hover:bg-[var(--color-surface-hover)]"
                aria-label="Kapat"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {showPassive && (
                <button
                  type="button"
                  onClick={onLifecyclePassive}
                  disabled={lifecycleBusy}
                  className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 transition hover:bg-amber-500/20 disabled:opacity-50"
                >
                  {lifecycleBusy ? "…" : "Pasif Yap"}
                </button>
              )}
              {showRestore && (
                <button
                  type="button"
                  onClick={onLifecycleRestore}
                  disabled={lifecycleBusy}
                  className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  {lifecycleBusy ? "…" : "Geri yükle"}
                </button>
              )}
              {showActivate && (
                <button
                  type="button"
                  onClick={onLifecycleActivate}
                  disabled={lifecycleBusy}
                  className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  {lifecycleBusy ? "…" : "Aktif Yap"}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {/* Access role card */}
          <section className="mb-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface2)]/30 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider ui-text-muted">Erişim rolü</h3>
            <label className="block text-xs font-medium ui-text-muted">Sistem rolü</label>
            <select
              value={roleSelectValue}
              onChange={(e) => setSelectedRoleLevel(Number(e.target.value))}
              disabled={!canWriteRoles || assignableLevels.length === 0}
              className="ui-input mt-1 w-full text-sm"
            >
              {assignableLevels.length === 0 ? (
                <option value={selectedRoleLevel}>Rol listesi yüklenemedi</option>
              ) : (
                assignableLevels.map((level) => (
                  <option key={level} value={level}>
                    {ROLE_LABELS[level]}
                  </option>
                ))
              )}
            </select>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs ui-text-muted">Role level</span>
              <span className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/50 px-3 py-1.5 font-mono text-sm font-semibold text-[var(--color-text)]">
                {selectedRoleLevel}
              </span>
              {ROLE_BADGES[selectedRoleLevel] ? (
                <span className="rounded-md bg-[var(--color-surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]">
                  {ROLE_BADGES[selectedRoleLevel]}
                </span>
              ) : null}
            </div>

            <div className="mt-4 border-t border-[var(--color-border)] pt-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider ui-text-muted">Giriş</h4>
              {isSaha ? (
                <p className="text-sm ui-text-muted">Saha Personeli rolü için sistem girişi kapalıdır.</p>
              ) : (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={canLogin}
                    onChange={(e) => setCanLogin(e.target.checked)}
                    disabled={!canWriteRoles}
                    className="rounded"
                  />
                  <span className="text-sm">Kullanıcı giriş yapabilir</span>
                </label>
              )}
            </div>
          </section>

          {/* Event access — only for Gözlemci (observer): scoped to assigned events, view-only */}
          {canWriteRoles && isObserverRole && (
            <section className="mb-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface2)]/30 p-4">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider ui-text-muted">
                Etkinlik erişimi (Gözlemci)
              </h3>
              <p className="mb-3 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                Bu rolde kullanıcı <span className="font-medium text-[var(--color-text)]">yalnızca aşağıda seçtiğiniz etkinlikleri</span>{" "}
                görebilir; başka etkinliklere erişemez. Erişim <span className="font-medium">salt görüntüleme</span> düzeyindedir.
              </p>
              {eventAccessLoading ? (
                <p className="text-sm ui-text-muted">Yükleniyor…</p>
              ) : (
                <>
                  <div className="mb-3 flex min-h-[2.5rem] flex-wrap gap-2">
                    {eventAccess.length === 0 ? (
                      <span className="text-sm text-amber-400/90">
                        En az bir etkinlik ekleyin; kayıt için gereklidir.
                      </span>
                    ) : (
                      eventAccess.map((e) => {
                        const name = (e.event as { name?: string })?.name ?? e.event_id.slice(0, 8);
                        return (
                          <span
                            key={e.event_id}
                            className="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)]/60 pl-3 pr-1 py-1 text-xs text-[var(--color-text)]"
                          >
                            <span className="truncate">{name}</span>
                            <span className="shrink-0 rounded bg-[var(--color-surface2)] px-1.5 py-0.5 text-[10px] uppercase text-[var(--color-text-secondary)]">
                              görüntüle
                            </span>
                            <button
                              type="button"
                              onClick={() => onRemoveEventAccess(e.event_id)}
                              className="ml-0.5 rounded-full p-1 text-[var(--color-text-muted)] hover:bg-red-500/20 hover:text-red-400"
                              aria-label="Kaldır"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        );
                      })
                    )}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                    <select
                      value={newEventId}
                      onChange={(e) => setNewEventId(e.target.value)}
                      className="ui-input min-w-0 flex-1 text-xs"
                    >
                      <option value="">Etkinlik seçin</option>
                      {events
                        .filter((ev) => !eventAccess.some((ea) => ea.event_id === ev.id))
                        .map((ev) => (
                          <option key={ev.id} value={ev.id}>
                            {ev.name} ({ev.date})
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={onAddEventAccess}
                      className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
                    >
                      Ekle
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={onSaveEventAccess}
                    disabled={
                      !eventsDirty ||
                      savingEvents ||
                      eventAccessLoading ||
                      eventAccess.length === 0
                    }
                    className="mt-3 w-full rounded-lg border border-[var(--color-border)] py-2.5 text-sm font-medium transition hover:bg-[var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {savingEvents ? "Kaydediliyor…" : "Etkinlik erişimini kaydet"}
                  </button>
                </>
              )}
            </section>
          )}
        </div>

        {/* Footer meta */}
        <div className="shrink-0 border-t border-[var(--color-border)] px-5 py-3 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
          <p>
            Oluşturulma: <span className="text-[var(--color-text-secondary)]">{fmtDateTime(selectedUser.created_at)}</span>
          </p>
          <p className="mt-1">
            Son giriş: <span className="text-[var(--color-text-secondary)]">{fmtDateTime(selectedUser.last_login_at)}</span>
          </p>
        </div>

        {/* Footer actions */}
        <div className="shrink-0 space-y-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
          <button
            type="button"
            onClick={onSaveRoles}
            disabled={!canWriteRoles || !rolesDirty || savingRoles}
            className="w-full rounded-lg bg-[var(--color-primary)] py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {savingRoles ? "Kaydediliyor…" : "Rol ve giriş ayarlarını kaydet"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-[var(--color-border)] py-2.5 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
          >
            Kapat
          </button>
        </div>
      </div>
    </Fragment>
  );
}
