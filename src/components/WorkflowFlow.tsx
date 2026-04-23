import { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  type Edge,
  type Node
} from "reactflow";
import "reactflow/dist/style.css";
import TaskNode from "./flow/TaskNode";
import TriggerNode from "./flow/TriggerNode";
import type { JobSnapshot, Task } from "@/lib/types";
import { layoutFlow } from "@/lib/flow-layout";
import { getTaskDates } from "@/lib/task-dates";

const nodeTypes = { task: TaskNode, trigger: TriggerNode };

interface Props {
  snapshots: JobSnapshot[];
  onNodeClick?: (task: Task, assignee: string) => void;
}

export default function WorkflowFlow({ snapshots, onNodeClick }: Props) {
  const { nodes, edges } = useMemo(
    () => buildGraph(snapshots, onNodeClick),
    [snapshots, onNodeClick]
  );

  return (
    <div className="card overflow-hidden p-0">
      <header className="px-5 py-4 border-b border-ink-700 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-semibold">Workflow Flow</h2>
          <p className="text-xs text-muted">
            Flow dependensi per task — klik node untuk lihat detail di bawah
          </p>
        </div>
        <Legend />
      </header>
      <div className="h-[560px] md:h-[640px] bg-ink-900/50">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.25}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          panOnScroll
          panOnDrag
          zoomOnScroll
        >
          <Background color="#1a1a22" gap={20} size={1} />
          <Controls
            className="!bg-ink-800 !border !border-ink-700 !rounded-lg !shadow-lg"
            showInteractive={false}
          />
          <MiniMap
            pannable
            zoomable
            nodeColor={(n: Node) => {
              const st = (n.data as { task?: Task })?.task?.status;
              if (st === "done") return "#22c55e";
              if (st === "in_progress") return "#eab308";
              if (n.type === "trigger") return "#7c5cff";
              return "#3f3f46";
            }}
            maskColor="rgba(11,11,16,0.8)"
            style={{
              background: "#121218",
              border: "1px solid #1a1a22",
              borderRadius: 8
            }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}

function buildGraph(
  snapshots: JobSnapshot[],
  onNodeClick?: (t: Task, a: string) => void
) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  snapshots.forEach((snap) => {
    const triggerId = `trigger-${snap.job.id}`;
    nodes.push({
      id: triggerId,
      type: "trigger",
      position: { x: 0, y: 0 },
      data: { label: snap.job.name, assignee: snap.job.assignee }
    });

    const active = snap.tasks.filter((t) => !t.deleted_at);
    const taskMap = new Map(active.map((t) => [t.id, t]));

    // Resolve grup → anggotanya, sorted by order_num.
    // Ketua = index 0. Anggota lain (index > 0) prev = anggota sebelumnya.
    const groupMembers = new Map<string, Task[]>();
    active.forEach((t) => {
      if (!t.group_key) return;
      const list = groupMembers.get(t.group_key) ?? [];
      list.push(t);
      groupMembers.set(t.group_key, list);
    });
    groupMembers.forEach((list) => list.sort((a, b) => a.order_num - b.order_num));

    // Map task.id → previous-in-group task (kalau dia anggota, bukan ketua)
    const prevInGroup = new Map<string, Task>();
    groupMembers.forEach((list) => {
      for (let i = 1; i < list.length; i++) {
        prevInGroup.set(list[i].id, list[i - 1]);
      }
    });

    active.forEach((task) => {
      nodes.push({
        id: task.id,
        type: "task",
        position: { x: 0, y: 0 },
        data: {
          task,
          assignee: snap.job.assignee,
          dates: getTaskDates(task, snap.events),
          onClick: () => onNodeClick?.(task, snap.job.assignee)
        }
      });

      const deps = task.depends_on ?? [];
      const prev = prevInGroup.get(task.id);

      // Rantai grup (kalau anggota bukan ketua)
      if (prev) {
        edges.push({
          id: `${prev.id}->${task.id}`,
          source: prev.id,
          target: task.id,
          type: "smoothstep",
          animated: task.status === "in_progress" || prev.status === "in_progress",
          style: edgeStyle(prev),
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: edgeStyle(prev).stroke as string
          }
        });
      }

      // Cross-group deps (lintas grup) — additive, bisa barengan sama rantai grup
      deps.forEach((depId) => {
        const src = taskMap.get(depId);
        if (!src) return;
        edges.push({
          id: `${depId}->${task.id}`,
          source: depId,
          target: task.id,
          type: "smoothstep",
          animated: task.status === "in_progress" || src.status === "in_progress",
          style: { ...edgeStyle(src), strokeDasharray: "4 4" },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: edgeStyle(src).stroke as string
          }
        });
      });

      // Trigger arrow hanya kalau task ini standalone (tanpa prev & tanpa deps)
      if (!prev && deps.length === 0) {
        edges.push({
          id: `${triggerId}->${task.id}`,
          source: triggerId,
          target: task.id,
          type: "smoothstep",
          animated: task.status === "in_progress",
          style:
            task.kind === "research"
              ? { strokeDasharray: "5 5", stroke: "#7c5cff", strokeWidth: 1.5 }
              : { stroke: "#4b5563", strokeWidth: 1.5 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: task.kind === "research" ? "#7c5cff" : "#6b7280"
          }
        });
      }
    });
  });

  return layoutFlow(nodes, edges, { direction: "LR" });
}

function edgeStyle(src?: Task): { stroke: string; strokeWidth: number } {
  if (!src) return { stroke: "#4b5563", strokeWidth: 1.5 };
  if (src.status === "done") return { stroke: "#22c55e", strokeWidth: 1.5 };
  if (src.status === "in_progress") return { stroke: "#eab308", strokeWidth: 2 };
  return { stroke: "#4b5563", strokeWidth: 1.5 };
}

function Legend() {
  return (
    <div className="flex items-center gap-3 text-[11px] text-muted flex-wrap">
      <span className="flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded-full bg-accent" /> Trigger
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded-full bg-ok" /> Done
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded-full bg-warn" /> Jalan
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded-full bg-ink-700 border border-ink-700" /> Belum
      </span>
      <span className="flex items-center gap-1">
        <span
          className="w-4 h-[2px]"
          style={{
            background:
              "repeating-linear-gradient(90deg, #7c5cff 0 4px, transparent 4px 8px)"
          }}
        />
        Research
      </span>
      <span className="flex items-center gap-1">
        <span
          className="w-4 h-[2px]"
          style={{
            background:
              "repeating-linear-gradient(90deg, #6b7280 0 4px, transparent 4px 8px)"
          }}
        />
        Cross-group
      </span>
    </div>
  );
}
