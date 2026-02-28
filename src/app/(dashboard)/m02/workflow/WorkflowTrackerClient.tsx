"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/shell/PageHeader";
import { useI18n } from "@/i18n/LocaleProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { fetchEvents } from "@/lib/events/data";
import {
  fetchWorkflowSteps,
  fetchWorkflowTasks,
  fetchAllTasksForEvent,
  updateWorkflowStep,
  updateWorkflowTask,
  createWorkflowTask,
} from "@/lib/workflow/data";
import type { EtkinlikEvent } from "@/lib/events/types";
import type { WorkflowStep, WorkflowTask, StepStatus, TaskPriority } from "@/lib/workflow/types";

const STEP_STATUS_OPTIONS: { id: StepStatus; label: string }[] = [
  { id: "not_started", label: "Başlamadı" },
  { id: "in_progress", label: "Devam Ediyor" },
  { id: "done", label: "Tamamlandı" },
  { id: "blocked", label: "Engellendi" },
];

const STEP_STATUS_CLASS: Record<StepStatus, string> = {
  not_started: "bg-zinc-500/20 text-zinc-400",
  in_progress: "bg-amber-500/20 text-amber-400",
  done: "bg-emerald-500/20 text-emerald-400",
  blocked: "bg-red-500/20 text-red-400",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Düşük",
  medium: "Orta",
  high: "Yüksek",
};

const MOCK_EVENTS: EtkinlikEvent[] = [
  {
    id: "mock-ev-1",
    name: "Örnek Etkinlik",
    date: "2026-07-15",
    venue: "Örnek Mekan",
    status: "PLANLAMA",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: null,
    description: null,
    metadata: {},
  },
];

const MOCK_ACTIVITY = [
  { id: "1", text: "Sözleşme imzala tamamlandı", time: "2 saat önce" },
  { id: "2", text: "Mekan onayı görevi eklendi", time: "5 saat önce" },
  { id: "3", text: "Planlama adımı devam ediyor olarak işaretlendi", time: "1 gün önce" },
  { id: "4", text: "Bütçe onayı tamamlandı", time: "1 gün önce" },
  { id: "5", text: "Yeni adım eklendi: Prodüksiyon", time: "2 gün önce" },
];

