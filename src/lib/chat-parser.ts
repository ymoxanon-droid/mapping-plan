/**
 * Regex-based parser Bahasa Indonesia.
 * Intent:
 *   - status_by_assignee   : "sampai mana claude-staff", "progress ahmad"
 *   - activity_log         : "log aktivitas", "aktivitas claude-staff", "revisi terbaru"
 *   - list_jobs            : "list job", "semua job"
 *   - list_assignees       : "siapa aja", "anggota"
 *   - help                 : "help", "bantuan"
 *   - unknown              : fallback
 */

export type Intent =
  | { kind: "status_by_assignee"; assignee: string }
  | { kind: "activity_log"; assignee?: string }
  | { kind: "list_jobs" }
  | { kind: "list_assignees" }
  | { kind: "help" }
  | { kind: "unknown"; raw: string };

const ASK_PROGRESS = /(sampai mana|sampe mana|udah sampai|progres|progress|gimana|kabar|status|sejauh mana)/i;
const ACTIVITY_LOG = /(log aktivitas|aktivitas|activity log|activity|revisi terbaru|apa yang berubah|riwayat|history|\blog\b)/i;
const LIST_JOBS = /(list|semua|daftar|seluruh).*(job|jobdesk|tugas|pekerjaan)/i;
const LIST_ASSIGN = /(siapa aja|siapa saja|list orang|anggota|tim|assignee|siapa yang)/i;
const HELP = /^(help|bantuan|\?|commands?)$/i;

function findAssignee(text: string, known: string[]): string | undefined {
  return known.find((a) => new RegExp(`\\b${escapeRegex(a.toLowerCase())}\\b`, "i").test(text));
}

export function parse(raw: string, knownAssignees: string[] = []): Intent {
  const text = raw.trim().toLowerCase();
  if (!text) return { kind: "unknown", raw };

  if (HELP.test(text)) return { kind: "help" };

  // Activity log dicek DULUAN sebelum list/status biar kata "log" nggak ketabrak "list job"
  if (ACTIVITY_LOG.test(text)) {
    return { kind: "activity_log", assignee: findAssignee(text, knownAssignees) };
  }

  if (LIST_ASSIGN.test(text)) return { kind: "list_assignees" };
  if (LIST_JOBS.test(text)) return { kind: "list_jobs" };

  const hit = findAssignee(text, knownAssignees);
  if (hit) {
    if (ASK_PROGRESS.test(text) || text.split(/\s+/).length <= 3) {
      return { kind: "status_by_assignee", assignee: hit };
    }
  }

  return { kind: "unknown", raw };
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const HELP_TEXT = `Contoh perintah:
- "sampai mana claude-staff" — progres assignee
- "log aktivitas" — semua aktivitas terbaru
- "aktivitas claude-staff" — aktivitas 1 orang
- "list job" — semua jobdesk
- "siapa aja" — daftar anggota
- "help" — bantuan`;
