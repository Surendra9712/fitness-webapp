import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, Crown } from "lucide-react";
import { api } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import PublicLayout from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";

type Status = "verifying" | "success" | "failed";

export default function SubscriptionPaymentReturn() {
  const location = useLocation();
  const { refreshUser } = useAuth();
  const [status, setStatus]   = useState<Status>("verifying");
  const [heading, setHeading] = useState("");
  const [detail, setDetail]   = useState("");
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const params = new URLSearchParams(location.search);
    const path   = location.pathname;

    if (path.includes("/failure")) {
      const errMsg = params.get("message") ?? params.get("error_message");
      setStatus("failed");
      setHeading("Payment Failed");
      setDetail(errMsg ?? "The payment was cancelled or rejected. No charge was made.");
      return;
    }

    if (path.includes("/success")) {
      const data = params.get("data");
      if (!data) {
        setStatus("failed");
        setHeading("Verification Failed");
        setDetail("eSewa did not return payment data.");
        return;
      }

      api
        .post<{ message: string }>("/payments/subscription/esewa/verify", { data })
        .then(async () => {
          await refreshUser();
          setStatus("success");
          setHeading("Pro Plan Activated!");
          setDetail("Your payment was verified. You now have full access to Pro features.");
        })
        .catch((e: Error) => {
          setStatus("failed");
          setHeading("Verification Failed");
          setDetail(e.message || "Could not verify your eSewa payment.");
        });
    }
  }, [location]);

  return (
    <PublicLayout>
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">

        {status === "verifying" && (
          <>
            <Loader2 className="mb-5 h-14 w-14 animate-spin text-primary" />
            <h2 className="text-xl font-bold">Verifying payment…</h2>
            <p className="mt-2 text-sm text-muted-foreground">Please wait while we confirm your payment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Crown className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-black tracking-tight">{heading}</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">{detail}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link to="/customer/trainer">Find a Trainer</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/customer">Dashboard</Link>
              </Button>
            </div>
          </>
        )}

        {status === "failed" && (
          <>
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            <h2 className="text-2xl font-black tracking-tight">{heading}</h2>
            {detail && (
              <p className="mt-3 max-w-md rounded-lg bg-destructive/5 px-4 py-2.5 text-sm text-destructive">{detail}</p>
            )}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link to="/customer/subscription">Back to Plans</Link>
              </Button>
            </div>
          </>
        )}

      </div>
    </PublicLayout>
  );
}
