"""
Recommendation API endpoints
Hybrid recommendation engine combining MBTI, Weather, and Personal preferences
"""
import random
from typing import Optional, List, Dict, Tuple
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, desc
from datetime import datetime, timedelta

from app.core.deps import get_db, get_current_user_optional, get_current_user
from app.models import Movie, User, Collection, Genre, Rating
from app.models.movie import similar_movies
from app.schemas import MovieListItem, RecommendationRow, HomeRecommendations
from app.schemas.recommendation import (
    HybridMovieItem, HybridRecommendationRow, RecommendationTag
)

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

# Hybrid scoring weights (with mood)
WEIGHT_MBTI = 0.30
WEIGHT_WEATHER = 0.20
WEIGHT_MOOD = 0.20
WEIGHT_PERSONAL = 0.30

# Hybrid scoring weights (without mood - legacy)
WEIGHT_MBTI_NO_MOOD = 0.35
WEIGHT_WEATHER_NO_MOOD = 0.25
WEIGHT_PERSONAL_NO_MOOD = 0.40

# Mood to emotion_tags mapping
# DB 키 (7대 감성 클러스터): healing, tension, energy, romance, deep, fantasy, light
MOOD_EMOTION_MAPPING = {
    "relaxed": ["healing"],           # 편안한 → 힐링 (가족애/우정/성장/힐링)
    "tense": ["tension"],             # 긴장감 → 긴장감 (반전/추리/서스펜스/심리전)
    "excited": ["energy"],            # 신나는 → 에너지 (폭발/추격전/복수/히어로)
    "emotional": ["romance", "deep"], # 감성적인 → 로맨스+깊이 (첫사랑/이별 + 인생/철학)
    "imaginative": ["fantasy"],       # 상상력 → 판타지 (마법/우주/초능력/타임루프)
    "light": ["light"],               # 가벼운 → 라이트 (유머/일상/친구/패러디)
}

# Mood label mapping
MOOD_LABELS = {
    "relaxed": "#편안한",
    "tense": "#긴장감",
    "excited": "#신나는",
    "emotional": "#감성적인",
    "imaginative": "#상상력",
    "light": "#가벼운",
}

# Mood section titles and descriptions
MOOD_SECTION_CONFIG = {
    "relaxed": {"title": "😌 편안한 기분일 때", "desc": "마음이 따뜻해지는 영화"},
    "tense": {"title": "😰 긴장감이 필요할 때", "desc": "손에 땀을 쥐게 하는 영화"},
    "excited": {"title": "😆 신나는 기분일 때", "desc": "에너지 넘치는 영화"},
    "emotional": {"title": "💕 감성적인 기분일 때", "desc": "감동이 밀려오는 영화"},
    "imaginative": {"title": "🔮 상상에 빠지고 싶을 때", "desc": "판타지 세계로 떠나는 영화"},
    "light": {"title": "😄 가볍게 보고 싶을 때", "desc": "부담 없이 즐기는 영화"},
}

# Weather label mapping
WEATHER_LABELS = {
    "sunny": "#맑은날",
    "rainy": "#비오는날",
    "cloudy": "#흐린날",
    "snowy": "#눈오는날"
}

WEATHER_TITLES = {
    "sunny": "☀️ 맑은 날 추천",
    "rainy": "🌧️ 비 오는 날 추천",
    "cloudy": "☁️ 흐린 날 추천",
    "snowy": "❄️ 눈 오는 날 추천"
}


def get_llm_movie_ids(db: Session) -> set:
    """Get IDs of LLM-processed movies (top 1000 by popularity)"""
    result = db.execute(text("""
        SELECT id FROM movies
        WHERE vote_count >= 50
        ORDER BY popularity DESC
        LIMIT 1000
    """)).fetchall()
    return set(row[0] for row in result)


