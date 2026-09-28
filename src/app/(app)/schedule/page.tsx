'use client'

import { useMemo, useState } from 'react'
import { useResource } from '@/hooks/useResource'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { schedulesService, subjectsService } from '@/lib/data/services'
import { ConfirmModal, EmptyState, ErrorState, Skeleton, SubjectDot } from '@/components/ui'
import { ScheduleForm } from '@/components/forms/forms'
import { IconCalendar, IconPlus, IconTrash } from '@/components/icons'
import { DAY_KEYS, DAY_NAMES, WEEK_ORDER } from '@/lib/date'
import type { Schedule } from '@/types'

const DAYS = WEEK_ORDER.map((k) => ({
  key: k,
  label: DAY_NAMES[DAY_KEYS.indexOf(k)],
}))

export default function SchedulePage() {
  const { client } = useAuth()
  const toast = useToast()
  const schedules = useResource<Schedule[]>((c) => schedulesService.list(c), [])
  const subjects = useResource((c) => subjectsService.list(c), [])
  const [editing, setEditing] = useState<Schedule | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Schedule | null>(null)

  const subjectMap = useMemo(() => {
    const m = new Map<string, { name: string; color?: string }>()
    subjects.data.forEach((s) => m.set(s.id, { name: s.name, color: s.color }))
    return m
  }, [subjects.data])

  const byDay = useMemo(() => {
    const m = new Map<string, Schedule[]>()
    for (const d of WEEK_ORDER) m.set(d, [])
    schedules.data.forEach((s) => {
      const arr = m.get(s.day_of_week)
      if (arr) arr.push(s)
    })
    for (const arr of m.values()) arr.sort((a, b) => a.start_time.localeCompare(b.start_time))
    return m
  }, [schedules.data])

  async function remove(s: Schedule) {
    try {
      await schedulesService.remove(client, s.id)
      schedules.reload()
      toast('Jadwal dihapus')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Gagal menghapus', 'error')
    }
  }

  return (
    <div>
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <h1 className="font-display text-[22px] font-semibold md:text-[26px]">Jadwal Pelajaran</h1>
        <button className="btn btn-primary" onClick={() => setEditing('new')}>
          <IconPlus size={15} /> Jadwal
        </button>
      </div>

      {schedules.error ? (
        <ErrorState message={schedules.error} onRetry={schedules.reload} />
      ) : schedules.loading ? (
        <div className="card"><Skeleton rows={5} /></div>
      ) : schedules.data.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={IconCalendar}
            title="Belum ada jadwal"
            text="Atur jam pelajaran mingguan supaya dashboard tahu jam berapa kamu ke mana."
            action={
              <button className="btn btn-sm btn-primary" onClick={() => setEditing('new')}>
                <IconPlus size={14} /> Tambah Jadwal
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
          {DAYS.map((d) => {
            const rows = byDay.get(d.key) ?? []
            return (
              <section className="panel" key={d.key}>
                <div className="mb-2.5 flex items-center justify-between px-3.5 pt-3.5">
                  <h3 className="font-display text-[15px] font-semibold">{d.label}</h3>
                  <span className="text-xs text-text-muted">{rows.length} sesi</span>
                </div>
                {rows.length === 0 ? (
                  <p className="px-3.5 pb-3.5 text-[13px] text-text-muted">Tidak ada sesi.</p>
                ) : (
                  rows.map((s) => {
                    const sub = s.subject_id ? subjectMap.get(s.subject_id) : undefined
                    return (
                      <div key={s.id} className="flex items-center gap-3 border-b border-line px-3.5 py-2.5 last:border-b-0">
                        <span className="w-[96px] flex-none text-[13px] font-semibold tabular-nums text-text-secondary">
                          {s.start_time}–{s.end_time}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            <SubjectDot color={sub?.color} />
                            <span className="truncate">{sub?.name ?? 'Mata pelajaran'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-text-muted">
                            {s.room && <span>{s.room}</span>}
                            {s.teacher && <span>{s.teacher}</span>}
                          </div>
                        </div>
                        <button className="btn btn-icon" onClick={() => setEditing(s)} aria-label="Edit">
                          <IconCalendar size={15} />
                        </button>
                        <button className="btn btn-icon" onClick={() => setDeleting(s)} aria-label="Hapus">
                          <IconTrash size={15} />
                        </button>
                      </div>
                    )
                  })
                )}
              </section>
            )
          })}
        </div>
      )}

      {editing && (
        <ScheduleForm
          initial={editing === 'new' ? null : editing}
          onClose={() => { setEditing(null); schedules.reload() }}
        />
      )}
      {deleting && (
        <ConfirmModal
          title="Hapus jadwal?"
          text="Sesi jadwal ini akan dihapus permanen."
          onConfirm={() => void remove(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
