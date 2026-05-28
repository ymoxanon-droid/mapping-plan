import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { Link } from "react-router-dom";
import ReactFlow, {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlowProvider,
  MarkerType,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps
} from "reactflow";
import "reactflow/dist/style.css";
import type { Job, JobSnapshot, Task, TaskStatus } from "@/lib/types";
import {
  createJob,
  createTask,
  deleteJob as apiDeleteJob,
  patchJob,
  patchTask,
  softDeleteTask
} from "@/lib/api";
import { layoutFlow } from "@/lib/flow-layout";
import { assignJobColors } from "@/lib/flow-colors";
import {
  ArrowLeft,
  Boxes,
  Lock,
  Plus,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
  ListChecks,
  FlaskConical,
  Flag,
  CheckCircle2,
  Circle,
  Cloud,
  CloudOff,
  Play,
  XCircle,
  Briefcase,
  Pencil,
  ChevronRight,
  LayoutGrid
} from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = Exclude<NonNullable<Task["kind"]>, "trigger">;

interface Props {
  defaultOwner: string;
  snapshots: JobSnapshot[];
  supabaseReady: boolean;
  title?: string;
  subtitle?: string;
  backLink?: { to: string; label: string };
  onLock?: () => void;
  lockLabel?: string;
  onSaved?: () => Promise<void>;
  headerSlot?: ReactNode;
}

type SaveState = "idle" | "saving" | "saved" | "error";

const STATUSES: TaskStatus[] = ["pending", "in_progress", "done", "cancelled"];
const KIND_VALUES: Kind[] = ["task", "research", "milestone"];

const STATUS_META: Record<
  TaskStatus,
  { Icon: typeof CheckCircle2; ring: string; text: string; tint: string; label: string }
> = {
  done: {
    Icon: CheckCircle2,
    ring: "ring-ok/70",
    text: "text-ok",
    tint: "bg-ok/10",
    label: "Selesai"
  },
  in_progress: {
    Icon: Loader2,
    ring: "ring-warn/80",
    text: "text-warn",
    tint: "bg-warn/10",
    label: "Jalan"
  },
  pending: {
    Icon: Circle,
    ring: "ring-ink-700",
    text: "text-muted",
    tint: "",
    label: "Pending"
  },
  cancelled: {
    Icon: XCircle,
    ring: "ring-muted/60",
    text: "text-muted",
    tint: "",
    label: "Batal"
  }
};

const KIND_META: Record<Kind, { Icon: typeof ListChecks; label: string }> = {
  task: { Icon: ListChecks, label: "Task" },
  research: { Icon: FlaskConical, label: "Research" },
  milestone: { Icon: Flag, label: "Milestone" }
};

interface PositionMap {
  [nodeId: string]: { x: number; y: number };
}

function posKey(owner: string, jobId: string) {
  return `vbuilder_pos_v2_${owner.toLowerCase()}_${jobId}`;
}

function loadPositions(owner: string, jobId: string): PositionMap {
  try {
    const raw = localStorage.getItem(posKey(owner, jobId));
    return raw ? (JSON.parse(raw) as PositionMap) : {};
  } catch {
    return {};
  }
}

function savePositions(owner: string, jobId: string, p: PositionMap) {
  try {
    localStorage.setItem(posKey(owner, jobId), JSON.stringify(p));
  } catch {
    /* */
  }
}

interface Board {
  job: Job;
  tasks: Task[];
}

// ─── Main export ─────────────────────────────────────────────
export default function VisualBuilder(props: Props) {
  return (
    <ReactFlowProvider>
      <Outer {...props} />
    </ReactFlowProvider>
  );
}

