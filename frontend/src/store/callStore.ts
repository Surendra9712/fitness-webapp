import { create } from "zustand";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";
import { ICE_SERVERS } from "@/lib/webrtc";
import { startRingtone, stopRingtone } from "@/lib/ringtone";
import type { CallStatus, CallType, IncomingCallInfo } from "@/types";

interface CallState {
  status: CallStatus;
  callType: CallType | null;
  assignmentId: number | null;
  peerId: number | null;
  peerName: string;
  peerImage?: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  muted: boolean;
  cameraOff: boolean;
  bindListeners: () => void;
  startCall: (
    assignmentId: number,
    peerId: number,
    peerName: string,
    peerImage: string | null | undefined,
    callType: CallType,
  ) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
}

// Non-reactive WebRTC internals — these don't drive UI directly, only the
// derived fields (status/localStream/remoteStream) pushed into the store do.
let pc: RTCPeerConnection | null = null;
let pendingOffer: RTCSessionDescriptionInit | null = null;
let pendingCandidates: RTCIceCandidateInit[] = [];
let listenersBound = false;

function createPeerConnection(
  assignmentId: number,
  set: (partial: Partial<CallState>) => void,
) {
  const conn = new RTCPeerConnection({ iceServers: ICE_SERVERS });

  conn.onicecandidate = (e) => {
    if (e.candidate) {
      getSocket().emit("call:ice-candidate", {
        assignment_id: assignmentId,
        candidate: e.candidate,
      });
    }
  };

  conn.ontrack = (e) => {
    set({ remoteStream: e.streams[0] });
  };

  // WebRTC's own signal for "the other side is gone" (tab closed, network
  // drop) — no backend involvement needed, this is standard practice.
  conn.oniceconnectionstatechange = () => {
    const state = conn.iceConnectionState;
    if (state === "failed" || state === "disconnected") {
      setTimeout(() => {
        if (
          conn === pc &&
          (conn.iceConnectionState === "failed" ||
            conn.iceConnectionState === "disconnected")
        ) {
          useCallStore.getState().endCall();
        }
      }, 4000);
    }
  };

  return conn;
}

function resetCallState(
  set: (partial: Partial<CallState>) => void,
  get: () => CallState,
) {
  stopRingtone();
  get()
    .localStream?.getTracks()
    .forEach((t) => t.stop());
  pc?.close();
  pc = null;
  pendingOffer = null;
  pendingCandidates = [];
  set({
    status: "idle",
    callType: null,
    assignmentId: null,
    peerId: null,
    peerName: "",
    peerImage: null,
    localStream: null,
    remoteStream: null,
    muted: false,
    cameraOff: false,
  });
}

export const useCallStore = create<CallState>((set, get) => ({
  status: "idle",
  callType: null,
  assignmentId: null,
  peerId: null,
  peerName: "",
  peerImage: null,
  localStream: null,
  remoteStream: null,
  muted: false,
  cameraOff: false,

  bindListeners: () => {
    if (listenersBound) return;
    const socket = getSocket();

    socket.on("call:incoming", (info: IncomingCallInfo) => {
      if (get().status !== "idle") {
        getSocket().emit("call:decline", { assignment_id: info.assignment_id });
        return;
      }
      pendingOffer = info.sdp;
      set({
        status: "incoming",
        callType: info.call_type,
        assignmentId: info.assignment_id,
        peerId: info.from_user_id,
        peerName: info.from_name,
        peerImage: info.from_image,
      });
      startRingtone("incoming");
    });

    socket.on(
      "call:answered",
      async ({
        sdp,
      }: {
        assignment_id: number;
        sdp: RTCSessionDescriptionInit;
      }) => {
        if (!pc) return;
        await pc.setRemoteDescription(sdp);
        for (const candidate of pendingCandidates) {
          await pc.addIceCandidate(candidate).catch(() => {});
        }
        pendingCandidates = [];
        stopRingtone();
        set({ status: "connected" });
      },
    );

    socket.on(
      "call:ice-candidate",
      ({
        candidate,
      }: {
        assignment_id: number;
        candidate: RTCIceCandidateInit;
      }) => {
        if (pc && pc.remoteDescription) {
          pc.addIceCandidate(candidate).catch(() => {});
        } else {
          pendingCandidates.push(candidate);
        }
      },
    );

    socket.on("call:declined", () => {
      toast.info(`${get().peerName || "The other person"} declined the call`);
      resetCallState(set, get);
    });

    socket.on("call:ended", () => {
      resetCallState(set, get);
    });

    socket.on("call:busy", () => {
      toast.error("They're on another call right now");
      resetCallState(set, get);
    });

    socket.on("call:offline", () => {
      toast.error(`${get().peerName || "The other person"} is offline right now`);
      resetCallState(set, get);
    });

    socket.on("call:error", ({ error }: { error: string }) => {
      toast.error(error || "Call failed");
      resetCallState(set, get);
    });

    listenersBound = true;
  },

  startCall: async (assignmentId, peerId, peerName, peerImage, callType) => {
    try {
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video",
      });
      set({
        status: "outgoing",
        callType,
        assignmentId,
        peerId,
        peerName,
        peerImage,
        localStream,
        remoteStream: null,
        muted: false,
        cameraOff: false,
      });
      startRingtone("outgoing");

      pc = createPeerConnection(assignmentId, set);
      localStream
        .getTracks()
        .forEach((track) => pc!.addTrack(track, localStream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      getSocket().emit("call:invite", {
        assignment_id: assignmentId,
        call_type: callType,
        sdp: offer,
      });
    } catch {
      toast.error("Couldn't access camera/microphone");
      resetCallState(set, get);
    }
  },

  acceptCall: async () => {
    const { assignmentId, callType } = get();
    if (!assignmentId || !callType || !pendingOffer) return;
    stopRingtone();
    try {
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video",
      });
      set({ localStream });

      pc = createPeerConnection(assignmentId, set);
      localStream
        .getTracks()
        .forEach((track) => pc!.addTrack(track, localStream));

      await pc.setRemoteDescription(pendingOffer);
      for (const candidate of pendingCandidates) {
        await pc.addIceCandidate(candidate).catch(() => {});
      }
      pendingCandidates = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      getSocket().emit("call:answer", {
        assignment_id: assignmentId,
        sdp: answer,
      });
      set({ status: "connected" });
    } catch {
      toast.error("Couldn't access camera/microphone");
      get().declineCall();
    }
  },

  declineCall: () => {
    const { assignmentId } = get();
    if (assignmentId)
      getSocket().emit("call:decline", { assignment_id: assignmentId });
    resetCallState(set, get);
  },

  endCall: () => {
    const { assignmentId } = get();
    if (assignmentId)
      getSocket().emit("call:end", { assignment_id: assignmentId });
    resetCallState(set, get);
  },

  toggleMute: () => {
    const { localStream, muted } = get();
    localStream?.getAudioTracks().forEach((t) => (t.enabled = muted));
    set({ muted: !muted });
  },

  toggleCamera: () => {
    const { localStream, cameraOff } = get();
    localStream?.getVideoTracks().forEach((t) => (t.enabled = cameraOff));
    set({ cameraOff: !cameraOff });
  },
}));
