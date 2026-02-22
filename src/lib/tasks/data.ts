"use client";

import { supabaseBrowser } from "@/lib/supabase/client";
import type { Task, TaskBoard } from "./types";

export type TaskFilters = {
  search?: string;
  assignee?: "all" | "me";
  priority?: string;
  tag?: string;
};

export async function fetchDefaultBoard(): Promise<TaskBoard | null> {
  const { data, error } = await supabaseBrowser
    .from("task_boards")
    .select("*")
    .eq("is_archived", false)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  return data as TaskBoard;
}

export async function fetchTasksForBoard(
  boardId: string,
  mode: "kanban" | "month" | "archive",
  filters: TaskFilters,
  userId: string,
  monthRange?: { from: string; to: string }
): Promise<Task[]> {
  let query = supabaseBrowser
    .from("tasks")
    .select("*")
    .eq("board_id", boardId)
    .order("order_index", { ascending: true })
    .order("updated_at", { ascending: false })
    .limit(200);

  if (mode === "kanban") {
    query = query.eq("is_archived", false);
  } else if (mode === "month") {
    query = query.eq("status", "done").eq("is_archived", false);
    if (monthRange) {
      query = query
        .gte("completed_at", monthRange.from)
        .lte("completed_at", monthRange.to);
    }
  } else if (mode === "archive") {
    query = query.eq("is_archived", true);
  }

  if (filters.search?.trim()) {
    const q = `%${filters.search.trim()}%`;
    query = query.or(`title.ilike.${q},description.ilike.${q}`);
  }
  if (filters.assignee === "me") {
    query = query.eq("assignee_id", userId);
  }
  if (filters.priority && filters.priority !== "all") {
    query = query.eq("priority", filters.priority);
  }
  if (filters.tag && filters.tag !== "all") {
    query = query.contains("tags", [filters.tag]);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Task[];
}

export async function createTask(
  userId: string,
  boardId: string,
  payload: {
    title: string;
    description?: string | null;
    status?: Task["status"];
    priority?: Task["priority"];
    due_date?: string | null;
    tags?: string[];
    assignee_id?: string | null;
  }
): Promise<Task> {
  const { data: max } = await supabaseBrowser
    .from("tasks")
    .select("order_index")
    .eq("board_id", boardId)
    .eq("status", payload.status ?? "todo")
    .order("order_index", { ascending: false })
    .limit(1)
    .single();

  const orderIndex = (max?.order_index ?? -1) + 1;

  const { data, error } = await supabaseBrowser
    .from("tasks")
    .insert({
      board_id: boardId,
      created_by: userId,
      title: payload.title,
      description: payload.description ?? null,
      status: payload.status ?? "todo",
      priority: payload.priority ?? "normal",
      due_date: payload.due_date ?? null,
      tags: payload.tags ?? [],
      assignee_id: payload.assignee_id ?? null,
      order_index: orderIndex,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Task;
}

export async function updateTask(
  id: string,
  payload: Partial<Pick<Task, "title" | "description" | "status" | "priority" | "due_date" | "tags" | "assignee_id" | "order_index">>
): Promise<void> {
  const updates: Record<string, unknown> = { ...payload };
  if (payload.status === "done") {
    updates.completed_at = new Date().toISOString();
  }

  const { error } = await supabaseBrowser
    .from("tasks")
    .update(updates)
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function moveTask(
  id: string,
  newStatus: Task["status"],
  newOrderIndex: number
): Promise<void> {
  const updates: Record<string, unknown> = {
    status: newStatus,
    order_index: newOrderIndex,
  };
  if (newStatus === "done") {
    updates.completed_at = new Date().toISOString();
  }

  const { error } = await supabaseBrowser
    .from("tasks")
    .update(updates)
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function archiveTask(id: string): Promise<void> {
  const { error } = await supabaseBrowser
    .from("tasks")
    .update({
      is_archived: true,
      archived_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function restoreTask(id: string): Promise<void> {
  const { error } = await supabaseBrowser
    .from("tasks")
    .update({
      is_archived: false,
      archived_at: null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function reorderTasks(
  boardId: string,
  status: Task["status"],
  taskIds: string[]
): Promise<void> {
  const updates = taskIds.map((id, i) =>
    supabaseBrowser.from("tasks").update({ order_index: i }).eq("id", id).eq("board_id", boardId)
  );
  await Promise.all(updates);
}
