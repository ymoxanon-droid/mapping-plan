import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode
} from "react";
import { Link } from "react-router-dom";
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  MarkerType,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  Handle,
  Position,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type NodeProps,
  type OnSelectionChangeParams
} from "reactflow";
import "reactflow/dist/style.css";
import {
  ArrowLeft,
  Save,
  Lock,
  CheckCircle2,
  X,
  Loader2,
  Play,
  ListChecks,
  FlaskConical,
  Flag,
  Trash2,
  GripVertical,
  Boxes,
  AlertTriangle,
  Pencil,
  Copy,
  MousePointer2
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Perspective, TaskStatus } from "@/lib/types";
import { PERSPECTIVE_META } from "@/lib/types";
import { createJob, createTask, type CreateTaskInput } from "@/lib/api";

type Kind = "task" | "research" | "milestone";

interface VTaskData {
  title: string;
  status: TaskStatus;
  kind: Kind;
  perspective: Perspective | null;
  group_key: string | null;
  description: string;
}

interface VTriggerData {
  name: string;
}

interface Props {
  defaultOwner: string;
  supabaseReady: boolean;
  title?: string;
  subtitle?: string;
  backLink?: { to: string; label: string };
  onLock?: () => void;
  lockLabel?: string;
  onSaved?: () => Promise<void>;
  /** Slot opsional untuk render tab switcher di header */
  headerSlot?: ReactNode;
}

const TRIGGER_ID = "__trigger__";
const STATUSES: TaskStatus[] = ["pending", "in_progress", "done", "cancelled"];
const PERSPECTIVES: Perspective[] = ["financial", "customer", "internal", "capacity"];
const KINDS: Kind[] = ["task", "research", "milestone"];

const KIND_META: Record<
  Kind,
  { label: string; Icon: typeof ListChecks; tint: string }
> = {
  task: { label: "Task", Icon: ListChecks, tint: "text-ink-50" },
  research: { label: "Research", Icon: FlaskConical, tint: "text-accent" },
  milestone: { label: "Milestone", Icon: Flag, tint: "text-ok" }
};

const STATUS_RING: Record<TaskStatus, string> = {
  done: "ring-ok/70",
  in_progress: "ring-warn/80",
  pending: "ring-ink-700",
  cancelled: "ring-muted/60"
};

