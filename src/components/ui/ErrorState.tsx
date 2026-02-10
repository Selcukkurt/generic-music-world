"use client";

type ErrorStateProps = {
  title: string;
  message: string;
  helper?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function ErrorState({
  title,
  message,
  helper,
  actionLabel,
  onAction,
}: ErrorStateProps) {
  return (
    <div className="ui-card-plain p-4">
      <p className="text-sm font-semibold">{title}</p>
      <p className="ui-text-secondary mt-1 text-sm">{message}</p>
      {helper ? <p className="ui-text-muted mt-1 text-xs">{helper}</p> : null}
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="ui-button-primary mt-3 px-3 py-2 text-xs font-semibold"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
