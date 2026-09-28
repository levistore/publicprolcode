import type { SupabaseClient } from '@supabase/supabase-js'

type TableName =
  | 'subjects' | 'tasks' | 'reminders' | 'events' | 'notes' | 'files' | 'schedules' | 'activities'
import { loadLocal, saveLocal, makeId, nowIso, logActivity } from '@/lib/local/db'

export const DATA_CHANGED_EVENT = 'classhub:data-changed'

function emitChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(DATA_CHANGED_EVENT))
  }
}

/**
 * Repositori generik.
 * - client ada  -> operasi ke Postgres (RLS membatasi ke milik user).
 * - client null -> fallback localStorage supaya aplikasi tetap terpakai.
 */
export function createRepo<T extends { id: string; created_at: string; updated_at: string }>(
  table: TableName,
  orderBy: string,
  ascending = false,
) {
  async function list(client: SupabaseClient | null): Promise<T[]> {
    if (client) {
      const { data, error } = await client
        .from(table)
        .select('*')
        .order(orderBy, { ascending })
      if (error) throw new Error(error.message)
      return (data ?? []) as T[]
    }
    const db = loadLocal()
    const rows = [...(db[table as TableName] as unknown as T[])]
    rows.sort((a, b) => {
      const av = String((a[orderBy as keyof T] as unknown) ?? '')
      const bv = String((b[orderBy as keyof T] as unknown) ?? '')
      return ascending ? av.localeCompare(bv) : bv.localeCompare(av)
    })
    return rows
  }

  async function create(
    client: SupabaseClient | null,
    payload: Record<string, unknown>,
  ): Promise<T> {
    if (client) {
      const { data, error } = await client.from(table).insert(payload).select().single()
      if (error) throw new Error(error.message)
      return data as T
    }
    const db = loadLocal()
    const row = {
      id: makeId(String(table).slice(0, 3)),
      user_id: 'local',
      created_at: nowIso(),
      updated_at: nowIso(),
      ...payload,
    } as unknown as T
    ;(db[table as TableName] as unknown as T[]).unshift(row)
    logActivity(db, {
      type: String(table),
      action: 'created',
      title: String(payload.title ?? payload.name ?? ''),
    })
    saveLocal(db)
    emitChange()
    return row
  }

  async function update(
    client: SupabaseClient | null,
    id: string,
    patch: Record<string, unknown>,
  ): Promise<T> {
    if (client) {
      const { data, error } = await client
        .from(table)
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data as T
    }
    const db = loadLocal()
    const rows = db[table as TableName] as unknown as T[]
    const idx = rows.findIndex((r) => r.id === id)
    if (idx === -1) throw new Error('Data tidak ditemukan')
    const merged = { ...rows[idx], ...patch, updated_at: nowIso() } as T
    rows[idx] = merged
    logActivity(db, {
      type: String(table),
      action: 'updated',
      title: String((merged as Record<string, unknown>).title ?? (merged as Record<string, unknown>).name ?? ''),
    })
    saveLocal(db)
    emitChange()
    return merged
  }

  async function remove(client: SupabaseClient | null, id: string): Promise<void> {
    if (client) {
      const { error } = await client.from(table).delete().eq('id', id)
      if (error) throw new Error(error.message)
      return
    }
    const db = loadLocal()
    db[table as TableName] = (db[table as TableName] as unknown as T[]).filter((r) => r.id !== id)
    saveLocal(db)
    emitChange()
  }

  return { list, create, update, remove }
}
