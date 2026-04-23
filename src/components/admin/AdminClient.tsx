import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Job, JobSnapshot, Perspective, Task, TaskStatus } from "@/lib/types";
import { PERSPECTIVE_META } from "@/lib/types";
import { DEFAULT_OWNER } from "@/lib/config";
import {
  createJob,
  createTask,
  deleteJob,
  patchTask,
  softDeleteTask,
  type CreateTaskInput,
  type PatchTaskInput
} from "@/lib/api";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Settings,
  AlertTriangle,
  Briefcase,
  ListChecks,
  Check,
  X,
  Pencil,
  CheckCircle2,
  Loader2,
  Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { lockAdmin } from "@/components/admin/AdminGate";

type Kind = NonNullable<Task["kind"]>;

interface Props {
  snapshots: JobSnapshot[];
  supabaseReady: boolean;
  reload: () => Promise<void>;
}

const STATUSES: TaskStatus[] = ["pending", "in_progress", "done", "cancelled"];
const KINDS: Kind[] = ["task", "research", "milestone", "trigger"];
const PERSPECTIVES: Perspective[] = ["financial", "customer", "internal", "capacity"];

// ─── GroupPicker: dropdown grup yang sudah ada + opsi buat baru ─────────
function GroupPicker({
  value,
  options,
  disabled,
  compact,
  onChange
}: {
  value: string;
  options: string[];
  disabled?: boolean;
  compact?: boolean;
  onChange: (next: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");

  const klass = compact ? "input-compact" : "input";
  const width = compact ? "w-28" : "w-32";

  if (creating) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const name = draft.trim();
          if (name) onChange(name);
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
        className={`${klass} ${width} shrink-0`}
      />
    );
  }

  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "__new__") setCreating(true);
        else onChange(v);
      }}
      className={`${klass} ${width} shrink-0`}
      title="Tasks dengan grup sama sejajar horizontal di flow"
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

