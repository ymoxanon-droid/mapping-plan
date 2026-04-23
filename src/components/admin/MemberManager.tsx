import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  addMember,
  deleteMember,
  listMembers,
  updateMember,
  type Member
} from "@/lib/members";
import { lockAdmin } from "@/components/admin/AdminGate";
import type { JobSnapshot } from "@/lib/types";
import {
  ArrowLeft,
  Activity,
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  EyeOff,
  History,
  KeyRound,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Settings,
  Timer,
  Trash2,
  UserPlus,
  Users,
  X,
  ExternalLink
} from "lucide-react";
import { cn, formatDate, formatDateTime, formatDuration, relativeDate } from "@/lib/utils";

interface JobDetail {
  snap: JobSnapshot;
  createdAt: string;
  completedAt: string | null;
  isFullyDone: boolean;
  lastActivityAt: string | null;
  durationText: string;
  durationLabel: string;
}

function buildJobDetails(snap: JobSnapshot): JobDetail {
  const createdAt = snap.job.created_at;
  const percent = snap.progress?.percent_done ?? 0;
  const isFullyDone =
    percent >= 100 &&
    snap.progress.total_tasks > 0 &&
    snap.progress.total_tasks === snap.progress.done_tasks;

  let completedAt: string | null = null;
  if (isFullyDone) {
    const doneTimes = snap.tasks
      .filter((t) => !t.deleted_at && t.completed_at)
      .map((t) => new Date(t.completed_at as string).getTime());
    if (doneTimes.length > 0) {
      completedAt = new Date(Math.max(...doneTimes)).toISOString();
    } else {
      completedAt = snap.job.updated_at;
    }
  }

  const lastActivityAt =
    snap.events.length > 0
      ? [...snap.events].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0].created_at
      : null;

  const end = completedAt ?? new Date().toISOString();
  const durationText = formatDuration(createdAt, end);
  const durationLabel = completedAt ? "rentang pengerjaan" : "sudah berjalan";

  return {
    snap,
    createdAt,
    completedAt,
    isFullyDone,
    lastActivityAt,
    durationText,
    durationLabel
  };
}

interface MemberSummary {
  totalJobs: number;
  totalTasks: number;
  doneTasks: number;
  runningTasks: number;
  pendingTasks: number;
  avgProgress: number;
  completedJobs: number;
  status: "no-jobs" | "done" | "running" | "pending";
}

function buildSummary(snapshots: JobSnapshot[], name: string): MemberSummary {
  const mine = snapshots.filter(
    (s) => s.job.assignee.toLowerCase() === name.toLowerCase()
  );
  if (mine.length === 0) {
    return {
      totalJobs: 0,
      totalTasks: 0,
      doneTasks: 0,
      runningTasks: 0,
      pendingTasks: 0,
      avgProgress: 0,
      completedJobs: 0,
      status: "no-jobs"
    };
  }
  const totalTasks = mine.reduce((a, s) => a + (s.progress?.total_tasks ?? 0), 0);
  const doneTasks = mine.reduce((a, s) => a + (s.progress?.done_tasks ?? 0), 0);
  const runningTasks = mine.reduce((a, s) => a + (s.progress?.in_progress_tasks ?? 0), 0);
  const pendingTasks = mine.reduce((a, s) => a + (s.progress?.pending_tasks ?? 0), 0);
  const avgProgress = Math.round(
    mine.reduce((a, s) => a + (s.progress?.percent_done ?? 0), 0) / mine.length
  );
  const completedJobs = mine.filter((s) => (s.progress?.percent_done ?? 0) >= 100).length;
  const status: MemberSummary["status"] =
    runningTasks > 0 ? "running" : avgProgress >= 100 ? "done" : "pending";
  return {
    totalJobs: mine.length,
    totalTasks,
    doneTasks,
    runningTasks,
    pendingTasks,
    avgProgress,
    completedJobs,
    status
  };
}

