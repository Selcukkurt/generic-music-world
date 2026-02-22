"use client";

import { useCallback, useState } from "react";
import type { Task } from "@/lib/tasks/types";
import { TASK_STATUSES, priorityBadgeClass, priorityIndicatorClass } from "@/lib/tasks/types";

type Props = {
  tasks: Task[];
  loading: boolean;
  onSelectTask: (task: Task) => void;
  onMoveTask: (taskId: string, newStatus: Task["status"], newOrderIndex: number) => void;
  onAddToColumn?: (status: Task["status"]) => void;
  selectedId?: string | null;
};

const STATUS_ORDER: Task["status"][] = ["todo", "doing", "done"];

function TaskCard({
  task,
  isSelected,
  onClick,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  isSelected: boolean;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onClick())}
      className={`group cursor-grab rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition hover:border-[var(--color-border)]/80 hover:bg-[var(--color-surface-hover)]/50 active:cursor-grabbing ${
        isSelected ? "ring-2 ring-[var(--brand-yellow)]" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${priorityIndicatorClass(task.priority)}`} />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-[var(--color-text)] truncate">{task.title}</p>
          {task.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {task.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-[var(--color-surface2)] ui-text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${priorityBadgeClass(task.priority)}`}>
              {task.priority}
            </span>
            {task.due_date && (
              <span className="text-[10px] ui-text-muted">
                {new Date(task.due_date).toLocaleDateString("tr-TR")}
              </span>
            )}
            {task.assignee_id && (
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-yellow)]/20 text-[10px] font-semibold text-[var(--brand-yellow)]"
                title="Atanan"
              >
                ?
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Column({
  status,
  tasks,
  selectedId,
  onSelectTask,
  onMoveTask,
  onAddToColumn,
  dragOverId,
  onDragOver,
  onDragLeave,
}: {
  status: Task["status"];
  tasks: Task[];
  selectedId?: string | null;
  onSelectTask: (task: Task) => void;
  onMoveTask: (taskId: string, newStatus: Task["status"], newOrderIndex: number) => void;
  onAddToColumn?: (status: Task["status"]) => void;
  dragOverId: string | null;
  onDragOver: (id: string) => void;
  onDragLeave: () => void;
}) {
  const label = TASK_STATUSES.find((s) => s.id === status)?.label ?? status;
  const isDragOver = dragOverId === status;

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData("task-id");
      if (!taskId) return;
      onMoveTask(taskId, status, tasks.length);
      onDragLeave();
    },
    [status, tasks.length, onMoveTask, onDragLeave]
  );

  const handleAddClick = useCallback(() => {
    onAddToColumn?.(status);
  }, [status, onAddToColumn]);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      onDragOver(status);
    },
    [status, onDragOver]
  );

  return (
    <div
      className={`flex min-w-[280px] max-w-[320px] flex-1 flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 transition ${
        isDragOver ? "border-[var(--brand-yellow)]/50 bg-[var(--brand-yellow)]/5" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={onDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <h3 className="font-semibold text-[var(--color-text)]">{label}</h3>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[var(--color-surface2)] px-2 py-0.5 text-xs font-medium ui-text-muted">
            {tasks.length}
          </span>
          {onAddToColumn && (
            <button
              type="button"
              onClick={handleAddClick}
              className="rounded p-1 text-xs ui-text-muted transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
              title="Bu sütuna ekle"
            >
              +
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            isSelected={selectedId === task.id}
            onClick={() => onSelectTask(task)}
            onDragStart={(e) => {
              e.dataTransfer.setData("task-id", task.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={() => onDragLeave()}
          />
        ))}
      </div>
    </div>
  );
}

export default function KanbanView({ tasks, loading, onSelectTask, onMoveTask, onAddToColumn, selectedId }: Props) {
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const byStatus = useCallback(
    (status: Task["status"]) =>
      tasks
        .filter((t) => t.status === status)
        .sort((a, b) => a.order_index - b.order_index),
    [tasks]
  );

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--color-surface2)]" />
      </div>
    );
  }

  const hasTasks = tasks.length > 0;

  return (
    <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 overflow-hidden backdrop-blur-sm">
      {hasTasks ? (
        <div className="flex gap-4 overflow-x-auto p-4">
          {STATUS_ORDER.map((status) => (
            <Column
              key={status}
              status={status}
              tasks={byStatus(status)}
              selectedId={selectedId}
              onSelectTask={onSelectTask}
              onMoveTask={onMoveTask}
              onAddToColumn={onAddToColumn}
              dragOverId={dragOverId}
              onDragOver={setDragOverId}
              onDragLeave={() => setDragOverId(null)}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-[400px] flex-col items-center justify-center py-16">
          <p className="text-sm font-medium text-[var(--color-text)]">Henüz görev yok.</p>
          <p className="mt-1 text-xs ui-text-muted">Yeni Görev ile başlayın.</p>
        </div>
      )}
    </div>
  );
}
