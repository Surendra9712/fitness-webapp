import { useState } from 'react'
import { CheckCircle, XCircle, Bell } from 'lucide-react'
import useAdmin from '@/hooks/useAdmin'
import { usePagination } from '@/hooks/usePagination'
import { AppPagination } from '@/components/ui/app-pagination'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import type { ProductRequest } from '@/types'

const statusVariant: Record<string, 'info' | 'success' | 'destructive'> = {
  pending: 'info', approved: 'success', rejected: 'destructive',
}

export default function ProductRequests() {
  const [filter, setFilter] = useState('pending')
  const [approveDialog, setApproveDialog] = useState<ProductRequest | null>(null)
  const [rejectDialog, setRejectDialog] = useState<ProductRequest | null>(null)
  const [approveForm, setApproveForm] = useState({ price: '', stock_quantity: '', category: '', admin_note: '' })
  const [rejectNote, setRejectNote] = useState('')

  const { page, pageSize, goToPage, setPageSize, resetPage } = usePagination({ initialPageSize: 20 })

  const { GetProductRequests, ApproveProductRequest, RejectProductRequest, GetCategories } = useAdmin()
  const { data, isPlaceholderData } = GetProductRequests({ queryParams: { status: filter, page, page_size: pageSize } })
  const requests = data?.items ?? []
  const total = data?.total ?? 0
  const { data: categoriesData } = GetCategories({ queryParams: { page_size: 200 } })
  const categories = categoriesData?.items ?? []
  const approveRequest = ApproveProductRequest()
  const rejectRequest = RejectProductRequest()

  function handleFilterChange(value: string) {
    setFilter(value)
    resetPage()
  }

  async function approve() {
    if (!approveDialog) return
    if (!approveForm.price) { toast.error('Price is required'); return }
    try {
      await approveRequest.mutateAsync({
        id: approveDialog.id,
        price: parseFloat(approveForm.price),
        stock_quantity: parseInt(approveForm.stock_quantity || '0'),
        category: approveForm.category,
        admin_note: approveForm.admin_note,
      })
      toast.success(`"${approveDialog.product_name}" approved and added to catalog`)
      setApproveDialog(null)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function reject() {
    if (!rejectDialog) return
    try {
      await rejectRequest.mutateAsync({ id: rejectDialog.id, admin_note: rejectNote })
      toast.success('Request rejected')
      setRejectDialog(null)
      setRejectNote('')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Product Requests</h1>
        <Select value={filter} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
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
                <TableHead>Product</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map(r => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.product_name}</div>
                    {r.description && <div className="max-w-xs truncate text-xs text-muted-foreground">{r.description}</div>}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{r.user_name}</div>
                    <div className="text-xs text-muted-foreground">{r.user_email}</div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{r.reason ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[r.status]} className="capitalize">{r.status}</Badge>
                    {r.admin_note && <div className="mt-1 text-xs text-muted-foreground italic">{r.admin_note}</div>}
                  </TableCell>
                  <TableCell>
                    {r.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button
                          size="sm" variant="outline"
                          className="h-7 border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                          onClick={() => { setApproveForm({ price: '', stock_quantity: '', category: categories[0]?.slug ?? '', admin_note: '' }); setApproveDialog(r) }}
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />Approve
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          className="h-7 border-destructive text-destructive hover:bg-red-50"
                          onClick={() => { setRejectNote(''); setRejectDialog(r) }}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!requests.length && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    <Bell className="mx-auto mb-2 h-10 w-10 opacity-30" />
                    No {filter === 'all' ? '' : filter} requests
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AppPagination page={page} total={total} pageSize={pageSize} onPageSizeChange={setPageSize} onPageChange={goToPage} />

      <Dialog open={!!approveDialog} onOpenChange={() => setApproveDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Approve & Add to Catalog</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Adding <strong>{approveDialog?.product_name}</strong> as a new product.</p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Price (Rs.) *</Label>
                <Input type="number" min="0" step="0.01" value={approveForm.price} onChange={e => setApproveForm(p => ({ ...p, price: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Initial Stock</Label>
                <Input type="number" min="0" value={approveForm.stock_quantity} onChange={e => setApproveForm(p => ({ ...p, stock_quantity: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={approveForm.category} onValueChange={v => setApproveForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Note to Customer (optional)</Label>
              <Input placeholder="e.g. Now available in the shop!" value={approveForm.admin_note} onChange={e => setApproveForm(p => ({ ...p, admin_note: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog(null)}>Cancel</Button>
            <Button onClick={approve} disabled={approveRequest.isPending}>
              {approveRequest.isPending ? 'Adding…' : 'Approve & Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Rejecting request for <strong>{rejectDialog?.product_name}</strong>.</p>
          <div className="space-y-1.5">
            <Label>Reason for Rejection (optional)</Label>
            <Input placeholder="e.g. Not within our product range" value={rejectNote} onChange={e => setRejectNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={reject} disabled={rejectRequest.isPending}>
              {rejectRequest.isPending ? 'Rejecting…' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
