import { useEffect, useState } from 'react'
import { Plus, Clock, CheckCircle, XCircle } from 'lucide-react'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import type { ProductRequest, RequestStatus } from '@/types'

const statusIcon: Record<RequestStatus, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-yellow-500" />,
  approved: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  rejected: <XCircle className="h-4 w-4 text-destructive" />,
}

const statusVariant: Record<RequestStatus, 'info' | 'success' | 'destructive'> = {
  pending: 'info', approved: 'success', rejected: 'destructive',
}

export default function RequestProduct() {
  const [requests, setRequests] = useState<ProductRequest[]>([])
  const [form, setForm] = useState({ product_name: '', description: '', reason: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function load() {
    api.get<ProductRequest[]>('/user/product-requests').then(setRequests).catch(() => {})
  }

  useEffect(() => { load() }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.product_name.trim()) { setError('Product name is required'); return }
    setLoading(true)
    setError('')
    try {
      await api.post('/user/product-requests', form)
      setSuccess('Request submitted! Admin will review it shortly.')
      setForm({ product_name: '', description: '', reason: '' })
      load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Request a Product</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Can't find what you're looking for? Submit a request and our admin will review it.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">New Request</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="product_name">Product Name *</Label>
              <Input
                id="product_name"
                placeholder="e.g. Whey Protein Isolate"
                value={form.product_name}
                onChange={e => setForm(p => ({ ...p, product_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Brief description of the product"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reason">Why do you need it?</Label>
              <Input
                id="reason"
                placeholder="e.g. For post-workout recovery"
                value={form.reason}
                onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
              />
            </div>
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            {success && <Alert variant="info"><AlertDescription>{success}</AlertDescription></Alert>}
            <Button type="submit" disabled={loading}>
              <Plus className="mr-2 h-4 w-4" />
              {loading ? 'Submitting…' : 'Submit Request'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {requests.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">My Requests</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {requests.map((r, i) => (
              <div key={r.id}>
                {i > 0 && <Separator className="mb-3" />}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      {statusIcon[r.status]}
                      <p className="text-sm font-medium">{r.product_name}</p>
                    </div>
                    {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                    {r.admin_note && (
                      <p className="text-xs italic text-muted-foreground">Admin: {r.admin_note}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={statusVariant[r.status]} className="shrink-0 capitalize">{r.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
