import { useEffect, useState } from 'react'
import { ShoppingBag, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '@/api/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Order, OrderStatus } from '@/types'

const STATUS_COLORS: Record<OrderStatus, 'info' | 'success' | 'destructive' | 'secondary' | 'outline'> = {
  pending: 'info',
  confirmed: 'info',
  shipped: 'secondary',
  delivered: 'success',
  cancelled: 'destructive',
}

const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

export default function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)
  const [error, setError] = useState('')

  function load() {
    api.get<Order[]>('/admin/orders').then(setOrders).catch(e => setError((e as Error).message))
  }

  useEffect(() => { load() }, [])

  async function updateStatus(orderId: number, status: OrderStatus) {
    try {
      await api.put(`/admin/orders/${orderId}/status`, { status })
      load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Orders</h1>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Update Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map(order => (
                <>
                  <TableRow key={order.id} className="cursor-pointer" onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
                    <TableCell>
                      {expanded === order.id
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </TableCell>
                    <TableCell className="font-medium">#{order.id}</TableCell>
                    <TableCell>
                      <div className="text-sm">{order.user_name}</div>
                      <div className="text-xs text-muted-foreground">{order.user_email}</div>
                    </TableCell>
                    <TableCell className="font-semibold">${Number(order.total_amount).toFixed(2)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLORS[order.status]} className="capitalize">{order.status}</Badge>
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      {NEXT_STATUSES[order.status].length > 0 && (
                        <Select onValueChange={v => updateStatus(order.id, v as OrderStatus)}>
                          <SelectTrigger className="h-7 w-32 text-xs"><SelectValue placeholder="Move to…" /></SelectTrigger>
                          <SelectContent>
                            {NEXT_STATUSES[order.status].map(s => (
                              <SelectItem key={s} value={s} className="capitalize text-xs">{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                  </TableRow>
                  {expanded === order.id && (
                    <TableRow key={`${order.id}-items`}>
                      <TableCell colSpan={7} className="bg-muted/30 px-8 py-3">
                        <div className="space-y-1">
                          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Order Items</p>
                          {order.items?.map(item => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span>{item.product_name} × {item.quantity}</span>
                              <span className="text-muted-foreground">${(item.price_at_purchase * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                          {order.shipping_address && (
                            <p className="mt-2 text-xs text-muted-foreground">Ship to: {order.shipping_address}</p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
              {!orders.length && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    <ShoppingBag className="mx-auto mb-2 h-10 w-10 opacity-30" />
                    No orders yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
