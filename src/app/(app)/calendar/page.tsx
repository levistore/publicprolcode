'use client'

import { useMemo, useState } from 'react'
import { useResource } from '@/hooks/useResource'
import { eventsService, remindersService, subjectsService, tasksService } from '@/lib/data/services'
import { ErrorState, Skeleton } from '@/components/ui'
import { IconBell, IconCalendar, IconTasks } from '@/components/icons'
import {
  DAY_NAMES, WEEK_ORDER, addDays, formatShortDate, formatTime, isSameDay, startOfDay,
} from '@/lib/date'
import type { Event, Reminder, Task } from '@/types'

interface DayCell {
  date: Date
  inMonth: boolean
  tasks: Task[]
  reminders: Reminder[]
  events: Event[]
}

export default function CalendarPage() {
  const tasks = useResource<Task[]>((c) => tasksService.list(c), [])
  const reminders = useResource<Reminder[]>((c) => remindersService.list(c), [])
  const events = useResource<Event[]>((c) => eventsService.list(c), [])

  const [anchor, setAnchor] = useState(() => startOfDay(new Date()))
  const [selected, setSelected] = useState(() => startOfDay(new Date()))

  const cells = useMemo<DayCell[]>(() => {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    const offset = (first.getDay() + 6) % 7 // minggu mulai Senin
    const gridStart = addDays(first, -offset)

    return Array.from({ length: 42 }, (_, i) => {
      const date = addDays(gridStart, i)
      return {
        date,
        inMonth: date.getMonth() === anchor.getMonth(),
        tasks: tasks.data.filter((t) => t.deadline && isSameDay(new Date(t.deadline), date)),
        reminders: reminders.data.filter((r) => isSameDay(new Date(r.reminder_at), date)),
        events: events.data.filter((e) => isSameDay(new Date(e.start_at), date)),
      }
    })
  }, [anchor, tasks.data, reminders.data, events.data])

  const selectedCell = cells.find((c) => isSameDay(c.date, selected)) ?? null
  const loading = tasks.loading || reminders.loading || events.loading
  const error = tasks.error ?? reminders.error ?? events.error

  const monthLabel = `${['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][anchor.getMonth()]} ${anchor.getFullYear()}`

  return (
    <div>
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <h1 className="font-display text-[22px] font-semibold md:text-[26px]">Kalender</h1>
        <div className="flex items-center gap-2">
          <button className="btn btn-sm" onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))} aria-label="Bulan sebelumnya">
            ‹
          </button>
          <span className="min-w-[130px] text-center text-[13.5px] font-semibold">{monthLabel}</span>
          <button className="btn btn-sm" onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))} aria-label="Bulan berikutnya">
            ›
          </button>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => { tasks.reload(); reminders.reload(); events.reload() }} />
      ) : loading ? (
        <div className="card"><Skeleton rows={7} /></div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          {/* Grid */}
          <div className="card overflow-hidden">
            <div className="grid grid-cols-7 border-b border-line">
              {WEEK_ORDER.map((_, i) => (
                <div key={i} className="px-2 py-2 text-center text-[11.5px] font-semibold text-text-muted">
                  {DAY_NAMES[i + 1]?.slice(0, 3) ?? ''}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((cell, i) => {
                const total = cell.tasks.length + cell.reminders.length + cell.events.length
                const isSelected = isSameDay(cell.date, selected)
                const isToday = isSameDay(cell.date, new Date())
                return (
                  <button
                    key={i}
                    onClick={() => setSelected(cell.date)}
                    aria-label={`${formatShortDate(cell.date)}, ${total} aktivitas`}
                    className={`min-h-[62px] border-b border-r border-line p-1.5 text-left align-top transition-colors hover:bg-bg-hover sm:min-h-[78px] ${
                      cell.inMonth ? '' : 'opacity-35'
                    } ${isSelected ? 'bg-accent-soft shadow-[inset_2px_0_0_theme(colors.accent.DEFAULT)]' : ''}`}
                  >
                    <span className={`inline-flex h-[19px] w-[19px] items-center justify-center rounded-full text-[11.5px] tabular-nums ${isToday ? 'bg-accent font-semibold text-white' : ''}`}>
                      {cell.date.getDate()}
                    </span>
                    {total > 0 && (
                      <span className="mt-1 flex flex-wrap gap-[3px]">
                        {Array.from({ length: Math.min(total, 3) }).map((_, d) => (
                          <span key={d} className="block h-[4px] w-[4px] rounded-full bg-accent" />
                        ))}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Detail hari */}
          <aside className="panel lg:sticky lg:top-4">
            <div className="mb-3 px-3.5 pt-3.5">
              <div className="eyebrow">Detail</div>
              <h3 className="font-display text-[15px] font-semibold">{formatShortDate(selected)}</h3>
            </div>

            {!selectedCell ||
            selectedCell.tasks.length + selectedCell.reminders.length + selectedCell.events.length === 0 ? (
              <p className="px-3.5 pb-3.5 text-[13px] text-text-muted">Tidak ada aktivitas pada tanggal ini.</p>
            ) : (
              <div className="flex flex-col">
                {selectedCell.tasks.length > 0 && (
                  <div className="border-b border-line px-3.5 py-3">
                    <div className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold text-text-muted">
                      <IconTasks size={13} /> TUGAS
                    </div>
                    {selectedCell.tasks.map((t) => (
                      <div key={t.id} className="flex items-center gap-2 py-1 text-[13px]">
                        <span className={`h-[6px] w-[6px] flex-none rounded-full ${t.status === 'completed' ? 'bg-success' : 'bg-accent'}`} />
                        <span className={`truncate ${t.status === 'completed' ? 'text-text-muted line-through' : ''}`}>{t.title}</span>
                        <span className="ml-auto flex-none text-[11.5px] tabular-nums text-text-muted">{formatTime(new Date(t.deadline as string))}</span>
                      </div>
                    ))}
                  </div>
                )}

                {selectedCell.reminders.length > 0 && (
                  <div className="border-b border-line px-3.5 py-3">
                    <div className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold text-text-muted">
                      <IconBell size={13} /> REMINDER
                    </div>
                    {selectedCell.reminders.map((r) => (
                      <div key={r.id} className="flex items-center gap-2 py-1 text-[13px]">
                        <span className="h-[6px] w-[6px] flex-none rounded-full bg-warning" />
                        <span className={`truncate ${r.is_completed ? 'text-text-muted line-through' : ''}`}>{r.title}</span>
                        <span className="ml-auto flex-none text-[11.5px] tabular-nums text-text-muted">{formatTime(new Date(r.reminder_at))}</span>
                      </div>
                    ))}
                  </div>
                )}

                {selectedCell.events.length > 0 && (
                  <div className="px-3.5 py-3">
                    <div className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold text-text-muted">
                      <IconCalendar size={13} /> EVENT
                    </div>
                    {selectedCell.events.map((e) => (
                      <div key={e.id} className="flex items-center gap-2 py-1 text-[13px]">
                        <span className="h-[6px] w-[6px] flex-none rounded-full bg-success" />
                        <span className="truncate">{e.title}</span>
                        <span className="ml-auto flex-none text-[11.5px] tabular-nums text-text-muted">{formatTime(new Date(e.start_at))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
