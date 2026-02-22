"use client";

import packageJson from "../../../../package.json";

function getEnvBadge() {
  if (typeof window === "undefined") {
    return process.env.NODE_ENV === "production" ? "prod" : "dev";
  }
  return process.env.NODE_ENV === "production" ? "prod" : "dev";
}

export default function SistemTab() {
  const env = getEnvBadge();
  const version = packageJson.version ?? "0.0.0";

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text)]">Uygulama sürümü</h3>
        <p className="mt-1 text-xs ui-text-muted">Generic Music World sürüm bilgisi.</p>
        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/30 px-4 py-2 font-mono text-sm text-[var(--color-text)]">
            v{version}
          </span>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text)]">Ortam</h3>
        <p className="mt-1 text-xs ui-text-muted">Çalıştığınız ortam (geliştirme / üretim).</p>
        <div className="mt-3">
          <span
            className={`inline-flex rounded px-2 py-1 text-xs font-medium ${
              env === "prod"
                ? "bg-emerald-500/20 text-emerald-200"
                : "bg-amber-500/20 text-amber-200"
            }`}
          >
            {env === "prod" ? "Üretim" : "Geliştirme"}
          </span>
        </div>
      </div>
    </div>
  );
}
