'use client'

import { useMemo, useState } from 'react'
import { useResource } from '@/hooks/useResource'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { notesService, subjectsService } from '@/lib/data/services'
import { ConfirmModal, EmptyState, ErrorState, Skeleton, SubjectDot } from '@/components/ui'
import { NoteForm } from '@/components/forms/forms'
import { IconNotes, IconPin, IconPlus, IconSearch, IconTrash } from '@/components/icons'
import { formatShortDate } from '@/lib/date'
import type { Note, Subject } from '@/types'

export default function NotesPage() {
  const { client } = useAuth()
  const toast = useToast()
  const notes = useResource<Note[]>((c) => notesService.list(c), [])
  const subjects = useResource<Subject[]>((c) => subjectsService.list(c), [])

  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Note | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Note | null>(null)
  const [viewing, setViewing] = useState<Note | null>(null)

  const subjectMap = useMemo(() => {
    const m = new Map<string, Subject>()
    subjects.data.forEach((s) => m.set(s.id, s))
    return m
  }, [subjects.data])

  const filtered = useMemo(() => {
    let rows = notes.data.filter((n) => !n.is_archived)
    if (query.trim()) {
      const q = query.toLowerCase()
      rows = rows.filter((n) => (n.title ?? '').toLowerCase().includes(q) || (n.content ?? '').toLowerCase().includes(q))
    }
    return [...rows].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
  }, [notes.data, query])

  const archivedCount = notes.data.filter((n) => n.is_archived).length

  async function togglePin(n: Note) {
    try {
      await notesService.update(client, n.id, { is_pinned: !n.is_pinned })
      notes.reload()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Gagal memperbarui', 'error')
    }
  }

  async function toggleArchive(n: Note) {
    try {
      await notesService.update(client, n.id, { is_archived: !n.is_archived })
      notes.reload()
      toast(n.is_archived ? 'Note dibuka lagi' : 'Note diarsipkan')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Gagal memperbarui', 'error')
    }
  }

  async function remove(n: Note) {
    try {
      await notesService.remove(client, n.id)
      notes.reload()
      toast('Note dihapus')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Gagal menghapus', 'error')
    }
  }

  return (
    <div>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[22px] font-semibold md:text-[26px]">Catatan</h1>
        <button className="btn btn-primary" onClick={() => setEditing('new')}>
          <IconPlus size={15} /> Catatan
        </button>
      </div>

      <div className="relative mb-3.5 max-w-[420px]">
        <IconSearch size={15} className="pointer-events-none absolute left-3 top-[11px] text-text-muted" />
        <input
          className="input pl-[34px]" placeholder="Cari catatan…"
          value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Cari catatan"
        />
      </div>

      {notes.error ? (
        <ErrorState message={notes.error} onRetry={notes.reload} />
      ) : notes.loading ? (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card p-3.5"><Skeleton rows={3} /></div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            mascot
            icon={IconNotes}
            title={query ? 'Tidak ada catatan yang cocok' : archivedCount > 0 ? 'Semua catatan terarsip' : 'Belum ada catatan'}
            text={
              query
                ? 'Coba kata pencarian lain.'
                : archivedCount > 0
                  ? 'Buka arsip untuk melihat catatan yang disembunyikan.'
                  : 'Simpan materi pelajaran, rumus, atau catatan cepat sebelum lupa.'
            }
            action={
              !query && (
                <button className="btn btn-sm btn-primary" onClick={() => setEditing('new')}>
                  <IconPlus size={14} /> Tulis Catatan
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((n) => {
            const subject = n.subject_id ? subjectMap.get(n.subject_id) : undefined
            return (
              <article
                key={n.id}
                className="card group cursor-pointer p-3.5 transition-transform hover:-translate-y-px"
                onClick={() => setViewing(n)}
              >
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">{n.title}</h3>
                  {n.is_pinned && <IconPin size={14} className="flex-none text-accent" />}
                </div>
                <p className="mb-2.5 line-clamp-3 text-[12.5px] leading-relaxed text-text-muted">
                  {n.content || '—'}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-text-muted">
                  {n.category && <span className="badge">{n.category}</span>}
                  {subject && (
                    <span className="inline-flex items-center gap-1.5">
                      <SubjectDot color={subject.color} />{subject.name}
                    </span>
                  )}
                  <span className="ml-auto">{formatShortDate(new Date(n.updated_at))}</span>
                </div>
                <div className="mt-2.5 flex gap-1 border-t border-line pt-2.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    className="btn btn-sm" onClick={(e) => { e.stopPropagation(); void togglePin(n) }}
                    aria-label={n.is_pinned ? 'Lepas pin' : 'Pin'}
                  >
                    <IconPin size={13} /> {n.is_pinned ? 'Lepas' : 'Pin'}
                  </button>
                  <button
                    className="btn btn-sm" onClick={(e) => { e.stopPropagation(); void toggleArchive(n) }}
                    aria-label={n.is_archived ? 'Buka arsip' : 'Arsipkan'}
                  >
                    Arsip
                  </button>
                  <button className="btn btn-sm btn-danger ml-auto" onClick={(e) => { e.stopPropagation(); setDeleting(n) }}>
                    <IconTrash size={13} />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {editing && (
        <NoteForm
          initial={editing === 'new' ? null : editing}
          onClose={() => { setEditing(null); notes.reload() }}
        />
      )}
      {viewing && (
        <NoteViewerModal note={viewing} onEdit={() => { setEditing(viewing); setViewing(null) }} onClose={() => setViewing(null)} />
      )}
      {deleting && (
        <ConfirmModal
          title="Hapus catatan?"
          text={`"${deleting.title}" akan dihapus permanen.`}
          onConfirm={() => void remove(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  )
}

/* Read-only viewer dengan pre-wrap sederhana (markdown parser di luar MVP). */
function NoteViewerModal({ note, onEdit, onClose }: { note: Note; onEdit: () => void; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={note.title || "Catatan"}>
      <div className="modal max-w-[640px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-line p-4">
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg font-semibold">{note.title}</h2>
            <p className="text-xs text-text-muted">Diperbarui {formatShortDate(new Date(note.updated_at))}</p>
          </div>
          <button className="btn btn-icon" onClick={onClose} aria-label="Tutup">×</button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4 text-sm leading-relaxed whitespace-pre-wrap">
          {note.content || '—'}
        </div>
        <div className="flex justify-end gap-2 border-t border-line p-3.5">
          <button className="btn" onClick={onClose}>Tutup</button>
          <button className="btn btn-primary" onClick={onEdit}>Edit</button>
        </div>
      </div>
    </div>
  )
}
