import { useEffect, useRef } from 'react'
import { subscribeToastPing } from '~/lib/toast-ping'

// Couleurs CSS par type de toast pour le burst (RGBA)
const BURST_COLORS: Record<string, string> = {
  saved: 'rgba(34,197,94,0.55)',
  updated: 'rgba(148,163,184,0.45)',
  deleted: 'rgba(245,158,11,0.50)',
  error: 'rgba(239,68,68,0.55)',
}

/**
 * Pose un <span> invisible à l'intérieur d'un `relative` parent.
 * Au déclenchement d'un toast, anime un burst de box-shadow coloré.
 */
export function ToastPingLayer() {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    return subscribeToastPing((kind) => {
      const el = ref.current
      if (!el) return
      el.style.setProperty('--app-ping-burst', BURST_COLORS[kind] ?? BURST_COLORS.saved)
      // Reset + re-trigger animation
      el.classList.remove('app-toast-ping-burst')
      void el.offsetWidth // reflow
      el.classList.add('app-toast-ping-burst')
    })
  }, [])

  return (
    <span
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-md"
    />
  )
}
