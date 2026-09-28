export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export async function requestNotificationPermission(): Promise<string> {
  if (!isNotificationSupported()) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  const result = await Notification.requestPermission()
  return result
}

export function notify(title: string, body?: string): void {
  if (!isNotificationSupported()) return
  if (Notification.permission !== 'granted') return
  new Notification(title, { body })
}

export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return

  // Di SPA, event 'load' bisa sudah lewat sebelum hook ini berjalan.
  // Daftarkan segera; event load hanya dipakai kalau belum terjadi.
  const register = () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  }

  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register, { once: true })
}
