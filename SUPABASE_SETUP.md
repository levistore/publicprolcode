# ClassHub — Setup Supabase (mode cloud)

Ikhtisar langkah untuk mengaktifkan File Vault yang sesungguhnya
(Supabase Storage + database + RLS).

----------------------------------------------------------------
1. BUAT PROJECT
----------------------------------------------------------------
1. Buka https://supabase.com dan login.
2. New project. Pilih region terdekat.
3. Tunggu sampai status "Active".

----------------------------------------------------------------
2. AMBIL KREDENSIAL
----------------------------------------------------------------
Project Settings -> API:
  - Project URL      -> NEXT_PUBLIC_SUPABASE_URL
  - anon / public    -> NEXT_PUBLIC_SUPABASE_ANON_KEY

Lalu:
  cp .env.example .env.local
  # isi dua nilai di atas

HANYA anon key. Service-role key tidak boleh masuk ke env
NEXT_PUBLIC_ karena ikut ter-bundle ke browser.

----------------------------------------------------------------
3. JALANKAN MIGRATION
----------------------------------------------------------------
SQL Editor -> New query. Jalankan BERURUTAN:

  1. supabase/schema.sql
  2. supabase/migrations/002_file_vault.sql

schema.sql membuat tabel profiles, subjects, tasks, reminders,
events, notes, files, schedules + mengaktifkan RLS.
002 membuat constraint kategori, index, dan policy Storage.

----------------------------------------------------------------
4. BUAT BUCKET
----------------------------------------------------------------
Storage -> New bucket:
  - Name: classhub-files
  - Public: OFF  (wajib private)

File Vault memakai signed URL ber-TTL 60 detik, jadi bucket
tidak perlu public.

----------------------------------------------------------------
5. JALANKAN APLIKASI
----------------------------------------------------------------
  npm run dev      # http://localhost:3000

atau production:
  npm run build && npm start

----------------------------------------------------------------
6. VERIFIKASI
----------------------------------------------------------------
- Daftar akun baru di /login.
- Buka Files -> upload PDF & gambar.
- Storage -> classhub-files: objek harus berada di
  {user_id}/{file_id}/{nama-file}.
- Table Editor -> files: satu baris per file, user_id terisi.
- Coba akses file user lain lewat ID: harus 404.

----------------------------------------------------------------
CATATAN MODE LOKAL
----------------------------------------------------------------
Jika env kosong, aplikasi tetap jalan tanpa error:
- Data tersimpan di localStorage browser.
- File Vault menyimpan METADATA SAJA, binary tidak disimpan
  (sesuai aturan: tidak ada binary di localStorage).
- Route /api/files akan membalas 503 "Penyimpanan belum
  dikonfigurasi." — itu normal, bukan bug.
