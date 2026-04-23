import { Handle, Position } from "reactflow";
import type { Task } from "@/lib/types";
import { PERSPECTIVE_META } from "@/lib/types";
import type { TaskDates } from "@/lib/task-dates";
import {
  CheckCircle2,
  Loader2,
  Circle,
  XCircle,
  FlaskConical,
  Flag
} from "lucide-react";
import { cn, relativeDate } from "@/lib/utils";

const STATUS_STYLE: Record<
  string,
  { ring: string; icon: JSX.Element; text: string; tint: string }
> = {
  done: {
    ring: "ring-ok/70",
    text: "text-ok",
    tint: "bg-ok/10",
    icon: <CheckCircle2 size={14} />
  },
  in_progress: {
    ring: "ring-warn/80",
    text: "text-warn",
    tint: "bg-warn/10",
    icon: <Loader2 size={14} className="animate-spin" />
  },
  pending: {
    ring: "ring-ink-700",
    text: "text-muted",
    tint: "",
    icon: <Circle size={14} />
  },
  cancelled: {
    ring: "ring-muted/60",
    text: "text-muted",
    tint: "",
    icon: <XCircle size={14} />
  }
};

export default function TaskNode({
  data
}: {
  data: { task: Task; assignee: string; dates?: TaskDates; onClick?: () => void };
}) {
  const { task, assignee, dates, onClick } = data;
  const s = STATUS_STYLE[task.status] ?? STATUS_STYLE.pending;
  const p = task.perspective ? PERSPECTIVE_META[task.perspective] : null;
  const isResearch = task.kind === "research";
  const isMilestone = task.kind === "milestone";

  const dateText =
    task.status === "done" && dates?.completedAt
      ? `Selesai ${relativeDate(dates.completedAt)}`
      : task.status === "in_progress" && dates?.startedAt
        ? `Mulai ${relativeDate(dates.startedAt)}`
        : task.status === "pending" && task.due_date
          ? `Due ${relativeDate(task.due_date)}`
          : null;

  const dateColor =
    task.status === "done"
      ? "text-ok/80"
      : task.status === "in_progress"
        ? "text-warn/90"
        : "text-muted";

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative overflow-hidden border border-ink-700 rounded-xl px-3 py-2.5 shadow-lg w-60 cursor-pointer",
        "ring-1 transition hover:scale-[1.03] hover:shadow-2xl bg-ink-800",
        s.ring
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-ink-700 !border-ink-600 !w-2 !h-2 z-10"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-ink-700 !border-ink-600 !w-2 !h-2 z-10"
      />
      {s.tint && (
        <div
          aria-hidden
          className={cn("absolute inset-0 pointer-events-none", s.tint)}
        />
      )}
      <div className="relative">
      <div className="flex items-center gap-1.5 mb-1.5">
        {isResearch && <FlaskConical size={13} className="text-accent shrink-0" />}
        {isMilestone && <Flag size={13} className="text-accent shrink-0" />}
        <span className={cn(s.text, "shrink-0")}>{s.icon}</span>
        {p && (
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: p.color }}
            title={p.label}
          />
        )}
        <span className="ml-auto text-[9px] uppercase tracking-wider bg-ink-900/80 border border-ink-700 rounded px-1.5 py-0.5 text-muted">
          {assignee}
        </span>
      </div>
      <div
        className={cn(
          "text-[13px] font-medium leading-snug line-clamp-2",
          task.status === "done" && "line-through text-muted"
        )}
      >
        {task.title}
      </div>
      {dateText && (
        <div className={cn("mt-1.5 text-[10px] font-medium", dateColor)}>
          {dateText}
        </div>
      )}
      </div>
    </div>
  );
}
