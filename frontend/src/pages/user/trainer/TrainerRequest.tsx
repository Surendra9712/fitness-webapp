import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import useUser from "@/hooks/useUser";
import { usePagination } from "@/hooks/usePagination";
import { AppPagination } from "@/components/ui/app-pagination";
import { TrainerList } from "@/components/trainer/TrainerList";
import { TrainerRequestDialog } from "@/components/trainer/TrainerRequestDialog";
import { TrainerDetailModal } from "@/components/trainer/TrainerDetailModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { toast } from "sonner";
import { ListRowSkeleton } from "@/components/ListRowSkeleton";
import type { TrainerInfo } from "@/types";

export default function TrainerRequest({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const queryClient = useQueryClient();
  const [requestTarget, setRequestTarget] = useState<TrainerInfo | null>(null);
  const [cancelTarget, setCancelTarget] = useState<TrainerInfo | null>(null);
  const [detailTarget, setDetailTarget] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { page, pageSize, goToPage, setPageSize, resetPage } = usePagination({
    initialPageSize: 10,
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

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    resetPage();
  };

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse verified trainers and send a request to get started.
          </p>
        </div>
      )}

      {/* Search */}

      {isLoading ? (
        <ListRowSkeleton avatar="circle" lines={2} actions={1} />
      ) : (
        <>
          <TrainerList
            total={total}
            trainers={trainers}
            onRequest={(t) => setRequestTarget(t)}
            onCancel={(t) => setCancelTarget(t)}
            onViewDetail={(t) => setDetailTarget(t.id)}
            onSearch={handleSearch}
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
        onOpenChange={(open) => {
          if (!open) setRequestTarget(null);
        }}
        trainer={requestTarget}
        onSuccess={() => {
          setRequestTarget(null);
          refreshTrainers();
        }}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
        title="Cancel trainer request?"
        description="Your pending request will be withdrawn. You can send a new request anytime."
        confirmLabel="Cancel Request"
        onConfirm={confirmCancel}
      />

      <TrainerDetailModal
        trainerId={detailTarget}
        onOpenChange={(open) => {
          if (!open) setDetailTarget(null);
        }}
      />
    </div>
  );
}
