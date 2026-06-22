import { useState } from 'react'
import { CheckCircle, XCircle, UserCheck } from 'lucide-react'
import useAdmin from '@/hooks/useAdmin'
import { usePagination } from '@/hooks/usePagination'
import { AppPagination } from '@/components/ui/app-pagination'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import type { TrainerAssignment } from '@/types'

const STATUS_BADGE: Record<string, string> = {
  pending_trainer: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  pending_admin:   'bg-blue-100 text-blue-800 border-blue-200',
  approved:        'bg-emerald-100 text-emerald-800 border-emerald-200',
  rejected:        'bg-red-100 text-red-700 border-red-200',
}

const STATUS_LABEL: Record<string, string> = {
  pending_trainer: 'Awaiting Trainer',
  pending_admin:   'Awaiting Admin',
  approved:        'Approved',
  rejected:        'Rejected',
}

export default function TrainerAssignments() {
  const [filter, setFilter] = useState('pending_admin')
  const [approveTarget, setApproveTarget] = useState<TrainerAssignment | null>(null)
  const [rejectTarget, setRejectTarget]   = useState<TrainerAssignment | null>(null)
  const [adminNote, setAdminNote] = useState('')

  const { page, pageSize, goToPage, setPageSize, resetPage } = usePagination({ initialPageSize: 20 })

  const { GetTrainerAssignments, ApproveTrainerAssignment, RejectTrainerAssignment } = useAdmin()
  const { data, isPlaceholderData } = GetTrainerAssignments({ queryParams: { status: filter, page, page_size: pageSize } })
  const assignments = data?.items ?? []
  const total = data?.total ?? 0

  function handleFilterChange(value: string) {
    setFilter(value)
    resetPage()
  }
  const approveAssignment = ApproveTrainerAssignment()
  const rejectAssignment = RejectTrainerAssignment()

  async function approve() {
    if (!approveTarget) return
    try {
      await approveAssignment.mutateAsync({ id: approveTarget.id, admin_note: adminNote || undefined })
      toast.success('Assignment approved')
      setApproveTarget(null)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function reject() {
    if (!rejectTarget) return
    try {
      await rejectAssignment.mutateAsync({ id: rejectTarget.id, admin_note: adminNote || undefined })
      toast.success('Assignment rejected')
      setRejectTarget(null)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trainer Assignments</h1>
          <p className="text-sm text-muted-foreground">Review and approve customer–trainer assignments.</p>
        </div>
        <Select value={filter} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending_admin">Pending Approval</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className={isPlaceholderData ? 'opacity-70' : ''}>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Trainer</TableHead>
                <TableHead>Customer Note</TableHead>
                <TableHead>Trainer Note</TableHead>
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
                  <TableCell>
                    <div className="font-medium">{a.trainer_name}</div>
                    <div className="text-xs text-muted-foreground">{a.trainer_email}</div>
                  </TableCell>
                  <TableCell className="max-w-[140px] truncate text-sm text-muted-foreground">{a.customer_note ?? '—'}</TableCell>
                  <TableCell className="max-w-[140px] truncate text-sm text-muted-foreground">{a.trainer_note ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_BADGE[a.status] ?? ''}>
                      {STATUS_LABEL[a.status] ?? a.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {a.status === 'pending_admin' && (
                      <div className="flex gap-1">
                        <Button
                          size="sm" variant="outline"
                          className="h-7 border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                          onClick={() => { setAdminNote(''); setApproveTarget(a) }}
                        >
                          <CheckCircle className="mr-1 h-3.5 w-3.5" />Approve
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          className="h-7 border-destructive text-destructive hover:bg-red-50"
                          onClick={() => { setAdminNote(''); setRejectTarget(a) }}
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
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    <UserCheck className="mx-auto mb-2 h-10 w-10 opacity-30" />
                    No assignments found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AppPagination page={page} total={total} pageSize={pageSize} onPageSizeChange={setPageSize} onPageChange={goToPage} />

      <Dialog open={!!approveTarget} onOpenChange={() => setApproveTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Approve Assignment</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Assigning <strong>{approveTarget?.customer_name}</strong> to trainer <strong>{approveTarget?.trainer_name}</strong>.
          </p>
          <div className="space-y-1.5">
            <Label>Admin note (optional)</Label>
            <Input placeholder="e.g. Approved — good match" value={adminNote} onChange={e => setAdminNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>Cancel</Button>
            <Button onClick={approve} disabled={approveAssignment.isPending}>
              {approveAssignment.isPending ? 'Approving…' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectTarget} onOpenChange={() => setRejectTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reject Assignment</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Rejecting assignment of <strong>{rejectTarget?.customer_name}</strong> to <strong>{rejectTarget?.trainer_name}</strong>.
          </p>
          <div className="space-y-1.5">
            <Label>Reason (optional)</Label>
            <Input placeholder="e.g. Trainer at capacity" value={adminNote} onChange={e => setAdminNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={reject} disabled={rejectAssignment.isPending}>
              {rejectAssignment.isPending ? 'Rejecting…' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
