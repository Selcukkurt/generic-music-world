"use client";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
};

/**
 * Reusable page header used by Dashboard, Profile, and Module pages.
 * Ensures consistent structure and spacing across the app.
 */
export default function PageHeader({
  title,
  subtitle,
  children,
}: PageHeaderProps) {
  return (
    <header className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 backdrop-blur-sm sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="ui-heading-page">{title}</h1>
          {subtitle ? (
            <p className="ui-text-muted mt-1 text-sm">{subtitle}</p>
          ) : null}
        </div>
        {children ? <div className="flex shrink-0">{children}</div> : null}
      </div>
    </header>
  );
}
