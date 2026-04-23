import { Handle, Position } from "reactflow";
import { Play } from "lucide-react";

export default function TriggerNode({
  data
}: {
  data: { label: string; assignee?: string };
}) {
  return (
    <div className="relative bg-gradient-to-br from-accent/25 to-accent/5 border border-accent/60 rounded-xl px-3 py-2.5 w-56 shadow-lg ring-1 ring-accent/30">
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-accent !border-accent !w-2 !h-2"
      />
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-6 h-6 rounded-full bg-accent/30 border border-accent/60 flex items-center justify-center shrink-0">
          <Play size={12} className="text-accent fill-accent" />
        </div>
        <span className="text-[9px] uppercase tracking-widest text-accent/90">
          Trigger
        </span>
        {data.assignee && (
          <span className="ml-auto text-[9px] uppercase tracking-wider bg-ink-900/80 border border-ink-700 rounded px-1.5 py-0.5 text-muted">
            {data.assignee}
          </span>
        )}
      </div>
      <div
        className="text-sm font-semibold leading-snug line-clamp-2"
        title={data.label}
      >
        {data.label}
      </div>
    </div>
  );
}
