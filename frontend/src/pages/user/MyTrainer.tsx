import { useEffect, useState } from 'react'
import { UserCheck, Users, Clock, CheckCircle2, XCircle, Send, X } from 'lucide-react'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import ConfirmDialog from '@/components/ConfirmDialog'
import { toast } from 'sonner'
import type { TrainerAssignment, TrainerInfo } from '@/types'

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode; description: string }> = {
  pending_trainer: {
    label: 'Awaiting Trainer',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: <Clock className="h-4 w-4" />,
    description: 'Your request has been sent. Waiting for the trainer to review it.',
  },
  pending_admin: {
    label: 'Awaiting Admin',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: <Clock className="h-4 w-4" />,
    description: 'Trainer approved your request. Waiting for admin final confirmation.',
  },
  approved: {
    label: 'Active',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: <CheckCircle2 className="h-4 w-4" />,
    description: 'You are assigned to this trainer.',
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: <XCircle className="h-4 w-4" />,
    description: 'Your request was rejected. You can request a different trainer.',
  },
}

export default function MyTrainer() {
  const [assignment, setAssignment] = useState<TrainerAssignment | null | undefined>(undefined)
  const [trainers, setTrainers] = useState<TrainerInfo[]>([])
  const [selectedTrainer, setSelectedTrainer] = useState<TrainerInfo | null>(null)
  const [note, setNote] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  function loadAssignment() {
    api.get<TrainerAssignment | null>('/user/trainer-assignment')
      .then(setAssignment)
      .catch(() => setAssignment(null))
  }

  function loadTrainers() {
    api.get<TrainerInfo[]>('/user/trainers')
      .then(setTrainers)
      .catch(console.error)
  }

  useEffect(() => {
    loadAssignment()
    loadTrainers()
  }, [])

  async function sendRequest() {
    if (!selectedTrainer) return
    setSaving(true)
    try {
      await api.post('/user/trainer-assignment', {
        trainer_id: selectedTrainer.id,
        customer_note: note.trim() || undefined,
      })
      toast.success('Request sent successfully')
      setDialogOpen(false)
      setNote('')
      loadAssignment()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function cancelRequest() {
    try {
      await api.delete('/user/trainer-assignment')
      toast.success('Request cancelled')
      loadAssignment()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setCancelOpen(false)
    }
  }

  if (assignment === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  const showTrainerList = !assignment || assignment.status === 'rejected'
  const meta = assignment ? STATUS_META[assignment.status] : null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">My Trainer</h1>

      {assignment && meta && (
        <Card className={`border ${meta.color}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {meta.icon}
                <CardTitle className="text-base">{meta.label}</CardTitle>
              </div>
              <Badge className={meta.color}>{meta.label}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{meta.description}</p>

            <div className="rounded-lg bg-white/60 p-3 space-y-1.5 text-sm">
              <div className="flex gap-2">
                <span className="font-medium w-24 shrink-0">Trainer</span>
                <span>{assignment.trainer_name}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-medium w-24 shrink-0">Email</span>
                <span className="text-muted-foreground">{assignment.trainer_email}</span>
              </div>
              {assignment.customer_note && (
                <div className="flex gap-2">
                  <span className="font-medium w-24 shrink-0">Your note</span>
                  <span className="text-muted-foreground">{assignment.customer_note}</span>
                </div>
              )}
              {assignment.trainer_note && (
                <div className="flex gap-2">
                  <span className="font-medium w-24 shrink-0">Trainer note</span>
                  <span className="text-muted-foreground">{assignment.trainer_note}</span>
                </div>
              )}
              {assignment.admin_note && (
                <div className="flex gap-2">
                  <span className="font-medium w-24 shrink-0">Admin note</span>
                  <span className="text-muted-foreground">{assignment.admin_note}</span>
                </div>
              )}
              <div className="flex gap-2">
                <span className="font-medium w-24 shrink-0">Requested</span>
                <span className="text-muted-foreground">{new Date(assignment.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {assignment.status === 'pending_trainer' && (
              <Button
                variant="outline" size="sm"
                className="gap-1.5 text-destructive border-destructive/40 hover:bg-red-50"
                onClick={() => setCancelOpen(true)}
              >
                <X className="h-3.5 w-3.5" />
                Cancel Request
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {!assignment && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <UserCheck className="h-12 w-12 text-muted-foreground/30" />
            <p className="font-medium text-muted-foreground">No trainer assigned yet</p>
            <p className="text-sm text-muted-foreground">Choose a trainer from the list below to get started.</p>
          </CardContent>
        </Card>
      )}

      {showTrainerList && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              <CardTitle>Available Trainers</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Clients</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainers.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-muted-foreground">{t.email}</TableCell>
                    <TableCell className="text-muted-foreground">{t.customer_count ?? 0}</TableCell>
                    <TableCell>
                      <Button
                        size="sm" className="gap-1.5"
                        onClick={() => { setSelectedTrainer(t); setNote(''); setDialogOpen(true) }}
                      >
                        <Send className="h-3.5 w-3.5" />
                        Request
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!trainers.length && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      No trainers available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Request dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Request Trainer</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Send a request to <strong>{selectedTrainer?.name}</strong>. They will review it first, then admin gives final approval.
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
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={sendRequest} disabled={saving}>{saving ? 'Sending…' : 'Send Request'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel trainer request?"
        description="Your pending request will be withdrawn. You can send a new request anytime."
        confirmLabel="Cancel Request"
        onConfirm={cancelRequest}
      />
    </div>
  )
}
