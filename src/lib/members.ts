import { getSupabase } from "@/lib/supabase";

/**
 * Sengaja TIDAK include `access_code` — kolom itu tidak bisa dibaca dari
 * anon key. Verifikasi pakai RPC `verify_access_code`.
 */
export interface Member {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

const SELECT_COLS = "id,name,created_at,updated_at";

function client() {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase belum dikonfigurasi.");
  return sb;
}

function mapError(err: { code?: string; message: string }, fallback: string): never {
  if (err.code === "23505") {
    if (err.message.includes("idx_members_name_unique")) {
      throw new Error("Nama anggota sudah dipakai.");
    }
    if (err.message.includes("idx_members_access_code_unique")) {
      throw new Error("Kode akses sudah dipakai anggota lain.");
    }
  }
  throw new Error(err.message || fallback);
}

export async function listMembers(): Promise<Member[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("members")
    .select(SELECT_COLS)
    .order("name", { ascending: true });
  if (error) mapError(error, "Gagal mengambil daftar anggota");
  return (data ?? []) as Member[];
}

export async function addMember(name: string, access_code: string): Promise<Member> {
  const clean = name.trim();
  const code = access_code.trim();
  if (!clean) throw new Error("Nama anggota tidak boleh kosong.");
  if (!code) throw new Error("Kode akses tidak boleh kosong.");
  const sb = client();
  const { data, error } = await sb
    .from("members")
    .insert({ name: clean, access_code: code })
    .select(SELECT_COLS)
    .single();
  if (error) mapError(error, "Gagal menambah anggota");
  return data as Member;
}

export async function updateMember(
  id: string,
  patch: { name?: string; access_code?: string }
): Promise<Member> {
  const sb = client();
  const update: Record<string, string> = {};
  if (patch.name !== undefined) {
    const v = patch.name.trim();
    if (!v) throw new Error("Nama anggota tidak boleh kosong.");
    update.name = v;
  }
  if (patch.access_code !== undefined && patch.access_code.trim() !== "") {
    update.access_code = patch.access_code.trim();
  }
  if (Object.keys(update).length === 0) {
    throw new Error("Tidak ada perubahan.");
  }
  const { data, error } = await sb
    .from("members")
    .update(update)
    .eq("id", id)
    .select(SELECT_COLS)
    .single();
  if (error) mapError(error, "Gagal mengupdate anggota");
  return data as Member;
}

export async function deleteMember(id: string): Promise<void> {
  const sb = client();
  const { error } = await sb.from("members").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Verifikasi kode akses via RPC `verify_access_code` (SECURITY DEFINER).
 * Anon tidak bisa baca kolom access_code langsung, jadi ini satu-satunya jalur.
 */
export async function findMemberByCode(code: string): Promise<Member | null> {
  const trimmed = code.trim();
  if (!trimmed) return null;
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc("verify_access_code", { p_code: trimmed });
  if (error) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || !row.id) return null;
  // RPC hanya return id + name; lengkapi biar tipe Member utuh.
  return {
    id: row.id,
    name: row.name,
    created_at: "",
    updated_at: ""
  };
}

export async function findMemberByName(name: string): Promise<Member | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("members")
    .select(SELECT_COLS)
    .ilike("name", trimmed)
    .maybeSingle();
  if (error) return null;
  return (data as Member) ?? null;
}
