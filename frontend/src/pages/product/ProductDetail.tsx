import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  ShoppingCart,
  Package,
  Activity,
  Dumbbell,
  Cog,
  Flower2,
  Shirt,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCartStore } from "@/store/cartStore";
import usePublic from "@/hooks/usePublic";
import PublicLayout from "@/components/PublicLayout";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { StarDisplay } from "@/components/ui/star-rating";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ProductReviews } from "./ProductReviews";

type CatMeta = { gradient: string; badgeClass: string; Icon: LucideIcon };

const CAT_META: Record<string, CatMeta> = {
  cardio: {
    gradient: "linear-gradient(140deg,#f97316,#dc2626)",
    badgeClass: "bg-orange-100 text-orange-700 border-0",
    Icon: Activity,
  },
  strength: {
    gradient: "linear-gradient(140deg,#3B82F6,#4338CA)",
    badgeClass: "bg-blue-100 text-blue-700 border-0",
    Icon: Dumbbell,
  },
  machines: {
    gradient: "linear-gradient(140deg,#64748B,#1E293B)",
    badgeClass: "bg-slate-100 text-slate-600 border-0",
    Icon: Cog,
  },
  recovery: {
    gradient: "linear-gradient(140deg,#8B5CF6,#BE185D)",
    badgeClass: "bg-purple-100 text-purple-700 border-0",
    Icon: Flower2,
  },
  accessories: {
    gradient: "linear-gradient(140deg,#10B981,#0F766E)",
    badgeClass: "bg-primary-100 text-primary-700 border-0",
    Icon: Shirt,
  },
};
const fallbackMeta: CatMeta = CAT_META.machines;

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { add, items: cartItems } = useCartStore();

  const [quantity, setQuantity] = useState(1);

  const { GetProduct, GetProductReviews } = usePublic();
  const { data: product, isLoading, isError } = GetProduct(id);
  const { data: reviewStats } = GetProductReviews(product?.id);

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="border-b bg-background">
          <div className="mx-auto max-w-6xl px-6 py-3">
            <Skeleton className="h-4 w-64" />
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="grid gap-10 md:grid-cols-2">
            {/* Left: image */}
            <div className="space-y-4">
              <Skeleton className="aspect-square w-full rounded-2xl" />
            </div>

            {/* Right: details */}
            <div className="flex flex-col gap-6">
              <div className="space-y-3">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-32" />
              </div>

              <div className="space-y-2">
                <Skeleton className="h-9 w-40" />
                <Skeleton className="h-4 w-28" />
              </div>

              <Separator />

              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-28" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-11 w-full rounded-md" />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mt-14">
            <Separator className="mb-10" />
            <Skeleton className="mb-6 h-6 w-40" />
            <div className="max-w-2xl space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>

          {/* Reviews */}
          <div className="mt-14 space-y-4">
            <Separator className="mb-10" />
            <Skeleton className="h-6 w-32" />
            <div className="space-y-4">
              <div className="space-y-2 rounded-lg border p-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <div className="space-y-2 rounded-lg border p-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (isError || !product) {
    return (
      <PublicLayout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <Package className="h-16 w-16 text-border" />
          <h2 className="text-xl font-bold">Product not found</h2>
          <p className="text-muted-foreground">
            This product may have been removed or is no longer available.
          </p>
          <Button asChild variant="outline">
            <Link to="/products">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Store
            </Link>
          </Button>
        </div>
      </PublicLayout>
    );
  }

  const meta = CAT_META[product.category] ?? fallbackMeta;
  const outOfStock = product.stock_quantity === 0;
  const lowStock = !outOfStock && product.stock_quantity <= 5;
  const cartQty = cartItems[product.id]?.quantity ?? 0;
  const remaining = Math.max(0, product.stock_quantity - cartQty);
  const effectivePrice =
    product.discounted_price != null
      ? Number(product.discounted_price)
      : Number(product.price);
  const orderTotal = effectivePrice * quantity;

  function handleAddToCart() {
    if (!product) return;
    const toAdd = Math.min(quantity, remaining);
    if (toAdd <= 0) {
      toast.error("You've already added all available stock to your cart");
      return;
    }
    add(
      {
        product_id: product.id,
        name: product.name,
        price: Number(product.price),
        discounted_price:
          product.discounted_price != null
            ? Number(product.discounted_price)
            : null,
        stock_quantity: product.stock_quantity,
      },
      toAdd,
    );
    toast.success(`${product.name} added to cart`);
  }

  return (
    <PublicLayout>
      {/* ── Breadcrumb ── */}
      <div className="border-b bg-background">
        <div className="mx-auto max-w-6xl px-6 py-3">
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link
              to="/products"
              className="hover:text-foreground transition-colors"
            >
              Store
            </Link>
            <span>/</span>
            <span className="text-muted-foreground">
              {product.category_name ?? product.category}
            </span>
            <span>/</span>
            <span className="text-foreground font-medium truncate max-w-[200px]">
              {product.name}
            </span>
          </nav>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-10 md:grid-cols-2">
          {/* Left: image */}
          <div className="space-y-4">
            <div
              className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl"
              style={{ background: meta.gradient }}
            >
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <meta.Icon
                  className="h-28 w-28 opacity-30 text-white"
                  strokeWidth={1.5}
                />
              )}
              {outOfStock && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <span className="rounded-full bg-black/50 px-5 py-2 text-sm font-extrabold uppercase tracking-widest text-white">
                    Out of Stock
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: details */}
          <div className="flex flex-col gap-6">
            <div className="space-y-3">
              <Badge
                className={`text-[10px] font-extrabold uppercase tracking-widest ${meta.badgeClass}`}
              >
                {product.category_name ?? product.category}
              </Badge>
              <h1 className="text-3xl font-black leading-tight tracking-tight text-foreground">
                {product.name}
              </h1>
              {reviewStats && reviewStats.count > 0 && (
                <StarDisplay
                  value={reviewStats.avg_rating}
                  count={reviewStats.count}
                  size="sm"
                />
              )}
            </div>

            <div>
              {product.discounted_price != null ? (
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-black tracking-tight text-primary-700">
                    RS. {product.discounted_price}
                  </span>
                  <span className="text-xl line-through text-muted-foreground font-medium">
                    RS. {product.price}
                  </span>
                  <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-bold text-white">
                    {product.discount_type === "percentage"
                      ? `${product.discount_value}% OFF`
                      : `RS. ${product.discount_value} OFF`}
                  </span>
                </div>
              ) : (
                <span className="text-4xl font-black tracking-tight text-foreground">
                  RS. {product.price}
                </span>
              )}
              <div className="mt-1 text-sm">
                {outOfStock ? (
                  <span className="font-semibold text-destructive">
                    Out of stock
                  </span>
                ) : lowStock ? (
                  <span className="font-semibold text-amber-600">
                    Only {product.stock_quantity} left in stock
                  </span>
                ) : (
                  <span className="text-primary-600 font-semibold">
                    {product.stock_quantity} in stock
                  </span>
                )}
              </div>
            </div>

            <Separator />

            {product.description && (
              <div
                className="rte-content text-sm leading-relaxed text-muted-foreground line-clamp-4"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            )}

            {!outOfStock && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    Qty
                  </span>
                  <QuantityStepper
                    value={quantity}
                    onChange={setQuantity}
                    min={1}
                    max={remaining > 0 ? remaining : 1}
                  />
                  <span className="text-sm text-muted-foreground">
                    ={" "}
                    <strong className="text-foreground">
                      RS. {orderTotal}
                    </strong>
                  </span>
                </div>

                {cartQty > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {cartQty} already in cart
                    {remaining === 0 && " · all stock reserved"}
                  </p>
                )}

                {user ? (
                  <Button
                    size="lg"
                    className="w-full gap-2 bg-foreground text-background hover:bg-foreground/80"
                    onClick={handleAddToCart}
                    disabled={remaining === 0}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {remaining === 0 ? "All stock in cart" : "Add to Cart"}
                  </Button>
                ) : (
                  <>
                    <Button
                      asChild
                      size="lg"
                      className="w-full gap-2 bg-foreground text-background hover:bg-foreground/80"
                    >
                      <Link to="/login">
                        <ShoppingCart className="h-4 w-4" />
                        Sign in to Buy
                      </Link>
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      Don't have an account?{" "}
                      <Link
                        to="/login?tab=register"
                        className="font-semibold text-primary-600 hover:underline"
                      >
                        Register free
                      </Link>
                    </p>
                  </>
                )}
              </div>
            )}

            {outOfStock && (
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link to={user ? "/customer/request-product" : "/login"}>
                  Request this product
                </Link>
              </Button>
            )}

            <Button
              asChild
              variant="ghost"
              className="w-fit -ml-2 text-muted-foreground"
            >
              <Link to="/products">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to Store
              </Link>
            </Button>
          </div>
        </div>

        {/* ── Full description ── */}
        {product.description && (
          <div className="mt-14">
            <Separator className="mb-10" />
            <h2 className="mb-6 text-xl font-bold tracking-tight text-foreground">
              Product Details
            </h2>
            <div
              className="rte-content max-w-2xl text-sm leading-relaxed text-foreground"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          </div>
        )}

        {/* ── Reviews ── */}
        <ProductReviews reviewStats={reviewStats} product={product} />
      </div>
    </PublicLayout>
  );
}
