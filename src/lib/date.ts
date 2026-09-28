import type { DayOfWeek } from '@/types'

export const MINUTE = 60 * 1000
export const DAY = 24 * MINUTE

export const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
export const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

/** 'mon'..'sun' -> index JS (0=Minggu) */
const JS_DAY_INDEX: Record<DayOfWeek, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
}

/** index JS (0=Minggu) -> 'mon'..'sun' */
const KEY_BY_INDEX: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export const dayKeyForDate = (d: Date): DayOfWeek => KEY_BY_INDEX[d.getDay()] ?? 'mon'
export const jsIndexForKey = (k: DayOfWeek): number => JS_DAY_INDEX[k]

export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function toISODate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function formatTime(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export function formatShortDate(d: Date): string {
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]?.slice(0, 3) ?? ''}`
}

export function formatLongDate(d: Date): string {
  return `${DAY_NAMES[d.getDay()] ?? ''}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()] ?? ''} ${d.getFullYear()}`
}

export function greetingFor(d: Date): string {
  const h = d.getHours()
  if (h < 11) return 'Selamat pagi'
  if (h < 15) return 'Selamat siang'
  if (h < 18) return 'Selamat sore'
  return 'Selamat malam'
}

/** "HH:mm" pada tanggal tertentu -> Date */
export function parseTimeOnDate(isoDate: string, hhmm: string): Date | null {
  if (!isoDate || !hhmm) return null
  const [h, m] = hhmm.split(':').map(Number)
  const [y, mo, d] = isoDate.split('-').map(Number)
  if (y === undefined || mo === undefined || d === undefined) return null
  if ([y, mo, d].some((n) => Number.isNaN(n))) return null
  return new Date(y, mo - 1, d, h || 0, m || 0, 0, 0)
}

export function relativeDeadline(target: Date | string): string {
  const t = typeof target === 'string' ? new Date(target) : target
  const diff = t.getTime() - Date.now()
  const abs = Math.abs(diff)
  const days = Math.floor(abs / DAY)
  const hours = Math.floor((abs % DAY) / MINUTE)
  const minutes = Math.floor((abs % MINUTE) / 1000)

  if (diff < 0) {
    if (days >= 1) return `Terlambat ${days} hari`
    if (hours >= 1) return `Terlambat ${hours} jam`
    return `Terlambat ${minutes} menit`
  }
  if (days >= 1) return days === 1 ? 'Besok' : `${days} hari lagi`
  if (hours >= 1) return `${hours} jam lagi`
  if (minutes <= 0) return 'Sekarang'
  return `${minutes} menit lagi`
}

export function countdownTo(target: Date): string {
  const diff = target.getTime() - Date.now()
  if (diff <= 0) return '00:00:00'
  const hours = Math.floor(diff / (60 * MINUTE))
  const mins = Math.floor((diff % (60 * MINUTE)) / MINUTE)
  const secs = Math.floor((diff % MINUTE) / 1000)
  return `${pad2(hours)}:${pad2(mins)}:${pad2(secs)}`
}

/** Matriks kalender bulanan, Senin di kolom pertama. */
export function monthMatrix(year: number, month: number, weekStartsMonday = true): (Date | null)[] {
  const first = new Date(year, month, 1)
  const rawOffset = first.getDay()
  const offset = weekStartsMonday ? (rawOffset + 6) % 7 : rawOffset

  const cells: (Date | null)[] = []
  for (let i = 0; i < offset; i += 1) cells.push(null)

  const total = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= total; d += 1) cells.push(new Date(year, month, d))

  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function localDateTimeInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export function humanSize(bytes: number | null): string {
  if (!bytes) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let n = bytes
  let i = 0
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i += 1
  }
  return `${n >= 10 || i === 0 ? Math.round(n) : n.toFixed(1)} ${units[i] ?? 'B'}`
}

export const WEEK_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
