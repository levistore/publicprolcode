import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import {
  MAX_FILE_SIZE,
  extensionOf,
  fileKindOf,
  normalizeCategory,
  sanitizeFilename,
  validateFile,
} from '@/lib/files/validate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET = 'classhub-files'
const SIGNED_URL_TTL_SECONDS = 60

function fail(status: number, message: string) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * POST /api/files
 * Body: multipart/form-data { file, category, subject_id }
 *
 * Keamanan:
 * - user_id diambil dari session (auth.uid), BUKAN dari request body.
 * - Validasi dilakukan ulang di server meski client sudah memvalidasi.
 * - Jika insert metadata gagal, object di Storage dibersihkan (no orphan).
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase()
  if (!supabase) return fail(503, 'Penyimpanan belum dikonfigurasi.')

  const { data: authData, error: authError } = await supabase.auth.getUser()
  const user = authData?.user
  if (authError || !user) return fail(401, 'Sesi berakhir. Silakan masuk kembali.')

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return fail(400, 'Format permintaan tidak valid.')
  }

  const file = formData.get('file')
  if (!(file instanceof File)) return fail(400, 'Tidak ada file yang dikirim.')

  const category = normalizeCategory(formData.get('category'))
  const rawSubject = formData.get('subject_id')
  const subjectId =
    typeof rawSubject === 'string' && rawSubject.trim() !== '' ? rawSubject.trim() : null

  const check = validateFile({ name: file.name, size: file.size, type: file.type }, MAX_FILE_SIZE)
  if (!check.ok) return fail(400, check.message)

  // Jika subject diisi, pastikan milik user (mencegah FK ke data orang lain)
  if (subjectId) {
    const { data: subj, error: subjErr } = await supabase
      .from('subjects')
      .select('id')
      .eq('id', subjectId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (subjErr || !subj) return fail(400, 'Mata pelajaran tidak valid.')
  }

  const fileId = crypto.randomUUID()
  const safeName = sanitizeFilename(file.name)
  const storagePath = `${user.id}/${fileId}/${safeName}`

  // 1. Upload ke Storage (path diawali user id -> storage policy mengunci)
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { cacheControl: '3600', upsert: false, contentType: check.mime })

  if (uploadError) {
    return fail(400, 'Unggahan gagal. Silakan coba lagi.')
  }

  // 2. Insert metadata. Kalau gagal -> hapus object supaya tidak jadi orphan.
  const { data: row, error: insertError } = await supabase
    .from('files')
    .insert({
      user_id: user.id,
      name: check.name,
      storage_path: storagePath,
      mime_type: check.mime,
      size: file.size,
      subject_id: subjectId,
      category,
    })
    .select()
    .single()

  if (insertError || !row) {
    await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => undefined)
    return fail(500, 'Gagal menyimpan informasi file. Unggahan dibatalkan.')
  }

  return NextResponse.json({ file: row }, { status: 201 })
}

/**
 * GET /api/files?id=<file_id>
 * Signed URL singkat (60 detik) untuk file milik user sendiri.
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase()
  if (!supabase) return fail(503, 'Penyimpanan belum dikonfigurasi.')

  const { data: authData } = await supabase.auth.getUser()
  const user = authData?.user
  if (!user) return fail(401, 'Sesi berakhir. Silakan masuk kembali.')

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return fail(400, 'ID file tidak diberikan.')

  const { data: row, error } = await supabase
    .from('files')
    .select('id, storage_path, name')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !row) return fail(404, 'File tidak ditemukan.')

  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS)

  if (signErr || !signed?.signedUrl) {
    return fail(500, 'Tautan unduhan tidak dapat dibuat.')
  }

  return NextResponse.json({ url: signed.signedUrl, name: row.name })
}

/**
 * DELETE /api/files?id=<file_id>
 * Hapus object Storage lalu metadata. RLS + filter user_id mencegah
 * penghapusan file milik user lain.
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabase()
  if (!supabase) return fail(503, 'Penyimpanan belum dikonfigurasi.')

  const { data: authData } = await supabase.auth.getUser()
  const user = authData?.user
  if (!user) return fail(401, 'Sesi berakhir. Silakan masuk kembali.')

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return fail(400, 'ID file tidak diberikan.')

  const { data: row, error } = await supabase
    .from('files')
    .select('id, storage_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !row) return fail(404, 'File tidak ditemukan.')

  const { error: storageErr } = await supabase.storage.from(BUCKET).remove([row.storage_path])
  if (storageErr) {
    return fail(500, 'Gagal menghapus berkas. Silakan coba lagi.')
  }

  const { error: deleteErr } = await supabase
    .from('files')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (deleteErr) {
    return fail(500, 'Berkas terhapus tetapi metadata gagal dihapus.')
  }

  return NextResponse.json({ ok: true })
}
