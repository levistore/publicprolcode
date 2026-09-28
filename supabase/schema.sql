-- ============================================================
-- ClassHub — Supabase schema + Row Level Security
-- Jalankan di Supabase SQL Editor.
-- ============================================================

-- ------------------------------------------------------------
-- PROFILES (1:1 dengan auth.users)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid () = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid () = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid () = id) with check (auth.uid () = id);

-- Auto-create profile saat user mendaftar
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- SUBJECTS
-- ------------------------------------------------------------
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  teacher text,
  room text,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_subjects_user on public.subjects (user_id);

-- ------------------------------------------------------------
-- TASKS
-- ------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  subject_id uuid references public.subjects (id) on delete set null,
  deadline timestamptz,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'completed')),
  attachment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_tasks_user on public.tasks (user_id);
create index if not exists idx_tasks_user_deadline on public.tasks (user_id, deadline);
create index if not exists idx_tasks_subject on public.tasks (subject_id);

-- ------------------------------------------------------------
-- REMINDERS
-- ------------------------------------------------------------
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  reminder_at timestamptz not null,
  repeat_type text not null default 'none' check (repeat_type in ('none', 'daily', 'weekly')),
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_reminders_user on public.reminders (user_id);
create index if not exists idx_reminders_user_time on public.reminders (user_id, reminder_at);

-- ------------------------------------------------------------
-- EVENTS
-- ------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_events_user on public.events (user_id);
create index if not exists idx_events_user_start on public.events (user_id, start_at);

-- ------------------------------------------------------------
-- NOTES
-- ------------------------------------------------------------
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  content text not null default '',
  subject_id uuid references public.subjects (id) on delete set null,
  category text,
  is_pinned boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_notes_user on public.notes (user_id);
create index if not exists idx_notes_subject on public.notes (subject_id);

-- ------------------------------------------------------------
-- FILES (metadata; binary di Supabase Storage bucket 'classhub-files')
-- ------------------------------------------------------------
create table if not exists public.files (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  storage_path text not null,
  mime_type text,
  size bigint not null default 0,
  subject_id uuid references public.subjects (id) on delete set null,
  category text not null default 'Other' check (category in ('Materials', 'Assignments', 'Presentations', 'Documents', 'Other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_files_user on public.files (user_id);
create index if not exists idx_files_subject on public.files (subject_id);

-- ------------------------------------------------------------
-- SCHEDULES (jadwal pelajaran mingguan)
-- ------------------------------------------------------------
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete cascade,
  day_of_week text not null check (day_of_week in ('sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat')),
  start_time time not null,
  end_time time not null,
  room text,
  teacher text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_schedules_user on public.schedules (user_id);
create index if not exists idx_schedules_subject on public.schedules (subject_id);

-- ------------------------------------------------------------
-- ACTIVITIES (recent activity feed)
-- ------------------------------------------------------------
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  entity_label text,
  created_at timestamptz not null default now()
);
create index if not exists idx_activities_user on public.activities (user_id, created_at desc);

-- ------------------------------------------------------------
-- RLS: aktifkan + policy seragam "user hanya akses data miliknya"
-- ------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['subjects', 'tasks', 'reminders', 'events', 'notes', 'files', 'schedules', 'activities']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_select_own on public.%I', t, t);
    execute format('drop policy if exists %I_insert_own on public.%I', t, t);
    execute format('drop policy if exists %I_update_own on public.%I', t, t);
    execute format('drop policy if exists %I_delete_own on public.%I', t, t);
    execute format('create policy %I_select_own on public.%I for select using (auth.uid () = user_id)', t, t);
    execute format('create policy %I_insert_own on public.%I for insert with check (auth.uid () = user_id)', t, t);
    execute format('create policy %I_update_own on public.%I for update using (auth.uid () = user_id) with check (auth.uid () = user_id)', t, t);
    execute format('create policy %I_delete_own on public.%I for delete using (auth.uid () = user_id)', t, t);
  end loop;
end
$$;

-- ------------------------------------------------------------
-- STORAGE: bucket + policy terisolasi per user
-- ------------------------------------------------------------
-- Bucket dibuat PRIVATE. File Vault memakai signed URL (TTL 60s),
-- jadi bucket tidak perlu dan tidak boleh public.
insert into storage.buckets (id, name, public)
values ('classhub-files', 'classhub-files', false)
on conflict (id) do update set public = false;

-- Path konvensi: {user_id}/{file_id}/{filename}
-- Folder PERTAMA harus uid user. Pengecekan bucket_id saja TIDAK
-- cukup — tanpa cek folder, satu user bisa mengakses objek user lain.
drop policy if exists "files_read_own" on storage.objects;
drop policy if exists "files_insert_own" on storage.objects;
drop policy if exists "files_update_own" on storage.objects;
drop policy if exists "files_delete_own" on storage.objects;
drop policy if exists "classhub_files_select_own" on storage.objects;
drop policy if exists "classhub_files_insert_own" on storage.objects;
drop policy if exists "classhub_files_update_own" on storage.objects;
drop policy if exists "classhub_files_delete_own" on storage.objects;

create policy "classhub_files_select_own" on storage.objects
  for select using (
    bucket_id = 'classhub-files'
    and auth.uid () is not null
    and (storage.foldername (name))[1] = auth.uid ()::text
  );

create policy "classhub_files_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'classhub-files'
    and auth.uid () is not null
    and (storage.foldername (name))[1] = auth.uid ()::text
  );

create policy "classhub_files_update_own" on storage.objects
  for update using (
    bucket_id = 'classhub-files'
    and auth.uid () is not null
    and (storage.foldername (name))[1] = auth.uid ()::text
  );

create policy "classhub_files_delete_own" on storage.objects
  for delete using (
    bucket_id = 'classhub-files'
    and auth.uid () is not null
    and (storage.foldername (name))[1] = auth.uid ()::text
  );

-- ------------------------------------------------------------
-- updated_at otomatis
-- ------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['subjects', 'tasks', 'reminders', 'events', 'notes', 'files', 'schedules', 'profiles']
  loop
    execute format('drop trigger if exists %I_touch on public.%I', t, t);
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_at()', t, t);
  end loop;
end
$$;
