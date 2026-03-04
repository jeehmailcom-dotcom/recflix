"""
RecFlix FastAPI Application Entry Point
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.v1.router import api_router
from app.database import engine, Base
from app.models import *  # noqa: F401, F403 - Import all models for table creation


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup: Create database tables
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown: cleanup if needed


app = FastAPI(
    lifespan=lifespan,
    title=settings.APP_NAME,
    description="Context-Aware Personalized Movie Recommendation Platform",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to RecFlix API",
        "version": "0.1.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.get("/debug/cache")
async def cache_stats():
    """Temporary: cache key stats for debugging"""
    import time
    from app.services.recommendation import _CACHE
    now = time.time()
    return {
        k: {"ttl_remaining": round(v[1] - now, 1), "type": type(v[0]).__name__, "len": len(v[0]) if hasattr(v[0], "__len__") else "n/a"}
        for k, v in _CACHE.items()
    }
