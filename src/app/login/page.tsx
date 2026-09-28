'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import {
  IconCheck, IconClock, IconGraduation, IconNotes, IconShield,
} from '@/components/icons'

const FEATURES = [
  { icon: IconCheck, text: 'Semua tugas dan deadline dalam satu dashboard' },
  { icon: IconClock, text: 'Jadwal hari ini, langsung terlihat saat login' },
  { icon: IconNotes, text: 'Catatan dan file pelajaran rapi per mapel' },
  { icon: IconShield, text: 'Data milikmu sendiri — terkunci per akun' },
]

export default function LoginPage() {
  const router = useRouter()
  const toast = useToast()
  const { configured, user, signIn, signUp, signInLocal, loading } = useAuth()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && user) router.replace('/')
  }, [loading, user, router])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError('Email dan password wajib diisi.')
      return
    }
    if (password.length < 6) {
      setError('Password minimal 6 karakter.')
      return
    }

    setBusy(true)
    try {
      if (configured) {
        if (mode === 'register') {
          await signUp(email.trim(), password, name.trim())
          toast('Akun dibuat. Cek email bila verifikasi diminta.')
        } else {
          await signIn(email.trim(), password)
        }
      } else {
        // Mode lokal: tanpa Supabase, tetap bisa memakai aplikasi
        signInLocal(email.trim(), name.trim())
        toast('Masuk mode lokal')
      }
      router.replace('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      {/* Aside — hanya desktop */}
      <aside className="relative hidden flex-col justify-center overflow-hidden border-r border-line bg-bg-elevated p-11 md:flex">
        <div className="relative z-[1]">
          <div className="mb-7 flex items-center gap-2.5">
            <div className="grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-gradient-to-br from-accent to-[#2f6ad9]">
              <IconGraduation size={16} className="text-white" />
            </div>
            <span className="font-display text-base font-bold tracking-[-0.02em]">ClassHub</span>
          </div>

          <h1 className="mb-2.5 font-display text-[30px] font-semibold leading-tight tracking-[-0.022em]">
            Everything you need
            <br />
            for school, in one place.
          </h1>
          <p className="mb-7 max-w-[380px] text-text-secondary">
            Personal command center untuk tugas, jadwal, reminder, catatan, dan file sekolah.
          </p>

          {FEATURES.map((f, i) => (
            <div key={i} className="mb-2.5 flex items-center gap-2.5 text-sm text-text-secondary">
              <span className="grid text-accent"><f.icon size={16} /></span>
              {f.text}
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute -bottom-40 -right-[140px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(77,141,255,0.13),transparent_65%)]" />
      </aside>

      <div className="grid place-items-center p-6 md:p-8">
        <div className="w-full max-w-[380px]">
          <div className="font-display text-[23px] font-semibold tracking-[-0.02em]">
            {mode === 'login' ? 'Masuk' : 'Daftar'}
          </div>
          <p className="mb-5 mt-1.5 text-[13.5px] text-text-muted">
            {mode === 'login' ? 'Lanjutkan atur hidup sekolahmu.' : 'Satu akun, semua kebutuhan sekolah.'}
          </p>

          {!configured && (
            <div className="mb-3.5 rounded-md border border-danger/30 bg-danger-soft p-3.5 text-left text-[13.5px] text-[#eab6b2]">
              <strong className="text-text">Mode demo lokal.</strong>
              <p className="mt-1">
                Supabase belum dikonfigurasi. Data disimpan di browser ini saja.
                Isi form untuk mulai memakai aplikasi.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {mode === 'register' && (
              <div className="mb-3.5 flex flex-col gap-1.5">
                <label className="text-[12.5px] font-medium text-text-secondary" htmlFor="a-name">
                  Nama
                </label>
                <input
                  id="a-name"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama kamu"
                  autoComplete="name"
                />
              </div>
            )}

            <div className="mb-3.5 flex flex-col gap-1.5">
              <label className="text-[12.5px] font-medium text-text-secondary" htmlFor="a-email">
                Email
              </label>
              <input
                id="a-email"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="mb-3.5 flex flex-col gap-1.5">
              <label className="text-[12.5px] font-medium text-text-secondary" htmlFor="a-pass">
                Password
              </label>
              <input
                id="a-pass"
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={6}
                required
              />
            </div>

            {error && (
              <p className="mb-2.5 text-xs text-danger" role="alert">{error}</p>
            )}

            <button className="btn btn-primary w-full" type="submit" disabled={busy}>
              {busy && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white" />
              )}
              {mode === 'login' ? 'Masuk' : 'Buat Akun'}
            </button>
          </form>

          <div className="mt-4 text-center text-[13px] text-text-muted">
            {mode === 'login' ? (
              <>
                Belum punya akun?{' '}
                <button className="font-medium text-accent" onClick={() => { setMode('register'); setError(null) }}>
                  Daftar
                </button>
              </>
            ) : (
              <>
                Sudah punya akun?{' '}
                <button className="font-medium text-accent" onClick={() => { setMode('login'); setError(null) }}>
                  Masuk
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
