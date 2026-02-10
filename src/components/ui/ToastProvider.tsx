"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: string;
  title: string;
  message?: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  notify: (toast: Omit<Toast, "id">) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const variantStyles: Record<ToastVariant, string> = {
  success: "border-emerald-400/30 text-emerald-100",
  error: "border-amber-400/30 text-amber-100",
  info: "border-slate-500/40 text-slate-100",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const newToast: Toast = { ...toast, id };
      setToasts((current) => [...current, newToast]);
      window.setTimeout(() => removeToast(id), 4000);
    },
    [removeToast]
  );

  const value = useMemo(
    () => ({
      notify,
      success: (title: string, message?: string) =>
        notify({ title, message, variant: "success" }),
      error: (title: string, message?: string) =>
        notify({ title, message, variant: "error" }),
      info: (title: string, message?: string) =>
        notify({ title, message, variant: "info" }),
    }),
    [notify]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-6 right-6 z-[var(--z-toast)] space-y-3"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`ui-card-plain w-72 border ${variantStyles[toast.variant]} p-4 shadow-[0_16px_40px_rgba(7,16,35,0.45)]`}
          >
            <p className="text-sm font-semibold">{toast.title}</p>
            {toast.message ? (
              <p className="ui-text-secondary mt-1 text-xs">{toast.message}</p>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
