import { getSupabase } from "@/lib/supabase";
import type { Job, Perspective, Task, TaskStatus } from "@/lib/types";

function client() {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase belum dikonfigurasi");
  return sb;
}

export interface CreateJobInput {
  name: string;
  assignee: string;
  description?: string | null;
}

export async function createJob(input: CreateJobInput): Promise<Job> {
  const sb = client();
  const { data, error } = await sb
    .from("jobs")
    .insert({
      name: input.name,
      assignee: input.assignee.toLowerCase(),
      description: input.description ?? null
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Job;
}

export async function deleteJob(id: string): Promise<void> {
  const sb = client();
  const { error } = await sb.from("jobs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export interface CreateTaskInput {
  job_id: string;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  order_num?: number;
  perspective?: Perspective | null;
  kind?: NonNullable<Task["kind"]>;
  depends_on?: string[];
  due_date?: string | null;
  group_key?: string | null;
  completed_at?: string | null;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const sb = client();

  let orderNum = input.order_num;
  if (orderNum === undefined || orderNum === null) {
    const { data: existing } = await sb
      .from("tasks")
      .select("order_num")
      .eq("job_id", input.job_id)
      .order("order_num", { ascending: false })
      .limit(1);
    orderNum = (existing?.[0]?.order_num ?? 0) + 1;
  }

  const { data, error } = await sb
    .from("tasks")
    .insert({ ...input, order_num: orderNum, status: input.status ?? "pending" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Task;
}

export interface PatchTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  order_num?: number;
  perspective?: Perspective | null;
  kind?: NonNullable<Task["kind"]>;
  depends_on?: string[];
  due_date?: string | null;
  group_key?: string | null;
  completed_at?: string | null;
}

export async function patchTask(id: string, patch: PatchTaskInput): Promise<Task> {
  const sb = client();
  const { data, error } = await sb
    .from("tasks")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Task;
}

export async function softDeleteTask(id: string): Promise<Task> {
  const sb = client();
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from("tasks")
    .update({ deleted_at: now, updated_at: now })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Task;
}
