"""Recommendation business logic: scoring, querying, and user preference extraction"""
import random
from typing import Optional, List, Dict, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta

from app.models import Movie, User, Collection, Rating
from app.schemas import MovieListItem, RecommendationRow, HomeRecommendations
from app.schemas.recommendation import (
    RecommendationTag,
    HybridMovieItem,
    HybridRecommendationRow,
)

# --- Hybrid scoring weights ---
WEIGHT_MBTI = 0.30
WEIGHT_WEATHER = 0.20
WEIGHT_MOOD = 0.20
WEIGHT_PERSONAL = 0.30

WEIGHT_MBTI_NO_MOOD = 0.35
WEIGHT_WEATHER_NO_MOOD = 0.25
WEIGHT_PERSONAL_NO_MOOD = 0.40

# --- Mapping tables ---
# DB 키 (9대 감성 클러스터): healing, tension, energy, romance, deep, fantasy, light, melancholy, void
MOOD_EMOTION_MAPPING = {
    "comfortable": ["healing"],
    "tense": ["tension"],
    "exciting": ["energy"],
    "emotional": ["romance", "melancholy"],
    "fantasy": ["fantasy"],
    "light": ["light"],
}

MOOD_LABELS = {
    "comfortable": "#편안한",
    "tense": "#긴장감",
    "exciting": "#신나는",
    "emotional": "#감성적",
    "fantasy": "#상상에빠지고싶은",
    "light": "#가볍게",
}

MOOD_SECTION_CONFIG = {
    "comfortable": {"title": "😌 편안한 기분일 때", "desc": "마음이 따뜻해지는 영화"},
    "tense": {"title": "😰 긴장감이 필요할 때", "desc": "손에 땀을 쥐게 하는 영화"},
    "exciting": {"title": "😆 신나는 기분일 때", "desc": "에너지 넘치는 영화"},
    "emotional": {"title": "💕 감성에 젖고 싶을 때", "desc": "감정을 울리는 영화"},
    "fantasy": {"title": "🔮 상상에 빠지고 싶을 때", "desc": "상상력을 자극하는 영화"},
    "light": {"title": "😄 가볍게 보고 싶을 때", "desc": "부담 없이 즐기는 영화"},
}

WEATHER_LABELS = {
    "sunny": "#맑은날",
    "rainy": "#비오는날",
    "cloudy": "#흐린날",
    "snowy": "#눈오는날",
}

WEATHER_TITLES = {
    "sunny": "☀️ 맑은 날 추천",
    "rainy": "🌧️ 비 오는 날 추천",
    "cloudy": "☁️ 흐린 날 추천",
    "snowy": "❄️ 눈 오는 날 추천",
}

OPPOSITE_MBTI = {
    "INTJ": "ESFP", "ESFP": "INTJ",
    "INTP": "ESFJ", "ESFJ": "INTP",
    "ENTJ": "ISFP", "ISFP": "ENTJ",
    "ENTP": "ISFJ", "ISFJ": "ENTP",
    "INFJ": "ESTP", "ESTP": "INFJ",
    "INFP": "ESTJ", "ESTJ": "INFP",
    "ENFJ": "ISTP", "ISTP": "ENFJ",
    "ENFP": "ISTJ", "ISTJ": "ENFP",
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
    llm_min_ratio: float = 0.3,
) -> List[Movie]:
    """
    Get movies sorted by a specific score with optional shuffling.
    Ensures minimum ratio of LLM-analyzed movies for quality.
    Quality filter: vote_count >= min_votes AND vote_average >= min_rating
    """
    llm_ids = get_llm_movie_ids(db)
    extended_pool = pool_size * 2

    result = db.execute(text(f"""
        SELECT id, ({score_type}->>:score_key)::float as score FROM movies
        WHERE vote_count >= :min_votes
        AND vote_average >= :min_rating
        AND {score_type} IS NOT NULL
        AND {score_type}->>:score_key IS NOT NULL
        ORDER BY ({score_type}->>:score_key)::float DESC
        LIMIT :pool_size
    """), {
        "score_key": score_key,
        "pool_size": extended_pool,
        "min_votes": min_votes,
        "min_rating": min_rating,
    }).fetchall()

    if not result:
        return []

    llm_movies = [(row[0], row[1]) for row in result if row[0] in llm_ids]
    kw_movies = [(row[0], row[1]) for row in result if row[0] not in llm_ids]

    min_llm_count = int(pool_size * llm_min_ratio)
    selected_ids = []

    llm_to_take = min(min_llm_count, len(llm_movies))
    selected_ids.extend([m[0] for m in llm_movies[:llm_to_take]])

    remaining = pool_size - len(selected_ids)
    all_remaining = [(m[0], m[1]) for m in llm_movies[llm_to_take:]] + kw_movies
    all_remaining.sort(key=lambda x: x[1], reverse=True)
    selected_ids.extend([m[0] for m in all_remaining[:remaining]])

    if not selected_ids:
        return []

    movies = db.query(Movie).filter(Movie.id.in_(selected_ids)).all()
    movie_dict = {m.id: m for m in movies}

    def get_score(mid: int) -> float:
        m = movie_dict.get(mid)
        if m and m.emotion_tags and score_type == "emotion_tags":
            return m.emotion_tags.get(score_key, 0)
        return 0

    selected_ids.sort(key=get_score, reverse=True)
    ordered_movies = [movie_dict[mid] for mid in selected_ids if mid in movie_dict]

    if shuffle and len(ordered_movies) > limit:
        selected = random.sample(ordered_movies, limit)
        random.shuffle(selected)
        return selected

    return ordered_movies[:limit]


