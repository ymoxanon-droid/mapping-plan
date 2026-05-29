-- Workflow Dashboard — presentations (rapat mingguan Selasa)
-- Target schema: public
--
-- Cara jalanin:
--   1. Buka Supabase dashboard → SQL Editor
--   2. Copy-paste seluruh file ini
--   3. Klik "Run"
--
-- Tabel ini nyimpen materi presentasi per topik per rapat.
-- Rapat wajib hari Selasa (DOW = 2). Tiap row = satu topik di satu meeting.
-- File materi bisa di Supabase Storage (storage_path) atau link luar (external_url),
-- minimal salah satu harus diisi.

create extension if not exists "pgcrypto";

-- =========================
-- presentations: materi rapat mingguan
-- =========================
create table if not exists presentations (
  id            uuid        primary key default gen_random_uuid(),
  title         text        not null,
  project       text        not null,
  meeting_date  date        not null,
  topic_order   int         not null default 0,
  status        text        not null default 'Draft'
                              check (status in ('Selesai','Proses','Draft')),
  storage_path  text,
  external_url  text,
  description   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint must_have_url
    check (storage_path is not null or external_url is not null),
  constraint meeting_must_be_tuesday
    check (extract(dow from meeting_date) = 2)
);

-- Index buat list per rapat (urut tanggal desc, topik asc)
create index if not exists idx_presentations_meeting
  on presentations (meeting_date desc, topic_order asc);

-- =========================
-- Trigger: auto-update updated_at tiap row diubah
--   (mirror pattern dari fn_members_touch_updated_at)
-- =========================
create or replace function fn_presentations_touch_updated_at()
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

drop trigger if exists trg_presentations_touch on presentations;
create trigger trg_presentations_touch
  before update on presentations
  for each row execute function fn_presentations_touch_updated_at();

-- =========================
-- RLS: enable + policies anon & authenticated boleh CRUD semua baris
-- =========================
alter table presentations enable row level security;

drop policy if exists presentations_anon_select on presentations;
create policy presentations_anon_select on presentations
  for select
  to anon
  using (true);

drop policy if exists presentations_anon_insert on presentations;
create policy presentations_anon_insert on presentations
  for insert
  to anon
  with check (true);

drop policy if exists presentations_anon_update on presentations;
create policy presentations_anon_update on presentations
  for update
  to anon
  using (true)
  with check (true);

drop policy if exists presentations_anon_delete on presentations;
create policy presentations_anon_delete on presentations
  for delete
  to anon
  using (true);

drop policy if exists presentations_auth_select on presentations;
create policy presentations_auth_select on presentations
  for select
  to authenticated
  using (true);

drop policy if exists presentations_auth_insert on presentations;
create policy presentations_auth_insert on presentations
  for insert
  to authenticated
  with check (true);

drop policy if exists presentations_auth_update on presentations;
create policy presentations_auth_update on presentations
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists presentations_auth_delete on presentations;
create policy presentations_auth_delete on presentations
  for delete
  to authenticated
  using (true);

-- =========================
-- Grants: kasih semua privilege ke anon & authenticated
-- =========================
grant all on table presentations to anon;
grant all on table presentations to authenticated;

-- =========================
-- View: ringkasan rapat (per tanggal + jumlah topik + iso week/year/month)
-- =========================
create or replace view v_meetings as
select
  meeting_date,
  count(*)                              as topic_count,
  extract(week  from meeting_date)::int as iso_week,
  extract(year  from meeting_date)::int as year,
  extract(month from meeting_date)::int as month
from presentations
group by meeting_date;

grant select on v_meetings to anon;
grant select on v_meetings to authenticated;
