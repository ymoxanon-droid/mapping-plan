import type { TaskEvent } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { CheckCircle2, Pencil, PlusCircle, Trash2, RotateCcw, FileEdit, Sparkles } from "lucide-react";

interface Props {
  events: TaskEvent[];
  limit?: number;
}

const ICONS: Record<string, { icon: JSX.Element; color: string; label: string }> = {
  created:   { icon: <PlusCircle size={14} />,   color: "text-muted",   label: "Dibuat" },
  added:     { icon: <Sparkles size={14} />,     color: "text-accent",  label: "Ditambah" },
  revised:   { icon: <Pencil size={14} />,       color: "text-warn",    label: "Direvisi" },
  updated:   { icon: <FileEdit size={14} />,     color: "text-muted",   label: "Diupdate" },
  completed: { icon: <CheckCircle2 size={14} />, color: "text-ok",      label: "Selesai" },
  reopened:  { icon: <RotateCcw size={14} />,    color: "text-warn",    label: "Dibuka lagi" },
  deleted:   { icon: <Trash2 size={14} />,       color: "text-late",    label: "Dihapus" }
};

export default function ActivityFeed({ events, limit = 12 }: Props) {
  const sorted = [...events].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const shown = limit ? sorted.slice(0, limit) : sorted;

  if (shown.length === 0) {
    return <div className="text-sm text-muted">Belum ada aktivitas.</div>;
  }

  return (
    <ul className="space-y-2">
      {shown.map((e) => {
        const meta = ICONS[e.event_type] ?? ICONS.updated;
        const title =
          (e.new_value as { title?: string })?.title ??
          (e.old_value as { title?: string })?.title ??
          "(task)";
        return (
          <li key={e.id} className="flex items-start gap-3 text-sm">
            <span className={`mt-0.5 ${meta.color}`}>{meta.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`chip bg-ink-700 ${meta.color}`}>{meta.label}</span>
                <span className="truncate">{title}</span>
              </div>
              <div className="text-xs text-muted mt-0.5">{formatDateTime(e.created_at)}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
