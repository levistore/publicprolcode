'use client'

import { useMemo } from 'react'
import { useResource } from '@/hooks/useResource'
import { useAuth } from '@/components/providers/AuthProvider'
import { eventsService, filesService, notesService, remindersService, subjectsService, tasksService } from '@/lib/data/services'
import { ErrorState, Skeleton } from '@/components/ui'
import { IconCheck, IconFiles, IconGraduation, IconNotes, IconTasks } from '@/components/icons'

export default function ProfilePage() {
  const { user, mode } = useAuth()

  const tasks = useResource((c) => tasksService.list(c), [])
  const notes = useResource((c) => notesService.list(c), [])
  const files = useResource((c) => filesService.list(c), [])
  const events = useResource((c) => eventsService.list(c), [])
  const subjects = useResource((c) => subjectsService.list(c), [])
  const reminders = useResource((c) => remindersService.list(c), [])

  const stats = useMemo(
    () => [
      { icon: IconTasks, label: 'Task total', value: tasks.data.length },
      { icon: IconCheck, label: 'Task selesai', value: tasks.data.filter((t) => t.status === 'completed').length },
      { icon: IconNotes, label: 'Catatan', value: notes.data.length },
      { icon: IconFiles, label: 'File', value: files.data.length },
      { icon: IconGraduation, label: 'Mata pelajaran', value: subjects.data.length },
      { icon: IconTasks, label: 'Reminder', value: reminders.data.length },
      { icon: IconTasks, label: 'Event', value: events.data.length },
    ],
    [tasks.data, notes.data, files.data, subjects.data, reminders.data, events.data],
  )

  const loading = tasks.loading || notes.loading
  const error = tasks.error ?? notes.error
  const initial = (user?.displayName ?? 'U').charAt(0).toUpperCase()

  return (
    <div>
      <h1 className="mb-3.5 font-display text-[22px] font-semibold md:text-[26px]">Profil</h1>

      <div className="card mb-3.5 flex items-center gap-3 p-4">
        <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-line bg-bg-inset font-display text-lg font-semibold">
          {initial}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{user?.displayName ?? 'Siswa'}</div>
          <div className="truncate text-xs text-text-muted">{user?.email ?? '—'}</div>
        </div>
        <span className="ml-auto badge">{mode === 'supabase' ? 'Cloud' : 'Lokal'}</span>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={tasks.reload} />
      ) : loading ? (
        <div className="card"><Skeleton rows={4} /></div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-line bg-bg-panel p-3.5">
              <div className="mb-1.5 flex items-center gap-1.5 text-[11.5px] text-text-muted">
                <s.icon size={13} /> {s.label}
              </div>
              <div className="font-display text-xl font-semibold tabular-nums">{s.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
