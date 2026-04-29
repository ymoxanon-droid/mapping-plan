const PALETTE = [
  "#7c5cff", // violet
  "#22d3ee", // cyan
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ec4899", // pink
  "#38bdf8", // sky
  "#a3e635", // lime
  "#fb7185", // rose
  "#fb923c", // orange
  "#818cf8", // indigo
  "#f472b6", // hot pink
  "#34d399", // green
  "#facc15", // yellow
  "#60a5fa", // blue
  "#c084fc", // purple
  "#2dd4bf", // teal
  "#fde047", // gold
  "#f87171", // red
  "#a78bfa", // light violet
  "#4ade80"  // light green
];

export const PALETTE_SIZE = PALETTE.length;

/**
 * Build a mapping `id → warna` yang dijamin unik untuk N ≤ 20 job.
 * Urutan deterministik (sort by id) supaya warna tetap konsisten antar reload
 * selama daftar job-nya sama.
 */
export function assignJobColors(jobIds: string[]): Map<string, string> {
  const unique = Array.from(new Set(jobIds)).sort();
  const map = new Map<string, string>();
  unique.forEach((id, i) => {
    map.set(id, PALETTE[i % PALETTE.length]);
  });
  return map;
}
