import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import useUser from "@/hooks/useUser";
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

export interface CheckoutItem {
  product_id: number;
  quantity: number;
  name: string;
  price: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  items: CheckoutItem[];
  onSuccess: () => void;
}

type PaymentMethod = "cod" | "esewa" | "khalti";

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
  {
    key: "khalti",
    label: "Khalti",
    sub: "Pay via Khalti wallet",
    active: "bg-purple-50 border-purple-500 text-purple-800",
  },
];

export default function CheckoutDialog({
  open,
  onClose,
  items: initialItems,
  onSuccess,
}: Props) {
  const { setQty, remove, clear } = useCartStore();
  const [cartItems, setCartItems] = useState<CheckoutItem[]>([]);
  const [shippingAddress, setShippingAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const { CreateOrder } = useUser();
  const createOrder = CreateOrder();

  // Sync local cart when drawer opens with new items
  useEffect(() => {
    if (open) setCartItems(initialItems.map((i) => ({ ...i })));
  }, [open, initialItems]);

  const total = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);

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
  }

  function removeItem(productId: number) {
    setCartItems((prev) => prev.filter((i) => i.product_id !== productId));
    remove(productId);
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
      });
      clear();

      if (paymentMethod === "cod") {
        toast.success("Order placed successfully!");
        onSuccess();
        onClose();
        return;
      }

      if (paymentMethod === "esewa" && res.esewa_url && res.esewa_params) {
        submitEsewaForm(res.esewa_url, res.esewa_params);
        return;
      }

      if (paymentMethod === "khalti" && res.payment_url) {
        window.location.href = res.payment_url;
        return;
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

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
                    {/* Product info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Rs. {item.price} each
                      </p>
                    </div>

                    {/* Qty stepper */}
                    <QuantityStepper
                      size="sm"
                      value={item.quantity}
                      onChange={(v) =>
                        updateQty(item.product_id, v - item.quantity)
                      }
                      min={1}
                      className="shrink-0"
                    />

                    {/* Line total */}
                    <span className="w-20 text-right text-sm font-semibold shrink-0">
                      Rs. {(item.price * item.quantity).toFixed(2)}
                    </span>

                    {/* Remove */}
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
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span>Rs. {total.toFixed(2)}</span>
            </div>
          </div>

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
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : paymentMethod === "khalti"
                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                    : ""
              }`}
              onClick={handleSubmit}
              disabled={createOrder.isPending || cartItems.length === 0}
            >
              {createOrder.isPending
                ? "Processing…"
                : paymentMethod === "cod"
                  ? "Place Order"
                  : `Pay with ${paymentMethod === "esewa" ? "eSewa" : "Khalti"}`}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
