import { useRef, useState } from "react";
import { Check, Crown, Zap, Loader2, Clock, Banknote, CreditCard, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import useUser from "@/hooks/useUser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { EsewaParams, SubscriptionPaymentMethod } from "@/types";

// ── Plan feature lists ────────────────────────────────────────────────────────

const FREE_FEATURES = [
  "Dashboard & activity overview",
  "Shop & browse products",
  "My Orders",
  "Log Exercises",
  "Request Products",
  "Profile management",
];

const PRO_ONLY = [
  "Trainer Request — find & request a certified trainer",
  "AI Recommendation — personalised fitness plans",
];

// ── eSewa auto-submit form ────────────────────────────────────────────────────

function EsewaAutoForm({ url, params }: { url: string; params: EsewaParams }) {
  const formRef = useRef<HTMLFormElement>(null);
  // submit on mount
  useState(() => {
    const t = setTimeout(() => formRef.current?.submit(), 200);
    return () => clearTimeout(t);
  });
  return (
    <form ref={formRef} method="POST" action={url} className="hidden">
      {Object.entries(params).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v as string} />
      ))}
    </form>
  );
}

// ── Payment Method Dialog ─────────────────────────────────────────────────────

function PaymentDialog({
  onClose,
  onSelect,
  loading,
}: {
  onClose: () => void;
  onSelect: (method: SubscriptionPaymentMethod) => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">Choose Payment Method</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Pro plan — Rs 999 / month</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          {/* eSewa */}
          <button
            disabled={loading}
            onClick={() => onSelect("esewa")}
            className="w-full flex items-center gap-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-4 text-left hover:border-emerald-400 hover:bg-emerald-100 transition-colors disabled:opacity-50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white font-black text-xs">
              e
            </div>
            <div>
              <p className="font-semibold text-sm">eSewa</p>
              <p className="text-xs text-muted-foreground">Pay online — activates immediately</p>
            </div>
            {loading ? <Loader2 className="ml-auto h-4 w-4 animate-spin text-emerald-600" /> : (
              <CreditCard className="ml-auto h-4 w-4 text-emerald-600" />
            )}
          </button>

          {/* Cash */}
          <button
            disabled={loading}
            onClick={() => onSelect("cash")}
            className="w-full flex items-center gap-4 rounded-xl border-2 border-border px-4 py-4 text-left hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
              <Banknote className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-sm">Cash</p>
              <p className="text-xs text-muted-foreground">Pay in person — admin confirms after receiving</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Subscription() {
  const { user, refreshUser } = useAuth();
  const { UpdateSubscription } = useUser();
  const updatePlan = UpdateSubscription();

  const [showDialog, setShowDialog] = useState(false);
  const [esewaData, setEsewaData] = useState<{ url: string; params: EsewaParams } | null>(null);

  const plan   = user?.subscription_plan   ?? "free";
  const status = user?.subscription_status ?? "active";

  const isPro     = plan === "pro" && status === "active";
  const isPending = plan === "pro" && status === "pending";
  const isFree    = plan === "free";

  async function handleMethodSelect(method: SubscriptionPaymentMethod) {
    try {
      const res = await updatePlan.mutateAsync({ plan: "pro", method });

      if (method === "esewa" && res.esewa_url && res.esewa_params) {
        // Redirect to eSewa — auto-submit form
        setEsewaData({ url: res.esewa_url, params: res.esewa_params });
        setShowDialog(false);
        return;
      }

      // Cash — pending
      setShowDialog(false);
      await refreshUser();
      toast.success("Pro plan requested. Admin will verify after receiving payment.");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to request upgrade");
    }
  }

  async function downgradeToFree() {
    try {
      await updatePlan.mutateAsync({ plan: "free" });
      await refreshUser();
      toast.success("Downgraded to Free plan.");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to downgrade");
    }
  }

  return (
    <>
      {/* eSewa auto-submit form (renders when esewa payment initiated) */}
      {esewaData && <EsewaAutoForm url={esewaData.url} params={esewaData.params} />}

      {/* Payment method dialog */}
      {showDialog && (
        <PaymentDialog
          onClose={() => setShowDialog(false)}
          onSelect={handleMethodSelect}
          loading={updatePlan.isPending}
        />
      )}

      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscription</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a plan that fits your fitness journey.
          </p>
        </div>

        {/* Pending banner */}
        {isPending && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <Clock className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Pro plan pending approval</p>
              <p className="text-xs text-amber-700">
                {user?.subscription_payment_method === "cash"
                  ? "Admin will verify once your cash payment is received."
                  : "An admin will review your request shortly."}
                {" "}Pro features will unlock once approved.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Free plan */}
          <Card className={`relative ${isFree ? "ring-2 ring-border" : ""}`}>
            {isFree && (
              <Badge className="absolute -top-2.5 left-4 bg-secondary text-secondary-foreground">
                Current Plan
              </Badge>
            )}
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5 text-muted-foreground" />
                Free
              </CardTitle>
              <p className="text-3xl font-black">
                Rs 0 <span className="text-sm font-normal text-muted-foreground">/ month</span>
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              {isPro && (
                <Button variant="outline" className="w-full" disabled={updatePlan.isPending} onClick={downgradeToFree}>
                  Downgrade to Free
                </Button>
              )}
              {isFree && (
                <Button variant="outline" className="w-full" disabled>Current Plan</Button>
              )}
            </CardContent>
          </Card>

          {/* Pro plan */}
          <Card className={`relative ${isPro ? "ring-2 ring-primary" : isPending ? "ring-2 ring-amber-400" : ""}`}>
            {isPro && (
              <Badge className="absolute -top-2.5 left-4 bg-primary text-primary-foreground">Current Plan</Badge>
            )}
            {isPending && (
              <Badge className="absolute -top-2.5 left-4 bg-amber-400 text-white">Pending Approval</Badge>
            )}
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Crown className="h-5 w-5 text-amber-500" />
                Pro
              </CardTitle>
              <p className="text-3xl font-black text-primary">
                Rs 999 <span className="text-sm font-normal text-muted-foreground">/ month</span>
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
                {PRO_ONLY.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm font-medium text-primary">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {isFree && (
                <Button className="w-full gap-2" onClick={() => setShowDialog(true)}>
                  <Crown className="h-4 w-4" /> Upgrade to Pro
                </Button>
              )}
              {isPending && (
                <Button className="w-full" variant="outline" disabled>
                  <Clock className="h-4 w-4 mr-2" /> Awaiting Approval
                </Button>
              )}
              {isPro && (
                <Button className="w-full" variant="outline" disabled>
                  <Crown className="h-4 w-4 mr-2" /> Active
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
