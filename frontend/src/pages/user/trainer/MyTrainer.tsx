import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { UserCheck, Lock, Crown, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import useUser from "@/hooks/useUser";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AssignmentStatusCard, STATUS_META } from "@/components/trainer/AssignmentStatusCard";
import { TrainerProfileSummary } from "@/components/trainer/TrainerProfileSummary";
import { TrainerReviewSection } from "@/components/trainer/TrainerReviewSection";
import { TrainerDetailModal } from "@/components/trainer/TrainerDetailModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import TrainerRequest from "./TrainerRequest";
import { toast } from "sonner";
import type { TrainerAssignment } from "@/types";

// Shared detail view — used for the "single trainer" inline case (My Trainers tab).
// The multi-trainer list case and Find-a-Trainer browsing both use TrainerDetailModal instead.
function AssignmentDetail({
  assignment,
  userId,
  onCancel,
}: {
  assignment: TrainerAssignment;
  userId: number;
  onCancel: (id: number) => void;
}) {
  return (
    <div className="space-y-3">
      <AssignmentStatusCard assignment={assignment} onCancel={() => onCancel(assignment.id)} />
      <TrainerProfileSummary trainerId={assignment.trainer_id} />
      {assignment.status === "approved" && (
        <TrainerReviewSection trainerId={assignment.trainer_id} customerId={userId} />
      )}
    </div>
  );
}

export default function MyTrainer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [cancelTarget, setCancelTarget] = useState<number | null>(null);
  const [detailTarget, setDetailTarget] = useState<number | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "find" ? "find" : "mine";

  const { GetTrainerAssignments, CancelTrainerAssignment } = useUser();
  const { data: allAssignments, isLoading } = GetTrainerAssignments();
  const assignments = (allAssignments ?? []).filter((a) => a.status !== "rejected");
  const cancelMutation = CancelTrainerAssignment();

  const isPro = user?.subscription_plan === "pro" && user?.subscription_status === "active";
  const userId = (user as unknown as { id: number } | null)?.id ?? 0;

  async function cancelRequest() {
    if (cancelTarget == null) return;
    try {
      await cancelMutation.mutateAsync(cancelTarget);
      toast.success("Request cancelled");
      queryClient.invalidateQueries({ queryKey: ["trainerAssignments"] });
      queryClient.invalidateQueries({ queryKey: ["trainers"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCancelTarget(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!isPro) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center max-w-md mx-auto">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Pro Feature</h2>
        <p className="text-sm text-muted-foreground">
          The Trainer feature is available exclusively on the Pro plan.
          {user?.subscription_plan === "pro" && user?.subscription_status === "pending"
            ? " Your upgrade request is pending admin approval."
            : " Upgrade to connect with a certified trainer."}
        </p>
        <Button asChild className="mt-2 gap-2">
          <Link to="/customer/subscription">
            <Crown className="h-4 w-4" /> View Plans
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Trainers</h1>

      <Tabs
        value={tab}
        onValueChange={(v) =>
          setSearchParams(v === "find" ? { tab: "find" } : {}, { replace: true })
        }
      >
        <TabsList>
          <TabsTrigger value="mine">My Trainers</TabsTrigger>
          <TabsTrigger value="find">Find a Trainer</TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="space-y-6">
          {assignments.length === 1 ? (
            <AssignmentDetail
              assignment={assignments[0]}
              userId={userId}
              onCancel={setCancelTarget}
            />
          ) : assignments.length > 1 ? (
            <div className="rounded-2xl border bg-background shadow-sm divide-y overflow-hidden">
              {assignments.map((assignment) => {
                const meta = STATUS_META[assignment.status];
                return (
                  <button
                    key={assignment.id}
                    onClick={() => setDetailTarget(assignment.trainer_id)}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/40"
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="text-sm font-bold">
                        {assignment.trainer_name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {assignment.trainer_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {assignment.trainer_email}
                      </p>
                    </div>
                    {meta && <Badge className={meta.color}>{meta.label}</Badge>}
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                <UserCheck className="h-12 w-12 text-muted-foreground/30" />
                <p className="font-medium text-muted-foreground">
                  No trainers yet
                </p>
                <p className="text-sm text-muted-foreground">
                  Browse trainers and send a request to get started.
                </p>
                <Button
                  className="mt-2"
                  onClick={() => setSearchParams({ tab: "find" }, { replace: true })}
                >
                  Find a Trainer
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="find">
          <TrainerRequest embedded />
        </TabsContent>
      </Tabs>

      <TrainerDetailModal
        trainerId={detailTarget}
        onOpenChange={(open) => { if (!open) setDetailTarget(null); }}
      />

      <ConfirmDialog
        open={cancelTarget != null}
        onOpenChange={(open) => { if (!open) setCancelTarget(null); }}
        title="Cancel trainer request?"
        description="Your pending request will be withdrawn. You can send a new request anytime."
        confirmLabel="Cancel Request"
        onConfirm={cancelRequest}
      />
    </div>
  );
}
