import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ShoppingCart, Package } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCartStore } from "@/store/cartStore";
import usePublic from "@/hooks/usePublic";
import PublicLayout from "@/components/PublicLayout";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { StarDisplay } from "@/components/ui/star-rating";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ProductReviews } from "./ProductReviews";

type CatMeta = { gradient: string; badgeClass: string; glyph: string };

const CAT_META: Record<string, CatMeta> = {
  cardio: {
    gradient: "linear-gradient(140deg,#f97316,#dc2626)",
    badgeClass: "bg-orange-100 text-orange-700 border-0",
    glyph: "🏃",
  },
  strength: {
    gradient: "linear-gradient(140deg,#3B82F6,#4338CA)",
    badgeClass: "bg-blue-100 text-blue-700 border-0",
    glyph: "🏋️",
  },
  machines: {
    gradient: "linear-gradient(140deg,#64748B,#1E293B)",
    badgeClass: "bg-slate-100 text-slate-600 border-0",
    glyph: "⚙️",
  },
  recovery: {
    gradient: "linear-gradient(140deg,#8B5CF6,#BE185D)",
    badgeClass: "bg-purple-100 text-purple-700 border-0",
    glyph: "🧘",
  },
  accessories: {
    gradient: "linear-gradient(140deg,#10B981,#0F766E)",
    badgeClass: "bg-primary-100 text-primary-700 border-0",
    glyph: "🎽",
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
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-muted-foreground">
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
          <span className="text-sm">Loading product…</span>
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
  const effectivePrice = product.discounted_price != null ? Number(product.discounted_price) : Number(product.price);
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
        discounted_price: product.discounted_price != null ? Number(product.discounted_price) : undefined,
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
                <span className="text-[120px] opacity-30">{meta.glyph}</span>
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
                    RS. {Number(product.discounted_price).toFixed(2)}
                  </span>
                  <span className="text-xl line-through text-muted-foreground font-medium">
                    RS. {Number(product.price).toFixed(2)}
                  </span>
                  <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-bold text-white">
                    {product.discount_type === 'percentage'
                      ? `${Number(product.discount_value).toFixed(0)}% OFF`
                      : `RS. ${Number(product.discount_value).toFixed(0)} OFF`}
                  </span>
                </div>
              ) : (
                <span className="text-4xl font-black tracking-tight text-foreground">
                  RS. {Number(product.price).toFixed(2)}
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
                      RS. {orderTotal.toFixed(2)}
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
