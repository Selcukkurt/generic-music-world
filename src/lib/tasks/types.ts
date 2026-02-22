/**
 * Task board and task types.
 */

export type TaskStatus = "todo" | "doing" | "done";
export type TaskPriority = "low" | "normal" | "high" | "urgent";

export interface TaskBoard {
  id: string;
  created_at: string;
  name: string;
  description: string | null;
  is_archived: boolean;
}

export interface Task {
  id: string;
  created_at: string;
  updated_at: string;
  board_id: string;
  created_by: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  tags: string[];
  assignee_id: string | null;
  order_index: number;
  completed_at: string | null;
  archived_at: string | null;
  is_archived: boolean;
  metadata: Record<string, unknown>;
}

export const TASK_STATUSES: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "Bekliyor" },
  { id: "doing", label: "Yapılıyor" },
  { id: "done", label: "Yapıldı" },
];

export const TASK_PRIORITIES: { id: TaskPriority; label: string }[] = [
  { id: "low", label: "Düşük" },
  { id: "normal", label: "Normal" },
  { id: "high", label: "Yüksek" },
  { id: "urgent", label: "Acil" },
];

export function priorityBadgeClass(priority: TaskPriority): string {
  const map: Record<TaskPriority, string> = {
    low: "bg-slate-500/20 text-slate-300",
    normal: "bg-blue-500/20 text-blue-200",
    high: "bg-amber-500/20 text-amber-200",
    urgent: "bg-red-500/20 text-red-200",
  };
  return map[priority];
}

export function priorityIndicatorClass(priority: TaskPriority): string {
  const map: Record<TaskPriority, string> = {
    low: "bg-slate-500",
    normal: "bg-blue-500",
    high: "bg-amber-500",
    urgent: "bg-red-500",
  };
  return map[priority];
}
