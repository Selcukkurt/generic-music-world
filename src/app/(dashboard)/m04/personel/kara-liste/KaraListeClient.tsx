"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/shell/PageHeader";
import { useToast } from "@/components/ui/ToastProvider";
import { fetchPersonnel, updatePersonnel, getFullName } from "@/lib/m04/personnel";
import type { PersonnelRecord } from "@/lib/m04/personnel";

function formatDate(s: string | null | undefined): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("tr-TR");
  } catch {
    return s;
  }
}

export default function KaraListeClient() {
  const router = useRouter();
  const toast = useToast();
  const [list, setList] = useState<PersonnelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "blacklist" | "ok">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchPersonnel({
        search: appliedSearch.trim() || undefined,
        status: "all",
        blacklist: filterMode === "blacklist" ? true : filterMode === "ok" ? false : undefined,
        page: 1,
        pageSize: 500,
      });
      setList(result.data);
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Kara liste verileri yüklenemedi.");
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, filterMode, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (r: PersonnelRecord) => {
    setEditingId(r.id);
    setEditNotes(r.notes ?? "");
  };

  const closeEdit = () => {
    setEditingId(null);
    setEditNotes("");
  };

  const handleAddBlacklist = async (id: string, notes: string) => {
    setSaving(true);
    try {
      await updatePersonnel(id, { status: "blacklist", notes: notes.trim() || undefined });
      toast.success("Başarılı", "Kara listeye eklendi.");
      closeEdit();
      load();
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Güncellenemedi.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveBlacklist = async (id: string) => {
    setSaving(true);
    try {
      await updatePersonnel(id, { status: "active", notes: null });
      toast.success("Başarılı", "Kara listeden çıkarıldı.");
      closeEdit();
      load();
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Güncellenemedi.");
    } finally {
      setSaving(false);
    }
  };

  const blacklistCount = list.filter((r) => r.status === "blacklist").length;

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Kara Liste"
        subtitle="Blacklist yönetimi ve risk notları. Personel kara listesi."
      >
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Ad, e-posta, TC ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (setAppliedSearch(search), e.preventDefault())}
            className="ui-input w-56 py-2 text-sm"
          />
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as "all" | "blacklist" | "ok")}
            className="ui-input w-36 py-2 text-sm"
          >
            <option value="all">Tümü</option>
            <option value="blacklist">Kara Listede</option>
            <option value="ok">Kara Liste Dışı</option>
          </select>
          <button
            type="button"
            onClick={() => setAppliedSearch(search)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
          >
            Filtrele
          </button>
        </div>
      </PageHeader>

      {filterMode === "all" && blacklistCount > 0 && (
        <div className="ui-glass rounded-xl border border-red-500/30 bg-red-500/5 p-4 backdrop-blur-sm">
          <p className="text-sm font-medium text-[var(--color-text)]">
            {blacklistCount} personel kara listede
          </p>
        </div>
      )}

      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 overflow-hidden backdrop-blur-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--color-surface2)]" />
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <p className="text-sm font-medium text-[var(--color-text)]">
              {appliedSearch || filterMode !== "all"
                ? "Bu filtrelerle sonuç bulunamadı."
                : "Henüz personel kaydı yok."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Personel</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Unvan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Organizasyon Birimi</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Kara Liste Durumu</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Gerekçe</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Son Güncelleme</th>
                  <th className="px-4 py-3 text-right text-xs font-medium ui-text-muted">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {list.map((record) => (
                  <tr
                    key={record.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/m04/personel/kart?id=${record.id}`)}
                    onKeyDown={(e) => e.key === "Enter" && router.push(`/m04/personel/kart?id=${record.id}`)}
                    className={`cursor-pointer border-b border-[var(--color-border)] transition hover:bg-[var(--color-surface-hover)]/30 ${
                      record.status === "blacklist" ? "bg-red-500/5" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--color-text)]">{getFullName(record)}</p>
                      <p className="text-xs ui-text-muted">{record.email ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-sm ui-text-secondary">{record.job_titles?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-sm ui-text-secondary">{record.org_units?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${
                          record.status === "blacklist"
                            ? "bg-red-500/25 text-red-300 ring-1 ring-red-500/40"
                            : "bg-emerald-500/20 text-emerald-200"
                        }`}
                      >
                        {record.status === "blacklist" && (
                          <span className="text-xs" aria-hidden>⚠</span>
                        )}
                        {record.status === "blacklist" ? "Kara Liste" : "Normal"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm ui-text-secondary max-w-[200px] truncate">
                      {record.notes ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm ui-text-muted">
                      {formatDate(record.updated_at)}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {editingId === record.id ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="ui-input w-full min-w-[180px] text-sm"
                            rows={2}
                            placeholder="Gerekçe / not ekleyin"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={closeEdit}
                              className="rounded px-2 py-1 text-xs font-medium ui-text-secondary hover:bg-[var(--color-surface-hover)]"
                            >
                              İptal
                            </button>
                            {record.status === "blacklist" ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleAddBlacklist(record.id, editNotes)}
                                  disabled={saving}
                                  className="rounded bg-[var(--color-primary)]/20 px-2 py-1 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/30 disabled:opacity-50"
                                >
                                  Notu Kaydet
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBlacklist(record.id)}
                                  disabled={saving}
                                  className="rounded bg-emerald-500/20 px-2 py-1 text-xs font-medium text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-50"
                                >
                                  Çıkar
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAddBlacklist(record.id, editNotes)}
                                disabled={saving}
                                className="rounded bg-red-500/20 px-2 py-1 text-xs font-medium text-red-300 hover:bg-red-500/30 disabled:opacity-50"
                              >
                                Kara Listeye Ekle
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openEdit(record)}
                          className="rounded px-2 py-1 text-xs font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                        >
                          {record.status === "blacklist" ? "Düzenle / Çıkar" : "Kara Listeye Ekle"}
                        </button>
                      )}
                    </td>
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
