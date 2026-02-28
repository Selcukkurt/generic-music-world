/**
 * Live Workflow Tracker types for M02
 */

export type StepStatus = "not_started" | "in_progress" | "done" | "blocked";

export type TaskPriority = "low" | "medium" | "high";

export interface WorkflowStep {
  id: string;
  event_id: string;
  title: string;
  order_index: number;
  status: StepStatus;
  created_at: string;
  updated_at: string;
}

export interface WorkflowTask {
  id: string;
  step_id: string;
  title: string;
  is_done: boolean;
  owner: string | null;
  due_date: string | null;
  priority: TaskPriority;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
