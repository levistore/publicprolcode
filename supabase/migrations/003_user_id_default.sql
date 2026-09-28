-- ============================================================
-- ClassHub — perbaikan: user_id otomatis saat insert
--
-- MASALAH (ditemukan saat uji production 2026-09-28):
-- Aplikasi melakukan insert ke tabel tanpa menyertakan kolom
-- user_id (mis. POST /rest/v1/tasks dengan body berisi
-- status, priority, title, description, subject_id, deadline).
-- Policy RLS-nya adalah:
--
--     create policy ... for insert with check (auth.uid() = user_id)
--
-- Tanpa user_id, nilainya NULL, sehingga auth.uid() = NULL
-- bernilai NULL (bukan true) -> insert ditolak dengan pesan
--     new row violates row-level security policy for table "tasks"
-- Padahal user sudah login dengan benar.
--
-- SOLUSI:
-- Isi user_id otomatis dari auth.uid() di level database.
-- Ini TETAP AMAN: policy with check masih berlaku, dan nilai
-- default-nya adalah identitas user yang sedang login —
-- bukan nilai yang dikirim klien, jadi klien tidak bisa
-- memalsukan user_id milik orang lain.
--
-- Aman dijalankan berulang kali.
-- ============================================================

alter table public.tasks     alter column user_id set default auth.uid();
alter table public.subjects  alter column user_id set default auth.uid();
alter table public.reminders alter column user_id set default auth.uid();
alter table public.events    alter column user_id set default auth.uid();
alter table public.notes     alter column user_id set default auth.uid();
alter table public.files     alter column user_id set default auth.uid();
alter table public.schedules alter column user_id set default auth.uid();
alter table public.activities alter column user_id set default auth.uid();
