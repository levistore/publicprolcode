'use client'

import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui'
import { useToast } from '@/components/providers/ToastProvider'
import { useAuth } from '@/components/providers/AuthProvider'
import {
  subjectsService, tasksService, remindersService, eventsService, notesService, schedulesService,
} from '@/lib/data/services'
import { useResource } from '@/hooks/useResource'
import { localDateTimeInputValue } from '@/lib/date'
import type { Subject, Task, TaskPriority } from '@/types'
import { TASK_PRIORITIES } from '@/types'

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Rendah',
  medium: 'Sedang',
  high: 'Tinggi',
}

export function SubjectSelect({
  value,
  onChange,
  label = 'Mata pelajaran (opsional)',
}: {
  value: string
  onChange: (v: string) => void
  label?: string
}) {
  const { data: subjects } = useResource<Subject[]>((c) => subjectsService.list(c), [])

  return (
    <div className="mb-3.5 flex flex-col gap-1.5">
      <label className="text-[12.5px] font-medium text-text-secondary" htmlFor="f-subject">
        {label}
      </label>
      <select
        id="f-subject"
        className="select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— Tanpa mapel —</option>
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    </div>
  )
}

/* --------------------------------- Task --------------------------------- */

export function TaskForm({ onClose, initial }: { onClose: () => void; initial?: Task | null }) {
  const toast = useToast()
  const { client } = useAuth()

  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [subjectId, setSubjectId] = useState(initial?.subject_id ?? '')
  const [deadline, setDeadline] = useState(
    initial?.deadline ? localDateTimeInputValue(new Date(initial.deadline)) : '',
  )
  const [priority, setPriority] = useState<TaskPriority>(initial?.priority ?? 'medium')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return setError('Judul wajib diisi.')

    setBusy(true)
    setError(null)
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        subject_id: subjectId || null,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        priority,
      }
      if (initial) await tasksService.update(client, initial.id, payload)
      else await tasksService.create(client, payload)
      toast(initial ? 'Task diperbarui' : 'Task dibuat')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={initial ? 'Edit Task' : 'Task Baru'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} type="button">Batal</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy} type="button">
            {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white" />}
            {initial ? 'Simpan' : 'Buat Task'}
          </button>
        </>
      }
    >
      <form onSubmit={submit}>
        <div className="mb-3.5 flex flex-col gap-1.5">
          <label className="text-[12.5px] font-medium text-text-secondary" htmlFor="f-title">Judul *</label>
          <input
            id="f-title" className="input" value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Kerjakan laporan praktikum" autoFocus required
          />
        </div>

        <div className="mb-3.5 flex flex-col gap-1.5">
          <label className="text-[12.5px] font-medium text-text-secondary" htmlFor="f-desc">Deskripsi (opsional)</label>
          <textarea
            id="f-desc" className="textarea" value={description}
            onChange={(e) => setDescription(e.target.value)} placeholder="Detail tambahan…"
          />
        </div>

        <div className="mb-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-text-secondary" htmlFor="f-deadline">Deadline</label>
            <input
              id="f-deadline" className="input" type="datetime-local"
              value={deadline} onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-text-secondary" htmlFor="f-priority">Prioritas</label>
            <select
              id="f-priority" className="select" value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            >
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
              ))}
            </select>
          </div>
        </div>

        <SubjectSelect value={subjectId} onChange={setSubjectId} />

        {error && <p className="text-xs text-danger" role="alert">{error}</p>}
        <button type="submit" className="sr-only">Submit</button>
      </form>
    </Modal>
  )
}

/* ------------------------------- Reminder ------------------------------- */

const REPEAT_LABEL = { none: 'Tidak berulang', daily: 'Harian', weekly: 'Mingguan' } as const

