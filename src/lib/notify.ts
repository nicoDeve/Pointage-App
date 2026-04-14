import { toast } from 'sonner'

type ToastKind = 'saved' | 'updated' | 'deleted' | 'error'

const CSS_BY_KIND: Record<ToastKind, { toast: string; title: string; description: string }> = {
  saved: {
    toast: 'toast-saved',
    title: 'text-emerald-900 dark:text-emerald-100 font-semibold text-sm',
    description: 'text-emerald-800/80 dark:text-emerald-200/70 text-xs',
  },
  updated: {
    toast: 'toast-updated',
    title: 'font-semibold text-sm',
    description: 'text-muted-foreground text-xs',
  },
  deleted: {
    toast: 'toast-deleted',
    title: 'text-amber-900 dark:text-amber-100 font-semibold text-sm',
    description: 'text-amber-800/80 dark:text-amber-200/70 text-xs',
  },
  error: {
    toast: 'toast-error',
    title: 'text-red-900 dark:text-red-100 font-semibold text-sm',
    description: 'text-red-800/80 dark:text-red-200/70 text-xs',
  },
}

function notify(kind: ToastKind, title: string, description?: string) {
  const css = CSS_BY_KIND[kind]
  toast(title, {
    description,
    classNames: {
      toast: css.toast,
      title: css.title,
      description: css.description,
    },
  })
}

export function notifySaved(title: string, description?: string) {
  notify('saved', title, description)
}

export function notifyUpdated(title: string, description?: string) {
  notify('updated', title, description)
}

export function notifyDeleted(title: string, description?: string) {
  notify('deleted', title, description)
}

export function notifyError(title: string, description?: string) {
  notify('error', title, description)
}
