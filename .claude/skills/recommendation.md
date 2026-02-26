# 추천 엔진 규칙

> 관련 파일: `backend/app/api/v1/recommendations.py`
> 알고리즘 문서: `docs/RECOMMENDATION_LOGIC.md`

## 하이브리드 스코어 가중치 (변경 금지)

| 상황 | MBTI | 날씨 | 기분 | 개인화 |
|------|------|------|------|--------|
| 기분 선택 시 | 30% | 20% | 20% | 30% |
| 기분 미선택 시 | 35% | 25% | — | 40% |

## 품질 필터 (완화 금지)

- `vote_count >= 30`
- `vote_average >= 5.0`
- 결과의 최소 **30%**는 LLM 분석 상위 1,000편 풀에서 선택

## emotion_tags 점수 상한

- 키워드 기반: **0.7** 상한
- LLM 분석: **1.0**까지 허용

## 무드 시스템 (8개, 2026-02-20 기준)

### MoodType
```typescript
"calm" | "energetic" | "gloomy" | "stifled" | "soft" | "tense" | "empty" | "joyful"
```
구 무드(`relaxed/excited/emotional/imaginative`) 사용 금지

### 무드 → 감정 클러스터 매핑 (9개 클러스터)

| 무드 | 한국어 | 매핑 클러스터 |
|------|--------|-------------|
| calm | 평온한 | healing |
| energetic | 활기찬 | energy |
| gloomy | 울적한 | melancholy ⚠️ DB 미생성 |
| stifled | 답답한 | tension |
| soft | 몽글몽글한 | romance |
| tense | 긴장된 | tension |
| empty | 공허한 | void ⚠️ DB 미생성 |
| joyful | 유쾌한 | light |

> ⚠️ `melancholy`, `void` 클러스터는 `regenerate_emotion_tags.py` 스크립트에 추가됐으나
> DB 재생성이 아직 실행되지 않음. 해당 무드 선택 시 mood_score = 0으로 처리됨.

### 전체 9개 감정 클러스터
`healing | tension | energy | romance | deep | fantasy | light | melancholy | void`

## 추천 타이틀 형식

```
기분/날씨/MBTI 선택 시: "🎯 MBTI + 날씨 + 기분 기반 큐레이션"
미선택 시:              "🎯 당신을 위한 맞춤 추천"
```

## FastAPI Query 패턴

```python
# 날씨
weather: Optional[str] = Query(None, pattern="^(sunny|rainy|cloudy|snowy)$")

# 무드
mood: Optional[str] = Query(None, pattern="^(calm|energetic|gloomy|stifled|soft|tense|empty|joyful)$")
```

## 추천 로직 변경 시 체크리스트

- [ ] `docs/RECOMMENDATION_LOGIC.md` 동기화
- [ ] 가중치 비율 확인
- [ ] FastAPI Query pattern 업데이트
- [ ] 프론트엔드 `types/index.ts`의 `MoodType` 동기화
- [ ] `FeaturedBanner.tsx`의 moodConfig 동기화