function Outer(props: Props) {
  const ownerKey = props.defaultOwner.toLowerCase();

  const initialBoards = useMemo<Board[]>(() => {
    return props.snapshots
      .filter((s) => s.job.assignee.toLowerCase() === ownerKey)
      .map((s) => ({
        job: s.job,
        tasks: s.tasks
          .filter((t) => !t.deleted_at)
          .sort((a, b) => a.order_num - b.order_num)
      }))
      .sort((a, b) => a.job.name.localeCompare(b.job.name));
  }, [props.snapshots, ownerKey]);

  const [boards, setBoards] = useState<Board[]>(initialBoards);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setBoards(initialBoards);
  }, [initialBoards]);

  useEffect(() => {
    if (saveState !== "saved") return;
    const t = setTimeout(() => setSaveState("idle"), 1200);
    return () => clearTimeout(t);
  }, [saveState]);

  const pendingOps = useRef(0);
  const withSave = useCallback(<T,>(fn: () => Promise<T>): Promise<T> => {
    pendingOps.current++;
    setSaveState("saving");
    setErr(null);
    return fn()
      .then((res) => {
        pendingOps.current = Math.max(0, pendingOps.current - 1);
        if (pendingOps.current === 0) setSaveState("saved");
        return res;
      })
      .catch((e: Error) => {
        pendingOps.current = Math.max(0, pendingOps.current - 1);
        setSaveState("error");
        setErr(e.message);
        throw e;
      });
  }, []);

  const notify = useCallback(() => {
    if (props.onSaved) void props.onSaved();
  }, [props]);

  const selected = useMemo(
    () => boards.find((b) => b.job.id === selectedJobId) ?? null,
    [boards, selectedJobId]
  );

  // ─── CRUD ─────────────────────────────────────────────────
  const createNewJob = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      try {
        const job = await withSave(() =>
          createJob({ name: trimmed, assignee: ownerKey })
        );
        setBoards((bs) => [...bs, { job, tasks: [] }]);
        notify();
        return job;
      } catch {
        return null;
      }
    },
    [ownerKey, withSave, notify]
  );

  const renameJob = useCallback(
    async (jobId: string, name: string) => {
      const orig = boards.find((b) => b.job.id === jobId);
      if (!orig) return;
      setBoards((bs) =>
        bs.map((b) =>
          b.job.id === jobId ? { ...b, job: { ...b.job, name } } : b
        )
      );
      try {
        await withSave(() => patchJob(jobId, { name }));
        notify();
      } catch {
        setBoards((bs) =>
          bs.map((b) => (b.job.id === jobId ? { ...b, job: orig.job } : b))
        );
      }
    },
    [boards, withSave, notify]
  );

  const deleteJobAction = useCallback(
    async (jobId: string) => {
      const orig = boards.find((b) => b.job.id === jobId);
      if (!orig) return;
      const msg =
        orig.tasks.length > 0
          ? `Hapus jobdesk "${orig.job.name}" dan ${orig.tasks.length} task di dalamnya?`
          : `Hapus jobdesk "${orig.job.name}"?`;
      if (!confirm(msg)) return;
      setBoards((bs) => bs.filter((b) => b.job.id !== jobId));
      if (selectedJobId === jobId) setSelectedJobId(null);
      try {
        await withSave(() => apiDeleteJob(jobId));
        try {
          localStorage.removeItem(posKey(ownerKey, jobId));
        } catch {
          /* */
        }
        notify();
      } catch {
        setBoards((bs) => [...bs, orig]);
      }
    },
    [boards, selectedJobId, ownerKey, withSave, notify]
  );

  const addTask = useCallback(
    async (jobId: string, parentTaskId: string | null) => {
      const board = boards.find((b) => b.job.id === jobId);
      if (!board) return null;
      const orderNum =
        (board.tasks.reduce((m, t) => Math.max(m, t.order_num), 0) || 0) + 1;
      try {
        const created = await withSave(() =>
          createTask({
            job_id: jobId,
            title: "",
            status: "pending",
            kind: "task",
            order_num: orderNum,
            depends_on: parentTaskId ? [parentTaskId] : undefined
          })
        );
        setBoards((bs) =>
          bs.map((b) =>
            b.job.id === jobId ? { ...b, tasks: [...b.tasks, created] } : b
          )
        );
        notify();
        return created;
      } catch {
        return null;
      }
    },
    [boards, withSave, notify]
  );

  const updateTask = useCallback(
    async (taskId: string, patch: Partial<Task>) => {
      const board = boards.find((b) => b.tasks.some((t) => t.id === taskId));
      const orig = board?.tasks.find((t) => t.id === taskId);
      if (!board || !orig) return;
      const optimistic: Task = { ...orig, ...patch } as Task;
      setBoards((bs) =>
        bs.map((b) =>
          b.job.id === board.job.id
            ? {
                ...b,
                tasks: b.tasks.map((t) => (t.id === taskId ? optimistic : t))
              }
            : b
        )
      );
      try {
        const result = await withSave(() =>
          patchTask(taskId, {
            title: patch.title,
            status: patch.status,
            kind: patch.kind ?? undefined,
            depends_on: patch.depends_on ?? undefined,
            group_key: patch.group_key
          })
        );
        setBoards((bs) =>
          bs.map((b) =>
            b.job.id === board.job.id
              ? {
                  ...b,
                  tasks: b.tasks.map((t) => (t.id === taskId ? result : t))
                }
              : b
          )
        );
        notify();
      } catch {
        setBoards((bs) =>
          bs.map((b) =>
            b.job.id === board.job.id
              ? { ...b, tasks: b.tasks.map((t) => (t.id === taskId ? orig : t)) }
              : b
          )
        );
      }
    },
    [boards, withSave, notify]
  );

  const deleteTaskAction = useCallback(
    async (taskId: string) => {
      const board = boards.find((b) => b.tasks.some((t) => t.id === taskId));
      const orig = board?.tasks.find((t) => t.id === taskId);
      if (!board || !orig) return;
      if (!confirm(`Hapus task "${orig.title || "(tanpa judul)"}"?`)) return;
      setBoards((bs) =>
        bs.map((b) =>
          b.job.id === board.job.id
            ? { ...b, tasks: b.tasks.filter((t) => t.id !== taskId) }
            : b
        )
      );
      const dependents = board.tasks.filter((t) =>
        t.depends_on?.includes(taskId)
      );
      try {
        await withSave(async () => {
          await softDeleteTask(taskId);
          await Promise.all(
            dependents.map((t) =>
              patchTask(t.id, {
                depends_on: (t.depends_on ?? []).filter((d) => d !== taskId)
              })
            )
          );
        });
        notify();
      } catch {
        setBoards((bs) =>
          bs.map((b) =>
            b.job.id === board.job.id ? { ...b, tasks: [...b.tasks, orig] } : b
          )
        );
      }
    },
    [boards, withSave, notify]
  );

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-6 space-y-4">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <Link
          to={props.backLink?.to ?? "/"}
          className="flex items-center gap-2 text-sm text-muted hover:text-ink-50 transition"
        >
          <ArrowLeft size={16} />{" "}
          {props.backLink?.label ?? "Kembali ke dashboard"}
        </Link>
        <div className="flex items-center gap-3">
          <SaveBadge state={saveState} />
          <div className="flex items-center gap-2 text-xs text-muted">
            <Boxes size={14} /> {props.title ?? "Visual Builder"}
          </div>
          {props.onLock && (
            <button
              onClick={props.onLock}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-late transition"
              title="Kunci panel"
            >
              <Lock size={12} /> {props.lockLabel ?? "Kunci"}
            </button>
          )}
        </div>
      </header>

      <div>
        <h1 className="text-2xl font-semibold">{props.title ?? "Visual Builder"}</h1>
        <p className="text-sm text-muted">
          {selected
            ? `Edit visual flow untuk "${selected.job.name}". Klik node untuk edit, drag bebas posisi.`
            : props.subtitle ??
              "Pilih jobdesk untuk diedit, atau buat jobdesk baru."}
        </p>
      </div>

      {props.headerSlot}

      {!props.supabaseReady && (
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
            <div className="font-semibold text-late mb-1">Gagal</div>
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

      {selected ? (
        <FlowEditor
          board={selected}
          owner={ownerKey}
          supabaseReady={props.supabaseReady}
          onBack={() => setSelectedJobId(null)}
          onRenameJob={(name) => renameJob(selected.job.id, name)}
          onDeleteJob={() => deleteJobAction(selected.job.id)}
          onAddTask={(parentId) => addTask(selected.job.id, parentId)}
          onUpdateTask={updateTask}
          onDeleteTask={deleteTaskAction}
          onErr={setErr}
        />
      ) : (
        <JobPicker
          boards={boards}
          supabaseReady={props.supabaseReady}
          onPick={(id) => setSelectedJobId(id)}
          onCreate={async (name) => {
            const job = await createNewJob(name);
            if (job) setSelectedJobId(job.id);
          }}
          onDelete={deleteJobAction}
          onRename={renameJob}
        />
      )}
    </main>
  );
}

