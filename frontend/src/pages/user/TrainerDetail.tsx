import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  UserCheck,
  Users,
  Mail,
  Star,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import useUser from "@/hooks/useUser";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StarDisplay, StarRating } from "@/components/ui/star-rating";
import { TrainerRequestDialog } from "@/components/trainer/TrainerRequestDialog";
import { toast } from "sonner";
import type { Review } from "@/types";

export default function TrainerDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [requestOpen, setRequestOpen] = useState(false);

  const { GetTrainer, GetTrainerReviews, GetTrainerAssignment } = useUser();
  const { data: trainer, isLoading, isError } = GetTrainer(id);
  const { data: reviews } = GetTrainerReviews(trainer?.id);
  const { data: assignment, refetch: refetchAssignment } = GetTrainerAssignment();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isError || !trainer) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-6">
        <UserCheck className="h-16 w-16 text-border" />
        <h2 className="text-xl font-bold">Trainer not found</h2>
        <Button asChild variant="outline">
          <Link to="/customer/trainer">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Link>
        </Button>
      </div>
    );
  }

  const canRequest = !assignment || assignment.status === "rejected";
  const isAssigned =
    assignment?.trainer_id === trainer.id && assignment.status === "approved";
  const hasPending = !!assignment && assignment.status !== "rejected";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back */}
      <Button asChild variant="ghost" className="-ml-2 text-muted-foreground w-fit">
        <Link to="/customer/trainer">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          All Trainers
        </Link>
      </Button>

      {/* Hero card */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-br from-primary to-secondary-600" />

        <CardContent className="pt-0 pb-6">
          <div className="relative -mt-10 mb-4 flex items-end justify-between">
            <Avatar className="h-20 w-20 border-4 border-background shadow-sm rounded-2xl">
              <AvatarFallback className="rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white text-3xl font-black">
                {trainer.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {isAssigned && (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1">
                <ShieldCheck className="h-3 w-3" />
                Your trainer
              </Badge>
            )}
          </div>

          <h1 className="text-2xl font-black tracking-tight">{trainer.name}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <Mail className="h-3.5 w-3.5" />
            {trainer.email}
          </p>

          <Separator className="my-4" />

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-black text-foreground">{trainer.customer_count ?? 0}</p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Users className="h-3 w-3" /> Active clients
              </p>
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">{trainer.avg_rating || "—"}</p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Star className="h-3 w-3" /> Avg rating
              </p>
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">{trainer.review_count ?? 0}</p>
              <p className="text-xs text-muted-foreground">Reviews</p>
            </div>
          </div>

          {reviews && reviews.count > 0 && (
            <div className="mt-4 flex justify-center">
              <StarDisplay value={reviews.avg_rating} count={reviews.count} size="md" />
            </div>
          )}

          {user && (
            <div className="mt-5">
              {isAssigned ? (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800 font-medium text-center">
                  You are currently assigned to this trainer
                </div>
              ) : hasPending ? (
                <div className="rounded-lg bg-secondary-50 border border-secondary-200 px-4 py-3 text-sm text-secondary-800 font-medium text-center">
                  You already have a pending request — check{" "}
                  <Link to="/customer/trainer" className="underline font-semibold">
                    My Trainer
                  </Link>
                </div>
              ) : canRequest ? (
                <Button className="w-full gap-2" onClick={() => setRequestOpen(true)}>
                  <Send className="h-4 w-4" />
                  Request this Trainer
                </Button>
              ) : null}
            </div>
          )}

          {!user && (
            <div className="mt-5">
              <Button asChild className="w-full gap-2">
                <Link to="/login">
                  <Send className="h-4 w-4" />
                  Sign in to Request
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reviews */}
      <div>
        <h2 className="text-lg font-bold tracking-tight mb-4">Reviews</h2>
        {reviews && reviews.count > 0 ? (
          <div className="space-y-3">
            {reviews.reviews.map((r: Review) => (
              <Card key={r.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{r.user_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <StarRating value={r.rating} size="sm" />
                  {r.comment && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{r.comment}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">No reviews yet.</p>
        )}
      </div>

      <TrainerRequestDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        trainer={trainer}
        onSuccess={() => {
          setRequestOpen(false);
          toast.success("Request sent! Check My Trainer for status.");
          refetchAssignment();
        }}
      />
    </div>
  );
}
