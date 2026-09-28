/**
 * ClassHub — unit test aturan penjadwal notifikasi reminder.
 * Mengimpor logika murni dari src/lib/reminder-rules.ts.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { LEAD_MS, LATE_GRACE_MS, shouldFire, bodyFor } from '../src/lib/reminder-rules.ts'

const at = (ms) => new Date(ms).toISOString()
const HOUR = 60 * 60_000
const DAY = 24 * HOUR

const reminder = (o = {}) => ({
  reminder_at: at(Date.now() + 60_000),
  repeat_type: 'none',
  is_completed: false,
  description: null,
  ...o,
})

/* ------------------------------- Konstanta ------------------------------- */

test('konstanta scheduler masuk akal', () => {
  assert.equal(LEAD_MS, 5 * 60_000, 'ingatkan 5 menit sebelumnya')
  assert.equal(LATE_GRACE_MS, HOUR, 'grace 1 jam')
})

/* ---------------------------- Reminder sekali ---------------------------- */

test('reminder yang masih jauh belum berbunyi', () => {
  const now = Date.now()
  assert.equal(shouldFire(reminder({ reminder_at: at(now + HOUR) }), now), false)
})

test('reminder berbunyi saat masuk jendela 5 menit', () => {
  const now = Date.now()
  assert.equal(shouldFire(reminder({ reminder_at: at(now + 2 * 60_000) }), now), true)
})

test('reminder berbunyi tepat pada waktunya', () => {
  const now = Date.now()
  assert.equal(shouldFire(reminder({ reminder_at: at(now) }), now), true)
})

test('reminder sekali tidak berbunyi dua kali', () => {
  const now = Date.now()
  assert.equal(shouldFire(reminder({ reminder_at: at(now) }), now, now - 1000), false)
})

test('reminder sekali yang lewat 1 jam tidak berbunyi', () => {
  const now = Date.now()
  assert.equal(shouldFire(reminder({ reminder_at: at(now - 2 * HOUR) }), now), false)
})

test('reminder sekali yang baru lewat 10 menit masih berbunyi', () => {
  const now = Date.now()
  assert.equal(shouldFire(reminder({ reminder_at: at(now - 10 * 60_000) }), now), true)
})

/* --------------------------- Reminder berulang --------------------------- */

test('reminder harian tetap berbunyi walau tanggalnya sudah lewat', () => {
  const now = Date.now()
  assert.equal(
    shouldFire(reminder({ reminder_at: at(now - 30 * DAY), repeat_type: 'daily' }), now),
    true,
  )
})

test('reminder mingguan tetap berbunyi walau sudah lewat lama', () => {
  const now = Date.now()
  // 91 hari = 13 minggu tepat -> hari dalam minggu SAMA.
  // (Kalau dipakai 90 hari, harinya bergeser, dan memang benar tidak
  //  berbunyi: reminder mingguan hanya untuk hari yang sama.)
  assert.equal(
    shouldFire(reminder({ reminder_at: at(now - 91 * DAY), repeat_type: 'weekly' }), now),
    true,
  )
})

test('reminder mingguan TIDAK berbunyi di hari bergeser walau sudah lewat lama', () => {
  const now = Date.now()
  assert.equal(
    shouldFire(reminder({ reminder_at: at(now - 90 * DAY), repeat_type: 'weekly' }), now),
    false,
  )
})

test('reminder harian tidak spam dalam 20 jam', () => {
  const now = Date.now()
  const r = reminder({ repeat_type: 'daily', reminder_at: at(now) })
  assert.equal(shouldFire(r, now, now - HOUR), false, 'baru 1 jam lalu -> diam')
  assert.equal(shouldFire(r, now, now - 25 * HOUR), true, 'lebih 20 jam -> boleh')
})

/* ------------------------------- Ketahanan ------------------------------- */

test('reminder dengan tanggal rusak tidak berbunyi', () => {
  assert.equal(shouldFire(reminder({ reminder_at: 'bukan-tanggal' }), Date.now()), false)
})

test('reminder harian dengan tanggal rusak tidak berbunyi', () => {
  assert.equal(shouldFire(reminder({ reminder_at: '', repeat_type: 'daily' }), Date.now()), false)
})

/* --------------------------------- bodyFor ------------------------------- */

test('bodyFor menyebut sisa menit', () => {
  const now = Date.now()
  const out = bodyFor({ reminder_at: at(now + 3 * 60_000), description: null }, now)
  assert.match(out, /3 menit lagi/)
})

test('bodyFor menyertakan deskripsi', () => {
  const now = Date.now()
  const out = bodyFor({ reminder_at: at(now + 60_000), description: 'bawa kabel LAN' }, now)
  assert.match(out, /bawa kabel LAN/)
})

test('bodyFor saat sudah waktunya', () => {
  const now = Date.now()
  const out = bodyFor({ reminder_at: at(now - 60_000), description: null }, now)
  assert.equal(out, 'Waktunya sekarang.')
})

test('bodyFor tidak pernah menampilkan "0 menit"', () => {
  const now = Date.now()
  const out = bodyFor({ reminder_at: at(now + 1000), description: null }, now)
  assert.doesNotMatch(out, /0 menit/)
})
