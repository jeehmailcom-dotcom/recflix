# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 레포지토리에서 작업할 때 참고하는 가이드입니다.

## 프로젝트 개요

RecFlix는 MBTI 성격 유형, 실시간 날씨, 기분(무드)을 결합한 개인화 영화 추천 플랫폼입니다. 42,917편의 영화 데이터베이스에서 하이브리드 스코어링 알고리즘으로 맞춤 추천을 제공합니다.

- **프론트엔드**: Next.js 14 (App Router), TypeScript, TailwindCSS, Zustand, Framer Motion
- **백엔드**: FastAPI (Python 3.11+), SQLAlchemy ORM, Redis 캐싱, JWT 인증
- **데이터베이스**: PostgreSQL 16 (JSONB 스코어 컬럼), Redis 7 (캐싱)
- **배포**: 프론트엔드 Vercel (region: icn1), 백엔드 + DB + Redis Railway

## 주요 명령어

루트 `Makefile`에서 실행 가능:

```bash
# 개발 환경
make docker-up          # PostgreSQL, Redis, pgAdmin 컨테이너 시작
make backend-run        # uvicorn app.main:app --reload (포트 8000)
make frontend-run       # next dev (.next 캐시 삭제 후 실행)

# 프론트엔드
cd frontend && npm run dev:fast   # .next 정리 없이 빠른 재시작
cd frontend && npm run build      # 프로덕션 빌드
cd frontend && npm run lint       # ESLint 검사

# 백엔드
cd backend && pytest tests/ -v              # 전체 테스트 실행
cd backend && pytest tests/test_foo.py -v   # 단일 테스트 파일 실행
cd backend && ruff check app/               # 린트 검사
cd backend && ruff format app/              # 코드 포맷팅

# 데이터베이스
make db-migrate                             # alembic upgrade head
make db-migrate-create msg="설명"           # 새 마이그레이션 생성
make db-seed                                # 영화 데이터 시딩
make db-reset                               # DB 초기화 (downgrade base + upgrade head)
```

## 아키텍처

### 백엔드 (`backend/app/`)

계층형 FastAPI 애플리케이션:

- **`api/v1/`** - 라우트 모듈 (auth, movies, recommendations, weather, users, ratings, interactions, collections, llm). `router.py`에서 `/api/v1` 프리픽스로 통합.
- **`models/`** - SQLAlchemy ORM 모델. `Movie` 모델의 JSONB 컬럼: `mbti_scores` (16개 유형), `weather_scores` (4개 날씨), `emotion_tags` (7개 감정 클러스터).
- **`schemas/`** - Pydantic 요청/응답 스키마.
- **`services/`** - 비즈니스 로직 (날씨 API + Redis 캐싱, Claude LLM 연동).
- **`core/`** - JWT 인증 (`core/auth.py`), 의존성 주입 (`core/deps.py`).
- **`config.py`** - `.env`에서 로드하는 Pydantic Settings. `@lru_cache`로 싱글톤 관리.
- **`database.py`** - SQLAlchemy 엔진 및 `SessionLocal` 팩토리. `get_db()` 의존성으로 요청 단위 세션 관리.

### 프론트엔드 (`frontend/`)

Next.js App Router 구조:

- **`app/`** - 페이지: 홈 (`page.tsx`), 영화 상세 (`movies/[id]/page.tsx`), 검색 (`movies/page.tsx`), 인증, 프로필, 즐겨찾기, 평점.
- **`components/`** - 도메인별 구성: `layout/` (Header, MobileNav), `movie/` (MovieCard, MovieRow, HybridMovieCard, MovieModal, FeaturedBanner), `weather/`, `search/`, `ui/`.
- **`stores/`** - Zustand 스토어: `authStore.ts` (인증 상태, localStorage 저장), `interactionStore.ts` (평점/즐겨찾기 낙관적 업데이트).
- **`lib/api.ts`** - 모든 백엔드 엔드포인트를 래핑하는 API 클라이언트. 토큰 주입 및 갱신 처리.
- **`hooks/`** - `useWeather` (날씨 + localStorage 캐싱), `useDebounce`, `useInfiniteScroll`.
- **`types/index.ts`** - 공유 TypeScript 타입 정의.

### 추천 엔진

하이브리드 스코어링 (상세: `docs/RECOMMENDATION_LOGIC.md`):

```
기분 선택 시: MBTI(30%) + 날씨(20%) + 기분(20%) + 개인화(30%)
기분 미선택:  MBTI(35%) + 날씨(25%) + 개인화(40%)
```

- **감정 태그**: 2-tier 시스템 - 인기 상위 1,000편은 LLM 분석 점수 (0.0~1.0), 나머지는 키워드 기반 점수 (상한 0.7).
- **품질 필터**: `vote_count >= 30`, `vote_average >= 5.0` (높은 평점 섹션은 더 엄격).
- **LLM 최소 비율**: 결과의 30%는 인기 상위 1,000편 풀에서 선택.
- **6개 기분**이 **7개 감정 클러스터**에 매핑: healing, tension, energy, romance, deep, fantasy, light.

### 데이터 파이프라인

`backend/scripts/` 내 스크립트:
1. `load_data.py` - CSV → DB 벌크 삽입 (영화 + 장르/출연진/키워드/국가)
2. `generate_scores.py` - MBTI/날씨/감정 점수 계산
3. `add_similar_movies.py` - 유사 영화 연관 데이터 생성

원본 데이터: `data/raw/MOVIE_FINAL_FIXED_TITLES.csv`

## 주요 환경 변수

백엔드 `.env` (`backend/` 내): `DATABASE_URL`, `REDIS_URL` (또는 `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`), `JWT_SECRET_KEY`, `WEATHER_API_KEY`, `ANTHROPIC_API_KEY`, `CORS_ORIGINS`, `APP_ENV`.

프론트엔드: `NEXT_PUBLIC_API_URL` (기본값 `http://localhost:8000/api/v1`).

## 컨벤션

- UI 텍스트와 일부 문서는 한국어로 작성. 영화 데이터는 영문(`title`)과 한국어(`title_ko`) 필드 모두 포함.
- 백엔드 린트/포맷: **ruff**. 프론트엔드 린트: **ESLint** (next config).
- TypeScript import 경로 별칭: `@/*` → 프론트엔드 루트.
- Docker Compose 설정 파일: `docker/docker-compose.yml` (루트가 아닌 docker 디렉토리).
