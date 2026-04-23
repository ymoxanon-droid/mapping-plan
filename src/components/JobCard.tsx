import { useState } from "react";
import type { JobSnapshot } from "@/lib/types";
import ProgressRing from "./ProgressRing";
import TaskTimeline from "./TaskTimeline";
import ActivityFeed from "./ActivityFeed";
import { cn, relativeDate } from "@/lib/utils";
import { getTaskDates } from "@/lib/task-dates";
import { CheckCircle2, Loader2, Clock, ListChecks, History } from "lucide-react";

const STATUS_CHIP: Record<string, string> = {
  done: "bg-ok/15 text-ok",
  in_progress: "bg-warn/15 text-warn",
  pending: "bg-ink-700 text-muted",
  cancelled: "bg-muted/15 text-muted"
};

type Tab = "tasks" | "activity";

export default function JobCard({
  snapshot,
  highlightTaskId
}: {
  snapshot: JobSnapshot;
  highlightTaskId?: string | null;
}) {
  const { job, progress, tasks, events } = snapshot;
  const active = tasks.filter((t) => !t.deleted_at).sort((a, b) => a.order_num - b.order_num);
  const [tab, setTab] = useState<Tab>("tasks");

  return (
    <div className="card space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted">
            Assignee · <span className="text-accent font-semibold">{job.assignee}</span>
          </div>
          <h2 className="text-xl font-semibold mt-1">{job.name}</h2>
          {job.description && <p className="text-sm text-muted mt-1">{job.description}</p>}
        </div>
        <ProgressRing percent={progress.percent_done ?? 0} label="progress" />
      </header>

      <div className="grid grid-cols-4 gap-3 text-center">
        <Stat label="Total" value={progress.total_tasks} />
        <Stat label="Selesai" value={progress.done_tasks} color="text-ok" />
        <Stat label="Jalan" value={progress.in_progress_tasks} color="text-warn" />
        <Stat label="Belum" value={progress.pending_tasks} color="text-muted" />
      </div>

      <section>
        <h3 className="text-xs uppercase tracking-widest text-muted mb-2">Timeline</h3>
        <TaskTimeline tasks={tasks} events={events} />
      </section>

      <section>
        <div className="flex items-center gap-1 border-b border-ink-700 mb-3">
          <TabButton active={tab === "tasks"} onClick={() => setTab("tasks")}>
            <ListChecks size={13} />
            Daftar Tugas
            <Badge active={tab === "tasks"}>{active.length}</Badge>
          </TabButton>
          <TabButton active={tab === "activity"} onClick={() => setTab("activity")}>
            <History size={13} />
            Activity Log
            <Badge active={tab === "activity"}>{events.length}</Badge>
          </TabButton>
        </div>

        {tab === "tasks" && (
          <ul className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
            {active.map((t) => {
              const dates = getTaskDates(t, events);
              return (
                <li
                  key={t.id}
                  className={cn(
                    "flex items-start gap-3 text-sm p-2 rounded-md transition-colors",
                    highlightTaskId === t.id
                      ? "bg-accent/20 ring-1 ring-accent"
                      : "hover:bg-ink-700/40"
                  )}
                >
                  <span className="text-muted w-6 text-right tabular-nums pt-0.5">
                    {t.order_num}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <div
                      className={cn(
                        "leading-snug",
                        t.status === "done" && "line-through text-muted"
                      )}
                    >
                      {t.title}
                    </div>
                    <DateHint task={t} dates={dates} />
                  </div>
                  <span className={cn("chip shrink-0", STATUS_CHIP[t.status])}>
                    {t.status.replace("_", " ")}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {tab === "activity" && (
          <div className="max-h-[420px] overflow-y-auto pr-1">
            <ActivityFeed events={events} limit={0} />
          </div>
        )}
      </section>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition",
        active
          ? "border-accent text-ink-50"
          : "border-transparent text-muted hover:text-ink-50"
      )}
    >
      {children}
    </button>
  );
}

function Badge({ children, active }: { children: React.ReactNode; active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full text-[10px] font-semibold px-1.5 min-w-[18px] h-[18px] tabular-nums",
        active ? "bg-accent/20 text-accent" : "bg-ink-700 text-muted"
      )}
    >
      {children}
    </span>
  );
}

function DateHint({
  task,
  dates
}: {
  task: JobSnapshot["tasks"][number];
  dates: ReturnType<typeof getTaskDates>;
}) {
  if (task.status === "done" && dates.completedAt) {
    return (
      <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-ok/90">
        <CheckCircle2 size={11} /> Selesai {relativeDate(dates.completedAt)}
      </div>
    );
  }
  if (task.status === "in_progress" && dates.startedAt) {
    return (
      <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-warn/90">
        <Loader2 size={11} className="animate-spin" /> Mulai {relativeDate(dates.startedAt)}
      </div>
    );
  }
  if (task.status === "pending" && task.due_date) {
    return (
      <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted">
        <Clock size={11} /> Due {relativeDate(task.due_date)}
      </div>
    );
  }
  return null;
}

function Stat({
  label,
  value,
  color = "text-ink-50"
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-900/40 py-3">
      <div className={`text-2xl font-semibold tabular-nums ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted mt-1">{label}</div>
    </div>
  );
}
