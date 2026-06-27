import { useRef, useState } from "react";
import {
  Plus,
  Package,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import useAdmin from "@/hooks/useAdmin";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppPagination } from "@/components/ui/app-pagination";
import { usePagination } from "@/hooks/usePagination";
import { ProductFormDialog } from "@/pages/admin/product/ProductFormDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import { toast } from "sonner";
import type { Product } from "@/types";

export default function ProductManagement() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const { page, goToPage, resetPage, setPageSize, pageSize } = usePagination();
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  const { GetProducts, GetCategories, UpdateProduct, DeleteProduct } = useAdmin();
  const { data, isPlaceholderData } = GetProducts({
    queryParams: {
      page,
      page_size: pageSize,
      search: debouncedSearch || undefined,
    },
  });

  const { data: categoriesData } = GetCategories({
    queryParams: { page_size: 200 },
  });

  const categories = categoriesData?.items ?? [];
  const updateProduct = UpdateProduct();
  const deleteProduct = DeleteProduct();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  function handleSearch(value: string) {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
      resetPage();
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

  async function toggleStatus(p: Product) {
    const newStatus = p.status === "active" ? "inactive" : "active";
    try {
      await updateProduct.mutateAsync({ id: p.id, status: newStatus } as any);
      toast.success(
        `Product ${newStatus === "active" ? "activated" : "deactivated"}`,
      );
      queryClient.invalidateQueries({ queryKey: ["adminProducts"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function handleDeleteClick(id: number) {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    try {
      await deleteProduct.mutateAsync(pendingDeleteId);
      toast.success("Product deleted");
      queryClient.invalidateQueries({ queryKey: ["adminProducts"] });
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
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

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
          {total} {total === 1 ? "product" : "products"}
        </p>
      </div>

      <Card className={isPlaceholderData ? "opacity-70" : ""}>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price (Rs)</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {p.category_name ?? p.category}
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
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleStatus(p)}>
                          {p.status === "active" ? (
                            <>
                              <ToggleLeft className="h-4 w-4 mr-2" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <ToggleRight className="h-4 w-4 mr-2 text-emerald-600" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteClick(p.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!items.length && (
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
        total={total}
        onPageChange={goToPage}
        onPageSizeChange={setPageSize}
        pageSize={pageSize}
      />

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        categories={categories}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete product?"
        description="This will permanently remove the product. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
