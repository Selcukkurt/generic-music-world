"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/shell/PageHeader";
import { useToast } from "@/components/ui/ToastProvider";
import {
  fetchEventAssignments,
  createEventAssignment,
  updateEventAssignment,
  deleteEventAssignment,
  type EventAssignmentWithDetails,
  type CreateEventAssignmentPayload,
} from "@/lib/m04/kadro";
import { fetchEvents } from "@/lib/events/data";
import { fetchPersonnel } from "@/lib/m04/personnel";
import { fetchJobTitles } from "@/lib/org-structure/data";
function formatDate(s: string | null | undefined): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("tr-TR");
  } catch {
    return s;
  }
}

function getPersonDisplay(a: EventAssignmentWithDetails): string {
  const p = a.personnel;
  if (!p) return "—";
  if ((p as { full_name?: string | null }).full_name?.trim()) return (p as { full_name: string }).full_name.trim();
  const first = (p as { first_name?: string | null }).first_name?.trim() ?? "";
  const last = (p as { last_name?: string | null }).last_name?.trim() ?? "";
  return [first, last].filter(Boolean).join(" ") || "—";
}

export default function EventAssignmentsClient() {
  const router = useRouter();
  const toast = useToast();
  const [list, setList] = useState<EventAssignmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "completed" | "cancelled" | "all">("active");
  const [modalOpen, setModalOpen] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<EventAssignmentWithDetails | null>(null);
  const [events, setEvents] = useState<Array<{ id: string; name: string; date: string }>>([]);
  const [personnel, setPersonnel] = useState<Array<{ id: string; first_name: string | null; last_name: string | null }>>([]);
  const [jobTitles, setJobTitles] = useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = useState<CreateEventAssignmentPayload>({
    personnel_id: "",
    event_id: "",
    job_title_id: "",
    assignment_type: "primary",
    start_date: null,
    end_date: null,
    status: "active",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [assigns, evs, pers, jt] = await Promise.all([
        fetchEventAssignments({ status: statusFilter, search: search.trim() || undefined }),
        fetchEvents(),
        fetchPersonnel({ page: 1, pageSize: 100 }).then((r) => r.data),
        fetchJobTitles(),
      ]);
      setList(assigns);
      setEvents((evs as { id: string; name: string; date: string }[]).map((e) => ({ id: e.id, name: e.name, date: e.date })));
      setPersonnel(pers.map((p) => ({ id: p.id, first_name: p.first_name, last_name: p.last_name })));
      setJobTitles(jt.map((j) => ({ id: j.id, name: j.name })));
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Atamalar yüklenemedi.");
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      personnel_id: "",
      event_id: events[0]?.id ?? "",
      job_title_id: jobTitles[0]?.id ?? "",
      assignment_type: "primary",
      start_date: null,
      end_date: null,
      status: "active",
    });
    setModalOpen("create");
  };

  const openEdit = (a: EventAssignmentWithDetails) => {
    setEditing(a);
    setForm({
      personnel_id: a.personnel_id,
      event_id: a.event_id,
      job_title_id: a.job_title_id,
      assignment_type: a.assignment_type as "primary" | "acting",
      start_date: a.start_date ?? null,
      end_date: a.end_date ?? null,
      status: (a.status as "active" | "completed" | "cancelled") ?? "active",
    });
    setModalOpen("edit");
  };

  const handleSave = async () => {
    if (!form.personnel_id || !form.event_id || !form.job_title_id) {
      toast.error("Hata", "Personel, etkinlik ve unvan zorunludur.");
      return;
    }
    setSaving(true);
    try {
      if (modalOpen === "create") {
        await createEventAssignment(form);
        toast.success("Başarılı", "Atama oluşturuldu.");
      } else if (editing) {
        await updateEventAssignment(editing.id, form);
        toast.success("Başarılı", "Atama güncellendi.");
      }
      setModalOpen(null);
      setEditing(null);
      load();
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Kaydetme başarısız.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu atamayı silmek istediğinize emin misiniz?")) return;
    try {
      await deleteEventAssignment(id);
      toast.success("Başarılı", "Atama silindi.");
      load();
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Silme başarısız.");
    }
  };

  const filtered = list.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const evName = a.etkinlik_events?.name ?? "";
    const orgName = a.org_units?.name ?? "";
    const jtName = a.job_titles?.name ?? "";
    const personName = getPersonDisplay(a);
    return (
      evName.toLowerCase().includes(q) ||
      orgName.toLowerCase().includes(q) ||
      jtName.toLowerCase().includes(q) ||
      personName.toLowerCase().includes(q)
    );
  });

  const statusLabel = (s: string | undefined) => (s === "active" ? "Aktif" : s === "completed" ? "Tamamlandı" : s === "cancelled" ? "İptal" : "—");

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Etkinlik Kadro Atama"
        subtitle="Etkinliklere personel atama ve kadro planlama. Atama, RBAC ve Unvan katmanlarından ayrıdır."
      >
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Etkinlik, birim, unvan, personel ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            className="ui-input w-56 py-2 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="ui-input w-32 py-2 text-sm"
          >
            <option value="active">Aktif</option>
            <option value="completed">Tamamlandı</option>
            <option value="cancelled">İptal</option>
            <option value="all">Tümü</option>
          </select>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Yeni Atama
          </button>
        </div>
      </PageHeader>

      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 overflow-hidden backdrop-blur-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--color-surface2)]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <p className="text-sm font-medium text-[var(--color-text)]">Atama bulunamadı.</p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-3 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              Yeni Atama Ekle
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Etkinlik</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Organizasyon Birimi</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Pozisyon</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Atanan Personel</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Atama Tipi</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Başlangıç</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Bitiş</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Durum</th>
                  <th className="px-4 py-3 text-right text-xs font-medium ui-text-muted">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="border-b border-[var(--color-border)] transition hover:bg-[var(--color-surface-hover)]/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--color-text)]">{a.etkinlik_events?.name ?? "—"}</p>
                      <p className="text-xs ui-text-muted">{formatDate(a.etkinlik_events?.date)}</p>
                    </td>
                    <td className="px-4 py-3 text-sm ui-text-secondary">{a.org_units?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-sm ui-text-secondary">{a.job_titles?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-sm ui-text-secondary">{getPersonDisplay(a)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded px-2 py-0.5 text-xs font-medium bg-[var(--color-surface2)]">
                        {a.assignment_type === "primary" ? "Asıl" : "Vekil"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm ui-text-secondary">{formatDate(a.start_date)}</td>
                    <td className="px-4 py-3 text-sm ui-text-secondary">{formatDate(a.end_date)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          a.status === "active"
                            ? "bg-emerald-500/20 text-emerald-200"
                            : a.status === "completed"
                              ? "bg-slate-500/20 text-slate-400"
                              : "bg-red-500/20 text-red-300"
                        }`}
                      >
                        {statusLabel(a.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(a)}
                        className="rounded px-2 py-1 text-xs font-medium ui-text-secondary hover:bg-[var(--color-surface-hover)]"
                      >
                        Düzenle
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(a.id)}
                        className="ml-2 rounded px-2 py-1 text-xs font-medium text-red-300 hover:bg-red-500/20"
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setModalOpen(null)}
          onKeyDown={(e) => e.key === "Escape" && setModalOpen(null)}
          role="button"
          tabIndex={0}
          aria-modal="true"
        >
          <div
            className="ui-glass w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">
              {modalOpen === "create" ? "Yeni Atama" : "Atama Düzenle"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium ui-text-secondary">Etkinlik *</label>
                <select
                  value={form.event_id}
                  onChange={(e) => setForm((f) => ({ ...f, event_id: e.target.value }))}
                  className="ui-input w-full"
                >
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({formatDate(e.date)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium ui-text-secondary">Personel *</label>
                <select
                  value={form.personnel_id}
                  onChange={(e) => setForm((f) => ({ ...f, personnel_id: e.target.value }))}
                  className="ui-input w-full"
                >
                  <option value="">Seçin</option>
                  {personnel.map((p) => (
                    <option key={p.id} value={p.id}>
                      {[p.first_name, p.last_name].filter(Boolean).join(" ") || p.id.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium ui-text-secondary">Unvan / Pozisyon *</label>
                <select
                  value={form.job_title_id}
                  onChange={(e) => setForm((f) => ({ ...f, job_title_id: e.target.value }))}
                  className="ui-input w-full"
                >
                  {jobTitles.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium ui-text-secondary">Atama Tipi</label>
                <select
                  value={form.assignment_type}
                  onChange={(e) => setForm((f) => ({ ...f, assignment_type: e.target.value as "primary" | "acting" }))}
                  className="ui-input w-full"
                >
                  <option value="primary">Asıl</option>
                  <option value="acting">Vekil</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium ui-text-secondary">Başlangıç</label>
                  <input
                    type="date"
                    value={form.start_date ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value || null }))}
                    className="ui-input w-full"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium ui-text-secondary">Bitiş</label>
                  <input
                    type="date"
                    value={form.end_date ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value || null }))}
                    className="ui-input w-full"
                  />
                </div>
              </div>
              {modalOpen === "edit" && (
                <div>
                  <label className="mb-1 block text-sm font-medium ui-text-secondary">Durum</label>
                  <select
                    value={form.status ?? "active"}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as "active" | "completed" | "cancelled" }))}
                    className="ui-input w-full"
                  >
                    <option value="active">Aktif</option>
                    <option value="completed">Tamamlandı</option>
                    <option value="cancelled">İptal</option>
                  </select>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(null)}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium ui-text-secondary hover:bg-[var(--color-surface-hover)]"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
