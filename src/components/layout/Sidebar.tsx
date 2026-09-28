'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  IconCalendar, IconFiles, IconGraduation, IconLogOut, IconNotes, IconProfile,
  IconReminders, IconSettings, IconSubjects, IconTasks, IconDashboard,
  type IconComponent,
} from '@/components/icons'
import { useAuth } from '@/components/providers/AuthProvider'

interface NavEntry {
  href: string
  label: string
  icon: IconComponent
}

const PRIMARY: NavEntry[] = [
  { href: '/', label: 'Dashboard', icon: IconDashboard },
  { href: '/tasks', label: 'Tasks', icon: IconTasks },
  { href: '/calendar', label: 'Calendar', icon: IconCalendar },
  { href: '/notes', label: 'Notes', icon: IconNotes },
  { href: '/files', label: 'Files', icon: IconFiles },
]

const SECONDARY: NavEntry[] = [
  { href: '/subjects', label: 'Subjects', icon: IconSubjects },
  { href: '/reminders', label: 'Reminders', icon: IconReminders },
  { href: '/schedule', label: 'Schedule', icon: IconCalendar },
  { href: '/events', label: 'Events', icon: IconCalendar },
]

const FOOTER: NavEntry[] = [
  { href: '/profile', label: 'Profile', icon: IconProfile },
  { href: '/settings', label: 'Settings', icon: IconSettings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const [reminderCount, setReminderCount] = useState(0)

  useEffect(() => {
    let mounted = true
    import('@/lib/supabase/client')
      .then(async ({ createClient }) => {
        const client = createClient()
        if (!client) return
        const { count } = await client
          .from('reminders')
          .select('*', { count: 'exact', head: true })
          .eq('is_completed', false)
        if (mounted) setReminderCount(count ?? 0)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [pathname])

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] flex-none flex-col gap-1 border-r border-line bg-bg-elevated p-5 py-5 md:flex">
      <div className="mb-5 flex items-center gap-2.5 px-2.5">
        <div className="grid h-[30px] w-[30px] flex-none place-items-center rounded-[9px] bg-gradient-to-br from-accent to-[#2f6ad9] shadow-[0_4px_14px_-6px_rgba(77,141,255,0.8)]">
          <IconGraduation size={16} className="text-white" />
        </div>
        <span className="font-display text-base font-bold tracking-[-0.02em]">ClassHub</span>
      </div>

      {PRIMARY.map((entry) => (
        <Link key={entry.href} href={entry.href} className="nav-item" data-active={isActive(entry.href)}>
          <entry.icon size={17} />
          {entry.label}
        </Link>
      ))}

      <div className="eyebrow px-2.5 pb-1.5 pt-4">Akademik</div>
      {SECONDARY.map((entry) => (
        <Link key={entry.href} href={entry.href} className="nav-item" data-active={isActive(entry.href)}>
          <entry.icon size={17} />
          {entry.label}
          {entry.href === '/reminders' && reminderCount > 0 && (
            <span className="ml-auto rounded-full border border-line bg-bg-inset px-1.5 py-0.5 text-[11px] tabular-nums text-text-muted">
              {reminderCount}
            </span>
          )}
        </Link>
      ))}

      <div className="mt-auto border-t border-line pt-3">
        {FOOTER.map((entry) => (
          <Link key={entry.href} href={entry.href} className="nav-item" data-active={isActive(entry.href)}>
            <entry.icon size={17} />
            {entry.label}
          </Link>
        ))}

        <div className="mt-2 flex items-center gap-2.5 rounded-sm px-2.5 py-2">
          <div className="grid h-[30px] w-[30px] flex-none place-items-center rounded-full border border-line-strong bg-bg-inset text-xs font-semibold text-text-secondary">
            {(user?.displayName ?? 'S').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium">{user?.displayName ?? 'Siswa'}</div>
            <div className="truncate text-[11.5px] text-text-muted">{user?.email}</div>
          </div>
          <button className="btn btn-icon" onClick={() => void signOut()} aria-label="Keluar">
            <IconLogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
