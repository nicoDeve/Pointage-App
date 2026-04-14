import type { ReactNode } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '~/components/ui/tooltip'

interface InlineHelpProps {
  children: ReactNode
}

export function InlineHelp({ children }: InlineHelpProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground transition-colors text-[10px] font-medium"
          aria-label="Aide"
        >
          ?
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-[18rem] text-xs leading-relaxed">
        {children}
      </TooltipContent>
    </Tooltip>
  )
}