def get_user_preferences(
    db: Session,
    user: User,
) -> Tuple[set, Dict[str, int], set]:
    """
    Get user preferences from favorites and ratings.
    Returns: (favorited_ids, genre_counts, highly_rated_movie_ids)
    """
    favorited_ids: set = set()
    genre_counts: Dict[str, int] = {}
    highly_rated_ids: set = set()

    favorites = db.query(Collection).filter(
        Collection.user_id == user.id,
        Collection.name == "찜한 영화",
    ).first()

    if favorites and favorites.movies:
        for movie in favorites.movies:
            favorited_ids.add(movie.id)
            for genre in movie.genres:
                genre_name = genre.name if hasattr(genre, "name") else str(genre)
                genre_counts[genre_name] = genre_counts.get(genre_name, 0) + 1

    recent_date = datetime.utcnow() - timedelta(days=90)
    high_ratings = db.query(Rating).filter(
        Rating.user_id == user.id,
        Rating.score >= 4.0,
        Rating.created_at >= recent_date,
    ).all()

    for rating in high_ratings:
        highly_rated_ids.add(rating.movie_id)
        movie = db.query(Movie).filter(Movie.id == rating.movie_id).first()
        if movie:
            for genre in movie.genres:
                genre_name = genre.name if hasattr(genre, "name") else str(genre)
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
        {"movie_ids": list(movie_ids), "limit": limit},
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
    mood: Optional[str] = None,
) -> List[Tuple[Movie, float, List[RecommendationTag]]]:
    """
    Calculate hybrid scores for movies.
    With mood:    (0.30 × MBTI) + (0.20 × Weather) + (0.20 × Mood) + (0.30 × Personal)
    Without mood: (0.35 × MBTI) + (0.25 × Weather) + (0.40 × Personal)
    """
    scored_movies = []
    top_genres = sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)[:3] if genre_counts else []
    top_genre_names = {g[0] for g in top_genres}

    use_mood = mood is not None and mood in MOOD_EMOTION_MAPPING
    if use_mood:
        w_mbti, w_weather, w_mood, w_personal = WEIGHT_MBTI, WEIGHT_WEATHER, WEIGHT_MOOD, WEIGHT_PERSONAL
    else:
        w_mbti, w_weather, w_mood, w_personal = WEIGHT_MBTI_NO_MOOD, WEIGHT_WEATHER_NO_MOOD, 0.0, WEIGHT_PERSONAL_NO_MOOD

    for movie in movies:
        tags: List[RecommendationTag] = []
        mbti_score = 0.0
        weather_score = 0.0
        mood_score = 0.0
        personal_score = 0.0

        # 1. MBTI Score
        if mbti and movie.mbti_scores:
            mbti_val = movie.mbti_scores.get(mbti, 0.0)
            mbti_score = float(mbti_val) if mbti_val else 0.0
            if mbti_score > 0.5:
                tags.append(RecommendationTag(type="mbti", label=f"#{mbti}추천", score=mbti_score))

        # 2. Weather Score
        if weather and movie.weather_scores:
            weather_val = movie.weather_scores.get(weather, 0.0)
            weather_score = float(weather_val) if weather_val else 0.0
            if weather_score > 0.5:
                tags.append(RecommendationTag(
                    type="weather",
                    label=WEATHER_LABELS.get(weather, f"#{weather}"),
                    score=weather_score,
                ))

        # 3. Mood Score (emotion_tags 기반)
        if use_mood and movie.emotion_tags:
            emotion_keys = MOOD_EMOTION_MAPPING.get(mood, [])  # type: ignore[arg-type]
            if emotion_keys:
                emotion_values = [
                    float(movie.emotion_tags[k])
                    for k in emotion_keys
                    if movie.emotion_tags.get(k)
                ]
                if emotion_values:
                    mood_score = sum(emotion_values) / len(emotion_values)
                    if mood_score > 0.3:
                        tags.append(RecommendationTag(
                            type="mood",
                            label=MOOD_LABELS.get(mood, f"#{mood}"),  # type: ignore[arg-type]
                            score=mood_score,
                        ))

        # 4. Personal Score
        movie_genre_names = {g.name for g in movie.genres}
        matching_genres = movie_genre_names & top_genre_names
        if matching_genres:
            genre_bonus = len(matching_genres) * 0.3
            personal_score += min(genre_bonus, 0.9)
            if len(matching_genres) >= 2:
                tags.append(RecommendationTag(type="personal", label="#취향저격", score=personal_score))

        if movie.id in similar_ids:
            personal_score += 0.4
            if not any(t.label == "#취향저격" for t in tags):
                tags.append(RecommendationTag(type="personal", label="#비슷한영화", score=0.4))

        if movie.vote_average >= 8.0 and movie.vote_count >= 100:
            personal_score += 0.2
            tags.append(RecommendationTag(type="rating", label="#명작", score=0.2))
        elif movie.vote_average >= 7.5 and movie.vote_count >= 50:
            personal_score += 0.1

        hybrid_score = (
            (w_mbti * mbti_score)
            + (w_weather * weather_score)
            + (w_mood * mood_score)
            + (w_personal * personal_score)
        )

        if movie.popularity > 100:
            hybrid_score += 0.05

        hybrid_score = min(max(hybrid_score, 0.0), 1.0)
        scored_movies.append((movie, hybrid_score, tags))

    scored_movies.sort(key=lambda x: x[1], reverse=True)
    return scored_movies


