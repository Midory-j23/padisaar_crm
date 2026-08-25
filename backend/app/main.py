import logging
import os
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.routers import (
    accounts,
    activities,
    auth,
    contacts,
    dashboard,
    errors,
    notifications,
    opportunities,
    reports,
    users,
    win_loss,
)

from app.config import settings
from app.database import AsyncSessionLocal, engine
from app.schema_ensure import ensure_auth_schema
from app.schemas.error_report import ErrorReportCreate
from app.services import error_report_service

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        await ensure_auth_schema(engine)
    except Exception:
        logger.exception(
            "Failed to ensure auth schema — login may return 500 until "
            "migrations / fix_login_otp.sql are applied"
        )
    yield


app = FastAPI(
    title="Padisaar CRM API",
    version="1.0.0",
    redirect_slashes=False,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(accounts.router, prefix="/api/accounts", tags=["accounts"])
app.include_router(contacts.router, prefix="/api/contacts", tags=["contacts"])
app.include_router(opportunities.router, prefix="/api/opportunities", tags=["opportunities"])
app.include_router(activities.router, prefix="/api/activities", tags=["activities"])
app.include_router(win_loss.router, prefix="/api/win-loss", tags=["win-loss"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(errors.router, prefix="/api/errors", tags=["errors"])


async def _log_backend_error(request: Request, message: str, stack: str | None, status_code: int) -> None:
    if request.url.path.startswith("/api/errors"):
        return
    try:
        async with AsyncSessionLocal() as db:
            await error_report_service.record_error(
                db,
                ErrorReportCreate(
                    source="backend",
                    message=(message or "Unhandled backend error")[:2000],
                    stack=(stack[:8000] if stack else None),
                    path=request.url.path,
                    method=request.method,
                    status_code=status_code,
                    user_agent=request.headers.get("user-agent"),
                ),
            )
            await db.commit()
    except Exception:
        pass


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, (StarletteHTTPException, RequestValidationError)):
        raise exc

    # Schema drift (missing users.mobile / login_otps) previously surfaced as a
    # generic 500 on login — give operators a clearer hint.
    detail = "خطای غیرمنتظره‌ای رخ داد"
    message = str(exc) or type(exc).__name__
    if "users.mobile" in message or "login_otps" in message or "UndefinedColumnError" in message:
        detail = (
            "ساختار دیتابیس به‌روز نیست. لطفاً migrations را اجرا کنید "
            "یا فایل fix_login_otp.sql را روی دیتابیس اعمال کنید."
        )
        logger.error("Auth schema mismatch during %s %s: %s", request.method, request.url.path, message)

    await _log_backend_error(
        request,
        message,
        traceback.format_exc(),
        500,
    )
    return JSONResponse(status_code=500, content={"detail": detail})


@app.get("/")
async def root():
    return {"message": "Padisaar CRM API", "docs": "/docs"}
