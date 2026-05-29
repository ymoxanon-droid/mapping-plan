-- Workflow Dashboard — Presentations linked to Jobs + Tasks
-- Plus status enum update (Proses/Pending/Selesai, drop Draft).
--
-- Cara jalanin:
--   1. Buka Supabase dashboard → SQL Editor
--   2. Copy-paste seluruh file ini
--   3. Klik "Run"

-- =========================
-- 1. Add job_id + task_id (nullable, optional link)
-- =========================
alter table presentations add column if not exists job_id  uuid references jobs(id)  on delete set null;
alter table presentations add column if not exists task_id uuid references tasks(id) on delete set null;

create index if not exists idx_presentations_job  on presentations (job_id);
create index if not exists idx_presentations_task on presentations (task_id);

-- =========================
-- 2. Update status enum: Selesai/Proses/Pending (drop Draft)
--    Existing 'Draft' rows → 'Proses' (default new state)
-- =========================
update presentations set status = 'Proses' where status = 'Draft';

alter table presentations drop constraint if exists presentations_status_check;
alter table presentations add  constraint presentations_status_check
  check (status in ('Selesai','Proses','Pending'));

alter table presentations alter column status set default 'Proses';

-- =========================
-- 3. Backfill project text dari job.name (kalau job_id ada)
--    (placeholder — gak ada baris existing yang punya job_id sekarang)
-- =========================
-- (no-op untuk fresh setup)

-- =========================
-- 4. Refresh view v_meetings (idempotent)
-- =========================
create or replace view v_meetings as
select
  p.meeting_date,
  count(*) as topic_count,
  extract(week  from p.meeting_date)::int as iso_week,
  extract(year  from p.meeting_date)::int as year,
  extract(month from p.meeting_date)::int as month
from presentations p
group by p.meeting_date
order by p.meeting_date desc;
