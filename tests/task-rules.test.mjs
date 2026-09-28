/**
 * ClassHub — unit test aturan notifikasi deadline tugas.
 * Mengimpor logika murni dari src/lib/task-rules.ts.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  TASK_LEAD_MS,
  TASK_LATE_GRACE_MS,
  shouldNotifyTask,
  taskBodyFor,
  markFired,
} from '../src/lib/task-rules.ts'

const HOUR = 60 * 60_000
const DAY = 24 * HOUR
const now = Date.now()

const task = (o = {}) => ({
  title: 'Kumpulkan laporan',
  deadline: new Date(now + 2 * HOUR).toISOString(),
  status: 'todo',
  ...o,
})

/* ------------------------------- Konstanta ------------------------------- */

test('konstanta deadline masuk akal', () => {
  assert.equal(TASK_LEAD_MS, DAY, 'ingatkan 24 jam sebelumnya')
  assert.equal(TASK_LATE_GRACE_MS, 2 * HOUR, 'grace 2 jam setelah lewat')
})

/* ------------------------------ Pemicuan -------------------------------- */

test('tugas jauh dari deadline belum berbunyi', () => {
  assert.equal(shouldNotifyTask(task({ deadline: new Date(now + 3 * DAY).toISOString() }), now), false)
})

test('tugas berbunyi 23 jam sebelum deadline', () => {
  assert.equal(shouldNotifyTask(task({ deadline: new Date(now + 23 * HOUR).toISOString() }), now), true)
})

test('tugas berbunyi tepat pada deadline', () => {
  assert.equal(shouldNotifyTask(task({ deadline: new Date(now).toISOString() }), now), true)
})

test('tugas berbunyi saat deadline lewat 1 jam', () => {
  assert.equal(shouldNotifyTask(task({ deadline: new Date(now - HOUR).toISOString() }), now), true)
})

test('tugas tidak berbunyi setelah deadline lewat 3 jam', () => {
  assert.equal(shouldNotifyTask(task({ deadline: new Date(now - 3 * HOUR).toISOString() }), now), false)
})

test('tugas tanpa deadline tidak berbunyi', () => {
  assert.equal(shouldNotifyTask(task({ deadline: null }), now), false)
})

test('tugas selesai tidak berbunyi', () => {
  assert.equal(shouldNotifyTask(task({ status: 'completed' }), now), false)
})

test('deadline rusak tidak berbunyi', () => {
  assert.equal(shouldNotifyTask(task({ deadline: 'bukan-tanggal' }), now), false)
})

/* ------------------------------ Dedupe ---------------------------------- */

test('tidak dobel untuk deadline yang sama', () => {
  const t = task()
  const fired = markFired(t, now)
  assert.equal(shouldNotifyTask(t, now, fired), false)
})

test('boleh berbunyi lagi untuk deadline baru', () => {
  const t = task()
  const firedLama = markFired({ ...t, deadline: new Date(now + 3 * DAY).toISOString() }, now)
  assert.equal(shouldNotifyTask(t, now, firedLama), true)
})

/* ------------------------------ taskBodyFor ------------------------------ */

test('bodyFor menyebut sisa jam', () => {
  const out = taskBodyFor(task({ deadline: new Date(now + 3 * HOUR).toISOString() }), now)
  assert.match(out, /3 jam/)
})

test('bodyFor menyebut sisa jam + menit', () => {
  const out = taskBodyFor(task({ deadline: new Date(now + 90 * 60_000).toISOString() }), now)
  assert.match(out, /1 jam\s+30 menit\./)
})

test('bodyFor menyebut sisa menit', () => {
  const out = taskBodyFor(task({ deadline: new Date(now + 30 * 60_000).toISOString() }), now)
  assert.match(out, /30 menit/)
})

test('bodyFor saat deadline baru lewat', () => {
  const out = taskBodyFor(task({ deadline: new Date(now - 30 * 60_000).toISOString() }), now)
  assert.match(out, /segera kerjakan/)
})

test('bodyFor saat deadline jauh terlewat', () => {
  const out = taskBodyFor(task({ deadline: new Date(now - 2 * HOUR).toISOString() }), now)
  assert.match(out, /terlewat/)
})

test('bodyFor tanpa deadline tidak crash', () => {
  assert.equal(taskBodyFor(task({ deadline: null }), now), 'Punya deadline terkait.')
})
