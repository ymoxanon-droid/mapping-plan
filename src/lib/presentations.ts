import { getSupabase } from "@/lib/supabase";

export type PresentationStatus = "Selesai" | "Proses" | "Pending";

export interface Presentation {
  id: string;
  title: string;
  project: string;
  meeting_date: string;
  topic_order: number;
  status: PresentationStatus;
  storage_path: string | null;
  external_url: string | null;
  description: string | null;
  job_id: string | null;
  task_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Meeting {
  meeting_date: string;
  topic_count: number;
  iso_week: number;
  year: number;
  month: number;
}

export interface NewPresentation {
  title: string;
  project: string;
  meeting_date: string;
  status?: PresentationStatus;
  topic_order?: number;
  storage_path?: string | null;
  external_url?: string | null;
  description?: string | null;
  job_id?: string | null;
  task_id?: string | null;
}

/** Job dari DB — untuk dropdown project di form presentasi */
export interface JobOption {
  id: string;
  name: string;
  assignee: string;
}

/** Task dari DB — untuk picker title di form presentasi */
export interface TaskOption {
  id: string;
  title: string;
  status: string;
}

const SELECT_COLS =
  "id,title,project,meeting_date,topic_order,status,storage_path,external_url,description,job_id,task_id,created_at,updated_at";

const DECK_BUCKET = "decks";
const DECK_FOLDER = "presentations";

function client() {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase belum dikonfigurasi.");
  return sb;
}

function mapError(err: { code?: string; message: string }, fallback: string): never {
  throw new Error(err.message || fallback);
}

export async function listMeetings(): Promise<Meeting[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("v_meetings")
    .select("meeting_date,topic_count,iso_week,year,month")
    .order("meeting_date", { ascending: false });
  if (error) mapError(error, "Gagal mengambil daftar meeting");
  return (data ?? []) as Meeting[];
}

export async function listPresentationsByMeeting(
  meeting_date: string
): Promise<Presentation[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("presentations")
    .select(SELECT_COLS)
    .eq("meeting_date", meeting_date)
    .order("topic_order", { ascending: true });
  if (error) mapError(error, "Gagal mengambil daftar presentasi");
  return (data ?? []) as Presentation[];
}

export async function listAllPresentations(
  filterProject?: string
): Promise<Presentation[]> {
  const sb = getSupabase();
  if (!sb) return [];
  let query = sb
    .from("presentations")
    .select(SELECT_COLS)
    .order("meeting_date", { ascending: false })
    .order("topic_order", { ascending: true });
  if (filterProject && filterProject.trim() !== "") {
    query = query.eq("project", filterProject.trim());
  }
  const { data, error } = await query;
  if (error) mapError(error, "Gagal mengambil daftar presentasi");
  return (data ?? []) as Presentation[];
}

export async function createPresentation(
  input: NewPresentation
): Promise<Presentation> {
  const title = input.title.trim();
  const project = input.project.trim();
  const meeting_date = input.meeting_date.trim();
  if (!title) throw new Error("Judul presentasi tidak boleh kosong.");
  if (!project) throw new Error("Project tidak boleh kosong.");
  if (!meeting_date) throw new Error("Tanggal meeting tidak boleh kosong.");

  const payload: Record<string, unknown> = {
    title,
    project,
    meeting_date,
  };
  if (input.status !== undefined) payload.status = input.status;
  if (input.topic_order !== undefined) payload.topic_order = input.topic_order;
  if (input.storage_path !== undefined) payload.storage_path = input.storage_path;
  if (input.external_url !== undefined) payload.external_url = input.external_url;
  if (input.description !== undefined) payload.description = input.description;
  if (input.job_id !== undefined) payload.job_id = input.job_id;
  if (input.task_id !== undefined) payload.task_id = input.task_id;

  const sb = client();
  const { data, error } = await sb
    .from("presentations")
    .insert(payload)
    .select(SELECT_COLS)
    .single();
  if (error) mapError(error, "Gagal menambah presentasi");
  return data as Presentation;
}

export async function updatePresentation(
  id: string,
  patch: Partial<NewPresentation>
): Promise<Presentation> {
  const update: Record<string, unknown> = {};
  if (patch.title !== undefined) {
    const v = patch.title.trim();
    if (!v) throw new Error("Judul presentasi tidak boleh kosong.");
    update.title = v;
  }
  if (patch.project !== undefined) {
    const v = patch.project.trim();
    if (!v) throw new Error("Project tidak boleh kosong.");
    update.project = v;
  }
  if (patch.meeting_date !== undefined) {
    const v = patch.meeting_date.trim();
    if (!v) throw new Error("Tanggal meeting tidak boleh kosong.");
    update.meeting_date = v;
  }
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.topic_order !== undefined) update.topic_order = patch.topic_order;
  if (patch.storage_path !== undefined) update.storage_path = patch.storage_path;
  if (patch.external_url !== undefined) update.external_url = patch.external_url;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.job_id !== undefined) update.job_id = patch.job_id;
  if (patch.task_id !== undefined) update.task_id = patch.task_id;

  if (Object.keys(update).length === 0) {
    throw new Error("Tidak ada perubahan.");
  }

  const sb = client();
  const { data, error } = await sb
    .from("presentations")
    .update(update)
    .eq("id", id)
    .select(SELECT_COLS)
    .single();
  if (error) mapError(error, "Gagal mengupdate presentasi");
  return data as Presentation;
}

