import { Bell } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover'
import { Button } from '~/components/ui/button'

export function ActivityLogPopover() {
  // Aucun système de notifications backend pour l'instant — affiche état vide
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="relative inline-flex">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Journal d'activité"
          >
            <Bell className="size-4" />
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold">Activité récente</p>
        </div>
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
          Aucune activité récente
        </div>
      </PopoverContent>
    </Popover>
  )
}
