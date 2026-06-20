import { useEffect, useState } from 'react'
import { ShoppingBag, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '@/api/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Order, OrderStatus } from '@/types'

const STATUS_COLORS: Record<OrderStatus, 'info' | 'success' | 'destructive' | 'secondary' | 'outline'> = {
  pending: 'info',
  confirmed: 'info',
  shipped: 'secondary',
  delivered: 'success',
  cancelled: 'destructive',
}

export default function MyOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<Order[]>('/user/orders').then(setOrders).catch(e => setError((e as Error).message))
  }, [])

  if (error) return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">My Orders</h1>

      {orders.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <ShoppingBag className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p>No orders yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <Card key={order.id}>
              <CardContent className="p-0">
                <button
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors rounded-lg"
                  onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-semibold">Order #{order.id}</p>
                      <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <Badge variant={STATUS_COLORS[order.status]} className="capitalize">{order.status}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold">${Number(order.total_amount).toFixed(2)}</span>
                    {expanded === order.id
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>

                {expanded === order.id && (
                  <div className="border-t px-4 py-3 space-y-2 bg-muted/20">
                    {order.items?.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.product_name} <span className="text-muted-foreground">× {item.quantity}</span></span>
                        <span className="font-medium">${(item.price_at_purchase * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    {order.shipping_address && (
                      <p className="mt-2 text-xs text-muted-foreground border-t pt-2">
                        Shipping to: {order.shipping_address}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
