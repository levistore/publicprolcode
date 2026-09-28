/* ============================================================
   ClassHub — aturan notifikasi deadline tugas.

   Dipisahkan dari hook React supaya bisa diuji langsung dengan
   node:test tanpa DOM, sama seperti reminder-rules.ts.

   Sumber masalah (PRD Problem 2 — Missed Deadlines):
   user sering tahu deadline tetapi lupa mengerjakannya.
   ============================================================ */

/** Tugas diingatkan 24 jam sebelum deadline. */
export const TASK_LEAD_MS = 24 * 60 * 60_000
/** Setelah deadline lewat lebih dari 2 jam, tidak ada gunanya lagi mengingatkan. */
export const TASK_LATE_GRACE_MS = 2 * 60 * 60_000

export interface TaskLike {
  id?: string
  title: string
  deadline: string | null
  status: string
}

/**
 * Apakah tugas ini perlu dinotifikasikan sekarang?
 *
 * - hanya tugas yang belum selesai
 * - hanya tugas yang punya deadline
 * - jendela: [deadline - 24 jam, deadline + 2 jam]
 * - `firedAt` mencegah dobel untuk deadline yang sama
 */
export function shouldNotifyTask(task: TaskLike, now: number, firedAt?: number): boolean {
  if (task.status === 'completed') return false
  if (!task.deadline) return false

  const at = new Date(task.deadline).getTime()
  if (Number.isNaN(at)) return false

  // Sudah pernah berbunyi untuk deadline yang sama -> diam.
  if (firedAt !== undefined && firedAt === deadlineKey(at)) return false

  return now >= at - TASK_LEAD_MS && now <= at + TASK_LATE_GRACE_MS
}

/** Kunci per-deadline (bukan per-tick) supaya tugas yang diedit tidak dobel. */
export function deadlineKey(deadlineMs: number): number {
  return deadlineMs
}

/** Timestamp untuk disimpan sebagai penanda "sudah berbunyi". */
export function markFired(task: TaskLike, now: number): number {
  const at = task.deadline ? new Date(task.deadline).getTime() : NaN
  return Number.isNaN(at) ? now : deadlineKey(at)
}

/** Kalimat pendek untuk badan notifikasi tugas. */
export function taskBodyFor(task: TaskLike, now: number): string {
  const at = task.deadline ? new Date(task.deadline).getTime() : NaN
  if (Number.isNaN(at)) return 'Punya deadline terkait.'

  const diff = at - now
  if (diff > 0) {
    const hours = diff / 60 / 60_000
    if (hours >= 1) {
      const h = Math.floor(hours)
      const m = Math.round((hours - h) * 60)
      const menit = m > 0 ? ` ${m} menit` : ''
      return `Deadline dalam ${h} jam${menit}.`
    }
    const mins = Math.max(1, Math.round(diff / 60_000))
    return `Deadline dalam ${mins} menit.`
  }
  if (diff >= -60 * 60_000) return 'Deadline sudah lewat — segera kerjakan.'
  return 'Deadline sudah terlewat.'
}