export default function AdminClient({ snapshots, supabaseReady, reload }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    if (!ok) return;
    const t = setTimeout(() => setOk(null), 4000);
    return () => clearTimeout(t);
  }, [ok]);

  useEffect(() => {
    if (err || ok) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [err, ok]);

  function flash(msg: string) {
    setErr(null);
    setOk(msg);
  }

  async function run<T>(
    label: string,
    fn: () => Promise<T>,
    opts: { refresh?: boolean; successMsg?: string } = {}
  ): Promise<T | null> {
    const { refresh = true, successMsg } = opts;
    setErr(null);
    setBusy(label);
    try {
      const result = await fn();
      if (refresh) await reload();
      if (successMsg) flash(successMsg);
      return result;
    } catch (e) {
      setErr((e as Error).message);
      setOk(null);
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function handleCreateJobWithTasks(data: {
    name: string;
    tasks: { title: string; group: string }[];
  }) {
    const job = await run<Job>(
      "create job",
      () => createJob({ name: data.name, assignee: DEFAULT_OWNER }),
      { refresh: false }
    );
    if (!job) return false;

    let taskOk = 0;
    for (const row of data.tasks) {
      const t = await run<Task>(
        "create task",
        () =>
          createTask({
            job_id: job.id,
            title: row.title,
            group_key: row.group.trim() || null
          }),
        { refresh: false }
      );
      if (t) taskOk++;
      else break;
    }

    await reload();

    flash(
      taskOk === data.tasks.length
        ? `✓ Jobdesk "${data.name}" tersimpan${taskOk ? ` dengan ${taskOk} task` : ""}`
        : `⚠ Jobdesk tersimpan tapi cuma ${taskOk}/${data.tasks.length} task yang masuk — cek error di atas`
    );
    return taskOk === data.tasks.length;
  }

  return (
    <main className="mx-auto max-w-5xl p-4 md:p-6 space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-muted hover:text-ink-50 transition"
        >
          <ArrowLeft size={16} /> Kembali ke dashboard
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Settings size={14} /> Admin Panel
          </div>
          <button
            onClick={() => {
              lockAdmin();
              window.location.reload();
            }}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-late transition"
            title="Kunci admin panel"
          >
            <Lock size={12} /> Kunci
          </button>
        </div>
      </header>

      <div>
        <h1 className="text-2xl font-semibold">Admin Panel</h1>
        <p className="text-sm text-muted">
          Kelola jobdesk & task. Task dengan <em>grup</em> sama akan sejajar horizontal di flow.
        </p>
      </div>

      {!supabaseReady && (
        <div className="card border-late/60 bg-late/10 flex items-start gap-3">
          <AlertTriangle size={18} className="text-late shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-late mb-1">Supabase belum dikonfigurasi</div>
            <div className="text-muted">
              Isi <code className="text-accent">VITE_SUPABASE_URL</code> dan{" "}
              <code className="text-accent">VITE_SUPABASE_ANON_KEY</code> di{" "}
              <code className="text-accent">.env.local</code>, lalu restart dev server.
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

      {busy && (
        <div className="fixed bottom-5 left-5 z-40 rounded-full bg-ink-800 border border-ink-700 shadow-lg px-3 py-2 text-xs text-muted flex items-center gap-2">
          <Loader2 size={12} className="animate-spin text-accent" />
          Menyimpan...
        </div>
      )}

      <Section title="Jobdesk" icon={<Briefcase size={16} />}>
        <JobForm
          disabled={busy !== null || !supabaseReady}
          onSubmit={handleCreateJobWithTasks}
        />

        <div className="space-y-3 mt-4">
          {snapshots.length === 0 && (
            <div className="text-sm text-muted italic">Belum ada jobdesk.</div>
          )}
          {snapshots.map((snap) => (
            <JobBlock
              key={snap.job.id}
              snap={snap}
              disabled={busy !== null || !supabaseReady}
              onAddTask={(data) =>
                run(
                  "create task",
                  () => createTask({ job_id: snap.job.id, ...data }),
                  { successMsg: `✓ Task "${data.title}" ditambah` }
                )
              }
              onEditTask={(id, patch) =>
                run("patch task", () => patchTask(id, patch), {
                  successMsg: `✓ Task diupdate`
                })
              }
              onDeleteTask={(id) =>
                run("delete task", () => softDeleteTask(id), {
                  successMsg: `✓ Task dihapus`
                })
              }
              onDeleteJob={() =>
                run("delete job", () => deleteJob(snap.job.id), {
                  successMsg: `✓ Jobdesk "${snap.job.name}" dihapus`
                })
              }
            />
          ))}
        </div>
      </Section>
    </main>
  );
}

// ─── Subcomponents ───────────────────────────────────────────

function Section({
  title,
  icon,
  children
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted">
        <span className="text-accent">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

interface JobFormRow {
  title: string;
  follow: boolean; // true = baris ini ikut grup baris di atasnya (kayak Tab)
}

// Resolve follow-toggle jadi group_key konkret.
// Contoh: [A, B(follow), C(follow), D, E(follow)] → ["G1","G1","G1","","G2"? tidak]
// Rule: run of follow=true membentuk satu grup dengan baris "pemicu" (pertama yang follow=false
// tepat sebelum run). Run panjang 1 (follow=false + berikutnya follow=false) = tanpa grup.
function resolveGroups(rows: JobFormRow[]): (string | null)[] {
  const out: (string | null)[] = Array(rows.length).fill(null);
  let counter = 0;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].follow && i > 0) continue; // akan diisi saat handle anchor-nya
    // anchor (i) — cek apakah ada baris setelahnya yang follow
    let j = i + 1;
    while (j < rows.length && rows[j].follow) j++;
    const runLen = j - i;
    if (runLen >= 2) {
      counter++;
      const name = `G${counter}`;
      for (let k = i; k < j; k++) out[k] = name;
    }
    i = j - 1;
  }
  return out;
}

function JobForm({
  disabled,
  onSubmit
}: {
  disabled: boolean;
  onSubmit: (data: { name: string; tasks: { title: string; group: string }[] }) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [tasks, setTasks] = useState<JobFormRow[]>([{ title: "", follow: false }]);
  const [saving, setSaving] = useState(false);

  function reset() {
    setName("");
    setTasks([{ title: "", follow: false }]);
    setOpen(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    // Resolve follow toggle jadi group_key sebelum drop row kosong
    const groups = resolveGroups(tasks);
    const clean = tasks
      .map((t, i) => ({ title: t.title.trim(), group: groups[i] ?? "" }))
      .filter((t) => t.title);
    setSaving(true);
    const success = await onSubmit({ name: name.trim(), tasks: clean });
    setSaving(false);
    if (success) reset();
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>, idx: number) {
    const raw = e.clipboardData.getData("text");
    if (!raw.includes("\n")) return;
    e.preventDefault();

    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.replace(/^\s*(?:\d+[.)]?|[-•*])\s*/, "").trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    // Pasted rows default tidak follow — user toggle manual kalau mau dikelompokkan
    const newRows: JobFormRow[] = lines.map((title) => ({ title, follow: false }));

    const next = [...tasks];
    const currentIsEmpty = !(next[idx]?.title ?? "").trim();
    if (currentIsEmpty) {
      next.splice(idx, 1, ...newRows);
    } else {
      next.splice(idx + 1, 0, ...newRows);
    }
    setTasks(next);
  }

  if (!open) {
    return (
      <button
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="btn btn-accent disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus size={14} /> Tambah Jobdesk
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="border border-ink-700 rounded-xl p-4 space-y-4 bg-ink-900/40"
    >
      <Field label="Nama Jobdesk">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Contoh: SERP Generator V1"
          className="input"
          autoFocus
        />
      </Field>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] uppercase tracking-widest text-muted">
            Daftar Tugas{" "}
            <span className="text-muted/60 normal-case tracking-normal">
              — klik <kbd className="px-1 bg-ink-700 rounded text-[10px]">↳</kbd> untuk gabung grup sama kayak baris atas
            </span>
          </span>
          <span className="text-[11px] text-muted/70">
            {tasks.filter((t) => t.title.trim()).length} task
          </span>
        </div>
        <div className="space-y-1.5">
          {(() => {
            const resolved = resolveGroups(tasks);
            return tasks.map((row, i) => {
              const group = resolved[i];
              const canFollow = i > 0;
              return (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-muted w-6 text-right tabular-nums text-xs shrink-0">
                    {i + 1}.
                  </span>
                  <button
                    type="button"
                    disabled={!canFollow}
                    onClick={() => {
                      const copy = [...tasks];
                      copy[i] = { ...copy[i], follow: !copy[i].follow };
                      setTasks(copy);
                    }}
                    title={
                      !canFollow
                        ? "Baris pertama tidak bisa ikut grup di atasnya"
                        : row.follow
                          ? "Klik untuk keluar dari grup (mulai sendiri)"
                          : "Klik untuk ikut grup baris atas (seperti Tab)"
                    }
                    className={cn(
                      "shrink-0 w-7 h-7 rounded-md border flex items-center justify-center text-xs transition",
                      !canFollow && "opacity-30 cursor-not-allowed",
                      canFollow && row.follow
                        ? "bg-accent/20 border-accent/60 text-accent"
                        : "bg-ink-800 border-ink-700 text-muted hover:text-ink-50"
                    )}
                  >
                    ↳
                  </button>
                  <div
                    className={cn(
                      "flex-1 flex items-center gap-2",
                      row.follow && "pl-4 border-l-2 border-accent/40 ml-1"
                    )}
                  >
                    <input
                      value={row.title}
                      onChange={(e) => {
                        const next = [...tasks];
                        next[i] = { ...next[i], title: e.target.value };
                        setTasks(next);
                      }}
                      onPaste={(e) => handlePaste(e, i)}
                      placeholder={`Contoh: ${
                        ["Ambil data batch analys", "Setup nameserver", "Export top page"][i % 3]
                      }`}
                      className="input flex-1"
                    />
                    {group && (
                      <span className="chip bg-accent/15 text-accent text-[10px] shrink-0">
                        {group}
                      </span>
                    )}
                  </div>
                  {tasks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setTasks(tasks.filter((_, j) => j !== i))}
                      className="text-muted hover:text-late px-2 transition shrink-0"
                      title="Hapus baris"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              );
            });
          })()}
        </div>
        <button
          type="button"
          onClick={() => setTasks([...tasks, { title: "", follow: false }])}
          className="mt-2 text-xs text-accent hover:text-accent/80 inline-flex items-center gap-1"
        >
          <Plus size={12} /> Tambah baris task
        </button>
      </div>

      <div className="flex gap-2 pt-2 border-t border-ink-700">
        <button
          type="submit"
          className="btn btn-accent"
          disabled={disabled || saving || !name.trim()}
        >
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Menyimpan...
            </>
          ) : (
            <>
              <Check size={14} /> Simpan
            </>
          )}
        </button>
        <button type="button" onClick={reset} className="btn" disabled={saving}>
          Batal
        </button>
      </div>
    </form>
  );
}

function JobBlock({
  snap,
  disabled,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onDeleteJob
}: {
  snap: JobSnapshot;
  disabled: boolean;
  onAddTask: (data: Omit<CreateTaskInput, "job_id">) => void;
  onEditTask: (id: string, patch: PatchTaskInput) => void;
  onDeleteTask: (id: string) => void;
  onDeleteJob: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const active = snap.tasks
    .filter((t) => !t.deleted_at)
    .sort((a, b) => a.order_num - b.order_num);
  const existingGroups = Array.from(
    new Set(active.map((t) => t.group_key).filter((g): g is string => Boolean(g)))
  );
  const [openDepsTaskId, setOpenDepsTaskId] = useState<string | null>(null);

  return (
    <div className="border border-ink-700 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-3 bg-ink-800/60 border-b border-ink-700">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="chip bg-accent/15 text-accent">{snap.job.assignee}</span>
            <span className="font-semibold truncate">{snap.job.name}</span>
          </div>
          <div className="text-xs text-muted mt-0.5">
            {snap.progress.done_tasks}/{snap.progress.total_tasks} selesai · {active.length} task
            aktif
          </div>
        </div>
        <button
          onClick={() => {
            if (confirm(`Hapus jobdesk "${snap.job.name}" beserta semua task-nya?`)) onDeleteJob();
          }}
          disabled={disabled}
          className="text-muted hover:text-late transition disabled:opacity-30"
          title="Hapus job"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <ListChecks size={14} className="text-muted" />
          <span className="text-xs uppercase tracking-widest text-muted">Tasks</span>
        </div>

        {active.length === 0 && (
          <div className="text-xs text-muted italic">Belum ada task.</div>
        )}

        {active.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            existingGroups={existingGroups}
            siblingTasks={active}
            depsOpen={openDepsTaskId === t.id}
            onToggleDeps={() =>
              setOpenDepsTaskId((curr) => (curr === t.id ? null : t.id))
            }
            disabled={disabled}
            onEdit={(patch) => onEditTask(t.id, patch)}
            onDelete={() => onDeleteTask(t.id)}
          />
        ))}

        {showForm ? (
          <TaskForm
            disabled={disabled}
            existingGroups={existingGroups}
            nextOrderNum={Math.max(0, ...active.map((t) => t.order_num)) + 1}
            onSubmit={(data) => {
              onAddTask(data);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        ) : (
          <button
            onClick={() => setShowForm(true)}
            disabled={disabled}
            className="btn mt-2 text-sm disabled:opacity-50"
          >
            <Plus size={13} /> Tambah Task
          </button>
        )}
      </div>
    </div>
  );
}

interface TaskFormData {
  title: string;
  status: TaskStatus;
  perspective: Perspective | null;
  kind: Kind;
  order_num: number;
  group_key: string | null;
  description?: string | null;
}

// YYYY-MM-DD (local) <-> ISO roundtrip buat input[type=date]
function toDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fromDateInput(val: string): string | null {
  if (!val) return null;
  const d = new Date(`${val}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function TaskRow({
  task,
  existingGroups,
  siblingTasks,
  depsOpen,
  onToggleDeps,
  disabled,
  onEdit,
  onDelete
}: {
  task: Task;
  existingGroups: string[];
  siblingTasks: Task[];
  depsOpen: boolean;
  onToggleDeps: () => void;
  disabled: boolean;
  onEdit: (patch: PatchTaskInput) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const depsCount = task.depends_on?.length ?? 0;

  if (editing) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-md bg-ink-800/60 border border-ink-700">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input flex-1"
          autoFocus
        />
        <button
          onClick={() => {
            onEdit({ title });
            setEditing(false);
          }}
          className="btn btn-accent px-2"
          disabled={disabled || !title.trim()}
        >
          <Check size={14} />
        </button>
        <button
          onClick={() => {
            setTitle(task.title);
            setEditing(false);
          }}
          className="btn px-2"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  const isDone = task.status === "done";

  return (
    <div className={cn("rounded-md hover:bg-ink-800/40", isDone && "opacity-80")}>
      <div className="flex items-center gap-2 p-2 flex-wrap">
      <span className="text-muted w-6 text-right tabular-nums text-xs shrink-0">
        {task.order_num}.
      </span>
      <span
        className={cn(
          "flex-1 min-w-[180px] text-sm truncate",
          isDone && "line-through text-muted"
        )}
      >
        {task.title}
      </span>

      <GroupPicker
        value={task.group_key ?? ""}
        options={existingGroups}
        disabled={disabled}
        compact
        onChange={(next) => onEdit({ group_key: next.trim() || null })}
      />

      <button
        type="button"
        onClick={onToggleDeps}
        disabled={disabled}
        title="Kaitkan dengan task lain (dependency)"
        className={cn(
          "chip text-[10px] shrink-0 transition disabled:opacity-30",
          depsCount > 0
            ? "bg-accent/15 text-accent hover:bg-accent/25"
            : "bg-ink-800 text-muted hover:text-ink-50 border border-dashed border-ink-700"
        )}
      >
        ↔ {depsCount > 0 ? `${depsCount} dep` : "+ dep"}
      </button>

      <select
        value={task.status}
        onChange={(e) => {
          const nextStatus = e.target.value as TaskStatus;
          const patch: PatchTaskInput = { status: nextStatus };
          // Auto-isi completed_at saat pertama kali di-mark done
          if (nextStatus === "done" && !task.completed_at) {
            patch.completed_at = new Date().toISOString();
          }
          // Kembalikan null saat di-unmark dari done
          if (nextStatus !== "done" && task.status === "done") {
            patch.completed_at = null;
          }
          onEdit(patch);
        }}
        disabled={disabled}
        className="input-compact"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.replace("_", " ")}
          </option>
        ))}
      </select>

      {isDone && (
        <input
          type="date"
          value={toDateInput(task.completed_at)}
          onChange={(e) => onEdit({ completed_at: fromDateInput(e.target.value) })}
          disabled={disabled}
          title="Tanggal selesai (bisa di-backdate)"
          className="input-compact"
        />
      )}

      <button
        onClick={() => setEditing(true)}
        disabled={disabled}
        className="text-muted hover:text-accent transition disabled:opacity-30"
        title="Edit judul"
      >
        <Pencil size={13} />
      </button>
      <button
        onClick={() => {
          if (confirm(`Hapus task "${task.title}"?`)) onDelete();
        }}
        disabled={disabled}
        className="text-muted hover:text-late transition disabled:opacity-30"
        title="Hapus task"
      >
        <Trash2 size={13} />
      </button>
      </div>

      {depsOpen && (
        <div className="mx-2 mb-2 rounded-md border border-ink-700 bg-ink-900/60 p-2 text-xs">
          <div className="text-muted mb-1.5">
            Task ini berkaitan dengan (cross-group):
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-1 max-h-48 overflow-y-auto">
            {siblingTasks
              .filter((s) => s.id !== task.id)
              .map((s) => {
                const checked = task.depends_on?.includes(s.id) ?? false;
                return (
                  <label
                    key={s.id}
                    className={cn(
                      "flex items-center gap-2 cursor-pointer hover:bg-ink-800/60 px-1.5 py-0.5 rounded",
                      checked && "text-accent"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={(e) => {
                        const current = task.depends_on ?? [];
                        const next = e.target.checked
                          ? [...current, s.id]
                          : current.filter((id) => id !== s.id);
                        onEdit({ depends_on: next });
                      }}
                      className="accent-accent"
                    />
                    <span className="text-muted tabular-nums shrink-0">
                      {s.order_num}.
                    </span>
                    <span className="truncate">{s.title}</span>
                    {s.group_key && (
                      <span className="chip bg-ink-700 text-[9px] text-muted shrink-0">
                        {s.group_key}
                      </span>
                    )}
                  </label>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskForm({
  disabled,
  existingGroups,
  nextOrderNum,
  onSubmit,
  onCancel
}: {
  disabled: boolean;
  existingGroups: string[];
  nextOrderNum: number;
  onSubmit: (data: TaskFormData) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>("pending");
  const [perspective, setPerspective] = useState<Perspective | "">("");
  const [kind, setKind] = useState<Kind>("task");
  const [groupKey, setGroupKey] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      status,
      perspective: perspective || null,
      kind,
      order_num: nextOrderNum,
      group_key: groupKey.trim() || null
    });
    setTitle("");
  }

  return (
    <form
      onSubmit={submit}
      className="border border-ink-700 rounded-lg p-3 space-y-2 bg-ink-900/60 mt-2"
    >
      <Field label="Judul task">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Contoh: Setup Cloudflare tunnel"
          className="input"
          autoFocus
        />
      </Field>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Field label="Status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
            className="input"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Perspective">
          <select
            value={perspective}
            onChange={(e) => setPerspective(e.target.value as Perspective | "")}
            className="input"
          >
            <option value="">— none —</option>
            {PERSPECTIVES.map((p) => (
              <option key={p} value={p}>
                {PERSPECTIVE_META[p].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Kind">
          <select value={kind} onChange={(e) => setKind(e.target.value as Kind)} className="input">
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Grup (opsional)">
          <GroupPicker
            value={groupKey}
            options={existingGroups}
            onChange={(next) => setGroupKey(next)}
          />
        </Field>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn btn-accent" disabled={disabled}>
          <Check size={14} /> Simpan Task
        </button>
        <button type="button" onClick={onCancel} className="btn">
          Batal
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-widest text-muted mb-1">{label}</span>
      {children}
    </label>
  );
}