function localId() {
  return `t_${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Node renderers ───────────────────────────────────────────
function VTriggerNode({ data, selected }: NodeProps<VTriggerData>) {
  return (
    <div
      className={cn(
        "relative bg-gradient-to-br from-accent/25 to-accent/5 rounded-xl px-3 py-2.5 w-56 shadow-lg ring-1 border transition",
        selected
          ? "border-accent ring-accent"
          : "border-accent/60 ring-accent/30"
      )}
    >
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-accent !border-accent !w-2.5 !h-2.5"
      />
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-6 h-6 rounded-full bg-accent/30 border border-accent/60 flex items-center justify-center shrink-0">
          <Play size={12} className="text-accent fill-accent" />
        </div>
        <span className="text-[9px] uppercase tracking-widest text-accent/90">
          Trigger
        </span>
      </div>
      <div className="text-sm font-semibold leading-snug line-clamp-2">
        {data.name || (
          <span className="text-muted italic font-normal">(nama jobdesk)</span>
        )}
      </div>
    </div>
  );
}

function VTaskNode({ data, selected }: NodeProps<VTaskData>) {
  const meta = KIND_META[data.kind];
  const Icon = meta.Icon;
  return (
    <div
      className={cn(
        "relative bg-ink-800 rounded-xl px-3 py-2.5 w-56 shadow-lg ring-1 border transition",
        STATUS_RING[data.status],
        selected
          ? "border-accent ring-accent"
          : "border-ink-700"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-ink-700 !border-ink-600 !w-2.5 !h-2.5"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-ink-700 !border-ink-600 !w-2.5 !h-2.5"
      />
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={12} className={cn("shrink-0", meta.tint)} />
        <span className="text-[9px] uppercase tracking-wider text-muted">
          {meta.label}
        </span>
        {data.group_key && (
          <span className="ml-auto chip bg-accent/15 text-accent text-[9px]">
            {data.group_key}
          </span>
        )}
      </div>
      <div
        className={cn(
          "text-[13px] font-medium leading-snug line-clamp-2",
          data.status === "done" && "line-through text-muted"
        )}
      >
        {data.title || (
          <span className="text-muted italic font-normal">(judul task)</span>
        )}
      </div>
      <div className="mt-1.5 text-[10px] text-muted uppercase tracking-wider">
        {data.status.replace("_", " ")}
      </div>
    </div>
  );
}

const nodeTypes = { vTrigger: VTriggerNode, vTask: VTaskNode };

// ─── Main component ──────────────────────────────────────────
export default function VisualBuilder(props: Props) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  );
}

function Inner({
  defaultOwner,
  supabaseReady,
  title,
  subtitle,
  backLink,
  onLock,
  lockLabel,
  onSaved,
  headerSlot
}: Props) {
  const [jobName, setJobName] = useState("");
  const [nodes, setNodes] = useState<Node[]>(() => [
    {
      id: TRIGGER_ID,
      type: "vTrigger",
      position: { x: 60, y: 220 },
      data: { name: "" } satisfies VTriggerData,
      deletable: false
    }
  ]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [menu, setMenu] = useState<
    | {
        x: number;
        y: number;
        flowPos?: { x: number; y: number };
        nodeId?: string;
        edgeId?: string;
      }
    | null
  >(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const { screenToFlowPosition } = useReactFlow();

  function changeJobName(name: string) {
    setJobName(name);
    setNodes((nds) =>
      nds.map((n) =>
        n.id === TRIGGER_ID ? { ...n, data: { ...n.data, name } } : n
      )
    );
  }

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((n) => applyNodeChanges(changes, n));
  }, []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((e) => applyEdgeChanges(changes, e));
  }, []);
  const onConnect = useCallback((conn: Connection) => {
    if (!conn.source || !conn.target || conn.source === conn.target) return;
    setEdges((eds) =>
      addEdge(
        {
          ...conn,
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed, color: "#6b7280" },
          style: { stroke: "#6b7280", strokeWidth: 1.5 }
        },
        eds
      )
    );
  }, []);

  const onSelectionChange = useCallback(
    ({ nodes: selected }: OnSelectionChangeParams) => {
      setSelectedId(selected[0]?.id ?? null);
    },
    []
  );

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const kind = e.dataTransfer.getData("application/x-vbuilder-kind") as Kind;
      if (!kind || !KINDS.includes(kind)) return;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const id = localId();
      const newNode: Node<VTaskData> = {
        id,
        type: "vTask",
        position,
        data: {
          title: "",
          status: "pending",
          kind,
          perspective: null,
          group_key: null,
          description: ""
        },
        selected: true
      };
      setNodes((nds) => [
        ...nds.map((n) => ({ ...n, selected: false })),
        newNode
      ]);
      setSelectedId(id);
    },
    [screenToFlowPosition]
  );

  function patchSelected(patch: Partial<VTaskData>) {
    if (!selectedId) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedId ? { ...n, data: { ...n.data, ...patch } } : n
      )
    );
  }

  function deleteSelected() {
    if (!selectedId || selectedId === TRIGGER_ID) return;
    deleteNodeId(selectedId);
  }

  function deleteNodeId(id: string) {
    if (id === TRIGGER_ID) return;
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) =>
      eds.filter((e) => e.source !== id && e.target !== id)
    );
    if (selectedId === id) setSelectedId(null);
  }

  function deleteEdgeId(id: string) {
    setEdges((eds) => eds.filter((e) => e.id !== id));
  }

  function addTaskAt(kind: Kind, flowPos: { x: number; y: number }) {
    const id = localId();
    const newNode: Node<VTaskData> = {
      id,
      type: "vTask",
      position: flowPos,
      data: {
        title: "",
        status: "pending",
        kind,
        perspective: null,
        group_key: null,
        description: ""
      },
      selected: true
    };
    setNodes((nds) => [
      ...nds.map((n) => ({ ...n, selected: false })),
      newNode
    ]);
    setSelectedId(id);
  }

  function duplicateNodeId(id: string) {
    const src = nodes.find((n) => n.id === id);
    if (!src || src.type !== "vTask") return;
    const newId = localId();
    const copy: Node<VTaskData> = {
      ...src,
      id: newId,
      position: { x: src.position.x + 30, y: src.position.y + 30 },
      data: { ...(src.data as VTaskData) },
      selected: true
    };
    setNodes((nds) => [
      ...nds.map((n) => ({ ...n, selected: false })),
      copy
    ]);
    setSelectedId(newId);
  }

  const onPaneContextMenu = useCallback(
    (e: ReactMouseEvent | MouseEvent) => {
      e.preventDefault();
      const flowPos = screenToFlowPosition({
        x: e.clientX,
        y: e.clientY
      });
      setMenu({ x: e.clientX, y: e.clientY, flowPos });
    },
    [screenToFlowPosition]
  );

  const onNodeContextMenu = useCallback(
    (e: ReactMouseEvent, node: Node) => {
      e.preventDefault();
      setMenu({ x: e.clientX, y: e.clientY, nodeId: node.id });
    },
    []
  );

  const onEdgeContextMenu = useCallback((e: ReactMouseEvent, edge: Edge) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, edgeId: edge.id });
  }, []);

  const onCanvasDoubleClick = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      // Hanya pas kanvas (pane) yang di-double-click, bukan node/edge
      if (!target.classList?.contains("react-flow__pane")) return;
      const flowPos = screenToFlowPosition({
        x: e.clientX,
        y: e.clientY
      });
      addTaskAt("task", flowPos);
    },
    [screenToFlowPosition]
  );

  // Tutup context menu saat klik di luar / scroll / Escape
  useEffect(() => {
    if (!menu) return;
    function onMouseDown(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as globalThis.Node)
      ) {
        setMenu(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenu(null);
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  function resetCanvas() {
    setJobName("");
    setNodes([
      {
        id: TRIGGER_ID,
        type: "vTrigger",
        position: { x: 60, y: 220 },
        data: { name: "" } satisfies VTriggerData,
        deletable: false
      }
    ]);
    setEdges([]);
    setSelectedId(null);
  }

  const selectedNode = useMemo(
    () => (selectedId ? nodes.find((n) => n.id === selectedId) ?? null : null),
    [selectedId, nodes]
  );

  const taskNodes = useMemo(
    () => nodes.filter((n) => n.type === "vTask"),
    [nodes]
  );

  const groups = useMemo(() => {
    const set = new Set<string>();
    taskNodes.forEach((n) => {
      const g = (n.data as VTaskData).group_key;
      if (g) set.add(g);
    });
    return Array.from(set);
  }, [taskNodes]);

  const canSave =
    supabaseReady && jobName.trim().length > 0 && taskNodes.length > 0 && !saving;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    setErr(null);
    setOk(null);

    try {
      const job = await createJob({
        name: jobName.trim(),
        assignee: defaultOwner
      });

      // Bangun adjacency dependency: target → [source localIds]
      const taskMap = new Map<string, Node>(
        taskNodes.map((n) => [n.id, n])
      );
      const incoming = new Map<string, string[]>();
      taskNodes.forEach((n) => incoming.set(n.id, []));
      edges.forEach((e) => {
        if (e.source === TRIGGER_ID) return;
        if (!taskMap.has(e.source) || !taskMap.has(e.target)) return;
        incoming.get(e.target)!.push(e.source);
      });

      // Topo sort (Kahn) — kalau ada cycle, append sisanya apa adanya
      const order: string[] = [];
      const remaining = new Map<string, string[]>();
      incoming.forEach((parents, id) => remaining.set(id, [...parents]));
      while (remaining.size > 0) {
        const ready = Array.from(remaining.entries())
          .filter(([, parents]) => parents.length === 0)
          .map(([id]) => id);
        if (ready.length === 0) {
          remaining.forEach((_, id) => order.push(id));
          break;
        }
        const readySet = new Set(ready);
        ready.forEach((id) => {
          order.push(id);
          remaining.delete(id);
        });
        remaining.forEach((parents, id) => {
          remaining.set(
            id,
            parents.filter((p) => !readySet.has(p))
          );
        });
      }

      // Insert tasks satu per satu, mapping localId → realId
      const localToReal = new Map<string, string>();
      let orderNum = 1;
      for (const localTaskId of order) {
        const node = taskMap.get(localTaskId)!;
        const data = node.data as VTaskData;
        const parents = incoming.get(localTaskId) ?? [];
        const realDeps = parents
          .map((p) => localToReal.get(p))
          .filter((x): x is string => Boolean(x));

        const payload: CreateTaskInput = {
          job_id: job.id,
          title: data.title.trim() || "(tanpa judul)",
          status: data.status,
          kind: data.kind,
          perspective: data.perspective,
          group_key: data.group_key,
          description: data.description.trim() || null,
          order_num: orderNum++
        };
        if (realDeps.length > 0) payload.depends_on = realDeps;

        const created = await createTask(payload);
        localToReal.set(localTaskId, created.id);
      }

      setOk(`✓ Jobdesk "${jobName.trim()}" tersimpan dengan ${taskNodes.length} task`);
      resetCanvas();
      if (onSaved) await onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-6 space-y-5">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <Link
          to={backLink?.to ?? "/"}
          className="flex items-center gap-2 text-sm text-muted hover:text-ink-50 transition"
        >
          <ArrowLeft size={16} /> {backLink?.label ?? "Kembali ke dashboard"}
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Boxes size={14} /> {title ?? "Visual Builder"}
          </div>
          {onLock && (
            <button
              onClick={onLock}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-late transition"
              title="Kunci panel"
            >
              <Lock size={12} /> {lockLabel ?? "Kunci"}
            </button>
          )}
        </div>
      </header>

      <div>
        <h1 className="text-2xl font-semibold">{title ?? "Visual Builder"}</h1>
        <p className="text-sm text-muted">
          {subtitle ??
            "Drag node dari sidebar, hubungkan dengan garis untuk dependency. Klik node untuk edit propertinya."}
        </p>
      </div>

      {headerSlot}

      {!supabaseReady && (
        <div className="card border-late/60 bg-late/10 flex items-start gap-3">
          <AlertTriangle size={18} className="text-late shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-late mb-1">
              Supabase belum dikonfigurasi
            </div>
            <div className="text-muted">
              Isi <code className="text-accent">VITE_SUPABASE_URL</code> dan{" "}
              <code className="text-accent">VITE_SUPABASE_ANON_KEY</code> di{" "}
              <code className="text-accent">.env.local</code>, lalu restart dev
              server.
            </div>
          </div>
        </div>
      )}

      {err && (
        <div className="card border-late/60 bg-late/10 flex items-start gap-3 animate-in fade-in">
          <X size={18} className="text-late shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <div className="font-semibold text-late mb-1">Gagal menyimpan</div>
            <div className="text-muted break-all">{err}</div>
          </div>
          <button
            onClick={() => setErr(null)}
            className="text-muted hover:text-ink-50 transition"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {ok && (
        <div className="card border-ok/60 bg-ok/10 flex items-start gap-3 animate-in fade-in">
          <CheckCircle2 size={18} className="text-ok shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-ok font-medium">{ok}</div>
          <button
            onClick={() => setOk(null)}
            className="text-ok/60 hover:text-ok transition"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="flex items-end gap-3 p-3 border-b border-ink-700 flex-wrap bg-ink-900/40">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-[10px] uppercase tracking-widest text-muted mb-1">
              Nama Jobdesk
            </label>
            <input
              value={jobName}
              onChange={(e) => changeJobName(e.target.value)}
              placeholder="Contoh: SERP Generator V1"
              className="input"
              disabled={!supabaseReady}
            />
          </div>
          <div className="text-xs text-muted tabular-nums whitespace-nowrap">
            {taskNodes.length} task · {edges.length} koneksi
          </div>
          <button
            onClick={save}
            disabled={!canSave}
            className="btn btn-accent disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              !supabaseReady
                ? "Supabase belum siap"
                : taskNodes.length === 0
                  ? "Tambahkan minimal satu node"
                  : !jobName.trim()
                    ? "Isi nama jobdesk"
                    : "Simpan jobdesk + tasks"
            }
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Menyimpan...
              </>
            ) : (
              <>
                <Save size={14} /> Simpan Jobdesk
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-12 gap-0 h-[640px]">
          <aside className="col-span-12 sm:col-span-3 lg:col-span-2 border-r border-ink-700 bg-ink-900/30 p-3 space-y-2 overflow-y-auto">
            <div className="text-[10px] uppercase tracking-widest text-muted mb-1">
              Tambah node
            </div>
            {KINDS.map((kind) => (
              <PaletteItem key={kind} kind={kind} />
            ))}
            <div className="mt-4 text-[10px] text-muted leading-relaxed space-y-2">
              <div>
                <span className="text-ink-50 font-medium">Cara cepat:</span>
                <br />
                <kbd className="px-1 bg-ink-700 rounded text-[10px]">
                  Klik kanan
                </kbd>{" "}
                kanvas → pilih jenis node.
                <br />
                <kbd className="px-1 bg-ink-700 rounded text-[10px]">
                  Dobel-klik
                </kbd>{" "}
                kanvas → tambah Task.
                <br />
                <kbd className="px-1 bg-ink-700 rounded text-[10px]">
                  Klik kanan
                </kbd>{" "}
                node/edge → hapus / duplikat.
              </div>
              <div>
                <span className="text-ink-50 font-medium">Connect:</span>{" "}
                tarik dari titik kanan node ke titik kiri node lain.
              </div>
              <div>
                <kbd className="px-1 bg-ink-700 rounded text-[10px]">Del</kbd>{" "}
                /{" "}
                <kbd className="px-1 bg-ink-700 rounded text-[10px]">
                  Backspace
                </kbd>{" "}
                hapus item terpilih.
              </div>
            </div>
          </aside>

          <div
            className="col-span-12 sm:col-span-9 lg:col-span-7 relative bg-ink-900/50"
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDoubleClick={onCanvasDoubleClick}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onSelectionChange={onSelectionChange}
              onPaneContextMenu={onPaneContextMenu}
              onNodeContextMenu={onNodeContextMenu}
              onEdgeContextMenu={onEdgeContextMenu}
              nodeTypes={nodeTypes}
              defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
              minZoom={0.3}
              maxZoom={1.6}
              proOptions={{ hideAttribution: true }}
              deleteKeyCode={["Backspace", "Delete"]}
              snapToGrid
              snapGrid={[20, 20]}
            >
              <Background color="#1a1a22" gap={20} size={1} />
              <Controls
                className="!bg-ink-800 !border !border-ink-700 !rounded-lg !shadow-lg"
                showInteractive={false}
              />
            </ReactFlow>
            {taskNodes.length === 0 && (
              <div className="absolute top-3 right-3 text-xs text-muted bg-ink-800/90 backdrop-blur border border-ink-700 rounded-md px-3 py-2 max-w-[280px] pointer-events-none space-y-1.5">
                <div className="flex items-center gap-1.5 text-ink-50">
                  <MousePointer2 size={12} className="text-accent" />
                  <span className="font-medium">Mulai bikin flow</span>
                </div>
                <div>
                  <kbd className="px-1 bg-ink-700 rounded text-[10px]">
                    Klik kanan
                  </kbd>{" "}
                  di kanvas untuk pilih jenis node, atau{" "}
                  <kbd className="px-1 bg-ink-700 rounded text-[10px]">
                    dobel-klik
                  </kbd>{" "}
                  untuk tambah Task cepat.
                </div>
              </div>
            )}
          </div>

          <aside className="col-span-12 lg:col-span-3 border-t lg:border-t-0 lg:border-l border-ink-700 bg-ink-900/30 p-3 overflow-y-auto">
            <Inspector
              node={selectedNode}
              groups={groups}
              onPatch={patchSelected}
              onDelete={deleteSelected}
              disabled={!supabaseReady || saving}
            />
          </aside>
        </div>
      </div>

      {menu && (
        <ContextMenu
          menuRef={menuRef}
          menu={menu}
          isTrigger={menu.nodeId === TRIGGER_ID}
          onAddNode={(kind) => {
            if (!menu.flowPos) return;
            addTaskAt(kind, menu.flowPos);
            setMenu(null);
          }}
          onEditNode={(id) => {
            setSelectedId(id);
            setMenu(null);
          }}
          onDuplicateNode={(id) => {
            duplicateNodeId(id);
            setMenu(null);
          }}
          onDeleteNode={(id) => {
            deleteNodeId(id);
            setMenu(null);
          }}
          onDeleteEdge={(id) => {
            deleteEdgeId(id);
            setMenu(null);
          }}
        />
      )}
    </main>
  );
}

// ─── Context Menu ────────────────────────────────────────────
function ContextMenu({
  menuRef,
  menu,
  isTrigger,
  onAddNode,
  onEditNode,
  onDuplicateNode,
  onDeleteNode,
  onDeleteEdge
}: {
  menuRef: React.RefObject<HTMLDivElement>;
  menu: {
    x: number;
    y: number;
    flowPos?: { x: number; y: number };
    nodeId?: string;
    edgeId?: string;
  };
  isTrigger: boolean;
  onAddNode: (kind: Kind) => void;
  onEditNode: (id: string) => void;
  onDuplicateNode: (id: string) => void;
  onDeleteNode: (id: string) => void;
  onDeleteEdge: (id: string) => void;
}) {
  // Klamp posisi supaya menu tidak keluar viewport
  const style: React.CSSProperties = {
    left: Math.min(menu.x, window.innerWidth - 200),
    top: Math.min(menu.y, window.innerHeight - 220)
  };

  return (
    <div
      ref={menuRef}
      style={style}
      className="fixed z-50 min-w-[180px] rounded-lg border border-ink-700 bg-ink-800 shadow-2xl py-1 text-sm"
    >
      {menu.flowPos && !menu.nodeId && !menu.edgeId && (
        <>
          <div className="px-3 py-1 text-[10px] uppercase tracking-widest text-muted">
            Tambah node di sini
          </div>
          {KINDS.map((k) => {
            const meta = KIND_META[k];
            const Icon = meta.Icon;
            return (
              <button
                key={k}
                onClick={() => onAddNode(k)}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-ink-700 text-left transition"
              >
                <Icon size={13} className={meta.tint} />
                <span>{meta.label}</span>
              </button>
            );
          })}
        </>
      )}

      {menu.nodeId && !isTrigger && (
        <>
          <button
            onClick={() => onEditNode(menu.nodeId!)}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-ink-700 text-left transition"
          >
            <Pencil size={13} className="text-muted" /> Edit
          </button>
          <button
            onClick={() => onDuplicateNode(menu.nodeId!)}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-ink-700 text-left transition"
          >
            <Copy size={13} className="text-muted" /> Duplikat
          </button>
          <div className="border-t border-ink-700 my-1" />
          <button
            onClick={() => onDeleteNode(menu.nodeId!)}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-ink-700 text-late text-left transition"
          >
            <Trash2 size={13} /> Hapus
          </button>
        </>
      )}

      {menu.nodeId && isTrigger && (
        <div className="px-3 py-2 text-xs text-muted italic">
          Trigger tidak bisa dihapus.
          <br />
          Edit nama jobdesk di kolom atas.
        </div>
      )}

      {menu.edgeId && (
        <button
          onClick={() => onDeleteEdge(menu.edgeId!)}
          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-ink-700 text-late text-left transition"
        >
          <Trash2 size={13} /> Hapus koneksi
        </button>
      )}
    </div>
  );
}

// ─── Palette ─────────────────────────────────────────────────
function PaletteItem({ kind }: { kind: Kind }) {
  const meta = KIND_META[kind];
  const Icon = meta.Icon;
  const onDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("application/x-vbuilder-kind", kind);
    e.dataTransfer.effectAllowed = "move";
  };
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-800 px-2.5 py-2 cursor-grab active:cursor-grabbing hover:border-accent/60 hover:bg-ink-800/80 transition select-none"
      title={`Drag '${meta.label}' ke kanvas`}
    >
      <GripVertical size={12} className="text-muted shrink-0" />
      <Icon size={14} className={cn(meta.tint, "shrink-0")} />
      <span className="text-xs font-medium">{meta.label}</span>
    </div>
  );
}

// ─── Inspector ───────────────────────────────────────────────
function Inspector({
  node,
  groups,
  onPatch,
  onDelete,
  disabled
}: {
  node: Node | null;
  groups: string[];
  onPatch: (patch: Partial<VTaskData>) => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  if (!node) {
    return (
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted mb-2">
          Inspector
        </div>
        <div className="text-xs text-muted italic">
          Klik salah satu node untuk mengedit propertinya di sini.
        </div>
      </div>
    );
  }

  if (node.type === "vTrigger") {
    const data = node.data as VTriggerData;
    return (
      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-widest text-muted">
          Trigger
        </div>
        <div className="text-sm font-semibold">
          {data.name || (
            <span className="text-muted italic font-normal">
              (belum ada nama)
            </span>
          )}
        </div>
        <p className="text-xs text-muted leading-relaxed">
          Edit nama jobdesk di kolom atas. Trigger hanya satu per jobdesk dan
          tidak bisa dihapus.
        </p>
      </div>
    );
  }

  const data = node.data as VTaskData;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-widest text-muted">
          Edit Node
        </div>
        <button
          onClick={onDelete}
          disabled={disabled}
          className="text-muted hover:text-late text-xs flex items-center gap-1 disabled:opacity-30"
        >
          <Trash2 size={12} /> Hapus
        </button>
      </div>
      <Field label="Judul">
        <input
          value={data.title}
          onChange={(e) => onPatch({ title: e.target.value })}
          placeholder="Judul task"
          className="input"
          disabled={disabled}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Kind">
          <select
            value={data.kind}
            onChange={(e) => onPatch({ kind: e.target.value as Kind })}
            className="input"
            disabled={disabled}
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_META[k].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select
            value={data.status}
            onChange={(e) =>
              onPatch({ status: e.target.value as TaskStatus })
            }
            className="input"
            disabled={disabled}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Perspective">
        <select
          value={data.perspective ?? ""}
          onChange={(e) =>
            onPatch({
              perspective: (e.target.value || null) as Perspective | null
            })
          }
          className="input"
          disabled={disabled}
        >
          <option value="">— none —</option>
          {PERSPECTIVES.map((p) => (
            <option key={p} value={p}>
              {PERSPECTIVE_META[p].label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Grup (opsional)">
        <GroupCombo
          value={data.group_key ?? ""}
          options={groups}
          disabled={disabled}
          onChange={(v) => onPatch({ group_key: v.trim() || null })}
        />
      </Field>
      <Field label="Catatan">
        <textarea
          value={data.description}
          onChange={(e) => onPatch({ description: e.target.value })}
          placeholder="Catatan tambahan…"
          className="input min-h-[64px] resize-y"
          disabled={disabled}
        />
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-widest text-muted mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

function GroupCombo({
  value,
  options,
  disabled,
  onChange
}: {
  value: string;
  options: string[];
  disabled?: boolean;
  onChange: (next: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");

  if (creating) {
    return (
      <div className="flex gap-1">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const v = draft.trim();
            if (v) onChange(v);
            setDraft("");
            setCreating(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            } else if (e.key === "Escape") {
              setDraft("");
              setCreating(false);
            }
          }}
          placeholder="nama grup"
          autoFocus
          className="input flex-1"
        />
        <button
          type="button"
          onClick={() => {
            setCreating(false);
            setDraft("");
          }}
          className="btn px-2"
        >
          <X size={12} />
        </button>
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "__new__") {
          setDraft("");
          setCreating(true);
        } else {
          onChange(v);
        }
      }}
      disabled={disabled}
      className="input"
    >
      <option value="">— no grup —</option>
      {options.map((g) => (
        <option key={g} value={g}>
          {g}
        </option>
      ))}
      <option value="__new__">+ Buat grup baru…</option>
    </select>
  );
}
