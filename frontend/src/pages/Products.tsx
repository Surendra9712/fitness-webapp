import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  ShoppingCart,
  ArrowRight,
  Package,
  Zap,
  Plus,
  Minus,
  Trash2,
} from "lucide-react";
import { api } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import PublicLayout from "@/components/PublicLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Product, Category } from "@/types";

// ── Category display metadata ─────────────────────────────────────────────────
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

// ── Cart ──────────────────────────────────────────────────────────────────────
type CartItem = { product: Product; quantity: number };
type Cart = Record<number, CartItem>;

export default function Products() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // products + filters
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  // cart (only relevant when logged in)
  const [cart, setCart] = useState<Cart>({});

  // checkout dialog
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [shippingAddress, setShippingAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [orderSuccess, setOrderSuccess] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<Product[]>("/public/products"),
      api.get<Category[]>("/public/categories").catch(() => [] as Category[]),
    ])
      .then(([prods, cats]) => {
        setProducts(prods);
        setCategories(cats);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter((p) => {
    if (category !== "all" && p.category !== category) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  // Cart helpers
  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cartItems.reduce(
    (s, i) => s + Number(i.product.price) * i.quantity,
    0,
  );

  function addToCart(product: Product) {
    setCart((prev) => ({
      ...prev,
      [product.id]: {
        product,
        quantity: (prev[product.id]?.quantity ?? 0) + 1,
      },
    }));
  }

  function adjustQty(productId: number, delta: number) {
    setCart((prev) => {
      const item = prev[productId];
      if (!item) return prev;
      const qty = item.quantity + delta;
      if (qty <= 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: { ...item, quantity: qty } };
    });
  }

  function removeFromCart(productId: number) {
    setCart((prev) => {
      const { [productId]: _, ...rest } = prev;
      return rest;
    });
  }

  async function placeOrder() {
    if (!shippingAddress.trim()) {
      setOrderError("Shipping address is required");
      return;
    }
    setSubmitting(true);
    setOrderError("");
    try {
      await api.post("/user/orders", {
        items: cartItems.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
        })),
        shipping_address: shippingAddress,
      });
      setOrderSuccess("Order placed! Redirecting to your orders…");
      setCart({});
      setCheckoutOpen(false);
      setTimeout(() => navigate("/customer/orders"), 1400);
    } catch (e) {
      setOrderError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  // Build filter tabs: always show "All", then dynamic from API
  const tabs = [
    { key: "all", label: "All Equipment" },
    ...categories.map((c) => ({ key: c.slug, label: c.name })),
  ];

  return (
    <PublicLayout>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-primary-950 px-6 pt-18 pb-20">
        {/* Watermark */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center select-none"
          style={{ transform: "rotate(-9deg)" }}
        >
          <span
            className="whitespace-nowrap text-[clamp(72px,18vw,200px)] font-black leading-none tracking-tighter"
            style={{ color: "rgba(34,197,94,0.055)" }}
          >
            EQUIPMENT
          </span>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute -top-1/5 left-1/2 h-3/5 w-3/5 -translate-x-1/2"
          style={{
            background:
              "radial-gradient(ellipse,rgba(34,197,94,0.08) 0%,transparent 70%)",
          }}
        />

        <div className="relative mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-400">
            <Zap className="h-2.5 w-2.5" />
            Professional-grade fitness equipment
          </div>

          <h1 className="mb-5 text-[clamp(40px,8vw,80px)] font-black leading-none tracking-tighter text-white">
            BUILT TO
            <br />
            <span className="text-primary-400">PERFORM.</span>
          </h1>

          <p className="mx-auto mb-10 max-w-md text-[clamp(15px,2vw,18px)] leading-relaxed text-primary-200">
            Every piece engineered for results. Built for the serious athlete —
            and everyone who wants to become one.
          </p>

          <div className="relative mx-auto max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-400" />
            <Input
              ref={searchRef}
              placeholder="Search equipment…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-white/10 bg-white/7 pl-11 text-white placeholder:text-primary-400 focus-visible:border-primary/50 focus-visible:ring-0"
            />
          </div>

          <div className="mt-12 flex justify-center gap-10">
            {[
              { value: products.length, label: "Products" },
              {
                value: products.filter((p) => p.stock_quantity > 0).length,
                label: "In stock",
              },
              { value: categories.length, label: "Categories" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-extrabold tracking-tight text-white">
                  {s.value}
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-widest text-primary-300">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Category filter + cart button ── */}
      <div className="sticky top-14 z-40 border-b bg-background shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-6">
          <div className="flex flex-1 gap-1.5 overflow-x-auto py-3 scrollbar-none">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setCategory(tab.key)}
                className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border-2 px-4 py-1.5 text-sm font-semibold whitespace-nowrap outline-none transition-all
                  ${
                    category === tab.key
                      ? "border-primary bg-primary-50 text-primary-800"
                      : "border-border bg-background text-muted-foreground hover:border-border hover:bg-muted"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Cart button — only for logged-in users */}
          {user && (
            <Button
              onClick={() => {
                setOrderError("");
                setCheckoutOpen(true);
              }}
              disabled={cartCount === 0}
              className="relative shrink-0 gap-2 bg-foreground text-background hover:bg-foreground/80"
              size="sm"
            >
              <ShoppingCart className="h-4 w-4" />
              Cart
              {cartCount > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-0.5 px-1.5 py-0 text-[10px]"
                >
                  {cartCount}
                </Badge>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* ── Order success banner ── */}
      {orderSuccess && (
        <div className="bg-primary-50 border-b border-primary-200 px-6 py-3 text-center text-sm font-medium text-primary-700">
          {orderSuccess}
        </div>
      )}

      {/* ── Product grid ── */}
      <main className="min-h-[50vh] bg-muted">
        <div className="mx-auto max-w-7xl px-6 pb-20 pt-10">
          {loading ? (
            <div className="flex flex-col items-center gap-4 py-20 text-muted-foreground">
              <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
              <span className="text-sm">Loading equipment…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-border" />
              <p className="mb-2 text-base text-muted-foreground">
                No equipment found.
              </p>
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="cursor-pointer border-0 bg-transparent text-sm font-semibold text-primary-600 hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="mb-6 text-sm font-medium text-muted-foreground">
                {filtered.length} item{filtered.length !== 1 ? "s" : ""}
                {category !== "all" &&
                  ` · ${tabs.find((t) => t.key === category)?.label}`}
                {search && ` · "${search}"`}
              </p>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(268px,1fr))] gap-5">
                {filtered.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    isLoggedIn={!!user}
                    cartQty={cart[p.id]?.quantity ?? 0}
                    onAdd={() => addToCart(p)}
                    onInc={() => adjustQty(p.id, 1)}
                    onDec={() => adjustQty(p.id, -1)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* ── Bottom CTA (guests only) ── */}
      {!user && (
        <section className="bg-primary-950 px-6 py-18 text-center">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-400">
            Ready to buy?
          </p>
          <h2 className="mb-3 text-[clamp(28px,5vw,44px)] font-black tracking-tighter text-white">
            Equip your gym today.
          </h2>
          <p className="mb-9 text-base text-primary-200">
            Create an account to place orders and track your deliveries.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary-600"
            >
              <Link to="/register">
                Create account <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/15 bg-transparent text-primary-200 hover:bg-white/10 hover:text-white"
            >
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </section>
      )}

      {/* ── Checkout dialog ── */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Your Cart</DialogTitle>
          </DialogHeader>

          <DialogBody>
            {cartItems.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Your cart is empty.
              </p>
            ) : (
              <div className="space-y-3">
                {cartItems.map(({ product, quantity }) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ${Number(product.price).toFixed(2)} × {quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-16 text-right text-sm font-semibold">
                        ${(Number(product.price) * quantity).toFixed(2)}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive hover:bg-destructive/10"
                        onClick={() => removeFromCart(product.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Separator className="my-4" />

            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>

            <div className="mt-4 space-y-1.5">
              <Label>Shipping Address</Label>
              <Input
                placeholder="Enter your shipping address"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
              />
            </div>

            {orderError && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{orderError}</AlertDescription>
              </Alert>
            )}
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>
              Continue Shopping
            </Button>
            <Button
              onClick={placeOrder}
              disabled={submitting || cartItems.length === 0}
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

// ── Product card ──────────────────────────────────────────────────────────────
interface ProductCardProps {
  product: Product;
  isLoggedIn: boolean;
  cartQty: number;
  onAdd: () => void;
  onInc: () => void;
  onDec: () => void;
}

function ProductCard({
  product,
  isLoggedIn,
  cartQty,
  onAdd,
  onInc,
  onDec,
}: ProductCardProps) {
  const meta = CAT_META[product.category] ?? fallbackMeta;
  const outOfStock = product.stock_quantity === 0;
  const [hovered, setHovered] = useState(false);

  return (
    <Card
      className="group flex flex-col overflow-hidden p-0 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Gradient image area */}
      <Link to={`/products/${product.id}`} className="block">
        <div
          className="relative flex h-40 items-center justify-center overflow-hidden"
          style={{ background: meta.gradient }}
        >
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-6xl opacity-35">{meta.glyph}</span>
          )}

          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/65">
              <span className="rounded-full bg-black/40 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-white">
                Out of stock
              </span>
            </div>
          )}

          {!outOfStock && product.stock_quantity <= 5 && (
            <div className="absolute right-2.5 top-2.5 rounded-full bg-black/55 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-yellow-300 backdrop-blur-sm">
              Only {product.stock_quantity} left
            </div>
          )}
        </div>
      </Link>

      {/* Body */}
      <CardContent className="flex flex-1 flex-col gap-2 px-5 pb-0 pt-4">
        <Badge
          className={`self-start text-[10px] font-extrabold uppercase tracking-widest ${meta.badgeClass}`}
        >
          {product.category_name ?? product.category}
        </Badge>
        <Link to={`/products/${product.id}`}>
          <h3 className="text-base font-bold leading-snug text-foreground hover:text-primary-700 transition-colors">
            {product.name}
          </h3>
        </Link>
        {product.description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>
        )}
      </CardContent>

      {/* Footer */}
      <CardFooter className="mt-auto flex items-center justify-between px-5 py-4">
        <div>
          <span className="text-2xl font-black tracking-tight text-foreground">
            ${Number(product.price).toFixed(2)}
          </span>
          {!outOfStock && (
            <div className="text-[11px] text-muted-foreground">
              {product.stock_quantity} in stock
            </div>
          )}
        </div>

        {/* Action area */}
        {outOfStock ? (
          <Button asChild variant="outline" size="sm">
            <Link to={isLoggedIn ? "/customer/request-product" : "/login"}>
              Request
            </Link>
          </Button>
        ) : isLoggedIn ? (
          cartQty > 0 ? (
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="outline"
                className="h-7 w-7"
                onClick={onDec}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-6 text-center text-sm font-semibold">
                {cartQty}
              </span>
              <Button
                size="icon"
                variant="outline"
                className="h-7 w-7"
                onClick={onInc}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              className={`gap-1.5 transition-colors ${hovered ? "bg-foreground/80" : "bg-foreground"} text-background`}
              onClick={onAdd}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Add to Cart
            </Button>
          )
        ) : (
          <Button
            asChild
            size="sm"
            className="gap-1.5 bg-foreground text-background hover:bg-foreground/80"
          >
            <Link to="/login">
              <ShoppingCart className="h-3.5 w-3.5" />
              Sign in to buy
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
