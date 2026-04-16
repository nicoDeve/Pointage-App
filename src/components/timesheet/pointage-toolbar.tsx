import { Search, Filter, X } from 'lucide-react'
import type { Project } from '@repo/shared'
import { cn } from '~/lib/utils'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'

interface PointageToolbarProps {
  search: string
  onSearchChange: (v: string) => void
  filterPeriod: string
  onFilterPeriodChange: (v: string) => void
  filterProject: string
  onFilterProjectChange: (v: string) => void
  projects: Project[]
}

export function PointageToolbar({
  search,
  onSearchChange,
  filterPeriod,
  onFilterPeriodChange,
  filterProject,
  onFilterProjectChange,
  projects,
}: PointageToolbarProps) {
  const hasActiveFilters = filterPeriod !== 'all' || filterProject !== 'all'
  const activeFilterCount = [filterPeriod !== 'all', filterProject !== 'all'].filter(Boolean).length

  return (
    <div className="shrink-0 space-y-2">
      {/* Controls */}
      <div className="flex items-center justify-end gap-2">
        <div className="relative w-full min-w-40 max-w-md sm:w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Semaine, projet…"
            className="h-9 w-full pl-9"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <FilterPopover
          filterPeriod={filterPeriod}
          onFilterPeriodChange={onFilterPeriodChange}
          filterProject={filterProject}
          onFilterProjectChange={onFilterProjectChange}
          projects={projects}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={activeFilterCount}
        />
      </div>

      {/* Active filter badges */}
      {(hasActiveFilters || search.trim()) && (
        <div className="flex flex-wrap items-center gap-2">
          {search.trim() && (
            <Badge variant="outline" className="max-w-full gap-1 pr-1 font-normal">
              <span className="truncate">Recherche : {search}</span>
              <button onClick={() => onSearchChange('')} className="ml-1 shrink-0 rounded-full p-0.5 hover:bg-muted">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filterPeriod !== 'all' && (
            <Badge variant="secondary" className="gap-1 pr-1">
              {filterPeriod === 'current' ? 'Semaine courante' : filterPeriod === 'past' ? 'Passées' : 'À venir'}
              <button onClick={() => onFilterPeriodChange('all')} className="ml-1 hover:bg-muted rounded-full p-0.5">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filterProject !== 'all' && (
            <Badge variant="secondary" className="gap-1 pr-1">
              {projects.find((p) => p.id === filterProject)?.name}
              <button onClick={() => onFilterProjectChange('all')} className="ml-1 hover:bg-muted rounded-full p-0.5">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Filter Popover ──────────────────────────────────────────────────────────

function FilterPopover({
  filterPeriod,
  onFilterPeriodChange,
  filterProject,
  onFilterProjectChange,
  projects,
  hasActiveFilters,
  activeFilterCount,
}: {
  filterPeriod: string
  onFilterPeriodChange: (v: string) => void
  filterProject: string
  onFilterProjectChange: (v: string) => void
  projects: Project[]
  hasActiveFilters: boolean
  activeFilterCount: number
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('h-9 shrink-0 gap-2', hasActiveFilters && 'border-primary/50 bg-primary/5 text-primary')}
        >
          <Filter className="h-4 w-4" />
          Filtres
          {hasActiveFilters && (
            <Badge
              variant="secondary"
              className="ml-1 flex size-5 shrink-0 items-center justify-center rounded-full p-0 text-xs tabular-nums"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 border border-border/50 p-0 shadow-lg" align="end">
        <div className="flex items-center justify-between px-4 py-3 bg-muted/50">
          <span className="font-semibold text-foreground">Filtres</span>
          {hasActiveFilters && (
            <button
              onClick={() => { onFilterPeriodChange('all'); onFilterProjectChange('all') }}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Effacer tout
            </button>
          )}
        </div>
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Période</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { value: 'all', label: 'Toutes' },
                { value: 'current', label: 'Courante' },
                { value: 'past', label: 'Passées' },
                { value: 'future', label: 'À venir' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => onFilterPeriodChange(option.value)}
                  className={cn(
                    'px-3 py-2 font-medium rounded-md border transition-all',
                    filterPeriod === option.value
                      ? 'border-primary text-primary bg-background'
                      : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Projet</label>
            <Select value={filterProject} onValueChange={onFilterProjectChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Tous les projets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les projets</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      <span>{p.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
