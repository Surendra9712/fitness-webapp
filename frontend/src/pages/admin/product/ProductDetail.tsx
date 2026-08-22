import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Package,
  Pencil,
  Tag,
  ToggleLeft,
  ToggleRight,
  Trash2,
  ShoppingCart,
  Wallet,
  Boxes,
  Star,
} from "lucide-react";
import useAdmin from "@/hooks/useAdmin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { StarDisplay } from "@/components/ui/star-rating";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ConfirmDialog from "@/components/ConfirmDialog";
import { ProductFormDialog } from "@/pages/admin/product/ProductFormDialog";
import ProductDiscountDialog from "@/pages/admin/discount/ProductDiscountDialog";
import { toast } from "sonner";
import type { OrderStatus } from "@/types";

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

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

function StatCard({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string | number;
  Icon: typeof ShoppingCart;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="rounded-lg bg-muted p-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [toggleConfirm, setToggleConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const { GetProductDetail, GetCategories, UpdateProduct, DeleteProduct } =
    useAdmin();
  const {
    data: product,
    isLoading,
    isError,
    refetch,
  } = GetProductDetail({ id: Number(id) });
  const { data: categoriesData } = GetCategories({
    queryParams: { page_size: 200 },
  });
  const categories = categoriesData?.items ?? [];
  const updateProduct = UpdateProduct();
  const deleteProduct = DeleteProduct();

  function invalidateLists() {
    queryClient.invalidateQueries({ queryKey: ["adminProducts"] });
  }

  async function confirmToggle() {
    if (!product) return;
    const newStatus = product.status === "active" ? "inactive" : "active";
    try {
      await updateProduct.mutateAsync({ id: product.id, status: newStatus });
      toast.success(
        `Product ${newStatus === "active" ? "activated" : "deactivated"}`,
      );
      refetch();
      invalidateLists();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setToggleConfirm(false);
    }
  }

  async function confirmDelete() {
    if (!product) return;
    try {
      await deleteProduct.mutateAsync(product.id);
      toast.success("Product deleted");
      invalidateLists();
      navigate("/admin/product-management");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleteConfirm(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-7 w-40" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardContent className="flex flex-col items-center gap-4 pt-8 pb-6">
              <Skeleton className="aspect-square w-full rounded-xl" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
          <div className="md:col-span-2 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <Package className="h-12 w-12 text-border" />
        <p className="text-sm text-muted-foreground">Product not found.</p>
        <Button
          variant="outline"
          onClick={() => navigate("/admin/product-management")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Button>
      </div>
    );
  }

  const stats = product.stats;
  const outOfStock = product.stock_quantity === 0;
  const lowStock = !outOfStock && product.stock_quantity <= 5;
  const hasDiscount = product.discounted_price != null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Product Detail</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left column — image, identity, actions */}
        <Card className="md:col-span-1 h-fit">
          <CardContent className="flex flex-col gap-4 pt-6 pb-6">
            <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-muted">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Package
                  className="h-16 w-16 text-muted-foreground/30"
                  strokeWidth={1.5}
                />
              )}
            </div>

            <div className="text-center">
              <p className="text-lg font-semibold leading-tight">
                {product.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {product.category_name ?? product.category}
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <Badge
                variant={product.status === "active" ? "success" : "secondary"}
                className="capitalize"
              >
                {product.status}
              </Badge>
              {outOfStock ? (
                <Badge variant="destructive">Out of stock</Badge>
              ) : lowStock ? (
                <Badge variant="warning">Low stock</Badge>
              ) : null}
              {hasDiscount && <Badge variant="info">Discounted</Badge>}
            </div>

            <div className="text-center">
              {hasDiscount ? (
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-2xl font-bold text-primary-700">
                    Rs. {Number(product.discounted_price).toFixed(2)}
                  </span>
                  <span className="text-sm line-through text-muted-foreground">
                    Rs. {Number(product.price).toFixed(2)}
                  </span>
                </div>
              ) : (
                <span className="text-2xl font-bold">
                  Rs. {Number(product.price).toFixed(2)}
                </span>
              )}
            </div>

            {stats.review_count > 0 && (
              <div className="flex justify-center">
                <StarDisplay
                  value={stats.avg_rating}
                  count={stats.review_count}
                  size="sm"
                />
              </div>
            )}

            <Separator />

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDiscountOpen(true)}
              >
                <Tag className="h-4 w-4 mr-2" />
                {hasDiscount ? "Edit Discount" : "Set Discount"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setToggleConfirm(true)}
              >
                {product.status === "active" ? (
                  <ToggleLeft className="h-4 w-4 mr-2" />
                ) : (
                  <ToggleRight className="h-4 w-4 mr-2 text-emerald-600" />
                )}
                {product.status === "active" ? "Deactivate" : "Activate"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right column — stats, info, orders, reviews */}
        <div className="md:col-span-2 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Units Sold"
              value={stats.units_sold}
              Icon={ShoppingCart}
            />
            <StatCard
              label="Revenue"
              value={`Rs. ${stats.revenue.toFixed(2)}`}
              Icon={Wallet}
            />
            <StatCard label="Orders" value={stats.order_count} Icon={Boxes} />
            <StatCard
              label="Reviews"
              value={stats.review_count}
              Icon={Star}
            />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Product Info</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <InfoRow label="Name" value={product.name} />
              <InfoRow
                label="Category"
                value={product.category_name ?? product.category}
              />
              <InfoRow
                label="Price"
                value={`Rs. ${Number(product.price).toFixed(2)}`}
              />
              <InfoRow
                label="Stock"
                value={`${product.stock_quantity} unit${
                  product.stock_quantity === 1 ? "" : "s"
                }`}
              />
              <InfoRow label="Status" value={product.status} />
              <InfoRow label="Added By" value={product.created_by_name} />
              <InfoRow
                label="Created"
                value={
                  product.created_at
                    ? new Date(product.created_at).toLocaleDateString()
                    : null
                }
              />
            </CardContent>
          </Card>

          {product.discount_value ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="h-4 w-4" /> Discount
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y">
                <InfoRow
                  label="Type"
                  value={
                    product.discount_type === "percentage"
                      ? "Percentage"
                      : "Fixed amount"
                  }
                />
                <InfoRow
                  label="Value"
                  value={
                    product.discount_type === "percentage"
                      ? `${product.discount_value}%`
                      : `Rs. ${product.discount_value}`
                  }
                />
                <InfoRow
                  label="Valid From"
                  value={
                    product.discount_valid_from
                      ? new Date(
                          product.discount_valid_from,
                        ).toLocaleDateString()
                      : "No start date"
                  }
                />
                <InfoRow
                  label="Valid To"
                  value={
                    product.discount_valid_to
                      ? new Date(product.discount_valid_to).toLocaleDateString()
                      : "No end date"
                  }
                />
                <InfoRow
                  label="Effective Price"
                  value={
                    hasDiscount
                      ? `Rs. ${Number(product.discounted_price).toFixed(2)}`
                      : "Not active (outside validity dates)"
                  }
                />
              </CardContent>
            </Card>
          ) : null}

          {product.description && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="rte-content text-sm leading-relaxed text-foreground"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent Orders</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.recent_orders.map((o) => (
                    <TableRow key={`${o.order_id}-${o.created_at}`}>
                      <TableCell className="font-medium">
                        #{o.order_id}
                      </TableCell>
                      <TableCell>{o.customer_name}</TableCell>
                      <TableCell>{o.quantity}</TableCell>
                      <TableCell>
                        Rs. {Number(o.price_at_purchase).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={STATUS_COLORS[o.status]}
                          className="capitalize"
                        >
                          {o.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!product.recent_orders.length && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No orders for this product yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent Reviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {product.recent_reviews.map((r) => (
                <div key={r.id} className="rounded-lg border px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">{r.user_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-1">
                    <StarDisplay value={r.rating} size="sm" />
                  </div>
                  {r.comment && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {r.comment}
                    </p>
                  )}
                </div>
              ))}
              {!product.recent_reviews.length && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No reviews yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ProductFormDialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) refetch();
        }}
        editing={product}
        categories={categories}
      />

      <ProductDiscountDialog
        open={discountOpen}
        onOpenChange={(v) => {
          setDiscountOpen(v);
          if (!v) refetch();
        }}
        product={product}
      />

      <ConfirmDialog
        open={toggleConfirm}
        onOpenChange={setToggleConfirm}
        title={
          product.status === "active"
            ? "Deactivate product?"
            : "Activate product?"
        }
        description={
          product.status === "active"
            ? `${product.name} will be hidden from the store.`
            : `${product.name} will be visible in the store again.`
        }
        confirmLabel={product.status === "active" ? "Deactivate" : "Activate"}
        destructive={product.status === "active"}
        onConfirm={confirmToggle}
      />

      <ConfirmDialog
        open={deleteConfirm}
        onOpenChange={setDeleteConfirm}
        title="Delete product?"
        description="This will permanently remove the product. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
