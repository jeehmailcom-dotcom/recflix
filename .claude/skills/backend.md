# 백엔드 규칙 (FastAPI)

> 관련 경로: `backend/app/`

## 코드 품질

- [ ] 코드 수정 후 `ruff check app/`으로 린트 확인
- [ ] 코드 수정 후 `ruff format app/`으로 포맷 확인
- [ ] 기능 변경 후 `pytest tests/ -v`로 테스트 실행

## API 설계

- [ ] 새 라우트는 `/api/v1/` 프리픽스 유지 → `api/v1/router.py`에 등록
- [ ] 요청/응답은 반드시 `schemas/`의 Pydantic 모델로 정의
- [ ] `Query()` 정규식 검증은 반드시 `pattern=` 사용 (`regex=` deprecated → 422 오류 발생)

## 데이터베이스

- [ ] `DATABASE_URL`은 반드시 `postgresql+psycopg://` 형식 (`postgresql://` 사용 금지)
- [ ] DB 세션은 `get_db()` 의존성 주입으로만 사용 (직접 `SessionLocal()` 호출 금지)
- [ ] 로컬에서 Railway DB 연결 시 외부 프록시 URL 사용 (`mainline.proxy.rlwy.net:PORT`)
  - 내부 주소 `postgres.railway.internal`은 Railway 네트워크 내부에서만 접근 가능

## 설정 관리

- [ ] 환경변수 추가 시 `app/config.py`의 Pydantic Settings에 필드 추가
- [ ] `@lru_cache` 싱글톤으로 Settings 관리 (매번 재생성 금지)

## 주요 파일 경로

| 파일 | 역할 |
|------|------|
| `app/main.py` | FastAPI 앱 진입점, lifespan, CORS, 라우터 등록 |
| `app/api/v1/router.py` | 전체 라우트 통합 |
| `app/api/v1/recommendations.py` | 하이브리드 추천 로직 |
| `app/api/v1/weather.py` | 날씨 API 라우트 |
| `app/config.py` | Pydantic Settings |
| `app/database.py` | SQLAlchemy 엔진, SessionLocal |
| `app/core/deps.py` | 의존성 주입 (get_db, get_current_user) |
| `app/services/weather_service.py` | OpenWeatherMap API 호출 |
