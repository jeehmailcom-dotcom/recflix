# RecFlix 코드 리팩토링 결과

> 실행일: 2026-02-20
> 실행자: Claude Code

---

## 요약

| 대상 | Before | After (메인) | 분리된 파일 수 | 검증 |
|------|--------|-------------|--------------|------|
| recommendations.py | 712줄 | 188줄 | 1 (services/recommendation.py · 446줄) | ✅ |
| movies/[id]/page.tsx | 591줄 | 190줄 | 3 (Hero · Content · Sidebar) | ✅ |
| movies/page.tsx | 438줄 | 199줄 | 2 (SearchFilters · Grid) | ✅ |

---

## 1. backend/app/api/v1/recommendations.py

### 1.1 분석

**기존 구조:**
- `get_llm_movie_ids` (L86–94) — LLM 처리 영화 ID 조회
- `get_movies_by_score` (L97–174) — 점수 기반 영화 조회 (LLM 비율 보장)
- `get_user_preferences` (L177–219) — 찜/평점 기반 사용자 선호 추출
- `get_similar_movie_ids` (L222–237) — 유사 영화 ID 조회
- `calculate_hybrid_scores` (L240–368) — 하이브리드 스코어 계산 (핵심 로직)
- `get_home_recommendations` (L371–547) — 홈 추천 엔드포인트 (177줄, 가장 복잡)
- 나머지 7개 엔드포인트 (L550–712)

**식별된 문제:**
- 비즈니스 로직(스코어 계산, 쿼리 유틸)과 HTTP 엔드포인트가 단일 파일에 혼재
- 상수(MOOD_EMOTION_MAPPING 등)도 동일 파일에 위치
- `get_home_recommendations`만 177줄로, 단일 함수가 너무 큰 책임을 가짐

### 1.2 새 파일 구조

```
backend/app/
├── services/
│   └── recommendation.py    # 신규: 상수 + 스코어 계산 + 쿼리 유틸 + build_home_recommendations
└── api/v1/
    └── recommendations.py   # 축소: 엔드포인트만 (서비스 호출)
```

### 1.3 변경 내역

| 파일 | 작업 | 줄수 |
|------|------|------|
| `services/recommendation.py` | 신규 생성 | 446줄 |
| `api/v1/recommendations.py` | 축소 (712→188) | 188줄 |

**이전된 항목:**
- 상수: `WEIGHT_*`, `MOOD_EMOTION_MAPPING`, `MOOD_LABELS`, `MOOD_SECTION_CONFIG`, `WEATHER_LABELS`, `WEATHER_TITLES`
- 함수: `get_llm_movie_ids`, `get_movies_by_score`, `get_user_preferences`, `get_similar_movie_ids`, `calculate_hybrid_scores`
- 신규 함수: `build_home_recommendations` (홈 추천 조립 로직을 서비스로 추출)

### 1.4 검증 결과

```
$ ruff check app/api/v1/recommendations.py app/services/recommendation.py
All checks passed!

$ python -c "from app.api.v1.recommendations import router; print(len(router.routes))"
8
```

---

## 2. frontend/app/movies/[id]/page.tsx

### 2.1 분석

**기존 구조:**
- State + useEffect + handlers (L1–106) — 데이터 패칭 + 인터랙션 핸들러
- Hero Section (L135–316) — 배경 이미지, 포스터, 제목, 메타, 장르, 액션 버튼 (~180줄)
- Main Content (L322–419) — 내 평점, 줄거리, 출연진, 유사 영화
- Sidebar (L421–531) — 영화 정보, MBTI 점수, 날씨 점수
- `MovieDetailSkeleton` (L537–591) — 로딩 스켈레톤

**식별된 문제:**
- Hero 섹션이 약 180줄로 페이지 파일의 30% 이상 차지
- 사이드바, 콘텐츠 섹션 모두 재사용 가능한 독립 단위이나 단일 파일에 존재

### 2.2 새 파일 구조

