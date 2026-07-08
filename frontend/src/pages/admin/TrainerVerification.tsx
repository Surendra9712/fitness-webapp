import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, ShieldOff, Award, Search, ExternalLink, Briefcase } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import useAdmin from "@/hooks/useAdmin";
import { usePagination } from "@/hooks/usePagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AppPagination } from "@/components/ui/app-pagination";
import { toast } from "sonner";
import type { User } from "@/types";

type TrainerRow = User & {
  specialization?: string;
  bio?: string;
  cert_count?: number;
};

export default function TrainerVerification() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [verifying, setVerifying] = useState<number | null>(null);

  const { page, pageSize, goToPage, setPageSize, resetPage } = usePagination({ initialPageSize: 15 });

  const { GetUsers, VerifyTrainer } = useAdmin();
  const verifyMutation = VerifyTrainer();

  const { data, isLoading } = GetUsers({
    queryParams: {
      role: "dietitian",
      is_verified: "0",
      search: searchQuery,
      page,
      page_size: pageSize,
    },
  });

  const trainers: TrainerRow[] = (data?.items ?? []) as TrainerRow[];
  const total = data?.total ?? 0;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchQuery(search.trim());
    resetPage();
  }

  async function handleVerify(trainer: TrainerRow) {
    setVerifying(trainer.id);
    try {
      await verifyMutation.mutateAsync(trainer.id);
      toast.success(`${trainer.name} verified`);
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setVerifying(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trainer Requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Trainers pending verification — verify to make them visible to trainees.
        </p>
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
      ) : trainers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <ShieldCheck className="h-12 w-12 text-emerald-300" />
          <p className="font-semibold text-muted-foreground">
            {searchQuery ? "No matching trainers found" : "All trainers are verified"}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {trainers.map((trainer) => (
            <div
              key={trainer.id}
              className="flex items-center gap-4 px-4 py-4 hover:bg-muted/30 transition-colors"
            >
              {/* Avatar initials */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm">
                {trainer.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{trainer.name}</span>
                  <Badge variant="warning" className="text-xs">Unverified</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{trainer.email}</p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {trainer.specialization && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Briefcase className="h-3 w-3" />
                      {trainer.specialization}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Award className="h-3 w-3" />
                    {trainer.cert_count ?? 0} cert{trainer.cert_count !== 1 ? "s" : ""}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Joined {new Date(trainer.created_at!).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs"
                >
                  <Link to={`/admin/users/${trainer.id}`}>
                    <ExternalLink className="h-3.5 w-3.5" />
                    View
                  </Link>
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={verifying === trainer.id}
                  onClick={() => handleVerify(trainer)}
                >
                  <ShieldCheck className="h-4 w-4" />
                  {verifying === trainer.id ? "Verifying…" : "Verify"}
                </Button>
              </div>
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
