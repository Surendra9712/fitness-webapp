import { Clock, CheckCircle2, XCircle, X, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { TrainerAssignment } from '@/types'

const STATUS_META: Record<string, {
  label: string
  color: string
  icon: React.ReactNode
  description: string
}> = {
  pending_trainer: {
    label: 'Awaiting Trainer',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: <Clock className="h-4 w-4" />,
    description: 'Your request has been sent. Waiting for the trainer to review it.',
  },
  pending_admin: {
    label: 'Awaiting Admin',
    color: 'bg-secondary-100 text-secondary-800 border-secondary-200',
    icon: <Clock className="h-4 w-4" />,
    description: 'Trainer approved your request. Waiting for admin final confirmation.',
  },
  approved: {
    label: 'Active',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: <CheckCircle2 className="h-4 w-4" />,
    description: 'You are assigned to this trainer.',
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: <XCircle className="h-4 w-4" />,
    description: 'Your request was rejected. You can request a different trainer.',
  },
}

interface Props {
  assignment: TrainerAssignment
  onCancel: () => void
}

export function AssignmentStatusCard({ assignment, onCancel }: Props) {
  const meta = STATUS_META[assignment.status]
  if (!meta) return null

  return (
    <Card className={`border ${meta.color}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {meta.icon}
            <CardTitle className="text-base">{meta.label}</CardTitle>
          </div>
          <Badge className={meta.color}>{meta.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{meta.description}</p>

        <div className="rounded-lg bg-white/60 p-3 space-y-1.5 text-sm">
          <div className="flex gap-2">
            <span className="font-medium w-24 shrink-0">Trainer</span>
            <span className="flex items-center gap-1.5">
              {assignment.trainer_name}
              <Link
                to={`/customer/trainers/${assignment.trainer_id}`}
                className="text-primary-600 hover:underline inline-flex items-center gap-0.5 text-xs"
              >
                <ExternalLink className="h-3 w-3" />
                View profile
              </Link>
            </span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium w-24 shrink-0">Email</span>
            <span className="text-muted-foreground">{assignment.trainer_email}</span>
          </div>
          {assignment.customer_note && (
            <div className="flex gap-2">
              <span className="font-medium w-24 shrink-0">Your note</span>
              <span className="text-muted-foreground">{assignment.customer_note}</span>
            </div>
          )}
          {assignment.trainer_note && (
            <div className="flex gap-2">
              <span className="font-medium w-24 shrink-0">Trainer note</span>
              <span className="text-muted-foreground">{assignment.trainer_note}</span>
            </div>
          )}
          {assignment.admin_note && (
            <div className="flex gap-2">
              <span className="font-medium w-24 shrink-0">Admin note</span>
              <span className="text-muted-foreground">{assignment.admin_note}</span>
            </div>
          )}
          <div className="flex gap-2">
            <span className="font-medium w-24 shrink-0">Requested</span>
            <span className="text-muted-foreground">
              {new Date(assignment.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {assignment.status === 'pending_trainer' && (
          <Button
            variant="outline" size="sm"
            className="gap-1.5 text-destructive border-destructive/40 hover:bg-red-50"
            onClick={onCancel}
          >
            <X className="h-3.5 w-3.5" />
            Cancel Request
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
