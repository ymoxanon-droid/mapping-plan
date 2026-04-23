import { useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
  useViewport,
  type Edge,
  type Node
} from "reactflow";
import "reactflow/dist/style.css";
import TaskNode from "./flow/TaskNode";
import TriggerNode from "./flow/TriggerNode";
import type { JobSnapshot, Task } from "@/lib/types";
import { layoutFlow } from "@/lib/flow-layout";
import { getTaskDates } from "@/lib/task-dates";
import { UserCircle2, X, ChevronDown, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { groupMembersByTeam } from "@/lib/teams";

const nodeTypes = { task: TaskNode, trigger: TriggerNode };

interface Props {
  snapshots: JobSnapshot[];
  onNodeClick?: (task: Task, assignee: string) => void;
  members?: string[];
  selectedMember?: string | null;
  onMemberClick?: (name: string) => void;
  onClearMember?: () => void;
}

export default function WorkflowFlow(props: Props) {
  return (
    <ReactFlowProvider>
      <WorkflowFlowInner {...props} />
    </ReactFlowProvider>
  );
}

function WorkflowFlowInner({
  snapshots,
  onNodeClick,
  members = [],
  selectedMember = null,
  onMemberClick,
  onClearMember
}: Props) {
  const { nodes, edges } = useMemo(
    () => buildGraph(snapshots, onNodeClick),
    [snapshots, onNodeClick]
  );

  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const viewport = useViewport();
  const fittedKeyRef = useRef<string>("");

  // Fit view setiap kali struktur nodes berubah (nodes sudah di-measure oleh
  // ReactFlow lewat useNodesInitialized, jadi tidak race condition).
  useEffect(() => {
    if (!nodesInitialized || nodes.length === 0) return;
    const key = nodes.map((n) => n.id).join("|");
    if (fittedKeyRef.current === key) return;
    fittedKeyRef.current = key;
    fitView({ padding: 0.15, duration: 250 });
  }, [nodesInitialized, nodes, fitView]);

  return (
    <div className="card overflow-hidden p-0">
      <header className="px-5 py-4 border-b border-ink-700 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-semibold">Workflow Flow</h2>
          <div className="mt-1.5">
            <Legend />
          </div>
        </div>
        {members.length > 0 && (
          <TeamPicker
            members={members}
            selectedMember={selectedMember}
            onMemberClick={onMemberClick}
            onClearMember={onClearMember}
          />
        )}
      </header>
      <div className="relative h-[560px] md:h-[640px] bg-ink-900/50">
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

        <div
          className="absolute bottom-3 left-[70px] z-10 rounded-md border border-ink-700 bg-ink-800/90 backdrop-blur px-2 py-1 text-[11px] text-muted tabular-nums font-mono shadow"
          title="Skala zoom saat ini"
        >
          {Math.round(viewport.zoom * 100)}%
        </div>
      </div>
    </div>
  );
}

function buildGraph(
  snapshots: JobSnapshot[],
  onNodeClick?: (t: Task, a: string) => void
) {
  // Group snapshots per assignee supaya flow tiap orang dilayout terpisah
  // (tidak interleave visualnya dengan flow anggota lain).
  const byAssignee = new Map<string, JobSnapshot[]>();
  snapshots.forEach((snap) => {
    const key = snap.job.assignee.toLowerCase();
    const list = byAssignee.get(key) ?? [];
    list.push(snap);
    byAssignee.set(key, list);
  });

  const allNodes: Node[] = [];
  const allEdges: Edge[] = [];
  let yCursor = 0;
  const GROUP_GAP = 120;

  byAssignee.forEach((group) => {
    const { nodes, edges } = buildGroupGraph(group, onNodeClick);
    if (nodes.length === 0) return;

    const laid = layoutFlow(nodes, edges, { direction: "LR" });

    const ys = laid.nodes.map((n) => n.position.y);
    const heights = laid.nodes.map((n) => (n.type === "trigger" ? 70 : 78));
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys.map((y, i) => y + heights[i]));

    const shiftY = yCursor - minY;
    laid.nodes.forEach((n) => {
      n.position.y += shiftY;
    });

    allNodes.push(...laid.nodes);
    allEdges.push(...laid.edges);

    yCursor += maxY - minY + GROUP_GAP;
  });

  return { nodes: allNodes, edges: allEdges };
}

