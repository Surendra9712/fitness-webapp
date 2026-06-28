import { useState } from "react";
import { Search, Crown, CheckCircle2, XCircle, Banknote, CreditCard } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import useAdmin from "@/hooks/useAdmin";
import { usePagination } from "@/hooks/usePagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AppPagination } from "@/components/ui/app-pagination";
import { toast } from "sonner";
import type { User } from "@/types";

type SubUser = User & { subscription_payment_method?: 'cash' | 'esewa' };

const STATUS_TABS = [
  { label: "Pending",  value: "pending"  },
  { label: "Active",   value: "active"   },
  { label: "Rejected", value: "rejected" },
] as const;

export default function SubscriptionManagement() {
  const queryClient = useQueryClient();
  const [tab, setTab]           = useState<"pending" | "active" | "rejected">("pending");
  const [search, setSearch]     = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [acting, setActing]     = useState<number | null>(null);

  const { page, pageSize, goToPage, setPageSize, resetPage } = usePagination({ initialPageSize: 15 });

  const { GetSubscriptions, ApproveSubscription, RejectSubscription } = useAdmin();
  const approveMut = ApproveSubscription();
  const rejectMut  = RejectSubscription();

  const { data, isLoading } = GetSubscriptions({
    queryParams: { status: tab, search: searchQuery, page, page_size: pageSize },
  });

  const rows: SubUser[] = (data?.items ?? []) as SubUser[];
  const total = data?.total ?? 0;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchQuery(search.trim());
    resetPage();
  }

  async function approve(user: SubUser) {
    setActing(user.id);
    try {
      await approveMut.mutateAsync(user.id);
      toast.success(`${user.name}'s Pro plan approved`);
      queryClient.invalidateQueries({ queryKey: ["adminSubscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setActing(null);
    }
  }

  async function reject(user: SubUser) {
    setActing(user.id);
    try {
      await rejectMut.mutateAsync(user.id);
      toast.success(`${user.name} reverted to Free plan`);
      queryClient.invalidateQueries({ queryKey: ["adminSubscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Subscription Plans</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and approve trainee Pro plan requests.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border bg-muted/40 p-1 w-fit">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => { setTab(t.value); resetPage(); }}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors
              ${tab === t.value ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </form>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Crown className="h-12 w-12 text-muted-foreground/30" />
          <p className="font-medium text-muted-foreground">
            {searchQuery ? "No matching users" : `No ${tab} subscriptions`}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {rows.map((u) => (
            <div key={u.id} className="flex items-center gap-4 px-4 py-4 hover:bg-muted/30 transition-colors">
              {/* Avatar */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                {u.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{u.name}</span>
                  <Badge variant={u.subscription_plan === "pro" ? "info" : "secondary"} className="text-xs gap-1">
                    {u.subscription_plan === "pro" && <Crown className="h-3 w-3" />}
                    {u.subscription_plan === "pro" ? "Pro" : "Free"}
                  </Badge>
                  <Badge
                    variant={u.subscription_status === "active" ? "success" : u.subscription_status === "pending" ? "warning" : "destructive"}
                    className="text-xs"
                  >
                    {u.subscription_status}
                  </Badge>
                  {u.subscription_payment_method && (
                    <Badge variant="outline" className="text-xs gap-1">
                      {u.subscription_payment_method === "esewa"
                        ? <><CreditCard className="h-3 w-3" /> eSewa</>
                        : <><Banknote className="h-3 w-3" /> Cash</>}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                <p className="text-xs text-muted-foreground">
                  Joined {new Date(u.created_at!).toLocaleDateString()}
                </p>
              </div>

              {/* Actions */}
              {tab === "pending" && (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-destructive hover:text-destructive"
                    disabled={acting === u.id}
                    onClick={() => reject(u)}
                  >
                    <XCircle className="h-4 w-4" /> Reject
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    disabled={acting === u.id}
                    onClick={() => approve(u)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {acting === u.id ? "Processing…" : "Approve"}
                  </Button>
                </div>
              )}
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
    </div>
  );
}