// ─── Job Picker (landing) ────────────────────────────────────
function JobPicker({
  boards,
  supabaseReady,
  onPick,
  onCreate,
  onDelete,
  onRename
}: {
  boards: Board[];
  supabaseReady: boolean;
  onPick: (id: string) => void;
  onCreate: (name: string) => Promise<void>;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  const sorted = useMemo(
    () =>
      [...boards].sort(
        (a, b) =>
          new Date(b.job.updated_at).getTime() -
          new Date(a.job.updated_at).getTime()
      ),
    [boards]
  );

  return (
    <div className="card space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted">
            <LayoutGrid size={14} className="text-accent" />
            Pilih Jobdesk
          </h2>
          <p className="text-xs text-muted mt-1">
            Pilih jobdesk yang sudah ada untuk diedit, atau buat baru.
          </p>
        </div>
        {!creating && (
          <button
            onClick={() => {
              setName("");
              setCreating(true);
            }}
            disabled={!supabaseReady}
            className="btn btn-accent text-xs disabled:opacity-50"
          >
            <Plus size={13} /> Jobdesk Baru
          </button>
        )}
      </div>

      {creating && (
        <div className="rounded-lg border border-accent/40 bg-ink-800/60 p-3 space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-muted block">
            Nama jobdesk baru
          </label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Onboarding Klien Q2"
              className="input flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (name.trim()) {
                    void onCreate(name);
                    setName("");
                    setCreating(false);
                  }
                } else if (e.key === "Escape") {
                  setCreating(false);
                  setName("");
                }
              }}
            />
            <button
              onClick={() => {
                if (name.trim()) {
                  void onCreate(name);
                  setName("");
                  setCreating(false);
                }
              }}
              disabled={!name.trim()}
              className="btn btn-accent text-xs disabled:opacity-50"
            >
              <CheckCircle2 size={12} /> Buat & Buka
            </button>
            <button
              onClick={() => {
                setCreating(false);
                setName("");
              }}
              className="btn text-xs"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {sorted.length === 0 && !creating && (
        <div className="text-center py-10 text-muted space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-accent/15 flex items-center justify-center">
            <Briefcase size={24} className="text-accent" />
          </div>
          <div>
            <div className="text-ink-50 font-medium">Belum ada jobdesk</div>
            <div className="text-xs mt-1">
              Mulai dengan bikin jobdesk pertama kamu.
            </div>
          </div>
          <button
            onClick={() => setCreating(true)}
            disabled={!supabaseReady}
            className="btn btn-accent text-xs"
          >
            <Plus size={14} /> Buat Jobdesk Pertama
          </button>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sorted.map((b) => {
            const done = b.tasks.filter((t) => t.status === "done").length;
            const running = b.tasks.filter(
              (t) => t.status === "in_progress"
            ).length;
            const total = b.tasks.length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const isRenaming = renamingId === b.job.id;
            return (
              <div
                key={b.job.id}
                className="group rounded-xl border border-ink-700 bg-ink-800/40 hover:border-accent/60 hover:bg-ink-800/70 transition flex flex-col"
              >
                <div className="p-3 flex-1 min-h-[110px]">
                  <div className="flex items-start gap-2 mb-2">
                    {isRenaming ? (
                      <input
                        autoFocus
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        onBlur={() => {
                          const v = draftName.trim();
                          if (v && v !== b.job.name) onRename(b.job.id, v);
                          setRenamingId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            (e.target as HTMLInputElement).blur();
                          } else if (e.key === "Escape") {
                            setRenamingId(null);
                          }
                        }}
                        className="input flex-1 text-sm font-semibold"
                      />
                    ) : (
                      <button
                        onClick={() => onPick(b.job.id)}
                        className="flex-1 text-left text-sm font-semibold leading-snug hover:text-accent transition truncate"
                      >
                        {b.job.name}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setDraftName(b.job.name);
                        setRenamingId(b.job.id);
                      }}
                      className="text-muted hover:text-accent transition shrink-0 opacity-0 group-hover:opacity-100"
                      title="Ganti nama"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => onDelete(b.job.id)}
                      className="text-muted hover:text-late transition shrink-0 opacity-0 group-hover:opacity-100"
                      title="Hapus jobdesk"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted mb-2">
                    <span>
                      <span className="tabular-nums text-ink-50 font-semibold text-xs mr-1">
                        {total}
                      </span>
                      task
                    </span>
                    {running > 0 && (
                      <span className="text-warn">
                        <span className="tabular-nums font-semibold text-xs mr-1">
                          {running}
                        </span>
                        jalan
                      </span>
                    )}
                    <span className="text-ok">
                      <span className="tabular-nums font-semibold text-xs mr-1">
                        {done}
                      </span>
                      selesai
                    </span>
                  </div>

                  <div className="h-1.5 rounded-full bg-ink-700 overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all",
                        pct >= 100
                          ? "bg-ok"
                          : pct >= 40
                            ? "bg-warn"
                            : pct > 0
                              ? "bg-accent"
                              : "bg-ink-700"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <button
                  onClick={() => onPick(b.job.id)}
                  className="flex items-center justify-between gap-2 text-xs text-muted hover:text-accent border-t border-ink-700 px-3 py-2 transition group-hover:text-accent"
                >
                  <span>Buka visual editor</span>
                  <ChevronRight size={12} />
                </button>
              </div>
            );
          })}

          {!creating && (
            <button
              onClick={() => setCreating(true)}
              disabled={!supabaseReady}
              className="rounded-xl border-2 border-dashed border-ink-700 hover:border-accent/60 hover:bg-accent/5 text-muted hover:text-accent transition flex flex-col items-center justify-center gap-2 min-h-[140px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={20} />
              <span className="text-sm font-medium">Jobdesk Baru</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Flow Editor (single-job canvas) ─────────────────────────
interface VTriggerData {
  job: Job;
  color: string;
  taskCount: number;
  onRename: (name: string) => void;
  onDelete: () => void;
  onAddTask: () => void;
}

interface VTaskData {
  task: Task;
  onTitle: (title: string) => void;
  onStatus: (status: TaskStatus) => void;
  onKind: (kind: Kind) => void;
  onAddAfter: () => void;
  onDelete: () => void;
}

function VTriggerNode({ data, selected }: NodeProps<VTriggerData>) {
  const c = data.color;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.job.name);

  useEffect(() => {
    setDraft(data.job.name);
  }, [data.job.name]);

  function commit() {
    setEditing(false);
    const v = draft.trim();
    if (v && v !== data.job.name) data.onRename(v);
    else setDraft(data.job.name);
  }

  return (
    <div
      className={cn(
        "group relative rounded-xl px-3 py-2.5 w-60 shadow-lg ring-1 border transition",
        selected && "ring-2"
      )}
      style={{
        backgroundImage: `linear-gradient(135deg, ${c}40 0%, ${c}0d 100%)`,
        borderColor: `${c}99`,
        boxShadow: `0 0 0 1px ${c}33, 0 8px 20px -8px ${c}55`
      }}
    >
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5"
        style={{ background: c, borderColor: c }}
      />
      <button
        onClick={data.onDelete}
        className="nodrag nopan absolute -top-2 -right-2 w-5 h-5 rounded-full bg-late text-white shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 transition z-20"
        title="Hapus jobdesk"
      >
        <X size={11} />
      </button>
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
        <span className="ml-auto chip text-[9px] bg-ink-900/80 text-muted">
          {data.taskCount} task
        </span>
      </div>
      {editing ? (
        <input
          value={draft}
          autoFocus
          className="nodrag nopan w-full bg-ink-900/60 border border-accent/60 rounded px-1.5 py-0.5 text-sm font-semibold outline-none"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            else if (e.key === "Escape") {
              setDraft(data.job.name);
              setEditing(false);
            }
          }}
        />
      ) : (
        <div
          onClick={() => setEditing(true)}
          className="nodrag nopan text-sm font-semibold leading-snug line-clamp-2 cursor-text hover:bg-ink-900/30 rounded px-1 -mx-1 py-0.5 -my-0.5 transition"
          title="Klik untuk ganti nama jobdesk"
        >
          {data.job.name || (
            <span className="text-muted italic font-normal">(nama jobdesk)</span>
          )}
        </div>
      )}
      <button
        onClick={data.onAddTask}
        className="nodrag nopan mt-2 w-full text-[11px] flex items-center justify-center gap-1 rounded-md py-1 border border-dashed border-ink-700 hover:border-accent hover:bg-accent/10 text-muted hover:text-accent transition"
        title="Tambah task pertama"
      >
        <Plus size={11} /> Task
      </button>
    </div>
  );
}