function buildGroupGraph(
  snapshots: JobSnapshot[],
  onNodeClick?: (t: Task, a: string) => void
) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // TaskMap lintas snap dalam satu assignee, supaya cross-job dep (tapi masih
  // same-assignee) tetap digambar. Cross-assignee tidak akan nyambung karena
  // assignee lain bukan bagian dari grup ini.
  const assigneeTaskMap = new Map<string, { task: Task; jobId: string }>();
  snapshots.forEach((snap) => {
    snap.tasks
      .filter((t) => !t.deleted_at)
      .forEach((t) => assigneeTaskMap.set(t.id, { task: t, jobId: snap.job.id }));
  });

  snapshots.forEach((snap) => {
    const triggerId = `trigger-${snap.job.id}`;
    nodes.push({
      id: triggerId,
      type: "trigger",
      position: { x: 0, y: 0 },
      data: { label: snap.job.name, assignee: snap.job.assignee }
    });

    const active = snap.tasks.filter((t) => !t.deleted_at);

    // Resolve grup → anggotanya, sorted by order_num.
    const groupMembers = new Map<string, Task[]>();
    active.forEach((t) => {
      if (!t.group_key) return;
      const list = groupMembers.get(t.group_key) ?? [];
      list.push(t);
      groupMembers.set(t.group_key, list);
    });
    groupMembers.forEach((list) => list.sort((a, b) => a.order_num - b.order_num));

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

      deps.forEach((depId) => {
        // Hanya tarik edge kalau dep task juga milik assignee yang sama.
        const src = assigneeTaskMap.get(depId);
        if (!src) return;
        edges.push({
          id: `${depId}->${task.id}`,
          source: depId,
          target: task.id,
          type: "smoothstep",
          animated: task.status === "in_progress" || src.task.status === "in_progress",
          style: { ...edgeStyle(src.task), strokeDasharray: "4 4" },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: edgeStyle(src.task).stroke as string
          }
        });
      });

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

  return { nodes, edges };
}

function edgeStyle(src?: Task): { stroke: string; strokeWidth: number } {
  if (!src) return { stroke: "#4b5563", strokeWidth: 1.5 };
  if (src.status === "done") return { stroke: "#22c55e", strokeWidth: 1.5 };
  if (src.status === "in_progress") return { stroke: "#eab308", strokeWidth: 2 };
  return { stroke: "#4b5563", strokeWidth: 1.5 };
}

function TeamPicker({
  members,
  selectedMember,
  onMemberClick,
  onClearMember
}: {
  members: string[];
  selectedMember: string | null;
  onMemberClick?: (name: string) => void;
  onClearMember?: () => void;
}) {
  const [openTeam, setOpenTeam] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  const teamGroups = useMemo(() => groupMembersByTeam(members), [members]);

  useEffect(() => {
    if (!openTeam) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as globalThis.Node)) {
        setOpenTeam(null);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [openTeam]);

  return (
    <div ref={ref} className="flex items-center gap-2 flex-wrap">
      {teamGroups.map(({ team, members: list }) => {
        const active = selectedMember
          ? list.some((n) => n.toLowerCase() === selectedMember.toLowerCase())
          : false;
        const open = openTeam === team;
        return (
          <div key={team} className="relative">
            <button
              onClick={() => setOpenTeam((curr) => (curr === team ? null : team))}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition",
                active
                  ? "border-accent bg-accent/20 text-accent"
                  : "border-ink-700 bg-ink-800/60 hover:bg-accent/10 hover:text-accent"
              )}
              title={`Anggota team ${team}`}
            >
              <span className="font-semibold">{team}</span>
              <span className="text-muted/80 tabular-nums">({list.length})</span>
              <Users size={12} />
              <ChevronDown
                size={12}
                className={cn("transition-transform", open && "rotate-180")}
              />
            </button>
            {open && (
              <div className="absolute right-0 top-full mt-1.5 z-20 min-w-[180px] rounded-lg border border-ink-700 bg-ink-800 shadow-xl p-1">
                <div className="px-2 py-1 text-[10px] uppercase tracking-widest text-muted border-b border-ink-700 mb-1">
                  Team {team}
                </div>
                {list.map((name) => {
                  const isSelected =
                    selectedMember?.toLowerCase() === name.toLowerCase();
                  return (
                    <button
                      key={name}
                      onClick={() => {
                        onMemberClick?.(name);
                        setOpenTeam(null);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-left transition",
                        isSelected
                          ? "bg-accent/20 text-accent"
                          : "text-ink-50 hover:bg-ink-700"
                      )}
                    >
                      <UserCircle2 size={12} />
                      <span className="font-medium">{name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      {selectedMember && (
        <button
          onClick={onClearMember}
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink-50 transition"
          title="Tampilkan semua anggota"
        >
          <X size={11} /> semua
        </button>
      )}
    </div>
  );
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
