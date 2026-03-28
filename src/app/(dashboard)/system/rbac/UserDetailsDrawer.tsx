"use client";

import Link from "next/link";
import { Fragment, useMemo } from "react";
import { ROLE_BADGES, ROLE_LABELS, ROLE_LEVEL } from "@/lib/rbac/roleConfig";
import type { AppUserWithRoles, Role } from "@/lib/rbac-v1/types";
import type { EventAccessEntry, PersonnelCandidate } from "@/lib/rbac-v1/api";
import {
  getPrimaryRbacStatus,
  getRbacStatusMetaLines,
  primaryRbacStatusClass,
  primaryRbacStatusLabel,
} from "./usersTableHelpers";

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

function invitePipelineLabelDrawer(p: AppUserWithRoles["invite_pipeline"]): string {
  if (p === "email_pending") return "E-posta onayı bekleniyor";
  if (p === "onboarding") return "Giriş bekleniyor";
  if (p === "complete") return "Tamam";
  return "—";
}

function sectionCardClass() {
  return "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface2)]/25 p-4";
}

function sectionTitleClass() {
  return "mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]";
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
  isSystemOwner,
  lifecycleBusy,
  adminActionBusy,
  onLifecyclePassive,
  onLifecycleRestore,
  onLifecycleActivate,
  onLifecycleArchive,
  onResendInvite,
  onCopyInviteLink,
  onPasswordResetLink,
  currentUserId,
  onPermanentDelete,
  onClose,
  rbacRoles,
  personnelCandidates,
  personnelCandidatesLoading,
  activationPersonnelId,
  setActivationPersonnelId,
  activationRoleId,
  setActivationRoleId,
  activationTitle,
  setActivationTitle,
  activationDepartment,
  setActivationDepartment,
  onActivatePersonnel,
  activatingPersonnel,
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
  isSystemOwner: boolean;
  lifecycleBusy: boolean;
  adminActionBusy: boolean;
  onLifecyclePassive: () => void;
  onLifecycleRestore: () => void;
  onLifecycleActivate: () => void;
  onLifecycleArchive: () => void;
  onResendInvite: () => void;
  onCopyInviteLink: () => void;
  onPasswordResetLink: () => void;
  currentUserId?: string | null;
  onPermanentDelete?: () => void;
  onClose: () => void;
  rbacRoles: Role[];
  personnelCandidates: PersonnelCandidate[];
  personnelCandidatesLoading: boolean;
  activationPersonnelId: string;
  setActivationPersonnelId: (id: string) => void;
  activationRoleId: string;
  setActivationRoleId: (id: string) => void;
  activationTitle: string;
  setActivationTitle: (v: string) => void;
  activationDepartment: string;
  setActivationDepartment: (v: string) => void;
  onActivatePersonnel: () => void;
  activatingPersonnel: boolean;
}) {
  const activationRoleChoices = useMemo(() => {
    const byLevel = rbacRoles.filter(
      (r) => typeof r.role_level === "number" && assignableLevels.includes(r.role_level)
    );
    return byLevel.length > 0 ? byLevel : rbacRoles;
  }, [rbacRoles, assignableLevels]);

  const isAwaitingActivation = selectedUser.access_phase === "awaiting_activation";
  const roleSelectValue = assignableLevels.includes(selectedRoleLevel)
    ? selectedRoleLevel
    : (assignableLevels[0] ?? selectedRoleLevel);
  const isSaha = selectedRoleLevel === SAHA_ROLE_LEVEL;
  const isObserverRole = selectedRoleLevel === ROLE_LEVEL.OBSERVER;
  const lifecycle = selectedUser.lifecycle_status ?? (selectedUser.is_active ? "active" : "passive");
  const isArchived = lifecycle === "archived";
  const showPassive = isSystemOwner && !isArchived && lifecycle !== "passive";
  const showRestore = isSystemOwner && isArchived;
  const showActivate = isSystemOwner && !isArchived && lifecycle === "passive";
  const showArchive = isSystemOwner && !isArchived;
  const showPermanentDelete =
    Boolean(isSystemOwner && onPermanentDelete && selectedUser.id !== currentUserId);

  const primaryStatus = getPrimaryRbacStatus(selectedUser);
  const statusMeta = getRbacStatusMetaLines(selectedUser);

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
        <div className="shrink-0 border-b border-[var(--color-border)] bg-[var(--color-bg)]/30 px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-3">
              <h2 id="user-drawer-title" className="break-all text-lg font-semibold leading-snug tracking-tight text-[var(--color-text)]">
                {displayUser.email ?? "—"}
              </h2>
              <div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${primaryRbacStatusClass(primaryStatus)}`}
                >
                  {primaryRbacStatusLabel(primaryStatus)}
                </span>
                {statusMeta.length > 0 ? (
                  <div className="mt-2 space-y-0.5">
                    {statusMeta.map((line, i) => (
                      <p key={`drawer-meta-${i}`} className="text-[11px] text-[var(--color-text-muted)]">
                        {line}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
              {displayUser.linked_personnel || selectedUser.linked_personnel_name ? (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-[var(--color-text-secondary)]">
                    {displayUser.linked_personnel || selectedUser.linked_personnel_name}
                  </span>
                  {selectedUser.linked_personnel_id ? (
                    <Link
                      href={`/m04/personel/kart?id=${encodeURIComponent(selectedUser.linked_personnel_id)}`}
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface2)]/60 px-2 py-0.5 text-xs font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-hover)]"
                      title="Personel kartını aç"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Profil
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-2 text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-hover)]"
              aria-label="Kapat"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <section className={sectionCardClass()}>
            <h3 className={sectionTitleClass()}>Özet</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-text-muted)]">Oluşturulma</dt>
                <dd className="text-right text-[var(--color-text-secondary)]">{fmtDateTime(selectedUser.created_at)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-text-muted)]">Bağlı personel</dt>
                <dd className="text-right text-[var(--color-text-secondary)]">
                  {displayUser.linked_personnel || selectedUser.linked_personnel_name || "—"}
                </dd>
              </div>
            </dl>
          </section>

          {isAwaitingActivation && canWriteRoles ? (
            <section className="rounded-xl border border-amber-500/30 bg-amber-500/[0.07] p-4">
              <h3 className={sectionTitleClass()}>Personel atama ve aktivasyon</h3>
              <p className="mb-4 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                Kullanıcı onboarding&apos;i tamamladı. Hub erişimi için bir personel kartı bağlayın ve sistem rolü
                seçin. İsteğe bağlı unvan / departman{" "}
                <code className="rounded bg-[var(--color-bg)] px-1">app_users</code> üzerine yazılır.
              </p>
              {personnelCandidatesLoading ? (
                <p className="text-sm ui-text-muted">Personel adayları yükleniyor…</p>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium ui-text-muted">Personel kaydı *</label>
                    <select
                      value={activationPersonnelId}
                      onChange={(e) => setActivationPersonnelId(e.target.value)}
                      disabled={activatingPersonnel}
                      className="ui-input mt-1 w-full text-sm"
                    >
                      <option value="">Seçin…</option>
                      {personnelCandidates.map((p) => (
                        <option key={p.id} value={p.id}>
                          {(p.full_name || "İsimsiz") + (p.email ? ` · ${p.email}` : "")}
                        </option>
                      ))}
                    </select>
                    {personnelCandidates.length === 0 ? (
                      <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                        Bağlanmamış aktif personel yok. Önce personel modülünde kayıt oluşturun.
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className="block text-xs font-medium ui-text-muted">Sistem rolü *</label>
                    <select
                      value={activationRoleId}
                      onChange={(e) => setActivationRoleId(e.target.value)}
                      disabled={activatingPersonnel || activationRoleChoices.length === 0}
                      className="ui-input mt-1 w-full text-sm"
                    >
                      <option value="">Seçin…</option>
                      {activationRoleChoices.map((r) => (
                        <option key={r.id} value={r.id}>
                          {(r.name_tr || r.key) + (typeof r.role_level === "number" ? ` (${r.role_level})` : "")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium ui-text-muted">Unvan (isteğe bağlı)</label>
                      <input
                        type="text"
                        value={activationTitle}
                        onChange={(e) => setActivationTitle(e.target.value)}
                        disabled={activatingPersonnel}
                        className="ui-input mt-1 w-full text-sm"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium ui-text-muted">Departman (isteğe bağlı)</label>
                      <input
                        type="text"
                        value={activationDepartment}
                        onChange={(e) => setActivationDepartment(e.target.value)}
                        disabled={activatingPersonnel}
                        className="ui-input mt-1 w-full text-sm"
                        autoComplete="organization"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onActivatePersonnel}
                    disabled={
                      activatingPersonnel ||
                      !activationPersonnelId ||
                      !activationRoleId ||
                      personnelCandidates.length === 0
                    }
                    className="w-full rounded-lg bg-[var(--color-primary)] py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {activatingPersonnel ? "Aktive ediliyor…" : "Personeli ata ve aktive et"}
                  </button>
                </div>
              )}
            </section>
          ) : null}

          <section className={sectionCardClass()}>
            <h3 className={sectionTitleClass()}>Erişim</h3>
            {isAwaitingActivation ? (
              <p className="mb-3 text-xs leading-relaxed text-[var(--color-text-muted)]">
                Bu kullanıcı için rol ve giriş ayarları, personel ataması tamamlandıktan sonra düzenlenebilir.
              </p>
            ) : null}
            <label className="block text-xs font-medium ui-text-muted">Sistem rolü</label>
            <select
              value={roleSelectValue}
              onChange={(e) => setSelectedRoleLevel(Number(e.target.value))}
              disabled={!canWriteRoles || assignableLevels.length === 0 || isAwaitingActivation}
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
                    disabled={!canWriteRoles || isAwaitingActivation}
                    className="rounded"
                  />
                  <span className="text-sm">Kullanıcı giriş yapabilir</span>
                </label>
              )}
            </div>

            {canWriteRoles && isObserverRole && !isAwaitingActivation && (
              <div className="mt-5 border-t border-[var(--color-border)] pt-5">
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Etkinlik erişimi (Gözlemci)
                </h4>
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
                        <span className="text-sm text-[var(--color-text-muted)]">
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
              </div>
            )}
          </section>

          <section className={sectionCardClass()}>
            <h3 className={sectionTitleClass()}>Hesap durumu</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-text-muted)]">Davet / onboarding</dt>
                <dd className="text-right text-[var(--color-text-secondary)]">
                  {invitePipelineLabelDrawer(selectedUser.invite_pipeline)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-text-muted)]">Son giriş</dt>
                <dd className="text-right text-[var(--color-text-secondary)]">{fmtDateTime(selectedUser.last_login_at)}</dd>
              </div>
            </dl>
          </section>

          {isSystemOwner ? (
            <section className={sectionCardClass()}>
              <h3 className={sectionTitleClass()}>Yönetici işlemleri</h3>
              <p className="mb-4 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                E-posta teslimi garanti edilmez. Bağlantıları yalnızca güvenli kanallardan paylaşın.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={onResendInvite}
                  disabled={adminActionBusy || lifecycleBusy}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/40 px-3 py-2 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
                >
                  {adminActionBusy ? "…" : "Daveti yeniden gönder"}
                </button>
                <button
                  type="button"
                  onClick={onCopyInviteLink}
                  disabled={adminActionBusy || lifecycleBusy}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/40 px-3 py-2 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
                >
                  {adminActionBusy ? "…" : "Davet bağlantısını kopyala"}
                </button>
                <button
                  type="button"
                  onClick={onPasswordResetLink}
                  disabled={adminActionBusy || lifecycleBusy}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/40 px-3 py-2 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
                >
                  {adminActionBusy ? "…" : "Şifre sıfırlama bağlantısı"}
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-4">
                {showPassive ? (
                  <button
                    type="button"
                    onClick={onLifecyclePassive}
                    disabled={lifecycleBusy}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/40 px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
                  >
                    {lifecycleBusy ? "…" : "Pasif yap"}
                  </button>
                ) : null}
                {showActivate ? (
                  <button
                    type="button"
                    onClick={onLifecycleActivate}
                    disabled={lifecycleBusy}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/40 px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
                  >
                    {lifecycleBusy ? "…" : "Aktif yap"}
                  </button>
                ) : null}
                {showRestore ? (
                  <button
                    type="button"
                    onClick={onLifecycleRestore}
                    disabled={lifecycleBusy}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/40 px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
                  >
                    {lifecycleBusy ? "…" : "Arşivden geri yükle"}
                  </button>
                ) : null}
                {showArchive ? (
                  <button
                    type="button"
                    onClick={onLifecycleArchive}
                    disabled={lifecycleBusy || adminActionBusy}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/40 px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
                  >
                    {lifecycleBusy ? "…" : "Arşivle"}
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}

          {showPermanentDelete ? (
            <section className="rounded-xl border border-red-500/30 bg-red-500/[0.06] p-4">
              <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-red-400/90">Tehlikeli işlem</h3>
              <p className="mb-3 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
                Kalıcı silme Auth hesabını ve bu kaydı ürün dışına taşır. Arşiv geri alınabilir.
              </p>
              <button
                type="button"
                onClick={onPermanentDelete}
                disabled={adminActionBusy || lifecycleBusy}
                className="w-full rounded-lg border border-red-500/45 bg-red-600/20 px-3 py-2.5 text-xs font-semibold text-red-300 transition hover:bg-red-600/30 disabled:opacity-50"
              >
                Kalıcı sil
              </button>
            </section>
          ) : null}
        </div>

        {/* Footer actions */}
        <div className="shrink-0 space-y-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
          <button
            type="button"
            onClick={onSaveRoles}
            disabled={!canWriteRoles || !rolesDirty || savingRoles || isAwaitingActivation}
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
