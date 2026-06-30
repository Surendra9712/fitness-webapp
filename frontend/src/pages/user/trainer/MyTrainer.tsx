import { useState } from "react";
import { UserCheck, Lock, Crown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import useUser from "@/hooks/useUser";
import { Card, CardContent } from "@/components/ui/card";
import { AssignmentStatusCard } from "@/components/trainer/AssignmentStatusCard";
import { TrainerReviewSection } from "@/components/trainer/TrainerReviewSection";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function MyTrainer() {
  const { user } = useAuth();
  const [cancelOpen, setCancelOpen] = useState(false);

  const { GetTrainerAssignment, CancelTrainerAssignment } = useUser();
  const { data: assignment, isLoading } = GetTrainerAssignment();
  const cancelMutation = CancelTrainerAssignment();

  const isPro = user?.subscription_plan === "pro" && user?.subscription_status === "active";
  const userId = (user as unknown as { id: number } | null)?.id ?? 0;

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
      <h1 className="text-2xl font-bold tracking-tight">My Trainer</h1>

      {assignment ? (
        <>
          <AssignmentStatusCard
            assignment={assignment}
            onCancel={() => setCancelOpen(true)}
          />
          {assignment.status === "approved" && (
            <TrainerReviewSection
              trainerId={assignment.trainer_id}
              customerId={userId}
            />
          )}
        </>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <UserCheck className="h-12 w-12 text-muted-foreground/30" />
            <p className="font-medium text-muted-foreground">
              No trainer assigned yet
            </p>
            <p className="text-sm text-muted-foreground">
              Browse trainers and send a request to get started.
            </p>
            <Button asChild className="mt-2">
              <Link to="/customer/trainer-request">Find a Trainer</Link>
            </Button>
          </CardContent>
        </Card>
      )}

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
