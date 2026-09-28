'use client'

import { useMemo, useState } from 'react'
import { useResource } from '@/hooks/useResource'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { eventsService } from '@/lib/data/services'
import { ConfirmModal, EmptyState, ErrorState, Skeleton } from '@/components/ui'
import { EventForm } from '@/components/forms/forms'
import { IconBell, IconPlus, IconTrash } from '@/components/icons'
import { formatShortDate, formatTime, relativeDeadline } from '@/lib/date'
import type { Event } from '@/types'

export default function EventsPage() {
  const { client } = useAuth()
  const toast = useToast()
  const events = useResource<Event[]>((c) => eventsService.list(c), [])
  const [editing, setEditing] = useState<Event | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Event | null>(null)

  const { upcoming, past } = useMemo(() => {
    const now = Date.now()
    const all = [...events.data].sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
    )
    return {
      upcoming: all.filter((e) => new Date(e.start_at).getTime() >= now),
      past: all.filter((e) => new Date(e.start_at).getTime() < now).reverse(),
    }
  }, [events.data])

  async function remove(e: Event) {
    try {
      await eventsService.remove(client, e.id)
      events.reload()
      toast('Event dihapus')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Gagal menghapus', 'error')
    }
  }

  function Row({ event, muted }: { event: Event; muted?: boolean }) {
    return (
      <div className={`flex items-start gap-3 border-b border-line px-3.5 py-3 last:border-b-0 ${muted ? 'opacity-55' : ''}`}>
        <div className="flex-1 cursor-pointer" onClick={() => setEditing(event)}>
          <div className="truncate text-sm font-medium">{event.title}</div>
          {event.description && <div className="truncate text-[12.5px] text-text-muted">{event.description}</div>}
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="tabular-nums">
              {formatShortDate(new Date(event.start_at))}, {formatTime(new Date(event.start_at))} — {relativeDeadline(event.start_at)}
            </span>
            {event.location && <span>· {event.location}</span>}
          </div>
        </div>
        <button className="btn btn-icon" onClick={() => setDeleting(event)} aria-label="Hapus">
          <IconTrash size={15} />
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <h1 className="font-display text-[22px] font-semibold md:text-[26px]">Events</h1>
        <button className="btn btn-primary" onClick={() => setEditing('new')}>
          <IconPlus size={15} /> Event
        </button>
      </div>

      {events.error ? (
        <ErrorState message={events.error} onRetry={events.reload} />
      ) : events.loading ? (
        <div className="card"><Skeleton rows={4} /></div>
      ) : events.data.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={IconBell}
            title="Belum ada event"
            text="Catat kegiatan sekolah: upacara, class meeting, ujian, atau kerja kelompok."
            action={
              <button className="btn btn-sm btn-primary" onClick={() => setEditing('new')}>
                <IconPlus size={14} /> Tambah Event
              </button>
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          <section className="panel">
            <div className="mb-2.5 px-3.5 pt-3.5">
              <h3 className="font-display text-[15px] font-semibold">Mendatang</h3>
            </div>
            {upcoming.length === 0 ? (
              <p className="px-3.5 pb-3.5 text-[13px] text-text-muted">Tidak ada event mendatang.</p>
            ) : (
              upcoming.map((e) => <Row key={e.id} event={e} />)
            )}
          </section>

          {past.length > 0 && (
            <section className="panel">
              <div className="mb-2.5 px-3.5 pt-3.5">
                <h3 className="font-display text-[15px] font-semibold">Sudah lewat</h3>
              </div>
              {past.map((e) => <Row key={e.id} event={e} muted />)}
            </section>
          )}
        </div>
      )}

      {editing && (
        <EventForm
          initial={editing === 'new' ? null : editing}
          onClose={() => { setEditing(null); events.reload() }}
        />
      )}
      {deleting && (
        <ConfirmModal
          title="Hapus event?"
          text={`"${deleting.title}" akan dihapus permanen.`}
          onConfirm={() => void remove(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
