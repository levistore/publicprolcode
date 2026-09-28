'use client'

import { useEffect } from 'react'
import { IconX, type IconComponent } from '@/components/icons'

/* ---------------------------------- Modal ---------------------------------- */

export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex animate-fadeIn items-end justify-center bg-[rgba(8,9,12,0.68)] p-0 backdrop-blur-[3px] md:items-center md:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="max-h-[92vh] w-full animate-sheetIn overflow-y-auto rounded-t-xl border border-line-strong bg-bg-elevated shadow-2xl md:max-h-[88vh] md:max-w-[520px] md:animate-modalIn md:rounded-xl"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="sticky top-0 z-[2] flex items-center justify-between rounded-t-xl border-b border-line bg-bg-elevated px-[18px] py-4">
          <h3 className="font-display text-base font-semibold">{title}</h3>
          <button className="btn btn-icon" onClick={onClose} aria-label="Tutup">
            <IconX />
          </button>
        </div>
        <div className="p-[18px]">{children}</div>
        {footer && (
          <div className="sticky bottom-0 flex justify-end gap-2.5 rounded-b-xl border-t border-line bg-bg-elevated px-[18px] py-3.5 pb-[calc(14px+var(--safe-bottom))] md:pb-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function ConfirmModal({
  title,
  text,
  confirmLabel = 'Hapus',
  onConfirm,
  onClose,
}: {
  title: string
  text: string
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button
            className="btn border-danger/30 bg-transparent text-danger hover:bg-danger-soft"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-text-secondary">{text}</p>
    </Modal>
  )
}

/* ------------------------------- Empty state ------------------------------- */

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon?: IconComponent
  title: string
  text: string
  action?: React.ReactNode
}) {
  return (
    <div className="px-5 py-[34px] text-center">
      {Icon && (
        <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-md border border-line bg-bg-inset text-text-muted">
          <Icon size={20} />
        </div>
      )}
      <div className="mb-1.5 font-display text-[15px] font-semibold">{title}</div>
      <p className="mx-auto mb-3.5 max-w-[320px] text-[13.5px] text-text-muted">{text}</p>
      {action}
    </div>
  )
}

/* ------------------------------- Error state ------------------------------- */

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      className="rounded-md border border-danger/30 bg-danger-soft p-3.5 text-center text-[13.5px] text-[#eab6b2]"
      role="alert"
    >
      <p>Tidak dapat memuat data.</p>
      <p className="mb-2.5 mt-1 text-xs text-text-muted">{message}</p>
      {onRetry && (
        <button className="btn btn-sm" onClick={onRetry}>
          Coba lagi
        </button>
      )}
    </div>
  )
}

/* --------------------------------- Skeleton -------------------------------- */

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b border-line px-3.5 py-3 last:border-b-0">
          <div className="skeleton mb-2 h-3.5" style={{ width: `${68 - i * 9}%` }} />
          <div className="skeleton h-3" style={{ width: '38%' }} />
        </div>
      ))}
    </div>
  )
}

/* --------------------------------- Spinner --------------------------------- */

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2.5 p-5 text-[13.5px] text-text-muted">
      <span className="h-[26px] w-[26px] animate-spin rounded-full border-[2.5px] border-white/20 border-t-accent" />
      {label}
    </div>
  )
}

/* -------------------------------- Stat card -------------------------------- */

export function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: IconComponent
  label: string
  value: number | string
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-bg-panel p-4">
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] text-text-muted">{label}</span>
        <span className="grid h-[30px] w-[30px] place-items-center rounded-lg border border-line bg-bg-inset text-text-secondary">
          <Icon size={15} />
        </span>
      </div>
      <div className="font-display text-[27px] font-bold leading-none tracking-[-0.02em] tabular-nums">
        {value}
      </div>
    </div>
  )
}

/* ------------------------------ Subject dot ------------------------------- */

export function SubjectDot({ color }: { color?: string | null }) {
  return (
    <span
      className="h-2 w-2 flex-none rounded-full"
      style={{ background: color ?? 'var(--tw-color-ink, #111111)' }}
      aria-hidden="true"
    />
  )
}
