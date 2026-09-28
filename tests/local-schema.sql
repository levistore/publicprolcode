-- ============================================================
-- ClassHub — schema untuk Postgres polos (uji lokal NON-Supabase)
--
-- Supabase menyediakan schema auth + storage secara bawaan.
-- Postgres polos tidak punya keduanya, jadi file ini membuat
-- versi minimal agar seluruh RLS & policy Storage bisa DIUJI
-- secara nyata, bukan hanya dibaca.
--
-- File produksi tetap supabase/schema.sql + migrations/002_file_vault.sql.
-- File ini hanya untuk pembuktian lokal.
-- ============================================================

create schema if not exists auth;
create schema if not exists storage;

-- --------------------------- auth minimal ----------------------------
create table if not exists auth.users (
  id uuid primary key,
  email text unique,
  created_at timestamptz not null default now()
);

-- Fungsi pengganti auth.uid(): dibaca dari setting sesi.
create or replace function auth.uid () returns uuid
language sql stable as $$
  select nullif (current_setting ('request.jwt.claim.sub', true), '')::uuid
$$;

-- ------------------------- storage minimal ---------------------------
create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid (),
  bucket_id text references storage.buckets (id) on delete cascade,
  name text not null,
  owner uuid,
  created_at timestamptz not null default now(),
  metadata jsonb
);

create or replace function storage.foldername (name text) returns text []
language sql immutable as $$
  select string_to_array (name, '/')
$$;

alter table storage.objects enable row level security;

-- ---------------------------- tabel aplikasi -------------------------
create table if not exists public.profiles (
  id uuid primary key,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null,
  name text not null,
  teacher text,
  room text,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null,
  name text not null,
  storage_path text not null,
  mime_type text,
  size bigint not null default 0,
  subject_id uuid,
  category text not null default 'other'
    check (category in ('materials','assignments','presentations','documents','other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_files_user_created on public.files (user_id, created_at desc);
create index if not exists idx_files_name on public.files (name text_pattern_ops);

-- -------------------------------- RLS --------------------------------
alter table public.files enable row level security;
alter table public.subjects enable row level security;
alter table public.profiles enable row level security;

drop policy if exists files_select_own on public.files;
drop policy if exists files_insert_own on public.files;
drop policy if exists files_update_own on public.files;
drop policy if exists files_delete_own on public.files;

create policy files_select_own on public.files
  for select using (auth.uid () = user_id);
create policy files_insert_own on public.files
  for insert with check (auth.uid () = user_id);
create policy files_update_own on public.files
  for update using (auth.uid () = user_id) with check (auth.uid () = user_id);
create policy files_delete_own on public.files
  for delete using (auth.uid () = user_id);

drop policy if exists subjects_select_own on public.subjects;
create policy subjects_select_own on public.subjects
  for select using (auth.uid () = user_id);
drop policy if exists subjects_insert_own on public.subjects;
create policy subjects_insert_own on public.subjects
  for insert with check (auth.uid () = user_id);

-- ------------------------- storage: bucket ---------------------------
insert into storage.buckets (id, name, public)
values ('classhub-files', 'classhub-files', false)
on conflict (id) do update set public = false;

drop policy if exists classhub_files_select_own on storage.objects;
drop policy if exists classhub_files_insert_own on storage.objects;
drop policy if exists classhub_files_update_own on storage.objects;
drop policy if exists classhub_files_delete_own on storage.objects;

create policy classhub_files_select_own on storage.objects
  for select using (
    bucket_id = 'classhub-files'
    and auth.uid () is not null
    and (storage.foldername (name))[1] = auth.uid ()::text
  );

create policy classhub_files_insert_own on storage.objects
  for insert with check (
    bucket_id = 'classhub-files'
    and auth.uid () is not null
    and (storage.foldername (name))[1] = auth.uid ()::text
  );

create policy classhub_files_update_own on storage.objects
  for update using (
    bucket_id = 'classhub-files'
    and auth.uid () is not null
    and (storage.foldername (name))[1] = auth.uid ()::text
  );

create policy classhub_files_delete_own on storage.objects
  for delete using (
    bucket_id = 'classhub-files'
    and auth.uid () is not null
    and (storage.foldername (name))[1] = auth.uid ()::text
  );