def get_movies_by_score(
    db: Session,
    score_type: str,
    score_key: str,
    limit: int = 10,
    pool_size: int = 40,
    min_votes: int = 30,
    min_rating: float = 5.0,
    shuffle: bool = True,
    llm_min_ratio: float = 0.3  # Minimum 30% LLM movies
) -> List[Movie]:
    """
    Get movies sorted by a specific score with optional shuffling.
    Ensures minimum ratio of LLM-analyzed movies for quality.
    Quality filter: vote_count >= min_votes AND vote_average >= min_rating
    """
    # Get LLM movie IDs for mixing
    llm_ids = get_llm_movie_ids(db)

    # Fetch more movies to ensure we can meet LLM ratio
    extended_pool = pool_size * 2

    result = db.execute(text(f"""
        SELECT id, ({score_type}->>:score_key)::float as score FROM movies
        WHERE vote_count >= :min_votes
        AND vote_average >= :min_rating
        AND {score_type} IS NOT NULL
        AND {score_type}->>:score_key IS NOT NULL
        ORDER BY ({score_type}->>:score_key)::float DESC
        LIMIT :pool_size
    """), {"score_key": score_key, "pool_size": extended_pool, "min_votes": min_votes, "min_rating": min_rating}).fetchall()

    if not result:
        return []

    # Separate LLM and keyword movies
    llm_movies = [(row[0], row[1]) for row in result if row[0] in llm_ids]
    kw_movies = [(row[0], row[1]) for row in result if row[0] not in llm_ids]

    # Calculate minimum LLM count needed
    min_llm_count = int(pool_size * llm_min_ratio)

    # Build final selection with LLM guarantee
    selected_ids = []

    # First, take top LLM movies up to min_llm_count
    llm_to_take = min(min_llm_count, len(llm_movies))
    selected_ids.extend([m[0] for m in llm_movies[:llm_to_take]])

    # Fill remaining with best overall scores (excluding already selected)
    remaining = pool_size - len(selected_ids)
    all_remaining = [(m[0], m[1]) for m in llm_movies[llm_to_take:]] + kw_movies
    all_remaining.sort(key=lambda x: x[1], reverse=True)
    selected_ids.extend([m[0] for m in all_remaining[:remaining]])

    if not selected_ids:
        return []

    movies = db.query(Movie).filter(Movie.id.in_(selected_ids)).all()
    movie_dict = {m.id: m for m in movies}

    # Sort by score for final ordering
    def get_score(mid):
        m = movie_dict.get(mid)
        if m and m.emotion_tags:
            return m.emotion_tags.get(score_key, 0) if score_type == 'emotion_tags' else 0
        return 0

    selected_ids.sort(key=get_score, reverse=True)
    ordered_movies = [movie_dict[mid] for mid in selected_ids if mid in movie_dict]

    # Shuffle and limit
    if shuffle and len(ordered_movies) > limit:
        selected = random.sample(ordered_movies, limit)
        random.shuffle(selected)
        return selected

    return ordered_movies[:limit]


def get_user_preferences(
    db: Session,
    user: User
) -> Tuple[set, Dict[str, int], set]:
    """
    Get user preferences from favorites and ratings
    Returns: (favorited_ids, genre_counts, highly_rated_movie_ids)
    """
    favorited_ids = set()
    genre_counts: Dict[str, int] = {}
    highly_rated_ids = set()

    # Get favorites
    favorites = db.query(Collection).filter(
        Collection.user_id == user.id,
        Collection.name == "찜한 영화"
    ).first()

    if favorites and favorites.movies:
        for movie in favorites.movies:
            favorited_ids.add(movie.id)
            for genre in movie.genres:
                genre_name = genre.name if hasattr(genre, 'name') else str(genre)
                genre_counts[genre_name] = genre_counts.get(genre_name, 0) + 1

    # Get highly rated movies (score >= 4.0) from last 90 days
    recent_date = datetime.utcnow() - timedelta(days=90)
    high_ratings = db.query(Rating).filter(
        Rating.user_id == user.id,
        Rating.score >= 4.0,
        Rating.created_at >= recent_date
    ).all()

    for rating in high_ratings:
        highly_rated_ids.add(rating.movie_id)
        # Also count genres from highly rated movies (weighted more)
        movie = db.query(Movie).filter(Movie.id == rating.movie_id).first()
        if movie:
            for genre in movie.genres:
                genre_name = genre.name if hasattr(genre, 'name') else str(genre)
                genre_counts[genre_name] = genre_counts.get(genre_name, 0) + 2  # Double weight

    return favorited_ids, genre_counts, highly_rated_ids


def get_similar_movie_ids(db: Session, movie_ids: set, limit: int = 50) -> set:
    """Get IDs of movies similar to the given movie IDs"""
    if not movie_ids:
        return set()

    result = db.execute(
        text("""
            SELECT DISTINCT similar_movie_id
            FROM similar_movies
            WHERE movie_id = ANY(:movie_ids)
            LIMIT :limit
        """),
        {"movie_ids": list(movie_ids), "limit": limit}
    ).fetchall()

    return {row[0] for row in result}


