from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from utils.validation import pydantic_errors


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        # Preserve the {'error': message} shape the frontend's axios
        # interceptor reads, instead of FastAPI's default {'detail': message}.
        detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
        return JSONResponse(status_code=exc.status_code, content={"error": detail})

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        # Preserve the {'errors': {field: message}} shape produced by the old
        # per-route `except ValidationError as exc: pydantic_errors(exc)` pattern.
        return JSONResponse(status_code=422, content={"errors": pydantic_errors(exc)})
