"use client";

import type { Task } from "@/lib/tasks/types";
import { priorityBadgeClass } from "@/lib/tasks/types";

type Props = {
  tasks: Task[];
  loading: boolean;
  onSelectTask: (task: Task) => void;
  onRestore: (task: Task) => void;
  selectedId?: string | null;
};

export default function ArchiveView({ tasks, loading, onSelectTask, onRestore, selectedId }: Props) {
  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--color-surface2)]" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-16 text-center backdrop-blur-sm">
        <p className="text-sm font-medium text-[var(--color-text)]">Arşiv boş.</p>
      </div>
    );
  }

  return (
    <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 overflow-hidden backdrop-blur-sm">
      <div className="divide-y divide-[var(--color-border)]">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`flex items-center justify-between gap-4 p-4 transition hover:bg-[var(--color-surface-hover)]/30 ${
              selectedId === task.id ? "bg-[var(--brand-yellow)]/10" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectTask(task)}
              className="flex flex-1 items-center gap-3 text-left"
            >
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${priorityBadgeClass(task.priority)}`}>
                {task.priority}
              </span>
              <span className="font-medium text-[var(--color-text)]">{task.title}</span>
              {task.archived_at && (
                <span className="text-xs ui-text-muted">
                  Arşivlendi: {new Date(task.archived_at).toLocaleDateString("tr-TR")}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRestore(task);
              }}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-3 py-1.5 text-xs font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
            >
              Geri Yükle
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
