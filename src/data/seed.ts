/**
 * Seed data.
 *
 * Setiap task punya:
 *   - perspective  → untuk warna / pengelompokan Balanced Scorecard
 *   - kind         → tipe node di flow diagram (task/research/milestone)
 *   - deps (number[]) → referensi ke order_num task lain DALAM JOB YANG SAMA,
 *                       akan diresolusikan ke depends_on: string[] (task IDs)
 */

import type { Job, JobProgress, JobSnapshot, Perspective, Task, TaskEvent } from "@/lib/types";

type Kind = NonNullable<Task["kind"]>;

interface PointSeed {
  title: string;
  perspective: Perspective;
  kind?: Kind;
  deps?: number[]; // 1-indexed order_num of other tasks in same job
}

// -------------------------------------------------------------
// Sumber kebenaran
// -------------------------------------------------------------

const LEO_DONE: PointSeed[] = [
  { title: "Ambil seluruh data batch analys",                                 perspective: "capacity" },
  { title: "OK - TP",                                                         perspective: "customer",  kind: "milestone", deps: [1] },
  { title: "Download semua data Ahrefs memanfaatkan sisa quota",              perspective: "capacity",  deps: [1] },
  { title: "Sisa quota dipakai ambil export (fokus referring domain)",        perspective: "capacity",  deps: [3] },
  { title: "Anchor masuk dari bulk domain (sudah diambil)",                   perspective: "capacity",  deps: [3] }
];

const LEO_PENDING: PointSeed[] = [
  { title: "Nameserver",                                                      perspective: "internal" },
  { title: "Debug log",                                                       perspective: "internal",  deps: [6] },
  { title: "Security berlapis",                                               perspective: "internal",  deps: [7] },
  { title: "Backup berlapis (domain + nameserver) tiap 1 hari — lokasi belum fix (Cloudflare R2 / Backblaze B2 / lainnya)", perspective: "internal", deps: [8] },
  { title: "Akun master full control admin (atur live dari admin panel, mode update-only / read-only)",                    perspective: "financial", deps: [9] },
  { title: "Riset: API Namecheap bisa ambil PIN untuk livechat?",             perspective: "capacity",  kind: "research" },
  { title: "Riset: gabungkan API dari beberapa provider domain",              perspective: "capacity",  kind: "research" },
  { title: "Export top page (metrik / performance) + bagian page+",           perspective: "customer",  deps: [4, 5] }
];

const RUL_DONE: PointSeed[] = [
  { title: "Layout admin panel + routing",                                    perspective: "internal" },
  { title: "Auth Supabase + role guard",                                      perspective: "internal",  deps: [1] }
];

const RUL_PENDING: PointSeed[] = [
  { title: "Halaman monitoring worker RDP",                                   perspective: "customer",  deps: [2] },
  { title: "Tombol live control (start/stop worker)",                         perspective: "financial", deps: [2, 3] },
  { title: "Visualisasi quota Ahrefs tersisa",                                perspective: "customer",  deps: [2] },
  { title: "Activity log page (lihat semua revisi task)",                     perspective: "customer",  deps: [2] }
];

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------

const LEO_JOB_ID = "leo-job-0001";
const RUL_JOB_ID = "rul-job-0001";

function taskId(jobId: string, orderNum: number) {
  return `${jobId}-t${String(orderNum).padStart(2, "0")}`;
}

function mkTask(
  orderNum: number,
  jobId: string,
  seed: PointSeed,
  status: Task["status"],
  daysAgo: number
): Task {
  const ts = new Date(Date.now() - daysAgo * 864e5).toISOString();
  return {
    id: taskId(jobId, orderNum),
    job_id: jobId,
    title: seed.title,
    description: null,
    status,
    order_num: orderNum,
    due_date: null,
    perspective: seed.perspective,
    depends_on: (seed.deps ?? []).map((n) => taskId(jobId, n)),
    kind: seed.kind ?? "task",
    group_key: null,
    completed_at: status === "done" ? ts : null,
    created_at: ts,
    updated_at: ts,
    deleted_at: null
  };
}

function mkEvent(
  id: number,
  jobId: string,
  task_id: string,
  event_type: TaskEvent["event_type"],
  title: string,
  note: string | null,
  daysAgo: number
): TaskEvent {
  return {
    id: `${jobId}-e${String(id).padStart(3, "0")}`,
    task_id,
    job_id: jobId,
    event_type,
    old_value: null,
    new_value: { title },
    note,
    created_by: "system",
    created_at: new Date(Date.now() - daysAgo * 864e5).toISOString()
  };
}

