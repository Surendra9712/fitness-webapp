import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, UserCheck } from "lucide-react";
import useUser from "@/hooks/useUser";
import { usePagination } from "@/hooks/usePagination";
import { AppPagination } from "@/components/ui/app-pagination";
import { Input } from "@/components/ui/input";
import { TrainerList } from "@/components/trainer/TrainerList";
import { TrainerRequestDialog } from "@/components/trainer/TrainerRequestDialog";
import { TrainerDetailModal } from "@/components/trainer/TrainerDetailModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { toast } from "sonner";
import type { TrainerInfo } from "@/types";

export default function TrainerRequest({ embedded = false }: { embedded?: boolean }) {
  const queryClient = useQueryClient();
  const [requestTarget, setRequestTarget] = useState<TrainerInfo | null>(null);
  const [cancelTarget, setCancelTarget] = useState<TrainerInfo | null>(null);
  const [detailTarget, setDetailTarget] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { page, pageSize, goToPage, setPageSize, resetPage } = usePagination({
    initialPageSize: 12,
  });

  const { GetTrainers, CancelTrainerAssignment } = useUser();
  const { data: trainersData, isLoading } = GetTrainers({
    queryParams: { page, page_size: pageSize, search: searchQuery },
  });
  const trainers = trainersData?.items ?? [];
  const total = trainersData?.total ?? 0;
  const cancelMutation = CancelTrainerAssignment();

  function refreshTrainers() {
    queryClient.invalidateQueries({ queryKey: ["trainers"] });
  }

  async function confirmCancel() {
    if (!cancelTarget?.my_pending_assignment_id) return;
    try {
      await cancelMutation.mutateAsync(cancelTarget.my_pending_assignment_id);
      toast.success("Request cancelled");
      refreshTrainers();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCancelTarget(null);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchQuery(search.trim());
    resetPage();
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trainer Request</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse verified trainers and send a request to get started.
          </p>
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search trainers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </form>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      ) : trainers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <UserCheck className="h-12 w-12 text-muted-foreground/30" />
          <p className="font-medium text-muted-foreground">No trainers found</p>
          {searchQuery && (
            <p className="text-sm text-muted-foreground">
              Try a different search term.
            </p>
          )}
        </div>
      ) : (
        <>
          <TrainerList
            trainers={trainers}
            onRequest={(t) => setRequestTarget(t)}
            onCancel={(t) => setCancelTarget(t)}
            onViewDetail={(t) => setDetailTarget(t.id)}
          />
          <AppPagination
            page={page}
            total={total}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            onPageChange={goToPage}
          />
        </>
      )}

      <TrainerRequestDialog
        open={!!requestTarget}
        onOpenChange={(open) => { if (!open) setRequestTarget(null); }}
        trainer={requestTarget}
        onSuccess={() => {
          setRequestTarget(null);
          refreshTrainers();
        }}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => { if (!open) setCancelTarget(null); }}
        title="Cancel trainer request?"
        description="Your pending request will be withdrawn. You can send a new request anytime."
        confirmLabel="Cancel Request"
        onConfirm={confirmCancel}
      />

      <TrainerDetailModal
        trainerId={detailTarget}
        onOpenChange={(open) => { if (!open) setDetailTarget(null); }}
      />
    </div>
  );
}
