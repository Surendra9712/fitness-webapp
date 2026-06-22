import { useEffect, useState } from 'react'
import { Star, Pencil, Trash2 } from 'lucide-react'
import useUser from '@/hooks/useUser'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { StarRating, StarDisplay } from '@/components/ui/star-rating'
import { toast } from 'sonner'
import type { Review } from '@/types'

interface Props {
  trainerId: number
  customerId: number
}

export function TrainerReviewSection({ trainerId, customerId }: Props) {
  const [draft, setDraft] = useState({ rating: 0, comment: '' })
  const [editing, setEditing] = useState(false)

  const { GetTrainerReviews, SubmitTrainerReview, DeleteTrainerReview } = useUser()
  const { data: stats } = GetTrainerReviews(trainerId)
  const submitReview = SubmitTrainerReview(trainerId)
  const deleteReview = DeleteTrainerReview(trainerId)

  const myReview = stats?.reviews.find((r: Review) => r.user_id === customerId)

  useEffect(() => {
    if (myReview) setDraft({ rating: myReview.rating, comment: myReview.comment ?? '' })
  }, [myReview?.id])

  async function submit() {
    if (draft.rating === 0) { toast.error('Please select a star rating'); return }
    try {
      await submitReview.mutateAsync({ rating: draft.rating, comment: draft.comment.trim() || null })
      toast.success('Review saved')
      setEditing(false)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function del() {
    try {
      await deleteReview.mutateAsync()
      toast.success('Review removed')
      setDraft({ rating: 0, comment: '' })
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const others = stats?.reviews.filter((r: Review) => r.user_id !== customerId) ?? []

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-accent-400 fill-accent-400" />
            <CardTitle className="text-base">Rate Your Trainer</CardTitle>
          </div>
          {stats && stats.count > 0 && (
            <StarDisplay value={stats.avg_rating} count={stats.count} size="sm" />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {editing ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Rating *</p>
              <StarRating
                value={draft.rating}
                onChange={(v) => setDraft(d => ({ ...d, rating: v }))}
                size="lg"
              />
            </div>
            <Textarea
              placeholder="Share your experience working with this trainer…"
              value={draft.comment}
              onChange={(e) => setDraft(d => ({ ...d, comment: e.target.value }))}
              rows={3}
              className="resize-none"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={submit} disabled={submitReview.isPending}>
                {submitReview.isPending ? 'Saving…' : 'Save Review'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => {
                setEditing(false)
                if (myReview) setDraft({ rating: myReview.rating, comment: myReview.comment ?? '' })
                else setDraft({ rating: 0, comment: '' })
              }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : myReview ? (
          <div className="rounded-lg bg-muted/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <StarRating value={myReview.rating} size="md" />
              <div className="flex gap-1.5">
                <button
                  onClick={() => { setDraft({ rating: myReview.rating, comment: myReview.comment ?? '' }); setEditing(true) }}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Edit review"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={del}
                  className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Delete review"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {myReview.comment && (
              <p className="text-sm text-muted-foreground">{myReview.comment}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Reviewed {new Date(myReview.created_at).toLocaleDateString()}
            </p>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />
            Write a Review
          </Button>
        )}

        {others.length > 0 && (
          <div className="space-y-3 pt-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Other reviews
            </p>
            {others.map((r: Review) => (
              <div key={r.id} className="rounded-lg border bg-background p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{r.user_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                <StarRating value={r.rating} size="sm" />
                {r.comment && <p className="text-xs text-muted-foreground">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
