import { useEffect, useState } from "react";
import {
  Trash2,
  Tag,
  Star,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import useUser from "@/hooks/useUser";
import type { GlobalDiscount } from "@/types";
import { useCartStore } from "@/store/cartStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerBody,
  DrawerFooter,
} from "@/components/ui/drawer";
import { toast } from "sonner";
import type { PromoValidateResult } from "@/types";

export interface CheckoutItem {
  product_id: number;
  quantity: number;
  name: string;
  price: number;
  stock_quantity: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  items: CheckoutItem[];
  onSuccess: () => void;
}

type PaymentMethod = "cod" | "esewa";

interface EsewaParams {
  amount: string;
  tax_amount: string;
  total_amount: string;
  transaction_uuid: string;
  product_code: string;
  product_service_charge: string;
  product_delivery_charge: string;
  success_url: string;
  failure_url: string;
  signed_field_names: string;
  signature: string;
}

function submitEsewaForm(url: string, params: EsewaParams) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = url;
  (Object.entries(params) as [string, string][]).forEach(([key, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = value;
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}

const PAYMENT_METHODS: {
  key: PaymentMethod;
  label: string;
  sub: string;
  active: string;
}[] = [
  {
    key: "cod",
    label: "Cash on Delivery",
    sub: "Pay when your order arrives",
    active: "bg-amber-50 border-amber-400 text-amber-800",
  },
  {
    key: "esewa",
    label: "eSewa",
    sub: "Secure digital wallet payment",
    active: "bg-green-50 border-green-500 text-green-800",
  },
];

export default function CheckoutDialog({
  open,
  onClose,
  items: initialItems,
  onSuccess,
}: Props) {
  const { setQty, remove, clear, items } = useCartStore();
  const [cartItems, setCartItems] = useState<CheckoutItem[]>([]);
  const [shippingAddress, setShippingAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");

  // Promo code state
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<PromoValidateResult | null>(
    null,
  );
  const [promoError, setPromoError] = useState("");

  // Points state
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [availablePoints, setAvailablePoints] = useState(0);

  const { CreateOrder, ValidatePromo, GetPoints, GetGlobalDiscount } = useUser();
  const createOrder = CreateOrder();
  const validatePromo = ValidatePromo();

  const { data: pointsData } = GetPoints({});
  const { data: globalDiscountData } = GetGlobalDiscount({});
  const globalDiscount = globalDiscountData as GlobalDiscount | undefined;

  useEffect(() => {
    if (open) {
      setCartItems(initialItems.map((i) => ({ ...i })));
      setAppliedPromo(null);
      setPromoInput("");
      setPromoError("");
      setUsePoints(false);
      setPointsToRedeem(0);
    }
  }, [open, initialItems]);

  useEffect(() => {
    const pts = (pointsData as { reward_points?: number })?.reward_points ?? 0;
    setAvailablePoints(pts);
  }, [pointsData]);

  // Use discounted_price if available, otherwise original price
  const cartTotal = cartItems.reduce(
    (s, i) => s + (i.discounted_price != null ? i.discounted_price : i.price) * i.quantity,
    0,
  );
  const itemDiscountTotal = cartItems.reduce(
    (s, i) => s + (i.discounted_price != null ? (i.price - i.discounted_price) * i.quantity : 0),
    0,
  );

  const globalDiscountAmount = (() => {
    if (!globalDiscount?.is_active || !globalDiscount.discount_value) return 0;
    if (globalDiscount.discount_type === "percentage") {
      return Math.round((cartTotal * globalDiscount.discount_value) / 100 * 100) / 100;
    }
    return Math.min(globalDiscount.discount_value, cartTotal);
  })();

  const promoDiscount = appliedPromo?.discount_amount ?? 0;
  const pointsDiscount = usePoints ? pointsToRedeem : 0;
  const finalTotal = Math.max(0, cartTotal - globalDiscountAmount - promoDiscount - pointsDiscount);

  function updateQty(productId: number, delta: number) {
    setCartItems((prev) => {
      const next = prev
        .map((i) =>
          i.product_id === productId
            ? { ...i, quantity: i.quantity + delta }
            : i,
        )
        .filter((i) => i.quantity > 0);
      const item = next.find((i) => i.product_id === productId);
      if (item) setQty(productId, item.quantity);
      else remove(productId);
      return next;
    });
    // Reset promo if cart changes
    setAppliedPromo(null);
    setPromoError("");
  }

  function removeItem(productId: number) {
    setCartItems((prev) => prev.filter((i) => i.product_id !== productId));
    remove(productId);
    setAppliedPromo(null);
    setPromoError("");
  }

  async function applyPromo() {
    if (!promoInput.trim()) return;
    setPromoError("");
    try {
      const result = await validatePromo.mutateAsync({
        code: promoInput.trim(),
        order_total: cartTotal,
      });
      setAppliedPromo(result);
      toast.success(`Promo applied: Rs. ${result.discount_amount} off`);
    } catch (err) {
      setPromoError((err as Error).message);
      setAppliedPromo(null);
    }
  }

  function removePromo() {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError("");
  }

  function handlePointsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = Math.min(
      Math.max(0, Number(e.target.value)),
      Math.min(availablePoints, Math.floor(cartTotal - promoDiscount)),
    );
    setPointsToRedeem(val);
  }

  async function handleSubmit() {
    if (cartItems.length === 0) {
      toast.error("Add at least one item before placing an order");
      return;
    }
    if (!shippingAddress.trim()) {
      toast.error("Shipping address is required");
      return;
    }

    try {
      const res = await createOrder.mutateAsync({
        items: cartItems.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
        })),
        shipping_address: shippingAddress,
        payment_method: paymentMethod,
        promo_code: appliedPromo?.code,
        points_to_redeem: usePoints ? pointsToRedeem : 0,
      });
      clear();

      if (paymentMethod === "cod") {
        const earned = (res as { points_earned?: number }).points_earned ?? 0;
        toast.success(
          earned > 0
            ? `Order placed! You earned ${earned} reward points.`
            : "Order placed successfully!",
        );
        onSuccess();
        onClose();
        return;
      }

      if (
        paymentMethod === "esewa" &&
        (res as { esewa_url?: string }).esewa_url
      ) {
        submitEsewaForm(
          (res as { esewa_url: string }).esewa_url,
          (res as { esewa_params: EsewaParams }).esewa_params,
        );
        return;
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const maxRedeemable = Math.min(
    availablePoints,
    Math.floor(Math.max(0, cartTotal - globalDiscountAmount - promoDiscount)),
  );

  return (
    <Drawer
      direction="right"
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DrawerContent direction="right" className="max-w-lg">
        <DrawerHeader>
          <DrawerTitle>Your Order</DrawerTitle>
        </DrawerHeader>

        <DrawerBody className="space-y-6">
          {/* Cart items */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Items ({cartItems.length})
            </p>
            {cartItems.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No items in cart
              </p>
            ) : (
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div
                    key={item.product_id}
                    className="flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.name}
                      </p>
                      {item.discounted_price != null ? (
                        <p className="text-xs">
                          <span className="text-primary-700 font-semibold">Rs. {item.discounted_price}</span>
                          <span className="ml-1 line-through text-muted-foreground">Rs. {item.price}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Rs. {item.price} each
                        </p>
                      )}
                    </div>

                    {item?.quantity !== item.stock_quantity && (
                      <QuantityStepper
                        size="sm"
                        value={item.quantity}
                        onChange={(v) =>
                          updateQty(item.product_id, v - item.quantity)
                        }
                        min={1}
                        className="shrink-0"
                      />
                    )}

                    <span className="w-20 text-right text-sm font-semibold shrink-0">
                      Rs. {((item.discounted_price != null ? item.discounted_price : item.price) * item.quantity).toFixed(0)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(item.product_id)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Separator className="mt-4 mb-3" />

            {/* Totals */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>Rs. {cartTotal.toFixed(2)}</span>
              </div>
              {itemDiscountTotal > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Product Discounts</span>
                  <span>− Rs. {itemDiscountTotal.toFixed(2)}</span>
                </div>
              )}
              {globalDiscountAmount > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>
                    Global Discount
                    {globalDiscount?.discount_type === "percentage"
                      ? ` (${globalDiscount.discount_value}%)`
                      : ""}
                  </span>
                  <span>− Rs. {globalDiscountAmount.toFixed(2)}</span>
                </div>
              )}
              {promoDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Promo ({appliedPromo!.code})</span>
                  <span>− Rs. {promoDiscount.toFixed(2)}</span>
                </div>
              )}
              {usePoints && pointsToRedeem > 0 && (
                <div className="flex justify-between text-primary">
                  <span>Points ({pointsToRedeem} pts)</span>
                  <span>− Rs. {pointsDiscount.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>Rs. {finalTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Promo code */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Tag className="h-4 w-4" /> Promo Code
            </Label>
            {appliedPromo ? (
              <div className="flex items-center gap-2 rounded-lg border border-green-500 bg-green-50 px-3 py-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                <span className="flex-1 text-sm font-medium text-green-800">
                  {appliedPromo.code} — Rs. {appliedPromo.discount_amount} off
                </span>
                <button
                  type="button"
                  onClick={removePromo}
                  className="text-primary-600 hover:text-primary-800"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Enter promo code"
                  value={promoInput}
                  onChange={(e) => {
                    setPromoInput(e.target.value.toUpperCase());
                    setPromoError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && applyPromo()}
                  className={promoError ? "border-destructive" : ""}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={applyPromo}
                  disabled={validatePromo.isPending || !promoInput.trim()}
                  className="shrink-0"
                >
                  {validatePromo.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Apply"
                  )}
                </Button>
              </div>
            )}
            {promoError && (
              <p className="text-xs text-destructive">{promoError}</p>
            )}
          </div>

          {/* Reward points */}
          {availablePoints > 0 && (
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <Label
                  className="flex items-center gap-1.5 cursor-pointer"
                  htmlFor="use-points"
                >
                  <Star className="h-4 w-4 text-primary" />
                  Use Reward Points
                  <span className="text-muted-foreground font-normal text-xs">
                    ({availablePoints} available)
                  </span>
                </Label>
                <button
                  id="use-points"
                  type="button"
                  role="switch"
                  aria-checked={usePoints}
                  onClick={() => {
                    setUsePoints((v) => !v);
                    if (!usePoints)
                      setPointsToRedeem(
                        Math.min(availablePoints, maxRedeemable),
                      );
                    else setPointsToRedeem(0);
                  }}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${usePoints ? "bg-primary" : "bg-muted"}`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${usePoints ? "translate-x-5" : "translate-x-1"}`}
                  />
                </button>
              </div>
              {usePoints && maxRedeemable > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={maxRedeemable}
                      value={pointsToRedeem}
                      onChange={handlePointsChange}
                      className="h-8 w-28 text-sm"
                    />
                    <span className="text-sm text-muted-foreground">
                      pts = Rs. {pointsToRedeem.toFixed(2)} off
                    </span>
                    <button
                      type="button"
                      className="ml-auto text-xs text-primary hover:underline"
                      onClick={() => setPointsToRedeem(maxRedeemable)}
                    >
                      Use max
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Max redeemable: {maxRedeemable} pts (Rs. {maxRedeemable})
                  </p>
                </div>
              )}
              {usePoints && maxRedeemable === 0 && (
                <p className="text-xs text-muted-foreground">
                  No points available after promo discount
                </p>
              )}
            </div>
          )}

          {/* Shipping address */}
          <div className="space-y-1.5">
            <Label>
              Shipping Address <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="Enter your full shipping address"
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
            />
          </div>

          {/* Payment method */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setPaymentMethod(m.key)}
                className={`w-full flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition-all outline-none cursor-pointer ${
                  paymentMethod === m.key
                    ? m.active
                    : "border-border bg-background hover:bg-muted"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{m.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {m.sub}
                  </div>
                </div>
                <div
                  className={`h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                    paymentMethod === m.key ? "border-current" : "border-border"
                  }`}
                >
                  {paymentMethod === m.key && (
                    <div className="h-2 w-2 rounded-full bg-current" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </DrawerBody>

        <DrawerFooter>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={createOrder.isPending}
            >
              Cancel
            </Button>
            <Button
              className={`flex-1 ${
                paymentMethod === "esewa"
                  ? "bg-primary-600 hover:bg-primary-700 text-white"
                  : ""
              }`}
              onClick={handleSubmit}
              disabled={createOrder.isPending || cartItems.length === 0}
            >
              {createOrder.isPending
                ? "Processing…"
                : paymentMethod === "cod"
                  ? `Place Order · Rs. ${finalTotal.toFixed(2)}`
                  : `Pay Rs. ${finalTotal} with eSewa`}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
