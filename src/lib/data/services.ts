import type { SupabaseClient } from '@supabase/supabase-js'
import { MAX_FILE_SIZE, normalizeCategory, validateFile } from '@/lib/files/validate'
import { DATA_CHANGED_EVENT } from '@/lib/data/repo'
import { createRepo } from './repo'
import type {
  Subject, SubjectInsert, Task, TaskInsert, TaskUpdate,
  Reminder, ReminderInsert, ReminderUpdate,
  Event, EventInsert, EventUpdate,
  Schedule, ScheduleInsert, ScheduleUpdate,
  Note, NoteInsert, NoteUpdate, FileRow, FileCategory,
} from '@/types'

/* ------------------------------- Repositori ------------------------------- */

export const subjectsRepo = createRepo<Subject>('subjects', 'created_at')
export const tasksRepo = createRepo<Task>('tasks', 'deadline', true)
export const remindersRepo = createRepo<Reminder>('reminders', 'reminder_at', true)
export const eventsRepo = createRepo<Event>('events', 'start_at', true)
export const schedulesRepo = createRepo<Schedule>('schedules', 'start_time', true)
export const notesRepo = createRepo<Note>('notes', 'updated_at')

/* --------------------------------- Subjects -------------------------------- */

export const subjectsService = {
  list: (c: SupabaseClient | null) => subjectsRepo.list(c),
  create: (c: SupabaseClient | null, p: SubjectInsert) => subjectsRepo.create(c, p),
  update: (c: SupabaseClient | null, id: string, p: Partial<SubjectInsert>) =>
    subjectsRepo.update(c, id, p),
  remove: (c: SupabaseClient | null, id: string) => subjectsRepo.remove(c, id),
}

/* ----------------------------------- Tasks --------------------------------- */

export const tasksService = {
  list: (c: SupabaseClient | null) => tasksRepo.list(c),
  create: (c: SupabaseClient | null, p: TaskInsert) =>
    tasksRepo.create(c, { status: 'todo', priority: 'medium', ...p }),
  update: (c: SupabaseClient | null, id: string, p: TaskUpdate) => tasksRepo.update(c, id, p),
  remove: (c: SupabaseClient | null, id: string) => tasksRepo.remove(c, id),

  toggleStatus(c: SupabaseClient | null, task: Task): Promise<Task> {
    const next = task.status === 'completed' ? 'todo' : 'completed'
    return tasksRepo.update(c, task.id, { status: next })
  },
}

/* --------------------------------- Reminders ------------------------------- */

export const remindersService = {
  list: (c: SupabaseClient | null) => remindersRepo.list(c),
  create: (c: SupabaseClient | null, p: ReminderInsert) =>
    remindersRepo.create(c, { repeat_type: 'none', is_completed: false, ...p }),
  update: (c: SupabaseClient | null, id: string, p: ReminderUpdate) =>
    remindersRepo.update(c, id, p),
  remove: (c: SupabaseClient | null, id: string) => remindersRepo.remove(c, id),
}

/* ----------------------------------- Events -------------------------------- */

export const eventsService = {
  list: (c: SupabaseClient | null) => eventsRepo.list(c),
  create: (c: SupabaseClient | null, p: EventInsert) => eventsRepo.create(c, p),
  update: (c: SupabaseClient | null, id: string, p: EventUpdate) => eventsRepo.update(c, id, p),
  remove: (c: SupabaseClient | null, id: string) => eventsRepo.remove(c, id),
}

/* --------------------------------- Schedules ------------------------------- */

export const schedulesService = {
  list: (c: SupabaseClient | null) => schedulesRepo.list(c),
  create: (c: SupabaseClient | null, p: ScheduleInsert) => schedulesRepo.create(c, p),
  update: (c: SupabaseClient | null, id: string, p: ScheduleUpdate) =>
    schedulesRepo.update(c, id, p),
  remove: (c: SupabaseClient | null, id: string) => schedulesRepo.remove(c, id),
}

/* ----------------------------------- Notes --------------------------------- */

export const notesService = {
  list: (c: SupabaseClient | null) => notesRepo.list(c),
  create: (c: SupabaseClient | null, p: NoteInsert) => notesRepo.create(c, p),
  update: (c: SupabaseClient | null, id: string, p: NoteUpdate) => notesRepo.update(c, id, p),
  remove: (c: SupabaseClient | null, id: string) => notesRepo.remove(c, id),
}

/* ----------------------------------- Files --------------------------------- */

function emitDataChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(DATA_CHANGED_EVENT))
  }
}

export const FILE_BUCKET = 'classhub-files'

export interface UploadOptions {
  file: File
  category: string
  subjectId: string | null
  onProgress?: (percent: number) => void
}

