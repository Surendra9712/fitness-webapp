// STUN-only for now — enough for most direct/home-network connections.
// A TURN server (needed for reliable connectivity across restrictive
// NATs/corporate firewalls) can be added here later as an extra entry,
// e.g. { urls: "turn:your-turn-host:3478", username: "...", credential: "..." }.
export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];
