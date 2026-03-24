import type { AppUserWithRoles } from "@/lib/rbac-v1/types";

/** Single dominant status for table + drawer (Turkish UI labels). */
export type PrimaryRbacStatus = "active" | "invite_pending" | "passive" | "archived";

export function getPrimaryRbacStatus(u: AppUserWithRoles): PrimaryRbacStatus {
  const life = u.lifecycle_status ?? "active";
  if (life === "archived" || u.lifecycle_display === "archived") return "archived";
  if (life === "passive" || u.lifecycle_display === "passive") return "passive";
  if (u.lifecycle_display === "invited") return "invite_pending";
  return "active";
}

export function primaryRbacStatusLabel(s: PrimaryRbacStatus): string {
  switch (s) {
    case "active":
      return "Aktif";
    case "invite_pending":
      return "Davet bekleniyor";
    case "passive":
      return "Pasif";
    case "archived":
      return "Arşiv";
    default:
      return "—";
  }
}

/** One subtle pill — neutral surfaces, minimal color. */
export function primaryRbacStatusClass(s: PrimaryRbacStatus): string {
  switch (s) {
    case "archived":
      return "border border-[var(--color-border)] bg-[var(--color-bg)]/80 text-[var(--color-text-secondary)]";
    case "passive":
      return "border border-[var(--color-border)] bg-[var(--color-bg)]/80 text-[var(--color-text-secondary)]";
    case "invite_pending":
      return "border border-[var(--color-border)] bg-[var(--color-bg)]/80 text-[var(--color-text)]";
    case "active":
      return "border border-[var(--color-border)] bg-[var(--color-bg)]/80 text-[var(--color-text)]";
    default:
      return "border border-[var(--color-border)] bg-[var(--color-bg)]/80 text-[var(--color-text-secondary)]";
  }
}

function fmtShortTr(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return null;
  }
}

/**
 * Muted secondary lines under the primary status badge (table + drawer).
 * Avoid duplicating the badge; add context only when useful.
 */
export function getRbacStatusMetaLines(u: AppUserWithRoles): string[] {
  const lines: string[] = [];
  const primary = getPrimaryRbacStatus(u);

  if (u.can_login === false) lines.push("Giriş kapalı");

  if (u.invite_pipeline === "email_pending") {
    lines.push("E-posta onayı bekleniyor");
  } else if (u.invite_pipeline === "onboarding") {
    lines.push("İlk giriş bekleniyor");
  }

  if (primary === "active" && !u.last_login_at && u.invite_pipeline === "complete") {
    lines.push("Hiç giriş yapmadı");
  }

  if (primary === "invite_pending") {
    const t = fmtShortTr(u.updated_at);
    if (t) lines.push(`Son güncelleme: ${t}`);
  }

  return lines;
}
