/**
 * ClassHub — unit test lapisan File Vault
 * Fokus pada logika yang menentukan keamanan & kebenaran upload.
 * Jalankan: node --experimental-strip-types --test tests/file-validate.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  MAX_FILE_SIZE,
  ALLOWED_EXTENSIONS,
  extensionOf,
  sanitizeFilename,
  validateFile,
  normalizeCategory,
  fileKindOf,
  formatBytesLabel,
} from '../src/lib/files/validate.ts'

const pdf = (name = 'tugas.pdf', size = 1024, type = 'application/pdf') => ({ name, size, type })

/* ------------------------------ Batas ukuran ------------------------------ */

test('MAX_FILE_SIZE adalah 10 MB', () => {
  assert.equal(MAX_FILE_SIZE, 10 * 1024 * 1024)
})

test('file di bawah batas diterima', () => {
  const r = validateFile(pdf('a.pdf', MAX_FILE_SIZE - 1))
  assert.equal(r.ok, true)
})

test('file tepat di batas diterima', () => {
  const r = validateFile(pdf('a.pdf', MAX_FILE_SIZE))
  assert.equal(r.ok, true)
})

test('file di atas batas ditolak dengan kode too_large', () => {
  const r = validateFile(pdf('a.pdf', MAX_FILE_SIZE + 1))
  assert.equal(r.ok, false)
  assert.equal(r.code, 'too_large')
})

test('file kosong ditolak', () => {
  const r = validateFile(pdf('a.pdf', 0))
  assert.equal(r.ok, false)
  assert.equal(r.code, 'empty')
})

test('file tanpa nama (null) ditolak', () => {
  const r = validateFile(null)
  assert.equal(r.ok, false)
  assert.equal(r.code, 'no_file')
})

/* --------------------------- Ekstensi berbahaya --------------------------- */

test('ekstensi executable ditolak', () => {
  for (const ext of ['exe', 'apk', 'sh', 'bat', 'cmd', 'dll', 'ps1', 'jar', 'msi']) {
    const r = validateFile({ name: `berbahaya.${ext}`, size: 100, type: 'application/octet-stream' })
    assert.equal(r.ok, false, `.${ext} seharusnya ditolak`)
    assert.equal(r.code, 'forbidden_ext')
  }
})

test('tidak ada ekstensi berbahaya yang lolos jadi allowed', () => {
  const forbidden = ['exe', 'apk', 'sh', 'bat', 'cmd', 'dll', 'ps1', 'jar', 'msi']
  for (const ext of forbidden) {
    assert.equal(
      ALLOWED_EXTENSIONS.includes(ext),      false,
      `.${ext} tidak boleh ada di allowlist`,
    )
  }
})

/* ------------------------------ Ekstensi aman ----------------------------- */

test('semua ekstensi yang diwajibkan PRD diterima', () => {
  const required = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'png', 'jpg', 'jpeg', 'webp', 'zip']
  for (const ext of required) {
    assert.equal(
      ALLOWED_EXTENSIONS.includes(ext),      true,
      `.${ext} harus ada di allowlist`,
    )
  }
})

test('ekstensi di luar allowlist ditolak', () => {
  const r = validateFile({ name: 'data.xyz', size: 100, type: 'application/octet-stream' })
  assert.equal(r.ok, false)
  assert.equal(r.code, 'bad_ext')
})

test('file tanpa ekstensi ditolak', () => {
  const r = validateFile({ name: 'tanpaekstensi', size: 100, type: '' })
  assert.equal(r.ok, false)
  assert.equal(r.code, 'bad_ext')
})

/* --------------------- MIME harus cocok dengan ekstensi -------------------- */

test('PDF dengan MIME palsu ditolak (tidak cuma cek ekstensi)', () => {
  const r = validateFile({ name: 'tugas.pdf', size: 100, type: 'application/x-msdownload' })
  assert.equal(r.ok, false)
  assert.equal(r.code, 'mime_mismatch')
})

test('gambar dengan MIME menyimpang ditolak', () => {
  const r = validateFile({ name: 'foto.png', size: 100, type: 'text/html' })
  assert.equal(r.ok, false)
  assert.equal(r.code, 'mime_mismatch')
})

/* ------------------------- Sanitasi nama & traversal ---------------------- */

test('path traversal dibuang dari nama file', () => {
  const out = sanitizeFilename('../../../etc/passwd')
  assert.equal(out.includes('..'), false)
})

test('karakter berbahaya dibuang', () => {
  const out = sanitizeFilename('na:me*"fi?le<>.pdf')
  assert.equal(out.includes(':'), false)
  assert.equal(out.includes('*'), false)
  assert.equal(out.includes('?'), false)
  assert.equal(out.includes('<'), false)
  assert.equal(out.includes('>'), false)
})

test('nama file kosong jatuh ke default', () => {
  assert.equal(sanitizeFilename(''), 'file')
})

test('nama sangat panjang dipotong tapi ekstensi tetap', () => {
  const long = `${'a'.repeat(300)}.pdf`
  const out = sanitizeFilename(long)
  assert.ok(out.length <= 180, `panjang ${out.length} harus <= 180`)
  assert.equal(extensionOf(out), 'pdf')
})

test('ekstensi di-deteksi dengan benar', () => {
  assert.equal(extensionOf('a.PDF'), 'pdf')
  assert.equal(extensionOf('dir/a.b.pdf'), 'pdf')
})

/* ------------------------------ Kategori --------------------------------- */

test('kategori dinormalisasi ke slug lowercase', () => {
  assert.equal(normalizeCategory('Materials'), 'materials')
  assert.equal(normalizeCategory('PRESENTATIONS'), 'presentations')
  assert.equal(normalizeCategory('other'), 'other')
})

test('kategori tidak dikenal jatuh ke other', () => {
  assert.equal(normalizeCategory('sembarang'), 'other')
  assert.equal(normalizeCategory(undefined), 'other')
  assert.equal(normalizeCategory(null), 'other')
})

/* --------------------------------- Lainnya -------------------------------- */

test('fileKindOf memetakan jenis dengan benar', () => {
  assert.equal(fileKindOf('pdf', 'application/pdf'), 'pdf')
  assert.equal(fileKindOf('docx', ''), 'doc')
  assert.equal(fileKindOf('png', 'image/png'), 'image')
  assert.equal(fileKindOf('zip', 'application/zip'), 'archive')
})

test('formatBytesLabel masuk akal', () => {
  assert.equal(formatBytesLabel(0), '0 B')
  assert.equal(formatBytesLabel(1024), '1.0 KB')
  assert.equal(formatBytesLabel(-5), '0 B')
})

test('validasi menghasilkan mime fallback saat browser mengosongkan type', () => {
  const r = validateFile({ name: 'tugas.pdf', size: 100, type: '' })
  assert.equal(r.ok, true)
  if (r.ok) assert.equal(r.mime, 'application/pdf')
})
