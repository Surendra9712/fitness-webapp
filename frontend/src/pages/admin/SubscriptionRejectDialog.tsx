import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Props {
  userName: string | null;
  open: boolean;
  onConfirm: (note: string) => void;
  onCancel: () => void;
}

export default function SubscriptionRejectDialog({
  userName,
  open,
  onConfirm,
  onCancel,
}: Props) {
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) setNote("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Subscription</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            You are rejecting{" "}
            <span className="font-medium text-foreground">{userName}</span>'s
            Pro subscription request. This note is required and will be sent to
            the user.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="reject-note">
              Reason / Note <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reject-note"
              placeholder="e.g. Payment not verified, please resubmit with receipt."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!note.trim()}
            onClick={() => onConfirm(note.trim())}
          >
            Confirm Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
