import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Input } from '~/components/ui/input'
import { cn } from '~/lib/utils'
import { HOURS_STEP, MAX_HOURS_PER_DAY } from '@repo/shared'

interface HoursInputProps {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
}

export function HoursInput({ value, onChange, min = 0, max = MAX_HOURS_PER_DAY, step = HOURS_STEP, className }: HoursInputProps) {
  const [text, setText] = useState(String(value))
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setText(String(value))
  }, [value])

  const commit = () => {
    const n = parseFloat(text)
    if (isNaN(n)) {
      setText(String(value))
      return
    }
    const clamped = Math.min(max, Math.max(min, Math.round(n / step) * step))
    onChange(clamped)
    setText(String(clamped))
  }

  const increment = () => {
    const next = Math.min(max, Math.round((value + step) / step) * step)
    onChange(next)
  }

  const decrement = () => {
    const next = Math.max(min, Math.round((value - step) / step) * step)
    onChange(next)
  }

  return (
    <div className={cn('flex items-center', className)}>
      <button
        type="button"
        tabIndex={-1}
        onClick={decrement}
        disabled={value <= min}
        className="flex h-8 w-6 shrink-0 items-center justify-center rounded-l-md border border-r-0 border-border bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        className="h-8 w-12 rounded-none border-x-0 text-center text-xs tabular-nums focus-visible:z-10"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={increment}
        disabled={value >= max}
        className="flex h-8 w-6 shrink-0 items-center justify-center rounded-r-md border border-l-0 border-border bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
