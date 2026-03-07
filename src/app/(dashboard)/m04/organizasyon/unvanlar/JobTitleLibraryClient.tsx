"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/shell/PageHeader";
import { useToast } from "@/components/ui/ToastProvider";
import { fetchJobTitles } from "@/lib/org-structure/data";
import type { JobTitle } from "@/lib/org-structure/types";

const CATEGORY_LABELS: Record<string, string> = {
  executive: "Executive",
  operations: "Operations",
  finance: "Finance",
  marketing: "Marketing",
  hr: "HR",
  artist: "Artist / Booking",
  technical: "Technical",
  field: "Field / Venue",
};

export default function JobTitleLibraryClient() {
  const toast = useToast();
  const [titles, setTitles] = useState<JobTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJobTitles();
      setTitles(data);
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Job titles could not be loaded.");
      setTitles([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const categories = Array.from(new Set(titles.map((t) => t.category).filter(Boolean))) as string[];
  const filtered =
    categoryFilter === "all"
      ? titles
      : titles.filter((t) => t.category === categoryFilter);

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Job Title Library"
        subtitle="62 standard job titles. Kept separate from RBAC roles and assignments."
      >
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="ui-input w-40 py-2 text-sm"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c] ?? c}
            </option>
          ))}
        </select>
      </PageHeader>

      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 overflow-hidden backdrop-blur-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--color-surface2)]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <p className="text-sm font-medium text-[var(--color-text)]">No job titles found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Job Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Rank</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-[var(--color-border)] transition hover:bg-[var(--color-surface-hover)]/30"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--color-text)]">{t.name}</td>
                    <td className="px-4 py-3">
                      <span className="rounded px-2 py-0.5 text-xs font-medium bg-[var(--color-surface2)] ui-text-secondary">
                        {CATEGORY_LABELS[t.category ?? ""] ?? t.category ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm ui-text-muted">{t.rank_order}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
