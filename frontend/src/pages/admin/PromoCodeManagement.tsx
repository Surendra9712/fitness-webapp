import { useState } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Percent,
  Tag,
  CheckCircle2,
  XCircle,
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
import { toast } from "sonner";
import type { PromoCode } from "@/types";
import { DatePicker } from "@/components/ui/date-picker";

type PromoForm = {
  code: string;
  description: string;
  discount_type: "percentage" | "fixed";
  discount_value: string;
  min_order_amount: string;
  max_uses: string;
  valid_from: string;
  valid_to: string;
  is_active: boolean;
};

const EMPTY_FORM: PromoForm = {
  code: "",
  description: "",
  discount_type: "percentage",
  discount_value: "",
  min_order_amount: "0",
  max_uses: "",
  valid_from: "",
  valid_to: "",
  is_active: true,
};

export default function PromoCodeManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [form, setForm] = useState<PromoForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { page, pageSize, goToPage, setPageSize, resetPage } = usePagination({
    initialPageSize: 15,
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

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchQuery(search.trim());
    resetPage();
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(p: PromoCode) {
    setEditing(p);
    console.log(p);
    setForm({
      code: p.code,
      description: p.description ?? "",
      discount_type: p.discount_type,
      discount_value: String(p.discount_value),
      min_order_amount: String(p.min_order_amount),
      max_uses: p.max_uses != null ? String(p.max_uses) : "",
      valid_from: p.valid_from ?? "",
      valid_to: p.valid_to ?? "",
      is_active: p.is_active,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.code.trim()) {
      toast.error("Code is required");
      return;
    }
    if (!form.discount_value || Number(form.discount_value) <= 0) {
      toast.error("Discount value must be > 0");
      return;
    }
    if (
      form.discount_type === "percentage" &&
      Number(form.discount_value) > 100
    ) {
      toast.error("Percentage discount cannot exceed 100");
      return;
    }

    setSaving(true);
    const payload = {
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || undefined,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      min_order_amount: Number(form.min_order_amount) || 0,
      max_uses: form.max_uses ? Number(form.max_uses) : undefined,
      valid_from: form.valid_from || undefined,
      valid_to: form.valid_to || undefined,
      is_active: form.is_active,
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
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      await deleteMut.mutateAsync(id);
      toast.success("Promo code deleted");
      queryClient.invalidateQueries({ queryKey: ["adminPromoCodes"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Promo Codes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create discount codes with conditions and limits.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> New Code
        </Button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search codes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

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
                    <span className="truncate max-w-[200px]">
                      {p.description}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={deletingId === p.id}
                  onClick={() => handleDelete(p.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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

          <DialogBody>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>
                    Code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="SAVE20"
                    value={form.code}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                    disabled={!!editing}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Discount Type</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.discount_type}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        discount_type: e.target.value as "percentage" | "fixed",
                      }))
                    }
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (Rs.)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>
                    Discount Value <span className="text-destructive">*</span>
                    <span className="ml-1 text-muted-foreground font-normal">
                      ({form.discount_type === "percentage" ? "%" : "Rs."})
                    </span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max={
                      form.discount_type === "percentage" ? "100" : undefined
                    }
                    step="0.01"
                    placeholder="20"
                    value={form.discount_value}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, discount_value: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Min Order Amount (Rs.)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={form.min_order_amount}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        min_order_amount: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>
                  Max Uses{" "}
                  <span className="text-muted-foreground font-normal">
                    (leave blank for unlimited)
                  </span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="100"
                  value={form.max_uses}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, max_uses: e.target.value }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Valid From</Label>
                  <DatePicker
                    value={form.valid_from}
                    onChange={(v) => setForm((f) => ({ ...f, valid_from: v }))}
                    placeholder="Pick a date"
                    // disabledDates={(d) => d < new Date()}
                    startYear={new Date().getFullYear()}
                    endYear={new Date().getFullYear() + 18}
                    defaultMonth={
                      new Date(new Date().getFullYear(), new Date().getMonth())
                    }
                  />
                  {/* <Input
                    type="date"
                    value={form.valid_from}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, valid_from: e.target.value }))
                    }
                  /> */}
                </div>
                <div className="space-y-1.5">
                  <Label>Valid To</Label>
                  <DatePicker
                    value={form.valid_to}
                    onChange={(v) => setForm((f) => ({ ...f, valid_to: v }))}
                    placeholder="Pick a date"
                    startYear={new Date().getFullYear()}
                    endYear={new Date().getFullYear() + 18}
                    defaultMonth={
                      new Date(new Date().getFullYear(), new Date().getMonth())
                    }
                  />
                  {/* <Input
                    type="date"
                    value={form.valid_to}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, valid_to: e.target.value }))
                    }
                  /> */}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input
                  placeholder="Summer sale discount…"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.is_active}
                  onClick={() =>
                    setForm((f) => ({ ...f, is_active: !f.is_active }))
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? "bg-primary" : "bg-muted"}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.is_active ? "translate-x-6" : "translate-x-1"}`}
                  />
                </button>
                <Label
                  className="cursor-pointer"
                  onClick={() =>
                    setForm((f) => ({ ...f, is_active: !f.is_active }))
                  }
                >
                  Active
                </Label>
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
