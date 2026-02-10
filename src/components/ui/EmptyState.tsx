"use client";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="ui-card-plain p-6 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="ui-text-muted mt-2 text-sm">{description}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="ui-button-primary mt-4 px-4 py-2 text-sm font-semibold"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
