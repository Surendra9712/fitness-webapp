import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Edit2,
  Trash2,
  Percent,
  Tag,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import useAdmin from "@/hooks/useAdmin";
import { usePagination } from "@/hooks/usePagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AppPagination } from "@/components/ui/app-pagination";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/ConfirmDialog";
import { toast } from "sonner";
import type { PromoCode } from "@/types";
import { DatePicker } from "@/components/ui/date-picker";
import { SearchInput } from "@/components/ui/search-input";

const promoSchema = z
  .object({
    code: z.string().min(1, "Code is required"),
    description: z.string().optional(),
    discount_type: z.enum(["percentage", "fixed"]),
    discount_value: z.coerce.number().positive("Discount value must be > 0"),
    min_order_amount: z.coerce.number().min(0, "Cannot be negative"),
    max_uses: z.string().optional(),
    valid_from: z.string().optional(),
    valid_to: z.string().optional(),
    is_active: z.boolean(),
  })
  .refine(
    (data) =>
      !(data.discount_type === "percentage" && data.discount_value > 100),
    {
      message: "Percentage discount cannot exceed 100",
      path: ["discount_value"],
    },
  );

type PromoValues = z.infer<typeof promoSchema>;

const EMPTY_FORM: PromoValues = {
  code: "",
  description: "",
  discount_type: "percentage",
  discount_value: 0,
  min_order_amount: 0,
  max_uses: "",
  valid_from: "",
  valid_to: "",
  is_active: true,
};

