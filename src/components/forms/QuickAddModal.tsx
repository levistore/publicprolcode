'use client'

import { useRouter } from 'next/navigation'
import { EventForm, NoteForm, ReminderForm, TaskForm } from './forms'
import type { Event, Note, Reminder, Task } from '@/types'

export type QuickAddKind = 'task' | 'reminder' | 'note' | 'event' | 'file'

export function QuickAddModal({
  kind,
  onClose,
  initial,
}: {
  kind: QuickAddKind
  onClose: () => void
  initial?: Task | Reminder | Note | Event | null
}) {
  const router = useRouter()

  if (kind === 'file') {
    // Upload file ditangani penuh di halaman Files
    router.push('/files')
    return null
  }

  switch (kind) {
    case 'reminder':
      return <ReminderForm onClose={onClose} initial={initial as Reminder | null} />
    case 'note':
      return <NoteForm onClose={onClose} initial={initial as Note | null} />
    case 'event':
      return <EventForm onClose={onClose} initial={initial as Event | null} />
    case 'task':
    default:
      return <TaskForm onClose={onClose} initial={initial as Task | null} />
  }
}
