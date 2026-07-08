import { useEffect, useState } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";
import { useCallStore } from "@/store/callStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

function useElapsedSeconds(active: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) {
      setSeconds(0);
      return;
    }
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  return seconds;
}

function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function ActiveCallOverlay() {
  const status = useCallStore((s) => s.status);
  const callType = useCallStore((s) => s.callType);
  const peerName = useCallStore((s) => s.peerName);
  const peerImage = useCallStore((s) => s.peerImage);
  const localStream = useCallStore((s) => s.localStream);
  const remoteStream = useCallStore((s) => s.remoteStream);
  const muted = useCallStore((s) => s.muted);
  const cameraOff = useCallStore((s) => s.cameraOff);
  const toggleMute = useCallStore((s) => s.toggleMute);
  const toggleCamera = useCallStore((s) => s.toggleCamera);
  const endCall = useCallStore((s) => s.endCall);

  const elapsed = useElapsedSeconds(status === "connected");

  // Callback refs (not useRef+useEffect): the <video> elements only exist in
  // the DOM while the dialog is open, and the remote/local MediaStream is
  // frequently already set by the time that happens (ontrack can fire before
  // the callee even finishes accepting) — a dependency-array effect would
  // miss that "stream already ready, node just mounted" case since the
  // stream reference wouldn't have changed since the node last didn't exist.
  // A callback ref re-runs on every mount with the current stream, always.
  function bindRemoteVideo(el: HTMLVideoElement | null) {
    if (el) el.srcObject = remoteStream;
  }
  function bindLocalVideo(el: HTMLVideoElement | null) {
    if (el) el.srcObject = localStream;
  }

  const open = status === "outgoing" || status === "connected";
  const isVideo = callType === "video";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && endCall()}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        <div className="relative flex h-[70vh] flex-col items-center justify-center bg-neutral-900 text-white">
          {isVideo ? (
            <>
              <video
                ref={bindRemoteVideo}
                autoPlay
                playsInline
                className="h-full w-full object-cover"
              />
              <video
                ref={bindLocalVideo}
                autoPlay
                playsInline
                muted
                className="absolute bottom-4 right-4 h-32 w-24 rounded-lg border border-white/20 object-cover shadow-lg"
              />
              {!remoteStream && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-900">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={peerImage ?? undefined} />
                    <AvatarFallback className="text-2xl">
                      {peerName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-lg font-medium">{peerName}</p>
                  <p className="text-sm text-white/70">
                    {status === "outgoing" ? "Calling…" : "Connecting…"}
                  </p>
                </div>
              )}
              {status === "connected" && (
                <p className="absolute left-4 top-4 rounded-full bg-black/40 px-3 py-1 text-xs font-medium">
                  {formatDuration(elapsed)}
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Avatar className="h-24 w-24">
                <AvatarImage src={peerImage ?? undefined} />
                <AvatarFallback className="text-3xl">
                  {peerName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="text-xl font-medium">{peerName}</p>
              <p className="text-sm text-white/70">
                {status === "outgoing" ? "Calling…" : formatDuration(elapsed)}
              </p>
            </div>
          )}

          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3">
            <Button
              variant="secondary"
              size="icon"
              className="h-11 w-11 rounded-full"
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            {isVideo && (
              <Button
                variant="secondary"
                size="icon"
                className="h-11 w-11 rounded-full"
                onClick={toggleCamera}
                aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}
              >
                {cameraOff ? (
                  <VideoOff className="h-4 w-4" />
                ) : (
                  <Video className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button
              variant="destructive"
              size="icon"
              className="h-11 w-11 rounded-full"
              onClick={endCall}
              aria-label="Hang up"
            >
              <PhoneOff className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
