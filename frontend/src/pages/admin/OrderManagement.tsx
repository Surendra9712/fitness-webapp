import { Fragment, useState } from "react";
import { ShoppingBag, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import useAdmin from "@/hooks/useAdmin";
import { usePagination } from "@/hooks/usePagination";
import { AppPagination } from "@/components/ui/app-pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { useQueryClient } from "@tanstack/react-query";
import { TableBodySkeleton } from "@/components/TableSkeleton";

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
  stripe: "Card",
};

const PAYMENT_STATUS_COLORS: Record<
  string,
  "info" | "success" | "destructive" | "secondary" | "outline"
> = {
  pending: "outline",
  paid: "success",
  failed: "destructive",
  refunded: "secondary",
};

type OrderWithPayment = Order & {
  payment_method?: string;
  payment_status?: string;
};

function formatCurrency(amount: number) {
  return `Rs. ${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function OrderManagement() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { page, pageSize, goToPage, setPageSize } = usePagination({
    initialPageSize: 20,
  });

  const { GetOrders, UpdateOrderStatus, DeleteOrder } = useAdmin();
  const { data, isPlaceholderData, isFetching } = GetOrders({
    queryParams: { page, page_size: pageSize },
  });
  const orders = data?.items ?? [];
  const total = data?.total ?? 0;
  const updateStatus = UpdateOrderStatus();
  const deleteOrder = DeleteOrder();

  async function handleUpdateStatus(orderId: number, status: OrderStatus) {
    try {
      await updateStatus.mutateAsync({ orderId, status });
      queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
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
        <p className="text-sm text-muted-foreground">
          {total} {total === 1 ? "order" : "orders"}
        </p>
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
                <TableHead className="w-10 sticky right-0 bg-white">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            {isFetching ? (
              <TableBodySkeleton columns={9} largeCol={[2]} />
            ) : (
              <TableBody>
                {orders.map((order) => {
                  const payment = order as OrderWithPayment;
                  const isExpanded = expanded === order.id;
                  return (
                    <Fragment key={order.id}>
                      <TableRow
                        className={`cursor-pointer ${isExpanded ? "bg-muted/40" : ""}`}
                        onClick={() =>
                          setExpanded(isExpanded ? null : order.id)
                        }
                      >
                        <TableCell>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>

                        <TableCell className="font-medium">
                          #{order.id}
                        </TableCell>

                        <TableCell>
                          <div className="text-sm font-medium">
                            {order.user_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {order.user_email}
                          </div>
                        </TableCell>

                        <TableCell className="font-semibold tabular-nums">
                          {formatCurrency(order.total_amount)}
                        </TableCell>

                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium">
                              {PAYMENT_METHOD_LABEL[
                                payment.payment_method ?? ""
                              ] ?? "—"}
                            </span>
                            {payment.payment_status && (
                              <Badge
                                variant={
                                  PAYMENT_STATUS_COLORS[
                                    payment.payment_status
                                  ] ?? "outline"
                                }
                                className="w-fit px-1.5 py-0 text-[10px] capitalize"
                              >
                                {payment.payment_status}
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString(
                            undefined,
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            },
                          )}
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
                            disabled={
                              deleteOrder.isPending &&
                              pendingDeleteId === order.id
                            }
                            onClick={() => handleDeleteClick(order.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow key={`${order.id}-items`}>
                          <TableCell colSpan={9} className="bg-muted/20 p-0">
                            <div className="grid gap-6 border-t p-6 md:grid-cols-3">
                              <div className="md:col-span-2">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Order Items ({order.items?.length ?? 0})
                                </p>
                                <div className="overflow-hidden rounded-md border bg-background">
                                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
                                    <span>Product</span>
                                    <span className="text-right">Qty</span>
                                    <span className="text-right">
                                      Unit Price
                                    </span>
                                    <span className="text-right">
                                      Line Total
                                    </span>
                                  </div>
                                  <div className="divide-y">
                                    {order.items?.map((item) => (
                                      <div
                                        key={item.id}
                                        className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-2.5 text-sm"
                                      >
                                        <span className="font-medium text-foreground">
                                          {item.product_name}
                                        </span>
                                        <span className="text-right text-muted-foreground">
                                          ×{item.quantity}
                                        </span>
                                        <span className="text-right tabular-nums text-muted-foreground">
                                          {formatCurrency(
                                            item.price_at_purchase,
                                          )}
                                        </span>
                                        <span className="text-right font-semibold tabular-nums">
                                          {formatCurrency(
                                            item.price_at_purchase *
                                              item.quantity,
                                          )}
                                        </span>
                                      </div>
                                    ))}
                                    {!order.items?.length && (
                                      <div className="px-4 py-3 text-sm text-muted-foreground">
                                        No items recorded for this order.
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex justify-between border-t bg-muted/30 px-4 py-2.5 text-sm font-semibold">
                                    <span>Total</span>
                                    <span className="tabular-nums">
                                      {formatCurrency(order.total_amount)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div>
                                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Delivery Address
                                  </p>
                                  <p className="text-sm leading-relaxed">
                                    {order.shipping_address ||
                                      "No address provided"}
                                  </p>
                                </div>

                                <Separator />

                                <div>
                                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Payment
                                  </p>
                                  <div className="space-y-1.5 text-sm">
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground">
                                        Method
                                      </span>
                                      <span className="font-medium">
                                        {PAYMENT_METHOD_LABEL[
                                          payment.payment_method ?? ""
                                        ] ?? "—"}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground">
                                        Status
                                      </span>
                                      {payment.payment_status ? (
                                        <Badge
                                          variant={
                                            PAYMENT_STATUS_COLORS[
                                              payment.payment_status
                                            ] ?? "outline"
                                          }
                                          className="capitalize"
                                        >
                                          {payment.payment_status}
                                        </Badge>
                                      ) : (
                                        <span>—</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <Separator />

                                <div>
                                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Placed On
                                  </p>
                                  <p className="text-sm">
                                    {new Date(order.created_at).toLocaleString(
                                      undefined,
                                      {
                                        dateStyle: "medium",
                                        timeStyle: "short",
                                      },
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}

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
            )}
          </Table>
        </CardContent>
      </Card>
      <AppPagination
        page={page}
        total={total}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        onPageChange={goToPage}
      />
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
