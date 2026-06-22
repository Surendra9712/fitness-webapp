import { useState } from "react";
import { ShoppingBag, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import useAdmin from "@/hooks/useAdmin";
import { usePagination } from "@/hooks/usePagination";
import { AppPagination } from "@/components/ui/app-pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ConfirmDialog from "@/components/ConfirmDialog";
import { toast } from "sonner";
import type { Order, OrderStatus } from "@/types";

const STATUS_COLORS: Record<
  OrderStatus,
  "info" | "success" | "destructive" | "secondary" | "outline"
> = {
  pending: "info",
  confirmed: "info",
  shipped: "secondary",
  delivered: "success",
  cancelled: "destructive",
};

const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cod: "COD",
  esewa: "eSewa",
  khalti: "Khalti",
};

export default function OrderManagement() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const { page, pageSize, goToPage, setPageSize } = usePagination({ initialPageSize: 20 });

  const { GetOrders, UpdateOrderStatus, DeleteOrder } = useAdmin();
  const { data, isPlaceholderData } = GetOrders({ queryParams: { page, page_size: pageSize } });
  const orders = data?.items ?? [];
  const total = data?.total ?? 0;
  const updateStatus = UpdateOrderStatus();
  const deleteOrder = DeleteOrder();

  async function handleUpdateStatus(orderId: number, status: OrderStatus) {
    try {
      await updateStatus.mutateAsync({ orderId, status });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function handleDeleteClick(orderId: number) {
    setPendingDeleteId(orderId);
    setConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    try {
      await deleteOrder.mutateAsync(pendingDeleteId);
      toast.success(`Order #${pendingDeleteId} deleted`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setConfirmOpen(false);
      setPendingDeleteId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <p className="text-sm text-muted-foreground">{total} {total === 1 ? 'order' : 'orders'}</p>
      </div>

      <Card className={isPlaceholderData ? "opacity-70" : ""}>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Total(Rs.)</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Update Status</TableHead>
                <TableHead className="w-10 sticky right-0 bg-white" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <>
                  <TableRow
                    key={order.id}
                    className="cursor-pointer"
                    onClick={() =>
                      setExpanded(expanded === order.id ? null : order.id)
                    }
                  >
                    <TableCell>
                      {expanded === order.id ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>

                    <TableCell className="font-medium">#{order.id}</TableCell>

                    <TableCell>
                      <div className="text-sm">{order.user_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {order.user_email}
                      </div>
                    </TableCell>

                    <TableCell className="font-semibold">
                      {order.total_amount}
                    </TableCell>

                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="text-xs font-medium">
                        {PAYMENT_METHOD_LABEL[
                          (order as Order & { payment_method?: string })
                            .payment_method ?? ""
                        ] ?? "—"}
                      </div>
                      {(order as Order & { payment_status?: string })
                        .payment_status && (
                        <div
                          className={`text-[10px] font-semibold ${
                            (order as Order & { payment_status?: string })
                              .payment_status === "paid"
                              ? "text-primary-600"
                              : "text-muted-foreground"
                          }`}
                        >
                          {
                            (order as Order & { payment_status?: string })
                              .payment_status
                          }
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={STATUS_COLORS[order.status]}
                        className="capitalize"
                      >
                        {order.status}
                      </Badge>
                    </TableCell>

                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {NEXT_STATUSES[order.status].length > 0 && (
                        <Select
                          onValueChange={(v) =>
                            handleUpdateStatus(order.id, v as OrderStatus)
                          }
                        >
                          <SelectTrigger className="h-7 w-32 text-xs">
                            <SelectValue placeholder="Move to…" />
                          </SelectTrigger>
                          <SelectContent>
                            {NEXT_STATUSES[order.status].map((s) => (
                              <SelectItem
                                key={s}
                                value={s}
                                className="capitalize text-xs"
                              >
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>

                    <TableCell
                      className="sticky right-0 bg-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        disabled={deleteOrder.isPending && pendingDeleteId === order.id}
                        onClick={() => handleDeleteClick(order.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>

                  {expanded === order.id && (
                    <TableRow key={`${order.id}-items`}>
                      <TableCell colSpan={9} className="bg-muted/30 px-8 py-3">
                        <div className="space-y-1">
                          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                            Order Items
                          </p>
                          {order.items?.map((item) => (
                            <div
                              key={item.id}
                              className="flex justify-between text-sm"
                            >
                              <span>
                                {item.product_name} × {item.quantity}
                              </span>
                              <span className="text-muted-foreground">
                                Rs.{" "}
                                {(
                                  item.price_at_purchase * item.quantity
                                ).toFixed(2)}
                              </span>
                            </div>
                          ))}
                          {order.shipping_address && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Ship to: {order.shipping_address}
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}

              {!orders.length && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="py-12 text-center text-muted-foreground"
                  >
                    <ShoppingBag className="mx-auto mb-2 h-10 w-10 opacity-30" />
                    No orders yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AppPagination page={page} total={total} pageSize={pageSize} onPageSizeChange={setPageSize} onPageChange={goToPage} />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete order?"
        description={`Order #${pendingDeleteId} will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