function VTaskNode({ data, selected }: NodeProps<VTaskData>) {
  const t = data.task;
  const s = STATUS_META[t.status];
  const kind = (t.kind as Kind) ?? "task";
  const KindIcon = KIND_META[kind].Icon;
  const StatusIcon = s.Icon;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(t.title);
  const [openStatus, setOpenStatus] = useState(false);
  const [openKind, setOpenKind] = useState(false);

  useEffect(() => {
    setDraft(t.title);
  }, [t.title]);

  useEffect(() => {
    if (!openStatus && !openKind) return;
    function close() {
      setOpenStatus(false);
      setOpenKind(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [openStatus, openKind]);

  function commit() {
    setEditing(false);
    const v = draft.trim();
    if (v && v !== t.title) data.onTitle(v);
    else setDraft(t.title);
  }

  return (
    <div className="group relative w-60">
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

      <button
        onClick={data.onDelete}
        className="nodrag nopan absolute -top-2 -right-2 w-5 h-5 rounded-full bg-late text-white shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 transition z-20"
        title="Hapus task"
      >
        <X size={11} />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          data.onAddAfter();
        }}
        className="nodrag nopan absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-accent text-white shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 transition z-20"
        title="Tambah task setelah ini"
      >
        <Plus size={12} />
      </button>

      <div
        className={cn(
          "relative overflow-hidden border bg-ink-800 rounded-xl px-3 py-2.5 shadow-lg ring-1 transition",
          s.ring,
          selected ? "border-accent ring-accent" : "border-ink-700"
        )}
      >
        {s.tint && (
          <div
            aria-hidden
            className={cn("absolute inset-0 pointer-events-none", s.tint)}
          />
        )}
        <div className="relative">
          <div className="flex items-center gap-1.5 mb-1.5">
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenKind((v) => !v);
                setOpenStatus(false);
              }}
              className="nodrag nopan p-0.5 rounded hover:bg-ink-700 transition flex items-center"
              title={`Jenis: ${KIND_META[kind].label}`}
            >
              <KindIcon
                size={12}
                className={kind === "task" ? "text-muted" : "text-accent"}
              />
            </button>
            {openKind && (
              <div
                onMouseDown={(e) => e.stopPropagation()}
                className="nodrag nopan absolute top-full left-0 mt-1 z-30 rounded-md border border-ink-700 bg-ink-800 shadow-xl py-1 min-w-[120px]"
              >
                {KIND_VALUES.map((k) => {
                  const Ki = KIND_META[k].Icon;
                  return (
                    <button
                      key={k}
                      onClick={() => {
                        data.onKind(k);
                        setOpenKind(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-2.5 py-1 text-xs hover:bg-ink-700 transition text-left",
                        kind === k && "text-accent"
                      )}
                    >
                      <Ki size={11} />
                      {KIND_META[k].label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenStatus((v) => !v);
                setOpenKind(false);
              }}
              className={cn(
                "nodrag nopan p-0.5 rounded hover:bg-ink-700 transition flex items-center",
                s.text
              )}
              title={`Status: ${s.label}`}
            >
              <StatusIcon
                size={13}
                className={t.status === "in_progress" ? "animate-spin" : undefined}
              />
            </button>
            {openStatus && (
              <div
                onMouseDown={(e) => e.stopPropagation()}
                className="nodrag nopan absolute top-full left-0 mt-1 z-30 rounded-md border border-ink-700 bg-ink-800 shadow-xl py-1 min-w-[120px]"
              >
                {STATUSES.map((st) => {
                  const Si = STATUS_META[st].Icon;
                  return (
                    <button
                      key={st}
                      onClick={() => {
                        data.onStatus(st);
                        setOpenStatus(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-2.5 py-1 text-xs hover:bg-ink-700 transition text-left",
                        STATUS_META[st].text,
                        t.status === st && "bg-ink-700/50"
                      )}
                    >
                      <Si size={11} />
                      {STATUS_META[st].label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {t.group_key && (
            <span className="chip text-[9px] bg-accent/15 text-accent ml-1">
              {t.group_key}
            </span>
          )}

          <span className="ml-auto text-[9px] uppercase tracking-wider text-muted">
            #{t.order_num}
          </span>
        </div>

        {editing ? (
          <input
            value={draft}
            autoFocus
            className="nodrag nopan w-full bg-ink-900/70 border border-accent/60 rounded px-1.5 py-1 text-[13px] font-medium outline-none"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              else if (e.key === "Escape") {
                setDraft(t.title);
                setEditing(false);
              }
            }}
          />
        ) : (
          <div
            onClick={() => setEditing(true)}
            className={cn(
              "nodrag nopan text-[13px] font-medium leading-snug line-clamp-2 cursor-text hover:bg-ink-900/30 rounded px-1 -mx-1 py-0.5 -my-0.5 transition",
              t.status === "done" && "line-through text-muted"
            )}
            title="Klik untuk edit judul"
          >
            {t.title || (
              <span className="text-muted italic font-normal">(judul task)</span>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

const nodeTypes = { vTrigger: VTriggerNode, vTask: VTaskNode };

function FlowEditor({
  board,
  owner,
  supabaseReady,
  onBack,
  onRenameJob,
  onDeleteJob,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onErr
}: {
  board: Board;
  owner: string;
  supabaseReady: boolean;
  onBack: () => void;
  onRenameJob: (name: string) => void;
  onDeleteJob: () => void;
  onAddTask: (parentId: string | null) => Promise<Task | null>;
  onUpdateTask: (taskId: string, patch: Partial<Task>) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onErr: (msg: string | null) => void;
}) {
  const jobColors = useMemo(() => assignJobColors([board.job.id]), [board.job.id]);
  const triggerColor = jobColors.get(board.job.id) ?? "#7c5cff";
  const triggerId = `trigger_${board.job.id}`;

  const [positions, setPositions] = useState<PositionMap>(() =>
    loadPositions(owner, board.job.id)
  );

  useEffect(() => {
    setPositions(loadPositions(owner, board.job.id));
  }, [owner, board.job.id]);

  const persistPosition = useCallback(
    (id: string, x: number, y: number) => {
      setPositions((p) => {
        const next = { ...p, [id]: { x, y } };
        savePositions(owner, board.job.id, next);
        return next;
      });
    },
    [owner, board.job.id]
  );

  // ─── Build graph (dashboard-compatible logic) ─────────────
  const { graphNodes, graphEdges } = useMemo(() => {
    const ns: Node[] = [];
    const es: Edge[] = [];

    ns.push({
      id: triggerId,
      type: "vTrigger",
      position: { x: 0, y: 0 },
      deletable: false,
      data: {
        job: board.job,
        color: triggerColor,
        taskCount: board.tasks.length,
        onRename: onRenameJob,
        onDelete: onDeleteJob,
        onAddTask: () => onAddTask(null)
      } satisfies VTriggerData
    });

    // Group_key chains (prev-in-group), matching dashboard
    const groupMembers = new Map<string, Task[]>();
    board.tasks.forEach((t) => {
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

    const taskById = new Map(board.tasks.map((t) => [t.id, t]));

    board.tasks.forEach((task) => {
      ns.push({
        id: task.id,
        type: "vTask",
        position: { x: 0, y: 0 },
        data: {
          task,
          onTitle: (title: string) => onUpdateTask(task.id, { title }),
          onStatus: (status: TaskStatus) => onUpdateTask(task.id, { status }),
          onKind: (kind: Kind) => onUpdateTask(task.id, { kind }),
          onAddAfter: () => onAddTask(task.id),
          onDelete: () => onDeleteTask(task.id)
        } satisfies VTaskData
      });

      const deps = task.depends_on ?? [];
      const prev = prevInGroup.get(task.id);

      if (prev) {
        es.push({
          id: `${prev.id}->${task.id}`,
          source: prev.id,
          target: task.id,
          type: "smoothstep",
          animated:
            task.status === "in_progress" || prev.status === "in_progress",
          style: edgeStyle(prev.status),
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: edgeStyle(prev.status).stroke as string
          }
        });
      }

      deps.forEach((depId) => {
        const src = taskById.get(depId);
        if (!src) return;
        es.push({
          id: `${depId}->${task.id}`,
          source: depId,
          target: task.id,
          type: "smoothstep",
          animated:
            task.status === "in_progress" || src.status === "in_progress",
          style: { ...edgeStyle(src.status), strokeDasharray: "4 4" },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: edgeStyle(src.status).stroke as string
          }
        });
      });

      if (!prev && deps.length === 0) {
        es.push({
          id: `${triggerId}->${task.id}`,
          source: triggerId,
          target: task.id,
          type: "smoothstep",
          animated: task.status === "in_progress",
          style: { stroke: "#4b5563", strokeWidth: 1.5 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#6b7280"
          }
        });
      }
    });

    return { graphNodes: ns, graphEdges: es };
  }, [
    board,
    triggerColor,
    triggerId,
    onRenameJob,
    onDeleteJob,
    onAddTask,
    onUpdateTask,
    onDeleteTask
  ]);

  // Auto-layout (dagre LR) with saved-position overrides
  const positionedNodes = useMemo<Node[]>(() => {
    if (graphNodes.length === 0) return [];
    const laid = layoutFlow(graphNodes, graphEdges, { direction: "LR" });
    return laid.nodes.map((n) => {
      const saved = positions[n.id];
      return saved
        ? { ...n, position: { x: saved.x, y: saved.y } }
        : n;
    });
  }, [graphNodes, graphEdges, positions]);

  const [rfNodes, setRfNodes] = useState<Node[]>(positionedNodes);
  const [rfEdges, setRfEdges] = useState<Edge[]>(graphEdges);

  useEffect(() => {
    setRfNodes(positionedNodes);
  }, [positionedNodes]);

  useEffect(() => {
    setRfEdges(graphEdges);
  }, [graphEdges]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setRfNodes((nds) => applyNodeChanges(changes, nds));
      changes.forEach((c) => {
        if (c.type === "position" && c.position && !c.dragging) {
          persistPosition(c.id, c.position.x, c.position.y);
        }
      });
    },
    [persistPosition]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setRfEdges((eds) => applyEdgeChanges(changes, eds));
      changes.forEach((c) => {
        if (c.type === "remove") {
          const edge = graphEdges.find((e) => e.id === c.id);
          if (!edge) return;
          if (edge.source.startsWith("trigger_")) return;
          const target = board.tasks.find((t) => t.id === edge.target);
          if (!target) return;
          const newDeps = (target.depends_on ?? []).filter(
            (d) => d !== edge.source
          );
          void onUpdateTask(target.id, { depends_on: newDeps });
        }
      });
    },
    [graphEdges, board.tasks, onUpdateTask]
  );

  const onConnect = useCallback(
    (conn: Connection) => {
      if (!conn.source || !conn.target || conn.source === conn.target) return;
      if (conn.source.startsWith("trigger_")) return;
      const target = board.tasks.find((t) => t.id === conn.target);
      const sourceInJob = board.tasks.some((t) => t.id === conn.source);
      if (!sourceInJob || !target) {
        onErr("Dependency hanya boleh antar task di jobdesk ini.");
        return;
      }
      const current = target.depends_on ?? [];
      if (current.includes(conn.source)) return;
      void onUpdateTask(target.id, {
        depends_on: [...current, conn.source]
      });
    },
    [board.tasks, onUpdateTask, onErr]
  );

  const { fitView } = useReactFlow();
  const didFitRef = useRef(false);
  useEffect(() => {
    didFitRef.current = false;
  }, [board.job.id]);
  useEffect(() => {
    if (didFitRef.current || rfNodes.length === 0) return;
    didFitRef.current = true;
    const t = setTimeout(() => fitView({ padding: 0.15, duration: 300 }), 100);
    return () => clearTimeout(t);
  }, [rfNodes.length, fitView]);

  const resetLayout = useCallback(() => {
    if (!confirm("Reset posisi semua node ke layout otomatis?")) return;
    try {
      localStorage.removeItem(posKey(owner, board.job.id));
    } catch {
      /* */
    }
    setPositions({});
  }, [owner, board.job.id]);

  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-3 border-b border-ink-700 flex-wrap bg-ink-900/40">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={onBack}
            className="btn text-xs"
            title="Kembali ke daftar jobdesk"
          >
            <ArrowLeft size={12} /> Daftar
          </button>
          <div className="text-sm font-semibold truncate">{board.job.name}</div>
          <span className="chip text-[10px] bg-ink-700 text-muted shrink-0">
            {board.tasks.length} task
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetLayout}
            disabled={!supabaseReady}
            className="btn text-xs disabled:opacity-50"
            title="Reset posisi node ke auto-layout"
          >
            Reset Posisi
          </button>
          <button
            onClick={() => onAddTask(null)}
            disabled={!supabaseReady}
            className="btn btn-accent text-xs disabled:opacity-50"
          >
            <Plus size={12} /> Task
          </button>
        </div>
      </div>

      <div className="relative h-[640px] bg-ink-900/50">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          minZoom={0.25}
          maxZoom={1.6}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{
            type: "smoothstep",
            style: { stroke: "#6b7280", strokeWidth: 1.5 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#6b7280" }
          }}
          deleteKeyCode={["Backspace", "Delete"]}
          snapToGrid
          snapGrid={[16, 16]}
          fitView
          fitViewOptions={{ padding: 0.15 }}
        >
          <Background color="#1a1a22" gap={20} size={1} />
          <Controls
            className="!bg-ink-800 !border !border-ink-700 !rounded-lg !shadow-lg"
            showInteractive={false}
          />
        </ReactFlow>

        {board.tasks.length === 0 && (
          <div className="absolute top-3 right-3 max-w-[260px] rounded-md border border-ink-700 bg-ink-800/90 backdrop-blur px-3 py-2 text-[11px] text-muted pointer-events-none">
            Belum ada task. Klik tombol{" "}
            <kbd className="bg-ink-700 rounded px-1 text-[10px]">+ Task</kbd>{" "}
            di kanan atas atau di trigger.
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-ink-700 bg-ink-900/40 text-[11px] text-muted flex items-center gap-x-4 gap-y-1 flex-wrap">
        <span>
          <kbd className="bg-ink-700 rounded px-1 mr-1 text-[10px]">Klik</kbd>{" "}
          judul/status/jenis untuk edit
        </span>
        <span>
          <kbd className="bg-ink-700 rounded px-1 mr-1 text-[10px]">Drag</kbd>{" "}
          node bebas posisi
        </span>
        <span>
          <kbd className="bg-ink-700 rounded px-1 mr-1 text-[10px]">+</kbd>{" "}
          tambah task setelah ini
        </span>
        <span>
          <kbd className="bg-ink-700 rounded px-1 mr-1 text-[10px]">Tarik garis</kbd>{" "}
          antar task = dependency
        </span>
        <span>
          <kbd className="bg-ink-700 rounded px-1 mr-1 text-[10px]">Del</kbd>{" "}
          hapus garis terpilih
        </span>
      </div>
    </div>
  );
}

function edgeStyle(srcStatus: TaskStatus): { stroke: string; strokeWidth: number } {
  if (srcStatus === "done") return { stroke: "#22c55e", strokeWidth: 1.5 };
  if (srcStatus === "in_progress") return { stroke: "#eab308", strokeWidth: 2 };
  return { stroke: "#4b5563", strokeWidth: 1.5 };
}

function SaveBadge({ state }: { state: SaveState }) {
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted">
        <Loader2 size={12} className="animate-spin text-accent" /> Menyimpan…
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-ok">
        <Cloud size={12} /> Tersimpan
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-late">
        <CloudOff size={12} /> Gagal sync
      </span>
    );
  }
  return null;
}
