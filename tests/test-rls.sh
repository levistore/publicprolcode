#!/usr/bin/env bash
# ============================================================
# ClassHub — Uji RLS Database + Storage secara nyata
#
# Menjalankan Postgres di Docker, menerapkan schema, lalu
# membuktikan dengan DUA USER BERBEDA bahwa:
#   - user tidak bisa membaca file milik user lain
#   - user tidak bisa menulis/mengubah/menghapus milik user lain
#   - user tidak bisa upload ke folder Storage user lain
#   - anonim tidak melihat apa pun
#
# CATATAN PENTING: pengujian memakai role BUKAN superuser.
# Superuser Postgres melewati RLS, jadi kalau diuji sebagai
# `postgres` hasilnya akan terlihat BOCOR padahal tidak.
#
# Pakai:  bash tests/test-rls.sh
# ============================================================
set -euo pipefail

CONTAINER="${CONTAINER:-ch_pg}"
HERE="$(cd "$(dirname "$0")" && pwd)"

A='11111111-1111-1111-1111-111111111111'
B='22222222-2222-2222-2222-222222222222'

pass=0; fail=0
ok()   { echo "  ✓ $1"; pass=$((pass+1)); }
bad()  { echo "  ✗ $1"; fail=$((fail+1)); }
check(){ if [ "$2" = "$3" ]; then ok "$1 ($2)"; else bad "$1 (harap $3, dapat $2)"; fi; }

psql_q() { sudo -n docker exec -i "$CONTAINER" psql -U postgres -t -A "$@"; }

echo "▸ Menyiapkan Postgres ($CONTAINER)"
# Selalu mulai dari container BERSIH supaya seed tidak menumpuk
# dan hasil bisa diulang identik.
sudo -n docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
if ! sudo -n docker image inspect postgres:16-alpine >/dev/null 2>&1; then
  sudo -n docker pull postgres:16-alpine >/dev/null
fi
sudo -n docker run -d --name "$CONTAINER" \
  -e POSTGRES_PASSWORD=chpass_dev -e POSTGRES_DB=postgres \
  -p 5432:5432 postgres:16-alpine >/dev/null
for _ in $(seq 1 40); do
  sudo -n docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1 && break
  sleep 1
done
sudo -n docker exec "$CONTAINER" pg_isready -U postgres >/dev/null || { echo "Postgres tidak siap"; exit 1; }

echo "▸ Menerapkan schema"
psql_q -v ON_ERROR_STOP=1 -f - < "$HERE/local-schema.sql" >/dev/null

psql_q -v ON_ERROR_STOP=1 >/dev/null <<SQL
insert into auth.users (id,email) values ('$A','a@test.com'),('$B','b@test.com')
  on conflict (id) do nothing;

-- Bersihkan grant lama dulu (kalau role sudah ada), supaya skrip
-- bisa dijalankan berulang kali tanpa error.
do \$\$
begin
  if exists (select 1 from pg_roles where rolname = 'ch_app') then
    revoke all on all tables in schema public from ch_app;
    revoke all on all tables in schema storage from ch_app;
    revoke all on all sequences in schema public from ch_app;
    revoke all on schema auth, storage, public from ch_app;
    drop owned by ch_app;
    drop role ch_app;
  end if;
end \$\$;

create role ch_app nologin;
grant usage on schema auth, storage, public to ch_app;
grant select, insert, update, delete on all tables in schema public to ch_app;
grant select, insert, update, delete on all tables in schema storage to ch_app;
grant select on auth.users to ch_app;

set role ch_app;
set request.jwt.claim.sub = '$A';
insert into public.files (user_id,name,storage_path,mime_type,size,category)
values ('$A','tugas-A.pdf','$A/f1/tugas-A.pdf','application/pdf',2048,'assignments');
set request.jwt.claim.sub = '$B';
insert into public.files (user_id,name,storage_path,mime_type,size,category)
values ('$B','rahasia-B.pdf','$B/f2/rahasia-B.pdf','application/pdf',4096,'materials');
SQL

echo "▸ Uji isolasi DATABASE"
r() { psql_q -c "set role ch_app; set request.jwt.claim.sub='$1'; $2" | tail -1 | tr -d ' '; }
check "User A hanya lihat 1 file"        "$(r "$A" 'select count(*) from public.files;')" "1"
check "User B hanya lihat 1 file"        "$(r "$B" 'select count(*) from public.files;')" "1"
check "Anonim lihat 0 file"              "$(r ""   'select count(*) from public.files;')" "0"
check "A tidak bisa UPDATE milik B"      "$(r "$A" "update public.files set name='x' where user_id='$B';" >/dev/null; psql_q -c "set role ch_app; set request.jwt.claim.sub='$A'; update public.files set name='bajak' where user_id='$B';" | grep -oP 'UPDATE \K[0-9]+')" "0"
check "A tidak bisa DELETE milik B"      "$(psql_q -c "set role ch_app; set request.jwt.claim.sub='$A'; delete from public.files where user_id='$B';" | grep -oP 'DELETE \K[0-9]+')" "0"

INS=$(psql_q -c "set role ch_app; set request.jwt.claim.sub='$A'; insert into public.files (user_id,name,storage_path,size,category) values ('$B','nyusup','x/y',1,'other');" 2>&1 || true)
if echo "$INS" | grep -qi 'row-level security\|violates'; then ok "A tidak bisa INSERT atas nama B"; else bad "A bisa INSERT atas nama B"; fi

echo "▸ Uji isolasi STORAGE"
psql_q -v ON_ERROR_STOP=1 >/dev/null <<SQL
set role ch_app;
set request.jwt.claim.sub = '$A';
insert into storage.objects (bucket_id,name,owner)
values ('classhub-files','$A/f1/tugas-A.pdf','$A');
SQL
check "A hanya lihat 1 objek"            "$(r "$A" 'select count(*) from storage.objects;')" "1"
check "A tidak bisa DELETE objek B"      "$(psql_q -c "set role ch_app; set request.jwt.claim.sub='$A'; delete from storage.objects where name like '$B%';" | grep -oP 'DELETE \K[0-9]+')" "0"

SU=$(psql_q -c "set role ch_app; set request.jwt.claim.sub='$A'; insert into storage.objects (bucket_id,name,owner) values ('classhub-files','$B/f9/nyusup.pdf','$A');" 2>&1 || true)
if echo "$SU" | grep -qi 'row-level security\|violates'; then ok "A tidak bisa upload ke folder B"; else bad "A bisa upload ke folder B"; fi

echo
echo "──────────────────────────────"
echo "  LULUS: $pass   GAGAL: $fail"
echo "──────────────────────────────"
[ "$fail" -eq 0 ] || exit 1
