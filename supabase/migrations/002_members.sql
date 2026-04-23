-- Workflow Dashboard — members & access codes
-- Target schema: public
--
-- Cara jalanin:
--   1. Buka Supabase dashboard → SQL Editor
--   2. Copy-paste seluruh file ini
--   3. Klik "Run"
--
-- Setelah ini, halaman /admin pakai tabel ini sebagai sumber kebenaran
-- (tidak lagi localStorage), jadi data anggota sync lintas device/deploy.

create extension if not exists "pgcrypto";

-- =========================
-- members: daftar anggota tim + kode akses
-- =========================
create table if not exists members (
  id           uuid primary key default gen_random_uuid(),
  name         text        not null,
  access_code  text        not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Nama unik (case-insensitive) biar ga ada duplikat "Leo" vs "leo"
create unique index if not exists idx_members_name_unique
  on members (lower(name));

-- Kode akses unik biar tidak bentrok antar anggota
create unique index if not exists idx_members_access_code_unique
  on members (access_code);

-- =========================
-- Trigger: auto-update updated_at tiap row diubah
-- =========================
create or replace function fn_members_touch_updated_at() returns trigger as $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_members_touch on members;
create trigger trg_members_touch
  before update on members
  for each row execute function fn_members_touch_updated_at();
