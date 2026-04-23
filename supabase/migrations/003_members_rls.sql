-- Workflow Dashboard — members RLS + column-level security + RPC verify
--
-- Masalah sebelumnya:
--   Supabase auto-enable RLS di tabel baru, tapi migration 002 gak set policy
--   apapun, jadi semua SELECT/INSERT error 401 / "row-level security" violation.
--
-- Solusi di migration ini:
--   1. Tambah policy RLS supaya anon bisa CRUD baris.
--   2. Column-level: anon TIDAK bisa baca kolom access_code lewat SELECT biasa.
--   3. RPC `verify_access_code(code)` pakai SECURITY DEFINER buat verifikasi login
--      tanpa bocorin access_code ke client.
--
-- Cara jalanin:
--   1. Buka Supabase dashboard → SQL Editor
--   2. Copy-paste seluruh file ini
--   3. Klik "Run"

-- =========================
-- 1. Enable RLS (kalau belum)
-- =========================
alter table members enable row level security;

-- =========================
-- 2. RLS policies — anon boleh CRUD semua baris
--    (kontrol sebenarnya lewat column-level grant di bawah)
-- =========================
drop policy if exists members_anon_select on members;
create policy members_anon_select on members
  for select
  to anon
  using (true);

drop policy if exists members_anon_insert on members;
create policy members_anon_insert on members
  for insert
  to anon
  with check (true);

drop policy if exists members_anon_update on members;
create policy members_anon_update on members
  for update
  to anon
  using (true)
  with check (true);

drop policy if exists members_anon_delete on members;
create policy members_anon_delete on members
  for delete
  to anon
  using (true);

-- Sama untuk authenticated role (kalau nanti dipakai auth beneran)
drop policy if exists members_auth_select on members;
create policy members_auth_select on members
  for select
  to authenticated
  using (true);

drop policy if exists members_auth_insert on members;
create policy members_auth_insert on members
  for insert
  to authenticated
  with check (true);

drop policy if exists members_auth_update on members;
create policy members_auth_update on members
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists members_auth_delete on members;
create policy members_auth_delete on members
  for delete
  to authenticated
  using (true);

-- =========================
-- 3. Column-level: anon TIDAK bisa SELECT access_code
--    (tapi tetap bisa INSERT/UPDATE kode buat anggota baru atau rotate)
-- =========================
revoke all on table members from anon;
grant select (id, name, created_at, updated_at) on table members to anon;
grant insert (name, access_code)                on table members to anon;
grant update (name, access_code)                on table members to anon;
grant delete                                    on table members to anon;

revoke all on table members from authenticated;
grant select (id, name, created_at, updated_at) on table members to authenticated;
grant insert (name, access_code)                on table members to authenticated;
grant update (name, access_code)                on table members to authenticated;
grant delete                                    on table members to authenticated;

-- =========================
-- 4. Trigger touch jadi SECURITY DEFINER supaya bisa set updated_at
--    meski anon tidak punya UPDATE privilege di kolom updated_at.
-- =========================
create or replace function fn_members_touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$;

-- =========================
-- 5. RPC verify_access_code
--    Anon tidak bisa SELECT access_code langsung; pakai RPC ini untuk login.
--    Return hanya id + name (kalau match), tidak bocorin kode manapun.
-- =========================
create or replace function verify_access_code(p_code text)
returns table (id uuid, name text)
language sql
security definer
set search_path = public
as $$
  select m.id, m.name
  from members m
  where m.access_code = p_code
  limit 1
$$;

revoke all on function verify_access_code(text) from public;
grant execute on function verify_access_code(text) to anon;
grant execute on function verify_access_code(text) to authenticated;
