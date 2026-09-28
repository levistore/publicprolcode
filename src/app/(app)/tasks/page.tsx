'use client'

import { useMemo, useState } from 'react'
import { useResource } from '@/hooks/useResource'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { subjectsService, tasksService } from '@/lib/data/services'
import { ConfirmModal, EmptyState, ErrorState, Skeleton, SubjectDot } from '@/components/ui'
import { TaskForm } from '@/components/forms/forms'
import { IconCheck, IconPlus, IconSearch, IconTasks, IconTrash } from '@/components/icons'
import { formatShortDate, formatTime, isSameDay, relativeDeadline } from '@/lib/date'
import type { Subject, Task, TaskPriority } from '@/types'

const FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: 'today', label: 'Hari ini' },
  { key: 'upcoming', label: 'Mendatang' },
  { key: 'overdue', label: 'Terlambat' },
  { key: 'completed', label: 'Selesai' },
] as const

type FilterKey = (typeof FILTERS)[number]['key']

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  high: 'badge badge-high',
  medium: 'badge badge-medium',
  low: 'badge',
}
const PRIORITY_LABEL: Record<TaskPriority, string> = {
  high: 'Tinggi', medium: 'Sedang', low: 'Rendah',
}

export default function TasksPage() {
  const { client } = useAuth()
  const toast = useToast()

  const tasks = useResource<Task[]>((c) => tasksService.list(c), [])
  const subjects = useResource<Subject[]>((c) => subjectsService.list(c), [])

  const [filter, setFilter] = useState<FilterKey>('all')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Task | null | 'new'>(null)
  const [deleting, setDeleting] = useState<Task | null>(null)

  const subjectMap = useMemo(() => {
    const m = new Map<string, Subject>()
    subjects.data.forEach((s) => m.set(s.id, s))
    return m
  }, [subjects.data])

  const counts = useMemo(() => {
    const now = new Date()
    return {
      all: tasks.data.length,
      today: tasks.data.filter((t) => t.deadline && isSameDay(new Date(t.deadline), now)).length,
      upcoming: tasks.data.filter((t) => t.status !== 'completed' && t.deadline && new Date(t.deadline) > now).length,
      overdue: tasks.data.filter((t) => t.status !== 'completed' && t.deadline && new Date(t.deadline) < now).length,
      completed: tasks.data.filter((t) => t.status === 'completed').length,
    }
  }, [tasks.data])

  const filtered = useMemo(() => {
    const now = new Date()
    let rows = tasks.data

    if (filter === 'today') rows = rows.filter((t) => t.deadline && isSameDay(new Date(t.deadline), now))
    if (filter === 'upcoming')
      rows = rows.filter((t) => t.status !== 'completed' && t.deadline && new Date(t.deadline) >= now && !isSameDay(new Date(t.deadline), now))
    if (filter === 'overdue')
      rows = rows.filter((t) => t.status !== 'completed' && t.deadline && new Date(t.deadline) < now)
    if (filter === 'completed') rows = rows.filter((t) => t.status === 'completed')
    if (subjectFilter) rows = rows.filter((t) => t.subject_id === subjectFilter)
    if (query.trim()) {
      const q = query.toLowerCase()
      rows = rows.filter((t) => t.title.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q))
    }

    return [...rows].sort((a, b) => {
      if ((a.status === 'completed') !== (b.status === 'completed')) return a.status === 'completed' ? 1 : -1
      if (!a.deadline && !b.deadline) return 0
      if (!a.deadline) return 1
      if (!b.deadline) return -1
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    })
  }, [tasks.data, filter, subjectFilter, query])

  async function toggle(task: Task) {
    try {
      await tasksService.toggleStatus(client, task)
      tasks.reload()
      toast(task.status === 'completed' ? 'Task dibuka lagi' : 'Task selesai')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Gagal memperbarui', 'error')
    }
  }

  async function remove(task: Task) {
    try {
      await tasksService.remove(client, task.id)
      tasks.reload()
      toast('Task dihapus')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Gagal menghapus', 'error')
    }
  }

  return (
    <div>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[22px] font-semibold md:text-[26px]">Tasks</h1>
        <button className="btn btn-primary" onClick={() => setEditing('new')}>
          <IconPlus size={15} /> Task Baru
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2.5">
        <div className="relative min-w-[200px] flex-1">
          <IconSearch size={15} className="pointer-events-none absolute left-3 top-[11px] text-text-muted" />
          <input
            className="input pl-[34px]" placeholder="Cari task…"
            value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Cari task"
          />
        </div>
        <select
          className="select w-auto min-w-[150px]"
          value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}
          aria-label="Filter mapel"
        >
          <option value="">Semua mapel</option>
          {subjects.data.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="mb-3.5 flex gap-1.5 overflow-x-auto pb-0.5" role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f.key} role="tab" aria-selected={filter === f.key}
            className="chip" data-active={filter === f.key}
            onClick={() => setFilter(f.key)}
          >
            {f.label}{counts[f.key] ? ` · ${counts[f.key]}` : ''}
          </button>
        ))}
      </div>

      {tasks.error ? (
        <ErrorState message={tasks.error} onRetry={tasks.reload} />
      ) : tasks.loading ? (
        <div className="card"><Skeleton rows={5} /></div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            mascot
            icon={IconTasks}
            title={query || filter !== 'all' ? 'Tidak ada task di filter ini' : 'Belum ada task'}
            text={
              query || filter !== 'all'
                ? 'Coba ubah filter atau kata pencarian.'
                : 'Tambahkan tugas pertama kamu agar deadline tidak lagi hilang di antara chat dan screenshot.'
            }
            action={
              <button className="btn btn-sm btn-primary" onClick={() => setEditing('new')}>
                <IconPlus size={14} /> Task Baru
              </button>
            }
          />
        </div>
      ) : (
        <div className="card flex flex-col">
          {filtered.map((t) => {
            const subject = t.subject_id ? subjectMap.get(t.subject_id) : undefined
            const dl = t.deadline ? new Date(t.deadline) : null
            const overdue = dl ? dl < new Date() && t.status !== 'completed' : false
            const dueSoon = dl ? !overdue && t.status !== 'completed' && dl.getTime() - Date.now() < 24 * 3600_000 : false

            return (
              <div
                key={t.id}
                className={`flex items-start gap-3 border-b border-line px-3.5 py-3 last:border-b-0 ${
                  overdue
                    ? 'border-l-2 border-l-danger bg-[linear-gradient(90deg,rgba(212,100,92,0.07),transparent_40%)]'
                    : dueSoon
                      ? 'border-l-2 border-l-warning bg-warning-soft'
                      : ''
                }`}
              >
                <button
                  className="tick" data-on={t.status === 'completed'}
                  onClick={() => void toggle(t)}
                  aria-label={t.status === 'completed' ? 'Buka lagi' : 'Tandai selesai'}
                >
                  <IconCheck size={12} />
                </button>

                <div className="min-w-0 flex-1">
                  <div className={`truncate text-sm font-medium ${t.status === 'completed' ? 'text-text-muted line-through' : ''}`}>
                    {t.title}
                  </div>
                  {t.description && (
                    <div className="mb-0.5 truncate text-[12.5px] text-text-muted">{t.description}</div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                    {subject && (
                      <span className="inline-flex items-center gap-1.5">
                        <SubjectDot color={subject.color} />{subject.name}
                      </span>
                    )}
                    {dl && (
                      <span className={`tabular-nums ${overdue ? 'text-danger' : ''}`}>
                        {formatShortDate(dl)}, {formatTime(dl)} — {relativeDeadline(dl)}
                      </span>
                    )}
                    <span className={PRIORITY_BADGE[t.priority]}>{PRIORITY_LABEL[t.priority]}</span>
                    {t.status === 'completed' && <span className="badge badge-done">Selesai</span>}
                  </div>
                </div>

                <div className="flex flex-none gap-0.5">
                  <button className="btn btn-icon" onClick={() => setEditing(t)} aria-label="Edit">
                    <IconTasks size={15} />
                  </button>
                  <button className="btn btn-icon" onClick={() => setDeleting(t)} aria-label="Hapus">
                    <IconTrash size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing && (
        <TaskForm
          initial={editing === 'new' ? null : editing}
          onClose={() => { setEditing(null); tasks.reload() }}
        />
      )}
      {deleting && (
        <ConfirmModal
          title="Hapus task?"
          text={`"${deleting.title}" akan dihapus permanen.`}
          onConfirm={() => void remove(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
