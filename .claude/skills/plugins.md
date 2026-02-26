# 플러그인 (Claude Code Plugins)

설치된 플러그인 목록과 활용 방법.

---

## context7

> 설치: `/plugin` → context7 선택

최신 라이브러리 공식 문서를 실시간으로 참조할 수 있는 플러그인.

### 활용 상황
- FastAPI, SQLAlchemy, Next.js 등 라이브러리의 최신 API 확인 시
- deprecated된 파라미터/함수 확인 시 (`regex=` → `pattern=` 같은 케이스)
- 버전 업그레이드로 인한 breaking change 확인 시

### 사용 방법
프롬프트에서 라이브러리명과 함께 질문하면 최신 공식 문서 기반으로 답변.

---

## security-guidance

> 설치: `/plugin` → security-guidance 선택

보안 관련 코드 작성 가이드라인을 제공하는 플러그인.

### 활용 상황
- JWT 토큰 처리, 인증/인가 로직 작성 시
- SQL 인젝션, XSS 등 보안 취약점 검토 시
- API 키, 비밀번호 등 민감 정보 처리 시
- CORS 설정 검토 시

### RecFlix 관련 보안 주의사항
- `JWT_SECRET_KEY`: 프로덕션에서 반드시 강력한 랜덤 값 사용
- `ANTHROPIC_API_KEY`, `WEATHER_API_KEY`: `.env`에만 저장, 절대 커밋 금지
- `CORS_ORIGINS`: 허용 도메인 최소화 (와일드카드 `*` 사용 금지)
- Railway 내부 서비스 간 통신: 내부 URL 사용 (`*.railway.internal`)
