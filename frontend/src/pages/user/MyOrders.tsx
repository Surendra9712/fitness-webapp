import { useState } from 'react'
import { ShoppingBag, ChevronDown, ChevronUp, X } from 'lucide-react'
import useUser from '@/hooks/useUser'
import { usePagination } from '@/hooks/usePagination'
import { AppPagination } from '@/components/ui/app-pagination'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import ConfirmDialog from '@/components/ConfirmDialog'
import { toast } from 'sonner'
import type { Order, OrderStatus } from '@/types'

const STATUS_COLORS: Record<OrderStatus, 'info' | 'success' | 'destructive' | 'secondary' | 'outline'> = {
  pending:   'info',
  confirmed: 'info',
  shipped:   'secondary',
  delivered: 'success',
  cancelled: 'destructive',
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cod:    'Cash on Delivery',
  esewa:  'eSewa',
  khalti: 'Khalti',
}

export default function MyOrders() {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingCancelId, setPendingCancelId] = useState<number | null>(null)

  const { page, pageSize, goToPage, setPageSize } = usePagination({ initialPageSize: 10 })

  const { GetOrders, CancelOrder } = useUser()
  const { data, isLoading } = GetOrders({ queryParams: { page, page_size: pageSize } })
  const orders = data?.items ?? []
  const total = data?.total ?? 0
  const cancelOrder = CancelOrder()

  function handleCancelClick(orderId: number) {
    setPendingCancelId(orderId)
    setConfirmOpen(true)
  }

  async function confirmCancel() {
    if (!pendingCancelId) return
    try {
      await cancelOrder.mutateAsync(pendingCancelId)
      toast.success('Order cancelled')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setConfirmOpen(false)
      setPendingCancelId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

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
                <div className="flex w-full items-center justify-between px-4 py-3 gap-2">
                  <button
                    className="flex flex-1 items-center gap-4 text-left"
                    onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                  >
                    <div>
                      <p className="font-semibold">Order #{order.id}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={STATUS_COLORS[order.status]} className="capitalize">
                      {order.status}
                    </Badge>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold">Rs. {Number(order.total_amount).toFixed(2)}</span>

                    {order.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={cancelOrder.isPending && pendingCancelId === order.id}
                        onClick={() => handleCancelClick(order.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                        {cancelOrder.isPending && pendingCancelId === order.id ? 'Cancelling…' : 'Cancel'}
                      </Button>
                    )}

                    <button onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
                      {expanded === order.id
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </div>
                </div>

                {expanded === order.id && (
                  <div className="border-t px-4 py-3 space-y-2 bg-muted/20">
                    {order.items?.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>
                          {item.product_name}{' '}
                          <span className="text-muted-foreground">× {item.quantity}</span>
                        </span>
                        <span className="font-medium">
                          Rs. {(item.price_at_purchase * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}

                    <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 border-t pt-2 text-xs text-muted-foreground">
                      {order.shipping_address && (
                        <span>Shipping to: {order.shipping_address}</span>
                      )}
                      {(order as Order & { payment_method?: string }).payment_method && (
                        <span>
                          Payment:{' '}
                          <span className="font-medium text-foreground">
                            {PAYMENT_METHOD_LABEL[(order as Order & { payment_method?: string }).payment_method!]
                              ?? (order as Order & { payment_method?: string }).payment_method}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AppPagination page={page} total={total} pageSize={pageSize} onPageSizeChange={setPageSize} onPageChange={goToPage} />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Cancel order?"
        description="This order will be cancelled and cannot be undone."
        confirmLabel="Cancel Order"
        onConfirm={confirmCancel}
      />
    </div>
  )
}
