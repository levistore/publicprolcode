'use client'

import { Mascot } from '@/components/brand/Mascot'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { SearchModal } from '@/components/search/SearchModal'
import { QuickAddModal, type QuickAddKind } from '@/components/forms/QuickAddModal'
import { useAuth } from '@/components/providers/AuthProvider'
import { useReminderScheduler } from '@/hooks/useReminderScheduler'
import { IconPlus, IconSearch } from '@/components/icons'

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/tasks': 'Tasks',
  '/calendar': 'Calendar',
  '/notes': 'Notes',
  '/files': 'Files',
  '/subjects': 'Subjects',
  '/reminders': 'Reminders',
  '/schedule': 'School Schedule',
  '/events': 'Events',
  '/profile': 'Profile',
  '/settings': 'Settings',
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useAuth()
  const [searchOpen, setSearchOpen] = useState(false)
  const [quickAdd, setQuickAdd] = useState<QuickAddKind | null>(null)

  /* Penjadwal reminder: aktif selama pengguna masuk. */
  useReminderScheduler()

  /* Protected route di sisi client (melengkapi middleware). */
  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [loading, user, router])

  /* Cmd/Ctrl+K -> global search */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="flex flex-col items-center gap-4">
          <Mascot size={88} priority />
          <span className="h-[22px] w-[22px] animate-spin rounded-full border-[2.5px] border-black/10 border-t-ink" />
        </div>
      </div>
    )
  }

  const title = TITLES[pathname] ?? 'ClassHub'

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="relative z-[1] flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[54px] items-center gap-3 border-b border-line bg-[rgba(247,247,248,0.82)] px-3.5 backdrop-blur-[12px] md:h-[60px] md:px-[22px]">
          <span className="font-display text-[15px] font-semibold">{title}</span>

          <button
            className="ml-auto flex items-center gap-2.5 rounded-sm border border-line bg-bg-inset px-3 py-2 text-[13px] text-text-muted transition-colors hover:border-line-strong hover:text-text-secondary md:min-w-[220px]"
            onClick={() => setSearchOpen(true)}
          >
            <IconSearch size={15} />
            <span className="hidden md:inline">Cari…</span>
            <span className="ml-auto hidden rounded-[5px] border border-line-strong px-1.5 py-0.5 text-[11px] text-text-muted md:inline">
              ⌘K
            </span>
          </button>

          <button className="btn btn-primary btn-sm" onClick={() => setQuickAdd('task')}>
            <IconPlus size={14} />
            <span className="hidden sm:inline">Tambah</span>
          </button>
        </header>

        <div className="animate-pageIn mx-auto w-full max-w-[1240px] px-3.5 pb-[calc(96px+var(--safe-bottom))] pt-4 md:px-[22px] md:pb-10 md:pt-6">
          {children}
        </div>
      </main>

      <BottomNav />

      <button
        className="fixed bottom-[calc(74px+var(--safe-bottom))] right-4 z-[45] hidden h-[54px] w-[54px] place-items-center rounded-full bg-ink text-white shadow-[0_10px_26px_-8px_rgba(17,17,17,0.55)] max-md:grid"
        onClick={() => setQuickAdd('task')}
        aria-label="Tambah cepat"
      >
        <IconPlus size={22} />
      </button>

      {searchOpen && (
        <SearchModal onClose={() => setSearchOpen(false)} onNavigate={(href) => router.push(href)} />
      )}
      {quickAdd && <QuickAddModal kind={quickAdd} onClose={() => setQuickAdd(null)} />}
    </div>
  )
}
