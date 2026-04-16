import { useState } from 'react'
import { REJECT_REASON_CODES } from '@repo/shared'
import type { RejectReasonCode } from '@repo/shared'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'

interface RejectDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (data: { rejectReasonCode: string; rejectComment?: string }) => void
}

export function RejectDialog({ open, onClose, onConfirm }: RejectDialogProps) {
  const [code, setCode] = useState<RejectReasonCode>('autre')
  const [comment, setComment] = useState('')

  const submit = () => {
    onConfirm({ rejectReasonCode: code, rejectComment: comment || undefined })
    setCode('autre')
    setComment('')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refuser la demande</DialogTitle>
          <DialogDescription>Indiquez le motif du refus.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Motif</Label>
            <Select value={code} onValueChange={(v) => setCode(v as RejectReasonCode)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un motif" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REJECT_REASON_CODES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Commentaire (optionnel)</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Précisions sur le refus…"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button variant="destructive" onClick={submit}>Confirmer le refus</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
