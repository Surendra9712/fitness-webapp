import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle, XCircle, Bell, MoreHorizontal } from "lucide-react";
import useAdmin from "@/hooks/useAdmin";
import { usePagination } from "@/hooks/usePagination";
import { AppPagination } from "@/components/ui/app-pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import type { ProductRequest } from "@/types";
import { TableBodySkeleton } from "@/components/TableSkeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ProductRequestDetailDialog,
  htmlToText,
} from "./ProductRequestDetailDialog";
import { PRICE_STEP, priceSchema } from "@/lib/money";

const statusVariant: Record<string, "info" | "success" | "destructive"> = {
  pending: "info",
  approved: "success",
  rejected: "destructive",
};

const approveSchema = z.object({
  price: priceSchema,
  stock_quantity: z.coerce.number().min(0, "Stock cannot be negative"),
  category: z.string().min(1, "Category is required"),
  admin_note: z.string().optional(),
});
type ApproveValues = z.infer<typeof approveSchema>;

const rejectSchema = z.object({
  admin_note: z.string().optional(),
});
type RejectValues = z.infer<typeof rejectSchema>;

export default function ProductRequests() {
  const [filter, setFilter] = useState("pending");
  const [approveDialog, setApproveDialog] = useState<ProductRequest | null>(
    null,
  );
  const [rejectDialog, setRejectDialog] = useState<ProductRequest | null>(null);
  // The row whose full request detail is open. Everything the dialog shows is
  // already in the list response, so opening it costs no extra fetch.
  const [detail, setDetail] = useState<ProductRequest | null>(null);

  const { page, pageSize, goToPage, setPageSize, resetPage } = usePagination({
    initialPageSize: 20,
  });

  const {
    GetProductRequests,
    ApproveProductRequest,
    RejectProductRequest,
    GetCategories,
  } = useAdmin();
  const { data, isPlaceholderData, isFetching, refetch } = GetProductRequests({
    queryParams: { status: filter, page, page_size: pageSize },
  });
  const requests = data?.items ?? [];
  const total = data?.total ?? 0;
  const { data: categoriesData } = GetCategories({
    queryParams: { page_size: 200 },
  });
  const categories = categoriesData?.items ?? [];
  const approveRequest = ApproveProductRequest();
  const rejectRequest = RejectProductRequest();

  const approveForm = useForm<ApproveValues>({
    resolver: zodResolver(approveSchema) as Resolver<ApproveValues>,
    defaultValues: {
      price: 0,
      stock_quantity: 0,
      category: "",
      admin_note: "",
    },
  });

  const rejectForm = useForm<RejectValues>({
    resolver: zodResolver(rejectSchema) as Resolver<RejectValues>,
    defaultValues: { admin_note: "" },
  });

  useEffect(() => {
    if (!approveDialog) return;
    approveForm.reset({
      price: 0,
      stock_quantity: 0,
      category: categories[0]?.slug ?? "",
      admin_note: "",
    });
  }, [approveDialog, categories]);

  useEffect(() => {
    if (!rejectDialog) return;
    rejectForm.reset({ admin_note: "" });
  }, [rejectDialog]);

  function handleFilterChange(value: string) {
    setFilter(value);
    resetPage();
  }

  async function onApprove(values: ApproveValues) {
    if (!approveDialog) return;
    try {
      await approveRequest.mutateAsync({
        id: approveDialog.id,
        price: values.price,
        stock_quantity: values.stock_quantity,
        category: values.category,
        admin_note: values.admin_note,
      });
      refetch();
      toast.success(
        `"${approveDialog.product_name}" approved and added to catalog`,
      );
      setApproveDialog(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function onReject(values: RejectValues) {
    if (!rejectDialog) return;
    try {
      await rejectRequest.mutateAsync({
        id: rejectDialog.id,
        admin_note: values.admin_note,
      });
      refetch();
      toast.success("Request rejected");
      setRejectDialog(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-center justify-between">
        <Select value={filter} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className={isPlaceholderData ? "opacity-70" : ""}>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            {isFetching ? (
              <TableBodySkeleton />
            ) : (
              <TableBody>
                {requests.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    title="View request detail"
                    onClick={() => setDetail(r)}
                  >
                    <TableCell>
                      <div className="font-medium">{r.product_name}</div>
                      {r.description && (
                        <div className="max-w-xs truncate text-xs text-muted-foreground">
                          {htmlToText(r.description)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{r.user_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.user_email}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                      {r.reason ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={statusVariant[r.status]}
                        className="capitalize"
                      >
                        {r.status}
                      </Badge>
                      {r.admin_note && (
                        <div className="mt-1 text-xs text-muted-foreground italic">
                          {r.admin_note}
                        </div>
                      )}
                    </TableCell>
                    {/* Actions sit inside a clickable row — stop the click so
                        the menu doesn't also open the detail dialog. */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {r.status === "pending" && (
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
                            <DropdownMenuItem
                              onClick={() => setApproveDialog(r)}
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />{" "}
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setRejectDialog(r)}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Reject
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!requests.length && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-12 text-center text-muted-foreground"
                    >
                      <Bell className="mx-auto mb-2 h-10 w-10 opacity-30" />
                      No {filter === "all" ? "" : filter} requests
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

      {detail && (
        <ProductRequestDetailDialog
          request={detail}
          onClose={() => setDetail(null)}
          // Hand off to the existing action dialogs rather than stacking two
          // dialogs on top of each other.
          onApprove={() => {
            setApproveDialog(detail);
            setDetail(null);
          }}
          onReject={() => {
            setRejectDialog(detail);
            setDetail(null);
          }}
        />
      )}

      <Dialog
        open={!!approveDialog}
        onOpenChange={(o) => !o && setApproveDialog(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Approve & Add to Catalog</DialogTitle>
          </DialogHeader>
          <Form {...approveForm}>
            <form onSubmit={approveForm.handleSubmit(onApprove)}>
              <DialogBody className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Adding <strong>{approveDialog?.product_name}</strong> as a new
                  product.
                </p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={approveForm.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Price (Rs.){" "}
                            <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step={PRICE_STEP}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={approveForm.control}
                      name="stock_quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Initial Stock</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={approveForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem key={c.slug} value={c.slug}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={approveForm.control}
                    name="admin_note"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Note to Customer (optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Now available in the shop!"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </DialogBody>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setApproveDialog(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={approveRequest.isPending}>
                  {approveRequest.isPending ? "Adding…" : "Approve & Add"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!rejectDialog}
        onOpenChange={(o) => !o && setRejectDialog(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
          </DialogHeader>
          <Form {...rejectForm}>
            <form onSubmit={rejectForm.handleSubmit(onReject)}>
              <DialogBody>
                <p className="text-sm text-muted-foreground">
                  Rejecting request for{" "}
                  <strong>{rejectDialog?.product_name}</strong>.
                </p>
                <FormField
                  control={rejectForm.control}
                  name="admin_note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Rejection (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Not within our product range"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </DialogBody>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRejectDialog(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={rejectRequest.isPending}
                >
                  {rejectRequest.isPending ? "Rejecting…" : "Reject"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
