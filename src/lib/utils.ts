import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function relativeDate(iso: string): string {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: idLocale });
}

export function statusColor(status: string) {
  switch (status) {
    case "done":
      return "bg-ok";
    case "in_progress":
      return "bg-warn";
    case "cancelled":
      return "bg-muted";
    default:
      return "bg-ink-700";
  }
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function formatDuration(startIso: string, endIso: string): string {
  const diff = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (diff < 0) return "—";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return hours > 0 ? `${days} hari ${hours} jam` : `${days} hari`;
  if (hours > 0) {
    const mins = Math.floor((diff % 3600000) / 60000);
    return mins > 0 ? `${hours} jam ${mins} menit` : `${hours} jam`;
  }
  const mins = Math.floor(diff / 60000);
  return `${Math.max(mins, 1)} menit`;
}
