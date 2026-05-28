import type { Task, TaskEvent } from "@/lib/types";
import { cn, relativeDate } from "@/lib/utils";
import { getTaskDates } from "@/lib/task-dates";

interface Props {
  tasks: Task[];
  events?: TaskEvent[];
}

const DOT_COLOR: Record<string, string> = {
  done: "bg-ok",
  in_progress: "bg-warn",
  pending: "bg-ink-700 border border-ink-700",
  cancelled: "bg-muted"
};

export default function TaskTimeline({ tasks, events = [] }: Props) {
  const visible = tasks
    .filter((t) => !t.deleted_at)
    .sort((a, b) => a.order_num - b.order_num);
  if (visible.length === 0) {
    return <div className="text-sm text-muted">Belum ada task.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
        {visible.map((t) => {
          const dates = getTaskDates(t, events);
          const dateLine =
            t.status === "done" && dates.completedAt
              ? `Selesai ${relativeDate(dates.completedAt)}`
              : t.status === "in_progress" && dates.startedAt
                ? `Mulai ${relativeDate(dates.startedAt)}`
                : null;
          return (
            <div key={t.id} className="group relative">
              <div
                className={cn(
                  "w-3 h-3 rounded-full ring-2 ring-ink-900 cursor-pointer",
                  DOT_COLOR[t.status] ?? "bg-ink-700"
                )}
              />
              <div className="absolute left-1/2 -translate-x-1/2 top-6 w-56 opacity-0 group-hover:opacity-100 pointer-events-none transition z-10">
                <div className="rounded-md border border-ink-700 bg-ink-900 p-2 text-xs shadow-xl">
                  <div className="font-semibold leading-snug">
                    {t.order_num}. {t.title}
                  </div>
                  <div className="text-muted mt-1 capitalize">
                    {t.status.replace("_", " ")}
                  </div>
                  {dateLine && (
                    <div className="text-[11px] text-accent/90 mt-0.5">{dateLine}</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 text-xs text-muted pt-2">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-ok" /> Selesai
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-warn" /> Jalan
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-ink-700 border border-ink-700" /> Belum
        </span>
      </div>
    </div>
  );
}
