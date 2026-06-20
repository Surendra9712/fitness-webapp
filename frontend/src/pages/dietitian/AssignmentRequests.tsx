import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, UserCheck } from 'lucide-react'
import { api } from '@/api/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { TrainerAssignment } from '@/types'

const STATUS_BADGE: Record<string, string> = {
  pending_trainer: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  pending_admin:   'bg-blue-100 text-blue-800 border-blue-200',
  approved:        'bg-emerald-100 text-emerald-800 border-emerald-200',
  rejected:        'bg-red-100 text-red-700 border-red-200',
}

const STATUS_LABEL: Record<string, string> = {
  pending_trainer: 'Awaiting You',
  pending_admin:   'Awaiting Admin',
  approved:        'Approved',
  rejected:        'Rejected',
}

export default function AssignmentRequests() {
  const [assignments, setAssignments] = useState<TrainerAssignment[]>([])
  const [filter, setFilter] = useState('pending_trainer')
  const [approveTarget, setApproveTarget] = useState<TrainerAssignment | null>(null)
  const [rejectTarget, setRejectTarget]   = useState<TrainerAssignment | null>(null)
  const [trainerNote, setTrainerNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function load() {
    api.get<TrainerAssignment[]>(`/dietitian/assignment-requests?status=${filter}`)
      .then(setAssignments)
      .catch(e => setError((e as Error).message))
  }

  useEffect(() => { load() }, [filter])

  async function approve() {
    if (!approveTarget) return
    setSaving(true); setError('')
    try {
      await api.put(`/dietitian/assignment-requests/${approveTarget.id}/approve`, { trainer_note: trainerNote || undefined })
      setApproveTarget(null)
      load()
    } catch (e) { setError((e as Error).message) }
    finally { setSaving(false) }
  }

  async function reject() {
    if (!rejectTarget) return
    setSaving(true); setError('')
    try {
      await api.put(`/dietitian/assignment-requests/${rejectTarget.id}/reject`, { trainer_note: trainerNote || undefined })
      setRejectTarget(null)
      load()
    } catch (e) { setError((e as Error).message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Assignment Requests</h1>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending_trainer">Pending (You)</SelectItem>
            <SelectItem value="pending_admin">Pending Admin</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-36" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map(a => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="font-medium">{a.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{a.customer_email}</div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {a.customer_note ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_BADGE[a.status] ?? ''}>
                      {STATUS_LABEL[a.status] ?? a.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {a.status === 'pending_trainer' && (
                      <div className="flex gap-1">
                        <Button
                          size="sm" variant="outline"
                          className="h-7 border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                          onClick={() => { setTrainerNote(''); setError(''); setApproveTarget(a) }}
                        >
                          <CheckCircle className="mr-1 h-3.5 w-3.5" />Approve
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          className="h-7 border-destructive text-destructive hover:bg-red-50"
                          onClick={() => { setTrainerNote(''); setError(''); setRejectTarget(a) }}
                        >
                          <XCircle className="mr-1 h-3.5 w-3.5" />Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!assignments.length && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                    <UserCheck className="mx-auto mb-2 h-10 w-10 opacity-30" />
                    No requests found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Approve dialog */}
      <Dialog open={!!approveTarget} onOpenChange={() => setApproveTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Approve Request</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Approving <strong>{approveTarget?.customer_name}</strong>. Request will then go to admin for final confirmation.
          </p>
          <div className="space-y-1.5">
            <Label>Note to customer (optional)</Label>
            <Input placeholder="e.g. Looking forward to working with you!" value={trainerNote} onChange={e => setTrainerNote(e.target.value)} />
          </div>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>Cancel</Button>
            <Button onClick={approve} disabled={saving}>{saving ? 'Approving…' : 'Approve'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={() => setRejectTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reject Request</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Rejecting request from <strong>{rejectTarget?.customer_name}</strong>.
          </p>
          <div className="space-y-1.5">
            <Label>Reason (optional)</Label>
            <Input placeholder="e.g. Fully booked at the moment" value={trainerNote} onChange={e => setTrainerNote(e.target.value)} />
          </div>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={reject} disabled={saving}>{saving ? 'Rejecting…' : 'Reject'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
