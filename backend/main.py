import asyncio
import os
from pathlib import Path

import socketio
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from errors import register_error_handlers
from extensions import sio, set_main_loop
from routers import (
    auth, admin, dietitian, user, public, onboarding,
    payment, upload, notifications, ai, chat,
)
import sockets.chat_events  # noqa: F401 - registers socketio event handlers
import sockets.call_events  # noqa: F401 - registers socketio event handlers

load_dotenv()

app = FastAPI()
register_error_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

static_dir = Path(__file__).resolve().parent / "static"
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

app.include_router(auth.router,          prefix="/api/auth")
app.include_router(admin.router,         prefix="/api/admin")
app.include_router(dietitian.router,     prefix="/api/dietitian")
app.include_router(user.router,          prefix="/api/user")
app.include_router(public.router,        prefix="/api/public")
app.include_router(onboarding.router,    prefix="/api/onboarding")
app.include_router(payment.router,       prefix="/api/payments")
app.include_router(upload.router,        prefix="/api/upload")
app.include_router(notifications.router, prefix="/api/notifications")
app.include_router(ai.router,            prefix="/api/ai")
app.include_router(chat.router,          prefix="/api/chat")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "SmartDiet API"}


@app.on_event("startup")
async def _capture_main_loop():
    # Lets sync REST route handlers (running in FastAPI's threadpool) push
    # Socket.IO events via extensions.emit_sync by scheduling the coroutine
    # back onto this loop.
    set_main_loop(asyncio.get_running_loop())


# python-socketio intercepts requests under /socket.io/ and delegates
# everything else to the FastAPI app — this combined app is what uvicorn serves.
asgi_app = socketio.ASGIApp(sio, other_asgi_app=app)


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("FLASK_PORT", 5000))
    # Bind all interfaces (not just 127.0.0.1) so devices on the LAN — e.g.
    # a phone or second laptop hitting the frontend via the host's IP — can
    # also reach the Socket.IO server for chat/calls, not just the REST API.
    uvicorn.run(asgi_app, host="0.0.0.0", port=port)
