import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  ArrowLeft,
  ArrowRight,
  Package,
  Zap,
  Flame,
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
import { usePagination } from "@/hooks/usePagination";
import { AppPagination } from "@/components/ui/app-pagination";
import PublicLayout from "@/components/PublicLayout";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { Product, GlobalDiscount } from "@/types";
import { SearchInput } from "@/components/ui/search-input";
import useUser from "@/hooks/useUser";

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

export default function Products() {
  const { user } = useAuth();
  const { items, add, setQty } = useCartStore();

  const { page, goToPage, resetPage, pageSize, setPageSize } = usePagination({
    initialPageSize: 50,
  });
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const { GetProducts, GetCategories } = usePublic();
  const { GetGlobalDiscount } = useUser();
  const { data, isLoading } = GetProducts({
    queryParams: {
      page,
      page_size: pageSize,
      category: category !== "all" ? category : undefined,
      q: search || undefined,
    },
  });
  const products = data?.items ?? [];
  const total = data?.total ?? 0;
  const { data: categoriesData = [] } = GetCategories({
    queryParams: { page_size: 100 },
  });
  const { data: globalDiscountData } = GetGlobalDiscount({});
  const globalDiscount = globalDiscountData as GlobalDiscount | undefined;
  const showGlobalDiscount = Boolean(
    globalDiscount?.is_active && globalDiscount.discount_value,
  );
  const globalDiscountLabel =
    globalDiscount?.discount_type === "percentage"
      ? `${Number(globalDiscount.discount_value)}% OFF`
      : `RS. ${Number(globalDiscount?.discount_value).toFixed(0)} OFF`;

  function handleSearch(value: string) {
    setSearch(value);
    resetPage();
  }

  function handleCategory(key: string) {
    setCategory(key);
    resetPage();
  }

  const tabs = [
    { key: "all", label: "All Equipment" },
    ...categoriesData?.map((c) => ({ key: c.slug, label: c.name })),
  ];

  return (
    <PublicLayout>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-black px-6 pt-18 pb-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center select-none bg-[url('https://static.vecteezy.com/system/resources/thumbnails/073/783/710/small/person-lifting-barbell-in-gym-free-photo.jpg')] bg-cover bg-center bg-no-repeat opacity-30"
        ></div>
        <div
          aria-hidden
          className="pointer-events-none absolute -top-1/5 left-1/2 h-3/5 w-3/5 -translate-x-1/2"
          style={{
            background:
              "radial-gradient(ellipse,rgba(34,197,94,0.08) 0%,transparent 70%)",
          }}
        />

        <div className="relative mx-auto max-w-3xl text-center">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="absolute left-0 top-0 text-primary-200 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>

          <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-400">
            <Zap className="h-2.5 w-2.5" />
            Professional-grade fitness equipment
          </div>

          <h1 className="mb-5 text-[clamp(24px,4vw,40px)] font-black leading-none tracking-tighter text-white">
            BUILT TO
            <br />
            <span className="text-primary-400">PERFORM.</span>
          </h1>

          <p className="mx-auto mb-10 max-w-md text-[clamp(15px,2vw,18px)] leading-relaxed text-primary-200">
            Every piece engineered for results. Built for the serious athlete —
            and everyone who wants to become one.
          </p>

          <div className="relative mx-auto max-w-md">
            <SearchInput
              value={search}
              onSearch={handleSearch}
              placeholder="Search equipment…"
              className="border-white/10 bg-white/7  text-white placeholder:text-primary-400 focus-visible:border-primary/50"
            />
            {/* <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-400" />
            <Input
              ref={searchRef}
              placeholder="Search equipment…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="border-white/10 bg-white/7 pl-11 text-white placeholder:text-primary-400 focus-visible:border-primary/50 focus-visible:ring-0"
            /> */}
          </div>
        </div>
      </section>

      {/* ── Global discount banner ── */}
      {showGlobalDiscount && (
        <div className="bg-linear-to-r from-red-600 via-red-500 to-orange-500 px-6 py-3 text-center">
          <p className="flex items-center justify-center gap-1.5 text-sm font-bold uppercase tracking-wide text-white sm:text-base">
            <Flame className="h-4 w-4 shrink-0" />
            Sitewide Sale — {globalDiscountLabel} everything!
          </p>
        </div>
      )}

      {/* ── Category filter ── */}
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
        </div>
      </div>

      {/* ── Product grid ── */}
      <main className="min-h-[50vh] bg-muted">
        <div className="mx-auto max-w-7xl px-6 pb-20 pt-10">
          {isLoading ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(268px,1fr))] gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
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
              <div className="grid grid-cols-[repeat(auto-fill,minmax(268px,1fr))] gap-5">
                {products.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    isLoggedIn={!!user}
                    cartQty={items[p.id]?.quantity ?? 0}
                    onAdd={() => {
                      add({
                        product_id: p.id,
                        name: p.name,
                        price: Number(p.price),
                        discounted_price:
                          p.discounted_price != null
                            ? Number(p.discounted_price)
                            : null,
                        stock_quantity: p.stock_quantity,
                      });
                      toast.success(`${p.name} added to cart`);
                    }}
                    onInc={() => setQty(p.id, (items[p.id]?.quantity ?? 0) + 1)}
                    onDec={() => setQty(p.id, (items[p.id]?.quantity ?? 0) - 1)}
                  />
                ))}
              </div>
              <div className="mt-10">
                <AppPagination
                  page={page}
                  total={total}
                  pageSize={pageSize}
                  onPageChange={goToPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            </>
          )}
        </div>
      </main>

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
              <Link to="/login?tab=register">
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
    </PublicLayout>
  );
}

