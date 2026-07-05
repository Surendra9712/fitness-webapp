import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import useDietitian from "@/hooks/useDietitian";
import { useState } from "react";
import { TrainerAssignment } from "@/types";
import { toast } from "sonner";

interface Props {
  request: TrainerAssignment | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const TrainerRequestDialog = ({
  request,
  onClose,
  onSuccess,
}: Props) => {
  const [trainerNote, setTrainerNote] = useState("");

  const { ApproveDietitianAssignment, RejectDietitianAssignment } =
    useDietitian();

  const approveAssignment = ApproveDietitianAssignment();
  const rejectAssignment = RejectDietitianAssignment();

  async function approve() {
    if (!request) return;
    try {
      await approveAssignment.mutateAsync({
        id: request.id,
        trainer_note: trainerNote || undefined,
      });
      onSuccess();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function reject() {
    if (!request) return;
    try {
      await rejectAssignment.mutateAsync({
        id: request.id,
        trainer_note: trainerNote || undefined,
      });
      onSuccess();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleRequest() {
    if (request?.isApprovedByTrainer) {
      await approve();
    } else {
      await reject();
    }
    onClose();
  }

  return (
    <Dialog open={!!request} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {request?.isApprovedByTrainer ? "Approve" : "Reject"} Request
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          {request?.isApprovedByTrainer ? (
            <p className="text-sm text-muted-foreground">
              Approving <strong>{request?.customer_name}</strong>. Request will
              then go to admin for final confirmation.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Rejecting request from <strong>{request?.customer_name}</strong>.
            </p>
          )}

          <div className="space-y-1.5">
            <Label>Note to customer (optional)</Label>
            <Input
              placeholder="e.g. Looking forward to working with you!"
              value={trainerNote}
              onChange={(e) => setTrainerNote(e.target.value)}
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose()}>
            Cancel
          </Button>
          <Button
            onClick={handleRequest}
            loading={approveAssignment.isPending || rejectAssignment.isPending}
            disabled={approveAssignment.isPending || rejectAssignment.isPending}
          >
            {request?.isApprovedByTrainer ? "Approve" : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
