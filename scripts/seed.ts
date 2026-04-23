/**
 * CLI seeder — jalankan dengan: `npm run db:seed`
 * Butuh .env.local dengan VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */

import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { SEED_SOURCE } from "../src/data/seed";
import type { Perspective, Task } from "../src/lib/types";

dotenv.config({ path: ".env.local" });

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("❌ Set VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY di .env.local");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

type Kind = NonNullable<Task["kind"]>;

interface PointSeed {
  title: string;
  perspective: Perspective;
  kind?: Kind;
  deps?: number[];
}
interface JobSeed {
  name: string;
  assignee: string;
  description: string;
  done: PointSeed[];
  pending: PointSeed[];
}

const PLAN: JobSeed[] = [
  {
    name: "SERP Generator V1 — Backend & Infra",
    assignee: "claude-staff",
    description: "Scrape Ahrefs, multi-RDP workers, infra security & backup.",
    done: SEED_SOURCE.LEO_DONE,
    pending: SEED_SOURCE.LEO_PENDING
  },
  {
    name: "RDP Crawler",
    assignee: "claude-staff",
    description: "UI admin, live control panel, role-based access.",
    done: SEED_SOURCE.RUL_DONE,
    pending: SEED_SOURCE.RUL_PENDING
  }
];

async function seedOne(job: JobSeed) {
  const { data: existing } = await db
    .from("jobs")
    .select("id")
    .eq("name", job.name)
    .eq("assignee", job.assignee)
    .maybeSingle();

  let jobId = existing?.id as string | undefined;
  if (!jobId) {
    const { data, error } = await db
      .from("jobs")
      .insert({ name: job.name, assignee: job.assignee, description: job.description })
      .select("id")
      .single();
    if (error) throw error;
    jobId = data.id;
  }

  await db.from("tasks").delete().eq("job_id", jobId!);

  // Insert pass 1 — without depends_on (so IDs exist)
  const combined = [
    ...job.done.map((p, i) => ({ point: p, status: "done" as const, orderNum: i + 1 })),
    ...job.pending.map((p, i) => ({
      point: p,
      status: i === 0 ? ("in_progress" as const) : ("pending" as const),
      orderNum: job.done.length + i + 1
    }))
  ];

  const insertRows = combined.map((x) => ({
    job_id: jobId!,
    title: x.point.title,
    status: x.status,
    order_num: x.orderNum,
    perspective: x.point.perspective,
    kind: x.point.kind ?? "task"
  }));

  const { data: inserted, error: tErr } = await db
    .from("tasks")
    .insert(insertRows)
    .select("id, order_num");
  if (tErr) throw tErr;

  // Build order_num -> id map, then PATCH depends_on
  const idByOrder = new Map<number, string>();
  (inserted ?? []).forEach((r: { id: string; order_num: number }) =>
    idByOrder.set(r.order_num, r.id)
  );

  for (const x of combined) {
    if (!x.point.deps?.length) continue;
    const depIds = x.point.deps.map((n) => idByOrder.get(n)).filter(Boolean) as string[];
    const myId = idByOrder.get(x.orderNum);
    if (!myId) continue;
    const { error } = await db.from("tasks").update({ depends_on: depIds }).eq("id", myId);
    if (error) throw error;
  }

  console.log(`✅ ${job.assignee}: ${job.name} — ${combined.length} tasks`);
}

(async () => {
  for (const job of PLAN) {
    try {
      await seedOne(job);
    } catch (e) {
      console.error(`❌ gagal seed ${job.assignee}:`, e);
    }
  }
  console.log("✨ Seed selesai.");
  process.exit(0);
})();
