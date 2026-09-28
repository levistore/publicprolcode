import type { SupabaseClient } from '@supabase/supabase-js'

const KEY = 'classhub_local_v2'

export interface LocalDb {
  subjects: Record<string, unknown>[]
  tasks: Record<string, unknown>[]
  reminders: Record<string, unknown>[]
  events: Record<string, unknown>[]
  notes: Record<string, unknown>[]
  files: Record<string, unknown>[]
  schedules: Record<string, unknown>[]
  activities: Record<string, unknown>[]
}

const empty = (): LocalDb => ({
  subjects: [], tasks: [], reminders: [], events: [],
  notes: [], files: [], schedules: [], activities: [],
})

const TABLES = Object.keys(empty()) as (keyof LocalDb)[]

export function isLocalMode(client: SupabaseClient | null): client is null {
  return client === null
}

export function loadLocal(): LocalDb {
  if (typeof window === 'undefined') return empty()
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return empty()
    const parsed = JSON.parse(raw) as Partial<LocalDb>
    const db = empty()
    TABLES.forEach((t) => {
      const rows = parsed[t]
      if (Array.isArray(rows)) db[t] = rows
    })
    return db
  } catch {
    return empty()
  }
}

export function saveLocal(db: LocalDb): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    /* storage penuh — abaikan */
  }
}

export function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10)
  return `${prefix}_${rand}${Date.now().toString(36).slice(-4)}`
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function logActivity(db: LocalDb, entry: { type: string; action: string; title?: string }): void {
  db.activities.unshift({
    id: makeId('act'),
    user_id: 'local',
    created_at: nowIso(),
    ...entry,
  })
  db.activities = db.activities.slice(0, 60)
}

export { TABLES }
