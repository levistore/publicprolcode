'use client'

import { useMemo, useState } from 'react'
import { useResource } from '@/hooks/useResource'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { filesService, notesService, schedulesService, subjectsService, tasksService } from '@/lib/data/services'
import { ConfirmModal, EmptyState, ErrorState, Skeleton, SubjectDot } from '@/components/ui'
import { SubjectForm } from '@/components/forms/forms'
import { IconClock, IconFiles, IconGraduation, IconNotes, IconPlus, IconTasks, IconTrash } from '@/components/icons'
import { DAY_KEYS, DAY_NAMES, formatShortDate } from '@/lib/date'
import type { FileRow, Note, Schedule, Subject, Task } from '@/types'


export default function SubjectsPage() {
  const { client } = useAuth()
  const toast = useToast()
  const subjects = useResource<Subject[]>((c) => subjectsService.list(c), [])
  const tasks = useResource<Task[]>((c) => tasksService.list(c), [])
  const notes = useResource<Note[]>((c) => notesService.list(c), [])
  const files = useResource<FileRow[]>((c) => filesService.list(c), [])
  const schedules = useResource<Schedule[]>((c) => schedulesService.list(c), [])

  const [editing, setEditing] = useState<Subject | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Subject | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  const stats = useMemo(() => {
    const m = new Map<string, { tasks: number; notes: number; files: number; schedules: number }>()
    subjects.data.forEach((s) => m.set(s.id, { tasks: 0, notes: 0, files: 0, schedules: 0 }))
    tasks.data.forEach((t) => { if (t.subject_id && t.status !== 'completed') m.get(t.subject_id)!.tasks++ })
    notes.data.forEach((n) => { if (n.subject_id) m.get(n.subject_id)!.notes++ })
    files.data.forEach((f) => { if (f.subject_id) m.get(f.subject_id)!.files++ })
    schedules.data.forEach((sc) => { if (sc.subject_id) m.get(sc.subject_id)!.schedules++ })
    return m
  }, [subjects.data, tasks.data, notes.data, files.data, schedules.data])

  async function remove(s: Subject) {
    try {
      await subjectsService.remove(client, s.id)
      subjects.reload()
      toast('Mata pelajaran dihapus')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Gagal menghapus', 'error')
    }
  }

  const loading = subjects.loading || tasks.loading
  const error = subjects.error ?? tasks.error

  return (
    <div>
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <h1 className="font-display text-[22px] font-semibold md:text-[26px]">Mata Pelajaran</h1>
        <button className="btn btn-primary" onClick={() => setEditing('new')}>
          <IconPlus size={15} /> Mapel
        </button>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => { subjects.reload(); tasks.reload() }} />
      ) : loading ? (
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="card p-3.5"><Skeleton rows={3} /></div>)}
        </div>
      ) : subjects.data.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={IconGraduation}
            title="Belum ada mata pelajaran"
            text="Buat daftar mapel untuk mengelompokkan tugas, catatan, dan file."
            action={
              <button className="btn btn-sm btn-primary" onClick={() => setEditing('new')}>
                <IconPlus size={14} /> Tambah Mapel
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {subjects.data.map((s) => {
            const st = stats.get(s.id)
            const active = tasks.data.filter((t) => t.subject_id === s.id && t.status !== 'completed')
            const subjNotes = notes.data.filter((n) => n.subject_id === s.id && !n.is_archived)
            const subjFiles = files.data.filter((f) => f.subject_id === s.id)
            const subjSchedules = schedules.data.filter((sc) => sc.subject_id === s.id)
            const isOpen = open === s.id

            return (
              <article key={s.id} className="card p-0">
                <div className="flex items-center gap-2.5 p-3.5">
                  <SubjectDot color={s.color} />
                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setOpen(isOpen ? null : s.id)}
                    aria-expanded={isOpen}
                  >
                    <div className="truncate text-sm font-semibold">{s.name}</div>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      {s.teacher && <span>{s.teacher}</span>}
                      {s.room && <span>· {s.room}</span>}
                      {st && <span>· {st.tasks} task aktif</span>}
                    </div>
                  </button>
                  <button className="btn btn-icon" onClick={() => setEditing(s)} aria-label="Edit">
                    <IconGraduation size={15} />
                  </button>
                  <button className="btn btn-icon btn-danger" onClick={() => setDeleting(s)} aria-label="Hapus">
                    <IconTrash size={15} />
                  </button>
                </div>

                {isOpen && (
                  <div className="border-t border-line px-3.5 py-3">
                    <Section icon={IconTasks} title="Task mendatang">
                      {active.length === 0 ? (
                        <p className="text-[12.5px] text-text-muted">Tidak ada task aktif.</p>
                      ) : (
                        active.slice(0, 4).map((t) => (
                          <p key={t.id} className="truncate text-[12.5px]">
                            {t.deadline && <span className="mr-1.5 tabular-nums text-text-muted">{formatShortDate(new Date(t.deadline))}</span>}
                            {t.title}
                          </p>
                        ))
                      )}
                    </Section>

                    <Section icon={IconClock} title="Jadwal">
                      {subjSchedules.length === 0 ? (
                        <p className="text-[12.5px] text-text-muted">Tidak ada jadwal.</p>
                      ) : (
                        subjSchedules.map((sc) => (
                          <p key={sc.id} className="text-[12.5px]">
                            {DAY_NAMES[DAY_KEYS.indexOf(sc.day_of_week)]} ·{' '}
                            <span className="tabular-nums">{sc.start_time}–{sc.end_time}</span>
                          </p>
                        ))
                      )}
                    </Section>

                    <Section icon={IconNotes} title="Catatan">
                      {subjNotes.length === 0 ? (
                        <p className="text-[12.5px] text-text-muted">Tidak ada catatan.</p>
                      ) : (
                        subjNotes.slice(0, 4).map((n) => <p key={n.id} className="truncate text-[12.5px]">{n.title}</p>)
                      )}
                    </Section>

                    <Section icon={IconFiles} title="File">
                      {subjFiles.length === 0 ? (
                        <p className="text-[12.5px] text-text-muted">Tidak ada file.</p>
                      ) : (
                        subjFiles.slice(0, 4).map((f) => (
                          <a key={f.id} href={f.storage_path} target="_blank" rel="noreferrer"
                             className="block truncate text-[12.5px] hover:text-accent">{f.name}</a>
                        ))
                      )}
                    </Section>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {editing && (
        <SubjectForm
          initial={editing === 'new' ? null : editing}
          onClose={() => { setEditing(null); subjects.reload() }}
        />
      )}
      {deleting && (
        <ConfirmModal
          title="Hapus mata pelajaran?"
          text={`"${deleting.name}" akan dihapus permanen.`}
          onConfirm={() => void remove(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  )
}

function Section({
  icon: Icon, title, children,
}: {
  icon: (p: { size?: number }) => JSX.Element
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-2.5 last:mb-0">
      <div className="mb-1 flex items-center gap-1.5 text-[11.5px] font-semibold text-text-muted">
        <Icon size={13} /> {title.toUpperCase()}
      </div>
      {children}
    </div>
  )
}
