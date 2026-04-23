export type TaskStatus = "pending" | "in_progress" | "done" | "cancelled";

export type Perspective = "financial" | "customer" | "internal" | "capacity";

export const PERSPECTIVE_META: Record<
  Perspective,
  { label: string; question: string; color: string; order: number }
> = {
  financial: {
    label: "Financial / Outcome",
    question: "Outcome apa yang dorong bisnis?",
    color: "#1e3a8a",
    order: 1
  },
  customer: {
    label: "Customer / External",
    question: "Gimana user lihat kita?",
    color: "#15803d",
    order: 2
  },
  internal: {
    label: "Internal Process",
    question: "Di mana kita harus excel?",
    color: "#0e7490",
    order: 3
  },
  capacity: {
    label: "Organizational Capacity",
    question: "Apa yang harus dibangun / dipelajari?",
    color: "#b45309",
    order: 4
  }
};

export type EventType =
  | "created"
  | "updated"
  | "revised"
  | "deleted"
  | "completed"
  | "reopened"
  | "added";

export interface Job {
  id: string;
  name: string;
  assignee: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  job_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  order_num: number;
  due_date: string | null;
  perspective: Perspective | null;
  depends_on: string[] | null;
  kind: "trigger" | "task" | "research" | "milestone" | null;
  group_key: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TaskEvent {
  id: string;
  task_id: string | null;
  job_id: string;
  event_type: EventType;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface JobProgress {
  job_id: string;
  job_name: string;
  assignee: string;
  total_tasks: number;
  done_tasks: number;
  in_progress_tasks: number;
  pending_tasks: number;
  percent_done: number;
}

export interface JobSnapshot {
  job: Job;
  progress: JobProgress;
  tasks: Task[];
  events: TaskEvent[];
}
