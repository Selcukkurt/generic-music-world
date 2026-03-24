"use client";

import { useState } from "react";
import type { AppUserWithRoles } from "@/lib/rbac-v1/types";

function normalizeEmail(s: string): string {
  return s.trim().toLowerCase();
}

export default function PermanentDeleteUserModal({
  user,
  onClose,
  onConfirm,
  busy,
}: {
  user: AppUserWithRoles;
  onClose: () => void;
  onConfirm: (payload: { confirmEmail: string; reason: string }) => void;
  busy: boolean;
}) {
  const [emailInput, setEmailInput] = useState("");
  const [reason, setReason] = useState("");
  const targetEmail = user.email ?? "";

  const match =
    targetEmail.length > 0 && normalizeEmail(emailInput) === normalizeEmail(targetEmail);

  return (
    <div
      className="fixed inset-0 z-[calc(var(--z-modal)+2)] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="perm-del-title"
      onClick={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div
        className="w-full max-w-md rounded-xl border border-red-500/35 bg-[var(--color-surface)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="perm-del-title" className="text-lg font-semibold text-red-400">
          Kalıcı sil
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          Bu işlem kullanıcıyı sistemden kalıcı olarak kaldırır. Geri alınamaz. Devam etmek için kullanıcının
          e-posta adresini yazın.
        </p>
        <p className="mt-2 font-mono text-xs break-all text-[var(--color-text)]">{targetEmail || "—"}</p>

        <label className="mt-4 block text-xs font-medium uppercase tracking-wider text-red-400/90">
          E-posta onayı *
        </label>
        <input
          type="email"
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          autoComplete="off"
          disabled={busy}
          placeholder="E-postayı buraya yazın"
          className="ui-input mt-1 w-full text-sm"
        />

        <label className="mt-4 block text-xs font-medium uppercase tracking-wider ui-text-muted">
          Gerekçe (isteğe bağlı)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={busy}
          rows={2}
          className="ui-input mt-1 w-full resize-none text-sm"
          placeholder="Denetim kaydı için kısa not"
        />

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-lg border border-[var(--color-border)] py-2.5 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
          >
            İptal
          </button>
          <button
            type="button"
            disabled={!match || busy}
            onClick={() => onConfirm({ confirmEmail: emailInput.trim(), reason: reason.trim() })}
            className="flex-1 rounded-lg border border-red-500/50 bg-red-600/90 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Siliniyor…" : "Kalıcı olarak sil"}
          </button>
        </div>
      </div>
    </div>
  );
}