def build_home_recommendations(
    db: Session,
    current_user: Optional[User],
    weather: Optional[str],
    mood: Optional[str],
) -> HomeRecommendations:
    """
    Build full home page recommendation response.
    로그인 시: 하이브리드 큐레이션 + MBTI/날씨/기분/인기/평점 섹션
    비로그인 시: 인기/평점/날씨/기분 섹션
    """
    from sqlalchemy import desc  # avoid circular at module level

    rows = []
    mbti = current_user.mbti if current_user else None
    hybrid_row = None

    favorited_ids: set = set()
    genre_counts: Dict[str, int] = {}
    similar_ids: set = set()

    if current_user:
        favorited_ids, genre_counts, highly_rated_ids = get_user_preferences(db, current_user)
        similar_ids = get_similar_movie_ids(db, favorited_ids | highly_rated_ids)

    # === HYBRID RECOMMENDATION ROW ===
    if current_user and (mbti or weather or mood or genre_counts):
        candidate_movies = db.query(Movie).filter(
            Movie.vote_count >= 30,
            ~Movie.id.in_(favorited_ids),
        ).order_by(desc(Movie.popularity)).limit(200).all()

        scored = calculate_hybrid_scores(
            db, candidate_movies, mbti, weather,
            genre_counts, favorited_ids, similar_ids, mood,
        )
        top_recs = scored[:40]

        if top_recs:
            hybrid_row = HybridRecommendationRow(
                title="✨ 오늘의 맞춤 추천",
                description="MBTI, 날씨, 기분을 모두 고려한 나만의 추천이에요",
                movies=[HybridMovieItem.from_movie_with_tags(m, tags, score) for m, score, tags in top_recs],
            )

    # === REGULAR RECOMMENDATION ROWS ===
    mbti_row = None
    if mbti:
        mbti_movies = get_movies_by_score(db, "mbti_scores", mbti, limit=50, pool_size=100)
        if mbti_movies:
            mbti_row = RecommendationRow(
                title="🎭 MBTI 추천",
                description=f"{mbti} 유형에게 딱 맞는 영화를 골랐어요",
                movies=[MovieListItem.from_orm_with_genres(m) for m in mbti_movies],
            )

    opposite_mbti = OPPOSITE_MBTI.get(mbti, "ENFP") if mbti else "ENFP"
    opposite_mbti_movies = get_movies_by_score(db, "mbti_scores", opposite_mbti, limit=50, pool_size=100)
    opposite_mbti_row = None
    if opposite_mbti_movies:
        opposite_desc = (
            f"나와 완전히 다른 {opposite_mbti} 유형의 영화, 색다른 경험이 될 거예요"
            if mbti else
            "나와 다른 시각으로 세상을 보는 영화들이에요"
        )
        opposite_mbti_row = RecommendationRow(
            title="🔀 정반대 MBTI 추천",
            description=opposite_desc,
            movies=[MovieListItem.from_orm_with_genres(m) for m in opposite_mbti_movies],
        )

    weather_row = None
    if weather:
        weather_movies = get_movies_by_score(db, "weather_scores", weather, limit=50, pool_size=100)
        if weather_movies:
            weather_row = RecommendationRow(
                title="🌤️ MBTI + 오늘 날씨",
                description="내 성격과 지금 날씨를 함께 고려했어요",
                movies=[MovieListItem.from_orm_with_genres(m) for m in weather_movies],
            )

    current_mood = mood if mood else "tense"
    primary_emotion = MOOD_EMOTION_MAPPING.get(current_mood, ["tension"])[0]
    mood_movies = get_movies_by_score(db, "emotion_tags", primary_emotion, limit=50, pool_size=100)
    mood_row = None
    if mood_movies:
        mood_row = RecommendationRow(
            title="💫 MBTI + 지금 기분",
            description="내 성격과 현재 기분에 어울리는 영화예요",
            movies=[MovieListItem.from_orm_with_genres(m) for m in mood_movies],
        )

    popular_pool = db.query(Movie).filter(
        Movie.vote_count >= 30, Movie.vote_average >= 5.0,
    ).order_by(Movie.popularity.desc()).limit(100).all()
    popular = random.sample(popular_pool, min(50, len(popular_pool))) if popular_pool else []
    random.shuffle(popular)
    popular_row = RecommendationRow(
        title="🔥 지금 인기 영화", description="요즘 가장 많은 사람들이 보고 있는 영화예요",
        movies=[MovieListItem.from_orm_with_genres(m) for m in popular],
    )

    top_rated_pool = db.query(Movie).filter(
        Movie.vote_count >= 100, Movie.vote_average >= 5.0,
    ).order_by(Movie.vote_average.desc()).limit(100).all()
    top_rated = random.sample(top_rated_pool, min(50, len(top_rated_pool))) if top_rated_pool else []
    random.shuffle(top_rated)
    top_rated_row = RecommendationRow(
        title="⭐ 높은 평점 영화", description="오랜 시간 사랑받아온 명작들이에요",
        movies=[MovieListItem.from_orm_with_genres(m) for m in top_rated],
    )

    if current_user:
        rows = [r for r in [mbti_row, opposite_mbti_row, weather_row, mood_row] if r] + [popular_row, top_rated_row]
    else:
        rows = [popular_row, top_rated_row] + [r for r in [weather_row, mood_row] if r] + [r for r in [opposite_mbti_row] if r]

    featured = popular[0] if popular else None
    return HomeRecommendations(
        featured=MovieListItem.from_orm_with_genres(featured) if featured else None,
        rows=rows,
        hybrid_row=hybrid_row,
    )
