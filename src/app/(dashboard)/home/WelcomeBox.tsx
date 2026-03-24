"use client";

type WelcomeBoxProps = {
  userName: string;
  roleLabel: string;
  pendingApprovals: number;
  unreadNotifications: number;
};

function getDynamicSentence(pendingApprovals: number, unreadNotifications: number): string {
  if (pendingApprovals > 0 && unreadNotifications > 0)
    return `Bugün ${pendingApprovals} kritik onayın ve ${unreadNotifications} bildirimin var.`;
  if (pendingApprovals > 0) return `Bugün ${pendingApprovals} kritik onayın var.`;
  if (unreadNotifications > 0) return `${unreadNotifications} okunmamış bildirimin var.`;
  return "Bugün bekleyen işlemin yok.";
}

export default function WelcomeBox({
  userName,
  roleLabel,
  pendingApprovals,
  unreadNotifications,
}: WelcomeBoxProps) {
  const sentence = getDynamicSentence(pendingApprovals, unreadNotifications);

  return (
    <section className="w-full">
      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-6 backdrop-blur-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[var(--color-text)]">
              Hoş geldin, {userName}
            </h1>
            <p className="mt-0.5 text-sm ui-text-muted">{roleLabel}</p>
            <p className="mt-2 text-sm text-[var(--color-text)]">{sentence}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)]/60 px-3 py-1 text-xs ui-text-muted">
                Bekleyen onaylar: {pendingApprovals}
              </span>
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)]/60 px-3 py-1 text-xs ui-text-muted">
                Okunmamış bildirim: {unreadNotifications}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
