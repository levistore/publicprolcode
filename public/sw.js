/* ClassHub service worker — offline shell dasar */
const CACHE = 'classhub-v1'
const SHELL = ['/', '/offline.html', '/manifest.webmanifest', '/icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => undefined),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Navigasi: jaringan dulu, fallback ke cache/offline shell
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('/', copy)).catch(() => undefined)
          return res
        })
        .catch(() =>
          caches.match('/').then((hit) => hit || caches.match('/offline.html')),
        ),
    )
    return
  }

  // Aset statis: cache dulu
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit
      return fetch(req)
        .then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined)
          }
          return res
        })
        .catch(() => hit)
    }),
  )
})

/* ------------------------------------------------------------------
   Notifikasi PWA.
   Scheduler di aplikasi hanya berjalan selama tab terbuka. Saat tab
   ditutup, kode berikut yang mengambil alih: aplikasi meminta "tunda"
   lewat postMessage, dan service worker membunyikannya dengan
   showNotification walau halaman sudah tidak aktif.
   ------------------------------------------------------------------ */

self.addEventListener('message', (event) => {
  const data = event.data
  if (!data || data.type !== 'SCHEDULE_NOTIFICATION') return

  const { id, title, body, at, tag } = data
  const delay = Math.max(0, at - Date.now())

  event.waitUntil(
    new Promise((resolve) => {
      setTimeout(async () => {
        // Cek ulang: kalau dibatalkan sebelum waktunya, jangan bunyikan.
        const cancelled = await self.cancelledTags.get(tag).catch(() => true)
        if (cancelled) return resolve()
        try {
          await self.registration.showNotification(title, {
            body: body || '',
            tag: tag || id || 'classhub',
            icon: '/icon.svg',
            badge: '/icon.svg',
            data: { id },
          })
        } catch {
          /* abaikan */
        }
        resolve()
      }, delay)
    }),
  )
})

/* Batalkan notifikasi tertunda (misal reminder diselesaikan). */
self.addEventListener('message', (event) => {
  const data = event.data
  if (!data || data.type !== 'CANCEL_NOTIFICATION') return
  event.waitUntil(self.cancelledTags.put(data.tag, true).catch(() => undefined))
})

/* Klik notifikasi -> buka/fokuskan aplikasi. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((list) => {
        for (const c of list) {
          if ('focus' in c) return c.focus()
        }
        if (self.clients.openWindow) return self.clients.openWindow('/reminders')
      }),
  )
})