export function ReminderForm({ onClose, initial }: { onClose: () => void; initial?: import('@/types').Reminder | null }) {
  const toast = useToast()
  const { client } = useAuth()

  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [at, setAt] = useState(
    initial?.reminder_at
      ? localDateTimeInputValue(new Date(initial.reminder_at))
      : localDateTimeInputValue(new Date(Date.now() + 60 * 60000)),
  )
  const [repeat, setRepeat] = useState(initial?.repeat_type ?? 'none')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return setError('Judul wajib diisi.')
    if (!at) return setError('Waktu pengingat wajib diisi.')

    setBusy(true)
    setError(null)
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        reminder_at: new Date(at).toISOString(),
        repeat_type: repeat,
      }
      if (initial) await remindersService.update(client, initial.id, payload)
      else await remindersService.create(client, payload)
      toast(initial ? 'Reminder diperbarui' : 'Reminder dibuat')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={initial ? 'Edit Reminder' : 'Reminder Baru'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} type="button">Batal</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy} type="button">
            {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white" />}
            {initial ? 'Simpan' : 'Buat Reminder'}
          </button>
        </>
      }
    >
      <form onSubmit={submit}>
        <div className="mb-3.5 flex flex-col gap-1.5">
          <label className="text-[12.5px] font-medium text-text-secondary" htmlFor="f-title">Judul *</label>
          <input
            id="f-title" className="input" value={title}
            onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Besok bawa laporan" autoFocus required
          />
        </div>

        <div className="mb-3.5 flex flex-col gap-1.5">
          <label className="text-[12.5px] font-medium text-text-secondary" htmlFor="f-desc">Deskripsi (opsional)</label>
          <textarea
            id="f-desc" className="textarea" value={description}
            onChange={(e) => setDescription(e.target.value)} placeholder="Detail tambahan…"
          />
        </div>

        <div className="mb-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-text-secondary" htmlFor="f-at">Waktu *</label>
            <input id="f-at" className="input" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-text-secondary" htmlFor="f-repeat">Berulang</label>
            <select
              id="f-repeat" className="select" value={repeat}
              onChange={(e) => setRepeat(e.target.value as 'none' | 'daily' | 'weekly')}
            >
              {(Object.keys(REPEAT_LABEL) as (keyof typeof REPEAT_LABEL)[]).map((k) => (
                <option key={k} value={k}>{REPEAT_LABEL[k]}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-xs text-danger" role="alert">{error}</p>}
        <button type="submit" className="sr-only">Submit</button>
      </form>
    </Modal>
  )
}

/* --------------------------------- Event --------------------------------- */

export function EventForm({ onClose, initial }: { onClose: () => void; initial?: import('@/types').Event | null }) {
  const toast = useToast()
  const { client } = useAuth()

  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [start, setStart] = useState(
    initial?.start_at ? localDateTimeInputValue(new Date(initial.start_at)) : localDateTimeInputValue(new Date()),
  )
  const [end, setEnd] = useState(
    initial?.end_at ? localDateTimeInputValue(new Date(initial.end_at)) : '',
  )
  const [location, setLocation] = useState(initial?.location ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return setError('Judul wajib diisi.')
    if (!start) return setError('Waktu mulai wajib diisi.')
    if (end && new Date(end) < new Date(start)) return setError('Waktu selesai tidak boleh sebelum waktu mulai.')

    setBusy(true)
    setError(null)
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        start_at: new Date(start).toISOString(),
        end_at: end ? new Date(end).toISOString() : null,
        location: location.trim() || null,
      }
      if (initial) await eventsService.update(client, initial.id, payload)
      else await eventsService.create(client, payload)
      toast(initial ? 'Event diperbarui' : 'Event dibuat')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={initial ? 'Edit Event' : 'Event Baru'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} type="button">Batal</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy} type="button">
            {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white" />}
            {initial ? 'Simpan' : 'Buat Event'}
          </button>
        </>
      }
    >
      <form onSubmit={submit}>
        <div className="mb-3.5 flex flex-col gap-1.5">
          <label className="text-[12.5px] font-medium text-text-secondary" htmlFor="f-title">Judul *</label>
          <input
            id="f-title" className="input" value={title}
            onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Upacara bendera" autoFocus required
          />
        </div>

        <div className="mb-3.5 flex flex-col gap-1.5">
          <label className="text-[12.5px] font-medium text-text-secondary" htmlFor="f-desc">Deskripsi (opsional)</label>
          <textarea id="f-desc" className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="mb-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-text-secondary" htmlFor="f-start">Mulai *</label>
            <input id="f-start" className="input" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-text-secondary" htmlFor="f-end">Selesai</label>
            <input id="f-end" className="input" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>

        <div className="mb-3.5 flex flex-col gap-1.5">
          <label className="text-[12.5px] font-medium text-text-secondary" htmlFor="f-loc">Lokasi (opsional)</label>
          <input id="f-loc" className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lab, ruang kelas…" />
        </div>

        {error && <p className="text-xs text-danger" role="alert">{error}</p>}
        <button type="submit" className="sr-only">Submit</button>
      </form>
    </Modal>
  )
}

