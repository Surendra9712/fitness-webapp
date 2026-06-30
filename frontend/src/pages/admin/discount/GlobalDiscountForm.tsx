import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Globe, Loader2, Save } from "lucide-react";
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
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import type { GlobalDiscount } from "@/types";

const schema = z
  .object({
    is_active: z.boolean(),
    discount_type: z.enum(["percentage", "fixed"]),
    discount_value: z
      .number({ error: "Enter a valid number" })
      .min(0, "Must be 0 or more"),
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

export default function GlobalDiscountForm() {
  const qc = useQueryClient();
  const { GetGlobalDiscount, UpdateGlobalDiscount } = useAdmin();
  const { data: gd, isLoading } = GetGlobalDiscount({});
  const updateMut = UpdateGlobalDiscount();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      is_active: false,
      discount_type: "percentage",
      discount_value: 0,
      valid_from: null,
      valid_to: null,
    },
  });

  const { watch } = form;
  const isActive = watch("is_active");
  const discountType = watch("discount_type");
  const discountValue = watch("discount_value");

  useEffect(() => {
    if (!gd) return;
    const d = gd as GlobalDiscount;
    form.reset({
      is_active: d.is_active,
      discount_type: d.discount_type,
      discount_value: d.discount_value,
      valid_from: d.valid_from ?? null,
      valid_to: d.valid_to ?? null,
    });
  }, [gd]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(values: FormValues) {
    try {
      await updateMut.mutateAsync(values as GlobalDiscount);
      toast.success("Global discount updated");
      qc.invalidateQueries({ queryKey: ["adminGlobalDiscount"] });
      qc.invalidateQueries({ queryKey: ["publicGlobalDiscount"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const previewDiscount = (() => {
    const val = discountValue;
    if (!val || val <= 0 || !isActive) return null;
    return discountType === "percentage"
      ? `${val}% off on all products`
      : `Rs. ${val} off on all products`;
  })();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg">
      <p className="text-sm text-muted-foreground">
        A global discount automatically applies to every product at checkout. It
        stacks with per-product discounts and promo codes.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Active toggle */}
          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border px-4 py-3">
                <FormLabel className="text-base font-semibold cursor-pointer">
                  Enable Global Discount
                </FormLabel>
                <FormControl>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={field.value}
                    onClick={() => field.onChange(!field.value)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      field.value ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        field.value ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </FormControl>
              </FormItem>
            )}
          />

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
                    <SelectItem value="percentage">
                      Percentage (%) — e.g. 10% off
                    </SelectItem>
                    <SelectItem value="fixed">
                      Fixed Amount (Rs.) — e.g. Rs. 200 off
                    </SelectItem>
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
                    disabled={!isActive}
                    value={field.value}
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
                      disabled={!isActive}
                      disabledDates={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        const d = new Date(date);
                        d.setHours(0, 0, 0, 0);

                        return d < today;
                      }}
                      startYear={new Date().getFullYear()}
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
                      disabled={!isActive}
                      disabledDates={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        const d = new Date(date);
                        d.setHours(0, 0, 0, 0);

                        return d < today;
                      }}
                      startYear={new Date().getFullYear()}
                      endYear={new Date().getFullYear() + 5}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Preview */}
          {previewDiscount && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
              <Globe className="inline h-4 w-4 mr-1.5 mb-0.5" />
              Active global discount: <strong>{previewDiscount}</strong>
            </div>
          )}

          <Button type="submit" disabled={updateMut.isPending}>
            {updateMut.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Global Discount
          </Button>
        </form>
      </Form>
    </div>
  );
}