interface ApiError {
  error?: string
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

function messageOf(payload: Record<string, unknown>, response: Response): string {
  const raw = payload as ApiError
  if (raw.error) return raw.error
  if (response.status === 401) return 'Sesi berakhir. Silakan masuk kembali.'
  if (response.status === 413) return 'Ukuran file terlalu besar.'
  return 'Terjadi kesalahan. Silakan coba lagi.'
}

/** Unggah lewat route API server (validasi otoritatif + user dari session). */
function uploadViaApi(options: UploadOptions, signal?: AbortSignal): Promise<FileRow> {
  const { file, category, subjectId, onProgress } = options
  return new Promise<FileRow>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/files')

    xhr.upload.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable) return
      onProgress(Math.round((event.loaded / event.total) * 100))
    }

    xhr.onload = () => {
      let payload: Record<string, unknown> = {}
      try {
        payload = JSON.parse(xhr.responseText) as Record<string, unknown>
      } catch {
        /* biarkan kosong */
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        const row = payload.file as FileRow | undefined
        if (row) resolve(row)
        else reject(new Error('Respons tidak valid dari server.'))
        return
      }
      reject(new Error(messageOf(payload, { status: xhr.status } as Response)))
    }

    xhr.onerror = () => reject(new Error('Jaringan bermasalah. Unggahan gagal.'))
    xhr.onabort = () => reject(new Error('Unggahan dibatalkan.'))

    if (signal) {
      signal.addEventListener('abort', () => xhr.abort(), { once: true })
    }

    const form = new FormData()
    form.append('file', file)
    form.append('category', category)
    form.append('subject_id', subjectId ?? '')
    xhr.send(form)
  })
}

/**
 * Lapisan File Vault.
 * Storage utama: Supabase Storage lewat route API (binary tidak pernah
 * menyentuh localStorage). Mode lokal hanya menyimpan metadata tanaman
 * agar UI tetap konsisten ketika Supabase belum dikonfigurasi.
 */
export const filesService = {
  /** Metadata file milik user. Query dikerjakan di server (efisien). */
  async list(
    client: SupabaseClient | null,
    filters: { query?: string; category?: string; subjectId?: string; kind?: string } = {},
  ): Promise<FileRow[]> {
    if (client) {
      let q = client.from('files').select('*').order('created_at', { ascending: false })
      if (filters.query?.trim()) q = q.ilike('name', `%${filters.query.trim()}%`)
      if (filters.category) q = q.eq('category', filters.category)
      if (filters.subjectId) q = q.eq('subject_id', filters.subjectId)
      const { data, error } = await q.limit(500)
      if (error) throw new Error(error.message)
      return (data ?? []) as FileRow[]
    }
    return createRepo<FileRow>('files', 'created_at').list(client)
  },

  async upload(client: SupabaseClient | null, options: UploadOptions): Promise<FileRow> {
    const { file, onProgress } = options

    // Validasi dini di client supaya error muncul cepat.
    const check = validateFile(file, MAX_FILE_SIZE)
    if (!check.ok) throw new Error(check.message)

    if (client) {
      const row = await uploadViaApi(options)
      onProgress?.(100)
      emitDataChanged()
      return row
    }

    // Mode tanpa Supabase: simpan metadata saja, tanpa binary.
    const row = await createRepo<FileRow>('files', 'created_at').create(client, {
      name: check.name,
      storage_path: '',
      mime_type: check.mime,
      size: file.size,
      subject_id: options.subjectId,
      category: normalizeCategory(options.category),
    } as unknown as Partial<FileRow>)
    onProgress?.(100)
    return row
  },

  /** Signed URL berumur pendek untuk file milik user. */
  async downloadUrl(client: SupabaseClient | null, row: FileRow): Promise<string> {
    if (!client) return row.storage_path
    const response = await fetch(`/api/files?id=${encodeURIComponent(row.id)}`)
    const payload = await readJson(response)
    if (!response.ok) throw new Error(messageOf(payload, response))
    const url = payload.url as string | undefined
    if (!url) throw new Error('Tautan unduhan tidak tersedia.')
    return url
  },

  async update(
    client: SupabaseClient | null,
    id: string,
    patch: { name?: string; category?: string; subject_id?: string | null },
  ): Promise<FileRow> {
    return createRepo<FileRow>('files', 'created_at').update(client, id, patch)
  },

  async remove(client: SupabaseClient | null, row: FileRow): Promise<void> {
    if (client) {
      const response = await fetch(`/api/files?id=${encodeURIComponent(row.id)}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const payload = await readJson(response)
        throw new Error(messageOf(payload, response))
      }
      emitDataChanged()
      return
    }
    return createRepo<FileRow>('files', 'created_at').remove(client, row.id)
  },
}
