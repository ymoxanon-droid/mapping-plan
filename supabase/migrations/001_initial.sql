-- Workflow Dashboard — event-sourced schema
-- Target schema: public (atau pindahkan ke schema khusus kalau mau pisah dari datadomain)

create extension if not exists "pgcrypto";

-- =========================
-- jobs: 1 jobdesk per assignee
-- =========================
create table if not exists jobs (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,          -- contoh: "SERP Generator V1 — Backend"
  assignee    text        not null,          -- contoh: "leo", "rul", "anti"
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_jobs_assignee on jobs (lower(assignee));

-- =========================
-- tasks: poin tugas (snapshot terkini)
-- =========================
create table if not exists tasks (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid        not null references jobs(id) on delete cascade,
  title       text        not null,
  description text,
  status      text        not null default 'pending'
              check (status in ('pending','in_progress','done','cancelled')),
  order_num   int         not null default 0,
  due_date    date,
  perspective text        check (perspective in ('financial','customer','internal','capacity')),
  depends_on  text[]       default '{}',
  kind        text         check (kind in ('trigger','task','research','milestone')) default 'task',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index if not exists idx_tasks_job   on tasks (job_id);
create index if not exists idx_tasks_stat  on tasks (status) where deleted_at is null;

-- =========================
-- task_events: history tiap perubahan
-- Event type: created | updated | revised | deleted | completed | reopened | added
-- =========================
create table if not exists task_events (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid        references tasks(id) on delete cascade,
  job_id      uuid        not null references jobs(id) on delete cascade,
  event_type  text        not null
              check (event_type in ('created','updated','revised','deleted','completed','reopened','added')),
  old_value   jsonb,
  new_value   jsonb,
  note        text,
  created_by  text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_events_job  on task_events (job_id, created_at desc);
create index if not exists idx_events_task on task_events (task_id, created_at desc);

-- =========================
-- Trigger: auto-log ke task_events tiap update/insert/delete di tasks
-- =========================
create or replace function fn_log_task_event() returns trigger as $$
declare
  v_event text;
  v_old   jsonb;
  v_new   jsonb;
begin
  if TG_OP = 'INSERT' then
    v_event := 'created';
    v_old := null;
    v_new := to_jsonb(NEW);
  elsif TG_OP = 'UPDATE' then
    if NEW.deleted_at is not null and OLD.deleted_at is null then
      v_event := 'deleted';
    elsif NEW.status = 'done' and OLD.status <> 'done' then
      v_event := 'completed';
    elsif OLD.status = 'done' and NEW.status <> 'done' then
      v_event := 'reopened';
    elsif NEW.title <> OLD.title or NEW.description is distinct from OLD.description then
      v_event := 'revised';
    else
      v_event := 'updated';
    end if;
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
  end if;

  insert into task_events (task_id, job_id, event_type, old_value, new_value, created_by)
  values (NEW.id, NEW.job_id, v_event, v_old, v_new, coalesce(NEW.description, 'system'));
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_tasks_audit on tasks;
create trigger trg_tasks_audit
  after insert or update on tasks
  for each row execute function fn_log_task_event();

-- =========================
-- View: snapshot progres per-job (buat chat response cepat)
-- =========================
create or replace view v_job_progress as
select
  j.id                                                   as job_id,
  j.name                                                 as job_name,
  j.assignee                                             as assignee,
  count(t.*) filter (where t.deleted_at is null)         as total_tasks,
  count(t.*) filter (where t.status = 'done' and t.deleted_at is null) as done_tasks,
  count(t.*) filter (where t.status = 'in_progress' and t.deleted_at is null) as in_progress_tasks,
  count(t.*) filter (where t.status = 'pending' and t.deleted_at is null) as pending_tasks,
  round(
    (count(t.*) filter (where t.status = 'done' and t.deleted_at is null))::numeric
    / nullif(count(t.*) filter (where t.deleted_at is null), 0) * 100
  , 1) as percent_done
from jobs j
left join tasks t on t.job_id = j.id
group by j.id, j.name, j.assignee;

-- =========================
-- RLS (wajib — pattern project datadomain)
-- Policy awal: anon read-only, service role full access.
-- Ubah sesuai kebutuhan admin panel nanti.
-- =========================
alter table jobs        enable row level security;
alter table tasks       enable row level security;
alter table task_events enable row level security;

drop policy if exists "anon read jobs"        on jobs;
drop policy if exists "anon read tasks"       on tasks;
drop policy if exists "anon read task_events" on task_events;

create policy "anon read jobs"        on jobs        for select using (true);
create policy "anon read tasks"       on tasks       for select using (true);
create policy "anon read task_events" on task_events for select using (true);
