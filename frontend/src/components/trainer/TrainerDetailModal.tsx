import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Users, Star, Briefcase } from "lucide-react";
import useUser from "@/hooks/useUser";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/ui/dialog";
import { StarRating } from "@/components/ui/star-rating";
import { AssignmentStatusCard } from "./AssignmentStatusCard";
import { TrainerProfileSummary } from "./TrainerProfileSummary";
import { TrainerReviewSection } from "./TrainerReviewSection";
import { TrainerRequestDialog } from "./TrainerRequestDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import { toast } from "sonner";
import type { Review } from "@/types";

interface Props {
  trainerId: number | null;
  onOpenChange: (open: boolean) => void;
}

// The single "trainer details" view used both from My Trainers (already-related trainers)
// and Find a Trainer (browsing trainers you don't have a relationship with yet).
export function TrainerDetailModal({ trainerId, onOpenChange }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = (user as unknown as { id: number } | null)?.id ?? 0;

  const {
    GetTrainer,
    GetTrainerReviews,
    GetTrainerAssignments,
    CancelTrainerAssignment,
  } = useUser();
  const { data: trainer, isLoading } = GetTrainer(trainerId ?? undefined);
  const { data: reviews } = GetTrainerReviews(trainer?.id);
  const { data: assignments } = GetTrainerAssignments();
  const cancelMutation = CancelTrainerAssignment();

  const [requestOpen, setRequestOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<number | null>(null);

  const assignment = assignments?.find(
    (a) => a.trainer_id === trainerId && a.status !== "rejected",
  );

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["trainerAssignments"] });
    queryClient.invalidateQueries({ queryKey: ["trainers"] });
  }

  async function confirmCancel() {
    if (cancelTarget == null) return;
    try {
      await cancelMutation.mutateAsync(cancelTarget);
      toast.success("Request cancelled");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCancelTarget(null);
    }
  }

  return (
    <>
      <Dialog open={trainerId != null} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            </div>
          ) : !trainer ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Trainer not found
            </p>
          ) : (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={trainer.profile_image_url} />
                    <AvatarFallback className="text-base font-bold">
                      {trainer.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <DialogTitle className="truncate">
                      {trainer.name}
                    </DialogTitle>
                    <p className="truncate text-xs text-muted-foreground">
                      {trainer.email}
                    </p>
                  </div>
                </div>
              </DialogHeader>

              <DialogBody className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted/40 py-3 text-center">
                  <div>
                    <p className="text-lg font-black text-foreground">
                      {trainer.customer_count ?? 0}
                    </p>
                    <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" /> Clients
                    </p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-foreground">
                      {trainer.avg_rating || "—"}
                    </p>
                    <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3" /> Rating (
                      {trainer.review_count ?? 0})
                    </p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-foreground">
                      {(trainer.experience_years ?? 0) > 0
                        ? trainer.experience_years
                        : "—"}
                    </p>
                    <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <Briefcase className="h-3 w-3" /> Yrs exp.
                    </p>
                  </div>
                </div>

                {/* Relationship status / request action */}
                {assignment ? (
                  <AssignmentStatusCard
                    assignment={assignment}
                    onCancel={() => setCancelTarget(assignment.id)}
                  />
                ) : (
                  <Button
                    className="w-full gap-2"
                    onClick={() => setRequestOpen(true)}
                  >
                    <Send className="h-4 w-4" />
                    Request this Trainer
                  </Button>
                )}

                {/* Full profile */}
                <TrainerProfileSummary trainerId={trainer.id} />

                {/* Reviews — interactive (write/edit) once approved, read-only otherwise */}
                {assignment?.status === "approved" ? (
                  <TrainerReviewSection
                    trainerId={trainer.id}
                    customerId={userId}
                  />
                ) : (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold tracking-tight">
                      Reviews
                    </h3>
                    {reviews && reviews.count > 0 ? (
                      <div className="space-y-2">
                        {reviews.reviews.map((r: Review) => (
                          <div
                            key={r.id}
                            className="rounded-lg border bg-background p-3 space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                {r.user_name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(r.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <StarRating value={r.rating} size="sm" />
                            {r.comment && (
                              <p className="text-xs text-muted-foreground">
                                {r.comment}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No reviews yet.
                      </p>
                    )}
                  </div>
                )}
              </DialogBody>
            </>
          )}
        </DialogContent>
      </Dialog>

      <TrainerRequestDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        trainer={trainer ?? null}
        onSuccess={() => {
          setRequestOpen(false);
          toast.success("Request sent! Check My Trainers for status.");
          refresh();
        }}
      />

      <ConfirmDialog
        open={cancelTarget != null}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
        title="Cancel trainer request?"
        description="Your pending request will be withdrawn. You can send a new request anytime."
        confirmLabel="Cancel Request"
        onConfirm={confirmCancel}
      />
    </>
  );
}
