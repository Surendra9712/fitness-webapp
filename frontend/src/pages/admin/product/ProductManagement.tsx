import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Package, Search } from "lucide-react";
import { api } from "@/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AppPagination } from "@/components/ui/app-pagination";
import { usePagination } from "@/hooks/usePagination";
import { ProductFormDialog } from "@/pages/admin/product/ProductFormDialog";
import type { Product, Category, PaginatedResponse } from "@/types";

const PAGE_SIZE = 10;

export default function ProductManagement() {
  const [data, setData] = useState<PaginatedResponse<Product>>({
    items: [],
    total: 0,
    page: 1,
    page_size: PAGE_SIZE,
    total_pages: 1,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [error, setError] = useState("");

  const { page, goToPage, resetPage } = usePagination();
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function load(p: number, q: string) {
    const params = new URLSearchParams({
      page: String(p),
      page_size: String(PAGE_SIZE),
      ...(q ? { search: q } : {}),
    });
    api
      .get<PaginatedResponse<Product>>(`/admin/products?${params}`)
      .then(setData)
      .catch((e) => setError((e as Error).message));
  }

  useEffect(() => {
    load(page, search);
  }, [page]);

  useEffect(() => {
    api
      .get<Category[]>("/admin/categories")
      .then(setCategories)
      .catch(console.error);
  }, []);

  function handleSearch(value: string) {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      resetPage();
      load(1, value);
    }, 300);
  }

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setDialogOpen(true);
  }

  async function del(id: number) {
    if (!confirm("Delete this product?")) return;
    try {
      await api.delete(`/admin/products/${id}`);
      load(page, search);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <p className="shrink-0 text-sm text-muted-foreground">
          {data.total} {data.total === 1 ? "product" : "products"}
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price(Rs)</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.name}
                    {/* {p.description && (
                      <div
                        className="max-w-xs truncate text-xs text-muted-foreground"
                        dangerouslySetInnerHTML={{ __html: p.description }}
                      />
                    )} */}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {p.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{p.price}</TableCell>
                  <TableCell
                    className={
                      p.stock_quantity === 0
                        ? "text-destructive font-medium"
                        : ""
                    }
                  >
                    {p.stock_quantity}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={p.status === "active" ? "success" : "secondary"}
                      className="capitalize"
                    >
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => del(p.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!data.items.length && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-muted-foreground"
                  >
                    <Package className="mx-auto mb-2 h-10 w-10 opacity-30" />
                    {search
                      ? "No products match your search"
                      : "No products yet"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AppPagination
        page={page}
        totalPages={data.total_pages}
        onPageChange={goToPage}
      />

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        categories={categories}
        onSaved={() => load(page, search)}
      />
    </div>
  );
}
