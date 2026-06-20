import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ShoppingCart,
  Plus,
  Minus,
  Package,
  CheckCircle2,
} from "lucide-react";
import { api } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import PublicLayout from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Product } from "@/types";

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
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [quantity, setQuantity] = useState(1);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [shippingAddress, setShippingAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get<Product>(`/public/products/${id}`)
      .then(setProduct)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  async function placeOrder() {
    if (!product) return;
    if (!shippingAddress.trim()) {
      setOrderError("Shipping address is required");
      return;
    }
    setSubmitting(true);
    setOrderError("");
    try {
      await api.post("/user/orders", {
        items: [{ product_id: product.id, quantity }],
        shipping_address: shippingAddress,
      });
      setOrderSuccess(true);
      setCheckoutOpen(false);
      setTimeout(() => navigate("/customer/orders"), 1600);
    } catch (e) {
      setOrderError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <PublicLayout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-muted-foreground">
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
          <span className="text-sm">Loading product…</span>
        </div>
      </PublicLayout>
    );
  }

  if (notFound || !product) {
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
  const orderTotal = Number(product.price) * quantity;

  return (
    <PublicLayout>
      {/* ── Breadcrumb ── */}
      <div className="border-b bg-background">
        <div className="mx-auto max-w-6xl px-6 py-3">
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link to="/products" className="hover:text-foreground transition-colors">
              Store
            </Link>
            <span>/</span>
            <span className="text-muted-foreground">{product.category_name ?? product.category}</span>
            <span>/</span>
            <span className="text-foreground font-medium truncate max-w-[200px]">{product.name}</span>
          </nav>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-10 lg:grid-cols-2">

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
            {/* Category + title */}
            <div className="space-y-3">
              <Badge className={`text-[10px] font-extrabold uppercase tracking-widest ${meta.badgeClass}`}>
                {product.category_name ?? product.category}
              </Badge>
              <h1 className="text-3xl font-black leading-tight tracking-tight text-foreground">
                {product.name}
              </h1>
            </div>

            {/* Price */}
            <div>
              <span className="text-4xl font-black tracking-tight text-foreground">
                ${Number(product.price).toFixed(2)}
              </span>
              <div className="mt-1 text-sm">
                {outOfStock ? (
                  <span className="font-semibold text-destructive">Out of stock</span>
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

            {/* Short description preview */}
            {product.description && (
              <div
                className="rte-content text-sm leading-relaxed text-muted-foreground line-clamp-4"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            )}

            {/* Success state */}
            {orderSuccess && (
              <div className="flex items-center gap-2 rounded-lg bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Order placed! Redirecting to your orders…
              </div>
            )}

            {/* Quantity + CTA */}
            {!outOfStock && !orderSuccess && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">Qty</span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-10 text-center text-sm font-semibold">
                      {quantity}
                    </span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() =>
                        setQuantity((q) => Math.min(product.stock_quantity, q + 1))
                      }
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    = <strong className="text-foreground">${orderTotal.toFixed(2)}</strong>
                  </span>
                </div>

                {user ? (
                  <Button
                    size="lg"
                    className="w-full gap-2 bg-foreground text-background hover:bg-foreground/80"
                    onClick={() => {
                      setOrderError("");
                      setCheckoutOpen(true);
                    }}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Buy Now
                  </Button>
                ) : (
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
                )}

                {!user && (
                  <p className="text-center text-xs text-muted-foreground">
                    Don't have an account?{" "}
                    <Link to="/register" className="font-semibold text-primary-600 hover:underline">
                      Register free
                    </Link>
                  </p>
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

            {/* Back link */}
            <Button asChild variant="ghost" className="w-fit -ml-2 text-muted-foreground">
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
      </div>

      {/* ── Checkout dialog ── */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Order</DialogTitle>
          </DialogHeader>

          <DialogBody>
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <p className="font-semibold text-foreground">{product.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {quantity} × ${Number(product.price).toFixed(2)}
                </p>
                <p className="mt-2 text-lg font-black text-foreground">
                  Total: ${orderTotal.toFixed(2)}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Shipping Address</Label>
                <Input
                  placeholder="Enter your shipping address"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                />
              </div>

              {orderError && (
                <Alert variant="destructive">
                  <AlertDescription>{orderError}</AlertDescription>
                </Alert>
              )}
            </div>
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={placeOrder}
              disabled={submitting}
              className="bg-primary text-primary-foreground hover:bg-primary-600"
            >
              {submitting ? "Placing…" : "Place Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PublicLayout>
  );
}