// ── Product card skeleton ────────────────────────────────────────────────────
function ProductCardSkeleton() {
  return (
    <Card className="flex flex-col overflow-hidden p-0">
      <Skeleton className="h-40 w-full rounded-none" />
      <CardContent className="flex flex-1 flex-col gap-2 px-5 pb-0 pt-4">
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
      </CardContent>
      <CardFooter className="mt-auto flex items-center justify-between px-5 py-4">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </CardFooter>
    </Card>
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
  const qtyLeft = product.stock_quantity - cartQty;
  const outOfStock = qtyLeft === 0;

  return (
    <Card className="group flex flex-col overflow-hidden p-0 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
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
            <meta.Icon className="h-16 w-16 opacity-35 text-white" strokeWidth={1.5} />
          )}
          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/65">
              <span className="rounded-full bg-black/40 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-white">
                Out of stock
              </span>
            </div>
          )}
          {product.discounted_price != null && (
            <div className="absolute left-2.5 top-2.5 rounded-full bg-red-500 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              {product.discount_type === "percentage"
                ? `${Number(product.discount_value).toFixed(0)}% OFF`
                : `RS. ${Number(product.discount_value).toFixed(0)} OFF`}
            </div>
          )}
          {!outOfStock && product.stock_quantity <= 5 && (
            <div className="absolute right-2.5 top-2.5 rounded-full bg-black/55 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-yellow-300 backdrop-blur-sm">
              Only {qtyLeft} left
            </div>
          )}
        </div>
        <CardContent className="flex flex-1 flex-col gap-2 px-5 pb-0 pt-4">
          <Badge
            className={`self-start text-[10px] font-extrabold uppercase tracking-widest ${meta.badgeClass}`}
          >
            {product.category_name ?? product.category}
          </Badge>
          {/* <Link to={`/products/${product.id}`}> */}
          <h3 className="text-base font-bold leading-snug text-foreground hover:text-primary-700 transition-colors">
            {product.name}
          </h3>
          {/* </Link> */}
          {product.description && (
            <div
              dangerouslySetInnerHTML={{ __html: product.description }}
              className="line-clamp-2 text-sm leading-relaxed text-muted-foreground"
            />
          )}
        </CardContent>
      </Link>

      <CardFooter className="mt-auto flex items-center justify-between px-5 py-4">
        <div>
          {product.discounted_price != null ? (
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-black tracking-tight text-primary-700">
                RS. {Number(product.discounted_price).toFixed(0)}
              </span>
              <span className="text-sm line-through text-muted-foreground">
                RS. {Number(product.price).toFixed(0)}
              </span>
            </div>
          ) : (
            <span className="text-2xl font-black tracking-tight text-foreground">
              RS. {product.price}
            </span>
          )}
          {!outOfStock && (
            <div className="text-[11px] text-muted-foreground">
              {qtyLeft} in stock
            </div>
          )}
        </div>

        {outOfStock ? (
          <Button asChild variant="outline" size="sm">
            <Link to={isLoggedIn ? "/customer/request-product" : "/login"}>
              Request
            </Link>
          </Button>
        ) : isLoggedIn ? (
          cartQty === product.stock_quantity ? null : cartQty > 0 ? (
            <QuantityStepper
              size="sm"
              value={cartQty}
              onChange={(v) => (v > cartQty ? onInc() : onDec())}
              min={0}
            />
          ) : (
            <Button size="sm" onClick={onAdd}>
              <ShoppingCart className="h-3.5 w-3.5" />
              Add
            </Button>
          )
        ) : (
          <Button asChild size="sm">
            <Link to="/login">
              <ShoppingCart className="h-3.5 w-3.5" />
              Add
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