/* --------------------------------- Note ---------------------------------- */

export function NoteForm({ onClose, initial }: { onClose: () => void; initial?: import('@/types').Note | null }) {
  const toast = useToast()
  const { client } = useAuth()

  const [title, setTitle] = useState(initial?.title ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [subjectId, setSubjectId] = useState(initial?.subject_id ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() && !content.trim()) return setError('Isi minimal judul atau catatan.')

    setBusy(true)
    setError(null)
    try {
      const payload = {
        title: title.trim() || content.trim().slice(0, 40),
        content: content.trim(),
        subject_id: subjectId || null,
        category: category.trim() || null,
      }
      if (initial) await notesService.update(client, initial.id, payload)
      else await notesService.create(client, payload)
      toast(initial ? 'Catatan diperbarui' : 'Catatan dibuat')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={initial ? 'Edit Catatan' : 'Catatan Baru'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} type="button">Batal</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy} type="button">
            {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white" />}
            {initial ? 'Simpan' : 'Buat Catatan'}
          </button>
        </>
      }
    >
      <form onSubmit={submit}>
        <div className="mb-3.5 flex flex-col gap-1.5">
          <label className="text-[12.5px] font-medium text-text-secondary" htmlFor="f-title">Judul</label>
          <input id="f-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Rangkuman bab 2" autoFocus />
        </div>

        <div className="mb-3.5 flex flex-col gap-1.5">
          <label className="text-[12.5px] font-medium text-text-secondary" htmlFor="f-content">Catatan</label>
          <textarea
            id="f-content" className="textarea" style={{ minHeight: 140 }}
            value={content} onChange={(e) => setContent(e.target.value)}
            placeholder="Tulis catatan di sini… (Markdown dasar didukung)"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="mb-3.5 flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-text-secondary" htmlFor="f-cat">Kategori (opsional)</label>
            <input id="f-cat" className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Rumus, rangkuman…" />
          </div>
        </div>

        <SubjectSelect value={subjectId} onChange={setSubjectId} />

        {error && <p className="text-xs text-danger" role="alert">{error}</p>}
        <button type="submit" className="sr-only">Submit</button>
      </form>
    </Modal>
  )
}

/* -------------------------------- Subject -------------------------------- */

export const SUBJECT_COLORS = [
  '#4d8dff', '#4ea87a', '#d0a34a', '#d4645c', '#9a7bd6', '#4db8c4', '#d67ba8', '#8a93a3',
]

