import { Phone, PhoneOff, Video } from "lucide-react";
import { useCallStore } from "@/store/callStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function IncomingCallDialog() {
  const status = useCallStore((s) => s.status);
  const callType = useCallStore((s) => s.callType);
  const peerName = useCallStore((s) => s.peerName);
  const peerImage = useCallStore((s) => s.peerImage);
  const acceptCall = useCallStore((s) => s.acceptCall);
  const declineCall = useCallStore((s) => s.declineCall);

  const open = status === "incoming";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && declineCall()}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="items-center text-center">
          <Avatar className="h-16 w-16">
            <AvatarImage src={peerImage ?? undefined} />
            <AvatarFallback className="text-xl">
              {peerName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <DialogTitle className="mt-2">{peerName}</DialogTitle>
          <DialogDescription>
            Incoming {callType === "video" ? "video" : "audio"} call…
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="justify-center gap-4 sm:justify-center">
          <Button
            variant="destructive"
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={declineCall}
            aria-label="Decline call"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
          <Button
            className="h-12 w-12 rounded-full bg-emerald-600 hover:bg-emerald-700"
            size="icon"
            onClick={acceptCall}
            aria-label="Accept call"
          >
            {callType === "video" ? (
              <Video className="h-5 w-5" />
            ) : (
              <Phone className="h-5 w-5" />
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
