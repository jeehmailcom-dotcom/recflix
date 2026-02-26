# Git 규칙

## 커밋 메시지 형식 (Conventional Commits)

```
feat:      새 기능 추가
fix:       버그 수정
refactor:  기능 변경 없는 코드 개선
docs:      문서 수정
test:      테스트 추가/수정
chore:     빌드/설정 변경
```

## 브랜치 전략

- 현재 `main` 단일 브랜치 운영
- GitHub → Railway 자동 배포 연동 (push 시 Railway 재빌드 트리거)
- GitHub → Vercel 자동 배포 연동

## 절대 금지

- [ ] `.env`, `.env.local` 커밋 금지
- [ ] `.gitignore`의 `!frontend/lib/` 예외 규칙 삭제 금지
  - 루트 `.gitignore`의 `lib/` 규칙이 `frontend/lib/`까지 무시하므로 예외 처리 필수

## 민감 파일 목록 (커밋 금지)

```
backend/.env
frontend/.env.local
*.pem, *.key
```

## 최근 커밋 히스토리 (주요)

| 커밋 | 내용 |
|------|------|
| `36c1216` | fix: Clear recommendations on fetch error (스테일 데이터 방지) |
| `d36d21e` | feat: Add /mbti, /weather, /mood dedicated pages |
| `a158c55` | refactor: Expand mood system (6→8 moods, 7→9 emotion clusters) |
| `be1cee8` | fix: Replace deprecated regex param with pattern in FastAPI Query |
| `206338c` | fix: Exclude frontend/lib/ from gitignore lib/ rule |
