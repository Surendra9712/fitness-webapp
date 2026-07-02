import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, LogOut, Leaf } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCartStore } from "@/store/cartStore";
import { Button } from "@/components/ui/button";
import CheckoutDialog from "@/components/CheckoutDialog";
import { getDashboardPath } from "@/lib/constant";
import { toast } from "sonner";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { items, clear } = useCartStore();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const cartItems = Object.values(items);
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-emerald-600" />
            <span className="text-lg font-bold tracking-tight text-emerald-900">
              FitStore
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link to="/products">Products</Link>
            </Button>

            {user ? (
              <>
                {/* Cart button — only for customer role */}
                {user.role !== "admin" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    onClick={() => setCheckoutOpen(true)}
                    aria-label={`Cart (${cartCount} items)`}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {cartCount > 99 ? "99+" : cartCount}
                      </span>
                    )}
                  </Button>
                )}

                <Button asChild>
                  <Link to={getDashboardPath(user.role)}>{user.name}</Link>
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => {
                    logout();
                    clear();
                    navigate("/");
                  }}
                >
                  <LogOut />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link to="/login?tab=register">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Global checkout drawer */}
      {user && user?.role !== "admin" && (
        <CheckoutDialog
          open={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          items={cartItems}
          onSuccess={() => {
            clear();
            toast.success("Order placed! Check My Orders to track it.");
            navigate("/customer/orders");
          }}
        />
      )}
    </>
  );
}
