import asyncio

import socketio

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    # Default (25s/20s) means an abruptly-closed tab (crash, network drop —
    # no clean disconnect frame) can look "online" for up to ~45s, during
    # which a call to that person would ring pointlessly. Shorter heartbeat
    # catches that faster at the cost of a bit more idle ping traffic.
    ping_interval=10,
    ping_timeout=8,
)

_main_loop = None


def set_main_loop(loop):
    global _main_loop
    _main_loop = loop


def emit_sync(event, data, room=None):
    """Emit a Socket.IO event from a sync (threadpool) context, e.g. a REST
    route handler that needs to push a live update alongside its HTTP response."""
    if _main_loop is None:
        return
    asyncio.run_coroutine_threadsafe(sio.emit(event, data, room=room), _main_loop)
