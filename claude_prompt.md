# RecFlix 코드 리팩토링 프롬프트

> **사용법**: Claude Code에서 아래 명령어로 실행
> ```bash
> cat claude_prompt.md | claude --print > claude_result.md
> ```
> 또는 Claude Code 내에서:
> ```
> claude "$(cat claude_prompt.md)" > claude_result.md
> ```

---

## 지시사항

아래 3개 파일의 코드 리팩토링 계획을 수립하고, 실제 리팩토링을 수행한 뒤, 결과를 **이 프롬프트 하단의 출력 형식**에 맞춰 정리하라.

### 대상 파일 (우선순위 순)

| # | 파일 | 현재 줄수 | 목표 | 핵심 문제 |
|---|------|----------|------|----------|
| 1 | `backend/app/api/v1/recommendations.py` | 712줄 | 각 파일 200줄 이하 | 스코어 계산, 쿼리, 엔드포인트가 단일 파일에 혼재 |
| 2 | `frontend/app/movies/[id]/page.tsx` | 591줄 | 각 파일 200줄 이하 | 상세 페이지의 히어로/출연진/유사영화/평점 UI가 모두 한 파일 |
| 3 | `frontend/app/movies/page.tsx` | 438줄 | 각 파일 200줄 이하 | 필터 사이드바, 검색 바, 영화 그리드, 페이지네이션이 혼재 |

### 리팩토링 규칙

1. **기능 변경 없음 (행동 보존)**: 리팩토링 전후 동일한 입출력. 새 기능 추가 금지.
2. **파일 분리 원칙**:
   - 백엔드: 비즈니스 로직 → `services/`, 유틸리티 → `utils/`, 엔드포인트는 라우터에만
   - 프론트엔드: 섹션별 컴포넌트 분리 (`components/movie/` 하위), 커스텀 훅 분리 (`hooks/`)
3. **네이밍 컨벤션**:
   - 백엔드: snake_case, 함수명은 동사로 시작 (`calculate_mbti_score`, `build_recommendation_query`)
   - 프론트엔드: PascalCase 컴포넌트, camelCase 함수/변수, `use` 접두사 훅
4. **import 경로**: 프론트엔드는 반드시 `@/*` 별칭 사용 (상대경로 금지)
5. **타입 안전성**: 프론트엔드 `any` 사용 금지. 필요 시 `types/index.ts`에 타입 추가
6. **기존 컨벤션 유지**:
   - UI 텍스트: 한국어
   - 코드/변수명: 영어
   - 백엔드 린트: `ruff check app/` 통과
   - 프론트엔드: `npx tsc --noEmit` 통과

### 작업 순서

각 파일에 대해 아래 순서를 따른다:

#### Step 1: 분석
- 현재 파일을 읽고 함수/컴포넌트 단위로 책임을 나열
- 분리 가능한 단위를 식별하고 새 파일 구조를 제안

#### Step 2: 리팩토링 실행
- 새 파일 생성 (서비스/컴포넌트/훅)
- 원본 파일에서 분리된 코드를 제거하고 import로 대체
- 원본 파일이 새 모듈을 올바르게 참조하는지 확인

#### Step 3: 검증
- 백엔드: `cd backend && ruff check app/ && python -c "from app.api.v1.recommendations import router"`
- 프론트엔드: `cd frontend && npx tsc --noEmit`
- 각 파일의 줄 수 확인 (`wc -l`)

#### Step 4: 결과 정리
- 아래 출력 형식에 맞춰 결과를 `claude_result.md`에 작성

---

## 출력 형식 (claude_result.md)

아래 형식을 그대로 사용하여 결과를 출력하라:

```markdown
# RecFlix 코드 리팩토링 결과

> 실행일: {YYYY-MM-DD}
> 실행자: Claude Code

---

## 요약

| 대상 | Before | After (메인) | 분리된 파일 수 | 검증 |
|------|--------|-------------|--------------|------|
| recommendations.py | 712줄 | ?줄 | ? | ✅/❌ |
| movies/[id]/page.tsx | 591줄 | ?줄 | ? | ✅/❌ |
| movies/page.tsx | 438줄 | ?줄 | ? | ✅/❌ |

---

## 1. backend/app/api/v1/recommendations.py

### 1.1 분석

**기존 구조:**
- (함수명 — 줄 범위 — 책임 설명)

**식별된 문제:**
- (문제 나열)

### 1.2 새 파일 구조

```
backend/app/
├── services/
│   └── recommendation.py    # 신규: 스코어 계산 로직
├── api/v1/
│   └── recommendations.py   # 축소: 엔드포인트만
└── ...
```

### 1.3 변경 내역

| 파일 | 작업 | 줄수 |
|------|------|------|
| `services/recommendation.py` | 신규 생성 | ?줄 |
| `api/v1/recommendations.py` | 축소 | ?줄 |

### 1.4 검증 결과

```
$ ruff check app/
$ python -c "from app.api.v1.recommendations import router"
```

---

## 2. frontend/app/movies/[id]/page.tsx

### 2.1 분석
(위와 동일한 형식)

### 2.2 새 파일 구조
### 2.3 변경 내역
### 2.4 검증 결과

---

## 3. frontend/app/movies/page.tsx

### 3.1 분석
(위와 동일한 형식)

### 3.2 새 파일 구조
### 3.3 변경 내역
### 3.4 검증 결과

---

## 주의사항 / 후속 작업

- (발견된 이슈, 추가로 리팩토링이 필요한 부분 등)
```

---

## 참고: 프로젝트 컨텍스트

### 추천 엔진 핵심 로직 (recommendations.py 관련)
- 하이브리드 스코어: 기분 선택 시 MBTI(30%) + 날씨(20%) + 기분(20%) + 개인화(30%)
- 품질 필터: `vote_count >= 30`, `vote_average >= 5.0`
- LLM 최소 비율: 결과의 30%는 상위 1,000편(LLM 분석) 풀에서 선택
- emotion_tags 상한: 키워드 기반 0.7, LLM 1.0
- 8개 무드 → 9개 감정 클러스터 매핑
- FastAPI Query: `regex=` 금지 → `pattern=` 사용

### 프론트엔드 컨벤션 (page.tsx 관련)
- import: `@/*` 별칭 필수
- 상태 관리: Zustand (authStore, interactionStore)
- API 호출: `lib/api.ts` 래퍼 함수만 사용
- 이미지: `getImageUrl(path, size)` 유틸
- 스타일: TailwindCSS + cn() 유틸

### 백엔드 구조
```
backend/app/
├── api/v1/          # 라우트 (엔드포인트만)
├── models/          # SQLAlchemy ORM
├── schemas/         # Pydantic 스키마
├── services/        # 비즈니스 로직 ← 스코어 계산을 여기로 분리
├── core/            # JWT, 의존성 주입
├── config.py        # Settings
└── database.py      # 엔진, get_db()
```

### 프론트엔드 구조
```
frontend/
├── app/movies/
│   ├── page.tsx             # 검색/필터 페이지
│   └── [id]/page.tsx        # 영화 상세 페이지
├── components/movie/        # ← 분리된 컴포넌트 여기에
│   ├── MovieCard.tsx
│   ├── MovieRow.tsx
│   ├── MovieModal.tsx
│   ├── FeaturedBanner.tsx
│   ├── HybridMovieRow.tsx
│   └── HybridMovieCard.tsx
├── hooks/                   # ← 분리된 훅 여기에
├── lib/api.ts
├── lib/utils.ts
└── types/index.ts
```