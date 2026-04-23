import { useState } from "react";
import { Link } from "react-router-dom";
import JobCard from "./JobCard";
import WorkflowFlow from "./WorkflowFlow";
import type { JobSnapshot, Task } from "@/lib/types";
import { Users, CheckCircle2, Activity, Sparkles, Briefcase, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

type View = "flow" | "assignee" | "both";

export default function Dashboard({ snapshots }: { snapshots: JobSnapshot[] }) {
  const [view, setView] = useState<View>("both");
  const [highlightTaskId, setHighlightTaskId] = useState<string | null>(null);

  const totalTasks = snapshots.reduce((a, s) => a + (s.progress?.total_tasks ?? 0), 0);
  const doneTasks = snapshots.reduce((a, s) => a + (s.progress?.done_tasks ?? 0), 0);
  const uniqueAssignees = new Set(snapshots.map((s) => s.job.assignee.toLowerCase())).size;
  const avgProgress = snapshots.length
    ? Math.round(
        snapshots.reduce((a, s) => a + (s.progress?.percent_done ?? 0), 0) / snapshots.length
      )
    : 0;

  function handleNodeClick(task: Task, assignee: string) {
    if (view === "flow") setView("both");
    setHighlightTaskId(task.id);
    setTimeout(() => {
      const card = document.getElementById(`job-${assignee.toLowerCase()}`);
      card?.scrollIntoView({ behavior: "smooth", block: "start" });
      card?.classList.add("ring-2", "ring-accent", "ring-offset-2", "ring-offset-ink-900");
      setTimeout(() => {
        card?.classList.remove("ring-2", "ring-accent", "ring-offset-2", "ring-offset-ink-900");
        setHighlightTaskId(null);
      }, 2500);
    }, 80);
  }

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center">
            <Sparkles size={20} className="text-accent" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-semibold">Workflow Dashboard</h1>
            <p className="text-xs text-muted">
              Flow dependensi + progres harian per assignee
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ViewSwitcher view={view} onChange={setView} />
          <Link
            to="/admin"
            className="btn text-xs"
            title="Admin Panel"
          >
            <Settings size={14} />
            <span className="hidden md:inline">Admin</span>
          </Link>
          <div className="text-xs text-muted hidden md:block">
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric"
            })}
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatBlock icon={<Users size={18} />} label="Anggota" value={uniqueAssignees} />
        <StatBlock icon={<Briefcase size={18} />} label="Job" value={snapshots.length} />
        <StatBlock icon={<Activity size={18} />} label="Total Task" value={totalTasks} />
        <StatBlock
          icon={<CheckCircle2 size={18} />}
          label="Task Selesai"
          value={doneTasks}
          color="text-ok"
        />
        <StatBlock
          icon={<Sparkles size={18} />}
          label="Avg Progress"
          value={`${avgProgress}%`}
          color={avgProgress >= 80 ? "text-ok" : avgProgress >= 40 ? "text-warn" : "text-late"}
        />
      </section>

      {(view === "flow" || view === "both") && (
        <WorkflowFlow snapshots={snapshots} onNodeClick={handleNodeClick} />
      )}

      {(view === "assignee" || view === "both") && (
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {snapshots.map((s) => (
            <div
              key={s.job.id}
              id={`job-${s.job.assignee.toLowerCase()}`}
              className="scroll-mt-6 transition-all rounded-2xl"
            >
              <JobCard snapshot={s} highlightTaskId={highlightTaskId} />
            </div>
          ))}
        </section>
      )}

      {snapshots.length === 0 && (
        <div className="card text-center text-muted">
          Belum ada jobdesk. Jalankan <code className="text-accent">npm run db:seed</code> atau
          tambah lewat Supabase.
        </div>
      )}
    </div>
  );
}

function ViewSwitcher({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const options: { value: View; label: string }[] = [
    { value: "both", label: "Semua" },
    { value: "flow", label: "Flow" },
    { value: "assignee", label: "Per Assignee" }
  ];
  return (
    <div className="flex bg-ink-800 border border-ink-700 rounded-lg p-0.5 text-xs">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-3 py-1.5 rounded-md transition",
            view === o.value ? "bg-accent text-white" : "text-muted hover:text-ink-50"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function StatBlock({
  icon,
  label,
  value,
  color = "text-ink-50"
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className="w-10 h-10 rounded-lg bg-ink-700 flex items-center justify-center text-accent">
        {icon}
      </div>
      <div>
        <div className={`text-2xl font-semibold tabular-nums ${color}`}>{value}</div>
        <div className="text-[10px] uppercase tracking-widest text-muted">{label}</div>
      </div>
    </div>
  );
}
