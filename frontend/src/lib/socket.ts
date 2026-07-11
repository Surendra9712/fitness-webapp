import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    // No explicit URL: connects same-origin (whatever host/protocol served
    // the page), through the Vite dev proxy's /socket.io rule — the same
    // pattern already used for /api and /static. A hardcoded backend URL
    // would break the moment the page isn't loaded from that exact host
    // (e.g. a different device on the LAN using the host's IP).
    socket = io({
      autoConnect: false,
      auth: { token: localStorage.getItem("token") ?? "" },
      // Flask-SocketIO's dev server (plain Werkzeug, no eventlet/gevent)
      // mis-frames the WebSocket transport over a real network interface —
      // fine on localhost, but connecting from another device on the LAN
      // gets an immediate "Invalid frame header" and reconnect-loops forever,
      // dropping chat/call events in the churn. Long-polling doesn't hit this
      // and is plenty fast for chat + WebRTC signaling.
      transports: ["polling"],
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  s.auth = { token: localStorage.getItem("token") ?? "" };
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket(): void {
  socket?.disconnect();
}
