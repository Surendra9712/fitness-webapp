import { useState } from "react";
import { UserCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import useUser from "@/hooks/useUser";
import { usePagination } from "@/hooks/usePagination";
import { AppPagination } from "@/components/ui/app-pagination";
import { Card, CardContent } from "@/components/ui/card";
import { AssignmentStatusCard } from "@/components/trainer/AssignmentStatusCard";
import { TrainerList } from "@/components/trainer/TrainerList";
import { TrainerRequestDialog } from "@/components/trainer/TrainerRequestDialog";
import { TrainerReviewSection } from "@/components/trainer/TrainerReviewSection";
import ConfirmDialog from "@/components/ConfirmDialog";
import { toast } from "sonner";
import type { TrainerInfo } from "@/types";

export default function MyTrainer() {
  const { user } = useAuth();
  const [requestTarget, setRequestTarget] = useState<TrainerInfo | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  const { page, pageSize, goToPage, setPageSize } = usePagination({
    initialPageSize: 10,
  });

  const { GetTrainerAssignment, GetTrainers, CancelTrainerAssignment } =
    useUser();
  const { data: assignment, isLoading } = GetTrainerAssignment();
  const { data: trainersData } = GetTrainers({
    queryParams: { page, page_size: pageSize },
  });
  const trainers = trainersData?.items ?? [];
  const total = trainersData?.total ?? 0;
  const cancelMutation = CancelTrainerAssignment();

  async function cancelRequest() {
    try {
      await cancelMutation.mutateAsync();
      toast.success("Request cancelled");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCancelOpen(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  const showTrainerList = !assignment || assignment.status === "rejected";
  const userId = (user as unknown as { id: number } | null)?.id ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">My Trainer</h1>

      {assignment ? (
        <AssignmentStatusCard
          assignment={assignment}
          onCancel={() => setCancelOpen(true)}
        />
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <UserCheck className="h-12 w-12 text-muted-foreground/30" />
            <p className="font-medium text-muted-foreground">
              No trainer assigned yet
            </p>
            <p className="text-sm text-muted-foreground">
              Choose a trainer from the list below to get started.
            </p>
          </CardContent>
        </Card>
      )}

      {assignment?.status === "approved" && (
        <TrainerReviewSection
          trainerId={assignment.trainer_id}
          customerId={userId}
        />
      )}

      {showTrainerList && (
        <>
          <TrainerList
            trainers={trainers}
            onRequest={(t) => setRequestTarget(t)}
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
        onSuccess={() => setRequestTarget(null)}
      />

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel trainer request?"
        description="Your pending request will be withdrawn. You can send a new request anytime."
        confirmLabel="Cancel Request"
        onConfirm={cancelRequest}
      />
    </div>
  );
}
