'use client'

import { useCallback, useRef, useState } from 'react'
import { Modal } from '@/components/ui'
import { useToast } from '@/components/providers/ToastProvider'
import { filesService } from '@/lib/data/services'
import { FileTypeIcon } from '@/components/files/FileIcon'
import { useAuth } from '@/components/providers/AuthProvider'
import { IconUpload, IconX } from '@/components/icons'
import {
  FILE_CATEGORY_LABELS,
  FILE_CATEGORY_SLUGS,
  MAX_FILE_SIZE,
  formatBytesLabel,
  validateFile,
  type FileCategorySlug,
} from '@/lib/files/validate'
import type { FileRow, Subject } from '@/types'

interface Props {
  subjects: Subject[]
  onClose: () => void
  onUploaded: () => void
}

type Phase = 'idle' | 'uploading' | 'done' | 'error'

export function UploadModal({ subjects, onClose, onUploaded }: Props) {
  const { client } = useAuth()
  const toast = useToast()

  const [file, setFile] = useState<File | null>(null)
  const [category, setCategory] = useState<FileCategorySlug>('materials')
  const [subjectId, setSubjectId] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const pick = useCallback(
    (incoming: File | undefined) => {
      if (!incoming) return
      const check = validateFile(incoming, MAX_FILE_SIZE)
      if (!check.ok) {
        setFile(null)
        setError(check.message)
        return
      }
      setError(null)
      setFile(incoming)
    },
    [],
  )

  async function submit() {
    if (!file) return
    setPhase('uploading')
    setProgress(0)
    setError(null)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await filesService.upload(client, {
        file,
        category,
        subjectId: subjectId || null,
        onProgress: setProgress,
      })
      setPhase('done')
      onUploaded()
      toast('File berhasil diunggah')
      window.setTimeout(onClose, 700)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Gagal mengunggah file.'
      setPhase('error')
      setError(message)
      toast(message, 'error')
    } finally {
      abortRef.current = null
    }
  }

  function cancel() {
    abortRef.current?.abort()
    setPhase('idle')
    setProgress(0)
  }

  return (
    <Modal
      title="Upload File"
      onClose={phase === 'uploading' ? () => undefined : onClose}
      footer={
        <>
          {phase === 'uploading' ? (
            <button className="btn" onClick={cancel}>Batalkan</button>
          ) : (
            <button className="btn" onClick={onClose}>{phase === 'done' ? 'Selesai' : 'Batal'}</button>
          )}
          {phase !== 'done' && (
            <button
              className="btn btn-primary" onClick={() => void submit()}
              disabled={!file || phase === 'uploading'}
            >
              {phase === 'uploading' ? <span className="spinner" /> : <IconUpload size={15} />}
              Unggah
            </button>
          )}
        </>
      }
    >
      <div className="space-y-3.5 p-[18px]">
        {/* Dropzone */}
        {!file && phase !== 'done' && (
          <div
            role="button"
            tabIndex={0}
            aria-label="Pilih file atau seret ke sini"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              pick(e.dataTransfer.files?.[0])
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-[opacity,transform,border-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              dragging ? 'scale-[1.01] border-accent bg-accent-soft' : 'border-line hover:border-line-strong'
            }`}
            style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            <IconUpload size={22} className="text-text-secondary" />
            <p className="text-sm font-medium">Klik untuk memilih atau seret file ke sini</p>
            <p className="text-xs text-text-muted">
              PDF, DOC, XLS, PPT, TXT, PNG, JPG, WEBP, ZIP — maks {formatBytesLabel(MAX_FILE_SIZE)}
            </p>
          </div>
        )}

        <input
          ref={inputRef} type="file" className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.webp,.zip"
          onChange={(e) => pick(e.target.files?.[0])}
        />

        {/* Info file terpilih */}
        {file && (
          <div className="flex items-center gap-3 rounded-lg border border-line bg-bg-inset px-3 py-2.5">
            <FileTypeIcon mime={file.type} name={file.name} size={20} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-medium">{file.name}</div>
              <div className="text-xs tabular-nums text-text-muted">
                {formatBytesLabel(file.size)} · {file.type || 'tidak diketahui'}
              </div>
            </div>
            {phase !== 'uploading' && phase !== 'done' && (
              <button className="btn btn-icon" onClick={() => { setFile(null); setError(null) }} aria-label="Hapus pilihan">
                <IconX size={15} />
              </button>
            )}
          </div>
        )}

        {/* Progress */}
        {phase === 'uploading' && (
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs text-text-muted">
              <span>Mengunggah…</span>
              <span className="tabular-nums">{progress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-inset">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {phase === 'done' && (
          <p className="rounded-lg border border-line bg-bg-inset px-3 py-2.5 text-[13px] text-success">
            Upload berhasil.
          </p>
        )}

        {/* Error */}
        {error && (
          <p className="rounded-lg border border-danger/30 bg-[rgba(212,100,92,0.08)] px-3 py-2.5 text-[13px] text-danger">
            {error}
          </p>
        )}

        {/* Kategori & mapel */}
        {file && phase !== 'done' && (
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
              <select
                className="select" value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                <option value="">Tanpa mapel</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
          </div>
        )}
      </div>

    </Modal>
  )
}
