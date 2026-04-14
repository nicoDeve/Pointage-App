import type { ReactNode } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '~/components/ui/sheet'
import { cn } from '~/lib/utils'

type PanelSize = 'narrow' | 'default' | 'wide'

const SIZE_MAP: Record<PanelSize, string> = {
  narrow: 'sm:max-w-[min(100vw-2rem,22rem)]',
  default: 'sm:max-w-md',
  wide: 'sm:max-w-lg',
}

interface AppSidePanelProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  /** Alias of size — accepts narrow | default | wide */
  width?: PanelSize
  size?: PanelSize
  footer?: ReactNode
  banner?: ReactNode
  children: ReactNode
  className?: string
}

export function AppSidePanel({
  open,
  onClose,
  title,
  description,
  width,
  size = 'default',
  footer,
  banner,
  children,
  className,
}: AppSidePanelProps) {
  const resolvedSize = width ?? size

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        className={cn(
          'flex w-full flex-col gap-0 border-l p-0 overflow-hidden',
          SIZE_MAP[resolvedSize],
          className,
        )}
      >
        {banner && <div>{banner}</div>}
        <SheetHeader className="shrink-0 space-y-0 border-b border-border px-4 py-3 text-left">
          <SheetTitle className="text-sm font-semibold">{title}</SheetTitle>
          {description && (
            <SheetDescription className="text-[11px] leading-snug text-muted-foreground">{description}</SheetDescription>
          )}
        </SheetHeader>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="px-3 py-2">{children}</div>
        </div>
        {footer && (
          <div className="shrink-0 border-t border-border p-3">{footer}</div>
        )}
      </SheetContent>
    </Sheet>
  )
}
