"use client";

export default function ActivationPendingPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <p className="max-w-md text-sm text-[var(--color-text-secondary)]">
        Hesabınız yönetici onayı bekliyor. Onaylandığında bu ekran kalkar ve uygulamaya erişebilirsiniz.
      </p>
    </div>
  );
}
