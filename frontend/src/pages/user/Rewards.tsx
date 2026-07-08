import {
  Gift,
  TrendingUp,
  TrendingDown,
  Star,
  ShoppingBag,
  Info,
} from "lucide-react";
import useUser from "@/hooks/useUser";
import { usePagination } from "@/hooks/usePagination";
import { AppPagination } from "@/components/ui/app-pagination";
import { Badge } from "@/components/ui/badge";
import type { PointTransaction } from "@/types";

export default function Rewards() {
  const { page, pageSize, goToPage, setPageSize } = usePagination({
    initialPageSize: 20,
  });
  const { GetPoints } = useUser();

  const { data, isLoading } = GetPoints({
    queryParams: { page, page_size: pageSize },
  });

  const balance: number =
    (data as { reward_points?: number })?.reward_points ?? 0;
  const transactions: PointTransaction[] =
    (data as { transactions?: PointTransaction[] })?.transactions ?? [];
  const total: number = (data as { total?: number })?.total ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Rewards</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Earn points on every purchase and redeem them at checkout.
        </p>
      </div>

      {/* Balance card */}
      <div className="rounded-xl border bg-gradient-to-br from-primary/10 via-background to-background p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
            <Star className="h-8 w-8 text-primary fill-primary/30" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">
              Available Points
            </p>
            <p className="text-4xl font-black tracking-tight text-primary">
              {balance}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              ≈ Rs. {balance} redemption value
            </p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-start gap-2.5">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold">How Reward Points Work</p>
            <ul className="space-y-0.5 text-muted-foreground">
              <li className="list-disc">
                Earn <strong>1 point</strong> for every <strong>Rs. 50</strong>{" "}
                spent on orders
              </li>
              <li className="list-disc">
                {" "}
                Redeem points at checkout — 1 point = Rs. 1 discount
              </li>
              <li className="list-disc">
                Points are awarded after your payment is confirmed
              </li>
              <li className="list-disc">
                {" "}
                Use promo codes AND points together for maximum savings
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Transaction history */}
      <div>
        <h2 className="text-base font-semibold mb-3">Transaction History</h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center rounded-lg border">
            <Gift className="h-12 w-12 text-muted-foreground/30" />
            <p className="font-medium text-muted-foreground">
              No transactions yet
            </p>
            <p className="text-sm text-muted-foreground">
              Place your first order to start earning points!
            </p>
          </div>
        ) : (
          <div className="rounded-lg border divide-y">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    tx.type === "earned" ? "bg-green-100" : "bg-orange-100"
                  }`}
                >
                  {tx.type === "earned" ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-orange-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {tx.description ||
                      (tx.type === "earned"
                        ? "Points earned"
                        : "Points redeemed")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.created_at).toLocaleDateString("en-NP", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>

                {tx.reference_id && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <ShoppingBag className="h-3 w-3" />
                    <span>Order #{tx.reference_id}</span>
                  </div>
                )}

                <Badge
                  variant={tx.type === "earned" ? "success" : "warning"}
                  className="shrink-0 font-mono"
                >
                  {tx.type === "earned" ? "+" : "-"}
                  {tx.points} pts
                </Badge>
              </div>
            ))}
          </div>
        )}

        {total > pageSize && (
          <div className="mt-4">
            <AppPagination
              page={page}
              total={total}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              onPageChange={goToPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
