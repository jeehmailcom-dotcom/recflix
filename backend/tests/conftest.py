"""
Test configuration and shared fixtures.

Uses SQLite in-memory DB with JSONB->JSON compilation for PostgreSQL compatibility.
"""
import os

# Set test environment variables BEFORE importing app modules
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-testing"

from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import JSONB


# Make JSONB compile to JSON for SQLite
@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"


import pytest
from datetime import date

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.database import Base
from app.main import app
from app.core.deps import get_db
from app.core.security import create_access_token, get_password_hash
from app.models import User, Movie, Genre


# Test engine: SQLite in-memory with StaticPool (shared across connections)
test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=test_engine
)


@pytest.fixture
def db():
    """Create test database tables and provide a session."""
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def client(db):
    """FastAPI test client with DB dependency override."""

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db):
    """Create a test user in the database."""
    user = User(
        email="test@example.com",
        password=get_password_hash("password123"),
        nickname="TestUser",
        mbti="INTJ",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user):
    """JWT Bearer auth headers for test_user."""
    token = create_access_token(data={"sub": test_user.id})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_genre(db):
    """Create a test genre."""
    genre = Genre(name="Action", name_ko="액션")
    db.add(genre)
    db.commit()
    db.refresh(genre)
    return genre


@pytest.fixture
def test_movie(db, test_genre):
    """Create a test movie with genre and recommendation scores."""
    movie = Movie(
        id=100,
        title="Test Movie",
        title_ko="테스트 영화",
        vote_average=7.5,
        vote_count=100,
        popularity=50.0,
        is_adult=False,
        runtime=120,
        overview="A test movie overview",
        overview_ko="테스트 영화 개요",
        release_date=date(2024, 1, 15),
        poster_path="/test.jpg",
        mbti_scores={"INTJ": 0.8, "ENFP": 0.6},
        weather_scores={"sunny": 0.7, "rainy": 0.3},
        emotion_tags={"healing": 0.8, "tension": 0.2},
    )
    movie.genres.append(test_genre)
    db.add(movie)
    db.commit()
    db.refresh(movie)
    return movie
