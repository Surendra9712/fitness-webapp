import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StarDisplay, StarRating } from "@/components/ui/star-rating";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import usePublic from "@/hooks/usePublic";
import { Product, Review, ReviewStats } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const ProductReviews = ({
  reviewStats,
  product,
}: {
  product: Product;

  reviewStats?: ReviewStats;
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [reviewDraft, setReviewDraft] = useState({ rating: 0, comment: "" });
  const [reviewEditing, setReviewEditing] = useState(false);
  const myReview = reviewStats?.reviews.find(
    (r: Review) => r.user_id === user?.id,
  );

  const { SubmitProductReview, DeleteProductReview } = usePublic();

  const submitReview = SubmitProductReview(product?.id);
  const deleteReview = DeleteProductReview(product?.id);

  //    Pre-fill draft when my review loads
  useEffect(() => {
    if (myReview) {
      setReviewDraft({
        rating: myReview.rating,
        comment: myReview.comment ?? "",
      });
    }
  }, [myReview?.id]);

  async function handleSubmitReview() {
    if (reviewDraft.rating === 0) {
      toast.error("Please select a star rating");
      return;
    }
    try {
      await submitReview.mutateAsync({
        rating: reviewDraft.rating,
        comment: reviewDraft.comment.trim() || null,
      });
      queryClient.invalidateQueries({ queryKey: ["productReviews"] });
      toast.success("Review saved");
      setReviewEditing(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleDeleteReview() {
    try {
      await deleteReview.mutateAsync();
      toast.success("Review removed");
      setReviewDraft({ rating: 0, comment: "" });
      queryClient.invalidateQueries({ queryKey: ["productReviews"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  return (
    <div className="mt-14">
      <Separator className="mb-10" />
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Customer Reviews
          </h2>
          {reviewStats && reviewStats.count > 0 && (
            <StarDisplay
              value={reviewStats.avg_rating}
              count={reviewStats.count}
              size="md"
              className="mt-1"
            />
          )}
        </div>
        {user && !myReview && !reviewEditing && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setReviewEditing(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
            Write a Review
          </Button>
        )}
      </div>

      {user && (reviewEditing || myReview) && (
        <div className="mb-8 rounded-xl border bg-muted/30 p-5 space-y-4 max-w-2xl">
          <p className="text-sm font-semibold">
            {myReview && !reviewEditing
              ? "Your Review"
              : myReview
                ? "Edit Your Review"
                : "Write a Review"}
          </p>
          {reviewEditing ? (
            <>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Rating *</p>
                <StarRating
                  value={reviewDraft.rating}
                  onChange={(v) => setReviewDraft((d) => ({ ...d, rating: v }))}
                  size="lg"
                />
              </div>
              <Textarea
                placeholder="Share your experience with this product (optional)…"
                value={reviewDraft.comment}
                onChange={(e) =>
                  setReviewDraft((d) => ({ ...d, comment: e.target.value }))
                }
                rows={3}
                className="resize-none"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSubmitReview}
                  disabled={submitReview.isPending}
                >
                  {submitReview.isPending ? "Saving…" : "Save Review"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setReviewEditing(false);
                    if (myReview)
                      setReviewDraft({
                        rating: myReview.rating,
                        comment: myReview.comment ?? "",
                      });
                    else setReviewDraft({ rating: 0, comment: "" });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : myReview ? (
            <div className="space-y-2">
              <StarRating value={myReview.rating} size="md" />
              {myReview.comment && (
                <p className="text-sm text-muted-foreground">
                  {myReview.comment}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setReviewEditing(true)}
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-destructive hover:text-destructive"
                  onClick={handleDeleteReview}
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {reviewStats && reviewStats.count > 0 ? (
        <div className="space-y-4 max-w-2xl">
          {reviewStats.reviews
            .filter((r: Review) => r.user_id !== user?.id)
            .map((r: Review) => (
              <div
                key={r.id}
                className="rounded-xl border bg-background p-4 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{r.user_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                <StarRating value={r.rating} size="sm" />
                {r.comment && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {r.comment}
                  </p>
                )}
              </div>
            ))}
        </div>
      ) : !user || !myReview ? (
        <p className="text-sm text-muted-foreground">
          No reviews yet.{" "}
          {user
            ? "Be the first to review after purchasing."
            : "Sign in to leave a review after purchasing."}
        </p>
      ) : null}
    </div>
  );
};
