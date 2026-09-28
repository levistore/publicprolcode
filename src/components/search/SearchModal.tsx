'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  eventsService, filesService, notesService, remindersService, subjectsService, tasksService,
} from '@/lib/data/services'
import { useAuth } from '@/components/providers/AuthProvider'
import {
  IconCalendar, IconFiles, IconNotes, IconReminders, IconSearch, IconSubjects, IconTasks,
  type IconComponent,
} from '@/components/icons'
import type {
  Event, FileRow, Note, Reminder, SearchResult, SearchResultGroup, Subject, Task,
} from '@/types'

const GROUP_META: Record<SearchResultGroup, { label: string; icon: IconComponent; color: string; href: (id: string) => string }> = {
  tasks: { label: 'Task', icon: IconTasks, color: 'text-accent', href: () => '/tasks' },
  reminders: { label: 'Reminder', icon: IconReminders, color: 'text-warning', href: () => '/reminders' },
  notes: { label: 'Note', icon: IconNotes, color: 'text-success', href: () => '/notes' },
  subjects: { label: 'Subject', icon: IconSubjects, color: 'text-[#9a7bd6]', href: () => '/subjects' },
  files: { label: 'File', icon: IconFiles, color: 'text-warning', href: () => '/files' },
  events: { label: 'Event', icon: IconCalendar, color: 'text-success', href: () => '/events' },
}

export function SearchModal({
  onClose,
  onNavigate,
}: {
  onClose: () => void
  onNavigate: (href: string) => void
}) {
  const { client } = useAuth()
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<SearchResult[] | null>(null)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    let alive = true

    Promise.all([
      tasksService.list(client),
      remindersService.list(client),
      notesService.list(client),
      subjectsService.list(client),
      filesService.list(client),
      eventsService.list(client),
    ])
      .then(([tasks, reminders, notes, subjects, files, events]) => {
        if (!alive) return
        const out: SearchResult[] = []

        ;(tasks as Task[]).forEach((t) =>
          out.push({ id: t.id, group: 'tasks', title: t.title, subtitle: t.description }))
        ;(reminders as Reminder[]).forEach((r) =>
          out.push({ id: r.id, group: 'reminders', title: r.title, subtitle: r.description }))
        ;(notes as Note[]).filter((n) => !n.is_archived).forEach((n) =>
          out.push({ id: n.id, group: 'notes', title: n.title ?? 'Tanpa judul', subtitle: n.content }))
        ;(subjects as Subject[]).forEach((s) =>
          out.push({ id: s.id, group: 'subjects', title: s.name, subtitle: s.teacher }))
        ;(files as FileRow[]).forEach((f) =>
          out.push({ id: f.id, group: 'files', title: f.name, subtitle: f.category }))
        ;(events as Event[]).forEach((e) =>
          out.push({ id: e.id, group: 'events', title: e.title, subtitle: e.location }))

        setRows(out)
      })
      .catch(() => alive && setRows([]))

    return () => {
      alive = false
    }
  }, [client])

  const results = useMemo(() => {
    if (!rows) return []
    const needle = query.trim().toLowerCase()
    if (!needle) return rows.slice(0, 30)
    return rows
      .filter((r) => `${r.title} ${r.subtitle ?? ''}`.toLowerCase().includes(needle))
      .slice(0, 40)
  }, [rows, query])

  useEffect(() => setActive(0), [query])

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' && results[active]) {
      const r = results[active]
      if (r) {
        onNavigate(GROUP_META[r.group].href(r.id))
        onClose()
      }
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  let lastGroup: SearchResultGroup | null = null

  return (
    <div
      className="fixed inset-0 z-[120] flex animate-fadeIn items-start justify-center bg-[rgba(8,9,12,0.68)] p-4 pt-[10vh] backdrop-blur-[3px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-[620px] animate-modalIn overflow-hidden rounded-xl border border-line-strong bg-bg-elevated shadow-2xl"
        role="dialog" aria-modal="true" aria-label="Pencarian global"
      >
        <div className="flex items-center gap-2.5 border-b border-line px-[18px] py-3.5">
          <IconSearch size={17} className="flex-none text-text-muted" />
          <input
            ref={inputRef}
            className="flex-1 border-0 bg-transparent text-[15px] text-text outline-none placeholder:text-text-muted"
            placeholder="Cari task, catatan, file, mapel…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            aria-label="Pencarian global"
          />
          <button className="btn btn-ghost btn-sm" onClick={onClose}>ESC</button>
        </div>

        <div className="max-h-[52vh] overflow-y-auto pb-2">
          {!rows ? (
            <div className="p-[18px]">
              <div className="skeleton mb-3 h-3.5 w-[55%]" />
              <div className="skeleton h-3.5 w-[38%]" />
            </div>
          ) : results.length === 0 ? (
            <div className="p-[30px] text-center text-[13.5px] text-text-muted">
              {query.trim() ? `Tidak ada hasil untuk "${query.trim()}"` : 'Mulai ketik untuk mencari.'}
            </div>
          ) : (
            results.map((item, i) => {
              const meta = GROUP_META[item.group]
              const showLabel = item.group !== lastGroup
              lastGroup = item.group
              return (
                <div key={`${item.group}-${item.id}`}>
                  {showLabel && <div className="eyebrow px-[18px] pb-1.5 pt-3">{meta.label}</div>}
                  <button
                    className={`flex w-full items-center gap-3 border-l-2 px-[18px] py-2.5 text-left transition-colors ${
                      i === active ? 'border-l-accent bg-bg-hover' : 'border-l-transparent'
                    }`}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => {
                      onNavigate(meta.href(item.id))
                      onClose()
                    }}
                  >
                    <span className={`grid flex-none ${meta.color}`}><meta.icon size={15} /></span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{item.title}</span>
                      {item.subtitle && (
                        <span className="block truncate text-xs text-text-muted">
                          {item.subtitle.slice(0, 70)}
                        </span>
                      )}
                    </span>
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
