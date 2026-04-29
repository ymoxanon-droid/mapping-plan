import { Handle, Position } from "reactflow";
import { Play } from "lucide-react";

export default function TriggerNode({
  data
}: {
  data: { label: string; assignee?: string; color?: string };
}) {
  const c = data.color ?? "#7c5cff";
  return (
    <div
      className="relative rounded-xl px-3 py-2.5 w-56 shadow-lg ring-1 border"
      style={{
        backgroundImage: `linear-gradient(135deg, ${c}40 0%, ${c}0d 100%)`,
        borderColor: `${c}99`,
        boxShadow: `0 0 0 1px ${c}33, 0 8px 20px -8px ${c}55`
      }}
    >
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2"
        style={{ background: c, borderColor: c }}
      />
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className="w-6 h-6 rounded-full border flex items-center justify-center shrink-0"
          style={{ background: `${c}4d`, borderColor: `${c}99` }}
        >
          <Play size={12} style={{ color: c, fill: c }} />
        </div>
        <span
          className="text-[9px] uppercase tracking-widest"
          style={{ color: `${c}e6` }}
        >
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
