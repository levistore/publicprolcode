'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  IconCalendar, IconDashboard, IconFiles, IconNotes, IconTasks,
  type IconComponent,
} from '@/components/icons'

interface NavEntry {
  href: string
  label: string
  icon: IconComponent
}

const BOTTOM_NAV: NavEntry[] = [
  { href: '/', label: 'Home', icon: IconDashboard },
  { href: '/tasks', label: 'Tasks', icon: IconTasks },
  { href: '/calendar', label: 'Calendar', icon: IconCalendar },
  { href: '/notes', label: 'Notes', icon: IconNotes },
  { href: '/files', label: 'Files', icon: IconFiles },
]

export function BottomNav() {
  const pathname = usePathname()
  const [hydrated, setHydrated] = useState(false)

  // Hindari mismatch highlight saat SSR
  useState(() => setHydrated(true))
  void hydrated

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-[rgba(20,22,27,0.92)] pb-[var(--safe-bottom)] backdrop-blur-[14px] md:hidden"
      aria-label="Navigasi utama"
    >
      <div className="flex items-center justify-around">
        {BOTTOM_NAV.map((entry) => {
          const active = pathname === entry.href
          return (
            <Link
              key={entry.href}
              href={entry.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 pb-2 pt-2.5 text-[10.5px] font-medium transition-colors ${
                active ? 'text-accent' : 'text-text-muted'
              }`}
            >
              <entry.icon size={19} />
              {entry.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
