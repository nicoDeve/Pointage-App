/**
 * Event bus léger pour déclencher l'animation de ping
 * sur le bouton Gestion dans la sidebar à chaque toast.
 */

type ToastPingKind = 'saved' | 'updated' | 'deleted' | 'error'

type ToastPingListener = (kind: ToastPingKind) => void

const listeners = new Set<ToastPingListener>()

export function subscribeToastPing(fn: ToastPingListener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function publishToastPing(kind: ToastPingKind): void {
  listeners.forEach((fn) => fn(kind))
}
