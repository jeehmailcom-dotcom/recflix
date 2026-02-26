# CLAUDE.md

이 파일은 Claude Code가 이 레포지토리에서 작업할 때 참고하는 가이드입니다.

> **규칙 상세** → `.claude/skills/` 참조
> **빠른 인덱스** → `.claude/skills.md`

---

## 프로젝트 개요

RecFlix는 MBTI + 실시간 날씨 + 기분(무드)을 결합한 개인화 영화 추천 플랫폼. 42,917편 DB.

- **프론트엔드**: Next.js 14 (App Router), TypeScript, TailwindCSS, Zustand, Framer Motion
- **백엔드**: FastAPI (Python 3.11+), SQLAlchemy ORM, Redis 캐싱, JWT 인증
- **데이터베이스**: PostgreSQL 16 (JSONB 스코어 컬럼), Redis 7
- **배포**: Vercel (프론트) + Railway (백엔드 + DB + Redis)

---

## 주요 명령어

```bash
# 개발 환경
make docker-up                              # PostgreSQL, Redis 컨테이너 시작
make backend-run                            # uvicorn --reload (포트 8000)
cd frontend && npm run dev:fast             # Next.js 빠른 재시작 (포트 3000)
cd frontend && npm run dev                  # .next 캐시 삭제 후 재시작

# 품질 검사
cd backend && ruff check app/              # 린트
cd backend && ruff format app/             # 포맷
cd backend && pytest tests/ -v             # 테스트
cd frontend && npx tsc --noEmit            # 타입 체크

# 데이터베이스
make db-migrate                            # alembic upgrade head
make db-migrate-create msg="설명"          # 새 마이그레이션 생성
make db-seed                               # 영화 데이터 시딩
```

---

## 아키텍처

### 백엔드 (`backend/app/`)

| 디렉토리 | 역할 |
|----------|------|
| `api/v1/` | 라우트 모듈. `router.py`에서 `/api/v1` 프리픽스로 통합 |
| `models/` | SQLAlchemy ORM. `Movie`의 JSONB: `mbti_scores`, `weather_scores`, `emotion_tags` |
| `schemas/` | Pydantic 요청/응답 스키마 |
| `services/` | 비즈니스 로직 (날씨 API + Redis 캐싱, Claude LLM) |
| `core/` | JWT (`security.py`), 의존성 주입 (`deps.py`) |
| `config.py` | Pydantic Settings (`@lru_cache` 싱글톤) |
| `database.py` | SQLAlchemy 엔진, `get_db()` 의존성 |

> 규칙 상세 → `.claude/skills/backend.md`

### 프론트엔드 (`frontend/`)

| 경로 | 역할 |
|------|------|
| `app/page.tsx` | 홈 (추천 섹션, FeaturedBanner) |
| `app/mbti/page.tsx` | MBTI 전용 추천 페이지 |
| `app/weather/page.tsx` | 날씨 전용 추천 페이지 |
| `app/mood/page.tsx` | 무드 전용 추천 페이지 |
| `app/movies/` | 검색 + 영화 상세 |
| `components/movie/FeaturedBanner.tsx` | 날씨/무드 선택 UI |
| `components/layout/Header.tsx` | 네비: 홈/MBTI/날씨/무드/MY페이지 |
| `stores/` | Zustand (authStore, interactionStore) |
| `lib/api.ts` | 백엔드 API 클라이언트 (토큰 주입) |
| `lib/utils.ts` | cn(), getImageUrl(), getMBTIColor() |
| `hooks/useWeather.ts` | 날씨 + localStorage 캐싱 (30분) |
| `types/index.ts` | 공유 TypeScript 타입 |

> 규칙 상세 → `.claude/skills/frontend.md`

### 추천 엔진

```
기분 선택: MBTI(30%) + 날씨(20%) + 기분(20%) + 개인화(30%)
기분 미선택: MBTI(35%) + 날씨(25%) + 개인화(40%)
```

- **무드**: 8개 (`calm|energetic|gloomy|stifled|soft|tense|empty|joyful`)
- **감정 클러스터**: 9개 (`healing|tension|energy|romance|deep|fantasy|light|melancholy|void`)
- **품질 필터**: `vote_count >= 30`, `vote_average >= 5.0`
- **LLM 최소 비율**: 결과의 30%는 상위 1,000편 풀에서 선택

> 규칙 상세 → `.claude/skills/recommendation.md`
> 알고리즘 문서 → `docs/RECOMMENDATION_LOGIC.md`

### 데이터 파이프라인 (`backend/scripts/`)

1. `import_csv_data.py` — CSV → DB 벌크 삽입
2. `generate_mbti_weather_scores.py` — MBTI/날씨 점수 계산
3. `regenerate_emotion_tags.py` — 9개 감정 클러스터 재생성 (melancholy, void 추가)
4. `add_similar_movies.py` — 유사 영화 연관 데이터

원본 데이터: `data/raw/MOVIE_total_FINAL_FINAL_2010.csv`

---

## 환경 변수 요약

> 상세 → `.claude/skills/environment.md`

| 변수 | 위치 | 필수 |
|------|------|------|
| `DATABASE_URL` | `backend/.env` | ✅ (`postgresql+psycopg://` 형식) |
| `JWT_SECRET_KEY` | `backend/.env` | ✅ |
| `WEATHER_API_KEY` | `backend/.env` | ✅ |
| `REDIS_URL` | `backend/.env` | 권장 |
| `ANTHROPIC_API_KEY` | `backend/.env` | LLM 기능 시 |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | 기본값 `http://localhost:8000/api/v1` |

---

## 컨벤션 요약

> 상세 → `.claude/skills.md`

- **언어**: UI·문서 한국어 / 코드·변수명 영어
- **백엔드 린트**: `ruff` / **프론트엔드 린트**: ESLint
- **import 경로**: `@/*` 별칭 (상대경로 금지)
- **Git**: Conventional Commits (`feat:` `fix:` `refactor:` `docs:` `test:`)
- **플러그인**: context7 (라이브러리 문서), security-guidance (보안 가이드)
