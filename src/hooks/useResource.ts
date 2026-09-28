'use client'

import { useCallback, useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { DATA_CHANGED_EVENT } from '@/lib/data/repo'
import { useAuth } from '@/components/providers/AuthProvider'

interface ResourceState<T> {
  data: T
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * useResource — wrapper fetch standar.
 * Menjamin loading state selalu ada, error tertangkap, refetch tersedia,
 * dan auto-refresh saat data lokal berubah.
 */
export function useResource<T>(
  fetcher: (client: SupabaseClient | null) => Promise<T>,
  initial: T,
  deps: unknown[] = [],
): ResourceState<T> {
  const { client, user } = useAuth()
  const [data, setData] = useState<T>(initial)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetcherRef = useRefLatest(fetcher)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetcherRef.current(client)
      setData(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }, [client, fetcherRef])

  useEffect(() => {
    void load()
  }, [load, user?.id, ...deps])

  useEffect(() => {
    const onChanged = () => void load()
    window.addEventListener(DATA_CHANGED_EVENT, onChanged)
    return () => window.removeEventListener(DATA_CHANGED_EVENT, onChanged)
  }, [load])

  return { data, loading, error, reload: () => void load() }
}

/** Simpan referensi terbaru tanpa memicu re-run effect. */
function useRefLatest<T>(value: T) {
  const ref = useState<{ current: T }>(() => ({ current: value }))[0]
  ref.current = value
  return ref
}
