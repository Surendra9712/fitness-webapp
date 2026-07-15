import { useState } from "react";
import { Plus, Pencil, Trash2, Tag, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import ConfirmDialog from "@/components/ConfirmDialog";
import type { Category } from "@/types";
import CategoryFormDialog from "./CategoryFormDialog";
import useAdmin from "@/hooks/useAdmin";
import { usePagination } from "@/hooks/usePagination";
import { AppPagination } from "@/components/ui/app-pagination";
import { SearchInput } from "@/components/ui/search-input";
import { TableBodySkeleton } from "@/components/TableSkeleton";

export default function CategoryManagement() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const { page, pageSize, goToPage, setPageSize, resetPage } = usePagination({
    initialPageSize: 10,
  });

  const { GetCategories, DeleteCategory } = useAdmin();
  const { data: categoriesData, isFetching } = GetCategories({
    queryParams: { page, page_size: pageSize, search: search || undefined },
  });
  const categories = categoriesData?.items ?? [];
  const total = categoriesData?.total ?? 0;
  const deleteCategory = DeleteCategory();

  function handleSearch(value: string) {
    setSearch(value);
    resetPage();
  }

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setDialogOpen(true);
  }

  function handleDeleteClick(category: Category) {
    setPendingDelete(category);
    setConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteCategory.mutateAsync(pendingDelete.id);
      toast.success(`Category "${pendingDelete.name}" deleted successfully`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPendingDelete(null);
      setConfirmOpen(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage product categories used in the store.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <SearchInput
            value={search}
            onSearch={handleSearch}
            placeholder="Search categories…"
          />
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            {isFetching ? (
              <TableBodySkeleton columns={4} />
            ) : (
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">
                      {category.name}
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
                        {category.slug}
                      </code>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                      {category.description ?? "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(category)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDeleteClick(category)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {!categories.length && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-12 text-center text-muted-foreground"
                    >
                      <Tag className="mx-auto mb-2 h-10 w-10 opacity-30" />
                      {search
                        ? "No categories match your search"
                        : "No categories yet"}
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
      <CategoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editing}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete category?"
        description={`Delete "${pendingDelete?.name}"? This will fail if products are assigned to it.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
