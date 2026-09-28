'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import type { AppUser } from '@/types'

const LOCAL_USER_KEY = 'classhub_user'

interface AuthContextValue {
  mode: 'supabase' | 'local'
  user: AppUser | null
  client: SupabaseClient | null
  loading: boolean
  configured: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
  signInLocal: (email: string, name: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function toAppUser(user: User): AppUser {
  return {
    id: user.id,
    email: user.email ?? '',
    displayName:
      (user.user_metadata?.full_name as string | undefined) ?? user.email?.split('@')[0] ?? 'Siswa',
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState<SupabaseClient | null>(() => createClient())
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!client) {
      // Mode lokal: identitas disimpan di localStorage
      try {
        const saved = window.localStorage.getItem(LOCAL_USER_KEY)
        if (saved) setUser(JSON.parse(saved) as AppUser)
      } catch {
        /* abaikan */
      }
      setLoading(false)
      return
    }

    let mounted = true
    client.auth.getUser().then(({ data }) => {
      if (!mounted) return
      setUser(data.user ? toAppUser(data.user) : null)
      setLoading(false)
    })

    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? toAppUser(session.user) : null)
      setLoading(false)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [client])

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!client) throw new Error('Supabase belum dikonfigurasi.')
      const { error } = await client.auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message)
    },
    [client],
  )

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      if (!client) throw new Error('Supabase belum dikonfigurasi.')
      const { error } = await client.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (error) throw new Error(error.message)
    },
    [client],
  )

  const signOut = useCallback(async () => {
    if (client) await client.auth.signOut()
    window.localStorage.removeItem(LOCAL_USER_KEY)
    setUser(null)
  }, [client])

  const signInLocal = useCallback((email: string, name: string) => {
    const local: AppUser = {
      id: 'local',
      email,
      displayName: name || email.split('@')[0] || 'Siswa',
    }
    window.localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(local))
    setUser(local)
  }, [])

  const mode: 'supabase' | 'local' = isSupabaseConfigured ? 'supabase' : 'local'

  const value = useMemo<AuthContextValue>(
    () => ({
      mode,
      user,
      client,
      loading,
      configured: isSupabaseConfigured,
      signIn,
      signUp,
      signOut,
      signInLocal,
    }),
    [mode, user, client, loading, signIn, signUp, signOut, signInLocal],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider')
  return ctx
}
