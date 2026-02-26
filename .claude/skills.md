# Skills 인덱스

> 작업 유형에 맞는 파일만 열어서 참조할 것 (전체 로드 금지 → 토큰 절약)

| 작업 유형 | 참조 파일 |
|-----------|-----------|
| FastAPI 라우트 / DB / 린트 | `skills/backend.md` |
| Next.js 컴포넌트 / 상태 / 유틸 | `skills/frontend.md` |
| 무드·감정 클러스터·가중치 | `skills/recommendation.md` |
| `.env` / 배포 / 실행 환경 | `skills/environment.md` |
| 커밋 / 브랜치 / 히스토리 | `skills/git.md` |
| context7 / security-guidance | `skills/plugins.md` |

---

## 즉시 참조용 핵심 규칙

### 절대 금지
- `regex=` 사용 금지 → `pattern=` 사용
- `postgresql://` 사용 금지 → `postgresql+psycopg://`
- 컴포넌트에서 직접 fetch 금지 → `lib/api.ts` 래퍼 사용
- `../../` 상대경로 금지 → `@/*` 별칭 사용
- `.env` / `.env.local` 커밋 금지

### MoodType (8개)
`calm | energetic | gloomy | stifled | soft | tense | empty | joyful`

### 감정 클러스터 (9개)
`healing | tension | energy | romance | deep | fantasy | light | melancholy | void`

### TMDB 이미지 허용 사이즈
`w92 | w154 | w185 | w200 | w300 | w342 | w500 | w780 | original`

### 추천 가중치
| 상황 | MBTI | 날씨 | 기분 | 개인화 |
|------|------|------|------|--------|
| 기분 선택 | 30% | 20% | 20% | 30% |
| 기분 미선택 | 35% | 25% | — | 40% |
