import { useState, useEffect, useCallback, useRef } from 'react'

export function usePageData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
): { data: T | null; loading: boolean; error: string | null; reload: () => void } {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await fetcherRef.current())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, deps)

  useEffect(() => { reload() }, [reload])

  return { data, loading, error, reload }
}
