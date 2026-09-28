'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useAuth } from '@/components/providers/AuthProvider'
import { remindersService, tasksService } from '@/lib/data/services'
import {
  isNotificationSupported, notify as fireNotification, registerServiceWorker,
} from '@/lib/notify'
import { bodyFor, shouldFire } from '@/lib/reminder-rules'
import { markFired, shouldNotifyTask, taskBodyFor } from '@/lib/task-rules'
import type { Reminder } from '@/types'

/* Konstanta scheduler */
const TICK_MS = 30_000 // cek tiap 30 detik
const STORE_KEY = 'classhub_notified_v1'

/* Riwayat notifikasi yang sudah ditampilkan (cegah dobel). */
function loadFired(): Record<string, number> {
  try {
    return JSON.parse(window.localStorage.getItem(STORE_KEY) ?? '{}') as Record<string, number>
  } catch {
    return {}
  }
}

function saveFired(map: Record<string, number>): void {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(map))
  } catch {
    /* abaikan */
  }
}

/* -------------------------------- Hook -------------------------------- */

/**
 * Menjalankan pengecekan reminder secara berkala dan menampilkan
 * notifikasi browser saat waktunya tiba.
 *
 * Catatan desain:
 * - Hanya berjalan di sisi klien dan hanya saat izin sudah granted.
 * - Tidak pernah menampilkan notifikasi ganda (riwayat disimpan).
 * - Tidak mengubah data; hanya membaca.
 */
export function useReminderScheduler(): void {
  const { client, user } = useAuth()
  const timerRef = useRef<number | null>(null)
  const runningRef = useRef(false)

  const tick = useCallback(async () => {
    if (runningRef.current) return
    runningRef.current = true
    try {
      if (!isNotificationSupported()) return
      if (Notification.permission !== 'granted') return

      const [reminders, tasks] = await Promise.all([
        remindersService.list(client as SupabaseClient | null),
        tasksService.list(client as SupabaseClient | null),
      ])
      const now = Date.now()
      const fired = loadFired()
      let changed = false

      for (const r of reminders) {
        if (r.is_completed) continue
        if (!shouldFire(r, now, fired[r.id])) continue

        fireNotification(r.title, bodyFor(r, now))
        fired[r.id] = now
        changed = true
      }

      for (const t of tasks) {
        if (!shouldNotifyTask(t, now, fired['task:' + t.id])) continue

        fireNotification(`Tugas: ${t.title}`, taskBodyFor(t, now))
        fired['task:' + t.id] = markFired(t, now)
        changed = true
      }

      if (changed) saveFired(fired)
    } catch {
      /* Jangan ganggu pengguna kalau sekadar gagal memuat */
    } finally {
      runningRef.current = false
    }
  }, [client])

  useEffect(() => {
    if (!user) return

    // Daftarkan service worker agar notifikasi PWA bisa tampil walau
    // tab sedang tidak aktif.
    registerServiceWorker()

    // Putar pertama kali setelah sedikit delay (biar tidak rebutan
    // dengan hydration), lalu tiap TICK_MS.
    const first = window.setTimeout(() => void tick(), 3_000)
    timerRef.current = window.setInterval(() => void tick(), TICK_MS)

    // Segera cek ulang ketika tab kembali terlihat
    const onVisible = () => {
      if (document.visibilityState === 'visible') void tick()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.clearTimeout(first)
      if (timerRef.current) window.clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [user, tick])
}