function buildJob(
  jobId: string,
  name: string,
  assignee: string,
  description: string,
  done: PointSeed[],
  pending: PointSeed[],
  daysAgoStart: number
): { job: Job; tasks: Task[]; progress: JobProgress } {
  const job: Job = {
    id: jobId,
    name,
    assignee,
    description,
    created_at: new Date(Date.now() - daysAgoStart * 864e5).toISOString(),
    updated_at: new Date().toISOString()
  };

  const tasks: Task[] = [
    ...done.map((p, i) => mkTask(i + 1, jobId, p, "done", Math.max(1, daysAgoStart - 5 - i * 2))),
    ...pending.map((p, i) =>
      mkTask(done.length + i + 1, jobId, p, i === 0 ? "in_progress" : "pending", 4 - Math.min(i, 4))
    )
  ];

  const progress: JobProgress = {
    job_id: job.id,
    job_name: job.name,
    assignee: job.assignee,
    total_tasks: tasks.length,
    done_tasks: tasks.filter((t) => t.status === "done").length,
    in_progress_tasks: tasks.filter((t) => t.status === "in_progress").length,
    pending_tasks: tasks.filter((t) => t.status === "pending").length,
    percent_done:
      Math.round((tasks.filter((t) => t.status === "done").length / tasks.length) * 1000) / 10
  };

  return { job, tasks, progress };
}

// -------------------------------------------------------------
// Build snapshots
// -------------------------------------------------------------

const leo = buildJob(
  LEO_JOB_ID,
  "SERP Generator V1 — Backend & Infra",
  "claude-staff",
  "Scrape Ahrefs, multi-RDP workers, infra security & backup.",
  LEO_DONE,
  LEO_PENDING,
  20
);

const leoEvents: TaskEvent[] = [
  mkEvent(1,  LEO_JOB_ID, leo.tasks[0].id,  "created",   leo.tasks[0].title,  null, 20),
  mkEvent(2,  LEO_JOB_ID, leo.tasks[0].id,  "completed", leo.tasks[0].title,  null, 15),
  mkEvent(3,  LEO_JOB_ID, leo.tasks[1].id,  "completed", leo.tasks[1].title,  null, 13),
  mkEvent(4,  LEO_JOB_ID, leo.tasks[2].id,  "completed", leo.tasks[2].title,  null, 11),
  mkEvent(5,  LEO_JOB_ID, leo.tasks[3].id,  "revised",   leo.tasks[3].title,  "Prioritas digeser ke referring domain", 9),
  mkEvent(6,  LEO_JOB_ID, leo.tasks[3].id,  "completed", leo.tasks[3].title,  null, 8),
  mkEvent(7,  LEO_JOB_ID, leo.tasks[4].id,  "completed", leo.tasks[4].title,  null, 6),
  mkEvent(8,  LEO_JOB_ID, leo.tasks[8].id,  "added",     leo.tasks[8].title,  "Tambahan dari atasan 2026-04-18", 3),
  mkEvent(9,  LEO_JOB_ID, leo.tasks[5].id,  "updated",   leo.tasks[5].title,  "Mulai kerjakan nameserver", 2),
  mkEvent(10, LEO_JOB_ID, leo.tasks[10].id, "revised",   leo.tasks[10].title, "Opsi backup ditambah: Wasabi, Storj", 1),
  mkEvent(11, LEO_JOB_ID, leo.tasks[12].id, "added",     leo.tasks[12].title, "Atasan minta riset gabungan multi-provider", 1)
];

const rul = buildJob(
  RUL_JOB_ID,
  "RDP Crawler",
  "claude-staff",
  "UI admin, live control panel, role-based access.",
  RUL_DONE,
  RUL_PENDING,
  18
);

const rulEvents: TaskEvent[] = [
  mkEvent(1, RUL_JOB_ID, rul.tasks[0].id, "completed", rul.tasks[0].title, null, 12),
  mkEvent(2, RUL_JOB_ID, rul.tasks[1].id, "completed", rul.tasks[1].title, null, 10),
  mkEvent(3, RUL_JOB_ID, rul.tasks[5].id, "added",     rul.tasks[5].title, "Request dari Leo pas review", 1)
];

export const MOCK_SNAPSHOTS: JobSnapshot[] = [
  { job: leo.job, progress: leo.progress, tasks: leo.tasks, events: leoEvents },
  { job: rul.job, progress: rul.progress, tasks: rul.tasks, events: rulEvents }
];

export const MOCK_ASSIGNEES = ["claude-staff"];

export const SEED_SOURCE = {
  LEO_DONE,
  LEO_PENDING,
  RUL_DONE,
  RUL_PENDING
};
