# 프론트엔드 규칙 (Next.js 14)

> 관련 경로: `frontend/`

## 코드 품질

- [ ] import 경로는 `@/*` 별칭 사용 (`../../` 상대경로 금지)
- [ ] 코드 수정 후 `npm run lint`로 ESLint 확인
- [ ] TypeScript 타입 체크: `npx tsc --noEmit`

## 상태 관리

- [ ] 전역 상태는 Zustand만 사용
  - `stores/authStore.ts` — 인증 상태, localStorage 저장
  - `stores/interactionStore.ts` — 평점/즐겨찾기, 낙관적 업데이트

## API 호출

- [ ] 백엔드 API 호출은 `lib/api.ts`의 래퍼 함수만 사용 (컴포넌트 직접 호출 금지)
- [ ] 새 엔드포인트 추가 시 `lib/api.ts`에 함수 추가

## 유틸리티 (`lib/utils.ts`)

- [ ] 이미지 URL: `getImageUrl(path, size)` 사용
- [ ] CSS 클래스 병합: `cn()` 사용 (clsx + tailwind-merge)
- [ ] 날짜 포맷: `formatDate(date)` 사용 ("YYYY년 MM월 DD일")
- [ ] MBTI 색상: `getMBTIColor(mbti)` 사용
- [ ] TMDB 이미지 허용 사이즈: `w92 | w154 | w185 | w200 | w300 | w342 | w500 | w780 | original`

## 날씨

- [ ] 날씨 상태는 `useWeather` 훅 사용 (`hooks/useWeather.ts`)
- [ ] 날씨 기본값: `weather?.condition ?? "sunny"` (날씨 로드 전 fallback)
- [ ] 날씨 폴백 순서: 실시간 GPS → 서울(Seoul) API → sunny 하드코딩

## 개발 서버

```bash
npm run dev:fast   # .next 캐시 삭제 없이 빠른 재시작
npm run dev        # .next 캐시 삭제 후 재시작
npm run build      # 프로덕션 빌드
```

## 주요 파일 경로

| 파일 | 역할 |
|------|------|
| `app/page.tsx` | 홈 (추천 섹션, FeaturedBanner) |
| `app/mbti/page.tsx` | MBTI 전용 추천 페이지 |
| `app/weather/page.tsx` | 날씨 전용 추천 페이지 |
| `app/mood/page.tsx` | 무드 전용 추천 페이지 |
| `components/movie/FeaturedBanner.tsx` | 날씨/무드 선택 UI (2×4 그리드) |
| `components/layout/Header.tsx` | 네비: 홈/MBTI/날씨/무드/MY페이지 |
| `lib/api.ts` | 백엔드 API 클라이언트 |
| `lib/utils.ts` | cn(), getImageUrl(), getMBTIColor() 등 |
| `hooks/useWeather.ts` | 날씨 + localStorage 캐싱 (30분) |
| `types/index.ts` | 공유 TypeScript 타입 |
