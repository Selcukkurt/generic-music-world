"use client";

import type { RefObject } from "react";
import type { AppUserWithRoles } from "@/lib/rbac-v1/types";
import RbacAnchoredPopover from "./RbacAnchoredPopover";

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
      role="menuitem"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
        onClose();
      }}
      className={`flex w-full items-center px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--color-surface-hover)] focus-visible:bg-[var(--color-surface-hover)] focus-visible:outline-none ${
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
  anchorRef,
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
  anchorRef: RefObject<HTMLElement | null>;
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
  const life = user.lifecycle_status ?? "active";
  const isArchived = life === "archived";
  const isPassive = life === "passive";
  const isSelf = user.id === currentUserId;

  return (
    <RbacAnchoredPopover
      isOpen={isOpen}
      onClose={onClose}
      anchorRef={anchorRef}
      align="end"
      minWidth={232}
      maxWidth={320}
      panelRole="menu"
      aria-label="Satır işlemleri"
      className="p-0 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
        <MenuItem onClick={onEdit} onClose={onClose}>
          Düzenle
        </MenuItem>
        {isSystemOwner ? (
          <>
            <div className="mx-2 my-1 h-px shrink-0 bg-[var(--color-border)]" role="separator" />
            <MenuItem onClick={onResendInvite} onClose={onClose}>
              Daveti yeniden gönder
            </MenuItem>
            <MenuItem onClick={onCopyInviteLink} onClose={onClose}>
              Davet bağlantısını kopyala
            </MenuItem>
            <MenuItem onClick={onPasswordReset} onClose={onClose}>
              Şifre sıfırlama bağlantısı
            </MenuItem>
            <div className="mx-2 my-1 h-px shrink-0 bg-[var(--color-border)]" role="separator" />
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
                <div className="mx-2 my-1 h-px shrink-0 bg-[var(--color-border)]" role="separator" />
                <MenuItem onClick={onPermanentDelete} onClose={onClose} destructive>
                  Kalıcı sil
                </MenuItem>
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </RbacAnchoredPopover>
  );
}
