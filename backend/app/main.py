"""
FastAPI application entrypoint.
Mounts all /api routers, configures CORS, and exposes OpenAPI documentation at /api/docs.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from backend.app.routers.accuracy import router as accuracy_router
from backend.app.routers.decision import router as decision_router
from backend.app.routers.evolution import router as evolution_router
from backend.app.routers.health import router as health_router
from backend.app.routers.meta import router as meta_router

app = FastAPI(
    title="UK Wind Forecast Decision Portal API",
    description="Empirical decision-time forecast engine and accuracy evaluation for GB day-ahead power trading desks.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# Enable CORS for local Vite dev, Docker compose, and Vercel preview/production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routers under /api
app.include_router(health_router, prefix="/api")
app.include_router(meta_router, prefix="/api")
app.include_router(decision_router, prefix="/api")
app.include_router(accuracy_router, prefix="/api")
app.include_router(evolution_router, prefix="/api")


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/api/docs")
