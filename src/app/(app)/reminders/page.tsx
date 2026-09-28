'use client'

import { useMemo, useState } from 'react'
import { useResource } from '@/hooks/useResource'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { remindersService } from '@/lib/data/services'
import { ConfirmModal, EmptyState, ErrorState, Skeleton } from '@/components/ui'
import { ReminderForm } from '@/components/forms/forms'
import { IconBell, IconCheck, IconPlus, IconTrash } from '@/components/icons'
import { formatShortDate, formatTime, relativeDeadline } from '@/lib/date'
import type { Reminder } from '@/types'

const REPEAT_LABEL: Record<string, string> = { none: 'sekali', daily: 'harian', weekly: 'mingguan' }

export default function RemindersPage() {
  const { client } = useAuth()
  const toast = useToast()
  const reminders = useResource<Reminder[]>((c) => remindersService.list(c), [])
  const [editing, setEditing] = useState<Reminder | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Reminder | null>(null)

  const sorted = useMemo(
    () =>
      [...reminders.data].sort((a, b) => {
        if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1
        return new Date(a.reminder_at).getTime() - new Date(b.reminder_at).getTime()
      }),
    [reminders.data],
  )

  async function toggle(r: Reminder) {
    try {
      await remindersService.update(client, r.id, { is_completed: !r.is_completed })
      reminders.reload()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Gagal memperbarui', 'error')
    }
  }

  async function remove(r: Reminder) {
    try {
      await remindersService.remove(client, r.id)
      reminders.reload()
      toast('Reminder dihapus')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Gagal menghapus', 'error')
    }
  }

  return (
    <div>
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <h1 className="font-display text-[22px] font-semibold md:text-[26px]">Reminders</h1>
        <button className="btn btn-primary" onClick={() => setEditing('new')}>
          <IconPlus size={15} /> Reminder
        </button>
      </div>

      {reminders.error ? (
        <ErrorState message={reminders.error} onRetry={reminders.reload} />
      ) : reminders.loading ? (
        <div className="card"><Skeleton rows={4} /></div>
      ) : sorted.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={IconBell}
            title="Belum ada reminder"
            text="Reminder untuk hal kecil: besok bawa laporan, jangan lupa konfirmasi ke guru."
            action={
              <button className="btn btn-sm btn-primary" onClick={() => setEditing('new')}>
                <IconPlus size={14} /> Tambah Reminder
              </button>
            }
          />
        </div>
      ) : (
        <div className="card flex flex-col">
          {sorted.map((r) => (
            <div key={r.id} className="flex items-start gap-3 border-b border-line px-3.5 py-3 last:border-b-0">
              <button
                className="tick" data-on={r.is_completed}
                onClick={() => void toggle(r)}
                aria-label={r.is_completed ? 'Buka lagi' : 'Selesaikan'}
              >
                <IconCheck size={12} />
              </button>
              <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setEditing(r)}>
                <div className={`truncate text-sm font-medium ${r.is_completed ? 'text-text-muted line-through' : ''}`}>
                  {r.title}
                </div>
                {r.description && <div className="truncate text-[12.5px] text-text-muted">{r.description}</div>}
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <span className={`tabular-nums ${!r.is_completed && new Date(r.reminder_at) < new Date() ? 'text-danger' : ''}`}>
                    {formatShortDate(new Date(r.reminder_at))}, {formatTime(new Date(r.reminder_at))} — {relativeDeadline(r.reminder_at)}
                  </span>
                  {r.repeat_type !== 'none' && <span className="badge">{REPEAT_LABEL[r.repeat_type]}</span>}
                </div>
              </div>
              <button className="btn btn-icon" onClick={() => setDeleting(r)} aria-label="Hapus">
                <IconTrash size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ReminderForm
          initial={editing === 'new' ? null : editing}
          onClose={() => { setEditing(null); reminders.reload() }}
        />
      )}
      {deleting && (
        <ConfirmModal
          title="Hapus reminder?"
          text={`"${deleting.title}" akan dihapus permanen.`}
          onConfirm={() => void remove(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
