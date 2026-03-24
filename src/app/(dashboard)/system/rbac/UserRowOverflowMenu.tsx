"use client";

import { useEffect, useRef } from "react";
import type { AppUserWithRoles } from "@/lib/rbac-v1/types";

type DisplayUser = AppUserWithRoles & { linked_personnel: string };

function MenuItem({
  children,
  onClick,
  onClose,
  destructive,
}: {
  children: React.ReactNode;
  onClick: () => void;
  onClose: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
        onClose();
      }}
      className={`flex w-full items-center px-3 py-2.5 text-left text-sm transition hover:bg-[var(--color-surface-hover)] ${
        destructive ? "text-red-400/95" : "text-[var(--color-text)]"
      }`}
    >
      {children}
    </button>
  );
}

export default function UserRowOverflowMenu({
  user,
  isOpen,
  onClose,
  isSystemOwner,
  currentUserId,
  onEdit,
  onResendInvite,
  onCopyInviteLink,
  onPasswordReset,
  onToggleActivePassive,
  onArchive,
  onRestore,
  onPermanentDelete,
}: {
  user: DisplayUser;
  isOpen: boolean;
  onClose: () => void;
  isSystemOwner: boolean;
  currentUserId: string | null | undefined;
  onEdit: () => void;
  onResendInvite: () => void;
  onCopyInviteLink: () => void;
  onPasswordReset: () => void;
  onToggleActivePassive: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onPermanentDelete: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const life = user.lifecycle_status ?? "active";
  const isArchived = life === "archived";
  const isPassive = life === "passive";
  const isSelf = user.id === currentUserId;

  return (
    <div
      ref={rootRef}
      className="absolute right-0 top-full z-[80] mt-1 min-w-[220px] overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-xl"
      role="menu"
      onClick={(e) => e.stopPropagation()}
    >
      <MenuItem onClick={onEdit} onClose={onClose}>
        Düzenle
      </MenuItem>
      {isSystemOwner ? (
        <>
          <div className="my-1 h-px bg-[var(--color-border)]" />
          <MenuItem onClick={onResendInvite} onClose={onClose}>
            Daveti yeniden gönder
          </MenuItem>
          <MenuItem onClick={onCopyInviteLink} onClose={onClose}>
            Davet bağlantısını kopyala
          </MenuItem>
          <MenuItem onClick={onPasswordReset} onClose={onClose}>
            Şifre sıfırlama bağlantısı
          </MenuItem>
          <div className="my-1 h-px bg-[var(--color-border)]" />
          {!isArchived ? (
            <MenuItem onClick={onToggleActivePassive} onClose={onClose}>
              {isPassive ? "Aktifleştir" : "Pasifleştir"}
            </MenuItem>
          ) : null}
          {!isArchived ? (
            <MenuItem onClick={onArchive} onClose={onClose}>
              Arşivle
            </MenuItem>
          ) : null}
          {isArchived ? (
            <MenuItem onClick={onRestore} onClose={onClose}>
              Arşivden geri yükle
            </MenuItem>
          ) : null}
          {!isSelf ? (
            <>
              <div className="my-1 h-px bg-[var(--color-border)]" />
              <MenuItem onClick={onPermanentDelete} onClose={onClose} destructive>
                Kalıcı sil
              </MenuItem>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
