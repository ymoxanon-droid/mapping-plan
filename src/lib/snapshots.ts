import { getSupabase, isSupabaseReady } from "@/lib/supabase";
import type { Job, JobProgress, JobSnapshot, Task, TaskEvent } from "@/lib/types";

async function hydrate(jobs: Job[]): Promise<JobSnapshot[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const out: JobSnapshot[] = [];
  for (const job of jobs) {
    const [
      { data: tasks, error: eT },
      { data: events, error: eE },
      { data: progress, error: eP }
    ] = await Promise.all([
      sb.from("tasks").select("*").eq("job_id", job.id).order("order_num"),
      sb
        .from("task_events")
        .select("*")
        .eq("job_id", job.id)
        .order("created_at", { ascending: false })
        .limit(30),
      sb.from("v_job_progress").select("*").eq("job_id", job.id).single()
    ]);
    if (eT) console.error("[snapshots] tasks error:", eT);
    if (eE) console.error("[snapshots] events error:", eE);
    if (eP) console.error("[snapshots] progress error:", eP);
    out.push({
      job,
      progress: progress as JobProgress,
      tasks: (tasks ?? []) as Task[],
      events: (events ?? []) as TaskEvent[]
    });
  }
  return out;
}

export async function getAllSnapshots(): Promise<JobSnapshot[]> {
  if (!isSupabaseReady()) return [];
  const sb = getSupabase()!;
  const { data: jobs, error } = await sb.from("jobs").select("*");
  if (error) console.error("[snapshots] getAllSnapshots jobs error:", error);
  return hydrate((jobs ?? []) as Job[]);
}

export async function getSnapshotByAssignee(assignee: string): Promise<JobSnapshot[]> {
  if (!isSupabaseReady()) return [];
  const sb = getSupabase()!;
  const { data: jobs, error } = await sb.from("jobs").select("*").ilike("assignee", assignee);
  if (error) console.error("[snapshots] getSnapshotByAssignee error:", error);
  return hydrate((jobs ?? []) as Job[]);
}

export async function getAssignees(): Promise<string[]> {
  if (!isSupabaseReady()) return [];
  const sb = getSupabase()!;
  const { data, error } = await sb.from("jobs").select("assignee");
  if (error) console.error("[snapshots] getAssignees error:", error);
  return Array.from(new Set((data ?? []).map((d: { assignee: string }) => d.assignee)));
}
