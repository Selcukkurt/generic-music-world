"use client";

import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { updateTask } from "@/lib/tasks/data";
import type { Task } from "@/lib/tasks/types";
import { TASK_STATUSES, TASK_PRIORITIES, priorityBadgeClass } from "@/lib/tasks/types";

type Props = {
  task: Task;
  onClose: () => void;
  onUpdate: (task: Task) => void;
  onArchive: (task: Task) => void;
  onRestore: (task: Task) => void;
};

export default function TaskDrawer({ task, onClose, onUpdate, onArchive, onRestore }: Props) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: task.title,
    description: task.description ?? "",
    status: task.status,
    priority: task.priority,
    due_date: task.due_date ?? "",
    tags: task.tags.join(", "),
  });

  useEffect(() => {
    setForm({
      title: task.title,
      description: task.description ?? "",
      status: task.status,
      priority: task.priority,
      due_date: task.due_date ?? "",
      tags: task.tags.join(", "),
    });
  }, [task.id]);

  const handleSave = useCallback(async () => {
    setSubmitting(true);
    try {
      await updateTask(task.id, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: form.status as Task["status"],
        priority: form.priority as Task["priority"],
        due_date: form.due_date || null,
        tags: form.tags ? form.tags.split(/[,\s]+/).filter(Boolean) : [],
      });
      const updated: Task = {
        ...task,
        ...form,
        description: form.description.trim() || null,
        due_date: form.due_date || null,
        tags: form.tags ? form.tags.split(/[,\s]+/).filter(Boolean) : [],
        completed_at: form.status === "done" ? (task.completed_at ?? new Date().toISOString()) : task.completed_at,
      };
      onUpdate(updated);
      setEditing(false);
      toast.success("Tamamlandı", "Görev güncellendi.");
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Güncelleme başarısız.");
    } finally {
      setSubmitting(false);
    }
  }, [task, form, onUpdate, toast]);

  return (
    <>
      <div
        className="fixed inset-0 z-[var(--z-modal)] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed right-0 top-0 z-[var(--z-modal)] flex h-full w-full max-w-md flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-drawer-title"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <h2 id="task-drawer-title" className="font-semibold text-[var(--color-text)]">
            Görev Detayı
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 ui-text-muted transition hover:bg-[var(--color-surface-hover)]"
            aria-label="Kapat"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Başlık</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="ui-input w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Açıklama</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="ui-input w-full min-h-[80px]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Durum</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Task["status"] }))}
                  className="ui-input w-full"
                >
                  {TASK_STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Öncelik</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as Task["priority"] }))}
                  className="ui-input w-full"
                >
                  {TASK_PRIORITIES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Bitiş Tarihi</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                  className="ui-input w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Etiketler (virgülle ayırın)</label>
                <input
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  className="ui-input w-full"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={submitting || !form.title.trim()}
                  className="ui-button-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {submitting ? "Kaydediliyor…" : "Kaydet"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text)]">{task.title}</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${priorityBadgeClass(task.priority)}`}>
                    {task.priority}
                  </span>
                  <span className="rounded px-2 py-0.5 text-xs font-medium bg-[var(--color-surface2)] ui-text-muted">
                    {TASK_STATUSES.find((s) => s.id === task.status)?.label}
                  </span>
                </div>
              </div>
              {task.description && (
                <p className="text-sm ui-text-secondary">{task.description}</p>
              )}
              {task.due_date && (
                <p className="text-sm ui-text-muted">
                  Bitiş: {new Date(task.due_date).toLocaleDateString("tr-TR")}
                </p>
              )}
              {task.completed_at && (
                <p className="text-sm ui-text-muted">
                  Tamamlandı: {new Date(task.completed_at).toLocaleString("tr-TR")}
                </p>
              )}
              {task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {task.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded px-2 py-0.5 text-xs font-medium bg-[var(--color-surface2)] ui-text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
                >
                  Düzenle
                </button>
                {!task.is_archived ? (
                  <button
                    type="button"
                    onClick={() => onArchive(task)}
                    className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-500/20"
                  >
                    Arşivle
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onRestore(task)}
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20"
                  >
                    Geri Yükle
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
