const STORAGE_KEY = "workflow_members_v1";

export interface Member {
  name: string;
  access_code: string;
  created_at: string;
}

function read(): Member[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Member[]) : [];
  } catch {
    return [];
  }
}

function write(list: Member[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function normalize(name: string): string {
  return name.trim().toLowerCase();
}

export function listMembers(): Member[] {
  return read().sort((a, b) => a.name.localeCompare(b.name));
}

export function addMember(name: string, access_code: string): Member {
  const clean = name.trim();
  const code = access_code.trim();
  if (!clean) throw new Error("Nama anggota tidak boleh kosong.");
  if (!code) throw new Error("Kode akses tidak boleh kosong.");
  const list = read();
  if (list.some((m) => normalize(m.name) === normalize(clean))) {
    throw new Error(`Anggota "${clean}" sudah ada.`);
  }
  const member: Member = {
    name: clean,
    access_code: code,
    created_at: new Date().toISOString()
  };
  list.push(member);
  write(list);
  return member;
}

export function updateMember(
  originalName: string,
  patch: { name?: string; access_code?: string }
): Member {
  const list = read();
  const idx = list.findIndex((m) => normalize(m.name) === normalize(originalName));
  if (idx < 0) throw new Error(`Anggota "${originalName}" tidak ditemukan.`);

  const nextName = patch.name?.trim() ?? list[idx].name;
  const nextCode = patch.access_code?.trim() ?? list[idx].access_code;
  if (!nextName) throw new Error("Nama anggota tidak boleh kosong.");
  if (!nextCode) throw new Error("Kode akses tidak boleh kosong.");

  if (
    normalize(nextName) !== normalize(list[idx].name) &&
    list.some((m, i) => i !== idx && normalize(m.name) === normalize(nextName))
  ) {
    throw new Error(`Anggota "${nextName}" sudah ada.`);
  }

  list[idx] = { ...list[idx], name: nextName, access_code: nextCode };
  write(list);
  return list[idx];
}

export function deleteMember(name: string): void {
  const list = read().filter((m) => normalize(m.name) !== normalize(name));
  write(list);
}

export function findMemberByCode(code: string): Member | null {
  const trimmed = code.trim();
  if (!trimmed) return null;
  return read().find((m) => m.access_code === trimmed) ?? null;
}

export function findMemberByName(name: string): Member | null {
  return read().find((m) => normalize(m.name) === normalize(name)) ?? null;
}
