"use client";

export interface PersonnelHeaderData {
  initials: string;
  fullName: string;
  title: string;
  email: string;
  manager: string;
  status: string;
  statusVariant?: "active" | "inactive" | "warning";
}

export interface HeaderAction {
  label: string;
  onClick?: () => void;
  href?: string;
}

type PersonnelHeaderCardProps = {
  data: PersonnelHeaderData;
  actions?: HeaderAction[];
};

const STATUS_CLASSES: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-200",
  inactive: "bg-[var(--color-surface2)] ui-text-muted",
  warning: "bg-amber-500/20 text-amber-200",
};

export default function PersonnelHeaderCard({ data, actions = [] }: PersonnelHeaderCardProps) {
  const statusClass = STATUS_CLASSES[data.statusVariant ?? "active"] ?? STATUS_CLASSES.active;

  return (
    <div className="ui-glass flex flex-wrap items-center gap-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-6 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface2)] text-xl font-medium text-[var(--color-text)]">
          {data.initials}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">{data.fullName}</h2>
          <p className="text-sm ui-text-muted">{data.title}</p>
          <p className="text-xs ui-text-muted">{data.email}</p>
          <p className="text-xs ui-text-muted">Yönetici: {data.manager}</p>
          <span className={`mt-2 inline-block rounded px-2 py-0.5 text-xs font-medium ${statusClass}`}>
            {data.status}
          </span>
        </div>
      </div>
      <div className="ml-auto flex flex-wrap gap-2">
        {actions.map((action) =>
          action.href ? (
            <a
              key={action.label}
              href={action.href}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-3 py-1.5 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
            >
              {action.label}
            </a>
          ) : (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-3 py-1.5 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
            >
              {action.label}
            </button>
          )
        )}
      </div>
    </div>
  );
}
