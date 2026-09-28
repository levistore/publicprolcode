'use client'

import { useEffect, useMemo, useState } from 'react'
import { useResource } from '@/hooks/useResource'
import Image from 'next/image'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import {
  remindersService, schedulesService, subjectsService, tasksService,
} from '@/lib/data/services'
import { EmptyState, ErrorState, Skeleton, StatCard, SubjectDot } from '@/components/ui'
import { TaskForm } from '@/components/forms/forms'
import { QuickAddModal } from '@/components/forms/QuickAddModal'
import {
  IconBell, IconCalendar, IconCheck, IconClock, IconFiles, IconNotes, IconPlus, IconTasks,
} from '@/components/icons'
import {
  countdownTo, dayKeyForDate, formatShortDate, formatTime, greetingFor,
  isSameDay, parseTimeOnDate, relativeDeadline, startOfDay, toISODate,
} from '@/lib/date'
import type { Reminder, Schedule, Subject, Task } from '@/types'

const PRIORITY_BADGE: Record<string, string> = {
  high: 'badge badge-high',
  medium: 'badge badge-medium',
  low: 'badge',
}
const PRIORITY_LABEL: Record<string, string> = { high: 'Tinggi', medium: 'Sedang', low: 'Rendah' }

export default function DashboardPage() {
  const { user, client } = useAuth()
  const toast = useToast()

  const tasks = useResource<Task[]>((c) => tasksService.list(c), [])
  const reminders = useResource<Reminder[]>((c) => remindersService.list(c), [])
  const schedules = useResource<Schedule[]>((c) => schedulesService.list(c), [])
  const subjects = useResource<Subject[]>((c) => subjectsService.list(c), [])

  const [now, setNow] = useState<Date | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [quickAdd, setQuickAdd] = useState<'task' | 'reminder' | 'note' | 'event' | null>(null)

  // Hindari perbedaan render server/client
  useEffect(() => {
    setNow(new Date())
    const t = window.setInterval(() => setNow(new Date()), 30000)
    return () => window.clearInterval(t)
  }, [])

  const subjectMap = useMemo(() => {
    const m = new Map<string, Subject>()
    subjects.data.forEach((s) => m.set(s.id, s))
    return m
  }, [subjects.data])

  const stats = useMemo(() => {
    if (!now) return { today: 0, overdue: 0, reminders: 0, schedule: 0 }
    const overdue = tasks.data.filter(
      (t) => t.status !== 'completed' && t.deadline && new Date(t.deadline) < startOfDay(now),
    )
    const today = tasks.data.filter(
      (t) => t.deadline && isSameDay(new Date(t.deadline), now) && t.status !== 'completed',
    )
    const activeReminders = reminders.data.filter((r) => !r.is_completed)
    const todaySchedule = schedules.data.filter((s) => s.day_of_week === dayKeyForDate(now))
    return {
      today: today.length,
      overdue: overdue.length,
      reminders: activeReminders.length,
      schedule: todaySchedule.length,
    }
  }, [tasks.data, reminders.data, schedules.data, now])

  const upcoming = useMemo(
    () =>
      tasks.data
        .filter((t) => t.status !== 'completed')
        .sort((a, b) => {
          if (!a.deadline && !b.deadline) return 0
          if (!a.deadline) return 1
          if (!b.deadline) return -1
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        })
        .slice(0, 5),
    [tasks.data],
  )

  const nearestReminders = useMemo(
    () =>
      reminders.data
        .filter((r) => !r.is_completed && new Date(r.reminder_at).getTime() >= Date.now() - 3600_000)
        .slice(0, 4),
    [reminders.data],
  )

  const todaySchedule = useMemo(() => {
    if (!now) return []
    const key = dayKeyForDate(now)
    return schedules.data
      .filter((s) => s.day_of_week === key)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
  }, [schedules.data, now])

  const nextSchedule = useMemo(() => {
    if (!now) return null
    const iso = toISODate(now)
    const candidates = todaySchedule
      .map((s) => ({ schedule: s, start: parseTimeOnDate(iso, s.start_time) }))
      .filter((x) => x.start && x.start.getTime() > now.getTime())
      .sort((a, b) => (a.start?.getTime() ?? 0) - (b.start?.getTime() ?? 0))
    return candidates[0] ?? null
  }, [todaySchedule, now])

  const [countdown, setCountdown] = useState('')
  useEffect(() => {
    if (!nextSchedule?.start) return
    const update = () => setCountdown(countdownTo(nextSchedule.start as Date))
    update()
    const t = window.setInterval(update, 1000)
    return () => window.clearInterval(t)
  }, [nextSchedule])

  async function toggleTask(task: Task) {
    try {
      await tasksService.toggleStatus(client, task)
      tasks.reload()
      toast(task.status === 'completed' ? 'Task dibuka lagi' : 'Task selesai')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Gagal memperbarui', 'error')
    }
  }

  async function completeReminder(reminder: Reminder) {
    try {
      await remindersService.update(client, reminder.id, { is_completed: true })
      reminders.reload()
      toast('Reminder selesai')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Gagal memperbarui', 'error')
    }
  }

  const loading = tasks.loading || reminders.loading || schedules.loading
  const error = tasks.error ?? reminders.error ?? schedules.error

  if (error) {
    return (
      <div className="p-3.5">
        <ErrorState message={error} onRetry={() => { tasks.reload(); reminders.reload(); schedules.reload() }} />
      </div>
    )
  }

  return (
    <div>
      {/* Greeting */}
      <div className="mb-4">
        <h1 className="font-display text-[25px] font-semibold tracking-[-0.022em]">
          {now ? `${greetingFor(now)}, ${user?.displayName ?? 'Siswa'}` : 'Memuat…'}
        </h1>
        <p className="mt-0.5 text-[13.5px] text-text-muted">
          {now
            ? `${['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][now.getDay()]}, ${now.getDate()} ${['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][now.getMonth()]} ${now.getFullYear()}`
            : '—'}
        </p>
      </div>

      {/* Banner */}
      <div className="mb-5 overflow-hidden rounded-[22px]">
        <Image
          src="/banner-dashboard.png"
          alt="Banner ClassHub"
          width={1672}
          height={940}
          priority
          className="h-auto w-full"
        />
      </div>

      {loading || !now ? (
        <>
          <div className="mb-3.5 grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3.5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border border-line bg-bg-panel p-4">
                <div className="skeleton mb-2 h-3 w-[60%]" />
                <div className="skeleton h-6 w-[40%]" />
              </div>
            ))}
          </div>
          <div className="card"><Skeleton rows={4} /></div>
        </>
      ) : (
        <>
          {/* Today overview */}
          <div className="mb-3.5 grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3.5">
            <StatCard icon={IconTasks} label="Task hari ini" value={stats.today} />
            <StatCard icon={IconClock} label="Overdue" value={stats.overdue} />
            <StatCard icon={IconBell} label="Reminder aktif" value={stats.reminders} />
            <StatCard icon={IconCalendar} label="Jadwal hari ini" value={stats.schedule} />
          </div>

          <div className="grid grid-cols-1 items-start gap-3.5 md:grid-cols-2">
            {/* Kiri */}
            <div className="flex flex-col gap-3.5">
              {/* Today's schedule */}
              <section className="panel">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-display text-base font-semibold">Jadwal Hari Ini</h3>
                  {nextSchedule && countdown && (
                    <span className="badge badge-progress tabular-nums">{countdown} → berikutnya</span>
                  )}
                </div>

                {todaySchedule.length === 0 ? (
                  <EmptyState
                    mascot
                    icon={IconCalendar}
                    title="Belum ada jadwal hari ini"
                    text="Atur jadwal pelajaran supaya dashboard selalu tahu jam berapa kamu ke mana."
                    action={
                      <a className="btn btn-sm" href="/schedule">Atur Jadwal</a>
                    }
                  />
                ) : (
                  <div>
                    {todaySchedule.map((s) => {
                      const start = parseTimeOnDate(toISODate(now), s.start_time)
                      const end = parseTimeOnDate(toISODate(now), s.end_time)
                      const state =
                        !start || !end ? 'upcoming'
                          : now >= end ? 'completed'
                            : now >= start ? 'current' : 'upcoming'
                      const subject = s.subject_id ? subjectMap.get(s.subject_id) : undefined
                      return (
                        <div
                          key={s.id}
                          className={`flex items-center gap-3.5 border-b border-line px-3.5 py-2.5 last:border-b-0 ${
                            state === 'current'
                              ? 'bg-accent-soft shadow-[inset_2px_0_0_var(--tw-shadow,theme(colors.accent.DEFAULT))]'
                              : state === 'completed' ? 'opacity-50' : ''
                          }`}
                        >
                          <span className="w-[92px] flex-none text-[13px] font-semibold tabular-nums text-text-secondary">
                            {s.start_time}–{s.end_time}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 text-sm font-medium">
                              <SubjectDot color={subject?.color} />
                              <span className="truncate">{subject?.name ?? 'Mata pelajaran'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-text-muted">
                              {(s.room || subject?.room) && <span>{s.room || subject?.room}</span>}
                              {(s.teacher || subject?.teacher) && <span>{s.teacher || subject?.teacher}</span>}
                            </div>
                          </div>
                          {state === 'current' && <span className="badge badge-progress">Sekarang</span>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>

              {/* Upcoming tasks */}
              <section className="panel">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-display text-base font-semibold">Tugas Terdekat</h3>
                  <a className="btn btn-ghost btn-sm" href="/tasks">Lihat semua</a>
                </div>

                {upcoming.length === 0 ? (
                  <EmptyState
                    icon={IconTasks}
                    title="Tidak ada tugas mendatang"
                    text="Tambahkan tugas pertama kamu agar deadline tidak lagi hilang di antara chat dan screenshot."
                    action={
                      <button className="btn btn-sm btn-primary" onClick={() => setQuickAdd('task')}>
                        <IconPlus size={14} /> Tambah Task
                      </button>
                    }
                  />
                ) : (
                  <div className="flex flex-col">
                    {upcoming.map((t) => {
                      const dl = t.deadline ? new Date(t.deadline) : null
                      const overdue = dl ? dl < now && t.status !== 'completed' : false
                      const dueSoon = dl ? !overdue && t.status !== 'completed' && dl.getTime() - now.getTime() < 24 * 3600_000 : false
                      const subject = t.subject_id ? subjectMap.get(t.subject_id) : undefined
                      return (
                        <div
                          key={t.id}
                          className={`flex items-start gap-3 border-b border-line px-3.5 py-3 last:border-b-0 ${
                            overdue ? 'border-l-2 border-l-danger bg-[linear-gradient(90deg,rgba(212,100,92,0.07),transparent_40%)]'
                              : dueSoon ? 'border-l-2 border-l-warning bg-warning-soft' : ''
                          }`}
                        >
                          <button
                            className="tick" data-on={t.status === 'completed'}
                            onClick={() => void toggleTask(t)}
                            aria-label={t.status === 'completed' ? 'Buka lagi' : 'Tandai selesai'}
                          >
                            <IconCheck size={12} />
                          </button>
                          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setEditingTask(t)}>
                            <div className={`truncate text-sm font-medium ${t.status === 'completed' ? 'text-text-muted line-through' : ''}`}>
                              {t.title}
                            </div>
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
                              <span className={PRIORITY_BADGE[t.priority] ?? 'badge'}>
                                {PRIORITY_LABEL[t.priority] ?? t.priority}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            </div>

            {/* Kanan */}
            <div className="flex flex-col gap-3.5">
              {/* Quick actions */}
              <section className="panel">
                <div className="mb-3"><h3 className="font-display text-base font-semibold">Tambah Cepat</h3></div>
                <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
                  {(
                    [
                      ['task', 'Task', IconTasks],
                      ['reminder', 'Reminder', IconBell],
                      ['note', 'Catatan', IconNotes],
                      ['event', 'Event', IconCalendar],
                      ['file', 'File', IconFiles],
                    ] as const
                  ).map(([k, label, Icon]) => (
                    <button
                      key={k}
                      className="flex flex-col items-center gap-1.5 rounded-md border border-line bg-bg-inset px-1.5 py-2.5 text-[11.5px] font-medium text-text-secondary transition-all hover:-translate-y-px hover:border-line-strong hover:bg-bg-hover hover:text-text"
                      onClick={() => (k === 'file' ? (window.location.href = '/files') : setQuickAdd(k))}
                    >
                      <Icon size={17} />
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Reminders */}
              <section className="panel">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-display text-base font-semibold">Reminder Terdekat</h3>
                  <a className="btn btn-ghost btn-sm" href="/reminders">Semua</a>
                </div>

                {nearestReminders.length === 0 ? (
                  <EmptyState
                    icon={IconBell}
                    title="Tidak ada reminder"
                    text="Reminder untuk hal kecil: besok bawa laporan, jangan lupa bayar fotokopi."
                    action={
                      <button className="btn btn-sm" onClick={() => setQuickAdd('reminder')}>
                        <IconPlus size={14} /> Tambah Reminder
                      </button>
                    }
                  />
                ) : (
                  <div className="flex flex-col">
                    {nearestReminders.map((r) => (
                      <div key={r.id} className="flex items-start gap-3 border-b border-line px-3.5 py-3 last:border-b-0">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{r.title}</div>
                          <div className="text-xs tabular-nums text-text-muted">
                            {formatShortDate(new Date(r.reminder_at))}, {formatTime(new Date(r.reminder_at))} — {relativeDeadline(r.reminder_at)}
                          </div>
                        </div>
                        <button className="tick" onClick={() => void completeReminder(r)} aria-label="Selesaikan reminder">
                          <IconCheck size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </>
      )}

      {editingTask && <TaskForm initial={editingTask} onClose={() => { setEditingTask(null); tasks.reload() }} />}
      {quickAdd === 'task' && <TaskForm onClose={() => { setQuickAdd(null); tasks.reload() }} />}
      {quickAdd && quickAdd !== 'task' && (
        <QuickAddLazy kind={quickAdd} onClose={() => { setQuickAdd(null); tasks.reload(); reminders.reload() }} />
      )}
    </div>
  )
}

/* Wrapper quick-add untuk selain task. */
function QuickAddLazy({
  kind, onClose,
}: {
  kind: 'reminder' | 'note' | 'event'
  onClose: () => void
}) {
  return <QuickAddModal kind={kind} onClose={onClose} />
}
