import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus, Trash2, History } from "lucide-react";
import type { Project } from "@repo/shared";
import { HOURS_PER_WORKDAY, weekTargetHours } from "@repo/shared";
import { AppSidePanel } from "~/components/shared/app-side-panel";
import { HoursInput } from "~/components/shared/hours-input";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn, dayHoursTextClass, formatHoursLabel } from "~/lib/utils";
import type { WeekOption, DraftEntry } from "./pointage-types";

interface DayEditPanelProps {
  open: boolean;
  onClose: () => void;
  selectedDate: string | null;
  selectedWeek: WeekOption;
  weekTotalHours: number;
  isPast: boolean;
  projects: Project[];
  drafts: DraftEntry[];
  saving: boolean;
  onDraftChange: (
    idx: number,
    field: "projectId" | "duration",
    value: string | number,
  ) => void;
  onDraftRemove: (idx: number) => void;
  onDraftAdd: () => void;
  onSave: () => void;
}

export function DayEditPanel({
  open,
  onClose,
  selectedDate,
  selectedWeek,
  weekTotalHours,
  isPast,
  projects,
  drafts,
  saving,
  onDraftChange,
  onDraftRemove,
  onDraftAdd,
  onSave,
}: DayEditPanelProps) {
  const target = weekTargetHours(selectedWeek.year, selectedWeek.week);
  const dayTotal = drafts.reduce((s, d) => s + d.duration, 0);
  const dayRemaining = Math.max(0, HOURS_PER_WORKDAY - dayTotal);
  const selectedDayDate = selectedDate
    ? new Date(selectedDate + "T00:00:00")
    : null;
  const canAddDraft =
    dayRemaining > 0 &&
    projects.filter((p) => !drafts.map((d) => d.projectId).includes(p.id))
      .length > 0;

  return (
    <AppSidePanel
      open={open}
      onClose={onClose}
      width="narrow"
      title={
        selectedDayDate ? (
          <span className="flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-1.5">
            <span className="capitalize">
              {format(selectedDayDate, "EEEE", { locale: fr })}
            </span>
            <span className="text-xs text-muted-foreground font-normal">
              · {format(selectedDayDate, "d MMMM yyyy", { locale: fr })}
            </span>
          </span>
        ) : (
          "—"
        )
      }
      description={`Semaine ISO ${selectedWeek.week}`}
      banner={
        isPast ? (
          <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted/60 px-4 py-2.5 text-xs text-muted-foreground">
            <History className="h-3.5 w-3.5 shrink-0" />
            <span>Semaine passée — modifications limitées</span>
          </div>
        ) : undefined
      }
      footer={
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={saving}
          onClick={onSave}
        >
          {saving ? "Sauvegarde…" : "Enregistrer"}
        </Button>
      }
    >
      {/* Week progress summary */}
      <div className="app-summary-box mb-4 overflow-hidden">
        <div className="app-summary-row mb-2">
          <span className="text-xs text-muted-foreground shrink-0">Avancement semaine</span>
          <span className="font-semibold tabular-nums min-w-0 truncate">
            {formatHoursLabel(weekTotalHours)} / {target}h
            {target - weekTotalHours > 0 && (
              <span className="font-normal text-muted-foreground">
                {" "}
                · {formatHoursLabel(target - weekTotalHours)} dispo
              </span>
            )}
          </span>
        </div>
        <Progress
          value={target > 0 ? (weekTotalHours / target) * 100 : 0}
          className="h-1.5 bg-muted"
          indicatorClassName={weekTotalHours >= target ? 'bg-green-500' : 'bg-blue-500'}
        />
      </div>

      <div className="min-w-0 space-y-3">
        {drafts.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Aucune activité saisie pour ce jour.
          </p>
        )}
        {drafts.map((draft, idx) => {
          const selectedProject = projects.find(
            (p) => p.id === draft.projectId,
          );
          return (
            <div
              key={idx}
              className="flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-lg border border-border bg-background p-2"
            >
              <div className="min-w-0 flex-1 overflow-hidden">
                <Select
                  value={draft.projectId}
                  onValueChange={(v) => onDraftChange(idx, "projectId", v)}
                >
                  <SelectTrigger className="h-8 w-full min-w-0">
                    <SelectValue placeholder="—">
                      {selectedProject ? (
                        <span className="flex w-full min-w-0 items-center gap-1.5">
                          <span
                            className="size-2 shrink-0 rounded-sm"
                            style={{ backgroundColor: selectedProject.color }}
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {selectedProject.name}
                          </span>
                        </span>
                      ) : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex max-w-56 items-center gap-2">
                          <div
                            className="h-2 w-2 shrink-0 rounded-sm"
                            style={{ backgroundColor: p.color }}
                          />
                          <span className="truncate">{p.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <HoursInput
                  value={draft.duration}
                  onChange={(v) => onDraftChange(idx, "duration", v)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => onDraftRemove(idx)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={onDraftAdd}
          disabled={!canAddDraft}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-30"
        >
          <Plus className="h-4 w-4" />
          Ajouter une activité
        </button>

        {drafts.length > 0 && (
          <div className="app-summary-row pt-2 px-0.5">
            <span className="text-xs text-muted-foreground">Total journée</span>
            <span
              className={cn(
                "font-semibold tabular-nums",
                dayHoursTextClass(dayTotal),
              )}
            >
              {formatHoursLabel(dayTotal)} / {HOURS_PER_WORKDAY}h
            </span>
          </div>
        )}
      </div>
    </AppSidePanel>
  );
}
