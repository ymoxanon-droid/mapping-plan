-- Workflow Dashboard — fix grants untuk tabel members
--
-- Masalah setelah migration 003:
--   Column-level GRANT (GRANT SELECT (id, name, ...) ON members TO anon)
--   tidak cukup untuk Supabase PostgREST. API layer butuh table-level SELECT
--   privilege supaya query lewat — hasilnya 401 "permission denied for table".
--
-- Solusi:
--   Balik ke table-level grants (matching jobs/tasks), pertahankan RLS policy
--   permissive dari migration 003, dan pakai RPC `verify_access_code` sebagai
--   jalur login yang rapi (bukan sebagai hard security boundary).
--
-- Cara jalanin:
--   1. Buka Supabase dashboard → SQL Editor
--   2. Copy-paste seluruh file ini
--   3. Klik "Run"

-- Reset privileges tabel members (bersihkan column-level grants dari 003)
revoke all on table members from anon;
revoke all on table members from authenticated;

-- Grant table-level — sama seperti jobs/tasks
grant select, insert, update, delete on table members to anon;
grant select, insert, update, delete on table members to authenticated;

-- RLS policies dari migration 003 tetap dipakai (members_anon_select, dll)
-- dan permissive (using/with check = true), jadi tidak perlu diubah.

-- RPC verify_access_code dari migration 003 juga tetap dipakai sebagai
-- jalur login anggota (client tidak langsung SELECT access_code).
