/* ============================================================
   ClassHub — aturan kapan sebuah reminder boleh berbunyi
   Dipisahkan dari hook React supaya bisa diuji langsung
   (dan tidak bergantung pada DOM).
   ============================================================ */

/** Ingatkan 5 menit sebelum waktunya. */
export const LEAD_MS = 5 * 60_000
/** Reminder sekali yang sudah lewat lebih dari ini dianggap tidak relevan. */
export const LATE_GRACE_MS = 60 * 60_000
export interface ReminderLike {
  reminder_at: string
  repeat_type: string
  is_completed?: boolean
}

/**
 * Menentukan apakah reminder boleh ditampilkan sekarang.
 *
 * - none   : hanya di jendela [reminder_at - LEAD_MS, reminder_at + LATE_GRACE_MS], sekali.
 * - daily  : berbunyi pada JAM YANG SAMA tiap hari.
 * - weekly : berbunyi pada HARI + JAM YANG SAMA tiap minggu.
 *
 * Reminder berulang memakai kecocokan pola waktu, bukan sekadar cooldown:
 * tanpa ini, reminder harian jam 07:00 akan berbunyi juga jam 23:00.
 * `lastFiredAt` hanya dipakai untuk mencegah dobel pada menit yang sama.
 */
export function shouldFire(
  reminder: ReminderLike,
  now: number,
  lastFiredAt?: number,
): boolean {
  const at = new Date(reminder.reminder_at).getTime()
  if (Number.isNaN(at)) return false

  if (reminder.is_completed) return false

  // Sudah pernah berbunyi untuk kejadian yang sama -> jangan dobel.
  // Urutan argumen: (reminder, waktu sekarang, waktu terakhir berbunyi).
  // Tertukar urutan membuat dedupe membandingkan lastFiredAt dengan
  // reminder_at (tanggal asal), sehingga reminder berulang bisa
  // berbunyi berkali-kali pada hari yang sama.
  if (lastFiredAt && isSameOccurrence(reminder, now, lastFiredAt)) return false

  if (reminder.repeat_type === 'daily') {
    return matchesClock(now, at)
  }

  if (reminder.repeat_type === 'weekly') {
    const nowDate = new Date(now)
    const atDate = new Date(at)
    if (nowDate.getDay() !== atDate.getDay()) return false
    return matchesClock(now, at)
  }

  // Sekali: hanya di jendela waktunya, dan tidak pernah mengulang.
  if (now > at + LATE_GRACE_MS) return false
  if (now < at - LEAD_MS) return false
  return true
}

/** Apakah `now` berada di menit yang sama dengan `at` (toleransi 2 menit). */
function matchesClock(now: number, at: number): boolean {
  const n = new Date(now)
  const a = new Date(at)
  if (n.getHours() !== a.getHours()) return false
  return Math.abs(n.getMinutes() - a.getMinutes()) <= 2
}

/** Apakah `now` dan `firedAt` itu kejadian (occurrence) yang sama. */
function isSameOccurrence(reminder: ReminderLike, now: number, firedAt: number): boolean {
  if (reminder.repeat_type === 'weekly') {
    // Hari dalam minggu yang sama -> kejadian yang sama
    return new Date(now).getDay() === new Date(firedAt).getDay()
  }
  if (reminder.repeat_type === 'daily') {
    // Tanggal kalender yang sama -> kejadian yang sama
    return new Date(now).toDateString() === new Date(firedAt).toDateString()
  }
  // Sekali: kalau sudah pernah berbunyi, selesai selamanya
  return true
}

/** Kalimat pendek untuk badan notifikasi. */
export function bodyFor(reminder: { description?: string | null; reminder_at: string }, now: number): string {
  const at = new Date(reminder.reminder_at).getTime()
  const diff = at - now
  if (diff > 0) {
    const mins = Math.max(1, Math.round(diff / 60_000))
    return `${mins} menit lagi${reminder.description ? ` — ${reminder.description}` : ''}`
  }
  return reminder.description ?? 'Waktunya sekarang.'
}
