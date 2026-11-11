import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.api import admin, auth, complaints, dashboard, followups, notifications, public, voice
from app.core.config import settings
from app.database.session import Base, SessionLocal, engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("janaseva")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    if settings.seed_demo_data:
        from app.seed import seed

        with SessionLocal() as db:
            try:
                seed(db)
            except Exception:  # pragma: no cover - seeding must never block startup
                logger.exception("Demo seed failed")
    yield


app = FastAPI(
    title=settings.app_name,
    description=(
        "Backend for the JANASEVA hospital public grievance and service monitoring platform. "
        "Non-emergency hospital service grievances only."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError):
    """Return field-level messages the UI can attach to inputs."""
    errors = []
    for error in exc.errors():
        field = ".".join(str(part) for part in error["loc"] if part not in {"body", "query", "path"})
        errors.append({"field": field or "form", "message": error["msg"]})
    first = errors[0]["message"] if errors else "Please check the submitted details."
    return JSONResponse(status_code=422, content={"detail": first, "errors": errors})


@app.get("/api/health", tags=["System"])
def health():
    with SessionLocal() as db:
        db.execute(text("SELECT 1"))
    return {
        "status": "ok",
        "app": settings.app_name,
        "environment": settings.app_env,
        "database": "postgresql" if settings.database_url.startswith("postgresql") else "sqlite",
        "voice_mode": "live" if settings.voice_live else "simulation",
        "sms_mode": "live" if settings.sms_live else "simulation",
    }


for router in (
    auth.router,
    public.router,
    complaints.router,
    dashboard.router,
    followups.router,
    notifications.router,
    voice.router,
    admin.router,
):
    app.include_router(router, prefix=settings.api_prefix)


# ------------------------------------------------------------- built frontend
# Single-service deployments (see Dockerfile) serve the compiled React app from
# FastAPI, so the API and UI share one origin. Local development leaves
# STATIC_DIR unset and Vite keeps serving the UI on port 5173.
_static_dir = Path(settings.static_dir).resolve() if settings.static_dir else None
if _static_dir and _static_dir.is_dir():
    _assets_dir = _static_dir / "assets"
    if _assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend(full_path: str):
        if full_path.startswith("api"):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
        candidate = (_static_dir / full_path).resolve()
        if full_path and candidate.is_file() and _static_dir in candidate.parents:
            return FileResponse(candidate)
        # Client-side routes (/staff/complaints, /track, ...) fall back to the SPA shell.
        return FileResponse(_static_dir / "index.html", headers={"Cache-Control": "no-cache"})