function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[var(--color-text)]">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export default function WorkflowTrackerClient() {
  const { t } = useI18n();
  const toast = useToast();
  const [events, setEvents] = useState<EtkinlikEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [allTasks, setAllTasks] = useState<WorkflowTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [useMock, setUseMock] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      const list = await fetchEvents();
      setEvents(list);
      if (list.length > 0 && !selectedEventId) {
        setSelectedEventId(list[0].id);
      }
    } catch {
      setEvents(MOCK_EVENTS);
      setSelectedEventId(MOCK_EVENTS[0]?.id ?? null);
    }
  }, [selectedEventId]);

  const loadStepsAndTasks = useCallback(async (eventId: string) => {
    setLoading(true);
    try {
      const [stepsData, allTasksData] = await Promise.all([
        fetchWorkflowSteps(eventId),
        fetchAllTasksForEvent(eventId),
      ]);
      setSteps(stepsData);
      setAllTasks(allTasksData);
      setSelectedStepId(stepsData[0]?.id ?? null);
    } catch {
      const stepsData = await fetchWorkflowSteps(eventId);
      const allTasksData = await fetchAllTasksForEvent(eventId);
      setSteps(stepsData);
      setAllTasks(allTasksData);
      setSelectedStepId(stepsData[0]?.id ?? null);
      setUseMock(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadStepsAndTasks(selectedEventId);
    } else {
      setSteps([]);
      setTasks([]);
      setAllTasks([]);
      setSelectedStepId(null);
    }
  }, [selectedEventId, loadStepsAndTasks]);

  useEffect(() => {
    if (selectedStepId) {
      const stepTasks = allTasks.filter((t) => t.step_id === selectedStepId);
      setTasks(stepTasks);
    } else {
      setTasks([]);
    }
  }, [selectedStepId, allTasks]);

  const selectedStep = steps.find((s) => s.id === selectedStepId);

  const summary = {
    completed: allTasks.length > 0
      ? Math.round((allTasks.filter((t) => t.is_done).length / allTasks.length) * 100)
      : 0,
    openTasks: allTasks.filter((t) => !t.is_done).length,
    overdue: allTasks.filter((t) => {
      if (t.is_done || !t.due_date) return false;
      return new Date(t.due_date) < new Date();
    }).length,
    blockers: steps.filter((s) => s.status === "blocked").length,
  };

  const handleStepStatusChange = async (stepId: string, status: StepStatus) => {
    const step = steps.find((s) => s.id === stepId);
    if (!step) return;
    setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, status } : s)));
    try {
      await updateWorkflowStep(stepId, { status });
    } catch {
      toast.error("Hata", "Adım güncellenemedi.");
    }
  };

  const handleTaskToggle = async (task: WorkflowTask) => {
    const next = !task.is_done;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, is_done: next } : t)));
    setAllTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, is_done: next } : t)));
    try {
      await updateWorkflowTask(task.id, { is_done: next });
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, is_done: !next } : t)));
      setAllTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, is_done: !next } : t)));
      toast.error("Hata", "Görev güncellenemedi.");
    }
  };

  const handleAddTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedStepId) return;
    const form = e.currentTarget;
    const title = (form.elements.namedItem("title") as HTMLInputElement).value.trim();
    const owner = (form.elements.namedItem("owner") as HTMLInputElement).value.trim() || null;
    const due_date = (form.elements.namedItem("due_date") as HTMLInputElement).value || null;
    const priority = (form.elements.namedItem("priority") as HTMLSelectElement).value as TaskPriority;
    const notes = (form.elements.namedItem("notes") as HTMLTextAreaElement).value.trim() || null;

    if (!title) {
      toast.error("Hata", "Başlık gerekli.");
      return;
    }

    try {
      const created = await createWorkflowTask(selectedStepId, {
        title,
        owner,
        due_date,
        priority,
        notes,
      });
      setTasks((prev) => [...prev, created]);
      setAllTasks((prev) => [...prev, created]);
      setShowAddTask(false);
      toast.success("Görev eklendi", title);
    } catch {
      toast.error("Hata", "Görev eklenemedi.");
    }
  };

  const handleSaveTask = async (task: WorkflowTask, updates: Partial<WorkflowTask>) => {
    const merged = { ...task, ...updates };
    setTasks((prev) => prev.map((t) => (t.id === task.id ? merged : t)));
    setAllTasks((prev) => prev.map((t) => (t.id === task.id ? merged : t)));
    setEditingTaskId(null);
    try {
      await updateWorkflowTask(task.id, updates);
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      setAllTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      toast.error("Hata", "Görev güncellenemedi.");
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title={t("m02_workflow_title")}
        subtitle={t("m02_workflow_subtitle")}
      />

      {/* Event selector + summary chips */}
      <section className="flex flex-wrap items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-xs font-medium ui-text-muted">
            {t("m02_select_event")}
          </label>
          <select
            value={selectedEventId ?? ""}
            onChange={(e) => setSelectedEventId(e.target.value || null)}
            className="ui-input w-full"
          >
            <option value="">{t("m02_no_event_selected")}</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} · {ev.date}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-3 py-1 text-xs font-medium">
            %{summary.completed} {t("m02_workflow_completed")}
          </span>
          <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-3 py-1 text-xs font-medium">
            {summary.openTasks} {t("m02_workflow_open_tasks")}
          </span>
          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400">
            {summary.overdue} {t("m02_workflow_overdue")}
          </span>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
            {summary.blockers} {t("m02_workflow_blockers")}
          </span>
        </div>
      </section>

      {useMock && (
        <p className="text-xs ui-text-muted">
          Supabase bağlantısı yok, mock veri kullanılıyor.
        </p>
      )}

      {!selectedEventId ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-12 text-center">
          <p className="ui-text-muted text-sm">{t("m02_select_event_first")}</p>
        </div>
      ) : loading ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-12 text-center">
          <p className="ui-text-muted text-sm">{t("common_loading")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* LEFT: Steps list */}
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4">
            <h3 className="mb-4 text-sm font-semibold text-[var(--color-text)]">
              {t("m02_workflow_steps")}
            </h3>
            <ul className="space-y-2">
              {steps.map((step) => {
                const stepTasks = allTasks.filter((t) => t.step_id === step.id);
                const doneCount = stepTasks.filter((t) => t.is_done).length;
                const totalCount = stepTasks.length;
                const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

                return (
                  <li key={step.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedStepId(step.id)}
                      className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${
                        selectedStepId === step.id
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                          : "border-[var(--color-border)] hover:bg-[var(--color-surface)]/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{step.title}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${STEP_STATUS_CLASS[step.status]}`}
                        >
                          {STEP_STATUS_OPTIONS.find((s) => s.id === step.status)?.label ?? step.status}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-elevated)]">
                          <div
                            className="h-full bg-[var(--color-primary)] transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs ui-text-muted">
                          {doneCount}/{totalCount}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* RIGHT: Step detail + tasks */}
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4">
            {selectedStep ? (
              <>
                <div className="mb-4 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[var(--color-text)]">
                    {selectedStep.title}
                  </h3>
                  <select
                    value={selectedStep.status}
                    onChange={(e) =>
                      handleStepStatusChange(selectedStep.id, e.target.value as StepStatus)
                    }
                    className="ui-input w-36 text-sm"
                  >
                    {STEP_STATUS_OPTIONS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setShowAddTask(true)}
                    className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium transition hover:bg-[var(--color-surface-hover)]"
                  >
                    + {t("m02_workflow_add_task")}
                  </button>
                </div>

                <ul className="space-y-2">
                  {tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      isEditing={editingTaskId === task.id}
                      onToggle={() => handleTaskToggle(task)}
                      onEdit={() => setEditingTaskId(task.id)}
                      onSave={(updates) => handleSaveTask(task, updates)}
                      onCancel={() => setEditingTaskId(null)}
                    />
                  ))}
                </ul>

                {tasks.length === 0 && (
                  <p className="py-8 text-center text-sm ui-text-muted">
                    {t("m02_workflow_no_tasks")}
                  </p>
                )}
              </>
            ) : (
              <p className="py-8 text-center text-sm ui-text-muted">
                {t("m02_workflow_select_step")}
              </p>
            )}
          </section>
        </div>
      )}

      {/* Recent activity */}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4">
        <h3 className="mb-4 text-sm font-semibold text-[var(--color-text)]">
          {t("m02_workflow_recent_activity")}
        </h3>
        <ul className="space-y-2">
          {MOCK_ACTIVITY.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-[var(--color-border)]/50 bg-[var(--color-surface)]/40 px-3 py-2"
            >
              <span className="text-sm">{item.text}</span>
              <span className="text-xs ui-text-muted">{item.time}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Add Task Modal */}
      <Modal
        isOpen={showAddTask}
        onClose={() => setShowAddTask(false)}
        title={t("m02_workflow_add_task")}
      >
        <form onSubmit={handleAddTask} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium ui-text-muted">Başlık</label>
            <input name="title" type="text" className="ui-input w-full" required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium ui-text-muted">Sahip</label>
            <input name="owner" type="text" className="ui-input w-full" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium ui-text-muted">Bitiş Tarihi</label>
            <input name="due_date" type="date" className="ui-input w-full" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium ui-text-muted">Öncelik</label>
            <select name="priority" className="ui-input w-full">
              <option value="low">Düşük</option>
              <option value="medium">Orta</option>
              <option value="high">Yüksek</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium ui-text-muted">Notlar</label>
            <textarea name="notes" className="ui-input w-full min-h-[60px]" />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddTask(false)}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium"
            >
              {t("m02_cancel")}
            </button>
            <button type="submit" className="ui-button-primary rounded-lg px-4 py-2 text-sm font-medium">
              {t("m02_create")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function TaskRow({
  task,
  isEditing,
  onToggle,
  onEdit,
  onSave,
  onCancel,
}: {
  task: WorkflowTask;
  isEditing: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onSave: (updates: Partial<WorkflowTask>) => void;
  onCancel: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editOwner, setEditOwner] = useState(task.owner ?? "");
  const [editDueDate, setEditDueDate] = useState(task.due_date ?? "");
  const [editPriority, setEditPriority] = useState<TaskPriority>(task.priority);
  const [editNotes, setEditNotes] = useState(task.notes ?? "");

  const isOverdue = task.due_date && !task.is_done && new Date(task.due_date) < new Date();

  if (isEditing) {
    return (
      <li className="rounded-lg border border-[var(--color-primary)]/50 bg-[var(--color-surface)]/80 p-3">
        <div className="space-y-2">
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="ui-input w-full text-sm"
          />
          <input
            value={editOwner}
            onChange={(e) => setEditOwner(e.target.value)}
            placeholder="Sahip"
            className="ui-input w-full text-sm"
          />
          <input
            type="date"
            value={editDueDate}
            onChange={(e) => setEditDueDate(e.target.value)}
            className="ui-input w-full text-sm"
          />
          <select
            value={editPriority}
            onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
            className="ui-input w-full text-sm"
          >
            <option value="low">Düşük</option>
            <option value="medium">Orta</option>
            <option value="high">Yüksek</option>
          </select>
          <textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            placeholder="Notlar"
            className="ui-input w-full min-h-[60px] text-sm"
          />
        </div>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() =>
              onSave({
                title: editTitle,
                owner: editOwner || null,
                due_date: editDueDate || null,
                priority: editPriority,
                notes: editNotes || null,
              })
            }
            className="ui-button-primary rounded px-3 py-1 text-sm"
          >
            Kaydet
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-[var(--color-border)] px-3 py-1 text-sm"
          >
            İptal
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-3">
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={task.is_done}
          onChange={onToggle}
          className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--color-border)]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className={task.is_done ? "line-through ui-text-muted" : ""}>{task.title}</span>
            <button
              type="button"
              onClick={onEdit}
              className="shrink-0 text-xs text-[var(--color-primary)] hover:underline"
            >
              Düzenle
            </button>
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs ui-text-muted">
            {task.owner && <span>{task.owner}</span>}
            {task.due_date && (
              <span className={isOverdue ? "text-red-400" : ""}>
                {new Date(task.due_date).toLocaleDateString("tr-TR")}
              </span>
            )}
            <span>{PRIORITY_LABELS[task.priority]}</span>
          </div>
          {task.notes && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="text-xs text-[var(--color-primary)] hover:underline"
              >
                {expanded ? "Notları gizle" : "Notları göster"}
              </button>
              {expanded && (
                <p className="mt-1 rounded bg-[var(--color-surface-elevated)]/50 p-2 text-xs">
                  {task.notes}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
