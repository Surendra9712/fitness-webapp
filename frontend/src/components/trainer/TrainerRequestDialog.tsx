import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import useUser from '@/hooks/useUser'
import { toast } from 'sonner'
import type { TrainerInfo } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  trainer: TrainerInfo | null
  onSuccess: () => void
}

export function TrainerRequestDialog({ open, onOpenChange, trainer, onSuccess }: Props) {
  const [note, setNote] = useState('')
  const { RequestTrainer } = useUser()
  const requestTrainer = RequestTrainer()

  async function sendRequest() {
    if (!trainer) return
    try {
      await requestTrainer.mutateAsync({
        trainer_id: trainer.id,
        customer_note: note.trim() || undefined,
      })
      toast.success('Request sent successfully')
      onOpenChange(false)
      setNote('')
      onSuccess()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Request Trainer</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Send a request to <strong>{trainer?.name}</strong>. They will review it first,
          then admin gives final approval.
        </p>
        <div className="space-y-1.5">
          <Label>Message (optional)</Label>
          <Input
            placeholder="e.g. I'm aiming to build muscle…"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={sendRequest} disabled={requestTrainer.isPending}>
            {requestTrainer.isPending ? 'Sending…' : 'Send Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
