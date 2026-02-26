# 환경 설정

## 백엔드 `.env` (backend/.env)

```env
# 필수
DATABASE_URL=postgresql+psycopg://user:pass@mainline.proxy.rlwy.net:PORT/railway
JWT_SECRET_KEY=your-secret-key
WEATHER_API_KEY=your-openweathermap-key

# Redis (둘 중 하나)
REDIS_URL=redis://default:pass@host:6379   # Railway 형식 (우선 적용)
# 또는 개별 설정
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=recflix123

# 선택
ANTHROPIC_API_KEY=your-key    # LLM 캐치프레이즈 사용 시
CORS_ORIGINS=http://localhost:3000,https://jnsquery-reflix.vercel.app
APP_ENV=development
```

## 프론트엔드 `.env.local` (frontend/.env.local)

```env
# 로컬 개발 (로컬 백엔드 실행 시)
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# 프로덕션 (Railway 백엔드)
# NEXT_PUBLIC_API_URL=https://recflix-production.up.railway.app/api/v1
```

## 주의사항

| 항목 | 주의 |
|------|------|
| `DATABASE_URL` | 반드시 `postgresql+psycopg://` 프로토콜 사용 |
| `DATABASE_URL` (로컬) | `mainline.proxy.rlwy.net:PORT` 형식 (외부 URL) |
| `DATABASE_URL` (내부) | `postgres.railway.internal` — Railway 내부 전용, 로컬 사용 불가 |
| `REDIS_URL` | Railway 내부 주소 → 로컬 테스트 시 `make docker-up` |
| `ANTHROPIC_API_KEY` | 로컬 `.env`에 플레이스홀더 상태, 프로덕션(Railway)만 실제 키 |

## 배포 설정

| 서비스 | 루트 디렉토리 | 설정 파일 |
|--------|-------------|---------|
| Vercel (프론트엔드) | `frontend/` | `vercel.json`, `next.config.js` |
| Railway (백엔드) | `backend/` | `Dockerfile`, `railway.toml` |

## Python 버전 호환성

- Python 3.14: `psycopg[binary]>=3.1.13`, `asyncpg>=0.31.0` 필수
- `requirements.txt` 버전 핀을 `==`에서 `>=`로 완화됨

## 로컬 개발 실행 순서

```bash
# 1. DB/Redis (Docker)
make docker-up

# 2. 백엔드
make backend-run        # uvicorn app.main:app --reload (포트 8000)

# 3. 프론트엔드
cd frontend && npm run dev:fast   # 포트 3000
```
