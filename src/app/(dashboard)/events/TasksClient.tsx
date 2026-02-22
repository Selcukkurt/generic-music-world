"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/shell/PageHeader";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/components/ui/ToastProvider";
import {
  fetchDefaultBoard,
  fetchTasksForBoard,
  createTask,
  updateTask,
  moveTask,
  archiveTask,
  restoreTask,
} from "@/lib/tasks/data";
import type { Task, TaskBoard } from "@/lib/tasks/types";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/tasks/types";
import KanbanView from "./KanbanView";
import MonthView from "./MonthView";
import ArchiveView from "./ArchiveView";
import TaskDrawer from "./TaskDrawer";

type ViewMode = "kanban" | "month" | "archive";

export default function TasksClient() {
  const toast = useToast();
  const { user } = useCurrentUser();
  const [board, setBoard] = useState<TaskBoard | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState<"all" | "me">("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createPrefillStatus, setCreatePrefillStatus] = useState<Task["status"] | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);
  const setMonthOffsetWrapper = useCallback((delta: number) => {
    if (delta === 0) setMonthOffset(0);
    else setMonthOffset((m) => m + delta);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const b = await fetchDefaultBoard();
      setBoard(b);
      if (!b) {
        setTasks([]);
        return;
      }
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0, 23, 59, 59);
      const monthRange =
        viewMode === "month"
          ? {
              from: monthStart.toISOString(),
              to: monthEnd.toISOString(),
            }
          : undefined;

      const list = await fetchTasksForBoard(
        b.id,
        viewMode,
        {
          search: appliedSearch.trim() || undefined,
          assignee: assigneeFilter,
          priority: priorityFilter !== "all" ? priorityFilter : undefined,
          tag: tagFilter !== "all" ? tagFilter : undefined,
        },
        user?.id ?? "",
        monthRange
      );
      setTasks(list);
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Görevler yüklenemedi.");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, viewMode, appliedSearch, assigneeFilter, priorityFilter, tagFilter, monthOffset, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!user || !board) return;
      const form = e.currentTarget;
      const title = (form.elements.namedItem("title") as HTMLInputElement).value.trim();
      const description = (form.elements.namedItem("description") as HTMLTextAreaElement).value.trim() || null;
      const status = (form.elements.namedItem("status") as HTMLSelectElement).value as Task["status"];
      const priority = (form.elements.namedItem("priority") as HTMLSelectElement).value as Task["priority"];
      const dueDate = (form.elements.namedItem("due_date") as HTMLInputElement).value || null;
      const tagsInput = (form.elements.namedItem("tags") as HTMLInputElement).value.trim();
      const tags = tagsInput ? tagsInput.split(/[,\s]+/).filter(Boolean) : [];
      if (!title) {
        toast.error("Hata", "Başlık gerekli.");
        return;
      }
      setCreateSubmitting(true);
      try {
        const created = await createTask(user.id, board.id, {
          title,
          description,
          status,
          priority,
          due_date: dueDate || null,
          tags,
        });
        setTasks((prev) => [created, ...prev]);
        setShowCreateModal(false);
        setSelectedTask(created);
        toast.success("Tamamlandı", "Görev oluşturuldu.");
      } catch (err) {
        toast.error("Hata", err instanceof Error ? err.message : "Görev oluşturulamadı.");
      } finally {
        setCreateSubmitting(false);
      }
    },
    [user, board, toast]
  );

  const handleUpdateTask = useCallback(
    async (updated: Task) => {
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      if (selectedTask?.id === updated.id) setSelectedTask(updated);
    },
    [selectedTask?.id]
  );

  const handleMoveTask = useCallback(
    async (taskId: string, newStatus: Task["status"], newOrderIndex: number) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      const prev = [...tasks];
      const moved = {
        ...task,
        status: newStatus,
        order_index: newOrderIndex,
        completed_at: newStatus === "done" ? new Date().toISOString() : task.completed_at,
      };
      setTasks((list) =>
        list
          .map((t) => (t.id === taskId ? moved : t))
          .sort((a, b) => {
            const statusOrder = { todo: 0, doing: 1, done: 2 };
            if (a.status !== b.status) return statusOrder[a.status] - statusOrder[b.status];
            return a.order_index - b.order_index;
          })
      );
      try {
        await moveTask(taskId, newStatus, newOrderIndex);
      } catch {
        setTasks(prev);
        toast.error("Hata", "Taşıma başarısız.");
      }
    },
    [tasks, toast]
  );

  const handleArchive = useCallback(
    async (task: Task) => {
      const prev = [...tasks];
      setTasks((list) => list.filter((t) => t.id !== task.id));
      if (selectedTask?.id === task.id) setSelectedTask(null);
      try {
        await archiveTask(task.id);
        toast.success("Tamamlandı", "Görev arşivlendi.");
      } catch {
        setTasks(prev);
        toast.error("Hata", "Arşivleme başarısız.");
      }
    },
    [tasks, selectedTask?.id, toast]
  );

  const handleRestore = useCallback(
    async (task: Task) => {
      const prev = [...tasks];
      setTasks((list) => list.filter((t) => t.id !== task.id));
      if (selectedTask?.id === task.id) setSelectedTask(null);
      try {
        await restoreTask(task.id);
        toast.success("Tamamlandı", "Görev geri yüklendi.");
      } catch {
        setTasks(prev);
        toast.error("Hata", "Geri yükleme başarısız.");
      }
    },
    [tasks, selectedTask?.id, toast]
  );

  const allTags = Array.from(new Set(tasks.flatMap((t) => t.tags))).sort();

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Görev Merkezi"
        subtitle="Ekip görevlerini Kanban ile yönet; tamamlananları aylık görünümde takip et."
      >
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), setAppliedSearch(search))}
            className="ui-input w-40 py-2 text-sm"
          />
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value as "all" | "me")}
            className="ui-input w-36 py-2 text-sm"
          >
            <option value="all">Tümü</option>
            <option value="me">Bana Atanan</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="ui-input w-32 py-2 text-sm"
          >
            <option value="all">Öncelik</option>
            {TASK_PRIORITIES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          {allTags.length > 0 && (
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="ui-input w-28 py-2 text-sm"
            >
              <option value="all">Etiket</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => setAppliedSearch(search)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
          >
            Filtrele
          </button>
          <div className="flex rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] p-0.5">
            {(["kanban", "month", "archive"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setViewMode(m)}
                className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                  viewMode === m ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow" : "ui-text-muted hover:text-[var(--color-text)]"
                }`}
              >
                {m === "kanban" ? "Kanban" : m === "month" ? "Aylık" : "Arşiv"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setCreatePrefillStatus(null);
              setShowCreateModal(true);
            }}
            className="ui-button-primary rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Yeni Görev
          </button>
        </div>
      </PageHeader>

      {!board ? (
        <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 text-center backdrop-blur-sm">
          <p className="text-sm ui-text-muted">Henüz tahta yok. Veritabanında varsayılan tahta oluşturun.</p>
        </div>
      ) : viewMode === "kanban" ? (
        <KanbanView
          tasks={tasks}
          loading={loading}
          onSelectTask={setSelectedTask}
          onMoveTask={handleMoveTask}
          onAddToColumn={(status) => {
            setCreatePrefillStatus(status);
            setShowCreateModal(true);
          }}
          selectedId={selectedTask?.id}
        />
      ) : viewMode === "month" ? (
        <MonthView
          tasks={tasks}
          loading={loading}
          monthOffset={monthOffset}
          onMonthChange={setMonthOffsetWrapper}
          onSelectTask={setSelectedTask}
          selectedId={selectedTask?.id}
        />
      ) : (
        <ArchiveView
          tasks={tasks}
          loading={loading}
          onSelectTask={setSelectedTask}
          onRestore={handleRestore}
          selectedId={selectedTask?.id}
        />
      )}

      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdateTask}
          onArchive={handleArchive}
          onRestore={handleRestore}
        />
      )}

      {showCreateModal && board && (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Yeni Görev</h2>
            <form key={createPrefillStatus ?? "default"} onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Başlık</label>
                <input name="title" type="text" className="ui-input w-full" placeholder="Görev başlığı" required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Açıklama</label>
                <textarea name="description" className="ui-input w-full min-h-[80px]" placeholder="Detaylar" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium ui-text-muted">Durum</label>
                  <select name="status" className="ui-input w-full" defaultValue={createPrefillStatus ?? "todo"}>
                    {TASK_STATUSES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium ui-text-muted">Öncelik</label>
                  <select name="priority" className="ui-input w-full">
                    {TASK_PRIORITIES.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Bitiş Tarihi</label>
                <input name="due_date" type="date" className="ui-input w-full" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Etiketler (virgülle ayırın)</label>
                <input name="tags" type="text" className="ui-input w-full" placeholder="örn: acil, frontend" />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="ui-button-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {createSubmitting ? "Oluşturuluyor…" : "Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