export default function MemberManager({
  snapshots
}: {
  snapshots: JobSnapshot[];
}) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ok) return;
    const t = setTimeout(() => setOk(null), 3000);
    return () => clearTimeout(t);
  }, [ok]);

  const refresh = useCallback(async () => {
    try {
      const list = await listMembers();
      setMembers(list);
    } catch (e) {
      setErr((e as Error).message);
      setMembers([]);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleAdd(data: { name: string; access_code: string }): Promise<boolean> {
    setErr(null);
    setBusy(true);
    try {
      await addMember(data.name, data.access_code);
      await refresh();
      setOk(`✓ Anggota "${data.name}" ditambahkan`);
      return true;
    } catch (e) {
      setErr((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate(
    id: string,
    patch: { name?: string; access_code?: string }
  ): Promise<boolean> {
    setErr(null);
    setBusy(true);
    try {
      await updateMember(id, patch);
      await refresh();
      setOk(`✓ Anggota diupdate`);
      return true;
    } catch (e) {
      setErr((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus anggota "${name}"?`)) return;
    setErr(null);
    setBusy(true);
    try {
      await deleteMember(id);
      await refresh();
      setOk(`✓ Anggota "${name}" dihapus`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const loading = members === null;
  const visibleMembers = members ?? [];

  return (
    <main className="mx-auto max-w-3xl p-4 md:p-6 space-y-6">
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
        <h1 className="text-2xl font-semibold">Pengaturan Anggota</h1>
        <p className="text-sm text-muted">
          Tambah anggota tim dan kode akses masing-masing. Kode akses dipakai anggota untuk
          masuk ke halaman{" "}
          <Link to="/input" className="text-accent hover:underline inline-flex items-center gap-1">
            Input Data <ExternalLink size={11} />
          </Link>
          .
        </p>
      </div>

      {err && (
        <div className="card border-late/60 bg-late/10 flex items-start gap-3 animate-in fade-in">
          <X size={18} className="text-late shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <div className="font-semibold text-late mb-1">Gagal</div>
            <div className="text-muted break-all">{err}</div>
          </div>
          <button onClick={() => setErr(null)} className="text-muted hover:text-ink-50">
            <X size={14} />
          </button>
        </div>
      )}

      {ok && (
        <div className="card border-ok/60 bg-ok/10 flex items-start gap-3 animate-in fade-in">
          <Check size={18} className="text-ok shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-ok font-medium">{ok}</div>
          <button onClick={() => setOk(null)} className="text-ok/60 hover:text-ok">
            <X size={14} />
          </button>
        </div>
      )}

      <OverviewSection
        snapshots={snapshots}
        memberNames={visibleMembers.map((m) => m.name)}
      />

      <section className="card space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted">
          <span className="text-accent">
            <UserPlus size={16} />
          </span>
          Tambah Anggota
        </h2>
        <AddMemberForm onSubmit={handleAdd} disabled={busy} />
      </section>

      <section className="card space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted">
          <span className="text-accent">
            <Users size={16} />
          </span>
          Daftar Anggota
          <span className="ml-auto text-xs text-muted normal-case tracking-normal">
            {loading ? "memuat..." : `${visibleMembers.length} anggota`}
          </span>
        </h2>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Loader2 size={14} className="animate-spin text-accent" /> Memuat daftar anggota...
          </div>
        )}

        {!loading && visibleMembers.length === 0 && (
          <div className="text-sm text-muted italic">
            Belum ada anggota. Tambah anggota pertama di form atas.
          </div>
        )}

        <div className="space-y-2">
          {visibleMembers.map((m) => {
            const mine = snapshots.filter(
              (s) => s.job.assignee.toLowerCase() === m.name.toLowerCase()
            );
            return (
              <MemberRow
                key={m.id}
                member={m}
                summary={buildSummary(snapshots, m.name)}
                snapshots={mine}
                disabled={busy}
                onUpdate={(patch) => handleUpdate(m.id, patch)}
                onDelete={() => handleDelete(m.id, m.name)}
              />
            );
          })}
        </div>
      </section>
    </main>
  );
}

function OverviewSection({
  snapshots,
  memberNames
}: {
  snapshots: JobSnapshot[];
  memberNames: string[];
}) {
  const stats = useMemo(() => {
    const totalJobs = snapshots.length;
    const totalTasks = snapshots.reduce((a, s) => a + (s.progress?.total_tasks ?? 0), 0);
    const doneTasks = snapshots.reduce((a, s) => a + (s.progress?.done_tasks ?? 0), 0);
    const runningTasks = snapshots.reduce(
      (a, s) => a + (s.progress?.in_progress_tasks ?? 0),
      0
    );
    const completedJobs = snapshots.filter(
      (s) => (s.progress?.percent_done ?? 0) >= 100
    ).length;
    const runningJobs = snapshots.filter((s) => {
      const p = s.progress?.percent_done ?? 0;
      return p > 0 && p < 100;
    }).length;
    const untouchedJobs = totalJobs - completedJobs - runningJobs;
    const registered = memberNames.length;
    const assigneesInJobs = new Set(
      snapshots.map((s) => s.job.assignee.toLowerCase())
    ).size;
    return {
      totalJobs,
      totalTasks,
      doneTasks,
      runningTasks,
      completedJobs,
      runningJobs,
      untouchedJobs,
      registered,
      assigneesInJobs
    };
  }, [snapshots, memberNames]);

  return (
    <section className="card space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted">
        <span className="text-accent">
          <Activity size={16} />
        </span>
        Ringkasan
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat
          icon={<Users size={16} />}
          label="Anggota terdaftar"
          value={stats.registered}
          sub={`${stats.assigneesInJobs} aktif di jobdesk`}
        />
        <MiniStat
          icon={<Briefcase size={16} />}
          label="Total Job"
          value={stats.totalJobs}
          sub={
            stats.totalJobs > 0
              ? `${stats.completedJobs} selesai · ${stats.runningJobs} jalan`
              : "—"
          }
        />
        <MiniStat
          icon={<CheckCircle2 size={16} />}
          label="Task Selesai"
          value={`${stats.doneTasks}/${stats.totalTasks}`}
          sub={
            stats.totalTasks > 0
              ? `${Math.round((stats.doneTasks / stats.totalTasks) * 100)}% rampung`
              : "belum ada task"
          }
          color="text-ok"
        />
        <MiniStat
          icon={<Loader2 size={16} />}
          label="Task Jalan"
          value={stats.runningTasks}
          sub={stats.runningTasks > 0 ? "sedang dikerjakan" : "tidak ada"}
          color={stats.runningTasks > 0 ? "text-warn" : undefined}
        />
      </div>
    </section>
  );
}

function MiniStat({
  icon,
  label,
  value,
  sub,
  color = "text-ink-50"
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-900/40 p-3 flex items-start gap-3">
      <div className="w-8 h-8 rounded-md bg-ink-700 flex items-center justify-center text-accent shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className={cn("text-xl font-semibold tabular-nums leading-tight", color)}>
          {value}
        </div>
        <div className="text-[10px] uppercase tracking-widest text-muted mt-0.5">
          {label}
        </div>
        {sub && <div className="text-[11px] text-muted mt-0.5 truncate">{sub}</div>}
      </div>
    </div>
  );
}

function AddMemberForm({
  onSubmit,
  disabled
}: {
  onSubmit: (data: { name: string; access_code: string }) => Promise<boolean>;
  disabled?: boolean;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const ok = await onSubmit({ name: name.trim(), access_code: code.trim() });
      if (ok) {
        setName("");
        setCode("");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
      <label className="block">
        <span className="block text-[11px] uppercase tracking-widest text-muted mb-1">
          Nama Anggota
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Contoh: leo"
          className="input w-full"
        />
      </label>
      <label className="block">
        <span className="block text-[11px] uppercase tracking-widest text-muted mb-1">
          Kode Akses
        </span>
        <div className="relative">
          <input
            type={show ? "text" : "password"}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            placeholder="••••••••"
            className="input w-full pr-8"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink-50 transition"
            title={show ? "Sembunyikan" : "Tampilkan"}
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </label>
      <div className="flex items-end">
        <button
          type="submit"
          className="btn btn-accent w-full"
          disabled={!name.trim() || !code.trim() || saving || disabled}
        >
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Menyimpan...
            </>
          ) : (
            <>
              <Plus size={14} /> Tambah
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function MemberRow({
  member,
  summary,
  snapshots,
  disabled,
  onUpdate,
  onDelete
}: {
  member: Member;
  summary: MemberSummary;
  snapshots: JobSnapshot[];
  disabled?: boolean;
  onUpdate: (patch: { name?: string; access_code?: string }) => Promise<boolean>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(member.name);
  const [newCode, setNewCode] = useState("");

  const jobDetails = useMemo(
    () =>
      snapshots
        .map(buildJobDetails)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    [snapshots]
  );

  useEffect(() => {
    setName(member.name);
    setNewCode("");
  }, [member.name]);

  if (editing) {
    const nameChanged = name.trim() !== member.name;
    const codeChanged = newCode.trim() !== "";
    return (
      <div className="border border-ink-700 rounded-lg p-3 space-y-2 bg-ink-900/60">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <label className="block">
            <span className="block text-[11px] uppercase tracking-widest text-muted mb-1">
              Nama
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full"
              autoFocus
            />
          </label>
          <label className="block">
            <span className="block text-[11px] uppercase tracking-widest text-muted mb-1">
              Kode Akses Baru
            </span>
            <input
              type="password"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="kosongkan bila tidak diubah"
              className="input w-full"
            />
            <span className="block text-[10px] text-muted mt-1">
              Kode lama tidak dapat ditampilkan — isi di sini untuk reset.
            </span>
          </label>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              const patch: { name?: string; access_code?: string } = {};
              if (nameChanged) patch.name = name;
              if (codeChanged) patch.access_code = newCode;
              if (Object.keys(patch).length === 0) {
                setEditing(false);
                return;
              }
              const ok = await onUpdate(patch);
              if (ok) setEditing(false);
            }}
            className="btn btn-accent"
            disabled={!name.trim() || disabled || (!nameChanged && !codeChanged)}
          >
            <Check size={14} /> Simpan
          </button>
          <button
            onClick={() => {
              setName(member.name);
              setNewCode("");
              setEditing(false);
            }}
            className="btn"
          >
            Batal
          </button>
        </div>
      </div>
    );
  }

  const statusChip = (() => {
    switch (summary.status) {
      case "no-jobs":
        return { label: "belum ada jobdesk", cls: "bg-ink-700 text-muted" };
      case "done":
        return { label: "selesai semua", cls: "bg-ok/15 text-ok" };
      case "running":
        return { label: "sedang berjalan", cls: "bg-warn/15 text-warn" };
      case "pending":
      default:
        return { label: "belum dikerjakan", cls: "bg-late/15 text-late" };
    }
  })();

  return (
    <div className="rounded-lg border border-ink-700 bg-ink-800/40">
      <div className="flex items-center gap-3 p-3">
        <div className="w-9 h-9 rounded-full bg-accent/15 text-accent flex items-center justify-center shrink-0">
          <Users size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold truncate">{member.name}</span>
            <span className={cn("chip text-[10px] shrink-0", statusChip.cls)}>
              {statusChip.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted mt-0.5">
            <KeyRound size={11} />
            <span className="italic text-muted/70">
              kode akses tersimpan — edit untuk reset
            </span>
          </div>
        </div>
        {summary.status !== "no-jobs" && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted hover:text-accent transition rounded-md border border-ink-700 px-2 py-1"
            title={expanded ? "Tutup detail" : "Lihat detail & log jobdesk"}
          >
            <span>{expanded ? "Tutup" : "Detail"}</span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
        <button
          onClick={() => setEditing(true)}
          disabled={disabled}
          className="text-muted hover:text-accent transition disabled:opacity-30"
          title="Edit anggota"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={onDelete}
          disabled={disabled}
          className="text-muted hover:text-late transition disabled:opacity-30"
          title="Hapus anggota"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {summary.status !== "no-jobs" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-3 pb-3 text-xs">
          <SummaryCell
            label="Job"
            value={`${summary.completedJobs}/${summary.totalJobs}`}
            hint="selesai / total"
          />
          <SummaryCell
            label="Task Selesai"
            value={`${summary.doneTasks}/${summary.totalTasks}`}
            hint={`${summary.avgProgress}% rata-rata`}
            color="text-ok"
          />
          <SummaryCell
            label="Jalan"
            value={summary.runningTasks}
            hint="in progress"
            color={summary.runningTasks > 0 ? "text-warn" : undefined}
          />
          <SummaryCell
            label="Belum"
            value={summary.pendingTasks}
            hint="pending"
          />
        </div>
      )}

      {expanded && jobDetails.length > 0 && (
        <div className="border-t border-ink-700 bg-ink-900/40 p-3 space-y-2">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted">
            <History size={12} className="text-accent" />
            Log Jobdesk
            <span className="ml-auto normal-case tracking-normal text-muted/70">
              {jobDetails.length} jobdesk
            </span>
          </div>
          <div className="space-y-2">
            {jobDetails.map((d) => (
              <JobDetailCard key={d.snap.job.id} detail={d} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function JobDetailCard({ detail }: { detail: JobDetail }) {
  const { snap, createdAt, completedAt, isFullyDone, lastActivityAt, durationText, durationLabel } =
    detail;
  const pct = snap.progress?.percent_done ?? 0;
  const progressColor =
    pct >= 100 ? "bg-ok" : pct >= 40 ? "bg-warn" : pct > 0 ? "bg-accent" : "bg-ink-700";

  const jobStatusChip = isFullyDone
    ? { label: "selesai", cls: "bg-ok/15 text-ok" }
    : snap.progress.in_progress_tasks > 0
      ? { label: "berjalan", cls: "bg-warn/15 text-warn" }
      : snap.progress.done_tasks > 0
        ? { label: "parsial", cls: "bg-accent/15 text-accent" }
        : { label: "belum mulai", cls: "bg-late/15 text-late" };

  return (
    <div className="rounded-md border border-ink-700 bg-ink-800/40 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Briefcase size={13} className="text-muted shrink-0" />
            <span className="text-sm font-semibold truncate">{snap.job.name}</span>
            <span className={cn("chip text-[10px]", jobStatusChip.cls)}>
              {jobStatusChip.label}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-semibold tabular-nums">{pct}%</div>
          <div className="text-[10px] uppercase tracking-widest text-muted">
            {snap.progress.done_tasks}/{snap.progress.total_tasks} task
          </div>
        </div>
      </div>

      <div className="h-1.5 bg-ink-700 rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all", progressColor)}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
        <DetailItem
          icon={<Calendar size={11} />}
          label="Dibuat"
          value={formatDate(createdAt)}
          sub={relativeDate(createdAt)}
        />
        {completedAt ? (
          <DetailItem
            icon={<CheckCircle2 size={11} className="text-ok" />}
            label="Selesai"
            value={formatDate(completedAt)}
            sub={relativeDate(completedAt)}
            color="text-ok"
          />
        ) : (
          <DetailItem
            icon={<Loader2 size={11} className="text-warn" />}
            label="Status"
            value={
              snap.progress.in_progress_tasks > 0
                ? `${snap.progress.in_progress_tasks} task jalan`
                : "menunggu"
            }
            sub={`${snap.progress.pending_tasks} pending`}
            color="text-warn"
          />
        )}
        <DetailItem
          icon={<Timer size={11} />}
          label={durationLabel}
          value={durationText}
          sub={isFullyDone ? "total pengerjaan" : "sejak dibuat"}
        />
      </div>

      {lastActivityAt && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted pt-1 border-t border-ink-700/60">
          <Clock size={10} />
          Aktivitas terakhir: {relativeDate(lastActivityAt)}
          <span className="text-muted/60">· {formatDateTime(lastActivityAt)}</span>
        </div>
      )}
    </div>
  );
}

function DetailItem({
  icon,
  label,
  value,
  sub,
  color = "text-ink-50"
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="rounded-md border border-ink-700 bg-ink-900/40 px-2 py-1.5">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted">
        {icon}
        {label}
      </div>
      <div className={cn("text-sm font-semibold truncate mt-0.5", color)}>{value}</div>
      {sub && <div className="text-[10px] text-muted truncate">{sub}</div>}
    </div>
  );
}

function SummaryCell({
  label,
  value,
  hint,
  color = "text-ink-50"
}: {
  label: string;
  value: string | number;
  hint?: string;
  color?: string;
}) {
  return (
    <div className="rounded-md border border-ink-700 bg-ink-900/40 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-widest text-muted">{label}</div>
      <div className={cn("text-base font-semibold tabular-nums leading-tight", color)}>
        {value}
      </div>
      {hint && <div className="text-[10px] text-muted mt-0.5 truncate">{hint}</div>}
    </div>
  );
}
