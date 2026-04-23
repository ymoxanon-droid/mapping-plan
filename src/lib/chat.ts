import { parse } from "@/lib/chat-parser";
import { getAllSnapshots, getAssignees, getSnapshotByAssignee } from "@/lib/snapshots";
import { formatDateTime } from "@/lib/utils";
import type { JobSnapshot, TaskEvent } from "@/lib/types";

const EVENT_LABEL: Record<string, string> = {
  created: "dibuat",
  added: "ditambahkan",
  revised: "direvisi",
  updated: "diupdate",
  completed: "diselesaikan",
  reopened: "dibuka lagi",
  deleted: "dihapus"
};

function summarize(s: JobSnapshot): string {
  const p = s.progress;
  const recent = s.events.slice(0, 3).map((e) => {
    const title = (e.new_value as { title?: string })?.title ?? "(task)";
    const when = formatDateTime(e.created_at);
    const note = e.note ? ` — ${e.note}` : "";
    return `• ${EVENT_LABEL[e.event_type] ?? e.event_type}: ${title}${note} (${when})`;
  });

  const lines = [
    `📊 ${s.job.assignee.toUpperCase()} · ${s.job.name}`,
    `Progress: ${p.done_tasks}/${p.total_tasks} selesai (${p.percent_done ?? 0}%)`,
    `Jalan: ${p.in_progress_tasks} · Belum: ${p.pending_tasks}`,
    "",
    "Aktivitas terbaru:",
    ...(recent.length ? recent : ["(belum ada aktivitas)"])
  ];
  return lines.join("\n");
}

function formatActivityLog(
  events: (TaskEvent & { _assignee: string; _jobName: string })[],
  title: string,
  limit = 12
): string {
  const sorted = [...events].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const shown = sorted.slice(0, limit);
  if (shown.length === 0) return `${title}\n(belum ada aktivitas)`;

  const lines = shown.map((e) => {
    const taskTitle =
      (e.new_value as { title?: string })?.title ??
      (e.old_value as { title?: string })?.title ??
      "(task)";
    const when = formatDateTime(e.created_at);
    const label = EVENT_LABEL[e.event_type] ?? e.event_type;
    const who = e._assignee ? ` [${e._assignee}]` : "";
    const note = e.note ? `\n    └─ ${e.note}` : "";
    return `• ${label}${who}: ${taskTitle} (${when})${note}`;
  });
  return `${title} — ${shown.length} dari ${sorted.length}:\n${lines.join("\n")}`;
}

export interface ChatReply {
  text: string;
  scrollTo?: string;
  unknown?: boolean;
}

export async function resolveChat(message: string): Promise<ChatReply> {
  if (typeof message !== "string") return { text: "Pesan tidak valid." };

  const assignees = await getAssignees();
  const intent = parse(message, assignees);

  switch (intent.kind) {
    case "help":
      return {
        text: "Tentu, aku bisa bantu hal-hal berikut. Silakan pilih:",
        unknown: true
      };

    case "list_assignees":
      return {
        text: assignees.length
          ? `Anggota aktif: ${assignees.join(", ")}.`
          : "Belum ada anggota."
      };

    case "list_jobs": {
      const all = await getAllSnapshots();
      if (all.length === 0) return { text: "Belum ada jobdesk." };
      const lines = all.map(
        (s) =>
          `• ${s.job.assignee} — ${s.job.name} — ${s.progress.done_tasks}/${s.progress.total_tasks} (${s.progress.percent_done ?? 0}%)`
      );
      return { text: `Jobdesk aktif (${all.length}):\n${lines.join("\n")}` };
    }

    case "status_by_assignee": {
      const snaps = await getSnapshotByAssignee(intent.assignee);
      if (snaps.length === 0) {
        return { text: `Hmm, nggak nemu jobdesk untuk "${intent.assignee}".` };
      }
      return {
        text: snaps.map(summarize).join("\n\n———\n\n"),
        scrollTo: intent.assignee
      };
    }

    case "activity_log": {
      const snaps = intent.assignee
        ? await getSnapshotByAssignee(intent.assignee)
        : await getAllSnapshots();
      if (snaps.length === 0) {
        return {
          text: intent.assignee
            ? `Nggak nemu jobdesk untuk "${intent.assignee}".`
            : "Belum ada jobdesk."
        };
      }
      const enriched = snaps.flatMap((s) =>
        s.events.map((e) => ({ ...e, _assignee: s.job.assignee, _jobName: s.job.name }))
      );
      const title = intent.assignee
        ? `🔔 Activity log ${intent.assignee}`
        : `🔔 Activity log semua jobdesk`;
      return {
        text: formatActivityLog(enriched, title),
        scrollTo: intent.assignee
      };
    }

    default:
      return {
        text: "Baik, aku siap bantu. Silakan pilih salah satu kategori di bawah:",
        unknown: true
      };
  }
}
