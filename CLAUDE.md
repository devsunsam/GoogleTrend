# 프로젝트: TrendBlog — 트렌드 블로그 자동화

## 기술 스택
- Next.js 15 (App Router)
- TypeScript strict mode
- Tailwind CSS 4
- JSON 파일 저장 (data/store.json)
- Google Gemini API

## 아키텍처 규칙
- CRITICAL: 모든 API 로직은 `src/app/api/` 라우트 핸들러에서만 처리
- CRITICAL: 클라이언트 컴포넌트에서 직접 Gemini/Google Trends API를 호출하지 말 것
- 컴포넌트는 `src/components/`, 타입은 `src/types/`, 서비스는 `src/services/`

## 개발 프로세스
- CRITICAL: 새 기능 구현 시 반드시 테스트를 먼저 작성하고, 테스트가 통과하는 구현을 작성할 것 (TDD)
- 커밋 메시지는 conventional commits 형식을 따를 것 (feat:, fix:, docs:, refactor:)

## 명령어
npm run dev        # 개발 서버
npm run build      # 프로덕션 빌드
npm run lint       # ESLint
npm run test       # Vitest
npm run scheduler  # 4시간 트렌드 수집 스케줄러