```
frontend/
├── components/movie/
│   ├── MovieDetailHero.tsx     # 신규: 배경/포스터/메타/장르/액션버튼
│   ├── MovieDetailContent.tsx  # 신규: 평점/줄거리/출연진/유사영화
│   └── MovieDetailSidebar.tsx  # 신규: 영화정보/MBTI점수/날씨점수
└── app/movies/[id]/
    └── page.tsx                # 축소: state + effects + handlers + 레이아웃
```

### 2.3 변경 내역

| 파일 | 작업 | 줄수 |
|------|------|------|
| `MovieDetailHero.tsx` | 신규 생성 | 201줄 |
| `MovieDetailContent.tsx` | 신규 생성 | 130줄 |
| `MovieDetailSidebar.tsx` | 신규 생성 | 120줄 |
| `app/movies/[id]/page.tsx` | 축소 (591→190) | 190줄 |

**추가 개선:**
- `ratingHover` 상태를 `MovieDetailContent`로 이전 → 페이지 상태 단순화
- `MovieDetailSkeleton`은 `page.tsx` 내 유지 (페이지 전용 로딩 컴포넌트)

### 2.4 검증 결과

```
$ npx tsc --noEmit
(오류 없음)
```

---

## 3. frontend/app/movies/page.tsx

### 3.1 분석

**기존 구조:**
- 상수 `SORT_OPTIONS` + 상태/이펙트/콜백 (L1–141) — 영화 목록/장르 패칭, 무한 스크롤, 페이지네이션
- Search & Filters JSX (L143–224) — 검색창, 장르/정렬 셀렉트, 무한스크롤 토글
- Results JSX (L226–410) — 스켈레톤/빈 결과/영화 그리드 + 페이지네이션
- `MoviesPageLoading` (L412–430) — Suspense 폴백
- `MoviesPage` (L432–438) — Suspense 래퍼

**식별된 문제:**
- 페이지네이션 버튼 내 async fetch 로직이 인라인으로 중복 작성
- 필터 UI와 결과 그리드가 300줄 가까운 단일 블록에 혼재

### 3.2 새 파일 구조

```
frontend/
├── components/movie/
│   ├── MovieSearchFilters.tsx  # 신규: 검색바 + 필터 셀렉트 + 쿼리 표시
│   └── MovieGrid.tsx           # 신규: 그리드 + 페이지네이션 + 무한스크롤
└── app/movies/
    └── page.tsx                # 축소: state + effects + callbacks + 레이아웃
```

### 3.3 변경 내역

| 파일 | 작업 | 줄수 |
|------|------|------|
| `MovieSearchFilters.tsx` | 신규 생성 | 110줄 |
| `MovieGrid.tsx` | 신규 생성 | 156줄 |
| `app/movies/page.tsx` | 축소 (438→199) | 199줄 |

**추가 개선:**
- 페이지네이션 버튼의 인라인 async fetch를 `handlePageChange` 콜백으로 통합
- `MovieGrid`의 `loadMoreRef` props 타입을 `(node: HTMLDivElement | null) => void`로 정확하게 선언

### 3.4 검증 결과

```
$ npx tsc --noEmit
(오류 없음)
```

---

## 주의사항 / 후속 작업

- `services/recommendation.py`는 446줄로 두꺼우나, 9개 감성 클러스터 매핑 상수와 복잡한 하이브리드 스코어링 로직의 특성상 불가피. 추후 `scoring.py` / `queries.py` / `constants.py` 로 추가 세분화 가능.
- `MovieDetailHero.tsx`가 201줄로 목표 200줄을 1줄 초과하나, 반응형 포스터 표시(모바일/데스크탑) 중복 구조상 최소 구현.
- 기존 다른 파일(`interactions.py`, `users.py`, `config.py`, `models/movie.py`, `services/llm.py`)에 pre-existing ruff 경고 9건 존재 — 이번 리팩토링 대상 외 파일이므로 별도 처리 필요.