export default function PromoCodeManagement() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PromoCode | null>(null);

  const { page, pageSize, goToPage, setPageSize, resetPage } = usePagination({
    initialPageSize: 20,
  });
  const { GetPromoCodes, CreatePromoCode, UpdatePromoCode, DeletePromoCode } =
    useAdmin();

  const createMut = CreatePromoCode();
  const updateMut = UpdatePromoCode();
  const deleteMut = DeletePromoCode();

  const { data, isLoading } = GetPromoCodes({
    queryParams: { search: searchQuery, page, page_size: pageSize },
  });

  const rows: PromoCode[] = data?.items ?? [];
  const total = data?.total ?? 0;

  const form = useForm<PromoValues>({
    resolver: zodResolver(promoSchema) as Resolver<PromoValues>,
    defaultValues: EMPTY_FORM,
  });
  const { isSubmitting } = form.formState;

  useEffect(() => {
    if (!dialogOpen) return;
    if (editing) {
      form.reset({
        code: editing.code,
        description: editing.description ?? "",
        discount_type: editing.discount_type,
        discount_value: Number(editing.discount_value),
        min_order_amount: Number(editing.min_order_amount),
        max_uses: editing.max_uses != null ? String(editing.max_uses) : "",
        valid_from: editing.valid_from ?? "",
        valid_to: editing.valid_to ?? "",
        is_active: editing.is_active,
      });
    } else {
      form.reset(EMPTY_FORM);
    }
  }, [dialogOpen, editing]);

  function handleSearch(value: string) {
    setSearchQuery(value);
    resetPage();
  }

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(p: PromoCode) {
    setEditing(p);
    setDialogOpen(true);
  }

  async function onSubmit(values: PromoValues) {
    const payload = {
      code: values.code.trim().toUpperCase(),
      description: values.description?.trim() || undefined,
      discount_type: values.discount_type,
      discount_value: values.discount_value,
      min_order_amount: values.min_order_amount || 0,
      max_uses: values.max_uses ? Number(values.max_uses) : undefined,
      valid_from: values.valid_from || undefined,
      valid_to: values.valid_to || undefined,
      is_active: values.is_active,
    };

    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, ...payload });
        toast.success("Promo code updated");
      } else {
        await createMut.mutateAsync(payload as never);
        toast.success("Promo code created");
      }
      queryClient.invalidateQueries({ queryKey: ["adminPromoCodes"] });
      setDialogOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  function handleDeleteClick(p: PromoCode) {
    setPendingDelete(p);
    setConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteMut.mutateAsync(pendingDelete.id);
      toast.success(`Promo code "${pendingDelete.code}" deleted`);
      queryClient.invalidateQueries({ queryKey: ["adminPromoCodes"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPendingDelete(null);
      setConfirmOpen(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="mt-1 text-sm text-muted-foreground">
        Create discount codes with conditions and limits.
      </p>

      <div className="flex justify-between gap-4 items-center">
        <SearchInput placeholder="Search codes…" onSearch={handleSearch} />
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> New Code
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Tag className="h-12 w-12 text-muted-foreground/30" />
          <p className="font-medium text-muted-foreground">
            No promo codes yet
          </p>
          <Button onClick={openCreate} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" /> Create one
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {rows.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Percent className="h-5 w-5 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-sm">{p.code}</span>
                  <Badge
                    variant={
                      p.discount_type === "percentage" ? "info" : "secondary"
                    }
                    className="text-xs"
                  >
                    {p.discount_type === "percentage"
                      ? `${p.discount_value}%`
                      : `Rs. ${p.discount_value}`}{" "}
                    off
                  </Badge>
                  <Badge
                    variant={p.is_active ? "success" : "secondary"}
                    className="text-xs gap-1"
                  >
                    {p.is_active ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3" /> Inactive
                      </>
                    )}
                  </Badge>
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  {p.min_order_amount > 0 && (
                    <span>Min: Rs. {p.min_order_amount}</span>
                  )}
                  <span>
                    Used: {p.current_uses}
                    {p.max_uses ? ` / ${p.max_uses}` : " (unlimited)"}
                  </span>
                  {p.valid_from && (
                    <span>
                      From: {new Date(p.valid_from).toLocaleDateString()}
                    </span>
                  )}
                  {p.valid_to && (
                    <span>
                      Until: {new Date(p.valid_to).toLocaleDateString()}
                    </span>
                  )}
                  {p.description && (
                    <span className="truncate max-w-50">{p.description}</span>
                  )}
                </div>
              </div>

              <div className="shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(p)}>
                      <Edit2 className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleDeleteClick(p)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {total > pageSize && (
        <AppPagination
          page={page}
          total={total}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          onPageChange={goToPage}
        />
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Promo Code" : "New Promo Code"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <DialogBody>
                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Code <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="SAVE20"
                              {...field}
                              onChange={(e) =>
                                field.onChange(e.target.value.toUpperCase())
                              }
                              disabled={!!editing}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="discount_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discount Type</FormLabel>
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
                              <SelectItem value="percentage">
                                Percentage (%)
                              </SelectItem>
                              <SelectItem value="fixed">
                                Fixed Amount (Rs.)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="discount_value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Discount Value{" "}
                            <span className="text-destructive">*</span>
                            <span className="ml-1 text-muted-foreground font-normal">
                              (
                              {form.watch("discount_type") === "percentage"
                                ? "%"
                                : "Rs."}
                              )
                            </span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max={
                                form.watch("discount_type") === "percentage"
                                  ? "100"
                                  : undefined
                              }
                              step="0.01"
                              placeholder="20"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="min_order_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Min Order Amount (Rs.)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="max_uses"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Max Uses{" "}
                          <span className="text-muted-foreground font-normal">
                            (leave blank for unlimited)
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="100"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="valid_from"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valid From</FormLabel>
                          <FormControl>
                            <DatePicker
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Pick a date"
                              startYear={new Date().getFullYear()}
                              endYear={new Date().getFullYear() + 18}
                              defaultMonth={
                                new Date(
                                  new Date().getFullYear(),
                                  new Date().getMonth(),
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="valid_to"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valid To</FormLabel>
                          <FormControl>
                            <DatePicker
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Pick a date"
                              startYear={new Date().getFullYear()}
                              endYear={new Date().getFullYear() + 18}
                              defaultMonth={
                                new Date(
                                  new Date().getFullYear(),
                                  new Date().getMonth(),
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Summer sale discount…"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={field.value}
                            onClick={() => field.onChange(!field.value)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${field.value ? "bg-primary" : "bg-muted"}`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${field.value ? "translate-x-6" : "translate-x-1"}`}
                            />
                          </button>
                          <Label
                            className="cursor-pointer"
                            onClick={() => field.onChange(!field.value)}
                          >
                            Active
                          </Label>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </DialogBody>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving…" : editing ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete promo code?"
        description={`Delete "${pendingDelete?.code}"? Customers will no longer be able to redeem it. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
