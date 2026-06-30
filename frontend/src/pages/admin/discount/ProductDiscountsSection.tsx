import { useState } from "react";
import { Pencil, Loader2 } from "lucide-react";
import useAdmin from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ProductDiscountDialog from "./ProductDiscountDialog";
import type { Product } from "@/types";

export default function ProductDiscountsSection() {
  const { GetProducts } = useAdmin();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading } = GetProducts({ queryParams: { page_size: 100 } });
  const products = (data?.items ?? []) as Product[];

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Set a discount on individual products. The discounted price is shown on
        product cards and detail pages.
      </p>

      <Input
        placeholder="Search products…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Product
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Price
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                  Discount
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Discounted Price
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No products found
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const effectivePrice =
                    p.discounted_price != null
                      ? Number(p.discounted_price)
                      : null;

                  return (
                    <tr
                      key={p.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.category_name ?? p.category}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        Rs. {Number(p.price).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.discount_type ? (
                          <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                            {p.discount_type === "percentage"
                              ? `${Number(p.discount_value).toFixed(0)}% OFF`
                              : `Rs. ${Number(p.discount_value).toFixed(0)} OFF`}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {effectivePrice != null ? (
                          <span className="font-semibold text-primary-700">
                            Rs. {effectivePrice.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingProduct(p)}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          {p.discount_type ? "Edit" : "Add"}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      <ProductDiscountDialog
        open={editingProduct != null}
        onOpenChange={(v) => {
          if (!v) setEditingProduct(null);
        }}
        product={editingProduct}
      />
    </div>
  );
}
