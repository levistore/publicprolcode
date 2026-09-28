'use client'

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react'

type ToastKind = 'ok' | 'error'

interface Toast {
  id: number
  message: string
  kind: ToastKind
}

const ToastContext = createContext<((message: string, kind?: ToastKind) => void) | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)

  const push = useCallback((message: string, kind: ToastKind = 'ok') => {
    const id = (idRef.current += 1)
    setToasts((prev) => [...prev, { id, message, kind }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 2800)
  }, [])

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        className="pointer-events-none fixed bottom-[calc(88px+var(--safe-bottom))] left-1/2 z-[200] flex w-[min(420px,calc(100vw-32px))] -translate-x-1/2 flex-col items-center gap-2 md:bottom-[calc(20px+var(--safe-bottom))]"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-toastIn w-full rounded-md border bg-bg-panel px-3.5 py-2.5 text-center text-[13.5px] shadow-lg ${
              t.kind === 'error' ? 'border-danger/40 text-[#f0b7b3]' : 'border-line-strong text-text'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast harus dipakai di dalam ToastProvider')
  return ctx
}
