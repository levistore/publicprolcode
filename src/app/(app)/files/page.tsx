'use client'

import { useCallback, useMemo, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useResource } from '@/hooks/useResource'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { filesService, subjectsService } from '@/lib/data/services'
import { ConfirmModal, EmptyState, ErrorState, Modal, Skeleton, SubjectDot } from '@/components/ui'
import { UploadModal } from '@/components/files/UploadModal'
import { FileTypeIcon, fileKindClass } from '@/components/files/FileIcon'
import {
  IconDownload, IconFiles, IconPencil, IconSearch, IconTrash, IconUpload,
} from '@/components/icons'
import { formatShortDate } from '@/lib/date'
import {
  FILE_CATEGORY_LABELS, FILE_CATEGORY_SLUGS, formatBytesLabel,
  normalizeCategory, type FileCategorySlug, type FileKind,
} from '@/lib/files/validate'
import type { FileRow, Subject } from '@/types'

const KIND_LABELS: Record<FileKind, string> = {
  pdf: 'PDF',
  doc: 'Dokumen',
  sheet: 'Spreadsheet',
  slide: 'Presentasi',
  image: 'Gambar',
  text: 'Teks',
  archive: 'Arsip',
  other: 'Lainnya',
}

export default function FilesPage() {
  const { client } = useAuth()
  const toast = useToast()

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [kind, setKind] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editing, setEditing] = useState<FileRow | null>(null)
  const [deleting, setDeleting] = useState<FileRow | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const subjects = useResource<Subject[]>((c) => subjectsService.list(c), [])

  const files = useResource<FileRow[]>(
    useCallback(
      (c: SupabaseClient | null) => filesService.list(c, { query, category, subjectId, kind }),
      [query, category, subjectId, kind],
    ),
    [] as FileRow[],
    [query, category, subjectId, kind],
  )

  const subjectMap = useMemo(() => {
    const m = new Map<string, Subject>()
    subjects.data.forEach((s) => m.set(s.id, s))
    return m
  }, [subjects.data])

  const totalSize = useMemo(
    () => files.data.reduce((sum, f) => sum + (f.size ?? 0), 0),
    [files.data],
  )

  async function download(row: FileRow) {
    setBusyId(row.id)
    try {
      const url = await filesService.downloadUrl(client, row)
      const a = document.createElement('a')
      a.href = url
      a.download = row.name
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Gagal mengunduh file.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(row: FileRow) {
    setBusyId(row.id)
    try {
      await filesService.remove(client, row)
      files.reload()
      toast('File dihapus')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Gagal menghapus file.', 'error')
      files.reload()
    } finally {
      setBusyId(null)
      setDeleting(null)
    }
  }

  const hasFilter = Boolean(query || category || subjectId || kind)

  return (
    <div>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] font-semibold md:text-[26px]">File Vault</h1>
          {files.data.length > 0 && (
            <p className="text-xs text-text-muted">
              {files.data.length} file · {formatBytesLabel(totalSize)}
            </p>
          )}
        </div>
        <button className="btn btn-primary" onClick={() => setUploadOpen(true)}>
          <IconUpload size={15} /> Upload File
        </button>
      </div>

      {/* Filter — dikirim ke server, bukan difilter berat di client */}
      <div className="mb-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <IconSearch size={15} className="pointer-events-none absolute left-3 top-[11px] text-text-muted" />
          <input
            className="input pl-[34px]" placeholder="Cari nama file…"
            value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Cari file"
          />
        </div>
        <select
          className="select" value={category} onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter kategori"
        >
          <option value="">Semua kategori</option>
          {FILE_CATEGORY_SLUGS.map((c) => (
            <option key={c} value={c}>{FILE_CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <select
          className="select" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}
          aria-label="Filter mata pelajaran"
        >
          <option value="">Semua mapel</option>
          {subjects.data.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          className="select" value={kind} onChange={(e) => setKind(e.target.value)}
          aria-label="Filter jenis file"
        >
          <option value="">Semua jenis</option>
          {(Object.keys(KIND_LABELS) as FileKind[]).map((k) => (
            <option key={k} value={k}>{KIND_LABELS[k]}</option>
          ))}
        </select>
      </div>

      {files.error ? (
        <ErrorState message={files.error} onRetry={files.reload} />
      ) : files.loading ? (
        <div className="card"><Skeleton rows={5} /></div>
      ) : files.data.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={IconFiles}
            title={hasFilter ? 'Tidak ada file yang cocok' : 'Belum ada file'}
            text={
              hasFilter
                ? 'Coba ubah kata pencarian atau filter.'
                : 'Materi pelajaran, tugas, dan presentasi tersimpan di sini.'
            }
            action={
              hasFilter ? (
                <button
                  className="btn btn-sm"
                  onClick={() => { setQuery(''); setCategory(''); setSubjectId(''); setKind('') }}
                >
                  Reset filter
                </button>
              ) : (
                <button className="btn btn-sm btn-primary" onClick={() => setUploadOpen(true)}>
                  <IconUpload size={14} /> Upload File
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          {files.data.map((f) => {
            const subject = f.subject_id ? subjectMap.get(f.subject_id) : undefined
            const busy = busyId === f.id
            return (
              <div key={f.id} className="flex items-center gap-3 border-b border-line px-3.5 py-3 last:border-b-0">
                <span className={`flex-none ${fileKindClass(f.mime_type ?? '', f.name)}`}>
                  <FileTypeIcon mime={f.mime_type ?? ''} name={f.name} size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{f.name}</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                    <span className="badge">
                      {FILE_CATEGORY_LABELS[normalizeCategory(f.category)]}
                    </span>
                    {subject && (
                      <span className="inline-flex items-center gap-1.5">
                        <SubjectDot color={subject.color} />{subject.name}
                      </span>
                    )}
                    <span className="tabular-nums">{formatBytesLabel(f.size ?? 0)}</span>
                    <span>{formatShortDate(new Date(f.created_at))}</span>
                  </div>
                </div>

                <div className="flex flex-none items-center gap-0.5">
                  <button
                    className="btn btn-icon" onClick={() => void download(f)}
                    disabled={busy} aria-label={`Unduh ${f.name}`}
                  >
                    {busy ? <span className="spinner" /> : <IconDownload size={15} />}
                  </button>
                  <button
                    className="btn btn-icon" onClick={() => setEditing(f)}
                    aria-label={`Ubah ${f.name}`}
                  >
                    <IconPencil size={15} />
                  </button>
                  <button
                    className="btn btn-icon btn-danger" onClick={() => setDeleting(f)}
                    disabled={busy} aria-label={`Hapus ${f.name}`}
                  >
                    <IconTrash size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {uploadOpen && (
        <UploadModal
          subjects={subjects.data}
          onClose={() => setUploadOpen(false)}
          onUploaded={files.reload}
        />
      )}

      {editing && (
        <EditFileModal
          row={editing}
          subjects={subjects.data}
          onClose={() => { setEditing(null); files.reload() }}
        />
      )}

      {deleting && (
        <ConfirmModal
          title="Hapus file?"
          text={`"${deleting.name}" akan dihapus permanen dari penyimpanan.`}
          onConfirm={() => void remove(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  )
}

/* --------------------------- Edit metadata ---------------------------- */

function EditFileModal({
  row, subjects, onClose,
}: {
  row: FileRow
  subjects: Subject[]
  onClose: () => void
}) {
  const { client } = useAuth()
  const toast = useToast()
  const [name, setName] = useState(row.name)
  const [category, setCategory] = useState<FileCategorySlug>(normalizeCategory(row.category))
  const [subjectId, setSubjectId] = useState(row.subject_id ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (!name.trim()) {
      setError('Nama file tidak boleh kosong.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await filesService.update(client, row.id, {
        name: name.trim(),
        category,
        subject_id: subjectId || null,
      })
      toast('Perubahan disimpan')
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan perubahan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Ubah File"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" onClick={() => void save()} disabled={saving}>
            {saving ? <span className="spinner" /> : null} Simpan
          </button>
        </>
      }
    >
      <div className="space-y-3.5">
        <label className="block">
          <span className="eyebrow mb-1 block">Nama file</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <label className="block">
            <span className="eyebrow mb-1 block">Kategori</span>
            <select
              className="select" value={category}
              onChange={(e) => setCategory(e.target.value as FileCategorySlug)}
            >
              {FILE_CATEGORY_SLUGS.map((c) => (
                <option key={c} value={c}>{FILE_CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="eyebrow mb-1 block">Mata pelajaran</span>
            <select className="select" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">Tanpa mapel</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        </div>

        {error && (
          <p className="rounded-lg border border-danger/30 bg-[rgba(212,100,92,0.08)] px-3 py-2.5 text-[13px] text-danger">
            {error}
          </p>
        )}

        <p className="text-xs text-text-muted">
          Hanya metadata yang diubah. Berkas di penyimpanan tetap sama.
        </p>
      </div>
    </Modal>
  )
}