def calculate_hybrid_scores(
    db: Session,
    movies: List[Movie],
    mbti: Optional[str],
    weather: Optional[str],
    genre_counts: Dict[str, int],
    favorited_ids: set,
    similar_ids: set,
    mood: Optional[str] = None
) -> List[Tuple[Movie, float, List[RecommendationTag]]]:
    """
    Calculate hybrid scores for movies
    With mood: (0.30 × MBTI) + (0.20 × Weather) + (0.20 × Mood) + (0.30 × Personal)
    Without mood: (0.35 × MBTI) + (0.25 × Weather) + (0.40 × Personal)
    """
    scored_movies = []
    top_genres = sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)[:3] if genre_counts else []
    top_genre_names = {g[0] for g in top_genres}

    # 가중치 선택 (mood 유무에 따라)
    use_mood = mood is not None and mood in MOOD_EMOTION_MAPPING
    if use_mood:
        w_mbti, w_weather, w_mood, w_personal = WEIGHT_MBTI, WEIGHT_WEATHER, WEIGHT_MOOD, WEIGHT_PERSONAL
    else:
        w_mbti, w_weather, w_mood, w_personal = WEIGHT_MBTI_NO_MOOD, WEIGHT_WEATHER_NO_MOOD, 0.0, WEIGHT_PERSONAL_NO_MOOD

    for movie in movies:
        tags = []
        mbti_score = 0.0
        weather_score = 0.0
        mood_score = 0.0
        personal_score = 0.0

        # 1. MBTI Score
        if mbti and movie.mbti_scores:
            mbti_val = movie.mbti_scores.get(mbti, 0.0)
            mbti_score = float(mbti_val) if mbti_val else 0.0
            if mbti_score > 0.5:
                tags.append(RecommendationTag(
                    type="mbti",
                    label=f"#{mbti}추천",
                    score=mbti_score
                ))

        # 2. Weather Score
        if weather and movie.weather_scores:
            weather_val = movie.weather_scores.get(weather, 0.0)
            weather_score = float(weather_val) if weather_val else 0.0
            if weather_score > 0.5:
                tags.append(RecommendationTag(
                    type="weather",
                    label=WEATHER_LABELS.get(weather, f"#{weather}"),
                    score=weather_score
                ))

        # 3. Mood Score (emotion_tags 기반)
        if use_mood and movie.emotion_tags:
            emotion_keys = MOOD_EMOTION_MAPPING.get(mood, [])
            if emotion_keys:
                emotion_values = []
                for key in emotion_keys:
                    val = movie.emotion_tags.get(key, 0.0)
                    if val:
                        emotion_values.append(float(val))
                if emotion_values:
                    mood_score = sum(emotion_values) / len(emotion_values)  # 평균
                    if mood_score > 0.5:
                        tags.append(RecommendationTag(
                            type="personal",
                            label=MOOD_LABELS.get(mood, f"#{mood}"),
                            score=mood_score
                        ))

        # 4. Personal Score
        movie_genre_names = {g.name for g in movie.genres}

        # Genre match bonus
        matching_genres = movie_genre_names & top_genre_names
        if matching_genres:
            genre_bonus = len(matching_genres) * 0.3
            personal_score += min(genre_bonus, 0.9)  # Cap at 0.9
            if len(matching_genres) >= 2:
                tags.append(RecommendationTag(
                    type="personal",
                    label="#취향저격",
                    score=personal_score
                ))

        # Similar movie bonus
        if movie.id in similar_ids:
            personal_score += 0.4
            if not any(t.label == "#취향저격" for t in tags):
                tags.append(RecommendationTag(
                    type="personal",
                    label="#비슷한영화",
                    score=0.4
                ))

        # High rating bonus (movie quality)
        if movie.vote_average >= 8.0 and movie.vote_count >= 100:
            personal_score += 0.2
            tags.append(RecommendationTag(
                type="rating",
                label="#명작",
                score=0.2
            ))
        elif movie.vote_average >= 7.5 and movie.vote_count >= 50:
            personal_score += 0.1

        # Calculate hybrid score (동적 가중치 사용)
        hybrid_score = (
            (w_mbti * mbti_score) +
            (w_weather * weather_score) +
            (w_mood * mood_score) +
            (w_personal * personal_score)
        )

        # Popularity boost (small)
        if movie.popularity > 100:
            hybrid_score += 0.05

        # Normalize to 0-1 range
        hybrid_score = min(max(hybrid_score, 0.0), 1.0)

        scored_movies.append((movie, hybrid_score, tags))

    # Sort by hybrid score descending
    scored_movies.sort(key=lambda x: x[1], reverse=True)
    return scored_movies


