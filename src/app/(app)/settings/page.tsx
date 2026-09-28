'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { requestNotificationPermission } from '@/lib/notify'

const KEY = 'classhub_settings'

interface Settings {
  notifications: boolean
  compact: boolean
}

const DEFAULT: Settings = { notifications: false, compact: false }

export default function SettingsPage() {
  const { mode, signOut } = useAuth()
  const toast = useToast()
  const [settings, setSettings] = useState<Settings>(DEFAULT)
  const [notifState, setNotifState] = useState<string>('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) setSettings({ ...DEFAULT, ...JSON.parse(raw) })
    } catch { /* abaikan */ }
  }, [])

  function update(patch: Partial<Settings>) {
    const next = { ...settings, ...patch }
    setSettings(next)
    localStorage.setItem(KEY, JSON.stringify(next))
    toast('Pengaturan disimpan')
  }

  async function enableNotifications() {
    const result = await requestNotificationPermission()
    setNotifState(result)
    if (result === 'granted') update({ notifications: true })
    else toast('Izin notifikasi ditolak', 'error')
  }

  return (
    <div>
      <h1 className="mb-3.5 font-display text-[22px] font-semibold md:text-[26px]">Pengaturan</h1>

      <div className="flex max-w-[640px] flex-col gap-3.5">
        <section className="panel p-3.5">
          <div className="eyebrow mb-2">Data</div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Mode penyimpanan</div>
              <p className="text-xs text-text-muted">
                {isSupabaseConfigured
                  ? 'Supabase aktif — data tersimpan di cloud per akun.'
                  : 'Mode lokal — data tersimpan di browser ini.'}
              </p>
            </div>
            <span className="badge">{mode === 'supabase' ? 'Cloud' : 'Lokal'}</span>
          </div>
        </section>

        <section className="panel p-3.5">
          <div className="eyebrow mb-2">Notifikasi</div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Browser notification</div>
              <p className="text-xs text-text-muted">Pengingat reminder pada waktu yang diatur.</p>
              {notifState && <p className="mt-1 text-xs text-text-muted">Status: {notifState}</p>}
            </div>
            <button className="btn btn-sm" onClick={() => void enableNotifications()}>
              {settings.notifications ? 'Aktif' : 'Izinkan'}
            </button>
          </div>
        </section>

        <section className="panel p-3.5">
          <div className="eyebrow mb-2">Tampilan</div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Dashboard ringkas</div>
              <p className="text-xs text-text-muted">Kurangi jarak antar panel.</p>
            </div>
            <button className="btn btn-sm" onClick={() => update({ compact: !settings.compact })}>
              {settings.compact ? 'Aktif' : 'Nonaktif'}
            </button>
          </div>
        </section>

        <section className="panel p-3.5">
          <div className="eyebrow mb-2">Akun</div>
          <button className="btn btn-danger" onClick={() => void signOut()}>Keluar</button>
        </section>
      </div>
    </div>
  )
}
