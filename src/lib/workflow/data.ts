/**
 * Live Workflow Tracker data layer – Supabase with mock fallback
 */

import { supabaseBrowser } from "@/lib/supabase/client";
import type { WorkflowStep, WorkflowTask, StepStatus, TaskPriority } from "./types";

function genId() {
  return `wf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const MOCK_STEPS: Omit<WorkflowStep, "id" | "event_id" | "created_at" | "updated_at">[] = [
  { title: "Planlama", order_index: 0, status: "in_progress" },
  { title: "Mekan & Lojistik", order_index: 1, status: "not_started" },
  { title: "Bilet & Satış", order_index: 2, status: "not_started" },
  { title: "Prodüksiyon", order_index: 3, status: "not_started" },
  { title: "Etkinlik Günü", order_index: 4, status: "not_started" },
  { title: "Kapanış", order_index: 5, status: "not_started" },
];

const MOCK_TASKS: Omit<WorkflowTask, "id" | "step_id" | "created_at" | "updated_at">[] = [
  { title: "Sözleşme imzala", is_done: true, owner: "Ali", due_date: "2026-02-15", priority: "high", notes: null },
  { title: "Mekan onayı al", is_done: false, owner: "Ayşe", due_date: "2026-02-20", priority: "high", notes: "Arayıp teyit et" },
  { title: "Bütçe onayı", is_done: false, owner: "Mehmet", due_date: "2026-02-18", priority: "medium", notes: null },
];

export async function fetchWorkflowSteps(eventId: string): Promise<WorkflowStep[]> {
  try {
    const { data, error } = await supabaseBrowser
      .from("workflow_steps")
      .select("*")
      .eq("event_id", eventId)
      .order("order_index", { ascending: true });

    if (error) throw error;
    return (data ?? []) as WorkflowStep[];
  } catch {
    const now = new Date().toISOString();
    return MOCK_STEPS.map((s, i) => ({
      id: genId(),
      event_id: eventId,
      ...s,
      created_at: now,
      updated_at: now,
    }));
  }
}

export async function fetchWorkflowTasks(stepId: string): Promise<WorkflowTask[]> {
  try {
    const { data, error } = await supabaseBrowser
      .from("workflow_tasks")
      .select("*")
      .eq("step_id", stepId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? []) as WorkflowTask[];
  } catch {
    const now = new Date().toISOString();
    return MOCK_TASKS.map((t) => ({
      id: genId(),
      step_id: stepId,
      ...t,
      created_at: now,
      updated_at: now,
    }));
  }
}

export async function fetchAllTasksForEvent(eventId: string): Promise<WorkflowTask[]> {
  try {
    const steps = await fetchWorkflowSteps(eventId);
    if (steps.length === 0) return [];
    const stepIds = steps.map((s) => s.id);
    const { data, error } = await supabaseBrowser
      .from("workflow_tasks")
      .select("*")
      .in("step_id", stepIds);

    if (error) throw error;
    return (data ?? []) as WorkflowTask[];
  } catch {
    const steps = await fetchWorkflowSteps(eventId);
    const allTasks: WorkflowTask[] = [];
    for (const step of steps) {
      const tasks = await fetchWorkflowTasks(step.id);
      allTasks.push(...tasks);
    }
    return allTasks;
  }
}

export async function createWorkflowStep(
  eventId: string,
  payload: { title: string; order_index: number }
): Promise<WorkflowStep> {
  try {
    const { data, error } = await supabaseBrowser
      .from("workflow_steps")
      .insert({
        event_id: eventId,
        title: payload.title,
        order_index: payload.order_index,
        status: "not_started",
      })
      .select()
      .single();

    if (error) throw error;
    return data as WorkflowStep;
  } catch {
    const now = new Date().toISOString();
    return {
      id: genId(),
      event_id: eventId,
      title: payload.title,
      order_index: payload.order_index,
      status: "not_started",
      created_at: now,
      updated_at: now,
    };
  }
}

export async function updateWorkflowStep(
  stepId: string,
  payload: { title?: string; status?: StepStatus; order_index?: number }
): Promise<WorkflowStep> {
  try {
    const { data, error } = await supabaseBrowser
      .from("workflow_steps")
      .update(payload)
      .eq("id", stepId)
      .select()
      .single();

    if (error) throw error;
    return data as WorkflowStep;
  } catch {
    throw new Error("Adım güncellenemedi.");
  }
}

export async function createWorkflowTask(
  stepId: string,
  payload: {
    title: string;
    owner?: string | null;
    due_date?: string | null;
    priority?: TaskPriority;
    notes?: string | null;
  }
): Promise<WorkflowTask> {
  try {
    const { data, error } = await supabaseBrowser
      .from("workflow_tasks")
      .insert({
        step_id: stepId,
        title: payload.title,
        is_done: false,
        owner: payload.owner ?? null,
        due_date: payload.due_date ?? null,
        priority: payload.priority ?? "medium",
        notes: payload.notes ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as WorkflowTask;
  } catch {
    const now = new Date().toISOString();
    return {
      id: genId(),
      step_id: stepId,
      title: payload.title,
      is_done: false,
      owner: payload.owner ?? null,
      due_date: payload.due_date ?? null,
      priority: payload.priority ?? "medium",
      notes: payload.notes ?? null,
      created_at: now,
      updated_at: now,
    };
  }
}

export async function updateWorkflowTask(
  taskId: string,
  payload: Partial<{
    title: string;
    is_done: boolean;
    owner: string | null;
    due_date: string | null;
    priority: TaskPriority;
    notes: string | null;
  }>
): Promise<WorkflowTask> {
  try {
    const { data, error } = await supabaseBrowser
      .from("workflow_tasks")
      .update(payload)
      .eq("id", taskId)
      .select()
      .single();

    if (error) throw error;
    return data as WorkflowTask;
  } catch {
    throw new Error("Görev güncellenemedi.");
  }
}