export async function deletePresentation(id: string): Promise<void> {
  const sb = client();
  const { error } = await sb.from("presentations").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Upload deck file ke bucket `decks` di folder `presentations/`.
 * Prefix dengan epoch ms supaya unique meskipun nama file sama.
 * Return storage_path (relative ke bucket).
 */
export async function uploadDeck(file: File, filename: string): Promise<string> {
  const sb = client();
  const clean = filename.trim() || file.name;
  const safe = clean.replace(/[^\w.\-]+/g, "_");
  const path = `${DECK_FOLDER}/${Date.now()}_${safe}`;
  const { error } = await sb.storage.from(DECK_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message || "Gagal upload deck");
  return path;
}

export function getDeckPublicUrl(storage_path: string): string {
  const sb = getSupabase();
  if (!sb) return "";
  return sb.storage.from(DECK_BUCKET).getPublicUrl(storage_path).data.publicUrl;
}

export function isTuesday(date: string): boolean {
  return new Date(date).getDay() === 2;
}

/**
 * Ambil semua jobs (untuk dropdown PROJECT di form presentasi).
 * Sort by assignee, then name.
 * Filter optional ke assignee tertentu (default: semua).
 */
export async function listMyJobs(assignee?: string): Promise<JobOption[]> {
  const sb = getSupabase();
  if (!sb) return [];
  let q = sb
    .from("jobs")
    .select("id,name,assignee")
    .order("assignee", { ascending: true })
    .order("name", { ascending: true });
  if (assignee && assignee.trim()) {
    q = q.ilike("assignee", assignee.trim());
  }
  const { data, error } = await q;
  if (error) mapError(error, "Gagal mengambil daftar job");
  return (data ?? []) as JobOption[];
}

/**
 * Ambil tasks dari job tertentu (untuk picker TITLE di form presentasi).
 * Sort by order_num. Exclude soft-deleted (deleted_at IS NULL).
 */
export async function listTasksForJob(job_id: string): Promise<TaskOption[]> {
  const sb = getSupabase();
  if (!sb || !job_id) return [];
  const { data, error } = await sb
    .from("tasks")
    .select("id,title,status")
    .eq("job_id", job_id)
    .is("deleted_at", null)
    .order("order_num", { ascending: true });
  if (error) mapError(error, "Gagal mengambil daftar task");
  return (data ?? []) as TaskOption[];
}