export function SubjectForm({ onClose, initial }: { onClose: () => void; initial?: Subject | null }) {
  const toast = useToast()
  const { client } = useAuth()

  const [name, setName] = useState(initial?.name ?? '')
  const [teacher, setTeacher] = useState(initial?.teacher ?? '')
  const [room, setRoom] = useState(initial?.room ?? '')
  const [color, setColor] = useState(initial?.color ?? SUBJECT_COLORS[0] ?? '#4d8dff')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Nama mapel wajib diisi.')

    setBusy(true)
    setError(null)
    try {
      const payload = { name: name.trim(), teacher: teacher.trim() || null, room: room.trim() || null, color }
      if (initial) await subjectsService.update(client, initial.id, payload)
      else await subjectsService.create(client, payload)
      toast(initial ? 'Mapel diperbarui' : 'Mapel ditambahkan')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={initial ? 'Edit Mapel' : 'Mapel Baru'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} type="button">Batal</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy} type="button">
            {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white" />}
            {initial ? 'Simpan' : 'Tambah'}
          </button>
        </>
      }
    >
      <form onSubmit={submit}>
        <div className="mb-3.5 flex flex-col gap-1.5">
          <label className="text-[12.5px] font-medium text-text-secondary" htmlFor="f-name">Nama mapel *</label>
          <input id="f-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Basis Data" autoFocus required />
        </div>

        <div className="mb-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-text-secondary" htmlFor="f-teacher">Guru (opsional)</label>
            <input id="f-teacher" className="input" value={teacher} onChange={(e) => setTeacher(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-text-secondary" htmlFor="f-room">Ruang (opsional)</label>
            <input id="f-room" className="input" value={room} onChange={(e) => setRoom(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-medium text-text-secondary">Warna</span>
          <div className="flex flex-wrap gap-2">
            {SUBJECT_COLORS.map((c) => (
              <button
                key={c} type="button" aria-label={`Warna ${c}`}
                onClick={() => setColor(c)}
                className="h-7 w-7 cursor-pointer rounded-lg border-2 p-0"
                style={{ background: c, borderColor: color === c ? '#fff' : 'transparent' }}
              />
            ))}
          </div>
        </div>

        {error && <p className="mt-2 text-xs text-danger" role="alert">{error}</p>}
        <button type="submit" className="sr-only">Submit</button>
      </form>
    </Modal>
  )
}

/* -------------------------------- Schedule ------------------------------- */

export function ScheduleForm({ onClose, initial }: { onClose: () => void; initial?: import('@/types').Schedule | null }) {
  const toast = useToast()
  const { client } = useAuth()
  const { data: subjects } = useResource<Subject[]>((c) => subjectsService.list(c), [])

  const [subjectId, setSubjectId] = useState(initial?.subject_id ?? '')
  const [day, setDay] = useState(initial?.day_of_week ?? 'mon')
  const [startTime, setStartTime] = useState(initial?.start_time ?? '07:00')
  const [endTime, setEndTime] = useState(initial?.end_time ?? '08:30')
  const [room, setRoom] = useState(initial?.room ?? '')
  const [teacher, setTeacher] = useState(initial?.teacher ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!initial && !subjectId && subjects.length > 0) setSubjectId(subjects[0]?.id ?? '')
  }, [subjects, subjectId, initial])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!subjectId) return setError('Pilih mata pelajaran dulu — buat mapel di halaman Subjects.')
    if (endTime <= startTime) return setError('Jam selesai harus setelah jam mulai.')

    setBusy(true)
    setError(null)
    try {
      const payload = {
        subject_id: subjectId,
        day_of_week: day,
        start_time: startTime,
        end_time: endTime,
        room: room.trim() || null,
        teacher: teacher.trim() || null,
      }
      if (initial) await schedulesService.update(client, initial.id, payload)
      else await schedulesService.create(client, payload)
      toast(initial ? 'Jadwal diperbarui' : 'Jadwal ditambahkan')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={initial ? 'Edit Jadwal' : 'Jadwal Baru'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} type="button">Batal</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy} type="button">
            {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white" />}
            {initial ? 'Simpan' : 'Tambah'}
          </button>
        </>
      }
    >
      <form onSubmit={submit}>
        <div className="mb-3.5 flex flex-col gap-1.5">
          <label className="text-[12.5px] font-medium text-text-secondary" htmlFor="f-subject">Mata pelajaran *</label>
          <select id="f-subject" className="select" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} required>
            <option value="">— Pilih mapel —</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="mb-3.5 flex flex-col gap-1.5">
          <label className="text-[12.5px] font-medium text-text-secondary" htmlFor="f-day">Hari</label>
          <select id="f-day" className="select" value={day} onChange={(e) => setDay(e.target.value as typeof day)}>
            {(['mon','tue','wed','thu','fri','sat','sun'] as const).map((k) => (
              <option key={k} value={k}>
                {{ mon: 'Senin', tue: 'Selasa', wed: 'Rabu', thu: 'Kamis', fri: 'Jumat', sat: 'Sabtu', sun: 'Minggu' }[k]}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-text-secondary" htmlFor="f-starttime">Mulai</label>
            <input id="f-starttime" className="input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-text-secondary" htmlFor="f-endtime">Selesai</label>
            <input id="f-endtime" className="input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-text-secondary" htmlFor="f-room2">Ruang</label>
            <input id="f-room2" className="input" value={room} onChange={(e) => setRoom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-text-secondary" htmlFor="f-teacher2">Guru</label>
            <input id="f-teacher2" className="input" value={teacher} onChange={(e) => setTeacher(e.target.value)} />
          </div>
        </div>

        {error && <p className="mt-2 text-xs text-danger" role="alert">{error}</p>}
        <button type="submit" className="sr-only">Submit</button>
      </form>
    </Modal>
  )
}
