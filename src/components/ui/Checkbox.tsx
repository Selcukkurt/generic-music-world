"use client";

type CheckboxProps = {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
};

/**
 * Shared Checkbox component – dark theme friendly, consistent across login + dashboard.
 * Unchecked: clear border + transparent bg.
 * Checked: brand yellow background + white check icon.
 */
export default function Checkbox({
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  id,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  className = "",
}: CheckboxProps) {
  return (
    <span
      className={`relative inline-flex h-4 w-4 min-h-4 min-w-4 shrink-0 items-center justify-center ${disabled ? "cursor-not-allowed opacity-60" : ""} ${className}`}
    >
      {/*
        Do not use `sr-only` on the input: it shrinks the hit target to ~1px. Decorative layers use
        pointer-events-none, so clicks pass through — but they miss the tiny input and hit whatever is
        behind the control (real interaction bug). The input must cover the full box.
      */}
      <input
        type="checkbox"
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange}
        disabled={disabled}
        id={id}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        className="peer pointer-events-auto absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
      <span
        className="pointer-events-none absolute inset-0 rounded border-2 border-[var(--color-border)] bg-transparent transition-colors peer-checked:border-[var(--brand-yellow)] peer-checked:bg-[var(--brand-yellow)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--brand-yellow)]/55 peer-focus-visible:ring-inset"
        aria-hidden
      />
      <svg
        className="pointer-events-none absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}
