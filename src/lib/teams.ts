/**
 * Konfigurasi team — kelompok anggota.
 * Edit file ini buat tambah/pindah anggota antar team.
 * Nama anggota di-match case-insensitive dengan field `jobs.assignee` / nama di tabel members.
 */

export interface Team {
  name: string;
  members: string[]; // lowercase member names
}

export const TEAMS: Team[] = [
  {
    name: "Superman",
    members: ["claude-staff", "kangdedi"]
  }
];

const FALLBACK_TEAM = "Lainnya";

export function getTeamForMember(name: string): string {
  const normalized = name.toLowerCase();
  const team = TEAMS.find((t) => t.members.includes(normalized));
  return team?.name ?? FALLBACK_TEAM;
}

export interface TeamGroup {
  team: string;
  members: string[];
}

export function groupMembersByTeam(members: string[]): TeamGroup[] {
  const grouped = new Map<string, string[]>();
  members.forEach((name) => {
    const team = getTeamForMember(name);
    const list = grouped.get(team) ?? [];
    list.push(name);
    grouped.set(team, list);
  });
  // Urutkan: team yang ada di TEAMS dulu (sesuai urutan konfigurasi), sisanya di akhir.
  const known = TEAMS.map((t) => t.name);
  const out: TeamGroup[] = [];
  known.forEach((name) => {
    const list = grouped.get(name);
    if (list) out.push({ team: name, members: list });
  });
  Array.from(grouped.entries())
    .filter(([name]) => !known.includes(name))
    .forEach(([team, members]) => out.push({ team, members }));
  return out;
}
