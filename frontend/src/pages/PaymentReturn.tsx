import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { api } from "@/api/client";
import PublicLayout from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";

type Status = "verifying" | "success" | "failed";

export default function PaymentReturn() {
  const location = useLocation();
  const [status, setStatus] = useState<Status>("verifying");
  const [heading, setHeading] = useState("");
  const [detail, setDetail] = useState("");
  const [orderId, setOrderId] = useState<number | null>(null);
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const params = new URLSearchParams(location.search);
    const path = location.pathname;

    // ── eSewa failure ────────────────────────────────────────────────────────
    if (path.includes("/esewa/failure")) {
      // eSewa sometimes sends error_code / message as query params
      const errCode = params.get("error_code") ?? params.get("code");
      const errMsg  = params.get("message") ?? params.get("error_message");
      setStatus("failed");
      setHeading("eSewa Payment Failed");
      setDetail(
        errMsg
          ? `eSewa: ${errMsg}${errCode ? ` (code ${errCode})` : ""}`
          : "The payment was cancelled or rejected by eSewa. No charge was made."
      );
      return;
    }

    // ── eSewa success ────────────────────────────────────────────────────────
    if (path.includes("/esewa/success")) {
      const data = params.get("data");
      if (!data) {
        setStatus("failed");
        setHeading("Verification Failed");
        setDetail("eSewa did not return payment data. Please contact support.");
        return;
      }

      // Decode the base64 payload and show raw status while we verify
      try {
        const decoded = JSON.parse(atob(data.replace(/-/g, "+").replace(/_/g, "/")));
        if (decoded.status && decoded.status !== "COMPLETE") {
          setStatus("failed");
          setHeading("eSewa Payment Not Completed");
          setDetail(`Status from eSewa: "${decoded.status}". No charge was made.`);
          return;
        }
      } catch {
        // ignore decode errors — let the server verify
      }

      api
        .post<{ message: string; order_id: number }>("/payments/esewa/verify", { data })
        .then((res) => {
          setOrderId(res.order_id);
          setStatus("success");
          setHeading("Payment Successful!");
          setDetail("Your order has been confirmed and is being processed.");
        })
        .catch((e: Error & { detail?: unknown }) => {
          setStatus("failed");
          setHeading("Payment Verification Failed");
          setDetail(e.message || "Could not verify your eSewa payment.");
        });
      return;
    }

    // ── Khalti return ────────────────────────────────────────────────────────
    if (path.includes("/khalti/return")) {
      const pidx      = params.get("pidx");
      const txnStatus = params.get("status");
      const txnMsg    = params.get("message");

      if (txnStatus === "User canceled") {
        setStatus("failed");
        setHeading("Payment Cancelled");
        setDetail("You cancelled the Khalti payment. No charge was made.");
        return;
      }

      if (txnStatus && txnStatus !== "Completed") {
        setStatus("failed");
        setHeading("Khalti Payment Failed");
        setDetail(
          txnMsg
            ? `Khalti: ${txnMsg} (status: ${txnStatus})`
            : `Payment status from Khalti: "${txnStatus}". No charge was made.`
        );
        return;
      }

      if (!pidx) {
        setStatus("failed");
        setHeading("Verification Failed");
        setDetail("Khalti did not return a payment reference. Please contact support.");
        return;
      }

      api
        .post<{ message: string; order_id: number }>("/payments/khalti/verify", { pidx })
        .then((res) => {
          setOrderId(res.order_id);
          setStatus("success");
          setHeading("Payment Successful!");
          setDetail("Your order has been confirmed and is being processed.");
        })
        .catch((e: Error) => {
          setStatus("failed");
          setHeading("Payment Verification Failed");
          setDetail(e.message || "Could not verify your Khalti payment.");
        });
    }
  }, [location]);

  return (
    <PublicLayout>
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">

        {status === "verifying" && (
          <>
            <Loader2 className="mb-5 h-14 w-14 animate-spin text-primary" />
            <h2 className="text-xl font-bold text-foreground">Verifying payment…</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Please wait while we confirm your payment.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary-100">
              <CheckCircle2 className="h-10 w-10 text-primary-600" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-foreground">{heading}</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">{detail}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {orderId && (
                <Button asChild className="bg-primary text-primary-foreground hover:bg-primary-600">
                  <Link to="/customer/orders">View My Orders</Link>
                </Button>
              )}
              <Button asChild variant="outline">
                <Link to="/products">Continue Shopping</Link>
              </Button>
            </div>
          </>
        )}

        {status === "failed" && (
          <>
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-foreground">{heading}</h2>
            {detail && (
              <p className="mt-3 max-w-md rounded-lg bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
                {detail}
              </p>
            )}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary-600">
                <Link to="/products">Back to Store</Link>
              </Button>
            </div>
          </>
        )}

      </div>
    </PublicLayout>
  );
}
