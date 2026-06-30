import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, X } from "lucide-react";
import useAdmin from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import type { Product } from "@/types";

const schema = z
  .object({
    discount_type: z.enum(["percentage", "fixed"]),
    discount_value: z
      .number({ error: "Enter a valid number" })
      .positive("Must be greater than 0"),
    valid_from: z.string().nullable(),
    valid_to: z.string().nullable(),
  })
  .refine(
    (v) => {
      if (v.valid_from && v.valid_to) return v.valid_to >= v.valid_from;
      return true;
    },
    { message: "End date must be on or after start date", path: ["valid_to"] },
  );

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product: Product | null;
}

export default function ProductDiscountDialog({
  open,
  onOpenChange,
  product,
}: Props) {
  const qc = useQueryClient();
  const { SetProductDiscount, ClearProductDiscount } = useAdmin();
  const setDiscount = SetProductDiscount();
  const clearDiscount = ClearProductDiscount();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      discount_type: "percentage",
      discount_value: 0,
      valid_from: null,
      valid_to: null,
    },
  });

  const discountType = form.watch("discount_type");
  const discountValue = form.watch("discount_value");

  useEffect(() => {
    if (!product || !open) return;
    form.reset({
      discount_type:
        (product.discount_type as "percentage" | "fixed") ?? "percentage",
      discount_value: product.discount_value ?? 0,
      valid_from: product.discount_valid_from ?? null,
      valid_to: product.discount_valid_to ?? null,
    });
  }, [product, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const effectivePrice = (() => {
    if (!product || !discountValue || discountValue <= 0) return null;
    if (discountType === "percentage") {
      return (
        Math.round(Number(product.price) * (1 - discountValue / 100) * 100) /
        100
      );
    }
    return Math.max(0, Number(product.price) - discountValue);
  })();

  async function onSubmit(values: FormValues) {
    if (!product) return;
    try {
      await setDiscount.mutateAsync({
        id: product.id,
        discount_type: values.discount_type,
        discount_value: values.discount_value,
        valid_from: values.valid_from,
        valid_to: values.valid_to,
      });
      toast.success("Discount saved");
      qc.invalidateQueries({ queryKey: ["adminProducts"] });
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleClear() {
    if (!product) return;
    try {
      await clearDiscount.mutateAsync(product.id);
      toast.success("Discount removed");
      qc.invalidateQueries({ queryKey: ["adminProducts"] });
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (!product) return null;
  const busy = setDiscount.isPending || clearDiscount.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Set Discount — {product.name}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Original price:{" "}
              <strong>Rs. {Number(product.price).toFixed(2)}</strong>
            </p>

            {/* Discount type */}
            <FormField
              control={form.control}
              name="discount_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (Rs.)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Discount value */}
            <FormField
              control={form.control}
              name="discount_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Discount Value{" "}
                    <span className="font-normal text-muted-foreground">
                      ({discountType === "percentage" ? "%" : "Rs."})
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step={discountType === "percentage" ? "1" : "0.01"}
                      max={discountType === "percentage" ? "100" : undefined}
                      placeholder={
                        discountType === "percentage" ? "e.g. 10" : "e.g. 500"
                      }
                      value={field.value || ""}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="valid_from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid From</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value ?? ""}
                        onChange={(v) => field.onChange(v || null)}
                        placeholder="No start date"
                        endYear={new Date().getFullYear() + 5}
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
                        value={field.value ?? ""}
                        onChange={(v) => field.onChange(v || null)}
                        placeholder="No end date"
                        endYear={new Date().getFullYear() + 5}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Price preview */}
            {effectivePrice != null && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 text-sm">
                <span className="text-muted-foreground">Discounted price: </span>
                <strong className="text-primary-700 text-base">
                  Rs. {effectivePrice.toFixed(2)}
                </strong>
                <span className="ml-2 line-through text-muted-foreground text-xs">
                  Rs. {Number(product.price).toFixed(2)}
                </span>
              </div>
            )}

            <DialogFooter className="gap-2 pt-2">
              {product.discount_value && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClear}
                  disabled={busy}
                  className="text-destructive hover:text-destructive"
                >
                  {clearDiscount.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  Remove Discount
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {setDiscount.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Discount
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
