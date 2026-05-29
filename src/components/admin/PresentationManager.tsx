import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  listAllPresentations,
  createPresentation,
  updatePresentation,
  deletePresentation,
  uploadDeck,
  isTuesday,
  getDeckPublicUrl,
  listMyJobs,
  listTasksForJob,
  type Presentation,
  type PresentationStatus,
  type JobOption,
  type TaskOption,
} from "@/lib/presentations";
import {
  Check,
  ExternalLink,
  FileText,
  Link as LinkIcon,
  Loader2,
  Pencil,
  Plus,
  Presentation as PresentationIcon,
  Trash2,
  Upload,
  Calendar,
  X,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

const STATUS_OPTIONS: PresentationStatus[] = ["Proses", "Pending", "Selesai"];

type SourceMode = "upload" | "url";

interface FormState {
  title: string;
  project: string;
  job_id: string | null;
  task_id: string | null;
  meeting_date: string;
  status: PresentationStatus;
  sourceMode: SourceMode;
  storage_path: string | null;
  external_url: string;
  description: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  project: "",
  job_id: null,
  task_id: null,
  meeting_date: "",
  status: "Proses",
  sourceMode: "upload",
  storage_path: null,
  external_url: "",
  description: "",
};

function statusChip(status: PresentationStatus) {
  switch (status) {
    case "Selesai":
      return "bg-ok/15 text-ok";
    case "Proses":
      return "bg-warn/15 text-warn";
    case "Pending":
    default:
      return "bg-ink-700 text-muted";
  }
}

export default function PresentationManager() {
  const [items, setItems] = useState<Presentation[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // Jobs & tasks dropdown source (dari DB asli)
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [tasks, setTasks] = useState<TaskOption[]>([]);

  // file upload state
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!ok) return;
    const t = setTimeout(() => setOk(null), 3000);
    return () => clearTimeout(t);
  }, [ok]);

  const refresh = useCallback(async () => {
    try {
      const list = await listAllPresentations();
      setItems(list);
    } catch (e) {
      setErr((e as Error).message);
      setItems([]);
    }
  }, []);

  // Load jobs sekali on mount (semua jobs — admin god mode)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listMyJobs();
        if (!cancelled) setJobs(list);
      } catch {
        if (!cancelled) setJobs([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load tasks setiap kali job_id berubah
  useEffect(() => {
    if (!form.job_id) {
      setTasks([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const list = await listTasksForJob(form.job_id!);
        if (!cancelled) setTasks(list);
      } catch {
        if (!cancelled) setTasks([]);
      }
    })();
    return () => { cancelled = true; };
  }, [form.job_id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFile(null);
  }

  function startEdit(p: Presentation) {
    setEditingId(p.id);
    setForm({
      title: p.title,
      project: p.project,
      job_id: p.job_id,
      task_id: p.task_id,
      meeting_date: p.meeting_date,
      status: p.status,
      sourceMode: p.storage_path ? "upload" : "url",
      storage_path: p.storage_path,
      external_url: p.external_url ?? "",
      description: p.description ?? "",
    });
    setFile(null);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function handleUpload() {
    if (!file) {
      setErr("Pilih file deck dulu sebelum upload.");
      return;
    }
    setErr(null);
    setUploading(true);
    try {
      const path = await uploadDeck(file, file.name);
      setForm((f) => ({ ...f, storage_path: path }));
      setOk(`File terupload: ${path}`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);

    const title = form.title.trim();
    const project = form.project.trim();
    const meeting_date = form.meeting_date.trim();
    const externalUrl = form.external_url.trim();

    if (!title) return setErr("Judul wajib diisi.");
    if (!project) return setErr("Project wajib dipilih.");
    if (!meeting_date) return setErr("Tanggal meeting wajib diisi.");
    if (!isTuesday(meeting_date)) {
      return setErr("Tanggal meeting harus hari Selasa.");
    }

    const usingUpload = form.sourceMode === "upload";
    let storagePath = usingUpload ? form.storage_path : null;
    const externUrl = usingUpload ? null : externalUrl || null;

    // Auto-upload: kalau user pilih file tapi belum klik tombol Upload,
    // otomatis upload sekarang sebelum submit. Hilangkan UX trap "klik
    // Upload dulu baru submit".
    if (usingUpload && !storagePath && file) {
      setBusy(true);
      setUploading(true);
      try {
        storagePath = await uploadDeck(file, file.name);
        setForm((f) => ({ ...f, storage_path: storagePath }));
      } catch (e) {
        setBusy(false);
        setUploading(false);
        return setErr(`Gagal upload file: ${(e as Error).message}`);
      } finally {
        setUploading(false);
      }
    }

    if (!storagePath && !externUrl) {
      setBusy(false);
      return setErr(
        usingUpload
          ? "Pilih file .html dulu (klik Choose File), atau switch ke External URL."
          : "Isi External URL dulu, atau switch ke Upload File."
      );
    }

    setBusy(true);
    try {
      if (editingId) {
        await updatePresentation(editingId, {
          title,
          project,
          job_id: form.job_id,
          task_id: form.task_id,
          meeting_date,
          status: form.status,
          storage_path: storagePath,
          external_url: externUrl,
          description: form.description.trim() || null,
        });
        setOk(`Presentasi "${title}" diupdate`);
      } else {
        await createPresentation({
          title,
          project,
          job_id: form.job_id,
          task_id: form.task_id,
          meeting_date,
          status: form.status,
          storage_path: storagePath,
          external_url: externUrl,
          description: form.description.trim() || null,
        });
        setOk(`Presentasi "${title}" ditambahkan`);
      }
      resetForm();
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(p: Presentation) {
    if (!window.confirm(`Hapus presentasi "${p.title}"?`)) return;
    setErr(null);
    setBusy(true);
    try {
      await deletePresentation(p.id);
      if (editingId === p.id) resetForm();
      await refresh();
      setOk(`Presentasi "${p.title}" dihapus`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const grouped = useMemo(() => {
    const list = items ?? [];
    const map = new Map<string, Presentation[]>();
    for (const p of list) {
      const arr = map.get(p.meeting_date) ?? [];
      arr.push(p);
      map.set(p.meeting_date, arr);
    }
    return [...map.entries()].sort((a, b) =>
      a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0
    );
  }, [items]);

  const loading = items === null;
  const dateIsValid =
    form.meeting_date.trim() !== "" && isTuesday(form.meeting_date);
  const dateHelperColor =
    form.meeting_date.trim() === ""
      ? "text-muted"
      : dateIsValid
        ? "text-ok"
        : "text-late";

  return (
    <main className="mx-auto max-w-3xl p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <PresentationIcon size={20} className="text-accent" />
          Manage Presentations
        </h1>
        <p className="text-sm text-muted">
          Kelola materi presentasi mingguan. Tanggal meeting harus jatuh di hari
          Selasa.
        </p>
      </div>

      {err && (
        <div className="card border-late/60 bg-late/10 flex items-start gap-3 animate-in fade-in">
          <X size={18} className="text-late shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <div className="font-semibold text-late mb-1">Gagal</div>
            <div className="text-muted break-all">{err}</div>
          </div>
          <button
            onClick={() => setErr(null)}
            className="text-muted hover:text-ink-50"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {ok && (
        <div className="card border-ok/60 bg-ok/10 flex items-start gap-3 animate-in fade-in">
          <Check size={18} className="text-ok shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-ok font-medium">{ok}</div>
          <button
            onClick={() => setOk(null)}
            className="text-ok/60 hover:text-ok"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <section className="card space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted">
          <span className="text-accent">
            {editingId ? <Pencil size={16} /> : <Plus size={16} />}
          </span>
          {editingId ? "Edit Presentasi" : "Tambah Presentasi"}
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="ml-auto text-xs text-muted hover:text-late transition normal-case tracking-normal"
            >
              Batal edit
            </button>
          )}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* PROJECT — dropdown dari tabel jobs, group by assignee */}
            <label className="block">
              <span className="block text-[11px] uppercase tracking-widest text-muted mb-1">
                Project (Job)
              </span>
              <select
                value={form.job_id ?? ""}
                onChange={(e) => {
                  const jobId = e.target.value || null;
                  const job = jobs.find((j) => j.id === jobId) ?? null;
                  setForm((f) => ({
                    ...f,
                    job_id: jobId,
                    project: job?.name ?? "",
                    task_id: null,           // reset task pas ganti job
                  }));
                }}
                required
                className="input w-full"
              >
                <option value="">— pilih job —</option>
                {(() => {
                  // Group by assignee
                  const grouped: Record<string, typeof jobs> = {};
                  for (const j of jobs) {
                    (grouped[j.assignee] ??= []).push(j);
                  }
                  return Object.entries(grouped).map(([assignee, list]) => (
                    <optgroup key={assignee} label={assignee}>
                      {list.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.name}
                        </option>
                      ))}
                    </optgroup>
                  ));
                })()}
              </select>
              {jobs.length === 0 && (
                <span className="text-[10px] text-late italic mt-1 block">
                  Belum ada job. Tambah di /admin (Members &amp; Jobs).
                </span>
              )}
            </label>

            {/* JUDUL — pilih dari tasks job tsb, atau ketik manual */}
            <label className="block">
              <span className="block text-[11px] uppercase tracking-widest text-muted mb-1">
                Judul (pilih task atau ketik bebas)
              </span>
              {tasks.length > 0 ? (
                <select
                  value={form.task_id ?? ""}
                  onChange={(e) => {
                    const taskId = e.target.value || null;
                    if (taskId === "__custom__") {
                      // Mode custom: kosongkan task_id, biar user ketik di field bawah
                      setForm((f) => ({ ...f, task_id: null, title: "" }));
                      return;
                    }
                    const t = tasks.find((x) => x.id === taskId);
                    setForm((f) => ({
                      ...f,
                      task_id: taskId,
                      title: t?.title ?? f.title,
                    }));
                  }}
                  className="input w-full"
                >
                  <option value="">— pilih task —</option>
                  <option value="__custom__">✎ Judul bebas (ketik manual)</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.status}] {t.title}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  required
                  placeholder={form.job_id ? "Job ini belum punya task — ketik judul bebas" : "Pilih job dulu"}
                  disabled={!form.job_id}
                  className="input w-full"
                />
              )}
              {tasks.length > 0 && !form.task_id && (
                <input
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  required
                  placeholder="Ketik judul bebas..."
                  className="input w-full mt-2"
                />
              )}
            </label>

            <label className="block">
              <span className="block text-[11px] uppercase tracking-widest text-muted mb-1">
                Tanggal Meeting
              </span>
              <input
                type="date"
                value={form.meeting_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, meeting_date: e.target.value }))
                }
                required
                className="input w-full"
              />
              <span
                className={cn(
                  "block text-[10px] mt-1 flex items-center gap-1",
                  dateHelperColor
                )}
              >
                <Calendar size={10} />
                Harus hari Selasa
                {form.meeting_date && (
                  <span className="text-muted/70">
                    · {formatDate(form.meeting_date)}
                  </span>
                )}
              </span>
            </label>

            <label className="block">
              <span className="block text-[11px] uppercase tracking-widest text-muted mb-1">
                Status
              </span>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as PresentationStatus,
                  }))
                }
                className="input w-full"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-2">
            <span className="block text-[11px] uppercase tracking-widest text-muted">
              Sumber Deck
            </span>
            <div className="flex gap-2 flex-wrap">
              <label
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md border cursor-pointer text-sm transition",
                  form.sourceMode === "upload"
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-ink-700 text-muted hover:text-ink-50"
                )}
              >
                <input
                  type="radio"
                  name="source"
                  className="sr-only"
                  checked={form.sourceMode === "upload"}
                  onChange={() =>
                    setForm((f) => ({ ...f, sourceMode: "upload" }))
                  }
                />
                <Upload size={14} /> Upload File
              </label>
              <label
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md border cursor-pointer text-sm transition",
                  form.sourceMode === "url"
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-ink-700 text-muted hover:text-ink-50"
                )}
              >
                <input
                  type="radio"
                  name="source"
                  className="sr-only"
                  checked={form.sourceMode === "url"}
                  onChange={() => setForm((f) => ({ ...f, sourceMode: "url" }))}
                />
                <LinkIcon size={14} /> External URL
              </label>
            </div>

            {form.sourceMode === "upload" ? (
              <div className="rounded-lg border border-ink-700 bg-ink-900/40 p-3 space-y-2">
                <div className="flex flex-col md:flex-row gap-2 md:items-center">
                  <input
                    type="file"
                    accept=".html"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="text-sm text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-ink-700 file:bg-ink-800 file:text-ink-50 file:text-xs file:cursor-pointer hover:file:bg-ink-700 flex-1 min-w-0"
                  />
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className="btn btn-accent shrink-0"
                  >
                    {uploading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />{" "}
                        Mengupload...
                      </>
                    ) : (
                      <>
                        <Upload size={14} /> Upload
                      </>
                    )}
                  </button>
                </div>
                {form.storage_path ? (
                  <div className="flex items-center gap-2 text-xs text-ok">
                    <Check size={12} />
                    <span className="break-all">{form.storage_path}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, storage_path: null }))
                      }
                      className="ml-auto text-muted hover:text-late shrink-0"
                      title="Hapus deck tersimpan"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : file ? (
                  <div className="text-[11px] text-accent italic">
                    ✓ File siap. Tinggal klik "Tambah Presentasi" — auto-upload otomatis. (Atau klik tombol "Upload" di atas kalau mau upload duluan.)
                  </div>
                ) : (
                  <div className="text-[11px] text-muted italic">
                    Pilih file .html dulu. Setelah pilih, langsung klik "Tambah Presentasi" (auto-upload), atau klik tombol Upload di atas.
                  </div>
                )}
              </div>
            ) : (
              <input
                type="url"
                value={form.external_url}
                onChange={(e) =>
                  setForm((f) => ({ ...f, external_url: e.target.value }))
                }
                placeholder="https://..."
                className="input w-full"
              />
            )}
          </div>

          <label className="block">
            <span className="block text-[11px] uppercase tracking-widest text-muted mb-1">
              Deskripsi (opsional)
            </span>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={3}
              placeholder="Catatan singkat tentang isi presentasi..."
              className="input w-full resize-y"
            />
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="btn btn-accent"
            >
              {busy ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Menyimpan...
                </>
              ) : editingId ? (
                <>
                  <Check size={14} /> Simpan Perubahan
                </>
              ) : (
                <>
                  <Plus size={14} /> Tambah Presentasi
                </>
              )}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="btn">
                Batal
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="card space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted">
          <span className="text-accent">
            <FileText size={16} />
          </span>
          Daftar Presentasi
          <span className="ml-auto text-xs text-muted normal-case tracking-normal">
            {loading
              ? "memuat..."
              : `${items?.length ?? 0} item · ${grouped.length} meeting`}
          </span>
        </h2>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Loader2 size={14} className="animate-spin text-accent" /> Memuat
            daftar presentasi...
          </div>
        )}

        {!loading && grouped.length === 0 && (
          <div className="text-sm text-muted italic">
            Belum ada presentasi. Tambah materi pertama di form atas.
          </div>
        )}

        <div className="space-y-4">
          {grouped.map(([meetingDate, rows]) => (
            <div key={meetingDate} className="space-y-2">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted">
                <Calendar size={12} className="text-accent" />
                {formatDate(meetingDate)}
                <span className="normal-case tracking-normal text-muted/70">
                  · {rows.length} topik
                </span>
              </div>
              <div className="space-y-2">
                {rows.map((p) => (
                  <PresentationRow
                    key={p.id}
                    item={p}
                    isEditing={editingId === p.id}
                    disabled={busy}
                    onEdit={() => startEdit(p)}
                    onDelete={() => handleDelete(p)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function PresentationRow({
  item,
  isEditing,
  disabled,
  onEdit,
  onDelete,
}: {
  item: Presentation;
  isEditing: boolean;
  disabled?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const href = item.external_url
    ? item.external_url
    : item.storage_path
      ? getDeckPublicUrl(item.storage_path)
      : null;

  return (
    <div
      className={cn(
        "rounded-lg border bg-ink-800/40 p-3 flex items-center gap-3 flex-wrap md:flex-nowrap",
        isEditing ? "border-accent/60 bg-accent/5" : "border-ink-700"
      )}
    >
      <div className="w-9 h-9 rounded-md bg-accent/15 text-accent flex items-center justify-center shrink-0">
        <PresentationIcon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold truncate">{item.title}</span>
          <span className={cn("chip text-[10px] shrink-0", statusChip(item.status))}>
            {item.status}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted mt-0.5 flex-wrap">
          <span>{item.project}</span>
          {item.storage_path && (
            <>
              <span className="text-muted/40">·</span>
              <span className="italic text-muted/70">deck tersimpan</span>
            </>
          )}
          {item.external_url && !item.storage_path && (
            <>
              <span className="text-muted/40">·</span>
              <span className="italic text-muted/70">external</span>
            </>
          )}
        </div>
      </div>

      {href && (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-xs text-accent hover:underline shrink-0"
          title="Buka deck"
        >
          Buka <ExternalLink size={11} />
        </a>
      )}

      <button
        onClick={onEdit}
        disabled={disabled}
        className="text-muted hover:text-accent transition disabled:opacity-30"
        title="Edit presentasi"
      >
        <Pencil size={14} />
      </button>
      <button
        onClick={onDelete}
        disabled={disabled}
        className="text-muted hover:text-late transition disabled:opacity-30"
        title="Hapus presentasi"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
