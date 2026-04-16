import { useState, useEffect, useCallback, useRef } from 'react'

// Module-level cache: persists across component unmounts within the same tab session.
// Returns stale data immediately on re-mount, then silently refreshes in the background.
const pageCache = new Map<string, unknown>()

interface UsePageDataOptions {
  /** When false, skip fetching until enabled becomes true. Defaults to true. */
  enabled?: boolean
}

export function usePageData<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  options?: UsePageDataOptions,
): { data: T | null; loading: boolean; error: string | null; reload: () => void } {
  const enabled = options?.enabled ?? true
  const fullKey = `${cacheKey}:${JSON.stringify(deps)}`
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const [data, setData] = useState<T | null>(() => enabled ? (pageCache.get(fullKey) as T) ?? null : null)
  const [loading, setLoading] = useState(() => !enabled || !pageCache.has(fullKey))
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async (key: string, showLoading: boolean) => {
    if (showLoading) setLoading(true)
    setError(null)
    try {
      const result = await fetcherRef.current()
      pageCache.set(key, result)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [])

  // reload: silent background refresh (data stays visible, no skeleton flash)
  const reload = useCallback(() => { if (enabled) run(fullKey, false) }, [run, fullKey, enabled])

  useEffect(() => {
    if (!enabled) {
      setLoading(true)
      return
    }
    setData((pageCache.get(fullKey) as T) ?? null)
    void run(fullKey, !pageCache.has(fullKey))
  }, [run, fullKey, enabled])

  return { data, loading, error, reload }
}
