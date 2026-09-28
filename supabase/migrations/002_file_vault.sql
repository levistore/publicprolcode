-- ============================================================
-- Migration: File Vault production-ready
-- Jalankan SETELAH supabase/schema.sql di Supabase SQL Editor.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Kategori files: konsisten lowercase (slug).
--    Nilai lama 'Materials' dsb dimigrasikan.
-- ------------------------------------------------------------
alter table public.files
  drop constraint if exists files_category_check;

update public.files
set category = lower(category)
where category <> lower(category);

alter table public.files
  add constraint files_category_check
  check (category in ('materials', 'assignments', 'presentations', 'documents', 'other'));

-- ------------------------------------------------------------
-- 2. Storage: pastikan bucket private.
-- ------------------------------------------------------------
update storage.buckets
set public = false
where id = 'classhub-files';

-- ------------------------------------------------------------
-- 3. Storage policy: path harus diawali {auth.uid()}/...
--    (bucket_id SAJA tidak cukup — folder per user wajib)
--    Pola lama diganti dengan yang memakai first_folder = uid.
-- ------------------------------------------------------------
drop policy if exists "files_read_own" on storage.objects;
drop policy if exists "files_insert_own" on storage.objects;
drop policy if exists "files_update_own" on storage.objects;
drop policy if exists "files_delete_own" on storage.objects;

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
-- 4. Index tambahan untuk query File Vault
-- ------------------------------------------------------------
create index if not exists idx_files_user_created on public.files (user_id, created_at desc);
create index if not exists idx_files_name on public.files (name text_pattern_ops);
