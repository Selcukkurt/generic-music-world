"use client";

import { useState } from "react";

export default function ApiRateLimitTab() {
  const [allowlistInput, setAllowlistInput] = useState("");
  const [allowlist, setAllowlist] = useState<string[]>([]);
  const [blocklistInput, setBlocklistInput] = useState("");
  const [blocklist, setBlocklist] = useState<string[]>([]);

  const addToAllowlist = () => {
    const v = allowlistInput.trim();
    if (v && !allowlist.includes(v)) {
      setAllowlist((prev) => [...prev, v]);
      setAllowlistInput("");
    }
  };

  const removeFromAllowlist = (item: string) => {
    setAllowlist((prev) => prev.filter((x) => x !== item));
  };

  const addToBlocklist = () => {
    const v = blocklistInput.trim();
    if (v && !blocklist.includes(v)) {
      setBlocklist((prev) => [...prev, v]);
      setBlocklistInput("");
    }
  };

  const removeFromBlocklist = (item: string) => {
    setBlocklist((prev) => prev.filter((x) => x !== item));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/50 p-4">
        <h3 className="text-sm font-medium text-[var(--color-text)]">
          IP İzin Listesi (Allowlist)
        </h3>
        <p className="mt-1 text-xs ui-text-muted">
          Sadece bu IP adreslerinden API erişimine izin ver. V1: UI only.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={allowlistInput}
            onChange={(e) => setAllowlistInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToAllowlist())}
            placeholder="192.168.1.1"
            className="ui-input flex-1"
          />
          <button
            type="button"
            onClick={addToAllowlist}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
          >
            Ekle
          </button>
        </div>
        {allowlist.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {allowlist.map((ip) => (
              <span
                key={ip}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface2)] px-3 py-1 text-xs"
              >
                {ip}
                <button
                  type="button"
                  onClick={() => removeFromAllowlist(ip)}
                  className="ml-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  aria-label="Kaldır"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/50 p-4">
        <h3 className="text-sm font-medium text-[var(--color-text)]">
          IP Engelleme Listesi (Blocklist)
        </h3>
        <p className="mt-1 text-xs ui-text-muted">
          Bu IP adreslerinden gelen istekleri engelle. V1: UI only.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={blocklistInput}
            onChange={(e) => setBlocklistInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToBlocklist())}
            placeholder="10.0.0.1"
            className="ui-input flex-1"
          />
          <button
            type="button"
            onClick={addToBlocklist}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
          >
            Ekle
          </button>
        </div>
        {blocklist.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {blocklist.map((ip) => (
              <span
                key={ip}
                className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-200"
              >
                {ip}
                <button
                  type="button"
                  onClick={() => removeFromBlocklist(ip)}
                  className="ml-1 hover:opacity-80"
                  aria-label="Kaldır"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/50 p-4">
        <h3 className="text-sm font-medium text-[var(--color-text)]">
          Rate Limit
        </h3>
        <p className="mt-1 text-xs ui-text-muted">
          API istek limitleri ve throttle ayarları.
        </p>
        <span className="mt-2 inline-flex rounded px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-200">
          Yakında
        </span>
      </div>
    </div>
  );
}
