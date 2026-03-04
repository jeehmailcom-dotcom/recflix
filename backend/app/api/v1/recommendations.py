"""
Recommendation API endpoints
Hybrid recommendation engine combining MBTI, Weather, and Personal preferences
"""
from typing import Optional, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.deps import get_db, get_current_user_optional, get_current_user
from app.models import Movie, User, Collection, Genre
from app.schemas import MovieListItem, HomeRecommendations
from app.schemas.recommendation import HybridMovieItem
from app.services.recommendation import (
    get_movies_by_score,
    get_user_preferences,
    get_similar_movie_ids,
    calculate_hybrid_scores,
    build_home_recommendations,
    build_weather_page_recommendations,
    build_mood_page_recommendations,
)

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


@router.get("", response_model=HomeRecommendations)
def get_home_recommendations(
    weather: Optional[str] = Query(None, pattern="^(sunny|rainy|cloudy|snowy)$"),
    mood: Optional[str] = Query(None, pattern="^(comfortable|tense|exciting|emotional|fantasy|light)$"),
    mbti: Optional[str] = Query(None, pattern="^(INTJ|INTP|ENTJ|ENTP|INFJ|INFP|ENFJ|ENFP|ISTJ|ISFJ|ESTJ|ESFJ|ISTP|ISFP|ESTP|ESFP)$"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Get home page recommendations with hybrid scoring"""
    return build_home_recommendations(db, current_user, weather, mood, mbti_override=mbti)


@router.get("/mood-page", response_model=HomeRecommendations)
def get_mood_page_recommendations(
    mood: str = Query("tense", pattern="^(comfortable|tense|exciting|emotional|fantasy|light)$"),
    weather: str = Query("sunny", pattern="^(sunny|rainy|cloudy|snowy)$"),
    mbti: Optional[str] = Query(None, pattern="^(INTJ|INTP|ENTJ|ENTP|INFJ|INFP|ENFJ|ENFP|ISTJ|ISFJ|ESTJ|ESFJ|ISTP|ISFP|ESTP|ESFP)$"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """무드 페이지 전용 추천 (기분·다음기분·기분+MBTI·기분+날씨 섹션)"""
    return build_mood_page_recommendations(db, current_user, mood, weather, mbti_override=mbti)


@router.get("/weather-page", response_model=HomeRecommendations)
def get_weather_page_recommendations(
    weather: str = Query("sunny", pattern="^(sunny|rainy|cloudy|snowy)$"),
    mood: Optional[str] = Query(None, pattern="^(comfortable|tense|exciting|emotional|fantasy|light)$"),
    mbti: Optional[str] = Query(None, pattern="^(INTJ|INTP|ENTJ|ENTP|INFJ|INFP|ENFJ|ENFP|ISTJ|ISFJ|ESTJ|ESFJ|ISTP|ISFP|ESTP|ESFP)$"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """날씨 페이지 전용 추천 (날씨·반대날씨·날씨+MBTI·날씨+기분 섹션)"""
    return build_weather_page_recommendations(db, current_user, weather, mood, mbti_override=mbti)


@router.get("/hybrid", response_model=List[HybridMovieItem])
def get_hybrid_recommendations(
    weather: Optional[str] = Query(None, pattern="^(sunny|rainy|cloudy|snowy)$"),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get hybrid recommendations with full scoring.
    Score = (0.35 × MBTI) + (0.25 × Weather) + (0.40 × Personal)
    """
    mbti = current_user.mbti
    favorited_ids, genre_counts, highly_rated_ids = get_user_preferences(db, current_user)
    user_movie_ids = favorited_ids | highly_rated_ids
    similar_ids = get_similar_movie_ids(db, user_movie_ids)

    candidate_movies = db.query(Movie).filter(
        Movie.vote_count >= 30,
        Movie.vote_average >= 5.0,
        ~Movie.id.in_(favorited_ids),
    ).order_by(desc(Movie.popularity)).limit(300).all()

    scored = calculate_hybrid_scores(
        db, candidate_movies, mbti, weather,
        genre_counts, favorited_ids, similar_ids,
    )

    top_movies = scored[:limit]
    return [
        HybridMovieItem.from_movie_with_tags(m, tags, score)
        for m, score, tags in top_movies
    ]


@router.get("/weather", response_model=List[MovieListItem])
def get_weather_recommendations(
    weather: str = Query(..., pattern="^(sunny|rainy|cloudy|snowy)$"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Get weather-based recommendations"""
    movies = get_movies_by_score(db, "weather_scores", weather, limit=limit)
    return [MovieListItem.from_orm_with_genres(m) for m in movies]


@router.get("/mbti", response_model=List[MovieListItem])
def get_mbti_recommendations(
    mbti: str = Query(..., pattern="^[EI][NS][TF][JP]$"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Get MBTI-based recommendations"""
    movies = get_movies_by_score(db, "mbti_scores", mbti, limit=limit)
    return [MovieListItem.from_orm_with_genres(m) for m in movies]


@router.get("/emotion", response_model=List[MovieListItem])
def get_emotion_recommendations(
    emotion: str = Query(..., pattern="^(healing|tension|energy|romance|deep|fantasy|light|melancholy|void)$"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Get emotion-based recommendations (9 clusters)"""
    movies = get_movies_by_score(db, "emotion_tags", emotion, limit=limit)
    return [MovieListItem.from_orm_with_genres(m) for m in movies]


@router.get("/popular", response_model=List[MovieListItem])
def get_popular_movies(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Get popular movies (quality filter: vote_count >= 30, vote_average >= 5.0)"""
    movies = db.query(Movie).filter(
        Movie.vote_count >= 30,
        Movie.vote_average >= 5.0,
    ).order_by(Movie.popularity.desc()).limit(limit).all()
    return [MovieListItem.from_orm_with_genres(m) for m in movies]


@router.get("/top-rated", response_model=List[MovieListItem])
def get_top_rated_movies(
    limit: int = Query(20, ge=1, le=100),
    min_votes: int = Query(100, ge=1),
    db: Session = Depends(get_db),
):
    """Get top rated movies"""
    movies = db.query(Movie).filter(
        Movie.vote_count >= min_votes,
    ).order_by(Movie.vote_average.desc()).limit(limit).all()
    return [MovieListItem.from_orm_with_genres(m) for m in movies]


@router.get("/for-you", response_model=List[MovieListItem])
def get_personalized_recommendations(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    찜한 영화 기반 개인화 추천
    - 찜한 영화들의 장르 분석
    - 해당 장르의 인기 영화 중 아직 안 본 영화 추천
    """
    favorites = db.query(Collection).filter(
        Collection.user_id == current_user.id,
        Collection.name == "찜한 영화",
    ).first()

    if not favorites or not favorites.movies:
        movies = db.query(Movie).filter(
            Movie.vote_count >= 30,
            Movie.vote_average >= 5.0,
        ).order_by(Movie.popularity.desc()).limit(limit).all()
        return [MovieListItem.from_orm_with_genres(m) for m in movies]

    genre_counts: dict[str, int] = {}
    favorited_ids: set = set()

    for movie in favorites.movies:
        favorited_ids.add(movie.id)
        for genre in movie.genres:
            genre_name = genre.name if hasattr(genre, "name") else str(genre)
            genre_counts[genre_name] = genre_counts.get(genre_name, 0) + 1

    if not genre_counts:
        movies = db.query(Movie).filter(
            Movie.vote_count >= 30,
            Movie.vote_average >= 5.0,
        ).order_by(Movie.popularity.desc()).limit(limit).all()
        return [MovieListItem.from_orm_with_genres(m) for m in movies]

    top_genres = sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)[:3]
    top_genre_names = [g[0] for g in top_genres]

    movies = db.query(Movie).join(Movie.genres).filter(
        Genre.name.in_(top_genre_names),
        Movie.vote_count >= 30,
        Movie.vote_average >= 5.0,
        ~Movie.id.in_(favorited_ids),
    ).order_by(Movie.popularity.desc()).limit(limit * 2).all()

    seen: set = set()
    result = []
    for m in movies:
        if m.id not in seen:
            seen.add(m.id)
            result.append(m)
            if len(result) >= limit:
                break

    return [MovieListItem.from_orm_with_genres(m) for m in result]
