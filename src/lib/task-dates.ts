import type { Task, TaskEvent } from "@/lib/types";

export interface TaskDates {
  startedAt: string | null;    // kapan mulai dikerjakan (event updated/revised pertama setelah created)
  completedAt: string | null;  // kapan selesai (event completed terbaru)
  lastActivityAt: string;      // aktivitas terakhir apapun (update, revisi, tambah, dll)
}

export function getTaskDates(task: Task, events: TaskEvent[]): TaskDates {
  const mine = events
    .filter((e) => e.task_id === task.id)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const completedEvt = [...mine].reverse().find((e) => e.event_type === "completed");
  const progressEvt = mine.find((e) =>
    ["updated", "revised", "in_progress"].includes(e.event_type)
  );

  const completedAt =
    task.completed_at ??
    completedEvt?.created_at ??
    (task.status === "done" ? task.updated_at : null);

  const startedAt =
    task.status === "in_progress"
      ? progressEvt?.created_at ?? task.updated_at
      : task.status === "done"
        ? progressEvt?.created_at ?? task.created_at
        : null;

  const lastActivityAt = mine.length > 0 ? mine[mine.length - 1].created_at : task.updated_at;

  return { startedAt, completedAt, lastActivityAt };
}
