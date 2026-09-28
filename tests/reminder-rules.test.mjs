/**
 * ClassHub — uji aturan kapan reminder boleh berbunyi.
 * Ini inti dari scheduler: kalau aturan salah, notifikasi
 * meleset atau malah spam.
 *
 * Jalankan: node --experimental-strip-types --test tests/*.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  LEAD_MS,
  LATE_GRACE_MS,
  shouldFire,
  bodyFor,
} from '../src/lib/reminder-rules.ts'

const MIN = 60_000

/** Reminder sekali pada menit ke-0 (epoch acuan). */
const once = (atMs) => ({ reminder_at: new Date(atMs).toISOString(), repeat_type: 'none', is_completed: false })

/* --------------------------- Konstanta dasar --------------------------- */

test('LEAD_MS adalah 5 menit', () => {
  assert.equal(LEAD_MS, 5 * MIN)
})

test('LATE_GRACE_MS adalah 60 menit', () => {
  assert.equal(LATE_GRACE_MS, 60 * MIN)
})

/* ------------------------------ Reminder sekali ------------------------------ */

test('sekali: tidak berbunyi terlalu cepat (jauh sebelum waktunya)', () => {
  const at = 1_000_000_000_000
  assert.equal(shouldFire(once(at), at - 60 * MIN), false)
})

test('sekali: berbunyi tepat pada waktunya', () => {
  const at = 1_000_000_000_000
  assert.equal(shouldFire(once(at), at), true)
})

test('sekali: berbunyi di dalam jendela lead 5 menit', () => {
  const at = 1_000_000_000_000
  assert.equal(shouldFire(once(at), at - 4 * MIN), true)
})

test('sekali: masih berbunyi setelah lewat (dalam grace)', () => {
  const at = 1_000_000_000_000
  assert.equal(shouldFire(once(at), at + 30 * MIN), true)
})

test('sekali: tidak berbunyi jika sudah lewat grace 60 menit', () => {
  const at = 1_000_000_000_000
  assert.equal(shouldFire(once(at), at + 61 * MIN), false)
})

test('sekali: tidak berbunyi dua kali (sudah pernah fired)', () => {
  const at = 1_000_000_000_000
  assert.equal(shouldFire(once(at), at + MIN, at), false)
})

/* --------------------------------- Selesai --------------------------------- */

test('reminder yang sudah selesai tidak pernah berbunyi', () => {
  const at = 1_000_000_000_000
  const r = { ...once(at), is_completed: true }
  assert.equal(shouldFire(r, at), false)
})

/* --------------------------------- Harian --------------------------------- */

test('harian: berbunyi pada jam yang sama hari berikutnya', () => {
  const at = new Date('2026-09-28T07:00:00').getTime()
  const nextDay = new Date('2026-09-29T07:00:00').getTime()
  const r = { reminder_at: new Date(at).toISOString(), repeat_type: 'daily', is_completed: false }
  assert.equal(shouldFire(r, nextDay), true)
})

test('harian: TIDAK berbunyi pada jam berbeda di hari yang sama', () => {
  const at = new Date('2026-09-28T07:00:00').getTime()
  const sameDayLate = new Date('2026-09-28T23:00:00').getTime()
  const r = { reminder_at: new Date(at).toISOString(), repeat_type: 'daily', is_completed: false }
  assert.equal(shouldFire(r, sameDayLate), false)
})

test('harian: tidak dobel di hari yang sama', () => {
  const at = new Date('2026-09-29T07:00:00').getTime()
  const r = { reminder_at: new Date('2026-09-28T07:00:00').toISOString(), repeat_type: 'daily', is_completed: false }
  assert.equal(shouldFire(r, at, at), false)
})

/* --------------------------------- Mingguan -------------------------------- */

test('mingguan: berbunyi pada hari+jam yang sama minggu depan', () => {
  const at = new Date('2026-09-28T07:00:00').getTime()      // Senin
  const nextWeek = new Date('2026-10-05T07:00:00').getTime() // Senin
  const r = { reminder_at: new Date(at).toISOString(), repeat_type: 'weekly', is_completed: false }
  assert.equal(shouldFire(r, nextWeek), true)
})

test('mingguan: TIDAK berbunyi pada hari berbeda walau jam sama', () => {
  const at = new Date('2026-09-28T07:00:00').getTime()    // Senin
  const tuesday = new Date('2026-09-29T07:00:00').getTime() // Selasa
  const r = { reminder_at: new Date(at).toISOString(), repeat_type: 'weekly', is_completed: false }
  assert.equal(shouldFire(r, tuesday), false)
})

/* ------------------------------- Data rusak ------------------------------- */

test('reminder_at tidak valid tidak pernah berbunyi', () => {
  const r = { reminder_at: 'bukan-tanggal', repeat_type: 'none', is_completed: false }
  assert.equal(shouldFire(r, Date.now()), false)
})

/* --------------------------------- bodyFor -------------------------------- */

test('bodyFor menampilkan hitung mundur saat belum waktunya', () => {
  const at = new Date(Date.now() + 10 * MIN).toISOString()
  const body = bodyFor({ reminder_at: at }, Date.now())
  assert.match(body, /menit lagi/)
})

test('bodyFor memakai deskripsi saat sudah waktunya', () => {
  const at = new Date(Date.now() - MIN).toISOString()
  assert.equal(bodyFor({ reminder_at: at, description: 'Bawa laporan' }, Date.now()), 'Bawa laporan')
})

test('bodyFor punya fallback saat tanpa deskripsi', () => {
  const at = new Date(Date.now() - MIN).toISOString()
  assert.equal(bodyFor({ reminder_at: at }, Date.now()), 'Waktunya sekarang.')
})