@router.get("", response_model=HomeRecommendations)
def get_home_recommendations(
    weather: Optional[str] = Query(None, pattern="^(sunny|rainy|cloudy|snowy)$"),
    mood: Optional[str] = Query(None, pattern="^(relaxed|tense|excited|emotional|imaginative|light)$"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Get home page recommendations with hybrid scoring"""
    rows = []
    mbti = current_user.mbti if current_user else None
    hybrid_row = None

    # Get user preferences if logged in
    favorited_ids = set()
    genre_counts: Dict[str, int] = {}
    similar_ids = set()

    if current_user:
        favorited_ids, genre_counts, highly_rated_ids = get_user_preferences(db, current_user)
        # Get similar movies to favorites and highly rated
        user_movie_ids = favorited_ids | highly_rated_ids
        similar_ids = get_similar_movie_ids(db, user_movie_ids)

    # === HYBRID RECOMMENDATION ROW (Main personalized) ===
    if current_user and (mbti or weather or mood or genre_counts):
        # Get candidate movies
        candidate_movies = db.query(Movie).filter(
            Movie.vote_count >= 30,
            ~Movie.id.in_(favorited_ids)  # Exclude already favorited
        ).order_by(desc(Movie.popularity)).limit(200).all()

        # Calculate hybrid scores
        scored = calculate_hybrid_scores(
            db, candidate_movies, mbti, weather,
            genre_counts, favorited_ids, similar_ids, mood
        )

        # Return top 40 for client-side shuffle (display 20)
        top_pool = scored[:60]
        top_recommendations = top_pool[:40]  # Send 40, frontend displays 20

        if top_recommendations:
            hybrid_movies = [
                HybridMovieItem.from_movie_with_tags(m, tags, score)
                for m, score, tags in top_recommendations
            ]

            # Build title
            title_parts = []
            if mbti:
                title_parts.append(f"{mbti}")
            if weather:
                weather_emoji = {"sunny": "☀️", "rainy": "🌧️", "cloudy": "☁️", "snowy": "❄️"}
                title_parts.append(weather_emoji.get(weather, ""))
            if mood:
                mood_emoji = {"relaxed": "😌", "tense": "😰", "excited": "😆", "emotional": "💕", "imaginative": "🔮", "light": "😄"}
                title_parts.append(mood_emoji.get(mood, ""))

            hybrid_title = "🎯 " + (" + ".join(title_parts) if title_parts else "당신을 위한") + " 맞춤 추천"

            # Build description
            desc_parts = []
            if mbti:
                desc_parts.append("MBTI")
            if weather:
                desc_parts.append("날씨")
            if mood:
                desc_parts.append("기분")
            desc_parts.append("취향")
            hybrid_desc = ", ".join(desc_parts) + "을 모두 고려한 추천"

            hybrid_row = HybridRecommendationRow(
                title=hybrid_title,
                description=hybrid_desc,
                movies=hybrid_movies
            )

    # === REGULAR RECOMMENDATION ROWS ===
    # 로그인 시 순서: ①MBTI추천 ②날씨별추천 ③기분별추천 ④인기영화 ⑤높은평점
    # 비로그인 시 순서: ①인기영화 ②높은평점 ③날씨별추천 ④기분별추천

    # --- 섹션 데이터 준비 ---

    # MBTI-based recommendations (로그인 + MBTI 설정 시)
    mbti_row = None
    if mbti:
        mbti_movies = get_movies_by_score(db, "mbti_scores", mbti, limit=50, pool_size=100)
        if mbti_movies:
            mbti_row = RecommendationRow(
                title=f"💜 {mbti} 성향 추천",
                description=f"{mbti} 유형에게 어울리는 영화",
                movies=[MovieListItem.from_orm_with_genres(m) for m in mbti_movies]
            )

    # Weather-based recommendations
    weather_row = None
    if weather:
        weather_movies = get_movies_by_score(db, "weather_scores", weather, limit=50, pool_size=100)
        if weather_movies:
            weather_row = RecommendationRow(
                title=WEATHER_TITLES.get(weather, f"{weather} 날씨 추천"),
                description=f"{weather} 날씨에 어울리는 영화",
                movies=[MovieListItem.from_orm_with_genres(m) for m in weather_movies]
            )

    # 기분별 추천 (동적) - 미선택 시 기본값 relaxed
    current_mood = mood if mood else "relaxed"
    mood_emotion_keys = MOOD_EMOTION_MAPPING.get(current_mood, ["healing"])
    primary_emotion = mood_emotion_keys[0]
    mood_movies = get_movies_by_score(db, "emotion_tags", primary_emotion, limit=50, pool_size=100)
    mood_row = None
    if mood_movies:
        mood_config = MOOD_SECTION_CONFIG.get(current_mood, {"title": "😌 편안한 기분일 때", "desc": "마음이 따뜻해지는 영화"})
        mood_row = RecommendationRow(
            title=mood_config["title"],
            description=mood_config["desc"],
            movies=[MovieListItem.from_orm_with_genres(m) for m in mood_movies]
        )

    # Popular movies (shuffle from top 100)
    popular_pool = db.query(Movie).filter(
        Movie.vote_count >= 30,
        Movie.vote_average >= 5.0
    ).order_by(Movie.popularity.desc()).limit(100).all()
    popular = random.sample(popular_pool, min(50, len(popular_pool))) if popular_pool else []
    random.shuffle(popular)
    popular_row = RecommendationRow(
        title="🔥 인기 영화",
        description="지금 가장 핫한 영화들",
        movies=[MovieListItem.from_orm_with_genres(m) for m in popular]
    )

    # Top rated (shuffle from top 100)
    top_rated_pool = db.query(Movie).filter(
        Movie.vote_count >= 100,
        Movie.vote_average >= 5.0
    ).order_by(Movie.vote_average.desc()).limit(100).all()
    top_rated = random.sample(top_rated_pool, min(50, len(top_rated_pool))) if top_rated_pool else []
    random.shuffle(top_rated)
    top_rated_row = RecommendationRow(
        title="⭐ 높은 평점 영화",
        description="평점이 높은 명작들",
        movies=[MovieListItem.from_orm_with_genres(m) for m in top_rated]
    )

    # --- 섹션 순서 결정 ---
    if current_user:
        # 로그인 시: 개인화 → 범용
        # ①MBTI ②날씨 ③기분 ④인기 ⑤높은평점
        if mbti_row:
            rows.append(mbti_row)
        if weather_row:
            rows.append(weather_row)
        if mood_row:
            rows.append(mood_row)
        rows.append(popular_row)
        rows.append(top_rated_row)
    else:
        # 비로그인 시: 범용 → 개인화
        # ①인기 ②높은평점 ③날씨 ④기분
        rows.append(popular_row)
        rows.append(top_rated_row)
        if weather_row:
            rows.append(weather_row)
        if mood_row:
            rows.append(mood_row)

    # Featured movie = 셔플된 인기 영화 리스트의 첫 번째 영화 (일관성 유지)
    featured = popular[0] if popular else None

    return HomeRecommendations(
        featured=MovieListItem.from_orm_with_genres(featured) if featured else None,
        rows=rows,
        hybrid_row=hybrid_row
    )


@router.get("/hybrid", response_model=List[HybridMovieItem])
def get_hybrid_recommendations(
    weather: Optional[str] = Query(None, pattern="^(sunny|rainy|cloudy|snowy)$"),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get hybrid recommendations with full scoring
    Score = (0.35 × MBTI) + (0.25 × Weather) + (0.40 × Personal)
    """
    mbti = current_user.mbti

    # Get user preferences
    favorited_ids, genre_counts, highly_rated_ids = get_user_preferences(db, current_user)
    user_movie_ids = favorited_ids | highly_rated_ids
    similar_ids = get_similar_movie_ids(db, user_movie_ids)

    # Get candidate movies (quality filter: vote_count >= 30, vote_average >= 5.0)
    candidate_movies = db.query(Movie).filter(
        Movie.vote_count >= 30,
        Movie.vote_average >= 5.0,
        ~Movie.id.in_(favorited_ids)
    ).order_by(desc(Movie.popularity)).limit(300).all()

    # Calculate hybrid scores
    scored = calculate_hybrid_scores(
        db, candidate_movies, mbti, weather,
        genre_counts, favorited_ids, similar_ids
    )

    # Return top results
    top_movies = scored[:limit]
    return [
        HybridMovieItem.from_movie_with_tags(m, tags, score)
        for m, score, tags in top_movies
    ]


@router.get("/weather", response_model=List[MovieListItem])
def get_weather_recommendations(
    weather: str = Query(..., pattern="^(sunny|rainy|cloudy|snowy)$"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get weather-based recommendations"""
    movies = get_movies_by_score(db, "weather_scores", weather, limit=limit)
    return [MovieListItem.from_orm_with_genres(m) for m in movies]


@router.get("/mbti", response_model=List[MovieListItem])
def get_mbti_recommendations(
    mbti: str = Query(..., pattern="^[EI][NS][TF][JP]$"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get MBTI-based recommendations"""
    movies = get_movies_by_score(db, "mbti_scores", mbti, limit=limit)
    return [MovieListItem.from_orm_with_genres(m) for m in movies]


@router.get("/emotion", response_model=List[MovieListItem])
def get_emotion_recommendations(
    emotion: str = Query(..., pattern="^(healing|tension|energy|romance|deep|fantasy|light)$"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get emotion-based recommendations (7 clusters)"""
    movies = get_movies_by_score(db, "emotion_tags", emotion, limit=limit)
    return [MovieListItem.from_orm_with_genres(m) for m in movies]


@router.get("/popular", response_model=List[MovieListItem])
def get_popular_movies(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get popular movies (quality filter: vote_count >= 30, vote_average >= 5.0)"""
    movies = db.query(Movie).filter(
        Movie.vote_count >= 30,
        Movie.vote_average >= 5.0
    ).order_by(Movie.popularity.desc()).limit(limit).all()
    return [MovieListItem.from_orm_with_genres(m) for m in movies]


@router.get("/top-rated", response_model=List[MovieListItem])
def get_top_rated_movies(
    limit: int = Query(20, ge=1, le=100),
    min_votes: int = Query(100, ge=1),
    db: Session = Depends(get_db)
):
    """Get top rated movies"""
    movies = db.query(Movie).filter(
        Movie.vote_count >= min_votes
    ).order_by(Movie.vote_average.desc()).limit(limit).all()
    return [MovieListItem.from_orm_with_genres(m) for m in movies]


@router.get("/for-you", response_model=List[MovieListItem])
def get_personalized_recommendations(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    찜한 영화 기반 개인화 추천
    - 찜한 영화들의 장르 분석
    - 해당 장르의 인기 영화 중 아직 안 본 영화 추천
    """
    # 찜 컬렉션 조회
    favorites = db.query(Collection).filter(
        Collection.user_id == current_user.id,
        Collection.name == "찜한 영화"
    ).first()

    if not favorites or not favorites.movies:
        # 찜한 영화 없으면 인기 영화 반환
        movies = db.query(Movie).filter(
            Movie.vote_count >= 30,
            Movie.vote_average >= 5.0
        ).order_by(Movie.popularity.desc()).limit(limit).all()
        return [MovieListItem.from_orm_with_genres(m) for m in movies]

    # 찜한 영화들의 장르 집계
    genre_counts: dict[str, int] = {}
    favorited_ids = set()

    for movie in favorites.movies:
        favorited_ids.add(movie.id)
        for genre in movie.genres:
            genre_name = genre.name if hasattr(genre, 'name') else str(genre)
            genre_counts[genre_name] = genre_counts.get(genre_name, 0) + 1

    if not genre_counts:
        movies = db.query(Movie).filter(
            Movie.vote_count >= 30,
            Movie.vote_average >= 5.0
        ).order_by(Movie.popularity.desc()).limit(limit).all()
        return [MovieListItem.from_orm_with_genres(m) for m in movies]

    # 상위 3개 장르
    top_genres = sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)[:3]
    top_genre_names = [g[0] for g in top_genres]

    # 해당 장르의 영화 중 찜하지 않은 인기 영화 추천 (품질 필터 적용)
    movies = db.query(Movie).join(Movie.genres).filter(
        Genre.name.in_(top_genre_names),
        Movie.vote_count >= 30,
        Movie.vote_average >= 5.0,
        ~Movie.id.in_(favorited_ids)
    ).order_by(Movie.popularity.desc()).limit(limit * 2).all()

    # 중복 제거 및 limit 적용
    seen = set()
    result = []
    for m in movies:
        if m.id not in seen:
            seen.add(m.id)
            result.append(m)
            if len(result) >= limit:
                break

    return [MovieListItem.from_orm_with_genres(m) for m in result]
